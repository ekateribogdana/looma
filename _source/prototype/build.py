# Сборка прототипа: картинки — отдельными файлами в img/ рядом с index.html (раньше были data:URI внутри HTML, ~3.9 МБ, на мобильном долго не открывалось)
import json,re,sys,os,base64,hashlib
t=open('app.html',encoding='utf-8').read(); imgs=json.load(open('imgs.json'))
out=sys.argv[1]; d=os.path.join(os.path.dirname(os.path.abspath(out)),'img'); os.makedirs(d,exist_ok=True)
ext={'image/jpeg':'jpg','image/png':'png','image/svg+xml':'svg','image/webp':'webp','image/gif':'gif'}
names={}
for k,v in imgs.items():
    m=re.match(r'data:([\w/+.-]+);base64,(.*)',v,re.S)
    if not m: names[k]=v; continue
    data=base64.b64decode(m.group(2)); h=hashlib.sha1(data).hexdigest()[:8]
    fn=f'{k.lower()}-{h}.{ext.get(m.group(1),"bin")}'
    p=os.path.join(d,fn)
    if not os.path.exists(p): open(p,'wb').write(data)
    names[k]='img/'+fn
res=re.sub(r'\{\{(IMG\d{3})\}\}',lambda m:names[m.group(1)],t)
open(out,'w',encoding='utf-8').write(res); print(len(res))
