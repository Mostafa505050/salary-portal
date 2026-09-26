// _worker-V10-ULTIMATE-FIX.js - الحل النهائي للـ Redirect Loop
// لا يوجد أي redirect داخله نهائياً

const HARDCODED_TURSO_URL = "https://company-alldata-mostafadarwish-mostafa505050.aws-eu-west-1.turso.io";
const HARDCODED_TURSO_TOKEN = "";

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

function addSecurityHeaders(response){
  try{
    const newHeaders = new Headers(response.headers);
    for(const [k,v] of Object.entries(SECURITY_HEADERS)){ if(!newHeaders.has(k)) newHeaders.set(k, v); }
    newHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    newHeaders.set('Pragma', 'no-cache');
    return new Response(response.body, {status: response.status, headers: newHeaders});
  }catch{ return response; }
}

async function hashPatternSecure(patternValue, nationalId){
  try{
    const clean = String(patternValue).replace(/[^0-9,]/g,'').substring(0,50);
    const salt = String(nationalId).trim();
    const data = new TextEncoder().encode(clean + '|' + salt + '|pattern_pepper_v7');
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }catch{ return String(patternValue); }
}
async function hashFaceSecure(faceHashAttempt, nationalId){
  try{
    const salt = String(nationalId).trim();
    const data = new TextEncoder().encode(String(faceHashAttempt).trim() + '|' + salt + '|face_pepper_v7_server');
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }catch{ return String(faceHashAttempt); }
}

const ENTRY_COOKIE_NAME = 'entry_via_index';

function getCookieFixed(request, name){
  try{
    const cookieHeader = request.headers.get('Cookie') || '';
    const cookies = cookieHeader.split(';').map(c=>c.trim());
    for(const c of cookies){
      const [k,...rest] = c.split('=');
      if(k && k.trim()===name) return rest.join('=').trim();
    }
  }catch{}
  return null;
}

function hasValidEntry(request){
  const entryCookie = getCookieFixed(request, ENTRY_COOKIE_NAME);
  if(entryCookie && entryCookie==='1') return true;
  try{
    const ref = request.headers.get('Referer') || '';
    if(!ref) return false;
    const lowRef = ref.toLowerCase();
    if(lowRef.includes('index.html') || lowRef.includes('index-secure-professional') || lowRef.includes('index-secure')) return true;
    if(lowRef.endsWith('/') || lowRef.includes('/index')) return true;
    try{
      const refUrl = new URL(ref);
      const reqUrl = new URL(request.url);
      if(refUrl.hostname === reqUrl.hostname) return true;
    }catch{}
  }catch{}
  return false;
}

function isEntryHtmlPage(path){
  const low = path.toLowerCase();
  if(['/api/','/js/','.js','.css','.json','.png','.jpg','.svg','.ico','whitelist','allowed-ips','block-device','get-ip','blocked-devices','blocked-list','turso','cache-','favicon','protect.js','real-logger.js','debug-config','break-loop','clear-loop'].some(s=> low.includes(s.toLowerCase()))) return false;
  let pageName = path.split('/').pop() || '';
  if(path==='/' || path==='' || pageName==='' ) return false;
  if(pageName.toLowerCase()==='index.html') return false;
  if(low.includes('index-secure-professional.html')) return false;
  if(path.endsWith('.html')) return true;
  if(!pageName.includes('.') && !path.startsWith('/api/')) return true;
  return false;
}

function entryBlockedHTML(pageName){
  return `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>الدخول عبر الرئيسية</title><style>body{min-height:100vh;background:#0a0e1a;color:#fff;display:flex;align-items:center;justify-content:center;font-family:Cairo} .box{background:rgba(255,255,255,0.08);padding:40px;border-radius:24px;text-align:center} h1{color:#f59e0b} a{display:inline-block;margin-top:15px;padding:12px 30px;background:#10b981;color:#fff;text-decoration:none;border-radius:10px}</style></head><body><div class="box"><div style="font-size:56px">🔐</div><h1>الدخول عبر الرئيسية فقط</h1><p>${pageName}</p><a href="/index.html?v=${Date.now()}">الرئيسية</a></div></body></html>`;
}

function addEntryCookieToResponse(response){
  try{
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Set-Cookie', `${ENTRY_COOKIE_NAME}=1; Path=/; Max-Age=3600; SameSite=Lax`);
    newHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    newHeaders.set('Pragma', 'no-cache');
    for(const [k,v] of Object.entries(SECURITY_HEADERS)) newHeaders.set(k,v);
    return new Response(response.body, {status:response.status, headers:newHeaders});
  }catch{ return response; }
}

