// Account-mode dashboard with every API intercepted; never uses a live account.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = createRequire(import.meta.url)(process.env.POMOGIT_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.POMOGIT_APP_URL || 'http://127.0.0.1:5191'
const output = '/tmp/pomogit-dashboard-activity'; await mkdir(output, { recursive: true })
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
 await page.goto(`${base}/#home`);await page.locator('.dash-metric').first().waitFor()
 await page.getByRole('button',{name:'30 days',exact:true}).click()
 await page.locator('[data-chart=focus] .chart-value').last().click();await page.getByRole('button',{name:'View in Activity',exact:true}).click()
 check('Date summary carries the exact bucket range and focus type',new URL(page.url()).hash==='#review'&&await page.locator('.activity-event').count()===3&&await page.getByRole('combobox',{name:'Activity type',exact:true}).inputValue()==='focus'&&/Oct 13.*Oct 15/.test(await page.locator('.activity-custom-range').textContent()))
 check('Drill-down context is visible and fits the screen',await page.locator('.activity-context').isVisible()&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
 await page.screenshot({path:`${output}/${width}-${theme}-${navigation}.png`})
 await page.getByRole('button',{name:'Back to Home',exact:true}).click()
 check('Returning to Home preserves its selected period',await page.getByRole('button',{name:'30 days',exact:true}).getAttribute('aria-pressed')==='true')
 await page.locator('.project-name').filter({hasText:'checkout-api'}).click();await page.getByRole('button',{name:'View in Activity',exact:true}).click()
 check('Project summary carries project, selected dates and focus type',await page.getByRole('combobox',{name:'Project',exact:true}).inputValue()==='checkout-api'&&await page.getByRole('combobox',{name:'Activity type',exact:true}).inputValue()==='focus'&&await page.locator('.activity-event').count()===1&&/Sep 16.*Oct 15/.test(await page.locator('.activity-custom-range').textContent()))
 await page.getByRole('button',{name:'All time',exact:true}).click()
 check('Activity filters remain editable after drilling down',await page.locator('.activity-event').count()===2&&await page.locator('.activity-custom-range').count()===0)
 await page.getByRole('button',{name:'Back to Home',exact:true}).click();await page.locator('.project-name').filter({hasText:'No project'}).click();await page.getByRole('button',{name:'View in Activity',exact:true}).click()
 check('Unassigned project retains only unassigned history',await page.getByRole('combobox',{name:'Project',exact:true}).inputValue()==='__no_project__'&&await page.locator('.activity-event').count()===1&&/keyboard/.test(await page.locator('.activity-event-title').textContent()))
 await page.getByRole('button',{name:'Back to Home',exact:true}).click();await page.locator('.inspect-day summary').click();await page.getByRole('button',{name:'View day',exact:true}).click();await page.getByRole('button',{name:'View in Activity',exact:true}).click()
 check('Calendar day opens all recorded activity for that local date',await page.locator('.activity-event').count()===2&&await page.getByRole('combobox',{name:'Activity type',exact:true}).inputValue()===''&&/Oct 15/.test(await page.locator('.activity-custom-range').textContent()))
 await page.getByRole('button',{name:'Back to Home',exact:true}).click();await page.locator('[data-chart=completed] .chart-value').last().click();await page.getByRole('button',{name:'View in Activity',exact:true}).click()
 check('Completion summary carries its event type and dates',await page.getByRole('combobox',{name:'Activity type',exact:true}).inputValue()==='completion'&&await page.locator('.activity-event').count()===2)
 await page.goBack();await page.locator('.dash-metric').first().waitFor()
 check('Browser Back also retains the Home period',await page.getByRole('button',{name:'30 days',exact:true}).getAttribute('aria-pressed')==='true')
 await page.locator('.dash-recent-summary').click();await page.getByRole('button',{name:'All activity',exact:true}).click()
 check('All activity clears the date/project/type drill-down',await page.getByRole('button',{name:'All time',exact:true}).getAttribute('aria-pressed')==='true'&&await page.getByRole('combobox',{name:'Project',exact:true}).inputValue()===''&&await page.getByRole('combobox',{name:'Activity type',exact:true}).inputValue()==='')
 await page.getByRole('button',{name:'Back to Home',exact:true}).click();await page.locator('[data-chart=focus] .chart-value').first().click();await page.getByRole('button',{name:'View in Activity',exact:true}).click()
 check('A date without records has a recoverable empty state',await page.locator('.activity-empty').isVisible()&&await page.getByRole('button',{name:'Back to Home',exact:true}).isVisible())
 await page.getByRole('button',{name:'Clear filters',exact:true}).click()
 check('Clearing a drill-down retains its way back to Home',await page.getByRole('button',{name:'Back to Home',exact:true}).isVisible()&&await page.getByRole('button',{name:'All time',exact:true}).getAttribute('aria-pressed')==='true')
 if(width===375&&theme==='dark'&&navigation==='sidebar'){
  for(let i=0;i<6;i++){const id=`extra-${i}`;tasks.push({id,title:`Extra task ${i}`,project:`owner/repo-${i}`,status:'ready',notes:[],createdAt:stamp(15)});sessions.push({id,taskId:id,status:'ended',endedAt:stamp(15),durationActualSeconds:100+i})}
  await home();await page.getByRole('button',{name:'30 days',exact:true}).click();await page.locator('.project-name').filter({hasText:'Other work'}).click();await page.getByRole('button',{name:'View in Activity',exact:true}).click()
  check('Other work carries every grouped project, including No project',await page.getByRole('combobox',{name:'Project',exact:true}).inputValue()==='__group__'&&await page.locator('.activity-event').count()===7)
  await page.getByRole('combobox',{name:'Project',exact:true}).selectOption('web-client')
  check('Choosing a new project replaces the grouped filter',await page.locator('.activity-event').count()===1&&/web-client/.test(await page.locator('.activity-project').textContent()))
 }
 check('Inspection and navigation never mutate account data or start timers',!writes.length&&!errors.length)
 await writeFile(`${output}/checks-${width}-${theme}-${navigation}.json`,JSON.stringify(checks.filter(item=>item.width===width&&item.theme===theme&&item.navigation===navigation),null,2))
 console.log(`${width}/${theme}/${navigation} drill-down checks passed`);await context.close()
}
await writeFile(`${output}/checks.json`,JSON.stringify(checks,null,2));console.log(`${checks.length} Home-to-Activity checks passed; ${output}`)
}finally{await browser.close()}
