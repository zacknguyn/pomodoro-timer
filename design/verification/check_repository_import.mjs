// Requires a disposable backend. Reads public GitHub data; writes only local test accounts.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = createRequire(import.meta.url)(process.env.POMOGIT_PLAYWRIGHT_MODULE || 'playwright')
const base = 'http://127.0.0.1:5182', api = 'http://127.0.0.1:3101/api', output = '/tmp/pomogit-repository-import'
await mkdir(output,{recursive:true})
const browser = await chromium.launch()
const checks=[]
try {
 for (const width of [1440,390]) {
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500})
  const page=await context.newPage(), errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  const check=(name,value)=>{assert(value,name);checks.push({width,name})}
  await page.goto(`${base}/#register`)
  await page.locator('[name=email]').fill(`${randomUUID()}@repository-ui-test.invalid`)
  await page.locator('[name=password]').fill(randomUUID())
  await page.locator('.pg-account-form button[type=submit]').click()
  const open=()=>page.getByRole('button',{name:'Connect GitHub repository',exact:true}).click()
  await open()
  await page.getByRole('dialog').waitFor()
  await page.getByText('Sign in with GitHub to browse your repositories, or paste any public repository URL above.').waitFor()
  check('Email accounts can use a repository URL',await page.locator('[name=repository]').isVisible())
  await page.locator('[name=repository]').fill('https://example.com/not-github')
  await page.getByRole('button',{name:'Connect repository',exact:true}).click()
  await page.getByRole('dialog').getByRole('alert').waitFor()
  check('Invalid URLs show an actionable error', (await page.getByRole('dialog').getByRole('alert').textContent()).includes('GitHub repository'))
  await page.locator('[name=repository]').fill('https://github.com/octocat/Hello-World')
  await page.getByRole('button',{name:'Connect repository',exact:true}).click()
  await page.locator('.wb-github-issue input').first().waitFor({timeout:25000})
  check('Connection shows owner/repository instead of the full URL',(await page.locator('.wb-github-heading').textContent()).includes('octocat/Hello-World'))
  check('Nothing is imported automatically',(await (await context.request.get(`${api}/tasks`)).json()).length===0)
  await page.locator('.wb-github-issue input').first().check()
  await page.getByRole('dialog').evaluate(async dialog=>{await Promise.all(dialog.getAnimations().map(animation=>animation.finished))})
  check('Dialog stays within the viewport',await page.evaluate(()=>{const r=document.querySelector('.wb-modal').getBoundingClientRect();return r.left>=0 && r.right<=innerWidth && document.documentElement.scrollWidth<=innerWidth}))
  await page.screenshot({path:`${output}/selected-${width}.png`})
  await page.getByRole('button',{name:'Import 1 selected into Inbox',exact:true}).click()
  await page.getByRole('dialog').waitFor({state:'hidden'})
  await page.locator('.wb-card-title').waitFor()
  const tasks=await (await context.request.get(`${api}/tasks`)).json()
  check('Only the selected issue becomes an Inbox task',tasks.length===1 && tasks[0].status==='inbox' && tasks[0].project==='octocat/Hello-World' && tasks[0].referenceUrl.includes('/issues/'))
  check('Import takes the user to Board',page.url().endsWith('#tasks'))
  await page.reload();await page.locator('.wb-card-title').waitFor()
  check('Imported work persists after reload',(await page.locator('.wb-card-title').textContent())===tasks[0].title)
  await open()
  await page.getByRole('dialog').getByRole('button',{name:'Import issues from octocat/Hello-World',exact:true}).click()
  await page.locator('.wb-github-issue small').filter({hasText:'Already imported'}).waitFor()
  check('Repeat imports are visibly excluded',await page.locator('.wb-github-issue input:disabled').count()===1)
  await page.getByRole('button',{name:'Done',exact:true}).click()
  check('No browser errors',errors.length===0)
  await context.close()
 }
 await writeFile(`${output}/results.json`,JSON.stringify(checks,null,2));console.log(`${checks.length} repository import UI checks passed; evidence: ${output}`)
} finally {await browser.close()}
