#!/usr/bin/env python3
"""Local Firefox geometry/interaction audit for the standalone Pomogit preview.

Requires Firefox and Python 3; uses Firefox's local Marionette interface.
Run from any directory: python design/verification/check_scaling.py
Optional --connect PORT reuses an already running isolated Marionette instance.
"""
import argparse
import base64
import json
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[2]
ELEMENT = 'element-6066-11e4-a52e-4f735466cecf'


class Browser:
    def __init__(self, port):
        self.socket = socket.create_connection(('127.0.0.1', port), timeout=20)
        self.counter = 0
        self.zoom = 1
        self.receive()
        self.command('WebDriver:NewSession', {'capabilities': {'alwaysMatch': {}}})
        self.command('Marionette:SetContext', {'value': 'chrome'})
        self.script('document.documentElement.style.setProperty("min-width","0","important")')
        self.command('Marionette:SetContext', {'value': 'content'})

    def receive(self):
        header = b''
        while not header.endswith(b':'):
            part = self.socket.recv(1)
            if not part:
                raise RuntimeError('Firefox closed the automation connection')
            header += part
        length = int(header[:-1])
        data = b''
        while len(data) < length:
            part = self.socket.recv(length - len(data))
            if not part:
                raise RuntimeError('Firefox closed an incomplete response')
            data += part
        return json.loads(data)

    def command(self, name, params=None):
        self.counter += 1
        data = json.dumps([0, self.counter, name, params or {}]).encode()
        self.socket.sendall(str(len(data)).encode() + b':' + data)
        response = self.receive()
        if response[2]:
            raise RuntimeError(json.dumps(response[2]))
        return response[3]

    def script(self, script, *args):
        result = self.command('WebDriver:ExecuteScript', {
            'script': script, 'args': list(args), 'newSandbox': False,
            'sandbox': 'default', 'scriptTimeout': 10000,
        })
        return result.get('value', result) if isinstance(result, dict) else result

    def page(self, script):
        return self.script('return window.eval(arguments[0])', script)

    def viewport(self, width, height, zoom=1):
        self.zoom = zoom
        self.command('Marionette:SetContext', {'value': 'chrome'})
        self.script('window.gBrowser.selectedBrowser.browsingContext.fullZoom=arguments[0]', zoom)
        self.command('Marionette:SetContext', {'value': 'content'})
        self.command('WebDriver:SetWindowRect', {'width': width, 'height': height})

    def load(self, scene):
        self.command('WebDriver:Navigate', {'url': (ROOT / 'design/pages-preview.html').as_uri() + '?scene=' + scene})
        # Stabilize geometry and canvas reveal before measuring or exporting.
        time.sleep(.2)
        self.command('Marionette:SetContext', {'value': 'chrome'})
        self.script('window.gBrowser.selectedBrowser.browsingContext.fullZoom=arguments[0]', self.zoom)
        self.command('Marionette:SetContext', {'value': 'content'})
        time.sleep(.05)
        self.script("document.querySelectorAll('*').forEach(el=>el.getAnimations().forEach(a=>a.finish()))")

    def element(self, selector):
        return self.command('WebDriver:FindElement', {'using': 'css selector', 'value': selector})['value'][ELEMENT]

    def click(self, selector):
        self.command('WebDriver:ElementClick', {'id': self.element(selector)})
        time.sleep(.05)

    def type(self, selector, value):
        self.command('WebDriver:ElementSendKeys', {'id': self.element(selector), 'text': value})

    def screenshot(self, path):
        value = self.command('WebDriver:TakeScreenshot', {'full': False, 'scroll': False})
        path.write_bytes(base64.b64decode(value['value'] if isinstance(value, dict) else value))

    def close(self):
        self.command('WebDriver:DeleteSession')
        self.socket.close()


GEOMETRY = '''
const rect = el => {const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
const doc=document.documentElement,dialog=document.querySelector('dialog[open]');
const timer=document.querySelector('#timer-banner');
let footer=null,body=null,header=null;
if(dialog){footer=dialog.querySelector('.dialog-footer');body=dialog.querySelector('.dialog-body');header=dialog.querySelector('.dialog-top')}
return {width:innerWidth,height:innerHeight,client:doc.clientWidth,scroll:doc.scrollWidth,
 dialog:dialog?{rect:rect(dialog),footer:footer?rect(footer):null,body:body?rect(body):null,header:rect(header)}:null,
 timer:getComputedStyle(timer).display==='none'?null:rect(timer),
 horizontalContainers:[...document.querySelectorAll('.workspace,#surface,.detail,.board-card,.lane,.dialog-body,.folio-entry,.settings-section')].filter(el=>el.getBoundingClientRect().width&&el.scrollWidth>el.clientWidth+1).map(el=>({id:el.id,cls:el.className,scroll:el.scrollWidth,client:el.clientWidth})),
 cards:document.querySelectorAll('.board-card').length,tasks:document.querySelectorAll('.task-row').length};
'''

