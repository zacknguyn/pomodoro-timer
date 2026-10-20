// Whole-app UI sweep. Mock storage only, every API request blocked.
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
import { chromium } from './browser.mjs'
const base=process.env.POMOGIT_PREVIEW_URL||'http://127.0.0.1:5192'
const output='/tmp/pomogit-consistency-pass';await mkdir(output,{recursive:true})
const browser=await chromium.launch(),checks=[]
try{
 for(const width of [1440,768,375])for(const theme of ['dark','light'])for(const navigation of ['sidebar','navbar']){
  const context=await browser.newContext({viewport:{width,height:900},colorScheme:theme,reducedMotion:'reduce',timezoneId:'America/New_York'})
  await context.addInitScript(({theme,navigation})=>{
   if(localStorage.getItem('consistency-fixture'))return
   const stamp='2026-10-15T10:00:00Z'
   const tasks=[
    {id:'a',title:'Check the callback retry',project:'checkout-api',status:'progress',nextStep:'Reproduce the expired callback.',notes:[{id:'note',kind:'note',text:'Keep the response for reference.',createdAt:stamp}],createdAt:stamp},
    {id:'b',title:'Preserve keyboard access, search filters and the selected repository when returning from a task dialog',project:'long-owner-name/frontend-workspace-repository',status:'ready',nextStep:'Check Escape and focus restoration.',notes:[],createdAt:stamp},
    {id:'c',title:'Keep search filters after going back',project:'web-client',status:'done',nextStep:'',notes:[{id:'complete',kind:'completion',text:'Back navigation verified.',createdAt:stamp}],createdAt:stamp},
    {id:'d',title:'Write the next useful task',project:'',status:'inbox',nextStep:'',notes:[],createdAt:stamp},
   ]
   const session={id:'paused',taskId:'a',status:'paused',startedAt:stamp,deadlineAt:'2026-10-15T10:25:00Z',remainingSeconds:900,durationPlannedSeconds:1500,durationActualSeconds:0}
   localStorage.setItem('pomogit.mock.v1',JSON.stringify({tasks,session,sessions:[{id:'ended',taskId:'c',status:'ended',startedAt:stamp,endedAt:'2026-10-15T10:20:00Z',durationActualSeconds:1200}],checkpoints:[],seq:100}))
   localStorage.setItem('pomogit.work-protocol',JSON.stringify({brightness:theme,navigation,motion:'reduced',expand:false}))
   localStorage.setItem('pomogit.profile',JSON.stringify({displayName:'Alex Morgan',headline:'Developer',bio:'Building a calmer place for unfinished work.',featuredIds:['c'],featuredDescriptions:{c:'Search context survives Back navigation.'},shareActivity:false}))
   localStorage.setItem('consistency-fixture','true')
  },{theme,navigation})
  const page=await context.newPage(),errors=[],api=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.route('**/api/**',route=>{api.push(route.request().url());return route.abort()})
  await page.clock.setFixedTime(new Date('2026-10-15T18:00:00Z'))
  const check=(name,result)=>{assert(result,`${width}/${theme}/${navigation}: ${name}`);checks.push({width,theme,navigation,name})}
  const snapshot=async name=>{await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`${output}/${name}-${width}-${theme}-${navigation}.png`})}
  const fit=()=>page.evaluate(()=>{const main=document.querySelector('.premium-app')?.closest('[hidden]')?null:document.querySelector('.wb-main');return document.documentElement.scrollWidth<=innerWidth+1&&(!main||main.scrollWidth<=main.clientWidth+1)})
  const dialogFit=()=>page.getByRole('dialog').evaluate(el=>{const r=el.getBoundingClientRect(),footer=el.querySelector('footer');return r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&(!footer||footer.scrollWidth<=footer.clientWidth+1)})
  for(const route of ['home','work','tasks','review','profile']){
   await page.goto(`${base}/#${route}`)
   await page.locator(route==='home'?'.dash-value':route==='work'?'.wb-detail':route==='tasks'?'.wb-board':route==='review'?'.activity-event':'.pg-profile-summary').first().waitFor()
   check(`${route}: page and content fit without horizontal overflow`,await fit())
   check(`${route}: visible controls have accessible labels`,await page.locator('.premium-app button:visible').evaluateAll(buttons=>buttons.every(button=>(button.getAttribute('aria-label')||button.textContent||button.getAttribute('title')||'').trim())))
   for(const selector of ['.wb-page-menu','.wb-account-menu']){
    await page.locator(`${selector}>summary`).click();await page.keyboard.press('Escape')
    check(`${route}: menu Escape returns to its trigger`,await page.locator(selector).evaluate(el=>!el.open&&document.activeElement===el.querySelector('summary')))
   }
   await snapshot(route)
  }
  check('Profile uses one private/public-state notice',!await page.locator('.wb-heading').getByText('Local preview · nothing published',{exact:true}).count()&&await page.locator('.pg-profile-preview-notice').count()===1)
  await page.getByRole('button',{name:'Preview as visitor',exact:true}).click()
  check('Visitor preview keeps task notes private',!await page.locator('.pg-profile-recent').count()&&!/Keep the response for reference/.test(await page.locator('.pg-profile-page').textContent()))
  await page.getByRole('button',{name:'Back to my profile',exact:true}).click()
  await page.getByRole('button',{name:'Edit profile',exact:true}).click();check('Profile dialog and footer fit',await dialogFit());await snapshot('edit-profile');await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click()
  await page.locator('.wb-account-menu>summary').click();await page.getByRole('button',{name:'Settings',exact:true}).click()
  check('Settings uses explicit choices instead of dropdowns',!await page.getByRole('dialog').locator('select').count()&&await page.getByRole('dialog').getByRole('radio',{name:'System',exact:true}).count()===1&&await dialogFit())
  const saved=await page.evaluate(()=>localStorage.getItem('pomogit.work-protocol'))
  await page.getByRole('button',{name:'Restore defaults',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click()
  check('Cancelling Settings discards restored defaults',await page.evaluate(()=>localStorage.getItem('pomogit.work-protocol'))===saved)
  await page.goto(`${base}/#tasks`);await page.locator('.wb-board-card').first().waitFor();await page.getByRole('textbox',{name:'Search tasks',exact:true}).fill('no-such-record')
  check('No-match Board has one clear recovery action',await page.getByRole('button',{name:'Clear filters',exact:true}).count()===1)
  await page.getByRole('button',{name:'Clear filters',exact:true}).click();check('Clear filters restores Board cards',await page.locator('.wb-board-card').count()===4)
  await page.locator('[data-task=b] .wb-card-title').click();check('Long task details fit',await dialogFit());await snapshot('task-details');await page.getByRole('dialog').getByRole('button',{name:'Edit',exact:true}).click();check('Task editor fits',await dialogFit());await snapshot('task-editor');await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click()
  await page.locator('[data-task=b] .wb-card-title').click();await page.getByRole('dialog').getByRole('button',{name:'Delete task',exact:true}).click();check('Delete confirmation fits and remains cancellable',await dialogFit());await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();await page.keyboard.press('Escape')
  for(const route of ['login','register','recover','landing']){
   await page.goto(`${base}/#${route}`);await page.locator(route==='landing'?'.pg-hero':'.pg-account-entry').first().waitFor()
   check(`${route}: public layout fits`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
   if(route==='login'||route==='register'){
    await page.getByRole('button',{name:'Show password',exact:true}).click();check(`${route}: password toggle has a clear state`,await page.locator('input[name=password]').getAttribute('type')==='text');await page.getByRole('button',{name:'Hide password',exact:true}).click()
   }
   if(route==='landing')check('Local homepage CTA identifies its preview',await page.getByRole('button',{name:'Open local workspace',exact:true}).isVisible())
   await snapshot(route)
  }
  check('Review made no API calls or JavaScript errors',!api.length&&!errors.length)
  console.log(`${width}/${theme}/${navigation} passed`);await context.close()
 }
 await writeFile(`${output}/checks.json`,JSON.stringify(checks,null,2));console.log(`${checks.length} consistency checks passed; ${output}`)
}finally{await browser.close()}
