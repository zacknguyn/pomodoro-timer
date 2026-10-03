#!/usr/bin/env python3
"""Capture actual React workspace/board imagery, and verify final navigation fixes."""
import time
import check_scaling as audit

def run(browser, output):
    def load(route):
        browser.command('WebDriver:Navigate',{'url':'http://127.0.0.1:5175/?capture='+str(time.time_ns())+'#'+route})
        time.sleep(.3)
        for _ in range(50):
            if browser.script("return !!document.querySelector('.premium-app') && !document.querySelector('.wb-loading')"):break
            time.sleep(.1)
        browser.script("document.querySelectorAll('*').forEach(el=>el.getAnimations().forEach(a=>a.finish()))")
    load('work')
    for palette in ['electric','sage']:
        for brightness in ['dark','light']:
            browser.script("localStorage.setItem('pomogit.work-protocol',JSON.stringify({focusMinutes:25,navigation:'sidebar',palette:arguments[0],brightness:arguments[1]}))",palette,brightness)
            for width,height,label in [(1440,1000,'desktop'),(390,1100,'mobile')]:
                browser.viewport(width,height)
                for route,name in [('work','workspace'),('tasks','board')]:
                    load(route)
                    assert browser.script("return document.documentElement.dataset.palette===arguments[0] && document.documentElement.dataset.theme===arguments[1]",palette,brightness)
                    browser.screenshot(output/f'{name}-violet-{palette}-{brightness}-{label}.png')
    browser.viewport(768,1000);load('work');browser.screenshot(output/'workspace-tablet.png')
    assert browser.script("return document.querySelector('.wb-detail').getBoundingClientRect().width>350"), 'tablet task panel too narrow'
    browser.viewport(1440,1000);load('work')
    browser.click('.wb-detail .wb-actions .wb-ghost')
    browser.type('.wb-note-form textarea','Keep this draft while looking around.')
    browser.click('.wb-task-list .wb-task-row:nth-of-type(2)');browser.click('.wb-task-list .wb-task-row:first-of-type')
    assert browser.script("return document.querySelector('.wb-note-form textarea').value==='Keep this draft while looking around.' && document.querySelector('.wb-note-disclosure').open")
    browser.click('.wb-detail .wb-actions .wb-primary');time.sleep(.3)
    assert browser.script("return document.querySelector('.wb-focus-meter') !== null && document.querySelector('.wb-detail .wb-status').dataset.status==='progress'")
    browser.click('.wb-focus-actions button:first-child');time.sleep(.3)
    assert browser.script("return document.querySelector('.wb-focus header small').textContent==='Paused'")
    browser.click('.wb-focus-actions button:last-child');time.sleep(.3)
    assert browser.script("return !document.querySelector('.wb-focus-meter') && document.querySelector('.wb-detail .wb-status').dataset.status==='progress'")
    browser.click('.wb-account-menu summary');browser.click('.wb-account-menu nav button:nth-of-type(3)');time.sleep(.3)
    browser.click('.pg-header nav>a');time.sleep(.4)
    assert browser.script("return location.hash==='#landing' && document.querySelector('#how-it-works').getBoundingClientRect().top<80")
    assert browser.script("return document.querySelector('.pg-header').getBoundingClientRect().width>1000")
    assert browser.script("return performance.getEntriesByType('resource').every(e=>!new URL(e.name).pathname.startsWith('/api/'))")
    print(f'PASS: 16 actual React screenshot assets, tablet readability, note draft, focus transitions, and homepage anchor. Evidence: {output}',flush=True)

audit.run=run
if __name__=='__main__':audit.main()
