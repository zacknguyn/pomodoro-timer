// Mock task checks plus an account-mode frontend with every API request intercepted.
// Never use this against account data. Requires a second dev server with bypass disabled.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from './browser.mjs'
const base = process.env.POMOGIT_APP_URL || 'http://127.0.0.1:5190'
const output = process.env.POMOGIT_INTERACTION_OUTPUT || '/tmp/pomogit-interaction-consistency'
const browser = await chromium.launch()
const checks = []
await mkdir(output, { recursive: true })
try {
  for (const width of [375, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${base}/#tasks`)
    await page.locator('.wb-board').waitFor()
    assert.match(await page.locator('.wb-account-menu nav p').textContent(), /Local UI preview/)
    const check = (name, condition) => { assert(condition, name); checks.push({ width, name }) }
    for (const menu of ['.wb-page-menu', '.wb-account-menu']) {
      await page.locator(`${menu} summary`).click()
      await page.keyboard.press('Tab'); await page.keyboard.press('Escape')
      check('Escape closes menu and returns focus', await page.locator(menu).evaluate(element => !element.open && document.activeElement === element.querySelector('summary')))
    }
    const opener = page.getByRole('button', { name: 'Fix the OAuth retry', exact: true })
    await opener.click(); await page.getByRole('dialog').getByRole('button', { name: 'Edit', exact: true }).click()
    const title = page.locator('input[name=title]')
    await title.fill('   ')
    await page.getByRole('button', { name: 'Save changes', exact: true }).click()
    check('Whitespace title focuses and marks the invalid field', await title.evaluate(element => element === document.activeElement && !element.validity.valid && element.getAttribute('aria-invalid') === 'true'))
    await title.fill('Fix the OAuth retry')
    check('Correcting title clears validation immediately', await title.evaluate(element => element.validity.valid && !element.hasAttribute('aria-invalid')))
    const reference = page.locator('input[name=referenceUrl]')
    await reference.fill('ftp://example.com/file')
    await page.getByRole('button', { name: 'Save changes', exact: true }).click()
    check('Unsupported reference focuses its invalid field', await reference.evaluate(element => element === document.activeElement && element.validationMessage.includes('http or https')))
    await reference.fill('https://example.com/review')
    check('Corrected reference can be submitted', await reference.evaluate(element => element.validity.valid && !element.hasAttribute('aria-invalid')))
    // Hold a mock update to inspect the pending state deterministically.
    await page.evaluate(async () => {
      const { mockWorkspace } = await import('/src/lib/mockWorkspace.js')
      const original = mockWorkspace.updateTask.bind(mockWorkspace)
      mockWorkspace.updateTask = async (...args) => { await new Promise(resolve => { window.releaseAuditSave = resolve }); return original(...args) }
    })
    await page.getByRole('button', { name: 'Save changes', exact: true }).click()
    await page.getByRole('button', { name: 'Saving…', exact: true }).waitFor()
    check('Pending save exposes busy state and disables dismissal', await page.getByRole('dialog').getAttribute('aria-busy') === 'true' && await page.getByRole('button', { name: 'Close Edit task', exact: true }).isDisabled() && await page.getByRole('button', { name: 'Cancel', exact: true }).isDisabled())
    await page.keyboard.press('Escape')
    check('Escape keeps an in-flight save open', await page.getByRole('dialog', { name: 'Edit task', exact: true }).isVisible())
    await page.evaluate(() => window.releaseAuditSave())
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
    check('Successful save restores the original card focus', await opener.evaluate(element => element === document.activeElement))
    await page.getByRole('button', { name: 'Dismiss notification', exact: true }).click()
    const connected = await browser.newPage({ viewport: { width, height: 900 } })
    connected.on('pageerror', error => errors.push(error.message))
    let releaseConnect
    const pending = new Promise(resolve => { releaseConnect = resolve })
    await connected.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/github/projects' && route.request().method() === 'POST') { await pending; return route.fulfill({ status: 503, json: { error: 'Temporary connection failure.' } }) }
      assert.equal(route.request().method(), 'GET', 'Unexpected account mutation')
      const responses = {
        '/api/auth/me': { user: { id: 'interaction-fixture', email: 'fixture@test.invalid', role: 'superadmin' } },
        '/api/admin/overview': { summary: { users: 1, suspended: 0, tasks: 0, sessionsToday: 0 }, activity: [] },
        '/api/admin/users': [{ id: 'delete-fixture', email: 'user@fixture.invalid', role: 'user', banned: false, created_at: new Date().toISOString(), task_count: 0, focus_session_count: 0 }],
        '/api/tasks': [], '/api/checkpoints': [], '/api/sessions/active': null,
        '/api/sessions': [], '/api/export': { tasks: [], focusSessions: [], checkpoints: [] },
        '/api/github/projects': [], '/api/github/repositories': { needsGithub: true, repositories: [], hasMore: false },
      }
      assert(Object.hasOwn(responses, path), `Unexpected API request: ${path}`)
      return route.fulfill({ json: responses[path] })
    })
    await connected.goto(`${process.env.POMOGIT_CONNECTED_APP_URL || 'http://127.0.0.1:5191'}/#tasks`)
    await connected.locator('.wb-board').waitFor()
    const connectOpener = connected.getByRole('button', { name: /^(Connect GitHub repository|Manage projects)$/ })
    await connectOpener.click()
    await connected.locator('[name=repository]').fill('https://github.com/octocat/Hello-World')
    await connected.getByRole('button', { name: 'Connect repository', exact: true }).click()
    await connected.waitForFunction(() => document.querySelector('.wb-modal')?.getAttribute('aria-busy') === 'true')
    check('Repository request uses the shared busy dismissal state', await connected.getByRole('dialog').locator('header button').isDisabled())
    await connected.keyboard.press('Escape')
    check('Escape preserves pending repository request', await connected.getByRole('dialog').isVisible())
    releaseConnect()
    await connected.getByRole('dialog').getByRole('alert').filter({ hasText: 'Temporary connection failure.' }).waitFor()
    check('Failure re-enables close and preserves repository input', !await connected.getByRole('dialog').locator('header button').isDisabled() && await connected.locator('[name=repository]').inputValue() === 'https://github.com/octocat/Hello-World')
    await connected.screenshot({ path: `${output}/repository-error-${width}.png` })
    await connected.keyboard.press('Escape')
    check('Dismissal after failure restores repository opener', await connectOpener.evaluate(element => element === document.activeElement))
    await connected.goto(`${process.env.POMOGIT_CONNECTED_APP_URL || 'http://127.0.0.1:5191'}/#admin`)
    const deleteAccount = connected.getByRole('button', { name: 'Delete user@fixture.invalid', exact: true })
    await deleteAccount.click()
    check('Account deletion has an explicit cancellation path', await connected.getByRole('button', { name: 'Confirm delete user@fixture.invalid', exact: true }).isVisible())
    await connected.getByRole('button', { name: 'Cancel deleting user@fixture.invalid', exact: true }).click()
    await connected.waitForFunction(() => document.activeElement?.classList.contains('danger-link'))
    check('Cancel restores account delete action and its focus', await deleteAccount.isVisible() && await deleteAccount.evaluate(element => element === document.activeElement))
    check('No browser errors', errors.length === 0)
    await connected.close()
    await page.close()
  }
  await writeFile(`${output}/results.json`, JSON.stringify(checks, null, 2))
  console.log(`${checks.length} interaction consistency checks passed; evidence: ${output}`)
} finally { await browser.close() }
