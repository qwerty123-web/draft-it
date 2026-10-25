(function(){
'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const p2=n=>String(n).padStart(2,'0');
const TZ='+05:30';
function nowISO(){ const d=new Date(Date.now()+5.5*3600e3); return d.toISOString().slice(0,19)+TZ; }
function todayYMD(){ return nowISO().slice(0,10); }
function dayDiff(ymd){ return Math.round((Date.parse(ymd+'T00:00:00Z')-Date.parse(todayYMD()+'T00:00:00Z'))/864e5); }
const rupee=n=>'₹'+Number(n).toLocaleString('en-IN');

/* ---------- SHA-256 ---------- */
function sha256js(msg){
  const K=[],H=[]; let n=2,c=0;
  while(c<64){ let pr=true; for(let f=2;f*f<=n;f++){ if(n%f===0){pr=false;break;} } if(pr){ if(c<8) H[c]=(Math.pow(n,.5)*4294967296)|0; K[c]=(Math.pow(n,1/3)*4294967296)|0; c++; } n++; }
  const l=msg.length, total=Math.ceil((l+9)/64)*64, m=new Uint8Array(total); m.set(msg); m[l]=0x80;
  const dv=new DataView(m.buffer); dv.setUint32(total-4,(l*8)>>>0); dv.setUint32(total-8,Math.floor(l*8/4294967296));
  let h=H.slice(); const w=new Array(64);
  for(let i=0;i<total;i+=64){
    for(let t=0;t<16;t++) w[t]=dv.getUint32(i+t*4);
    for(let t=16;t<64;t++){ const a=w[t-15],b=w[t-2]; const s0=((a>>>7)|(a<<25))^((a>>>18)|(a<<14))^(a>>>3), s1=((b>>>17)|(b<<15))^((b>>>19)|(b<<13))^(b>>>10); w[t]=(w[t-16]+s0+w[t-7]+s1)|0; }
    let [a,b,cc,d,e,f,g,hh]=h;
    for(let t=0;t<64;t++){ const S1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)), ch=(e&f)^(~e&g), t1=(hh+S1+ch+K[t]+w[t])|0; const S0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)), mj=(a&b)^(a&cc)^(b&cc), t2=(S0+mj)|0; hh=g; g=f; f=e; e=(d+t1)|0; d=cc; cc=b; b=a; a=(t1+t2)|0; }
    h=[(h[0]+a)|0,(h[1]+b)|0,(h[2]+cc)|0,(h[3]+d)|0,(h[4]+e)|0,(h[5]+f)|0,(h[6]+g)|0,(h[7]+hh)|0];
  }
  return h.map(x=>(x>>>0).toString(16).padStart(8,'0')).join('');
}
async function sha256Bytes(bytes){ try{ if(window.crypto&&crypto.subtle){ const b=await crypto.subtle.digest('SHA-256',bytes); return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join(''); } }catch(e){} return sha256js(bytes); }
const sha256Text=s=>sha256Bytes(new TextEncoder().encode(s));
function canon(v){ if(Array.isArray(v)) return '['+v.map(canon).join(',')+']'; if(v&&typeof v==='object') return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canon(v[k])).join(',')+'}'; return JSON.stringify(v===undefined?null:v); }
const audioBytes=k=>{ const b=atob(AUDIO[k].split(',')[1]), u=new Uint8Array(b.length); for(let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return u; };
const shortHash=h=>h?h.slice(0,8)+'…'+h.slice(-6):'';

/* ---------- language ---------- */
const LANGS=[{c:'en',n:'English',en:'English',bcp:'en-IN'},{c:'hi',n:'हिन्दी',en:'Hindi',bcp:'hi-IN'},{c:'mr',n:'मराठी',en:'Marathi',bcp:'mr-IN'},{c:'te',n:'తెలుగు',en:'Telugu',bcp:'te-IN'},{c:'ta',n:'தமிழ்',en:'Tamil',bcp:'ta-IN'},{c:'kn',n:'ಕನ್ನಡ',en:'Kannada',bcp:'kn-IN'}];
const LI={en:0,hi:1,mr:2,te:3,ta:4,kn:5};
const langOf=c=>LANGS.find(l=>l.c===c)||LANGS[0];
function t(k,p){ const r=I18N[k]; let s=r?(r[LI[S.settings.lang]]||r[0]):k; if(p) for(const x in p) s=s.split('{'+x+'}').join(p[x]); return s; }
const en=k=>I18N[k][0];
const STATIC_TX={};
/* Hindi translations for the demo content, registered next to the English text so they always match */
const HI={};
const L=(e,h)=>{ HI[e]=h; return e; };
function tx(s){ if(!s) return s; const lg=S.settings.lang; if(lg==='en') return s; const k=STATIC_TX[s]; if(k) return t(k); const m=S.tr[lg]; return (m&&m[s])||s; }
function joinTr(parts,joined){ if(parts.length<2) return; for(const lg in S.tr){ const m=S.tr[lg]; const tr=parts.map(p=>STATIC_TX[p]?I18N[STATIC_TX[p]][LI[lg]]:m[p]); if(tr.every(Boolean)) m[joined]=tr.join(' '); } }

/* ---------- model ---------- */
const TERM_DEFS=[
 {key:'parties',dim:'Parties'},{key:'scope',dim:'Scope'},{key:'specs',dim:'Scope'},{key:'price',dim:'Price'},{key:'tax',dim:'Price'},{key:'delivery',dim:'Delivery'},
 {key:'advance',dim:'Payment'},{key:'balance',dim:'Payment'},{key:'payment_mode',dim:'Payment'},{key:'late_penalty',dim:'Penalties'},{key:'quality',dim:'Quality'},{key:'cancellation',dim:'Liability'},{key:'disputes',dim:'Liability'},{key:'ip',dim:'Rights'},{key:'resale',dim:'Rights'}];
TERM_DEFS.forEach(d=>{ d.miss=en('mi_'+d.key); STATIC_TX[d.miss]='mi_'+d.key; });
STATIC_TX[en('notDiscussed')]='notDiscussed'; STATIC_TX[en('confirmOther')]='confirmOther'; STATIC_TX[en('oneSide')]='oneSide';
function ft(v){ if(v&&typeof v==='object'){ const p={}; for(const k in v.p||{}){ const x=v.p[k]; p[k]=typeof x==='string'&&I18N[x]?t(x):x; } return t(v.k,p); } return tx(v); }
const DIMS=['Parties','Scope','Price','Delivery','Payment','Penalties','Quality','Liability','Rights'];
const CLAUSE_DEFS=[{id:'c1',keys:['parties']},{id:'c2',keys:['scope']},{id:'c3',keys:['specs']},{id:'c4',keys:['price','tax']},{id:'c5',keys:['delivery']},{id:'c6',keys:['advance','balance','payment_mode']},{id:'c7',keys:['late_penalty']},{id:'c8',keys:['quality']},{id:'c11',keys:['ip']},{id:'c12',keys:['resale']},{id:'c9',keys:['cancellation']},{id:'c10',keys:['disputes']}];
const clauseKeys=id=>(CLAUSE_DEFS.find(x=>x.id===id)||{keys:[]}).keys;
const SCORE={agreed:1,proposed:.5,ambiguous:.5,missing:0};
const STATUS_CHIP={agreed:'c-ok',proposed:'c-warn',ambiguous:'c-warn',missing:'c-bad'};
const SEV={high:'sevHigh',medium:'sevMed',low:'sevLow'};
const LAWYERS=[{id:'l1',name:'Adv. Meera Iyer',ini:'MI',enrol:'KAR/xxxx/2016',fee:499,acct:'u_meera_1016',mobile:'9876500001'},{id:'l2',name:'Adv. Rohan Deshpande',ini:'RD',enrol:'MAH/xxxx/2014',fee:399,acct:'u_rohan_2014',mobile:'9876500002'},{id:'l3',name:'Adv. Lakshmi Narayanan',ini:'LN',enrol:'TN/xxxx/2012',fee:599,acct:'u_lakshmi_2012',mobile:'9876500003'}];
const PLATFORM_FEE=49, LISTING_FEE=999, ARTIFACT_URL='https://claude.ai/artifact/AYP4799eXMBtzTsdafLQr7';
const CATS=['printing','food','medicine','digital','electronics','textiles','construction','other'];
const CAT_RE={digital:/website|web site|\blogo\b|\bapp\b|software|seo|social media|domain|hosting|video edit/i,medicine:/medicine|tablet|pharma|\bdrugs?\b|syrup|capsule|chemist/i,electronics:/mobile phone|charger|\bled\b|cable|electronic|laptop|battery|inverter/i,textiles:/cloth|fabric|saree|shirt|uniform|textile|garment|stitch/i,printing:/print|\bbox(es)?\b|sticker|vinyl|banner|flex|carton|packag|label|signboard|\bboard\b/i,food:/sweets?\b|mithai|food|snack|grocer|kirana|\brice\b|atta|\bdal\b|masala|cater|tiffin|cake|bakery/i,construction:/cement|steel|tiles?\b|\bsand\b|brick|plumb|construction|marble/i};
const FOOD_RE=/sweets?\b|mithai|food|snack|lunch|cake|bakery|cater|tiffin|grocer/i;
const FRAUD_RE=/\b(no bill|without (a |any )?(bill|invoice)|bina bill|bill mat|bill nahi|bill not (needed|required|necessary)|no need (of|for) (a )?bill|bill (is )?not needed|no (separate )?(tax )?invoice|invoice (is )?not (needed|required)|kach+a bill|under the table|off the books?|gst bach|gst will (be )?save|save (on )?gst|avoid(ing)? gst|skip(ping)? gst|no gst|black money|do number|2 number)\b/i;
const TERM_RE={parties:/gstin|business name|company name/i,scope:/\b\d[\d,]*\s*(pcs|pieces|boxes|box|units|nos|kg|items?|sets?|pages?)\b/i,specs:/\b(size|inch|cm|mm|gsm|colou?r|foil|paper|material|kraft|thick)/i,price:/(₹|rs\.?\s?|inr\s?|rupees?\s?)\d|\d[\d,]*\s?(rs|₹|rupees|\/-)|\brate\b|per (box|piece|pc|unit)|\bprice\b/i,tax:/\bgst\b|\btax/i,delivery:/deliver|dispatch|\bby\s+\d{1,2}(st|nd|rd|th)?\b|\bdays?\b|\bweek\b|go(es)? live/i,advance:/advance/i,balance:/balance|remaining|baaki|baki|after delivery|of delivery/i,payment_mode:/\bupi\b|neft|rtgs|imps|\bcash\b|cheque|bank transfer/i,late_penalty:/\blate\b|penalt|per day|\bcut\b/i,quality:/damage|defect|replace|return|quality/i,cancellation:/cancel/i,disputes:/dispute|court|arbitrat|mediat/i,ip:/\blogo\b|copyright|trademark|ownership|\brights\b|design rights?|source files?|same design/i,resale:/resale|resell|re-sell|\bmrp\b/i};

/* ---------- chat parsing ---------- */
const WA_RE=/^\[?(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]\.?\s?m\.?)?\]?\s*(?:[-–]\s*)?([^:\n]{1,60}?):\s?([\s\S]*)$/i;
const WA_SYS=/^\[?\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4},?\s+\d{1,2}:\d{2}/;
function parseChat(text){
  const lines=text.replace(/\r/g,'').replace(/[‎‏]/g,'').split('\n'); const out=[]; let cur=null;
  for(const line of lines){
    const m=line.match(WA_RE);
    if(m){ let [,d,mo,y,h,mi,,ap,sender,body]=m; y=+y; if(y<100) y+=2000; h=+h; if(ap){ const pm=/p/i.test(ap); if(pm&&h<12) h+=12; if(!pm&&h===12) h=0; }
      cur={n:out.length+1,ts:`${y}-${p2(mo)}-${p2(d)}T${p2(h)}:${p2(mi)}:00${TZ}`,sender:sender.trim(),text:body.trim()}; out.push(cur); continue; }
    if(WA_SYS.test(line)){ cur=null; continue; }
    const s=line.match(/^([^:\n]{1,40}):\s+(.+)$/);
    if(s&&!cur){ cur={n:out.length+1,ts:null,sender:s[1].trim(),text:s[2].trim()}; out.push(cur); continue; }
    if(line.trim()){ if(cur) cur.text+='\n'+line; else { cur={n:out.length+1,ts:null,sender:'Unknown',text:line.trim()}; out.push(cur); } }
  }
  return out;
}

/* ---------- state ---------- */
const STORE='draftit.v1';
let S=null;
const ui={quip:1+Math.floor(Math.random()*6),view:'home',dealId:null,tab:'terms',actor:'me',calMonth:null,calDay:null,traceClause:null,busy:null,speaking:null,inp:null,verify:{},tr:{running:false,failed:false},auth:null,tut:null,docView:'simple',roomDraft:'',guest:null,pickL:null,q:null,rs:null};
function save(){ if(SB&&cloud.uid){ scheduleCloudSave(); return; } try{ localStorage.setItem(STORE,JSON.stringify(S)); }catch(e){} }
function load(){ try{ const r=localStorage.getItem(STORE); if(r){ const v=JSON.parse(r); if(v&&v.deals&&v.settings&&v.tr&&v.accounts) return v; } }catch(e){} return null; }
const deal=id=>{ const k=id||ui.dealId; return S.deals.find(d=>d.id===k)||(ui.guest&&ui.guest.id===k?ui.guest:null); };
const acct=()=>S&&S.session?S.accounts[S.session]:null;
const isLawyer=()=>{ const a=acct(); return !!a&&a.role==='lawyer'; };
const myDeals=()=>{ const a=acct(); if(!a) return []; if(a.role==='lawyer') return S.deals.filter(d=>!d.sample&&((d.lawyerReq&&d.lawyerReq.lawyerId===a.lawyerId)||d.versions.some(v=>v.lawyer&&v.lawyer.lawyerId===a.lawyerId))); return S.deals.filter(d=>d.owner===a.id); };
function useAccount(id){ S.session=id; const a=S.accounts[id]; if(a){ S.settings.userName=a.name; S.settings.business=a.business||''; S.settings.userId=a.id; } save(); }
const allMsgs=d=>d.records.flatMap(r=>r.messages.map(m=>({ref:r.id+'#'+m.n,rec:r,...m})));
function msgByRef(d,ref){ const [rid,n]=String(ref).split('#'); const r=d.records.find(x=>x.id===rid); if(!r) return null; const m=r.messages.find(x=>String(x.n)===String(n)); return m?{ref,rec:r,...m}:null; }
const first=s=>String(s||'').split(' ')[0];
const partyName=(d,id)=>(d.parties.find(p=>p.id===id)||{}).name||id;

let SAMPLE=null, DOWNLOADS=null, ROOMCAP=null, capChecked=false;
const STANDALONE=!(window.claude&&typeof window.claude.use==='function');
function apiKey(){ try{ return localStorage.getItem('draftit.key')||''; }catch(e){ return ''; } }
const blobToB64=b=>new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(String(fr.result).split(',')[1]); fr.onerror=()=>rej(fr.error); fr.readAsDataURL(b); });
/* outside Claude, an Anthropic API key (kept only in this browser) powers the same features */
/* one wrapper for every way of reaching Claude: send(body) returns the Messages API reply */
function makeSample(send){
  const call=async(input,opts)=>{ opts=opts||{}; const msgs=typeof input==='string'?[{role:'user',content:input}]:input.map(m=>({role:m.role,content:m.content}));
    if(opts.images&&opts.images.length){ const last=msgs[msgs.length-1], parts=[]; for(const b of opts.images) parts.push({type:'image',source:{type:'base64',media_type:b.type||'image/jpeg',data:await blobToB64(b)}}); parts.push({type:'text',text:last.content}); last.content=parts; }
    const j=await send({messages:msgs,tier:opts.modelTier==='quick'?'quick':'default'});
    return {text:(j.content||[]).filter(c=>c.type==='text').map(c=>c.text).join(''),truncated:j.stop_reason==='max_tokens'}; };
  call.json=async(input,opts)=>{ const {text}=await call(String(input)+'\n\nReply with valid JSON only: no prose, no code fences.',opts); const m=text.match(/[\[{][\s\S]*[\]}]/); return JSON.parse(m?m[0]:text); };
  return call;
}
/* outside Claude, an Anthropic API key (kept only in this browser) powers the same features */
function makeApiSample(key){
  return makeSample(async body=>{ const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:body.tier==='quick'?'claude-haiku-5-5':'claude-sonnet-5-5',max_tokens:8000,messages:body.messages})});
    if(!r.ok){ const err=new Error('api '+r.status); err.code=r.status===401||r.status===403?'not_granted':r.status===429?'rate_limited':'upstream_error'; throw err; }
    return r.json(); });
}
/* inside the DraftIt Android app (Capacitor) */
const NATIVE=()=>{ try{ return !!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform()); }catch(e){ return false; } };
const NPC={};
/* The app loads the live site, so Capacitor's JavaScript package is not on the page; the native bridge
   still provides nativePromise/nativeCallback, so plugins are called through those directly. */
const NP=n=>{ if(!NATIVE()) return null; if(n in NPC) return NPC[n]; const C=window.Capacitor; let p=null;
  try{
    if(C.Plugins&&C.Plugins[n]) p=C.Plugins[n];
    else if(typeof C.nativePromise==='function'&&!(Array.isArray(C.PluginHeaders)&&!C.PluginHeaders.some(h=>h&&h.name===n))){
      p=new Proxy({},{get:(_,m)=>{ if(m==='then'||typeof m!=='string') return undefined;
        if(m==='addListener') return (ev,cb)=>{ const id=C.nativeCallback(n,'addListener',{eventName:ev},data=>{ try{ cb(data); }catch(e){} }); return Promise.resolve({remove:()=>C.nativeCallback(n,'removeListener',{eventName:ev,callbackId:id},()=>{})}); };
        return opts=>C.nativePromise(n,m,opts||{}); }});
    }
  }catch(e){ p=null; }
  return (NPC[n]=p); };
const APK_URL='https://github.com/qwerty123-web/draft-it/releases/download/android-latest/DraftIt.apk';
const isAndroid=()=>/android/i.test(navigator.userAgent);
const getAppCard=()=>NATIVE()||!STANDALONE||isIOS()?'':`<a class="card pad tap get-app" href="${APK_URL}" rel="noopener"><span class="snip-ico">${ic('down',22)}</span><span class="stack-s grow" style="gap:2px;text-align:left"><b>${esc(t('getApp'))}</b><span class="tiny">${esc(t('getAppSub'))}</span></span></a>`;
async function nativeSave(name,b){ const FS=NP('Filesystem'), SH=NP('Share'); if(!FS) return false;
  try{ const r=await FS.writeFile({path:safeName(name),data:await blobToB64(b),directory:'CACHE'}); if(SH) await SH.share({title:name,dialogTitle:name,files:[r.uri]}); return true; }catch(e){ console.warn('save',e); return false; } }
function downloadBlob(name,data,type){ if(NATIVE()&&NP('Filesystem')){ const nb=data instanceof Blob?data:new Blob([data],{type:type||(/\.json$/.test(name)?'application/json':'text/html')+';charset=utf-8'}); nativeSave(name,nb).then(ok=>{ if(!ok) toast(t('noDownload')); }); return; } const b=data instanceof Blob?data:new Blob([data],{type:type||(/\.json$/.test(name)?'application/json':'text/html')+';charset=utf-8'}), u=URL.createObjectURL(b), a=document.createElement('a'); a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),4000); }
let INSTALL=null; window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); INSTALL=e; if(S&&ui.view==='settings') render(); });
window.addEventListener('appinstalled',()=>{ INSTALL=null; if(S) toast(t('installed')); });
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const isInstalled=()=>{ try{ return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true; }catch(e){ return false; } };
if(window.claude&&typeof window.claude.use==='function'){
  window.claude.use('sample').then(s=>{ SAMPLE=s; capChecked=true; if(S){ render(); ensureTr(); } }).catch(()=>{ capChecked=true; });
  window.claude.use('downloads').then(d=>{ DOWNLOADS=d; }).catch(()=>{});
  window.claude.use('room').then(r=>{ ROOMCAP=r||null; if(r&&S&&ui.view==='room'){ const d=deal(ui.roomDeal); if(d) joinRoom(d); } }).catch(()=>{});
} else { capChecked=true; const k=apiKey(); if(k) SAMPLE=makeApiSample(k); }

/* ---------- seed ---------- */
const WA1=`18/10/26, 10:02 am - Anjali Mehta: Hi Ravi ji, need sweet boxes for Diwali again this year. Around 2000 pcs
18/10/26, 10:05 am - Ravi Kumar: Namaste Anjali ji! Same design as last year?
18/10/26, 10:09 am - Anjali Mehta: Same design but new logo. I will send the logo file
18/10/26, 10:12 am - Ravi Kumar: Ok. Rate will be 18 rs per box
18/10/26, 10:30 am - Anjali Mehta: 18 is too much, last year 15 tha. Do 16
18/10/26, 10:41 am - Ravi Kumar: Paper rates have gone up. Final 17, can't go lower
18/10/26, 10:44 am - Anjali Mehta: Ok done 17 👍
18/10/26, 10:46 am - Ravi Kumar: I can deliver in 5 days after logo approval
19/10/26, 9:15 am - Anjali Mehta: <Media omitted>
19/10/26, 9:20 am - Anjali Mehta: Actually take a week, no rush. But latest by 31st October, shop opening on 1st
19/10/26, 9:31 am - Ravi Kumar: Ok 31st Oct delivery at your Jayanagar shop
19/10/26, 9:33 am - Ravi Kumar: 50% advance please, balance on delivery
19/10/26, 9:50 am - Anjali Mehta: Advance I will send by UPI tomorrow
20/10/26, 11:02 am - Anjali Mehta: Sent 17000
20/10/26, 11:05 am - Ravi Kumar: Received, thank you 🙏
20/10/26, 6:40 pm - Anjali Mehta: One thing, if delivery is after 2nd Nov I will cut 500 per day
21/10/26, 8:12 am - Ravi Kumar: Logo file please, printing can start only after that`;
const VN1='Ravi ji, box size wahi 8 by 8 inch rakhna, four colour print, aur logo pe gold foil chahiye. Paper thoda mota hona chahiye, last time thoda patla tha.';
const WA2=`12/10/26, 4:10 pm - Vikram Sharma: Ravi bhai, 500 lunch boxes printed with our name, kraft paper
12/10/26, 4:18 pm - Ravi Kumar: ₹9 per box, delivery 26th Oct
12/10/26, 4:25 pm - Vikram Sharma: Ok fine. Payment I'll do within 7 days of delivery
12/10/26, 4:27 pm - Ravi Kumar: Ok agreed
12/10/26, 4:30 pm - Vikram Sharma: Prices including GST na?
12/10/26, 4:33 pm - Ravi Kumar: Yes including GST
12/10/26, 4:35 pm - Vikram Sharma: 👍
18/10/26, 1:02 pm - Vikram Sharma: Can you make it 28th? Event shifted
18/10/26, 1:10 pm - Ravi Kumar: Sure, 28th Oct`;
const WA3=`22/10/26, 7:05 pm - Sunil Gupta: Ravi, need vinyl stickers and a board for my shop shelves. Can you quote?
22/10/26, 7:20 pm - Ravi Kumar: Sure, will visit on Monday to measure`;
const WA4=`14/10/26, 11:00 am - Priya Nair: Ravi ji, we need a new logo and a simple website for Nair Events
14/10/26, 11:08 am - Ravi Kumar: Sure. Logo plus 5-page website, ₹40,000 total
14/10/26, 11:15 am - Priya Nair: Ok, fine. Can we do it in cash? Bill mat banana, GST bach jayega
14/10/26, 11:20 am - Ravi Kumar: Ok, cash is fine
14/10/26, 11:24 am - Priya Nair: 50% now, 50% when the site goes live
14/10/26, 11:25 am - Ravi Kumar: Done 👍
15/10/26, 6:10 pm - Priya Nair: Logo should be ours fully, we will register the trademark
15/10/26, 6:30 pm - Ravi Kumar: Website live by 10th November
15/10/26, 6:32 pm - Priya Nair: 👍`;
const WA5=`23/10/26, 4:02 pm - Ravi Kumar: Rakesh ji, need 300 sheets of 350 GSM food-grade board for the Diwali boxes
23/10/26, 4:10 pm - Rakesh Jain: Available. ₹42 per sheet plus GST, delivery to your Chickpet unit
23/10/26, 4:15 pm - Ravi Kumar: ₹40 karo, regular customer hoon
23/10/26, 4:22 pm - Rakesh Jain: Ok ₹40 final 👍
23/10/26, 4:25 pm - Ravi Kumar: Deliver by 28th please. Payment by NEFT within 15 days of delivery
23/10/26, 4:31 pm - Rakesh Jain: Done. Will send tax invoice with the goods`;
const VN5='Ravi ji, board ka food-grade certificate bhi saath bhej dunga. Agar koi sheet kharab nikli toh do din mein badal dunga.';
/* registers a string with its Hindi, Marathi, Telugu, Tamil and Kannada versions */
const X=(e,...r)=>{ ['hi','mr','te','ta','kn'].forEach((lg,i)=>{ if(r[i]) S.tr[lg][e]=r[i]; }); return e; };

function T(status,o){ return Object.assign({status,value:'',clause:'',open:'',proposedBy:'',confirmedBy:'',evidence:[],history:[]},o||{}); }
function H(ref,by,value,stance){ return {ref,by,value,stance}; }
function fillMissing(terms){ TERM_DEFS.forEach(d=>{ if(!terms[d.key]) terms[d.key]=T('missing',{open:d.miss}); else if(terms[d.key].status==='missing'&&!terms[d.key].open) terms[d.key].open=d.miss; }); return terms; }
async function mkRecord(o){ const textSha=await sha256Text(o.rawText); return Object.assign({textSha,sha256:o.fileHash||textSha,uploadedBy:S.settings.userId,uploadedByName:S.settings.userName,consent:null,media:null,method:'verbatim',sourceFrom:o.messages[0]&&o.messages[0].ts||null,sourceTo:o.messages[o.messages.length-1]&&o.messages[o.messages.length-1].ts||null},o); }
function clausesFromTerms(terms){
  return CLAUSE_DEFS.map(cd=>{ const ts=cd.keys.map(k=>terms[k]).filter(Boolean);
    const tp=ts.filter(x=>x.status!=='missing'&&x.clause).map(x=>x.clause), op=ts.map(x=>x.open).filter(Boolean);
    const text=tp.join(' ')||en('notDiscussed'), open=op.join(' ');
    joinTr(tp,text); joinTr(op,open);
    return {id:cd.id,keys:cd.keys.slice(),text,open,edited:false,pending:null}; });
}
function versionPayload(d,clauses,rev,frozenAt,prevHash){ return {app:'DraftIt',dealId:d.id,title:d.title,rev,frozenAt,place:d.place||'',category:(d.category||{}).id||'other',parties:d.parties.map(p=>({name:p.name,org:p.org,role:p.role,address:p.address||'',gstin:p.gstin||'',udyam:p.udyam||''})),clauses:clauses.map(c=>({id:c.id,text:c.text,open:c.open||''})),evidence:d.records.map(r=>({id:r.id,sha256:r.sha256})),prevHash:prevHash||null}; }
async function sealVersion(d,clauses,rev,at){ const prev=d.versions[d.versions.length-1]; const payload=versionPayload(d,clauses,rev,at,prev?prev.hash:null);
  for(let i=0;i<payload.parties.length;i++){ const src=d.parties[i]||{}; payload.parties[i].logoSha=src.logo?await sha256Text(src.logo):''; payload.parties[i].sealSha=src.seal?await sha256Text(src.seal):''; }
  const hash=await sha256Text(canon(payload)); return {rev,frozenAt:at,payload,hash,prevHash:payload.prevHash,signatures:[],lawyer:null}; }
const sigBody=s=>{ const b={versionHash:s.versionHash,party:s.party,name:s.name,at:s.at,method:s.method}; if(s.cert) b.cert=s.cert; if(s.imgSha) b.imgSha=s.imgSha; return b; };
async function signVersion(v,party,img,method,at,cert){ const body={versionHash:v.hash,party:party.id,name:party.name,at,method}; if(cert) body.cert=cert; if(img) body.imgSha=await sha256Text(img); const sigHash=await sha256Text(canon(body)); v.signatures.push(Object.assign(body,{img:img||null,sigHash})); }
function log(d,clauseId,rev,action,text,by,at,note){ d.clauseLog.push({clauseId,rev,action,text,by,at,note:note||null}); }
function newDealObj(id,title,created,parties,owner){ return {id,title,created,parties,owner:owner||(S.session||''),category:null,place:'Bengaluru',value:null,records:[],terms:{},flags:[],dates:[],analysis:null,draft:null,versions:[],clauseLog:[],lawyerReq:null,stamp:{status:'not_paid',state:'Karnataka',cert:''},needsRevision:false,room:[],frozen:null,report:null}; }

async function seedState(){
  let lang=S&&S.settings?S.settings.lang:''; if(!lang){ try{ lang=localStorage.getItem('draftit.lang')||''; }catch(e){} } lang=LI[lang]!=null?lang:'en';
  let ts='m'; try{ ts=localStorage.getItem('draftit.ts')||'m'; }catch(e){}
  S={v:5,counter:1300,settings:{textSize:ts,lang,rate:0.95,voiceURI:'',ai:true,userName:'',business:'',userId:''},tr:{hi:{},mr:{},te:{},ta:{},kn:{}},deals:[],accounts:{},session:null,notary:[]};
  const RAVI='u_ravi_4821', at0='2026-10-01T10:00:00'+TZ; Object.assign(S.settings,{userName:'Ravi Kumar',business:'Kumar Print & Pack',userId:RAVI});
  S.accounts[RAVI]={id:RAVI,name:'Ravi Kumar',mobile:'9876543210',role:'user',business:'Kumar Print & Pack',train:false,tutDone:false,created:at0};
  LAWYERS.forEach(l=>{ S.accounts[l.acct]={id:l.acct,name:l.name,mobile:l.mobile,role:'lawyer',business:'',lawyerId:l.id,enrol:l.enrol,bar:{l1:'Karnataka',l2:'Maharashtra',l3:'Tamil Nadu'}[l.id],fee:l.fee,train:false,tutDone:false,created:at0}; });
  const AM='Anjali Mehta', RK='Ravi Kumar', VS='Vikram Sharma', SG='Sunil Gupta', PN='Priya Nair';
  const me={id:'me',name:RK,org:'Kumar Print & Pack',role:'Seller',address:'No. 14, 3rd Cross, Chickpet, Bengaluru 560053',gstin:'29ABCDE1234F1Z5',udyam:'UDYAM-KR-03-0012345'};
  /* Deal 1 */
  const d1=newDealObj('D-01',L('Diwali sweet boxes','दिवाली मिठाई के डिब्बे'),'2026-10-22T09:14:00'+TZ,[me,{id:'cp',name:AM,org:'Mehta Sweets',role:'Buyer',address:'27, 9th Main, Jayanagar 4th Block, Bengaluru 560011',gstin:'29AAKFM5678L1Z2',udyam:''}],RAVI); d1.value=34000; d1.category={id:'printing',by:'auto'};
  d1.records.push(await mkRecord({id:'CR-1001',dealId:'D-01',type:'whatsapp',name:'WhatsApp Chat with Anjali Mehta.txt',uploadedAt:'2026-10-22T09:14:00'+TZ,rawText:WA1,messages:parseChat(WA1)}));
  d1.records.push(await mkRecord({id:'CR-1002',dealId:'D-01',type:'voice',name:'PTT-20261019-WA0004.mp3',uploadedAt:'2026-10-22T09:16:00'+TZ,rawText:VN1,method:'transcript',fileHash:await sha256Bytes(audioBytes('vn1')),messages:[{n:1,ts:'2026-10-19T09:15:00'+TZ,sender:AM,text:VN1}],consent:{basis:'sent_by_them',party:true,at:'2026-10-22T09:16:00'+TZ},media:{kind:'audio',src:'vn1'}}));
  const A=n=>'CR-1001#'+n, V='CR-1002#1';
  d1.terms=fillMissing({
    parties:T('agreed',{value:L('Kumar Print & Pack (seller) and Mehta Sweets (buyer)','कुमार प्रिंट एंड पैक (विक्रेता) और मेहता स्वीट्स (खरीदार)'),clause:L('Kumar Print & Pack (Ravi Kumar), Bengaluru, will make and supply the boxes. Mehta Sweets (Anjali Mehta) is buying them.','कुमार प्रिंट एंड पैक (रवि कुमार), बेंगलुरु, डिब्बे बनाएगा और देगा। मेहता स्वीट्स (अंजलि मेहता) इन्हें खरीद रही है।'),proposedBy:AM,confirmedBy:RK,evidence:[A(1),A(2)],history:[H(A(1),AM,L('Asks Ravi for Diwali sweet boxes','रवि से दिवाली के मिठाई के डिब्बे मांगे'),'offer'),H(A(2),RK,L('Takes up the order','ऑर्डर ले लिया'),'accept')]}),
    scope:T('ambiguous',{value:L('Around 2,000 printed sweet boxes, last year’s design with the new logo','लगभग 2,000 छपे मिठाई के डिब्बे, पिछले साल का डिज़ाइन, नए लोगो के साथ'),clause:L('About 2,000 printed sweet boxes, using last year’s design with the new Mehta Sweets logo. Anjali will send the logo file.','लगभग 2,000 छपे हुए मिठाई के डिब्बे, पिछले साल वाले डिज़ाइन में, मेहता स्वीट्स के नए लोगो के साथ। अंजलि लोगो फ़ाइल भेजेंगी।'),open:L('The exact number of boxes. The chat only says “around 2000”.','डिब्बों की सही संख्या। चैट में सिर्फ़ “लगभग 2000” लिखा है।'),proposedBy:AM,confirmedBy:RK,evidence:[A(1),A(2),A(3)],history:[H(A(1),AM,L('Around 2000 pcs','लगभग 2000 नग'),'offer'),H(A(2),RK,L('Same design as last year?','पिछले साल वाला डिज़ाइन?'),'info'),H(A(3),AM,L('Same design, new logo, she will send the file','वही डिज़ाइन, नया लोगो, फ़ाइल वे भेजेंगी'),'info')]}),
    specs:T('proposed',{value:L('8 × 8 in, four-colour, gold foil logo, thicker paper','8 × 8 इंच, चार रंग, लोगो पर गोल्ड फ़ॉइल, मोटा कागज़'),clause:L('Box size 8 × 8 inches, four-colour print, gold foil on the logo, on thicker paper than last year.','डिब्बे का आकार 8 × 8 इंच, चार रंगों की छपाई, लोगो पर गोल्ड फ़ॉइल, और पिछले साल से मोटा कागज़।'),open:L('Ravi has not confirmed these details, and “thicker paper” has no measure such as GSM.','रवि ने ये बातें अभी पक्की नहीं कीं, और “मोटा कागज़” का कोई माप (जैसे GSM) नहीं है।'),proposedBy:AM,evidence:[V],history:[H(V,AM,L('8 by 8 inch, four colour, gold foil on logo, thicker paper','8 बाय 8 इंच, चार रंग, लोगो पर गोल्ड फ़ॉइल, मोटा कागज़'),'offer')]}),
    price:T('agreed',{value:L('₹17 per box','₹17 प्रति डिब्बा'),clause:L('The price is ₹17 per box, about ₹34,000 for 2,000 boxes.','कीमत ₹17 प्रति डिब्बा है, 2,000 डिब्बों के लिए लगभग ₹34,000।'),proposedBy:RK,confirmedBy:AM,evidence:[A(4),A(5),A(6),A(7)],history:[H(A(4),RK,L('₹18 per box','₹18 प्रति डिब्बा'),'offer'),H(A(5),AM,L('₹16 per box','₹16 प्रति डिब्बा'),'counter'),H(A(6),RK,L('₹17, final','₹17, आख़िरी'),'counter'),H(A(7),AM,L('Ok done 17','ठीक है, 17 तय'),'accept')]}),
    tax:T('missing',{open:L('Whether ₹17 includes GST or GST is added on top.','₹17 में GST शामिल है या GST अलग से लगेगा।')}),
    delivery:T('agreed',{value:L('By 31 Oct 2026 at the Jayanagar shop','31 अक्टूबर 2026 तक, जयनगर की दुकान पर'),clause:L('The boxes will be delivered to the Mehta Sweets shop in Jayanagar by 31 October 2026. Printing starts after the logo file arrives.','डिब्बे 31 अक्टूबर 2026 तक जयनगर में मेहता स्वीट्स की दुकान पर पहुंचाए जाएंगे। लोगो फ़ाइल मिलने के बाद छपाई शुरू होगी।'),open:L('No date is set for sending the logo file, so it is unclear what happens if it comes late.','लोगो फ़ाइल भेजने की कोई तारीख तय नहीं, इसलिए साफ़ नहीं कि देर से आने पर क्या होगा।'),proposedBy:AM,confirmedBy:RK,evidence:[A(8),A(10),A(11),A(17)],history:[H(A(8),RK,L('5 days after logo approval','लोगो मंज़ूर होने के 5 दिन बाद'),'offer'),H(A(10),AM,L('A week is fine, latest 31 Oct','एक हफ़्ता ठीक है, ज़्यादा से ज़्यादा 31 अक्टूबर'),'counter'),H(A(11),RK,L('31 Oct at the Jayanagar shop','31 अक्टूबर, जयनगर की दुकान पर'),'accept'),H(A(17),RK,L('Printing starts only after the logo','छपाई लोगो मिलने के बाद ही'),'info')]}),
    advance:T('agreed',{value:L('50% = ₹17,000 by UPI, paid 20 Oct','50% = ₹17,000 UPI से, 20 अक्टूबर को दिया'),clause:L('An advance of 50% (₹17,000) was paid by UPI on 20 October 2026 and received by Kumar Print & Pack.','50% एडवांस (₹17,000) 20 अक्टूबर 2026 को UPI से दिया गया और कुमार प्रिंट एंड पैक को मिल गया।'),proposedBy:RK,confirmedBy:AM,evidence:[A(12),A(13),A(14),A(15)],history:[H(A(12),RK,L('50% advance','50% एडवांस'),'offer'),H(A(13),AM,L('Will send by UPI tomorrow','कल UPI से भेजेंगी'),'accept'),H(A(14),AM,L('Sent ₹17,000','₹17,000 भेजे'),'paid'),H(A(15),RK,L('Received','मिल गए'),'accept')]}),
    balance:T('proposed',{value:L('₹17,000 on delivery','डिलीवरी पर ₹17,000'),clause:L('The balance of ₹17,000 is paid on delivery.','बाकी ₹17,000 डिलीवरी पर दिए जाएंगे।'),open:L('Anjali replied about the advance only, not about paying the balance on delivery.','अंजलि ने सिर्फ़ एडवांस पर जवाब दिया, डिलीवरी पर बाकी भुगतान पर नहीं।'),proposedBy:RK,evidence:[A(12),A(13)],history:[H(A(12),RK,L('Balance on delivery','बाकी डिलीवरी पर'),'offer'),H(A(13),AM,L('Replied about the advance only','सिर्फ़ एडवांस पर जवाब दिया'),'info')]}),
    late_penalty:T('proposed',{value:L('₹500 a day off if delivered after 2 Nov','2 नवंबर के बाद डिलीवरी पर हर दिन ₹500 कम'),clause:L('If the boxes are delivered after 2 November 2026, ₹500 is taken off the bill for each late day.','अगर डिब्बे 2 नवंबर 2026 के बाद पहुंचते हैं, तो हर देरी वाले दिन के लिए बिल से ₹500 कम किए जाएंगे।'),open:L('Ravi has not replied to this yet.','रवि ने अभी इसका जवाब नहीं दिया।'),proposedBy:AM,evidence:[A(16)],history:[H(A(16),AM,L('₹500 per day after 2 Nov','2 नवंबर के बाद ₹500 प्रति दिन'),'offer')]}),
    payment_mode:T('agreed',{value:X('UPI (the advance was paid by UPI)','UPI (एडवांस UPI से दिया गया)','UPI (आगाऊ रक्कम UPI ने दिली)','UPI (అడ్వాన్స్ UPI ద్వారా చెల్లించారు)','UPI (முன்பணம் UPI மூலம் செலுத்தப்பட்டது)','UPI (ಮುಂಗಡ UPI ಮೂಲಕ ಪಾವತಿಯಾಗಿದೆ)'),proposedBy:AM,confirmedBy:RK,evidence:[A(13),A(14),A(15)],history:[H(A(13),AM,'Will send by UPI tomorrow','offer'),H(A(15),RK,'Received','accept')]}),
    ip:T('ambiguous',{value:X('New Mehta Sweets logo, to be sent by Anjali','मेहता स्वीट्स का नया लोगो, जो अंजलि भेजेंगी','मेहता स्वीट्सचा नवा लोगो, जो अंजली पाठवतील','మెహతా స్వీట్స్ కొత్త లోగో, అంజలి పంపుతారు','மேத்தா ஸ்வீட்ஸின் புதிய லோகோ, அஞ்சலி அனுப்புவார்','ಮೆಹ್ತಾ ಸ್ವೀಟ್ಸ್‌ನ ಹೊಸ ಲೋಗೋ, ಅಂಜಲಿ ಕಳುಹಿಸುತ್ತಾರೆ'),clause:X('Mehta Sweets owns its logo. Kumar Print & Pack prints it only for this order.','लोगो मेहता स्वीट्स का है। कुमार प्रिंट एंड पैक इसे सिर्फ़ इसी ऑर्डर के लिए छापेगा।','लोगो मेहता स्वीट्सचा आहे. कुमार प्रिंट अँड पॅक तो फक्त याच ऑर्डरसाठी छापेल.','లోగో మెహతా స్వీట్స్‌దే. కుమార్ ప్రింట్ & ప్యాక్ దాన్ని ఈ ఆర్డర్ కోసమే ముద్రిస్తుంది.','லோகோ மேத்தா ஸ்வீட்ஸுக்குச் சொந்தமானது. குமார் பிரிண்ட் & பேக் அதை இந்த ஆர்டருக்கு மட்டுமே அச்சிடும்.','ಲೋಗೋ ಮೆಹ್ತಾ ಸ್ವೀಟ್ಸ್‌ನದು. ಕುಮಾರ್ ಪ್ರಿಂಟ್ & ಪ್ಯಾಕ್ ಅದನ್ನು ಈ ಆರ್ಡರ್‌ಗೆ ಮಾತ್ರ ಮುದ್ರಿಸುತ್ತದೆ.'),open:X('Anjali has not confirmed she owns the logo, and nothing says who keeps the design files.','अंजलि ने पुष्टि नहीं की कि लोगो उनका है, और यह भी तय नहीं कि डिज़ाइन फ़ाइलें किसके पास रहेंगी।','लोगो आपला आहे याची अंजलींनी खात्री दिलेली नाही, आणि डिझाइन फाइल्स कोणाकडे राहतील हेही ठरलेले नाही.','లోగో తనదేనని అంజలి ధృవీకరించలేదు, డిజైన్ ఫైళ్లు ఎవరి దగ్గర ఉంటాయో కూడా చెప్పలేదు.','லோகோ தங்களுடையது என்று அஞ்சலி உறுதிப்படுத்தவில்லை; வடிவமைப்புக் கோப்புகள் யாரிடம் இருக்கும் என்றும் சொல்லவில்லை.','ಲೋಗೋ ತಮ್ಮದು ಎಂದು ಅಂಜಲಿ ಖಚಿತಪಡಿಸಿಲ್ಲ, ವಿನ್ಯಾಸ ಫೈಲ್‌ಗಳು ಯಾರ ಬಳಿ ಇರುತ್ತವೆ ಎಂದೂ ಹೇಳಿಲ್ಲ.'),proposedBy:AM,evidence:[A(3)],history:[H(A(3),AM,'Same design, new logo, she will send the file','info')]})
  });
  d1.flags=[
    {severity:'high',title:L('Delivery depends on the logo, but the logo has no deadline','डिलीवरी लोगो पर टिकी है, पर लोगो की कोई आख़िरी तारीख नहीं'),detail:L('You agreed to deliver by 31 Oct, and printing starts only after the logo arrives (message #17). If the logo comes late, the ₹500-a-day cut could still land on you.','आपने 31 अक्टूबर तक डिलीवरी मानी है, और छपाई लोगो मिलने के बाद ही शुरू होगी (मैसेज #17)। अगर लोगो देर से आया, तो ₹500 रोज़ की कटौती फिर भी आप पर पड़ सकती है।'),ask:L('Anjali ji, to deliver by 31st Oct I need the logo file by 25th Oct. If it comes later, delivery moves by the same number of days. Ok? 🙏','अंजलि जी, 31 अक्टूबर तक डिलीवरी के लिए मुझे लोगो फ़ाइल 25 अक्टूबर तक चाहिए। अगर देर से आई, तो डिलीवरी भी उतने ही दिन आगे खिसकेगी। ठीक है? 🙏'),keys:['delivery','late_penalty']},
    {severity:'high',title:L('Nothing agreed if the order is cancelled','ऑर्डर रद्द होने पर क्या होगा, यह तय नहीं'),detail:L('If Mehta Sweets cancels after printing starts, nothing says who pays for boxes already printed. You hold ₹17,000 advance, but the chat does not say you can keep it.','अगर छपाई शुरू होने के बाद मेहता स्वीट्स ऑर्डर रद्द करे, तो छपे हुए डिब्बों का पैसा कौन देगा, यह कहीं नहीं लिखा। आपके पास ₹17,000 एडवांस है, पर चैट में नहीं लिखा कि आप उसे रख सकते हैं।'),ask:L('Anjali ji, one small thing for both of us: if the order gets cancelled after printing starts, the advance covers the material already used. Ok?','अंजलि जी, हम दोनों के लिए एक छोटी बात: अगर छपाई शुरू होने के बाद ऑर्डर रद्द हुआ, तो एडवांस से इस्तेमाल हुए माल का खर्च निकलेगा। ठीक है?'),keys:['cancellation']},
    {severity:'medium',title:X('Sweet boxes must be food-grade','मिठाई के डिब्बे फ़ूड-ग्रेड होने चाहिए','मिठाईचे बॉक्स फूड-ग्रेड असावेत','స్వీట్ బాక్సులు ఫుడ్-గ్రేడ్ అయి ఉండాలి','இனிப்புப் பெட்டிகள் உணவுத் தரமாக இருக்க வேண்டும்','ಸಿಹಿ ಬಾಕ್ಸ್‌ಗಳು ಫುಡ್-ಗ್ರೇಡ್ ಆಗಿರಬೇಕು'),detail:X('These boxes will hold sweets. Food rules need food-grade board and safe inks, with the printed side away from the food. The chat does not say this.','इन डिब्बों में मिठाई रखी जाएगी। खाद्य नियमों के अनुसार फ़ूड-ग्रेड बोर्ड और सुरक्षित स्याही चाहिए, और छपी तरफ़ खाने से दूर हो। चैट में इसकी बात नहीं है।','या बॉक्समध्ये मिठाई ठेवली जाईल. अन्न नियमांनुसार फूड-ग्रेड बोर्ड आणि सुरक्षित शाई हवी, आणि छापील बाजू अन्नापासून दूर असावी. चॅटमध्ये याचा उल्लेख नाही.','ఈ బాక్సుల్లో స్వీట్లు ఉంటాయి. ఆహార నియమాల ప్రకారం ఫుడ్-గ్రేడ్ బోర్డు, సురక్షిత ఇంక్ కావాలి, ముద్రించిన వైపు ఆహారానికి దూరంగా ఉండాలి. చాట్‌లో ఈ విషయం లేదు.','இந்தப் பெட்டிகளில் இனிப்புகள் வைக்கப்படும். உணவு விதிகளின்படி உணவுத் தர அட்டையும் பாதுகாப்பான மையும் வேண்டும்; அச்சுப் பக்கம் உணவைத் தொடக்கூடாது. அரட்டையில் இது பற்றிப் பேசவில்லை.','ಈ ಬಾಕ್ಸ್‌ಗಳಲ್ಲಿ ಸಿಹಿ ಇಡಲಾಗುತ್ತದೆ. ಆಹಾರ ನಿಯಮಗಳ ಪ್ರಕಾರ ಫುಡ್-ಗ್ರೇಡ್ ಬೋರ್ಡ್ ಮತ್ತು ಸುರಕ್ಷಿತ ಶಾಯಿ ಬೇಕು, ಮುದ್ರಿತ ಭಾಗ ಆಹಾರದಿಂದ ದೂರ ಇರಬೇಕು. ಚಾಟ್‌ನಲ್ಲಿ ಇದರ ಮಾತಿಲ್ಲ.'),ask:{k:'sx_food',p:{name:'Anjali'}},keys:['specs']},
    {severity:'medium',title:L('You have not answered the late-delivery cut','देर से डिलीवरी की कटौती पर आपने जवाब नहीं दिया'),detail:L('Anjali proposed ₹500 off per day after 2 Nov (message #16). Reply to accept it or change it, so both sides know where they stand.','अंजलि ने 2 नवंबर के बाद हर दिन ₹500 कम करने की बात कही (मैसेज #16)। मानें या बदलें, जवाब ज़रूर दें ताकि दोनों को साफ़ रहे।'),ask:L('Noted Anjali ji, ₹500 per day after 2nd Nov is ok with me, as long as the logo reaches me by 25th Oct.','ठीक है अंजलि जी, 2 नवंबर के बाद ₹500 रोज़ मुझे मंज़ूर है, बशर्ते लोगो 25 अक्टूबर तक मिल जाए।'),keys:['late_penalty']},
    {severity:'medium',title:L('Balance payment not confirmed','बाकी भुगतान पक्का नहीं'),detail:L('You asked for the balance on delivery. Anjali replied only about the advance.','आपने बाकी रकम डिलीवरी पर मांगी थी। अंजलि ने सिर्फ़ एडवांस पर जवाब दिया।'),ask:L('Anjali ji, balance ₹17,000 on delivery day itself, by UPI. Ok?','अंजलि जी, बाकी ₹17,000 डिलीवरी वाले दिन ही UPI से। ठीक है?'),keys:['balance']},
    {severity:'medium',title:L('Box details are only in a voice note','डिब्बे का विवरण सिर्फ़ वॉइस नोट में है'),detail:L('Size, print and foil came in Anjali’s voice note and you have not confirmed them. “Thicker paper” has no measure.','आकार, छपाई और फ़ॉइल की बात अंजलि के वॉइस नोट में आई, और आपने उसे पक्का नहीं किया। “मोटे कागज़” का कोई माप नहीं है।'),ask:L('Got your voice note Anjali ji: 8×8 inch, 4 colour, gold foil on logo. Which paper thickness (GSM) do you want this time?','अंजलि जी, वॉइस नोट मिल गया: 8×8 इंच, 4 रंग, लोगो पर गोल्ड फ़ॉइल। इस बार कागज़ कितना मोटा (GSM) चाहिए?'),keys:['specs']},
    {severity:'medium',title:L('Quantity says “around 2000”','संख्या में “लगभग 2000” लिखा है'),detail:L('A small difference in count changes the bill. Fix the exact number.','गिनती में थोड़ा फ़र्क भी बिल बदल देता है। सही संख्या तय करें।'),ask:L('Final count please, exactly 2,000 boxes?','पक्की गिनती बता दीजिए, ठीक 2,000 डिब्बे?'),keys:['scope']},
    {severity:'low',title:L('GST not mentioned','GST की बात नहीं हुई'),detail:L('Without this, ₹17 can be read either way when the bill comes.','इसके बिना बिल आने पर ₹17 को दोनों तरह समझा जा सकता है।'),ask:L('Just to be clear, is ₹17 including GST or plus GST?','बस साफ़ करने के लिए, ₹17 GST मिलाकर है या GST अलग?'),keys:['tax']},
    {severity:'low',title:L('No plan for damaged or misprinted boxes','खराब या गलत छपे डिब्बों पर कोई बात नहीं'),detail:L('A promise to replace faulty boxes avoids an argument at delivery.','खराब डिब्बे बदलने का वादा डिलीवरी के वक़्त बहस से बचाता है।'),ask:L('If any boxes come damaged or misprinted, I will replace them within 2 days. Ok?','अगर कोई डिब्बा खराब या गलत छपा निकला, तो मैं 2 दिन में बदल दूंगा। ठीक है?'),keys:['quality']}
  ];
  d1.dates=[{date:'2026-10-20',label:L('Advance ₹17,000 received','₹17,000 एडवांस मिला'),kind:'payment',status:'done'},{date:'2026-10-31',label:L('Deliver 2,000 boxes to Jayanagar shop','जयनगर की दुकान पर 2,000 डिब्बे पहुंचाने हैं'),kind:'delivery',status:'agreed'},{date:'2026-10-31',label:L('Collect balance ₹17,000','बाकी ₹17,000 लेने हैं'),kind:'payment',status:'proposed'},{date:'2026-11-03',label:L('₹500-a-day late cut would start','₹500 रोज़ की कटौती शुरू हो सकती है'),kind:'deadline',status:'proposed'}];
  d1.analysis={at:'2026-10-22T09:20:00'+TZ,method:'claude',records:2};
  Object.assign(S.tr.hi,HI);
  d1.draft={rev:1,clauses:clausesFromTerms(d1.terms)};
  d1.draft.clauses.forEach(c=>log(d1,c.id,1,'generated',c.text,'@pakka','2026-10-22T09:20:00'+TZ));
  const c6=d1.draft.clauses.find(c=>c.id==='c6');
  c6.pending={text:L('An advance of 50% (₹17,000) was paid by UPI on 20 October 2026 and received by Kumar Print & Pack. The balance of ₹17,000 is paid within 3 days of delivery.','50% एडवांस (₹17,000) 20 अक्टूबर 2026 को UPI से दिया गया और कुमार प्रिंट एंड पैक को मिल गया। बाकी ₹17,000 डिलीवरी के 3 दिन के अंदर दिए जाएंगे।'),open:'',by:'cp',at:'2026-10-22T20:15:00'+TZ};
  log(d1,'c6',1,'proposed',c6.pending.text,AM,'2026-10-22T20:15:00'+TZ,{k:'n_shared'});
  /* Deal 2 */
  const d2=newDealObj('D-02',L('Printed lunch boxes','छपे हुए लंच बॉक्स'),'2026-10-12T17:00:00'+TZ,[me,{id:'cp',name:VS,org:'Sharma Caterers',role:'Buyer'}],RAVI); d2.value=4500; d2.stamp.status='not_needed'; d2.category={id:'printing',by:'auto'};
  d2.records.push(await mkRecord({id:'CR-1101',dealId:'D-02',type:'whatsapp',name:'WhatsApp Chat with Vikram Sharma.txt',uploadedAt:'2026-10-18T13:15:00'+TZ,rawText:WA2,messages:parseChat(WA2)}));
  const B=n=>'CR-1101#'+n;
  d2.terms=fillMissing({
    parties:T('agreed',{value:L('Kumar Print & Pack (seller) and Sharma Caterers (buyer)','कुमार प्रिंट एंड पैक (विक्रेता) और शर्मा कैटरर्स (खरीदार)'),clause:L('Kumar Print & Pack (Ravi Kumar) will make the boxes. Sharma Caterers (Vikram Sharma) is buying them.','कुमार प्रिंट एंड पैक (रवि कुमार) डिब्बे बनाएगा। शर्मा कैटरर्स (विक्रम शर्मा) इन्हें खरीद रहा है।'),proposedBy:VS,confirmedBy:RK,evidence:[B(1),B(2)],history:[H(B(1),VS,L('Orders lunch boxes','लंच बॉक्स का ऑर्डर दिया'),'offer'),H(B(2),RK,L('Quotes and accepts','रेट बताया और ऑर्डर लिया'),'accept')]}),
    scope:T('agreed',{value:L('500 printed kraft-paper lunch boxes','500 छपे हुए क्राफ़्ट पेपर लंच बॉक्स'),clause:L('500 printed lunch boxes in kraft paper with the Sharma Caterers name.','क्राफ़्ट पेपर के 500 छपे लंच बॉक्स, शर्मा कैटरर्स के नाम के साथ।'),proposedBy:VS,confirmedBy:RK,evidence:[B(1),B(2)],history:[H(B(1),VS,L('500 lunch boxes, kraft, printed name','500 लंच बॉक्स, क्राफ़्ट, नाम छपा हुआ'),'offer'),H(B(2),RK,L('Quoted for it','इसका रेट बताया'),'accept')]}),
    specs:T('ambiguous',{value:L('Kraft paper, printed name','क्राफ़्ट पेपर, नाम छपा हुआ'),clause:L('Kraft paper with the Sharma Caterers name printed.','क्राफ़्ट पेपर, जिस पर शर्मा कैटरर्स का नाम छपा हो।'),open:L('Box size was not written down.','डिब्बे का आकार कहीं नहीं लिखा।'),proposedBy:VS,evidence:[B(1)],history:[H(B(1),VS,L('Kraft paper, printed with name','क्राफ़्ट पेपर, नाम के साथ छपा'),'offer')]}),
    price:T('agreed',{value:L('₹9 per box incl. GST','₹9 प्रति डिब्बा, GST सहित'),clause:L('The price is ₹9 per box, total ₹4,500.','कीमत ₹9 प्रति डिब्बा है, कुल ₹4,500।'),proposedBy:RK,confirmedBy:VS,evidence:[B(2),B(3)],history:[H(B(2),RK,L('₹9 per box','₹9 प्रति डिब्बा'),'offer'),H(B(3),VS,L('Ok fine','ठीक है'),'accept')]}),
    tax:T('agreed',{value:L('GST included','GST शामिल'),clause:L('The price includes GST.','कीमत में GST शामिल है।'),proposedBy:VS,confirmedBy:RK,evidence:[B(5),B(6),B(7)],history:[H(B(5),VS,L('Including GST?','GST मिलाकर?'),'offer'),H(B(6),RK,L('Yes, including GST','हां, GST मिलाकर'),'accept'),H(B(7),VS,'👍','accept')]}),
    delivery:T('agreed',{value:L('By 28 Oct 2026','28 अक्टूबर 2026 तक'),clause:L('The boxes will be delivered by 28 October 2026.','डिब्बे 28 अक्टूबर 2026 तक पहुंचा दिए जाएंगे।'),proposedBy:VS,confirmedBy:RK,evidence:[B(2),B(3),B(8),B(9)],history:[H(B(2),RK,L('26 Oct','26 अक्टूबर'),'offer'),H(B(3),VS,'Ok fine','accept'),H(B(8),VS,L('Can you make it 28th?','28 तारीख कर सकते हैं?'),'counter'),H(B(9),RK,L('Sure, 28th Oct','ज़रूर, 28 अक्टूबर'),'accept')]}),
    advance:T('agreed',{value:L('No advance','कोई एडवांस नहीं'),proposedBy:VS,confirmedBy:RK,evidence:[B(3),B(4)],history:[H(B(3),VS,L('Pays after delivery','डिलीवरी के बाद भुगतान'),'offer'),H(B(4),RK,L('Ok agreed','ठीक है, मंज़ूर'),'accept')]}),
    balance:T('agreed',{value:L('Full ₹4,500 within 7 days of delivery','डिलीवरी के 7 दिन के अंदर पूरे ₹4,500'),clause:L('Sharma Caterers pays the full ₹4,500 within 7 days of delivery.','शर्मा कैटरर्स डिलीवरी के 7 दिन के अंदर पूरे ₹4,500 देगा।'),proposedBy:VS,confirmedBy:RK,evidence:[B(3),B(4)],history:[H(B(3),VS,L('Within 7 days of delivery','डिलीवरी के 7 दिन के अंदर'),'offer'),H(B(4),RK,'Ok agreed','accept')]})
  });
  d2.flags=[{severity:'low',title:L('No plan for damaged boxes','खराब डिब्बों पर कोई बात नहीं'),detail:L('The lawyer suggested adding this next time.','वकील ने अगली बार यह जोड़ने की सलाह दी है।'),ask:L('Vikram bhai, if any boxes come damaged, I will replace them within 2 days.','विक्रम भाई, अगर कोई डिब्बा खराब निकला, तो मैं 2 दिन में बदल दूंगा।'),keys:['quality']},
    {severity:'low',title:L('Box size not written down','डिब्बे का आकार नहीं लिखा'),detail:L('Fine if it is your standard size, but write it once.','अगर आपका रोज़ का आकार है तो ठीक, पर एक बार लिख दें।'),ask:L('Vikram bhai, same 8×6 inch size as your usual order, right?','विक्रम भाई, आपके हमेशा वाले 8×6 इंच आकार में ही, है ना?'),keys:['specs']}];
  d2.dates=[{date:'2026-10-28',label:L('Deliver 500 lunch boxes to Sharma Caterers','शर्मा कैटरर्स को 500 लंच बॉक्स पहुंचाने हैं'),kind:'delivery',status:'agreed'},{date:'2026-11-04',label:L('Payment ₹4,500 due from Sharma Caterers','शर्मा कैटरर्स से ₹4,500 का भुगतान आना है'),kind:'payment',status:'agreed'}];
  d2.analysis={at:'2026-10-18T13:20:00'+TZ,method:'claude',records:1};
  L('The boxes will be delivered by 26 October 2026.','डिब्बे 26 अक्टूबर 2026 तक पहुंचा दिए जाएंगे।');
  L('Fine for an order of this size. Next time, add what happens if boxes arrive damaged.','इतने ऑर्डर के लिए ठीक है। अगली बार लिखें कि डिब्बे खराब आएं तो क्या होगा।');
  /* Deal 3 */
  const d3=newDealObj('D-03',L('Shelf stickers and shop board','शेल्फ़ स्टिकर और दुकान का बोर्ड'),'2026-10-22T19:30:00'+TZ,[me,{id:'cp',name:SG,org:'Gupta Hardware',role:'Buyer'}],RAVI); d3.category={id:'printing',by:'auto'};
  d3.records.push(await mkRecord({id:'CR-1201',dealId:'D-03',type:'paste',name:'Pasted chat',uploadedAt:'2026-10-22T19:30:00'+TZ,rawText:WA3,messages:parseChat(WA3)}));
  const C=n=>'CR-1201#'+n;
  d3.terms=fillMissing({
    parties:T('agreed',{value:L('Kumar Print & Pack and Gupta Hardware','कुमार प्रिंट एंड पैक और गुप्ता हार्डवेयर'),clause:L('Kumar Print & Pack (Ravi Kumar) will make the items. Gupta Hardware (Sunil Gupta) is buying them.','कुमार प्रिंट एंड पैक (रवि कुमार) सामान बनाएगा। गुप्ता हार्डवेयर (सुनील गुप्ता) इसे खरीद रहा है।'),proposedBy:SG,confirmedBy:RK,evidence:[C(1),C(2)],history:[H(C(1),SG,L('Asks for a quote','रेट मांगा'),'offer'),H(C(2),RK,L('Will visit to measure','नाप लेने आएंगे'),'accept')]}),
    scope:T('proposed',{value:L('Vinyl shelf stickers and a shop board','शेल्फ़ के लिए विनाइल स्टिकर और दुकान का बोर्ड'),clause:L('Vinyl stickers for the shop shelves and one shop board.','दुकान की शेल्फ़ के लिए विनाइल स्टिकर और एक दुकान का बोर्ड।'),open:L('Sizes and quantity, to be measured at the site visit.','आकार और संख्या, दुकान पर नाप लेकर तय होगी।'),proposedBy:SG,evidence:[C(1)],history:[H(C(1),SG,L('Vinyl stickers and a board','विनाइल स्टिकर और एक बोर्ड'),'offer')]})
  });
  d3.flags=[{severity:'medium',title:L('No price yet','अभी कीमत तय नहीं'),detail:L('Send a written quote after measuring, and get a clear “ok” on it.','नाप लेने के बाद लिखित रेट भेजें और उस पर साफ़ “ठीक है” लें।'),ask:L('Sunil ji, I will share the quote with sizes after Monday’s visit. Please reply ok once you check it.','सुनील जी, सोमवार को नाप लेने के बाद आकार के साथ रेट भेजूंगा। देखकर “ठीक है” लिख दीजिएगा।'),keys:['price']},
    {severity:'low',title:L('Site visit time not fixed','दुकान आने का समय तय नहीं'),detail:L('You said Monday, Sunil has not replied.','आपने सोमवार कहा, सुनील ने जवाब नहीं दिया।'),ask:L('Sunil ji, Monday 11 am ok for the visit?','सुनील जी, सोमवार सुबह 11 बजे आऊं? ठीक है?'),keys:[]}];
  d3.dates=[{date:'2026-10-26',label:L('Site visit to measure shelves','शेल्फ़ का नाप लेने दुकान जाना है'),kind:'meeting',status:'proposed'}];
  d3.analysis={at:'2026-10-22T19:31:00'+TZ,method:'claude',records:1};
  Object.assign(S.tr.hi,HI);
  /* deal 2 versions */
  const r1=clausesFromTerms(d2.terms).map(c=>c.id==='c5'?Object.assign(c,{text:'The boxes will be delivered by 26 October 2026.'}):c);
  r1.forEach(c=>log(d2,c.id,1,'generated',c.text,'@pakka','2026-10-13T10:55:00'+TZ));
  const v1=await sealVersion(d2,r1,1,'2026-10-13T11:00:00'+TZ);
  await signVersion(v1,d2.parties[0],null,'drawn','2026-10-13T11:05:00'+TZ); await signVersion(v1,d2.parties[1],null,'drawn','2026-10-13T18:20:00'+TZ);
  d2.versions.push(v1);
  const r2=clausesFromTerms(d2.terms); const c5=r2.find(c=>c.id==='c5').text;
  log(d2,'c5',2,'proposed',c5,VS,'2026-10-18T13:02:00'+TZ,{k:'n_event'}); log(d2,'c5',2,'accepted',c5,RK,'2026-10-18T13:12:00'+TZ);
  const v2=await sealVersion(d2,r2,2,'2026-10-18T13:30:00'+TZ);
  await signVersion(v2,d2.parties[0],null,'drawn','2026-10-18T13:32:00'+TZ); await signVersion(v2,d2.parties[1],null,'drawn','2026-10-18T19:05:00'+TZ);
  v2.lawyer={lawyerId:'l1',name:'Adv. Meera Iyer',enrol:LAWYERS[0].enrol,at:'2026-10-19T10:15:00'+TZ,hash:v2.hash,fee:499,dsc:true,note:'Fine for an order of this size. Next time, add what happens if boxes arrive damaged.'};
  d2.versions.push(v2);
  d2.lawyerReq={rev:2,lawyerId:'l1',name:'Adv. Meera Iyer',fee:499,platform:PLATFORM_FEE,at:'2026-10-18T19:30:00'+TZ,by:RK,status:'approved',doneAt:v2.lawyer.at};
  /* Deal 4: a digital job with a cash-without-bill request and a logo transfer */
  const d4=newDealObj('D-04',X('Logo and website for Nair Events','नायर इवेंट्स के लिए लोगो और वेबसाइट','नायर इव्हेंट्ससाठी लोगो आणि वेबसाइट','నాయర్ ఈవెంట్స్ కోసం లోగో, వెబ్‌సైట్','நாயர் ஈவென்ட்ஸுக்கான லோகோ மற்றும் இணையதளம்','ನಾಯರ್ ಈವೆಂಟ್ಸ್‌ಗೆ ಲೋಗೋ ಮತ್ತು ವೆಬ್‌ಸೈಟ್'),'2026-10-15T19:00:00'+TZ,[Object.assign({},me,{role:'Seller'}),{id:'cp',name:PN,org:'Nair Events',role:'Buyer',address:'5, MG Road, Kochi 682016',gstin:'',udyam:''}],RAVI);
  d4.value=40000; d4.category={id:'digital',by:'auto'}; d4.stamp.status='not_paid';
  d4.records.push(await mkRecord({id:'CR-1301',dealId:'D-04',type:'whatsapp',name:'WhatsApp Chat with Priya Nair.txt',uploadedAt:'2026-10-15T19:00:00'+TZ,rawText:WA4,messages:parseChat(WA4)}));
  const P=n=>'CR-1301#'+n;
  const pr40=X('Logo plus 5-page website, ₹40,000','लोगो और 5 पेज की वेबसाइट, ₹40,000','लोगो आणि 5 पानांची वेबसाइट, ₹40,000','లోగో, 5 పేజీల వెబ్‌సైట్, ₹40,000','லோகோ, 5 பக்க இணையதளம், ₹40,000','ಲೋಗೋ ಮತ್ತು 5 ಪುಟಗಳ ವೆಬ್‌ಸೈಟ್, ₹40,000');
  const cashNoBill=X('Cash, no bill, to save GST','नकद, बिना बिल, GST बचाने के लिए','रोख, बिलाशिवाय, GST वाचवण्यासाठी','నగదు, బిల్ లేకుండా, GST మిగల్చడానికి','ரொக்கம், பில் இல்லாமல், GST மிச்சப்படுத்த','ನಗದು, ಬಿಲ್ ಇಲ್ಲದೆ, GST ಉಳಿಸಲು');
  const half=X('50% now, 50% when live','50% अभी, 50% लाइव होने पर','50% आता, 50% लाइव्ह झाल्यावर','50% ఇప్పుడు, 50% లైవ్ అయ్యాక','50% இப்போது, 50% நேரலையானதும்','50% ಈಗ, 50% ಲೈವ್ ಆದಾಗ');
  const doneW=X('Done','तय','ठरले','ఖరారు','உறுதி','ಖಚಿತ');
  d4.terms=fillMissing({
    parties:T('agreed',{value:X('Kumar Print & Pack (designer) and Nair Events (client)','कुमार प्रिंट एंड पैक (डिज़ाइनर) और नायर इवेंट्स (क्लाइंट)','कुमार प्रिंट अँड पॅक (डिझायनर) आणि नायर इव्हेंट्स (क्लायंट)','కుమార్ ప్రింట్ & ప్యాక్ (డిజైనర్), నాయర్ ఈవెంట్స్ (క్లయింట్)','குமார் பிரிண்ட் & பேக் (வடிவமைப்பாளர்) மற்றும் நாயர் ஈவென்ட்ஸ் (வாடிக்கையாளர்)','ಕುಮಾರ್ ಪ್ರಿಂಟ್ & ಪ್ಯಾಕ್ (ವಿನ್ಯಾಸಕ) ಮತ್ತು ನಾಯರ್ ಈವೆಂಟ್ಸ್ (ಗ್ರಾಹಕ)'),clause:X('Kumar Print & Pack (Ravi Kumar) will design the logo and website. Nair Events (Priya Nair) is the client.','कुमार प्रिंट एंड पैक (रवि कुमार) लोगो और वेबसाइट डिज़ाइन करेगा। नायर इवेंट्स (प्रिया नायर) क्लाइंट है।','कुमार प्रिंट अँड पॅक (रवी कुमार) लोगो आणि वेबसाइट डिझाइन करेल. नायर इव्हेंट्स (प्रिया नायर) क्लायंट आहे.','కుమార్ ప్రింట్ & ప్యాక్ (రవి కుమార్) లోగో, వెబ్‌సైట్ డిజైన్ చేస్తుంది. నాయర్ ఈవెంట్స్ (ప్రియా నాయర్) క్లయింట్.','குமார் பிரிண்ட் & பேக் (ரவி குமார்) லோகோ மற்றும் இணையதளத்தை வடிவமைக்கும். நாயர் ஈவென்ட்ஸ் (பிரியா நாயர்) வாடிக்கையாளர்.','ಕುಮಾರ್ ಪ್ರಿಂಟ್ & ಪ್ಯಾಕ್ (ರವಿ ಕುಮಾರ್) ಲೋಗೋ ಮತ್ತು ವೆಬ್‌ಸೈಟ್ ವಿನ್ಯಾಸ ಮಾಡುತ್ತದೆ. ನಾಯರ್ ಈವೆಂಟ್ಸ್ (ಪ್ರಿಯಾ ನಾಯರ್) ಗ್ರಾಹಕರು.'),proposedBy:PN,confirmedBy:RK,evidence:[P(1),P(2)],history:[H(P(1),PN,X('Asks for a logo and website','लोगो और वेबसाइट मांगी','लोगो आणि वेबसाइट मागितली','లోగో, వెబ్‌సైట్ అడిగారు','லோகோவும் இணையதளமும் கேட்டார்','ಲೋಗೋ ಮತ್ತು ವೆಬ್‌ಸೈಟ್ ಕೇಳಿದರು'),'offer'),H(P(2),RK,pr40,'accept')]}),
    scope:T('agreed',{value:X('New logo and a 5-page website','नया लोगो और 5 पेज की वेबसाइट','नवा लोगो आणि 5 पानांची वेबसाइट','కొత్త లోగో, 5 పేజీల వెబ్‌సైట్','புதிய லோகோ மற்றும் 5 பக்க இணையதளம்','ಹೊಸ ಲೋಗೋ ಮತ್ತು 5 ಪುಟಗಳ ವೆಬ್‌ಸೈಟ್'),clause:X('A new logo and a simple 5-page website for Nair Events.','नायर इवेंट्स के लिए नया लोगो और 5 पेज की सादी वेबसाइट।','नायर इव्हेंट्ससाठी नवा लोगो आणि 5 पानांची साधी वेबसाइट.','నాయర్ ఈవెంట్స్ కోసం కొత్త లోగో, 5 పేజీల సాధారణ వెబ్‌సైట్.','நாயர் ஈவென்ட்ஸுக்குப் புதிய லோகோவும் 5 பக்க எளிய இணையதளமும்.','ನಾಯರ್ ಈವೆಂಟ್ಸ್‌ಗೆ ಹೊಸ ಲೋಗೋ ಮತ್ತು 5 ಪುಟಗಳ ಸರಳ ವೆಬ್‌ಸೈಟ್.'),proposedBy:RK,confirmedBy:PN,evidence:[P(1),P(2),P(3)],history:[H(P(2),RK,pr40,'offer'),H(P(3),PN,'Ok fine','accept')]}),
    price:T('agreed',{value:X('₹40,000 total','₹40,000 कुल','एकूण ₹40,000','మొత్తం ₹40,000','மொத்தம் ₹40,000','ಒಟ್ಟು ₹40,000'),clause:X('The total price is ₹40,000.','कुल कीमत ₹40,000 है।','एकूण किंमत ₹40,000 आहे.','మొత్తం ధర ₹40,000.','மொத்த விலை ₹40,000.','ಒಟ್ಟು ಬೆಲೆ ₹40,000.'),proposedBy:RK,confirmedBy:PN,evidence:[P(2),P(3)],history:[H(P(2),RK,pr40,'offer'),H(P(3),PN,'Ok fine','accept')]}),
    tax:T('ambiguous',{value:X('No bill, “GST bach jayega”','बिल नहीं, “GST बच जाएगा”','बिल नाही, “GST वाचेल”','బిల్ లేదు, “GST మిగులుతుంది”','பில் இல்லை, “GST மிச்சமாகும்”','ಬಿಲ್ ಇಲ್ಲ, “GST ಉಳಿಯುತ್ತದೆ”'),open:X('A GST invoice is needed. Skipping the bill to avoid GST is against the law.','GST बिल ज़रूरी है। GST बचाने के लिए बिल न बनाना कानून के ख़िलाफ़ है।','GST बिल आवश्यक आहे. GST टाळण्यासाठी बिल न करणे कायद्याविरुद्ध आहे.','GST ఇన్‌వాయిస్ తప్పనిసరి. GST తప్పించుకోవడానికి బిల్ ఇవ్వకపోవడం చట్టవిరుద్ధం.','GST விலைப்பட்டியல் கட்டாயம். GST ஐத் தவிர்க்க பில் போடாமல் இருப்பது சட்டத்துக்கு எதிரானது.','GST ಇನ್‌ವಾಯ್ಸ್ ಅಗತ್ಯ. GST ತಪ್ಪಿಸಲು ಬಿಲ್ ಮಾಡದಿರುವುದು ಕಾನೂನುಬಾಹಿರ.'),proposedBy:PN,evidence:[P(3)],history:[H(P(3),PN,cashNoBill,'offer')]}),
    payment_mode:T('agreed',{value:X('Cash','नकद','रोख','నగదు','ரொக்கம்','ನಗದು'),clause:X('Payment is made in cash.','भुगतान नकद में होगा।','पैसे रोख दिले जातील.','చెల్లింపు నగదుగా ఉంటుంది.','பணம் ரொக்கமாகச் செலுத்தப்படும்.','ಪಾವತಿ ನಗದಿನಲ್ಲಿ ಆಗುತ್ತದೆ.'),open:X('Cash with no bill cannot be traced. Use UPI or bank transfer with a GST invoice.','बिना बिल के नकद का कोई रिकॉर्ड नहीं रहता। GST बिल के साथ UPI या बैंक ट्रांसफ़र इस्तेमाल करें।','बिलाशिवाय रोख व्यवहाराची नोंद राहत नाही. GST बिलासह UPI किंवा बँक ट्रान्सफर वापरा.','బిల్ లేని నగదుకు జాడ ఉండదు. GST ఇన్‌వాయిస్‌తో UPI లేదా బ్యాంక్ ట్రాన్స్‌ఫర్ వాడండి.','பில் இல்லாத ரொக்கத்தைக் கண்காணிக்க முடியாது. GST விலைப்பட்டியலுடன் UPI அல்லது வங்கிப் பரிமாற்றம் பயன்படுத்துங்கள்.','ಬಿಲ್ ಇಲ್ಲದ ನಗದಿನ ಜಾಡು ಸಿಗುವುದಿಲ್ಲ. GST ಇನ್‌ವಾಯ್ಸ್‌ನೊಂದಿಗೆ UPI ಅಥವಾ ಬ್ಯಾಂಕ್ ವರ್ಗಾವಣೆ ಬಳಸಿ.'),proposedBy:PN,confirmedBy:RK,evidence:[P(3),P(4)],history:[H(P(3),PN,cashNoBill,'offer'),H(P(4),RK,X('Cash is fine','नकद ठीक है','रोख चालेल','నగదు సరే','ரொக்கம் சரி','ನಗದು ಸರಿ'),'accept')]}),
    advance:T('agreed',{value:X('50% = ₹20,000 at the start','50% = ₹20,000 शुरू में','50% = ₹20,000 सुरुवातीला','50% = ₹20,000 మొదట్లో','50% = ₹20,000 தொடக்கத்தில்','50% = ₹20,000 ಆರಂಭದಲ್ಲಿ'),clause:X('50% (₹20,000) is paid at the start.','50% (₹20,000) शुरू में दिया जाएगा।','50% (₹20,000) सुरुवातीला दिले जातील.','50% (₹20,000) మొదట్లో చెల్లిస్తారు.','50% (₹20,000) தொடக்கத்தில் செலுத்தப்படும்.','50% (₹20,000) ಆರಂಭದಲ್ಲಿ ಪಾವತಿಸಲಾಗುತ್ತದೆ.'),proposedBy:PN,confirmedBy:RK,evidence:[P(5),P(6)],history:[H(P(5),PN,half,'offer'),H(P(6),RK,doneW,'accept')]}),
    balance:T('agreed',{value:X('₹20,000 when the site goes live','साइट लाइव होने पर ₹20,000','साइट लाइव्ह झाल्यावर ₹20,000','సైట్ లైవ్ అయినప్పుడు ₹20,000','தளம் நேரலைக்கு வந்ததும் ₹20,000','ಸೈಟ್ ಲೈವ್ ಆದಾಗ ₹20,000'),clause:X('The remaining ₹20,000 is paid when the website goes live.','बाकी ₹20,000 वेबसाइट लाइव होने पर दिए जाएंगे।','उर्वरित ₹20,000 वेबसाइट लाइव्ह झाल्यावर दिले जातील.','మిగిలిన ₹20,000 వెబ్‌సైట్ లైవ్ అయినప్పుడు చెల్లిస్తారు.','மீதி ₹20,000 இணையதளம் நேரலைக்கு வந்ததும் செலுத்தப்படும்.','ಉಳಿದ ₹20,000 ವೆಬ್‌ಸೈಟ್ ಲೈವ್ ಆದಾಗ ಪಾವತಿಸಲಾಗುತ್ತದೆ.'),proposedBy:PN,confirmedBy:RK,evidence:[P(5),P(6)],history:[H(P(5),PN,half,'offer'),H(P(6),RK,doneW,'accept')]}),
    delivery:T('agreed',{value:X('Live by 10 Nov 2026','10 नवंबर 2026 तक लाइव','10 नोव्हेंबर 2026 पर्यंत लाइव्ह','10 నవంబర్ 2026 నాటికి లైవ్','10 நவம்பர் 2026க்குள் நேரலை','10 ನವೆಂಬರ್ 2026ರೊಳಗೆ ಲೈವ್'),clause:X('The website will go live by 10 November 2026.','वेबसाइट 10 नवंबर 2026 तक लाइव हो जाएगी।','वेबसाइट 10 नोव्हेंबर 2026 पर्यंत लाइव्ह होईल.','వెబ్‌సైట్ 10 నవంబర్ 2026 నాటికి లైవ్ అవుతుంది.','இணையதளம் 10 நவம்பர் 2026க்குள் நேரலைக்கு வரும்.','ವೆಬ್‌ಸೈಟ್ 10 ನವೆಂಬರ್ 2026ರೊಳಗೆ ಲೈವ್ ಆಗುತ್ತದೆ.'),proposedBy:RK,confirmedBy:PN,evidence:[P(8),P(9)],history:[H(P(8),RK,X('Live by 10 Nov','10 नवंबर तक लाइव','10 नोव्हेंबरपर्यंत लाइव्ह','10 నవంబర్ నాటికి లైవ్','10 நவம்பருக்குள் நேரலை','10 ನವೆಂಬರ್‌ರೊಳಗೆ ಲೈವ್'),'offer'),H(P(9),PN,'👍','accept')]}),
    ip:T('proposed',{value:X('Priya wants to own the logo fully','प्रिया लोगो की पूरी मालिक बनना चाहती हैं','प्रियांना लोगोची पूर्ण मालकी हवी आहे','లోగోపై పూర్తి యాజమాన్యం ప్రియా కోరుతున్నారు','லோகோவின் முழு உரிமையைப் பிரியா விரும்புகிறார்','ಲೋಗೋದ ಪೂರ್ಣ ಮಾಲೀಕತ್ವ ಪ್ರಿಯಾ ಬಯಸುತ್ತಾರೆ'),clause:X('Nair Events will own the logo fully.','लोगो पूरी तरह नायर इवेंट्स का होगा।','लोगोची पूर्ण मालकी नायर इव्हेंट्सकडे असेल.','లోగో పూర్తిగా నాయర్ ఈవెంట్స్‌దే అవుతుంది.','லோகோ முழுமையாக நாயர் ஈவென்ட்ஸுக்குச் சொந்தமாகும்.','ಲೋಗೋ ಸಂಪೂರ್ಣವಾಗಿ ನಾಯರ್ ಈವೆಂಟ್ಸ್‌ಗೆ ಸೇರುತ್ತದೆ.'),open:X('Ownership passes only through a written transfer signed by Ravi. Nothing covers the website design, code or source files.','मालिकाना हक़ सिर्फ़ रवि के साइन किए लिखित ट्रांसफ़र से मिलता है। वेबसाइट के डिज़ाइन, कोड या सोर्स फ़ाइलों पर कोई बात नहीं हुई।','मालकी फक्त रवींच्या सहीच्या लेखी हस्तांतरणानेच मिळते. वेबसाइटचे डिझाइन, कोड किंवा सोर्स फाइल्स यांबद्दल काहीच ठरलेले नाही.','రవి సంతకం చేసిన రాతపూర్వక బదిలీతోనే యాజమాన్యం వస్తుంది. వెబ్‌సైట్ డిజైన్, కోడ్, సోర్స్ ఫైళ్ల గురించి ఏమీ లేదు.','ரவி கையொப்பமிட்ட எழுத்துப்பூர்வ மாற்றத்தால் மட்டுமே உரிமை கிடைக்கும். இணையதள வடிவமைப்பு, குறியீடு, மூலக் கோப்புகள் பற்றி எதுவும் இல்லை.','ರವಿ ಸಹಿ ಮಾಡಿದ ಲಿಖಿತ ವರ್ಗಾವಣೆಯಿಂದ ಮಾತ್ರ ಮಾಲೀಕತ್ವ ಸಿಗುತ್ತದೆ. ವೆಬ್‌ಸೈಟ್ ವಿನ್ಯಾಸ, ಕೋಡ್ ಅಥವಾ ಸೋರ್ಸ್ ಫೈಲ್ ಬಗ್ಗೆ ಏನೂ ಇಲ್ಲ.'),proposedBy:PN,evidence:[P(7)],history:[H(P(7),PN,X('Logo should be fully ours, will register trademark','लोगो पूरी तरह हमारा हो, ट्रेडमार्क रजिस्टर कराएंगे','लोगो पूर्णपणे आमचा हवा, ट्रेडमार्क नोंदवू','లోగో పూర్తిగా మాదే కావాలి, ట్రేడ్‌మార్క్ నమోదు చేస్తాం','லோகோ முழுக்க எங்களுடையதாக வேண்டும், வர்த்தகக் குறி பதிவு செய்வோம்','ಲೋಗೋ ಸಂಪೂರ್ಣ ನಮ್ಮದಾಗಿರಬೇಕು, ಟ್ರೇಡ್‌ಮಾರ್ಕ್ ನೋಂದಾಯಿಸುತ್ತೇವೆ'),'offer')]})
  });
  d4.flags=[fraudFlag(d4),
    {severity:'high',title:X('Logo ownership is not in writing yet','लोगो का मालिकाना हक़ अभी लिखित में नहीं','लोगोची मालकी अजून लेखी नाही','లోగో యాజమాన్యం ఇంకా రాతపూర్వకంగా లేదు','லோகோ உரிமை இன்னும் எழுத்தில் இல்லை','ಲೋಗೋ ಮಾಲೀಕತ್ವ ಇನ್ನೂ ಲಿಖಿತದಲ್ಲಿಲ್ಲ'),detail:X('Priya wants to own the logo and register it as a trademark. That needs a written transfer from you. Agree on the website files and code too.','प्रिया लोगो की मालिक बनकर उसे ट्रेडमार्क के रूप में रजिस्टर कराना चाहती हैं। इसके लिए आपकी ओर से लिखित ट्रांसफ़र चाहिए। वेबसाइट की फ़ाइलों और कोड पर भी बात तय करें।','प्रियांना लोगोची मालकी घेऊन तो ट्रेडमार्क म्हणून नोंदवायचा आहे. त्यासाठी तुमच्याकडून लेखी हस्तांतरण लागते. वेबसाइटच्या फाइल्स आणि कोडबद्दलही ठरवा.','ప్రియా లోగోకు యజమాని అయి దాన్ని ట్రేడ్‌మార్క్‌గా నమోదు చేయాలనుకుంటున్నారు. దానికి మీ నుంచి రాతపూర్వక బదిలీ కావాలి. వెబ్‌సైట్ ఫైళ్లు, కోడ్ గురించి కూడా ఒప్పుకోండి.','பிரியா லோகோவின் உரிமையாளராகி அதை வர்த்தகக் குறியாகப் பதிவு செய்ய விரும்புகிறார். அதற்கு உங்களிடமிருந்து எழுத்துப்பூர்வ மாற்றம் தேவை. இணையதளக் கோப்புகள், குறியீடு பற்றியும் ஒப்புக்கொள்ளுங்கள்.','ಪ್ರಿಯಾ ಲೋಗೋದ ಮಾಲೀಕರಾಗಿ ಅದನ್ನು ಟ್ರೇಡ್‌ಮಾರ್ಕ್ ಆಗಿ ನೋಂದಾಯಿಸಲು ಬಯಸುತ್ತಾರೆ. ಅದಕ್ಕೆ ನಿಮ್ಮಿಂದ ಲಿಖಿತ ವರ್ಗಾವಣೆ ಬೇಕು. ವೆಬ್‌ಸೈಟ್ ಫೈಲ್ ಮತ್ತು ಕೋಡ್ ಬಗ್ಗೆಯೂ ಒಪ್ಪಿಕೊಳ್ಳಿ.'),ask:{k:'sx_ip',p:{name:'Priya'}},keys:['ip']}];
  d4.dates=[{date:'2026-11-10',label:X('Website goes live','वेबसाइट लाइव होगी','वेबसाइट लाइव्ह होईल','వెబ్‌సైట్ లైవ్ అవుతుంది','இணையதளம் நேரலைக்கு வரும்','ವೆಬ್‌ಸೈಟ್ ಲೈವ್ ಆಗುತ್ತದೆ'),kind:'delivery',status:'agreed'},{date:'2026-11-10',label:X('Collect balance ₹20,000','बाकी ₹20,000 लेने हैं','उर्वरित ₹20,000 घ्यायचे','మిగిలిన ₹20,000 తీసుకోవాలి','மீதி ₹20,000 வசூலிக்க வேண்டும்','ಬಾಕಿ ₹20,000 ಪಡೆಯಬೇಕು'),kind:'payment',status:'agreed'}];
  d4.analysis={at:'2026-10-15T19:02:00'+TZ,method:'claude',records:1};
  const r4=clausesFromTerms(d4.terms); r4.forEach(c=>log(d4,c.id,1,'generated',c.text,'@pakka','2026-10-15T19:02:00'+TZ));
  const v41=await sealVersion(d4,r4,1,'2026-10-16T12:00:00'+TZ);
  await signVersion(v41,d4.parties[0],null,'drawn','2026-10-16T12:04:00'+TZ); await signVersion(v41,d4.parties[1],null,'drawn','2026-10-16T15:40:00'+TZ);
  d4.versions.push(v41);
  d4.lawyerReq={rev:1,lawyerId:'l1',name:'Adv. Meera Iyer',fee:499,platform:PLATFORM_FEE,at:'2026-10-23T10:00:00'+TZ,by:RK,status:'pending'};
  /* Deal 5: Ravi buys paper board. WhatsApp chat plus a voice note; version 1 is locked and waiting for both signatures */
  const RJ='Rakesh Jain';
  const d5=newDealObj('D-05',X('Paper board from Shree Paper Mart','श्री पेपर मार्ट से पेपर बोर्ड','श्री पेपर मार्टकडून पेपर बोर्ड','శ్రీ పేపర్ మార్ట్ నుంచి పేపర్ బోర్డు','ஸ்ரீ பேப்பர் மார்ட்டிலிருந்து காகித அட்டை','ಶ್ರೀ ಪೇಪರ್ ಮಾರ್ಟ್‌ನಿಂದ ಪೇಪರ್ ಬೋರ್ಡ್'),'2026-10-24T09:30:00'+TZ,[Object.assign({},me,{role:'Buyer'}),{id:'cp',name:RJ,org:'Shree Paper Mart',role:'Seller',address:'112, Avenue Road, Bengaluru 560002',gstin:'29AAGFS4321K1Z8',udyam:''}],RAVI);
  d5.value=12000; d5.category={id:'printing',by:'auto'}; d5.stamp.status='not_needed';
  d5.records.push(await mkRecord({id:'CR-1401',dealId:'D-05',type:'whatsapp',name:'WhatsApp Chat with Rakesh Jain.txt',uploadedAt:'2026-10-24T09:30:00'+TZ,rawText:WA5,messages:parseChat(WA5)}));
  d5.records.push(await mkRecord({id:'CR-1402',dealId:'D-05',type:'voice',name:'PTT-20261023-WA0011.mp3',uploadedAt:'2026-10-24T09:32:00'+TZ,rawText:VN5,method:'transcript',fileHash:await sha256Bytes(audioBytes('vn3')),messages:[{n:1,ts:'2026-10-23T18:05:00'+TZ,sender:RJ,text:VN5}],consent:{basis:'sent_by_them',party:true,at:'2026-10-24T09:32:00'+TZ},media:{kind:'audio',src:'vn3'}}));
  const Q=n=>'CR-1401#'+n, QV='CR-1402#1';
  const p40=X('Ok ₹40 final','ठीक है, ₹40 आख़िरी','ठीक, ₹40 अंतिम','సరే, ₹40 చివరి ధర','சரி, ₹40 இறுதி','ಸರಿ, ₹40 ಅಂತಿಮ'), byNeft=X('By 28th, NEFT within 15 days','28 तक, 15 दिन में NEFT','28 पर्यंत, 15 दिवसांत NEFT','28 నాటికి, 15 రోజుల్లో NEFT','28க்குள், 15 நாளில் NEFT','28ರೊಳಗೆ, 15 ದಿನದಲ್ಲಿ NEFT'), doneInv=X('Done, tax invoice with goods','तय, सामान के साथ टैक्स इनवॉइस','ठरले, मालासोबत कर बीजक','ఖరారు, సరుకుతో ట్యాక్స్ ఇన్‌వాయిస్','உறுதி, பொருளுடன் வரி விலைப்பட்டியல்','ಖಚಿತ, ಸರಕಿನೊಂದಿಗೆ ತೆರಿಗೆ ಇನ್‌ವಾಯ್ಸ್'), cert2=X('Certificate and 2-day replacement','सर्टिफ़िकेट और 2 दिन में बदली','प्रमाणपत्र आणि 2 दिवसांत बदल','సర్టిఫికెట్, 2 రోజుల్లో మార్పు','சான்றிதழ், 2 நாளில் மாற்றம்','ಪ್ರಮಾಣಪತ್ರ ಮತ್ತು 2 ದಿನದಲ್ಲಿ ಬದಲಿ'), s300=X('300 sheets, 350 GSM food-grade','300 शीट, 350 GSM फ़ूड-ग्रेड','300 शीट, 350 GSM फूड-ग्रेड','300 షీట్లు, 350 GSM ఫుడ్-గ్రేడ్','300 தாள்கள், 350 GSM உணவுத் தரம்','300 ಶೀಟ್, 350 GSM ಫುಡ್-ಗ್ರೇಡ್');
  d5.terms=fillMissing({
    parties:T('agreed',{value:X('Shree Paper Mart (seller) and Kumar Print & Pack (buyer)','श्री पेपर मार्ट (विक्रेता) और कुमार प्रिंट एंड पैक (खरीदार)','श्री पेपर मार्ट (विक्रेता) आणि कुमार प्रिंट अँड पॅक (खरेदीदार)','శ్రీ పేపర్ మార్ట్ (అమ్మేవారు), కుమార్ ప్రింట్ & ప్యాక్ (కొనేవారు)','ஸ்ரீ பேப்பர் மார்ட் (விற்பவர்) மற்றும் குமார் பிரிண்ட் & பேக் (வாங்குபவர்)','ಶ್ರೀ ಪೇಪರ್ ಮಾರ್ಟ್ (ಮಾರಾಟಗಾರ) ಮತ್ತು ಕುಮಾರ್ ಪ್ರಿಂಟ್ & ಪ್ಯಾಕ್ (ಖರೀದಿದಾರ)'),clause:X('Shree Paper Mart (Rakesh Jain) will supply the board. Kumar Print & Pack (Ravi Kumar) is buying it.','श्री पेपर मार्ट (राकेश जैन) बोर्ड देगा। कुमार प्रिंट एंड पैक (रवि कुमार) इसे खरीद रहा है।','श्री पेपर मार्ट (राकेश जैन) बोर्ड पुरवेल. कुमार प्रिंट अँड पॅक (रवी कुमार) तो खरेदी करत आहे.','శ్రీ పేపర్ మార్ట్ (రాకేష్ జైన్) బోర్డు సరఫరా చేస్తుంది. కుమార్ ప్రింట్ & ప్యాక్ (రవి కుమార్) దాన్ని కొంటోంది.','ஸ்ரீ பேப்பர் மார்ட் (ராகேஷ் ஜெயின்) அட்டையை வழங்கும். குமார் பிரிண்ட் & பேக் (ரவி குமார்) அதை வாங்குகிறது.','ಶ್ರೀ ಪೇಪರ್ ಮಾರ್ಟ್ (ರಾಕೇಶ್ ಜೈನ್) ಬೋರ್ಡ್ ಪೂರೈಸುತ್ತದೆ. ಕುಮಾರ್ ಪ್ರಿಂಟ್ & ಪ್ಯಾಕ್ (ರವಿ ಕುಮಾರ್) ಅದನ್ನು ಖರೀದಿಸುತ್ತಿದೆ.'),proposedBy:RK,confirmedBy:RJ,evidence:[Q(1),Q(2)],history:[H(Q(1),RK,s300,'offer'),H(Q(2),RJ,X('₹42 per sheet plus GST','₹42 प्रति शीट, GST अलग','₹42 प्रति शीट, GST वेगळा','ఒక్కో షీట్ ₹42, GST అదనం','ஒரு தாள் ₹42, GST தனி','ಪ್ರತಿ ಶೀಟ್ ₹42, GST ಹೆಚ್ಚುವರಿ'),'accept')]}),
    scope:T('agreed',{value:X('300 sheets of food-grade board','फ़ूड-ग्रेड बोर्ड की 300 शीट','फूड-ग्रेड बोर्डच्या 300 शीट','ఫుడ్-గ్రేడ్ బోర్డు 300 షీట్లు','உணவுத் தர அட்டை 300 தாள்கள்','ಫುಡ್-ಗ್ರೇಡ್ ಬೋರ್ಡ್‌ನ 300 ಶೀಟ್'),clause:X('300 sheets of food-grade paper board.','फ़ूड-ग्रेड पेपर बोर्ड की 300 शीट।','फूड-ग्रेड पेपर बोर्डच्या 300 शीट.','ఫుడ్-గ్రేడ్ పేపర్ బోర్డు 300 షీట్లు.','உணவுத் தர காகித அட்டை 300 தாள்கள்.','ಫುಡ್-ಗ್ರೇಡ್ ಪೇಪರ್ ಬೋರ್ಡ್‌ನ 300 ಶೀಟ್.'),proposedBy:RK,confirmedBy:RJ,evidence:[Q(1),Q(2)],history:[H(Q(1),RK,s300,'offer'),H(Q(2),RJ,X('Available','उपलब्ध है','उपलब्ध आहे','అందుబాటులో ఉంది','கிடைக்கிறது','ಲಭ್ಯವಿದೆ'),'accept')]}),
    specs:T('agreed',{value:X('350 GSM, food-grade, with certificate','350 GSM, फ़ूड-ग्रेड, सर्टिफ़िकेट के साथ','350 GSM, फूड-ग्रेड, प्रमाणपत्रासह','350 GSM, ఫుడ్-గ్రేడ్, సర్టిఫికెట్‌తో','350 GSM, உணவுத் தரம், சான்றிதழுடன்','350 GSM, ಫುಡ್-ಗ್ರೇಡ್, ಪ್ರಮಾಣಪತ್ರದೊಂದಿಗೆ'),clause:X('Board of 350 GSM, food-grade, sent with its food-grade certificate.','350 GSM का फ़ूड-ग्रेड बोर्ड, फ़ूड-ग्रेड सर्टिफ़िकेट के साथ भेजा जाएगा।','350 GSM चा फूड-ग्रेड बोर्ड, फूड-ग्रेड प्रमाणपत्रासह पाठवला जाईल.','350 GSM ఫుడ్-గ్రేడ్ బోర్డు, ఫుడ్-గ్రేడ్ సర్టిఫికెట్‌తో పంపుతారు.','350 GSM உணவுத் தர அட்டை, உணவுத் தரச் சான்றிதழுடன் அனுப்பப்படும்.','350 GSM ಫುಡ್-ಗ್ರೇಡ್ ಬೋರ್ಡ್, ಫುಡ್-ಗ್ರೇಡ್ ಪ್ರಮಾಣಪತ್ರದೊಂದಿಗೆ ಕಳುಹಿಸಲಾಗುತ್ತದೆ.'),proposedBy:RK,confirmedBy:RJ,evidence:[Q(1),Q(2),QV],history:[H(Q(1),RK,s300,'offer'),H(QV,RJ,cert2,'accept')]}),
    price:T('agreed',{value:X('₹40 per sheet plus GST','₹40 प्रति शीट, GST अलग','₹40 प्रति शीट, GST वेगळा','ఒక్కో షీట్ ₹40, GST అదనం','ஒரு தாள் ₹40, GST தனி','ಪ್ರತಿ ಶೀಟ್ ₹40, GST ಹೆಚ್ಚುವರಿ'),clause:X('The price is ₹40 per sheet plus GST, ₹12,000 before tax.','कीमत ₹40 प्रति शीट है, GST अलग, टैक्स से पहले ₹12,000।','किंमत ₹40 प्रति शीट आहे, GST वेगळा, करापूर्वी ₹12,000.','ధర ఒక్కో షీట్ ₹40, GST అదనం, పన్నుకు ముందు ₹12,000.','விலை ஒரு தாள் ₹40, GST தனி, வரிக்கு முன் ₹12,000.','ಬೆಲೆ ಪ್ರತಿ ಶೀಟ್ ₹40, GST ಹೆಚ್ಚುವರಿ, ತೆರಿಗೆಗೆ ಮೊದಲು ₹12,000.'),proposedBy:RJ,confirmedBy:RK,evidence:[Q(2),Q(3),Q(4)],history:[H(Q(2),RJ,'₹42 per sheet plus GST','offer'),H(Q(3),RK,X('Asks for ₹40','₹40 मांगा','₹40 मागितले','₹40 అడిగారు','₹40 கேட்டார்','₹40 ಕೇಳಿದರು'),'counter'),H(Q(4),RJ,p40,'accept')]}),
    tax:T('agreed',{value:X('GST extra, tax invoice with the goods','GST अलग, सामान के साथ टैक्स इनवॉइस','GST वेगळा, मालासोबत कर बीजक','GST అదనం, సరుకుతో ట్యాక్స్ ఇన్‌వాయిస్','GST தனி, பொருளுடன் வரி விலைப்பட்டியல்','GST ಹೆಚ್ಚುವರಿ, ಸರಕಿನೊಂದಿಗೆ ತೆರಿಗೆ ಇನ್‌ವಾಯ್ಸ್'),clause:X('GST is charged extra on a tax invoice sent with the goods.','GST अलग से लगेगा, सामान के साथ भेजे गए टैक्स इनवॉइस पर।','GST वेगळा लागेल, मालासोबत पाठवलेल्या कर बीजकावर.','సరుకుతో పంపే ట్యాక్స్ ఇన్‌వాయిస్‌పై GST అదనంగా వసూలు చేస్తారు.','பொருளுடன் அனுப்பப்படும் வரி விலைப்பட்டியலில் GST தனியாக வசூலிக்கப்படும்.','ಸರಕಿನೊಂದಿಗೆ ಕಳುಹಿಸುವ ತೆರಿಗೆ ಇನ್‌ವಾಯ್ಸ್‌ನಲ್ಲಿ GST ಹೆಚ್ಚುವರಿಯಾಗಿ ವಿಧಿಸಲಾಗುತ್ತದೆ.'),proposedBy:RJ,confirmedBy:RK,evidence:[Q(2),Q(6)],history:[H(Q(2),RJ,'₹42 per sheet plus GST','offer'),H(Q(6),RJ,doneInv,'accept')]}),
    delivery:T('agreed',{value:X('By 28 Oct 2026 at the Chickpet unit','28 अक्टूबर 2026 तक, चिकपेट यूनिट पर','28 ऑक्टोबर 2026 पर्यंत, चिकपेट युनिटवर','28 అక్టోబర్ 2026 నాటికి, చిక్‌పేట్ యూనిట్‌కు','28 அக்டோபர் 2026க்குள், சிக்பேட் பிரிவுக்கு','28 ಅಕ್ಟೋಬರ್ 2026ರೊಳಗೆ, ಚಿಕ್ಕಪೇಟೆ ಘಟಕಕ್ಕೆ'),clause:X('The board will be delivered to the Kumar Print & Pack unit in Chickpet by 28 October 2026.','बोर्ड 28 अक्टूबर 2026 तक चिकपेट में कुमार प्रिंट एंड पैक की यूनिट पर पहुंचाया जाएगा।','बोर्ड 28 ऑक्टोबर 2026 पर्यंत चिकपेटमधील कुमार प्रिंट अँड पॅकच्या युनिटवर पोहोचवला जाईल.','బోర్డు 28 అక్టోబర్ 2026 నాటికి చిక్‌పేట్‌లోని కుమార్ ప్రింట్ & ప్యాక్ యూనిట్‌కు చేరుతుంది.','அட்டை 28 அக்டோபர் 2026க்குள் சிக்பேட்டில் உள்ள குமார் பிரிண்ட் & பேக் பிரிவுக்கு வந்து சேரும்.','ಬೋರ್ಡ್ 28 ಅಕ್ಟೋಬರ್ 2026ರೊಳಗೆ ಚಿಕ್ಕಪೇಟೆಯ ಕುಮಾರ್ ಪ್ರಿಂಟ್ & ಪ್ಯಾಕ್ ಘಟಕಕ್ಕೆ ತಲುಪುತ್ತದೆ.'),proposedBy:RK,confirmedBy:RJ,evidence:[Q(5),Q(6)],history:[H(Q(5),RK,byNeft,'offer'),H(Q(6),RJ,doneInv,'accept')]}),
    balance:T('agreed',{value:X('Full amount within 15 days of delivery','डिलीवरी के 15 दिन के अंदर पूरी रकम','डिलिव्हरीनंतर 15 दिवसांत पूर्ण रक्कम','డెలివరీ అయిన 15 రోజుల్లో పూర్తి మొత్తం','டெலிவரியான 15 நாட்களுக்குள் முழுத் தொகை','ಡೆಲಿವರಿಯಾದ 15 ದಿನಗಳಲ್ಲಿ ಪೂರ್ತಿ ಮೊತ್ತ'),clause:X('Kumar Print & Pack pays the full amount within 15 days of delivery.','कुमार प्रिंट एंड पैक डिलीवरी के 15 दिन के अंदर पूरी रकम देगा।','कुमार प्रिंट अँड पॅक डिलिव्हरीनंतर 15 दिवसांत पूर्ण रक्कम देईल.','కుమార్ ప్రింట్ & ప్యాక్ డెలివరీ అయిన 15 రోజుల్లో పూర్తి మొత్తం చెల్లిస్తుంది.','குமார் பிரிண்ட் & பேக் டெலிவரியான 15 நாட்களுக்குள் முழுத் தொகையைச் செலுத்தும்.','ಕುಮಾರ್ ಪ್ರಿಂಟ್ & ಪ್ಯಾಕ್ ಡೆಲಿವರಿಯಾದ 15 ದಿನಗಳಲ್ಲಿ ಪೂರ್ತಿ ಮೊತ್ತ ಪಾವತಿಸುತ್ತದೆ.'),proposedBy:RK,confirmedBy:RJ,evidence:[Q(5),Q(6)],history:[H(Q(5),RK,byNeft,'offer'),H(Q(6),RJ,doneInv,'accept')]}),
    payment_mode:T('agreed',{value:X('NEFT bank transfer','NEFT बैंक ट्रांसफ़र','NEFT बँक ट्रान्सफर','NEFT బ్యాంక్ ట్రాన్స్‌ఫర్','NEFT வங்கிப் பரிமாற்றம்','NEFT ಬ್ಯಾಂಕ್ ವರ್ಗಾವಣೆ'),clause:X('Payment is made by NEFT bank transfer.','भुगतान NEFT बैंक ट्रांसफ़र से होगा।','पैसे NEFT बँक ट्रान्सफरने दिले जातील.','చెల్లింపు NEFT బ్యాంక్ ట్రాన్స్‌ఫర్ ద్వారా.','பணம் NEFT வங்கிப் பரிமாற்றம் மூலம் செலுத்தப்படும்.','ಪಾವತಿ NEFT ಬ್ಯಾಂಕ್ ವರ್ಗಾವಣೆ ಮೂಲಕ.'),proposedBy:RK,confirmedBy:RJ,evidence:[Q(5),Q(6)],history:[H(Q(5),RK,byNeft,'offer'),H(Q(6),RJ,doneInv,'accept')]}),
    quality:T('proposed',{value:X('Damaged sheets replaced within 2 days','खराब शीट 2 दिन में बदली जाएंगी','खराब शीट 2 दिवसांत बदलल्या जातील','పాడైన షీట్లు 2 రోజుల్లో మారుస్తారు','சேதமான தாள்கள் 2 நாளில் மாற்றப்படும்','ಹಾಳಾದ ಶೀಟ್ 2 ದಿನದಲ್ಲಿ ಬದಲಿಸಲಾಗುತ್ತದೆ'),clause:X('Any damaged sheet will be replaced within 2 days.','कोई भी खराब शीट 2 दिन के अंदर बदली जाएगी।','कोणतीही खराब शीट 2 दिवसांत बदलली जाईल.','పాడైన ఏ షీట్ అయినా 2 రోజుల్లో మారుస్తారు.','சேதமான எந்தத் தாளும் 2 நாட்களுக்குள் மாற்றப்படும்.','ಹಾಳಾದ ಯಾವುದೇ ಶೀಟ್ 2 ದಿನಗಳಲ್ಲಿ ಬದಲಿಸಲಾಗುತ್ತದೆ.'),open:X('Only in Rakesh’s voice note. Ravi has not replied to it.','यह सिर्फ़ राकेश के वॉइस नोट में है। रवि ने इसका जवाब नहीं दिया।','हे फक्त राकेश यांच्या व्हॉइस नोटमध्ये आहे. रवींनी त्याला उत्तर दिलेले नाही.','ఇది రాకేష్ వాయిస్ నోట్‌లో మాత్రమే ఉంది. రవి దానికి జవాబు ఇవ్వలేదు.','இது ராகேஷின் குரல் பதிவில் மட்டுமே உள்ளது. ரவி அதற்குப் பதில் அளிக்கவில்லை.','ಇದು ರಾಕೇಶ್ ಅವರ ವಾಯ್ಸ್ ನೋಟ್‌ನಲ್ಲಿ ಮಾತ್ರ ಇದೆ. ರವಿ ಅದಕ್ಕೆ ಉತ್ತರಿಸಿಲ್ಲ.'),proposedBy:RJ,evidence:[QV],history:[H(QV,RJ,cert2,'offer')]})
  });
  d5.flags=[{severity:'high',title:X('Nothing agreed if the board comes late','बोर्ड देर से आए तो क्या होगा, यह तय नहीं','बोर्ड उशिरा आला तर काय, हे ठरलेले नाही','బోర్డు ఆలస్యంగా వస్తే ఏమిటో ఒప్పుకోలేదు','அட்டை தாமதமாக வந்தால் என்ன என்று ஒப்புக்கொள்ளவில்லை','ಬೋರ್ಡ್ ತಡವಾಗಿ ಬಂದರೆ ಏನು ಎಂದು ಒಪ್ಪಿಲ್ಲ'),detail:X('Your Diwali boxes depend on this board. If it comes after 28 Oct, nothing says what Shree Paper Mart owes you.','आपके दिवाली डिब्बे इसी बोर्ड पर टिके हैं। अगर यह 28 अक्टूबर के बाद आया, तो कहीं नहीं लिखा कि श्री पेपर मार्ट क्या देगा।','तुमचे दिवाळीचे बॉक्स याच बोर्डवर अवलंबून आहेत. तो 28 ऑक्टोबरनंतर आला, तर श्री पेपर मार्ट काय देईल हे कुठेही लिहिलेले नाही.','మీ దీపావళి బాక్సులు ఈ బోర్డుపైనే ఆధారపడ్డాయి. ఇది 28 అక్టోబర్ తర్వాత వస్తే శ్రీ పేపర్ మార్ట్ ఏమి ఇవ్వాలో ఎక్కడా లేదు.','உங்கள் தீபாவளிப் பெட்டிகள் இந்த அட்டையைச் சார்ந்துள்ளன. இது 28 அக்டோபருக்குப் பிறகு வந்தால், ஸ்ரீ பேப்பர் மார்ட் என்ன தர வேண்டும் என்று எங்கும் இல்லை.','ನಿಮ್ಮ ದೀಪಾವಳಿ ಬಾಕ್ಸ್‌ಗಳು ಈ ಬೋರ್ಡ್ ಮೇಲೆ ಅವಲಂಬಿತ. ಇದು 28 ಅಕ್ಟೋಬರ್ ನಂತರ ಬಂದರೆ ಶ್ರೀ ಪೇಪರ್ ಮಾರ್ಟ್ ಏನು ಕೊಡಬೇಕು ಎಂದು ಎಲ್ಲೂ ಇಲ್ಲ.'),ask:X('Rakesh ji, if the board reaches after 28th, please give ₹200 off for each day of delay. Ok?','राकेश जी, अगर बोर्ड 28 तारीख के बाद पहुंचे, तो देरी के हर दिन ₹200 कम कर दीजिए। ठीक है?','राकेश जी, बोर्ड 28 तारखेनंतर पोहोचला, तर उशिराच्या प्रत्येक दिवसाचे ₹200 कमी करा. चालेल?','రాకేష్ గారు, బోర్డు 28 తర్వాత వస్తే ఆలస్యమైన ప్రతి రోజుకు ₹200 తగ్గించండి. సరేనా?','ராகேஷ் ஜி, அட்டை 28க்குப் பிறகு வந்தால் தாமதமான ஒவ்வொரு நாளுக்கும் ₹200 குறைத்துக் கொடுங்கள். சரியா?','ರಾಕೇಶ್ ಅವರೇ, ಬೋರ್ಡ್ 28ರ ನಂತರ ಬಂದರೆ ತಡವಾದ ಪ್ರತಿ ದಿನಕ್ಕೆ ₹200 ಕಡಿಮೆ ಮಾಡಿ. ಸರಿಯೇ?'),keys:['late_penalty']},
    {severity:'medium',title:X('Get the food-grade certificate in writing','फ़ूड-ग्रेड सर्टिफ़िकेट लिखित में लें','फूड-ग्रेड प्रमाणपत्र लेखी घ्या','ఫుడ్-గ్రేడ్ సర్టిఫికెట్ రాతపూర్వకంగా తీసుకోండి','உணவுத் தரச் சான்றிதழை எழுத்தில் பெறுங்கள்','ಫುಡ್-ಗ್ರೇಡ್ ಪ್ರಮಾಣಪತ್ರವನ್ನು ಲಿಖಿತವಾಗಿ ಪಡೆಯಿರಿ'),detail:X('Rakesh promised the certificate and 2-day replacement only in a voice note. Your sweet boxes need this proof.','राकेश ने सर्टिफ़िकेट और 2 दिन में बदली का वादा सिर्फ़ वॉइस नोट में किया है। आपके मिठाई के डिब्बों के लिए यह सबूत ज़रूरी है।','राकेश यांनी प्रमाणपत्र आणि 2 दिवसांत बदलाचे वचन फक्त व्हॉइस नोटमध्ये दिले आहे. तुमच्या मिठाईच्या बॉक्ससाठी हा पुरावा आवश्यक आहे.','రాకేష్ సర్టిఫికెట్, 2 రోజుల్లో మార్పు అని వాయిస్ నోట్‌లో మాత్రమే చెప్పారు. మీ స్వీట్ బాక్సులకు ఈ రుజువు అవసరం.','சான்றிதழையும் 2 நாளில் மாற்றுவதையும் ராகேஷ் குரல் பதிவில் மட்டுமே உறுதியளித்தார். உங்கள் இனிப்புப் பெட்டிகளுக்கு இந்தச் சான்று தேவை.','ಪ್ರಮಾಣಪತ್ರ ಮತ್ತು 2 ದಿನದಲ್ಲಿ ಬದಲಿಯ ಭರವಸೆಯನ್ನು ರಾಕೇಶ್ ವಾಯ್ಸ್ ನೋಟ್‌ನಲ್ಲಿ ಮಾತ್ರ ನೀಡಿದ್ದಾರೆ. ನಿಮ್ಮ ಸಿಹಿ ಬಾಕ್ಸ್‌ಗಳಿಗೆ ಈ ಪುರಾವೆ ಬೇಕು.'),ask:X('Rakesh ji, please send the food-grade certificate with the invoice. And damaged sheets replaced in 2 days, as you said. Ok?','राकेश जी, कृपया इनवॉइस के साथ फ़ूड-ग्रेड सर्टिफ़िकेट भेजें। और जैसा आपने कहा, खराब शीट 2 दिन में बदल दें। ठीक है?','राकेश जी, कृपया बीजकासोबत फूड-ग्रेड प्रमाणपत्र पाठवा. आणि तुम्ही म्हटल्याप्रमाणे खराब शीट 2 दिवसांत बदला. चालेल?','రాకేష్ గారు, ఇన్‌వాయిస్‌తో ఫుడ్-గ్రేడ్ సర్టిఫికెట్ పంపండి. మీరు చెప్పినట్లు పాడైన షీట్లు 2 రోజుల్లో మార్చండి. సరేనా?','ராகேஷ் ஜி, விலைப்பட்டியலுடன் உணவுத் தரச் சான்றிதழை அனுப்புங்கள். நீங்கள் சொன்னபடி சேதமான தாள்களை 2 நாளில் மாற்றுங்கள். சரியா?','ರಾಕೇಶ್ ಅವರೇ, ಇನ್‌ವಾಯ್ಸ್ ಜೊತೆ ಫುಡ್-ಗ್ರೇಡ್ ಪ್ರಮಾಣಪತ್ರ ಕಳುಹಿಸಿ. ನೀವು ಹೇಳಿದಂತೆ ಹಾಳಾದ ಶೀಟ್ 2 ದಿನದಲ್ಲಿ ಬದಲಿಸಿ. ಸರಿಯೇ?'),keys:['specs','quality']}];
  d5.dates=[{date:'2026-10-28',label:X('Board delivery from Shree Paper Mart','श्री पेपर मार्ट से बोर्ड की डिलीवरी','श्री पेपर मार्टकडून बोर्डची डिलिव्हरी','శ్రీ పేపర్ మార్ట్ నుంచి బోర్డు డెలివరీ','ஸ்ரீ பேப்பர் மார்ட்டிலிருந்து அட்டை டெலிவரி','ಶ್ರೀ ಪೇಪರ್ ಮಾರ್ಟ್‌ನಿಂದ ಬೋರ್ಡ್ ಡೆಲಿವರಿ'),kind:'delivery',status:'agreed'},{date:'2026-11-12',label:X('Pay Shree Paper Mart by NEFT','श्री पेपर मार्ट को NEFT से भुगतान','श्री पेपर मार्टला NEFT ने पैसे','శ్రీ పేపర్ మార్ట్‌కు NEFT ద్వారా చెల్లింపు','ஸ்ரீ பேப்பர் மார்ட்டுக்கு NEFT மூலம் பணம்','ಶ್ರೀ ಪೇಪರ್ ಮಾರ್ಟ್‌ಗೆ NEFT ಮೂಲಕ ಪಾವತಿ'),kind:'payment',status:'agreed'}];
  d5.analysis={at:'2026-10-24T09:35:00'+TZ,method:'claude',records:2};
  const r5=clausesFromTerms(d5.terms); r5.forEach(c=>log(d5,c.id,1,'generated',c.text,'@pakka','2026-10-24T09:35:00'+TZ));
  const v51=await sealVersion(d5,r5,1,'2026-10-24T11:00:00'+TZ); d5.versions.push(v51);
  r5.forEach(c=>log(d5,c.id,1,'locked',c.text,'@both','2026-10-24T11:00:00'+TZ,'SHA-256 '+shortHash(v51.hash)));
  /* more dated steps, so the calendar shows the real rhythm of the work */
  d1.dates.push(
    {date:'2026-10-25',label:X('Logo file due from Anjali','अंजलि से लोगो फ़ाइल आनी है','अंजलींकडून लोगो फाइल यायची आहे','అంజలి నుంచి లోగో ఫైల్ రావాలి','அஞ்சலியிடமிருந்து லோகோ கோப்பு வர வேண்டும்','ಅಂಜಲಿಯಿಂದ ಲೋಗೋ ಫೈಲ್ ಬರಬೇಕು'),kind:'deadline',status:'proposed'},
    {date:'2026-10-27',label:X('Start printing the sweet boxes','मिठाई के डिब्बों की छपाई शुरू','मिठाईच्या बॉक्सची छपाई सुरू','స్వీట్ బాక్సుల ముద్రణ ప్రారంభం','இனிப்புப் பெட்டிகள் அச்சிடத் தொடக்கம்','ಸಿಹಿ ಬಾಕ್ಸ್ ಮುದ್ರಣ ಆರಂಭ'),kind:'meeting',status:'proposed'},
    {date:'2026-10-29',label:X('Quality check of printed boxes','छपे डिब्बों की गुणवत्ता जांच','छापील बॉक्सची गुणवत्ता तपासणी','ముద్రించిన బాక్సుల నాణ్యత తనిఖీ','அச்சிட்ட பெட்டிகளின் தரச் சோதனை','ಮುದ್ರಿತ ಬಾಕ್ಸ್‌ಗಳ ಗುಣಮಟ್ಟ ಪರಿಶೀಲನೆ'),kind:'meeting',status:'proposed'});
  d3.dates.push({date:'2026-10-28',label:X('Send the written quote to Sunil','सुनील को लिखित कोटेशन भेजना है','सुनील यांना लेखी कोटेशन पाठवायचे','సునీల్‌కు రాతపూర్వక కొటేషన్ పంపాలి','சுனிலுக்கு எழுத்துப்பூர்வ விலைப்புள்ளி அனுப்ப வேண்டும்','ಸುನೀಲ್‌ಗೆ ಲಿಖಿತ ಕೊಟೇಶನ್ ಕಳುಹಿಸಬೇಕು'),kind:'deadline',status:'proposed'});
  d4.dates.push(
    {date:'2026-10-16',label:X('Advance ₹20,000 received','₹20,000 एडवांस मिला','₹20,000 आगाऊ मिळाले','₹20,000 అడ్వాన్స్ వచ్చింది','₹20,000 முன்பணம் கிடைத்தது','₹20,000 ಮುಂಗಡ ಬಂದಿದೆ'),kind:'payment',status:'done'},
    {date:'2026-11-02',label:X('Show the website design to Priya','प्रिया को वेबसाइट डिज़ाइन दिखाना है','प्रियांना वेबसाइट डिझाइन दाखवायचे','ప్రియాకు వెబ్‌సైట్ డిజైన్ చూపించాలి','பிரியாவுக்கு இணையதள வடிவமைப்பைக் காட்ட வேண்டும்','ಪ್ರಿಯಾಗೆ ವೆಬ್‌ಸೈಟ್ ವಿನ್ಯಾಸ ತೋರಿಸಬೇಕು'),kind:'meeting',status:'agreed'});
  d5.dates.push({date:'2026-10-26',label:X('Sign the paper board agreement','पेपर बोर्ड समझौते पर साइन करना है','पेपर बोर्ड करारावर सही करायची','పేపర్ బోర్డు ఒప్పందంపై సంతకం చేయాలి','காகித அட்டை ஒப்பந்தத்தில் கையொப்பமிட வேண்டும்','ಪೇಪರ್ ಬೋರ್ಡ್ ಒಪ್ಪಂದಕ್ಕೆ ಸಹಿ ಮಾಡಬೇಕು'),kind:'deadline',status:'proposed'});
  S.deals=[d5,d1,d4,d2,d3];
  S.samples=[JSON.parse(JSON.stringify(d5)),JSON.parse(JSON.stringify(d1))];
  ['mr','te','ta','kn'].forEach(lg=>SEED_TR.en.forEach((e,i)=>{ if(!S.tr[lg][e]) S.tr[lg][e]=SEED_TR[lg][i]; }));
  S.deals.forEach(d=>{ d.parties=d.parties.map(p=>Object.assign({},p)); });
  Object.assign(S.settings,{userName:'',business:'',userId:''});
  S.templates=['D-01','D-05'].map(id=>JSON.parse(JSON.stringify(S.deals.find(x=>x.id===id))));
  save();
}
function cloneTemplate(i,owner){
  const tp=JSON.parse(JSON.stringify(S.templates[i])), id=tp.id+'-'+Date.now().toString(36).slice(-3).toUpperCase()+Math.floor(Math.random()*36).toString(36).toUpperCase();
  Object.assign(tp,{id,owner,sample:true,room:[],report:null,frozen:null,compares:[]}); tp.records.forEach(r=>{ r.dealId=id; });
  if(tp.lawyerReq&&tp.lawyerReq.status==='pending') tp.lawyerReq=null;
  S.deals.unshift(tp); save(); return tp;
}
function fraudFlag(d){ return {severity:'high',fraud:true,title:{k:'fraudTitle'},detail:{k:'fraudDetail'},ask:{k:'sx_tax',p:{name:first(d.parties[1].name)}},keys:['tax','payment_mode']}; }
const fraudRefs=d=>allMsgs(d).filter(m=>FRAUD_RE.test(m.text)).map(m=>m.ref);
function guessCategory(d){
  const text=[d.title].concat(allMsgs(d).map(m=>m.text)).concat(d.room.map(m=>m.text));
  let best='other', bs=0; Object.keys(CAT_RE).forEach(k=>{ const s=text.filter(x=>CAT_RE[k].test(x)).length; if(s>bs){ bs=s; best=k; } });
  return best;
}
const catOf=d=>(d.category&&d.category.id)||'other';
const foodUse=d=>catOf(d)==='food'||(catOf(d)==='printing'&&[d.title].concat(allMsgs(d).map(m=>m.text)).some(x=>FOOD_RE.test(x)));

/* ---------- derived ---------- */
function confidence(d){
  const by={}; DIMS.forEach(x=>by[x]={s:0,n:0});
  TERM_DEFS.forEach(def=>{ const st=(d.terms[def.key]||{}).status||'missing'; by[def.dim].s+=SCORE[st]; by[def.dim].n++; });
  return {total:Math.round(TERM_DEFS.reduce((a,def)=>a+SCORE[(d.terms[def.key]||{}).status||'missing'],0)/TERM_DEFS.length*100),dims:DIMS.map(x=>({dim:x,p:Math.round(by[x].s/by[x].n*100)})),agreed:TERM_DEFS.filter(def=>(d.terms[def.key]||{}).status==='agreed').length};
}
const latestVersion=d=>d.versions[d.versions.length-1]||null;
/* ---------- Indian laws and standards ---------- */
const CITE={contract:'Indian Contract Act, 1872, s.10',lawful:'Indian Contract Act, 1872, s.23',cash:'Income-tax Act, 2025, s.186',gst:'CGST Act, 2017, s.31; CGST Rules, 2017, r.46',penalty:'Indian Contract Act, 1872, s.74',msme:'MSMED Act, 2006, s.15–16',econtract:'IT Act, 2000, s.10A; BSA, 2023, s.63',stamp:'Indian Stamp Act, 1899 and state stamp laws',dispute:'Commercial Courts Act, 2015, s.12A',resale:'Legal Metrology (Packaged Commodities) Rules, 2011',fssai_pack:'FSS (Packaging) Regulations, 2018',ink:'IS 15495',tm_logo:'Trade Marks Act, 1999, s.29',fssai_lic:'FSS Act, 2006, s.31',legal_metro:'Legal Metrology (Packaged Commodities) Rules, 2011',drug_lic:'Drugs and Cosmetics Act, 1940, s.18',dpco:'Drugs (Prices Control) Order, 2013',copyright:'Copyright Act, 1957, s.17–19',tm_assign:'Trade Marks Act, 1999, s.45',handover:'Indian Contract Act, 1872',privacy:'DPDP Act, 2023',bis:'BIS Act, 2016 (Compulsory Registration Scheme)',ewaste:'E-Waste (Management) Rules, 2022',bis_build:'BIS Act, 2016 (Quality Control Orders)'};
const SD_KEY={contract:'sd_contract',lawful:'sd_lawful',cash:'sd_cash',gst:'sd_gst',penalty:'sd_penalty',msme:'sd_msme',econtract:'sd_econtract',stamp:'sd_stamp',dispute:'sd_dispute',resale:'sd_resale',fssai_pack:'sd_fssai_pack',ink:'sd_ink',tm_logo:'sd_tm_logo',fssai_lic:'sd_fssai_lic',legal_metro:'sd_legal_metro',drug_lic:'sd_drug_lic',dpco:'sd_dpco',copyright:'sd_copyright',tm_assign:'sd_tm_assign',handover:'sd_handover',privacy:'sd_privacy',bis:'sd_bis',ewaste:'sd_ewaste',bis_build:'sd_bis_build'};
function standards(d){
  const st=k=>(d.terms[k]||{}).status||'missing', ok=k=>st(k)==='agreed', fr=fraudRefs(d).length>0, cat=catOf(d), v=latestVersion(d);
  const pm=String((d.terms.payment_mode||{}).value||''), cash=/\bcash\b|nakad|naqad/i.test(pm), spec=String((d.terms.specs||{}).value||'');
  const msgs=allMsgs(d).map(m=>m.text).join('\n'), out=[], add=(id,status,fix)=>out.push({id,status,fix:status==='pass'?null:fix||null});
  add('contract',ok('parties')&&ok('price')&&ok('scope')?'pass':'warn');
  add('lawful',fr?'fail':'pass','sx_tax');
  add('cash',cash&&(d.value||0)>=200000?'fail':cash?'warn':ok('payment_mode')?'pass':'warn','sx_tax');
  add('gst',fr?'fail':ok('tax')?'pass':'warn','sx_tax');
  if(st('late_penalty')!=='missing') add('penalty','info');
  if(d.parties[0].role==='Seller') add('msme',ok('balance')?'pass':'warn','sx_msme');
  add('econtract',v&&v.signatures.length>=2?'pass':'info');
  add('stamp',d.stamp.status==='not_paid'?'warn':'pass');
  add('dispute',ok('disputes')?'pass':'warn');
  if(cat==='printing'){ if(foodUse(d)){ const fg=/food.?grade/i.test(spec); add('fssai_pack',fg?'pass':'warn','sx_food'); add('ink',fg?'pass':'warn','sx_food'); } if(/\blogo\b|brand|our name|with (our|the) name/i.test(msgs)) add('tm_logo',ok('ip')?'pass':'warn','sx_logo'); }
  if(cat==='food'){ add('fssai_lic','warn'); add('legal_metro','warn'); add('fssai_pack','info'); }
  if(cat==='medicine'){ add('drug_lic','warn'); add('dpco','warn'); add('legal_metro','warn'); }
  if(cat==='digital'){ const ipS=ok('ip')?'pass':st('ip')==='missing'?'fail':'warn'; add('copyright',ipS,'sx_ip'); if(/\blogo\b|trademark|brand/i.test(msgs)) add('tm_assign',ipS,'sx_ip'); add('handover','warn','sx_ip'); add('privacy','info'); }
  if(cat==='electronics'){ add('bis','warn'); add('ewaste','info'); add('legal_metro','warn'); }
  if(cat==='textiles') add('legal_metro','warn');
  if(cat==='construction') add('bis_build','warn');
  if(['printing','food','medicine','electronics','textiles'].includes(cat)) add('resale',ok('resale')?'pass':'warn');
  const order={fail:0,warn:1,info:2,pass:3};
  return out.sort((a,b)=>order[a.status]-order[b.status]);
}
function dealState(d){
  const v=latestVersion(d);
  if(d.draft) return {label:t('draft')+' · '+t('versionN',{n:d.draft.rev}),chip:'c-navy',pend:d.draft.clauses.filter(c=>c.pending).length};
  if(v){ const both=v.signatures.length>=2; if(both&&v.lawyer) return {label:t('lawyerChecked'),chip:'c-ok'}; if(both) return {label:t('signed'),chip:'c-ok'}; return {label:t('waitingSign'),chip:'c-warn'}; }
  return {label:t('inDiscussion'),chip:'c-mute'};
}
const allEvents=()=>myDeals().flatMap(d=>d.dates.map(e=>Object.assign({deal:d},e))).sort((a,b)=>a.date.localeCompare(b.date));
const openFlags=()=>myDeals().reduce((a,d)=>a+d.flags.filter(f=>f.severity!=='low').length,0);
const bcp=()=>langOf(S.settings.lang).bcp;
function fmtD(iso,o){ if(!iso) return '—'; const d=new Date(iso.length===10?iso+'T12:00:00'+TZ:iso); try{ return new Intl.DateTimeFormat(bcp(),Object.assign({timeZone:'Asia/Kolkata'},o||{day:'numeric',month:'short'})).format(d); }catch(e){ return iso.slice(0,10); } }
const fmtDT=iso=>fmtD(iso,{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'});
function relDay(ymd){ try{ return new Intl.RelativeTimeFormat(bcp(),{numeric:'auto'}).format(dayDiff(ymd),'day'); }catch(e){ return ''; } }
const byName=b=>b==='@pakka'?t('byPakka'):b==='@both'?t('byBoth'):b;
const noteText=n=>!n?'':typeof n==='string'?n:t(n.k,n.p);
function currentClauses(d){ if(d.draft) return d.draft.clauses; const v=latestVersion(d); return v?v.payload.clauses.map(c=>Object.assign({keys:clauseKeys(c.id)},c)):[]; }
const statusChip=st=>`<span class="chip ${STATUS_CHIP[st]||'c-mute'}">${esc(t(st))}</span>`;

/* ---------- translation of deal content ---------- */
function contentStrings(ds){
  const out=new Set(); const add=s=>{ if(s&&typeof s==='string'&&/[A-Za-z]{3}/.test(s)&&!STATIC_TX[s]) out.add(s); };
  (ds||myDeals().concat(ui.guest?[ui.guest]:[])).forEach(d=>{ add(d.title); TERM_DEFS.forEach(def=>{ const tm=d.terms[def.key]; if(!tm) return; add(tm.value); add(tm.open); tm.history.forEach(h=>add(h.value)); });
    d.flags.forEach(f=>{ add(f.title); add(f.detail); add(f.ask); }); d.dates.forEach(e=>add(e.label));
    currentClauses(d).forEach(c=>{ add(c.text); add(c.open); if(c.pending){ add(c.pending.text); add(c.pending.open); } });
    d.versions.forEach(v=>{ v.payload.clauses.forEach(c=>{ add(c.text); add(c.open); }); if(v.lawyer) add(v.lawyer.note); }); });
  return [...out];
}
function missingTr(){ const lg=S.settings.lang; if(lg==='en') return []; const m=S.tr[lg]||(S.tr[lg]={}); return contentStrings().filter(s=>!m[s]); }
async function ensureTr(){
  const lg=S.settings.lang; if(lg==='en'||ui.tr.running) return;
  const miss=missingTr(); if(!miss.length){ ui.tr.failed=false; return; }
  if(!SAMPLE||!S.settings.ai){ render(); return; }
  ui.tr.running=true; ui.tr.failed=false; render();
  let failed=false;
  for(let i=0;i<miss.length;i+=15){
    const chunk=miss.slice(i,i+15); let done=false;
    for(let attempt=0;attempt<3&&!done;attempt++){
      try{
        const out=await SAMPLE.json(`Translate each string into ${langOf(lg).en} (${langOf(lg).n}) for small business owners in India. Use simple, everyday words, not legal or formal language. Strings that are WhatsApp messages should sound like a natural, polite chat in ${langOf(lg).en}. Keep people’s names, business names, ₹ amounts, numbers, dates, emojis and words like GST, UPI, GSM, MRP exactly. Write every sentence fully in ${langOf(lg).en} script; never leave a sentence in English. Return only a JSON array of ${chunk.length} translated strings, same order.\n\n${JSON.stringify(chunk)}`,{modelTier:'default'});
        const arr=Array.isArray(out)?out:(out&&Array.isArray(out.translations)?out.translations:null);
        if(!arr) throw new Error('shape');
        chunk.forEach((s,j)=>{ if(typeof arr[j]==='string'&&arr[j].trim()) S.tr[lg][s]=arr[j].trim(); });
        done=true;
      }catch(e){ if(e&&(e.code==='not_granted'||e.code==='rate_limited')) break; }
    }
    if(!done) failed=true;
    save(); if(S.settings.lang!==lg) break; render();
  }
  ui.tr.failed=failed; ui.tr.running=false; render();
}


/* ---------- snip tool ----------
   A floating button that stays on every screen. It grabs a part of the screen (desktop: screen share + crop),
   a screenshot file, or whatever is on the clipboard, and files it as evidence on a deal in one go.
   On desktop Chrome and Edge it can pop out into a small always-on-top window (Document Picture-in-Picture),
   so it floats over WhatsApp Web or any other app. */
const SN={open:false,dealId:null,status:null,msg:'',recId:null,stream:null,video:null,pip:null,pending:null,pos:null,doneT:null};
const canScreen=()=>!!(navigator.mediaDevices&&navigator.mediaDevices.getDisplayMedia);
const canPip=()=>'documentPictureInPicture' in window;
function snipDeals(){ return isLawyer()?[]:myDeals(); }
function snipTarget(){ const ds=snipDeals(); if(SN.dealId&&ds.some(d=>d.id===SN.dealId)) return SN.dealId; if(ui.view==='deal'&&ui.dealId&&ds.some(d=>d.id===ui.dealId)) return ui.dealId; return ds[0]?ds[0].id:null; }
function snipRootEl(){ let r=document.getElementById('snipRoot'); if(!r){ r=document.createElement('div'); r.id='snipRoot'; document.body.appendChild(r); bindSnip(document); } return r; }
function snipPos(){ if(SN.pos) return SN.pos; try{ const p=JSON.parse(localStorage.getItem('draftit.snipPos')||'null'); if(p&&typeof p.r==='number') return (SN.pos=p); }catch(e){} return (SN.pos={r:16,b:96}); }
function snipStatusHtml(){
  if(SN.status==='busy') return `<div class="snip-status busy" role="status"><span class="spin"></span><span>${esc(SN.msg||t('snipUploading'))}</span></div>`;
  if(SN.status==='done') return `<div class="snip-status ok" role="status"><span class="tick">${ic('check',20)}</span><span class="stack-s" style="gap:0"><b>${esc(t('snipUploaded'))}</b><span class="tiny">${esc(SN.msg)}</span></span>${SN.recId?`<button class="link" data-snip="view">${esc(t('snipView'))}</button>`:''}</div>`;
  if(SN.status==='err') return `<div class="snip-status bad" role="alert">${ic('tri',18)}<span>${esc(SN.msg)}</span></div>`;
  return '';
}
function snipPanelHtml(inPip){
  const ds=snipDeals(), tg=snipTarget();
  let h=`<div class="snip-head"><span class="snip-ico sm">${ic('snip',18)}</span><b class="grow">${esc(t('snipTool'))}</b>${inPip?'':`<button class="ibtn" data-snip="close" aria-label="${esc(t('close'))}">${ic('x',20)}</button>`}</div>`;
  if(!ds.length) return h+`<p class="small">${esc(t('snipNoDeal'))}</p><button class="btn full" data-snip="newDeal">${ic('plus',18)} ${esc(t('newDeal'))}</button>`;
  h+=`<label class="field">${esc(t('snipTo'))}<select class="sel" data-snip-deal>${ds.map(d=>`<option value="${d.id}" ${d.id===tg?'selected':''}>${esc(tx(d.title))}</option>`).join('')}</select></label>`;
  if(SN.pending&&SN.pending.length) h+=`<div class="note"><span>${esc(t('snipShared',{n:SN.pending.length}))}</span></div><button class="btn full" data-snip="sendPending">${ic('upload',18)} ${esc(t('snipUploadNow'))}</button>`;
  h+=`<div class="snip-acts">`;
  if(canScreen()) h+=`<button class="btn" data-snip="screen">${ic('snip',18)} ${esc(t(SN.stream?'snipAgain':'snipScreen'))}</button>`;
  h+=`<label class="btn ${canScreen()?'sec':''}">${ic('img',18)} ${esc(t('snipPick'))}<input type="file" accept="image/*" multiple hidden data-snip-file></label>`;
  h+=`<button class="btn sec" data-snip="paste">${ic('paste',18)} ${esc(t('snipPaste'))}</button>`;
  h+=`</div>`;
  h+=snipStatusHtml();
  if(!SAMPLE) h+=`<p class="tiny">${esc(t('snipNoAi'))}</p>`;
  if(!inPip){
    h+=`<div class="snip-foot">`;
    if(canPip()&&!SN.pip) h+=`<button class="link" data-snip="pip">${ic('pin',16)} ${esc(t('snipPop'))}</button>`;
    if(SN.stream) h+=`<button class="link" data-snip="stopShare">${esc(t('snipStopShare'))}</button>`;
    h+=`<button class="link danger-link" data-snip="off">${esc(t('snipRemove'))}</button></div>`;
    h+=`<p class="tiny">${esc(t(canScreen()?'snipTipDesk':'snipTipPhone'))}</p>`;
  }
  return h;
}
function renderSnip(){
  if(!S||!document.body) return;
  const root=snipRootEl(), on=S.settings.snip&&acct()&&ui.view!=='auth'&&!isLawyer();
  if(SN.pip&&!SN.pip.closed) renderPip();
  if(!on){ root.innerHTML=''; return; }
  const p=snipPos(), st=SN.status;
  const fab=`<button id="snipFab" class="snip-fab ${st||''} ${SN.open?'open':''}" style="right:${p.r}px;bottom:${p.b}px" data-snip="fab" aria-label="${esc(t('snipTool'))}" aria-expanded="${SN.open}">${st==='busy'?'<span class="spin"></span>':st==='done'?ic('check',24):ic('snip',24)}<span class="fab-l">${esc(st==='busy'?t('snipUploadingShort'):st==='done'?t('snipUploaded'):t('snipShort'))}</span></button>`;
  const panel=SN.open&&!(SN.pip&&!SN.pip.closed)?`<div class="snip-scrim" data-snip="close"></div><section class="snip-panel" role="dialog" aria-label="${esc(t('snipTool'))}">${snipPanelHtml(false)}</section>`:'';
  root.innerHTML=panel+fab;
}
function snipSet(status,msg,recId){ SN.status=status; SN.msg=msg||''; SN.recId=recId||null; clearTimeout(SN.doneT); if(status==='done') SN.doneT=setTimeout(()=>{ if(SN.status==='done'){ SN.status=null; renderSnip(); } },6000); renderSnip(); }
/* events: one delegated handler per document (main page and the pop-out window) */
function bindSnip(doc){
  let drag=null;
  doc.addEventListener('pointerdown',e=>{ const f=e.target.closest&&e.target.closest('#snipFab'); if(!f) return; drag={x:e.clientX,y:e.clientY,p:Object.assign({},snipPos()),moved:false}; try{ f.setPointerCapture(e.pointerId); }catch(err){} });
  doc.addEventListener('pointermove',e=>{ if(!drag) return; const dx=e.clientX-drag.x, dy=e.clientY-drag.y; if(Math.abs(dx)+Math.abs(dy)>6) drag.moved=true; if(!drag.moved) return; const f=doc.getElementById('snipFab'); if(!f) return; const W=doc.defaultView.innerWidth, H=doc.defaultView.innerHeight; SN.pos={r:Math.max(4,Math.min(W-f.offsetWidth-4,drag.p.r-dx)),b:Math.max(4,Math.min(H-f.offsetHeight-4,drag.p.b-dy))}; f.style.right=SN.pos.r+'px'; f.style.bottom=SN.pos.b+'px'; });
  doc.addEventListener('pointerup',()=>{ if(drag&&drag.moved){ try{ localStorage.setItem('draftit.snipPos',JSON.stringify(SN.pos)); }catch(e){} SN.justDragged=true; setTimeout(()=>{ SN.justDragged=false; },50); } drag=null; });
  doc.addEventListener('click',async e=>{ const a=e.target.closest&&e.target.closest('[data-snip]'); if(!a) return; e.stopPropagation(); await snipAct(a.dataset.snip,doc); },true);
  doc.addEventListener('change',async e=>{ const el=e.target;
    if(el.matches&&el.matches('[data-snip-deal]')){ SN.dealId=el.value; return; }
    if(el.matches&&el.matches('[data-snip-file]')){ const files=[...el.files]; el.value=''; for(const f of files) await snipUpload(f,'file',f.name); } },true);
  doc.addEventListener('paste',async e=>{ if(!S.settings.snip||!(SN.open||doc!==document)) return; const items=[...(e.clipboardData&&e.clipboardData.items||[])], img=items.find(i=>/^image\//.test(i.type)); if(img){ e.preventDefault(); await snipUpload(img.getAsFile(),'paste'); return; } const tx2=e.clipboardData&&e.clipboardData.getData('text/plain'); if(tx2&&tx2.trim()&&!/^(INPUT|TEXTAREA)$/.test((e.target.tagName||''))){ e.preventDefault(); await snipText(tx2); } });
  doc.addEventListener('keydown',e=>{ if(e.key==='Escape'&&SN.open&&doc===document&&!doc.querySelector('.crop-wrap')){ SN.open=false; renderSnip(); } });
}
async function snipAct(k,doc){
  const sel=doc.querySelector('[data-snip-deal]'); if(sel) SN.dealId=sel.value;
  switch(k){
    case 'fab': if(SN.justDragged) return; if(SN.pip&&!SN.pip.closed){ SN.pip.focus(); return; } SN.open=!SN.open; renderSnip(); break;
    case 'close': SN.open=false; renderSnip(); break;
    case 'off': S.settings.snip=false; save(); SN.open=false; stopShare(); if(SN.pip&&!SN.pip.closed) SN.pip.close(); renderSnip(); render(); toast(t('snipOffToast')); break;
    case 'newDeal': SN.open=false; renderSnip(); document.querySelector('[data-act="newDeal"]')?document.querySelector('[data-act="newDeal"]').click():(ui.view='home',render()); break;
    case 'screen': await snipScreen(doc); break;
    case 'paste': await snipPaste(); break;
    case 'pip': await openPip(); break;
    case 'stopShare': stopShare(); renderSnip(); break;
    case 'sendPending': { const p=SN.pending||[]; SN.pending=null; for(const it of p){ if(it.text!=null) await snipText(it.text,it.name); else await snipUpload(it.blob,'share',it.name); } break; }
    case 'view': { const id=SN.dealTo||snipTarget(), rid=SN.recId; SN.open=false; if(SN.pip&&!SN.pip.closed) window.focus(); ui.view='deal'; ui.dealId=id; ui.tab='evidence'; window.scrollTo(0,0); render(); const dd=deal(id); if(rid&&dd&&dd.records.some(x=>x.id===rid)) recordSheet(rid); break; }
  }
}
function stopShare(){ if(SN.stream){ SN.stream.getTracks().forEach(tr=>tr.stop()); } SN.stream=null; SN.video=null; }
async function snipScreen(doc){
  try{
    if(!SN.stream||!SN.stream.active){
      SN.stream=await navigator.mediaDevices.getDisplayMedia({video:{displaySurface:'window',frameRate:5},audio:false,selfBrowserSurface:'exclude',surfaceSwitching:'include'});
      SN.stream.getVideoTracks()[0].addEventListener('ended',()=>{ SN.stream=null; SN.video=null; renderSnip(); });
      const v=document.createElement('video'); v.muted=true; v.playsInline=true; v.srcObject=SN.stream; await v.play(); SN.video=v;
      await new Promise(r=>setTimeout(r,350));
    }
    const v=SN.video; if(!v.videoWidth) await new Promise(r=>setTimeout(r,400));
    const c=document.createElement('canvas'); c.width=v.videoWidth; c.height=v.videoHeight; c.getContext('2d').drawImage(v,0,0);
    renderSnip();
    const blob=await cropUI(doc,c); if(!blob) return;
    await snipUpload(blob,'screen');
  }catch(err){ if(err&&err.name==='NotAllowedError') snipSet('err',t('snipDenied')); else snipSet('err',t('snipScreenFail')); }
}
async function snipPaste(){
  try{
    if(navigator.clipboard&&navigator.clipboard.read){ const items=await navigator.clipboard.read(); for(const it of items){ const ty=it.types.find(x=>/^image\//.test(x)); if(ty){ await snipUpload(await it.getType(ty),'paste'); return; } } }
    if(navigator.clipboard&&navigator.clipboard.readText){ const tx2=await navigator.clipboard.readText(); if(tx2&&tx2.trim()){ await snipText(tx2); return; } }
    snipSet('err',t('snipClipEmpty'));
  }catch(err){ snipSet('err',t('snipClipBlocked')); }
}
/* crop: drag a box over the captured frame; Enter or the button uploads, Esc cancels */
function cropUI(doc,canvas){
  return new Promise(res=>{
    const win=doc.defaultView; let restore=null;
    if(doc!==document&&win.resizeTo){ restore=[win.outerWidth,win.outerHeight]; try{ win.resizeTo(Math.min(1000,screen.availWidth),Math.min(720,screen.availHeight)); }catch(e){} }
    const w=doc.createElement('div'); w.className='crop-wrap';
    w.innerHTML=`<div class="crop-bar"><b class="grow">${esc(t('cropTitle'))}</b><button class="btn sec sm" data-c="cancel">${esc(t('cancel'))}</button><button class="btn sec sm" data-c="all">${esc(t('cropAll'))}</button><button class="btn sm" data-c="ok" disabled>${ic('upload',16)} ${esc(t('cropUpload'))}</button></div><div class="crop-stage"><img alt=""><div class="crop-box" hidden></div></div><p class="crop-hint tiny">${esc(t('cropHint'))}</p>`;
    doc.body.appendChild(w);
    const img=w.querySelector('img'), box=w.querySelector('.crop-box'), ok=w.querySelector('[data-c="ok"]'), stage=w.querySelector('.crop-stage');
    img.src=canvas.toDataURL('image/png'); let sel=null, st=null;
    const pt=e=>{ const r=img.getBoundingClientRect(); return {x:Math.max(0,Math.min(r.width,e.clientX-r.left)),y:Math.max(0,Math.min(r.height,e.clientY-r.top)),r}; };
    const draw=()=>{ if(!sel){ box.hidden=true; return; } const ir=img.getBoundingClientRect(), sr=stage.getBoundingClientRect(); box.hidden=false; Object.assign(box.style,{left:(ir.left-sr.left+sel.x)+'px',top:(ir.top-sr.top+sel.y)+'px',width:sel.w+'px',height:sel.h+'px'}); };
    stage.addEventListener('pointerdown',e=>{ const p=pt(e); st=p; sel={x:p.x,y:p.y,w:0,h:0}; try{ stage.setPointerCapture(e.pointerId); }catch(er){} draw(); });
    stage.addEventListener('pointermove',e=>{ if(!st) return; const p=pt(e); sel={x:Math.min(st.x,p.x),y:Math.min(st.y,p.y),w:Math.abs(p.x-st.x),h:Math.abs(p.y-st.y)}; draw(); });
    stage.addEventListener('pointerup',()=>{ st=null; ok.disabled=!(sel&&sel.w>8&&sel.h>8); });
    const done=b=>{ doc.removeEventListener('keydown',kd,true); w.remove(); if(restore){ try{ win.resizeTo(restore[0],restore[1]); }catch(e){} } res(b); };
    const cut=whole=>{ const r=img.getBoundingClientRect(), k=canvas.width/r.width; const s2=whole||!sel?{x:0,y:0,w:canvas.width,h:canvas.height}:{x:sel.x*k,y:sel.y*k,w:sel.w*k,h:sel.h*k}; const o=document.createElement('canvas'); o.width=Math.max(1,Math.round(s2.w)); o.height=Math.max(1,Math.round(s2.h)); o.getContext('2d').drawImage(canvas,s2.x,s2.y,s2.w,s2.h,0,0,o.width,o.height); o.toBlob(b=>done(b),'image/png'); };
    const kd=e=>{ if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); done(null); } if(e.key==='Enter'){ e.preventDefault(); cut(!(sel&&sel.w>8)); } };
    doc.addEventListener('keydown',kd,true);
    w.addEventListener('click',e=>{ const b=e.target.closest('[data-c]'); if(!b) return; e.stopPropagation(); if(b.dataset.c==='cancel') done(null); else cut(b.dataset.c==='all'); });
  });
}
async function snipUpload(blob,how,name){
  const id0=snipTarget(), d=deal(id0); if(!d||!blob) return snipSet('err',t('snipNoDeal'));
  SN.dealTo=d.id; snipSet('busy',t('snipUploadingTo',{deal:tx(d.title)}));
  try{
    const buf=new Uint8Array(await blob.arrayBuffer()), fileHash=await sha256Bytes(buf), url=await readAs(blob,'url'), thumb=await shrink(url,1000);
    let text='', method='image', loc=null;
    SN.msg=t('snipReading'); renderSnip();
    const locP=ocrLocal(blob).catch(e=>{ console.warn('ocr',e); return null; });
    if(SAMPLE){ try{ text=await ocrBlobs([blob]); method='ocr'; }catch(e){ text=''; } }
    loc=await locP;
    if(!text&&loc&&loc.text){ text=loc.text; method='ocr'; }
    const fromLoc=loc&&loc.text===text&&loc.paras.length, pm=text&&!fromLoc?parseChat(text):[];
    const up=nowISO(), messages=pm.length>=2&&pm.some(m=>m.sender)?pm:(fromLoc?loc.paras:text.split(/\n{2,}/)).map(p=>({ts:null,sender:'',text:String(p).replace(/\s*\n\s*/g,' ').trim()})).filter(m=>m.text).map((m,i)=>Object.assign(m,{n:i+1}));
    const stamp=up.slice(0,16).replace('T',' ').replace(':','');
    const rid='CR-'+(++S.counter), fname=name||('Snip '+stamp+'.png'); let fileInfo={};
    if(useStorage(d)){ try{ fileInfo={path:await cloudUpload(d.id,rid,blob,fname),mime:blob.type||'image/png',size:blob.size}; }catch(e){ console.warn('upload',e); } }
    const rec=await mkRecord({id:rid,dealId:d.id,type:'photo',name:fname,uploadedAt:up,rawText:text,messages,method,fileHash,media:Object.assign({kind:'image',thumb},loc&&loc.lines.length?{ocr:{lines:loc.lines}}:{},fileInfo),snip:how});
    d.records.push(rec); save();
    snipSet('done',`${tx(d.title)} · ${rec.id}`,rec.id); if(!SN.open&&!(SN.pip&&!SN.pip.closed)) toast(t('snipToast',{deal:tx(d.title)}));
    if(ui.view==='deal'&&ui.dealId===d.id){ ui.keep=true; render(); }
    if(text) analyseDeal(d);
  }catch(err){ snipSet('err',t('snipFail')); }
}
async function snipText(text,name){
  const d=deal(snipTarget()); if(!d) return snipSet('err',t('snipNoDeal'));
  SN.dealTo=d.id; snipSet('busy',t('snipUploadingTo',{deal:tx(d.title)}));
  try{
    const pm=parseChat(text), up=nowISO(), messages=pm.length?pm:text.split(/\n{2,}/).map((p,i)=>({n:i+1,ts:null,sender:'',text:p.trim()})).filter(m=>m.text);
    const rec=await mkRecord({id:'CR-'+(++S.counter),dealId:d.id,type:pm.length?'paste':'paste',name:name||'Pasted chat',uploadedAt:up,rawText:text,messages,method:'verbatim',snip:'text'});
    d.records.push(rec); save(); snipSet('done',`${tx(d.title)} · ${rec.id}`,rec.id); if(!SN.open&&!(SN.pip&&!SN.pip.closed)) toast(t('snipToast',{deal:tx(d.title)}));
    if(ui.view==='deal'&&ui.dealId===d.id){ ui.keep=true; render(); }
    analyseDeal(d);
  }catch(err){ snipSet('err',t('snipFail')); }
}
/* pop-out: a small always-on-top window that keeps the snip panel above other apps */
async function openPip(){
  try{
    const pw=await window.documentPictureInPicture.requestWindow({width:340,height:440});
    document.querySelectorAll('style,link[rel="stylesheet"]').forEach(n=>pw.document.head.appendChild(n.cloneNode(true)));
    pw.document.documentElement.className=document.documentElement.className; pw.document.documentElement.lang=document.documentElement.lang;
    pw.document.body.className='pip-body'; SN.pip=pw; SN.open=false; bindSnip(pw.document);
    pw.addEventListener('pagehide',()=>{ SN.pip=null; renderSnip(); });
    renderSnip();
  }catch(err){ snipSet('err',t('snipPopFail')); }
}
function renderPip(){ const pw=SN.pip; if(!pw||pw.closed) return; if(pw.document.querySelector('.crop-wrap')) return; let el=pw.document.getElementById('pipRoot'); if(!el){ el=pw.document.createElement('section'); el.id='pipRoot'; el.className='snip-panel in-pip'; pw.document.body.appendChild(el); } el.innerHTML=snipPanelHtml(true); }
/* files shared to the installed app (Android share sheet) arrive through the service worker */
async function takeShared(){
  if(!/[?&]share=1/.test(location.search)) return;
  try{ history.replaceState(null,'',location.pathname); }catch(e){}
  try{
    const c=await caches.open('draftit-share'), keys=await c.keys(), out=[];
    for(const k of keys){ const r=await c.match(k), ty=r.headers.get('content-type')||'', nm=decodeURIComponent(r.headers.get('x-name')||''); if(/^image\//.test(ty)) out.push({blob:await r.blob(),name:nm}); else if(/^text\//.test(ty)||/\.txt$/i.test(nm)) out.push({text:await r.text(),name:nm||'Shared chat'}); await c.delete(k); }
    if(out.length&&acct()&&!isLawyer()){ S.settings.snip=true; save(); SN.pending=out; SN.open=true; render(); }
  }catch(e){}
}

/* ---------- icons ---------- */
const I={trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',shop:'<path d="M3 9.5 4.5 4h15L21 9.5"/><path d="M3 9.5a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M4.5 12v8.5h15V12M10 20.5v-5h4v5"/>',bag:'<path d="M5 8h14l-1 12.5H6z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/>',logout:'<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 16l-4-4 4-4M6 12h10"/>',snip:'<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.1 8.1 20 20M8.1 15.9 20 4"/>',x:'<path d="M6 6l12 12M18 6 6 18"/>',monitor:'<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',upload:'<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',img:'<rect x="3" y="3.5" width="18" height="17" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 16-5-5-9 9"/>',pin:'<path d="M12 17v5M8 3h8l-1 6 3 4H6l3-4z"/>',home:'<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',cal:'<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',plus:'<path d="M12 5v14M5 12h14"/>',layers:'<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',scale:'<path d="M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',back:'<path d="M15 18l-6-6 6-6"/>',fwd:'<path d="M9 18l6-6-6-6"/>',chat:'<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/>',mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',file:'<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M8.5 13h7M8.5 17h5"/>',cam:'<path d="M4 7h3l2-2.5h6L17 7h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.6"/>',paste:'<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6"/>',speaker:'<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',stopI:'<rect x="7" y="7" width="10" height="10" rx="1.5"/>',shield:'<path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',down:'<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',pen:'<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/>',copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',lock:'<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',tri:'<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.01"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>',excl:'<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>',truck:'<path d="M2.5 6h11v10h-11zM13.5 9.5h4l3 3.5V16h-7z"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',coin:'<circle cx="12" cy="12" r="8.5"/><path d="M9 8h6M9 11h6M13 8c2.5 0 2.5 3 0 3H9l4.5 5"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',send:'<path d="M4 12 20 4l-6 16-3-7z"/>',link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7L11.5 7"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5"/>',doc:'<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h7M9 16h7"/>',spark:'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',wallet:'<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 13h2M3 10h18"/>',stamp:'<path d="M9 3h6v6l3 4H6l3-4zM5 17h14v3H5z"/>'};
const ic=(n,s)=>`<svg width="${s||22}" height="${s||22}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;
const recName=r=>r.type==='paste'?t('src_paste'):r.type==='room'?t('chatRoom'):r.name;
const REC_ICON={whatsapp:'chat',paste:'paste',voice:'mic',pdf:'file',photo:'cam',room:'chat'};

/* ---------- frame ---------- */
function render(){
  const app=$('#app');
  if(!S){ app.innerHTML=`<div class="splash"><div class="brand">${ic('shield',30)}DraftIt</div><div class="spin"></div></div>`; return; }
  document.documentElement.lang=S.settings.lang; applyTextSize(); stopRead();
  if(!acct()&&ui.view!=='auth'&&ui.view!=='data'&&!(ui.view==='room'&&ui.guest)){ ui.view='auth'; }
  const y=window.scrollY;
  if(document.body) document.body.dataset.view=ui.view;
  app.className='app v-'+ui.view+(acct()&&ui.view!=='auth'&&!(ui.view==='room'&&ui.guest)?' signed':'');
  if(ui.view==='auth'){ app.innerHTML=renderAuth(); renderSnip(); return; }
  const focusRoom=document.activeElement&&document.activeElement.id==='roomInput';
  app.innerHTML=renderTop()+trBar()+(ui.view==='home'&&!isLawyer()?renderBand():'')+(ui.view==='deal'?renderTabs():'')+`<main class="gut ${ui.view==='room'?'room-main':''}" id="main">${renderView()}</main>`+(!acct()||(ui.view==='room'&&ui.guest)?'':renderNav())+(ui.tut!=null?renderTutorial():'');
  renderSnip();
  if(ui.keep) window.scrollTo(0,y); ui.keep=false;
  if(ui.view==='room'){ const box=$('#roomMsgs'); if(box) box.scrollTop=box.scrollHeight; window.scrollTo(0,document.body.scrollHeight); const ri=$('#roomInput'); if(ri&&focusRoom){ ri.focus(); ri.setSelectionRange(ri.value.length,ri.value.length); } }
  if(ui.view==='settings'){ const r=$('#setRate'); if(r) r.addEventListener('input',()=>{ S.settings.rate=+r.value; $('#rateVal').textContent=S.settings.rate.toFixed(2)+'×'; save(); }); }
}
function trBar(){
  if(S.settings.lang==='en') return '';
  if(ui.tr.running) return `<div class="trbar gut busy"><span class="spin"></span>${esc(t('translating',{lang:langOf(S.settings.lang).n}))}</div>`;
  const miss=missingTr().length; if(!miss) return '';
  if(!SAMPLE||!S.settings.ai) return capChecked?`<div class="trbar gut">${esc(t('trOffline'))}</div>`:'';
  if(ui.tr.failed) return `<div class="trbar gut row between"><span>${esc(t('trFail'))}</span><button class="link" data-act="retryTr">${esc(t('tryAgain'))}</button></div>`;
  return '';
}
function applyLayout(){ const z=(S&&S.settings.layout)||(()=>{ try{ return localStorage.getItem('draftit.lay'); }catch(e){ return ''; } })()||'auto'; document.documentElement.classList.toggle('lay-phone',z==='phone'); }
function applyTextSize(){ applyLayout(); const z=(S&&S.settings.textSize)||(()=>{ try{ return localStorage.getItem('draftit.ts'); }catch(e){ return ''; } })()||'m'; const h=document.documentElement; h.classList.toggle('ts-l',z==='l'); h.classList.toggle('ts-xl',z==='xl'); }
const layoutSeg=()=>{ const z=S.settings.layout||'auto'; return `<div class="stack-s"><b>${esc(t('layoutLbl'))}</b><div class="seg ts-seg" role="group" aria-label="${esc(t('layoutLbl'))}">${[['auto','layAuto'],['phone','layPhone']].map(([k,l])=>`<button aria-pressed="${z===k}" data-act="setLayout" data-v="${k}">${esc(t(l))}</button>`).join('')}</div><span class="tiny">${esc(t('layoutNote'))}</span></div>`; };
const textSizeSeg=()=>{ const z=S.settings.textSize||'m'; return `<div class="stack-s"><b>${esc(t('textSize'))}</b><div class="seg ts-seg" role="group" aria-label="${esc(t('textSize'))}">${[['m','tsM'],['l','tsL'],['xl','tsXL']].map(([k,l])=>`<button aria-pressed="${z===k}" data-act="setTextSize" data-v="${k}">${esc(t(l))}</button>`).join('')}</div></div>`; };
function renderTop(){
  const SHORT={en:'EN',hi:'हिं',mr:'मरा',te:'తె',ta:'த',kn:'ಕ'}, compact=ui.view==='deal'||ui.view==='room';
  const lc=`<button class="langbtn" data-act="langSheet" aria-label="${esc(t('langAndSize'))}">${esc(compact?SHORT[S.settings.lang]:langOf(S.settings.lang).n)}</button>`;
  const gear=`<button class="ibtn" data-act="go" data-v="settings" aria-label="${esc(t('settings'))}">${ic('gear')}</button>`;
  const back=v=>`<button class="ibtn" data-act="go" data-v="${v}" aria-label="${esc(t('back'))}">${ic('back')}</button>`;
  if(ui.view==='deal'){ const d=deal(), cp=d.parties[1], rp=isLawyer()&&ui.demoBack?`<button class="link on-navy" data-act="demoBack">${esc(t('backToUser',{name:first(S.accounts[ui.demoBack].name)}))}</button>`:!isLawyer()&&!d.guest?`<button class="report-pill ${d.report?'on':''}" data-act="reportSheet" aria-label="${esc(t('reportScam'))}">${ic('flag',14)}<span>${esc(t(d.report?'reportedTag':'reportShort'))}</span></button>`:''; return `<header class="top gut">${back('home')}<div class="grow" style="min-width:0"><div class="top-title">${esc(tx(d.title))}</div><div class="top-sub">${esc(cp.org)} · ${esc(cp.name)}</div></div>${rp}${lc}</header>`; }
  if(ui.view==='room'){ const d=deal(ui.roomDeal); return `<header class="top gut">${d&&!d.guest?`<button class="ibtn" data-act="openDeal" data-id="${d.id}" aria-label="${esc(t('back'))}">${ic('back')}</button>`:back('home')}<div class="grow" style="min-width:0"><div class="top-title">${esc(t('chatRoom'))}</div><div class="top-sub">${esc(d?tx(d.title):'')}</div></div>${lc}</header>`; }
  if(ui.view==='settings') return `<header class="top gut">${back('home')}<div class="grow top-title">${esc(t('settings'))}</div></header>`;
  if(ui.view==='data') return `<header class="top gut">${back(acct()?'settings':'auth')}<div class="grow top-title">${esc(t('yourData'))}</div>${lc}</header>`;
  return `<header class="top gut"><div class="brand grow">${ic('shield',22)}DraftIt</div>${ui.demoBack?`<button class="link on-navy" data-act="demoBack">${esc(t('backToUser',{name:first(S.accounts[ui.demoBack].name)}))}</button>`:''}${lc}${gear}</header>`;
}
function renderNav(){
  const L=isLawyer(), cur=ui.view==='deal'?'home':ui.view;
  const b=(v,i,l)=>`<button data-act="go" data-v="${v}" ${cur===v?'aria-current="page"':''}>${ic(i)}<span>${esc(l)}</span></button>`;
  const a=acct(), brand=`<div class="nav-brand desk">${ic('shield',24)}<span>DraftIt</span></div>`;
  const foot=`<div class="nav-foot desk">${L?'':`<button data-act="${S.settings.snip?'snipOpen':'snipToggle'}" class="nav-snip">${ic('snip')}<span>${esc(t(S.settings.snip?'snipTool':'snipAdd'))}</span></button>`}${b('settings','gear',t('settings'))}<div class="nav-me"><span class="avatar">${esc((a&&a.name||'?').split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase())}</span><span class="stack-s" style="gap:0;min-width:0"><b>${esc(a?a.name:'')}</b><span class="tiny">${esc(t(a&&a.role==='lawyer'?'role_lawyer':'role_user'))}</span></span></div></div>`;
  if(L) return `<nav class="nav" aria-label="Main"><div class="nav-in n3">${brand}${b('home','home',t('reqQueue'))}${b('revisions','layers',t('approvals'))}${b('earnings','wallet',t('earnings'))}${foot}</div></nav>`;
  return `<nav class="nav" aria-label="Main"><div class="nav-in">${brand}${b('home','home',t('home'))}${b('calendar','cal',t('calendar'))}<button data-act="addAny" class="nav-add"><span class="plus">${ic('plus',22)}</span><span>${esc(t('add'))}</span></button>${b('revisions','layers',t('revisions'))}${b('lawyer','scale',t('lawyer'))}${foot}</div></nav>`;
}
function renderView(){ const L=isLawyer(); switch(ui.view){ case 'deal': return renderDeal(); case 'calendar': return renderCalendar(); case 'revisions': return L?renderApproved():renderRevisions(); case 'lawyer': return renderLawyer(); case 'settings': return renderSettings(); case 'data': return renderData(); case 'room': return renderRoom(); case 'earnings': return renderEarnings(); default: return L?renderLawyerHome():renderHome(); } }

/* ---------- home ---------- */
function renderBand(){ return `<section class="band gut"><p class="hi">${esc(t('hello',{name:first(S.settings.userName)}))}</p><h1>${esc(t('needReply',{n:openFlags()}))}</h1><p class="sub">${esc(t('needReplySub'))}</p></section>`; }
function renderHome(){
  const nx=allEvents().filter(e=>e.status!=='done'&&dayDiff(e.date)>=0)[0];
  const soon=calEvents().filter(e=>e.status!=='done'&&dayDiff(e.date)>=0&&dayDiff(e.date)<=21).slice(0,5);
  let side='';
  if(nx) side+=`<button class="card tap ev" data-act="openDeal" data-id="${nx.deal.id}"><span class="d"><b>${esc(fmtD(nx.date,{day:'numeric'}))}</b><span>${esc(fmtD(nx.date,{month:'short'}))}</span></span><span class="stack-s" style="gap:2px"><span class="lbl">${esc(t('nextUp'))} · ${esc(relDay(nx.date))}</span><span style="font-weight:700">${esc(tx(nx.label))}</span><span class="tiny">${esc(tx(nx.deal.title))} · ${esc(t(nx.status==='agreed'?'agreed':'proposed'))}</span></span></button>`;
  side+=snipCard(); if(isAndroid()) side+=getAppCard();
  if(soon.length) side+=`<section class="stack-s desk"><div class="sec-h"><h2 class="h2">${esc(t('comingUp'))}</h2><button class="btn sec sm" data-act="go" data-v="calendar">${ic('cal',16)} ${esc(t('calendar'))}</button></div><ul class="list card">${soon.map(evRow).join('')}</ul></section>`;
  let h=`<div class="home-grid"><aside class="home-side stack">${side}</aside><div class="home-main stack">`;
  h+=`<section class="stack"><div class="sec-h"><h2 class="h2">${esc(t('myDeals'))}</h2><button class="btn sec sm" data-act="newDeal">${ic('plus',16)} ${esc(t('newDeal'))}</button></div><ul class="list card deals">`;
  const ds=myDeals();
  ds.forEach(d=>{ const c=confidence(d), st=dealState(d), bad=standards(d).filter(x=>x.status==='fail').length;
    h+=`<li><button class="tap deal-row" data-act="openDeal" data-id="${d.id}"><span class="row between" style="align-items:flex-start"><span class="t">${esc(tx(d.title))}</span><span class="pct">${esc(t('settledPct',{n:c.total}))}</span></span><span class="small muted">${esc(d.parties[1].org)}${d.value?' · '+rupee(d.value):''}</span><span class="bar"><i style="width:${c.total}%"></i></span><span class="row wrap" style="gap:6px"><span class="chip ${st.chip}">${esc(st.label)}</span>${st.pend?`<span class="chip c-warn">${esc(t('changeWaiting',{n:st.pend}))}</span>`:''}${bad?`<span class="chip c-bad">${ic('tri',12)} ${esc(t('nProblems',{n:bad}))}</span>`:''}${d.report?`<span class="chip c-bad">${esc(t('reportedTag'))}</span>`:''}</span></button></li>`; });
  if(!ds.length) h+=`<li class="pad stack-s"><p class="small muted">${esc(t('emptyDeals'))}</p><div class="row wrap"><button class="btn sm" data-act="newDeal">${ic('plus',16)} ${esc(t('newDeal'))}</button><button class="btn sec sm" data-act="demoLogin" data-id="u_ravi_4821">${esc(t('seeSamples'))}</button></div></li>`;
  h+=`</ul></section></div></div>`;
  return h;
}
function snipCard(){
  if(isLawyer()) return '';
  if(S.settings.snip) return `<button class="card tap snip-card on" data-act="snipOpen"><span class="snip-ico">${ic('snip',22)}</span><span class="stack-s grow" style="gap:2px;text-align:left"><b>${esc(t('snipOnTitle'))}</b><span class="tiny">${esc(t('snipOnSub'))}</span></span>${ic('fwd',18)}</button>`;
  return `<section class="card snip-card"><span class="snip-ico">${ic('snip',22)}</span><span class="stack-s grow" style="gap:2px"><b>${esc(t('snipTool'))}</b><span class="tiny">${esc(t('snipSub'))}</span></span><button class="btn sm" data-act="snipToggle">${ic('plus',16)} ${esc(t('snipAdd'))}</button></section>`;
}

/* ---------- deal ---------- */
function renderTabs(){ return `<div class="tabs" role="tablist">${[['terms','terms'],['evidence','evidence'],['agreement','agreement'],['trace','trace']].map(([k,l])=>`<button role="tab" aria-selected="${ui.tab===k}" data-act="tab" data-v="${k}">${esc(t(l))}</button>`).join('')}</div>`; }
function renderDeal(){
  const d=deal(); if(!d){ ui.view='home'; return renderHome(); }
  let h=''; if(ui.busy&&ui.busy.dealId===d.id) h+=`<div class="note busy"><span class="spin"></span><span>${esc(t('reading'))}</span></div>`;
  if(ui.tab==='evidence') h+=renderEvidence(d); else if(ui.tab==='agreement') h+=renderAgreement(d); else if(ui.tab==='trace') h+=renderTrace(d); else h+=renderTerms(d);
  return h;
}
function renderTerms(d){
  const c=confidence(d);
  let h=`<section class="card pad stack"><div class="row between" style="align-items:flex-end"><span class="big">${c.total}%</span><span class="small muted" style="text-align:right">${esc(t('agreedOf',{a:c.agreed,b:TERM_DEFS.length}))}</span></div><div class="dims">${c.dims.map(x=>`<span>${esc(t('d_'+x.dim))}</span><span class="bar"><i style="width:${x.p}%;background:${x.p>=100?'var(--green)':x.p>=50?'var(--amber)':'var(--red)'}"></i></span><span class="num">${x.p}%</span>`).join('')}</div><div class="row between wrap"><span class="tiny">${d.analysis?esc(t(d.analysis.method==='claude'?'readByClaude':'readBasic',{date:fmtDT(d.analysis.at)})):''}</span>${isLawyer()?'':`<button class="btn sec sm" data-act="analyse" ${ui.busy?'disabled':''}>${esc(t('readChats'))}</button>`}</div></section>`;
  if(!isLawyer()) h+=`<button class="card tap room-card" data-act="openRoom" data-id="${d.id}"><span class="rc-ico">${ic('chat',20)}</span><span class="stack-s grow" style="gap:2px"><b>${esc(t('openRoom'))}</b><span class="tiny">${esc(t('roomSub'))}</span></span>${d.room.length?`<span class="chip c-navy">${d.room.length}</span>`:''}${ic('fwd',18)}</button>`;
  if(d.flags.length){ h+=`<section class="stack"><div class="sec-h"><h2 class="h2">${esc(t('flags'))}</h2>${sayBtn('flagList',{sel:'.flag > .row b, .flag > p.small'})}</div><div class="card" id="flagList">`;
    d.flags.forEach((f,i)=>{ h+=`<div class="flag ${f.severity}" ${i?'style="border-top:1px solid var(--line-2)"':''}><div class="row between" style="align-items:flex-start"><b>${esc(ft(f.title))}</b><span class="chip ${f.severity==='high'?'c-bad':f.severity==='medium'?'c-warn':'c-mute'}">${esc(t(SEV[f.severity]))}</span></div><p class="small muted">${esc(ft(f.detail))}</p>${f.ask?`<span class="tiny">${esc(t('sendTo',{name:first(d.parties[1].name)}))}</span><div class="bubble">${esc(ft(f.ask))}</div><div><button class="btn sec sm" data-act="copyAsk" data-i="${i}">${ic('copy',16)} ${esc(t('copyMessage'))}</button></div>`:''}</div>`; });
    h+=`</div></section>`; }
  h+=renderStandards(d);
  h+=`<section class="stack"><h2 class="h2">${esc(t('allPoints'))}</h2><ul class="list card">`;
  TERM_DEFS.forEach(def=>{ const tm=d.terms[def.key]||T('missing'); h+=`<li><button class="tap term-li" data-act="termSheet" data-k="${def.key}"><span class="lbl">${esc(t('t_'+def.key))}</span>${statusChip(tm.status)}<span class="val ${tm.status==='missing'?'muted small':''}">${esc(tx(tm.status==='missing'?(tm.open||def.miss):tm.value))}</span><span class="tiny">${tm.evidence.length?esc(t('nMsgs',{n:tm.evidence.length})):''}</span></button></li>`; });
  return h+`</ul></section>`;
}
const STD_IC={fail:'tri',warn:'excl',info:'info',pass:'check'};
function renderStandards(d){
  const L=standards(d), n=s=>L.filter(x=>x.status===s).length, cat=catOf(d), cp=first(d.parties[1].name);
  let h=`<section class="stack"><div class="sec-h"><h2 class="h2">${esc(t('stdTitle'))}</h2>${sayBtn('stdList',{sel:'.std-sum span, .std summary b, .std .in p.small'})}</div><div class="card std-card" id="stdList"><div class="std-cat"><span class="stack-s" style="gap:1px;min-width:0"><span class="lbl">${esc(t('category'))}</span><b>${esc(t('cat_'+cat))}</b><span class="tiny">${esc(t(d.category&&d.category.by==='user'?'catChosen':'catGuessed'))}</span></span>${isLawyer()?'':`<button class="btn sec sm" data-act="catSheet">${esc(t('catChange'))}</button>`}</div><div class="std-sum"><span class="${n('fail')?'red':''}">${esc(t('stdSummary',{f:n('fail'),w:n('warn'),p:n('pass')}))}</span></div>`;
  L.forEach(x=>{ h+=`<details class="std s-${x.status}" ${x.status==='fail'?'open':''}><summary><span class="sic">${ic(STD_IC[x.status],18)}</span><span class="grow" style="min-width:0"><b>${esc(t('sdt_'+x.id))}</b><span class="cite">${esc(CITE[x.id])}</span></span><span class="st-tag">${esc(t(x.status==='info'?'st_na':'st_'+x.status))}</span></summary><div class="in"><p class="small">${esc(t(SD_KEY[x.id]))}</p>${x.fix&&!isLawyer()?`<span class="tiny">${esc(t('sendTo',{name:cp}))}</span><div class="bubble">${esc(t(x.fix,{name:cp}))}</div><div><button class="btn sec sm" data-act="copyText" data-text="${esc(t(x.fix,{name:cp}))}">${ic('copy',16)} ${esc(t('copyMessage'))}</button></div>`:''}</div></details>`; });
  return h+`</div></section>`;
}
function renderEvidence(d){
  let h=`<section class="card pad stack-s seal-card"><div class="row" style="gap:10px"><span class="rc-ico">${ic('shield',18)}</span><b>${esc(t('tamperTitle'))}</b></div><p class="small muted">${esc(t('hashExplain'))}</p><div class="row wrap"><button class="btn sm" data-act="integritySheet">${ic('shield',16)} ${esc(t('checkAll'))}</button></div></section>`;
  h+=`${isLawyer()?'':`<button class="btn full" data-act="addEvidence">${ic('plus',18)} ${esc(t('addEvidence'))}</button>`}<p class="small muted row" style="gap:6px">${ic('lock',16)} ${esc(t('keptOriginal'))}</p><ul class="list card">`;
  const canDel=!isLawyer()&&!d.guest;
  d.records.forEach(r=>{ h+=`<li class="rec-li"><button class="tap row" style="align-items:flex-start" data-act="recordSheet" data-id="${r.id}"><span class="rec-ico">${ic(REC_ICON[r.type]||'file',20)}</span><span class="stack-s" style="gap:3px;min-width:0;flex:1"><b style="overflow-wrap:anywhere">${esc(recName(r))} <span class="rec-code in mono">${esc(r.id)}</span></b><span class="small muted">${esc(t('src_'+r.type))} · ${esc(t('nMsgs',{n:r.messages.length}))}${r.sourceFrom?' · '+esc(fmtD(r.sourceFrom)):''}</span><span class="tiny">${esc(t('uploadedBy'))}: ${esc(r.uploadedByName)} · ${esc(fmtDT(r.uploadedAt))}</span><span class="row wrap" style="gap:6px">${r.consent?`<span class="chip c-ok">${esc(t('consentOk'))}</span>`:''}<span class="mono" style="color:var(--ink-3)">SHA-256 ${esc(shortHash(r.sha256))}</span></span></span><span class="rec-code mono">${esc(r.id)}</span></button>${canDel?`<button class="rec-del" data-act="recDelAsk" data-id="${r.id}" aria-label="${esc(t('delEvidence'))}: ${esc(recName(r))}" title="${esc(t('delEvidence'))}">${ic('trash',20)}</button>`:''}</li>`; });
  if(!d.records.length) h+=`<li class="empty">${esc(t('noRecords'))}</li>`;
  return h+`</ul>`;
}

/* ---------- agreement ---------- */
function renderAgreement(d){
  const v=latestVersion(d), st=dealState(d), cl=currentClauses(d), L=isLawyer();
  if(!d.draft&&!v) return `<section class="card pad stack"><h2 class="h2">${esc(t('noAgreement'))}</h2><p class="small muted">${esc(t('noAgreementText'))}</p><button class="btn" data-act="createDraft">${esc(t('createDraft'))}</button></section>`+compareCard(d)+docsCard(d)+disputeBtn();
  const me=d.parties[0], cp=d.parties[1], sealed=!d.draft&&v, vr=sealed?ui.verify[d.id+':'+v.rev]:null;
  let h=(L?lawyerReviewCard(d):'')+`<section class="card pad stack-s"><div class="row between wrap"><span class="chip ${st.chip}">${esc(sealed?t('versionN',{n:v.rev})+' · '+st.label:st.label)}</span>${sealed?`<span class="tiny">${esc(t('signedOf',{n:v.signatures.length}))}</span>`:''}</div>${sealed?`<span class="tiny">${esc(t('lockedOn',{date:fmtDT(v.frozenAt)}))}</span><span class="mono">SHA-256 ${esc(v.hash)}</span><div class="row wrap"><button class="btn sec sm" data-act="verify" data-rev="${v.rev}">${ic('shield',16)} ${esc(t('verify'))}</button>${vr?`<span class="chip ${vr.ok?'c-ok':'c-bad'}">${esc(t(vr.ok?'intact':'tampered'))}</span>`:''}</div>`:`<span class="small muted">${esc(t('draftNote'))}</span>`}${d.needsRevision&&!d.draft?`<div class="note warn">${esc(t('newChatsNote'))}</div>`:''}</section>`;
  if(!L) h+=`<div class="stack-s"><span class="lbl">${esc(t('actingAs'))}</span><div class="seg">${d.parties.map(p=>`<button aria-pressed="${ui.actor===p.id}" data-act="actor" data-v="${p.id}">${esc(first(p.name))}${p.id==='me'?' '+esc(t('youTag')):''}</button>`).join('')}</div><span class="tiny">${esc(t('actingNote'))}</span></div>`;
  h+=`<div class="seg">${['simple','formal'].map(k=>`<button aria-pressed="${ui.docView===k}" data-act="docView" data-v="${k}">${esc(t(k==='simple'?'viewSimple':'viewFormal'))}</button>`).join('')}</div>`;
  if(ui.docView==='formal') return h+`<p class="small muted">${esc(t('formalNote'))}</p><div class="row wrap">${sayBtn('formalDoc',{lang:'en',sel:'.f-title h2,h3,p,li,tr'})}${S.settings.lang!=='en'?`<span class="tiny">${esc(t('readsEnglish'))}</span>`:''}</div><article class="doc formal en-doc" id="formalDoc" lang="en">${buildFormal(d,false)}</article><div class="row wrap"><button class="btn" data-act="exportFormal">${ic('down',18)} ${esc(t('downloadFormal'))}</button>${L?'':`<button class="btn sec" data-act="partySheet">${esc(t('editDetails'))}</button>`}</div>`+(L?'':lawyerCard(d)+disputeBtn());
  h+=`<section class="card pad row"><button class="speak ${ui.speaking?'on':''}" data-act="${ui.speaking?'stopSpeak':'speakDoc'}" aria-label="${esc(t(ui.speaking?'stop':'readAloud'))}">${ic(ui.speaking?'stopI':'speaker',22)}</button><span class="stack-s" style="gap:0;flex:1"><b>${esc(t(ui.speaking?'stop':'readAloud'))}</b><span class="tiny">${esc(t('language'))}: ${esc(langOf(S.settings.lang).n)}</span></span><button class="btn sec sm" data-act="langSheet">${esc(t('language'))}</button></section>`;
  h+=`<article class="doc"><div class="doc-head"><span class="k">${esc(t('docTitle'))} · ${esc(d.draft?t('draft')+' · '+t('versionN',{n:d.draft.rev}):t('versionN',{n:v.rev}))}</span><h2>${esc(tx(d.title))}</h2><p>${esc(t('between',{a:me.org+' ('+me.name+')',b:cp.org+' ('+cp.name+')'}))}</p></div>`;
  cl.forEach((c,i)=>{ h+=`<section class="clause ${ui.speaking===c.id?'speaking':''}" id="cl-${c.id}"><span class="no">${i+1}.</span><div><h3>${esc(t('h_'+c.id))}</h3><p class="body">${esc(tx(c.text))}</p>${c.open?`<div class="settle"><b>${esc(t('toSettle'))}</b>${esc(tx(c.open))}</div>`:''}`;
    if(c.pending&&!L){ const mine=c.pending.by===ui.actor; h+=`<div class="pending"><span class="lbl" style="color:var(--navy)">${esc(t('suggestedBy',{name:partyName(d,c.pending.by)}))} · ${esc(fmtDT(c.pending.at))}</span><div>${diffWords(tx(c.text),tx(c.pending.text))}</div>${mine?`<div class="row wrap"><span class="tiny">${esc(t('waitingFor',{name:first(partyName(d,c.pending.by==='me'?'cp':'me'))}))}</span><button class="link" data-act="withdraw" data-id="${c.id}">${esc(t('withdraw'))}</button></div>`:`<div class="row wrap"><button class="btn sm" data-act="acceptChange" data-id="${c.id}">${ic('check',16)} ${esc(t('accept'))}</button><button class="btn warn sm" data-act="rejectChange" data-id="${c.id}">${esc(t('reject'))}</button></div>`}</div>`; }
    h+=`<div class="clause-acts"><button class="link" data-act="clauseSheet" data-id="${c.id}">${esc(t('why'))}</button>${d.draft&&!c.pending&&!L?`<button class="link" data-act="editClause" data-id="${c.id}">${esc(t('suggestEdit'))}</button>`:''}</div></div></section>`; });
  h+=`</article>`;
  if(L) return h;
  h+=`<section class="stack">${agreementActions(d)}</section>`+stampCard(d)+lawyerCard(d)+compareCard(d)+docsCard(d)+disputeBtn();
  return h;
}
const docsCard=d=>`<section class="card pad stack-s"><b>${esc(t('docsLbl'))}</b><div class="row wrap"><button class="btn sec sm" data-act="quoteSheet">${ic('doc',16)} ${esc(t('makeQuote'))}</button><button class="btn sec sm" data-act="partySheet">${ic('cam',16)} ${esc(t('logosDetails'))}</button>${d.draft||d.versions.length?`<button class="btn sec sm" data-act="exportFormal">${ic('down',16)} ${esc(t('downloadFormal'))}</button>`:''}</div></section>`;
const disputeBtn=()=>`<button class="btn quiet full" data-act="disputeSheet">${ic('scale',18)} ${esc(t('dispBtn'))}</button>`;
function agreementActions(d){
  const v=latestVersion(d);
  if(d.draft){ const pend=d.draft.clauses.filter(c=>c.pending).length, open=d.draft.clauses.filter(c=>c.open).length;
    return `${pend?`<div class="note warn">${esc(t('pendBlock'))}</div>`:open?`<div class="note">${esc(t('openNote',{n:open}))}</div>`:''}<button class="btn full" data-act="freeze" ${pend?'disabled':''}>${ic('lock',18)} ${esc(t('freeze'))}</button><p class="tiny">${esc(t('freezeNote'))}</p>`; }
  if(!v) return '';
  let h=`<div class="card pad stack"><div class="row between"><span class="lbl">${esc(t('signatures'))} · ${esc(t('versionN',{n:v.rev}))}</span><button class="link" data-act="integritySheet">${ic('shield',14)} ${esc(t('checkAll'))}</button></div><p class="tiny">${esc(t('signNote'))}</p>`;
  d.parties.forEach(p=>{ const sg=v.signatures.find(x=>x.party===p.id);
    if(sg) h+=`<div class="sig-row done">${sg.img?`<img class="sig-img" src="${esc(sg.img)}" alt="${esc(sg.name)}">`:sg.method==='aadhaar'?`<span class="esign-badge">${ic('shield',16)} eSign</span>`:`<span class="sig-name">${esc(sg.name)}</span>`}<div class="stack-s grow" style="gap:2px"><b>${esc(p.name)}</b><span class="tiny">${esc(t(sg.method==='aadhaar'?'aadhaarSig':'drawnSig'))} · ${esc(fmtDT(sg.at))}</span><span class="mono" style="color:var(--ink-3)">${esc(shortHash(sg.sigHash))}</span><button class="link" data-act="certSheet" data-p="${p.id}">${esc(t(sg.cert?'viewCert':'sigDetails'))}</button></div><span class="chip c-ok">${esc(t('signedTag'))}</span></div>`;
    else h+=`<div class="sig-row"><div class="stack-s grow" style="gap:2px"><b>${esc(p.name)}</b><span class="tiny">${esc(t(p.id==='me'?'notSignedYou':'notSignedThem'))}</span></div><button class="btn ${p.id==='me'?'':'sec'} sm" data-act="signSheet" data-p="${p.id}">${ic('pen',16)} ${esc(p.id==='me'?t('signNow'):t('signForDemo',{name:first(p.name)}))}</button></div>`; });
  return h+`</div><button class="btn sec full" data-act="newRev">${esc(t('startNewRev'))}</button>`;
}
function stampCard(d){ const s=d.stamp; return `<details class="card legal"><summary><span>${esc(t('stampDuty'))} <span class="chip ${s.status==='paid'?'c-ok':s.status==='not_needed'?'c-mute':'c-warn'}">${esc(t(s.status==='paid'?'stampPaid':s.status==='not_needed'?'notNeeded':'stampNotPaid'))}</span></span></summary><div class="in"><p>${esc(t('stampText'))}</p><label class="field">${esc(t('state'))}<select class="sel" data-change="stampState">${['Karnataka','Maharashtra','Tamil Nadu','Telangana','Andhra Pradesh','Delhi','Gujarat'].map(x=>`<option ${s.state===x?'selected':''}>${x}</option>`).join('')}</select></label><label class="field">${esc(t('certNo'))}<input class="inp" id="stampCert" value="${esc(s.cert)}" placeholder="IN-KA…" data-change="stampCert"></label><div class="row wrap"><a class="btn sec sm" href="https://www.shcilestamp.com/" target="_blank" rel="noopener">${esc(t('openShcil'))}</a><button class="link" data-act="stampNotNeeded">${esc(t('notNeeded'))}</button></div></div></details>`; }
function lawyerCard(d){
  const v=latestVersion(d), r=d.lawyerReq;
  if(!v||v.signatures.length<2||d.draft) return `<section class="card pad stack-s"><b>${esc(t('lawyerCheck'))}</b><p class="small muted">${esc(t('lawyerAfter'))}</p></section>`;
  if(v.lawyer) return approvalBox(d,v);
  if(r&&r.rev===v.rev&&r.status==='pending') return `<section class="card pad stack-s"><div class="row busy" style="gap:10px"><span class="spin"></span><span class="small">${esc(t('reqPending',{name:r.name}))}</span></div><span class="tiny">${esc(t('feeTotal'))}: ${rupee(r.fee+r.platform)} · ${esc(fmtDT(r.at))}</span><button class="btn sec sm" data-act="openAsLawyer">${esc(t('openAsLawyer'))}</button></section>`;
  let notes='';
  if(r&&r.rev===v.rev&&r.status==='notes') notes=`<div class="note warn stack-s"><b>${esc(t('lawyerNotes',{name:r.name}))}</b><span class="small">${esc(r.notes)}</span><span class="tiny">${esc(fmtDT(r.doneAt))}</span></div>`;
  return `<section class="card pad stack"><b>${esc(t('lawyerCheck'))}</b>${notes}<p class="small muted">${esc(t('lawyerReqText'))}</p><button class="btn" data-act="lawyerSheet">${ic('scale',18)} ${esc(t('requestCheck'))}</button></section>`;
}
const approvalBox=(d,v,tap)=>`<${tap?'button':'section'} class="approval" ${tap?`data-act="versionSheet" data-id="${d.id}" data-rev="${v.rev}"`:''}><span class="lbl" style="color:var(--green)">${esc(t('lawyerChecked'))} · ${esc(tap?tx(d.title)+' · ':'')}${esc(t('versionN',{n:v.rev}))}</span><b>${esc(v.lawyer.name)}</b><span class="tiny">${esc(t('enrolment'))} <span class="mono">${esc(v.lawyer.enrol)}</span> · ${esc(fmtDT(v.lawyer.at))}</span><span class="small">${esc(v.lawyer.noteKey?t(v.lawyer.noteKey,v.lawyer.noteP):tx(v.lawyer.note))}</span><span class="mono">SHA-256 ${esc(shortHash(v.lawyer.hash))}</span></${tap?'button':'section'}>`;
function lawyerReviewCard(d){
  const v=latestVersion(d), r=d.lawyerReq, a=acct();
  if(!v||!r||r.lawyerId!==a.lawyerId) return '';
  if(r.status!=='pending'||r.rev!==v.rev) return v.lawyer?approvalBox(d,v):'';
  const L=standards(d), f=L.filter(x=>x.status==='fail').length, w=L.filter(x=>x.status==='warn').length;
  return `<section class="card pad stack review"><span class="lbl">${esc(t('lawyerView'))}</span><b>${esc(t('fromUser',{name:r.by}))} · ${esc(t('versionN',{n:v.rev}))}</b><span class="tiny">${esc(fmtDT(r.at))} · ${esc(t('feeLawyer'))} ${rupee(r.fee)}</span><span class="small ${f?'red':''}">${esc(t('stdSummary',{f,w,p:L.length-f-w}))}</span><span class="mono">SHA-256 ${esc(shortHash(v.hash))}</span><label class="field">${esc(t('notesPh'))}<textarea class="inp" id="lawNotes" style="min-height:80px"></textarea></label><div class="row wrap"><button class="btn" data-act="lawApprove">${ic('stamp',18)} ${esc(t('approveDsc'))}</button><button class="btn sec" data-act="lawNotes">${esc(t('sendNotes'))}</button></div></section>`;
}
function diffWords(a,b){
  const A=String(a).split(/(\s+)/), B=String(b).split(/(\s+)/), n=A.length, m=B.length;
  const dp=Array.from({length:n+1},()=>new Uint16Array(m+1));
  for(let i=n-1;i>=0;i--) for(let j=m-1;j>=0;j--) dp[i][j]=A[i]===B[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
  let i=0,j=0,o=''; while(i<n&&j<m){ if(A[i]===B[j]){o+=esc(A[i]);i++;j++;} else if(dp[i+1][j]>=dp[i][j+1]){o+='<del>'+esc(A[i])+'</del>';i++;} else {o+='<ins>'+esc(B[j])+'</ins>';j++;} }
  while(i<n) o+='<del>'+esc(A[i++])+'</del>'; while(j<m) o+='<ins>'+esc(B[j++])+'</ins>'; return o;
}

/* ---------- source tree ---------- */
function clauseStatus(d,c){ const ks=c.keys||clauseKeys(c.id); const sts=ks.map(k=>(d.terms[k]||{}).status||'missing'); if(sts.every(s=>s==='agreed')) return 'agreed'; if(sts.every(s=>s==='missing')) return 'missing'; return 'proposed'; }
function renderTrace(d){
  const cl=currentClauses(d);
  if(!cl.length) return `<section class="card pad stack"><p class="small muted">${esc(t('noAgreementText'))}</p><button class="btn" data-act="createDraft">${esc(t('createDraft'))}</button></section>`;
  if(!ui.traceClause||!cl.find(c=>c.id===ui.traceClause)) ui.traceClause=(cl.find(c=>c.id==='c4')||cl[0]).id;
  const ci=cl.findIndex(c=>c.id===ui.traceClause), c=cl[ci], keys=c.keys||clauseKeys(c.id);
  let h=`<p class="small muted">${esc(t('traceHelp'))}</p><div class="stack-s"><span class="lbl">${esc(t('pickClause'))}</span><div class="cl-chips">${cl.map((x,i)=>`<button aria-pressed="${x.id===c.id}" data-act="traceClause" data-id="${x.id}"><span class="sd ${clauseStatus(d,x)}"></span>${i+1}. ${esc(t('h_'+x.id))}</button>`).join('')}</div></div>`;
  h+=`<div class="tree"><div class="node node-clause"><span class="nl">${esc(t('clauseLbl',{n:ci+1}))}</span><b>${esc(t('h_'+c.id))}</b><p>${esc(tx(c.text))}</p></div><ul>`;
  keys.forEach(k=>{ const tm=d.terms[k]||T('missing');
    h+=`<li><div class="node node-term"><div class="row"><span><span class="nl">${esc(t('pointLbl'))}</span><br><b>${esc(t('t_'+k))}</b></span>${statusChip(tm.status)}</div>${tm.value&&tm.status!=='missing'?`<p class="small" style="margin-top:4px">${esc(tx(tm.value))}</p>`:''}</div><ul>`;
    if(!tm.evidence.length) h+=`<li><div class="node-empty">${esc(t('noSource'))}</div></li>`;
    tm.evidence.forEach(ref=>{ const m=msgByRef(d,ref); if(!m) return; const hist=tm.history.find(x=>x.ref===ref);
      h+=`<li><div class="node node-msg"><div class="meta"><b>${esc(m.sender)}</b><span>#${m.n}</span><span>${esc(m.ts?fmtDT(m.ts):t('noTime'))}</span>${m.rec.type==='voice'?`<span class="chip c-navy">${esc(t('voiceNote'))}</span>`:''}${hist?`<span class="chip ${hist.stance==='accept'||hist.stance==='paid'?'c-ok':hist.stance==='counter'?'c-warn':hist.stance==='reject'?'c-bad':'c-mute'}">${esc(t('st_'+hist.stance))}</span>`:''}</div><div class="txt">${esc(m.text)}</div></div></li>`; });
    h+=`</ul></li>`; });
  h+=`</ul></div><div class="row"><button class="btn sec sm" data-act="clauseSheet" data-id="${c.id}">${esc(t('history'))}</button></div>`;
  h+=`<section class="card pad stack"><b>${esc(t('forCourt'))}</b><p class="small muted">${esc(t('forCourtText'))}</p><div class="row wrap"><button class="btn" data-act="exportHtml">${ic('down',18)} ${esc(t('download'))}</button><button class="btn sec" data-act="exportJson">${esc(t('jsonData'))}</button></div></section>`;
  return h;
}

/* ---------- calendar ---------- */
/* fixed business dates every Indian small business deals with: GST returns, TDS, advance tax, national holidays, Diwali */
const SYS_FIXED=[['01-26','hol_republic'],['08-15','hol_indep'],['10-02','hol_gandhi'],['12-25','hol_xmas']];
const SYS_DATED=[['2026-11-08','hol_diwali']];
let _sysCache=null;
function sysEvents(){
  if(_sysCache) return _sysCache; const out=[]; const pad=n=>String(n).padStart(2,'0');
  for(let y=2025;y<=2028;y++){
    for(let m=1;m<=12;m++){ const pm=new Date(Date.UTC(y,m-2,1)); const mon={m:new Intl.DateTimeFormat('en-IN',{month:'long',timeZone:'UTC'}).format(pm),mi:pm.getUTCMonth()};
      out.push({id:`g1-${y}-${m}`,date:`${y}-${pad(m)}-11`,kind:'tax',key:'ev_gstr1',info:'evi_gst',pm:mon});
      out.push({id:`g3-${y}-${m}`,date:`${y}-${pad(m)}-20`,kind:'tax',key:'ev_gstr3b',info:'evi_gst',pm:mon}); }
    [['07-31','ev_tds1'],['10-31','ev_tds2'],['01-31','ev_tds3'],['05-31','ev_tds4']].forEach(([md,k])=>out.push({id:`tds-${y}-${md}`,date:`${y}-${md}`,kind:'tax',key:k,info:'evi_tds'}));
    [['06-15','ev_adv1'],['09-15','ev_adv2'],['12-15','ev_adv3'],['03-15','ev_adv4']].forEach(([md,k])=>out.push({id:`adv-${y}-${md}`,date:`${y}-${md}`,kind:'tax',key:k,info:'evi_adv'}));
    SYS_FIXED.forEach(([md,k])=>out.push({id:`h-${y}-${md}`,date:`${y}-${md}`,kind:'holiday',key:k,info:'evi_hol'}));
  }
  SYS_DATED.forEach(([d,k])=>out.push({id:'h-'+d,date:d,kind:'holiday',key:k,info:'evi_diwali'}));
  return (_sysCache=out.map(e=>Object.assign(e,{sys:true,status:'agreed'})));
}
const monName=i=>new Intl.DateTimeFormat(bcp(),{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(2024,i,1)));
const evLabel=e=>e.sys?t(e.key,e.pm?{m:monName(e.pm.mi)}:{}):tx(e.label);
const calEvents=()=>allEvents().concat(sysEvents()).sort((a,b)=>a.date.localeCompare(b.date)||(a.sys?1:0)-(b.sys?1:0));
function evRow(e){
  const d=`<span class="d ${e.sys?'d-'+e.kind:''}"><b>${esc(fmtD(e.date,{day:'numeric'}))}</b><span>${esc(fmtD(e.date,{month:'short'}))}</span></span>`;
  if(e.sys) return `<li><button class="tap ev" data-act="sysEv" data-v="${e.id}">${d}<span class="stack-s" style="gap:3px"><b><i class="kd k-${e.kind}"></i>${esc(evLabel(e))}</b><span class="tiny">${esc(t(e.kind==='tax'?'k_tax':'k_holiday'))} · ${esc(relDay(e.date))}</span></span></button></li>`;
  return `<li><button class="tap ev" data-act="openDeal" data-id="${e.deal.id}">${d}<span class="stack-s" style="gap:3px"><b><i class="kd k-${e.kind}"></i>${esc(tx(e.label))}</b><span class="tiny">${esc(tx(e.deal.title))} · ${esc(e.deal.parties[1].org)}</span><span class="row wrap" style="gap:6px">${e.status==='done'?`<span class="chip c-ok">${esc(t('done'))}</span>`:statusChip(e.status==='agreed'?'agreed':'proposed')}<span class="tiny">${esc(relDay(e.date))}</span></span></span></button></li>`;
}
function sysSheet(id){ const e=sysEvents().find(x=>x.id===id); if(!e) return;
  openSheet(sheetHead(evLabel(e),esc(fmtD(e.date,{weekday:'long',day:'numeric',month:'long',year:'numeric'})))+`<div class="row" style="gap:12px;align-items:flex-start"><span class="ad-ico" style="background:${e.kind==='tax'?'var(--brand)':'#FCE7D2'};color:${e.kind==='tax'?'#fff':'#9A4A00'}">${ic(e.kind==='tax'?'doc':'cal',20)}</span><p class="sys-info">${esc(t(e.info))}</p></div><div id="sysInfo" hidden><p>${esc(evLabel(e))}</p><p>${esc(t(e.info))}</p></div>${sayBtn('sysInfo',{sel:'p'})}<p class="tiny">${esc(t('evi_check'))}</p>`); }
function renderCalendar(){
  const evs=calEvents(), mine=allEvents();
  if(!ui.calMonth){ const near=mine.find(e=>Math.abs(dayDiff(e.date))<=45); ui.calMonth=(near?near.date:todayYMD()).slice(0,7); }
  const [y,m]=ui.calMonth.split('-').map(Number); const f=new Date(Date.UTC(y,m-1,1)), sw=(f.getUTCDay()+6)%7, dim=new Date(Date.UTC(y,m,0)).getUTCDate();
  const mn=new Intl.DateTimeFormat(bcp(),{month:'long',year:'numeric',timeZone:'UTC'}).format(f);
  const wd=[...Array(7)].map((_,i)=>new Intl.DateTimeFormat(bcp(),{weekday:'narrow',timeZone:'UTC'}).format(new Date(Date.UTC(2024,0,1+i))));
  const cells=Math.ceil((sw+dim)/7)*7, today=todayYMD(); let cs='';
  for(let i=0;i<cells;i++){ const dt=new Date(Date.UTC(y,m-1,1-sw+i)), ymd=dt.toISOString().slice(0,10), inM=dt.getUTCMonth()===m-1, es=evs.filter(e=>e.date===ymd), hol=es.some(e=>e.kind==='holiday'), ad=adFor(ymd);
    cs+=`<button class="${inM?'':'other'} ${ymd===today?'today':''} ${hol?'hol':''} ${es.length?'has':''}" aria-pressed="${ui.calDay===ymd}" data-act="calDay" data-v="${ymd}" aria-label="${esc(fmtD(ymd,{day:'numeric',month:'long'}))}${es.length?', '+es.length:''}"><span>${new Intl.NumberFormat(bcp()).format(dt.getUTCDate())}</span><span class="dots">${es.slice(0,4).map(e=>`<i class="k-${e.kind}"></i>`).join('')}</span>${ad?`<span class="adpin">${adLogo(ad,18)}</span>`:''}</button>`; }
  const inMonth=evs.filter(e=>e.date.slice(0,7)===ui.calMonth);
  const cnt=k=>inMonth.filter(e=>e.kind===k).length;
  let h=`<div class="cal-wrap"><section class="card pad stack cal-card"><div class="row between"><button class="ibtn" data-act="calNav" data-v="-1" aria-label="${esc(t('prevMonth'))}">${ic('back')}</button><div class="stack-s" style="gap:0;align-items:center"><h1 class="h2">${esc(mn)}</h1><span class="tiny">${esc(t('nThisMonth',{n:inMonth.length}))}</span></div><button class="ibtn" data-act="calNav" data-v="1" aria-label="${esc(t('nextMonth'))}">${ic('fwd')}</button></div><div class="cal">${wd.map(w=>`<span class="wd">${esc(w)}</span>`).join('')}${cs}</div><div class="legend">${['delivery','payment','deadline','meeting','tax','holiday'].map(k=>`<span><i class="kd k-${k}"></i>${esc(t('k_'+k))}${cnt(k)?` <b>${new Intl.NumberFormat(bcp()).format(cnt(k))}</b>`:''}</span>`).join('')}</div>${ui.calMonth!==todayYMD().slice(0,7)?`<button class="btn sec sm" data-act="calToday" style="align-self:center">${esc(t('jumpToday'))}</button>`:''}</section>`;
  /* side column: selected day, or this month's agenda */
  const list=ui.calDay?evs.filter(e=>e.date===ui.calDay):inMonth;
  h+=`<section class="stack cal-side"><div class="sec-h"><h2 class="h2">${esc(ui.calDay?fmtD(ui.calDay,{weekday:'long',day:'numeric',month:'long'}):t('thisMonth'))}</h2>${ui.calDay?`<button class="btn sec sm" data-act="calDay" data-v="${ui.calDay}">${esc(t('showMonth'))}</button>`:''}</div>`;
  const ad=ui.calDay&&adFor(ui.calDay);
  if(!list.length) h+=`<div class="card pad stack-s"><p class="muted small">${esc(t('noEvents'))}</p><button class="btn sec sm" data-act="addAny" style="align-self:flex-start">${ic('plus',16)} ${esc(t('add'))}</button></div>`;
  else { h+=`<ul class="list card">`; list.forEach(e=>{ h+=evRow(e); }); h+=`</ul>`; }
  if(ad) h+=adCard(ad);
  else if(!ui.calDay){ const ma=ADS.filter(a=>a.date.slice(0,7)===ui.calMonth); ma.forEach(a=>{ h+=adCard(a); }); }
  return h+`</section></div><p class="tiny">${esc(t('calNote'))}</p>`;
}
const adCard=ad=>`<button class="card tap ad-row" data-act="adSheet" data-v="${ad.date}"><span class="ad-logo">${adLogo(ad,44)}</span><span class="stack-s" style="gap:2px;min-width:0"><span class="lbl">${esc(t('sponsored'))} · ${esc(t('sampleAd'))} · ${esc(fmtD(ad.date,{day:'numeric',month:'short'}))}</span><b class="brandname">${esc(ad.name)}</b><span class="tiny">${esc(t(ad.line))}</span></span></button>`;
/* sample ad logos, drawn so they read at 18px on a calendar day and at 64px in the ad sheet */
function adLogo(a,size){
  const s=size||40;
  if(a.logo==='dabba') return `<svg class="adsvg" width="${s}" height="${s}" viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="dg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF9F2E"/><stop offset="1" stop-color="#E8590C"/></linearGradient></defs><rect width="48" height="48" rx="13" fill="url(#dg)"/><g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round"><path d="M6 19h7M4 25h9M7 31h6" stroke-width="2.6" opacity=".85"/><path d="M18 16.5 29 12l11 4.5v14L29 35l-11-4.5z" stroke-width="2.8" fill="#fff" fill-opacity=".14"/><path d="M18 16.5 29 21l11-4.5M29 21v14" stroke-width="2.8"/><path d="m23.5 14.3 11 4.5" stroke-width="2.2" opacity=".7"/></g></svg>`;
  return `<svg class="adsvg" width="${s}" height="${s}" viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="bg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1DB37A"/><stop offset="1" stop-color="#0B6B47"/></linearGradient></defs><rect width="48" height="48" rx="13" fill="url(#bg2)"/><g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="3"><path d="M13 12h16M13 18.5h16"/><path d="M19 12c5.5 0 8 2.6 8 6.5S24.5 25 19 25h-5l11 11"/></g><g fill="none" stroke="#C9FFE6" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.6"><path d="m30 33 7-7"/><path d="M32 26h5v5"/></g></svg>`;
}
const ADS=[{date:'2026-10-30',name:'Dabba Dispatch',logo:'dabba',line:'ad1Line'},{date:'2026-11-04',name:'Bahi Advance',logo:'bahi',line:'ad2Line'}];
const adFor=ymd=>ADS.find(a=>a.date===ymd);
function adSheet(ymd){ const a=adFor(ymd); openSheet(sheetHead(a.name,esc(t('sponsored'))+' · '+esc(t('sampleAd')))+`<div class="row" style="gap:14px"><span class="ad-logo big">${adLogo(a,64)}</span><p>${esc(t(a.line))}</p></div><button class="btn" data-act="adVisit">${esc(t('adVisit'))}</button><p class="tiny">${esc(t('adDisclaim'))}</p>`); }

/* ---------- versions ---------- */
function renderRevisions(){
  let h=`<section class="stack-s"><h1 class="h1">${esc(t('revisions'))}</h1><p class="small muted">${esc(t('revHelp'))}</p></section>`;
  myDeals().forEach(d=>{ h+=`<section class="stack"><div class="sec-h"><h2 class="h2">${esc(tx(d.title))}</h2><button class="link" data-act="openDeal" data-id="${d.id}" data-tab="agreement">${esc(t('openLbl'))}</button></div><ul class="list card">`;
    if(d.draft) h+=`<li><button class="tap row between" data-act="openDeal" data-id="${d.id}" data-tab="agreement"><span class="stack-s" style="gap:2px"><b>${esc(t('versionN',{n:d.draft.rev}))}</b><span class="tiny">${esc(t('notLocked'))}</span></span><span class="chip c-navy">${esc(t('draft'))}</span></button></li>`;
    [...d.versions].reverse().forEach(v=>{ const both=v.signatures.length>=2; h+=`<li><button class="tap row between" data-act="versionSheet" data-id="${d.id}" data-rev="${v.rev}"><span class="stack-s" style="gap:2px;min-width:0"><b>${esc(t('versionN',{n:v.rev}))}</b><span class="mono" style="color:var(--ink-3)">${esc(shortHash(v.hash))}</span><span class="tiny">${esc(t('lockedOn',{date:fmtDT(v.frozenAt)}))}</span></span><span class="chip ${both?'c-ok':'c-warn'}">${esc(t(v.lawyer?'lawyerChecked':both?'signed':'waitingSign'))}</span></button></li>`; });
    if(!d.draft&&!d.versions.length) h+=`<li class="pad small muted">${esc(t('noVersions'))}</li>`;
    h+=`</ul></section>`; });
  return h;
}

/* ---------- lawyer ---------- */
function renderLawyer(){
  let h=`<section class="stack-s"><h1 class="h1">${esc(t('lawyerCheck'))}</h1><p class="small muted">${esc(t('lawyerIntro'))}</p></section>`;
  h+=`<section class="stack"><h2 class="h2">${esc(t('panel'))}</h2><ul class="list card">${LAWYERS.map(l=>`<li class="pad lawyer"><span class="avatar">${l.ini}</span><span class="stack-s grow" style="gap:2px"><b>${esc(l.name)}</b><span class="small muted">${esc(t(l.id))}</span><span class="tiny">${esc(t('enrolment'))} <span class="mono">${esc(l.enrol)}</span></span></span><span class="fee">${rupee(l.fee)}</span></li>`).join('')}</ul><p class="tiny">${esc(t('demoPanel'))}</p></section>`;
  h+=`<section class="card pad stack-s"><b>${esc(t('feePlatform'))}: ${rupee(PLATFORM_FEE)}</b><p class="small muted">${esc(t('feeNote'))}</p></section>`;
  h+=`<section class="card pad stack-s"><div class="row" style="gap:10px"><span class="rc-ico">${ic('stamp',20)}</span><b>${esc(t('notaryT'))}</b></div><p class="small muted">${esc(t('notaryB'))}</p><div><button class="btn sec sm" data-act="notarySheet">${esc(t('bookNotary'))}</button></div>${(S.notary||[]).filter(n=>n.by===S.session).map(n=>`<span class="chip c-navy">${esc(t('notaryBooked',{date:fmtD(n.date,{day:'numeric',month:'long'})}))}</span>`).join('')}</section>`;
  const ds=myDeals(), appr=ds.flatMap(d=>d.versions.filter(v=>v.lawyer).map(v=>({d,v})));
  h+=`<section class="stack"><h2 class="h2">${esc(t('approvals'))}</h2>${appr.length?appr.map(({d,v})=>approvalBox(d,v,true)).join(''):`<p class="small muted">${esc(t('noApprovals'))}</p>`}`;
  ds.filter(d=>{ const v=latestVersion(d); return !d.draft&&v&&v.signatures.length>=2&&!v.lawyer&&!(d.lawyerReq&&d.lawyerReq.rev===v.rev&&d.lawyerReq.status==='pending'); }).forEach(d=>{ h+=`<button class="btn full" data-act="openDeal" data-id="${d.id}" data-tab="agreement">${esc(t('requestFor',{x:tx(d.title)}))}</button>`; });
  return h+`</section>`;
}
/* ---------- lawyer's own pages ---------- */
function renderLawyerHome(){
  const a=acct(), q=myDeals().filter(d=>d.lawyerReq&&d.lawyerReq.lawyerId===a.lawyerId&&d.lawyerReq.status==='pending');
  let h=`<section class="band-l stack-s"><p class="small muted">${esc(t('hello',{name:a.name.replace(/^Adv\.\s*/,'').split(' ')[0]}))}</p><h1 class="h1">${esc(t('reqWaiting',{n:q.length}))}</h1></section>`;
  h+=`<section class="stack"><h2 class="h2">${esc(t('reqQueue'))}</h2>`;
  if(!q.length) h+=`<p class="small muted">${esc(t('noRequests'))}</p>`;
  else { h+=`<ul class="list card">`; q.forEach(d=>{ const r=d.lawyerReq, f=standards(d).filter(x=>x.status==='fail').length; h+=`<li><button class="tap deal-row" data-act="openDeal" data-id="${d.id}" data-tab="agreement"><span class="row between"><span class="t">${esc(tx(d.title))}</span><span class="fee">${rupee(r.fee)}</span></span><span class="small muted">${esc(t('fromUser',{name:r.by}))} · ${esc(t('versionN',{n:r.rev}))} · ${esc(fmtDT(r.at))}</span><span class="row wrap" style="gap:6px"><span class="chip c-warn">${esc(t('reviewNow'))}</span>${f?`<span class="chip c-bad">${ic('tri',12)} ${esc(t('nProblems',{n:f}))}</span>`:''}</span></button></li>`; }); h+=`</ul>`; }
  return h+`</section>`+`<section class="card pad stack-s"><b>${esc(t('earnings'))}</b><span class="small muted">${esc(t('noFeeShare'))}</span><div><button class="btn sec sm" data-act="go" data-v="earnings">${esc(t('openLbl'))}</button></div></section>`;
}
function lawyerApprovals(){ const a=acct(); return S.deals.filter(d=>!d.sample).flatMap(d=>d.versions.filter(v=>v.lawyer&&v.lawyer.lawyerId===a.lawyerId).map(v=>({d,v}))).sort((x,y)=>y.v.lawyer.at.localeCompare(x.v.lawyer.at)); }
function renderApproved(){
  const L=lawyerApprovals(), notes=myDeals().filter(d=>d.lawyerReq&&d.lawyerReq.status==='notes');
  let h=`<section class="stack-s"><h1 class="h1">${esc(t('approvals'))}</h1></section>`;
  h+=L.length?L.map(({d,v})=>approvalBox(d,v,true)).join(''):`<p class="small muted">${esc(t('noApprovals'))}</p>`;
  notes.forEach(d=>{ h+=`<button class="card pad tap stack-s" data-act="openDeal" data-id="${d.id}" data-tab="agreement"><span class="lbl">${esc(t('notesSent'))}</span><b>${esc(tx(d.title))}</b><span class="small muted">${esc(d.lawyerReq.notes)}</span></button>`; });
  return h;
}
function renderEarnings(){
  const a=acct(), L=lawyerApprovals(), total=L.reduce((s,x)=>s+(x.v.lawyer.fee||0),0);
  return `<section class="stack-s"><h1 class="h1">${esc(t('earnings'))}</h1></section><section class="card pad stack-s"><span class="lbl">${esc(t('feesEarned'))}</span><span class="big">${rupee(total)}</span><span class="tiny">${esc(t('approvals'))}: ${L.length}</span></section><section class="card pad stack-s"><span class="lbl">${esc(t('listingFee'))}</span><b>${rupee(LISTING_FEE)}</b><p class="small muted">${esc(t('noFeeShare'))}</p></section><section class="card pad stack-s"><span class="lbl">${esc(t('lawyerFee'))}</span><b>${rupee(a.fee||0)}</b></section><ul class="list card">${L.map(({d,v})=>`<li class="pad row between"><span class="stack-s" style="gap:2px"><b>${esc(tx(d.title))}</b><span class="tiny">${esc(t('versionN',{n:v.rev}))} · ${esc(fmtDT(v.lawyer.at))}</span></span><span class="fee">${rupee(v.lawyer.fee||0)}</span></li>`).join('')}</ul>`;
}
/* ---------- settings ---------- */
function voicesFor(code){ if(!ttsWeb()) return []; try{ const bc=langOf(code).bcp.toLowerCase(); return speechSynthesis.getVoices().filter(v=>{ const l=v.lang.toLowerCase().replace('_','-'); return l===bc||l.startsWith(code+'-')||l===code; }); }catch(e){ return []; } }
function renderSettings(){
  const s=S.settings, tts=!!ttsWeb()&&!ttsNative(), vs=tts?voicesFor(s.lang):[];
  const a=acct();
  return `<section class="card pad stack"><div class="row between"><b>${esc(t('account'))}</b><span class="chip c-navy">${esc(t(a.role==='lawyer'?'role_lawyer':'role_user'))}</span></div><label class="field">${esc(t('yourName'))}<input class="inp" id="setName" value="${esc(s.userName)}" data-change="setName"></label>${a.role==='lawyer'?'':`<label class="field">${esc(t('business'))}<input class="inp" id="setBiz" value="${esc(s.business)}" data-change="setBiz"></label>`}${cloud.uid&&a.id===cloud.uid?`<p class="tiny">${esc(t('signedInAs',{email:cloud.email}))} ${cloudBadge()}</p>`:''}<p class="tiny">${a.mobile?`${esc(t('mobile'))}: <span class="mono">+91 ${esc(a.mobile.slice(0,2))}xxxxxx${esc(a.mobile.slice(-2))}</span> · `:''}${esc(t('userIdNote'))} <span class="mono">${esc(s.userId)}</span></p>${STANDALONE&&!SB?`<div class="note small">${esc(t('cloudNotSet'))}</div>`:''}<div class="row wrap"><button class="btn sec sm" data-act="tutorial">${esc(t('tutTitle'))}</button></div><button class="btn danger full" data-act="logoutAsk">${ic('logout',18)} ${esc(t('logOut'))}</button></section>
  <button class="card pad tap row between" style="display:flex;width:100%;text-align:left" data-act="go" data-v="data"><span class="stack-s" style="gap:2px"><b>${esc(t('yourData'))}</b><span class="tiny">${esc(t(a.train?'trainOn':'trainOff'))}</span></span>${ic('fwd',18)}</button>
  <section class="card pad stack"><b>${esc(t('appLang'))}</b><div class="langs">${LANGS.map(l=>`<button aria-pressed="${s.lang===l.c}" data-act="setLang" data-v="${l.c}">${esc(l.n)}</button>`).join('')}</div><p class="tiny">${esc(t('langNote'))}</p>${textSizeSeg()}${layoutSeg()}</section>${a.role==='lawyer'?'':`<section class="card pad row between" style="gap:12px"><span class="stack-s" style="gap:2px"><b>${esc(t('snipTool'))}</b><span class="tiny">${esc(t('snipSub'))}</span></span><button class="btn ${s.snip?'sec':''} sm" data-act="snipToggle">${esc(t(s.snip?'snipRemove':'snipAdd'))}</button></section>`}
  <section class="card pad stack"><b>${esc(t('readAloud'))}</b><label class="field">${esc(t('voice'))}<select class="sel" id="setVoice" data-change="setVoice"><option value="">${esc(t('deviceDefault'))}</option>${vs.map(v=>`<option value="${esc(v.voiceURI)}" ${s.voiceURI===v.voiceURI?'selected':''}>${esc(v.name)}</option>`).join('')}</select></label>${tts?(vs.length?'':`<div class="note warn">${esc(t('noVoice'))}</div>`):`<div class="note warn">${esc(t('o_noTts'))}</div>`}<label class="field">${esc(t('speed'))} <span class="tiny" id="rateVal">${s.rate.toFixed(2)}×</span><input type="range" id="setRate" min="0.6" max="1.4" step="0.05" value="${s.rate}"></label><button class="btn sec" data-act="testVoice">${ic('speaker',18)} ${esc(t('testVoice'))}</button></section>
  <section class="card pad stack"><b>${esc(t('aiReading'))}</b><label class="check"><input type="checkbox" id="setAi" ${s.ai?'checked':''} data-change="setAi"><span>${esc(t('aiToggle'))}</span></label><p class="tiny">${esc(t(SAMPLE?'aiOn':'aiOff'))}</p>${aiViaServer()?`<div class="note ok small">${esc(t('aiServerOn'))}</div>`:''}${STANDALONE?`<div class="stack-s" style="border-top:1px solid var(--line-2);padding-top:12px"><b class="small">${esc(t('apiKeyT'))}</b><p class="tiny">${esc(t('apiKeyB'))}</p>${apiKey()?`<span class="chip c-ok" style="align-self:flex-start">${esc(t('apiSaved'))}</span><div><button class="btn sec sm" data-act="apiRemove">${esc(t('apiRemove'))}</button></div>`:`<label class="field">${esc(t('apiKeyLbl'))}<input class="inp mono" id="apiKey" type="password" autocomplete="off" placeholder="sk-ant-..."></label><div><button class="btn sm" data-act="apiSave">${esc(t('apiSave'))}</button></div><p class="tiny">${esc(t('apiOff'))}</p>`}</div>`:''}</section>
  ${getAppCard()}${STANDALONE&&!isInstalled()&&!NATIVE()?`<section class="card pad stack-s"><b>${esc(t('installT'))}</b><p class="small muted">${esc(t('installB'))}</p>${INSTALL?`<div><button class="btn sm" data-act="installApp">${esc(t('installBtn'))}</button></div>`:`<p class="tiny">${esc(t(isIOS()?'installIos':'installOther'))}</p>`}</section>`:''}
  <details class="card legal"><summary>${esc(t('legalNotes'))}</summary><div class="in"><p>${esc(t('legal1'))}</p><p>${esc(t('legal2'))}</p><p>${esc(t('legal3'))}</p><p>${esc(t('legal4'))}</p><p>${esc(t('legal5'))}</p></div></details>
  ${cloud.uid?'':`<button class="btn warn" data-act="reset">${esc(t('resetDemo'))}</button>`}`;
}

function renderData(){
  const a=acct(), ic6=['file','lock','user','spark','shield','cal'];
  let h=`<section class="sec-h"><h1 class="h1">${esc(t('yourData'))}</h1>${sayBtn('dataList',{sel:'b, .small'})}</section><ul class="list card" id="dataList">`;
  for(let i=1;i<=6;i++) h+=`<li class="pad row" style="align-items:flex-start;gap:12px"><span class="rc-ico">${ic(ic6[i-1],18)}</span><span class="stack-s" style="gap:3px"><b>${esc(t('dataT'+i))}</b><span class="small muted">${esc(t(i===2&&SB?'dataB2cloud':'dataB'+i))}</span></span></li>`;
  h+=`</ul>`;
  if(a) h+=`<section class="card pad stack"><label class="check"><input type="checkbox" ${a.train?'checked':''} data-change="setTrain"><span>${esc(t('trainToggle'))}</span></label><span class="tiny">${esc(t(a.train?'trainOn':'trainOff'))}</span></section><button class="btn warn" data-act="deleteAcct">${esc(t('deleteData'))}</button>`;
  return h;
}
/* ---------- sheets ---------- */
function openSheet(html){ $('#sheet').innerHTML=html; $('#sheetWrap').hidden=false; document.body.style.overflow='hidden'; }
function closeSheet(){ ui.openRec=null; stopRead(); $('#sheetWrap').hidden=true; $('#sheet').innerHTML=''; document.body.style.overflow=''; if(ui.inp&&ui.inp.audioURL&&/^blob:/.test(ui.inp.audioURL)){ try{URL.revokeObjectURL(ui.inp.audioURL);}catch(e){} } ui.inp=null; }
const sheetHead=(title,sub)=>`<div class="sheet-head"><div class="stack-s" style="gap:2px;min-width:0"><h2 class="h2">${esc(title)}</h2>${sub?`<span class="tiny">${sub}</span>`:''}</div><button class="ibtn" data-act="closeSheet" aria-label="${esc(t('close'))}">×</button></div>`;
function msgRows(d,refs){ return refs.map(r=>{ const m=msgByRef(d,r); if(!m) return ''; return `<div class="msg"><span class="n">#${m.n}</span><div><div class="row between"><span class="who">${esc(m.sender)}</span><span class="tiny">${esc(m.ts?fmtDT(m.ts):'')}</span></div><div class="txt">${esc(m.text)}</div></div></div>`; }).join(''); }
function termSheet(k){
  const d=deal(), tm=d.terms[k]||T('missing'), def=TERM_DEFS.find(x=>x.key===k);
  let h=sheetHead(t('t_'+k),statusChip(tm.status));
  h+=tm.status==='missing'?`<div class="note bad">${esc(tx(tm.open||def.miss))}</div>`:`<div class="stack-s"><span class="lbl">${esc(t('whatSaid'))}</span><b>${esc(tx(tm.value))}</b>${tm.open?`<div class="settle"><b>${esc(t('toSettle'))}</b>${esc(tx(tm.open))}</div>`:''}<span class="tiny">${tm.proposedBy?esc(t('saidBy',{name:tm.proposedBy})):''}${tm.confirmedBy?' · '+esc(t('confirmedBy',{name:tm.confirmedBy})):' · '+esc(t('notConfirmed'))}</span></div>`;
  if(tm.history.length) h+=`<div class="stack"><span class="lbl">${esc(t('howNegotiated'))}</span><ol class="timeline">${tm.history.map(x=>{ const m=msgByRef(d,x.ref); return `<li><div class="row between" style="align-items:flex-start"><b style="font-size:14px">${esc(tx(x.value))}</b><span class="chip c-mute">${esc(t('st_'+x.stance))}</span></div><span class="tiny">${esc(x.by)} · ${esc(m&&m.ts?fmtDT(m.ts):'')} · #${esc(String(x.ref).split('#')[1])}</span>${m?`<p class="quote" style="margin-top:4px">${esc(m.text)}</p>`:''}</li>`; }).join('')}</ol></div>`;
  d.flags.filter(f=>(f.keys||[]).includes(k)).forEach(f=>{ h+=`<div class="stack-s"><span class="lbl">${esc(t('whatToDo'))}</span><p class="small">${esc(ft(f.detail))}</p><div class="bubble">${esc(ft(f.ask))}</div><div><button class="btn sec sm" data-act="copyText" data-text="${esc(ft(f.ask))}">${ic('copy',16)} ${esc(t('copyMessage'))}</button></div></div>`; });
  openSheet(h);
}
function recordSheet(id){
  const d=deal(), r=d.records.find(x=>x.id===id); ui.openRec=id;
  let h=sheetHead(recName(r),`${esc(r.id)} · ${esc(t('src_'+r.type))}`)+`<dl class="kv"><dt>${esc(t('uploadedBy'))}</dt><dd>${esc(r.uploadedByName)} · <span class="mono">${esc(r.uploadedBy)}</span></dd><dt>${esc(t('uploadedOn'))}</dt><dd>${esc(fmtDT(r.uploadedAt))}</dd><dt>${esc(t('source'))}</dt><dd>${esc(t('src_'+r.type))}</dd><dt>${esc(t('sentOn'))}</dt><dd>${r.sourceFrom?esc(fmtDT(r.sourceFrom))+(r.sourceTo&&r.sourceTo!==r.sourceFrom?' – '+esc(fmtDT(r.sourceTo)):''):esc(t('noTime'))}</dd><dt>${esc(t('capturedAs'))}</dt><dd>${esc(t({verbatim:'m_verbatim',transcript:'m_transcript',ocr:'m_ocr','pdf-text':'m_pdf'}[r.method]||'m_verbatim'))}</dd><dt>${esc(t('fingerprint'))}</dt><dd class="mono">${esc(r.sha256)}</dd>${r.consent?`<dt>${esc(t('consent'))}</dt><dd>${esc(t('c_'+r.consent.basis))} · ${esc(t('partOf'))}</dd>`:''}</dl>`;
  if(r.media&&r.media.thumb) h+=snipFigure(d,r);
  if(r.type==='voice') h+=`<div class="row wrap">${sayBtn('recMsgs',{lang:'en',sel:'.txt',label:'playVoice'})}</div>`;
  if(r.media&&r.media.src&&AUDIO[r.media.src]) h+=`<audio controls preload="none" src="${AUDIO[r.media.src]}" style="width:100%"></audio>`;
  else if(r.media&&r.media.data) h+=`<audio controls preload="none" src="${esc(r.media.data)}" style="width:100%"></audio>`;
  else if(r.media&&r.media.kind==='audio'&&r.media.path) h+=`<audio controls preload="none" data-sbpath="${esc(r.media.path)}" style="width:100%"></audio>`;
  if(r.media&&r.media.path&&r.media.kind!=='audio') h+=`<a class="btn sec sm" target="_blank" rel="noopener" href="#" data-sbpath="${esc(r.media.path)}" style="align-self:flex-start">${ic('file',16)} ${esc(t('openOriginal'))}</a>`;
  if(r.media&&r.media.path) h+=`<p class="tiny row" style="gap:6px">${ic('lock',14)} ${esc(t('storedOnline'))}</p>`;
  else if(r.media&&r.media.big) h+=`<div class="note">${esc(t('asrBigNote'))}</div>`;
  if(r.asr) h+=`<p class="tiny">${esc(t(r.asr.edited?'asrRecEdited':'asrRecAuto'))}</p>`;
  else if(r.media&&r.media.demo) h+=`<div class="note">${esc(t('demoAudio'))}</div>`;
  h+=`<div class="card pad stack-s seal-mini"><b class="small row" style="gap:6px">${ic('shield',16)} ${esc(t('fileCheckT'))}</b><span class="tiny">${esc(t('fileCheckB'))}</span><span class="mono">SHA-256 ${esc(r.sha256)}</span><div class="row wrap">${r.media&&(r.media.src||r.media.data||r.media.path)?`<button class="btn sec sm" data-act="dlOriginal" data-id="${r.id}">${ic('down',16)} ${esc(t('dlOriginal'))}</button>`:''}<label class="btn sec sm">${ic('file',16)} ${esc(t('checkCopy'))}<input type="file" hidden data-chkfile="${r.id}"></label></div><div id="chkOut"></div></div>`;
  h+=`<div class="row between"><span class="lbl">${esc(t('original'))}</span><button class="btn sec sm" data-act="verifyRecord" data-id="${r.id}">${ic('shield',16)} ${esc(t('verify'))}</button></div><div id="recVerify"></div><div id="recMsgs">${(()=>{ const U=usedMsgNs(d,r); return r.messages.map(m=>`<div class="msg ${U.has(m.n)?'used':''}"><span class="n">#${m.n}</span><div><div class="row between"><span class="who">${esc(m.sender)}</span><span class="tiny">${esc(m.ts?fmtDT(m.ts):'')}</span></div><div class="txt">${esc(m.text)}</div></div></div>`).join(''); })()}</div>`;
  openSheet(h); hydrateFiles($('#sheet'));
}
function clauseSheet(cid){
  const d=deal(), cl=currentClauses(d), c=cl.find(x=>x.id===cid), idx=cl.indexOf(c), keys=c.keys||clauseKeys(cid);
  const refs=[...new Set(keys.flatMap(k=>(d.terms[k]||{evidence:[]}).evidence))], logs=d.clauseLog.filter(l=>l.clauseId===cid);
  let h=sheetHead(`${idx+1}. ${t('h_'+cid)}`,esc(d.draft?t('draft')+' · '+t('versionN',{n:d.draft.rev}):t('versionN',{n:latestVersion(d).rev})))+`<p>${esc(tx(c.text))}</p>${c.open?`<div class="settle"><b>${esc(t('toSettle'))}</b>${esc(tx(c.open))}</div>`:''}`;
  h+=`<div class="stack-s"><span class="lbl">${esc(t('why'))}</span>${keys.map(k=>{ const tm=d.terms[k]||T('missing'); return `<div class="row between"><span class="small">${esc(t('t_'+k))}: ${esc(tx(tm.status==='missing'?(tm.open||''):tm.value))}</span>${statusChip(tm.status)}</div>`; }).join('')}</div>`;
  h+=`<div class="stack-s"><span class="lbl">${esc(t('original'))}</span>${refs.length?msgRows(d,refs):`<p class="small muted">${esc(t('noSource'))}</p>`}</div>`;
  h+=`<div class="stack"><span class="lbl">${esc(t('history'))}</span><ol class="timeline">${logs.map(l=>`<li><div class="row between"><b style="font-size:14px">${esc(t('a_'+l.action))} · ${esc(t('versionN',{n:l.rev}))}</b><span class="tiny">${esc(fmtDT(l.at))}</span></div><span class="tiny">${esc(byName(l.by))}${l.note?' · '+esc(noteText(l.note)):''}</span><p class="quote" style="margin-top:4px">${esc(tx(l.text))}</p></li>`).join('')}</ol></div>`;
  const vw=d.versions.filter(v=>v.payload.clauses.find(x=>x.id===cid));
  if(vw.length) h+=`<div class="stack-s"><span class="lbl">${esc(t('confirmedIn'))}</span>${vw.map(v=>`<div class="small">${esc(t('versionN',{n:v.rev}))}: ${v.signatures.map(s=>esc(first(s.name))+' '+esc(fmtD(s.at))).join(', ')||esc(t('notSigned'))}${v.lawyer?' · '+esc(v.lawyer.name):''}</div>`).join('')}</div>`;
  openSheet(h);
}
function editClauseSheet(cid){ const d=deal(), c=d.draft.clauses.find(x=>x.id===cid); openSheet(sheetHead(t('suggestEdit'),esc(t('h_'+cid))+' · '+esc(partyName(d,ui.actor)))+`<label class="field">${esc(t('wording'))}<textarea class="inp" id="edText">${esc(tx(c.text))}</textarea></label><label class="field">${esc(t('openField'))}<textarea class="inp" id="edOpen" style="min-height:70px">${esc(tx(c.open))}</textarea></label><p class="tiny">${esc(t('editNote',{name:first(partyName(d,ui.actor==='me'?'cp':'me'))}))}</p><button class="btn" data-act="proposeEdit" data-id="${cid}">${esc(t('sendChange'))}</button>`); }
function signSheet(pid){
  const d=deal(), v=latestVersion(d), p=d.parties.find(x=>x.id===pid);
  const g=ui.sg&&ui.sg.p===pid&&ui.sg.rev===v.rev?ui.sg:(ui.sg={p:pid,rev:v.rev,m:'aadhaar',step:'id',vid:'',otp:'',ok:false});
  let h=sheetHead(t('signAs',{name:p.name}),esc(p.org))+`<div class="note small">${esc(t('signingVersion',{n:v.rev}))} <span class="mono">${esc(shortHash(v.hash))}</span></div><div class="seg">${[['aadhaar','aadhaarSig'],['drawn','drawnSig']].map(([k,l])=>`<button aria-pressed="${g.m===k}" data-act="sgMethod" data-v="${k}">${esc(t(l))}</button>`).join('')}</div>`;
  if(g.m==='aadhaar'){
    if(g.step==='id') h+=`<label class="field">${esc(t('aadhaarOrVid'))}<input class="inp" data-sg="vid" value="${esc(g.vid)}" inputmode="numeric" maxlength="16" autocomplete="off" placeholder="XXXX XXXX XXXX"></label><p class="tiny">${esc(t('aadhaarPrivacy'))}</p><button class="btn full" data-act="sgOtp">${esc(t('sendOtp'))}</button>`;
    else h+=`<p class="small">${esc(t('esignOtpSent',{last:g.vid.slice(-4)}))}</p><input class="inp otp" data-sg="otp" value="${esc(g.otp)}" inputmode="numeric" maxlength="6" aria-label="${esc(t('enterOtp'))}"><p class="tiny">${esc(t('otpDemo'))}</p><label class="check"><input type="checkbox" data-sg="ok" ${g.ok?'checked':''}><span class="small">${esc(t('esignConsent',{n:v.rev,hash:shortHash(v.hash)}))}</span></label><button class="btn full" data-act="doEsign">${ic('shield',18)} ${esc(t('esignNow'))}</button><button class="link" data-act="sgBack">${esc(t('back'))}</button>`;
    h+=`<p class="tiny">${esc(t('esignDemoNote'))}</p>`;
  } else h+=`<canvas class="sigpad" id="sigpad"></canvas><div class="row between"><span class="tiny">${esc(t('signHere'))}</span><button class="link" data-act="sigClear">${esc(t('clear'))}</button></div><label class="check"><input type="checkbox" id="sigOk"><span>${esc(t('readConfirm',{n:v.rev}))}</span></label><button class="btn full" data-act="doSign" data-p="${pid}">${ic('pen',18)} ${esc(t('signBtn',{n:v.rev}))}</button>`;
  openSheet(h); if(g.m==='drawn') initSigPad();
}
function certSheet(pid){
  const d=deal(), v=latestVersion(d), sg=v.signatures.find(x=>x.party===pid), c=sg.cert;
  let h=sheetHead(t(c?'viewCert':'sigDetails'),esc(sg.name))+`<dl class="kv"><dt>${esc(t('signerLbl'))}</dt><dd>${esc(sg.name)}</dd><dt>${esc(t('method'))}</dt><dd>${esc(t(sg.method==='aadhaar'?'aadhaarSig':'drawnSig'))}</dd>${c?`<dt>Aadhaar</dt><dd class="mono">${esc(c.aadhaar)}</dd><dt>${esc(t('espLbl'))}</dt><dd>${esc(c.provider==='Demo eSign provider'?t('espDemo'):c.provider)}</dd><dt>${esc(t('txnLbl'))}</dt><dd class="mono">${esc(c.txn)}</dd><dt>${esc(t('certSerial'))}</dt><dd class="mono">${esc(c.serial)}</dd>`:''}<dt>${esc(t('signedAt'))}</dt><dd>${esc(fmtDT(sg.at))}</dd><dt>${esc(t('docFp'))}</dt><dd class="mono">${esc(sg.versionHash)}</dd><dt>${esc(t('sigFp'))}</dt><dd class="mono">${esc(sg.sigHash)}</dd></dl>${sg.img?`<img class="sig-img" src="${esc(sg.img)}" alt="">`:''}<button class="btn sec sm" data-act="verifySig" data-p="${pid}">${ic('shield',16)} ${esc(t('verify'))}</button><div id="sigOut"></div>`;
  if(c) h+=`<p class="tiny">${esc(t('esignDemoNote'))}</p>`;
  openSheet(h);
}
function versionSheet(did,rev){
  ui.dealId=did; const d=deal(did), v=d.versions.find(x=>x.rev===+rev), prev=d.versions.find(x=>x.rev===+rev-1), vr=ui.verify[d.id+':'+v.rev];
  let h=sheetHead(`${tx(d.title)} · ${t('versionN',{n:v.rev})}`,esc(t('lockedOn',{date:fmtDT(v.frozenAt)})))+`<dl class="kv"><dt>${esc(t('fingerprint'))}</dt><dd class="mono">${esc(v.hash)}</dd><dt>${esc(t('previous'))}</dt><dd class="mono">${esc(v.prevHash||t('firstVer'))}</dd><dt>${esc(t('timestamp'))}</dt><dd>${esc(fmtDT(v.frozenAt))}. ${esc(t('tsaNote'))}</dd><dt>${esc(t('evidence'))}</dt><dd>${v.payload.evidence.map(e=>`${esc(e.id)} <span class="mono">${esc(shortHash(e.sha256))}</span>`).join('<br>')}</dd><dt>${esc(t('signatures'))}</dt><dd>${v.signatures.length?v.signatures.map(s=>`${esc(s.name)} · ${esc(fmtDT(s.at))}`).join('<br>'):esc(t('none'))}</dd></dl>${v.lawyer?approvalBox(d,v):''}`;
  h+=`<div class="row wrap"><button class="btn sec sm" data-act="verify" data-rev="${v.rev}" data-sheet="1">${ic('shield',16)} ${esc(t('verify'))}</button><button class="btn sec sm" data-act="tamper" data-rev="${v.rev}">${esc(t('tryChange'))}</button></div><div id="verOut">${vr?verifyHtml(vr):''}</div>`;
  const rows=v.payload.clauses.map((c,i)=>{ const pc=prev&&prev.payload.clauses.find(x=>x.id===c.id), ch=pc&&pc.text!==c.text; if(prev&&!ch) return ''; return `<div class="stack-s" style="padding:8px 0;border-bottom:1px solid var(--line-2)"><b style="font-size:14px">${i+1}. ${esc(t('h_'+c.id))}</b><p>${ch?diffWords(tx(pc.text),tx(c.text)):esc(tx(c.text))}</p></div>`; }).join('');
  h+=`<div class="stack-s"><span class="lbl">${esc(prev?t('changesFrom',{n:prev.rev}):t('fullText'))}</span>${rows||`<p class="small muted">${esc(t('noChanges'))}</p>`}</div>`;
  openSheet(h);
}
const verifyHtml=r=>`<div class="note ${r.ok?'ok':'bad'} stack-s"><b>${esc(t(r.ok?'intact':'tampered'))}</b><span class="tiny">${esc(t('storedLbl'))}</span><span class="mono">${esc(r.stored)}</span><span class="tiny">${esc(t('nowLbl'))}</span><span class="mono">${esc(r.computed)}</span>${r.changed?`<span class="small">${esc(r.changed)}</span>`:''}</div>`;
function lawyerSheet(){
  const d=deal(), v=latestVersion(d), pk=LAWYERS.find(l=>l.id===ui.pickL);
  let h=sheetHead(t('lawyerCheck'),esc(t('versionN',{n:v.rev})))+`<span class="lbl">${esc(t('pickLawyer'))}</span><div class="stack-s">${LAWYERS.map(l=>`<button class="radio lawyer ${ui.pickL===l.id?'on':''}" data-act="pickLawyer" data-l="${l.id}"><span class="avatar">${l.ini}</span><span class="stack-s grow" style="gap:2px;text-align:left"><b>${esc(l.name)}</b><span class="small muted">${esc(t(l.id))}</span></span><span class="fee">${rupee(l.fee)}</span></button>`).join('')}</div>`;
  if(pk) h+=`<dl class="kv fees"><dt>${esc(t('feeLawyer'))}</dt><dd>${rupee(pk.fee)}</dd><dt>${esc(t('feePlatform'))}</dt><dd>${rupee(PLATFORM_FEE)}</dd><dt><b>${esc(t('feeTotal'))}</b></dt><dd><b>${rupee(pk.fee+PLATFORM_FEE)}</b></dd></dl><p class="tiny">${esc(t('feeNote'))}</p><button class="btn full" data-act="requestLawyer" data-l="${pk.id}">${esc(t('payAndRequest',{amt:rupee(pk.fee+PLATFORM_FEE)}))}</button><p class="tiny">${esc(t('demoPay'))}</p>`;
  else h+=`<p class="tiny">${esc(t('demoPanel'))}</p>`;
  openSheet(h);
}
function langSheet(){ openSheet(sheetHead(t('langAndSize'))+`<div class="langs">${LANGS.map(l=>`<button aria-pressed="${S.settings.lang===l.c}" data-act="setLang" data-v="${l.c}" data-close="1">${esc(l.n)}</button>`).join('')}</div><p class="tiny">${esc(t('langNote'))}</p>${textSizeSeg()}`); }
function newDealSheet(){ openSheet(sheetHead(t('newDeal'))+`<label class="field">${esc(t('dealAbout'))}<input class="inp" id="ndTitle"></label><label class="field">${esc(t('otherName'))}<input class="inp" id="ndName"></label><label class="field">${esc(t('theirBiz'))}<input class="inp" id="ndOrg"></label><div class="stack-s"><span class="lbl">${esc(t('sideQ'))}</span><div class="roles two side-pick" id="ndRole" role="radiogroup" aria-label="${esc(t('sideQ'))}">${[['Buyer','buyer','bag','sideBuyerSub'],['Seller','seller','shop','sideSellerSub']].map(([v,l,icn,sub])=>`<button class="role" role="radio" aria-checked="false" data-act="ndRole" data-v="${v}"><span class="role-ico">${ic(icn,26)}</span><b>${esc(t(l))}</b><span class="tiny">${esc(t(sub))}</span></button>`).join('')}</div></div><button class="btn" data-act="createDeal">${esc(t('createAndAdd'))}</button><button class="link" data-act="ndSample">${ic('spark',14)} ${esc(t('fillSample'))}</button>`); }
/* sample data so nobody has to type a chat to try the app */
function ddmmyy(dt){ return `${p2(dt.getUTCDate())}/${p2(dt.getUTCMonth()+1)}/${String(dt.getUTCFullYear()).slice(2)}`; }
async function fillSample(){
  const d=deal(), x=ui.inp, me=d.parties[0], cp=d.parties[1], seller=me.role==='Seller'?me:cp, buyer=seller===me?cp:me, now=new Date(Date.now()+5.5*3600e3), day=ddmmyy(now), due=new Date(now.getTime()+7*864e5);
  const dueTxt=new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',timeZone:'UTC'}).format(due);
  const chat=`${day}, 10:00 am - ${buyer.name}: Hi ${first(seller.name)}, need 500 pieces by ${dueTxt}. What is your rate?
${day}, 10:06 am - ${seller.name}: ₹25 per piece plus GST, delivery in 7 days
${day}, 10:12 am - ${buyer.name}: ₹23 karo please
${day}, 10:20 am - ${seller.name}: Ok ₹24 final. 50% advance by UPI, balance on delivery
${day}, 10:24 am - ${buyer.name}: Done 👍 Sending advance today
${day}, 10:40 am - ${buyer.name}: Sent ₹6,000 by UPI
${day}, 10:42 am - ${seller.name}: Received, thank you`;
  const voice='Haan ji, rate final hai. Delivery agle Monday tak chahiye, aur payment UPI se kar denge.';
  const doc=`PURCHASE ORDER No. PO-118
Date: ${now.toISOString().slice(0,10)}
From: ${buyer.org||buyer.name}
To: ${seller.org||seller.name}
Item: 500 pieces as per approved sample
Rate: Rs. 24 per piece plus GST at 18%
Delivery: by ${dueTxt}
Payment: 50% advance by UPI, balance on delivery`;
  if(x.type==='paste') x.text=chat;
  if(x.type==='whatsapp'){ x.text=chat; x.fileName=`WhatsApp Chat with ${cp.name}.txt`; x.fileHash=await sha256Text(chat); x.status=t('msgsFound',{n:parseChat(chat).length}); }
  if(x.type==='voice'){ x.text=voice; x.fileName='PTT-sample-voice-note.mp3'; x.fileHash=await sha256Bytes(audioBytes('vn2')); x.audioURL=AUDIO.vn2; x.audioSrc='vn2'; x.consent='sent_by_them'; x.party=true; x.speaker=buyer.id; x.srcTime=now.toISOString().slice(0,16); x.audioDemo=true; x.status=t('sampleVoiceNote'); }
  if(x.type==='pdf'||x.type==='photo'){ x.text=doc; x.fileName=x.type==='pdf'?'PO-118.pdf':'PO-118-photo.jpg'; x.fileHash=await sha256Text('demo-file:'+doc); x.speaker=buyer.id; x.status=''; }
  addEvidenceSheet();
}
function pickDealSheet(){ openSheet(sheetHead(t('addEvidence'))+`<span class="lbl">${esc(t('whichDeal'))}</span><ul class="list card">${myDeals().map(d=>`<li><button class="tap" data-act="pickDeal" data-id="${d.id}"><b>${esc(tx(d.title))}</b><br><span class="tiny">${esc(d.parties[1].org)} · ${esc(d.parties[1].name)}</span></button></li>`).join('')}</ul><button class="btn sec" data-act="newDeal">${ic('plus',16)} ${esc(t('newDeal'))}</button>`); }

/* ---------- tamper check: recompute every fingerprint ---------- */
async function integrityCheck(d0,tamper){
  const d=tamper?JSON.parse(JSON.stringify(d0)):d0, items=[]; let changed='';
  if(tamper){ const r=d.records[0]; if(r){ const m0=(r.rawText.match(/\d+/)||['0'])[0]; r.rawText=r.rawText.replace(/\d+/,x=>String(+x+1)); changed=`${r.id}: ${m0} → ${+m0+1}`; } }
  for(const r of d.records){ const h=await sha256Text(r.rawText); items.push({k:'rec',label:`${r.id} · ${recName(r)}`,ok:h===r.textSha,stored:r.textSha,now:h}); }
  for(let i=0;i<d.versions.length;i++){ const v=d.versions[i], h=await sha256Text(canon(v.payload)), prev=d.versions[i-1];
    const evOk=v.payload.evidence.every(e=>{ const r=d.records.find(x=>x.id===e.id); return !r||r.sha256===e.sha256; });
    items.push({k:'ver',label:t('versionN',{n:v.rev}),ok:h===v.hash&&evOk,stored:v.hash,now:h});
    if(prev) items.push({k:'chain',label:t('chainLink',{a:prev.rev,b:v.rev}),ok:v.prevHash===prev.hash&&v.payload.prevHash===prev.hash});
    for(const sg of v.signatures){ const h2=await sha256Text(canon(sigBody(sg))), imgOk=!sg.img||!sg.imgSha||(await sha256Text(sg.img))===sg.imgSha; items.push({k:'sig',label:t('sigOf',{name:sg.name,n:v.rev}),ok:h2===sg.sigHash&&sg.versionHash===v.hash&&imgOk,stored:sg.sigHash,now:h2}); }
    if(v.lawyer) items.push({k:'law',label:t('lawOf',{name:v.lawyer.name,n:v.rev}),ok:v.lawyer.hash===v.hash}); }
  if(d.frozen&&d.frozen.snapshot){ const h=await sha256Text(canon(d.frozen.snapshot)); items.push({k:'frozen',label:t('rsFreeze'),ok:h===d.frozen.hash}); }
  return {items,tamper:!!tamper,changed,at:nowISO()};
}
function integritySheet(res){
  const d=deal(); let h=sheetHead(t('tamperTitle'),esc(tx(d.title)))+`<p class="small muted">${esc(t('hashExplain'))}</p><div class="row wrap"><button class="btn sm" data-act="runIntegrity">${ic('shield',16)} ${esc(t('checkAll'))}</button><button class="btn sec sm" data-act="tamperIntegrity">${esc(t('tryChange'))}</button></div>`;
  if(res){ const bad=res.items.filter(x=>!x.ok).length;
    h+=`<div class="note ${bad?'bad':'ok'} stack-s"><b>${esc(bad?t('integrityBad',{n:bad}):t('integrityOk',{n:res.items.length}))}</b>${res.tamper?`<span class="small">${esc(t('tamperSim',{x:res.changed}))}</span>`:''}<span class="tiny">${esc(fmtDT(res.at))}</span></div><ul class="list card integ">${res.items.map(x=>`<li class="${x.ok?'ok':'bad'}"><span class="sic">${ic(x.ok?'check':'tri',16)}</span><span class="stack-s grow" style="gap:1px"><b>${esc(x.label)}</b><span class="tiny">${esc(t('ik_'+x.k))}</span>${x.ok||!x.stored?'':`<span class="mono">${esc(t('storedLbl'))} ${esc(shortHash(x.stored))}</span><span class="mono">${esc(t('nowLbl'))} ${esc(shortHash(x.now))}</span>`}</span></li>`).join('')}</ul>`; }
  openSheet(h);
}

/* ---------- compare with another agreement ---------- */
const SAMPLE_PO=`PURCHASE ORDER TERMS AND CONDITIONS

1. Price: Rs. 17 per box, inclusive of all taxes and freight.
2. Payment: within 90 days from the date of receipt of the invoice.
3. Delivery: on or before 31 October 2026. Any delay shall attract a penalty of 2% of the order value per day.
4. Quality: the Buyer may reject any lot at its sole discretion. Rejected goods shall not be paid for.
5. Liability: the Supplier shall have unlimited liability for any loss suffered by the Buyer.
6. Intellectual property: all designs, printing plates and artwork made for this order shall belong to the Buyer.
7. Cancellation: the Buyer may cancel this order at any time without compensation. Any advance paid is non-refundable.
8. Jurisdiction: the courts at Mumbai shall have exclusive jurisdiction.
9. This order shall renew automatically for the next festival season unless cancelled in writing.`;
const CMP_TOPICS=[['cmp_price',/price|rate|rs\.?\s?\d|₹/i],['cmp_payment',/payment|pay within|advance|balance|credit|\bdays\b/i],['cmp_delivery',/deliver|dispatch|shipment/i],['cmp_penalty',/penalt|liquidated|late|delay/i],['cmp_quality',/defect|quality|replace|inspect|warrant|reject/i],['cmp_termination',/terminat|cancel/i],['cmp_liability',/liab|indemn/i],['cmp_ip',/intellectual|copyright|trade ?mark|logo|artwork|design/i],['cmp_dispute',/dispute|arbitrat|mediat|jurisdiction|court/i],['cmp_tax',/\bgst\b|\btax/i]];
const CMP_RISKS=[['rk_unlimited',/unlimited liability/i],['rk_longpay',/(4[6-9]|[5-9]\d|1\d\d)\s*days/i],['rk_discretion',/sole discretion/i],['rk_nonrefund',/non-?refundable/i],['rk_jurisdiction',/exclusive jurisdiction/i],['rk_autorenew',/renew(s|ed)? automatically|auto-?renew/i],['rk_penaltyPct',/\d+(\.\d+)?\s*%[^.]{0,40}per day/i],['rk_nocomp',/without (any )?compensation/i]];
function ourAgreementText(d){ return currentClauses(d).map((c,i)=>`${i+1}. ${en('h_'+c.id)}: ${c.text===en('notDiscussed')?'(not discussed)':c.text}${c.open?' [Still open: '+c.open+']':''}`).join('\n'); }
function heuristicCompare(d,text){
  const A=currentClauses(d).filter(c=>c.text!==en('notDiscussed')).map(c=>c.text).join('\n'); let a=0,b=0;
  const RISK_TOPIC={rk_unlimited:'cmp_liability',rk_longpay:'cmp_payment',rk_discretion:'cmp_quality',rk_nonrefund:'cmp_termination',rk_nocomp:'cmp_termination',rk_autorenew:'cmp_termination',rk_jurisdiction:'cmp_dispute',rk_penaltyPct:'cmp_penalty'};
  const riskyTopics=new Set(CMP_RISKS.filter(([,re])=>re.test(text)).map(([k])=>RISK_TOPIC[k]));
  const rows=CMP_TOPICS.map(([k,re])=>{ const ia=re.test(A), ib=re.test(text); if(ib&&riskyTopics.has(k)){ a++; return {topic:{k},a:{k:ia?'cmpHas':'cmpNot'},b:{k:'cmpHasRisky'},better:'A',why:{k:'cmpWhy_risky'}}; } const better=ia&&!ib?'A':ib&&!ia?'B':ia?'same':'neither'; if(better==='A') a++; if(better==='B') b++; return {topic:{k},a:{k:ia?'cmpHas':'cmpNot'},b:{k:ib?'cmpHas':'cmpNot'},better,why:{k:'cmpWhy_'+better}}; });
  const risks=CMP_RISKS.filter(([,re])=>re.test(text)).map(([k])=>({k}));
  const verdict=risks.length>=2||a>b?'A':b>a&&!risks.length?'B':'mixed';
  return {method:'basic',verdict,summary:{k:'cmpSum_'+verdict,p:{a,b,r:risks.length}},rows,missing:rows.filter(r=>r.better==='A').map(r=>r.topic),risks,suggest:risks.length?[{k:'cmpSuggest'}]:[]};
}
async function runCompare(d){
  const c=ui.cmp; if(!c||!c.text.trim()) return toast(t('cmpNeedText'));
  c.busy=true; c.status=t('cmpWorking'); compareSheet(); let res=null;
  if(SAMPLE&&S.settings.ai){ try{ const me=d.parties[0], L=langOf(S.settings.lang);
      const out=await SAMPLE.json(`You compare two business agreements for ${me.name} of ${me.org}, who is the ${me.role.toLowerCase()} in this deal, under Indian law.
Agreement A was made by DraftIt from the parties' own chats. Agreement B is a document ${me.name} uploaded.
Compare them topic by topic from ${me.name}'s point of view: price, payment terms, delivery, late penalty, quality and rejection, cancellation, liability, intellectual property, tax and GST, dispute resolution and jurisdiction, and anything else important.
Return JSON only: {"verdict":"A|B|mixed","summary":"two or three sentences","rows":[{"topic":"","a":"short","b":"short","better":"A|B|same|neither","why":"one sentence"}],"missing":["important protections missing from B"],"risks":["risky or unfair terms in B"],"suggest":["short actions"]}.
Write every text value in ${L.en}, in simple everyday words. Keep names, amounts and section numbers as they are.

AGREEMENT A:
${ourAgreementText(d)}

AGREEMENT B:
${c.text.slice(0,14000)}`,{modelTier:'default'});
      const S2=x=>String(x==null?'':x), arr=x=>Array.isArray(x)?x.map(S2).filter(Boolean).slice(0,10):[];
      res={method:'claude',lang:S.settings.lang,verdict:['A','B','mixed'].includes(out.verdict)?out.verdict:'mixed',summary:S2(out.summary),rows:(Array.isArray(out.rows)?out.rows:[]).slice(0,16).map(r=>({topic:S2(r.topic),a:S2(r.a),b:S2(r.b),better:['A','B','same','neither'].includes(r.better)?r.better:'same',why:S2(r.why)})),missing:arr(out.missing),risks:arr(out.risks),suggest:arr(out.suggest)};
    }catch(e){ toast(t('o_noClaude')); } }
  if(!res) res=heuristicCompare(d,c.text);
  Object.assign(res,{id:'CMP-'+Date.now().toString(36),name:c.name||t('cmpPasted'),at:nowISO(),sha256:await sha256Text(c.text),chars:c.text.length});
  d.compares=d.compares||[]; d.compares.unshift(res); save(); ui.cmp=null; compareResultSheet(res.id); ui.keep=true; render();
}
function compareCard(d){ const L=d.compares||[];
  return `<section class="card pad stack-s"><div class="row" style="gap:10px"><span class="rc-ico">${ic('layers',18)}</span><b>${esc(t('cmpTitle'))}</b></div><p class="small muted">${esc(t('cmpIntro'))}</p><div><button class="btn sec sm" data-act="compareSheet">${ic('file',16)} ${esc(t('cmpUpload'))}</button></div>${L.length?`<ul class="list">${L.map(r=>`<li><button class="tap row between" data-act="compareResult" data-id="${r.id}" style="width:100%;padding:8px 0"><span class="stack-s" style="gap:1px;min-width:0"><b class="small" style="overflow-wrap:anywhere">${esc(r.name)}</b><span class="tiny">${esc(fmtDT(r.at))}</span></span><span class="chip ${r.verdict==='A'?'c-ok':r.verdict==='B'?'c-navy':'c-warn'}">${esc(t('cmpV_'+r.verdict))}</span></button></li>`).join('')}</ul>`:''}</section>`; }
function compareSheet(){
  const d=deal(), c=ui.cmp||(ui.cmp={text:'',name:'',busy:false,status:''});
  let h=sheetHead(t('cmpTitle'),esc(tx(d.title)))+`<p class="small muted">${esc(t('cmpIntro'))}</p><label class="field">${esc(t('chooseFile'))}<input class="inp" type="file" accept=".pdf,.docx,.txt,application/pdf,text/plain,image/*" data-cmpfile="1"></label><p class="tiny">${esc(t('cmpFormats'))}</p><button class="link" data-act="cmpSample">${ic('spark',14)} ${esc(t('cmpUseSample'))}</button><label class="field">${esc(t('cmpPaste'))}<textarea class="inp" id="cmpText" data-cmp="text" style="min-height:150px">${esc(c.text)}</textarea></label>`;
  if(c.status) h+=`<div class="note busy">${c.busy?'<span class="spin"></span>':''}<span>${esc(c.status)}</span></div>`;
  openSheet(h+`<button class="btn full" data-act="runCompare" ${c.busy?'disabled':''}>${ic('layers',18)} ${esc(t('cmpRun'))}</button>`);
}
function compareResultSheet(id){
  const d=deal(), r=(d.compares||[]).find(x=>x.id===id); if(!r) return;
  const bt={A:'c-ok',B:'c-navy',same:'c-mute',neither:'c-warn'};
  let h=sheetHead(t('cmpResult'),esc(r.name)+' · '+esc(fmtDT(r.at)))+`<div id="cmpOut" class="stack"><div class="verdict v-${r.verdict}"><b>${esc(t('cmpV_'+r.verdict))}</b><p class="small">${esc(ft(r.summary))}</p></div>`;
  h+=`<div class="row between"><span class="tiny">A = ${esc(t('cmpOurs'))} · B = ${esc(t('cmpTheirs'))}</span>${sayBtn('cmpOut',{sel:'.verdict b,.verdict p,.cmp-row,.cmp-list li'})}</div><div class="cmp-rows">${r.rows.map(x=>`<div class="cmp-row"><div class="row between" style="gap:8px;align-items:flex-start"><b>${esc(ft(x.topic))}</b><span class="chip ${bt[x.better]}">${esc(t('cmpB_'+x.better))}</span></div><div class="cmp-ab"><span><i>A</i>${esc(ft(x.a))}</span><span><i>B</i>${esc(ft(x.b))}</span></div><p class="tiny">${esc(ft(x.why))}</p></div>`).join('')}</div>`;
  if(r.risks.length) h+=`<div class="stack-s"><b class="red">${ic('tri',16)} ${esc(t('cmpRisks'))}</b><ul class="cmp-list risk">${r.risks.map(x=>`<li>${esc(ft(x))}</li>`).join('')}</ul></div>`;
  if(r.missing.length) h+=`<div class="stack-s"><b>${esc(t('cmpMissing'))}</b><ul class="cmp-list">${r.missing.map(x=>`<li>${esc(ft(x))}</li>`).join('')}</ul></div>`;
  if(r.suggest.length) h+=`<div class="stack-s"><b>${esc(t('whatToDo'))}</b><ul class="cmp-list">${r.suggest.map(x=>`<li>${esc(ft(x))}</li>`).join('')}</ul></div>`;
  h+=`</div><p class="tiny">${esc(t(r.method==='claude'?'cmpByClaude':'cmpBasic'))} · ${esc(t('fileFp'))} <span class="mono">${esc(shortHash(r.sha256))}</span></p>`;
  openSheet(h);
}
async function fileText(file){
  const buf=await readAs(file,'buf'), name=(file.name||'').toLowerCase(), hash=await sha256Bytes(new Uint8Array(buf));
  if(/\.txt$/.test(name)||file.type==='text/plain') return {text:new TextDecoder().decode(buf),hash};
  if(/\.docx$/.test(name)){ if(!window.mammoth) await loadScript('https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js'); const r=await window.mammoth.extractRawText({arrayBuffer:buf.slice(0)}); return {text:r.value||'',hash}; }
  if(/\.pdf$/.test(name)||file.type==='application/pdf'){ if(!window.pdfjsLib){ await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'); window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; }
    const pdf=await window.pdfjsLib.getDocument({data:new Uint8Array(buf.slice(0))}).promise, n=Math.min(pdf.numPages,30), out=[];
    for(let i=1;i<=n;i++){ const tc=await (await pdf.getPage(i)).getTextContent(); out.push(tc.items.map(it=>it.str+(it.hasEOL?'\n':' ')).join('').trim()); }
    let text=out.filter(Boolean).join('\n\n');
    if(!text&&SAMPLE){ const blobs=[]; for(let i=1;i<=Math.min(n,3);i++){ const pg=await pdf.getPage(i), vp=pg.getViewport({scale:1.6}), cv=document.createElement('canvas'); cv.width=vp.width; cv.height=vp.height; await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise; blobs.push(await new Promise(r=>cv.toBlob(r,'image/jpeg',.85))); } text=await ocrBlobs(blobs); }
    return {text,hash}; }
  if(/^image\//.test(file.type)&&SAMPLE) return {text:await ocrBlobs([file]),hash};
  return {text:'',hash};
}

/* ---------- category ---------- */
function catSheet(){ const d=deal(); openSheet(sheetHead(t('catPick'))+`<p class="small muted">${esc(t('catPickNote'))}</p><div class="stack-s">${CATS.map(c=>`<button class="radio ${catOf(d)===c?'on':''}" data-act="setCat" data-v="${c}"><span>${esc(t('cat_'+c))}</span></button>`).join('')}</div>`); }

/* ---------- report a scam ---------- */
function complaintText(d){
  const me=d.parties[0], cp=d.parties[1], r=ui.rs||{reason:'nopay'}, paid=(d.terms.advance||{}).status==='agreed'?(d.terms.advance.value||''):'';
  return `Subject: Complaint about a business transaction (DraftIt deal ${d.id})

Complainant: ${me.name}, ${me.org}${me.address?', '+me.address:''}
Other party: ${cp.name}, ${cp.org}${cp.address?', '+cp.address:''}

What happened: ${en('rs_'+r.reason)}.
Deal: ${d.title}${d.value?', value Rs. '+Number(d.value).toLocaleString('en-IN'):''}.${paid?'\nPayment recorded: '+paid+'.':''}

Evidence: ${d.records.length} conversation record(s) and ${d.versions.length} signed agreement version(s), each with a SHA-256 hash value, in the attached DraftIt evidence file.${d.frozen?`\nEvidence frozen on ${d.frozen.at} (IST). Snapshot SHA-256: ${d.frozen.hash}`:''}

I request that appropriate action be taken under the applicable law.

${me.name}
Date: ${todayYMD()}`;
}
function reportSheet(){
  const d=deal(), r=ui.rs||(ui.rs={reason:d.report?d.report.reason:'nopay'});
  let h=sheetHead(t('reportScam'),esc(tx(d.title)));
  h+=`<div class="stack-s"><span class="lbl">${esc(t('rsWhat'))}</span>${['nopay','nogoods','fakepay','other'].map(k=>`<label class="radio ${r.reason===k?'on':''}"><input type="radio" name="rsr" value="${k}" ${r.reason===k?'checked':''} data-change="rsReason"><span>${esc(t('rs_'+k))}</span></label>`).join('')}</div>`;
  h+=`<div class="urgent stack-s" id="rsUrgent"><div class="row between"><b class="row" style="gap:8px">${ic('excl',18)} ${esc(t('rsActFast'))}</b>${sayBtn('rsUrgent',{sel:'p.small'})}</div><p class="small">${esc(t('rsCall'))}</p><div class="row wrap"><a class="btn danger sm" href="tel:1930">${esc(t('call1930'))}</a><a class="btn sec sm" href="https://cybercrime.gov.in" target="_blank" rel="noopener">cybercrime.gov.in</a></div><p class="small">${esc(t('rsBank'))}</p></div>`;
  h+=`<div class="card pad stack-s"><b>${esc(t('rsFreeze'))}</b><p class="tiny">${esc(t('rsFreezeNote'))}</p>${d.frozen?`<span><span class="chip c-ok">${esc(t('rsFrozen',{date:fmtDT(d.frozen.at)}))}</span></span><span class="mono">SHA-256 ${esc(d.frozen.hash)}</span>`:`<div><button class="btn sec sm" data-act="rsFreeze">${ic('lock',16)} ${esc(t('rsFreeze'))}</button></div>`}</div>`;
  h+=`<div class="stack-s"><b>${esc(t('rsComplaint'))}</b><span class="tiny">${esc(t('rsEnglish'))}</span><textarea class="inp mono en-doc" id="rsText" readonly style="min-height:190px">${esc(complaintText(d))}</textarea><div class="row wrap"><button class="btn sec sm" data-act="copyRs">${ic('copy',16)} ${esc(t('copy'))}</button><button class="btn sec sm" data-act="exportHtml">${ic('down',16)} ${esc(t('download'))}</button></div></div>`;
  h+=d.report?`<div class="note bad">${esc(t('rsDone'))}</div>`:`<button class="btn danger full" data-act="rsSubmit">${ic('flag',18)} ${esc(t('rsSubmit'))}</button>`;
  openSheet(h+`<p class="tiny">${esc(t('rsNote'))}</p>`);
}
async function freezeEvidence(d){ const at=nowISO(); const snap={app:'DraftIt',dealId:d.id,at,records:d.records.map(r=>({id:r.id,sha256:r.sha256})),versions:d.versions.map(v=>({rev:v.rev,hash:v.hash,signatures:v.signatures.map(s=>s.sigHash)}))}; d.frozen={at,hash:await sha256Text(canon(snap)),snapshot:snap}; save(); }

/* ---------- dispute routes ---------- */
function disputeSheet(){
  const d=deal(), cp=d.parties[1], seller=d.parties[0].role==='Seller';
  const ag=TERM_DEFS.filter(x=>(d.terms[x.key]||{}).status==='agreed').map(x=>t('t_'+x.key)).join(', ')||'—', op=TERM_DEFS.filter(x=>(d.terms[x.key]||{}).status!=='agreed').slice(0,6).map(x=>t('t_'+x.key)).join(', ')||'—';
  const msg=t('dispMsg',{name:first(cp.name),agreed:ag,open:op});
  const link=(u,l)=>`<a class="btn sec sm" href="${u}" target="_blank" rel="noopener">${esc(l)}</a>`;
  const steps=[{n:1,ap:true,x:`<div class="bubble">${esc(msg)}</div><div><button class="btn sec sm" data-act="copyText" data-text="${esc(msg)}">${ic('copy',16)} ${esc(t('copyMessage'))}</button></div>`},{n:2,ap:true,x:link('https://nalsa.gov.in','nalsa.gov.in')},{n:3,ap:seller,x:link('https://samadhaan.msme.gov.in','samadhaan.msme.gov.in')},{n:4,ap:false,x:link('https://e-jagriti.gov.in','e-jagriti.gov.in')},{n:5,ap:!!d.report||fraudRefs(d).length>0,x:link('https://cybercrime.gov.in','cybercrime.gov.in')},{n:6,ap:true,x:`<div><button class="btn sec sm" data-act="go" data-v="lawyer">${ic('scale',16)} ${esc(t('panel'))}</button></div>`}];
  openSheet(sheetHead(t('dispTitle'),esc(tx(d.title)))+`<div class="row between" style="gap:8px"><p class="small muted">${esc(t('dispIntro'))}</p>${sayBtn('routesList',{sel:'.routes b, .routes p.small'})}</div><ol class="routes" id="routesList">${steps.map(s=>`<li class="${s.ap?'':'dim'}"><span class="rn">${s.n}</span><div class="stack-s"><div class="row between wrap" style="gap:6px"><b>${esc(t('d'+s.n+'T'))}</b><span class="chip ${s.ap?'c-navy':'c-mute'}">${esc(t(s.ap?'mayApply':'notForYou'))}</span></div><p class="small muted">${esc(t('d'+s.n+'B'))}</p>${s.x}</div></li>`).join('')}</ol>`);
}

/* ---------- party details ---------- */
function partySheet(){
  const d=deal(), sealed=!d.draft&&d.versions.length;
  let h=sheetHead(t('partyDetails'),esc(tx(d.title)));
  const img=(p,k,lbl)=>`<div class="logo-row"><span class="logo-slot ${k}">${p[k]?`<img src="${esc(p[k])}" alt="">`:ic(k==='logo'?'cam':'stamp',20)}</span><span class="stack-s grow" style="gap:4px"><b class="small">${esc(t(lbl))}</b><span class="row wrap" style="gap:8px"><label class="btn sec sm">${esc(t('uploadImg'))}<input type="file" accept="image/*" hidden data-logo="${p.id}:${k}"></label>${p[k]?`<button class="link" data-act="rmLogo" data-v="${p.id}:${k}">${esc(t('removeLbl'))}</button>`:`<button class="link" data-act="sampleLogo" data-v="${p.id}:${k}">${esc(t('useSampleImg'))}</button>`}</span></span></div>`;
  d.parties.forEach(p=>{ const f=(k,l,ph)=>`<label class="field">${esc(t(l))}<input class="inp" id="pd_${p.id}_${k}" value="${esc(p[k]||'')}" placeholder="${ph||''}"></label>`; h+=`<div class="card pad stack-s"><b>${esc(p.org||p.name)}</b><span class="tiny">${esc(p.name)} · ${esc(t(p.role==='Seller'?'seller':'buyer'))}</span>${img(p,'logo','logoLbl')}${img(p,'seal','sealLbl')}${f('address','address')}${f('gstin','gstin','29ABCDE1234F1Z5')}${f('udyam','udyam','UDYAM-KR-00-0000000')}</div>`; });
  h+=`<p class="tiny">${esc(t('logoNote'))}</p><label class="field">${esc(t('signPlace'))}<input class="inp" id="pd_place" value="${esc(d.place||'')}"></label>`;
  if(sealed) h+=`<div class="note">${esc(t('detailsNextVer'))}</div>`;
  openSheet(h+`<button class="btn full" data-act="saveParties">${esc(t('saveLbl'))}</button>`);
}
function syncParties(d){ d.parties.forEach(p=>['address','gstin','udyam'].forEach(k=>{ const el=$('#pd_'+p.id+'_'+k); if(el) p[k]=el.value.trim(); })); const pl=$('#pd_place'); if(pl&&pl.value.trim()) d.place=pl.value.trim(); }
const shrinkPng=(url,max)=>new Promise(res=>{ const im=new Image(); im.onload=()=>{ const k=Math.min(1,max/Math.max(im.width,im.height)), c=document.createElement('canvas'); c.width=Math.round(im.width*k); c.height=Math.round(im.height*k); c.getContext('2d').drawImage(im,0,0,c.width,c.height); res(c.toDataURL('image/png')); }; im.onerror=()=>res(null); im.src=url; });
function sampleImage(p,kind){
  const c=document.createElement('canvas'); c.width=c.height=240; const g=c.getContext('2d'), ini=String(p.org||p.name).split(/\s+/).filter(w=>/^[A-Za-z]/.test(w)).slice(0,2).map(w=>w[0].toUpperCase()).join('')||'P';
  if(kind==='logo'){ g.fillStyle='#0B2E63'; g.beginPath(); g.roundRect?g.roundRect(10,10,220,220,44):g.rect(10,10,220,220); g.fill(); g.fillStyle='#FFFFFF'; g.font='bold 104px Arial, sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(ini,120,128); }
  else { g.strokeStyle='#1B4787'; g.lineWidth=8; g.beginPath(); g.arc(120,120,108,0,Math.PI*2); g.stroke(); g.lineWidth=3; g.beginPath(); g.arc(120,120,88,0,Math.PI*2); g.stroke(); g.fillStyle='#1B4787'; g.textAlign='center'; g.textBaseline='middle'; g.font='bold 70px Arial, sans-serif'; g.fillText(ini,120,112); g.font='bold 20px Arial, sans-serif'; g.fillText('AUTHORISED',120,170); g.font='bold 18px Arial, sans-serif'; const nm=String(p.org||p.name).toUpperCase().slice(0,22); g.fillText(nm,120,58); }
  return c.toDataURL('image/png');
}

/* ---------- formal agreement (English, as filed in Indian courts) ---------- */
const longDate=iso=>{ try{ return new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date(iso.length===10?iso+'T12:00:00'+TZ:iso)); }catch(e){ return iso.slice(0,10); } };
function buildFormal(d){
  const v=latestVersion(d), sealed=!d.draft&&v, P=sealed?v.payload:null, E=esc;
  const parties=sealed?P.parties:d.parties, place=(sealed?P.place:d.place)||'Bengaluru', at=sealed?v.frozenAt:nowISO(), cat=catOf(d), svc=cat==='digital', food=foodUse(d);
  const cl=currentClauses(d), C=id=>cl.find(c=>c.id===id)||{text:'',open:''}, nd=en('notDiscussed');
  const seller=parties.find(p=>p.role==='Seller')||parties[0], buyer=parties.find(p=>p.role==='Buyer')||parties[1];
  const sL=svc?'Service Provider':'Seller', bL=svc?'Client':'Buyer';
  const txt=id=>{ const c=C(id); return c.text&&c.text!==nd?E(c.text)+' ':'<i>[Not agreed between the Parties; see Schedule 3.]</i> '; };
  const has=id=>{ const c=C(id); return c.text&&c.text!==nd; };
  const pb=(p,label,side)=>`<p><b>${E(p.org||p.name)}</b>, acting through ${E(p.name)}, ${p.address?`having its place of business at ${E(p.address)}`:'<i>[address to be added]</i>'}${p.gstin?`, GSTIN ${E(p.gstin)}`:''}${p.udyam?`, Udyam Registration No. ${E(p.udyam)}`:''} (the “<b>${label}</b>”, which expression shall, unless repugnant to the context, include its successors and permitted assigns), of the ${side} PART;</p>`;
  const ts=allMsgs(d).map(m=>m.ts).filter(Boolean).sort();
  const title=svc?'AGREEMENT FOR DESIGN AND DEVELOPMENT SERVICES':'AGREEMENT FOR SUPPLY OF GOODS';
  let n=0; const sec=(h,b)=>`<h3>${++n}. ${h}</h3><p>${b}</p>`;
  const img=(p,k)=>{ const src=(d.parties.find(x=>x.name===p.name)||{})[k]; return src?`<img class="f-${k}" src="${E(src)}" alt="${E(p.org||p.name)}">`:''; };
  let h=(img(seller,'logo')||img(buyer,'logo')?`<div class="f-logos">${img(seller,'logo')||'<span></span>'}${img(buyer,'logo')||'<span></span>'}</div>`:'')+`<div class="f-title"><h2>${title}</h2><p>${sealed?`Version ${v.rev} · SHA-256 ${E(shortHash(v.hash))}`:`Draft version ${d.draft?d.draft.rev:1} · not yet locked`}</p></div>`;
  h+=`<p>This Agreement is made at <b>${E(place)}</b> on <b>${E(longDate(at))}</b> (the “Effective Date”).</p><p class="f-c">BETWEEN</p>`+pb(seller,sL,'FIRST')+`<p class="f-c">AND</p>`+pb(buyer,bL,'SECOND')+`<p>The ${sL} and the ${bL} are each a “Party” and together the “Parties”.</p>`;
  h+=`<h3>Recitals</h3><p>A. The Parties negotiated the terms of this transaction through electronic messages${ts.length?` exchanged between ${E(longDate(ts[0]))} and ${E(longDate(ts[ts.length-1]))}`:''}, the records of which are listed in Schedule 2.</p><p>B. The Parties wish to record the agreed terms in writing. NOW, THEREFORE, the Parties agree as follows:</p>`;
  h+=sec('Definitions and interpretation',`“${svc?'Services':'Goods'}” means what is described in Clause 2 and Schedule 1. Headings are for convenience only. The singular includes the plural. A reference to a statute includes any amendment or re-enactment of it.`);
  h+=sec('Scope',txt('c2')+'Further particulars are set out in Schedule 1.');
  let std='';
  if(food) std+='Packaging intended to contact food shall be of food-grade material complying with the Food Safety and Standards (Packaging) Regulations, 2018, and printing inks shall conform to IS 15495, with the printed surface not in direct contact with food. ';
  if(cat==='food') std+='The Seller shall hold a valid licence or registration under Section 31 of the Food Safety and Standards Act, 2006, and pre-packaged goods shall carry the declarations required by the Legal Metrology (Packaged Commodities) Rules, 2011. ';
  if(cat==='medicine') std+='All products shall be supplied under a valid licence under the Drugs and Cosmetics Act, 1940, and at prices not exceeding those permitted under the Drugs (Prices Control) Order, 2013. ';
  if(cat==='electronics') std+='Goods notified under the Compulsory Registration Scheme of the Bureau of Indian Standards shall bear a valid registration, and the Parties shall comply with the E-Waste (Management) Rules, 2022. ';
  if(cat==='construction') std+='Materials covered by a Quality Control Order shall bear the Standard Mark of the Bureau of Indian Standards. ';
  if(cat==='printing') std+=`The ${bL} confirms that it owns, or is licensed to use, every name, logo and artwork it supplies for printing. `;
  h+=sec('Specifications and standards',txt('c3')+std);
  h+=sec('Price and taxes',txt('c4')+`The ${sL} shall issue a tax invoice in accordance with Section 31 of the Central Goods and Services Tax Act, 2017 and Rule 46 of the Central Goods and Services Tax Rules, 2017. Unless expressly stated to be inclusive, prices are exclusive of GST, which is payable at the rate in force on the date of supply.`);
  h+=sec('Payment',txt('c6')+`All payments shall be made through banking channels (UPI, NEFT, RTGS, IMPS or account-payee cheque) against a tax invoice. No Party shall receive an amount of two lakh rupees or more in cash in contravention of Section 186 of the Income-tax Act, 2025 or the corresponding provision then in force.${seller.udyam?` As the ${sL} is registered as a micro or small enterprise, payment shall be made within the period agreed in writing, not exceeding forty-five days from the day of acceptance, failing which interest is payable under Sections 15 and 16 of the Micro, Small and Medium Enterprises Development Act, 2006.`:''}`);
  h+=sec(svc?'Delivery and go-live':'Delivery',txt('c5'));
  h+=sec('Delay',txt('c7')+(has('c7')?'The Parties agree that this amount is a genuine pre-estimate of loss, and its recovery shall be subject to Section 74 of the Indian Contract Act, 1872.':''));
  h+=sec('Inspection and quality',txt('c8')+`The ${bL} shall inspect the ${svc?'deliverables':'Goods'} within a reasonable time of delivery and report any defect in writing.`);
  h+=sec('Intellectual property',txt('c11')+(svc?`Any assignment of copyright shall be in writing signed by the assignor and shall identify the work, the rights assigned, their duration and territory, as required by Sections 18 and 19 of the Copyright Act, 1957; where the duration or territory is not stated, the assignment is deemed to be for five years and for India. Any assignment of a trade mark shall be in writing and may be recorded under Section 45 of the Trade Marks Act, 1999. Until the full price is paid, all rights remain with the ${sL}.`:`Each Party retains its own trade marks, logos and artwork. The ${sL} shall use the ${bL}’s marks only to perform this Agreement.`));
  if(!svc||has('c12')) h+=sec('Resale',txt('c12')+'Any resale of pre-packaged goods shall comply with the Legal Metrology (Packaged Commodities) Rules, 2011 and shall not exceed the retail sale price declared on the package.');
  h+=sec('Lawful conduct','Each Party shall comply with all applicable laws. No part of the consideration shall be paid, received or recorded outside the tax invoice. Any understanding to the contrary is void under Section 23 of the Indian Contract Act, 1872 and does not form part of this Agreement.');
  h+=sec('Cancellation and termination',txt('c9')+'Either Party may terminate this Agreement by written notice if the other Party commits a material breach and fails to remedy it within fifteen days of written notice of the breach.');
  h+=sec('Force majeure','Neither Party is liable for delay or failure caused by events beyond its reasonable control, including natural calamity, epidemic, war, riot or government action, if it promptly notifies the other Party in writing. This Clause does not excuse payment for goods delivered or services rendered.');
  h+=sec('Dispute resolution',txt('c10')+`The Parties shall first try to resolve any dispute by good-faith discussion for fifteen days. Failing that, a commercial dispute shall go to pre-institution mediation under Section 12A of the Commercial Courts Act, 2015, and any other dispute may be referred to mediation under the Mediation Act, 2023. Subject to the above, the courts at ${E(place)} shall have exclusive jurisdiction. Nothing in this Clause limits the right of a micro or small enterprise to refer a dispute to the Micro and Small Enterprises Facilitation Council under Section 18 of the Micro, Small and Medium Enterprises Development Act, 2006.`);
  h+=sec('Governing law','This Agreement is governed by the laws of India.');
  h+=sec('Notices','Notices shall be in writing and delivered by hand, registered post, e-mail or WhatsApp message to the addresses or numbers used by the Parties in their dealings, and take effect on receipt.');
  h+=sec('Electronic execution and evidence','This Agreement may be executed electronically. Under Section 10A of the Information Technology Act, 2000, a contract formed through electronic records is not unenforceable merely because of that form, and electronic signatures, including Aadhaar-based eSign under Section 3A of that Act, are valid. The electronic records listed in Schedule 2, with their SHA-256 hash values, may be produced in evidence under Sections 61 to 63 of the Bharatiya Sakshya Adhiniyam, 2023, with the certificate required by Section 63(4).');
  h+=sec('Stamp duty',`Stamp duty on this Agreement shall be paid under the stamp law in force in the State of ${E(d.stamp.state)} ${d.stamp.cert?`e-Stamp certificate No. ${E(d.stamp.cert)}.`:d.stamp.status==='not_needed'?'The Parties have recorded that no stamp duty is payable.':'<i>[e-Stamp certificate number to be added.]</i>'}`);
  h+=sec('General','This Agreement, with its Schedules, is the entire agreement between the Parties on its subject and supersedes earlier discussions, except the matters listed in Schedule 3, which remain open. Any amendment shall be in writing, signed by both Parties and recorded as a new version. If any provision is held invalid, the rest remain in force. Neither Party may assign this Agreement without the other’s written consent.');
  const tv=k=>{ const x=d.terms[k]; return x&&x.status!=='missing'&&x.value?E(x.value):'—'; }, q=quoteDefaults(d);
  h+=`<h3>Schedule 1: ${svc?'Services':'Goods'}</h3><table><tr><th>Description</th><td>${tv('scope')}</td></tr><tr><th>Specifications</th><td>${tv('specs')}</td></tr><tr><th>${q.hsn&&svc?'SAC':'HSN'} (suggested)</th><td>${E(q.hsn||'—')}</td></tr><tr><th>Price</th><td>${tv('price')}</td></tr><tr><th>Tax</th><td>${tv('tax')}</td></tr><tr><th>Delivery</th><td>${tv('delivery')}</td></tr><tr><th>Payment</th><td>${tv('advance')}; ${tv('balance')}; ${tv('payment_mode')}</td></tr></table>`;
  h+=`<h3>Schedule 2: Electronic records</h3><table>${d.records.map(r=>`<tr><th>${E(r.id)} · ${E(r.type)}<br><span class="f-s">${E(r.uploadedAt)}</span></th><td class="f-h">${E(r.sha256)}</td></tr>`).join('')}${sealed?`<tr><th>This version (${v.rev})</th><td class="f-h">${E(v.hash)}</td></tr>${v.prevHash?`<tr><th>Previous version</th><td class="f-h">${E(v.prevHash)}</td></tr>`:''}`:''}</table>`;
  const open=cl.filter(c=>c.open);
  h+=`<h3>Schedule 3: Matters not yet agreed</h3>${open.length?`<ol>${open.map(c=>`<li><b>${E(en('h_'+c.id))}:</b> ${E(c.open)}</li>`).join('')}</ol>`:'<p>None.</p>'}`;
  const sigOf=p=>sealed?v.signatures.find(s=>s.name===p.name):null;
  const sb=(p,label)=>{ const s=sigOf(p); return `<div class="f-sig"><p><b>For the ${label}</b><br>${E(p.org||p.name)}</p>${s?`${s.img?`<img class="f-sigimg" src="${E(s.img)}" alt="">`:''}<p>Signed electronically (${E(s.method==='aadhaar'?'Aadhaar eSign':'drawn signature')}) by ${E(s.name)} on ${E(s.at)}.${s.cert?`<br>eSign transaction ${E(s.cert.txn)}, Aadhaar ${E(s.cert.aadhaar)}.`:''}<br><span class="f-h">Signature hash ${E(shortHash(s.sigHash))}</span></p>`:'<p class="f-line">Signature</p>'}<p>Name: ${E(p.name)}</p>${img(p,'seal')}</div>`; };
  h+=`<p>IN WITNESS WHEREOF the Parties have executed this Agreement on the date first written above.</p><div class="f-sigs">${sb(seller,sL)}${sb(buyer,bL)}</div><div class="f-sigs"><div class="f-sig"><p><b>Witness 1</b></p><p class="f-line">Signature</p><p>Name and address:</p></div><div class="f-sig"><p><b>Witness 2</b></p><p class="f-line">Signature</p><p>Name and address:</p></div></div>`;
  if(sealed&&v.lawyer) h+=`<p class="f-s">Reviewed and certified by ${E(v.lawyer.name)}, Advocate (enrolment ${E(v.lawyer.enrol)}), on ${E(v.lawyer.at)}, on SHA-256 ${E(v.lawyer.hash)}.</p>`;
  return h+`<p class="f-s">Prepared with DraftIt from the Parties’ own records. This is not legal advice; have it reviewed by an advocate before filing.</p>`;
}
const FORMAL_CSS='body{font:15px/1.6 "Times New Roman",Georgia,serif;color:#111;max-width:780px;margin:32px auto;padding:0 18px}h2{text-align:center;font-size:19px;letter-spacing:.04em;margin:0}h3{font-size:15px;margin:18px 0 4px}.f-title{text-align:center;margin-bottom:18px}.f-title p{font:12px/1.4 Arial,sans-serif;color:#555;margin:4px 0}.f-c{text-align:center;font-weight:bold}table{border-collapse:collapse;width:100%;margin:6px 0}th,td{border:1px solid #999;padding:5px 7px;text-align:left;vertical-align:top;font-size:13px}th{width:30%;background:#f4f4f4}.f-h{font:11px ui-monospace,Menlo,monospace;word-break:break-all}.f-s{font-size:12px;color:#555}.f-sigs{display:flex;gap:24px;margin-top:14px}.f-sig{flex:1}.f-line{border-top:1px solid #333;margin-top:40px;padding-top:2px;font-size:12px}.f-logos{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.f-logo{max-height:64px;max-width:150px}.f-seal{max-height:84px;margin-top:6px;opacity:.9}.f-sigimg{max-height:56px;display:block}@media print{body{margin:0}}';
function formalFile(d){ return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Agreement · ${esc(d.title)}</title><style>${FORMAL_CSS}</style></head><body>${buildFormal(d)}</body></html>`; }

/* ---------- quotation ---------- */
function quoteDefaults(d){
  const sc=String((d.terms.scope||{}).value||''), pr=String((d.terms.price||{}).value||''), cat=catOf(d);
  const qm=sc.match(/(\d[\d,]*)/), rm=pr.match(/₹\s?([\d,]+(?:\.\d+)?)/), per=/\bper\b|each|\/\s?(box|pc|piece|unit)/i.test(pr);
  let qty=1, rate=rm?+rm[1].replace(/,/g,''):(d.value||0); if(per&&qm) qty=+qm[1].replace(/,/g,'');
  return {no:'Q-'+d.id+'-'+String(S.counter%1000+1).padStart(3,'0'),date:todayYMD(),valid:15,desc:(d.terms.scope||{}).value||d.title,hsn:{printing:'4819',digital:'998314'}[cat]||'',qty,rate,gst:cat==='printing'?5:18,inter:false};
}
function quoteCalc(q){ const taxable=Math.round((+q.qty||0)*(+q.rate||0)*100)/100, tax=Math.round(taxable*(+q.gst||0))/100; return {taxable,tax,total:Math.round((taxable+tax)*100)/100}; }
function inWords(n){ n=Math.round(n); if(!n) return 'Zero'; const a=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'], b=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const two=x=>x<20?a[x]:b[Math.floor(x/10)]+(x%10?' '+a[x%10]:''), three=x=>(x>=100?a[Math.floor(x/100)]+' Hundred'+(x%100?' ':''):'')+(x%100?two(x%100):'');
  const out=[], cr=Math.floor(n/1e7); n%=1e7; const lk=Math.floor(n/1e5); n%=1e5; const th=Math.floor(n/1e3); n%=1e3;
  if(cr) out.push(inWords(cr)+' Crore'); if(lk) out.push(two(lk)+' Lakh'); if(th) out.push(two(th)+' Thousand'); if(n) out.push(three(n)); return out.join(' '); }
function quoteSheet(){
  const d=deal(), q=ui.q&&ui.q.deal===d.id?ui.q:(ui.q=Object.assign({deal:d.id},quoteDefaults(d))), c=quoteCalc(q);
  const f=(k,l,type,extra)=>`<label class="field">${esc(t(l))}<input class="inp" ${type?`type="${type}"`:''} data-q="${k}" value="${esc(q[k])}" ${extra||''}></label>`;
  openSheet(sheetHead(t('quotation'),esc(tx(d.title)))+`<div class="grid2">${f('no','quoteNo')}${f('valid','validDays','number','min="1"')}</div>${f('desc','itemDesc')}<div class="grid2">${f('hsn','hsn')}<label class="field">${esc(t('gstRate'))}<select class="sel" data-q="gst">${[0,5,18,40].map(r=>`<option value="${r}" ${+q.gst===r?'selected':''}>${r}%</option>`).join('')}</select></label></div><p class="tiny">${esc(t('hsnHint'))}${catOf(d)==='printing'?' '+esc(t('gstNoteBox')):''}</p><div class="grid2">${f('qty','qty','number','min="0"')}${f('rate','unitRate','number','min="0" step="0.01"')}</div><label class="check"><input type="checkbox" data-q="inter" ${q.inter?'checked':''}><span>${esc(t('interState'))}</span></label><div class="q-total"><span>${esc(t('totalLbl'))}</span><b id="qTotal">${rupee(c.total)}</b></div><button class="btn full" data-act="downloadQuote">${ic('down',18)} ${esc(t('downloadQuote'))}</button><p class="tiny">${esc(t('quoteNote'))}</p>`);
}
function quoteFile(d,q){
  const c=quoteCalc(q), E=esc, me=d.parties[0].role==='Seller'?d.parties[0]:d.parties[1], cp=me===d.parties[0]?d.parties[1]:d.parties[0], r2=x=>Number(x).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
  const until=new Date(Date.parse(q.date+'T12:00:00Z')+(+q.valid||15)*864e5).toISOString().slice(0,10), tv=k=>{ const x=d.terms[k]; return x&&x.status!=='missing'&&x.value?x.value:''; };
  const half=c.tax/2, taxRows=q.inter?`<tr><td colspan="5">IGST @ ${q.gst}%</td><td class="n">${r2(c.tax)}</td></tr>`:`<tr><td colspan="5">CGST @ ${q.gst/2}%</td><td class="n">${r2(half)}</td></tr><tr><td colspan="5">SGST @ ${q.gst/2}%</td><td class="n">${r2(half)}</td></tr>`;
  const pay=[tv('advance'),tv('balance')].filter(Boolean).join('; ')||'As agreed in writing';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Quotation ${E(q.no)}</title><style>body{font:14px/1.5 Arial,sans-serif;color:#111;max-width:780px;margin:28px auto;padding:0 16px}h1{font-size:20px;letter-spacing:.08em;color:#0B2E63;margin:0 0 12px}.top{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap}table{border-collapse:collapse;width:100%;margin:14px 0}th,td{border:1px solid #bbb;padding:6px 8px;text-align:left;vertical-align:top}th{background:#E8EEF8}.n{text-align:right;white-space:nowrap}.tot td{font-weight:bold}.small{font-size:12px;color:#555}ol{padding-left:18px}</style></head><body>${me.logo?`<img src="${E(me.logo)}" alt="" style="max-height:60px;max-width:160px;float:right">`:''}<h1>QUOTATION</h1><div class="top"><div><b>${E(me.org||me.name)}</b><br>${E(me.address||'')}${me.gstin?'<br>GSTIN: '+E(me.gstin):''}${me.udyam?'<br>Udyam: '+E(me.udyam):''}</div><div><b>Quotation No.:</b> ${E(q.no)}<br><b>Date:</b> ${E(longDate(q.date))}<br><b>Valid until:</b> ${E(longDate(until))}</div></div><p><b>To:</b> ${E(cp.org||cp.name)}${cp.name&&cp.org?' (Attn: '+E(cp.name)+')':''}${cp.address?'<br>'+E(cp.address):''}${cp.gstin?'<br>GSTIN: '+E(cp.gstin):''}</p><table><tr><th>#</th><th>Description</th><th>HSN/SAC</th><th class="n">Qty</th><th class="n">Rate (₹)</th><th class="n">Taxable value (₹)</th></tr><tr><td>1</td><td>${E(q.desc)}</td><td>${E(q.hsn||'—')}</td><td class="n">${E(q.qty)}</td><td class="n">${r2(q.rate)}</td><td class="n">${r2(c.taxable)}</td></tr>${taxRows}<tr class="tot"><td colspan="5">Total</td><td class="n">₹ ${r2(c.total)}</td></tr></table><p><b>Amount in words:</b> Rupees ${E(inWords(c.total))} Only</p><p><b>Terms</b></p><ol><li>This quotation is valid for ${E(q.valid)} days, until ${E(longDate(until))}.</li><li>Payment: ${E(pay)}. Payment by UPI, NEFT, RTGS or account-payee cheque.</li><li>Delivery: ${E(tv('delivery')||'As agreed in writing')}.</li><li>GST is charged as shown at the rate in force on the date of supply.</li><li>This quotation is not a tax invoice. A tax invoice under Section 31 of the CGST Act, 2017 will be issued at the time of supply.</li></ol><p style="margin-top:40px">For <b>${E(me.org||me.name)}</b><br>${me.seal?`<img src="${E(me.seal)}" alt="" style="max-height:80px;margin:6px 0">`:'<br><br>'}<br>Authorised signatory</p><p class="small">Prepared with DraftIt. Confirm HSN/SAC and GST rate with your chartered accountant.</p></body></html>`;
}
async function saveFile(name,data){ if(!DOWNLOADS&&STANDALONE){ downloadBlob(name,data); toast(t('o_savedFile')); return; } if(DOWNLOADS){ try{ await DOWNLOADS.save({filename:name,data}); toast(t('o_savedFile')); return; }catch(e){ if(e&&e.code==='declined') return; } } openSheet(sheetHead(t('download'),esc(name))+`<p class="small muted">${esc(t('noDownload'))}</p><textarea class="inp mono" id="expText" readonly style="min-height:240px">${esc(data)}</textarea><button class="btn" data-act="copyExport">${ic('copy',18)} ${esc(t('copy'))}</button>`); }

/* ---------- notary ---------- */
function notarySheet(){ openSheet(sheetHead(t('notaryT'))+`<p class="small muted">${esc(t('notaryB'))}</p><label class="field">${esc(t('pickDate'))}<input class="inp" type="date" id="notDate" min="${todayYMD()}" value="${todayYMD()}"></label><button class="btn full" data-act="confirmNotary">${esc(t('bookNotary'))}</button>`); }

/* ---------- live chat room ---------- */
const roomConn={};
/* ---------- online accounts and storage (Supabase) ---------- */
const CFG=window.DRAFTIT_CONFIG||{};
let SB=null; const cloud={uid:null,email:'',state:'saved',updatedAt:null,timer:null,dirty:false,sent:new Map(),busy:false,again:false};
function initCloud(){ if(!STANDALONE||!CFG.supabaseUrl||!CFG.supabaseAnonKey||!window.supabase||typeof window.supabase.createClient!=='function') return; try{ SB=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}); }catch(e){ SB=null; } }
/* the account's own settings, translations and the order of its deals */
function profileData(){ const uid=cloud.uid, deals=S.deals.filter(d=>d.owner===uid&&!d.guest), strs=contentStrings(deals), tr={};
  ['hi','mr','te','ta','kn'].forEach(lg=>{ const m=S.tr[lg]||{}, o={}; strs.forEach(x=>{ if(m[x]) o[x]=m[x]; }); tr[lg]=o; });
  return {v:2,account:S.accounts[uid],order:deals.map(d=>d.id),notary:(S.notary||[]).filter(n=>n.by===uid),settings:{lang:S.settings.lang,rate:S.settings.rate,voiceURI:S.settings.voiceURI,ai:S.settings.ai,textSize:S.settings.textSize||'m',layout:S.settings.layout||'auto',snip:!!S.settings.snip},counter:S.counter,tr}; }
/* the whole state as database rows: profile, deals, evidence, locked versions and signatures */
function cloudRows(){ const uid=cloud.uid, rows=new Map();
  rows.set('p',{t:'profiles',r:{user_id:uid,data:profileData()}});
  S.deals.filter(d=>d.owner===uid&&!d.guest).forEach(d=>{ const {records,versions,...rest}=d;
    rows.set('d:'+d.id,{t:'deals',r:{owner:uid,id:d.id,title:typeof d.title==='string'?d.title:'',data:rest}});
    (records||[]).forEach(r=>{ const {rawText,messages,media,...meta}=r; rows.set('e:'+d.id+':'+r.id,{t:'evidence',r:{owner:uid,id:r.id,deal_id:d.id,type:r.type||'paste',name:r.name||'',sha256:r.sha256,raw_text:rawText||'',messages:messages||[],media:media||null,data:meta,uploaded_at:r.uploadedAt||null}}); });
    (versions||[]).forEach(v=>{ const {payload,signatures,lawyer,...vm}=v; rows.set('v:'+d.id+':'+v.rev,{t:'versions',r:{owner:uid,deal_id:d.id,rev:v.rev,hash:v.hash,prev_hash:v.prevHash||null,frozen_at:v.frozenAt||null,payload,lawyer:lawyer||null,data:vm}});
      (signatures||[]).forEach(s=>rows.set('s:'+d.id+':'+v.rev+':'+s.party,{t:'signatures',r:{owner:uid,deal_id:d.id,rev:v.rev,party:s.party,data:s,signed_at:s.at||null}})); }); });
  return rows; }
const IMMUTABLE={evidence:'owner,deal_id,id',signatures:'owner,deal_id,rev,party'};
function setCloudState(st){ cloud.state=st; const el=document.getElementById('cloudState'); if(el) el.outerHTML=cloudBadge(); }
const cloudBadge=()=>!cloud.uid?'':`<span id="cloudState" class="cloud-badge ${cloud.state}">${ic(cloud.state==='error'?'excl':cloud.state==='saving'?'spark':'check',13)} ${esc(t(cloud.state==='saving'?'savingOnline':cloud.state==='error'?'saveFailed':'savedOnline'))}</span>`;
function scheduleCloudSave(){ cloud.dirty=true; clearTimeout(cloud.timer); cloud.timer=setTimeout(cloudSaveNow,1200); if(cloud.state!=='saving') setCloudState('saving'); }
/* send only the rows that changed since the last save; evidence and signatures are add-only */
async function cloudSaveNow(){ if(!SB||!cloud.uid) return false; if(cloud.busy){ cloud.again=true; return false; }
  cloud.busy=true; clearTimeout(cloud.timer); cloud.dirty=false; const at=new Date().toISOString(), uid=cloud.uid;
  const rows=cloudRows(), up={profiles:[],deals:[],evidence:[],versions:[],signatures:[]};
  for(const [k,{t,r}] of rows){ const s=JSON.stringify(r); if(cloud.sent.get(k)===s) continue; if(IMMUTABLE[t]&&cloud.sent.has(k)){ cloud.sent.set(k,s); continue; } if(t==='profiles'||t==='deals') r.updated_at=at; up[t].push({k,r,s}); }
  const gone=[...cloud.sent.keys()].filter(k=>!rows.has(k));
  let ok=true;
  try{
    const send=async t=>{ const list=up[t]; if(!list.length) return; const q=SB.from(t), data=list.map(x=>x.r);
      const {error}=IMMUTABLE[t]?await q.upsert(data,{onConflict:IMMUTABLE[t],ignoreDuplicates:true}):await q.upsert(data); if(error) throw error; list.forEach(x=>cloud.sent.set(x.k,x.s)); };
    for(const t of ['profiles','deals','evidence','versions','signatures']) await send(t);
    for(const k of gone){ const [kind,dl,id]=k.split(':'); let error=null;
      if(kind==='e') ({error}=await SB.from('evidence').delete().eq('owner',uid).eq('deal_id',dl).eq('id',id));
      else if(kind==='d') ({error}=await SB.from('deals').delete().eq('owner',uid).eq('id',dl));
      if(error) throw error; cloud.sent.delete(k); }
  }catch(e){ ok=false; console.warn('cloud save',e); }
  cloud.busy=false;
  if(!ok){ cloud.dirty=true; setCloudState('error'); cloud.timer=setTimeout(cloudSaveNow,6000); return false; }
  cloud.updatedAt=at; if(cloud.again){ cloud.again=false; return cloudSaveNow(); } setCloudState('saved'); return true; }
/* older accounts kept everything in one workspace record */
function applyWorkspace(w){ const uid=cloud.uid; if(w.account) S.accounts[uid]=Object.assign({},w.account,{id:uid}); S.deals=Array.isArray(w.deals)?w.deals:[]; S.notary=w.notary||[]; Object.assign(S.settings,w.settings||{}); S.counter=Math.max(S.counter,w.counter||0); if(w.tr) for(const lg in w.tr){ S.tr[lg]=S.tr[lg]||{}; Object.assign(S.tr[lg],w.tr[lg]); } }
function applyRows(prof,deals,ev,vs,sg){ const uid=cloud.uid, P=(prof&&prof.data)||{};
  if(P.account) S.accounts[uid]=Object.assign({},P.account,{id:uid});
  Object.assign(S.settings,P.settings||{}); S.notary=P.notary||[]; S.counter=Math.max(S.counter,P.counter||0);
  if(P.tr) for(const lg in P.tr){ S.tr[lg]=S.tr[lg]||{}; Object.assign(S.tr[lg],P.tr[lg]); }
  const byTime=(a,b)=>String(a.created_at||'').localeCompare(String(b.created_at||''));
  const list=deals.map(row=>{ const d=Object.assign({},row.data,{id:row.id,owner:uid});
    d.records=ev.filter(e=>e.deal_id===row.id).sort(byTime).map(e=>Object.assign({},e.data,{id:e.id,type:e.type,name:e.name,sha256:e.sha256,rawText:e.raw_text||'',messages:e.messages||[],media:e.media||null}));
    d.versions=vs.filter(v=>v.deal_id===row.id).sort((a,b)=>a.rev-b.rev).map(v=>Object.assign({},v.data,{rev:v.rev,hash:v.hash,payload:v.payload,lawyer:v.lawyer||null,signatures:sg.filter(s=>s.deal_id===row.id&&s.rev===v.rev).sort((a,b)=>String(a.signed_at||'').localeCompare(String(b.signed_at||''))).map(s=>s.data)}));
    return d; });
  const order=P.order||[]; list.sort((a,b)=>{ const i=order.indexOf(a.id), j=order.indexOf(b.id); return (i<0?1e9:i)-(j<0?1e9:j); });
  S.deals=list; cloud.updatedAt=prof&&prof.updated_at||null; }
async function fetchRows(uid){
  const q=(t,col)=>SB.from(t).select('*').eq(col||'owner',uid);
  const res=await Promise.all([q('profiles','user_id'),q('deals'),q('evidence'),q('versions'),q('signatures')]);
  for(const r of res) if(r.error) throw r.error;
  return res.map(r=>r.data||[]);
}
function markSent(){ cloud.sent=new Map(); for(const [k,{r}] of cloudRows()) cloud.sent.set(k,JSON.stringify(r)); }
async function loadCloud(user){
  cloud.uid=user.id; cloud.email=user.email||''; cloud.sent=new Map();
  const [prof,deals,ev,vs,sg]=await fetchRows(user.id);
  if(prof.length||deals.length){ applyRows(prof[0],deals,ev,vs,sg); markSent(); }
  else {
    let legacy=null; try{ const w=await SB.from('workspaces').select('data').eq('user_id',user.id).maybeSingle(); legacy=w.data&&w.data.data; }catch(e){}
    if(legacy) applyWorkspace(legacy);
    else { const A=ui.auth||{}, md=user.user_metadata||{}, role=(A.mode==='signup'&&A.role==='lawyer')||(A.mode!=='signup'&&md.role==='lawyer')?'lawyer':'user';
      const name=String((A.mode==='signup'&&A.name)||md.name||(user.email||'').split('@')[0]).trim();
      S.accounts[user.id]={id:user.id,name,email:user.email||'',mobile:String(A.mobile||'').replace(/\D/g,''),role,business:role==='lawyer'?'':String(A.business||md.business||'').trim(),train:!!A.train,tutDone:false,created:nowISO()};
      if(role==='lawyer') Object.assign(S.accounts[user.id],{lawyerId:'lw_'+user.id.slice(0,8),enrol:String(A.enrol||'').trim(),bar:A.bar||'Karnataka',fee:+A.fee||0});
      S.deals=[]; S.notary=[]; if(role!=='lawyer'){ cloneTemplate(1,user.id); cloneTemplate(0,user.id); } }
    await cloudSaveNow(); }
  useAccount(user.id); setupCloudAI();
}
async function cloudSignOut(){ if(cloud.dirty) await cloudSaveNow(); try{ await SB.auth.signOut(); }catch(e){} cloud.uid=null; cloud.email=''; cloud.sent=new Map(); setupCloudAI(); S=null; await seedState(); }
/* coming back to the tab: pick up changes made on another device */
document.addEventListener('visibilitychange',async()=>{ if(!SB||!cloud.uid) return; if(document.hidden){ if(cloud.dirty) cloudSaveNow(); return; }
  if(cloud.dirty||cloud.busy||!$('#sheetWrap').hidden) return;
  try{ const {data}=await SB.from('profiles').select('updated_at').eq('user_id',cloud.uid).maybeSingle();
    if(data&&cloud.updatedAt&&Date.parse(data.updated_at)>Date.parse(cloud.updatedAt)+500){ const [prof,deals,ev,vs,sg]=await fetchRows(cloud.uid); applyRows(prof[0],deals,ev,vs,sg); markSent(); ui.keep=true; render(); } }catch(e){} });

/* ---------- original files in Supabase Storage ---------- */
const BUCKET='evidence';
const useStorage=d=>!!(SB&&cloud.uid&&(!d||(d.owner===cloud.uid&&!d.guest)));
const safeName=n=>String(n||'file').normalize('NFKD').replace(/[^\w.\-]+/g,'_').replace(/^_+/,'').slice(-80)||'file';
async function cloudUpload(dealId,recId,blob,name){ const path=`${cloud.uid}/${dealId}/${recId}/${safeName(name)}`;
  const {error}=await SB.storage.from(BUCKET).upload(path,blob,{contentType:blob.type||'application/octet-stream',upsert:false}); if(error) throw error; return path; }
const SIGNED=new Map();
async function cloudFileURL(path){ const c=SIGNED.get(path); if(c&&c.exp>Date.now()) return c.url;
  const {data,error}=await SB.storage.from(BUCKET).createSignedUrl(path,3600); if(error) throw error; SIGNED.set(path,{url:data.signedUrl,exp:Date.now()+3300e3}); return data.signedUrl; }
async function cloudFileBlob(path){ const {data,error}=await SB.storage.from(BUCKET).download(path); if(error) throw error; return data; }
function hydrateFiles(root){ if(!SB) return; (root||document).querySelectorAll('[data-sbpath]').forEach(async el=>{ try{ const u=await cloudFileURL(el.dataset.sbpath); if(el.tagName==='A') el.href=u; else el.src=u; el.removeAttribute('data-sbpath'); el.classList.remove('loading'); }catch(e){ el.classList.add('file-missing'); } }); }
async function cloudRemoveFiles(paths){ paths=paths.filter(Boolean); for(let i=0;i<paths.length;i+=100){ try{ await SB.storage.from(BUCKET).remove(paths.slice(i,i+100)); }catch(e){} } }

/* ---------- Claude through the DraftIt server (Supabase Edge Function) ----------
   When signed in online, AI requests go to the "claude" function, which holds the Anthropic key,
   so nobody has to paste a key in the browser. */
let EDGE_AI_OFF=false;
async function edgeSend(body){
  const {data,error}=await SB.functions.invoke('claude',{body});
  if(error){ const st=(error.context&&error.context.status)||0; if(st===404){ EDGE_AI_OFF=true; SAMPLE=apiKey()?makeApiSample(apiKey()):null; }
    const err=new Error('server ai '+st); err.code=st===401||st===403||st===404?'not_granted':st===429?'rate_limited':'upstream_error'; throw err; }
  return typeof data==='string'?JSON.parse(data):data;
}
function setupCloudAI(){ if(!STANDALONE) return; const k=apiKey();
  if(k) SAMPLE=makeApiSample(k); else if(SB&&cloud.uid&&!EDGE_AI_OFF&&CFG.aiServer!==false) SAMPLE=makeSample(edgeSend); else SAMPLE=null; }
const aiViaServer=()=>!!(STANDALONE&&SB&&cloud.uid&&!apiKey()&&!EDGE_AI_OFF&&SAMPLE);

/* live chat outside Claude: Supabase Realtime, shaped like the room capability */
function sbRoom(name){
  const key=Math.random().toString(36).slice(2,10), ch=SB.channel(name,{config:{broadcast:{self:false},presence:{key}}}), L={msg:[],peers:[],conn:[]}; let connected=false, mine={};
  const snap=()=>{ const st=ch.presenceState(), arr=[]; for(const k in st){ const p=Object.assign({},(st[k]||[])[0]||{}); delete p.presence_ref; arr.push({peer:k,sameTab:k===key,isMe:k===key,presence:p}); } return arr; };
  ch.on('broadcast',{event:'msg'},m=>L.msg.forEach(f=>f({data:m.payload,sameTab:false,isMe:false})));
  ch.on('presence',{event:'sync'},()=>{ const peers=snap(); L.peers.forEach(f=>f({peers})); });
  ch.subscribe(st=>{ connected=st==='SUBSCRIBED'; if(connected&&Object.keys(mine).length) ch.track(mine); L.conn.forEach(f=>f(connected)); });
  return {on:(tp,f)=>{ L.msg.push(f); return ()=>{}; },onPeers:f=>{ L.peers.push(f); return ()=>{}; },onConnection:f=>{ L.conn.push(f); return ()=>{}; },connected:()=>connected,
    emit:(tp,data)=>Promise.resolve(ch.send({type:'broadcast',event:tp,payload:data})),presence:o=>{ mine=Object.assign(mine,o); return connected?Promise.resolve(ch.track(mine)):Promise.resolve(); }};
}
const roomCap=()=>ROOMCAP||(SB?{join:async n=>sbRoom(n)}:null);
const roomCode=id=>String(id).replace(/[^A-Za-z0-9]/g,'').toUpperCase();
function mergeRoomMsgs(d,list,name,mine){
  let added=0; (Array.isArray(list)?list:[]).slice(-20).forEach(x=>{ if(!x||typeof x.t!=='string'||!x.id||d.room.some(y=>y.id===x.id)) return; d.room.push({id:String(x.id).slice(0,40),by:mine?'me':'cp',name:String(name||'').slice(0,60)||'—',text:x.t.slice(0,600),at:typeof x.at==='string'?x.at.slice(0,30):nowISO()}); added++; });
  if(added){ d.room.sort((a,b)=>String(a.at).localeCompare(String(b.at))); if(!d.guest) save(); }
  return added;
}
function roomPresence(d){
  const c=roomConn[d.id]; if(!c||!c.r) return;
  const me=d.parties[0], mine=d.room.filter(m=>m.by==='me'&&!m.demo).slice(-10).map(m=>({id:m.id,t:m.text.slice(0,300),at:m.at}));
  const pres={name:me.name,msgs:mine};
  if(!d.guest) pres.deal={title:d.title,from:me.name,org:me.org||'',to:d.parties[1].name};
  while(new TextEncoder().encode(JSON.stringify(pres)).length>3600&&pres.msgs.length) pres.msgs.shift();
  c.r.presence(pres).catch(()=>{});
}
async function joinRoom(d){
  const cap=roomCap(); if(!cap||roomConn[d.id]) return; roomConn[d.id]={r:null,n:1};
  try{ const r=await cap.join('deal-'+roomCode(d.id).toLowerCase()); roomConn[d.id].r=r;
    r.on('msg',msg=>{ if(msg.sameTab) return; const x=msg.data||{}, dd=deal(d.id); if(!dd) return; if(mergeRoomMsgs(dd,[{id:x.id,t:x.text,at:x.at}],x.name,msg.isMe)&&ui.view==='room'&&ui.roomDeal===d.id) render(); });
    r.onPeers(ch=>{ const dd=deal(d.id); if(!dd) return; roomConn[d.id].n=ch.peers.length; let changed=false;
      ch.peers.forEach(pe=>{ if(pe.sameTab) return; const pr=pe.presence||{}; if(mergeRoomMsgs(dd,pr.msgs,pr.name,pe.isMe)) changed=true;
        if(dd.guest&&pr.deal&&typeof pr.deal.title==='string'){ dd.title=pr.deal.title.slice(0,120); dd.parties[1]=Object.assign({},dd.parties[1],{name:String(pr.deal.from||'').slice(0,60),org:String(pr.deal.org||'').slice(0,80)}); changed=true; } });
      if(ui.view==='room'&&ui.roomDeal===d.id) render(); });
    r.onConnection(()=>{ if(ui.view==='room'&&ui.roomDeal===d.id) render(); });
    roomPresence(d);
  }catch(e){ roomConn[d.id].failed=true; if(ui.view==='room') render(); }
}
function inviteSheet(){
  const d=deal(ui.roomDeal), cp=d.parties[1], code=roomCode(d.id), base=STANDALONE?location.href.split('#')[0]:ARTIFACT_URL, link=base+'#room-'+code.toLowerCase(), msg=t('inviteText2',{name:first(cp.name),link,code});
  openSheet(sheetHead(t('roomInvite',{name:first(cp.name)}),esc(tx(d.title)))+`<div class="code-box"><span class="lbl">${esc(t('roomCodeLbl'))}</span><b class="mono">${esc(code)}</b></div><ol class="routes">
  ${STANDALONE?'':`<li><span class="rn">1</span><div class="stack-s"><b>${esc(t('inv1T'))}</b><p class="small muted">${esc(t('inv1B',{name:first(cp.name)}))}</p></div></li>`}
  <li><span class="rn">2</span><div class="stack-s"><b>${esc(t('inv2T'))}</b><div class="bubble">${esc(msg)}</div><div class="row wrap"><button class="btn sec sm" data-act="copyText" data-text="${esc(msg)}">${ic('copy',16)} ${esc(t('copyMessage'))}</button><a class="btn sec sm" href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${ic('chat',16)} WhatsApp</a></div></div></li>
  <li><span class="rn">3</span><div class="stack-s"><b>${esc(t('inv3T'))}</b><p class="small muted">${esc(t('inv3B',{code}))}</p></div></li></ol><div class="note small">${esc(t(STANDALONE&&!roomCap()?'invWebNote':'invNote'))}</div>`);
}
function coverage(d){ const o={}; TERM_DEFS.forEach(x=>{ o[x.key]=(d.terms[x.key]||{}).status==='agreed'||d.room.some(m=>TERM_RE[x.key].test(m.text)); }); return o; }
function renderRoom(){
  const d=deal(ui.roomDeal); if(!d) return '';
  const c=roomConn[d.id], live=!!(c&&c.r&&c.r.connected()), cov=coverage(d), done=TERM_DEFS.filter(x=>cov[x.key]).length, unc=TERM_DEFS.filter(x=>!cov[x.key]).slice(0,5), as=ui.roomAs||'me';
  const others=live?Math.max(0,c.n-1):0;
  let h=`<div class="room-bar row between wrap"><span class="small">${live?`<span class="live-dot"></span>${esc(t('roomLive'))} · ${esc(others?t('roomOthers',{n:others}):t('roomWaiting'))}`:esc(t(roomCap()?'roomConnecting':'roomLocal'))}</span>${d.guest?'':`<button class="btn sec sm" data-act="roomInvite">${ic('link',16)} ${esc(t('roomInvite',{name:first(d.parties[1].name)}))}</button>`}</div><p class="tiny">${esc(t('roomCodeLbl'))}: <b class="mono">${esc(roomCode(d.id))}</b></p>`;
  h+=`<div class="room-cov"><span class="lbl">${esc(t('covered'))} ${done}/${TERM_DEFS.length}</span><span class="bar"><i style="width:${Math.round(done/TERM_DEFS.length*100)}%"></i></span></div>`;
  h+=`<div class="room-msgs" id="roomMsgs">${d.room.length?d.room.map(m=>`<div class="rm ${m.by==='me'?'mine':''}"><div class="rm-b"><span class="rm-n">${esc(m.name)} · ${esc(fmtDT(m.at))}</span><div class="txt">${esc(m.text)}</div></div>${FRAUD_RE.test(m.text)?`<div class="rm-warn">${ic('excl',14)} ${esc(t('roomFraud'))}</div>`:''}</div>`).join(''):`<p class="small muted" style="text-align:center;padding:24px 8px">${esc(t('roomEmpty'))}</p>`}</div>`;
  h+=`<div class="composer">`;
  if(unc.length) h+=`<div class="chips-row"><span class="lbl">${esc(t('suggest'))}</span><div class="chips">${unc.map(x=>`<button class="sgchip" data-act="chip" data-k="${x.key}">${esc(t('sg_'+x.key))}</button>`).join('')}</div></div>`;
  h+=`<div class="row" style="gap:8px;align-items:flex-end"><textarea class="inp" id="roomInput" rows="1" placeholder="${esc(t('typeMsg'))}" data-input="roomDraft">${esc(ui.roomDraft||'')}</textarea><button class="btn send" data-act="roomSend" aria-label="${esc(t('send'))}">${ic('send',18)}</button></div><div class="rm-warn" id="roomWarn" ${FRAUD_RE.test(ui.roomDraft||'')?'':'hidden'}>${ic('excl',14)} ${esc(t('roomFraud'))}</div>`;
  h+=`<div class="row wrap" style="gap:8px">${SAMPLE&&S.settings.ai?`<button class="btn sec sm" data-act="roomSmart" ${ui.roomBusy?'disabled':''}>${ui.roomBusy?'<span class="spin"></span>':ic('spark',16)} ${esc(t('smartSuggest'))}</button>`:''}${d.guest||!d.room.length?'':`<button class="btn sec sm" data-act="roomSave">${ic('lock',16)} ${esc(t('saveChat'))}</button>`}</div></div>`;
  return h;
}
function roomSend(){
  const d=deal(ui.roomDeal), inp=$('#roomInput'), text=((inp&&inp.value)||'').trim(); if(!d||!text) return;
  const by='me', p=d.parties.find(x=>x.id==='me')||d.parties[0], m={id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),by,name:p.name,text,at:nowISO()};
  d.room.push(m); ui.roomDraft=''; if(!d.guest) save();
  const c=roomConn[d.id]; if(c&&c.r&&by==='me'){ c.r.emit('msg',{id:m.id,name:m.name,text:m.text,at:m.at}).catch(()=>{}); roomPresence(d); }
  render(); const ri=$('#roomInput'); if(ri) ri.focus();
}
async function roomSmart(){
  const d=deal(ui.roomDeal); if(!SAMPLE||!d) return; ui.roomBusy=true; render();
  try{ const cov=coverage(d), open=TERM_DEFS.filter(x=>!cov[x.key]).map(x=>en('t_'+x.key)), chat=d.room.slice(-12).map(m=>`${m.name}: ${m.text}`).join('\n'), me=d.parties.find(p=>p.id==='me')||d.parties[0];
    const r=await SAMPLE(`You help two Indian small-business owners settle a deal over chat. Points not yet settled: ${open.join(', ')||'none'}.\nRecent chat:\n${chat||'(no messages yet)'}\n\nWrite ONE short, friendly message that ${me.name} can send next to settle the most important open point. Never suggest skipping bills, GST or traceable payments. Write it in ${langOf(S.settings.lang).en}. Output only the message text.`,{modelTier:'quick'});
    ui.roomDraft=String(r.text||'').trim().replace(/^["“]|["”]$/g,''); }catch(e){ toast(t('o_noClaude')); }
  ui.roomBusy=false; render();
}
async function roomSave(){
  const d=deal(ui.roomDeal); if(!d||!d.room.length) return;
  const f=iso=>`${iso.slice(8,10)}/${iso.slice(5,7)}/${iso.slice(2,4)}, ${iso.slice(11,16)}`, raw=d.room.map(m=>`${f(m.at)} - ${m.name}: ${m.text}`).join('\n');
  const rec=await mkRecord({id:'CR-'+(++S.counter),dealId:d.id,type:'room',name:'DraftIt chat room',uploadedAt:nowISO(),rawText:raw,messages:d.room.map((m,i)=>({n:i+1,ts:m.at,sender:m.name,text:m.text}))});
  d.records.push(rec); save(); toast(t('chatSaved')); ui.view='deal'; ui.tab='terms'; window.scrollTo(0,0); render(); analyseDeal(d);
}
function openRoom(id){ ui.roomDeal=id; ui.view='room'; ui.roomAs='me'; render(); const d=deal(id); if(d) joinRoom(d); }
function guestRoom(id){ const g=newDealObj(id,t('chatRoom'),nowISO(),[{id:'me',name:(acct()&&S.settings.userName)||ui.guestName||'Guest',org:(acct()&&S.settings.business)||'',role:'Buyer'},{id:'cp',name:'—',org:'—',role:'Seller'}],''); g.guest=true; g.terms=fillMissing({}); ui.guest=g; return g; }

/* ---------- sign up and log in ---------- */
function renderAuth(){
  const A=ui.auth||(ui.auth={mode:'signup',step:'form',role:'user',name:'',mobile:'',business:'',enrol:'',bar:'Karnataka',fee:'499',terms:false,train:false,otp:''});
  const lc=`<button class="langbtn" data-act="langSheet" aria-label="${esc(t('langAndSize'))}">${esc(langOf(S.settings.lang).n)}</button>`;
  const f=(k,l,o)=>`<label class="field">${esc(t(l))}<input class="inp" data-auth="${k}" value="${esc(A[k])}" ${o||''}></label>`;
  let h=`<header class="top gut"><div class="brand grow">${ic('shield',22)}DraftIt</div>${lc}</header><section class="band gut auth-band"><h1>${esc(t('welcomeTag'))}</h1><ul class="auth-points desk">${[['chat','authP1'],['shield','authP2'],['pen','authP3']].map(([i,k])=>`<li><span>${ic(i,20)}</span>${esc(t(k))}</li>`).join('')}</ul></section><main class="gut stack auth-main" style="padding-bottom:40px">`;
  h+=`<div class="seg">${['signup','login','join'].map(m=>`<button aria-pressed="${A.mode===m}" data-act="authMode" data-v="${m}">${esc(t(m==='signup'?'signUp':m==='login'?'logIn':'joinChat'))}</button>`).join('')}</div><section class="card pad stack">`;
  if(A.mode==='join') h+=`<p class="small muted">${esc(t('joinIntro'))}</p><label class="field">${esc(t('roomCodeLbl'))}<input class="inp mono" data-auth="code" value="${esc(A.code||'')}" autocapitalize="characters" placeholder="D05"></label><label class="field">${esc(t('yourName'))}<input class="inp" data-auth="gname" value="${esc(A.gname||'')}"></label><button class="btn full" data-act="authJoin">${ic('chat',18)} ${esc(t('joinChat'))}</button>`;
  else if(SB&&A.step==='otp') h+=`<p class="small">${esc(t('codeSentTo',{email:A.email}))}</p><input class="inp otp" data-auth="otp" value="${esc(A.otp)}" inputmode="numeric" maxlength="10" autocomplete="one-time-code" aria-label="${esc(t('enterCode'))}"><p class="tiny">${esc(t('otpEmailHint'))}</p><button class="btn full" data-act="authVerify" ${A.busy?'disabled':''}>${A.busy?'<span class="spin"></span>':''} ${esc(t('verifyOtp'))}</button><div class="row between"><button class="link" data-act="authBack">${esc(t('back'))}</button><button class="link" data-act="authOtp">${esc(t('resendCode'))}</button></div>`;
  else if(SB&&A.mode==='login') h+=`${f('email','emailLbl','type="email" inputmode="email" autocomplete="email" placeholder="you@example.com"')}<button class="btn full" data-act="authOtp" ${A.busy?'disabled':''}>${A.busy?'<span class="spin"></span>':''} ${esc(t('sendCode'))}</button><p class="tiny">${esc(t('newHere'))} <button class="link" data-act="authMode" data-v="signup">${esc(t('signUp'))}</button></p>`;
  else if(A.step==='otp') h+=`<p class="small">${esc(t('enterOtp'))} · +91 ${esc(A.mobile)}</p><input class="inp otp" data-auth="otp" value="${esc(A.otp)}" inputmode="numeric" maxlength="6" autocomplete="one-time-code" aria-label="${esc(t('enterOtp'))}"><p class="tiny">${esc(t('otpDemo'))}</p><button class="btn full" data-act="authVerify">${esc(t('verifyOtp'))}</button><button class="link" data-act="authBack">${esc(t('back'))}</button>`;
  else if(A.mode==='login') h+=`${f('mobile','mobile','inputmode="numeric" maxlength="10" placeholder="98xxxxxxxx"')}<button class="btn full" data-act="authOtp">${esc(t('sendOtp'))}</button><p class="tiny">${esc(t('newHere'))} <button class="link" data-act="authMode" data-v="signup">${esc(t('signUp'))}</button></p>`;
  else { h+=`<div class="stack-s"><span class="lbl">${esc(t('iAmA'))}</span><div class="roles two" role="radiogroup" aria-label="${esc(t('iAmA'))}">${[['user','role_user','user'],['lawyer','role_lawyer','scale']].map(([k,l,icn])=>`<button class="role ${A.role===k?'on':''}" role="radio" aria-checked="${A.role===k}" data-act="authRole" data-v="${k}"><span class="role-ico">${ic(icn,24)}</span><b>${esc(t(l))}</b></button>`).join('')}</div><p class="tiny role-sub">${esc(t(A.role==='lawyer'?'roleLawyerSub':'roleUserSub'))}</p></div>`;
    h+=f('name','yourName','autocomplete="name"')+(SB?f('email','emailLbl','type="email" inputmode="email" autocomplete="email" placeholder="you@example.com"')+f('mobile','mobileOpt','inputmode="numeric" maxlength="10" placeholder="98xxxxxxxx"'):f('mobile','mobile','inputmode="numeric" maxlength="10" placeholder="98xxxxxxxx"'));
    if(A.role==='lawyer') h+=f('enrol','enrolNo','placeholder="KAR/1234/2016"')+`<label class="field">${esc(t('barState'))}<select class="sel" data-auth="bar">${['Karnataka','Maharashtra','Tamil Nadu','Telangana','Andhra Pradesh','Delhi','Gujarat','Kerala'].map(x=>`<option ${A.bar===x?'selected':''}>${x}</option>`).join('')}</select></label>`+f('fee','lawyerFee','inputmode="numeric"');
    else h+=f('business','business');
    h+=`<label class="check"><input type="checkbox" data-auth="terms" ${A.terms?'checked':''}><span>${esc(t('agreeTerms'))} <button class="link" data-act="go" data-v="data">${esc(t('readPrivacy'))}</button></span></label><label class="check"><input type="checkbox" data-auth="train" ${A.train?'checked':''}><span class="small">${esc(t('trainConsent'))}</span></label><button class="btn full" data-act="authOtp" ${A.busy?'disabled':''}>${A.busy?'<span class="spin"></span>':''} ${esc(t(SB?'sendCode':'sendOtp'))}</button><p class="tiny">${esc(t('haveAccount'))} <button class="link" data-act="authMode" data-v="login">${esc(t('logIn'))}</button></p>`; }
  h+=`</section><section class="stack-s"><span class="lbl">${esc(t(SB?'demoLocal':'demoAccounts'))}</span><div class="stack-s"><button class="card pad tap acct-btn" data-act="demoLogin" data-id="u_ravi_4821"><span class="avatar">RK</span><span class="small"><b>${esc(t('demoSeller'))}</b></span></button><button class="card pad tap acct-btn" data-act="demoLogin" data-id="u_meera_1016"><span class="avatar">MI</span><span class="small"><b>${esc(t('demoLawyer'))}</b></span></button></div></section>${getAppCard()}</main>`;
  return h;
}
function afterLogin(){ ui.quip=1+Math.floor(Math.random()*6); const a=acct(); ui.auth=null; ui.view='home'; ui.dealId=null; ui.tut=a&&!a.tutDone&&a.role!=='lawyer'?0:null; window.scrollTo(0,0); render(); ensureTr(); openHashRoom(); }
const hashCode=()=>{ const m=(location.hash||'').match(/^#room[-=]?([a-z0-9-]{2,40})$/i); return m?roomCode(m[1]):null; };
function joinByCode(code){ code=roomCode(code); if(!code) return; const own=acct()&&S.deals.find(x=>roomCode(x.id)===code&&x.owner===S.session); if(own) return openRoom(own.id); if(!ui.guest||ui.guest.id!==code) guestRoom(code); openRoom(code); }
function openHashRoom(){ const c=hashCode(); if(!c) return; if(!acct()){ ui.auth=Object.assign(ui.auth||{mode:'signup',step:'form',role:'user',name:'',mobile:'',business:'',enrol:'',bar:'Karnataka',fee:'499',terms:false,train:false,otp:''},{mode:'join',code:c}); render(); return; } try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){} joinByCode(c); }
window.addEventListener('hashchange',()=>{ if(S) openHashRoom(); });

/* ---------- first-run tutorial ---------- */
const TUT=[['tut1','chat'],['tut2','shield'],['tut3','spark'],['tut4','pen'],['tut5','flag']];
function renderTutorial(){ const i=ui.tut, [k,icn]=TUT[i], sp=ui.speaking==='tut';
  return `<div class="tut-wrap" role="dialog" aria-modal="true" aria-label="${esc(t('tutTitle'))}"><div class="tut-card stack"><div class="row between"><span class="lbl">${esc(t('tutTitle'))} · ${i+1}/${TUT.length}</span><button class="link" data-act="tutSkip">${esc(t('tutSkip'))}</button></div><span class="tut-ico">${ic(icn,30)}</span><h2 class="h2">${esc(t(k+'T'))}</h2><p>${esc(t(k+'B'))}</p><div><button class="btn sec sm" data-act="tutListen">${ic(sp?'stopI':'speaker',16)} ${esc(t(sp?'stop':'tutListen'))}</button></div><div class="dots-row">${TUT.map((_,j)=>`<i class="${j===i?'on':''}"></i>`).join('')}</div><div class="row between"><button class="btn sec" data-act="tutPrev" ${i?'':'disabled'}>${esc(t('back'))}</button><button class="btn" data-act="tutNext">${esc(t(i===TUT.length-1?'tutDone':'tutNext'))}</button></div></div></div>`; }
function endTutorial(){ stopSpeak(true); const a=acct(); if(a){ a.tutDone=true; save(); } ui.tut=null; render(); }

/* ---------- add evidence ---------- */
const SRC=[['paste','paste'],['whatsapp','chat'],['voice','mic'],['pdf','file'],['photo','cam']];
const blankInp=type=>({type,text:'',consent:'',party:false,speaker:'cp',srcTime:'',fileName:'',fileHash:'',status:''});


/* ---------- reading text in pictures (on the device) ----------
   Tesseract.js finds every line and word in a snip or photo, with its position, so DraftIt can underline
   the parts it used. It runs in the browser; the picture is not sent anywhere for this step. */
const TESS_LIB='https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js';
const TESS_LANG={en:'eng',hi:'hin',mr:'mar',te:'tel',ta:'tam',kn:'kan'};
let TESS=null;
async function tessWorker(){
  const langs=['eng']; const l=TESS_LANG[S.settings.lang]; if(l&&l!=='eng') langs.push(l);
  const key=langs.join('+'); if(TESS&&TESS.key===key) return TESS.w;
  if(!window.Tesseract) await loadScript(TESS_LIB);
  if(TESS){ try{ TESS.w.terminate(); }catch(e){} TESS=null; }
  const w=await window.Tesseract.createWorker(langs,1,Object.assign({},window.__tessPaths||{}));
  TESS={key,w}; return w;
}
/* returns {text, lines:[{t,b:[x0,y0,x1,y1] as fractions of the picture, w:[{t,b}]}], paras:[text]} */
async function ocrLocal(blob){
  const bmp=await createImageBitmap(blob), W=bmp.width, Hh=bmp.height; try{ bmp.close(); }catch(e){}
  const w=await tessWorker(); const {data}=await w.recognize(blob,{},{text:true,blocks:true});
  const f=b=>[+(b.x0/W).toFixed(4),+(b.y0/Hh).toFixed(4),+(b.x1/W).toFixed(4),+(b.y1/Hh).toFixed(4)];
  const lines=[], paras=[];
  (data.blocks||[]).forEach(bl=>(bl.paragraphs||[]).forEach(p=>(p.lines||[]).forEach(ln=>{ const tx=(ln.text||'').replace(/\s+/g,' ').trim(); if(!tx) return; lines.push({t:tx,b:f(ln.bbox),w:(ln.words||[]).filter(x=>(x.text||'').trim()&&x.confidence>30).map(x=>({t:x.text,b:f(x.bbox)}))}); })));
  lines.sort((a,b)=>a.b[1]-b.b[1]||a.b[0]-b.b[0]);
  /* one message per chat bubble: a line ending in a time (10:02 am) closes a bubble; lines close together join */
  const TIME=/\s*\d{1,2}[:.]\d{2}\s*(am|pm|AM|PM)?\s*[✓✔vV/]*\s*$/;
  let cur=null, prevB=null;
  lines.forEach(l=>{ const ended=TIME.test(l.t), tx=l.t.replace(TIME,'').trim(), lh=l.b[3]-l.b[1];
    if(tx){ if(cur&&prevB&&!cur.closed&&(l.b[1]-prevB[3])<lh*0.6&&Math.abs(l.b[0]-prevB[0])<0.08) cur.t+=' '+tx; else { cur={t:tx,closed:false}; paras.push(cur); } }
    if(cur&&(ended||!tx)) cur.closed=true; prevB=l.b; });
  const ptxt=paras.map(p=>p.t);
  return {text:ptxt.join('\n\n')||(data.text||'').trim(),lines,paras:ptxt};
}
/* which lines of a picture DraftIt actually used: lines that match a message cited as evidence for a term */
const normWords=s=>(s||'').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}₹]+/gu,' ').trim().split(' ').filter(x=>x.length>1||/\d/.test(x));
function usedMsgNs(d,r){
  const set=new Set(), pre=r.id+'#', add=ref=>{ if(typeof ref==='string'&&ref.startsWith(pre)) set.add(+ref.slice(pre.length)); };
  Object.values(d.terms||{}).forEach(tm=>{ if(!tm) return; (tm.evidence||[]).forEach(add); (tm.history||[]).forEach(h=>h&&add(h.ref)); });
  return set;
}
function usedLineIdx(d,r){
  const o=r.media&&r.media.ocr; if(!o) return [];
  const used=r.messages.filter(m=>usedMsgNs(d,r).has(m.n)).map(m=>new Set(normWords(m.text)));
  if(!used.length) return [];
  return o.lines.map((l,i)=>{ const ws=normWords(l.t); if(!ws.length) return -1; const hit=ws.filter(x=>used.some(S=>S.has(x))).length; return hit/ws.length>=0.5&&hit>=1?i:-1; }).filter(i=>i>=0);
}
const KEY_WORD=/\d|₹|rs\.?$|rupee|rupaye|advance|deliver|payment|paid|gst|upi|cash|bill|invoice|box|piece|kg|per|date|nov|oct|dec|jan|feb|mar|apr|may|jun|jul|aug|sep|ok|done|agreed|confirm/i;
function snipFigure(d,r,small){
  const m=r.media; if(!m||!m.thumb) return '';
  const pct=v=>(v*100).toFixed(2)+'%';
  let ov='';
  if(m.ocr){ const idx=new Set(usedLineIdx(d,r));
    m.ocr.lines.forEach((l,i)=>{ if(!idx.has(i)) return; const [x0,,x1,y1]=l.b;
      (l.w||[]).filter(w=>KEY_WORD.test(w.t)).forEach(w=>{ ov+=`<i class="ocr-hl" style="left:${pct(w.b[0])};top:${pct(w.b[1])};width:${pct(w.b[2]-w.b[0])};height:${pct(w.b[3]-w.b[1])}"></i>`; });
      ov+=`<i class="ocr-ul" style="left:${pct(x0)};top:${pct(y1)};width:${pct(x1-x0)}"></i>`; });
  }
  return `<figure class="ocr-fig ${small?'sm':''}"><div class="ocr-wrap"><img src="${esc(m.thumb)}" alt="${esc(recName(r))}">${ov}</div>${m.ocr&&ov?`<figcaption class="tiny row" style="gap:8px"><span class="ocr-key"></span>${esc(t('ocrLegend'))}</figcaption>`:m.ocr?'':''}</figure>`;
}

/* ---------- speech to text ----------
   Voice notes and call recordings are turned into text on the user's own device with OpenAI's Whisper model
   (run by transformers.js in a background worker). The audio never leaves the device for this step.
   The model downloads once (from Hugging Face) and is then kept in the browser's cache. */
const ASR={worker:null,seq:0,jobs:{}};
const ASR_MODELS={fast:'Xenova/whisper-base',best:'Xenova/whisper-small'};
const ASR_LIB='https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0/dist/transformers.min.js';
const asrDefaultModel=()=>{ const mem=navigator.deviceMemory||4, touch=matchMedia('(pointer:coarse)').matches; return (!touch&&mem>=4)?'best':'fast'; };
function asrWorker(){
  if(ASR.worker) return ASR.worker;
  const lib=ASR_LIB, wasm='';
  const code=`import { pipeline, env } from ${JSON.stringify(lib)};
env.allowLocalModels=false; ${wasm}
const pipes={};
self.onmessage=async e=>{ const {id,audio,model,language}=e.data;
  try{
    if(!pipes[model]) pipes[model]=await pipeline('automatic-speech-recognition',model,{progress_callback:x=>{ if(x&&x.status==='progress') self.postMessage({id,type:'progress',file:x.file,loaded:x.loaded,total:x.total}); }});
    self.postMessage({id,type:'running'});
    const out=await pipes[model](audio,{language,task:'transcribe',chunk_length_s:30,stride_length_s:5});
    const text=(Array.isArray(out)?out.map(o=>o.text).join(' '):out.text)||'';
    self.postMessage({id,type:'done',text:text.replace(/\\s+\\n/g,'\\n').trim()});
  }catch(err){ self.postMessage({id,type:'error',message:String(err&&err.message||err)}); }
};`;
  const w=new Worker(URL.createObjectURL(new Blob([code],{type:'text/javascript'})),{type:'module'});
  w.onmessage=e=>{ const m=e.data, j=ASR.jobs[m.id]; if(j) j(m); };
  w.onerror=e=>{ Object.values(ASR.jobs).forEach(j=>j({type:'error',message:'load failed '+((e&&e.message)||'')})); ASR.worker=null; };
  return (ASR.worker=w);
}
/* decode any audio (or the sound track of an MP4) to 16 kHz mono, which is what Whisper expects */
async function decode16k(file){
  const ab=await file.arrayBuffer(); const AC=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  const ctx=new AC(1,16000,16000);
  const buf=await new Promise((res,rej)=>{ const p=ctx.decodeAudioData(ab,res,rej); if(p&&p.then) p.then(res,rej); });
  let data;
  if(buf.numberOfChannels>1){ const a=buf.getChannelData(0), b=buf.getChannelData(1); data=new Float32Array(a.length); for(let i=0;i<a.length;i++) data[i]=(a[i]+b[i])/2; }
  else data=new Float32Array(buf.getChannelData(0));
  if(buf.sampleRate!==16000){ const oc=new AC(1,Math.ceil(buf.duration*16000),16000), src=oc.createBufferSource(), mono=oc.createBuffer(1,data.length,buf.sampleRate); mono.copyToChannel(data,0); src.buffer=mono; src.connect(oc.destination); src.start(); data=(await oc.startRendering()).getChannelData(0); }
  return {data,dur:buf.duration};
}
function asrStatusHtml(x){
  const a=x.asr; if(!a) return '';
  if(a.state==='prep') return `<div class="note busy"><span class="spin"></span><span>${esc(t('asrPrep'))}</span></div>`;
  if(a.state==='load') return `<div class="note busy"><span class="spin"></span><span>${esc(t('asrLoad',{n:a.pct||0}))}</span></div><div class="bar"><i style="width:${a.pct||0}%"></i></div>`;
  if(a.state==='run') return `<div class="note busy"><span class="spin"></span><span>${esc(t('asrRun',{s:Math.round(a.dur||0)}))}</span></div>`;
  if(a.state==='done') return `<div class="note ok row" style="gap:8px">${ic('check',18)}<span>${esc(t('asrDone'))}</span></div>`;
  if(a.state==='error') return `<div class="note bad">${esc(t(a.msg||'asrFail'))}</div>`;
  return '';
}
function asrPaint(x){ if(ui.inp!==x) return; const el=$('#asrStatus'); if(el) el.innerHTML=asrStatusHtml(x); }
async function transcribe(x){
  if(!x||!x.file) return; if(x.asr&&['prep','load','run'].includes(x.asr.state)) return;
  syncInp(); const model=ASR_MODELS[x.asrModel||(x.asrModel=asrDefaultModel())], language=x.asrLang||(x.asrLang=S.settings.lang||'hi');
  x.asr={state:'prep'}; if(ui.inp===x) addEvidenceSheet();
  let audio;
  try{ const r=await decode16k(x.file); audio=r.data; x.asr.dur=r.dur; }
  catch(e){ x.asr={state:'error',msg:'asrDecodeFail'}; if(ui.inp===x) addEvidenceSheet(); return; }
  if(window.__draftitASR){ /* test hook */ x.asr.state='run'; asrPaint(x); try{ asrFinish(x,await window.__draftitASR(audio,{model,language}),model,language); }catch(e){ x.asr={state:'error',msg:'asrFail'}; if(ui.inp===x) addEvidenceSheet(); } return; }
  let w; try{ w=asrWorker(); }catch(e){ x.asr={state:'error',msg:'asrNoSupport'}; if(ui.inp===x) addEvidenceSheet(); return; }
  const id=++ASR.seq, files={}; x.asr.state='load'; x.asr.pct=0; asrPaint(x);
  ASR.jobs[id]=m=>{
    if(m.type==='progress'){ files[m.file]=[m.loaded||0,m.total||0]; const v=Object.values(files), L=v.reduce((s,f)=>s+f[0],0), T=v.reduce((s,f)=>s+f[1],0); x.asr.state='load'; x.asr.pct=T?Math.min(99,Math.round(L/T*100)):0; asrPaint(x); }
    else if(m.type==='running'){ x.asr.state='run'; asrPaint(x); }
    else if(m.type==='done'){ delete ASR.jobs[id]; asrFinish(x,m.text,model,language); }
    else if(m.type==='error'){ delete ASR.jobs[id]; console.warn('speech to text:',m.message); x.asr={state:'error',msg:/fetch|network|load/i.test(m.message||'')?'asrNetFail':'asrFail'}; if(ui.inp===x) addEvidenceSheet(); }
  };
  w.postMessage({id,audio,model,language},[audio.buffer]);
}
function asrFinish(x,text,model,language){
  if(ui.inp===x) syncInp();
  text=(text||'').trim();
  if(!text){ x.asr={state:'error',msg:'asrEmpty'}; if(ui.inp===x) addEvidenceSheet(); return; }
  if(!x.text||x.text===x.autoText) x.text=text;
  x.autoText=text; x.asr={state:'done',model,lang:language};
  if(ui.inp===x) addEvidenceSheet();
}

/* file chooser that keeps showing the chosen file after the sheet redraws */
function filePick(kind,accept,hint){ const x=ui.inp||{}, has=x.fileName&&x.fileKind===kind;
  return `<div class="filepick"><label class="btn sec">${ic('upload',18)} ${esc(t(has?'changeFile':'chooseFile'))}<input type="file" hidden accept="${accept}" data-file="${kind}"></label>${has?`<span class="chip c-ok">${ic('check',14)} ${esc(x.fileName)}</span>`:`<span class="tiny">${esc(t('noFileYet'))}</span>`}</div>${hint?`<p class="tiny">${esc(hint)}</p>`:''}`; }
function addEvidenceSheet(){
  if(!ui.inp) ui.inp=blankInp('paste'); const d=deal(), x=ui.inp;
  const who=k=>`<label class="field">${esc(t(k))}<select class="sel" data-change="speaker">${d.parties.map(p=>`<option value="${p.id}" ${x.speaker===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}${k==='whoSpeaking'?`<option value="both" ${x.speaker==='both'?'selected':''}>${esc(t('bothCall'))}</option>`:''}</select></label>`;
  let h=sheetHead(t('addEvidence'),esc(tx(d.title)))+`<div class="src-grid">${SRC.map(([k,i])=>`<button class="src" aria-pressed="${x.type===k}" data-act="srcType" data-v="${k}">${ic(i,20)}<span>${esc(t('src_'+k))}</span><span class="tiny">${esc(t('srcSub_'+k))}</span></button>`).join('')}</div>`;
  h+=`<div class="sample-bar"><span class="tiny">${esc(t('sampleHint'))}</span><button class="btn sec sm" data-act="fillSample">${ic('spark',16)} ${esc(t('fillSample'))}</button></div>`;
  if(x.type==='paste') h+=`<label class="field">${esc(t('pasteLabel'))}<textarea class="inp" id="inpText" data-input="text" placeholder="18/10/26, 10:02 am - Anjali: …">${esc(x.text)}</textarea></label>`;
  if(x.type==='whatsapp') h+=`${filePick('txt','.txt,text/plain')}<p class="tiny">${esc(t('exportHint'))}</p>`;
  if(x.type==='voice') h+=`${filePick('audio','audio/*,video/mp4,video/3gpp,video/webm,.mp4,.m4a,.opus,.ogg,.mp3,.aac,.wav,.amr,.3gp,.webm',t('audioTypes'))}${x.audioURL?`<audio controls src="${esc(x.audioURL)}" style="width:100%"></audio>`:''}<div class="asr-box stack-s"><b class="row" style="gap:8px">${ic('mic',18)} ${esc(t('asrTitle'))}</b><div class="asr-opts"><label class="field">${esc(t('asrLangLbl'))}<select class="sel" data-change="asrLang">${LANGS.map(l=>`<option value="${l.c}" ${(x.asrLang||S.settings.lang)===l.c?'selected':''}>${esc(l.n)}</option>`).join('')}</select></label><label class="field">${esc(t('asrQualLbl'))}<select class="sel" data-change="asrModel">${[['fast','asrFast'],['best','asrBest']].map(([k,l])=>`<option value="${k}" ${(x.asrModel||asrDefaultModel())===k?'selected':''}>${esc(t(l))}</option>`).join('')}</select></label></div>${x.file?`<button class="btn sec sm" data-act="asrRun" ${x.asr&&['prep','load','run'].includes(x.asr.state)?'disabled':''} style="align-self:flex-start">${ic('spark',16)} ${esc(t(x.asr&&x.asr.state==='done'?'asrAgain':'asrStart'))}</button>`:`<span class="tiny">${esc(t('asrPick'))}</span>`}<div id="asrStatus">${asrStatusHtml(x)}</div><p class="tiny">${esc(t('asrPrivacy'))}</p></div><div class="stack-s"><span class="lbl">${esc(t('howRecorded'))}</span>${['sent_by_them','call_both_knew','own_note','secret'].map(k=>`<label class="radio ${x.consent===k?'on':''}"><input type="radio" name="consent" value="${k}" ${x.consent===k?'checked':''} data-change="consent"><span>${esc(t('c_'+k))}</span></label>`).join('')}${x.consent==='secret'?`<div class="note bad">${esc(t('secretWarn'))}</div>`:''}<label class="check"><input type="checkbox" ${x.party?'checked':''} data-change="party"><span>${esc(t('partOf'))}</span></label></div>${who('whoSpeaking')}<label class="field">${esc(t('whenSent'))}<input class="inp" type="datetime-local" data-change="srcTime" value="${esc(x.srcTime)}"></label><label class="field">${esc(t('transcript'))}<textarea class="inp" id="inpText" data-input="text">${esc(x.text)}</textarea></label><p class="tiny">${esc(t('transcriptHint'))}</p>`;
  if(x.type==='pdf') h+=`${filePick('pdf','application/pdf,.pdf')}${x.fileHash?`<label class="field">${esc(t('textFound'))}<textarea class="inp" id="inpText" data-input="text">${esc(x.text)}</textarea></label>`:''}${who('sentBy')}`;
  if(x.type==='photo') h+=`${filePick('image','image/*')}${x.thumb?`<img class="thumb" src="${esc(x.thumb)}" alt="">`:''}${x.thumb&&SAMPLE?`<button class="btn sec sm" data-act="ocr">${esc(t('readPhoto'))}</button>`:''}${x.thumb||x.text?`<label class="field">${esc(t('textFound'))}<textarea class="inp" id="inpText" data-input="text">${esc(x.text)}</textarea></label>`:''}${who('sentBy')}`;
  if(x.status) h+=`<div class="note busy">${x.busy?'<span class="spin"></span>':''}<span>${esc(x.status)}</span></div>`;
  if(x.fileHash) h+=`<p class="tiny">${esc(t('fileFp'))} <span class="mono">${esc(x.fileHash)}</span></p>`;
  openSheet(h+`<button class="btn full" data-act="saveRecord">${ic('lock',18)} ${esc(t('saveRecord'))}</button>`);
}
const readAs=(file,how)=>new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=()=>rej(fr.error); how==='url'?fr.readAsDataURL(file):fr.readAsArrayBuffer(file); });
const loadScript=src=>new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
const shrink=(url,max)=>new Promise(res=>{ const img=new Image(); img.onload=()=>{ const k=Math.min(1,max/Math.max(img.width,img.height)); const c=document.createElement('canvas'); c.width=Math.round(img.width*k); c.height=Math.round(img.height*k); c.getContext('2d').drawImage(img,0,0,c.width,c.height); res(c.toDataURL('image/jpeg',.82)); }; img.onerror=()=>res(url); img.src=url; });
async function ocrBlobs(blobs){ const {text}=await SAMPLE('Transcribe all text in these images exactly as written, line by line, in the original language and script. Do not summarise, translate, correct or add anything. If it is a chat screenshot, write each message as: [date time] Sender: message. Output only the transcription.',{images:blobs,modelTier:'default'}); return text.trim(); }
async function onFile(kind,file){
  const x=ui.inp; if(!file) return; x.fileName=file.name; x.fileKind=kind; x.file=file;
  const buf=await readAs(file,'buf'); x.fileHash=await sha256Bytes(new Uint8Array(buf));
  if(kind==='txt'){ x.text=new TextDecoder().decode(buf); x.status=t('msgsFound',{n:parseChat(x.text).length}); }
  if(kind==='audio'){ x.audioURL=URL.createObjectURL(file); x.status=''; x.asr=null; setTimeout(()=>transcribe(x),0); }
  if(kind==='image'){ x.thumb=await shrink(await readAs(file,'url'),1000); x.status=''; x.ocr=null;
    if(!SAMPLE){ x.busy=true; x.status=t('readingPhoto'); addEvidenceSheet(); }
    ocrLocal(file).then(o=>{ x.ocr={lines:o.lines}; if(!SAMPLE&&ui.inp===x){ syncInp(); if(!x.text) { x.text=o.text; x.method='ocr'; } x.busy=false; x.status=o.text?'':t('ocrNone'); addEvidenceSheet(); } }).catch(e=>{ console.warn('ocr',e); if(!SAMPLE&&ui.inp===x){ x.busy=false; x.status=t('ocrFail'); addEvidenceSheet(); } });
    if(!SAMPLE){ return; } }
  if(kind==='pdf'){ x.busy=true; x.status=t('readingPdf'); addEvidenceSheet();
    try{ if(!window.pdfjsLib){ await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'); window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; }
      const pdf=await window.pdfjsLib.getDocument({data:new Uint8Array(buf.slice(0))}).promise, pages=Math.min(pdf.numPages,20), out=[];
      for(let i=1;i<=pages;i++){ const tc=await (await pdf.getPage(i)).getTextContent(); out.push(tc.items.map(it=>it.str+(it.hasEOL?'\n':' ')).join('').trim()); }
      x.text=out.filter(Boolean).join('\n\n'); x.method='pdf-text';
      if(!x.text&&SAMPLE){ const blobs=[]; for(let i=1;i<=Math.min(pages,3);i++){ const pg=await pdf.getPage(i), vp=pg.getViewport({scale:1.6}), c=document.createElement('canvas'); c.width=vp.width; c.height=vp.height; await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise; blobs.push(await new Promise(r=>c.toBlob(r,'image/jpeg',.85))); } x.text=await ocrBlobs(blobs); x.method='ocr'; }
      x.status=x.text?'':t('noPdfText');
    }catch(e){ x.status=t('noPdfText'); }
    x.busy=false; }
  addEvidenceSheet();
}
async function saveRecord(){
  syncInp(); const d=deal(), x=ui.inp, text=(x.text||'').trim();
  if(x.type==='voice'){ if(!x.fileHash) return toast(t('e_file')); if(!x.consent) return toast(t('e_consent')); if(x.consent==='secret') return toast(t('e_secret')); if(!x.party) return toast(t('e_part')); }
  else if(['whatsapp','pdf','photo'].includes(x.type)&&!x.fileHash) return toast(t('e_file'));
  if(!text) return toast(t('e_text'));
  const id='CR-'+(++S.counter), up=nowISO(), srcTs=x.srcTime?x.srcTime+':00'+TZ:null; let messages, method='verbatim';
  if(x.type==='paste'||x.type==='whatsapp'){ messages=parseChat(text); if(!messages.length) return toast(t('e_nomsg')); }
  else { const sender=x.speaker==='both'?t('bothCall'):partyName(d,x.speaker); messages=text.split(/\n{2,}/).map((p,i)=>({n:i+1,ts:srcTs,sender,text:p.trim()})).filter(m=>m.text); method=x.type==='voice'?'transcript':x.method||'ocr'; }
  /* online: the original file goes to Supabase Storage first */
  let filePath=null;
  if(x.file&&useStorage(d)){ x.busy=true; x.status=t('uploadingOriginal'); addEvidenceSheet();
    try{ filePath=await cloudUpload(d.id,id,x.file,x.fileName||x.file.name); }catch(e){ console.warn('upload',e); toast(t('uploadFail')); }
    x.busy=false; x.status=''; }
  const fileInfo=filePath?{path:filePath,mime:x.file.type||'',size:x.file.size}:null;
  const voiceMedia=x.type!=='voice'?(fileInfo&&!x.thumb?Object.assign({kind:'file'},fileInfo):null):x.audioSrc?{kind:'audio',src:x.audioSrc}:fileInfo?Object.assign({kind:'audio'},fileInfo):x.file&&x.file.size<=1500000?{kind:'audio',data:await readAs(x.file,'url'),mime:x.file.type||'audio/mpeg'}:x.file?{kind:'audio',big:true}:{kind:'audio',demo:!!x.audioDemo};
  const asrInfo=x.type==='voice'&&x.asr&&x.asr.state==='done'?{model:x.asr.model,lang:x.asr.lang,edited:text!==(x.autoText||'').trim()}:null;
  const rec=await mkRecord({id,dealId:d.id,type:x.type,name:x.type==='paste'?'Pasted chat':(x.fileName||en('src_'+x.type)),uploadedAt:up,rawText:text,messages,method,fileHash:x.fileHash||null,media:x.thumb?Object.assign({kind:'image',thumb:x.thumb},x.ocr?{ocr:x.ocr}:{},fileInfo||{}):voiceMedia,asr:asrInfo,consent:x.type==='voice'?{basis:x.consent,party:true,at:up}:null});
  d.records.push(rec); save(); closeSheet(); ui.tab='terms'; render(); toast(t('o_saved',{x:id})); analyseDeal(d);
}

/* ---------- analysis ---------- */
function buildPrompt(d){
  const me=d.parties[0], cp=d.parties[1];
  const lines=allMsgs(d).map(m=>`${m.ref} | ${m.ts?m.ts.slice(0,16).replace('T',' '):'no time'} | ${m.sender} | ${m.rec.type}${m.rec.type==='voice'?' (transcript)':''} | ${m.text.replace(/\n/g,' ')}`).join('\n');
  return `You read informal deal conversations between Indian small businesses (WhatsApp chats, voice-note transcripts, documents) and extract the deal terms. Use ONLY the messages below. Never invent facts. Messages may mix English, Hindi and other Indian languages. Write all output text in simple English.

Owner using the app: ${me.name} (${me.org}), ${me.role.toLowerCase()}.
Other party: ${cp.name} (${cp.org}), ${cp.role.toLowerCase()}.
Today: ${todayYMD()}.

MESSAGES (ref | time | sender | source | text):
${lines}

Return JSON only, exactly this shape:
{"terms":{"<key>":{"status":"agreed|proposed|ambiguous|missing","value":"short value","clause":"one or two plain-language sentences for a simple agreement, no legal jargon; empty if missing","open":"what still needs settling, or empty","proposedBy":"name or empty","confirmedBy":"name or empty","evidence":["refs"],"history":[{"ref":"","by":"","value":"","stance":"offer|counter|accept|reject|info|paid"}]}},
 "flags":[{"severity":"high|medium|low","title":"","detail":"one or two plain sentences on the risk to the owner","ask":"a short, friendly WhatsApp message the owner can send, in the same language mix as the chat, never legalistic","keys":["term keys"]}],
 "dates":[{"date":"YYYY-MM-DD","label":"","kind":"delivery|payment|deadline|meeting","status":"agreed|proposed|done"}],
 "category":"printing|food|medicine|digital|electronics|textiles|construction|other",
 "value":number or null}

Term keys (include every one): parties, scope, specs, price, tax, delivery, advance, balance, payment_mode, late_penalty, quality, cancellation, disputes, ip, resale.
- payment_mode: how money moves (UPI, bank transfer, cheque, cash). ip: who owns designs, logos, files, code, trade marks or copyright, and any transfer. resale: whether the buyer may resell, and at what price limit.
- If anyone suggests skipping the bill or GST, under-the-table or untraceable cash, add a high-severity flag about it, and never treat that suggestion as a valid term.
Rules:
- "agreed" only if one side stated it AND the other side clearly accepted (ok, done, haan, theek hai, 👍) or acted on it (paid, delivered). Silence is not acceptance.
- "proposed" if only one side said it. "ambiguous" if discussed but vague (around, a week, thick). "missing" if never discussed, with evidence [] and open describing what to decide.
- A later message overrides an earlier one. Put the whole sequence in history, in order.
- Every ref you use must appear in MESSAGES.
- Resolve relative dates using the message dates.
- Flag each missing, unclear or unconfirmed term that could cost the owner money, most serious first.`;
}
function heuristicAnalyse(d){
  const msgs=allMsgs(d), terms={};
  const yes=/(^|\b)(ok|okay|done|agreed|confirm(ed)?|deal|fine|sure|yes|haan|ha|theek|thik|chalega|accepted)(\b|$)|👍|🙏|✅/i;
  const P=Object.assign({},TERM_RE); delete P.parties;
  const senders=[...new Set(msgs.map(m=>m.sender))];
  terms.parties=T(senders.length>=2?'agreed':'proposed',{value:d.parties.map(p=>p.org||p.name).join(' · '),clause:`${d.parties[0].org} (${d.parties[0].name}) and ${d.parties[1].org} (${d.parties[1].name}).`,evidence:msgs.slice(0,2).map(m=>m.ref),history:msgs.slice(0,2).map(m=>H(m.ref,m.sender,m.text.slice(0,60),'info'))});
  msgs.forEach((m,i)=>{ if(FRAUD_RE.test(m.text)) return; for(const k in P){ if(!P[k].test(m.text)) continue; const tm=terms[k]||(terms[k]=T('proposed'));
    tm.evidence.push(m.ref); tm.history.push(H(m.ref,m.sender,m.text.slice(0,70),tm.history.length?'counter':'offer')); tm.proposedBy=m.sender; tm.value=m.text.replace(/\s+/g,' ').slice(0,80); tm.clause='“'+m.text.replace(/\s+/g,' ').slice(0,160)+'”'; tm.status='proposed'; tm.confirmedBy='';
    const acc=msgs.slice(i+1,i+3).find(n=>n.sender!==m.sender&&yes.test(n.text));
    if(acc){ tm.status='agreed'; tm.confirmedBy=acc.sender; tm.history.push(H(acc.ref,acc.sender,acc.text.slice(0,50),'accept')); if(!tm.evidence.includes(acc.ref)) tm.evidence.push(acc.ref); tm.open=''; } else tm.open=en('confirmOther'); } });
  fillMissing(terms);
  const flags=TERM_DEFS.filter(def=>terms[def.key].status!=='agreed').map(def=>{ const tm=terms[def.key], miss=tm.status==='missing'; return {severity:miss?(['price','delivery','cancellation','balance'].includes(def.key)?'high':'medium'):'medium',title:{k:miss?'notDiscussedX':'notConfirmedX',p:{term:'t_'+def.key}},detail:miss?def.miss:en('oneSide'),ask:{k:'askConfirm',p:{name:first(d.parties[1].name),term:'t_'+def.key}},keys:[def.key]}; });
  return {terms,flags,dates:[],value:null};
}
function normalise(d,res){
  const known=new Set(allMsgs(d).map(m=>m.ref)), terms={};
  TERM_DEFS.forEach(def=>{ const x=(res.terms||{})[def.key]||{}, st=['agreed','proposed','ambiguous','missing'].includes(x.status)?x.status:'missing';
    terms[def.key]=T(st,{value:String(x.value||''),clause:String(x.clause||''),open:String(x.open||''),proposedBy:String(x.proposedBy||''),confirmedBy:String(x.confirmedBy||''),evidence:(x.evidence||[]).map(String).filter(r=>known.has(r)),history:(x.history||[]).filter(h=>h&&known.has(String(h.ref))).map(h=>H(String(h.ref),String(h.by||''),String(h.value||''),['offer','counter','accept','reject','info','paid'].includes(h.stance)?h.stance:'info'))}); });
  fillMissing(terms);
  return {category:CATS.includes(res.category)?res.category:null,terms,flags:(res.flags||[]).filter(f=>f&&f.title).map(f=>({severity:['high','medium','low'].includes(f.severity)?f.severity:'medium',title:String(f.title),detail:String(f.detail||''),ask:String(f.ask||''),keys:(f.keys||[]).map(String)})),dates:(res.dates||[]).filter(e=>e&&/^\d{4}-\d{2}-\d{2}$/.test(e.date)).map(e=>({date:e.date,label:String(e.label||''),kind:['delivery','payment','deadline','meeting'].includes(e.kind)?e.kind:'deadline',status:['agreed','proposed','done'].includes(e.status)?e.status:'proposed'})),value:typeof res.value==='number'?res.value:null};
}
async function analyseDeal(d){
  ui.busy={dealId:d.id}; render(); let res=null, method='basic';
  if(SAMPLE&&S.settings.ai){ try{ res=normalise(d,await SAMPLE.json(buildPrompt(d),{modelTier:'default'})); method='claude'; }catch(e){ toast(t('o_noClaude')); } }
  if(!res){ res=heuristicAnalyse(d);
    /* offline: keep what was already read well, and only fill points that were missing */
    if(d.analysis){ TERM_DEFS.forEach(def=>{ const old=d.terms[def.key]; if(old&&old.status!=='missing') res.terms[def.key]=old; }); res.flags=d.flags.filter(f=>!f.fraud).concat(res.flags.filter(f=>(f.keys||[]).every(k=>!d.terms[k]||d.terms[k].status==='missing')&&(f.keys||[]).some(k=>res.terms[k].status!=='missing'))); } }
  d.terms=res.terms; d.flags=res.flags;
  if(!d.category||d.category.by!=='user') d.category={id:res.category||guessCategory(d),by:'auto'};
  if(fraudRefs(d).length&&!d.flags.some(f=>f.fraud)) d.flags.unshift(fraudFlag(d)); if(res.dates.length) d.dates=res.dates.concat(d.dates.filter(e=>e.status==='done'&&!res.dates.some(x=>x.date===e.date))); if(res.value) d.value=res.value;
  d.analysis={at:nowISO(),method,records:d.records.length};
  const fresh=clausesFromTerms(d.terms);
  if(d.draft) d.draft.clauses=d.draft.clauses.map(c=>{ if(c.edited||c.pending) return c; const f=fresh.find(x=>x.id===c.id); if(f&&(f.text!==c.text||f.open!==c.open)){ log(d,c.id,d.draft.rev,'generated',f.text,'@pakka',nowISO(),{k:'n_updated'}); return f; } return c; });
  else if(d.versions.length) d.needsRevision=true;
  ui.busy=null; save(); render(); toast(t('o_done',{n:confidence(d).total})); ensureTr();
  if(ui.openRec&&ui.dealId===d.id&&!$('#sheetWrap').hidden&&d.records.some(r=>r.id===ui.openRec)) recordSheet(ui.openRec);
}

/* ---------- agreement actions ---------- */
function createDraft(d){ const rev=(latestVersion(d)?latestVersion(d).rev:0)+1; d.draft={rev,clauses:clausesFromTerms(d.terms)}; d.draft.clauses.forEach(c=>log(d,c.id,rev,'generated',c.text,'@pakka',nowISO())); save(); ensureTr(); }
function newRevision(d){ const v=latestVersion(d), rev=v.rev+1, fresh=clausesFromTerms(d.terms);
  d.draft={rev,clauses:v.payload.clauses.map(c=>{ const f=fresh.find(x=>x.id===c.id); if(d.needsRevision&&f) return Object.assign({},f); return {id:c.id,keys:clauseKeys(c.id),text:c.text,open:c.open,edited:false,pending:null}; })};
  d.draft.clauses.forEach(c=>{ const o=v.payload.clauses.find(x=>x.id===c.id); if(!o||o.text!==c.text) log(d,c.id,rev,'generated',c.text,'@pakka',nowISO(),{k:'n_updated'}); });
  d.needsRevision=false; save(); }
async function freeze(d){ const at=nowISO(), v=await sealVersion(d,d.draft.clauses,d.draft.rev,at); d.draft.clauses.forEach(c=>log(d,c.id,v.rev,'locked',c.text,'@both',at,'SHA-256 '+shortHash(v.hash))); d.versions.push(v); d.draft=null; save(); render(); toast(t('o_locked',{n:v.rev})); }
async function verifyVersion(v,tamper){ const p=JSON.parse(JSON.stringify(v.payload)); let changed='';
  if(tamper){ const c=p.clauses.find(x=>/\d/.test(x.text))||p.clauses[0], m0=(c.text.match(/\d+/)||['0'])[0]; c.text=c.text.replace(/\d+/,m=>String(+m+1)); changed=`${t('h_'+c.id)}: ${m0} → ${+m0+1}`; }
  const computed=await sha256Text(canon(p)); return {ok:computed===v.hash,stored:v.hash,computed,changed}; }

/* ---------- signature pad ---------- */
let sig={has:false};
function initSigPad(){ const c=$('#sigpad'); if(!c) return; const r=c.getBoundingClientRect(), dpr=window.devicePixelRatio||1; c.width=r.width*dpr; c.height=r.height*dpr; const g=c.getContext('2d'); g.scale(dpr,dpr); g.fillStyle='#FFFFFF'; g.fillRect(0,0,r.width,r.height); g.lineWidth=2.2; g.lineCap='round'; g.lineJoin='round'; g.strokeStyle='#0B2E63';
  sig={has:false,down:false,c}; const pt=e=>{ const b=c.getBoundingClientRect(); return [e.clientX-b.left,e.clientY-b.top]; };
  c.addEventListener('pointerdown',e=>{ sig.down=true; c.setPointerCapture(e.pointerId); const [x,y]=pt(e); g.beginPath(); g.moveTo(x,y); });
  c.addEventListener('pointermove',e=>{ if(!sig.down) return; const [x,y]=pt(e); g.lineTo(x,y); g.stroke(); sig.has=true; });
  const up=()=>{ sig.down=false; }; c.addEventListener('pointerup',up); c.addEventListener('pointercancel',up); }

/* ---------- read aloud ---------- */
function pickVoice(code){ const vs=voicesFor(code); if(S.settings.voiceURI){ const v=vs.find(x=>x.voiceURI===S.settings.voiceURI); if(v) return v; } return vs[0]||null; }
/* ---------- read aloud ----------
   Android app: the phone's own text-to-speech (Capacitor plugin), which has Indian voices.
   Browsers: the Web Speech API, with fixes for its common stalls. */
const ttsNative=()=>NP('TextToSpeech');
const ttsWeb=()=>('speechSynthesis' in window&&window.speechSynthesis&&typeof window.SpeechSynthesisUtterance==='function')?window.speechSynthesis:null;
const ttsOK=()=>!!(ttsNative()||ttsWeb());
let VOICES_P=null;
function waitVoices(){ const W=ttsWeb(); if(!W) return Promise.resolve([]); const v=W.getVoices(); if(v.length) return Promise.resolve(v);
  return VOICES_P||(VOICES_P=new Promise(res=>{ let done=false; const f=()=>{ if(done) return; done=true; VOICES_P=null; res(W.getVoices()); }; try{ W.addEventListener('voiceschanged',f,{once:true}); }catch(e){} setTimeout(f,1500); })); }
function splitParts(text){ const out=[]; (text.match(/[^.!?।|]+[.!?।|]*/g)||[text]).forEach(p=>{ p=p.trim(); while(p.length>200){ let k=p.lastIndexOf(',',200); if(k<60) k=p.lastIndexOf(' ',200); if(k<1) k=200; out.push(p.slice(0,k+1).trim()); p=p.slice(k+1).trim(); } if(p) out.push(p); }); return out; }
const ttsRate=()=>Math.min(2,Math.max(0.5,+S.settings.rate||1));
/* speak one short piece; resolves when it has been spoken (or failed) */
function sayPart(text,code){ const bcp=langOf(code).bcp, N=ttsNative();
  if(N) return N.speak({text,lang:bcp,rate:ttsRate(),pitch:1,volume:1,category:'playback'}).catch(e=>console.warn('tts',e));
  const W=ttsWeb(); if(!W) return Promise.resolve();
  return new Promise(res=>{ let done=false; const end=()=>{ if(done) return; done=true; clearTimeout(guard); res(); };
    const u=new SpeechSynthesisUtterance(text); u.lang=bcp; const v=pickVoice(code); if(v) u.voice=v; u.rate=ttsRate(); u.onend=end; u.onerror=end;
    const guard=setTimeout(end,Math.max(6000,text.length*160/ttsRate()));
    if(W.paused) try{ W.resume(); }catch(e){} W.speak(u); }); }
function ttsStop(){ const N=ttsNative(); if(N){ try{ N.stop(); }catch(e){} } const W=ttsWeb(); if(W){ try{ W.cancel(); }catch(e){} } }
/* checks before speaking: an engine exists, and a voice for this language (warn, but try anyway) */
async function ttsPrepare(code){
  if(!ttsOK()){ toast(t(NATIVE()?'o_noTtsApp':'o_noTts')); return false; }
  const N=ttsNative();
  if(N){ try{ const r=await N.isLanguageSupported({lang:langOf(code).bcp}); if(r&&r.supported===false) toast(t('o_noVoiceTry')); }catch(e){} return true; }
  ttsStop(); await waitVoices(); if(!pickVoice(code)&&code!=='en') toast(t('o_noVoiceTry'));
  await new Promise(r=>setTimeout(r,80)); /* Chrome drops a speak() that comes right after cancel() */
  return true; }
async function speakItems(items,code){
  const tok=ui.tok=(ui.tok||0)+1; if(!(await ttsPrepare(code))) return;
  for(const it of items){ if(tok!==ui.tok) return; ui.speaking=it.id; ui.keep=true; render(); const el=document.getElementById('cl-'+it.id); if(el) el.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    for(const part of splitParts(it.text)){ if(tok!==ui.tok) return; await sayPart(part,code); } }
  if(tok===ui.tok){ ui.speaking=null; ui.keep=true; render(); } }
function stopSpeak(quiet){ ui.tok=(ui.tok||0)+1; ttsStop(); ui.speaking=null; if(!quiet){ ui.keep=true; render(); } }
/* read any block of the page aloud, highlighting each part as it is read */
let READ=null;
async function readEl(btn){
  if(READ&&READ.btn===btn){ stopRead(); return; } stopRead(); stopSpeak(true);
  const root=document.getElementById(btn.dataset.target); if(!root) return;
  const code=btn.dataset.lang||S.settings.lang, sel=btn.dataset.sel||'h2,h3,p,li,tr';
  const items=[...root.querySelectorAll(sel)].map(e=>({e,text:(e.textContent||'').replace(/\s+/g,' ').trim()})).filter(x=>x.text);
  const tok={}; READ={btn,tok}; setSayBtn(btn,true);
  if(!(await ttsPrepare(code))){ stopRead(); return; }
  const live=()=>READ&&READ.tok===tok;
  for(const it of items){ if(!live()) return; document.querySelectorAll('.reading').forEach(x=>x.classList.remove('reading')); it.e.classList.add('reading');
    try{ it.e.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}); }catch(e){}
    for(const part of splitParts(it.text)){ if(!live()) return; await sayPart(part,code); } }
  if(live()) stopRead(); }
function stopRead(){ if(!READ) return; const b=READ.btn; READ=null; ttsStop(); document.querySelectorAll('.reading').forEach(x=>x.classList.remove('reading')); setSayBtn(b,false); }
function setSayBtn(b,on){ if(!b) return; b.classList.toggle('on',on); const sp=b.querySelector('span'); if(sp) sp.textContent=t(on?'stop':(b.dataset.label||'readAloud')); }
const sayBtn=(target,o)=>{ o=o||{}; return `<button class="btn sec sm say" data-act="readEl" data-target="${target}" ${o.lang?`data-lang="${o.lang}"`:''} ${o.sel?`data-sel="${o.sel}"`:''} ${o.label?`data-label="${o.label}"`:''}>${ic('speaker',16)} <span>${esc(t(o.label||'readAloud'))}</span></button>`; };
function speakDoc(){ const d=deal(); speakItems(currentClauses(d).map((c,i)=>({id:c.id,text:`${i+1}. ${t('h_'+c.id)}. ${tx(c.text)} ${c.open?t('toSettle')+': '+tx(c.open):''}`})),S.settings.lang); }

/* ---------- export ---------- */
function buildReport(d){
  const v=latestVersion(d), cl=currentClauses(d), E=esc, row=(a,b)=>`<tr><th>${E(a)}</th><td>${b}</td></tr>`;
  let h=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Evidence record · ${E(d.title)}</title><style>body{font:14px/1.5 Arial,'Noto Sans',sans-serif;color:#111;max-width:820px;margin:24px auto;padding:0 16px}h1{font-size:22px;color:#0B2E63}h2{font-size:17px;border-bottom:2px solid #0B2E63;padding-bottom:4px;margin-top:28px;color:#0B2E63}h3{font-size:15px;margin:16px 0 4px}table{border-collapse:collapse;width:100%;margin:6px 0}th,td{border:1px solid #bbb;padding:5px 7px;text-align:left;vertical-align:top;font-size:13px}th{background:#f2f4f7;width:28%}code{font:12px ui-monospace,Menlo,monospace;word-break:break-all}.q{white-space:pre-wrap}.open{background:#fff4dc;padding:4px 8px}.small{font-size:12px;color:#555}</style></head><body>`;
  h+=`<h1>Evidence record: ${E(d.title)}</h1><p class="small">Generated by DraftIt on ${E(nowISO())} (IST) for ${E(S.settings.userName)} (${E(S.settings.userId)}). Fingerprints are SHA-256 over canonical JSON with sorted keys. Produced from the parties’ own messages; not legal advice.</p>`;
  h+=`<h2>1. Parties</h2><table>${d.parties.map(p=>row(p.role,`${E(p.name)}, ${E(p.org)}`)).join('')}${row('Stamp duty',E(d.stamp.status==='paid'?'e-Stamp '+d.stamp.cert+' ('+d.stamp.state+')':d.stamp.status==='not_needed'?'Marked not needed by user':'Not recorded'))}</table><h2>2. Agreement versions</h2>`;
  if(!d.versions.length) h+=`<p>No version locked yet. Current draft: version ${d.draft?d.draft.rev:'—'}.</p>`;
  d.versions.forEach(x=>{ h+=`<h3>Version ${x.rev}</h3><table>${row('Locked at',E(x.frozenAt))}${row('SHA-256',`<code>${E(x.hash)}</code>`)}${row('Previous version hash',`<code>${E(x.prevHash||'none')}</code>`)}${row('Time stamp','Device clock, IST. Live app: RFC 3161 time-stamp token.')}${x.signatures.map(s=>row('Signed',`${E(s.name)} at ${E(s.at)} · ${E(s.method)} · signature hash <code>${E(s.sigHash)}</code>`)).join('')}${x.lawyer?row('Lawyer check',`${E(x.lawyer.name)}, enrolment ${E(x.lawyer.enrol)}, at ${E(x.lawyer.at)}, on hash <code>${E(x.lawyer.hash)}</code>. ${E(x.lawyer.noteKey?en(x.lawyer.noteKey).replace('{n}',(x.lawyer.noteP||{}).n):x.lawyer.note)}`):''}</table>`; });
  h+=`<h2>3. Clause by clause</h2><p class="small">Text of ${d.draft?'the current draft (version '+d.draft.rev+', not locked)':'version '+v.rev}.</p>`;
  cl.forEach((c,i)=>{ const keys=c.keys||clauseKeys(c.id), refs=[...new Set(keys.flatMap(k=>(d.terms[k]||{evidence:[]}).evidence))];
    h+=`<h3>${i+1}. ${E(en('h_'+c.id))}</h3><p>${E(c.text)}</p>${c.open?`<p class="open"><b>Not yet agreed:</b> ${E(c.open)}</p>`:''}<p class="small">Points: ${keys.map(k=>E(k)+' ('+E((d.terms[k]||{}).status||'missing')+')').join(', ')}</p>`;
    if(refs.length) h+=`<table>${refs.map(r=>{ const m=msgByRef(d,r); return m?row(`${r} · ${m.sender} · ${m.ts||'no time'}`,`<div class="q">${E(m.text)}</div>`):''; }).join('')}</table>`;
    const logs=d.clauseLog.filter(l=>l.clauseId===c.id); if(logs.length) h+=`<table>${logs.map(l=>row(`${l.at} · ${l.by==='@pakka'?'DraftIt (from chats)':l.by==='@both'?'Both parties':l.by}`,`${E(l.action)} (version ${l.rev})<div class="q">${E(l.text)}</div>`)).join('')}</table>`; });
  h+=`<h2>4. Conversation records, verbatim</h2>`;
  d.records.forEach(r=>{ h+=`<h3>${E(r.id)} · ${E(r.name)}</h3><table>${row('Source type',E(r.type))}${row('Uploaded by',E(r.uploadedByName)+' ('+E(r.uploadedBy)+')')}${row('Uploaded at',E(r.uploadedAt))}${row('Source time',E((r.sourceFrom||'—')+' to '+(r.sourceTo||'—')))}${row('Captured as',E(r.method))}${row('SHA-256 of original',`<code>${E(r.sha256)}</code>`)}${r.consent?row('Recording consent',E(r.consent.basis)+'; uploader confirmed being part of the conversation.'):''}</table><table>${r.messages.map(m=>row(`#${m.n} · ${m.sender} · ${m.ts||'no time'}`,`<div class="q">${E(m.text)}</div>`)).join('')}</table>`; });
  h+=`<h2>5. Hash value report</h2><p class="small">All fingerprints in one place, for preparing a certificate for electronic records under Section 63(4) of the Bharatiya Sakshya Adhiniyam, 2023.</p><table>${d.records.map(r=>row(r.id+' · '+r.name,`<code>${E(r.sha256)}</code>`)).join('')}${d.versions.map(x=>row('Agreement version '+x.rev,`<code>${E(x.hash)}</code>`)).join('')}${d.frozen?row('Frozen evidence snapshot ('+d.frozen.at+')',`<code>${E(d.frozen.hash)}</code>`):''}</table>`;
  h+=`<h2>6. Indian laws and standards checked</h2><p class="small">Category: ${E(catOf(d))} (${E(d.category&&d.category.by==='user'?'chosen by user':'detected by DraftIt')}). Automated checks; not legal advice.</p><table>${standards(d).map(x=>row(x.status.toUpperCase()+' · '+en('sdt_'+x.id),`${E(en(SD_KEY[x.id]))}<br><span class="small">${E(CITE[x.id])}</span>`)).join('')}</table>`;
  if(d.report) h+=`<h2>7. Report</h2><table>${row('Reported at',E(d.report.at))}${row('Reason',E(en('rs_'+d.report.reason)))}</table>`;
  return h+`</body></html>`;
}
async function doExport(kind){
  const d=deal(), name=`draft-it-${d.id.toLowerCase()}-${todayYMD()}.${kind}`, data=kind==='html'?buildReport(d):JSON.stringify({exportedAt:nowISO(),app:'DraftIt',deal:d},null,2);
  if(!DOWNLOADS&&STANDALONE){ downloadBlob(name,data); toast(t('o_savedFile')); return; }
  if(DOWNLOADS){ try{ await DOWNLOADS.save({filename:name,data}); toast(t('o_savedFile')); return; }catch(e){ if(e&&e.code==='declined') return; } }
  openSheet(sheetHead(t('download'),esc(name))+`<p class="small muted">${esc(t('noDownload'))}</p><textarea class="inp mono" id="expText" readonly style="min-height:240px">${esc(data)}</textarea><button class="btn" data-act="copyExport">${ic('copy',18)} ${esc(t('copy'))}</button>`);
}

/* ---------- misc ---------- */
let toastT=null;
function toast(msg){ const el=$('#toast'); el.textContent=msg; el.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>{ el.hidden=true; },3200); }
function copy(text,fb){ const sel=()=>{ if(fb){ fb.select(); } toast(t('copied')); }; try{ navigator.clipboard.writeText(text).then(()=>toast(t('copied')),sel); }catch(e){ sel(); } }
function syncInp(){ const ta=$('#inpText'); if(ta&&ui.inp) ui.inp.text=ta.value; }

/* ---------- events ---------- */
document.addEventListener('click',async e=>{
  const a=e.target.closest('[data-act]'); if(!a) return;
  const act=a.dataset.act, d=ui.dealId?deal():null;
  switch(act){
    case 'go': if(!$('#sheetWrap').hidden) closeSheet(); ui.view=a.dataset.v; stopSpeak(true); window.scrollTo(0,0); render(); break;
    case 'openDeal': if(!$('#sheetWrap').hidden) closeSheet(); ui.view='deal'; ui.dealId=a.dataset.id; ui.tab=a.dataset.tab||'terms'; ui.actor='me'; ui.docView='simple'; ui.traceClause=null; window.scrollTo(0,0); render(); break;
    case 'tab': ui.tab=a.dataset.v; stopSpeak(true); window.scrollTo(0,0); render(); break;
    case 'closeSheet': closeSheet(); break;
    case 'langSheet': langSheet(); break;
    case 'setLang': S.settings.lang=a.dataset.v; try{ localStorage.setItem('draftit.lang',a.dataset.v); }catch(err){} S.settings.voiceURI=''; ui.tr.failed=false; stopSpeak(true); save(); if(a.dataset.close) closeSheet(); render(); ensureTr(); break;
    case 'retryTr': ui.tr.failed=false; ensureTr(); break;
    case 'addAny': if(ui.view==='deal'&&d){ ui.inp=null; addEvidenceSheet(); } else pickDealSheet(); break;
    case 'pickDeal': ui.dealId=a.dataset.id; ui.view='deal'; ui.tab='evidence'; render(); ui.inp=null; addEvidenceSheet(); break;
    case 'newDeal': newDealSheet(); break;
    case 'ndRole': $('#ndRole').querySelectorAll('button').forEach(b=>{ b.setAttribute('aria-checked',b===a); b.classList.toggle('on',b===a); }); break;
    case 'createDeal': { const title=$('#ndTitle').value.trim(), name=$('#ndName').value.trim(), org=$('#ndOrg').value.trim(); if(!title||!name) return toast(t('e_deal'));
      const pick=$('#ndRole [aria-checked="true"]'); if(!pick){ toast(t('sidePick')); const r=$('#ndRole'); if(r){ r.classList.add('shake'); setTimeout(()=>r.classList.remove('shake'),500); } return; }
      const role=pick.dataset.v, id='D-'+Date.now().toString(36).slice(-4).toUpperCase();
      const nd=newDealObj(id,title,nowISO(),[{id:'me',name:S.settings.userName,org:S.settings.business,role},{id:'cp',name,org:org||name,role:role==='Seller'?'Buyer':'Seller'}]); nd.terms=fillMissing({});
      S.deals.unshift(nd); save(); ui.dealId=id; ui.view='deal'; ui.tab='evidence'; render(); ui.inp=null; addEvidenceSheet(); break; }
    case 'addEvidence': ui.inp=null; addEvidenceSheet(); break;
    case 'asrRun': if(ui.inp){ ui.inp.asr=null; transcribe(ui.inp); } break;
    case 'srcType': ui.inp=blankInp(a.dataset.v); addEvidenceSheet(); break;
    case 'ocr': { syncInp(); const x=ui.inp; if(!x.file) break; x.busy=true; x.status=t('readingPhoto'); addEvidenceSheet(); try{ x.text=await ocrBlobs([x.file]); x.method='ocr'; x.status=''; }catch(err){ x.status=t('noPdfText'); } x.busy=false; addEvidenceSheet(); break; }
    case 'saveRecord': await saveRecord(); break;
    case 'analyse': if(d) analyseDeal(d); break;
    case 'termSheet': termSheet(a.dataset.k); break;
    case 'recordSheet': recordSheet(a.dataset.id); break;
    case 'recDelAsk': { const r=d&&d.records.find(x=>x.id===a.dataset.id); if(!r) break; const locked=d.versions.filter(v=>v.payload.evidence.some(e=>e.id===r.id)).map(v=>v.rev);
      if(locked.length){ openSheet(`<div class="stack" style="align-items:center;text-align:center"><span class="warn-ico" style="background:var(--navy-t);color:var(--brand)">${ic('lock',28)}</span><h2 class="h2" id="sheetTitle">${esc(t('delLockedT'))}</h2><p class="small muted">${esc(t('delLockedB',{n:locked.join(', ')}))}</p></div><button class="btn sec full" data-act="closeSheet">${esc(t('close'))}</button>`); break; }
      openSheet(`<div class="stack" style="align-items:center;text-align:center"><span class="warn-ico">${ic('trash',28)}</span><h2 class="h2" id="sheetTitle">${esc(t('delEvidenceQ'))}</h2><p><b>${esc(recName(r))}</b> · <span class="mono">${esc(r.id)}</span></p><p class="small muted">${esc(t('delEvidenceB'))}</p></div><div class="stack-s"><button class="btn danger full" data-act="recDel" data-id="${r.id}">${ic('trash',18)} ${esc(t('delEvidenceYes'))}</button><button class="btn sec full" data-act="closeSheet">${esc(t('cancel'))}</button></div>`); break; }
    case 'recDel': { const r=d&&d.records.find(x=>x.id===a.dataset.id); if(!r) break; closeSheet();
      const pre=r.id+'#', keep=ref=>!(typeof ref==='string'&&ref.startsWith(pre));
      d.records=d.records.filter(x=>x!==r); if(r.media&&r.media.path&&useStorage(d)) cloudRemoveFiles([r.media.path]);
      Object.keys(d.terms||{}).forEach(k=>{ const tm=d.terms[k]; if(!tm) return; const before=(tm.evidence||[]).length; tm.evidence=(tm.evidence||[]).filter(keep); tm.history=(tm.history||[]).filter(h=>!h||keep(h.ref)); if(before&&!tm.evidence.length) d.terms[k]=T('missing'); });
      (d.flags||[]).forEach(f=>{ if(Array.isArray(f.refs)) f.refs=f.refs.filter(keep); });
      save(); ui.keep=true; render(); toast(t('delEvidenceDone',{x:r.id})); analyseDeal(d); break; }
    case 'verifyRecord': { const r=d.records.find(x=>x.id===a.dataset.id), h=await sha256Text(r.rawText); $('#recVerify').innerHTML=verifyHtml({ok:h===r.textSha,stored:r.textSha,computed:h}); break; }
    case 'copyAsk': copy(ft(d.flags[+a.dataset.i].ask)); break;
    case 'copyText': copy(a.dataset.text); break;
    case 'clauseSheet': clauseSheet(a.dataset.id); break;
    case 'editClause': editClauseSheet(a.dataset.id); break;
    case 'proposeEdit': { const c=d.draft.clauses.find(x=>x.id===a.dataset.id), text=$('#edText').value.trim(), open=$('#edOpen').value.trim(); if(!text) return toast(t('e_empty'));
      if(text===tx(c.text)&&open===tx(c.open)){ closeSheet(); break; }
      c.pending={text,open,by:ui.actor,at:nowISO()}; log(d,c.id,d.draft.rev,'proposed',text,partyName(d,ui.actor),nowISO()); save(); closeSheet(); ui.keep=true; render(); toast(t('o_sent')); ensureTr(); break; }
    case 'acceptChange': { const c=d.draft.clauses.find(x=>x.id===a.dataset.id); c.text=c.pending.text; c.open=c.pending.open; c.edited=true; log(d,c.id,d.draft.rev,'accepted',c.text,partyName(d,ui.actor),nowISO(),{k:'n_proposedBy',p:{name:partyName(d,c.pending.by)}}); c.pending=null; save(); ui.keep=true; render(); toast(t('o_accepted')); break; }
    case 'rejectChange': { const c=d.draft.clauses.find(x=>x.id===a.dataset.id); log(d,c.id,d.draft.rev,'rejected',c.pending.text,partyName(d,ui.actor),nowISO(),{k:'n_proposedBy',p:{name:partyName(d,c.pending.by)}}); c.pending=null; save(); ui.keep=true; render(); toast(t('o_rejected')); break; }
    case 'withdraw': { const c=d.draft.clauses.find(x=>x.id===a.dataset.id); log(d,c.id,d.draft.rev,'rejected',c.pending.text,partyName(d,ui.actor),nowISO(),{k:'n_withdrawn'}); c.pending=null; save(); ui.keep=true; render(); break; }
    case 'actor': ui.actor=a.dataset.v; ui.keep=true; render(); break;
    case 'createDraft': createDraft(d); ui.tab='agreement'; render(); break;
    case 'freeze': await freeze(d); if(!isLawyer()){ ui.sg=null; signSheet(ui.actor||'me'); } break;
    case 'newRev': newRevision(d); render(); toast(t('o_newRev',{n:d.draft.rev})); ensureTr(); break;
    case 'signSheet': signSheet(a.dataset.p); break;
    case 'sigClear': initSigPad(); break;
    case 'doSign': { const v=latestVersion(d); if(!$('#sigOk').checked) return toast(t('e_tick')); const method=(document.querySelector('input[name=sigm]:checked')||{}).value||'drawn'; if(method==='drawn'&&!sig.has) return toast(t('e_draw'));
      const p=d.parties.find(x=>x.id===a.dataset.p); await signVersion(v,p,sig.has?sig.c.toDataURL('image/png'):null,method,nowISO()); save(); closeSheet(); ui.keep=true; render();
      toast(v.signatures.length>=2?t('o_signedBoth',{n:v.rev}):t('o_signedOne',{name:first(d.parties.find(x=>!v.signatures.some(s=>s.party===x.id)).name)})); break; }
    case 'verify': { const v=d.versions.find(x=>x.rev===+a.dataset.rev), r=await verifyVersion(v,false); ui.verify[d.id+':'+v.rev]=r; if(a.dataset.sheet) $('#verOut').innerHTML=verifyHtml(r); else { ui.keep=true; render(); } break; }
    case 'tamper': { const v=d.versions.find(x=>x.rev===+a.dataset.rev), r=await verifyVersion(v,true); $('#verOut').innerHTML=verifyHtml(r)+`<p class="tiny">${esc(t('copyOnlyNote'))}</p>`; break; }
    case 'versionSheet': versionSheet(a.dataset.id,a.dataset.rev); break;
    case 'lawyerSheet': lawyerSheet(); break;
    case 'pickLawyer': ui.pickL=a.dataset.l; lawyerSheet(); break;
    case 'requestLawyer': { const l=LAWYERS.find(x=>x.id===a.dataset.l), v=latestVersion(d); d.lawyerReq={rev:v.rev,lawyerId:l.id,name:l.name,fee:l.fee,platform:PLATFORM_FEE,at:nowISO(),by:S.settings.userName,status:'pending'}; ui.pickL=null; save(); closeSheet(); ui.keep=true; render(); toast(t('reqPending',{name:l.name})); break; }
    case 'openAsLawyer': { const l=LAWYERS.find(x=>x.id===d.lawyerReq.lawyerId); ui.demoBack=S.session; useAccount(l.acct); ui.view='deal'; ui.tab='agreement'; ui.tut=null; window.scrollTo(0,0); render(); break; }
    case 'demoBack': { const id=ui.demoBack, dl=ui.dealId; ui.demoBack=null; useAccount(id); ui.view=dl?'deal':'home'; ui.tab='agreement'; window.scrollTo(0,0); render(); break; }
    case 'lawApprove': { const v=latestVersion(d), ac=acct(), note=(($('#lawNotes')||{}).value||'').trim(); v.lawyer={lawyerId:ac.lawyerId,name:ac.name,enrol:ac.enrol,at:nowISO(),hash:v.hash,fee:d.lawyerReq.fee,dsc:true}; if(note) v.lawyer.note=note; else { const open=v.payload.clauses.filter(c=>c.open).length; v.lawyer.noteKey=open?'lawyerNoteOpen':'lawyerNoteOk'; v.lawyer.noteP={n:open}; }
      d.lawyerReq.status='approved'; d.lawyerReq.doneAt=nowISO(); save(); ui.keep=true; render(); toast(t('o_lawyerOk',{name:ac.name,n:v.rev})); ensureTr(); break; }
    case 'lawNotes': { const note=(($('#lawNotes')||{}).value||'').trim(); if(!note) return toast(t('e_empty')); d.lawyerReq.status='notes'; d.lawyerReq.notes=note; d.lawyerReq.doneAt=nowISO(); save(); ui.view='home'; window.scrollTo(0,0); render(); toast(t('notesSent')); break; }
    case 'docView': ui.docView=a.dataset.v; ui.keep=true; stopSpeak(true); render(); break;
    case 'catSheet': catSheet(); break;
    case 'setCat': d.category={id:a.dataset.v,by:'user'}; save(); closeSheet(); ui.keep=true; render(); break;
    case 'reportSheet': ui.rs=null; reportSheet(); break;
    case 'rsFreeze': await freezeEvidence(d); reportSheet(); break;
    case 'copyRs': copy($('#rsText').value,$('#rsText')); break;
    case 'rsSubmit': { if(!d.frozen) await freezeEvidence(d); d.report={reason:(ui.rs||{}).reason||'nopay',at:nowISO()}; save(); reportSheet(); ui.keep=true; render(); toast(t('rsDone')); break; }
    case 'disputeSheet': disputeSheet(); break;
    case 'partySheet': partySheet(); break;
    case 'saveParties': { syncParties(d); save(); closeSheet(); ui.keep=true; render(); toast(t('o_savedDetails')); break; }
    case 'quoteSheet': quoteSheet(); break;
    case 'downloadQuote': { const q=ui.q; await saveFile(`quotation-${q.no.toLowerCase()}.html`,quoteFile(d,q)); break; }
    case 'exportFormal': await saveFile(`agreement-${d.id.toLowerCase()}-v${d.draft?d.draft.rev:latestVersion(d).rev}.html`,formalFile(d)); break;
    case 'notarySheet': notarySheet(); break;
    case 'confirmNotary': { const dt=$('#notDate').value; if(!dt) break; S.notary=S.notary||[]; S.notary.push({by:S.session,date:dt,at:nowISO()}); save(); closeSheet(); render(); toast(t('notaryBooked',{date:fmtD(dt,{day:'numeric',month:'long'})})); break; }
    case 'adSheet': adSheet(a.dataset.v); break;
    case 'snipToggle': S.settings.snip=!S.settings.snip; save(); if(S.settings.snip){ SN.open=true; toast(t('snipOnToast')); } else { SN.open=false; stopShare(); if(SN.pip&&!SN.pip.closed) SN.pip.close(); toast(t('snipOffToast')); } ui.keep=true; render(); break;
    case 'snipOpen': if(SN.pip&&!SN.pip.closed){ SN.pip.focus(); break; } SN.open=true; renderSnip(); break;
    case 'setLayout': S.settings.layout=a.dataset.v; try{ localStorage.setItem('draftit.lay',a.dataset.v); }catch(err){} save(); applyLayout(); ui.keep=true; render(); break;
    case 'sysEv': sysSheet(a.dataset.v); break;
    case 'calToday': ui.calMonth=todayYMD().slice(0,7); ui.calDay=null; render(); break;
    case 'adVisit': toast(t('sampleAd')); break;
    case 'openRoom': openRoom(a.dataset.id); break;
    case 'roomSend': roomSend(); break;
    case 'roomAs': ui.roomAs=a.dataset.v; render(); break;
    case 'chip': { const dd=deal(ui.roomDeal), cp=dd.parties.find(x=>x.id!=='me'); ui.roomDraft=t('sg_'+a.dataset.k); render(); const ri=$('#roomInput'); if(ri){ ri.focus(); ri.setSelectionRange(ri.value.length,ri.value.length); } break; }
    case 'roomInvite': inviteSheet(); break;
    case 'authJoin': { const A=ui.auth, code=roomCode(A.code||''); if(code.length<2) return toast(t('needCode')); ui.guestName=(A.gname||'').trim()||'Guest'; ui.view='room'; joinByCode(code); break; }
    case 'certSheet': certSheet(a.dataset.p); break;
    case 'verifySig': { const v=latestVersion(d), sg=v.signatures.find(x=>x.party===a.dataset.p), h2=await sha256Text(canon(sigBody(sg))), imgOk=!sg.img||!sg.imgSha||(await sha256Text(sg.img))===sg.imgSha; $('#sigOut').innerHTML=verifyHtml({ok:h2===sg.sigHash&&sg.versionHash===v.hash&&imgOk,stored:sg.sigHash,computed:h2}); break; }
    case 'sgMethod': ui.sg.m=a.dataset.v; signSheet(ui.sg.p); break;
    case 'sgBack': ui.sg.step='id'; ui.sg.otp=''; signSheet(ui.sg.p); break;
    case 'sgOtp': { const g=ui.sg; g.vid=String(g.vid||'').replace(/\D/g,''); if(!/^(\d{12}|\d{16})$/.test(g.vid)) return toast(t('needAadhaar')); g.step='otp'; signSheet(g.p); const o=document.querySelector('#sheet .otp'); if(o) o.focus(); break; }
    case 'doEsign': { const g=ui.sg, v=latestVersion(d); if(!/^\d{6}$/.test(String(g.otp||''))) return toast(t('needOtp')); if(!g.ok) return toast(t('e_tick'));
      const p=d.parties.find(x=>x.id===g.p), rnd=n=>Array.from(crypto.getRandomValues(new Uint8Array(n))).map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
      const cert={aadhaar:'XXXX XXXX '+g.vid.slice(-4),provider:'Demo eSign provider',txn:'ESP-'+rnd(6),serial:rnd(8),docHash:v.hash};
      await signVersion(v,p,null,'aadhaar',nowISO(),cert); ui.sg=null; save(); closeSheet(); ui.keep=true; render();
      toast(v.signatures.length>=2?t('o_signedBoth',{n:v.rev}):t('o_signedOne',{name:first(d.parties.find(x=>!v.signatures.some(s=>s.party===x.id)).name)})); break; }
    case 'integritySheet': integritySheet(null); integritySheet(await integrityCheck(d,false)); break;
    case 'runIntegrity': integritySheet(await integrityCheck(d,false)); break;
    case 'tamperIntegrity': integritySheet(await integrityCheck(d,true)); break;
    case 'compareSheet': ui.cmp=null; compareSheet(); break;
    case 'cmpSample': ui.cmp=ui.cmp||{text:'',name:'',busy:false,status:''}; ui.cmp.text=SAMPLE_PO; ui.cmp.name='Sample purchase order terms.txt'; ui.cmp.status=''; compareSheet(); break;
    case 'runCompare': { const ta=$('#cmpText'); if(ta&&ui.cmp) ui.cmp.text=ta.value; await runCompare(d); break; }
    case 'compareResult': compareResultSheet(a.dataset.id); break;
    case 'fillSample': syncInp(); await fillSample(); break;
    case 'ndSample': { closeSheet(); const nd=cloneTemplate(0,S.session); ui.dealId=nd.id; ui.view='deal'; ui.tab='terms'; window.scrollTo(0,0); render(); toast(t('o_sampleAdded')); break; }
    case 'readEl': readEl(a); break;
    case 'setTextSize': S.settings.textSize=a.dataset.v; try{ localStorage.setItem('draftit.ts',a.dataset.v); }catch(err){} save(); applyTextSize(); if(!$('#sheetWrap').hidden) langSheet(); else { ui.keep=true; render(); } break;
    case 'apiSave': { const k=(($('#apiKey')||{}).value||'').trim(); if(!k) break; const smp=makeApiSample(k); try{ await smp('Reply with the single word OK.',{modelTier:'quick'}); }catch(err){ return toast(t('apiBad')); } try{ localStorage.setItem('draftit.key',k); }catch(err){} SAMPLE=smp; S.settings.ai=true; save(); ui.keep=true; render(); toast(t('apiSaved')); ensureTr(); break; }
    case 'apiRemove': try{ localStorage.removeItem('draftit.key'); }catch(err){} SAMPLE=null; setupCloudAI(); ui.keep=true; render(); toast(t('apiRemoved')); break;
    case 'installApp': if(INSTALL){ INSTALL.prompt(); try{ await INSTALL.userChoice; }catch(err){} INSTALL=null; ui.keep=true; render(); } break;
    case 'rmLogo': { syncParties(d); const [pid,k]=a.dataset.v.split(':'), p=d.parties.find(x=>x.id===pid); p[k]=''; save(); partySheet(); break; }
    case 'sampleLogo': { syncParties(d); const [pid,k]=a.dataset.v.split(':'), p=d.parties.find(x=>x.id===pid); p[k]=sampleImage(p,k); save(); partySheet(); break; }
    case 'dlOriginal': { const r=d.records.find(x=>x.id===a.dataset.id); if(r&&r.media&&(r.media.data||r.media.path)){ let blob; try{ blob=r.media.path?await cloudFileBlob(r.media.path):await (await fetch(r.media.data)).blob(); }catch(err){ toast(t('noDownload')); break; } if(DOWNLOADS){ try{ await DOWNLOADS.save({filename:r.name,data:blob}); toast(t('o_savedFile')); }catch(e){ if(!(e&&e.code==='declined')) toast(t('noDownload')); } } else downloadBlob(r.name,blob); break; } if(r&&r.media&&r.media.src){ if(DOWNLOADS){ try{ await DOWNLOADS.save({filename:r.name,data:new Blob([audioBytes(r.media.src)],{type:'audio/mpeg'})}); toast(t('o_savedFile')); }catch(e){ if(!(e&&e.code==='declined')) toast(t('noDownload')); } } else { const aEl=document.createElement('a'); aEl.href=AUDIO[r.media.src]; aEl.download=r.name; document.body.appendChild(aEl); aEl.click(); aEl.remove(); } } break; }
    case 'roomSmart': roomSmart(); break;
    case 'roomSave': await roomSave(); break;
    case 'tutNext': stopSpeak(true); if(ui.tut>=TUT.length-1) endTutorial(); else { ui.tut++; render(); } break;
    case 'tutPrev': stopSpeak(true); ui.tut=Math.max(0,ui.tut-1); render(); break;
    case 'tutSkip': endTutorial(); break;
    case 'tutListen': if(ui.speaking==='tut') stopSpeak(); else { const k=TUT[ui.tut][0]; speakItems([{id:'tut',text:t(k+'T')+'. '+t(k+'B')}],S.settings.lang); } break;
    case 'tutorial': ui.tut=0; ui.view='home'; window.scrollTo(0,0); render(); break;
    case 'authMode': ui.auth.mode=a.dataset.v; ui.auth.step='form'; render(); break;
    case 'authRole': ui.auth.role=a.dataset.v; render(); break;
    case 'authBack': ui.auth.step='form'; ui.auth.otp=''; render(); break;
    case 'authOtp': if(SB){ const A=ui.auth; A.email=String(A.email||'').trim().toLowerCase(); A.mobile=String(A.mobile||'').replace(/\D/g,'');
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(A.email)) return toast(t('needEmail'));
      if(A.mode==='signup'){ if(!A.name.trim()) return toast(t('needName')); if(A.mobile&&!/^[6-9]\d{9}$/.test(A.mobile)) return toast(t('needName')); if(A.role==='lawyer'&&!A.enrol.trim()) return toast(t('needEnrol')); if(!A.terms) return toast(t('needTerms')); }
      A.busy=true; render(); let error=null;
      try{ ({error}=await SB.auth.signInWithOtp({email:A.email,options:{shouldCreateUser:A.mode==='signup',data:A.mode==='signup'?{name:A.name.trim(),role:A.role==='lawyer'?'lawyer':'user',business:A.business.trim()}:undefined}})); }catch(err){ error=err; }
      A.busy=false; if(error){ render(); return toast(A.mode==='login'&&/signup|not found|not allowed/i.test(String(error.message||''))?t('noAccountEmail'):t('codeSendFail')); }
      A.step='otp'; A.otp=''; render(); const o=document.querySelector('.otp'); if(o) o.focus(); break; }
      { const A=ui.auth; A.mobile=A.mobile.replace(/\D/g,''); if(!/^[6-9]\d{9}$/.test(A.mobile)) return toast(t('needName'));
      if(A.mode==='signup'){ if(!A.name.trim()) return toast(t('needName')); if(A.role==='lawyer'&&!A.enrol.trim()) return toast(t('needEnrol')); if(!A.terms) return toast(t('needTerms')); }
      else if(!Object.values(S.accounts).some(x=>x.mobile===A.mobile)) return toast(t('noAccountPhone'));
      A.step='otp'; render(); const o=document.querySelector('.otp'); if(o) o.focus(); break; }
    case 'authVerify': if(SB){ const A=ui.auth, code=String(A.otp||'').replace(/\D/g,''); if(!/^\d{6,10}$/.test(code)) return toast(t('needOtp'));
      A.busy=true; render(); let res=null;
      try{ res=await SB.auth.verifyOtp({email:A.email,token:code,type:'email'}); }catch(err){ res={error:err}; }
      if(res.error||!res.data||!res.data.user){ A.busy=false; render(); return toast(t('codeBad')); }
      try{ await loadCloud(res.data.user); }catch(err){ A.busy=false; cloud.uid=null; render(); return toast(t('cloudLoadFail')); }
      ui.demoBack=null; afterLogin(); break; }
      { const A=ui.auth; if(!/^\d{6}$/.test(A.otp)) return toast(t('needOtp'));
      if(A.mode==='signup'){ const id='u_'+A.name.trim().toLowerCase().replace(/[^a-z]/g,'').slice(0,8)+'_'+Date.now().toString(36).slice(-4); S.accounts[id]={id,name:A.name.trim(),mobile:A.mobile,role:A.role==='lawyer'?'lawyer':'user',business:A.role==='lawyer'?'':A.business.trim(),train:!!A.train,tutDone:false,created:nowISO()}; if(A.role==='lawyer') Object.assign(S.accounts[id],{lawyerId:'lw_'+id,enrol:A.enrol.trim(),bar:A.bar,fee:+A.fee||0}); useAccount(id); if(A.role!=='lawyer'){ cloneTemplate(1,id); cloneTemplate(0,id); } }
      else { const ac=Object.values(S.accounts).find(x=>x.mobile===A.mobile); if(!ac) return toast(t('noAccountPhone')); useAccount(ac.id); }
      afterLogin(); break; }
    case 'demoLogin': useAccount(a.dataset.id); ui.demoBack=null; afterLogin(); break;
    case 'logoutAsk': openSheet(`<div class="stack" style="align-items:center;text-align:center"><span class="warn-ico">${ic('logout',28)}</span><h2 class="h2" id="sheetTitle">${esc(t('logoutQ'))}</h2><p class="small muted">${esc(t(SB&&cloud.uid?'logoutSubCloud':'logoutSubLocal'))}</p></div><div class="stack-s"><button class="btn danger full" data-act="logout">${esc(t('logOutYes'))}</button><button class="btn sec full" data-act="closeSheet">${esc(t('cancel'))}</button></div>`); break;
    case 'logout': closeSheet(); stopSpeak(true); if(SB&&cloud.uid){ await cloudSignOut(); } else { S.session=null; save(); } ui.auth=null; ui.demoBack=null; ui.view='auth'; ui.dealId=null; window.scrollTo(0,0); render(); break;
    case 'deleteAcct': if(a.dataset.sure&&SB&&cloud.uid){ let error=null; await cloudRemoveFiles(S.deals.filter(x=>x.owner===cloud.uid).flatMap(x=>x.records.map(r=>r.media&&r.media.path))); try{ ({error}=await SB.rpc('delete_my_account')); }catch(err){ error=err; } if(error) return toast(t('saveFailed')); cloud.dirty=false; cloud.uid=null; try{ await SB.auth.signOut(); }catch(err){} S=null; await seedState(); ui.view='auth'; ui.auth=null; render(); toast(t('o_deleted')); }
      else if(a.dataset.sure){ const id=S.session; S.deals=S.deals.filter(x=>x.owner!==id); delete S.accounts[id]; S.session=null; save(); ui.view='auth'; ui.auth=null; render(); toast(t('o_deleted')); } else { a.dataset.sure='1'; a.textContent=t('deleteSure'); } break;
    case 'stampNotNeeded': d.stamp.status='not_needed'; save(); ui.keep=true; render(); break;
    case 'traceClause': ui.traceClause=a.dataset.id; ui.keep=true; render(); break;
    case 'exportHtml': doExport('html'); break;
    case 'exportJson': doExport('json'); break;
    case 'copyExport': copy($('#expText').value,$('#expText')); break;
    case 'speakDoc': speakDoc(); break;
    case 'stopSpeak': stopSpeak(); break;
    case 'calNav': { const [y,m]=ui.calMonth.split('-').map(Number); ui.calMonth=new Date(Date.UTC(y,m-1+(+a.dataset.v),1)).toISOString().slice(0,7); ui.calDay=null; render(); break; }
    case 'calDay': ui.calDay=ui.calDay===a.dataset.v?null:a.dataset.v; ui.calMonth=a.dataset.v.slice(0,7); ui.keep=true; render(); break;
    case 'testVoice': speakItems([{id:'test',text:t('testSentence')}],S.settings.lang); break;
    case 'reset': if(a.dataset.sure){ try{ localStorage.removeItem(STORE); }catch(err){} const keep=S; S=null; render(); S=keep; await seedState(); ui.view='auth'; ui.auth=null; ui.demoBack=null; render(); toast(t('o_reset')); } else { a.dataset.sure='1'; a.textContent=t('resetSure'); } break;
  }
});
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&!$('#sheetWrap').hidden) closeSheet(); });
document.addEventListener('change',async e=>{
  const el=e.target, k=el.dataset.change, f=el.dataset.file, d=ui.dealId?deal():null;
  if(el.dataset.auth&&ui.auth){ ui.auth[el.dataset.auth]=el.type==='checkbox'?el.checked:el.value; return; }
  if(el.dataset.sg&&ui.sg){ ui.sg[el.dataset.sg]=el.type==='checkbox'?el.checked:el.value; return; }
  if(el.dataset.cmpfile&&ui.cmp){ const file=el.files[0]; if(!file) return; const ta=$('#cmpText'); if(ta) ui.cmp.text=ta.value; ui.cmp.busy=true; ui.cmp.status=t('cmpReading'); compareSheet(); try{ const r=await fileText(file); ui.cmp.text=r.text; ui.cmp.name=file.name; ui.cmp.status=r.text?'':t('noPdfText'); }catch(err){ ui.cmp.status=t('noPdfText'); } ui.cmp.busy=false; compareSheet(); return; }
  if(el.dataset.logo&&d){ const file=el.files[0]; if(!file) return; syncParties(d); const [pid,k]=el.dataset.logo.split(':'), p=d.parties.find(x=>x.id===pid); p[k]=await shrinkPng(await readAs(file,'url'),240); save(); partySheet(); return; }
  if(el.dataset.chkfile&&d){ const file=el.files[0]; if(!file) return; const r=d.records.find(x=>x.id===el.dataset.chkfile), h=await sha256Bytes(new Uint8Array(await readAs(file,'buf'))); $('#chkOut').innerHTML=verifyHtml({ok:h===r.sha256,stored:r.sha256,computed:h})+`<span class="tiny">${esc(file.name)}</span>`; return; }
  if(el.dataset.q&&ui.q){ ui.q[el.dataset.q]=el.type==='checkbox'?el.checked:el.value; const tq=$('#qTotal'); if(tq) tq.textContent=rupee(quoteCalc(ui.q).total); return; }
  if(f){ syncInp(); await onFile(f,el.files[0]); return; }
  if(!k) return; const s=S.settings;
  if(k==='setName') s.userName=el.value.trim()||s.userName;
  if(k==='setBiz') s.business=el.value.trim()||s.business;
  if(k==='setVoice') s.voiceURI=el.value;
  if(k==='setAi'){ s.ai=el.checked; save(); render(); ensureTr(); return; }
  if(k==='setTrain'){ const ac=acct(); if(ac){ ac.train=el.checked; save(); ui.keep=true; render(); } return; }
  if(k==='rsReason'){ ui.rs={reason:el.value}; reportSheet(); return; }
  if(k==='setName'){ const ac=acct(); if(ac&&el.value.trim()) ac.name=el.value.trim(); }
  if(k==='setBiz'){ const ac=acct(); if(ac&&el.value.trim()) ac.business=el.value.trim(); }
  if(k==='stampState'&&d) d.stamp.state=el.value;
  if(k==='stampCert'&&d){ d.stamp.cert=el.value.trim(); d.stamp.status=d.stamp.cert?'paid':'not_paid'; save(); ui.keep=true; render(); return; }
  if(ui.inp&&(k==='asrLang'||k==='asrModel')){ syncInp(); const x=ui.inp; x[k]=el.value; if(x.asr&&['prep','load','run'].includes(x.asr.state)){ addEvidenceSheet(); return; } x.asr=null; if(x.file) transcribe(x); else addEvidenceSheet(); return; }
  if(ui.inp&&['consent','speaker','srcTime','party'].includes(k)){ syncInp(); if(k==='party') ui.inp.party=el.checked; else ui.inp[k]=el.value; addEvidenceSheet(); return; }
  save();
});
document.addEventListener('input',e=>{ const el=e.target;
  if(el.dataset.auth&&ui.auth&&el.type!=='checkbox'){ ui.auth[el.dataset.auth]=el.value; return; }
  if(el.dataset.sg&&ui.sg&&el.type!=='checkbox'){ ui.sg[el.dataset.sg]=el.value; return; }
  if(el.dataset.cmp&&ui.cmp){ ui.cmp[el.dataset.cmp]=el.value; return; }
  if(el.dataset.q&&ui.q&&el.type!=='checkbox'){ ui.q[el.dataset.q]=el.value; const tq=$('#qTotal'); if(tq) tq.textContent=rupee(quoteCalc(ui.q).total); return; }
  if(el.id==='roomInput'){ ui.roomDraft=el.value; const w=$('#roomWarn'); if(w) w.hidden=!FRAUD_RE.test(el.value); el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,140)+'px'; return; }
  if(el.dataset.input&&ui.inp) ui.inp[el.dataset.input]=el.value; });
document.addEventListener('keydown',e=>{ if(e.target&&e.target.id==='roomInput'&&e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); roomSend(); } });
if('speechSynthesis' in window){ try{ speechSynthesis.onvoiceschanged=()=>{ if(ui.view==='settings') render(); }; speechSynthesis.getVoices(); }catch(e){} }

/* Android back button: close what is open, then go back, then leave the app */
function setupNative(){ const A=NP('App'); if(!A||setupNative.done) return; setupNative.done=true;
  A.addListener('backButton',()=>{ if(document.querySelector('.crop-wrap')) return; if(!$('#sheetWrap').hidden){ closeSheet(); return; } if(typeof SN!=='undefined'&&SN.open){ SN.open=false; renderSnip(); return; } if(ui.tut!=null){ endTutorial(); return; }
    if(ui.view==='room'&&ui.roomDeal&&!ui.guest){ ui.view='deal'; ui.dealId=ui.roomDeal; render(); return; }
    if(ui.view!=='home'&&ui.view!=='auth'){ ui.view='home'; window.scrollTo(0,0); render(); return; } A.exitApp(); }); }
/* read-only hook for automated tests and debugging in the browser console */
Object.defineProperty(window,'__draftit',{value:Object.freeze({state:()=>S,integrity:(d,t)=>integrityCheck(d,t)})});
(async function boot(){
  setupNative();
  initCloud();
  if(SB){ render(); await seedState(); S.session=null; let user=null;
    try{ const {data}=await SB.auth.getSession(); user=data&&data.session&&data.session.user; }catch(e){}
    if(user){ try{ await loadCloud(user); ui.view='home'; const a=acct(); ui.tut=a&&!a.tutDone&&a.role!=='lawyer'?0:null; }catch(e){ cloud.uid=null; S.session=null; ui.view='auth'; toast(t('cloudLoadFail')); } } else ui.view='auth';
    render(); ensureTr(); openHashRoom(); takeShared(); return; }
  S=load(); render(); if(!S) await seedState(); if(acct()){ ui.view='home'; if(isLawyer()) ui.tut=null; } else ui.view='auth'; render(); ensureTr(); openHashRoom(); takeShared(); })();
})();
