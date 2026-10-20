import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.POMOGIT_PLAYWRIGHT_MODULE || '/home/phong/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs')
const output=process.env.POMOGIT_WORKSPACE_OUTPUT || '/tmp/pomogit-workspace-evidence'
const base=process.env.POMOGIT_WORKSPACE_PREVIEW || 'http://127.0.0.1:5197/design/workspace-preview.html'
await mkdir(output,{recursive:true})
const browser=await chromium.launch({headless:true}), checks=[]
try {
 for(const theme of ['dark','light'])for(const layout of ['task','queue'])for(const width of [1440,768,375]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'})
  const page=await context.newPage(),errors=[],network=[]
  page.on('pageerror',error=>errors.push(error.message))
  page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`)})
  await page.route('**/*',route=>{if(new URL(route.request().url()).origin!==new URL(base).origin){network.push(route.request().url());return route.abort()}return route.continue()})
  const check=async(name,fn)=>{assert(await fn(),`${theme}/${layout}/${width}: ${name}`);checks.push({theme,layout,width,name})}
  const options=async()=>{if(await page.locator('.review-options').getAttribute('open')===null)await page.locator('.review-options summary').click()}
  const hideOptions=async()=>{if(await page.locator('.review-options').getAttribute('open')!==null)await page.locator('.review-options summary').click()}
  const reset=async scenario=>{await options();await page.selectOption('#scenario',scenario);await hideOptions()}
  await page.goto(`${base}?theme=${theme}&layout=${layout}`);await page.waitForTimeout(180)
  await check('No horizontal overflow',()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  await check('No long section divider rules',()=>page.locator('.ws-task-header,.ws-task-footer,.ws-task-scroll').evaluateAll(nodes=>nodes.every(node=>{const style=getComputedStyle(node);return style.borderTopWidth==='0px'&&style.borderBottomWidth==='0px'})))
  await check('Dither avatar fixture loads',()=>page.locator('.wb-account-menu img').evaluate(image=>image.complete&&image.naturalWidth>0))
  await page.screenshot({path:`${output}/${layout}-${theme}-${width}.png`,fullPage:true})
  if(width<=760&&await page.locator('.ws-mobile-chooser').getAttribute('open')===null)await page.locator('.ws-mobile-chooser summary').click()
  await page.locator('[data-action=select][data-id="2"]').click()
  await check('Selecting another task preserves running timer',async()=>await page.locator('.ws-task h2').textContent()==='Keep search filters after going back'&&await page.locator('.ws-timer-task').textContent()==='Fix the OAuth callback retry')
  await page.locator('[data-action=return]').click()
  await check('Return to focused task restores task without editing',async()=>await page.locator('.ws-task h2').textContent()==='Fix the OAuth callback retry'&&!await page.locator('dialog[open]').count())
  await page.locator('[data-action=pause]').click()
  await check('Pause and resume are explicit',async()=>await page.locator('[data-action=pause]').textContent().then(text=>text.includes('Resume')))
  await page.locator('[data-action=pause]').click()
  await page.locator('[data-action=minimize]').click()
  await check('Timer can minimize or expand',async()=>await page.locator('#timer').getAttribute('data-size')===(width<=760?'normal':'compact'))
  if(width<=760)await page.locator('[data-action=maximize]').click();else {await page.locator('[data-action=minimize]').click();await page.locator('[data-action=maximize]').click()}
  await check('Maximized timer stays inside viewport',()=>page.locator('#timer').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}))
  await page.locator('[data-action=maximize]').click()
  if(width<=760)await page.locator('[data-action=minimize]').click()
  if(width<=760&&await page.locator('.ws-mobile-chooser').getAttribute('open')===null)await page.locator('.ws-mobile-chooser summary').click()
  await page.locator('[data-action=inspect][data-id="2"]').click()
  await check('Task details are read-only',async()=>await page.locator('#task-dialog[open]').count()===1&&await page.locator('#task-dialog input,#task-dialog textarea').count()===0)
  await page.locator('[data-action=dialog-edit]').click()
  await page.locator('#edit-form [name=title]').fill('Discard this edit')
  await page.locator('#dialog-footer [data-close]').click()
  await page.locator('[data-action=inspect][data-id="2"]').click()
  await check('Cancel discards unsaved edits',async()=>!(await page.locator('#dialog-body').textContent()).includes('Discard this edit'))
  await page.keyboard.press('Escape')
  await check('Escape restores details trigger focus',()=>page.locator('[data-action=inspect][data-id="2"]').evaluate(el=>document.activeElement===el))
  await page.locator('#queue-search').fill('keyboard')
  await check('Queue search filters without changing selected task or timer',async()=>await page.locator('.ws-row').count()===1&&await page.locator('.ws-task h2').textContent()==='Fix the OAuth callback retry'&&await page.locator('.ws-timer-task').textContent()==='Fix the OAuth callback retry')
  await page.locator('#queue-search').fill('')
  await page.locator('[data-action=complete]').click()
  await check('Completion ends focus and offers optional note',async()=>await page.locator('#task-dialog h2').textContent()==='Task completed'&&await page.locator('[data-action=completed-note]').count()===1&&await page.locator('[data-action=start]').count()===1)
  await page.locator('[data-action=completed-note]').click()
  await page.locator('#note-form textarea').fill('Follow up after release.')
  await page.locator('#note-form button').click()
  await check('Optional note saves after completion',async()=>await page.locator('.ws-note').textContent()==='Follow up after release.')
  await reset('empty')
  await check('First visit has capture and no idle timer',async()=>await page.locator('#empty-form').count()===1&&!await page.locator('#timer').isVisible())
  await page.locator('#empty-form input').fill('First sample task')
  await page.locator('#empty-form button').click()
  await check('Creation saves Inbox without starting focus',async()=>await page.locator('.ws-task h2').textContent()==='First sample task'&&await page.locator('.ws-task-header .ws-status').textContent().then(text=>text.includes('Inbox'))&&await page.locator('[data-action=start]').count()===1)
  await page.locator('[data-action=start]').click()
  await check('Starting focus moves task to In progress',async()=>await page.locator('.ws-task-header .ws-status').textContent().then(text=>text.includes('In progress')))
  await reset('long')
  await check('Long content fits viewport',()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  await page.locator('.ws-task-tools [data-action=edit]').click()
  await check('Dialog body scrolls with fixed header and footer',()=>page.locator('#task-dialog').evaluate(dialog=>{const header=dialog.querySelector('header'),footer=dialog.querySelector('footer'),body=dialog.querySelector('.ws-modal-body');const h=header.getBoundingClientRect().top,f=footer.getBoundingClientRect().top;body.scrollTop=body.scrollHeight;return Math.abs(header.getBoundingClientRect().top-h)<1&&Math.abs(footer.getBoundingClientRect().top-f)<1&&footer.getBoundingClientRect().bottom<=innerHeight}))
  await page.keyboard.press('Escape')
  await options();await page.locator('#navigation').click();await hideOptions()
  await check('Navbar option fits viewport',()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  await check('No browser or asset errors',()=>errors.length===0)
  await check('No API requests or external resource requests',()=>network.length===0)
  await context.close()
 }
 await writeFile(`${output}/checks.json`,JSON.stringify(checks,null,2))
 console.log(`${checks.length} Workspace HTML preview checks passed; ${output}`)
}finally{await browser.close()}
