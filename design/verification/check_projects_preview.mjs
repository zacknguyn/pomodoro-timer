// Standalone HTML proposal only. Does not use account or GitHub APIs.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from './browser.mjs'
const base = process.env.POMOGIT_PROJECT_PREVIEW_URL || 'http://127.0.0.1:5196/design/projects-preview.html'
const output = process.env.POMOGIT_PROJECT_PREVIEW_OUTPUT || '/tmp/pomogit-projects-preview'
await mkdir(output,{recursive:true})
const browser=await chromium.launch(), results=[]
try {
  for(const width of [1440,375]) for(const theme of ['dark','light']) {
    const page=await browser.newPage({viewport:{width,height:900}}), errors=[],api=[]
    page.setDefaultTimeout(10000)
    page.on('pageerror',error=>errors.push(error.message))
    await page.route('**/api/**',route=>{api.push(route.request().url());return route.abort()})
    const check=(name,passed)=>{assert(passed,name);results.push({width,theme,name})}
    await page.goto(base)
    await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme)
    const manager=page.getByRole('dialog',{name:'Projects & repositories',exact:true})
    await manager.waitFor()
    check('Projects precede the collapsed connection section',await manager.locator('.project-proposal-connect').getAttribute('open')===null && await manager.locator('.project-proposal-row').count()===3)
    check('GitHub and local projects are distinguished',await manager.getByText('GitHub connected · 3 tasks',{exact:true}).isVisible() && await manager.getByText('Local project · 2 tasks',{exact:true}).isVisible())
    check('Each connected project offers an explicit import action',await manager.getByRole('button',{name:/Import more issues/}).count()===2)
    check('Dialog fits viewport',await manager.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth+1 && e.scrollWidth<=e.clientWidth+1}))
    await page.screenshot({path:`${output}/projects-${width}-${theme}.png`})
    await manager.getByRole('button',{name:/Import more issues/}).first().click()
    const issues=page.getByRole('dialog',{name:'Import more issues',exact:true})
    await issues.waitFor()
    await issues.locator('input[type=checkbox]').check()
    check('Selection enables counted import action',await issues.getByRole('button',{name:'Import 1 selected into Inbox',exact:true}).isEnabled())
    await issues.getByRole('button',{name:'No issues',exact:true}).click()
    check('No-issues state explains manual tasks without disconnecting',await issues.getByText('No open issues to import',{exact:true}).isVisible() && /still connected/.test(await issues.textContent()))
    await page.screenshot({path:`${output}/empty-${width}-${theme}.png`})
    await issues.getByRole('button',{name:'Already imported',exact:true}).click()
    check('Already imported issues are visibly disabled',await issues.locator('input[type=checkbox]').isDisabled() && await issues.getByText('#1 · Already imported',{exact:true}).isVisible())
    await issues.getByRole('button',{name:'Back to projects',exact:true}).last().click()
    await manager.getByRole('button',{name:'Remove project octocat/Hello-World',exact:true}).click()
    const removal=page.getByRole('dialog',{name:'Remove project?',exact:true})
    check('Removal explains retained tasks and unchanged GitHub',/tasks, notes, references, and timer history stay/.test(await removal.textContent()) && /GitHub stays unchanged/.test(await removal.textContent()))
    await page.screenshot({path:`${output}/remove-${width}-${theme}.png`})
    await removal.getByRole('button',{name:'Cancel',exact:true}).click()
    check('Cancel preserves project rows',await manager.locator('.project-proposal-row').count()===3)
    await manager.getByRole('button',{name:'Remove project octocat/Hello-World',exact:true}).click()
    await removal.getByRole('button',{name:'Remove project',exact:true}).click()
    check('Preview removal removes only the selected project row',await manager.locator('.project-proposal-row').count()===2 && /3 tasks kept/.test(await page.locator('[data-feedback]').textContent()))
    await manager.locator('.project-proposal-connect>summary').click()
    await manager.locator('[name=repository]').fill('https://github.com/octocat/Spoon-Knife')
    await manager.getByRole('button',{name:'Connect repository',exact:true}).click()
    check('Connection opens issue picker with a normalized repository name',await issues.getByText('octocat/Spoon-Knife',{exact:true}).isVisible())
    check('No console errors or API traffic',errors.length===0 && api.length===0)
    await page.close()
  }
  await writeFile(`${output}/results.json`,JSON.stringify(results,null,2))
  console.log(`${results.length} project proposal checks passed. Evidence: ${output}`)
}finally{await browser.close()}
