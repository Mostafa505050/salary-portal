// _worker-v6-face-camera.js - نفس V5 + دعم بصمة وجه بالكاميرا (face_camera)
// يدعم: pattern, fingerprint, face, face_camera

const HARDCODED_TURSO_URL = "https://company-alldata-mostafadarwish-mostafa505050.aws-eu-west-1.turso.io";
const HARDCODED_TURSO_TOKEN = "";
const FALLBACK_BLOCKED = ['addhafez1.html', 'tables.html'];

const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
};
function addSecurityHeaders(response){
  try{
    const newHeaders = new Headers(response.headers);
    for(const [k,v] of Object.entries(SECURITY_HEADERS)){ if(!newHeaders.has(k)) newHeaders.set(k, v); }
    if(!newHeaders.has('Cache-Control')){
      const ct = newHeaders.get('Content-Type')||'';
      if(ct.includes('text/html')) newHeaders.set('Cache-Control','no-cache, no-store');
    }
    return new Response(response.body, {status: response.status, headers: newHeaders});
  }catch{ return response; }
}

async function hashPatternSecure(patternValue, nationalId){
  try{
    const clean = String(patternValue).replace(/[^0-9,]/g,'').substring(0,50);
    const salt = String(nationalId).trim();
    const data = new TextEncoder().encode(clean + '|' + salt + '|pattern_pepper_v5');
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }catch{ return String(patternValue); }
}
async function hashFaceSecure(faceHashAttempt, nationalId){
  // الوجه يأتي هاش جاهز من المتصفح، لكن نعيد تشفيره مرة ثانية في الخادم كطبقة ثانية
  try{
    const salt = String(nationalId).trim();
    const data = new TextEncoder().encode(String(faceHashAttempt).trim() + '|' + salt + '|face_pepper_v6_server');
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }catch{ return String(faceHashAttempt); }
}

const ENTRY_PAGE = 'index.html';
const ENTRY_COOKIE_NAME = 'entry_via_index';
const ENTRY_COOKIE_MAX_AGE = 3600;

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
    if(ref.toLowerCase().includes('index.html') || ref.endsWith('/') || ref.includes('/index')) return true;
  }catch{}
  return false;
}
function isEntryHtmlPage(path){
  const low = path.toLowerCase();
  if(['/api/','/js/','.js','.css','.json','.png','.jpg','.svg','.ico','real-monitoring','whitelist','allowed-ips','add-allowed-ip','remove-allowed-ip','block-device','unblock-device','get-ip','blocked-devices','blocked-list','turso','cache-','favicon','auth','login','dashboard','protect.js','real-logger.js'].some(s=> low.includes(s.toLowerCase()))) return false;
  let pageName = path.split('/').pop() || '';
  if(path==='/' || path==='' || pageName==='' ) return false;
  if(pageName.toLowerCase()==='index.html') return false;
  if(path.endsWith('.html')) return true;
  if(!pageName.includes('.') &&!path.startsWith('/api/')) return true;
  return false;
}
function entryBlockedHTMLFixed(pageName){
  return `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>الدخول عبر الرئيسية</title><style>body{min-height:100vh;background:#0a0e1a;color:#fff;display:flex;align-items:center;justify-content:center;font-family:Cairo} .box{background:rgba(255,255,255,0.08);padding:40px;border-radius:24px;text-align:center} h1{color:#f59e0b}</style></head><body><div class="box"><div style="font-size:56px">🔐</div><h1>الدخول عبر الرئيسية فقط</h1><p>${pageName}</p><a href="/index.html" style="color:#10b981">الرئيسية</a></div></body></html>`;
}
function addEntryCookieToResponse(response){
  try{
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Set-Cookie', `${ENTRY_COOKIE_NAME}=1; Path=/; Max-Age=${ENTRY_COOKIE_MAX_AGE}; SameSite=Lax`);
    newHeaders.set('Cache-Control', 'no-cache');
    for(const [k,v] of Object.entries(SECURITY_HEADERS)) newHeaders.set(k,v);
    return new Response(response.body, {status:response.status, headers:newHeaders});
  }catch{ return response; }
}