LONG_CONTENT = '''
 tasks[0].title='Investigate_'+'Repository'.repeat(30);
 tasks[0].project='LongProject'.repeat(12);
 tasks[0].next='Context'.repeat(90);
 tasks[0].notes[0].text='Note'.repeat(300);
 profileIdentity.name='Developer'.repeat(12);
 profileIdentity.bio='Biography'.repeat(80);
 profileOutcomes[0].title='Outcome'.repeat(80);
 profileOutcomes[0].project='Project'.repeat(60);
 render();
'''


def check_geometry(browser, label, report):
    g = browser.script(GEOMETRY)
    assert g['scroll'] <= g['client'] + 1, (label, 'horizontal page overflow', g)
    assert not g['horizontalContainers'], (label, 'horizontal content overflow', g['horizontalContainers'])
    if '200-percent-zoom' in label:
        expected=int(label.split(':')[1])/2
        assert abs(g['width']-expected)<=1, (label, 'browser zoom was not applied', g['width'],expected)
    if g['timer']:
        t = g['timer']
        assert t['x'] >= 0 and t['right'] <= g['width'] + 1, (label, 'timer horizontal bounds', t)
        assert t['y'] >= -1 and t['bottom'] <= g['height'] + 1, (label, 'timer vertical bounds', t)
    if g['dialog']:
        d = g['dialog']
        assert d['rect']['x'] >= -1 and d['rect']['right'] <= g['width'] + 1, (label, 'dialog width', d)
        assert d['rect']['y'] >= -1 and d['rect']['bottom'] <= g['height'] + 1, (label, 'dialog height', d)
        if d['footer']:
            assert d['footer']['bottom'] <= g['height'] + 1, (label, 'footer unreachable', d)
            assert d['body']['height'] > 25, (label, 'dialog body has no space', d)
            before = d['footer']['y']
            browser.script("document.querySelector('dialog[open] .dialog-body').scrollTop=10000")
            assert abs(browser.script("return document.querySelector('dialog[open] .dialog-footer').getBoundingClientRect().y")-before) < 1, (label, 'footer moves with scroll')
    report.append({'case': label, 'css_width': g['width'], 'css_height': g['height'], 'page_overflow': False})


