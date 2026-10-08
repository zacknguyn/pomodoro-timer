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
        click('.wb-capture button')
        capture_destination=browser.script('return location.hash')
        assert capture_destination=='#tasks'
        assert browser.script("return document.activeElement.matches('.wb-card-title') && document.querySelector('.wb-lane[data-drop=inbox] .wb-board-card') !== null"), browser.script("return {active:document.activeElement.tagName+':'+document.activeElement.className,cards:[...document.querySelectorAll('.wb-board-card')].map(e=>({id:e.dataset.task,lane:e.closest('.wb-lane').dataset.drop})),text:document.body.innerText}")
        dismiss()
        click('.wb-card-title');click('.wb-modal footer button:first-child')
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
        click('.wb-detail .wb-actions .wb-ghost')
        browser.type('.wb-note-form textarea','Covered the expired callback; test the retry next.')
        click('.wb-note-form button[type=submit]');dismiss()
        click('.wb-detail footer button')
        assert browser.script("return document.querySelector('.wb-modal').getAttribute('aria-label')==='Task completed' && !document.querySelector('.wb-focus-meter') && !document.querySelector('.wb-error')")
        click('.wb-modal footer button:nth-of-type(2)')
        optional_note_editor=browser.script("return document.querySelector('.wb-modal').getAttribute('aria-label')")
        assert optional_note_editor=='Add a closing note'
        assert browser.script("return !document.querySelector('#wb-edit-task') && document.querySelectorAll('#wb-closing-note textarea').length===1")
        browser.type('#wb-closing-note textarea','Shipped the retry regression test.')
        browser.screenshot(output/f'closing-note-{width}.png')
        click('button[form=wb-closing-note][type=submit]');dismiss()
        load('tasks')
        assert browser.script("const c=document.querySelector('.wb-lane[data-drop=done] .wb-board-card');return !!c && c.textContent.includes('Verify callback recovery')")
        click('.wb-card-title')
        assert browser.script("return document.querySelector('.wb-modal-body').textContent.includes('Covered the expired callback') && document.querySelector('.wb-modal-body').textContent.includes('Shipped the retry regression test.')")
        click('.wb-modal header button');page('review')
        assert browser.script("return document.querySelector('.wb-activity').textContent.includes('Covered the expired callback')")
        assert browser.script("return performance.getEntriesByType('resource').every(e=>!new URL(e.name).pathname.startsWith('/api/'))")
        browser.screenshot(output/f'activity-{width}.png')
        cases.append({'width':width,'empty_capture_organize_inspect_focus_note_finish_reload_activity':'passed','capture_destination':capture_destination,'single_action_completion':True,'optional_note_dialog':optional_note_editor})
    # Returning to selected work preserves context and active focus takes priority.
    browser.script("localStorage.removeItem('pomogit.mock.v1')")
    browser.viewport(1440,1000);load('work')
    click('.wb-task-row:nth-of-type(2)')
    before=browser.script("return document.querySelector('.wb-detail h2').textContent")
    load('work')
    after=browser.script("return document.querySelector('.wb-detail h2').textContent")
    assert before==after
    click('.wb-detail .wb-actions .wb-primary')
    browser.script("document.querySelector('.wb-task-row:nth-of-type(3)').scrollIntoView({block:'start'})")
    click('.wb-task-row:nth-of-type(3)');load('work')
    assert browser.script("return document.querySelector('.wb-detail h2').textContent===arguments[0]",before), 'active task must take priority over remembered selection'
    # Finishing another task must leave this task's focus session running.
    page('tasks')
    browser.script("const selects=[...document.querySelectorAll('.wb-move-control select')];const e=selects.find(e=>!e.closest('.wb-board-card').querySelector('.wb-timer-label'));e.value='done';e.dispatchEvent(new Event('change',{bubbles:true}))")
    settle();assert browser.script("return !!document.querySelector('.wb-focus-meter') && document.querySelector('.wb-modal').getAttribute('aria-label')==='Task completed'")
    click('.wb-modal footer button:nth-of-type(2)');click('.wb-modal footer button:first-child')
    assert browser.script("return !document.querySelector('.wb-modal') && !!document.querySelector('.wb-focus-meter')"), 'Skip must not change focus'
    page('work');dismiss()
    # Failure injection only affects this temporary page's mock API object.
    browser.page("import(performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/lib/workApi.js').name).then(({workApi})=>{window.workflowApi=workApi;window.originalTransition=workApi.transitionSession;workApi.transitionSession=async()=>{throw new Error('Injected stop failure')}})")
    settle();click('.wb-detail footer button')
    assert browser.script("return !!document.querySelector('.wb-focus-meter') && document.querySelector('.wb-detail .wb-status').dataset.status==='progress' && document.querySelector('.wb-error').textContent.includes('Injected stop failure') && !document.querySelector('.wb-modal')"), browser.script("return {meter:!!document.querySelector('.wb-focus-meter'),status:document.querySelector('.wb-detail .wb-status')?.dataset.status,error:document.querySelector('.wb-error')?.textContent,modal:document.querySelector('.wb-modal')?.getAttribute('aria-label'),injected:!!window.workflowApi,transition:String(window.workflowApi?.transitionSession)}")
    browser.page("workflowApi.transitionSession=originalTransition;window.originalUpdate=workflowApi.updateTask;workflowApi.updateTask=async(id,changes)=>{if(changes.status==='done')throw new Error('Injected completion failure');return originalUpdate(id,changes)};void 0")
    click('.wb-detail footer button')
    assert browser.script("return !document.querySelector('.wb-focus-meter') && document.querySelector('.wb-detail .wb-status').dataset.status==='progress' && document.querySelector('.wb-error').textContent.includes('Injected completion failure') && !document.querySelector('.wb-modal')"), 'failed completion must refresh the ended timer without marking done'
    browser.page("workflowApi.updateTask=originalUpdate;void 0")
    # The full editor uses the same focused-completion path as Mark done.
    click('.wb-detail .wb-actions .wb-primary');click('.wb-detail header button');field('[name=status]','done');click('button[form=wb-edit-task][type=submit]')
    assert browser.script("return !document.querySelector('.wb-focus-meter') && !document.querySelector('.wb-error')")
    load('work')
    assert browser.script("return document.querySelector('.wb-detail h2').textContent!==arguments[0]",before), 'completed return point must fall back to unfinished work'
    # A deleted remembered task must also fall back safely.
    browser.script("const p=JSON.parse(localStorage.getItem('pomogit.work-protocol'));p.lastTaskId='deleted-task';localStorage.setItem('pomogit.work-protocol',JSON.stringify(p))")
    load('work');assert browser.script("return !!document.querySelector('.wb-detail') && document.querySelector('.wb-detail .wb-status').dataset.status!=='done'")
    assert browser.script("return performance.getEntriesByType('resource').every(e=>!new URL(e.name).pathname.startsWith('/api/'))")
    (output/'results.json').write_text(json.dumps({'cases':cases,'return_context':{'selected_before_reload':before,'shown_after_reload':after}},indent=2))
    print(f'PASS: desktop/mobile complete workflow; four workflow improvements and failure recovery passed. Evidence: {output}',flush=True)


audit.run=run
if __name__=='__main__': audit.main()
