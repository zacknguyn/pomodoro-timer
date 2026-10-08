#!/usr/bin/env python3
"""Check 50/100-task layouts and interactions in an isolated Firefox profile."""
import json,time,os
import check_scaling as audit

def run(b,out):
    report=[];interactions=[]
    def settle():time.sleep(.35)
    def load(route):
        b.command('WebDriver:Navigate',{'url':os.environ.get('POMOGIT_APP_URL','http://127.0.0.1:5180')+'/?loadtest='+str(time.time_ns())+'#'+route})
        settle()
        for _ in range(80):
            if b.script("return !!document.querySelector('.wb-heading') && !document.querySelector('.wb-loading')"):return
            time.sleep(.1)
        raise AssertionError('Workspace failed to load')
    def click(sel):
        b.script("document.querySelector(arguments[0]).scrollIntoView({block:'center'})",sel)
        b.click(sel);settle()
    def check(name,script,*args):
        passed=b.script(script,*args);interactions.append({'name':name,'passed':bool(passed)})
        print(('PASS: ' if passed else 'FINDING: ')+name,flush=True)
    def seed(count,navigation):
        b.script("""
        const total=arguments[0],nav=arguments[1],statuses=['inbox','ready','progress','done'];
        const projects=Array.from({length:24},(_,i)=>i===23?'checkout-api-observability-and-callback-recovery-production':`project-${String(i+1).padStart(2,'0')}`);
        const tasks=Array.from({length:total},(_,i)=>({id:`load-${i}`,title:i===total-1?'Find callback regression evidence':i%11===0?`Investigate callback correlation ${'e13a76'.repeat(18)}`:`Fix callback recovery ${i}: reproduce the expired OAuth redirect, verify retry behavior, document the result, and update the regression tests before merging`,status:statuses[i%4],order:i,project:projects[i%24],referenceUrl:`https://example.com/${projects[i%24]}/pull/${i+1}`,nextStep:i===0?'Compare callback traces and confirm the next concrete change. '.repeat(12):`Reproduce issue ${i} and record the smallest next step.`,createdAt:new Date(Date.now()-i*3600000).toISOString(),notes:Array.from({length:i===0?120:8},(_,j)=>({id:`note-${i}-${j}`,text:j%9===0?`Trace reference: ${'request-id-'.repeat(20)}`:`Changed retry case ${j}; verified the expired callback path and saved the reproduction steps.\nNext: review the regression coverage.`,createdAt:new Date(Date.now()-j*60000-i*3600000).toISOString(),kind:'note'}))}));
        localStorage.setItem('pomogit.mock.v1',JSON.stringify({tasks,checkpoints:[],sessions:[],session:null,seq:1000}));
        localStorage.setItem('pomogit.work-protocol',JSON.stringify({navigation:nav,brightness:'dark',palette:'electric',motion:'reduced',lastTaskId:'load-0'}));
        """,count,navigation)
    geometry="""
    const box=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
    const main=document.querySelector('.wb-main'),rail=document.querySelector('.wb-project-shortcuts'),account=document.querySelector('.wb-account-menu summary');
    const offenders=[...document.querySelectorAll('.wb-detail h2,.wb-next-step,.wb-saved-context p,.wb-project-shortcuts button,.wb-activity article p,.wb-modal-body')].filter(e=>e.scrollWidth>e.clientWidth+2).slice(0,6).map(e=>({class:e.className,tag:e.tagName,client:e.clientWidth,scroll:e.scrollWidth,text:e.textContent.slice(0,80)}));
    return {documentOverflow:document.documentElement.scrollWidth>innerWidth+1,mainOverflow:main.scrollWidth>main.clientWidth+2,offenders,account:box(account),rail:rail?{...box(rail),scroll:rail.scrollWidth,client:rail.clientWidth,overlappingRows:[...rail.querySelectorAll('button')].filter(e=>e.scrollHeight>e.clientHeight+2).length}:null,cards:document.querySelectorAll('.wb-board-card').length,rows:document.querySelectorAll('.wb-task-row').length,events:document.querySelectorAll('.wb-activity article').length,readyHeader:document.querySelector('[data-drop=ready] h3')?box(document.querySelector('[data-drop=ready] h3')):null};
    """
    load('work')
    for count in [50,100]:
        for nav in ['sidebar','navbar']:
            seed(count,nav)
            for width,height in [(1440,1000),(1024,768),(390,844),(320,700)]:
                b.viewport(width,height)
                for route in ['work','tasks','review','profile']:
                    start=time.monotonic();load(route)
                    data=b.script(geometry)
                    report.append({'tasks':count,'navigation':nav,'width':width,'route':route,'load_ms':round((time.monotonic()-start)*1000),**data})
                    if count==100 and nav=='sidebar' and width in [1440,390]:b.screenshot(out/f'{route}-{width}.png')
            print(f'Inspected {count} tasks with {nav} across 4 widths and 4 pages',flush=True)
    seed(100,'sidebar');b.viewport(1440,1000);load('tasks')
    check('All 100 cards are available',"return document.querySelectorAll('.wb-board-card').length===100")
    # Narrow the board using native project/status filters, then clear them.
    b.script("const e=document.querySelector('[aria-label=\"Filter by project\"]');e.value='project-01';e.dispatchEvent(new Event('change',{bubbles:true}))");settle()
    check('Project filter selects the expected cards',"return document.querySelectorAll('.wb-board-card').length===5 && [...document.querySelectorAll('.wb-board-project')].every(e=>e.textContent==='project-01')")
    b.script("document.querySelector('.wb-filters .wb-ghost').click()");settle()
    b.type('.wb-search input','Find callback regression evidence');settle()
    check('Search finds one task among 100',"return document.querySelectorAll('.wb-board-card').length===1 && document.querySelector('.wb-card-title').textContent==='Find callback regression evidence'")
    click('.wb-card-title')
    check('Filtered result opens a read-only popup',"return document.querySelector('.wb-modal').getAttribute('aria-label')==='Find callback regression evidence' && !document.querySelector('#wb-edit-task')")
    click('.wb-modal header button');b.script("document.querySelector('.wb-filters .wb-ghost').click()");settle()
    # Reach a card at the bottom of a long desktop lane using browser-native scrolling.
    click('[data-task="load-96"] .wb-card-title')
    check('Last card in a populated lane is reachable',"return document.querySelector('.wb-modal').getAttribute('aria-label').includes('96')")
    click('.wb-modal header button');load('work')
    check('Workspace actions precede long context',"return !!(document.querySelector('.wb-actions').compareDocumentPosition(document.querySelector('.wb-next-step')) & Node.DOCUMENT_POSITION_FOLLOWING)")
    check('Long title offers inline access to the full text',"return document.querySelector('.wb-detail h2').getBoundingClientRect().height<120 && !!document.querySelector('.wb-full-title')")
    click('.wb-full-title summary')
    check('Full-title disclosure preserves the entire title',"return document.querySelector('.wb-full-title').open && document.querySelector('.wb-full-title p').textContent===JSON.parse(localStorage.getItem('pomogit.mock.v1')).tasks[0].title")
    click('.wb-full-title summary')
    click('.wb-detail header button')
    before=b.script("const d=document.querySelector('.wb-modal');return [d.querySelector('header').getBoundingClientRect().top,d.querySelector('footer').getBoundingClientRect().bottom]")
    b.script("document.querySelector('.wb-modal-body').scrollTop=100000")
    check('120-note editor keeps header and save controls fixed',"const d=document.querySelector('.wb-modal');return document.querySelectorAll('.wb-note-history article').length===120 && Math.abs(d.querySelector('header').getBoundingClientRect().top-arguments[0][0])<1 && Math.abs(d.querySelector('footer').getBoundingClientRect().bottom-arguments[0][1])<1",before)
    b.screenshot(out/'long-history-dialog.png');click('.wb-modal header button')
    click('.wb-detail .wb-actions .wb-primary')
    # Scroll the context pane to its last unfinished row and check it is not covered.
    b.script("const rows=document.querySelectorAll('.wb-task-row');rows[rows.length-1].scrollIntoView({block:'end'})")
    check('Last Workspace context row stays clear of the timer',"const rows=document.querySelectorAll('.wb-task-row'),r=rows[rows.length-1].getBoundingClientRect(),t=document.querySelector('.wb-focus').getBoundingClientRect();return r.bottom<=t.top+1 || r.right<=t.left || r.left>=t.right")
    click('.wb-focus-actions button:last-child')
    b.viewport(390,844);load('tasks')
    check('Mobile Board status filter is directly visible',"const e=document.querySelector('[aria-label=\"Filter by status\"]');const r=e.getBoundingClientRect();return r.width>0 && r.top>=0 && r.bottom<innerHeight && !document.querySelector('#wb-filter-selects').classList.contains('is-open')")
    for status in ['inbox','ready','progress','done']:
        b.script("const e=document.querySelector('[aria-label=\"Filter by status\"]');e.value=arguments[0];e.dispatchEvent(new Event('change',{bubbles:true}))",status);settle()
        check(f'Mobile status {status} is reachable without earlier columns',"const lanes=[...document.querySelectorAll('.wb-lane')].filter(e=>e.getBoundingClientRect().height>0);return lanes.length===1 && lanes[0].dataset.drop===arguments[0] && lanes[0].getBoundingClientRect().top<innerHeight && lanes[0].querySelectorAll('.wb-board-card').length===JSON.parse(localStorage.getItem('pomogit.mock.v1')).tasks.filter(t=>t.status===arguments[0]).length",status)
    click('[data-task="load-99"] .wb-card-title')
    check('Last mobile card can be reached and inspected',"return document.querySelector('.wb-modal').getAttribute('aria-label')==='Find callback regression evidence'")
    check('Mobile popup footer controls fit horizontally',"const f=document.querySelector('.wb-modal footer');return f.scrollWidth<=f.clientWidth+1")
    check('No backend requests',"return performance.getEntriesByType('resource').every(e=>!new URL(e.name).pathname.startsWith('/api/'))")
    check('Activity has no horizontal overflow across the workload matrix', 'return arguments[0]', all(not x['mainOverflow'] and not x['documentOverflow'] for x in report if x['route']=='review'))
    check('Project rows stay contained across the workload matrix', 'return arguments[0]', all(not x['rail']['overlappingRows'] for x in report if x['rail']))
    (out/'results.json').write_text(json.dumps({'geometry':report,'interactions':interactions},indent=2))
    assert all(x['passed'] for x in interactions), 'Workload regression failed; see results.json'
    print(f'Completed {len(report)} geometry cases and {sum(x["passed"] for x in interactions)}/{len(interactions)} interaction checks. Evidence: {out}',flush=True)

audit.run=run
if __name__=='__main__':audit.main()
