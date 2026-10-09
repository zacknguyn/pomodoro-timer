// Run against a disposable backend; this creates test accounts and tasks.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = createRequire(import.meta.url)(process.env.POMOGIT_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.POMOGIT_APP_URL || 'http://127.0.0.1:5182'
const api = process.env.POMOGIT_API_URL || 'http://127.0.0.1:3101/api'
const output = '/tmp/pomogit-github-capture'
await mkdir(output, { recursive: true })
const browser = await chromium.launch()
const checks = []
try {
  for (const width of [1440, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 500, hasTouch: width < 500 })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const check = (name, result) => { assert(result, name); checks.push({ width, name }) }
    await page.goto(`${base}/#register`)
    const github = page.getByRole('button', { name: 'Continue with GitHub' })
    await github.waitFor()
    check('GitHub sign-in button responds to clicks', await github.isEnabled())
    await github.click()
    await page.getByRole('alert').waitFor()
    check('Missing configuration is explained without false login', (await page.getByRole('alert').textContent()).includes('not configured') && await page.locator('.premium-app').count() === 0)
    check('Email sign-up remains usable after the GitHub error', await page.locator('[name=email]').isEnabled())
    await page.screenshot({ path: `${output}/setup-${width}.png` })
    await page.locator('[name=email]').fill(`${randomUUID()}@github-capture-test.invalid`)
    await page.locator('[name=password]').fill(randomUUID())
    await page.locator('.pg-account-form button[type=submit]').click()
    await page.waitForFunction(() => document.querySelector('.wb-capture button') && !document.querySelector('.wb-capture button').disabled)
    const referenceUrl = 'https://github.com/zacknguyn/country-search-api'
    await page.getByRole('textbox', { name: 'Task title or reference link' }).fill(referenceUrl)
    await page.getByRole('button', { name: 'Create task', exact: true }).click()
    await page.locator('.wb-detail h2').waitFor()
    check('Repository URL has a readable task title', await page.locator('.wb-detail h2').textContent() === 'zacknguyn/country-search-api')
    check('Capture explains that issues were not imported', (await page.locator('.wb-notice').textContent()).includes('do not import issues'))
    const tasks = await (await context.request.get(`${api}/tasks`)).json()
    check('Full URL remains stored as the reference', tasks.length === 1 && tasks[0].referenceUrl === referenceUrl && tasks[0].title === 'zacknguyn/country-search-api')
    await page.reload()
    await page.locator('.wb-detail h2').waitFor()
    check('Readable title persists after reload', await page.locator('.wb-detail h2').textContent() === 'zacknguyn/country-search-api')
    check('Reference opens the original repository', await page.getByRole('link', { name: 'Open reference', exact: true }).getAttribute('href') === referenceUrl)
    check('Workspace fits the viewport', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.screenshot({ path: `${output}/captured-${width}.png` })
    await context.request.post(`${api}/auth/logout`)
    await page.goto(`${base}/?github_error=github_cancelled#login`)
    await page.getByRole('alert').waitFor()
    check('Cancelled callback displays a useful error', (await page.getByRole('alert').textContent()).includes('cancelled'))
    check('Callback marker is removed from the URL', !page.url().includes('github_error'))
    await page.route('**/api/auth/github', route => route.fulfill({ json: { authorizationUrl: 'https://untrusted.invalid/oauth' } }))
    await page.getByRole('button', { name: 'Continue with GitHub' }).click()
    await page.getByRole('alert').filter({ hasText: 'invalid GitHub' }).waitFor()
    check('Invalid authorization destinations do not redirect the browser', new URL(page.url()).origin === base)
    await page.unroute('**/api/auth/github')
    await page.route('**/api/auth/github', route => route.fulfill({ json: { authorizationUrl: 'https://github.com/login/oauth/authorize?client_id=test' } }))
    await page.route('https://github.com/login/oauth/authorize?*', route => route.fulfill({ contentType: 'text/html', body: '<h1>Provider redirect verified</h1>' }))
    await page.getByRole('button', { name: 'Continue with GitHub' }).click()
    await page.getByRole('heading', { name: 'Provider redirect verified' }).waitFor()
    check('Configured sign-in navigates to GitHub authorization', new URL(page.url()).origin === 'https://github.com')
    check('No browser errors', errors.length === 0)
    await context.close()
  }
  await writeFile(`${output}/results.json`, JSON.stringify(checks, null, 2))
  console.log(`${checks.length} GitHub/capture UI checks passed; evidence: ${output}`)
} finally { await browser.close() }
