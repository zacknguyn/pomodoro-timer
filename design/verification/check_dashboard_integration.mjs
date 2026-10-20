// Account-mode dashboard with every API intercepted; never uses a live account.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = createRequire(import.meta.url)(process.env.POMOGIT_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.POMOGIT_APP_URL || 'http://127.0.0.1:5191'
const output = '/tmp/pomogit-dashboard-integration'; await mkdir(output, { recursive: true })
const browser = await chromium.launch(), checks = []
try {
for (const width of (process.env.POMOGIT_DASHBOARD_WIDTHS || '1440,1024,768,375').split(',').map(Number)) for (const theme of ['dark', 'light']) for (const navigation of ['sidebar', 'navbar']) {
 const context = await browser.newContext({ viewport: { width, height: 768 }, colorScheme: theme, timezoneId: 'America/New_York', reducedMotion: 'reduce' })
 await context.addInitScript(({ theme, navigation }) => {
  localStorage.setItem('pomogit.workspace-opened', 'true')
  localStorage.setItem('pomogit.work-protocol:dashboard-fixture', JSON.stringify({ brightness: theme, motion: 'reduced', navigation }))
 }, { theme, navigation })
 const page = await context.newPage(), errors = [], writes = []
 page.on('pageerror', error => errors.push(error.message))
 await page.clock.setFixedTime(new Date('2026-10-15T18:00:00Z'))
 const stamp = (day, hour = '10') => `2026-10-${day}T${hour}:00:00-04:00`
 let empty = false, noHistory = false, fail = false, authenticated = true, active = null
 const tasks = [
  { id: 'api', title: 'Fix the OAuth callback retry', project: 'checkout-api', status: 'progress', nextStep: 'Check the expired callback', createdAt: stamp(14), notes: [{ id: 'done-api', kind: 'completion', text: 'Done then reopened', createdAt: stamp(14, '12') }] },
  { id: 'web', title: 'Keep search filters after going back', project: 'web-client', status: 'done', nextStep: '', createdAt: stamp(13), notes: [{ id: 'done-web', kind: 'change', text: 'Moved from progress to done.', createdAt: stamp(15, '11') }] },
  { id: 'keys', title: 'Make the task editor work with a keyboard', project: '', status: 'ready', nextStep: '', createdAt: stamp(13), notes: [] },
 ]
 const sessions = [
  { id: 's1', taskId: 'api', status: 'ended', endedAt: stamp(15), durationActualSeconds: 1800 },
  { id: 's2', taskId: 'web', status: 'ended', endedAt: stamp(14), durationActualSeconds: 1200 },
  { id: 's3', taskId: 'keys', status: 'ended', endedAt: stamp(13), durationActualSeconds: 600 },
  { id: 'old', taskId: 'api', status: 'ended', endedAt: '2026-09-01T10:00:00-04:00', durationActualSeconds: 900 },
  { id: 'unfinished', taskId: 'api', status: 'active', endedAt: null, durationActualSeconds: 9999 },
 ]
 await page.route('**/api/**', async route => {
  const request = route.request(), path = new URL(request.url()).pathname
  if (request.method() !== 'GET') {
   writes.push(path)
   if (path === '/api/auth/login') { authenticated = true; return route.fulfill({ json: { user: { id: 'dashboard-fixture', email: 'fixture@test.invalid', role: 'user' } } }) }
   if (path === '/api/tasks') {
    const input = request.postDataJSON(); tasks.push({ id: 'created', ...input, status: 'inbox', notes: [], createdAt: stamp(15) }); empty = false
    return route.fulfill({ status: 201, json: tasks.at(-1) })
   }
   throw new Error(`Unexpected mutation ${path}`)
  }
  if (path === '/api/auth/me' && !authenticated) return route.fulfill({ status: 401, json: { error: 'Not signed in' } })
  if (path === '/api/export' && fail) return route.fulfill({ status: 503, json: { error: 'Fixture history unavailable' } })
  const data = { '/api/auth/me': { user: { id: 'dashboard-fixture', email: 'fixture@test.invalid', role: 'user' } }, '/api/tasks': empty ? [] : noHistory ? tasks.map(task => ({ ...task, notes: [] })) : tasks, '/api/checkpoints': [], '/api/sessions/active': active, '/api/export': { focusSessions: empty || noHistory ? [] : sessions }, '/api/github/projects': [] }
  assert(Object.hasOwn(data, path), `Unexpected API request ${path}`); await route.fulfill({ json: data[path] })
 })
 const check = (name, value) => { assert(value, `${width}/${theme}/${navigation}: ${name}`); checks.push({ width, theme, navigation, name }) }
 let revision = 0
 const home = async () => { await page.goto(`${base}/?fixture=${++revision}#home`); await page.locator('.dash-metric').first().waitFor(); await page.waitForTimeout(200) }
 await page.goto(base); await page.locator('.dash-metric').first().waitFor()
 check('Returning account defaults to Home', new URL(page.url()).hash === '#home')
 check('Only recorded work supplies the figures', /1 h/.test(await page.locator('.dash-value').nth(0).textContent()) && await page.locator('.dash-value').nth(1).textContent() === '2' && await page.locator('.dash-value').nth(2).textContent() === '3' && await page.locator('.dash-value').nth(3).textContent() === '3 days')
 check('Native charts and retained donut render', await page.locator('.kit-upstream canvas').count() === 4 && await page.locator('.project-donut canvas').count() === 2)
 check('Page and content have no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('.wb-main').scrollWidth <= document.querySelector('.wb-main').clientWidth + 1))
 check('Lower chart contents fit their cards', await page.locator('.project-layout,.status-rows,.calendar-wrap').evaluateAll(elements => elements.every(el => { const r = el.getBoundingClientRect(), card = el.closest('.dash-panel').getBoundingClientRect(); return r.left >= card.left + 8 && r.right <= card.right - 8 && r.bottom <= card.bottom - 8 })))
 if (width === 1440) check('Five cards fit the short desktop viewport with clearance', await page.locator('.dash-panel').evaluateAll(elements => elements.every(el => el.getBoundingClientRect().bottom <= innerHeight - 20)))
 await page.screenshot({ path: `${output}/${width}-${theme}-${navigation}.png` })
 const legend = page.locator('[data-kit-native=focus] .kit-chart-root button').first(); await legend.click()
 check('Native project legend selects', await legend.getAttribute('aria-pressed') === 'true'); await legend.click()
 const chart = page.locator('[data-kit-native=focus] .kit-chart-root'); await chart.scrollIntoViewIfNeeded(); const box = await chart.boundingBox()
 await page.mouse.move(box.x + box.width * .5, box.y + box.height * .65); await page.waitForTimeout(200)
 check('Native tooltip is visible and stays inside the screen', await page.locator('.kit-tooltip').first().evaluate(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.left >= 0 && r.right <= innerWidth }))
 const dateButton = page.locator('[data-chart=focus] .chart-value').last(); await dateButton.focus()
 check('Keyboard focus reports exact date value', /Oct 15.*30 min/.test(await page.locator('[data-chart=focus] .chart-selection').textContent()))
 await dateButton.click()
 check('Date inspection shows recorded work without writes', /30 min/.test(await page.getByRole('dialog').textContent()) && !writes.length)
 await page.keyboard.press('Escape'); check('Inspection restores focus', await dateButton.evaluate(el => el === document.activeElement))
 await page.getByRole('button', { name: '90 days', exact: true }).click()
 check('Ninety-day range includes older focus', /1 h 15 min/.test(await page.locator('.dash-value').first().textContent()) && await page.locator('.heat-cell[data-selected=true]').count() === 90)
 await page.locator('[data-chart=focus] .chart-table summary').click()
 check('Expanded data table stays contained', await page.locator('[data-chart=focus] .table-scroll').evaluate(el => el.scrollWidth <= el.clientWidth + 1))
 await page.getByRole('button', { name: '7 days', exact: true }).click()
 await page.locator('.project-name').filter({ hasText: 'No project' }).click()
 await page.getByRole('button', { name: 'View No project on Board', exact: true }).click()
 check('Unassigned project opens a real filtered Board', new URL(page.url()).hash === '#tasks' && await page.locator('.wb-board-card').count() === 1 && /keyboard/.test(await page.locator('.wb-board-card').textContent()))
 await home(); await page.locator('.status-name').last().click()
 check('Status opens a real filtered Board', new URL(page.url()).hash === '#tasks' && await page.getByRole('combobox', { name: 'Filter by status', exact: true }).inputValue() === 'done')
 await home(); await page.locator('.project-name').filter({ hasText: 'checkout-api' }).click(); await page.getByRole('button', { name: tasks[0].title, exact: true }).click()
 check('Task inspection reuses read-only task dialog', await page.getByRole('dialog').getByRole('button', { name: 'Edit', exact: true }).isVisible() && !writes.length)
 await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Continue task', exact: true }).click()
 check('Continue opens Workspace without starting focus', new URL(page.url()).hash === '#work' && !writes.length)
 await home(); await page.getByRole('button', { name: 'New task', exact: true }).click(); await page.getByRole('textbox', { name: 'Task title or reference link', exact: true }).fill('Discard this draft'); await page.getByRole('button', { name: 'Cancel', exact: true }).click()
 check('Cancelling task capture creates nothing', !writes.length && !await page.getByRole('dialog').count())
 await page.getByRole('button', { name: 'New task', exact: true }).click(); check('Cancel discards the capture draft', await page.getByRole('textbox', { name: 'Task title or reference link', exact: true }).inputValue() === ''); await page.getByRole('textbox', { name: 'Task title or reference link', exact: true }).fill('Dashboard fixture task'); await page.getByRole('button', { name: 'Create task', exact: true }).click(); await page.waitForURL(url => url.hash === '#work')
 check('Task capture uses existing create flow, without starting a timer', writes.length === 1 && writes[0] === '/api/tasks' && !await page.getByRole('dialog').count()); writes.length = 0
 noHistory = true; await home()
 check('Existing tasks without history show zeros and helpful empty charts', await page.locator('.dash-value').first().textContent() === '0 min' && await page.locator('.no-data').count() === 3)
 noHistory = false; empty = true; await page.goto(`${base}/?fixture=empty#home`); await page.locator('.dash-empty').waitFor()
 check('New account is not seeded with sample figures', await page.locator('.dash-panel').count() === 2 && !await page.locator('.dash-value').count() && await page.getByRole('button', { name: 'Create your first task', exact: true }).isVisible())
 empty = false; fail = true; await page.goto(`${base}/?fixture=error#home`); await page.getByText('Work history couldn’t load', { exact: true }).waitFor()
 check('Failed history hides dashboard figures', !await page.locator('.dash-metric').count()); fail = false; await page.getByRole('button', { name: 'Try again', exact: true }).click(); await page.locator('.dash-metric').first().waitFor()
 check('Retry recovers the real history view', await page.locator('.dash-panel').count() === 5)
 active = { id: 'running', taskId: 'api', status: 'paused', startedAt: stamp(15, '12'), durationActualSeconds: 90, durationPlannedSeconds: 1500 }; await home()
 check('Existing timer stays available without affecting recorded totals', await page.getByRole('complementary', { name: 'Focus timer', exact: true }).isVisible() && await page.locator('.dash-value').first().textContent() === '1 h'); active = null
 if (width === 1440 && theme === 'dark' && navigation === 'sidebar') {
  authenticated = false; await page.goto(`${base}/#login`); await page.getByRole('textbox', { name: 'Email', exact: true }).fill('fixture@test.invalid'); await page.locator('input[name=password]').fill('local-fixture-only'); await page.getByRole('button', { name: 'Log in with email', exact: true }).click(); await page.waitForURL(url => url.hash === '#home')
  check('Successful sign-in defaults to Home', new URL(page.url()).hash === '#home'); writes.length = 0
  await page.evaluate(() => sessionStorage.setItem('pomogit.github-landing', 'home'))
  await page.goto(`${base}/?fixture=github-callback#work`); await page.locator('.dash-metric').first().waitFor()
  check('GitHub callback landing hint opens Home and clears itself', new URL(page.url()).hash === '#home' && await page.evaluate(() => sessionStorage.getItem('pomogit.github-landing')) === null)
  await page.goto(`${base}/?fixture=explicit-work#work`); await page.locator('.wb-main-workspace').waitFor()
  check('Explicit Workspace link still opens Workspace', new URL(page.url()).hash === '#work')
 }
 if (width === 375 && theme === 'dark' && navigation === 'sidebar') {
  for(let i=0;i<6;i++){const id=`many-${i}`;tasks.push({id,title:`Extra task ${i}`,project:`long-owner-name/frontend-workspace-project-${i}`,status:'ready',notes:[],createdAt:stamp(15)});sessions.push({id,taskId:id,status:'ended',endedAt:stamp(15),durationActualSeconds:100+i})}
  await home()
  check('Many projects use a bounded legend without horizontal overflow',await page.locator('.project-name').count()===3&&await page.locator('.project-name').filter({hasText:'Other work'}).count()===1&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  await page.locator('.project-name').filter({hasText:'Other work'}).click()
  check('Grouped projects retain individual Board links',await page.getByRole('dialog').getByRole('button',{name:/ on Board$/}).count()===7)
  await page.keyboard.press('Escape')
 }
 check('No unexpected app errors', errors.length === 0)
 check('Viewing dashboard never starts a session or mutates an account', !writes.length)
 await writeFile(`${output}/checks-${width}-${theme}-${navigation}.json`, JSON.stringify(checks.filter(item => item.width === width && item.theme === theme && item.navigation === navigation), null, 2)); console.log(`${width}/${theme}/${navigation} passed`); await context.close()
}
await writeFile(`${output}/checks.json`, JSON.stringify(checks, null, 2)); console.log(`${checks.length} dashboard integration checks passed; ${output}`)
} finally { await browser.close() }
