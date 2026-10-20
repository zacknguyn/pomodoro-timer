// Production-build comparison with isolated API fixtures and cold browser contexts.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from './browser.mjs'

const base = process.env.POMOGIT_APP_URL || 'http://127.0.0.1:5195'
assert(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname), 'Use a local production build')
const stage = process.env.POMOGIT_LOADING_STAGE || 'after'
const output = process.env.POMOGIT_LOADING_OUTPUT || '/tmp/pomogit-frontend-loading'
const browser = await chromium.launch({ args: ['--disable-gpu', '--disable-dev-shm-usage'] })
const results = []
const vietnamese = 'Tiếng Việt: Trần Nguyễn, Đặng, ẮặỄỡỰự'
try {
  for (const view of (process.env.POMOGIT_LOADING_VIEWS || 'home,home,home,login,landing').split(',')) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
    await context.addInitScript(view => {
      localStorage.setItem('pomogit.workspace-opened', 'true')
      localStorage.setItem('pomogit.work-protocol:loading-fixture', JSON.stringify({ brightness: 'dark', navigation: 'sidebar', motion: 'reduced' }))
      window.loadingLcp = 0
      new PerformanceObserver(list => { window.loadingLcp = list.getEntries().at(-1)?.startTime || 0 }).observe({ type: 'largest-contentful-paint', buffered: true })
      // Freeze calendar data only; keep native Performance/Resource Timing intact.
      const NativeDate = Date
      const fixed = NativeDate.parse('2026-10-20T12:00:00Z')
      window.Date = class extends NativeDate {
        constructor(...args) { super(...(args.length ? args : [fixed])) }
        static now() { return fixed }
      }
      // Record readiness in-page rather than including automation polling delays.
      window.loadingReadyMs = 0
      const selector = view === 'home' ? '.dash-metric' : '.pg-public h1'
      const observer = new MutationObserver(() => {
        if (!document.querySelector(selector)) return
        observer.disconnect()
        requestAnimationFrame(() => document.fonts.ready.then(() => {
          requestAnimationFrame(() => { window.loadingReadyMs = performance.now() })
        }))
      })
      observer.observe(document, { childList: true, subtree: true })
    }, view)
    const page = await context.newPage(), errors = [], failures = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('requestfailed', request => failures.push(new URL(request.url()).pathname))
    const client = await context.newCDPSession(page)
    await client.send('Network.enable')
    await client.send('Network.setCacheDisabled', { cacheDisabled: true })
    if (view === 'home') {
      await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })
      await client.send('Network.emulateNetworkConditions', { offline: false, latency: 80, downloadThroughput: 200_000, uploadThroughput: 100_000 })
    }
    let signedIn = view === 'home'
    let accountFailure = false
    const user = { id: 'loading-fixture', email: 'fixture@test.invalid', role: 'user' }
    const stamp = '2026-10-20T10:00:00Z'
    const task = { id: 'a', title: vietnamese, status: 'done', project: 'web-client', nextStep: '', notes: [{ id: 'n', text: vietnamese, kind: 'completion', createdAt: stamp }], createdAt: stamp }
    const data = {
      '/api/tasks': [task], '/api/checkpoints': [], '/api/sessions/active': null,
      '/api/sessions': [{ id: 's', taskId: 'a', status: 'ended', durationActualSeconds: 120, startedAt: stamp, endedAt: stamp }],
      '/api/export': { tasks: [task], checkpoints: [], focusSessions: [] }, '/api/github/projects': [],
    }
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/auth/me' && accountFailure) return route.fulfill({ status: 503, json: { error: 'Fixture account service unavailable' } })
      if (path === '/api/auth/me') return route.fulfill({ status: signedIn ? 200 : 401, json: signedIn ? { user } : { error: 'Not signed in' } })
      if (path === '/api/auth/login') { signedIn = true; return route.fulfill({ json: { user } }) }
      assert.equal(route.request().method(), 'GET', 'No unexpected fixture mutations')
      assert(Object.hasOwn(data, path), `Unexpected fixture request ${path}`)
      return route.fulfill({ json: data[path] })
    })
    await page.goto(`${base}/#${view}`)
    await page.waitForFunction(() => window.loadingReadyMs > 0)
    const readyMs = await page.evaluate(() => window.loadingReadyMs)
    await page.waitForTimeout(250)
    const measurements = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource').map(r => ({ path: new URL(r.name).pathname, bytes: r.decodedBodySize, startMs: r.startTime, durationMs: r.duration }))
      const sum = test => resources.filter(r => test(r.path)).reduce((n, r) => n + r.bytes, 0)
      return { lcpMs: window.loadingLcp, jsBytes: sum(p => p.endsWith('.js')), cssBytes: sum(p => p.endsWith('.css')), fontBytes: sum(p => /\.(ttf|woff2?)$/.test(p)), resources }
    })
    assert.deepEqual(errors, [], 'No script errors during initial load')
    assert.deepEqual(failures, [], 'No failed asset requests')
    assert(measurements.jsBytes > 0 && measurements.fontBytes > 0, 'Native resource sizes must be available')
    if (stage === 'after') {
      const scripts = measurements.resources.filter(r => r.path.endsWith('.js')).map(r => r.path)
      if (view === 'home') assert(!scripts.some(p => /AuthScreen|LandingScreen/.test(p)), 'Account Home must not download public screens')
      if (view === 'login') assert(scripts.some(p => /AuthScreen/.test(p)) && !scripts.some(p => /LandingScreen/.test(p)), 'Login loads only its public screen')
      if (view === 'landing') assert(scripts.some(p => /LandingScreen/.test(p)) && !scripts.some(p => /AuthScreen/.test(p)), 'Landing loads only its public screen')
      assert(!measurements.resources.some(r => r.path.endsWith('.ttf')), 'Application uses compressed fonts')
    }
    await page.evaluate(async text => {
      for (const weight of [400, 500, 600]) {
        const loaded = await document.fonts.load(`${weight} 20px "Pomogit Barlow"`, text)
        if (!loaded.length || loaded.some(face => face.status !== 'loaded')) throw Error('Barlow did not load')
      }
      if (!(await document.fonts.load('600 20px "Pomogit Bricolage"', text)).length) throw Error('Bricolage did not load')
    }, vietnamese)
    results.push({ view, readyMs, ...measurements })
    if (stage === 'after' && view === 'home' && results.length === 1) {
      await client.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
      await page.route('**/assets/AuthScreen-*.js', async route => { await page.waitForTimeout(350); await route.continue() })
      await page.evaluate(() => window.dispatchEvent(new CustomEvent('pomogit:auth-expired')))
      await page.getByText('Loading page…', { exact: true }).waitFor()
      await page.getByRole('textbox', { name: 'Email', exact: true }).fill('fixture@test.invalid')
      await page.locator('input[name=password]').fill('fixture-only')
      await page.getByRole('button', { name: 'Log in with email', exact: true }).click()
      await page.locator('.dash-metric').first().waitFor()
      assert.equal(new URL(page.url()).hash, '#home', 'Lazy auth returns to Home after sign-in')
      assert.deepEqual(errors, [], 'Lazy transition has no script errors')
      accountFailure = true
      await page.reload()
      await page.getByRole('alert').waitFor()
      assert.equal(await page.locator('.premium-app,.pg-account-form').count(), 0, 'Restoration failure exposes neither workspace nor sign-in form')
      accountFailure = false
      signedIn = false
      await page.getByRole('button', { name: 'Try again', exact: true }).click()
      await page.getByRole('textbox', { name: 'Email', exact: true }).waitFor()
      assert.deepEqual(errors, [], 'Restoration retry has no script errors')
    }
    console.log(`${stage}/${view}: ${Math.round(readyMs)} ms ready; ${measurements.jsBytes} JS bytes, ${measurements.fontBytes} font bytes`)
    await context.close()
  }
} finally { await browser.close() }
await mkdir(output, { recursive: true })
await writeFile(`${output}/${stage}.json`, JSON.stringify(results, null, 2))
console.log(`Cold-load and route checks passed: ${output}/${stage}.json`)
