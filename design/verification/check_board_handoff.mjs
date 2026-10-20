// UI-only browser storage; all API access is blocked.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = createRequire(import.meta.url)(process.env.POMOGIT_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.POMOGIT_PREVIEW_URL || 'http://127.0.0.1:5192'
const output = '/tmp/pomogit-board-handoff'
await mkdir(output, { recursive: true })
const browser = await chromium.launch(), checks = []
try {
 for (const width of (process.env.POMOGIT_HANDOFF_WIDTHS || '1440,1024,768,375').split(',').map(Number)) for (const theme of ['dark', 'light']) for (const navigation of ['sidebar', 'navbar']) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: 'reduce' })
  await context.addInitScript(({ theme, navigation }) => {
   const tasks = Array.from({ length: 24 }, (_, i) => ({ id: `task-${i}`, title: `Review callback item ${i}`, status: 'ready', project: 'checkout-api', nextStep: `Verify the callback response for item ${i}.`, notes: [], createdAt: '2026-10-15T09:00:00Z' }))
   tasks.push({ id: 'other', title: 'Check search navigation', status: 'ready', project: 'web-client', nextStep: '', notes: [], createdAt: '2026-10-15T09:00:00Z' })
   localStorage.setItem('pomogit.mock.v1', JSON.stringify({ tasks, sessions: [], checkpoints: [], session: null, seq: 100 }))
   localStorage.setItem('pomogit.work-protocol', JSON.stringify({ brightness: theme, navigation, motion: 'reduced', expand: false }))
  }, { theme, navigation })
  const page = await context.newPage(), errors = [], api = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/api/**', route => { api.push(route.request().url()); return route.abort() })
  const check = (name, result) => { assert(result, `${width}/${theme}/${navigation}: ${name}`); checks.push({ width, theme, navigation, name }) }
  const store = () => page.evaluate(() => JSON.parse(localStorage.getItem('pomogit.mock.v1')))
  await page.goto(`${base}/#tasks`); await page.locator('.wb-board-card').first().waitFor()
  await page.getByRole('textbox', { name: 'Search tasks', exact: true }).fill('callback')
  const project = page.getByRole('combobox', { name: 'Filter by project', exact: true, includeHidden: true })
  if (!await project.isVisible()) await page.locator('.wb-filter-toggle').click()
  await project.selectOption('checkout-api')
  await page.getByRole('combobox', { name: 'Filter by status', exact: true }).selectOption('ready')
  const card = page.locator('[data-task="task-14"] .wb-card-title')
  await card.scrollIntoViewIfNeeded(); await card.click()
  const scroll = await page.evaluate(() => ({ main: document.querySelector('.wb-main').scrollTop, lane: document.querySelector('[data-drop=ready]').scrollTop }))
  const dialog = page.getByRole('dialog')
  check('Card opens read-only details with separate Edit and Work actions', await dialog.locator('input,textarea').count() === 0 && await dialog.getByRole('button', { name: 'Edit', exact: true }).isVisible() && await dialog.getByRole('button', { name: 'Work on this', exact: true }).isVisible())
  await dialog.getByRole('button', { name: 'Edit', exact: true }).click()
  await page.locator('#wb-edit-task [name=title]').fill('Discard this edit')
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  check('Cancelling Edit preserves task data', (await store()).tasks.find(task => task.id === 'task-14').title === 'Review callback item 14')
  await card.click(); await dialog.getByRole('button', { name: 'Work on this', exact: true }).click()
  await page.locator('.wb-detail').waitFor()
  check('Handoff selects the exact task without starting focus or changing its status', await page.locator('.wb-detail h2').textContent() === 'Review callback item 14' && (await store()).session === null && (await store()).tasks.find(task => task.id === 'task-14').status === 'ready')
  if (width <= 760) check('Mobile handoff collapses filter controls to reveal task context', !await page.getByRole('combobox', { name: 'Filter by project', exact: true, includeHidden: true }).isVisible())
  check('Saved next step leads the task body', await page.locator('.wb-detail-body>section').first().getAttribute('class') === 'wb-next-action' && await page.locator('.wb-next-step').textContent() === 'Verify the callback response for item 14.')
  if (width > 1100) check('Selected task stays visible in the context list above the timer', await page.locator('.wb-task-row[aria-pressed=true]').evaluate(row => { const r = row.getBoundingClientRect(), list = row.closest('.wb-task-list').getBoundingClientRect(), timer = document.querySelector('.wb-focus').getBoundingClientRect(); return r.top >= list.top - 1 && r.bottom <= Math.min(list.bottom, timer.top) + 1 }))
  await page.screenshot({ path: `${output}/workspace-${width}-${theme}-${navigation}.png` })
  await page.getByRole('button', { name: 'Back to Board', exact: true }).click(); await card.waitFor()
  check('Return preserves Board search, project and status', await page.getByRole('textbox', { name: 'Search tasks', exact: true }).inputValue() === 'callback' && await project.inputValue() === 'checkout-api' && await page.getByRole('combobox', { name: 'Filter by status', exact: true }).inputValue() === 'ready')
  check('Return restores Board and lane scroll positions and originating card focus', await page.evaluate(before => Math.abs(document.querySelector('.wb-main').scrollTop - before.main) < 2 && Math.abs(document.querySelector('[data-drop=ready]').scrollTop - before.lane) < 2 && document.activeElement === document.querySelector('[data-task="task-14"] .wb-card-title'), scroll))
  check('Board identifies the selected Workspace task', await page.locator('[data-task="task-14"] .wb-selected-work').isVisible())
  await page.screenshot({ path: `${output}/board-${width}-${theme}-${navigation}.png` })
  await card.click(); await dialog.getByRole('button', { name: 'Work on this', exact: true }).click()
  await page.getByRole('button', { name: 'Start focus', exact: true }).click(); await page.getByRole('button', { name: 'Pause', exact: true }).waitFor()
  if (width <= 760) await page.locator('.wb-task-chooser summary').click()
  await page.locator('.wb-task-row').filter({ hasText: 'Check search navigation' }).click()
  check('Choosing another task preserves the timer and explains its owner', (await store()).session.taskId === 'task-14' && await page.locator('.wb-detail h2').textContent() === 'Check search navigation' && await page.locator('.wb-focus-other').textContent().then(copy => copy.includes('Review callback item 14') && copy.includes('doesn’t switch the timer')))
  check('Task without a saved next step has a direct editor action', await page.getByRole('button', { name: 'Add next step', exact: true }).isVisible())
  await page.getByRole('button', { name: 'Pause', exact: true }).click(); await page.getByRole('button', { name: 'Resume', exact: true }).waitFor()
  check('Paused timer ownership stays visible', /Timer paused/.test(await page.locator('.wb-focus-other').textContent()))
  await page.getByRole('button', { name: 'Back to Board', exact: true }).click()
  check('Starting focus moves the task out of the preserved Ready filter', await page.locator('[data-task="task-14"]').count() === 0 && await page.getByRole('combobox', { name: 'Filter by status', exact: true }).inputValue() === 'ready' && (await store()).tasks.find(task => task.id === 'task-14').status === 'progress')
  check('No horizontal overflow, API calls or JavaScript errors', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth) && !api.length && !errors.length)
  console.log(`${width}/${theme}/${navigation} passed`); await context.close()
 }
 await writeFile(`${output}/checks.json`, JSON.stringify(checks, null, 2)); console.log(`${checks.length} Board handoff checks passed; ${output}`)
} finally { await browser.close() }
