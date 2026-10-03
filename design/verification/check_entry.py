#!/usr/bin/env python3
"""Rendered product/account proposal audit; serve repository root on port 4173."""
import json
import os
import time
import check_scaling as audit


def run(browser, output):
    cases = []
    base = os.environ.get('POMOGIT_ENTRY_URL', 'http://127.0.0.1:4173/design/entry-preview.html?theme=electric&mode=light')
    def load(route):
        browser.command('WebDriver:Navigate', {'url': base + '#' + route})
        browser.command('Marionette:SetContext', {'value':'chrome'})
        browser.script('window.gBrowser.selectedBrowser.browsingContext.fullZoom=arguments[0]', browser.zoom)
        browser.command('Marionette:SetContext', {'value':'content'})
        time.sleep(.3)
    def wait(route=None):
        for _ in range(40):
            if route and browser.script('return location.hash') == '#' + route: break
            if not route and not browser.script("return document.querySelector('#account-submit')?.disabled"): break
            time.sleep(.1)
        else: raise AssertionError('account action did not settle')
        time.sleep(.1)
    def check(label):
        g = browser.script("""
        const d=document.documentElement,m=document.querySelector('dialog[open]');
        return {width:innerWidth,height:innerHeight,scroll:d.scrollWidth,client:d.clientWidth,
        overflow:[...document.querySelectorAll('.auth-entry,.example-detail,.mini-profile,#demo-task')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.className||e.id),
        dialog:m?{left:m.getBoundingClientRect().left,right:m.getBoundingClientRect().right,bottom:m.getBoundingClientRect().bottom,top:m.getBoundingClientRect().top}:null,
        fonts:document.fonts.check('600 16px Bricolage')&&document.fonts.check('400 16px Barlow'),
        api:performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname.startsWith('/api/')).length,
        external:performance.getEntriesByType('resource').filter(e=>new URL(e.name).origin!==location.origin).length,
        storage:localStorage.length+sessionStorage.length};
        """)
        assert g['scroll'] <= g['client'] + 1, (label, 'horizontal overflow', g)
        assert not g['overflow'], (label, 'content overflow', g)
        assert g['fonts'], (label, 'fonts unavailable')
        assert g['api'] == 0 and g['external'] == 0 and g['storage'] == 0, (label, 'prototype touched API/storage', g)
        if g['dialog']:
            d=g['dialog']
            assert d['left'] >= 0 and d['right'] <= g['width']+1 and d['top'] >= 0 and d['bottom'] <= g['height']+1, (label,g)
        if browser.script("return !!document.querySelector('.auth-main')"):
            assert browser.script("return !document.querySelector('.auth-main img') && getComputedStyle(document.querySelector('.auth-main')).backgroundImage==='none' && getComputedStyle(document.querySelector('#screen')).backgroundImage==='none'"), (label,'account artwork/background returned')
            assert browser.script("const form=document.querySelector('.auth-entry').getBoundingClientRect(),tools=document.querySelector('.review-tools').getBoundingClientRect();return tools.top>=form.bottom"), (label,'review controls overlap account form')
        cases.append({'case':label,'width':g['width'],'height':g['height']})
    def login(mode='login'):
        load(mode)
        browser.script("document.querySelector('#account-email').value='';document.querySelector('#account-password').value=''")
        browser.type('#account-email', 'developer@example.com')
        browser.type('#account-password', 'example-password')
        browser.click('#account-submit')
        assert browser.script("return document.querySelector('#account-submit').disabled && document.querySelector('#account-form').getAttribute('aria-busy')==='true'"), 'no pending state'
        wait('app')
    def logout():
        browser.click('.account-menu summary'); browser.click('#log-out')
    for width,height in [(320,700),(390,844),(768,1000),(1024,900),(1440,1000)]:
        browser.viewport(width,height)
        for route in ['home','login','register','recover','signed-out','app']:
            load(route); check(f'{route}:{width}')
            if width in [320,1440]:
                browser.screenshot(output/f'{route}-{width}.png')
                if route == 'home':
                    for section in ['product-figure','how','board-showcase','work-story','faq','closing']:
                        browser.script("document.querySelector('.'+arguments[0]).scrollIntoView()",section)
                        time.sleep(.7)
                        browser.screenshot(output/f'home-{section}-{width}.png')
        if browser.script("return document.querySelector('#demo-focus').textContent.includes('Start focus')"): browser.click('#demo-focus')
        logout();check(f'logout-dialog:{width}')
        browser.screenshot(output/f'logout-dialog-{width}.png')
        browser.click('dialog footer button:first-child')
    for width in [640,1280]:
        browser.viewport(width,1000,zoom=2)
        for route in ['home','register','app']:
            load(route);check(f'zoom-200:{route}:{width}')
            assert abs(browser.script('return innerWidth')-width/2)<=1, 'zoom was not applied'
    browser.viewport(1440,1000)
    load('home')
    assert browser.script("return document.querySelector('.board-showcase [data-reveal]').classList.contains('reveal-wait')"), 'scroll reveal was never armed'
    browser.script("document.querySelector('.board-showcase').scrollIntoView()")
    time.sleep(.8)
    assert browser.script("return document.querySelector('.board-showcase [data-reveal]').classList.contains('reveal-in')"), 'scroll does not reveal the board'
    assert browser.script("return [...document.querySelectorAll('.product-shot,.hero-background img')].every(img=>img.complete && img.naturalWidth>0)"), 'homepage artwork/screenshots failed to load'
    load('home');browser.click('.public-header nav a:first-child')
    assert browser.script("return location.hash==='#how-it-works' && !!document.querySelector('.steps')")
    browser.click('.faq details:first-child summary')
    assert browser.script("return document.querySelector('.faq details:first-child').open")
    browser.click('.public-header nav a:last-child')
    assert browser.script("return location.hash==='#your-work' && !!document.querySelector('.mini-profile')")
    load('login');browser.click('#account-submit')
    assert browser.script("return document.querySelector('#email-error').textContent==='Enter your email.' && document.activeElement.id==='account-email'")
    browser.type('#account-email','invalid');browser.click('#account-submit')
    assert browser.script("return document.querySelector('#email-error').textContent.includes('valid email')")
    browser.click('#account-switch a')
    browser.type('#account-email','developer@example.com');browser.type('#account-password','short')
    browser.click('#account-submit')
    assert browser.script("return document.querySelector('#password-error').textContent.includes('12 characters') && document.activeElement.id==='account-password'")
    browser.click('#show-password')
    assert browser.script("return document.querySelector('#account-password').type==='text' && document.querySelector('#show-password').getAttribute('aria-pressed')==='true'")
    login('register')
    assert browser.script("return document.querySelector('#demo-task').hidden && document.querySelector('#demo-heading').textContent==='What are you working on?'")
    browser.type('#demo-title','A new task');browser.click('#demo-capture button')
    assert browser.script("return document.querySelector('#demo-task-title').textContent==='A new task' && document.querySelector('#demo-status').textContent==='Inbox' && document.querySelector('#demo-project').textContent==='No project' && document.querySelector('#demo-next-step').textContent.includes('No next step')")
    browser.type('#demo-note','Remember the next branch')
    logout();wait('signed-out')
    login()
    assert browser.script("return document.querySelector('#demo-note').value==='Remember the next branch'")
    browser.click('#demo-focus');logout()
    assert browser.script("return document.querySelector('#logout-dialog').open")
    browser.command('WebDriver:PerformActions', {'actions':[{'type':'key','id':'keyboard','actions':[{'type':'keyDown','value':'\ue00c'},{'type':'keyUp','value':'\ue00c'}]}]})
    time.sleep(.1)
    assert browser.script("return !document.querySelector('#logout-dialog').open && document.activeElement.matches('.account-menu summary') && document.querySelector('#demo-focus').textContent.includes('Stop focus')"), 'Escape fails to preserve focus session/return keyboard focus'
    logout();browser.click('#confirm-logout');wait('signed-out')
    login()
    assert browser.script("return document.querySelector('#demo-focus').textContent.includes('Start focus') && document.querySelector('#demo-status').textContent==='In progress' && document.querySelector('#demo-note').value==='Remember the next branch'"), 'logout lost context or completed/reset task'
    # Error fixtures expose meaningful retry paths.
    for scenario,route in [('expired','login'),('login-error','login'),('register-error','register'),('github-error','login')]:
        load('home');browser.click('.review-tools summary');browser.click(f'[data-review="{scenario}"]')
        assert browser.script('return location.hash')=='#'+route
        if scenario=='expired':
            assert browser.script("return document.querySelector('#auth-banner').textContent.includes('session ended')")
        elif scenario=='github-error':
            browser.click('#github-continue');wait()
            assert browser.script("return !document.querySelector('#account-error').hidden && !document.querySelector('#github-continue').disabled")
            browser.click('#github-continue');wait('app')
        else:
            browser.type('#account-email','developer@example.com');browser.type('#account-password','example-password')
            browser.click('#account-submit');wait()
            assert browser.script("return !document.querySelector('#account-error').hidden")
            browser.click('#account-submit');wait('app')
    load('recover');browser.type('#account-email','developer@example.com');browser.click('#account-submit');wait()
    assert browser.script("return document.querySelector('#auth-banner').textContent.includes('If an account uses this email') && document.querySelector('#account-submit').textContent.includes('Send again') && document.querySelector('#password-section').hidden")
    load('home');browser.click('.review-tools summary');browser.click('[data-review="logout-error"]')
    logout();browser.click('#confirm-logout')
    assert browser.script("return document.querySelector('#logout-dialog').open && !document.querySelector('#logout-error').hidden && location.hash==='#app' && document.querySelector('#demo-focus').textContent.includes('Stop focus')"), 'failed logout incorrectly ended session'
    browser.click('#confirm-logout');wait('signed-out');check('logout-error:retry')
    # Successful GitHub registration is distinct from returning login.
    load('register');browser.click('#github-continue');wait('app')
    assert browser.script("return document.querySelector('#demo-task').hidden"), 'GitHub register is not first-use'
    # Native reduced-motion preference disables decorative motion.
    browser.command('Marionette:SetContext', {'value':'chrome'})
    browser.script("Services.prefs.setIntPref('ui.prefersReducedMotion',1)")
    browser.command('Marionette:SetContext', {'value':'content'})
    load('home')
    assert browser.script("return matchMedia('(prefers-reduced-motion: reduce)').matches && getComputedStyle(document.querySelector('#screen')).animationName==='none'")
    (output/'results.json').write_text(json.dumps({'geometry':cases,'interactions':'passed','api_requests':0,'storage_writes':0},indent=2))
    print(f'PASS: {len(cases)} account/product geometry cases; entry, validation, recovery, logout, retry and reduced-motion checks passed.')
    print(f'Evidence: {output}')


audit.run=run
if __name__=='__main__': audit.main()
