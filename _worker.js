// _worker.js - V8 FINAL - NO TABLES - index.html only - BUILD OK
const HARDCODED_TURSO_URL = "https://company-alldata-mostafadarwish-mostafa505050.aws-eu-west-1.turso.io";
const HARDCODED_TURSO_TOKEN = "";
const DEFAULT_PEPPER = "fallback_pepper_v8_no_tables";

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
};

function addSecurityHeaders(response){
  try{
    const h = new Headers(response.headers);
    for(const [k,v] of Object.entries(SECURITY_HEADERS)) if(!h.has(k)) h.set(k,v);
    h.set('Cache-Control','no-store, no-cache, must-revalidate, max-age=0');
    h.set('Pragma','no-cache');
    return new Response(response.body,{status:response.status,headers:h});
  }catch{ return response; }
}

function getPepperSecret(env){
  const p=(env.PEPPER_SECRET||env.PEPPER||'').trim();
  return p.length>=8? p : DEFAULT_PEPPER;
}

async function hashWithPepper(clientHash, nationalId, pepperSecret){
  try{
    const data=new TextEncoder().encode(String(clientHash).trim()+'|'+String(nationalId).trim()+'|'+pepperSecret);
    const buf=await crypto.subtle.digest('SHA-256',data);
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }catch{ return String(clientHash); }
}
async function hashPatternClient(patternValue, nationalId){
  try{
    const clean=String(patternValue).replace(/[^0-9,]/g,'').substring(0,50);
    const data=new TextEncoder().encode(clean+'|'+String(nationalId).trim());
    const buf=await crypto.subtle.digest('SHA-256',data);
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }catch{ return String(patternValue); }
}
async function hashPatternServer(clientHash, nationalId, pepperSecret){ return await hashWithPepper(clientHash, nationalId, pepperSecret); }
async function hashPasswordSecure(password, nationalId, pepperSecret){
  try{
    const data=new TextEncoder().encode(String(password).trim()+'|'+String(nationalId).trim()+'|'+pepperSecret);
    const buf=await crypto.subtle.digest('SHA-256',data);
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }catch{ return String(password); }
}

function getCookieFixed(request, name){
  try{
    const ch=request.headers.get('Cookie')||'';
    for(const c of ch.split(';').map(x=>x.trim())){
      const [k,...rest]=c.split('=');
      if(k.trim()===name) return rest.join('=').trim();
    }
  }catch{} return null;
}
function hasValidEntry(request){
  const ck=getCookieFixed(request,'entry_via_index');
  if(ck==='1') return true;
  try{ const r=request.headers.get('Referer')||''; if(r.toLowerCase().includes('index.html')||r.endsWith('/')||r.includes('/index')) return true; }catch{} return false;
}
function isEntryHtmlPage(path){
  const low=path.toLowerCase();
  const blocked=['/api/','/js/','.js','.css','.json','.png','.jpg','.svg','.ico','debug-config','get-ip','turso','favicon'];
  for(const s of blocked) if(low.includes(s)) return false;
  let pageName=path.split('/').pop()||'';
  if(path==='/'||path===''||pageName==='') return false;
  if(pageName.toLowerCase()==='index.html') return false;
  if(path.endsWith('.html')) return true;
  if(!pageName.includes('.')&&!path.startsWith('/api/')) return true;
  return false;
}
function entryBlockedHTML(pageName){
  return `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>الدخول عبر الرئيسية</title><style>body{min-height:100vh;background:#0a0e1a;color:#fff;display:flex;align-items:center;justify-content:center;font-family:Cairo}.box{background:rgba(255,255,255,0.08);padding:40px;border-radius:24px;text-align:center}h1{color:#f59e0b}</style></head><body><div class="box"><h1>الدخول عبر الرئيسية فقط</h1><p>${pageName}</p><a href="/index.html" style="color:#10b981">الرئيسية</a></div></body></html>`;
}
function addEntryCookieToResponse(response){
  try{
    const h=new Headers(response.headers);
    h.set('Set-Cookie','entry_via_index=1; Path=/; Max-Age=3600; SameSite=Lax');
    h.set('Cache-Control','no-cache');
    for(const [k,v] of Object.entries(SECURITY_HEADERS)) h.set(k,v);
    return new Response(response.body,{status:response.status,headers:h});
  }catch{ return response; }
}

