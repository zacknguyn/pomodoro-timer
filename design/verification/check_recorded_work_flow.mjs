// UI-only workflow in isolated browser storage. No backend calls or live account writes.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from './browser.mjs'
const base = process.env.POMOGIT_PREVIEW_URL || 'http://127.0.0.1:5192'
const output = '/tmp/pomogit-recorded-work-flow'; await mkdir(output, { recursive: true })
const browser = await chromium.launch(), checks = []
try {
for (const width of [1440, 375]) for (const theme of ['dark', 'light']) for (const navigation of ['sidebar', 'navbar']) {
 const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, timezoneId: 'America/New_York', reducedMotion: 'reduce' })
 await context.addInitScript(({ theme, navigation }) => {
  localStorage.setItem('pomogit.mock.v1', JSON.stringify({ tasks: [], checkpoints: [], sessions: [], session: null, seq: 100 }))
  localStorage.setItem('pomogit.work-protocol', JSON.stringify({ motion: 'reduced', brightness: theme, navigation }))
 }, { theme, navigation })
 const page = await context.newPage(), errors = [], api = [], start = Date.parse('2026-10-15T18:00:00Z')
 page.on('pageerror', error => errors.push(error.message))
 await page.route('**/api/**', route => { api.push(route.request().url()); return route.abort() })
 const check = (name, value) => { assert(value, `${width}/${theme}/${navigation}: ${name}`); checks.push({ width, theme, navigation, name }) }
 await page.clock.setFixedTime(new Date(start)); await page.goto(`${base}/#home`); await page.locator('.dash-empty').waitFor()
 await page.keyboard.press('Tab')
 check('Skip link is the first keyboard stop', await page.locator('.wb-skip').evaluate(el => el === document.activeElement))
 await page.keyboard.press('Enter')
 check('Skip link moves focus to main content', await page.locator('#wb-main').evaluate(el => el === document.activeElement))
 await page.keyboard.press('n')
 await page.getByRole('textbox', { name: 'Task title or reference link', exact: true }).fill('Verify the recorded-work journey')
 await page.getByRole('button', { name: 'Create task', exact: true }).click(); await page.locator('.wb-detail').waitFor()
 await page.getByRole('button', { name: 'Back to Board', exact: true }).click(); await page.locator('.wb-card-title').focus(); await page.keyboard.press('Enter')
 check('Keyboard activation opens read-only task inspection', await page.getByRole('dialog').getByRole('button', { name: 'Edit', exact: true }).isVisible())
 await page.keyboard.press('Escape')
 check('Escape restores focus to the Board task', await page.locator('.wb-card-title').evaluate(el => el === document.activeElement))
 await page.keyboard.press('Enter')
 await page.getByRole('dialog').getByRole('button', { name: 'Edit', exact: true }).click()
 await page.locator('#wb-edit-task [name=project]').fill('verification-repo')
 await page.locator('#wb-edit-task [name=nextStep]').fill('Check the stopped session in Home and Activity')
 await page.locator('#wb-edit-task [name=status]').selectOption('ready')
 await page.getByRole('button', { name: 'Save changes', exact: true }).click(); await page.getByRole('dialog').waitFor({ state: 'hidden' })
 check('A captured task can be organized before choosing work', await page.locator('.wb-lane[data-drop=ready] .wb-board-card').count() === 1)
 await page.locator('.wb-card-title').click(); await page.getByRole('button', { name: 'Work on this', exact: true }).click()
 await page.getByRole('button', { name: 'Start focus', exact: true }).click(); await page.getByRole('button', { name: 'Pause', exact: true }).waitFor()
 await page.clock.setFixedTime(new Date(start + 90_000)); await page.getByRole('button', { name: 'Pause', exact: true }).click(); await page.getByRole('button', { name: 'Resume', exact: true }).waitFor()
 await page.getByRole('navigation', { name: 'Workspace pages', exact: true }).getByRole('button', { name: 'Home', exact: true }).click(); await page.locator('.dash-metric').first().waitFor()
 check('An unfinished paused session does not inflate Home', await page.locator('.dash-value').first().textContent() === '0 min')
 await page.getByRole('button', { name: '30 days', exact: true }).click(); await page.getByRole('button', { name: 'Continue task', exact: true }).click()
 await page.clock.setFixedTime(new Date(start + 210_000)); await page.getByRole('button', { name: 'Resume', exact: true }).click(); await page.getByRole('button', { name: 'Pause', exact: true }).waitFor()
 await page.clock.setFixedTime(new Date(start + 240_000)); await page.getByRole('button', { name: 'Stop timer', exact: true }).click(); await page.getByRole('button', { name: 'Start focus', exact: true }).waitFor()
 await page.getByRole('button', { name: 'Mark done', exact: true }).click(); await page.getByRole('dialog', { name: 'Task completed', exact: true }).waitFor()
 await page.getByRole('button', { name: 'Back to Workspace', exact: true }).click()
 await page.getByRole('navigation', { name: 'Workspace pages', exact: true }).getByRole('button', { name: 'Home', exact: true }).click(); await page.locator('.dash-metric').first().waitFor()
 check('Home retains its period and reports recorded time excluding the pause', await page.getByRole('button', { name: '30 days', exact: true }).getAttribute('aria-pressed') === 'true' && await page.locator('.dash-value').first().textContent() === '2 min')
 check('Completion, active day and streak agree with the completed work', await page.locator('.dash-value').nth(1).textContent() === '1' && await page.locator('.dash-value').nth(2).textContent() === '1' && await page.locator('.dash-value').nth(3).textContent() === '1 day')
 const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pomogit.mock.v1')))
 check('One ended session records exactly 120 seconds and the task is done', saved.session === null && saved.sessions.length === 1 && saved.sessions[0].durationActualSeconds === 120 && saved.tasks[0].status === 'done')
 await page.screenshot({ path: `${output}/home-${width}-${theme}-${navigation}.png` })
 await page.locator('.project-name').filter({ hasText: 'verification-repo' }).click(); await page.getByRole('button', { name: 'View in Activity', exact: true }).click()
 check('Project drill-down shows the saved two-minute session', await page.locator('.activity-event').count() === 1 && /2 min/.test(await page.locator('.activity-summary').textContent()) && await page.getByRole('combobox', { name: 'Project', exact: true }).inputValue() === 'verification-repo')
 await page.locator('.activity-open').click(); await page.getByRole('dialog').getByRole('button', { name: 'View task', exact: true }).click()
 check('History opens read-only task context without restarting its timer', await page.getByRole('dialog').getByRole('button', { name: 'Reopen in Workspace', exact: true }).isVisible() && await page.getByRole('button', { name: 'Stop timer', exact: true }).count() === 0)
 await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Back to Home', exact: true }).click()
 await page.locator('[data-chart=completed] .chart-value').last().click(); await page.getByRole('button', { name: 'View in Activity', exact: true }).click()
 check('Completion drill-down shows the same finished task', await page.locator('.activity-event').count() === 1 && /1taskscompleted/.test((await page.locator('.activity-summary').textContent()).replace(/\s/g, '')))
 if (width <= 760) { await page.locator('.wb-more-menu > summary').click(); await page.locator('.wb-more-menu nav').getByRole('button', { name: 'Profile', exact: true }).click() }
 else await page.locator('.wb-nav-profile').click()
 await page.locator('.pg-profile-page').waitFor()
 check('Profile is reachable after recorded work and shows identity', new URL(page.url()).hash === '#profile' && await page.getByRole('region', { name: 'Developer identity', exact: true }).isVisible())
 check('The workflow never called a backend or produced script errors', api.length === 0 && errors.length === 0)
 console.log(`${width}/${theme}/${navigation} recorded-work flow passed`); await context.close()
}
await writeFile(`${output}/checks.json`, JSON.stringify(checks, null, 2)); console.log(`${checks.length} recorded-work flow checks passed; ${output}`)
} finally { await browser.close() }