const SECURE_LOGIN_CONFIG = {
  NATIONAL_ID_REGEX: /^\d{14}$/,
  CODE_REGEX: /^[A-Za-z0-9_\-]{2,30}$/,
  PASSWORD_MIN_LEN: 3,
  PASSWORD_MAX_LEN: 100,
  BIO_MAX_LEN: 20000,
  RATE_LIMIT_WINDOW_MS: 60 * 1000,
  RATE_LIMIT_MAX: 15,
  TOKEN_BYTES: 32
};
let LOGIN_RATE_LIMIT = new Map();
let SECURE_TOKENS = new Map();
function isValidNationalIdSecure(id){ return typeof id === 'string' && SECURE_LOGIN_CONFIG.NATIONAL_ID_REGEX.test(id.trim()); }
function isValidCodeSecure(code){ return typeof code === 'string' && SECURE_LOGIN_CONFIG.CODE_REGEX.test(code.trim()); }
function generateSecureTokenFixed(){
  try{
    const arr = new Uint8Array(SECURE_LOGIN_CONFIG.TOKEN_BYTES);
    crypto.getRandomValues(arr);
    let hex=''; for(let i=0;i<arr.length;i++) hex+=arr[i].toString(16).padStart(2,'0');
    return `sec_${hex}_${Date.now()}_${crypto.randomUUID()}`;
  }catch{ return `sec_${Math.random().toString(36).slice(2)}_${Date.now()}`; }
}
function checkRateLimitSecure(ip, endpoint){
  const key=`${ip}:${endpoint}`; const now=Date.now(); const entry=LOGIN_RATE_LIMIT.get(key);
  if(!entry){ LOGIN_RATE_LIMIT.set(key,{count:1,resetTime:now+SECURE_LOGIN_CONFIG.RATE_LIMIT_WINDOW_MS}); return {allowed:true}; }
  if(now>entry.resetTime){ LOGIN_RATE_LIMIT.set(key,{count:1,resetTime:now+SECURE_LOGIN_CONFIG.RATE_LIMIT_WINDOW_MS}); return {allowed:true}; }
  entry.count++; if(entry.count>SECURE_LOGIN_CONFIG.RATE_LIMIT_MAX){ const retryAfter=Math.ceil((entry.resetTime-now)/1000); return {allowed:false,retryAfter}; }
  LOGIN_RATE_LIMIT.set(key,entry); return {allowed:true};
}
function sanitizeUserRowSecure(rowObj){
  const clone={...rowObj}; delete clone['كلمة_المرور']; delete clone['كلمة المرور']; delete clone['كلمه_المرور']; delete clone['password']; delete clone['pass']; delete clone['__proto__']; delete clone['constructor']; return clone;
}
function safeRowToObject(cols,row){
  const obj={}; row.forEach((cell,i)=>{ const key=cols[i]; if(!key) return; if(key.includes('__proto__')||key.includes('constructor')) return; obj[key]=cell.value??cell.text??''; }); return obj;
}
function constantTimeCompare(a,b){
  const sa=String(a); const sb=String(b); if(sa.length!==sb.length) return false; let result=0; for(let i=0;i<sa.length;i++) result|=sa.charCodeAt(i)^sb.charCodeAt(i); return result===0;
}
const NEVER_CACHE_PAGES = ['Real-Monitoring','Cache-Dashboard','cache-dashboard','real-monitoring','dashboard','whitelist','blocked','login','auth'];
function shouldNeverCache(pageName, pathname){ const combined=((pageName||'')+' '+(pathname||'')).toLowerCase(); return NEVER_CACHE_PAGES.some(p=>combined.includes(p.toLowerCase())); }
let GLOBAL_CACHE=new Map();
let STATS={workerRequestsToday:0,tursoQueriesToday:0,cacheHits:0,cacheMisses:0,savedQueries:0,cacheDuration:3600,cacheEnabled:true,lastRefresh:null,nextExpiry:null,rowsRead:0,storageUsed:0,startOfDay:new Date().toDateString(),pagesConfig:{}};
function parseDuration(payload){ if(typeof payload==='number') return payload; if(!payload) return 3600; if(payload.duration===0||payload.unit==='infinite') return Infinity; if(typeof payload.duration==='number'&&payload.duration>0) return payload.duration; const map={seconds:1,minutes:60,hours:3600,days:86400}; const v=payload.durationValue??payload.value??1; const u=payload.unit??'hours'; if(u==='infinite') return Infinity; return v*(map[u]||3600); }
function getCacheKey(request,pageName){ const url=new URL(request.url); const page=(pageName||url.pathname.split('/').pop()||'index.html').trim(); const keyPage=page===''?'index.html':page; return keyPage+'|'+url.pathname+url.search; }
function getCached(key){ if(!STATS.cacheEnabled) return null; const page=key.split('|')[0]; if(shouldNeverCache(page,key)) return null; const entry=GLOBAL_CACHE.get(key); if(!entry){STATS.cacheMisses++; return null;} if(Date.now()>entry.expiresAt){GLOBAL_CACHE.delete(key); STATS.cacheMisses++; return null;} STATS.cacheHits++; STATS.savedQueries++; return entry; }
function setCached(key,data,headers,pageName){ if(!STATS.cacheEnabled) return; const page=pageName||key.split('|')[0]; if(shouldNeverCache(page,key)) return; const cfg=STATS.pagesConfig[page]; const durationSec=cfg?parseDuration(cfg):STATS.cacheDuration; if(durationSec===0) return; const now=Date.now(); const expiresAt=isFinite(durationSec)?now+durationSec*1000:now+365*24*3600*1000; GLOBAL_CACHE.set(key,{data,headers,expiresAt,page,createdAt:now}); STATS.storageUsed=GLOBAL_CACHE.size; }
async function ensureCacheConfigTableFixed(env){ const sql=`CREATE TABLE IF NOT EXISTS cache_config (page TEXT PRIMARY KEY, enabled INTEGER DEFAULT 1, duration INTEGER DEFAULT 3600, unit TEXT DEFAULT 'hours', durationValue INTEGER DEFAULT 1, lastRefresh TEXT, nextExpiry TEXT)`; await tursoQuery(env,sql,[]); }
async function loadPagesConfigFixed(env){ try{ await ensureCacheConfigTableFixed(env); const q=await tursoQuery(env,"SELECT page, enabled, duration, unit, durationValue, lastRefresh, nextExpiry FROM cache_config LIMIT 200"); if(!q.error&&q.result?.rows){ const cols=q.result.cols.map(c=>c.name); q.result.rows.forEach(row=>{ const o={}; row.forEach((cell,i)=>o[cols[i]]=cell.value??cell.text??''); const page=o.page; if(page) STATS.pagesConfig[page]={enabled:!!parseInt(o.enabled||1),duration:parseInt(o.duration||3600),unit:o.unit||'hours',durationValue:parseInt(o.durationValue||1),lastRefresh:o.lastRefresh,nextExpiry:o.nextExpiry}; }); } }catch{} }
function getTursoConfig(env){ let url=(env.TURSO_URL||HARDCODED_TURSO_URL||'').trim(); let token=(env.TURSO_TOKEN||HARDCODED_TURSO_TOKEN||'').trim(); if(!token||token.includes("PASTE_YOUR")||token.length<10) return {url:null,token:null}; if(url.startsWith('libsql://')) url='https://'+url.slice(8); if(url&&!url.startsWith('https://')) url='https://'+url; return {url,token}; }
async function tursoQuery(env,sql,params=[]){ const {url,token}=getTursoConfig(env); if(!url||!token) return {error:'no config'}; try{ const args=params.map(v=>({type:'text',value:String(v)})); const res=await fetch(`${url}/v2/pipeline`,{method:'POST',headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({requests:[{type:'execute',stmt:{sql,args}},{type:'close'}]})}); const data=await res.json(); if(data.results?.[0]?.error) return {error:data.results[0].error.message,raw:data}; STATS.tursoQueriesToday++; return {result:data.results?.[0]?.response?.result,raw:data}; }catch(e){return {error:e.message};} }

