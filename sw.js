/* DraftIt service worker: network only, no offline cache.
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
