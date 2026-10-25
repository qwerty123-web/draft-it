import os, shutil, hashlib, json
B='/home/claude/pakka2/'
OUT='/home/claude/draft-it/'
FONTS='<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Sans+Kannada:wght@400;600;700&family=Noto+Sans+Tamil:wght@400;600;700&family=Noto+Sans+Telugu:wght@400;600;700&display=swap">\n'
css=open(B+'style.css').read()
SRC=['i18n.js','i18n2.js','i18n3.js','i18n4.js','i18n5.js','i18n6.js','seed_tr.js','audio.js','app.js']
js=''.join(open(B+f).read()+'\n' for f in SRC)
BODY='''<div class="app" id="app"></div>
<div id="sheetWrap" hidden><div class="scrim" data-act="closeSheet"></div><div class="sheet" id="sheet" role="dialog" aria-modal="true"></div></div>
<div id="toast" role="status" hidden></div>
'''
# 1. Claude artifact (fragment; the host adds the document skeleton)
art='<title>Draft It</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n'+FONTS+'<style>'+css+'</style>\n'+BODY+'<script>'+js+'</script>'
open('/home/claude/pakka/index.html','w').write(art)
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
{BODY}<script src="config.js"></script>
<script src="vendor/supabase.js"></script>
<script>{js}</script>
<script>
/* Draft It runs online only: remove any older offline cache */
if('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{{}});
if(window.caches) caches.keys().then(ks=>ks.forEach(k=>caches.delete(k))).catch(()=>{{}});
</script>
</body>
</html>
'''
os.makedirs(OUT,exist_ok=True)
open(OUT+'index.html','w').write(page)
manifest={"name":"Draft It","short_name":"Draft It","description":"Turn WhatsApp deals into clear, signed agreements.","start_url":"./","scope":"./","display":"standalone","orientation":"portrait","background_color":"#0B2E63","theme_color":"#0B2E63","lang":"en-IN","categories":["business","productivity"],
 "icons":[{"src":"icons/icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icons/icon-512.png","sizes":"512x512","type":"image/png"},{"src":"icons/maskable-512.png","sizes":"512x512","type":"image/png","purpose":"maskable"}]}
open(OUT+'manifest.webmanifest','w').write(json.dumps(manifest,indent=2))
if os.path.exists(OUT+'sw.js'): os.remove(OUT+'sw.js')
if not os.path.exists(OUT+'config.js'):
    open(OUT+'config.js','w').write("/* Draft It online storage. Paste your Supabase Project URL and anon public key (Supabase: Project Settings > API).\n   The anon key is safe to publish: row-level security in supabase/schema.sql keeps each account's data private. */\nwindow.DRAFTIT_CONFIG = {\n  supabaseUrl: '',\n  supabaseAnonKey: ''\n};\n")
open(OUT+'.nojekyll','w').write('')
os.makedirs(OUT+'src',exist_ok=True)
for f in SRC+['style.css','build.py']: shutil.copy(B+f,OUT+'src/'+f)
print('artifact',len(art),'standalone',len(page),'ver',ver)
