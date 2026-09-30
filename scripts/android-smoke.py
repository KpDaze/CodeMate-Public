"""Native Android smoke evidence. This does not certify gesture/visual parity."""
import json
import os
from pathlib import Path
import re
import subprocess
import time
import xml.etree.ElementTree as ET

out = Path('verification')
out.mkdir(exist_ok=True)
checks = []

def adb(*args, binary=False):
    return subprocess.check_output(['adb', *args], text=not binary)

def tree():
    # uiautomator can return success with a null root during a window update.
    # Never read a previous dump and treat it as the current screen.
    last = None
    for _ in range(4):
        path = '/sdcard/codemate-ui.xml'
        try:
            adb('shell', 'rm', '-f', path)
            adb('shell', 'uiautomator', 'dump', path)
            raw = adb('shell', 'cat', path)
            return ET.fromstring(raw), raw
        except (subprocess.CalledProcessError, ET.ParseError) as error:
            last = error
            time.sleep(.5)
    raise RuntimeError('Could not read a fresh Android UI snapshot') from last

def node(label):
    root, _ = tree()
    for n in root.iter('node'):
        if label in (n.get('text'), n.get('content-desc'), n.get('resource-id')):
            return n
    raise AssertionError(f'Native control not found: {label}')

def tap(label):
    n = node(label)
    x1,y1,x2,y2 = map(int, re.findall(r'\d+', n.get('bounds')))
    adb('shell', 'input', 'tap', str((x1+x2)//2), str((y1+y2)//2))

def record(name):
    _, xml = tree()
    (out / (name+'.xml')).write_text(xml)
    (out / (name+'.png')).write_bytes(adb('exec-out','screencap','-p',binary=True))

try:
    adb('install', '-r', os.environ.get('APK_PATH', 'android/app/build/outputs/apk/release/app-release.apk'))
    adb('logcat','-c')
    adb('shell','am','start','-n','com.kpdaze.codemate/.MainActivity')
    deadline = time.monotonic()+60
    while True:
        try:
            node('Edit')
            break
        except (AssertionError, ET.ParseError, subprocess.CalledProcessError):
            if time.monotonic()>deadline:
                raise
            time.sleep(1)
    node('Good morning')
    checks.append('Native Android launch renders the existing sample page')
    record('01-canvas')
    tap('Edit')
    node('More')
    record('02-editor')
    checks.append('Edit opens the floating editor')
    tap('More')
    node('Font')
    node('Colour')
    record('03-more')
    tap('Colour')
    node('Hex')
    node('Eyedropper')
    tap('Open colour picker')
    record('04-colour')
    checks.append('Colour exposes HEX, eyedropper and the continuous picker')
    tap('More')
    tap('Font')
    node('Search fonts')
    record('05-fonts')
    checks.append('Font replaces the colour control in the same editor')
    tap('Close editor')
    tap('Layers')
    record('06-layers')
    node('Close')
    tap('Close')
    tap('Preview')
    node('Back')
    record('07-preview')
    tap('Back')
    node('Edit')
    checks.append('Layers and Preview remain accessible')
finally:
    try:
        record('smoke-final')
    except Exception as error:
        print('Final UI capture unavailable:', error, flush=True)
    capture = subprocess.run(['adb', 'logcat', '-d', '-t', '3000'], capture_output=True, text=True, timeout=45)
    (out/'logcat.txt').write_text(capture.stdout)
    if capture.returncode:
        (out/'logcat-capture-warning.txt').write_text(capture.stderr)
    (out/'smoke-result.json').write_text(json.dumps({
        'passed': checks,
        'not_verified': ['pixel/visual parity with ZIP','direct dragging and sibling crossing','all resize handles and viewport stability','content positioning gestures','floating editor dragging while canvas scrolls','eyedropper sampled output','keyboard interaction and font weights on device'],
    }, indent=2))
