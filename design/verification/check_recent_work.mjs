// Account-mode dashboard with every API intercepted; never uses a live account.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = createRequire(import.meta.url)(process.env.POMOGIT_PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.POMOGIT_APP_URL || 'http://127.0.0.1:5191'
const output = '/tmp/pomogit-recent-work'; await mkdir(output, { recursive: true })
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
 await page.goto(`${base}/#home`); await page.locator('.dash-metric').first().waitFor()
 const guideButton=page.getByRole('button',{name:/How these figures are counted/})
 await guideButton.focus();await page.keyboard.press('Enter')
 const guide=page.getByRole('dialog')
 check('Keyboard opens a seven-figure counting guide',await guide.isVisible()&&await guide.locator('dt').count()===7)
 check('Guide separates selected dates from independent figures',await guide.getByRole('heading',{name:'For the selected 7 days',exact:true}).isVisible()&&await guide.getByRole('heading',{name:'Independent of the date range',exact:true}).isVisible())
 check('Rules explain ended time, reopened tasks and project grouping',/Running and paused timers are excluded/.test(await guide.textContent())&&/latest completion/.test(await guide.textContent())&&/current project/.test(await guide.textContent())&&/Other work/.test(await guide.textContent()))
 check('Guide fits within the screen',await guide.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&el.scrollWidth<=el.clientWidth+1}))
 const positions=await guide.evaluate(el=>[el.querySelector('header').getBoundingClientRect().top,el.querySelector('footer').getBoundingClientRect().bottom])
 await guide.locator('.wb-modal-body').evaluate(el=>el.scrollTop=el.scrollHeight)
 check('Explanations scroll while guide header and close action stay fixed',await guide.evaluate((el,positions)=>el.querySelector('header').getBoundingClientRect().top===positions[0]&&el.querySelector('footer').getBoundingClientRect().bottom===positions[1],positions))
 await page.keyboard.press('Escape');check('Guide closes and restores its opener focus',await guide.count()===0&&await guideButton.evaluate(el=>el===document.activeElement))
 await page.getByRole('button',{name:'30 days',exact:true}).click();await guideButton.click()
 check('Guide reflects the currently selected date range',await page.getByRole('dialog').getByRole('heading',{name:'For the selected 30 days',exact:true}).isVisible()&&/previous 30 days/.test(await page.getByRole('dialog').textContent()))
 await page.getByRole('button',{name:'Close guide',exact:true}).click();await page.getByRole('button',{name:'7 days',exact:true}).click()
 const recent=page.locator('.dash-recent'),summary=recent.locator('summary')
 check('Compact disclosure communicates record count and range',await recent.getAttribute('open')===null && /Latest 3.*last 7 days/.test(await summary.textContent()))
 await summary.focus();await page.keyboard.press('Enter')
 check('Keyboard opens a structured three-record log',await recent.getAttribute('open')!==null&&await recent.locator('.dash-recent-row').count()===3)
 check('Dates, projects and recorded durations are separate',await recent.locator('time[datetime]').count()===3&&await recent.locator('.dash-recent-project').count()===3&&/30 min/.test(await recent.locator('.dash-recent-outcome').allTextContents().then(values=>values.join(' '))))
 check('Rows fit the card and the page stays within viewport',await recent.locator('.dash-recent-row').evaluateAll(rows=>rows.every(row=>{const r=row.getBoundingClientRect(),card=row.closest('.dash-recent').getBoundingClientRect();return r.left>=card.left&&r.right<=card.right}))&&await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
 await recent.scrollIntoViewIfNeeded();await page.evaluate(()=>document.fonts.ready)
 await page.screenshot({path:`${output}/${width}-${theme}-${navigation}.png`})
 const row=recent.locator('button.dash-recent-row').first();await row.click()
 check('A record opens the existing read-only task dialog',await page.getByRole('dialog').getByRole('button',{name:'Edit',exact:true}).isVisible()&&!writes.length)
 await page.keyboard.press('Escape');check('Closing restores the record focus',await row.evaluate(el=>el===document.activeElement))
 await recent.getByRole('button',{name:'All activity',exact:true}).click();await page.locator('.activity-events').first().waitFor()
 check('All activity opens unfiltered history',new URL(page.url()).hash==='#review'&&await page.getByRole('button',{name:'All time',exact:true}).getAttribute('aria-pressed')==='true')
 await home();await page.locator('.dash-recent-summary').click()
 const outcome=await page.locator('.dash-recent-outcome').allTextContents();check('Newest records show focus and completion distinctly',outcome.some(text=>text.includes('30 min'))&&outcome[0].includes('Completed'))
 noHistory=true;await home();await page.locator('.dash-recent-summary').click()
 check('No-history state explains what will appear',await page.locator('.dash-recent-empty').isVisible()&&await page.locator('.dash-recent-row').count()===0)
 noHistory=false;tasks[0].title='A long task title that explains checking keyboard navigation across the workspace and restoring the chosen search filter without losing the current task';tasks[0].project='long-github-owner-name/repository-with-a-long-descriptive-name';await home();await page.locator('.dash-recent-summary').click()
 check('Long task and project names wrap within the record',await page.locator('.dash-recent-row').first().evaluate(el=>{const r=el.getBoundingClientRect();return r.right<=innerWidth&&el.scrollWidth<=el.clientWidth+1}))
 check('No script errors or unexpected account writes',!errors.length&&!writes.length)
 console.log(`${width}/${theme}/${navigation} recent-work checks passed`);await context.close()
}
await writeFile(`${output}/checks.json`,JSON.stringify(checks,null,2));console.log(`${checks.length} recent-work checks passed; ${output}`)
}finally{await browser.close()}
