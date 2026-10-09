#!/usr/bin/env python3
"""Connected account/timer smoke test in an isolated Firefox profile.

Serve the production build on 5181 against a disposable initialized database.
Optional POMOGIT_APP_URL overrides the URL. No real browser profile is used.
"""
import json
import os
import time
import uuid
import check_scaling as audit


def run(browser, output):
    base = os.environ.get('POMOGIT_APP_URL', 'http://127.0.0.1:5181')
    results = []

    def wait(script):
        for _ in range(100):
            if browser.script('return ' + script):
                return
            time.sleep(.1)
        browser.screenshot(output / 'failure.png')
        raise AssertionError('Timed out: ' + script)

    def load(route):
        browser.command('WebDriver:Navigate', {'url': f'{base}/?firefox={time.time_ns()}#{route}'})
        time.sleep(.35)
        wait("!document.querySelector('.auth-loading')")

    def workspace():
        wait("!!document.querySelector('.wb-capture button') && !document.querySelector('.wb-capture button').disabled")

    def click(selector):
        browser.script("document.querySelector(arguments[0]).scrollIntoView({block:'center'})", selector)
        browser.click(selector)
        time.sleep(.25)

    def field(selector, value):
        browser.script("const e=document.querySelector(arguments[0]);e.value=arguments[1];e.dispatchEvent(new Event('input',{bubbles:true}))", selector, value)

    def check(name, script):
        assert browser.script('return ' + script), name
        results.append({'width': width, 'name': name})

    def dismiss():
        if browser.script("return !!document.querySelector('[aria-label=\"Dismiss notification\"]')"):
            click('[aria-label="Dismiss notification"]')

    for width in [1440, 390]:
        browser.viewport(width, 1000)
        email, password = f'{uuid.uuid4()}@firefox-ui-test.invalid', str(uuid.uuid4())
        load('register')
        wait("!!document.querySelector('[name=email]')")
        field('[name=email]', email); field('[name=password]', password)
        click('.pg-account-form button[type=submit]'); workspace()
        check('Firefox registers an account and starts empty', "!!document.querySelector('.wb-work-empty')")
        check('Login cookie is hidden from page scripts', "!document.cookie.includes('pomogit_session')")
        browser.type('.wb-capture input', f'Firefox connected task {width}')
        click('.wb-capture button'); wait("!!document.querySelector('.wb-detail')"); dismiss()
        click('.wb-detail .wb-actions .wb-primary')
        wait("document.querySelector('.wb-focus')?.dataset.running==='true'")
        load('work'); workspace()
        check('Active timer and In progress survive reload', "document.querySelector('.wb-focus').dataset.running==='true' && document.querySelector('.wb-detail .wb-status').dataset.status==='progress'")
        click('.wb-focus-actions button:first-child')
        wait("document.querySelector('.wb-focus header small')?.textContent==='Paused'")
        click('.wb-account-menu summary'); click('.wb-account-menu nav button:last-of-type')
        wait("!!document.querySelector('.wb-modal')")
        click('.wb-modal footer .wb-primary'); wait("!!document.querySelector('.pg-account-form')")
        check('Logout removes the mounted private workspace', "!document.querySelector('.premium-app')")
        field('[name=email]', email); field('[name=password]', password)
        click('.pg-account-form button[type=submit]'); workspace()
        check('Firefox restores the task and paused session after login', "document.querySelector('.wb-detail h2').textContent.includes('Firefox connected') && document.querySelector('.wb-focus header small').textContent==='Paused'")
        click('.wb-focus-actions button:first-child'); click('.wb-detail footer button')
        wait("document.querySelector('.wb-modal h2')?.textContent==='Task completed'")
        click('.wb-modal footer button:nth-child(2)'); field('#wb-closing-note textarea', 'Firefox closing context')
        click('button[form=wb-closing-note]'); wait("!document.querySelector('.wb-modal')"); dismiss()
        load('review'); wait("!!document.querySelector('.wb-activity')")
        check('Firefox completion note persists in Activity', "document.querySelector('.wb-activity').textContent.includes('Firefox closing context')")
        check('Connected Firefox uses API and never seeds mock data', "performance.getEntriesByType('resource').some(e=>new URL(e.name).pathname.startsWith('/api/')) && !localStorage.getItem('pomogit.mock.v1')")
        check('Firefox viewport fits', 'document.documentElement.scrollWidth<=innerWidth+1')
        browser.screenshot(output / f'activity-{width}.png')
        click('.wb-account-menu summary'); click('.wb-account-menu nav button:last-of-type')
        wait("!!document.querySelector('.pg-account-form')")
    (output / 'results.json').write_text(json.dumps(results, indent=2))
    print(f'PASS: {len(results)} connected Firefox checks. Evidence: {output}', flush=True)


audit.run = run
if __name__ == '__main__':
    audit.main()
