#!/usr/bin/env python3
"""Browser review of the opt-in violet layout, reusing the task preview."""
import json,time
import check_scaling as audit
from check_themes import CONTRAST

def run(b,out):
 cases=[]; colors=[]
 def load(scene,mode='dark'):
  b.command('WebDriver:Navigate',{'url':f'http://127.0.0.1:4173/design/pages-preview.html?concept=violet&theme=electric&mode={mode}&scene={scene}'})
  b.command('Marionette:SetContext',{'value':'chrome'})
  b.script('window.gBrowser.selectedBrowser.browsingContext.fullZoom=arguments[0]',b.zoom)
  b.command('Marionette:SetContext',{'value':'content'})
  time.sleep(.3)
  assert b.script("return document.documentElement.dataset.concept==='violet' && !!document.querySelector('.concept-projects')"), 'concept failed to initialize'
 def check(label):
  g=b.script("return {scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth,api:performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname.startsWith('/api/')).length,storage:localStorage.length+sessionStorage.length,dialog:[...document.querySelectorAll('dialog[open]')].map(e=>({left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,bottom:e.getBoundingClientRect().bottom})),height:innerHeight}")
  assert g['scroll']<=g['width']+1,(label,g)
  assert not g['api'] and not g['storage'],(label,g)
  for d in g['dialog']:assert d['left']>=0 and d['right']<=g['width']+7 and d['bottom']<=g['height']+1,(label,g)
  c=b.script(CONTRAST);assert all(v['ratio']>=4.5 for v in c),(label,[v for v in c if v['ratio']<4.5])
  colors.extend(c);cases.append(label)
 for mode in ['light','dark']:
  for width in [320,390,768,1440]:
   b.viewport(width,1000)
   for scene in ['workspace','board','large','large-board','edit','running']:
    load(scene,mode);check(f'{scene}:{mode}:{width}')
    if width in [390,1440] and scene in ['workspace','board','running']:b.screenshot(out/f'{scene}-{mode}-{width}.png')
 for width in [640,1280]:
  b.viewport(width,1000,zoom=2)
  for scene in ['workspace','board','edit']:
   load(scene);check(f'zoom200:{scene}:{width}')
   assert abs(b.script('return innerWidth')-width/2)<=1
 b.viewport(1440,1000);load('workspace')
 assert b.script("return document.querySelector('.topbar').getBoundingClientRect().top >= document.querySelector('.prototype').getBoundingClientRect().bottom-1")

 assert b.script("return !document.querySelector('.concept-note').open")
 b.click('#jump-note');assert b.script("return document.querySelector('.concept-note').open && document.activeElement.id==='note'")
 b.type('#note','Keep this draft');b.click('.task-row:nth-of-type(2)');b.click('.task-row:nth-of-type(1)')
 assert b.script("return document.querySelector('#note').value==='Keep this draft' && document.querySelector('.concept-note').open")
 b.click('.concept-projects button:nth-of-type(2)')
 assert b.script("return document.querySelector('#project').value==='web-client' && [...document.querySelectorAll('.task-row .project-label')].every(e=>e.textContent.trim()==='web-client')")
 b.click('.concept-projects button:nth-of-type(2)');assert b.script("return document.querySelector('#project').value===''")
 b.click('.page-switcher summary');b.click('[data-view="board"]');assert b.script("return document.querySelector('#surface').classList.contains('board')")
 b.click('.board-card>button');assert b.script("return document.querySelector('#inspect-dialog').open")
 b.click('#inspect-edit');assert b.script("return document.querySelector('#edit-dialog').open")
 b.click('[data-close="edit-dialog"]');b.click('.page-switcher summary');b.click('[data-view="continue"]')
 b.click('#focus-selected');assert b.script("return document.querySelector('.timer-readout time') && document.querySelector('.focus-indicator')")
 b.click('#timer-maximize');check('timer-maximized');b.click('#timer-maximize');b.click('#timer-minimize');check('timer-minimized');b.click('#pause');b.click('#end')
 b.viewport(390,844);load('board');b.click('.board-card>button');check('mobile-inspect');b.click('#inspect-work');check('mobile-work')
 b.command('Marionette:SetContext',{'value':'chrome'});b.script("Services.prefs.setIntPref('ui.prefersReducedMotion',1)");b.command('Marionette:SetContext',{'value':'content'});load('board')
 assert b.script("return getComputedStyle(document.querySelector('.board-card')).transitionDuration==='0s'")
 (out/'results.json').write_text(json.dumps({'cases':cases,'contrast_samples':len(colors),'minimum_contrast':min(c['ratio'] for c in colors),'interactions':'passed'},indent=2))
 print(f'PASS: {len(cases)} violet layout cases, {len(colors)} contrast samples, dialogs/filters/drafts/timer and reduced motion.')

audit.run=run
if __name__=='__main__':audit.main()
