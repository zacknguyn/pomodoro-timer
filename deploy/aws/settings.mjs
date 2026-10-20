import assert from 'node:assert/strict'
import { validateProductionConfig } from '../../backend/src/lib/productionConfig.js'

export function validateDeploymentState(config, state) {
  for (const [key, expected] of [
    ['deployment_account_id', config.accountId],
    ['deployment_region', config.region],
    ['site_url', `https://${config.domain}`],
    ['api_url', `https://api.${config.domain}`],
  ]) {
    assert.equal(state[key]?.value, expected, `Terraform state does not match configured ${key}; review and apply the matching infrastructure plan first.`)
  }
}

export function validateSettings(config, env) {
  assert.match(config.accountId || '', /^[0-9]{12}$/, 'Set the expected AWS account ID')
  assert.match(config.awsProfile || '', /^[A-Za-z0-9_][A-Za-z0-9_@.-]*$/, 'Set an AWS CLI profile name')
  assert.match(config.region || '', /^[a-z]{2}-[a-z]+-[0-9]+$/, 'Set an AWS region')
  assert.match(config.domain || '', /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/, 'Set a plain lowercase public hostname')
  assert.match(config.budgetEmail || '', /^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Set the budget notification email')
  assert.match(config.hostedZoneId || '', /^(?:Z[A-Z0-9]+)?$/, 'Invalid hosted zone ID')
  validateProductionConfig(env)
  assert.equal(env.NODE_ENV, 'production', 'Use NODE_ENV=production in the deployment environment')
  assert.equal(env.FRONTEND_URL, `https://${config.domain}`, 'Deployment domain must match FRONTEND_URL')
  assert.equal(env.API_URL, `https://api.${config.domain}`, 'API_URL must match the dedicated API hostname')
  assert.ok(config.sitePaused === undefined || typeof config.sitePaused === 'boolean', 'sitePaused must be a boolean')
  assert.equal(env.DATABASE_SSL, 'true', 'The remote PostgreSQL database requires verified TLS')
  assert.ok(!['localhost', '127.0.0.1', '[::1]'].includes(new URL(env.DATABASE_URL).hostname), 'Lambda needs the remote deployment database, not your local database')
  validateProductionConfig({ ...env, DATABASE_URL: env.MIGRATION_DATABASE_URL })
  const runtime = new URL(env.DATABASE_URL), migration = new URL(env.MIGRATION_DATABASE_URL)
  assert.equal(decodeURIComponent(runtime.username), 'pomogit_runtime', 'Use the restricted pomogit_runtime login for DATABASE_URL')
  assert.notEqual(decodeURIComponent(migration.username), 'pomogit_runtime', 'Migrations require a separate schema-owner login')
  assert.equal(migration.host, runtime.host, 'Both database URLs must use the same direct endpoint')
  assert.equal(migration.pathname, runtime.pathname, 'Both database URLs must target the same database')
}
