#!/usr/bin/env python3
"""Keyboard, solid-color contrast, motion and timer regression audit.

Uses an isolated Firefox profile; no user's saved workspace is modified.
This verifies browser semantics, not a full assistive-technology audit.
"""
import json
import os
import time
import check_scaling as audit


COLORS = """
const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
const ctx=canvas.getContext('2d',{willReadFrequently:true});
function rgb(color){ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data]}
function bg(e){if(!e)return [255,255,255];const a=rgb(getComputedStyle(e).backgroundColor),b=bg(e.parentElement);return a.slice(0,3).map((v,i)=>v*a[3]/255+b[i]*(1-a[3]/255))}
function lum(a){return a.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((v,n,i)=>v+n*[.2126,.7152,.0722][i],0)}
function ratio(a,b){a=lum(a);b=lum(b);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)}
"""


def run(browser, output):
    base = os.environ.get('POMOGIT_APP_URL', 'http://127.0.0.1:5180')
    cases = []

    def settle(): time.sleep(.35)
    def load(route):
        browser.command('WebDriver:Navigate', {'url': base + '/?a11y=' + str(time.time_ns()) + '#' + route})
        settle()
        for _ in range(50):
            if browser.script("return !!document.querySelector('.premium-app') && !document.querySelector('.wb-loading')"):
                settle()
                return
            time.sleep(.1)
        raise AssertionError('Workspace did not load')

    def click(selector):
        browser.script("document.querySelector(arguments[0]).scrollIntoView({block:'nearest'})", selector)
        browser.click(selector); settle()

    def key(value, shift=False):
        actions = ([{'type':'keyDown','value':'\ue008'}] if shift else [])
        actions += [{'type':'keyDown','value':value},{'type':'keyUp','value':value}]
        if shift: actions.append({'type':'keyUp','value':'\ue008'})
        browser.command('WebDriver:PerformActions', {'actions':[{'type':'key','id':'keyboard','actions':actions}]})
        settle()

    def check(label, script, *args):
        assert browser.script(script, *args), (label, browser.script('return document.activeElement.outerHTML.slice(0,250)'))
        cases.append(label)

    def prefs(**values):
        browser.script("const p=JSON.parse(localStorage.getItem('pomogit.work-protocol'));Object.assign(p,arguments[0]);localStorage.setItem('pomogit.work-protocol',JSON.stringify(p))", values)

    def settings():
        click('.wb-account-menu summary'); click('.wb-account-menu nav button:nth-child(2)')

    load('work')
    for width, navigation in [(1440,'sidebar'),(390,'navbar')]:
        browser.viewport(width,1000); prefs(navigation=navigation); load('work')
        browser.script("document.activeElement.blur()")
        key('\ue004')
        check('Skip link is first keyboard stop', "return document.activeElement.matches('.wb-skip')")
        key('\ue007')
        check('Skip link focuses main', "return document.activeElement.id==='wb-main'")
        click('.wb-page-menu summary'); key('\ue004'); key('\ue00c')
        check('Escape closes page menu and restores focus', "return !document.querySelector('.wb-page-menu').open && document.activeElement.matches('.wb-page-menu summary')")
        key('/')
        check('Search shortcut focuses the field', "return document.activeElement.matches('.wb-search input')")
        key('n')
        check('Typing does not trigger capture shortcut', "return document.activeElement.matches('.wb-search input') && document.activeElement.value==='n'")
        browser.script("document.activeElement.value='';document.activeElement.dispatchEvent(new Event('input',{bubbles:true}));document.activeElement.blur()")
        key('n')
        check('Capture shortcut focuses title', "return document.activeElement.matches('.wb-capture input')")
        browser.script('document.activeElement.blur()'); settle()
        settings()
        check('Native modal traps focus', "return document.querySelector('.wb-modal').matches(':modal') && !!document.activeElement.closest('.wb-modal')")
        browser.script("document.querySelector('.wb-modal footer .wb-primary').focus()")
        key('\ue004')
        # Firefox may visit its browser chrome at a native dialog boundary.
        # It must never focus a background page control.
        for _ in range(5):
            check('Tab excludes background controls', "return document.activeElement===document.body || !!document.activeElement.closest('.wb-modal')")
            key('\ue004')
        browser.script("document.querySelector('.wb-modal header button').focus()")
        for _ in range(5):
            key('\ue004', shift=True)
            check('Shift Tab excludes background controls', "return document.activeElement===document.body || !!document.activeElement.closest('.wb-modal')")
        browser.script("document.querySelector('input[name=brightness][value=light]').focus()")
        key('\ue015')
        check('Appearance choices support arrow keys', "return document.querySelector('input[name=brightness][value=dark]').checked")
        before = browser.script("const e=document.querySelector('.wb-modal');return [e.querySelector('header').getBoundingClientRect().top,e.querySelector('footer').getBoundingClientRect().bottom]")
        browser.script("document.querySelector('.wb-modal-body').scrollTop=10000")
        check('Dialog header and footer stay fixed while body scrolls', "const e=document.querySelector('.wb-modal');return Math.abs(e.querySelector('header').getBoundingClientRect().top-arguments[0][0])<1 && Math.abs(e.querySelector('footer').getBoundingClientRect().bottom-arguments[0][1])<1 && e.querySelector('.wb-modal-body').scrollTop>0", before)
        key('\ue00c')
        check('Settings returns focus to visible account opener', "return !document.querySelector('.wb-modal') && document.activeElement.matches('.wb-account-menu summary')")
        load('tasks'); click('.wb-card-title'); click('.wb-modal footer button:first-child'); key('\ue00c')
        check('Editor replacement restores the original card', "return !document.querySelector('.wb-modal') && document.activeElement.matches('.wb-card-title')")
        moved_id=browser.script("const e=document.querySelector('.wb-move-control select');e.focus();return e.closest('.wb-board-card').dataset.task")
        key('\ue015'); key('\ue007')
        check('Board status changes without dragging', "return document.querySelector('[data-task=\"'+arguments[0]+'\"]').closest('.wb-lane').dataset.drop==='ready'", moved_id)
        output.joinpath(f'keyboard-{width}.png').parent.mkdir(parents=True,exist_ok=True)
        browser.screenshot(output/f'keyboard-{width}.png')

    # Validate colors rendered by the browser, including OKLCH conversion.
    contrast = []
    browser.viewport(1440,1000)
    for palette in ['electric','sage']:
        for brightness in ['light','dark']:
            prefs(palette=palette,brightness=brightness); load('work')
            for route in ['work','tasks','review','profile']:
                load(route)
                failures = browser.script(COLORS + """
return [...document.querySelectorAll('.premium-app button,.premium-app summary,.wb-status,.wb-muted,.wb-meta,.wb-focus small,.wb-label')]
.filter(e=>e.getClientRects().length&&!e.disabled&&getComputedStyle(e).visibility!=='hidden'&&(e.textContent.trim()||e.querySelector('svg')))
.map(e=>({text:e.textContent.slice(0,60),class:e.className,color:getComputedStyle(e).color,background:getComputedStyle(e).backgroundColor,parent:getComputedStyle(e.parentElement).backgroundColor,ratio:ratio(rgb(getComputedStyle(e).color),bg(e))})).filter(e=>e.ratio<4.5)
""")
                assert not failures, (palette,brightness,route,failures)
                contrast.append({'palette':palette,'brightness':brightness,'route':route,'text':'passed'})
            settings()
            for selector in ['input[name=brightness]:checked','.wb-switch input']:
                browser.script('document.querySelector(arguments[0]).focus()',selector)
                key('\ue004',shift=True);key('\ue004')
                check('Settings focus remains visible',"const s=getComputedStyle(document.activeElement);return s.outlineStyle!=='none' && parseFloat(s.outlineWidth)>=2")
            key('\ue00c');load('work')
            for selector in ['.wb-capture input','.wb-focus button']:
                browser.script('document.querySelector(arguments[0]).focus()',selector)
                key('\ue004',shift=True);key('\ue004')
                measurement=browser.script(COLORS+"const e=document.activeElement;return {outline:ratio(rgb(getComputedStyle(e).outlineColor),bg(e.parentElement)),border:ratio(rgb(getComputedStyle(e).borderTopColor),bg(e.parentElement))}")
                assert measurement['outline']>=3, (palette,brightness,selector,measurement)
                if selector.endswith('input'): assert measurement['border']>=3,(palette,brightness,selector,measurement)
                contrast.append({'palette':palette,'brightness':brightness,'selector':selector,**measurement})

    prefs(motion='reduced');load('tasks')
    check('User reduced motion disables CSS animations', "return getComputedStyle(document.querySelector('.wb-content')).animationName==='none' && getComputedStyle(document.querySelector('.wb-board-card')).transitionDuration==='0s'")
    browser.command('Marionette:SetContext',{'value':'chrome'})
    browser.script("Services.prefs.setIntPref('ui.prefersReducedMotion',1)")
    browser.command('Marionette:SetContext',{'value':'content'})
    prefs(motion='system');load('tasks')
    check('System reduced motion disables CSS animations', "return matchMedia('(prefers-reduced-motion: reduce)').matches && getComputedStyle(document.querySelector('.wb-content')).animationName==='none'")
    avatar = browser.script("return document.querySelector('.wb-account-menu canvas').toDataURL()")
    browser.script("document.querySelector('.wb-account-menu summary').focus()")
    check('System reduced motion keeps Dither avatar static on replay', "return document.querySelector('.wb-account-menu canvas').toDataURL()===arguments[0]",avatar)

    for route in ['landing','login','register','recover']:
        load(route)
        check('Public pages remain readable with reduced motion', "return !!document.querySelector('.pg-public') && [...document.querySelectorAll('.pg-reveal')].every(e=>getComputedStyle(e).opacity==='1')")
        check('Public inputs have labels', "return [...document.querySelectorAll('.pg-account-form input')].every(e=>e.labels.length>0)")
        if route in ['login','register']:
            browser.script("document.querySelector('.pg-password button').focus()")
            key('\ue007')
            check('Password visibility supports keyboard activation', "return document.querySelector('input[name=password]').type==='text' && document.activeElement.getAttribute('aria-label')==='Hide password'")
    load('work');click('.wb-detail .wb-actions .wb-primary')
    check('Focus start announces task', "return [...document.querySelectorAll('[role=status]')].some(e=>e.textContent.startsWith('Focusing on '))")
    announcement=browser.script("return [...document.querySelectorAll('.wb-sr-only[role=status]')].at(-1).textContent")
    time.sleep(1.2)
    check('Countdown is silent and state announcement stays unchanged', "return document.querySelector('.wb-readout time').getAttribute('role')==='timer' && document.querySelector('.wb-readout time').getAttribute('aria-live')==='off' && [...document.querySelectorAll('.wb-sr-only[role=status]')].at(-1).textContent===arguments[0]",announcement)
    click('.wb-focus-actions button:first-child')
    check('Pause is announced', "return [...document.querySelectorAll('[role=status]')].some(e=>e.textContent==='Focus paused.')")
    click('.wb-focus-actions button:first-child')
    check('Resume is announced', "return [...document.querySelectorAll('[role=status]')].some(e=>e.textContent.startsWith('Focusing on '))")
    browser.script("const w=JSON.parse(localStorage.getItem('pomogit.mock.v1'));w.session.deadlineAt=new Date(Date.now()+1500).toISOString();localStorage.setItem('pomogit.mock.v1',JSON.stringify(w))")
    load('work');time.sleep(2.5)
    check('Expiration is announced once and task stays unfinished', "return [...document.querySelectorAll('[role=status]')].some(e=>e.textContent==='Focus time is up. Your task stays in progress.') && document.querySelector('.wb-detail .wb-status').dataset.status==='progress'")
    click('.wb-focus-actions button:last-child')
    check('Stop announces result', "return [...document.querySelectorAll('[role=status]')].some(e=>e.textContent.includes('Timer stopped.'))")
    browser.script("document.querySelector('.wb-detail footer button').focus()")
    key('\ue007');key('\ue00c')
    check('Completion restores main when its opener disappears', "return !document.querySelector('.wb-modal') && document.activeElement.id==='wb-main'")
    check('Audit remains UI-only', "return performance.getEntriesByType('resource').every(e=>!new URL(e.name).pathname.startsWith('/api/'))")
    (output/'results.json').write_text(json.dumps({'checks':cases,'contrast':contrast},indent=2))
    print(f'PASS: {len(cases)} keyboard, motion and timer checks; {len(contrast)} contrast cases. Evidence: {output}',flush=True)


audit.run=run
if __name__=='__main__': audit.main()