const SECURE_LOGIN_CONFIG={ NATIONAL_ID_REGEX:/^\d{14}$/, TOKEN_BYTES:32, MAX_FAILED_ATTEMPTS:5, BLOCK_DURATION_MS:300000 };
let IP_BLOCK_MAP=new Map();
function isValidNationalIdSecure(id){ return typeof id==='string' && SECURE_LOGIN_CONFIG.NATIONAL_ID_REGEX.test(id.trim()); }
function generateSecureTokenFixed(){
  try{ const arr=new Uint8Array(SECURE_LOGIN_CONFIG.TOKEN_BYTES); crypto.getRandomValues(arr); let hex=''; for(let i=0;i<arr.length;i++) hex+=arr[i].toString(16).padStart(2,'0'); return `sec_${hex}_${Date.now()}_${crypto.randomUUID()}`; }catch{ return `sec_${Math.random().toString(36).slice(2)}_${Date.now()}`; }
}
function safeRowToObject(cols,row){ const obj={}; row.forEach((cell,i)=>{ const key=cols[i]; if(!key) return; if(key.includes('__proto__')||key.includes('constructor')) return; obj[key]=cell.value??cell.text??''; }); return obj; }
function constantTimeCompare(a,b){ const sa=String(a); const sb=String(b); if(sa.length!==sb.length) return false; let r=0; for(let i=0;i<sa.length;i++) r|=sa.charCodeAt(i)^sb.charCodeAt(i); return r===0; }

function getTursoConfig(env){
  let url=(env.TURSO_URL||HARDCODED_TURSO_URL||'').trim();
  let token=(env.TURSO_TOKEN||HARDCODED_TURSO_TOKEN||'').trim();
  if(!url) return {url:null,token:null,error:'TURSO_URL غير موجود'};
  if(!token||token.length<10) return {url:null,token:null,error:'TURSO_TOKEN فارغ - ضعه في Settings > Variables'};
  if(url.startsWith('libsql://')) url='https://'+url.slice(8);
  if(url&&!url.startsWith('https://')) url='https://'+url;
  return {url,token,error:null};
}
async function tursoQuery(env, sql, params=[]){
  const cfg=getTursoConfig(env);
  if(cfg.error) return {error:cfg.error,isConfigError:true};
  try{
    const args=params.map(v=>({type:'text',value:String(v)}));
    const res=await fetch(`${cfg.url}/v2/pipeline`,{method:'POST',headers:{'Authorization':`Bearer ${cfg.token}`,'Content-Type':'application/json'},body:JSON.stringify({requests:[{type:'execute',stmt:{sql,args}},{type:'close'}]})});
    if(!res.ok){ const txt=await res.text().catch(()=>res.statusText); return {error:`Turso HTTP ${res.status}: ${txt.substring(0,200)}`,isHttpError:true}; }
    const data=await res.json();
    if(data.results?.[0]?.error) return {error:data.results[0].error.message,isSqlError:true};
    return {result:data.results?.[0]?.response?.result};
  }catch(e){ return {error:`Turso: ${e.message}`,isException:true}; }
}

function getClientIp(request){ return request.headers.get('CF-Connecting-IP')||request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()||'unknown'; }
function checkIpBlockedMemory(ip){
  if(ip==='unknown') return {blocked:false};
  const e=IP_BLOCK_MAP.get(ip);
  if(!e) return {blocked:false};
  const now=Date.now();
  if(e.blockedUntil && now<e.blockedUntil) return {blocked:true,secondsLeft:Math.ceil((e.blockedUntil-now)/1000)};
  if(e.blockedUntil && now>=e.blockedUntil){ IP_BLOCK_MAP.delete(ip); return {blocked:false}; }
  return {blocked:false};
}
function recordFailedAttemptMemory(ip){
  const now=Date.now();
  const e=IP_BLOCK_MAP.get(ip)||{attempts:0,blockedUntil:0};
  e.attempts+=1; e.lastAttempt=now;
  if(e.attempts>=SECURE_LOGIN_CONFIG.MAX_FAILED_ATTEMPTS) e.blockedUntil=now+SECURE_LOGIN_CONFIG.BLOCK_DURATION_MS;
  IP_BLOCK_MAP.set(ip,e);
  return e.attempts;
}
function clearFailedAttemptsMemory(ip){ IP_BLOCK_MAP.delete(ip); }

async function fetchAssetWithCleanUrls(request, env){
  const url=new URL(request.url); let path=url.pathname.replace(/\/+/g,'/');
  const candidates=[path];
  const hasExt=path.split('/').pop()?.includes('.')||false;
  if(!hasExt&&path!=='/'){
    candidates.push(path+'.html');
    candidates.push(path+'/index.html');
  }
  if(path==='/'||path==='') candidates.unshift('/index.html');
  for(const candPath of candidates){
    try{
      const candUrl=new URL(request.url); candUrl.pathname=candPath;
      const candReq=new Request(candUrl, request);
      if(env.ASSETS){ const res=await env.ASSETS.fetch(candReq); if(res.status!==404) return res; }
    }catch{ continue; }
  }
  try{ if(env.ASSETS) return await env.ASSETS.fetch(request); return await fetch(request); }catch{ return null; }
}

