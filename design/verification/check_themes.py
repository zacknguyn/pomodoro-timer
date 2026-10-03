#!/usr/bin/env python3
"""Theme contrast, responsive geometry and interaction audit for HTML proposals."""
import json
import os
import time
import check_scaling as audit

CONTRAST = r'''
const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
const ctx=canvas.getContext('2d',{willReadFrequently:true});
function rgba(color){ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data]}
function background(el){if(!el)return [255,255,255];const c=rgba(getComputedStyle(el).backgroundColor),p=background(el.parentElement),a=c[3]/255;return c.slice(0,3).map((v,i)=>v*a+p[i]*(1-a))}
function luminance(c){return c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0)}
const selectors=['.hero-intro','.eyebrow','.muted','.small','.primary','#account-email','#account-password','.task-row strong','.task-row>span','.task-status','.timer-readout time','.timer-unit','.timer-context p','.filter-select>span','.filter-result','.card-next','.folio-bio','.settings-row strong','.settings-row small'];
const results=[];
for(const selector of selectors){for(const el of [...document.querySelectorAll(selector)].slice(0,6)){if(!el.getClientRects().length||el.closest('[hidden]'))continue;const fg=luminance(rgba(getComputedStyle(el).color).slice(0,3)),bg=luminance(background(el));results.push({selector,ratio:(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)})}}
return results;
'''