const SECURE_LOGIN_CONFIG = {
  NATIONAL_ID_REGEX: /^\d{14}$/,
  CODE_REGEX: /^[A-Za-z0-9_\-]{2,30}$/,
  TOKEN_BYTES: 32,
  RATE_LIMIT_WINDOW_MS: 60*1000,
  RATE_LIMIT_MAX: 20
};
let LOGIN_RATE_LIMIT = new Map();
function isValidNationalIdSecure(id){ return typeof id === 'string' && SECURE_LOGIN_CONFIG.NATIONAL_ID_REGEX.test(id.trim()); }
function generateSecureTokenFixed(){
  try{ const arr=new Uint8Array(SECURE_LOGIN_CONFIG.TOKEN_BYTES); crypto.getRandomValues(arr); let hex=''; for(let i=0;i<arr.length;i++) hex+=arr[i].toString(16).padStart(2,'0'); return `sec_${hex}_${Date.now()}_${crypto.randomUUID()}`; }catch{ return `sec_${Math.random().toString(36).slice(2)}_${Date.now()}`; }
}
function checkRateLimitSecure(ip, endpoint){
  const key=`${ip}:${endpoint}`; const now=Date.now(); const entry=LOGIN_RATE_LIMIT.get(key);
  if(!entry){ LOGIN_RATE_LIMIT.set(key,{count:1,resetTime:now+SECURE_LOGIN_CONFIG.RATE_LIMIT_WINDOW_MS}); return {allowed:true}; }
  if(now>entry.resetTime){ LOGIN_RATE_LIMIT.set(key,{count:1,resetTime:now+SECURE_LOGIN_CONFIG.RATE_LIMIT_WINDOW_MS}); return {allowed:true}; }
  entry.count++; if(entry.count>SECURE_LOGIN_CONFIG.RATE_LIMIT_MAX){ const retryAfter=Math.ceil((entry.resetTime-now)/1000); return {allowed:false,retryAfter}; }
  LOGIN_RATE_LIMIT.set(key,entry); return {allowed:true};
}
function safeRowToObject(cols,row){ const obj={}; row.forEach((cell,i)=>{ const key=cols[i]; if(!key) return; if(key.includes('__proto__')||key.includes('constructor')) return; obj[key]=cell.value??cell.text??''; }); return obj; }
function constantTimeCompare(a,b){ const sa=String(a); const sb=String(b); if(sa.length!==sb.length) return false; let result=0; for(let i=0;i<sa.length;i++) result|=sa.charCodeAt(i)^sb.charCodeAt(i); return result===0; }

function getTursoConfig(env){
  let url = (env.TURSO_URL || HARDCODED_TURSO_URL || '').trim();
  let token = (env.TURSO_TOKEN || HARDCODED_TURSO_TOKEN || '').trim();
  if(!url) return {url:null, token:null, error:'TURSO_URL غير موجود'};
  if(!token || token.length < 10) return {url:null, token:null, error:'TURSO_TOKEN فارغ'};
  if(url.startsWith('libsql://')) url='https://'+url.slice(8);
  if(url &&!url.startsWith('https://')) url='https://'+url;
  return {url, token, error:null};
}

async function tursoQuery(env, sql, params=[]){
  const cfg = getTursoConfig(env);
  if(cfg.error) return {error: cfg.error, isConfigError:true};
  try{
    const args = params.map(v=>({type:'text', value:String(v)}));
    const res = await fetch(`${cfg.url}/v2/pipeline`, {method:'POST', headers:{'Authorization':`Bearer ${cfg.token}`, 'Content-Type':'application/json'}, body: JSON.stringify({requests:[{type:'execute', stmt:{sql, args}}, {type:'close'}]})});
    if(!res.ok){ const txt = await res.text().catch(()=>res.statusText); return {error:`HTTP ${res.status}: ${txt.substring(0,200)}`}; }
    const data = await res.json();
    if(data.results?.[0]?.error) return {error: data.results[0].error.message};
    return {result: data.results?.[0]?.response?.result};
  }catch(e){ return {error:e.message}; }
}

