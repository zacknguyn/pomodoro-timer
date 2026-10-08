#!/usr/bin/env python3
"""Production persistence and actual-download smoke test in isolated Firefox.

Serve npm run build with npm run preview on port 5181 first.
Optional POMOGIT_APP_URL overrides the production URL.
"""
import json
import os
import time
import check_scaling as audit


def run(browser, output):
    base = os.environ.get('POMOGIT_APP_URL', 'http://127.0.0.1:5181')
    results = []
    browser.command('Marionette:SetContext', {'value':'chrome'})
    browser.script("Services.prefs.setIntPref('browser.download.folderList',2);Services.prefs.setStringPref('browser.download.dir',arguments[0]);Services.prefs.setBoolPref('browser.download.useDownloadDir',true);Services.prefs.setStringPref('browser.helperApps.neverAsk.saveToDisk','application/json')", str(output.resolve()))
    browser.command('Marionette:SetContext', {'value':'content'})

    def load(route):
        browser.command('WebDriver:Navigate', {'url':base + '/?release=' + str(time.time_ns()) + '#' + route})
        time.sleep(.35)
        for _ in range(50):
            if browser.script("return !!document.querySelector('.wb-heading') && !document.querySelector('.wb-loading')"):
                time.sleep(.25); return
            time.sleep(.1)
        raise AssertionError('Production workspace did not load')

    def click(selector):
        browser.script("document.querySelector(arguments[0]).scrollIntoView({block:'center'})", selector)
        browser.click(selector); time.sleep(.35)

    def field(selector, value):
        browser.script("const e=document.querySelector(arguments[0]);e.value=arguments[1];e.dispatchEvent(new Event('input',{bubbles:true}))",selector,value)

    def check(label, script, *args):
        assert browser.script(script,*args), label
        results.append({'width':width,'name':label})

    def dismiss():
        if browser.script("return !!document.querySelector('[aria-label=\"Dismiss notification\"]')"):
            click('[aria-label="Dismiss notification"]')

    for width in [1440,390]:
        browser.viewport(width,1000);load('work')
        browser.script("localStorage.setItem('pomogit.mock.v1',JSON.stringify({tasks:[],checkpoints:[],sessions:[],session:null,seq:100}))")
        load('tasks')
        title = f'Firefox release task {width}'
        browser.type('.wb-capture input',title);click('.wb-capture button');dismiss()
        click('.wb-card-title');click('.wb-modal footer button:first-child')
        field('[name=project]','release-checks');field('[name=nextStep]','Confirm recovery after reload.')
        field('[name=referenceUrl]','https://example.com/pull/123');field('[name=status]','ready');field('[name=note]','Saved production context.')
        click('button[form=wb-edit-task]');dismiss();load('tasks')
        check('Organized task survives reload',"return document.querySelector('.wb-lane[data-drop=ready] .wb-card-title').textContent===arguments[0]",title)
        click('.wb-card-title');click('.wb-modal footer .wb-primary')
        check('Saved context survives reload',"return document.querySelector('.wb-detail').textContent.includes('release-checks') && document.querySelector('.wb-next-step').textContent.includes('recovery') && document.querySelector('.wb-saved-context').textContent.includes('production context')")
        click('.wb-detail .wb-actions .wb-primary');load('work')
        check('Active session survives reload',"return document.querySelector('.wb-focus').dataset.running==='true' && document.querySelector('.wb-detail .wb-status').dataset.status==='progress'")
        click('.wb-focus-actions button:first-child');load('work')
        check('Paused session survives reload',"return document.querySelector('.wb-focus header small').textContent==='Paused'")
        click('.wb-focus-actions button:last-child');dismiss();click('.wb-detail footer button')
        click('.wb-modal footer button:nth-child(2)');browser.type('#wb-closing-note textarea','Verified production recovery.')
        click('button[form=wb-closing-note]');dismiss();load('review')
        check('Completion note survives reload',"return document.querySelector('.wb-activity').textContent.includes('Verified production recovery.')")
        click('.wb-account-menu summary');click('.wb-account-menu nav button:nth-child(2)')
        export_path = output/'pomogit-workspace.json'
        export_path.unlink(missing_ok=True)
        click('.wb-settings-data button')
        for _ in range(100):
            if export_path.exists() and not output.joinpath('pomogit-workspace.json.part').exists(): break
            time.sleep(.1)
        exported=json.loads(export_path.read_text())
        assert exported['tasks'][0]['title']==title and exported['tasks'][0]['status']=='done'
        assert exported['tasks'][0]['referenceUrl']=='https://example.com/pull/123'
        assert any('production recovery' in note['text'] for note in exported['tasks'][0]['notes'])
        assert exported['sessions'] and not exported.get('session')
        export_path.rename(output/f'export-{width}.json')
        results.append({'width':width,'name':'Actual downloaded export preserves task, notes, reference and session history'})
        check('Production bundle without backend requests',"const paths=performance.getEntriesByType('resource').map(e=>new URL(e.name).pathname);return paths.some(p=>p.startsWith('/assets/Workbench-')) && !paths.some(p=>p.startsWith('/api/') || p.startsWith('/src/') || p==='/@vite/client')")
        browser.screenshot(output/f'export-settings-{width}.png')
    (output/'results.json').write_text(json.dumps(results,indent=2))
    print(f'PASS: {len(results)} Firefox production persistence/export cases. Evidence: {output}',flush=True)


audit.run=run
if __name__=='__main__': audit.main()
