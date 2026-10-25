import os, shutil, hashlib, json
# Works from the repository (python3 src/build.py) or from the original work folder.
B=os.path.dirname(os.path.abspath(__file__))+'/'
IN_REPO=os.path.basename(B.rstrip('/'))=='src'
OUT=os.path.normpath(B+'..')+'/' if IN_REPO else '/home/claude/draft-it/'
FONTS='<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans:wght@400;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Sans+Kannada:wght@400;600;700&family=Noto+Sans+Tamil:wght@400;600;700&family=Noto+Sans+Telugu:wght@400;600;700&display=swap">\n'
css=open(B+'style.css').read()
SRC=['i18n.js','i18n2.js','i18n3.js','i18n4.js','i18n5.js','i18n6.js','i18n7.js','i18n8.js','seed_tr.js','audio.js','app.js']
js=''.join(open(B+f).read()+'\n' for f in SRC)
# version stamp: same for the same sources; the app compares it with version.json to pick up updates
BUILD=hashlib.sha256((open(B+'style.css').read()+js).encode()).hexdigest()[:8]
js=js.replace('__DRAFTIT_BUILD__',BUILD)
BODY='''<div class="app" id="app"></div>
<div id="sheetWrap" hidden><div class="scrim" data-act="closeSheet"></div><div class="sheet" id="sheet" role="dialog" aria-modal="true"></div></div>
<div id="toast" role="status" hidden></div>
'''
# 1. Claude artifact (fragment; the host adds the document skeleton)
art='<title>DraftIt</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'+FONTS+'<style>'+css+'</style>\n'+BODY+'<script>'+js+'</script>'
if not IN_REPO: open('/home/claude/pakka/index.html','w').write(art)
# 2. Standalone web app / PWA
ver=hashlib.sha256((css+js).encode()).hexdigest()[:10]
page=f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>DraftIt: WhatsApp deals to signed agreements</title>
<meta name="description" content="Turn WhatsApp deals, voice notes and bills into clear, signed agreements that hold up in India. Six languages.">
<meta name="theme-color" content="#0B2E63">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="DraftIt">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icons/favicon-64.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
{FONTS}<style>{css}</style>
</head>
<body>
{BODY}<script src="config.js"></script>
<script src="vendor/supabase.js"></script>
<script>{js}</script>
<script>
/* DraftIt runs online only. The service worker below caches nothing: it exists so the app can be
   installed on laptops and phones, and so files shared to DraftIt (Android share sheet) reach the snip tool. */
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{{}});
if(window.caches) caches.keys().then(ks=>ks.forEach(k=>{{ if(!/draftit-share|transformers/.test(k)) caches.delete(k); }})).catch(()=>{{}});
</script>
</body>
</html>
'''
os.makedirs(OUT,exist_ok=True)
open(OUT+'index.html','w').write(page)
manifest={"name":"DraftIt","short_name":"DraftIt","description":"Turn WhatsApp deals into clear, signed agreements.","start_url":"./","scope":"./","display":"standalone","display_override":["window-controls-overlay","standalone"],"orientation":"any","background_color":"#0B2E63","theme_color":"#0B2E63","lang":"en-IN","categories":["business","productivity"],"share_target":{"action":"./share","method":"POST","enctype":"multipart/form-data","params":{"title":"title","text":"text","files":[{"name":"files","accept":["image/*","text/plain",".txt"]}]}},
 "icons":[{"src":"icons/icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icons/icon-512.png","sizes":"512x512","type":"image/png"},{"src":"icons/maskable-512.png","sizes":"512x512","type":"image/png","purpose":"maskable"}]}
open(OUT+'manifest.webmanifest','w').write(json.dumps(manifest,indent=2))
open(OUT+'sw.js','w').write(r'''/* DraftIt service worker: network only, no offline cache.
   It takes files shared to the installed app and hands them to the snip tool. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil((async()=>{
  for(const k of await caches.keys()) if(!/draftit-share|transformers/.test(k)) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method==='POST'&&u.pathname.endsWith('/share')){
    e.respondWith((async()=>{
      try{
        const f=await e.request.formData(), c=await caches.open('draftit-share'); let i=0;
        for(const file of f.getAll('files')){ if(!file||!file.size) continue; await c.put('shared-'+Date.now()+'-'+(i++),new Response(file,{headers:{'content-type':file.type||'application/octet-stream','x-name':encodeURIComponent(file.name||'')}})); }
        const txt=[f.get('title'),f.get('text')].filter(Boolean).join('\n').trim();
        if(txt) await c.put('shared-'+Date.now()+'-t',new Response(txt,{headers:{'content-type':'text/plain','x-name':'Shared%20text'}}));
      }catch(err){}
      return Response.redirect(new URL('./?share=1',self.registration.scope).href,303);
    })());
  }
});
''')
if not os.path.exists(OUT+'config.js'):
    open(OUT+'config.js','w').write("/* DraftIt online storage. Paste your Supabase Project URL and anon public key (Supabase: Project Settings > API).\n   The anon key is safe to publish: row-level security in supabase/schema.sql keeps each account's data private. */\nwindow.DRAFTIT_CONFIG = {\n  supabaseUrl: '',\n  supabaseAnonKey: ''\n};\n")
open(OUT+'.nojekyll','w').write('')
open(OUT+'version.json','w').write(json.dumps({'v':BUILD}))
os.makedirs(OUT+'src',exist_ok=True)
if not IN_REPO:
    for f in SRC+['style.css','build.py']: shutil.copy(B+f,OUT+'src/'+f)
print('artifact',len(art),'standalone',len(page),'ver',ver)