async function fetchAssetWithCleanUrls(request, env){
  const url=new URL(request.url);
  let path=url.pathname.replace(/\/+/g,'/');
  const lowPath = path.toLowerCase();
  const candidates=[]; 
  if(lowPath === '/' || lowPath === '/index.html' || lowPath === '/index-secure-professional.html' || lowPath === '/index-secure-professional'){
    candidates.push('/index.html');
    candidates.push('/Index-Secure-Professional.html');
    candidates.push('/index-secure-professional.html');
  } else {
    candidates.push(path);
    const hasExt=path.split('/').pop()?.includes('.')||false;
    if(!hasExt && path!=='/'){
      candidates.push(path+'.html');
      candidates.push('/'+path.split('/').pop()+'.html');
    }
  }
  const unique = [...new Set(candidates)];
  for(const candPath of unique){
    try{
      const candUrl=new URL(request.url); candUrl.pathname=candPath;
      const candReq=new Request(candUrl.toString(), {method:'GET', headers: request.headers});
      if(env.ASSETS){
        const res=await env.ASSETS.fetch(candReq);
        if(res && res.status!==404) return res;
      }
    }catch{ continue; }
  }
  try{ 
    if(env.ASSETS) return await env.ASSETS.fetch(request);
    return null;
  }catch{ return null; }
}

