import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { validateSettings, validateDeploymentState } from './settings.mjs'

test('deployment state must match account, region and domain before resource updates', () => {
  const config = { accountId: '123456789012', region: 'ap-southeast-1', domain: 'pomogit.example' }
  const state = {
    deployment_account_id: { value: config.accountId },
    deployment_region: { value: config.region },
    site_url: { value: `https://${config.domain}` },
    api_url: { value: `https://api.${config.domain}` },
  }
  assert.doesNotThrow(() => validateDeploymentState(config, state))
  for (const key of Object.keys(state)) {
    assert.throws(() => validateDeploymentState(config, { ...state, [key]: { value: 'wrong' } }), /Terraform state does not match/)
    const incomplete = { ...state }
    delete incomplete[key]
    assert.throws(() => validateDeploymentState(config, incomplete), /Terraform state does not match/)
  }
})

test('deployment settings reject wrong origins, malformed inputs and local/non-TLS databases', () => {
  const config = { accountId: '123456789012', awsProfile: 'pomogit', region: 'ap-southeast-1', domain: 'pomogit.example', budgetEmail: 'owner@example.com' }
  const env = { BETTER_AUTH_SECRET: 'test-only-secret-for-deployment-config-validation', NODE_ENV: 'production', FRONTEND_URL: 'https://pomogit.example', API_URL: 'https://api.pomogit.example', DATABASE_URL: 'postgresql://pomogit_runtime@db.example/pomogit', DATABASE_SSL: 'true', MIGRATION_DATABASE_URL: 'postgresql://owner@db.example/pomogit' }
  assert.doesNotThrow(() => validateSettings(config, env))
  for (const override of [{ accountId: 'wrong' }, { domain: 'pomogit.example;echo unsafe' }, { awsProfile: '--profile' }, { budgetEmail: '' }]) {
    assert.throws(() => validateSettings({ ...config, ...override }, env))
  }
  for (const override of [{ FRONTEND_URL: 'https://wrong.example' }, { DATABASE_SSL: 'false' }, { MIGRATION_DATABASE_URL: '' }, { MIGRATION_DATABASE_URL: env.DATABASE_URL }, { MIGRATION_DATABASE_URL: 'postgresql://owner@other.example/pomogit' }, { MIGRATION_DATABASE_URL: 'postgresql://owner@db.example/other' }, { DATABASE_URL: 'postgresql://user@127.0.0.1/pomogit' }]) {
    assert.throws(() => validateSettings(config, { ...env, ...override }))
  }
})
test('push refuses a different AWS account before touching deployment resources', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'pomogit-account-guard-'))
  try {
    const fake = join(temporary, 'aws')
    writeFileSync(fake, `#!${process.execPath}\nconsole.log(JSON.stringify({Account:'999999999999'}))\n`)
    chmodSync(fake, 0o700)
    const backendEnv = join(temporary, 'backend.env')
    writeFileSync(backendEnv, 'BETTER_AUTH_SECRET=test-only-secret-for-deployment-config-validation\nNODE_ENV=production\nFRONTEND_URL=https://pomogit.example\nAPI_URL=https://api.pomogit.example\nDATABASE_URL=postgresql://pomogit_runtime@db.example/pomogit\nDATABASE_SSL=true\nMIGRATION_DATABASE_URL=postgresql://owner@db.example/pomogit\n')
    const config = join(temporary, 'config.json')
    writeFileSync(config, JSON.stringify({ accountId: '123456789012', awsProfile: 'test-only', region: 'ap-southeast-1', domain: 'pomogit.example', budgetEmail: 'owner@example.com', backendEnv }))
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('./cli.mjs', import.meta.url)), 'push'], {
      encoding: 'utf8', env: { ...process.env, PATH: `${temporary}:${process.env.PATH}`, POMOGIT_DEPLOY_CONFIG: config },
    })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /different account/)
  } finally { rmSync(temporary, { recursive: true, force: true }) }
})
test('SPA rewriting preserves static asset paths', () => {
  const source = readFileSync(new URL('../../terraform/spa.js', import.meta.url), 'utf8')
  for (const [input, expected] of [['/', '/index.html'], ['/p/developer', '/index.html'], ['/assets/app-123.js', '/assets/app-123.js']]) {
    const sandbox = { event: { request: { uri: input } } }
    vm.runInNewContext(`${source}; result = handler(event).uri`, sandbox)
    assert.equal(sandbox.result, expected)
  }
})

test('maintenance responds without fetching an origin and supports HEAD', () => {
  const source = readFileSync(new URL('../../terraform/maintenance.js', import.meta.url), 'utf8')
  for (const method of ['GET', 'HEAD']) {
    const sandbox = { event: { request: { uri: '/anything', method } } }
    vm.runInNewContext(`${source}; result = handler(event)`, sandbox)
    assert.equal(sandbox.result.statusCode, 503)
    assert.equal(sandbox.result.headers['cache-control'].value, 'no-store')
    assert.equal(sandbox.result.headers['retry-after'].value, '3600')
    if (method === 'HEAD') assert.equal(sandbox.result.body, '')
    else assert.match(sandbox.result.body, /Taking a short break/)
  }
})
