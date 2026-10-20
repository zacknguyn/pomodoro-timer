// Account-mode React with every API intercepted. No live account data or backend writes.
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
import { chromium } from './browser.mjs'
const output=process.env.POMOGIT_PROFILE_OUTPUT||'/tmp/pomogit-profile-integration'
await mkdir(output,{recursive:true})
const browser=await chromium.launch(),checks=[]
try{
 for(const width of [1440,768,375])for(const theme of ['dark','light']){
  const context=await browser.newContext({viewport:{width,height:960},colorScheme:theme,timezoneId:'America/New_York'})
  await context.addInitScript(()=>{
   if(!localStorage.getItem('profile-fixture-initialized')){
    localStorage.setItem('pomogit.profile:profile-fixture',JSON.stringify({displayName:'Alex Morgan',headline:'Frontend developer',bio:'Working on keyboard access.',featuredIds:['filters','keys'],featuredDescriptions:{filters:'Public search summary',keys:'Public keyboard summary'},shareActivity:false}))
    localStorage.setItem('pomogit.work-protocol:profile-fixture',JSON.stringify({motion:'reduced',weekStart:'monday'}))
    localStorage.setItem('profile-fixture-initialized','true')
   }
  })
  const page=await context.newPage(),errors=[],mutations=[]
  await page.clock.install({time:new Date('2026-10-15T18:00:00Z')})
  page.on('pageerror',e=>errors.push(e.message))
  const stamp=(day,hour='10')=>`2026-10-${day}T${hour}:00:00-04:00`
  let empty=false,fail=false,delay=0
  const tasks=[
   {id:'filters',title:'Keep search filters after going back',status:'done',project:'web-client',nextStep:'PRIVATE NEXT STEP',referenceUrl:'https://github.com/octocat/Hello-World/issues/1',createdAt:stamp(14),notes:[{id:'private-note',kind:'note',text:'PRIVATE INTERNAL DETAIL',createdAt:stamp(15,'12')},{id:'done-filters',kind:'change',text:'Moved from progress to done.',createdAt:stamp(15,'11')}]},
   {id:'keys',title:'Make the task editor work with a keyboard',status:'done',project:'web-client',nextStep:'',referenceUrl:'',createdAt:stamp(13),notes:[{id:'done-keys',kind:'change',text:'Moved from progress to done.',createdAt:stamp(13,'11')}]},
   {id:'third',title:'Preserve references and notes when exporting disconnected projects',status:'done',project:'',nextStep:'',referenceUrl:'',createdAt:'2026-09-01T10:00:00-04:00',notes:[]},
   {id:'fourth',title:'Review the import dialog',status:'done',project:'checkout-api',nextStep:'',referenceUrl:'',createdAt:stamp(14),notes:[]},
   {id:'reopened',title:'PRIVATE REOPENED TASK',status:'progress',project:'checkout-api',nextStep:'Continue checking',referenceUrl:'',createdAt:stamp(14),notes:[{id:'done-reopened',kind:'change',text:'Moved from progress to done.',createdAt:stamp(14,'11')}]},
  ]
  const sessions=[13,14,15].map((day,index)=>({id:`focus-${day}`,taskId:index===0?'keys':'filters',status:'ended',startedAt:stamp(day,'09'),endedAt:stamp(day),durationActualSeconds:1200,durationPlannedSeconds:3600}))
  sessions.push({id:'old',taskId:'third',status:'ended',startedAt:'2026-09-05T09:00:00-04:00',endedAt:'2026-09-05T10:00:00-04:00',durationActualSeconds:1500})
  sessions.push({id:'active',taskId:'filters',status:'active',startedAt:stamp(15,'13'),endedAt:null,durationActualSeconds:600})
  await page.route('**/api/**',async route=>{
   const path=new URL(route.request().url()).pathname
   if(route.request().method()!=='GET'){mutations.push(path);return route.abort()}
   if(delay&&path==='/api/sessions')await new Promise(resolve=>setTimeout(resolve,delay))
   if(fail&&path==='/api/sessions')return route.fulfill({status:503,json:{error:'Fixture history unavailable'}})
   const data={
    '/api/auth/me':{user:{id:'profile-fixture',email:'fixture@test.invalid',role:'user'}},'/api/tasks':empty?[]:tasks,'/api/checkpoints':[],
    '/api/sessions/active':null,'/api/sessions':empty?[]:sessions,'/api/export':{tasks:empty?[]:tasks,focusSessions:empty?[]:sessions,checkpoints:[]},'/api/github/projects':[],
   }
   assert(Object.hasOwn(data,path),`Unexpected request ${path}`);await route.fulfill({json:data[path]})
  })
  const check=(name,value)=>{assert(value,name);checks.push({width,theme,name})}
  const base=process.env.POMOGIT_APP_URL||'http://127.0.0.1:5191'
  await page.goto(`${base}/#profile`);await page.locator('.pg-profile-work').first().waitFor()
  check('Approved gallery shows selected completed work with live Dither avatar',await page.locator('.pg-profile-work').count()===2&&await page.locator('.pg-profile-identity canvas').count()===1)
  check('No long horizontal separators across profile sections',await page.locator('.pg-profile-identity,.pg-profile-work,.pg-profile-rhythm,.pg-profile-section-heading').evaluateAll(elements=>elements.every(e=>getComputedStyle(e).borderTopWidth==='0px'&&getComputedStyle(e).borderBottomWidth==='0px')))
  check('Real-data covers do not invent illustrations or use private notes',await page.locator('.pg-profile-evidence.evidence-type').count()===2&&!/PRIVATE|Illustration/.test(await page.locator('.pg-profile-featured').textContent()))
  check('Recorded totals count reopened work and exclude active sessions',/Focus recorded60 min/.test(await page.locator('.pg-profile-summary').textContent())&&/Tasks completed3/.test(await page.locator('.pg-profile-summary').textContent())&&/Active days3/.test(await page.locator('.pg-profile-summary').textContent())&&/Current streak3 days/.test(await page.locator('.pg-profile-summary').textContent()))
  check('Page and gallery fit viewport',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.wb-main').scrollWidth<=document.querySelector('.wb-main').clientWidth+1))
  check('Desktop gallery has two columns; mobile stacks',await page.locator('.pg-profile-featured').evaluate((e,width)=>getComputedStyle(e).gridTemplateColumns.split(' ').length===(width>900?2:1),width))
  await page.screenshot({path:`${output}/profile-${width}-${theme}.png`,animations:'disabled'})
  await page.locator('.pg-profile-history-tools details>summary').click();await page.getByRole('button',{name:'View day',exact:true}).click()
  let dialog=page.getByRole('dialog')
  check('Private day inspection uses real records',/20 min recorded/.test(await dialog.textContent())&&/PRIVATE INTERNAL DETAIL/.test(await dialog.textContent()))
  await page.keyboard.press('Escape')
  check('Day inspection restores focus',await page.getByRole('button',{name:'View day',exact:true}).evaluate(e=>document.activeElement===e))
  await page.getByRole('button',{name:'12 weeks',exact:true}).click()
  check('Range change includes older recorded focus',/85 min/.test(await page.locator('.pg-profile-summary').textContent())&&await page.locator('.pg-profile-calendar').evaluate(e=>e.getBoundingClientRect().right<=innerWidth+1))
  await page.getByRole('button',{name:'4 weeks',exact:true}).click()
  const summaryButton=page.getByRole('button',{name:`Read summary for ${tasks[0].title}`,exact:true})
  await summaryButton.click()
  check('Public summary never copies private task context or references by default',/Public search summary/.test(await dialog.textContent())&&!/PRIVATE/.test(await dialog.textContent())&&await dialog.getByRole('link',{name:'Open reference',exact:true}).count()===0)
  await dialog.getByRole('button',{name:'View task',exact:true}).click()
  check('Owner can open existing read-only task inspection',await dialog.getByRole('button',{name:'Edit',exact:true}).isVisible()&&await dialog.getByRole('button',{name:'Reopen in Workspace',exact:true}).isVisible()&&/PRIVATE INTERNAL DETAIL/.test(await dialog.textContent()))
  await page.keyboard.press('Escape')
  check('Closing inspection restores summary opener',await summaryButton.evaluate(e=>document.activeElement===e))
  await page.getByRole('button',{name:'Edit profile',exact:true}).click()
  const oldAvatar=await dialog.locator('canvas').evaluate(c=>c.toDataURL())
  await dialog.getByRole('button',{name:'Generate another avatar',exact:true}).click()
  await page.waitForFunction(old=>document.querySelector('.wb-avatar-editor canvas').toDataURL()!==old,oldAvatar)
  await dialog.getByRole('textbox',{name:'Display name',exact:true}).fill('Discard me')
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click()
  check('Cancel discards name and Dither avatar draft',await page.locator('.pg-profile-identity h2').textContent()==='Alex Morgan')
  await page.getByRole('button',{name:'Edit profile',exact:true}).click()
  check('Editor reopens with saved values and Dither-only controls',await dialog.getByRole('textbox',{name:'Display name',exact:true}).inputValue()==='Alex Morgan'&&await dialog.locator('input[type=file]').count()===0&&await dialog.locator('canvas').evaluate((c,old)=>c.toDataURL()===old,oldAvatar))
  await dialog.getByRole('textbox',{name:'Display name',exact:true}).fill('Alex Builder')
  await dialog.getByRole('textbox',{name:'GitHub · optional',exact:true}).fill('javascript:alert(1)')
  await dialog.getByRole('button',{name:'Save profile',exact:true}).click()
  check('Profile links reject unsafe protocols',await dialog.getByRole('alert').isVisible())
  await dialog.getByRole('textbox',{name:'GitHub · optional',exact:true}).fill('https://github.com/octocat')
  await dialog.getByRole('button',{name:'Save profile',exact:true}).click()
  check('Saved identity updates account footer and profile together',await page.locator('.pg-profile-identity h2').textContent()==='Alex Builder'&&await page.locator('.wb-account-identity strong').textContent()==='Alex Builder')
  await page.getByRole('button',{name:'Choose featured work',exact:true}).click()
  await dialog.getByRole('checkbox',{name:tasks[2].title,exact:true}).check()
  check('Featured selection caps at three',await dialog.getByRole('checkbox',{name:tasks[3].title,exact:true}).isDisabled()&&/3 of 3 selected/.test(await dialog.textContent()))
  await dialog.getByRole('textbox',{name:'Public description · optional',exact:true}).first().fill('Discard this caption')
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click()
  check('Cancel preserves gallery and caption',await page.locator('.pg-profile-work').count()===2&&!/Discard this caption/.test(await page.locator('.pg-profile-featured').textContent()))
  await page.getByRole('button',{name:'Choose featured work',exact:true}).click()
  await dialog.getByRole('textbox',{name:'Public description · optional',exact:true}).first().fill('Explicit public caption')
  await dialog.getByRole('checkbox',{name:'Include reference link in visitor preview',exact:true}).check()
  await dialog.getByRole('button',{name:'Save featured work',exact:true}).click()
  await page.getByRole('button',{name:'Preview as visitor',exact:true}).click()
  check('Visitor stays unpublished and excludes private history and task controls',/not published/.test(await page.locator('.pg-profile-preview-notice').textContent())&&!/PRIVATE/.test(await page.locator('.pg-profile-page').textContent())&&await page.locator('.pg-profile-recent,.pg-profile-rhythm').count()===0&&await page.getByRole('button',{name:'Edit profile',exact:true}).count()===0)
  await summaryButton.click()
  check('Visitor summary includes only deliberate caption and opted-in reference',/Explicit public caption/.test(await dialog.textContent())&&!/PRIVATE/.test(await dialog.textContent())&&await dialog.getByRole('button',{name:'View task',exact:true}).count()===0&&await dialog.getByRole('link',{name:'Open reference',exact:true}).getAttribute('href')===tasks[0].referenceUrl)
  await page.keyboard.press('Escape')
  await page.screenshot({path:`${output}/visitor-${width}-${theme}.png`,animations:'disabled'})
  await page.getByRole('button',{name:'Back to my profile',exact:true}).click()
  await page.getByRole('button',{name:'Preview contents',exact:true}).click()
  await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Cancel',exact:true}).click()
  await page.getByRole('button',{name:'Preview as visitor',exact:true}).click()
  check('Cancel discards visibility draft',await page.locator('.pg-profile-rhythm').count()===0)
  await page.getByRole('button',{name:'Back to my profile',exact:true}).click()
  await page.getByRole('button',{name:'Preview contents',exact:true}).click();await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Save preview contents',exact:true}).click()
  await page.getByRole('button',{name:'Preview as visitor',exact:true}).click()
  check('Opt-in shares aggregates without private strings or inspection actions',await page.locator('.pg-profile-rhythm').isVisible()&&await page.getByRole('button',{name:'View day',exact:true}).count()===0&&!/PRIVATE/.test(await page.locator('.pg-profile-page').textContent())&&await page.locator('.pg-profile-recent').count()===0)
  await page.reload();await page.locator('.pg-profile-identity').waitFor()
  check('Account-scoped profile persists across reload',await page.locator('.pg-profile-identity h2').textContent()==='Alex Builder'&&/Explicit public caption/.test(await page.locator('.pg-profile-featured').textContent()))
  await page.getByRole('button',{name:'Preview as visitor',exact:true}).click()
  check('Visibility preference persists',await page.locator('.pg-profile-rhythm').count()===1)
  await page.getByRole('button',{name:'Back to my profile',exact:true}).click()
  await page.locator('.pg-profile-recent>summary').click();await page.getByRole('button',{name:'Open Activity',exact:true}).click()
  await page.getByRole('button',{name:'All time',exact:true}).click()
  check('Profile history agrees with Activity recorded totals',page.url().endsWith('#review')&&/85 min/.test(await page.locator('.activity-summary').textContent())&&/3tasks completed/.test(await page.locator('.activity-summary').textContent()))
  await page.goto(`${base}/#profile`);await page.locator('.pg-profile-identity').waitFor()
  fail=true;await page.reload();await page.getByRole('button',{name:'Try again',exact:true}).waitFor()
  check('History failure does not display invented zero totals',await page.locator('.pg-profile-summary').count()===0&&/couldn’t load/.test(await page.locator('.pg-profile-page').textContent()))
  fail=false;delay=600;await page.getByRole('button',{name:'Try again',exact:true}).click();await page.locator('.pg-profile-state[aria-busy=true]').waitFor();check('Profile loading keeps identity visible and hides history figures',await page.locator('.pg-profile-identity').isVisible()&&!await page.locator('.pg-profile-summary,.pg-profile-featured').count());await page.locator('.pg-profile-summary').waitFor();delay=0
  empty=true;await page.reload();await page.locator('.pg-profile-empty').first().waitFor()
  check('Empty workspace has no stale featured work and honest zero history',await page.locator('.pg-profile-work').count()===0&&/Active days0/.test(await page.locator('.pg-profile-summary').textContent())&&/Current streak0 days/.test(await page.locator('.pg-profile-summary').textContent()))
  await page.getByRole('button',{name:'Choose featured work',exact:true}).click()
  check('Empty feature editor has no stale selection',await dialog.getByRole('checkbox').count()===0&&/0 of 3 selected/.test(await dialog.textContent()))
  await page.keyboard.press('Escape')
  check('No JavaScript errors or account mutations',errors.length===0&&mutations.length===0)
  await context.close()
 }
 await writeFile(`${output}/results.json`,JSON.stringify(checks,null,2));console.log(`${checks.length} integrated Profile checks passed; ${output}`)
}finally{await browser.close()}