export default {
  async fetch(request, env, ctx){
    const url=new URL(request.url); const path=url.pathname;
    if(request.method==='OPTIONS'){
      return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization',...SECURITY_HEADERS}});
    }
    const clientIp=getClientIp(request);
    const sensitivePaths=['/api/check-by-card-secure','/api/verify-password-secure','/api/bio-login-by-card-secure','/api/register-by-card-secure'];
    if(sensitivePaths.includes(path)){
      const bc=checkIpBlockedMemory(clientIp);
      if(bc.blocked) return new Response(JSON.stringify({ok:false,msg:`🔒 محظور ${bc.secondsLeft} ثانية`,blocked:true}),{status:429,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
    }

    if(path==='/api/debug-config'){
      const cfg=getTursoConfig(env);
      const pepper=getPepperSecret(env);
      return new Response(JSON.stringify({v:'V8-FINAL-INDEX-ONLY-BUILD-OK',tursoUrl:cfg.url?cfg.url.substring(0,40)+'...':'missing',hasToken:!!cfg.token,configError:cfg.error,hasPepper:pepper!==DEFAULT_PEPPER,hasAssets:!!env.ASSETS,ip:clientIp,mainPage:'/index.html',time:new Date().toISOString()},null,2),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
    }
    if(path==='/api/get-ip'){
      return new Response(JSON.stringify({ip:clientIp}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    }

    if(path==='/api/check-by-card-secure' && request.method==='POST'){
      try{
        const body=await request.json().catch(()=>({})); const cardNumber=String(body.cardNumber||'').trim();
        if(!isValidNationalIdSecure(cardNumber)) return new Response(JSON.stringify({ok:false,msg:'رقم البطاقة 14 رقم'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        let q=await tursoQuery(env, `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`, [cardNumber]);
        if(q.isConfigError) return new Response(JSON.stringify({ok:false,msg:q.error}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        if(q.error){
          let q2=await tursoQuery(env, `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومي"=? LIMIT 1`, [cardNumber]);
          if(q2.error) return new Response(JSON.stringify({ok:false,msg:q.error}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
          q=q2;
        }
        if(!q.result?.rows||q.result.rows.length===0){ recordFailedAttemptMemory(clientIp); return new Response(JSON.stringify({ok:false,msg:'رقم البطاقة غير موجود'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
        const cols=q.result.cols.map(c=>c.name); const userObj=safeRowToObject(cols,q.result.rows[0]); const safeUser={...userObj}; delete safeUser['كلمة_المرور'];
        return new Response(JSON.stringify({ok:true,user:safeUser}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }catch(e){ return new Response(JSON.stringify({ok:false,msg:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
    }

    if(path==='/api/salary-turso'){
      try{
        const year=url.searchParams.get('year')?.trim(); const month=url.searchParams.get('month')?.trim(); const code=url.searchParams.get('code')?.trim();
        if(!year||!/^\d{4}$/.test(year)) return new Response(JSON.stringify({found:false,error:'سنة غير صالحة'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const q=await tursoQuery(env, `SELECT * FROM "مرتبات_شهرية" WHERE "السنه" =? AND "الشهر" =? AND ("كود_العامل" =? OR "الكود_البنكى" =? OR "emptid" =?) LIMIT 1`, [year,month,code,code,code]);
        if(q.isConfigError) return new Response(JSON.stringify({found:false,error:q.error,configError:true}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        if(q.error) return new Response(JSON.stringify({found:false,error:q.error}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        if(!q.result?.rows||q.result.rows.length===0){
          return new Response(JSON.stringify({found:false,data:null}),[STRIPPED]'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        }
        const cols=q.result.cols.map(c=>c.name); const row=q.result.rows[0]; const data={}; row.forEach((cell,i)=>{ data[cols[i]]=cell.value??cell.text??''; });
        return new Response(JSON.stringify({found:true,data}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }catch(e){ return new Response(JSON.stringify({found:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
    }

    if(path==='/api/verify-password-secure' && request.method==='POST'){
      try{
        const body=await request.json().catch(()=>({})); const cardNumber=String(body.cardNumber||'').trim(); const password=String(body.password||'').trim();
        const q=await tursoQuery(env, `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`, [cardNumber]);
        if(q.error||!q.result?.rows||q.result.rows.length===0){ recordFailedAttemptMemory(clientIp); return new Response(JSON.stringify({ok:false,msg:'بيانات غير صحيحة'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
        const cols=q.result.cols.map(c=>c.name); const userObj=safeRowToObject(cols,q.result.rows[0]); const storedPass=String(userObj['كلمة_المرور']||'').trim();
        const pepper=getPepperSecret(env); const hashedAttempt=await hashPasswordSecure(password, cardNumber, pepper);
        let ok=false; if(storedPass.length===64){ ok=constantTimeCompare(storedPass, hashedAttempt); } else { ok=constantTimeCompare(storedPass, password); }
        if(!ok){ const att=recordFailedAttemptMemory(clientIp); return new Response(JSON.stringify({ok:false,msg:`بيانات غير صحيحة - بقي ${Math.max(0,5-att)}`}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
        clearFailedAttemptsMemory(clientIp); const token=generateSecureTokenFixed(); return new Response(JSON.stringify({ok:true,token}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }catch(e){ return new Response(JSON.stringify({ok:false,msg:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
    }

    if(path==='/api/bio-login-by-card-secure' && request.method==='POST'){
      try{
        const body=await request.json().catch(()=>({})); const cardNumber=String(body.cardNumber||'').trim(); const bioAttempt=body.bioAttempt?String(body.bioAttempt).trim():null;
        const q=await tursoQuery(env, `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`, [cardNumber]);
        if(q.error||!q.result?.rows||q.result.rows.length===0){ recordFailedAttemptMemory(clientIp); return new Response(JSON.stringify({ok:false,msg:'غير موجود'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
        const cols=q.result.cols.map(c=>c.name); const userObj=safeRowToObject(cols,q.result.rows[0]); const savedBioStr=String(userObj['بصمة']||'').trim();
        if(!savedBioStr) return new Response(JSON.stringify({ok:false,msg:'لا توجد بصمة'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        let savedBio; try{ savedBio=JSON.parse(savedBioStr); }catch{ return new Response(JSON.stringify({ok:false,msg:'بيانات تالفة'}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
        const pepper=getPepperSecret(env); let ok=false;
        if(savedBio.serverHash && bioAttempt){
          const ah=await hashPatternServer(bioAttempt, cardNumber, pepper);
          if(constantTimeCompare(ah, savedBio.serverHash)) ok=true;
        }
        if(!ok && bioAttempt && savedBio.hash && constantTimeCompare(savedBio.hash, bioAttempt)) ok=true;
        if(!ok){ const att=recordFailedAttemptMemory(clientIp); return new Response(JSON.stringify({ok:false,msg:`غير مطابق - بقي ${Math.max(0,5-att)}`}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
        clearFailedAttemptsMemory(clientIp); const token=generateSecureTokenFixed(); return new Response(JSON.stringify({ok:true,token}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }catch(e){ return new Response(JSON.stringify({ok:false,msg:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
    }

    if(path==='/api/register-by-card-secure' && request.method==='POST'){
      try{
        const body=await request.json().catch(()=>({})); const cardNumber=String(body.cardNumber||'').trim(); let bio=String(body.bio||'').trim(); const password=String(body.password||'').trim();
        const pepper=getPepperSecret(env); const hashedPassword=await hashPasswordSecure(password, cardNumber, pepper);
        try{ const bioObj=JSON.parse(bio); if(bioObj.hash){ const sh=await hashPatternServer(bioObj.hash, cardNumber, pepper); bioObj.serverHash=sh; bioObj.hash=undefined; bio=JSON.stringify(bioObj); } }catch{}
        const upQ=await tursoQuery(env, `UPDATE "موظفين_مرتبات" SET "بصمة"=?, "كلمة_المرور"=? WHERE "الرقم_القومى"=?`, [bio, hashedPassword, cardNumber]);
        if(upQ.error) return new Response(JSON.stringify({ok:false,msg:upQ.error}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        clearFailedAttemptsMemory(clientIp); return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }catch(e){ return new Response(JSON.stringify({ok:false,msg:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
    }

    let response;
    try{
      const assetRes=await fetchAssetWithCleanUrls(request,env);
      if(assetRes&&assetRes.status!==404) response=assetRes;
      else if(env.ASSETS){ response=await env.ASSETS.fetch(request); }
    }catch{ return new Response(`Not found - ${path}`,{status:404,headers:{'Content-Type':'text/plain',...SECURITY_HEADERS}}); }

    if(!response||response.status===404){
      if(path.startsWith('/api/')) return new Response(JSON.stringify({error:"Not found",path}),{status:404,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      return new Response(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>404</title></head><body style="background:#020a05;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh"><div style="text-align:center"><h1>404</h1><p>${path}</p><a href="/index.html" style="color:#10b981">الرئيسية</a></div></body></html>`,{status:404,headers:{'Content-Type':'text/html; charset=utf-8',...SECURITY_HEADERS}});
    }
    const ct=response.headers.get('Content-Type')||'';
    if(ct.includes('text/html')&&response.status===200){
      const isIndex=(path==='/'||path===''||path.toLowerCase().endsWith('index.html'));
      if(isIndex) return addEntryCookieToResponse(addSecurityHeaders(response));
      return addSecurityHeaders(response);
    }
    return addSecurityHeaders(response);
  }
}
