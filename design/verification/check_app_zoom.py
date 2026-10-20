#!/usr/bin/env python3
"""Check React page/dialog reflow with real Firefox zoom and isolated mock data."""
import os,time,json
import check_scaling as audit

def run(b,out):
    results=[]
    base=os.environ.get('POMOGIT_APP_URL','http://127.0.0.1:5190').rstrip('/')+'/'
    def load(route):
        b.script("document.querySelector('dialog[open] header button')?.click(); location.hash=arguments[0]", 'profile' if route=='settings' else route)
        for _ in range(300):
            if b.script("return !!document.querySelector('.wb-main') && !document.querySelector('.wb-loading')"):break
            time.sleep(.1)
        time.sleep(.2)
        if not b.script("return !!document.querySelector('.wb-main')"):
            b.screenshot(out/'failed-load.png')
            raise AssertionError(b.script('return document.body.innerText'))
    def measure(label):
        data=b.script("""
        const main=document.querySelector('.wb-main'),d=document.querySelector('dialog[open]');
        const visible=e=>e.getBoundingClientRect().width>0;
        return {width:innerWidth,height:innerHeight,documentOverflow:document.documentElement.scrollWidth>innerWidth+1,mainOverflow:main.scrollWidth>main.clientWidth+2,dialogOverflow:d?d.scrollWidth>d.clientWidth+2:false,footerOverflow:d?d.querySelector('footer').scrollWidth>d.querySelector('footer').clientWidth+2:false,smallControls:[...document.querySelectorAll('button')].filter(visible).filter(e=>e.getBoundingClientRect().height<24).length};
        """)
        results.append({'label':label,**data})
        print(label,json.dumps(data),flush=True)
    b.command('WebDriver:Navigate',{'url':base+'#work'})
    load('work')
    for nav in ['sidebar','navbar']:
        b.viewport(1440,1000)
        load('settings')
        b.script("document.querySelector('.wb-account-menu summary').click(); [...document.querySelectorAll('.wb-account-menu nav button')].find(e=>e.textContent==='Settings').click()")
        b.script("document.querySelector('[name=navigation][value='+arguments[0]+']').checked=true; document.querySelector('[name=motion][value=reduced]').checked=true; document.querySelector('#wb-settings-form').requestSubmit()",nav)
        time.sleep(.2)
        b.script("document.querySelector('[aria-label=\"Dismiss notification\"]')?.click()")
        for width,height,zoom in [(1280,1000,2),(1280,1000,4),(640,1000,2),(844,390,1),(320,568,1)]:
            b.viewport(width,height)
            for route in ['work','tasks','review','profile','settings']:
                load(route)
                # Measure actual browser zoom, rather than a CSS transform.
                b.viewport(width,height,zoom);time.sleep(.15)
                if route=='settings':
                    b.script("document.querySelector('.wb-account-menu summary').click(); [...document.querySelectorAll('.wb-account-menu nav button')].find(e=>e.textContent==='Settings').click()");time.sleep(.2)
                label=f'{nav}-{width}x{height}-{zoom}x-{route}'
                measure(label)
                if route=='tasks':
                    b.click('.wb-card-title');time.sleep(.15);measure(label+'-dialog')
                if zoom==4 or height==390:b.screenshot(out/(label+'.png'))
    (out/'results.json').write_text(json.dumps(results,indent=2))
    bad=[r for r in results if r['documentOverflow'] or r['mainOverflow'] or r['dialogOverflow'] or r['footerOverflow']]
    assert not bad,bad
    print(f'PASS: {len(results)} scaling cases',flush=True)

audit.run=run
if __name__=='__main__':audit.main()
