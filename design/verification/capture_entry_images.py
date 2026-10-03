#!/usr/bin/env python3
"""Capture the real mock React app for the standalone product proposal."""
import json
import os
import time
import check_scaling as audit


def run(browser, output):
    base=os.environ.get('POMOGIT_APP_URL','http://127.0.0.1:5175')
    pictures=[]
    for width,height,label in [(1440,1000,'desktop'),(390,1100,'mobile')]:
        browser.viewport(width,height)
        for route,name in [('work','workspace'),('tasks','board')]:
            browser.command('WebDriver:Navigate',{'url':base+'/#'+route})
            for _ in range(100):
                if browser.script("return !!document.querySelector('.premium-app') && !document.querySelector('.wb-loading')"): break
                time.sleep(.1)
            else: raise AssertionError('Mock app failed to load')
            time.sleep(.8)
            assert browser.script("return performance.getEntriesByType('resource').every(e=>!new URL(e.name).pathname.startsWith('/api/'))"), 'unexpected API request'
            size=browser.script('return {width:innerWidth,height:innerHeight}')
            filename=f'{name}-{label}.png'
            browser.screenshot(output/filename)
            pictures.append({'file':filename,**size,'source':'Actual React UI with isolated default mock data'})
    (output/'screenshots.json').write_text(json.dumps(pictures,indent=2))
    print(json.dumps(pictures,indent=2))


audit.run=run
if __name__=='__main__': audit.main()
