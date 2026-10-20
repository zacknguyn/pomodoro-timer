// Requires the locally packaged pomogit-lambda-package image; never calls AWS or a real database.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
const name = `pomogit-lambda-runtime-${randomUUID()}`
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
let created = false
try {
  docker('run', '-d', '--rm', '--name', name, '-p', '127.0.0.1::8080',
    '-e', `BETTER_AUTH_SECRET=${randomUUID()}${randomUUID()}`, '-e', 'NODE_ENV=production', '-e', 'FRONTEND_URL=https://pomogit.example',
    '-e', 'DATABASE_URL=postgresql://unused@db.example/pomogit', '-e', 'DATABASE_SSL=true',
    '-e', 'DEV_BYPASS_AUTH=false', 'pomogit-lambda-package')
  created = true
  const address = docker('port', name, '8080/tcp')
  assert.match(address, /^127\.0\.0\.1:\d+$/)
  const endpoint = `http://${address}/2015-03-31/functions/function/invocations`
  const invoke = async (path, method = 'GET', headers = {}) => {
    const response = await fetch(endpoint, {
      method: 'POST', signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({ version: '2.0', routeKey: '$default', rawPath: path, rawQueryString: '',
        headers: { host: 'api.example', ...headers }, isBase64Encoded: false,
        requestContext: { stage: '$default', requestId: 'runtime-check', http: { method, path, protocol: 'HTTP/1.1', sourceIp: '127.0.0.1' } } }),
    })
    assert.equal(response.status, 200)
    return response.json()
  }
  for (let attempt = 0; ; attempt++) {
    try { assert.equal((await invoke('/health')).statusCode, 200); break }
    catch { if (attempt > 20) throw Error('Local Lambda emulator did not become ready'); await new Promise(resolve => setTimeout(resolve, 250)) }
  }
  for (const path of ['/api/tasks', '/api/sessions/active', '/api/checkpoints', '/api/export', '/api/github/projects', '/api/admin/users']) {
    assert.equal((await invoke(path)).statusCode, 401)
  }
  assert.equal((await invoke('/api/auth/logout', 'POST', { origin: 'https://untrusted.example' })).statusCode, 403)
  const logout = await invoke('/api/auth/logout', 'POST', { origin: 'https://pomogit.example' })
  assert.equal(logout.statusCode, 204)
  assert(logout.cookies.some(cookie => cookie.includes('__Host-pomogit_session=') && cookie.includes('Secure') && cookie.includes('HttpOnly')))
  assert.equal((await invoke('/api/missing')).statusCode, 404)
  console.log('10 Lambda runtime checks passed: health, six protected routes, origin rejection, cookie preservation and missing-route status.')
} finally { if (created) docker('rm', '-f', name) }
