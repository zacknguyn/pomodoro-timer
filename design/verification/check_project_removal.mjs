// Requires an initialized disposable database; provider browsing uses fixtures.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.POMOGIT_PLAYWRIGHT_MODULE || 'playwright')
const {Pool}=createRequire(new URL('../../backend/package.json',import.meta.url))('pg')
const database=process.env.POMOGIT_TEST_DATABASE_URL
assert(database && /_verification$/.test(new URL(database).pathname))
const pool=new Pool({connectionString:database,ssl:false})
const browser=await chromium.launch(), checks=[]
const base='http://127.0.0.1:5182', api='http://127.0.0.1:3101/api', output='/tmp/pomogit-project-removal'
await mkdir(output,{recursive:true})
try {
 for(const width of [1440,390,320]) {
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500,colorScheme:width===390?'dark':'light'})
  const page=await context.newPage(),errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  const check=(name,result)=>{assert(result,name);checks.push({width,name})}
  await page.route('**/github/repositories?*',route=>route.fulfill({json:{repositories:[{githubId:'1',fullName:'demo/api',description:'A connected repository'},{githubId:'2',fullName:'demo/website',description:'Public website'}],hasMore:false,needsGithub:false}}))
  await page.route('**/github/projects/*/issues?*',route=>route.fulfill({json:{issues:[{number:1,title:'Keep task context close',imported:false}],hasMore:false}}))
  await page.goto(`${base}/#register`)
  await page.locator('[name=email]').fill(`${randomUUID()}@project-removal-ui.invalid`)
  await page.locator('[name=password]').fill(randomUUID())
  await page.locator('.pg-account-form button[type=submit]').click()
  await page.waitForFunction(()=>document.querySelector('.wb-capture button') && !document.querySelector('.wb-capture button').disabled)
  const owner=(await (await context.request.get(`${api}/auth/me`)).json()).user.id
  await pool.query('INSERT INTO github_projects(user_id,github_id,full_name) VALUES($1,$2,$3)',[owner,'1','demo/api'])
  const task=await (await context.request.post(`${api}/tasks`,{data:{title:'Keep this work',project:'demo/api',referenceUrl:'https://github.com/demo/api/issues/1',notes:[{id:randomUUID(),text:'Preserve my note',createdAt:new Date().toISOString(),kind:'note'}]}})).json()
  const session=await (await context.request.post(`${api}/sessions`,{data:{taskId:task.id,durationPlannedSeconds:60}})).json()
  await context.request.patch(`${api}/sessions/${session.id}`,{data:{action:'pause'}})
  await page.reload()
  const open=()=>page.getByRole('button',{name:'Connect GitHub repository',exact:true}).click()
  await open()
  await page.getByRole('textbox',{name:'Search repositories'}).waitFor()
  await page.getByRole('textbox',{name:'Search repositories'}).fill('website')
  check('Repository search narrows the loaded list',await page.getByRole('dialog').getByRole('button',{name:/demo\/website Public website/}).count()===1 && await page.getByRole('dialog').getByRole('button',{name:/demo\/api A connected repository/}).count()===0)
  await page.getByRole('textbox',{name:'Search repositories'}).fill('')
  await page.getByRole('dialog').evaluate(async dialog=>{await Promise.all(dialog.getAnimations().map(a=>a.finished))})
  check('Picker fits without horizontal scrolling',await page.evaluate(()=>document.querySelector('.wb-modal-body').scrollWidth<=document.querySelector('.wb-modal-body').clientWidth))
  await page.screenshot({path:`${output}/picker-${width}.png`})
  await page.getByRole('button',{name:'Import issues from demo/api',exact:true}).click()
  await page.locator('.wb-github-issue').waitFor()
  check('Current step and repository context are visible',await page.locator('li[aria-current=step]').textContent()==='2Choose issues' && (await page.locator('.wb-repo-context').textContent()).includes('demo/api'))
  await page.getByRole('button',{name:'Change repository',exact:true}).click()
  const remove=()=>page.getByRole('button',{name:'Remove project demo/api',exact:true}).click()
  await remove()
  check('Confirmation names the project and keeps history',(await page.getByRole('dialog').textContent()).includes('demo/api') && (await page.getByRole('dialog').textContent()).includes('timer history stay'))
  check('Cancel receives focus',await page.evaluate(()=>document.activeElement.textContent==='Cancel'))
  await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click()
  check('Cancel preserves the project',(await (await context.request.get(`${api}/github/projects`)).json()).length===1)
  await remove()
  await page.route('**/tasks/projects',route=>route.fulfill({status:503,json:{error:'Temporary removal failure'}}))
  await page.getByRole('button',{name:'Remove project',exact:true}).click()
  await page.getByRole('dialog').getByRole('alert').waitFor()
  check('Failed removal retains confirmation and project',(await (await context.request.get(`${api}/github/projects`)).json()).length===1 && await page.getByRole('dialog',{name:'Remove project?'}).isVisible())
  await page.unroute('**/tasks/projects')
  await page.getByRole('button',{name:'Remove project',exact:true}).click()
  await page.getByRole('button',{name:'Remove project demo/api',exact:true}).waitFor({state:'hidden'})
  const kept=(await (await context.request.get(`${api}/tasks`)).json())[0]
  check('Removal clears labels and preserves notes and references',kept.id===task.id && kept.project==='' && kept.notes.some(note=>note.text==='Preserve my note') && kept.referenceUrl===task.referenceUrl)
  check('Paused timer is preserved',(await (await context.request.get(`${api}/sessions/active`)).json()).id===session.id)
  check('Repository connection is removed',(await (await context.request.get(`${api}/github/projects`)).json()).length===0)
  await page.getByRole('button',{name:'Cancel',exact:true}).click()
  await page.reload();await page.locator('.wb-detail h2').waitFor()
  check('Project stays removed after reload',await page.locator('.wb-project-shortcuts button[title="demo/api"]').count()===0)
  check('No browser errors',errors.length===0)
  await context.close()
 }
 await writeFile(`${output}/results.json`,JSON.stringify(checks,null,2));console.log(`${checks.length} project-removal UI checks passed; evidence: ${output}`)
} finally {await browser.close();await pool.end()}
