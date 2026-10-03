#!/usr/bin/env python3
"""Actual React workbench browser audit. Start frontend Vite on 127.0.0.1:5173 first."""
import json
import os
import time
import check_scaling as audit

GEOMETRY = '''
const root=document.documentElement,app=document.querySelector('.premium-app'),modal=document.querySelector('.wb-modal[open]');
return {width:innerWidth,height:innerHeight,scroll:root.scrollWidth,client:root.clientWidth,app:!!app,
overflow:[...document.querySelectorAll('.wb-detail,.wb-lane,.wb-form,.wb-modal-body,.wb-profile')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.className),
modal:modal?{bottom:modal.getBoundingClientRect().bottom,body:modal.querySelector('.wb-modal-body').getBoundingClientRect().height,footer:modal.querySelector('footer')?.getBoundingClientRect().bottom}:null,
api:performance.getEntriesByType('resource').filter(e=>new URL(e.name).pathname.startsWith('/api/')).map(e=>e.name)};
'''

def run(browser, output):
    cases=[]
    def load(route):
        browser.command('WebDriver:Navigate', {'url':f"{os.environ.get('POMOGIT_APP_URL', 'http://127.0.0.1:5173')}/?audit={time.time_ns()}#{route}"})
        time.sleep(.2)
        for _ in range(100):
            if browser.script("return !!document.querySelector('.premium-app') && !document.querySelector('.wb-loading')"): break
            time.sleep(.1)
        else: raise AssertionError('React workbench data did not finish loading' + str(browser.script('return document.body.innerText')))
    def settle():
        time.sleep(.35)
    def check(label):
        result=browser.script(GEOMETRY)
        if result is None:
            time.sleep(.2)
            result=browser.script(GEOMETRY)
        assert result is not None,(label,'browser context unavailable',browser.script('return location.href'))
        assert result['app'], (label,'app missing')
        assert result['scroll']<=result['client']+1,(label,'root overflow',result)
        assert not result['overflow'],(label,'content overflow',result)
        assert not result['api'],(label,'backend requests',result['api'])
        if result['modal']:
            assert result['modal']['bottom']<=result['height']+1,(label,'dialog bounds',result)
            assert result['modal']['body']>25,(label,'dialog body collapsed',result)
            if result['modal']['footer']:
                assert result['modal']['footer']<=result['height']+1,(label,'dialog actions unreachable',result)
        cases.append({'case':label,'width':result['width'],'height':result['height']})
    for width,height in [(320,700),(390,844),(768,1000),(1024,900),(1440,1000)]:
        browser.viewport(width,height)
        for route in ['work','tasks','review','profile']:
            load(route);check(f'{route}:{width}')
            if route == 'work':
                assert browser.script("return document.querySelector('.wb-page-label svg') !== null"), 'missing page icon'
                if width >= 1101:
                    bounds=browser.script("const m=document.querySelector('.wb-main'),l=document.querySelector('.wb-task-list'),d=document.querySelector('.wb-detail'),b=d.querySelector('footer button'),r=b.getBoundingClientRect(),rows=[...l.querySelectorAll('.wb-task-row')];return {mainScroll:m.scrollHeight>m.clientHeight+1,listBottom:l.getBoundingClientRect().bottom,detailBottom:d.getBoundingClientRect().bottom,viewport:innerHeight,overlap:rows.some((e,i)=>i&&e.getBoundingClientRect().top<rows[i-1].getBoundingClientRect().bottom-1),actionReachable:b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};")
                    assert not bounds['mainScroll'] and not bounds['overlap'], bounds
                    assert bounds['listBottom'] <= bounds['viewport'] and bounds['detailBottom'] <= bounds['viewport'], bounds
                    assert bounds['actionReachable'], bounds
                assert browser.script("const heading=document.querySelector('.wb-list-heading'),list=document.querySelector('.wb-task-list');return !list.contains(heading) && (innerWidth<=760 || list.getBoundingClientRect().top-heading.getBoundingClientRect().bottom>=12);"), 'list heading is crowded into its scroll frame'
                browser.click('.wb-page-menu summary')
                assert not browser.script("return document.querySelector('.wb-page-menu .wb-current-icon')"), 'selection tick remains'
                menu=browser.script("const r=document.querySelector('.wb-page-menu nav').getBoundingClientRect();return {left:r.left,right:r.right,bottom:r.bottom,width:innerWidth,height:innerHeight};")
                assert menu['left'] >= 0 and menu['right'] <= menu['width'] and menu['bottom'] <= menu['height'], menu
                browser.screenshot(output/f'page-menu-{width}.png')
                assert browser.script("return [...document.querySelectorAll('.wb-nav-badge')].some(e=>e.textContent.includes('inbox')) && document.querySelector('.wb-nav-copy > small').textContent.includes('Create a task')"), 'missing preview indicators'
                browser.click('.wb-page-menu summary')

            if route=='work':
                browser.click('.wb-detail header button');check(f'edit:{width}')
                browser.script("document.querySelector('.wb-modal-body').scrollTop=10000")
                check(f'edit-scrolled:{width}')
                browser.click('.wb-modal header button')
                browser.click('.wb-account-menu summary');browser.click('.wb-account-menu nav button:last-of-type')
                check(f'settings:{width}');browser.click('.wb-modal header button')
            browser.screenshot(output/f'{route}-{width}.png')
    # Stress the actual canonical mock with 100 tasks and unbroken text.
    load('work')
    original=browser.script("return localStorage.getItem('pomogit.mock.v1')")
    browser.script("const state=JSON.parse(localStorage.getItem('pomogit.mock.v1')); const source=state.tasks[0]; state.tasks=Array.from({length:100},(_,i)=>({...source,id:'stress-'+i,title:i===0?'Repository'.repeat(40):'Review repository change '+i,project:i===0?'Project'.repeat(40):'project-'+i%4,nextStep:i===0?'Context'.repeat(80):'Verify the next branch.',notes:[],status:['inbox','ready','progress','done'][i%4]}));state.session=null;localStorage.setItem('pomogit.mock.v1',JSON.stringify(state))")
    for width in [320,390,768,1024,1440]:
        browser.viewport(width,1000)
        for route in ['work','tasks']:
            load(route);check(f'100-tasks:{route}:{width}')
    for width in [640,1280]:
        browser.viewport(width,1000,zoom=2)
        for route in ['work','tasks','profile']:
            load(route)
            browser.command('Marionette:SetContext',{'value':'chrome'})
            browser.script('window.gBrowser.selectedBrowser.browsingContext.fullZoom=2')
            browser.command('Marionette:SetContext',{'value':'content'})
            time.sleep(.1)
            assert abs(browser.script('return innerWidth')-width/2)<=1,'200% zoom not applied'
            check(f'200%-zoom:{route}:{width}')
    browser.script("localStorage.setItem('pomogit.mock.v1',arguments[0])",original)
    # Notes and editor drafts survive page and task changes.
    browser.viewport(1440,1000);load('work')
    browser.script("const project=document.querySelector('select[aria-label=\"Filter by project\"]');project.value='web-client';project.dispatchEvent(new Event('change',{bubbles:true}))")
    settle()
    assert browser.script("return !!document.querySelector('.wb-detail') && !!document.querySelector('.wb-task-row[aria-pressed=true]')"),'filter leaves matching work with an empty task pane'
    browser.click('.wb-filters .wb-ghost')
    browser.type('.wb-note-form textarea','Retained draft')
    browser.click('.wb-task-list .wb-task-row:nth-of-type(2)');browser.click('.wb-task-list .wb-task-row:first-of-type')
    assert browser.script("return document.querySelector('.wb-note-form textarea').value")=='Retained draft'
    browser.click('.wb-detail header button');browser.type('#wb-edit-task textarea[name=note]','Editor draft')
    browser.click('.wb-modal header button');browser.click('.wb-detail header button')
    assert browser.script("return document.querySelector('#wb-edit-task textarea[name=note]').value")=='Editor draft'
    browser.click('.wb-modal header button')
    # Session is global, focus starts progress, stop never completes a task.
    browser.click('.wb-actions .wb-primary');settle()
    assert browser.script("return document.querySelector('.wb-focus').dataset.running")=='true'
    assert 'In progress' in browser.script("return document.querySelector('.wb-detail header').innerText")
    browser.click('.wb-detail header button')
    assert browser.script("return document.querySelector('#wb-edit-task select[name=status]').value")=='progress','note-only editor draft restores an obsolete lifecycle status'
    browser.script("document.querySelector('#wb-edit-task select[name=status]').value='done'")
    browser.click('.wb-modal footer button:last-child');settle()
    assert 'Stop the timer' in browser.script("return document.querySelector('.wb-modal .wb-error').textContent"),'blocked status edit has no dialog error'
    browser.click('.wb-modal header button')
    browser.click('.wb-page-menu summary');browser.click('.wb-page-menu nav button:nth-child(2)')
    assert browser.script("return document.querySelectorAll('.wb-lane').length")==4
    assert browser.script("return document.querySelector('.wb-focus').dataset.running")=='true'
    browser.click('.wb-board-card .wb-card-title');assert 'Edit' in browser.script("return document.querySelector('.wb-modal footer').innerText")
    assert not browser.script("return document.querySelector('.wb-modal input')"),'inspection opens an editor'
    browser.click('.wb-modal header button')
    browser.click('.wb-focus-actions button:first-child');settle()
    before=browser.script("return document.querySelector('.wb-readout time').textContent")
    time.sleep(1.1)
    assert browser.script("return document.querySelector('.wb-readout time').textContent")==before,'paused clock advances'
    browser.click('.wb-focus-actions button:last-child');settle()
    assert browser.script("return document.querySelector('.wb-focus').dataset.running")=='false'
    assert browser.script("return document.querySelectorAll('[data-drop=progress] .wb-board-card').length")>=1
    browser.click('.wb-page-menu summary');browser.click('.wb-page-menu nav button:first-child')
    browser.click('.wb-detail footer button');settle()
    assert browser.script("return document.querySelector('.wb-modal header h2').textContent")=='Task completed'
    browser.click('.wb-modal footer button:first-child');settle()
    assert not browser.script("return document.querySelector('.wb-modal[open]')"),'undo completion did not close'
    assert browser.script("return document.querySelector('.wb-detail')")
    # Real pointer movement must change a card's canonical lifecycle status.
    browser.click('.wb-page-menu summary');browser.click('.wb-page-menu nav button:nth-child(2)')
    task_id=browser.script("return document.querySelector('[data-drop=ready] .wb-board-card').dataset.task")
    rects=browser.script("const grip=document.querySelector('[data-drop=ready] .wb-grip').getBoundingClientRect();const lane=document.querySelector('[data-drop=inbox]').getBoundingClientRect();return {x:grip.x+grip.width/2,y:grip.y+grip.height/2,tx:lane.x+lane.width/2,ty:lane.y+90}")
    browser.command('WebDriver:PerformActions',{'actions':[{'type':'pointer','id':'drag','parameters':{'pointerType':'mouse'},'actions':[{'type':'pointerMove','origin':'viewport','x':round(rects['x']),'y':round(rects['y'])},{'type':'pointerDown','button':0},{'type':'pointerMove','origin':'viewport','x':round(rects['tx']),'y':round(rects['ty']),'duration':300},{'type':'pointerUp','button':0}]}]})
    browser.command('WebDriver:ReleaseActions');settle()
    assert browser.script("return [...document.querySelectorAll('[data-drop=inbox] .wb-board-card')].some(card=>card.dataset.task===arguments[0])",task_id),'pointer drag did not move task'
    browser.click('.wb-page-menu summary');browser.click('.wb-page-menu nav button:first-child')
    # All destinations appear in the switcher; browser history follows navigation.
    browser.click('.wb-page-menu summary');browser.click('.wb-page-menu nav button:nth-child(4)')
    assert browser.script("return document.querySelector('.wb-profile') !== null"), 'Profile switcher destination missing'
    browser.script('history.back()');settle()
    assert browser.script("return document.querySelector('.wb-heading h1').textContent") == 'Workspace', 'Back does not restore the prior page'
    browser.script('history.forward()');settle()
    assert browser.script("return document.querySelector('.wb-profile') !== null"), 'Forward does not restore Profile'
    browser.click('.wb-page-menu summary');browser.click('.wb-page-menu nav button:nth-child(2)')
    browser.script("const select=document.querySelector('[data-drop=inbox] .wb-move-control select');select.value='done';select.dispatchEvent(new Event('change',{bubbles:true}));")
    settle();browser.click('.wb-modal footer button:last-child');settle()
    assert browser.script("return document.querySelector('.wb-heading h1').textContent") == 'Workspace', 'Choose next task stays on Board'
    assert browser.script("return document.querySelector('.wb-focus').dataset.running") == 'false', 'Choosing next task starts focus'
    # Keyboard search and no authentication/backend requirement.
    browser.command('WebDriver:PerformActions',{'actions':[{'type':'key','id':'keyboard','actions':[{'type':'keyDown','value':'/'},{'type':'keyUp','value':'/'}]}]})
    browser.command('WebDriver:ReleaseActions')
    assert browser.script("return document.activeElement===document.querySelector('.wb-search input')")
    check('workflow:desktop')
    browser.viewport(390,844);load('work')
    assert browser.script("return !!document.querySelector('.wb-filter-toggle')"), browser.script("return document.body.innerText")
    browser.click('.wb-filter-toggle')
    assert browser.script("return getComputedStyle(document.querySelector('#wb-filter-selects')).display")!='none'
    assert browser.script("return getComputedStyle(document.querySelector('.wb-focus-context')).display") != 'none', 'compact timer hides its task'
    browser.click('.wb-actions .wb-primary');settle()
    assert browser.script("return document.querySelector('.wb-focus').classList.contains('wb-focus-compact')")
    browser.type('.wb-note-form textarea','Phone draft')
    assert browser.script("return document.querySelector('.wb-focus').hidden")
    browser.script("window.eval(\"Object.defineProperty(window.visualViewport,'height',{configurable:true,value:350});visualViewport.dispatchEvent(new Event('resize'))\")")
    settle()
    assert browser.script("return document.querySelector('.premium-app').getBoundingClientRect().bottom")<=351,'keyboard viewport does not resize app'
    visible_note=browser.script("const main=document.querySelector('.wb-main').getBoundingClientRect(),note=document.querySelector('.wb-note-form textarea').getBoundingClientRect();return (note.top+note.bottom)/2>=main.top&&(note.top+note.bottom)/2<=main.bottom")
    assert visible_note,'focused note is covered by keyboard viewport'
    browser.script("window.eval(\"delete visualViewport.height;visualViewport.dispatchEvent(new Event('resize'))\");document.activeElement.blur()");settle()
    assert not browser.script("return document.querySelector('.wb-focus').hidden")
    browser.click('.wb-focus-actions button:last-child');settle()
    check('workflow:mobile')
    browser.click('.wb-page-menu summary');browser.click('.wb-page-menu nav button:nth-child(3)')
    assert browser.script("return document.querySelector('.wb-focus').hidden"), 'Activity shows an idle timer without task context'
    browser.click('.wb-activity-title')
    assert browser.script("return document.querySelector('.wb-modal footer button:last-child').textContent").strip() in ['Open in Workspace', 'Reopen in Workspace'], 'Activity does not use task inspection'
    browser.click('.wb-modal header button')
    # Settings Cancel preserves saved behavior, and profile sharing is explicit.
    browser.viewport(1440,1000);load('work')
    browser.click('.wb-account-menu summary');browser.click('.wb-account-menu nav button:last-of-type')
    browser.script("document.querySelector('#wb-settings-form select[name=density]').value='compact'")
    browser.click('.wb-modal footer div button:first-child')
    assert not browser.script("return document.querySelector('.premium-app').classList.contains('wb-compact')"),'Cancel applies settings'
    browser.click('.wb-account-menu summary');browser.click('.wb-account-menu nav button:first-of-type')
    browser.click('.wb-profile-toolbar button:first-of-type')
    before_name=browser.script("return document.querySelector('.wb-profile-identity h2').textContent")
    browser.script("document.querySelector('#wb-profile-form input[name=displayName]').value='Cancelled name'")
    browser.click('.wb-modal footer button:first-child')
    assert browser.script("return document.querySelector('.wb-profile-identity h2').textContent")==before_name,'Cancel applies profile edits'
    browser.click('.wb-profile-toolbar button:first-of-type')
    browser.script("document.querySelector('#wb-profile-form input[name=displayName]').value='Renamed developer'")
    time.sleep(.7)
    avatar_hue="const c=document.querySelector('.wb-avatar-editor canvas'),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let r=0,g=0,b=0;for(let i=0;i<data.length;i+=4){if(data[i+3]>128){r+=data[i];g+=data[i+1];b+=data[i+2]}}return Math.round(Math.atan2(Math.sqrt(3)*(g-b),2*r-g-b)*180/Math.PI);"
    before_hue=browser.script(avatar_hue)
    browser.click('.wb-avatar-editor button')
    time.sleep(.7)
    assert abs(browser.script(avatar_hue)-before_hue)>5, 'new avatar still uses the same forced hue'
    avatar=browser.script("return document.querySelector('.wb-avatar-editor canvas').toDataURL()")
    browser.click('.wb-modal footer button:last-child')
    time.sleep(.7)
    assert browser.script("return document.querySelector('.wb-account-menu canvas').toDataURL()")==avatar,'saved avatar differs from chosen preview after name edit'
    browser.click('.wb-featured header button')
    browser.click('.wb-feature-option input[type=checkbox]')
    browser.type('.wb-feature-summary textarea','Explicit public outcome')
    browser.click('.wb-modal footer button:last-child')
    assert browser.script("return document.querySelectorAll('.wb-featured > article').length")==1
    browser.click('.wb-profile-toolbar button:last-child')
    public=browser.script("return document.querySelector('.wb-profile').innerText")
    assert 'Explicit public outcome' in public
    assert 'Covered the expired callback branch.' not in public
    assert 'Private notes' not in public
    assert not browser.script("return document.querySelector('.wb-rhythm')"),'activity shared without opt-in'
    check('profile:explicit-sharing')
    browser.screenshot(output/'profile-featured-1440.png')
    # First-use flow has one clear create action and no idle timer.
    browser.script("const state=JSON.parse(localStorage.getItem('pomogit.mock.v1'));state.tasks=[];state.checkpoints=[];state.sessions=[];state.session=null;localStorage.setItem('pomogit.mock.v1',JSON.stringify(state))")
    browser.viewport(390,844);load('work')
    assert browser.script("return document.querySelector('.wb-focus').hidden")
    assert browser.script("return document.querySelector('.wb-capture button').classList.contains('wb-primary')")
    browser.type('.wb-capture input','A new outcome')
    browser.click('.wb-capture button');settle()
    assert browser.script("return document.querySelector('.wb-detail h2').textContent")=='A new outcome'
    assert browser.script("return document.querySelector('.wb-focus').dataset.running")=='false','capture starts focus automatically'
    check('first-use:capture')
    (output/'results.json').write_text(json.dumps({'geometry':cases,'interactions':'passed','backend_requests':0},indent=2))
    print(f'PASS: {len(cases)} React geometry cases and actual workflow checks; no API requests.')
    print(f'Evidence: {output}')

audit.run=run
if __name__=='__main__':
    audit.main()
