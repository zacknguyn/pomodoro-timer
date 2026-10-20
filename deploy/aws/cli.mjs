import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { validateSettings, validateDeploymentState } from './settings.mjs'
import { verifyRuntimeRole, verifyMigrationRole } from './database.mjs'

process.umask(0o077)
const root = fileURLToPath(new URL('../../', import.meta.url))
const artifacts = resolve(root, 'deploy/aws/.artifacts')
const zip = resolve(artifacts, 'api.zip')
const command = process.argv[2]
const run = (tool, args, options = {}) => {
  const result = spawnSync(tool, args, { cwd: root, stdio: 'inherit', ...options })
  if (result.status !== 0) throw Error(`${tool} failed; deployment stopped without automatically restoring data.`)
  return result.stdout?.toString().trim()
}
const capture = (tool, args, options = {}) => run(tool, args, { ...options, stdio: ['ignore', 'pipe', 'inherit'] })
const aws = (args, options = {}) => capture('aws', ['--profile', config.awsProfile, '--region', config.region, '--no-cli-pager', ...args], options)
let config, env, terraformEnv
const tf = (...args) => run('terraform', ['-chdir=terraform', ...args], { env: terraformEnv })
const output = () => JSON.parse(capture('terraform', ['-chdir=terraform', 'output', '-json'], { env: terraformEnv }))
const identity = () => {
  const caller = JSON.parse(aws(['sts', 'get-caller-identity', '--output', 'json']))
  if (caller.Account !== config.accountId) throw Error('AWS profile belongs to a different account; refusing to deploy.')
  console.log(`Verified AWS account ${caller.Account}, region ${config.region}`)
}
function packageApp() {
  const deployment = config || JSON.parse(readFileSync(resolve(root, process.env.POMOGIT_DEPLOY_CONFIG || 'deploy/aws/config.json')))
  mkdirSync(artifacts, { recursive: true })
  run('npm', ['run', 'lint'], { cwd: resolve(root, 'frontend') })
  run('npm', ['test'], { cwd: resolve(root, 'frontend') })
  run('npm', ['run', 'build'], { cwd: resolve(root, 'frontend'), env: { ...process.env, VITE_API_URL: `https://api.${deployment.domain}/api`, VITE_DEV_BYPASS_AUTH: 'false' } })
  run('npm', ['run', 'check'], { cwd: resolve(root, 'backend') })
  run('npm', ['test'], { cwd: resolve(root, 'backend') })
  run('docker', ['build', '--platform', 'linux/amd64', '-f', 'deploy/aws/Dockerfile', '-t', 'pomogit-lambda-package', '.'])
  const container = capture('docker', ['create', 'pomogit-lambda-package'])
  const staging = resolve(artifacts, `staging-${randomUUID()}`)
  mkdirSync(staging)
  try {
    run('docker', ['cp', `${container}:/var/task/.`, staging])
    // Python's standard library avoids a packaging dependency and preserves native library modes.
    run('python3', ['-c', 'import shutil,sys; shutil.make_archive(sys.argv[1], "zip", sys.argv[2])', zip.slice(0, -4), staging])
  } finally {
    run('docker', ['rm', container])
    rmSync(staging, { recursive: true, force: true })
  }
  console.log(`Lambda package ready: ${zip}`)
}
function migrate(name, mode) {
  const destination = resolve(artifacts, 'migration-result.json')
  const result = JSON.parse(aws(['lambda', 'invoke', '--function-name', name, '--cli-binary-format', 'raw-in-base64-out', '--payload', JSON.stringify({ mode }), destination, '--output', 'json']))
  if (result.FunctionError || JSON.parse(readFileSync(destination)).status !== 'complete') throw Error('Database migration failed; inspect the private migration result file before retrying.')
}
function backup() {
  const database = new URL(env.MIGRATION_DATABASE_URL)
  const directory = resolve(artifacts, 'backups')
  mkdirSync(directory, { recursive: true })
  const filename = `${new Date().toISOString().replaceAll(':', '-')}.dump`
  const pg = {
    ...process.env, PGHOST: database.hostname, PGPORT: database.port || '5432', PGDATABASE: decodeURIComponent(database.pathname.slice(1)),
    PGUSER: decodeURIComponent(database.username), PGPASSWORD: decodeURIComponent(database.password),
    PGSSLMODE: 'verify-full', PGSSLROOTCERT: '/etc/ssl/certs/ca-certificates.crt',
  }
  const caMount = []
  if (env.DATABASE_CA_CERT) {
    const caFile = resolve(artifacts, 'database-ca.pem')
    writeFileSync(caFile, env.DATABASE_CA_CERT.replace(/\\n/g, '\n'))
    pg.PGSSLROOTCERT = '/database-ca.pem'
    caMount.push('--mount', `type=bind,src=${caFile},dst=/database-ca.pem,readonly`)
  }
  run('docker', ['run', '--rm', '--user', `${process.getuid()}:${process.getgid()}`, '--env', 'PGHOST', '--env', 'PGPORT', '--env', 'PGDATABASE', '--env', 'PGUSER', '--env', 'PGPASSWORD', '--env', 'PGSSLMODE', '--env', 'PGSSLROOTCERT',
    ...caMount, '--mount', `type=bind,src=${directory},dst=/backup`, '--entrypoint', 'sh', 'postgres:18-alpine', '-c', `umask 077; exec pg_dump --format=custom --no-owner --no-acl --file=/backup/${filename}`], { env: pg })
  console.log(`Private database backup saved under ${directory}`)
}
function frontend(directory, bucket) {
  if (existsSync(resolve(directory, 'assets'))) aws(['s3', 'sync', resolve(directory, 'assets'), `s3://${bucket}/assets`, '--cache-control', 'public,max-age=31536000,immutable', '--only-show-errors'])
  aws(['s3', 'sync', directory, `s3://${bucket}`, '--exclude', 'assets/*', '--exclude', 'index.html', '--cache-control', 'no-cache', '--only-show-errors'])
  aws(['s3', 'cp', resolve(directory, 'index.html'), `s3://${bucket}/index.html`, '--cache-control', 'no-cache', '--content-type', 'text/html', '--only-show-errors'])
}
function invalidate(distribution) {
  const result = JSON.parse(aws(['cloudfront', 'create-invalidation', '--distribution-id', distribution, '--paths', '/*', '--output', 'json']))
  aws(['cloudfront', 'wait', 'invalidation-completed', '--distribution-id', distribution, '--id', result.Invalidation.Id])
}
async function smoke() {
  for (const [path, expected] of [['/ready', 200], ['/api/auth/me', 401]]) {
    const response = await fetch(`https://api.${config.domain}${path}`, { redirect: 'manual', signal: AbortSignal.timeout(30_000) })
    if (response.status !== expected) throw Error(`Public ${path} check failed. Use rollback if this release broke the site.`)
  }
}
try {
  if (!['package', 'check', 'zone', 'plan', 'plan-pause', 'plan-resume', 'init-db', 'push', 'rollback', 'backup'].includes(command)) {
    console.log('Usage: node deploy/aws/cli.mjs <package|check|zone|plan|plan-pause|plan-resume|init-db|push|rollback|backup>')
    process.exitCode = 2
  } else if (command === 'package') packageApp()
  else {
    config = JSON.parse(readFileSync(resolve(root, process.env.POMOGIT_DEPLOY_CONFIG || 'deploy/aws/config.json')))
    const dotenv = createRequire(new URL('../../backend/package.json', import.meta.url))('dotenv')
    env = dotenv.parse(readFileSync(resolve(root, config.backendEnv)))
    validateSettings(config, env)
    terraformEnv = {
      ...process.env, AWS_PROFILE: config.awsProfile,
      TF_VAR_account_id: config.accountId, TF_VAR_aws_region: config.region, TF_VAR_domain_name: config.domain,
      TF_VAR_environment: 'showcase',
      TF_VAR_site_paused: String(config.sitePaused === true),
      TF_VAR_hosted_zone_id: config.hostedZoneId || '', TF_VAR_budget_email: config.budgetEmail,
      TF_VAR_database_url: env.DATABASE_URL, TF_VAR_github_client_id: env.GITHUB_CLIENT_ID || '',
      TF_VAR_migration_database_url: env.MIGRATION_DATABASE_URL,
      TF_VAR_better_auth_secret: env.BETTER_AUTH_SECRET,
      TF_VAR_database_ca_cert: env.DATABASE_CA_CERT || '',
      TF_VAR_github_client_secret: env.GITHUB_CLIENT_SECRET || '', TF_VAR_lambda_zip_path: zip,
    }
    identity()
    if (command === 'check') {
      const limits = JSON.parse(aws(['lambda', 'get-account-settings', '--output', 'json']))
      if (limits.AccountLimit.UnreservedConcurrentExecutions < 1) throw Error('This account needs available unreserved Lambda concurrency for the API and migration functions.')
      console.log(`Lambda functions share the account pool of ${limits.AccountLimit.UnreservedConcurrentExecutions} unreserved executions; no function capacity is reserved.`)
      const { Pool } = createRequire(new URL('../../backend/package.json', import.meta.url))('pg')
      const pool = new Pool({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 15_000,
        ssl: { rejectUnauthorized: true, ...(env.DATABASE_CA_CERT ? { ca: env.DATABASE_CA_CERT.replace(/\\n/g, '\n') } : {}) } })
      try { await verifyRuntimeRole(pool) }
      catch { throw Error('Deployment PostgreSQL preflight failed. Check TLS and the restricted runtime role grants.') }
      finally { await pool.end() }
      const migrationPool = new Pool({ connectionString: env.MIGRATION_DATABASE_URL, connectionTimeoutMillis: 15_000,
        ssl: { rejectUnauthorized: true, ...(env.DATABASE_CA_CERT ? { ca: env.DATABASE_CA_CERT.replace(/\\n/g, '\n') } : {}) } })
      try { await verifyMigrationRole(migrationPool) }
      catch { throw Error('Migration PostgreSQL preflight failed. Check TLS and schema-owner credentials.') }
      finally { await migrationPool.end() }
      console.log('Configuration, AWS identity, verified PostgreSQL connections and database role boundaries passed. No resources created.')
    } else if (command === 'backup') backup()
    else if (['zone', 'plan', 'plan-pause', 'plan-resume'].includes(command)) {
      if (!existsSync(zip)) throw Error('Run package first.')
      tf('init', '-input=false')
      if (command === 'zone') {
        if (config.hostedZoneId) throw Error('Existing zone configured; zone creation is unnecessary.')
        tf('apply', '-target=aws_route53_zone.site')
        console.log('Set your registrar nameservers from the Terraform nameservers output before the full apply.')
      } else {
        if (command !== 'plan') {
          validateDeploymentState(config, output())
          config.sitePaused = command === 'plan-pause'
          terraformEnv.TF_VAR_site_paused = String(config.sitePaused)
          writeFileSync(resolve(root, process.env.POMOGIT_DEPLOY_CONFIG || 'deploy/aws/config.json'), JSON.stringify(config, null, 2) + '\n', { mode: 0o600 })
        }
        rmSync(resolve(root, 'terraform/deploy.tfplan'), { force: true })
        tf('plan', '-input=false', '-out=deploy.tfplan')
        console.log('Plan only. Review terraform/deploy.tfplan before applying; no AWS resources were changed.')
      }
    } else {
      const state = output()
      validateDeploymentState(config, state)
      if (state.site_paused?.value || config.sitePaused) throw Error('The site is paused or a pause is planned. Apply a reviewed plan-resume before deploying code or running migrations.')
      const value = key => state[key].value
      if (command === 'init-db') migrate(value('migration_function_name'), 'init')
      if (command === 'push') {
        packageApp()
        backup()
        const fn = value('api_function_name'), bucket = value('site_bucket_name')
        const previous = JSON.parse(aws(['lambda', 'get-alias', '--function-name', fn, '--name', 'live', '--output', 'json']))
        const rollbackDirectory = resolve(artifacts, `rollback-${Date.now()}`)
        mkdirSync(rollbackDirectory)
        aws(['s3', 'sync', `s3://${bucket}`, rollbackDirectory, '--exclude', 'assets/*', '--only-show-errors'])
        writeFileSync(resolve(artifacts, 'rollback.json'), JSON.stringify({ fn, version: previous.FunctionVersion, bucket, distribution: value('cloudfront_distribution_id'), directory: rollbackDirectory, domain: config.domain }))
        const migration = value('migration_function_name')
        aws(['lambda', 'update-function-code', '--function-name', migration, '--zip-file', `fileb://${zip}`, '--output', 'json'])
        aws(['lambda', 'wait', 'function-updated-v2', '--function-name', migration])
        migrate(migration, 'upgrade')
        const release = JSON.parse(aws(['lambda', 'update-function-code', '--function-name', fn, '--zip-file', `fileb://${zip}`, '--publish', '--output', 'json']))
        aws(['lambda', 'wait', 'function-updated-v2', '--function-name', fn])
        aws(['lambda', 'update-alias', '--function-name', fn, '--name', 'live', '--function-version', release.Version])
        frontend(resolve(root, 'frontend/dist'), bucket)
        invalidate(value('cloudfront_distribution_id'))
        await smoke()
        console.log(`Published ${value('site_url')}. Check GitHub sign-in and the workspace on the public domain.`)
      }
      if (command === 'rollback') {
        const previous = JSON.parse(readFileSync(resolve(artifacts, 'rollback.json')))
        if (previous.fn !== value('api_function_name') || previous.bucket !== value('site_bucket_name') || previous.domain !== config.domain) throw Error('Rollback record belongs to another deployment.')
        if (!existsSync(resolve(previous.directory, 'index.html'))) throw Error('No prior frontend exists to restore; this may be the first deployment.')
        aws(['lambda', 'update-alias', '--function-name', previous.fn, '--name', 'live', '--function-version', previous.version])
        frontend(previous.directory, previous.bucket)
        invalidate(previous.distribution)
        await smoke()
        console.log('Previous code and frontend restored. Database data was not automatically restored.')
      }
    }
  }
} catch (error) { console.error(error.message); process.exitCode = 1 }