function isBlocked(pageName, blockedList){ const low=pageName.toLowerCase().trim(); const lowNoExt=low.replace('.html','').trim(); for(const b of blockedList){ const blFull=String(b).toLowerCase().trim(); const blNoExt=blFull.replace('.html','').trim(); if(blFull===low||blNoExt===lowNoExt) return true; } return false; }
function blockedPageHTML(pageName,source){ return `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>مغلقة</title></head><body style="background:#0a0a1a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh"><div style="text-align:center"><h1>🔒 مغلقة ${pageName}</h1><a href="/" style="color:#a78bfa">الرئيسية</a></div></body></html>`; }
function blockedDeviceHTML(ip,device,reason){ return `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>محظور</title></head><body style="background:#fee2e2;display:flex;align-items:center;justify-content:center;height:100vh"><div style="background:#fff;padding:30px;border-radius:20px;text-align:center"><h1>🚫 محظور ${ip}</h1><p>${reason}</p></div></body></html>`; }
async function insertBlockedDeviceFixed(env,device_model,ip,reason){ return await tursoQuery(env,"INSERT INTO blocked_devices (device_model, ip, reason) VALUES (?,?,?)",[device_model,ip,reason]); }
async function deleteBlockedDeviceFixed(env,id){ return await tursoQuery(env,"DELETE FROM blocked_devices WHERE id=?",[id]); }
function getRealIPFixed(request){ return request.headers.get('CF-Connecting-IP')||request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()||'unknown'; }
async function handleBlockDeviceRequestFixed(request,env){ try{ const body=await request.json(); const ip=body.ip||''; const device_model=body.device_model||'Unknown'; const reason=body.reason||'محظور'; if(!ip||!ip.includes('.')) return new Response(JSON.stringify({success:false}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); const result=await insertBlockedDeviceFixed(env,device_model,ip,reason); return new Response(JSON.stringify({success:true}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }catch(e){ return new Response(JSON.stringify({success:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); } }
async function handleUnblockDeviceRequestFixed(request,env){ try{ const body=await request.json(); const id=body.id; if(!id) return new Response(JSON.stringify({success:false}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); await deleteBlockedDeviceFixed(env,id); return new Response(JSON.stringify({success:true}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }catch(e){ return new Response(JSON.stringify({success:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); } }
async function ensureAllowedIPsTableFixed(env){ const sql1=`CREATE TABLE IF NOT EXISTS allowed_ips (ip TEXT PRIMARY KEY, reason TEXT DEFAULT 'مسموح', device_name TEXT DEFAULT '', added_at TEXT DEFAULT (datetime('now','localtime')))`; await tursoQuery(env,sql1,[]); await tursoQuery(env,`CREATE TABLE IF NOT EXISTS ip_whitelist_config (id INTEGER PRIMARY KEY AUTOINCREMENT, allowed_ip TEXT NOT NULL, mode TEXT NOT NULL DEFAULT 'all', created_at TEXT DEFAULT (datetime('now','localtime')))`,[]); }
async function getAllowedIPsFixed(env){ await ensureAllowedIPsTableFixed(env); const q=await tursoQuery(env,"SELECT * FROM allowed_ips ORDER BY added_at DESC",[]); if(q.error) return {allowed:[],error:q.error}; let allowed=[]; if(q.result?.rows){ const cols=q.result.cols.map(c=>c.name); allowed=q.result.rows.map(row=>{ const obj={}; row.forEach((cell,i)=>{ obj[cols[i]]=cell.value??cell.text??''; }); return obj; }); } return {allowed,error:null}; }
async function addAllowedIPFixed(env,ip,reason,device_name){ await ensureAllowedIPsTableFixed(env); return await tursoQuery(env,"INSERT OR REPLACE INTO allowed_ips (ip, reason, device_name) VALUES (?,?,?)",[ip,reason||'مسموح',device_name||'']); }
async function removeAllowedIPFixed(env,ip){ await ensureAllowedIPsTableFixed(env); return await tursoQuery(env,"DELETE FROM allowed_ips WHERE ip=?",[ip]); }
async function getWhitelistModeFixedBackend(env){ const q=await tursoQuery(env,"SELECT * FROM ip_whitelist_config ORDER BY id DESC LIMIT 1",[]); if(q.error||!q.result?.rows||q.result.rows.length===0) return {mode:'all'}; const cols=q.result.cols.map(c=>c.name); const row=q.result.rows[0]; const obj={}; row.forEach((cell,i)=>{ obj[cols[i]]=cell.value??cell.text??''; }); return {mode:obj.mode||'all',allowed_ip:obj.allowed_ip}; }
async function isIPAllowedInWhitelistFixed(env,currentIP){ const modeData=await getWhitelistModeFixedBackend(env); if(modeData.mode!=='whitelist') return true; const allowedData=await getAllowedIPsFixed(env); return allowedData.allowed.some(a=>a.ip===currentIP); }
function whitelistBlockedPageFixed(currentIP,allowedList){ const listHTML=allowedList.map(a=>`<span style="background:#dcfce7;padding:2px 8px;border-radius:6px;margin:2px;display:inline-block">${a.ip}</span>`).join(' '); return `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>قائمة بيضاء</title></head><body style="background:#fef3c7;display:flex;align-items:center;justify-content:center;height:100vh"><div style="background:#fff;padding:30px;border-radius:20px;text-align:center"><h1>🔐 قائمة بيضاء</h1><p>IP: ${currentIP}</p><p>${listHTML}</p></div></body></html>`; }
async function handleAddAllowedIPFixed(request,env){ try{ const body=await request.json(); const ip=body.ip?.trim(); if(!ip) return new Response(JSON.stringify({success:false}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); await addAllowedIPFixed(env,ip,body.reason||'مسموح',body.device_name||''); return new Response(JSON.stringify({success:true}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }catch(e){ return new Response(JSON.stringify({success:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); } }
async function handleRemoveAllowedIPFixed(request,env){ try{ const body=await request.json(); const ip=body.ip?.trim(); if(!ip) return new Response(JSON.stringify({success:false}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); await removeAllowedIPFixed(env,ip); return new Response(JSON.stringify({success:true}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }catch(e){ return new Response(JSON.stringify({success:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); } }
async function handleGetAllowedIPsFixed(request,env){ try{ const allowedData=await getAllowedIPsFixed(env); const modeData=await getWhitelistModeFixedBackend(env); return new Response(JSON.stringify({allowed:allowedData.allowed,mode:modeData.mode}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache'}}); }catch(e){ return new Response(JSON.stringify({allowed:[],error:e.message}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); } }

async function fetchAssetWithCleanUrls(request, env){
  const url=new URL(request.url); let path=url.pathname; path=path.replace(/\/+/g,'/');
  const candidates=[]; candidates.push(path);
  const hasExt=path.split('/').pop()?.includes('.')||false;
  if(!hasExt&&path!=='/'){ candidates.push(path+'.html'); candidates.push(path+'/index.html'); candidates.push(path.toLowerCase()+'.html'); candidates.push('/'+path.split('/').pop().toLowerCase()+'.html'); }
  if(path==='/'||path===''){ candidates.unshift('/index.html'); candidates.unshift('/Index-Secure-Professional.html'); }
  for(const candPath of candidates){
    try{ const candUrl=new URL(request.url); candUrl.pathname=candPath; const candReq=new Request(candUrl,request); if(env.ASSETS){ const res=await env.ASSETS.fetch(candReq); if(res.status!==404) return res; } }catch{ continue; }
  }
  try{ if(env.ASSETS) return await env.ASSETS.fetch(request); return await fetch(request); }catch{ return null; }
}

export default {
  async fetch(request, env, ctx){
    const url=new URL(request.url); const path=url.pathname;
    if(url.protocol==='http:'){ return Response.redirect(url.toString().replace('http://','https://'),301); }
    const today=new Date().toDateString(); if(STATS.startOfDay!==today){ STATS.startOfDay=today; STATS.workerRequestsToday=0; STATS.tursoQueriesToday=0; }
    STATS.workerRequestsToday++;
    if(request.method==='OPTIONS'){ return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization',...SECURITY_HEADERS}}); }

    if(isEntryHtmlPage(path)){
      if(!hasValidEntry(request)&&!path.toLowerCase().includes('index')){
        let pageName=path.split('/').pop()||path;
        const isSecureLogin=pageName.toLowerCase().includes('index-secure')||pageName.toLowerCase().includes('secure')||pageName.toLowerCase().includes('biometric');
        if(!isSecureLogin){ return new Response(entryBlockedHTMLFixed(pageName),{status:403,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','Set-Cookie':`${ENTRY_COOKIE_NAME}=0; Path=/; Max-Age=0`,...SECURITY_HEADERS}}); }
      }
    }

    if(path==='/api/cache-stats'){ await loadPagesConfigFixed(env); return new Response(JSON.stringify(STATS),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache',...SECURITY_HEADERS}}); }
    if(path==='/api/allowed-ips'){ return await handleGetAllowedIPsFixed(request,env).then(r=>addSecurityHeaders(r)); }
    if(path==='/api/add-allowed-ip'){ return await handleAddAllowedIPFixed(request,env).then(r=>addSecurityHeaders(r)); }
    if(path==='/api/remove-allowed-ip'){ return await handleRemoveAllowedIPFixed(request,env).then(r=>addSecurityHeaders(r)); }
    if(path==='/api/block-device-fixed'){ return await handleBlockDeviceRequestFixed(request,env).then(r=>addSecurityHeaders(r)); }
    if(path==='/api/unblock-device-fixed'){ return await handleUnblockDeviceRequestFixed(request,env).then(r=>addSecurityHeaders(r)); }
    if(path==='/api/get-ip'){ const ip=request.headers.get('CF-Connecting-IP')||'unknown'; return new Response(JSON.stringify({ip}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache',...SECURITY_HEADERS}}); }

    // ========== مسارات مؤمنة ==========
    if(path==='/api/check-by-card-secure' && request.method==='POST'){
      try{
        const ip=getRealIPFixed(request); const rl=checkRateLimitSecure(ip,'check-card'); if(!rl.allowed) return new Response(JSON.stringify({ok:false,msg:`محاولات كثيرة - حاول بعد ${rl.retryAfter} ثانية`}),{status:429,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const body=await request.json().catch(()=>({})); const cardNumber=String(body.cardNumber||'').trim(); if(!isValidNationalIdSecure(cardNumber)) return new Response(JSON.stringify({ok:false,msg:'رقم البطاقة 14 رقم'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const sql=`SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`; const q=await tursoQuery(env,sql,[cardNumber]);
        if(q.error){ const sql2=`SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومي"=? LIMIT 1`; const q2=await tursoQuery(env,sql2,[cardNumber]); if(q2.error) return new Response(JSON.stringify({ok:false,msg:'خطأ DB'}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); if(!q2.result?.rows||q2.result.rows.length===0) return new Response(JSON.stringify({ok:false,msg:'غير موجود'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); const cols=q2.result.cols.map(c=>c.name); const userObj=safeRowToObject(cols,q2.result.rows[0]); return new Response(JSON.stringify({ok:true,user:sanitizeUserRowSecure(userObj)}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
        if(!q.result?.rows||q.result.rows.length===0) return new Response(JSON.stringify({ok:false,msg:'غير موجود'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const cols=q.result.cols.map(c=>c.name); const userObj=safeRowToObject(cols,q.result.rows[0]); return new Response(JSON.stringify({ok:true,user:sanitizeUserRowSecure(userObj)}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }catch(e){ return new Response(JSON.stringify({ok:false,msg:'خطأ'}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
    }

    if(path==='/api/get-routing-secure'){
      try{
        const nationalId=url.searchParams.get('nationalId')?.trim()||''; const code=url.searchParams.get('code')?.trim()||'';
        const sql=`SELECT * FROM "توجيه_المستخدمين" WHERE ("الرقم_القومى"=? OR "الكود_البنكى"=?) AND "مفعلة"=1 LIMIT 1`; const q=await tursoQuery(env,sql,[nationalId,code]);
        if(q.error) return new Response(JSON.stringify({found:false}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        if(!q.result?.rows||q.result.rows.length===0) return new Response(JSON.stringify({found:false}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const cols=q.result.cols.map(c=>c.name); const routing=safeRowToObject(cols,q.result.rows[0]); return new Response(JSON.stringify({found:true,routing}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }catch(e){ return new Response(JSON.stringify({found:false}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
    }

    if(path==='/api/verify-password-secure' && request.method==='POST'){
      try{
        const ip=getRealIPFixed(request); const rl=checkRateLimitSecure(ip,'verify-pass'); if(!rl.allowed) return new Response(JSON.stringify({ok:false,msg:`محظور ${rl.retryAfter} ث`}),{status:429,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const body=await request.json().catch(()=>({})); const cardNumber=String(body.cardNumber||'').trim(); const password=String(body.password||'').trim();
        if(!isValidNationalIdSecure(cardNumber)) return new Response(JSON.stringify({ok:false,msg:'بيانات غير صحيحة'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const sql=`SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`; const q=await tursoQuery(env,sql,[cardNumber]);
        if(q.error||!q.result?.rows||q.result.rows.length===0) return new Response(JSON.stringify({ok:false,msg:'بيانات غير صحيحة'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const cols=q.result.cols.map(c=>c.name); const userObj=safeRowToObject(cols,q.result.rows[0]); const storedPass=String(userObj['كلمة_المرور']||'').trim();
        if(!constantTimeCompare(storedPass,password)) return new Response(JSON.stringify({ok:false,msg:'بيانات غير صحيحة'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const token=generateSecureTokenFixed(); return new Response(JSON.stringify({ok:true,token,role:userObj['الصلاحيات']||'User'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }catch(e){ return new Response(JSON.stringify({ok:false,msg:'خطأ'}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
    }

    if(path==='/api/register-by-card-secure' && request.method==='POST'){
      try{
        const body=await request.json().catch(()=>({})); const cardNumber=String(body.cardNumber||'').trim(); let bio=String(body.bio||'').trim(); const password=String(body.password||'').trim();
        if(!isValidNationalIdSecure(cardNumber)) return new Response(JSON.stringify({ok:false,msg:'رقم غير صالح'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        if(password.length<8) return new Response(JSON.stringify({ok:false,msg:'كلمة المرور 8 أحرف'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const checkSql=`SELECT "بصمة" FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`; const checkQ=await tursoQuery(env,checkSql,[cardNumber]);
        if(checkQ.result?.rows&&checkQ.result.rows.length>0){ const cols=checkQ.result.cols.map(c=>c.name); const existing=safeRowToObject(cols,checkQ.result.rows[0]); if(String(existing['بصمة']||'').trim()!=='') return new Response(JSON.stringify({ok:false,msg:'البصمة مسجلة مسبقاً'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
        // تشفير النقش والوجه قبل الحفظ
        try{
          const bioObj=JSON.parse(bio);
          if(bioObj.type==='pattern'&&bioObj.value){
            const hashed=await hashPatternSecure(bioObj.value,cardNumber); bioObj.hash=hashed; bioObj.value=undefined; bio=JSON.stringify(bioObj);
          }
          // face_camera يأتي هاش جاهز من المتصفح، نعيد تشفيره طبقة ثانية في الخادم
          if(bioObj.type==='face_camera'&&bioObj.hash){
            const serverHash=await hashFaceSecure(bioObj.hash,cardNumber); bioObj.serverHash=serverHash; bio=JSON.stringify(bioObj);
          }
        }catch{}
        const updateSql=`UPDATE "موظفين_مرتبات" SET "بصمة"=?, "كلمة_المرور"=? WHERE "الرقم_القومى"=?`; await tursoQuery(env,updateSql,[bio,password,cardNumber]);
        return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }catch(e){ return new Response(JSON.stringify({ok:false,msg:'خطأ'}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
    }

    // ========== الدخول بالبصمة والوجه - محدث يدعم face_camera ==========
    if(path==='/api/bio-login-by-card-secure' && request.method==='POST'){
      try{
        const body=await request.json().catch(()=>({})); const cardNumber=String(body.cardNumber||'').trim(); const bioAttempt=body.bioAttempt?String(body.bioAttempt).trim():null; const bioType=body.bioType||'';
        if(!isValidNationalIdSecure(cardNumber)) return new Response(JSON.stringify({ok:false,msg:'رقم غير صالح'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const sql=`SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`; const q=await tursoQuery(env,sql,[cardNumber]);
        if(q.error||!q.result?.rows||q.result.rows.length===0) return new Response(JSON.stringify({ok:false,msg:'غير موجود'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const cols=q.result.cols.map(c=>c.name); const userObj=safeRowToObject(cols,q.result.rows[0]); const savedBioStr=String(userObj['بصمة']||'').trim();
        if(!savedBioStr) return new Response(JSON.stringify({ok:false,msg:'لا توجد بصمة'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        let savedBio; try{ savedBio=JSON.parse(savedBioStr); }catch{ return new Response(JSON.stringify({ok:false,msg:'بيانات تالفة'}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }

        // نقش
        if(savedBio.type==='pattern'){
          if(!bioAttempt) return new Response(JSON.stringify({ok:false,msg:'أدخل النقش'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
          let ok=false;
          if(savedBio.hash){ const attemptHash=await hashPatternSecure(bioAttempt,cardNumber); ok=constantTimeCompare(attemptHash,savedBio.hash); }
          else { ok=constantTimeCompare(String(savedBio.value||'').trim(),bioAttempt.trim()); }
          if(!ok) return new Response(JSON.stringify({ok:false,msg:'النقش غير مطابق'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        }
        // وجه بالكاميرا - مطابقة الهاش
        else if(savedBio.type==='face_camera'){
          if(!bioAttempt) return new Response(JSON.stringify({ok:false,msg:'التقط الوجه أولاً'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
          let ok=false;
          // المتصفح يرسل هاش الوجه، نقارنه بالمحفوظ
          // جرب مقارنة مباشرة
          if(savedBio.hash && constantTimeCompare(savedBio.hash, bioAttempt)) ok=true;
          // جرب مقارنة serverHash لو موجود
          else if(savedBio.serverHash){
            const attemptServerHash=await hashFaceSecure(bioAttempt,cardNumber);
            if(constantTimeCompare(savedBio.serverHash, attemptServerHash)) ok=true;
          }
          // جرب مقارنة الهاش الأصلي مع attempt كـ هاش أيضاً
          if(!ok){
            // للتوافق مع الإصدارات القديمة التي خزنت بدون تشفير ثانوي
            const attemptHashDirect=await hashPatternSecure(bioAttempt,cardNumber); // fallback
            // لا نستخدمه للوجه، فقط نحاول مطابقة الهاش المباشر
          }
          if(!ok) return new Response(JSON.stringify({ok:false,msg:'الوجه غير مطابق - حاول مرة أخرى في إضاءة جيدة'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        }
        // fingerprint / face النظام - الثقة في WebAuthn (تم التحقق في المتصفح)
        const token=generateSecureTokenFixed();
        return new Response(JSON.stringify({ok:true,token,role:userObj['الصلاحيات']||'User'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }catch(e){ return new Response(JSON.stringify({ok:false,msg:'خطأ: '+e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
    }

    if(path==='/api/salary-turso'){
      try{
        const year=url.searchParams.get('year')?.trim(); const month=url.searchParams.get('month')?.trim(); const code=url.searchParams.get('code')?.trim();
        if(!year||!/^\d{4}$/.test(year)) return new Response(JSON.stringify({found:false,error:'سنة غير صالحة'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const allowedMonths=["يناير","فبراير","مارس","أبريل","ابريل","مايو","يونيو","يوليو","أغسطس","اغسطس","سبتمبر","أكتوبر","اكتوبر","نوفمبر","ديسمبر"];
        if(!month||!allowedMonths.includes(month)) return new Response(JSON.stringify({found:false,error:'شهر غير صالح'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        if(!code||!/^[A-Za-z0-9_\-]{2,30}$/.test(code)) return new Response(JSON.stringify({found:false,error:'كود غير صالح'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const sql=`SELECT * FROM "مرتبات_شهرية" WHERE "السنه" =? AND "الشهر" =? AND ("كود_العامل" =? OR "الكود_البنكى" =? OR "emptid" =?) LIMIT 1`; const q=await tursoQuery(env,sql,[year,month,code,code,code]);
        if(q.error) return new Response(JSON.stringify({found:false,error:'خطأ DB'}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        if(!q.result?.rows||q.result.rows.length===0) return new Response(JSON.stringify({found:false,data:null}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const cols=q.result.cols.map(c=>c.name); const row=q.result.rows[0]; const data={}; row.forEach((cell,i)=>{ data[cols[i]]=cell.value??cell.text??''; }); return new Response(JSON.stringify({found:true,data}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }catch(e){ return new Response(JSON.stringify({found:false,error:'خطأ'}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
    }

    // جلب الصفحات الثابتة مع Clean URLs
    let response;
    try{
      const assetRes=await fetchAssetWithCleanUrls(request,env);
      if(assetRes&&assetRes.status!==404) response=assetRes;
      else { if(env.ASSETS){ response=await env.ASSETS.fetch(request); if(response.status===404&&!path.includes('.')){ const urlHtml=new URL(request.url); urlHtml.pathname=path+'.html'; const resHtml=await env.ASSETS.fetch(new Request(urlHtml,request)); if(resHtml.status!==404) response=resHtml; } } else response=await fetch(request); }
    }catch{ return new Response(`Not found - ${path}`,{status:404,headers:{'Content-Type':'text/plain',...SECURITY_HEADERS}}); }

    if(response.status===404){
      if(path.startsWith('/api/')) return new Response(JSON.stringify({error:"Not found"}),{status:404,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      return new Response(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>404</title></head><body style="background:#020a05;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh"><div><h1>404</h1><p>${path} غير موجود</p><a href="/index.html" style="color:#10b981">الرئيسية</a></div></body></html>`,{status:404,headers:{'Content-Type':'text/html; charset=utf-8',...SECURITY_HEADERS}});
    }

    const contentType=response.headers.get('Content-Type')||'';
    if(contentType.includes('text/html')&&response.status===200&&!path.toLowerCase().includes('real-monitoring')){
      const isIndex=(path==='/'||path===''||path.toLowerCase().endsWith('index.html'));
      const transformed=new HTMLRewriter().on('body',{element(el){ el.append(`<script>if(!window.__rl){window.__rl=true;var s=document.createElement('script');s.src='/js/real-logger.js?v='+Date.now();s.async=true;document.head.appendChild(s);}</script>`,{html:true}); }}).transform(response);
      if(isIndex) return addEntryCookieToResponse(transformed);
      return addSecurityHeaders(transformed);
    }
    if(path==='/'||path===''||path.toLowerCase().endsWith('index.html')) return addEntryCookieToResponse(addSecurityHeaders(response));
    return addSecurityHeaders(response);
  }
}
