// React account UI with intercepted APIs only; no account data or backend writes.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from './browser.mjs'
const output=process.env.POMOGIT_ACTIVITY_OUTPUT||'/tmp/pomogit-activity-integration'
await mkdir(output,{recursive:true})
const browser=await chromium.launch(),checks=[]
try {
 for(const width of [1440,1024,768,375])for(const theme of ['dark','light'])for(const navigation of ['sidebar','navbar']){
  const context=await browser.newContext({viewport:{width,height:960},colorScheme:theme,timezoneId:'America/New_York'})
  await context.addInitScript(({theme,navigation})=>localStorage.setItem('pomogit.work-protocol:activity-fixture',JSON.stringify({brightness:theme,navigation,motion:'reduced'})),{theme,navigation})
  const page=await context.newPage(),errors=[],mutations=[]
  page.on('pageerror',e=>errors.push(e.message))
  // Fix the browser clock so local day boundaries and history fixture dates are deterministic.
  await page.clock.install({time:new Date('2026-10-15T18:00:00Z')})
  const stamp=(day,hour)=>`2026-10-${day}T${hour}:00:00-04:00`
  let fail=false,empty=false,delayHistory=0
  const tasks=[
   {id:'oauth',title:'Fix callback retry',status:'progress',project:'checkout-api',nextStep:'Check the expired callback response',referenceUrl:'https://github.com/octocat/Hello-World/issues/1',createdAt:stamp(14,'09'),notes:[{id:'duplicate',kind:'note',text:'Expired code covered',createdAt:stamp(15,'12')},{id:'done-a',kind:'change',text:'Moved from progress to done.',createdAt:stamp(15,'11')},{id:'reopen',kind:'change',text:'Moved from done to progress.',createdAt:stamp(15,'11')}]},
   {id:'keyboard',title:'Check keyboard access to the task editor',status:'done',project:'web-client',nextStep:'',referenceUrl:'',createdAt:stamp(14,'08'),notes:[{id:'done-b',kind:'change',text:'Moved from progress to done.',createdAt:stamp(15,'10')}]},
   {id:'long',title:'Preserve references and notes when exporting a workspace with disconnected projects',status:'ready',project:'',nextStep:'Verify export',referenceUrl:'',createdAt:'2026-09-01T09:00:00-04:00',notes:[]},
  ]
  const sessions=[
   {id:'focus-a',taskId:'oauth',status:'ended',startedAt:stamp(15,'11'),endedAt:stamp(15,'12'),durationActualSeconds:1200,durationPlannedSeconds:3600},
   {id:'focus-b',taskId:'keyboard',status:'ended',startedAt:stamp(15,'09'),endedAt:stamp(15,'10'),durationActualSeconds:1500},
   {id:'orphan',taskId:'missing',status:'ended',startedAt:stamp(15,'08'),endedAt:stamp(15,'09'),durationActualSeconds:300},
   {id:'active',taskId:'oauth',status:'active',startedAt:stamp(15,'13'),endedAt:null,durationActualSeconds:600},
  ]
  await page.route('**/api/**',async route=>{
   const path=new URL(route.request().url()).pathname
   if(route.request().method()!=='GET'){mutations.push(path);return route.abort()}
   if(delayHistory&&path==='/api/sessions')await new Promise(resolve=>setTimeout(resolve,delayHistory))
   if(fail&&path==='/api/sessions')return route.fulfill({status:503,json:{error:'Fixture history failure'}})
   const responses={
    '/api/auth/me':{user:{id:'activity-fixture',email:'fixture@test.invalid',role:'user'}},
    '/api/tasks':empty?[]:tasks,'/api/checkpoints':empty?[]:[{id:'duplicate',whatChanged:'Expired code covered',outcome:'continue',createdAt:stamp(15,'12'),task:{id:'oauth'}}],
    '/api/sessions/active':null,'/api/sessions':empty?[]:sessions,'/api/export':{tasks:empty?[]:tasks,focusSessions:empty?[]:sessions,checkpoints:[]},'/api/github/projects':[],
   }
   assert(Object.hasOwn(responses,path),`Unexpected fixture request ${path}`)
   await route.fulfill({json:responses[path]})
  })
  const check=(name,passed)=>{assert(passed,name);checks.push({width,theme,navigation,name})}
  const base=process.env.POMOGIT_APP_URL||'http://127.0.0.1:5191'
  await page.goto(`${base}/#review`);await page.locator('.activity-event').first().waitFor()
  check('Recorded totals exclude active timers and use actual duration',/50 min/.test(await page.locator('.activity-summary').textContent())&&/3focus sessions/.test(await page.locator('.activity-summary').textContent()))
  check('Historical completions count even after reopening',/2tasks completed/.test(await page.locator('.activity-summary').textContent()))
  check('Duplicate hydrated checkpoint appears once',await page.locator('.activity-event-copy').filter({hasText:'Expired code covered'}).count()===1)
  check('Activity replaces generic task/status filters',await page.getByRole('searchbox',{name:'Search activity',exact:true}).isVisible()&&await page.getByRole('combobox',{name:'Activity type',exact:true}).isVisible()&&await page.locator('[aria-label="Filter by status"]').count()===0)
  check('Day groups contain distinct project subgroups',await page.locator('.activity-section').count()===1&&await page.locator('.activity-project-group').count()===3&&await page.locator('.activity-project').allTextContents().then(names=>names.join('|')==='checkout-api|web-client|No project'))
  check('Each subgroup contains only its own newest-first records',await page.locator('.activity-project-group').evaluateAll(groups=>groups.every(group=>{const dates=[...group.querySelectorAll('time')].map(time=>Date.parse(time.dateTime));return dates.every((date,i)=>!i||date<=dates[i-1])})))
  await page.getByRole('searchbox',{name:'Search activity',exact:true}).fill('expired')
  check('Search chip describes the applied query',await page.getByRole('button',{name:'Remove query filter',exact:true}).getAttribute('title')==='Search: expired')
  await page.getByRole('button',{name:'Remove query filter',exact:true}).click()
  check('Removing search restores records and input focus',await page.locator('.activity-event').count()===7&&await page.getByRole('searchbox',{name:'Search activity',exact:true}).evaluate(el=>el===document.activeElement))
  await page.getByRole('combobox',{name:'Project',exact:true}).selectOption('checkout-api')
  check('Project chip and subgroup match selected project',await page.getByRole('button',{name:'Remove project filter',exact:true}).getAttribute('title')==='Project: checkout-api'&&await page.locator('.activity-project-group').count()===1)
  await page.getByRole('button',{name:'Remove project filter',exact:true}).click()
  await page.getByRole('combobox',{name:'Activity type',exact:true}).selectOption('focus')
  check('Type chip preserves only recorded sessions',await page.getByRole('button',{name:'Remove type filter',exact:true}).isVisible()&&await page.locator('.activity-event').count()===3)
  await page.getByRole('button',{name:'Remove type filter',exact:true}).click()
  await page.getByRole('button',{name:'All time',exact:true}).click()
  check('All-time chip is removable',await page.getByRole('button',{name:'Remove date filter',exact:true}).getAttribute('title')==='All time')
  await page.getByRole('button',{name:'Remove date filter',exact:true}).click()
  check('Removing date restores Today without hidden filters',await page.getByRole('button',{name:'Today',exact:true}).getAttribute('aria-pressed')==='true'&&!await page.locator('.activity-applied').count())
  check('Layout fits viewport',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.activity-controls').scrollWidth<=document.querySelector('.activity-controls').clientWidth))
  await page.screenshot({path:`${output}/activity-${width}-${theme}-${navigation}.png`,animations:'disabled'})
  const opener=page.locator('[data-record="session-focus-a"] button')
  await opener.click();const scrollPosition=await page.locator('.wb-main').evaluate(el=>el.scrollTop);let dialog=page.getByRole('dialog');await dialog.evaluate(async e=>Promise.all(e.getAnimations().map(a=>a.finished)))
  check('Focus detail separates recorded event and current status',/20 min recorded/.test(await dialog.textContent())&&/Current statusIn progress/.test(await dialog.textContent())&&await dialog.getByRole('link',{name:'Open reference',exact:true}).isVisible())
  check('Dialog and footer fit desktop and mobile',await dialog.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1})&&await dialog.locator('footer').evaluate(e=>e.scrollWidth<=e.clientWidth+1))
  await page.screenshot({path:`${output}/detail-${width}-${theme}-${navigation}.png`,animations:'disabled'})
  await page.setViewportSize({width,height:480})
  await page.waitForTimeout(100)
  const geometry=await dialog.evaluate(e=>({header:e.querySelector('header').getBoundingClientRect().top,footer:e.querySelector('footer').getBoundingClientRect().bottom}))
  await dialog.locator('.wb-modal-body').evaluate(e=>e.scrollTop=e.scrollHeight)
  check('Only dialog body scrolls between fixed header and footer',await dialog.evaluate((e,before)=>e.querySelector('.wb-modal-body').scrollTop>0&&Math.abs(e.querySelector('header').getBoundingClientRect().top-before.header)<1&&Math.abs(e.querySelector('footer').getBoundingClientRect().bottom-before.footer)<1,geometry))
  await page.setViewportSize({width,height:960})
  await page.keyboard.press('Escape')
  check('Escape restores originating record focus and scroll',await opener.evaluate(e=>document.activeElement===e)&&Math.abs(await page.locator('.wb-main').evaluate(el=>el.scrollTop)-scrollPosition)<2)
  await opener.click();await dialog.getByRole('button',{name:'View task',exact:true}).click()
  check('View task opens existing read-only inspection',await dialog.getByRole('button',{name:'Edit',exact:true}).isVisible()&&await dialog.getByRole('button',{name:'Work on this',exact:true}).isVisible()&&await dialog.locator('input,textarea').count()===0)
  await page.keyboard.press('Escape')
  check('Closing task inspection returns focus to event action',await opener.evaluate(e=>document.activeElement===e))
  await page.locator('[data-record="session-orphan"] button').click()
  check('Unlinked session has honest fallback and no broken task action',/Task unavailable/.test(await dialog.textContent())&&await dialog.getByRole('button',{name:'View task',exact:true}).count()===0)
  await page.keyboard.press('Escape')
  await page.getByRole('combobox',{name:'Activity type',exact:true}).selectOption('note')
  await page.getByRole('searchbox',{name:'Search activity',exact:true}).fill('expired')
  check('Record-level search does not expose sibling events',await page.locator('.activity-event').count()===1)
  await page.getByRole('combobox',{name:'Project',exact:true}).selectOption('web-client')
  check('Intersecting filters show recoverable no-match state',await page.locator('.activity-event').count()===0&&await page.getByRole('button',{name:'Clear filters',exact:true}).isVisible())
  await page.getByRole('button',{name:'Clear filters',exact:true}).click()
  check('Clear resets type, query and project',await page.getByRole('combobox',{name:'Activity type',exact:true}).inputValue()===''&&await page.getByRole('searchbox',{name:'Search activity',exact:true}).inputValue()===''&&await page.getByRole('combobox',{name:'Project',exact:true}).inputValue()==='')
  await page.getByRole('button',{name:'All time',exact:true}).click()
  check('All time preserves access to older history',await page.locator('[data-record="created-long"]').count()===1)
  await page.getByRole('combobox',{name:'Project',exact:true}).selectOption('__no_project__')
  check('No-project filter includes unlinked and project-less work',await page.locator('.activity-event').count()===2)
  // Scope filters to Activity and retain them when navigating back.
  await page.getByRole('button',{name:'All time',exact:true}).click()
  await page.goto(`${base}/#work`);await page.locator('.wb-detail').waitFor()
  check('Activity filter does not filter Workspace',await page.locator('.wb-task-row').count()===2)
  await page.goto(`${base}/#review`);await page.locator('.activity-controls').waitFor()
  check('Activity selection survives page navigation',await page.getByRole('combobox',{name:'Project',exact:true}).inputValue()==='__no_project__'&&await page.getByRole('button',{name:'All time',exact:true}).getAttribute('aria-pressed')==='true')
  fail=true;await page.reload();await page.getByRole('button',{name:'Try again',exact:true}).waitFor()
  check('Load error hides stale summaries and offers retry',await page.getByRole('alert').isVisible()&&await page.locator('.activity-summary').count()===0)
  fail=false;delayHistory=500;await page.getByRole('button',{name:'Try again',exact:true}).click();await page.getByText('Loading your work history…',{exact:true}).waitFor();
  check('Loading hides stale totals and empty success copy',await page.locator('.activity-summary').count()===0&&await page.locator('.activity-empty').count()===0)
  await page.locator('.activity-event').first().waitFor();delayHistory=0
  check('Retry restores work history',await page.getByRole('alert').count()===0)
  empty=true;await page.reload();await page.locator('.activity-empty').waitFor()
  check('First-use history is explanatory without invented totals',/as you work/.test(await page.locator('.activity-empty').textContent())&&await page.locator('.activity-summary').count()===0)
  check('No browser errors or account mutations',errors.length===0&&mutations.length===0)
  console.log(`${width}/${theme}/${navigation} passed`);await context.close()
 }
 await writeFile(`${output}/results.json`,JSON.stringify(checks,null,2));console.log(`${checks.length} integrated Activity checks passed; ${output}`)
}finally{await browser.close()}
