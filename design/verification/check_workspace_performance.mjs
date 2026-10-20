// Local account-mode app only; intercepts every API request with fixture data.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from './browser.mjs'
const base = process.env.POMOGIT_APP_URL || 'http://127.0.0.1:5194'
assert(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname), 'Use a local account-mode frontend')
const output = process.env.POMOGIT_PERFORMANCE_OUTPUT || '/tmp/pomogit-workspace-performance'
;(async () => {
 const browser = await chromium.launch({args:['--disable-gpu','--disable-dev-shm-usage']});
 const result={};
 try { for (const reduced of [false,true]) {
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:reduced?'reduce':'no-preference'});
  await context.addInitScript(reduced=>{
   localStorage.setItem('pomogit.work-protocol:speed-fixture',JSON.stringify({brightness:'dark',motion:reduced?'reduced':'system',navigation:'sidebar'}));
   window.chartPaints=0;
   const clear=CanvasRenderingContext2D.prototype.clearRect;
   CanvasRenderingContext2D.prototype.clearRect=function(...args){if(this.canvas.closest('.dash-chart'))window.chartPaints++;return clear.apply(this,args)};
  },reduced);
  const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const stamp='2026-10-20T10:00:00Z';
  const tasks=Array.from({length:120},(_,i)=>({id:`t${i}`,title:`Review implementation ${i}`,project:'web-client',nextStep:'Check the response and record the result',status:i%2?'ready':'done',notes:[{id:`n${i}`,text:'Finished verification of the implementation and recorded the result.',kind:i%2?'note':'completion',createdAt:stamp}],createdAt:stamp}));
  const sessions=Array.from({length:100},(_,i)=>({id:`s${i}`,taskId:`t${i}`,status:'ended',durationActualSeconds:120,startedAt:stamp,endedAt:stamp}));
  const checkpoints=Array.from({length:60},(_,i)=>({id:`cp${i}`,task:{id:`t${i}`,title:tasks[i].title},whatChanged:'Finished verification of the implementation and recorded the result.',outcome:'complete',createdAt:stamp}));
  const data={'/api/auth/me':{user:{id:'speed-fixture',email:'fixture@test.invalid',role:'user'}},'/api/tasks':tasks,'/api/checkpoints':checkpoints,'/api/sessions/active':null,'/api/sessions':sessions,'/api/export':{tasks,checkpoints,focusSessions:sessions},'/api/github/projects':[]};
  let requests=[];
  await page.route('**/api/**',async route=>{const path=new URL(route.request().url()).pathname;if(route.request().method()!=='GET'||!(path in data))throw Error(`Unexpected request ${path}`);const body=JSON.stringify(data[path]);requests.push({path,bytes:Buffer.byteLength(body)});await new Promise(r=>setTimeout(r,70));await route.fulfill({contentType:'application/json',body})});
  await page.clock.setFixedTime(new Date('2026-10-20T12:00:00Z'));await page.goto(`${base}/#home`);await page.locator('.dash-metric').first().waitFor();await page.waitForTimeout(500);
  const initial=requests.slice();requests=[];
  await page.evaluate(()=>{window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'))});await page.waitForTimeout(600);
  const resume=requests.slice();
  const client=await context.newCDPSession(page);await client.send('Performance.enable');
  async function sample(){await page.waitForTimeout(300);await page.evaluate(()=>window.chartPaints=0);const a=await client.send('Performance.getMetrics');await page.waitForTimeout(1200);const b=await client.send('Performance.getMetrics');const value=(r,n)=>r.metrics.find(m=>m.name===n).value;return {paints:await page.evaluate(()=>window.chartPaints),taskMs:Math.round((value(b,'TaskDuration')-value(a,'TaskDuration'))*1000)}}
  await page.mouse.move(1439,999);const idle=await sample();
  await page.addStyleTag({content:'.dash-chart {transform:translateY(3000px)}'});const offscreen=await sample();
  await page.locator('head style').last().evaluate(el=>el.remove());
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'))});
  const hidden=await sample();
  await page.evaluate(()=>{delete document.hidden;delete document.visibilityState;document.dispatchEvent(new Event('visibilitychange'))});await page.waitForTimeout(400);
  const resumed = await sample();
  assert.equal(offscreen.paints, 0, 'Offscreen charts sleep');
  assert.equal(hidden.paints, 0, 'Hidden-page charts sleep (simulated visibility event)');
  if (reduced) assert.equal(idle.paints, 0, 'Settled reduced-motion charts sleep');
  else assert(resumed.paints > 0, 'Visible charts resume their sparkles');
  const canvas=page.locator('[data-chart=focus] canvas').first();
  const beforeHover=await canvas.evaluate(el=>el.toDataURL());
  await page.locator('[data-chart=focus] .chart-value').first().focus();
  await page.waitForTimeout(300);
  assert.notEqual(await canvas.evaluate(el=>el.toDataURL()), beforeHover, 'Keyboard inspection wakes the canvas and moves its marker');
  await page.mouse.move(1439,999);
  // Preference changes must wake a sleeping loop without remounting the chart.
  await page.evaluate(()=>{document.documentElement.dataset.motion='system'});
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal((await sample()).paints, 0, 'OS reduced motion stops idle rendering');
  await page.emulateMedia({reducedMotion:'no-preference'});
  assert((await sample()).paints > 0, 'Disabling OS reduced motion resumes rendering');
  await page.evaluate(()=>{document.documentElement.dataset.motion='reduced'});
  assert.equal((await sample()).paints, 0, 'App reduced motion stops idle rendering');
  assert.equal(initial.filter(r=>r.path==='/api/export').length,0,'Normal loading never requests an export');
  assert.equal(initial.filter(r=>r.path==='/api/tasks').length,1,'Mount shares workspace reads, including development Strict Mode');
  assert.equal(resume.length,4,'Foreground event burst shares four workspace reads');
  assert(!resume.some(r=>r.path==='/api/github/projects'),'Fresh projects are reused');
  requests=[];
  await page.clock.setFixedTime(new Date('2026-10-20T12:01:01Z'));
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.waitForTimeout(400);
  assert.equal(requests.filter(r=>r.path==='/api/github/projects').length,1,'Project cache expires after a minute');
  assert.deepEqual(errors,[],'No browser errors');
  const summarize=rs=>({requests:rs.length,bytes:rs.reduce((n,r)=>n+r.bytes,0),paths:rs.map(r=>r.path)});
  result[reduced?'reduced':'full']={initial:summarize(initial),resume:summarize(resume),idle,offscreen,hidden,resumed,errors};
  await context.close();
 }} finally {await browser.close()}
 await mkdir(output,{recursive:true});await writeFile(`${output}/results.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));console.log(`Performance checks passed. Evidence: ${output}`);
})().catch(e=>{console.error(e);process.exit(1)});
