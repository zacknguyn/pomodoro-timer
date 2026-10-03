#!/usr/bin/env python3
"""Native settings choices and both navigation layouts in isolated Firefox."""
import json,time
import check_scaling as audit
from check_themes import CONTRAST

def run(b,out):
 cases=[];samples=[]
 def load(scene='settings',nav='sidebar',mode='dark'):
  b.command('WebDriver:Navigate',{'url':f'http://127.0.0.1:4173/design/pages-preview.html?concept=violet&theme=electric&mode={mode}&nav={nav}&scene={scene}'})
  b.command('Marionette:SetContext',{'value':'chrome'});b.script('window.gBrowser.selectedBrowser.browsingContext.fullZoom=arguments[0]',b.zoom);b.command('Marionette:SetContext',{'value':'content'});time.sleep(.3)
 def check(label):
  g=b.script("return {scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth,dialog:[...document.querySelectorAll('dialog[open]')].map(e=>e.getBoundingClientRect().toJSON()),height:innerHeight,api:performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname.startsWith('/api/')).length,storage:localStorage.length+sessionStorage.length,overflow:[...document.querySelectorAll('.settings-section,.choice-options')].filter(e=>e.getBoundingClientRect().width && e.scrollWidth>e.clientWidth+1).map(e=>e.className)}")
  assert g['scroll']<=g['width']+1 and not g['overflow'],(label,g)
  assert not g['api'] and not g['storage'],(label,g)
  for d in g['dialog']:assert d['left']>=0 and d['right']<=g['width']+7 and d['bottom']<=g['height']+1,(label,g)
  colors=b.script(CONTRAST);assert all(c['ratio']>=4.5 for c in colors),(label,colors)
  samples.extend(colors);cases.append(label)
 def choose(name,value):b.click(f'input[name="{name}"][value="{value}"]')
 def save():b.click('#settings-form button[type=submit]')
 def settings():
  if b.script("return document.querySelector('#settings-dialog').open"):return
  b.click('#account');b.click('#menu-settings')
 for mode in ['light','dark']:
  for nav in ['navbar','sidebar']:
   for width in [320,390,768,1440]:
    b.viewport(width,1000)
    for scene in ['settings','workspace','board']:
     load(scene,nav,mode);check(f'{scene}:{mode}:{nav}:{width}')
     if width in [390,1440] and scene in ['settings','workspace']:b.screenshot(out/f'{scene}-{mode}-{nav}-{width}.png')
 for width in [640,1280]:
  b.viewport(width,1000,zoom=2);load();check(f'zoom200:settings:{width}');assert abs(b.script('return innerWidth')-width/2)<=1
 b.viewport(1440,1000);load()
 assert b.script("return document.querySelector('#settings-dialog select')===null && document.querySelectorAll('input[name=setting-brightness]').length===3")
 choose('setting-navigation','navbar');choose('setting-brightness','light');b.click('[data-close=settings-dialog]')
 assert b.script("return document.documentElement.dataset.navigation==='sidebar' && document.documentElement.dataset.mode==='dark'")
 settings();assert b.script("return document.querySelector('#settings-form').elements['setting-navigation'].value==='sidebar'")
 choose('setting-navigation','navbar');choose('setting-brightness','light');choose('setting-palette','sage');choose('setting-density','compact');choose('setting-motion','reduced');choose('focus-length','2700');save();check('save-navbar')
 assert b.script("return document.documentElement.dataset.navigation==='navbar' && document.documentElement.dataset.mode==='light' && document.documentElement.dataset.palette==='sage' && document.body.classList.contains('compact-density') && document.body.classList.contains('reduce-motion')")
 assert b.script("return document.querySelector('.topbar').getBoundingClientRect().width>1000 && document.querySelector('#workspace').getBoundingClientRect().left<100")
 assert b.script("return new URL(location.href).searchParams.get('nav')==='navbar'")
 b.command('WebDriver:Refresh');time.sleep(.3);assert b.script("return document.documentElement.dataset.navigation==='navbar'")
 settings();b.click('#reset-preferences');assert b.script("return document.querySelector('#settings-form').elements['setting-navigation'].value==='sidebar' && document.querySelector('#settings-form').elements['setting-brightness'].value==='system'");save();check('defaults-sidebar')
 assert b.script("return document.documentElement.dataset.navigation==='sidebar'")
 # Current focus keeps its original length and meter when next-session preferences change.
 load('running');b.click('#pause');before=b.page('seconds');meter=b.script("return document.querySelector('.focus-meter').getAttribute('aria-valuenow')")
 settings();choose('focus-length','900');choose('setting-navigation','navbar');save()
 assert b.page('seconds')==before and b.page('duration')==900 and b.page('sessionDuration')==1500
 assert b.script("return document.querySelector('.focus-meter').getAttribute('aria-valuenow')")==meter
 # Keyboard-native radio selection and dialog Escape leave the applied settings intact.
 settings();b.script("document.querySelector('input[name=setting-brightness][value=dark]').focus()")
 b.command('WebDriver:PerformActions',{'actions':[{'type':'key','id':'keyboard','actions':[{'type':'keyDown','value':'\ue014'},{'type':'keyUp','value':'\ue014'}]}]});b.command('WebDriver:ReleaseActions')
 assert b.script("return document.activeElement.value==='system' && document.activeElement.checked")
 b.command('WebDriver:PerformActions',{'actions':[{'type':'key','id':'keyboard','actions':[{'type':'keyDown','value':'\ue00c'},{'type':'keyUp','value':'\ue00c'}]}]});b.command('WebDriver:ReleaseActions')
 assert b.script("return !document.querySelector('#settings-dialog').open && document.documentElement.dataset.navigation==='navbar'")
 (out/'results.json').write_text(json.dumps({'cases':cases,'contrast_samples':len(samples),'minimum_contrast':min(c['ratio'] for c in samples),'interactions':'passed'},indent=2))
 print(f'PASS: {len(cases)} settings/navigation cases, {len(samples)} contrast samples; Save/Cancel/defaults/keyboard and active focus preserved.')

audit.run=run
if __name__=='__main__':audit.main()
