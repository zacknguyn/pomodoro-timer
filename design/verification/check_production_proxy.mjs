// Used by the disposable database rehearsal. Local TLS uses an untrusted test certificate.
import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { once } from 'node:events'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:net'
import { createRequire } from 'node:module'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

export async function verifyProductionProxy(databaseUrl) {
  assert.match(new URL(databaseUrl).pathname, /_verification$/)
  const root = fileURLToPath(new URL('../../', import.meta.url))
  const { chromium } = createRequire(import.meta.url)(process.env.POMOGIT_PLAYWRIGHT_MODULE)
  const socket = createServer().listen(0, '127.0.0.1')
  await once(socket, 'listening')
  const port = socket.address().port
  await new Promise(resolve => socket.close(resolve))
  const origin = `https://pomogit.localhost:${port}`
  const apiOrigin = `https://api.pomogit.localhost:${port}`
  const localApi = `https://127.0.0.1:${port}`
  const name = `pomogit-proxy-check-${randomUUID()}`
  const directory = `/tmp/${name}`
  const checks = []
  let browser, proxyCreated = false
  const api = spawn(process.execPath, ['--input-type=module', '-e', `
    import app from ${JSON.stringify(new URL('../../backend/src/app.js', import.meta.url).href)};
    const server = app.listen(0, '127.0.0.1', () => console.log(server.address().port));
  `], {
    cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env: {
      ...process.env, NODE_ENV: 'production', DATABASE_URL: databaseUrl, DATABASE_SSL: 'false',
      FRONTEND_URL: origin, API_URL: apiOrigin, DEV_BYPASS_AUTH: 'false',
      GITHUB_CLIENT_ID: '', GITHUB_CLIENT_SECRET: '', GITHUB_CALLBACK_URL: '',
    },
  })
  try {
    const timer = setTimeout(() => api.kill(), 15_000)
    let data
    try {
      [data] = await Promise.race([
        once(api.stdout, 'data'),
        once(api, 'exit').then(() => { throw Error('Production API exited before listening') }),
      ])
    } finally { clearTimeout(timer) }
    const apiPort = Number(String(data).trim())
    assert(apiPort > 0, 'Production API started')
    await mkdir(directory)
    execFileSync('npm', ['run', 'build', '--', '--outDir', `${directory}/frontend`], {
      cwd: `${root}frontend`, stdio: 'pipe', timeout: 120_000,
      env: { ...process.env, VITE_API_URL: `${apiOrigin}/api`, VITE_DEV_BYPASS_AUTH: 'false' },
    })
    const config = `{
 admin off
 auto_https disable_redirects
}
${origin} {
 bind 127.0.0.1
 tls internal
 root * /app
 @assets path /assets/*
 handle @assets {
 file_server
 }
 handle {
 try_files {path} /index.html
 file_server
 }
}
${apiOrigin} {
 bind 127.0.0.1
 tls internal
 reverse_proxy 127.0.0.1:${apiPort}
}
`
    await writeFile(`${directory}/Caddyfile`, config)
    execFileSync('docker', ['run', '-d', '--rm', '--name', name, '--network', 'host',
      '--mount', `type=bind,src=${directory}/Caddyfile,dst=/etc/caddy/Caddyfile,readonly`,
      '--mount', `type=bind,src=${directory}/frontend,dst=/app,readonly`, 'caddy:2-alpine'], { stdio: 'pipe', timeout: 60_000 })
    proxyCreated = true
    browser = await chromium.launch({ args: ['--disable-dev-shm-usage', '--no-proxy-server', '--host-resolver-rules=MAP *.pomogit.localhost 127.0.0.1, MAP pomogit.localhost 127.0.0.1'] })
    const context = await browser.newContext({ ignoreHTTPSErrors: true })
    for (let attempt = 0; ; attempt++) {
      try { assert.equal((await context.request.get(`${localApi}/ready`, { headers: { Host: new URL(apiOrigin).host } })).status(), 200); break }
      catch { if (attempt > 30) throw Error('Local HTTPS proxy was not ready'); await new Promise(resolve => setTimeout(resolve, 250)) }
    }
    checks.push('Separate frontend and API HTTPS hosts route to their correct services')
    assert.equal((await context.request.get(`${localApi}/assets/missing.js`, { headers: { Host: new URL(origin).host } })).status(), 404)
    assert.equal((await context.request.get(`${localApi}/api/auth/me`, { headers: { Host: new URL(apiOrigin).host } })).status(), 401)
    checks.push('Missing assets return 404 and API authentication stays enforced through HTTPS')
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${origin}/#register`)
    await page.locator('[name=email]').fill(`${randomUUID()}@https-test.invalid`)
    await page.locator('[name=password]').fill(randomUUID())
    await page.locator('.pg-account-form button[type=submit]').click()
    await page.locator('.dash-empty').waitFor()
    const cookies = await context.cookies()
    assert(cookies.some(cookie => cookie.name === '__Host-pomogit_session' && cookie.secure && cookie.httpOnly && cookie.sameSite === 'Lax' && cookie.domain === 'api.pomogit.localhost'))
    checks.push('Browser accepts the API-host-only Secure HttpOnly session and opens Home across origins')
    await page.reload()
    await page.locator('.dash-empty').waitFor()
    assert.equal(await page.evaluate(async url => (await fetch(url, { credentials: 'include' })).status, `${apiOrigin}/api/auth/me`), 200)
    assert.equal(errors.length, 0)
    checks.push('Production browser session survives a cross-origin HTTPS reload without JavaScript errors')
    assert.equal(await page.evaluate(async url => (await fetch(url, { method: 'POST', credentials: 'include' })).status, `${apiOrigin}/api/auth/logout`), 204)
    assert.equal(await page.evaluate(async url => (await fetch(url, { credentials: 'include' })).status, `${apiOrigin}/api/auth/me`), 401)
    checks.push('Cross-origin logout revokes the session and subsequent API requests reject it')
    await page.screenshot({ path: '/tmp/pomogit-production-readiness/https-home.png', fullPage: true })
    return checks
  } finally {
    await browser?.close()
    api.kill()
    if (proxyCreated) execFileSync('docker', ['rm', '-f', name], { stdio: 'pipe', timeout: 30_000 })
    await rm(directory, { recursive: true, force: true })
  }
}
