#!/usr/bin/env python3
"""Capture theme proposals from the interactive HTML workbench, not live React."""
import json
import os
import time
import check_scaling as audit


def run(browser, output):
    base=os.environ.get('POMOGIT_PREVIEW_URL','http://127.0.0.1:4173/design/pages-preview.html')
    concept=os.environ.get('POMOGIT_PREVIEW_CONCEPT','')
    pictures=[]
    for palette,mode in [('electric','light'),('electric','dark'),('sage','dark')]:
        for width,height,device in [(1440,1000,'desktop'),(390,1100,'mobile')]:
            browser.viewport(width,height)
            for scene,name in [('workspace','workspace'),('board','board')]:
                browser.command('WebDriver:Navigate',{'url':f'{base}?scene={scene}&theme={palette}&mode={mode}&concept={concept}'})
                time.sleep(.8)
                assert not concept or browser.script('return document.documentElement.dataset.concept')==concept
                assert browser.script('return document.documentElement.dataset.mode')==mode
                assert browser.script('return document.documentElement.dataset.palette')==palette
                browser.script("document.querySelector('.prototype').style.display='none';document.querySelectorAll('*').forEach(e=>e.getAnimations().forEach(a=>a.finish()));window.dispatchEvent(new Event('resize'))")
                time.sleep(.2)
                assert browser.script('return document.documentElement.scrollWidth<=document.documentElement.clientWidth+1'), 'capture overflow'
                size=browser.script('return {width:innerWidth,height:innerHeight}')
                filename=f'{name}{"-violet" if concept=="violet" else ""}-{palette}-{mode}-{device}.png'
                browser.screenshot(output/filename)
                pictures.append({'file':filename,**size,'source':'Themed standalone HTML proposal; sample fixtures'})
    (output/('violet-screenshots.json' if concept=='violet' else 'theme-screenshots.json')).write_text(json.dumps(pictures,indent=2))
    print(f'Captured {len(pictures)} themed proposal pictures. React unchanged.')


audit.run=run
if __name__=='__main__':audit.main()
