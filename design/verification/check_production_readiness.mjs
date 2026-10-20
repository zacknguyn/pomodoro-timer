// Local rehearsal only. Creates and removes its own PostgreSQL container; never reads backend/.env.
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { randomBytes, randomUUID } from 'node:crypto'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

assert.equal(process.env.POMOGIT_RUN_DISPOSABLE_CHECK, 'true', 'Explicitly opt into creating a disposable local container')
process.env.BETTER_AUTH_SECRET ||= randomBytes(48).toString('base64url')
const root = fileURLToPath(new URL('../../', import.meta.url))
const { Pool } = createRequire(new URL('../../backend/package.json', import.meta.url))('pg')
const argon2 = createRequire(new URL('../../backend/package.json', import.meta.url))('argon2')
const container = `pomogit-production-check-${randomBytes(4).toString('hex')}`
const password = randomBytes(24).toString('hex')
const output = '/tmp/pomogit-production-readiness'
const checks = []
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 60_000 }).trim()
const check = (name, condition) => { assert(condition, name); checks.push(name); console.log(name) }
let source, restored, created = false
try {
  // No shared volume or fixed port: the user's databases and services are outside this rehearsal.
  execFileSync('docker', ['run', '-d', '--rm', '--name', container,
    '-e', 'POSTGRES_PASSWORD', '-e', 'POSTGRES_USER=pomogit', '-e', 'POSTGRES_DB=pomogit_verification',
    '-p', '127.0.0.1::5432', 'postgres:16-alpine'], {
    env: { ...process.env, POSTGRES_PASSWORD: password }, stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000,
  })
  created = true
  const port = docker('port', container, '5432/tcp').match(/^127\.0\.0\.1:(\d+)$/)?.[1]
  assert(port, 'Expected loopback-only disposable database')
  const url = `postgresql://pomogit:${password}@127.0.0.1:${port}/pomogit_verification`
  for (let attempt = 0; ; attempt++) {
    try { docker('exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', 'pomogit', '-d', 'pomogit_verification'); break }
    catch { if (attempt >= 30) throw Error('Disposable PostgreSQL did not become ready'); await new Promise(resolve => setTimeout(resolve, 500)) }
  }
  source = new Pool({ connectionString: url, ssl: false })
  await source.query(await readFile(`${root}backend/schema.sql`, 'utf8'))
  const user = randomUUID(), task = randomUUID(), session = randomUUID()
  await source.query('INSERT INTO users (id,email,password) VALUES ($1,$2,$3)', [user, `${user}@backup-test.invalid`, await argon2.hash('disposable-backup-password')])
  await source.query(`INSERT INTO tasks (id,user_id,title,status,project,next_step,notes,github_issue_id)
    VALUES ($1,$2,'Restore this task','done','backup-project','Preserve this context',$3,'synthetic-issue')`,
  [task, user, JSON.stringify([{ id: randomUUID(), text: 'Backup must preserve notes', kind: 'note', createdAt: new Date().toISOString() }])])
  await source.query(`INSERT INTO focus_sessions
    (id,user_id,task_id,status,ended_at,duration_planned_seconds,duration_actual_seconds,remaining_seconds)
    VALUES ($1,$2,$3,'ended',NOW(),1500,60,1440)`, [session, user, task])
  await source.query(`INSERT INTO checkpoints (user_id,task_id,session_id,what_changed,outcome)
    VALUES ($1,$2,$3,'Verified backup evidence','complete')`, [user, task, session])
  await source.query(`INSERT INTO github_projects (user_id,github_id,full_name) VALUES ($1,'synthetic-repository','example/backup')`, [user])
  const migrations = ['001_secure_accounts.sql', '003_workspace_details.sql', '004_github_login.sql', '005_github_projects.sql', '006_auth_rate_limits.sql', '007_better_auth.sql']
  for (let pass = 0; pass < 2; pass++) {
    for (const file of migrations) await source.query(await readFile(`${root}backend/migrations/${file}`, 'utf8'))
  }
  await source.query("INSERT INTO better_auth_sessions(user_id,token,expires_at) VALUES($1,$2,NOW()+INTERVAL '1 hour')", [user,randomBytes(32).toString('base64url')])
  await source.query("INSERT INTO auth_verifications(identifier,value,expires_at) VALUES('backup-fixture','synthetic-fixture',NOW()+INTERVAL '1 hour')")
  check('Supported migrations run twice without losing seeded workspace data', (await source.query('SELECT notes FROM tasks WHERE id=$1', [task])).rows[0].notes[0].text === 'Backup must preserve notes')
  const integration = spawnSync(process.execPath, ['--test', '--test-reporter=spec'], {
    cwd: `${root}backend`, encoding: 'utf8', timeout: 120_000,
    env: { ...process.env, POMOGIT_TEST_DATABASE_URL: url },
  })
  process.stdout.write(integration.stdout || '')
  if (integration.status !== 0) throw Error('Backend integration tests failed; inspect their output')
  check('Backend suite passes against real disposable PostgreSQL, including production mode', true)
  await mkdir(output, { recursive: true })
  if (process.env.POMOGIT_PLAYWRIGHT_MODULE) {
    const { verifyProductionProxy } = await import('./check_production_proxy.mjs')
    for (const name of await verifyProductionProxy(url)) check(name, true)
  }
  docker('exec', container, 'pg_dump', '-U', 'pomogit', '-d', 'pomogit_verification', '--format=custom', '--no-owner', '--no-acl', '--file=/tmp/workspace.dump')
  await source.query('CREATE DATABASE pomogit_restore_verification')
  docker('exec', container, 'pg_restore', '-U', 'pomogit', '-d', 'pomogit_restore_verification', '--exit-on-error', '--single-transaction', '--no-owner', '--no-acl', '/tmp/workspace.dump')
  restored = new Pool({ connectionString: url.replace('/pomogit_verification', '/pomogit_restore_verification'), ssl: false })
  for (const table of ['users', 'tasks', 'focus_sessions', 'checkpoints', 'github_projects', 'auth_accounts', 'better_auth_sessions', 'auth_verifications']) {
    const before = (await source.query(`SELECT * FROM ${table} ORDER BY id`)).rows
    const after = (await restored.query(`SELECT * FROM ${table} ORDER BY id`)).rows
    check(`pg_dump/pg_restore preserves ${table} exactly`, JSON.stringify(before) === JSON.stringify(after) && after.length > 0)
  }
  const credential = (await restored.query("SELECT password FROM auth_accounts WHERE user_id=$1 AND provider_id='credential'", [user])).rows[0]
  check('Restored Better Auth password hash still verifies', await argon2.verify(credential.password, 'disposable-backup-password'))
  await assert.rejects(restored.query(`INSERT INTO tasks (user_id,title,github_issue_id) VALUES ($1,'Duplicate','synthetic-issue')`, [user]), { code: '23505' })
  check('Restored import uniqueness constraint still rejects duplicates', true)
  await writeFile(`${output}/results.json`, JSON.stringify({ checks }, null, 2))
  console.log(`${checks.length} production/database rehearsal checks passed. Evidence: ${output}`)
} finally {
  await source?.end()
  await restored?.end()
  if (created) docker('rm', '-f', container)
}