export default {
  async fetch(request, env, ctx){
    const url=new URL(request.url); 
    const path=url.pathname;
    const lowPath = path.toLowerCase();

    if(request.method==='OPTIONS'){
      return new Response(null,{status:204, headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'}});
    }

    if(lowPath === '/api/break-loop' || lowPath === '/api/clear-loop'){
      return new Response(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Break Loop</title></head><body style="font-family:Cairo;padding:40px"><h1>تم مسح الكوكيز والكاش</h1><p>الآن افتح:</p><a href="/index.html?nocache=${Date.now()}">/index.html?nocache</a><script>document.cookie="entry_via_index=; Path=/; Max-Age=0"; localStorage.clear(); sessionStorage.clear();</script></body></html>`, {
        headers:{'Content-Type':'text/html; charset=utf-8','Set-Cookie':`entry_via_index=; Path=/; Max-Age=0`,'Cache-Control':'no-store'}
      });
    }

    if(isEntryHtmlPage(path)){
      if(!hasValidEntry(request)){
        return new Response(entryBlockedHTML(path.split('/').pop()||path),{status:403, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
      }
    }

    if(path==='/api/debug-config'){
      const cfg = getTursoConfig(env);
      const hasAssets = !!env.ASSETS;
      const cookie = request.headers.get('Cookie')||'';
      return new Response(JSON.stringify({
        v: 'V10-ULTIMATE-FIX',
        hasAssets,
        tursoConfigured: !cfg.error,
        hasEntryCookie: cookie.includes(ENTRY_COOKIE_NAME),
        fix: 'إصلاح نهائي للـ Redirect Loop - لا يوجد أي redirect في الكود',
        time: new Date().toISOString()
      }, null, 2), {headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}});
    }

    if(path==='/api/get-ip'){
      const ip=request.headers.get('CF-Connecting-IP')||'unknown';
      return new Response(JSON.stringify({ip}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*'}});
    }

    if(path==='/api/check-by-card-secure' && request.method==='POST'){
      try{
        const ip=request.headers.get('CF-Connecting-IP')||'unknown';
        const rl=checkRateLimitSecure(ip,'check-card');
        if(!rl.allowed) return new Response(JSON.stringify({ok:false,msg:'محاولات كثيرة'}),{status:429,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        const body=await request.json().catch(()=>({}));
        const cardNumber=String(body.cardNumber||'').trim();
        if(!isValidNationalIdSecure(cardNumber)) return new Response(JSON.stringify({ok:false,msg:'رقم البطاقة 14 رقم'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        let q = await tursoQuery(env, `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`, [cardNumber]);
        if(q.isConfigError) return new Response(JSON.stringify({ok:false,msg:q.error}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        if(q.error){ let q2 = await tursoQuery(env, `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومي"=? LIMIT 1`, [cardNumber]); if(!q2.error) q=q2; }
        if(!q.result?.rows||q.result.rows.length===0) return new Response(JSON.stringify({ok:false,msg:'غير موجود'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        const cols=q.result.cols.map(c=>c.name); const userObj=safeRowToObject(cols,q.result.rows[0]);
        const safeUser={...userObj}; delete safeUser['كلمة_المرور'];
        return new Response(JSON.stringify({ok:true,user:safeUser}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      }catch(e){ return new Response(JSON.stringify({ok:false,msg:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }
    }

    if(path==='/api/get-routing-secure'){
      try{
        const nationalId=url.searchParams.get('nationalId')?.trim()||''; const code=url.searchParams.get('code')?.trim()||'';
        const q=await tursoQuery(env, `SELECT * FROM "توجيه_المستخدمين" WHERE ("الرقم_القومى"=? OR "الكود_البنكى"=?) AND "مفعلة"=1 LIMIT 1`, [nationalId,code]);
        if(q.error||!q.result?.rows||q.result.rows.length===0) return new Response(JSON.stringify({found:false}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        const cols=q.result.cols.map(c=>c.name); const routing=safeRowToObject(cols,q.result.rows[0]); return new Response(JSON.stringify({found:true,routing}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      }catch(e){ return new Response(JSON.stringify({found:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }
    }

    if(path==='/api/verify-password-secure' && request.method==='POST'){
      try{
        const body=await request.json().catch(()=>({})); const cardNumber=String(body.cardNumber||'').trim(); const password=String(body.password||'').trim();
        if(!isValidNationalIdSecure(cardNumber)) return new Response(JSON.stringify({ok:false,msg:'بيانات غير صحيحة'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        const q=await tursoQuery(env, `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`, [cardNumber]);
        if(q.error||!q.result?.rows||q.result.rows.length===0) return new Response(JSON.stringify({ok:false,msg:'بيانات غير صحيحة'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        const cols=q.result.cols.map(c=>c.name); const userObj=safeRowToObject(cols,q.result.rows[0]); const storedPass=String(userObj['كلمة_المرور']||'').trim();
        if(!constantTimeCompare(storedPass,password)) return new Response(JSON.stringify({ok:false,msg:'بيانات غير صحيحة'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        const token=generateSecureTokenFixed(); return new Response(JSON.stringify({ok:true,token,role:userObj['الصلاحيات']||'User'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      }catch(e){ return new Response(JSON.stringify({ok:false,msg:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }
    }

    if(path==='/api/register-by-card-secure' && request.method==='POST'){
      try{
        const body=await request.json().catch(()=>({})); const cardNumber=String(body.cardNumber||'').trim(); let bio=String(body.bio||'').trim(); const password=String(body.password||'').trim();
        if(!isValidNationalIdSecure(cardNumber)) return new Response(JSON.stringify({ok:false,msg:'رقم غير صالح'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        try{
          const bioObj=JSON.parse(bio);
          if(bioObj.type==='pattern'&&bioObj.value){ const hashed=await hashPatternSecure(bioObj.value,cardNumber); bioObj.hash=hashed; bioObj.value=undefined; bio=JSON.stringify(bioObj); }
          if(bioObj.type==='face_camera'&&bioObj.hash){ const serverHash=await hashFaceSecure(bioObj.hash,cardNumber); bioObj.serverHash=serverHash; bio=JSON.stringify(bioObj); }
        }catch{}
        const updateQ=await tursoQuery(env, `UPDATE "موظفين_مرتبات" SET "بصمة"=?, "كلمة_المرور"=? WHERE "الرقم_القومى"=?`, [bio,password,cardNumber]);
        if(updateQ.error) return new Response(JSON.stringify({ok:false,msg:updateQ.error}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      }catch(e){ return new Response(JSON.stringify({ok:false,msg:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }
    }

    if(path==='/api/bio-login-by-card-secure' && request.method==='POST'){
      try{
        const body=await request.json().catch(()=>({})); const cardNumber=String(body.cardNumber||'').trim(); const bioAttempt=body.bioAttempt?String(body.bioAttempt).trim():null;
        if(!isValidNationalIdSecure(cardNumber)) return new Response(JSON.stringify({ok:false,msg:'رقم غير صالح'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        const q=await tursoQuery(env, `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`, [cardNumber]);
        if(q.error||!q.result?.rows||q.result.rows.length===0) return new Response(JSON.stringify({ok:false,msg:'غير موجود'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        const cols=q.result.cols.map(c=>c.name); const userObj=safeRowToObject(cols,q.result.rows[0]); const savedBioStr=String(userObj['بصمة']||'').trim();
        if(!savedBioStr) return new Response(JSON.stringify({ok:false,msg:'لا توجد بصمة'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        let savedBio; try{ savedBio=JSON.parse(savedBioStr); }catch{ return new Response(JSON.stringify({ok:false,msg:'بيانات تالفة'}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }
        if(savedBio.type==='pattern'){
          if(!bioAttempt) return new Response(JSON.stringify({ok:false,msg:'أدخل النقش'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          let ok=false; if(savedBio.hash){ const attemptHash=await hashPatternSecure(bioAttempt,cardNumber); ok=constantTimeCompare(attemptHash,savedBio.hash); } else { ok=constantTimeCompare(String(savedBio.value||'').trim(),bioAttempt.trim()); }
          if(!ok) return new Response(JSON.stringify({ok:false,msg:'النقش غير مطابق'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        } else if(savedBio.type==='face_camera'){
          if(!bioAttempt) return new Response(JSON.stringify({ok:false,msg:'التقط الوجه أولاً'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          let ok=false;
          if(savedBio.hash && constantTimeCompare(savedBio.hash, bioAttempt)) ok=true;
          else if(savedBio.serverHash){ const attemptServerHash=await hashFaceSecure(bioAttempt,cardNumber); if(constantTimeCompare(savedBio.serverHash, attemptServerHash)) ok=true; }
          if(!ok) return new Response(JSON.stringify({ok:false,msg:'الوجه غير مطابق'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }
        const token=generateSecureTokenFixed();
        return new Response(JSON.stringify({ok:true,token,role:userObj['الصلاحيات']||'User'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      }catch(e){ return new Response(JSON.stringify({ok:false,msg:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }
    }

    if(path==='/api/salary-turso'){
      try{
        const year=url.searchParams.get('year')?.trim(); const month=url.searchParams.get('month')?.trim(); const code=url.searchParams.get('code')?.trim();
        if(!year||!/^\d{4}$/.test(year)) return new Response(JSON.stringify({found:false,error:'سنة غير صالحة'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        const q=await tursoQuery(env, `SELECT * FROM "مرتبات_شهرية" WHERE "السنه" =? AND "الشهر" =? AND ("كود_العامل" =? OR "الكود_البنكى" =? OR "emptid" =?) LIMIT 1`, [year,month,code,code,code]);
        if(q.error) return new Response(JSON.stringify({found:false,error:q.error}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        if(!q.result?.rows||q.result.rows.length===0) return new Response(JSON.stringify({found:false,data:null}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        const cols=q.result.cols.map(c=>c.name); const row=q.result.rows[0]; const data={}; row.forEach((cell,i)=>{ data[cols[i]]=cell.value??cell.text??''; }); return new Response(JSON.stringify({found:true,data}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      }catch(e){ return new Response(JSON.stringify({found:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }
    }

    let response;
    try{
      const assetRes=await fetchAssetWithCleanUrls(request,env);
      if(assetRes&&assetRes.status!==404) response=assetRes;
      else if(env.ASSETS){
        response=await env.ASSETS.fetch(request);
      }
    }catch(e){ 
      return new Response(`Not found - ${path}`,{status:404,headers:{'Content-Type':'text/plain','Cache-Control':'no-store'}}); 
    }

    if(!response || response.status===404){
      if(path.startsWith('/api/')) return new Response(JSON.stringify({error:"Not found", path}),{status:404,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'}});
      if(lowPath==='/' || lowPath==='/index.html' || lowPath.includes('index-secure')){
        try{
          if(env.ASSETS){
            const direct = await env.ASSETS.fetch(new Request(new URL('/index.html', request.url).toString(), {method:'GET'}));
            if(direct && direct.status!==404) return addEntryCookieToResponse(addSecurityHeaders(direct));
            const old = await env.ASSETS.fetch(new Request(new URL('/Index-Secure-Professional.html', request.url).toString(), {method:'GET'}));
            if(old && old.status!==404) return addEntryCookieToResponse(addSecurityHeaders(old));
          }
        }catch{}
      }
      return new Response(`<h1>404</h1><p>${path} غير موجود</p><a href="/index.html?nocache=${Date.now()}">الرئيسية</a>`,{status:404,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
    }

    const contentType=response.headers.get('Content-Type')||'';
    if(contentType.includes('text/html')&&response.status===200){
      const isIndex=(lowPath==='/'||lowPath===''||lowPath==='/index.html'||lowPath.includes('index-secure-professional'));
      if(isIndex) return addEntryCookieToResponse(addSecurityHeaders(response));
      return addSecurityHeaders(response);
    }
    return addSecurityHeaders(response);
  }
}