def run(browser, output):
    base=os.environ.get('POMOGIT_DESIGN_URL','http://127.0.0.1:4173/design/')
    cases=[]; contrasts=[]
    def load(file, scene, palette='electric', mode='light'):
        tail=('#'+scene) if file=='entry-preview.html' else ''
        query=f'?theme={palette}&mode={mode}' + (f'&scene={scene}' if not tail else '')
        browser.command('WebDriver:Navigate',{'url':base+file+query+tail})
        browser.command('Marionette:SetContext',{'value':'chrome'})
        browser.script('window.gBrowser.selectedBrowser.browsingContext.fullZoom=arguments[0]',browser.zoom)
        browser.command('Marionette:SetContext',{'value':'content'})
        time.sleep(.25)
        browser.script("document.querySelectorAll('*').forEach(e=>e.getAnimations().forEach(a=>a.finish()))")
    def check(label,palette,mode):
        g=browser.script("""const r=document.documentElement,d=document.querySelector('dialog[open]');return {width:innerWidth,height:innerHeight,scroll:r.scrollWidth,client:r.clientWidth,palette:r.dataset.palette,mode:r.dataset.mode,dialog:d?{left:d.getBoundingClientRect().left,right:d.getBoundingClientRect().right,bottom:d.getBoundingClientRect().bottom}:null,api:performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname.startsWith('/api/')).length,storage:localStorage.length+sessionStorage.length};""")
        assert g['palette']==palette and g['mode']==mode,(label,'wrong appearance',g)
        assert g['scroll']<=g['client']+1,(label,'page overflow',g)
        assert g['api']==0 and g['storage']==0,(label,'backend/storage access',g)
        if g['dialog']:
            d=g['dialog'];assert d['left']>=0 and d['right']<=g['width']+1 and d['bottom']<=g['height']+1,(label,'modal bounds',g)
        colors=browser.script(CONTRAST)
        failures=[v for v in colors if v['ratio']<4.5]
        assert not failures,(label,'critical text contrast below 4.5:1',failures)
        contrasts.extend(colors);cases.append({'case':label,'width':g['width'],'height':g['height']})
    for palette in ['electric','sage']:
        for mode in ['light','dark']:
            for width,height in [(320,700),(768,1000),(1440,1000)]:
                browser.viewport(width,height)
                for scene in ['home','login','register','signed-out']:
                    load('entry-preview.html',scene,palette,mode);check(f'{scene}:{palette}:{mode}:{width}',palette,mode)
                    if scene=='home':
                        browser.script("document.querySelector('.board-showcase').scrollIntoView()")
                        time.sleep(.8)
                        assert browser.script("return [...document.querySelectorAll('[data-photo]')].every(e=>e.complete && e.naturalWidth>0 && e.src.includes(arguments[0]))",'' if palette=='sage' and mode=='light' else f'{palette}-{mode}'), 'theme pictures unavailable'
                    if width in [320,1440] and palette=='electric':
                        if scene=='home':browser.script('scrollTo(0,0)')
                        browser.screenshot(output/f'{scene}-{mode}-{width}.png')
                for scene in ['workspace','board','profile','edit','settings']:
                    load('pages-preview.html',scene,palette,mode);check(f'{scene}:{palette}:{mode}:{width}',palette,mode)
                    if width in [320,1440] and palette=='electric':browser.screenshot(output/f'{scene}-{mode}-{width}.png')
    for width in [640,1280]:
        browser.viewport(width,1000,zoom=2)
        for scene in ['workspace','board','settings']:
            load('pages-preview.html',scene,'electric','dark');check(f'zoom200:{scene}:{width}','electric','dark')
            assert abs(browser.script('return innerWidth')-width/2)<=1
    browser.viewport(1440,1000)
    load('pages-preview.html','workspace')
    browser.type('#note','Keep my draft while switching appearance')
    browser.click('.theme-picker summary')
    browser.script("const s=document.querySelector('.theme-picker select[aria-label=Brightness]');s.value='dark';s.dispatchEvent(new Event('change',{bubbles:true}))")
    assert browser.script("return document.querySelector('#note').value==='Keep my draft while switching appearance' && document.documentElement.dataset.mode==='dark'"), 'appearance rebuilds task state'
    browser.command('WebDriver:PerformActions',{'actions':[{'type':'key','id':'keyboard','actions':[{'type':'keyDown','value':'\ue00c'},{'type':'keyUp','value':'\ue00c'}]}]})
    assert browser.script("return !document.querySelector('.theme-picker').open && document.activeElement.matches('.theme-picker summary')"), 'appearance Escape/focus return failed'
    # Settings edits apply on Save; Cancel preserves the existing mode.
    browser.click('#account');browser.click('#menu-settings')
    browser.script("document.querySelector('#settings-form').elements['setting-brightness'].value='light'")
    browser.click('.settings-footer [data-close=settings-dialog]')
    assert browser.script("return document.documentElement.dataset.mode==='dark'"), 'Cancel applies appearance'
    browser.click('#account');browser.click('#menu-settings')
    browser.script("document.querySelector('#settings-form').elements['setting-palette'].value='sage';document.querySelector('#settings-form').elements['setting-brightness'].value='light'")
    browser.click('#settings-form button[type=submit]')
    check('settings:save','sage','light')
    assert browser.script("return new URL(location.href).searchParams.get('theme')==='sage' && document.querySelector('#note').value==='Keep my draft while switching appearance'")
    browser.click('.theme-picker summary');browser.click('.theme-options a:first-of-type')
    time.sleep(.3)
    assert browser.script("return location.pathname.endsWith('entry-preview.html') && document.documentElement.dataset.palette==='sage' && document.documentElement.dataset.mode==='light'"), 'cross-preview appearance was lost'
    # Device setting follows real browser preference changes; explicit mode wins.
    load('entry-preview.html','home','electric','system')
    def device(value):
        browser.command('Marionette:SetContext',{'value':'chrome'})
        browser.script("Services.prefs.setIntPref('ui.systemUsesDarkTheme',arguments[0])",value)
        browser.command('Marionette:SetContext',{'value':'content'});time.sleep(.3)
    device(1);check('system:dark','electric','dark')
    device(0);check('system:light','electric','light')
    browser.script("const s=document.querySelector('.theme-picker select[aria-label=Brightness]');s.value='dark';s.dispatchEvent(new Event('change',{bubbles:true}))")
    device(0);check('explicit:dark','electric','dark')
    browser.command('Marionette:SetContext',{'value':'chrome'})
    browser.script("Services.prefs.setIntPref('ui.prefersReducedMotion',1)")
    browser.command('Marionette:SetContext',{'value':'content'})
    load('entry-preview.html','home','electric','dark')
    assert browser.script("return [...document.querySelectorAll('[data-reveal]')].every(e=>getComputedStyle(e).opacity==='1' && getComputedStyle(e).transform==='none')"), 'reduced motion hides content'
    (output/'results.json').write_text(json.dumps({'geometry':cases,'text_contrast_min':min(c['ratio'] for c in contrasts),'contrast_samples':len(contrasts),'interactions':'passed'},indent=2))
    print(f'PASS: {len(cases)} theme geometry cases, {len(contrasts)} critical text contrast samples, theme/Settings/system/keyboard/draft checks.')
    print(f'Minimum sampled text contrast: {min(c["ratio"] for c in contrasts):.2f}:1. Evidence: {output}')


audit.run=run
if __name__=='__main__':audit.main()
