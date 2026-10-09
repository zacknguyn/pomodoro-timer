// Connected production UI audit. Requires a disposable initialized backend.
// POMOGIT_PLAYWRIGHT_MODULE=/path/to/playwright node design/verification/check_connected_workspace.mjs
// POMOGIT_APP_URL defaults to http://127.0.0.1:5181 (same-origin API proxy).
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = createRequire(import.meta.url)(process.env.POMOGIT_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.POMOGIT_APP_URL || 'http://127.0.0.1:5181'
const output = process.env.POMOGIT_CONNECTED_OUTPUT || '/tmp/pomogit-connected-workspace'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.POMOGIT_CHROMIUM || undefined })
const cases = []
const users = []
try {
  for (const mobile of [false, true]) {
    const width = mobile ? 390 : 1440
    const options = { viewport: { width, height: 900 }, isMobile: mobile, hasTouch: mobile }
    const context = await browser.newContext(options)
    const peer = await browser.newContext(options)
    const page = await context.newPage()
    const peerPage = await peer.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const email = `${randomUUID()}@ui-test.invalid`, password = randomUUID()
    const check = (name, condition) => { assert(condition, name); cases.push({ width, name }) }
    const workspace = async (tab = page) => { await tab.locator('.premium-app').waitFor(); await tab.locator('.wb-capture button').waitFor({ state: 'visible' }); await tab.waitForFunction(() => !document.querySelector('.wb-capture button')?.disabled) }
    const dismiss = async () => { const close = page.locator('.wb-toast button[aria-label="Dismiss notification"]'); if (await close.isVisible()) await close.click() }
    const login = async (tab, address = email, secret = password) => {
      await tab.goto(`${base}/#login`)
      await tab.locator('[name=email]').fill(address); await tab.locator('[name=password]').fill(secret)
      await tab.locator('.pg-account-form button[type=submit]').click()
      await workspace(tab)
    }
    const logout = async () => {
      await dismiss(); await page.locator('.wb-account-menu summary').click()
      await page.getByRole('button', { name: 'Log out', exact: true }).click()
      if (await page.locator('.wb-modal').isVisible()) await page.locator('.wb-modal').getByRole('button', { name: 'Log out', exact: true }).click()
      await page.locator('.pg-account-form').waitFor()
    }
    await page.goto(`${base}/#tasks`)
    await page.locator('.pg-account-form').waitFor()
    check('Direct Board links require login', page.url().endsWith('#login') && await page.locator('.premium-app').count() === 0)
    await page.goto(`${base}/#register`)
    await page.locator('[name=email]').fill(email); await page.locator('[name=password]').fill(password)
    await page.getByRole('button', { name: 'Continue with GitHub' }).click()
    await page.getByRole('alert').waitFor()
    check('Unconfigured GitHub reports setup instead of bypassing login', (await page.getByRole('alert').textContent()).includes('not configured') && await page.locator('.premium-app').count() === 0)
    await page.locator('.pg-account-form button[type=submit]').click(); await workspace()
    const me = await context.request.get(`${base}/api/auth/me`)
    users.push((await me.json()).user.id)
    check('Registration establishes a real HttpOnly session', (await context.cookies()).some(cookie => cookie.name === 'pomogit_session' && cookie.httpOnly))
    check('New accounts start empty', await page.locator('.wb-work-empty').isVisible())
    await page.getByRole('textbox', { name: 'Task title or reference link' }).fill('Verify connected workspace')
    await page.getByRole('button', { name: 'Create task', exact: true }).click()
    await page.locator('.wb-detail').waitFor(); await dismiss()
    await page.goto(`${base}/#tasks`); await page.locator('.wb-card-title').click()
    await page.locator('.wb-modal').getByRole('button', { name: 'Edit', exact: true }).click()
    await page.locator('[name=project]').fill('connected-checks')
    await page.locator('[name=nextStep]').fill('Pick this up in another browser')
    await page.locator('[name=referenceUrl]').fill('https://github.com/example/repo/issues/1')
    await page.locator('[name=status]').selectOption('ready')
    await page.locator('[name=note]').fill('Saved account context')
    await page.locator('button[form=wb-edit-task]').click()
    await page.locator('.wb-modal').waitFor({ state: 'hidden' }); await dismiss()
    await page.locator('.wb-card-title').click(); await page.locator('.wb-modal footer .wb-primary').click()
    await page.locator('.wb-detail .wb-actions .wb-primary').click()
    await page.waitForFunction(() => document.querySelector('.wb-focus')?.dataset.running === 'true')
    await page.reload(); await workspace()
    check('Reload restores active focus and In progress task', await page.locator('.wb-detail .wb-status').getAttribute('data-status') === 'progress')
    await page.locator('.wb-focus-actions button:first-child').click()
    await page.waitForFunction(() => document.querySelector('.wb-focus header small')?.textContent === 'Paused')
    await logout()
    check('Logout clears the real cookie', !(await context.cookies()).some(cookie => cookie.name === 'pomogit_session'))
    check('Revoked session cannot read workspace', (await context.request.get(`${base}/api/tasks`)).status() === 401)
    await page.locator('[name=email]').fill(email); await page.locator('[name=password]').fill(randomUUID())
    await page.locator('.pg-account-form button[type=submit]').click()
    await page.locator('.pg-account-entry [role=alert]').waitFor()
    check('Incorrect password stays on login with a clear error', (await page.locator('[role=alert]').textContent()).includes('incorrect'))
    await login(peerPage)
    check('Separate browser restores project, next step and note', (await peerPage.locator('.wb-detail').textContent()).includes('Saved account context') && (await peerPage.locator('.wb-next-step').textContent()).includes('another browser'))
    check('Paused timer survives logout and another browser', await peerPage.locator('.wb-focus header small').textContent() === 'Paused')
    await login(page)
    await page.locator('.wb-focus-actions button:first-child').click()
    await page.locator('.wb-detail footer button').click()
    await page.locator('.wb-modal footer button:nth-child(2)').click()
    await page.locator('#wb-closing-note textarea').fill('Completed from another login')
    await page.locator('button[form=wb-closing-note]').click(); await page.locator('.wb-modal').waitFor({ state: 'hidden' }); await dismiss()
    await peerPage.reload(); await workspace(peerPage)
    await peerPage.goto(`${base}/#review`)
    await peerPage.locator('.wb-activity').waitFor()
    check('Completion and closing note are shared across browsers', (await peerPage.locator('.wb-activity').textContent()).includes('Completed from another login'))
    const snapshot = await context.request.get(`${base}/api/export`), data = await snapshot.json()
    check('Export includes task details and ended focus history', data.tasks[0].project === 'connected-checks' && data.focusSessions[0].status === 'ended')
    const storage = await page.evaluate(() => ({ ...localStorage }))
    check('Connected mode never creates mock data or stores passwords', !storage['pomogit.mock.v1'] && !JSON.stringify(storage).includes(password))
    await page.goto(`${base}/#review`); await page.locator('.wb-activity').waitFor()
    await page.screenshot({ path: `${output}/activity-${width}.png`, fullPage: true })
    check('Viewport fits', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    check('No JavaScript errors', errors.length === 0)
    await logout()
    await page.goBack()
    check('Browser Back cannot reopen signed-out workspace', await page.locator('.pg-account-form').isVisible() && await page.locator('.premium-app').count() === 0)
    // An expired server session must close the mounted workspace on an API 401.
    await login(page)
    await context.request.post(`${base}/api/auth/logout`)
    await page.getByRole('textbox', { name: 'Task title or reference link' }).fill('Must not save after expiry')
    await page.getByRole('button', { name: 'Create task', exact: true }).click()
    await page.locator('.pg-account-form').waitFor()
    check('Expired cookie redirects to login without saving a task', await page.locator('.premium-app').count() === 0)
    await page.route('**/api/auth/login', route => route.abort())
    await page.locator('[name=email]').fill(email); await page.locator('[name=password]').fill(password)
    await page.locator('.pg-account-form button[type=submit]').click()
    await page.locator('.pg-account-entry [role=alert]').waitFor()
    check('Unavailable login service offers an actionable error and retains input', (await page.locator('[role=alert]').textContent()).includes('reach') && await page.locator('[name=email]').inputValue() === email)
    await page.unroute('**/api/auth/login')
    await page.goto(`${base}/#register`)
    await page.locator('[name=email]').fill(`${randomUUID()}@ui-test.invalid`); await page.locator('[name=password]').fill(randomUUID())
    await page.locator('.pg-account-form button[type=submit]').click(); await workspace()
    users.push((await (await context.request.get(`${base}/api/auth/me`)).json()).user.id)
    check('Switching accounts clears the previous workspace and draft selection', await page.locator('.wb-work-empty').isVisible() && await page.locator('.wb-detail').count() === 0)
    await logout()
    await page.route('**/api/auth/me', route => route.abort())
    await page.reload(); await page.locator('main [role=alert]').waitFor()
    check('Unavailable account restoration never falls back to a mock workspace', await page.locator('.premium-app').count() === 0)
    await page.unroute('**/api/auth/me')
    await page.getByRole('button', { name: 'Try again', exact: true }).click()
    await page.locator('.pg-account-form').waitFor()
    check('Account service retry returns to login', await page.locator('[name=email]').isVisible())
    await context.close(); await peer.close()
  }
  await writeFile(`${output}/results.json`, JSON.stringify({ cases, users }, null, 2))
  console.log(`${cases.length} connected UI checks passed; evidence: ${output}`)
} finally { await browser.close() }
