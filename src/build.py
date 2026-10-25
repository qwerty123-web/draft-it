import os, shutil, hashlib, json
HERE=os.path.dirname(os.path.abspath(__file__))
B=HERE+'/'
OUT=os.path.dirname(HERE)+'/'
FONTS='<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Sans+Kannada:wght@400;600;700&family=Noto+Sans+Tamil:wght@400;600;700&family=Noto+Sans+Telugu:wght@400;600;700&display=swap">\n'
css=open(B+'style.css').read()
SRC=['i18n.js','i18n2.js','i18n3.js','i18n4.js','i18n5.js','seed_tr.js','audio.js','app.js']
js=''.join(open(B+f).read()+'\n' for f in SRC)
BODY='''<div class="app" id="app"></div>
<div id="sheetWrap" hidden><div class="scrim" data-act="closeSheet"></div><div class="sheet" id="sheet" role="dialog" aria-modal="true"></div></div>
<div id="toast" role="status" hidden></div>
'''
# 2. Standalone web app / PWA
ver=hashlib.sha256((css+js).encode()).hexdigest()[:10]
page=f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Draft It: WhatsApp deals to signed agreements</title>
<meta name="description" content="Turn WhatsApp deals, voice notes and bills into clear, signed agreements that hold up in India. Six languages.">
<meta name="theme-color" content="#0B2E63">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Draft It">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icons/favicon-64.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
{FONTS}<style>{css}</style>
</head>
<body>
{BODY}<script>{js}</script>
<script>
if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')){{
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{{}}));
}}
</script>
</body>
</html>
'''
os.makedirs(OUT,exist_ok=True)
open(OUT+'index.html','w').write(page)
manifest={"name":"Draft It","short_name":"Draft It","description":"Turn WhatsApp deals into clear, signed agreements.","start_url":"./","scope":"./","display":"standalone","orientation":"portrait","background_color":"#0B2E63","theme_color":"#0B2E63","lang":"en-IN","categories":["business","productivity"],
 "icons":[{"src":"icons/icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icons/icon-512.png","sizes":"512x512","type":"image/png"},{"src":"icons/maskable-512.png","sizes":"512x512","type":"image/png","purpose":"maskable"}]}
open(OUT+'manifest.webmanifest','w').write(json.dumps(manifest,indent=2))
sw=f'''/* Draft It offline cache, version {ver} */
const CACHE='draft-it-{ver}';
const CORE=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png','./icons/apple-touch-icon.png','./icons/favicon-64.png'];
self.addEventListener('install',e=>{{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())); }});
self.addEventListener('activate',e=>{{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); }});
self.addEventListener('fetch',e=>{{
  const r=e.request; if(r.method!=='GET') return;
  const u=new URL(r.url);
  if(u.hostname==='api.anthropic.com') return;
  if(r.mode==='navigate'){{ e.respondWith(fetch(r).then(res=>{{ const cp=res.clone(); caches.open(CACHE).then(c=>c.put('./index.html',cp)); return res; }}).catch(()=>caches.match('./index.html'))); return; }}
  e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{{ if(res.ok&&(u.origin===location.origin||/fonts\\.(googleapis|gstatic)\\.com|cdnjs\\.cloudflare\\.com|cdn\\.jsdelivr\\.net/.test(u.hostname))){{ const cp=res.clone(); caches.open(CACHE).then(c=>c.put(r,cp)); }} return res; }})));
}});
'''
open(OUT+'sw.js','w').write(sw)
open(OUT+'.nojekyll','w').write('')
print('built index.html',len(page),'bytes, cache version',ver)
