// Requires an isolated app/backend pointing to a disposable initialized database.
// Defaults: frontend 5182, backend 3101. Never use real accounts or saved tasks.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = createRequire(import.meta.url)(process.env.POMOGIT_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.POMOGIT_APP_URL || 'http://127.0.0.1:5182'
const api = process.env.POMOGIT_API_URL || 'http://127.0.0.1:3101/api'
const output = process.env.POMOGIT_DELETE_OUTPUT || '/tmp/pomogit-task-delete'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.POMOGIT_CHROMIUM || undefined })
const cases = []
try {
  for (const width of [1440, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 500, hasTouch: width < 500, colorScheme: width < 500 ? 'dark' : 'light' })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const check = (name, condition) => { if (!condition) console.error({ width, name }); assert(condition, name); cases.push({ width, name }) }
    const tasks = async () => (await context.request.get(`${api}/tasks`)).json()
    const ready = async () => page.waitForFunction(() => document.querySelector('.wb-capture button') && !document.querySelector('.wb-capture button').disabled)
    const dismiss = async () => { const button = page.locator('[aria-label="Dismiss notification"]'); if (await button.isVisible()) await button.click() }
    await page.goto(`${base}/#register`)
    await page.locator('[name=email]').fill(`${randomUUID()}@delete-ui-test.invalid`)
    await page.locator('[name=password]').fill(randomUUID())
    await page.locator('.pg-account-form button[type=submit]').click(); await ready()
    const make = async (title, notes = []) => {
      const response = await context.request.post(`${api}/tasks`, { data: { title, notes } })
      assert.equal(response.status(), 201); return response.json()
    }
    const keep = await make('Keep this unrelated task')
    const target = await make('Delete this task', [{ id: randomUUID(), text: 'Keep my notes until confirmed', createdAt: new Date().toISOString(), kind: 'note' }])
    const first = await context.request.post(`${api}/sessions`, { data: { taskId: target.id, durationPlannedSeconds: 60 } })
    assert.equal(first.status(), 201)
    await context.request.patch(`${api}/sessions/${(await first.json()).id}`, { data: { action: 'end' } })
    const accountId = (await (await context.request.get(`${api}/auth/me`)).json()).user.id
    await page.evaluate(({ accountId, taskId }) => {
      localStorage.setItem(`pomogit.profile:${accountId}`, JSON.stringify({ featuredIds: [taskId], featuredDescriptions: { [taskId]: 'Disposable featured work' } }))
      localStorage.setItem(`pomogit.work-protocol:${accountId}`, JSON.stringify({ lastTaskId: taskId }))
    }, { accountId, taskId: target.id })
    const popup = async () => {
      await page.goto(`${base}/?delete=${randomUUID()}#tasks`); await ready()
      await page.locator(`.wb-board-card[data-task="${target.id}"] .wb-card-title`).click()
      await page.getByRole('dialog').waitFor()
    }
    await popup()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete task', exact: true }).click()
    await page.getByRole('dialog', { name: 'Delete task?' }).waitFor()
    check('Confirmation names the task and explains history removal', (await page.getByRole('dialog').textContent()).includes('Delete this task') && (await page.getByRole('dialog').textContent()).includes('focus history'))
    const contrast = await page.getByRole('dialog').locator('.wb-danger-solid').evaluate(button => {
      const ctx = document.createElement('canvas').getContext('2d')
      const luminance = color => { ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4 }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0) }
      const style = getComputedStyle(button), text = luminance(style.color), background = luminance(style.backgroundColor)
      return (Math.max(text, background) + .05) / (Math.min(text, background) + .05)
    })
    check('Delete confirmation has readable contrast', contrast >= 4.5)
    check('Cancel receives initial keyboard focus', await page.evaluate(() => document.activeElement?.textContent === 'Cancel'))
    await page.getByRole('dialog').evaluate(async dialog => { await Promise.all(dialog.getAnimations().map(animation => animation.finished)) })
    await page.screenshot({ path: `${output}/initial-${width}.png` })
    check('Confirmation stays inside viewport', await page.evaluate(() => { const r = document.querySelector('.wb-modal').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight }))
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    check('Cancel returns to the original task popup', await page.getByRole('dialog', { name: target.title, exact: true }).isVisible())
    check('Cancel preserves the task and notes', (await tasks()).find(task => task.id === target.id).notes.some(note => note.text.includes('until confirmed')))
    await page.getByRole('dialog').getByRole('button', { name: 'Open in Workspace', exact: true }).click()
    await page.locator('.wb-detail .wb-actions .wb-primary').click()
    await page.waitForFunction(() => document.querySelector('.wb-focus')?.dataset.running === 'true')
    await page.locator('.wb-detail > header').getByRole('button', { name: 'Delete task', exact: true }).click()
    check('Running timer blocks deletion and provides a way back', await page.getByRole('button', { name: 'Go to timer' }).isVisible() && await page.getByRole('dialog').getByRole('button', { name: 'Delete task', exact: true }).count() === 0)
    await page.getByRole('button', { name: 'Go to timer' }).click()
    await page.locator('.wb-focus-actions button:first-child').click()
    await page.waitForFunction(() => document.querySelector('.wb-focus header small')?.textContent === 'Paused')
    await page.locator('.wb-detail > header').getByRole('button', { name: 'Delete task', exact: true }).click()
    check('Paused timer also blocks deletion', await page.getByRole('button', { name: 'Go to timer' }).isVisible())
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await page.locator('.wb-focus-actions button:last-child').click(); await dismiss()
    await popup()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete task', exact: true }).click()
    await page.route(`${api}/tasks/${target.id}`, async route => {
      if (route.request().method() !== 'DELETE') return route.continue()
      await route.fulfill({ status: 503, headers: { 'content-type': 'application/json', 'access-control-allow-origin': new URL(base).origin, 'access-control-allow-credentials': 'true' }, body: JSON.stringify({ error: 'Deletion is temporarily unavailable.' }) })
    })
    await page.getByRole('dialog').getByRole('button', { name: 'Delete task', exact: true }).click()
    await page.getByRole('dialog').locator('[role=alert]').waitFor()
    check('Failed deletion keeps confirmation open with an error', (await page.getByRole('dialog').textContent()).includes('temporarily unavailable'))
    check('Failed deletion preserves saved data', (await tasks()).some(task => task.id === target.id))
    await page.screenshot({ path: `${output}/confirmation-${width}.png`, fullPage: true })
    await page.unroute(`${api}/tasks/${target.id}`)
    await page.getByRole('dialog').getByRole('button', { name: 'Delete task', exact: true }).click()
    await page.getByRole('dialog').waitFor({ state: 'hidden' }); await dismiss()
    await page.reload(); await ready()
    const snapshot = await (await context.request.get(`${api}/export`)).json()
    check('Confirmed deletion persists after reload and removes focus history', !snapshot.tasks.some(task => task.id === target.id) && !snapshot.focusSessions.some(session => session.taskId === target.id))
    check('Deleted task is cleared from featured work and saved selection', await page.evaluate(({ accountId, taskId }) => {
      const profile = JSON.parse(localStorage.getItem(`pomogit.profile:${accountId}`))
      const settings = JSON.parse(localStorage.getItem(`pomogit.work-protocol:${accountId}`))
      return !profile.featuredIds.includes(taskId) && !profile.featuredDescriptions[taskId] && settings.lastTaskId !== taskId
    }, { accountId, taskId: target.id }))
    check('Unrelated tasks remain', snapshot.tasks.some(task => task.id === keep.id))
    check('Deleted card is removed from the board', await page.locator(`.wb-board-card[data-task="${target.id}"]`).count() === 0)
    check('Page fits after deletion without JavaScript errors', errors.length === 0 && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    await context.close()
  }
  await writeFile(`${output}/results.json`, JSON.stringify(cases, null, 2))
  console.log(`${cases.length} task deletion UI checks passed; evidence: ${output}`)
} finally { await browser.close() }
