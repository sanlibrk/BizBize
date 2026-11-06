import subprocess, pathlib, time, re, xml.etree.ElementTree as ET
root=pathlib.Path('android-screens');root.mkdir(exist_ok=True)
def adb(*args):return subprocess.check_output(['adb',*args])
def capture(name): (root/name).write_bytes(adb('exec-out','screencap','-p'))
def find(label):
    adb('shell','uiautomator','dump','/sdcard/ui.xml')
    raw=adb('shell','cat','/sdcard/ui.xml').decode()
    (root/'last-ui.xml').write_text(raw)
    for n in ET.fromstring(raw).iter('node'):
        if label.casefold() in (n.get('text','')+' '+n.get('content-desc','')).casefold():
            a=list(map(int,re.findall(r'\d+',n.get('bounds',''))))
            if len(a)==4 and a[3]>a[1]:return a
def tap(label,timeout=30):
    end=time.time()+timeout
    while time.time()<end:
        a=find(label)
        if a:
            adb('shell','input','tap',str((a[0]+a[2])//2),str((a[1]+a[3])//2));return
        time.sleep(2)
    capture('error.png');raise RuntimeError('Missing control: '+label)
end=time.time()+120
while time.time()<end:
    if find('SADECE İKİNİZE') or find('Aynı hikâyenin'):break
    for label in ['Continue','Got it','Dismiss']:
        if find(label):tap(label,5)
    time.sleep(3)
else:
    capture('error.png');raise RuntimeError('Native welcome did not appear')
capture('01-welcome.png')
for _ in range(4):
    if find('Örnek dünyayı keşfet'):break
    adb('shell','input','swipe','500','1800','500','650','350')
tap('Örnek dünyayı keşfet');tap('Harita',60);time.sleep(5);capture('02-map.png')
tap('Mesajlar');time.sleep(2);capture('03-messages.png')
tap('Albüm');time.sleep(3);capture('04-album.png')
(root/'README.txt').write_text('Real API35 Android emulator / Expo Go SDK58. Sample preview; not live GPS.\n')
