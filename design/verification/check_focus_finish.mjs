// Explicit UI mock with isolated storage; every API request is blocked.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from './browser.mjs'
const base = process.env.POMOGIT_PREVIEW_URL || 'http://127.0.0.1:5192'
const output = '/tmp/pomogit-focus-finish'; await mkdir(output, { recursive: true })
const browser = await chromium.launch(), checks = []
try {
 for (const width of (process.env.POMOGIT_FOCUS_WIDTHS || '1440,768,375').split(',').map(Number)) for (const theme of ['dark','light']) for (const navigation of ['sidebar','navbar']) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, reducedMotion: 'reduce' })
  await context.addInitScript(({theme,navigation}) => {
   if (localStorage.getItem('pomogit.mock.v1')) return
   const tasks = ['a','b'].map(id => ({ id, title: id === 'a' ? 'Verify the callback response' : 'Check keyboard navigation', status: 'ready', project: 'checkout-api', nextStep: 'Check the saved result.', notes: [], createdAt: '2026-10-15T09:00:00Z' }))
   localStorage.setItem('pomogit.mock.v1', JSON.stringify({tasks, sessions: [], checkpoints: [], session: null, seq: 100}))
   localStorage.setItem('pomogit.work-protocol', JSON.stringify({brightness:theme,navigation,motion:'reduced',focusMinutes:5,expand:false}))
  }, {theme,navigation})
  const page=await context.newPage(), errors=[], api=[], start=Date.parse('2026-10-15T18:00:00Z')
  page.on('pageerror',error=>errors.push(error.message))
  await page.route('**/api/**',route=>{api.push(route.request().url());return route.abort()})
  const check=(name,passed)=>{assert(passed,`${width}/${theme}/${navigation}: ${name}`);checks.push({width,theme,navigation,name})}
  const store=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('pomogit.mock.v1')))
  await page.clock.setFixedTime(new Date(start));await page.goto(`${base}/#work`);const timer=page.getByRole('complementary',{name:'Focus timer',exact:true});await timer.waitFor()
  check('Ready panel names its task and shows the configured time',await timer.getAttribute('data-state')==='ready'&&await timer.getByRole('timer').textContent()==='05:00'&&await timer.locator('.wb-focus-context strong').textContent()==='Verify the callback response')
  await timer.getByRole('button',{name:'Start focus',exact:true}).click();await timer.getByRole('button',{name:'Pause',exact:true}).waitFor()
  check('Compact running panel keeps state, task and remaining time visible',await timer.getAttribute('data-state')==='running'&&await timer.locator('.wb-focus-state').isVisible()&&await timer.locator('.wb-focus-context strong').isVisible())
  check('User reduced motion stops the running indicator animation',await timer.locator('.wb-focus-state>span').evaluate(el=>getComputedStyle(el).animationName)==='none')
  await page.screenshot({path:`${output}/running-${width}-${theme}-${navigation}.png`})
  await page.clock.setFixedTime(new Date(start+90_000));await timer.getByRole('button',{name:'Pause',exact:true}).click();await timer.getByRole('button',{name:'Resume',exact:true}).waitFor()
  check('Pause freezes the remaining time and has a visible state',await timer.getAttribute('data-state')==='paused'&&await timer.getByRole('timer').textContent()==='03:30'&&await timer.locator('.wb-focus-state').textContent()==='Paused')
  await timer.getByRole('button',{name:'Expand timer',exact:true}).click()
  check('Expanded panel explains stop versus task completion',await timer.locator('.wb-focus-hint').isVisible()&&/Stop timer saves focus time/.test(await timer.locator('.wb-focus-hint').textContent()))
  await timer.getByRole('button',{name:'Maximize timer',exact:true}).click();check('Maximized panel stays within the viewport',await timer.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1}))
  await timer.getByRole('button',{name:'Minimize timer',exact:true}).click()
  await page.clock.setFixedTime(new Date(start+210_000));await timer.getByRole('button',{name:'Resume',exact:true}).click();await timer.getByRole('button',{name:'Pause',exact:true}).waitFor()
  await page.clock.setFixedTime(new Date(start+240_000));await timer.getByRole('button',{name:'Stop timer',exact:true}).click();await timer.getByRole('button',{name:'Start focus',exact:true}).waitFor()
  let saved=await store()
  check('Stop saves only actual focus and leaves the task unfinished',saved.session===null&&saved.sessions.length===1&&saved.sessions[0].durationActualSeconds===120&&saved.tasks.find(task=>task.id==='a').status==='progress'&&!await page.getByRole('dialog').count())
  await page.getByRole('button',{name:'Mark done',exact:true}).click();const completion=page.getByRole('dialog',{name:'Task completed',exact:true});await completion.waitFor()
  check('Completion identifies the task and offers optional notes afterward',await completion.locator('.wb-completion h3').textContent()==='Verify the callback response'&&await completion.getByRole('button',{name:'Add note · optional',exact:true}).isVisible())
  await page.screenshot({path:`${output}/completed-${width}-${theme}-${navigation}.png`})
  await completion.getByRole('button',{name:'Undo completion',exact:true}).click();await completion.waitFor({state:'hidden'})
  check('Undo completion restores the task without restarting focus',(await store()).tasks.find(task=>task.id==='a').status==='progress'&&(await store()).session===null)
  await page.getByRole('button',{name:'Mark done',exact:true}).click();await completion.getByRole('button',{name:'Add note · optional',exact:true}).click();await page.getByRole('textbox',{name:'Closing note',exact:true}).fill('Callback verified.');await page.getByRole('button',{name:'Save note',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'})
  check('A closing note saves after completion without changing focus history',(await store()).tasks.find(task=>task.id==='a').notes.some(note=>note.text==='Callback verified.')&&(await store()).sessions.length===1)
  await timer.getByRole('button',{name:'Start focus',exact:true}).click();await timer.getByRole('button',{name:'Pause',exact:true}).waitFor()
  await page.clock.setFixedTime(new Date(start+540_000));await timer.getByRole('button',{name:'Save session',exact:true}).waitFor()
  check('Time-up panel offers Save session instead of a disabled Resume',await timer.getAttribute('data-state')==='elapsed'&&await timer.getByRole('timer').textContent()==='00:00'&&!await timer.getByRole('button',{name:'Resume',exact:true}).count())
  await page.reload();await timer.getByRole('button',{name:'Save session',exact:true}).waitFor()
  check('An expired session survives reload without completing or double-saving',(await store()).tasks.find(task=>task.id==='b').status==='progress'&&(await store()).sessions.length===1)
  await page.screenshot({path:`${output}/elapsed-${width}-${theme}-${navigation}.png`})
  await timer.getByRole('button',{name:'Save session',exact:true}).click();await timer.getByRole('button',{name:'Start focus',exact:true}).waitFor();saved=await store()
  check('Saving an expired session records its planned focus once',saved.sessions.length===2&&saved.sessions[1].durationActualSeconds===300&&saved.tasks.find(task=>task.id==='b').status==='progress')
  await timer.getByRole('button',{name:'Start focus',exact:true}).click();await timer.getByRole('button',{name:'Pause',exact:true}).waitFor();await page.clock.setFixedTime(new Date(start+550_000))
  check('Task completion explains that its running timer will be saved',/also stops and saves/.test(await page.locator('.wb-detail>footer').textContent()))
  await page.getByRole('button',{name:'Mark done',exact:true}).click();await completion.waitFor();saved=await store()
  check('Mark done stops and saves only this task’s timer',saved.session===null&&saved.sessions.length===3&&saved.sessions[2].durationActualSeconds===10&&saved.tasks.find(task=>task.id==='b').status==='done')
  await completion.getByRole('button',{name:'Back to Workspace',exact:true}).click()
  check('Finishing without a closing note is allowed',(await store()).tasks.find(task=>task.id==='b').notes.every(note=>note.kind!=='note'))
  check('No horizontal overflow, browser errors or API calls',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)&&!errors.length&&!api.length)
  console.log(`${width}/${theme}/${navigation} passed`);await context.close()
 }
 await writeFile(`${output}/checks.json`,JSON.stringify(checks,null,2));console.log(`${checks.length} focus/finish checks passed; ${output}`)
} finally {await browser.close()}
