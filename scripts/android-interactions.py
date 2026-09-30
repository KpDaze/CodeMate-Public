"""Exercise native gestures against a built APK, recording actual UI evidence."""
import json
import os
from pathlib import Path
import re
import subprocess
import time
import traceback
import xml.etree.ElementTree as ET

out = Path('verification')
out.mkdir(exist_ok=True)
results = []

def adb(*args, binary=False):
    return subprocess.check_output(['adb', *map(str, args)], text=not binary, timeout=45)

def tree():
    adb('shell', 'uiautomator', 'dump', '/sdcard/codemate-ui.xml')
    raw = adb('shell', 'cat', '/sdcard/codemate-ui.xml')
    return ET.fromstring(raw), raw

def node(label, root=None):
    if root is None:
        root, _ = tree()
    for n in root.iter('node'):
        if label in (n.get('resource-id'), n.get('content-desc'), n.get('text')):
            return n
    raise AssertionError(f'Native control not found: {label}')

def bounds(label, root=None):
    return tuple(map(int, re.findall(r'\d+', node(label, root).get('bounds'))))

def center(b):
    return ((b[0]+b[2])//2, (b[1]+b[3])//2)

def tap(label):
    adb('shell', 'input', 'tap', *center(bounds(label)))

def gesture(start, end, hold=False):
    adb('shell', 'input', 'draganddrop' if hold else 'swipe', *start, *end, 1200 if hold else 400)

def record(name):
    _, raw = tree()
    (out / (name+'.xml')).write_text(raw)
    (out / (name+'.png')).write_bytes(adb('exec-out', 'screencap', '-p', binary=True))

def reset():
    adb('shell', 'am', 'force-stop', 'com.kpdaze.codemate')
    adb('shell', 'am', 'start', '-n', 'com.kpdaze.codemate/.MainActivity')
    for _ in range(8):
        try:
            node('Good morning')
            return
        except AssertionError:
            time.sleep(1)
    raise AssertionError('App did not relaunch')

def check(name, fn):
    print('START', name, flush=True)
    try:
        reset()
        detail = fn()
        results.append({'name': name, 'passed': True, 'detail': detail})
        print('PASS', name, detail, flush=True)
    except Exception as error:
        results.append({'name': name, 'passed': False, 'error': str(error)})
        traceback.print_exc()
    finally:
        try:
            record(name)
        except Exception as error:
            print('Evidence capture failed', error, flush=True)
        (out/'interaction-results.json').write_text(json.dumps(results, indent=2))

def scroll():
    before = bounds('element-cover')
    gesture(center(before), (center(before)[0], center(before)[1]-220))
    after = bounds('element-cover')
    assert after[1] < before[1]-80, (before, after)
    gesture((950, 600), (950, 1250))
    root,_ = tree()
    assert bounds('element-greeting', root)[1] >= 200
    node('resize-n', root)
    return {'cover_before': before, 'cover_after_scroll': after}

def across():
    before = bounds('element-greeting')
    x,y = center(before)
    gesture((x,y), (x+70,y))
    after = bounds('element-greeting')
    assert after[0] > before[0]+30, (before,after)
    assert abs(after[1]-before[1]) < 4, (before,after)
    assert abs((after[2]-after[0])-(before[2]-before[0])) < 4
    return {'before': before, 'after': after}

def reorder():
    root,_ = tree()
    b = bounds('element-greeting',root)
    intro = bounds('element-introduction',root)
    gesture(center(b),(center(b)[0],center(intro)[1]+35),hold=True)
    root,_ = tree()
    g = bounds('element-greeting',root)
    i = bounds('element-introduction',root)
    assert g[1] > i[1], (g,i)
    return {'greeting':g,'introduction':i}

def resize(edge):
    root,_ = tree()
    b = bounds('element-greeting',root)
    x,y = center(bounds('resize-'+edge,root))
    dx = -60 if 'e' in edge else 60 if 'w' in edge else 0
    dy = 50 if 'n' in edge or 's' in edge else 0
    gesture((x,y),(x+dx,y+dy))
    a = bounds('element-greeting')
    if dx:
        assert b[2]-b[0]-(a[2]-a[0]) > 20, (b,a)
    if dy:
        assert abs((b[3]-b[1])-(a[3]-a[1])) > 15, (b,a)
    if 'n' in edge:
        assert abs(a[3]-b[3]) < 5, ('bottom anchor/viewport',b,a)
    else:
        assert abs(a[1]-b[1]) < 5, ('top anchor/viewport',b,a)
    return {'before':b,'after':a}

def floating():
    tap('edit')
    root,_ = tree()
    b = bounds('floating-editor',root)
    x,y = center(bounds('editor-drag',root))
    gesture((x,y),(x+60,y+160))
    a = bounds('floating-editor')
    assert a[1] > b[1]+80, (b,a)
    cover = bounds('element-cover')
    gesture((970,950),(970,650))
    root,_ = tree()
    c = bounds('floating-editor',root)
    assert all(abs(v-w)<4 for v,w in zip(a,c)), (a,c)
    assert bounds('element-cover',root)[1] < cover[1]-100
    return {'before':b,'after_drag':a,'after_scroll':c}

def content():
    x,y = center(bounds('resize-s'))
    gesture((x,y),(x,y+180))
    b = bounds('Good morning')
    frame = bounds('element-greeting')
    x,y = center(b)
    gesture((x,y),(x,y+110),hold=True)
    a = bounds('Good morning')
    f = bounds('element-greeting')
    assert a[1] > b[1]+40, (b,a)
    assert all(abs(v-w)<4 for v,w in zip(frame,f)),(frame,f)
    return {'words_before':b,'words_after':a,'box':f}

def colour():
    tap('edit'); tap('more'); tap('control-colour'); tap('Open colour picker')
    before = node('hex').get('text')
    h = bounds('hue'); sv = bounds('sv')
    adb('shell','input','tap',h[0]+int((h[2]-h[0])*.30),center(h)[1])
    adb('shell','input','tap',sv[0]+int((sv[2]-sv[0])*.65),sv[1]+int((sv[3]-sv[1])*.35))
    picked = node('hex').get('text')
    assert picked != before and re.fullmatch(r'#[0-9a-fA-F]{6}',picked), (before,picked)
    tap('hex')
    adb('shell','input','keyevent','KEYCODE_MOVE_END',*(['KEYCODE_DEL']*8))
    adb('shell','input','text','336699')
    adb('shell','input','keyevent','KEYCODE_BACK')
    exact = node('hex').get('text')
    assert exact.lstrip('#').lower() == '336699', exact
    record('hex-edit')
    tap('Eyedropper')
    cover = bounds('element-cover')
    # Visible sunset sun center, derived from the observed native SVG geometry.
    adb('shell','input','tap',829,625)
    sampled = node('hex').get('text')
    assert sampled.lower() == '#ffe7b3', sampled
    return {'initial':before,'picker':picked,'exact_hex':exact,'image_sample':sampled}

adb('install','-r',os.environ['APK_PATH'])
adb('logcat','-c')
check('scroll',scroll)
check('direct-horizontal-drag',across)
check('sibling-crossing',reorder)
for edge in ['n','s','e','w','ne','nw','se','sw']:
    check('resize-'+edge,lambda e=edge: resize(e))
check('floating-editor-scroll',floating)
check('words-inside-box',content)
check('colour-sync-and-eyedropper',colour)
(out/'logcat.txt').write_text(adb('logcat','-d'))
if any(not r['passed'] for r in results):
    raise SystemExit(1)
