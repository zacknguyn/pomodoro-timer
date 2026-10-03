#!/usr/bin/env python3
"""Browser verification of the approved React appearance integration."""
import json
import time
import check_scaling as audit

def run(browser, output):
    cases=[]
    def settle(): time.sleep(.3)
    def load(route):
        browser.command('WebDriver:Navigate',{'url':'http://127.0.0.1:5175/?audit='+str(time.time_ns())+'#'+route});settle()
        for _ in range(50):
            if browser.script("return !!document.querySelector('.premium-app') && !document.querySelector('.wb-loading')"):break
            time.sleep(.1)
    def check(label):
        settle()
        result=browser.script("return {width:innerWidth,scroll:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('.wb-detail,.wb-lane,.wb-modal-body,.pg-account-entry')].filter(e=>e.getClientRects().length&&e.scrollWidth>e.clientWidth+1).map(e=>e.className),api:performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname.startsWith('/api/')).map(e=>e.name)}")
        assert result['scroll']<=result['width']+1,(label,result)
        assert not result['overflow'],(label,result)
        assert not result['api'],(label,result)
        cases.append(label)
    load('work')
    for nav in ['sidebar','navbar']:
        for palette in ['electric','sage']:
            for mode in ['dark','light']:
                browser.script("localStorage.setItem('pomogit.work-protocol',JSON.stringify({focusMinutes:25,navigation:arguments[0],palette:arguments[1],brightness:arguments[2]}))",nav,palette,mode)
                for width in [320,390,768,1024,1440]:
                    browser.viewport(width,900)
                    for route in ['work','tasks','review','profile','login','register','recover','landing']:
                        load(route);check(f'{nav}:{palette}:{mode}:{width}:{route}')
                    if palette=='electric' and mode=='dark' and width in [390,1440]:
                        for route in ['work','tasks','login','landing']:
                            load(route);browser.screenshot(output/f'{nav}-{route}-{width}.png')
    browser.viewport(1440,1000);load('work')
    browser.click('.wb-account-menu summary');browser.click('.wb-account-menu nav button:nth-of-type(2)');check('settings')
    assert browser.script("return !document.querySelector('#wb-settings-form select')")
    browser.script("document.querySelector('[name=navigation][value=navbar]').click();document.querySelector('[name=brightness][value=dark]').click()")
    browser.click('.wb-modal header button');settle()
    assert browser.script("return document.querySelector('.premium-app').dataset.navigation==='navbar'") # stored from last geometry case; Cancel must leave it
    browser.click('.wb-account-menu summary');browser.click('.wb-account-menu nav button:nth-of-type(2)')
    browser.click('button[form=wb-settings-form][type=reset]')
    assert browser.script("return document.querySelector('[name=navigation][value=sidebar]').checked && document.querySelector('[name=brightness][value=system]').checked")
    browser.click('button[form=wb-settings-form][type=submit]');settle()
    assert browser.script("return document.querySelector('.premium-app').dataset.navigation==='sidebar'")
    browser.click('.wb-detail header button');check('task-editor');browser.script("document.querySelector('.wb-modal-body').scrollTop=10000")
    assert browser.script("const d=document.querySelector('.wb-modal');return d.querySelector('header').getBoundingClientRect().top>=0 && d.querySelector('footer').getBoundingClientRect().bottom<=innerHeight")
    browser.click('.wb-modal header button')
    load('login');browser.type('input[name=email]','dev@example.com');browser.type('input[name=password]','demo');browser.click('.pg-password button')
    assert browser.script("return document.querySelector('input[name=password]').type==='text'")
    browser.click('.pg-account-form button[type=submit]');settle();assert browser.script("return location.hash==='#work'")
    load('register');assert browser.script("return document.querySelector('input[name=password]').minLength===12")
    load('recover');browser.type('input[name=email]','dev@example.com');browser.click('.pg-account-form button[type=submit]');assert browser.script("return !!document.querySelector('[role=status]')")
    (output/'results.json').write_text(json.dumps({'geometry_cases':cases,'interactions':'passed'},indent=2))
    print(f'PASS: {len(cases)} geometry cases and settings/account/editor interactions. Evidence: {output}',flush=True)

audit.run=run
if __name__=='__main__':audit.main()
