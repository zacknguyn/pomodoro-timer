// Standalone HTML proposal only. Does not access user storage, account or GitHub APIs.
import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import { chromium } from './browser.mjs'
const output=process.env.POMOGIT_ACTIVITY_OUTPUT||'/tmp/pomogit-activity/preview'
await mkdir(output,{recursive:true})
const browser=await chromium.launch(),checks=[]
try{
 for(const width of [1440,768,375])for(const theme of ['dark','light']){
  const page=await browser.newPage({viewport:{width,height:960}}),errors=[],api=[]
  page.on('pageerror',e=>errors.push(e.message))
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)})
  await page.route('**/api/**',r=>{api.push(r.request().url());return r.abort()})
  await page.goto('http://127.0.0.1:5196/design/activity-preview.html')
  await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme)
  await page.evaluate(()=>document.fonts.ready)
  const check=(name,value)=>{assert(value,name);checks.push({width,theme,name})}
  check('Today groups eight records with consistent summary',await page.locator('.activity-event').count()===8&&/95 min/.test(await page.locator('.activity-summary').textContent())&&/2tasks completed/.test(await page.locator('.activity-summary').textContent()))
  check('Page and controls fit viewport',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.activity-controls').scrollWidth<=document.querySelector('.activity-controls').clientWidth))
  await page.screenshot({animations:'disabled',path:`${output}/activity-${width}-${theme}.png`})
  await page.locator('[data-open=focus-oauth]').click()
  const dialog=page.getByRole('dialog')
  await dialog.evaluate(async e=>{await Promise.all(e.getAnimations().map(a=>a.finished))})
  check('Focus detail distinguishes actual time and current task status',/20 min recorded/.test(await dialog.textContent())&&/stopped early/.test(await dialog.textContent())&&/Current statusIn progress/.test(await dialog.textContent()))
  check('Detail panel and fixed footer fit viewport',await dialog.evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1})&&await dialog.locator('footer').evaluate(e=>e.scrollWidth<=e.clientWidth+1))
  await page.screenshot({animations:'disabled',path:`${output}/detail-${width}-${theme}.png`})
  await page.keyboard.press('Escape')
  check('Escape returns focus to originating record',await page.locator('[data-open=focus-oauth]').evaluate(e=>document.activeElement===e))
  await page.locator('[data-open=complete-keyboard]').click()
  check('Completion stands without a required note',/Completed without a closing note/.test(await dialog.textContent()))
  await dialog.getByRole('button',{name:'View task',exact:true}).click()
  check('View task remains read-only in proposal',/Read-only task preview/.test(await dialog.textContent())&&await dialog.locator('input,textarea').count()===0)
  await dialog.getByRole('button',{name:'Close',exact:true}).click()
  await page.locator('#activity-type').selectOption('focus')
  check('Activity type filters events and summary together',await page.locator('.activity-event').count()===4&&/95 min/.test(await page.locator('.activity-summary').textContent())&&/0tasks completed/.test(await page.locator('.activity-summary').textContent()))
  await page.locator('#activity-project').selectOption('checkout-api')
  check('Project filter intersects event type',await page.locator('.activity-event').count()===1&&/20 min/.test(await page.locator('.activity-summary').textContent()))
  await page.locator('#activity-search').fill('no such fixture')
  check('No-match selection has clear recovery',await page.locator('.activity-event').count()===0&&await page.getByRole('button',{name:'Clear filters',exact:true}).isVisible())
  await page.getByRole('button',{name:'Clear filters',exact:true}).click()
  await page.getByRole('button',{name:'Last 7 days',exact:true}).click()
  check('Range includes yesterday with consistent time',await page.locator('.activity-section').count()===2&&await page.locator('.activity-event').count()===10&&/125 min/.test(await page.locator('.activity-summary').textContent()))
  await page.locator('#activity-project').selectOption('none')
  check('Long title and project-less work fit rows',await page.locator('.activity-event').count()===2&&await page.locator('.activity-event').first().evaluate(e=>e.scrollWidth<=e.clientWidth+1))
  await page.locator('#preview-state').selectOption('loading')
  check('Loading does not display empty success or misleading totals',await page.locator('#activity-results').getAttribute('aria-busy')==='true'&&await page.locator('.activity-summary').isHidden()&&!/No activity/.test(await page.locator('#activity-results').textContent()))
  await page.locator('#preview-state').selectOption('error')
  check('Error includes retry without stale totals',await page.getByRole('alert').isVisible()&&await page.locator('.activity-summary').isHidden())
  await page.getByRole('button',{name:'Try again',exact:true}).click()
  check('Retry returns to history with selected filters intact',await page.locator('.activity-event').count()===2)
  await page.locator('#preview-state').selectOption('empty')
  check('First visit explains history without requiring notes',/as you work/.test(await page.locator('.activity-empty').textContent())&&await page.locator('.activity-summary').isHidden())
  await page.screenshot({animations:'disabled',path:`${output}/empty-${width}-${theme}.png`})
  await page.locator('#preview-navigation').click()
  check('Navbar option fits viewport',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
  check('No browser errors or API traffic',errors.length===0&&api.length===0)
  await page.close()
 }
 await writeFile(`${output}/results.json`,JSON.stringify(checks,null,2));console.log(`${checks.length} Activity proposal checks passed; ${output}`)
}finally{await browser.close()}
