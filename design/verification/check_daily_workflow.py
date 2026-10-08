#!/usr/bin/env python3
"""Exercise Phase 1's daily workflow in an isolated Firefox profile."""
import json
import os
import time
import check_scaling as audit


def run(browser, output):
    base = os.environ.get('POMOGIT_APP_URL', 'http://127.0.0.1:5180')
    cases = []
    def settle(): time.sleep(.35)
    def load(route):
        browser.command('WebDriver:Navigate', {'url': base + '/?workflow=' + str(time.time_ns()) + '#' + route})
        settle()
        for _ in range(50):
            if browser.script("return !!document.querySelector('.premium-app') && !document.querySelector('.wb-loading')"): return
            time.sleep(.1)
        raise AssertionError('Workspace did not load')
    def dismiss():
        if browser.script("return !!document.querySelector('[aria-label=\"Dismiss notification\"]')"):
            browser.click('[aria-label="Dismiss notification"]')
    def click(selector):
        browser.script("document.querySelector(arguments[0]).scrollIntoView({block:'center'})", selector)
        browser.click(selector); settle()
    def field(selector, value):
        browser.script("const e=document.querySelector(arguments[0]);e.value=arguments[1];e.dispatchEvent(new Event('input',{bubbles:true}))", selector, value)
    def page(route):
        dismiss(); click('.wb-page-menu summary'); click(f'.wb-page-menu button:nth-of-type({dict(work=1,tasks=2,review=3)[route]})')
    load('work')
    for width in [1440,390]:
        browser.viewport(width,1000)
        # Only this temporary browser profile is reset; no user's local data is touched.
        browser.script("localStorage.setItem('pomogit.mock.v1',JSON.stringify({tasks:[],checkpoints:[],sessions:[],session:null,seq:100}))")
        load('work')
        assert browser.script("return document.querySelector('.wb-heading h1').textContent==='What are you working on?' && document.querySelector('.wb-focus').hidden")
        browser.screenshot(output/f'empty-{width}.png')
        page('tasks')
        browser.type('.wb-capture input','Verify callback recovery')
        click('.wb-capture button'); dismiss()
        capture_destination=browser.script('return location.hash')
        assert capture_destination=='#work'
        click('.wb-detail header button')
        field('[name=project]','checkout-api');field('[name=nextStep]','Add the regression test.')
        field('[name=status]','ready')
        click('button[form=wb-edit-task][type=submit]'); dismiss()
        page('tasks');click('.wb-card-title')
        assert browser.script("return document.querySelector('.wb-modal').getAttribute('aria-label')==='Verify callback recovery' && !document.querySelector('#wb-edit-task')")
        browser.screenshot(output/f'inspection-{width}.png')
        click('.wb-modal footer .wb-primary')
        click('.wb-detail .wb-actions .wb-primary')
        assert browser.script("return document.querySelector('.wb-detail .wb-status').dataset.status==='progress'")
        click('.wb-focus-actions button:first-child')
        assert browser.script("return document.querySelector('.wb-focus header small').textContent==='Paused'")
        click('.wb-focus-actions button:first-child')
        click('.wb-detail footer button')
        assert browser.script("return document.querySelector('.wb-error').textContent.includes('Stop the timer')")
        finish_requires_stop=True
        click('.wb-focus-actions button:last-child');dismiss()
        click('.wb-detail .wb-actions .wb-ghost')
        browser.type('.wb-note-form textarea','Covered the expired callback; test the retry next.')
        click('.wb-note-form button[type=submit]');dismiss()
        click('.wb-detail footer button')
        assert browser.script("return document.querySelector('.wb-modal').getAttribute('aria-label')==='Task completed'")
        click('.wb-modal footer button:nth-of-type(2)')
        optional_note_editor=browser.script("return document.querySelector('.wb-modal').getAttribute('aria-label')")
        assert optional_note_editor=='Edit task'
        click('.wb-modal header button')
        load('tasks')
        assert browser.script("const c=document.querySelector('.wb-lane[data-drop=done] .wb-board-card');return !!c && c.textContent.includes('Verify callback recovery')")
        click('.wb-card-title')
        assert browser.script("return document.querySelector('.wb-modal-body').textContent.includes('Covered the expired callback')")
        click('.wb-modal header button');page('review')
        assert browser.script("return document.querySelector('.wb-activity').textContent.includes('Covered the expired callback')")
        assert browser.script("return performance.getEntriesByType('resource').every(e=>!new URL(e.name).pathname.startsWith('/api/'))")
        browser.screenshot(output/f'activity-{width}.png')
        cases.append({'width':width,'empty_capture_organize_inspect_focus_note_finish_reload_activity':'passed','capture_destination':capture_destination,'finish_requires_stop':finish_requires_stop,'optional_note_dialog':optional_note_editor})
    # Returning to an unfocused selected task currently falls back to the first row.
    browser.script("localStorage.removeItem('pomogit.mock.v1')")
    browser.viewport(1440,1000);load('work')
    click('.wb-task-row:nth-of-type(2)')
    before=browser.script("return document.querySelector('.wb-detail h2').textContent")
    load('work')
    after=browser.script("return document.querySelector('.wb-detail h2').textContent")
    assert before!=after
    (output/'results.json').write_text(json.dumps({'cases':cases,'return_context':{'selected_before_reload':before,'shown_after_reload':after}},indent=2))
    print(f'PASS: desktop/mobile complete workflow; recorded four UX gaps. Evidence: {output}',flush=True)


audit.run=run
if __name__=='__main__': audit.main()