def run(browser, output):
    report = []
    scenes = ['first-use', 'single', 'busy', 'large', 'large-board', 'profile', 'long-profile', 'settings', 'edit', 'profile-edit', 'maximized']
    for width, height in [(320, 700), (390, 600), (390, 844), (768, 1000), (1024, 900), (1440, 1000)]:
        browser.viewport(width, height)
        for scene in scenes:
            browser.load(scene)
            check_geometry(browser, f'{scene}:{width}x{height}', report)
        for scene in ['large', 'large-board', 'profile']:
            browser.load(scene)
            browser.page(LONG_CONTENT)
            check_geometry(browser, f'long-content:{scene}:{width}', report)
    for zoom_width in [640,1280]:
        for scene in ['large', 'large-board', 'profile', 'settings', 'edit', 'profile-edit', 'maximized']:
            browser.viewport(zoom_width, 1000, zoom=2)
            browser.load(scene)
            browser.page(LONG_CONTENT)
            check_geometry(browser, f'200-percent-zoom:{zoom_width}:{scene}', report)
    for width in [320,768,1440]:
        browser.viewport(width,900)
        for featured_count in [0,1,3]:
            browser.load('profile')
            browser.page(f"profileOutcomes.forEach((o,i)=>o.featured=i<{featured_count});profileIdentity.website='';profileIdentity.github='';publicProfile=true;shareRhythm=true;render()")
            check_geometry(browser,f'profile:{featured_count}-featured:{width}',report)
            assert browser.script("return document.querySelectorAll('.folio-entry').length") == featured_count
    browser.viewport(1440, 1000)
    browser.load('large')
    assert browser.page('tasks.length') == 100
    timings=browser.page("Array.from({length:5},()=>{const start=performance.now();render();return performance.now()-start})")
    print('100-task render timings (ms): '+', '.join(f'{n:.1f}' for n in timings),flush=True)
    # Preserve a scrolled list across selection and timer-driven rerenders.
    browser.script("document.querySelector('.task-list').scrollTop=700")
    before = browser.script("return document.querySelector('.task-list').scrollTop")
    browser.page('selected=18;render()')
    assert browser.script("return document.querySelector('.task-list').scrollTop") == before, 'list scroll resets on selection'
    browser.click('#focus-selected')
    browser.click('#pause')
    assert browser.script("return document.querySelector('.task-list').scrollTop") == before, 'list scroll resets on pause'
    browser.click('#end')
    # Draft survival uses native typing/clicks rather than a mocked document.
    browser.type('#note', 'Remember this before switching')
    browser.page("selected=2;render();selected=18;render()")
    assert browser.script("return document.querySelector('#note').value") == 'Remember this before switching'
    browser.click('#edit')
    browser.type('#dialog-note', 'Editor draft')
    browser.click('[data-close="edit-dialog"]')
    browser.click('#edit')
    assert browser.script("return document.querySelector('#dialog-note').value") == 'Editor draft'
    browser.click('[data-close="edit-dialog"]')
    # Check column scrolling, sticky headings, and a dropdown-driven move.
    browser.page("view='board';render()")
    browser.script("document.querySelector('[data-drop=ready]').scrollTop=400")
    before = browser.script("return document.querySelector('[data-drop=ready]').scrollTop")
    browser.page("moveTask(5,'inbox')")
    assert browser.script("return document.querySelector('[data-drop=ready]').scrollTop") == before, 'column scroll resets'
    sticky = browser.script("const lane=document.querySelector('[data-drop=ready]');const h=lane.querySelector('h3');return {lane:lane.getBoundingClientRect().top,header:h.getBoundingClientRect().top}")
    assert abs(sticky['lane']-sticky['header']) <= 2, ('column heading does not stay visible', sticky)
    browser.load('large-board')
    grip = browser.element('[data-task="4"] .card-grip')
    target = browser.element('[data-drop="ready"] h3')
    browser.command('WebDriver:PerformActions', {'actions':[{'type':'pointer','id':'drag-mouse','parameters':{'pointerType':'mouse'},'actions':[
        {'type':'pointerMove','origin':{ELEMENT:grip},'x':0,'y':0},
        {'type':'pointerDown','button':0},{'type':'pause','duration':100},
        {'type':'pointerMove','origin':{ELEMENT:target},'x':0,'y':30,'duration':700},
        {'type':'pause','duration':150},{'type':'pointerUp','button':0}]}]})
    browser.command('WebDriver:ReleaseActions')
    assert browser.page('tasks.find(t=>t.id===4).status') == 'ready', 'native card drag does not move task'
    browser.click('[data-task="99"] > button')
    assert browser.script("return document.querySelector('#inspect-dialog').open")
    browser.click('[data-close="inspect-dialog"]')
    browser.load('large')
    browser.click('#heading')
    browser.command('WebDriver:PerformActions', {'actions':[{'type':'key','id':'shortcuts','actions':[{'type':'keyDown','value':'/'},{'type':'keyUp','value':'/'}]}]})
    browser.command('WebDriver:ReleaseActions')
    assert browser.script('return document.activeElement.id') == 'task-search'
    # Resize a closed phone chooser to desktop; its contents must become visible.
    browser.viewport(390, 844)
    browser.load('large')
    assert not browser.script("return document.querySelector('#task-chooser').open")
    assert browser.script("return getComputedStyle(document.querySelector('#filter-selects')).display") == 'none'
    browser.click('#mobile-filter-toggle')
    assert browser.script("return getComputedStyle(document.querySelector('#filter-selects')).display") != 'none'
    browser.viewport(1024, 900)
    time.sleep(.1)
    assert browser.script("return document.querySelector('#task-chooser').open"), 'task chooser disappears after resize'
    # Phone entry hides the floating timer, keeping inputs clear; focus continues.
    browser.viewport(390, 844)
    browser.load('large')
    browser.click('#focus-selected')
    assert browser.page('timerPanel') == 'minimized'
    browser.type('#note', 'Phone draft')
    assert browser.script("return getComputedStyle(document.querySelector('#timer-banner')).display") == 'none'
    assert browser.page('timer') is not None
    browser.script("document.querySelector('#note').blur()")
    time.sleep(.1)
    assert browser.script("return getComputedStyle(document.querySelector('#timer-banner')).display") != 'none'
    # Emulate keyboard visual-viewport contraction and exercise the real layout path.
    browser.type('#note',' while typing')
    browser.script("window.eval(\"Object.defineProperty(window.visualViewport,'height',{configurable:true,value:350});updateViewportSpace()\")")
    time.sleep(.1)
    keyboard=browser.script("const area=document.querySelector('.workspace').getBoundingClientRect();const note=document.querySelector('#note').getBoundingClientRect();return {bottom:area.bottom,top:area.top,noteCenter:(note.top+note.bottom)/2}")
    assert keyboard['bottom']<=351, ('keyboard covers content viewport',keyboard)
    assert keyboard['top']<=keyboard['noteCenter']<=keyboard['bottom'], ('focused note is outside keyboard-safe viewport',keyboard)
    browser.script("window.eval(\"delete window.visualViewport.height;updateViewportSpace()\");document.querySelector('#note').blur()")
    time.sleep(.1)
    browser.click('#edit')
    browser.type('#dialog-note','Keyboard-safe editor')
    browser.script("window.eval(\"Object.defineProperty(window.visualViewport,'height',{configurable:true,value:350});updateViewportSpace()\")")
    time.sleep(.1)
    assert browser.script("return document.querySelector('#edit-dialog .dialog-footer').getBoundingClientRect().bottom")<=351, 'editor footer is covered by keyboard'
    browser.script("window.eval('delete window.visualViewport.height;updateViewportSpace()')")
    browser.click('[data-close="edit-dialog"]')
    # Completion/recovery preserves the distinct timer/task lifecycles.
    browser.click('#end')
    browser.click('#complete')
    assert browser.script("return document.querySelector('#completion-dialog').open")
    assert browser.page('tasks[0].status') == 'done'
    browser.click('#completion-note')
    assert browser.script("return document.querySelector('#edit-dialog').open")
    browser.click('[data-close="edit-dialog"]')
    browser.page("view='board';render();inspectTask(1)")
    browser.click('#inspect-work')
    assert browser.page('tasks[0].status') == 'ready'
    assert browser.page('timer') is None
    # Live timer progress must tick without rebuilding controls or losing focus.
    browser.viewport(1440,1000)
    browser.load('running')
    browser.script("document.querySelector('#pause').focus()")
    before=browser.page('seconds')
    time.sleep(1.2)
    after=browser.page('seconds')
    assert after < before, 'countdown is not advancing'
    assert browser.script("return document.querySelector('#pause')===document.activeElement"), 'timer tick steals control focus'
    progress=browser.script("return document.querySelector('.focus-meter span').style.transform")
    expected=browser.page('1-seconds/duration')
    assert abs(float(progress.removeprefix('scaleX(').removesuffix(')'))-expected)<.00001, 'progress meter is stale'
    assert browser.script("return Number(document.querySelector('.focus-meter').getAttribute('aria-valuenow'))")==round(expected*100), 'accessible progress is stale'
    browser.click('#pause')
    stopped=browser.page('seconds')
    time.sleep(1.2)
    assert browser.page('seconds')==stopped, 'paused progress keeps advancing'
    browser.click('#end')
    assert browser.script("return document.querySelector('.focus-meter')") is None, 'idle timer retains session progress'
    # Capture stable screenshots at representative sizes.
    for scene, width, height in [('large-board',1440,1000),('large',390,844),('long-profile',390,1000),('settings',320,700)]:
        browser.viewport(width,height)
        browser.load(scene)
        browser.command('WebDriver:PerformActions', {'actions':[{'type':'pointer','id':'screenshot-mouse','parameters':{'pointerType':'mouse'},'actions':[{'type':'pointerMove','origin':'viewport','x':0,'y':0}]}]})
        browser.command('WebDriver:ReleaseActions')
        browser.screenshot(output / f'{scene}-{width}.png')
    (output / 'results.json').write_text(json.dumps({'geometry_cases': report, 'interaction_checks': 'passed', 'render_timings_ms': timings}, indent=2))
    print(f'PASS: {len(report)} rendered geometry cases plus browser interaction checks.', flush=True)
    print(f'Evidence: {output}', flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--connect', type=int)
    parser.add_argument('--output', type=Path, default=Path('/tmp/pomogit-scaling-review'))
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    process = None
    with tempfile.TemporaryDirectory(prefix='pomogit-scaling-') as profile:
        if args.connect:
            port = args.connect
        else:
            if not shutil.which('firefox'):
                raise SystemExit('Firefox is required for this local audit')
            with socket.socket() as reserve:
                reserve.bind(('127.0.0.1', 0))
                port = reserve.getsockname()[1]
            Path(profile, 'user.js').write_text(f'user_pref("marionette.port", {port});\nuser_pref("browser.shell.checkDefaultBrowser", false);\n')
            process = subprocess.Popen(['firefox','--headless','--no-remote','--marionette','--remote-allow-system-access','--profile',profile,'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            for _ in range(100):
                try:
                    with socket.create_connection(('127.0.0.1',port),timeout=.1):
                        break
                except OSError:
                    time.sleep(.1)
            else:
                process.terminate()
                raise RuntimeError('Firefox automation did not start')
        browser = None
        try:
            browser = Browser(port)
            run(browser, args.output)
        finally:
            if browser:
                browser.close()
            if process:
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()


if __name__ == '__main__':
    main()
