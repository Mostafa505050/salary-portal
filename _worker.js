// _worker-V9-FIXED-ULTRA-SECURE.js
const HARDCODED_TURSO_URL = "https://company-alldata-mostafadarwish-mostafa505050.aws-eu-west-1.turso.io";
const HARDCODED_TURSO_TOKEN = "";
const ALLOWED_ORIGINS = ['https://salary-portal.mostafa-voic77729.workers.dev'];
const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
  'X-Powered-By': 'SecurePayslip-V9-Fixed',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; img-src 'self' data: https:; connect-src 'self' https://*.turso.io https://*.workers.dev;"
};
function addSecurityHeaders(response, corsOrigin){
  const newHeaders = new Headers(response.headers);
  for(const [k,v] of Object.entries(SECURITY_HEADERS)){ if(!newHeaders.has(k)) newHeaders.set(k, v); }
  if(corsOrigin){
    newHeaders.set('Access-Control-Allow-Origin', corsOrigin);
    newHeaders.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    newHeaders.set('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Admin-Secret');
    newHeaders.set('Vary', 'Origin');
  }
  return new Response(response.body, {status: response.status, headers: newHeaders});
}
function getCorsOrigin(request){
  const origin = request.headers.get('Origin') || '';
  if(!origin) return ALLOWED_ORIGINS[0];
  if(origin.includes('salary-portal.mostafa-voic77729.workers.dev')) return origin;
  return ALLOWED_ORIGINS[0];
}
function getPepperSecret(env){
  const pepper = (env.PEPPER_SECRET || '').trim();
  if(!pepper || pepper.length < 16){
    return { error: 'PEPPER_SECRET غير موجود - ضعه في Cloudflare Variables طول 32 حرف', pepper: null };
  }
  return { pepper, error: null };
}
function getAdminSecret(env){ return (env.ADMIN_SECRET || '').trim(); }

async function pbkdf2Hash(password, salt, iterations = 100000){
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(String(password)), {name:'PBKDF2'}, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({name:'PBKDF2', salt: enc.encode(String(salt)), iterations, hash:'SHA-256'}, keyMaterial, 256);
  return Array.from(new Uint8Array(bits)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function legacySha256(clientHash, nationalId, pepper){
  const data = new TextEncoder().encode(String(clientHash).trim() + '|' + String(nationalId).trim() + '|' + String(pepper));
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function hashPasswordSecure(password, nationalId, pepper){
  return await pbkdf2Hash(password, `${nationalId}|${pepper}`, 100000);
}
async function hashPatternServer(clientHash, nationalId, pepper){
  return await pbkdf2Hash(clientHash, `${nationalId}|${pepper}|pattern`, 50000);
}
async function hashFaceServer(clientHash, nationalId, pepper){
  return await pbkdf2Hash(clientHash, `${nationalId}|${pepper}|face`, 50000);
}

const ENTRY_COOKIE_NAME = 'entry_via_index';
function getCookieFixed(request, name){
  const cookieHeader = request.headers.get('Cookie') || '';
  for(const c of cookieHeader.split(';').map(x=>x.trim())){
    const [k,...rest] = c.split('=');
    if(k.trim()===name) return rest.join('=').trim();
  }
  return null;
}
function hasValidEntry(request){
  const entryCookie = getCookieFixed(request, ENTRY_COOKIE_NAME);
  if(entryCookie==='1') return true;
  const ref = request.headers.get('Referer') || '';
  if(ref.toLowerCase().includes('index.html') || ref.toLowerCase().includes('index-secure') || ref.endsWith('/')) return true;
  return false;
}
function isEntryHtmlPage(path){
  const low = decodeURIComponent(path).toLowerCase();
  if(['/api/','/js/','.js','.css','.json','.png','.jpg','.svg','.ico','debug-config','security-stats','get-ip'].some(s=>low.includes(s))) return false;
  let pageName = path.split('/').pop() || '';
  if(!pageName) return false;
  if(path==='/' || pageName.toLowerCase()==='index.html') return false;
  if(path.toLowerCase().endsWith('.html')) return true;
  if(!pageName.includes('.') &&!path.startsWith('/api/')) return true;
  return false;
}
function entryBlockedHTMLFixed(pageName){
  return `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>الدخول عبر الرئيسية</title><style>body{min-height:100vh;background:#0a0e1a;color:#fff;display:flex;align-items:center;justify-content:center;font-family:Cairo}.box{background:rgba(255,255,255,0.08);padding:40px;border-radius:24px;text-align:center}h1{color:#f59e0b}a{color:#10b981}</style></head><body><div class="box"><div style="font-size:56px">🔐</div><h1>الدخول عبر الرئيسية فقط</h1><p>${pageName}</p><a href="/Index-Secure-Professional.html">الرئيسية</a></div></body></html>`;
}
function addEntryCookieToResponse(response, corsOrigin){
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Set-Cookie', `${ENTRY_COOKIE_NAME}=1; Path=/; Max-Age=3600; SameSite=Lax; Secure`);
  for(const [k,v] of Object.entries(SECURITY_HEADERS)) newHeaders.set(k,v);
  if(corsOrigin) newHeaders.set('Access-Control-Allow-Origin', corsOrigin);
  return new Response(response.body, {status:response.status, headers:newHeaders});
}

const SECURE_LOGIN_CONFIG = {
  NATIONAL_ID_REGEX: /^\d{14}$/,
  RATE_LIMIT_WINDOW_MS: 60*1000, RATE_LIMIT_MAX: 20,
  TOKEN_BYTES: 32, MAX_FAILED_ATTEMPTS: 5, BLOCK_DURATION_MS: 5*60*1000, SESSION_TTL_MS: 15*60*1000,
};
let LOGIN_RATE_LIMIT = new Map();
function isValidNationalIdSecure(id){ return SECURE_LOGIN_CONFIG.NATIONAL_ID_REGEX.test(String(id).trim()); }
function generateSecureTokenFixed(){
  const arr=new Uint8Array(SECURE_LOGIN_CONFIG.TOKEN_BYTES); crypto.getRandomValues(arr);
  return `sec_${Array.from(arr).map(b=>b.toString(16).padStart(2,'0')).join('')}_${Date.now()}_${crypto.randomUUID()}`;
}
function checkRateLimitSecure(ip, endpoint){
  const key=`${ip}:${endpoint}`; const now=Date.now(); const entry=LOGIN_RATE_LIMIT.get(key);
  if(!entry){ LOGIN_RATE_LIMIT.set(key,{count:1,resetTime:now+SECURE_LOGIN_CONFIG.RATE_LIMIT_WINDOW_MS}); return {allowed:true}; }
  if(now>entry.resetTime){ LOGIN_RATE_LIMIT.set(key,{count:1,resetTime:now+SECURE_LOGIN_CONFIG.RATE_LIMIT_WINDOW_MS}); return {allowed:true}; }
  entry.count++; if(entry.count>SECURE_LOGIN_CONFIG.RATE_LIMIT_MAX) return {allowed:false, retryAfter: Math.ceil((entry.resetTime-now)/1000)};
  return {allowed:true};
}
function safeRowToObject(cols,row){ const obj={}; row.forEach((c,i)=>{ const key=cols[i]; if(key.includes('__proto__')) return; obj[key]=c.value??c.text??''; }); return obj; }
function constantTimeCompare(a,b){ if(String(a).length!==String(b).length) return false; let r=0; for(let i=0;i<String(a).length;i++) r|=String(a).charCodeAt(i)^String(b).charCodeAt(i); return r===0; }
function getTursoConfig(env){
  let url=(env.TURSO_URL||'').trim()||HARDCODED_TURSO_URL; let token=(env.TURSO_TOKEN||'').trim()||HARDCODED_TURSO_TOKEN;
  if(!url||!token) return {error:'TURSO_URL/TOKEN مفقود'};
  if(url.startsWith('libsql://')) url='https://'+url.slice(8);
  return {url, token, error:null};
}
async function tursoQuery(env, sql, params=[]){
  const cfg=getTursoConfig(env); if(cfg.error) return {error:cfg.error, isConfigError:true};
  const res=await fetch(`${cfg.url}/v2/pipeline`, {method:'POST', headers:{'Authorization':`Bearer ${cfg.token}`,'Content-Type':'application/json'}, body: JSON.stringify({requests:[{type:'execute', stmt:{sql, args:params.map(v=>({type:'text',value:String(v)}))}}, {type:'close'}]})});
  const data=await res.json(); if(data.results?.[0]?.error) return {error:data.results[0].error.message, isSqlError:true};
  return {result:data.results?.[0]?.response?.result};
}
async function ensureSecurityTables(env){
  await tursoQuery(env, `CREATE TABLE IF NOT EXISTS failed_logins (ip TEXT PRIMARY KEY, attempts INTEGER, last_attempt INTEGER, blocked_until INTEGER)`);
  await tursoQuery(env, `CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, national_id TEXT, ip TEXT, action TEXT, result TEXT, timestamp INTEGER, details TEXT)`);
  await tursoQuery(env, `CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, national_id TEXT, role TEXT, expires_at INTEGER, created_at INTEGER)`);
}
function getClientIp(request){ return request.headers.get('CF-Connecting-IP')||request.headers.get('X-Forwarded-For')?.split(',')[0]||'unknown'; }
async function checkIpBlocked(env, ip){
  const q=await tursoQuery(env, `SELECT blocked_until FROM failed_logins WHERE ip=?`, [ip]);
  if(q.result?.rows?.length){ const cols=q.result.cols.map(c=>c.name); const row=safeRowToObject(cols,q.result.rows[0]); if(Number(row.blocked_until)>Date.now()) return {blocked:true, secondsLeft: Math.ceil((Number(row.blocked_until)-Date.now())/1000)}; }
  return {blocked:false};
}
async function recordFailedAttempt(env, ip, nationalId, action){
  const now=Date.now(); const q=await tursoQuery(env, `SELECT attempts FROM failed_logins WHERE ip=?`, [ip]);
  let attempts=1; if(q.result?.rows?.length){ const cols=q.result.cols.map(c=>c.name); attempts=Number(safeRowToObject(cols,q.result.rows[0]).attempts||0)+1; await tursoQuery(env, `UPDATE failed_logins SET attempts=?, last_attempt=?, blocked_until=? WHERE ip=?`, [String(attempts),String(now),String(attempts>=5?now+5*60*1000:0),ip]); }
  else await tursoQuery(env, `INSERT INTO failed_logins (ip, attempts, last_attempt, blocked_until) VALUES (?,?,?,?)`, [ip,String(attempts),String(now),String(attempts>=5?now+5*60*1000:0)]);
  await tursoQuery(env, `INSERT INTO audit_log (national_id, ip, action, result, timestamp, details) VALUES (?,?,?,?,?,?)`, [nationalId,ip,action,'failed',String(now),`attempts=${attempts}`]);
  return attempts;
}
async function clearFailedAttempts(env, ip){ await tursoQuery(env, `DELETE FROM failed_logins WHERE ip=?`, [ip]); }
async function logAudit(env, nid, ip, action, result, details){ await tursoQuery(env, `INSERT INTO audit_log (national_id, ip, action, result, timestamp, details) VALUES (?,?,?,?,?,?)`, [nid,ip,action,result,String(Date.now()),details||'']); }
async function createSession(env, nationalId, role){
  const token=generateSecureTokenFixed(); const now=Date.now();
  await tursoQuery(env, `INSERT INTO sessions (token, national_id, role, expires_at, created_at) VALUES (?,?,?,?,?)`, [token,nationalId,role||'User',String(now+15*60*1000),String(now)]);
  return token;
}
async function verifySession(env, token){
  if(!token) return null;
  const q=await tursoQuery(env, `SELECT national_id, role, expires_at FROM sessions WHERE token=?`, [token]);
  if(!q.result?.rows?.length) return null;
  const cols=q.result.cols.map(c=>c.name); const row=safeRowToObject(cols,q.result.rows[0]);
  if(Date.now()>Number(row.expires_at)){ await tursoQuery(env, `DELETE FROM sessions WHERE token=?`, [token]); return null; }
  return {national_id:row.national_id, role:row.role};
}
async function fetchAssetWithCleanUrls(request, env){
  let path=request.url.split('?')[0]; try{ path=decodeURIComponent(new URL(request.url).pathname); }catch{}
  const cands=[path, path+'.html', path.replace(/ /g,'-')+'.html', '/Index-Secure-Professional.html', '/index.html', '/'+path.split('/').pop()+'.html', '/Login-Mohamed-Mostafa.html', '/pageAdmin1.html'];
  if(path==='/') cands.unshift('/Index-Secure-Professional.html');
  for(const p of [...new Set(cands)]){
    try{ const u=new URL(request.url); u.pathname=p; const r=await env.ASSETS.fetch(new Request(u,request)); if(r.status!==404) return r; }catch{}
  }
  return env.ASSETS?await env.ASSETS.fetch(request):await fetch(request);
}

export default {
  async fetch(request, env, ctx){
    const url=new URL(request.url); let path=url.pathname; try{path=decodeURIComponent(path);}catch{} path=path.replace(/\/+/g,'/'); if(path.length>1&&path.endsWith('/')) path=path.slice(0,-1);
    const corsOrigin=getCorsOrigin(request);
    if(request.method==='OPTIONS') return new Response(null,{status:204, headers:{'Access-Control-Allow-Origin':corsOrigin,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization,X-Admin-Secret',...SECURITY_HEADERS}});
    ctx.waitUntil(ensureSecurityTables(env));
    const clientIp=getClientIp(request);
    if(['/api/check-by-card-secure','/api/verify-password-secure','/api/bio-login-by-card-secure'].includes(path)){
      const b=await checkIpBlocked(env, clientIp); if(b.blocked) return new Response(JSON.stringify({ok:false,msg:`محظور ${b.secondsLeft} ثانية`}),{status:429,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':corsOrigin,...SECURITY_HEADERS}});
    }
    // دخول عبر الرئيسية مع whitelist
    if(isEntryHtmlPage(path) &&!hasValidEntry(request)){
      const low=decodeURIComponent(path.split('/').pop()||'').toLowerCase();
      const white=['index-secure','secure','biometric','professional','v9','v10','pageadmin','admin','login-mohamed','mohamed','pageadmin1','login'];
      if(!white.some(w=>low.includes(w)) &&!low.includes('index')){
        return new Response(entryBlockedHTMLFixed(low),{status:403,headers:{'Content-Type':'text/html; charset=utf-8','Access-Control-Allow-Origin':corsOrigin,...SECURITY_HEADERS}});
      }
    }
    if(path==='/api/debug-config' || path==='/api/security-stats'){
      const admin=getAdminSecret(env); const prov=request.headers.get('X-Admin-Secret')||url.searchParams.get('admin')||'';
      if(!admin || prov!==admin) return new Response(JSON.stringify({error:'غير مصرح - أرسل X-Admin-Secret'}),{status:401,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':corsOrigin,...SECURITY_HEADERS}});
      if(path==='/api/debug-config'){
        const cfg=getTursoConfig(env); const pep=getPepperSecret(env);
        return new Response(JSON.stringify({v:'V9-FIXED',hasPepper:!pep.hasPepper?.error,pepError:pep.error,hasAdmin:!!admin,tursoOk:!cfg.error,ip:clientIp},null,2),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':corsOrigin,...SECURITY_HEADERS}});
      }
      return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':corsOrigin,...SECURITY_HEADERS}});
    }
    if(path==='/api/get-ip') return new Response(JSON.stringify({ip:clientIp}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':corsOrigin,...SECURITY_HEADERS}});

    if(path==='/api/check-by-card-secure' && request.method==='POST'){
      const body=await request.json().catch(()=>({})); const card=String(body.cardNumber||'').trim();
      if(!isValidNationalIdSecure(card)) return new Response(JSON.stringify({ok:false,msg:'14 رقم'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':corsOrigin,...SECURITY_HEADERS}});
      const pep=getPepperSecret(env); if(pep.error) return new Response(JSON.stringify({ok:false,msg:pep.error}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':corsOrigin,...SECURITY_HEADERS}});
      const q=await tursoQuery(env, `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`, [card]);
      if(!q.result?.rows?.length) return new Response(JSON.stringify({ok:false,msg:'غير موجود'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':corsOrigin,...SECURITY_HEADERS}});
      const cols=q.result.cols.map(c=>c.name); const u=safeRowToObject(cols,q.result.rows[0]); delete u['كلمة_المرور']; return new Response(JSON.stringify({ok:true,user:u}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':corsOrigin,...SECURITY_HEADERS}});
    }

    if(path==='/api/verify-password-secure' && request.method==='POST'){
      const body=await request.json().catch(()=>({})); const card=String(body.cardNumber||'').trim(); const pass=String(body.password||'').trim();
      const pep=getPepperSecret(env); if(pep.error) return new Response(JSON.stringify({ok:false,msg:pep.error}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':corsOrigin,...SECURITY_HEADERS}});
      const q=await tursoQuery(env, `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`, [card]);
      if(!q.result?.rows?.length) return new Response(JSON.stringify({ok:false,msg:'بيانات غير صحيحة'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':corsOrigin,...SECURITY_HEADERS}});
      const cols=q.result.cols.map(c=>c.name); const u=safeRowToObject(cols,q.result.rows[0]); const stored=String(u['كلمة_المرور']||'').trim();
      const hashed=await hashPasswordSecure(pass, card, pep.pepper); const legacy=await legacySha256(pass, card, pep.pepper);
      let ok=constantTimeCompare(stored,hashed)||constantTimeCompare(stored,legacy)||constantTimeCompare(stored,pass);
      if(!ok){ const att=await recordFailedAttempt(env,clientIp,card,'password-failed'); return new Response(JSON.stringify({ok:false,msg:`بيانات غير صحيحة بقي ${5-att}`}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':corsOrigin,...SECURITY_HEADERS}}); }
      await clearFailedAttempts(env,clientIp); const token=await createSession(env,card,u['الصلاحيات']||'User');
      return new Response(JSON.stringify({ok:true,token,role:u['الصلاحيات']||'User'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':corsOrigin,...SECURITY_HEADERS}});
    }

    if(path==='/api/salary-turso'){
      const auth=request.headers.get('Authorization')||''; const token=auth.startsWith('Bearer ')?auth.slice(7):url.searchParams.get('token')||'';
      if(!token) return new Response(JSON.stringify({found:false,error:'يجب تسجيل الدخول - token مفقود'}),{status:401,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':corsOrigin,...SECURITY_HEADERS}});
      const sess=await verifySession(env,token); if(!sess) return new Response(JSON.stringify({found:false,error:'جلسة منتهية'}),{status:401,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':corsOrigin,...SECURITY_HEADERS}});
      const year=url.searchParams.get('year')?.trim(); const month=url.searchParams.get('month')?.trim(); const code=url.searchParams.get('code')?.trim();
      const q=await tursoQuery(env, `SELECT * FROM "مرتبات_شهرية" WHERE "السنه"=? AND "الشهر"=? AND ("كود_العامل"=? OR "الكود_البنكى"=?) LIMIT 1`, [year,month,code,code]);
      if(!q.result?.rows?.length) return new Response(JSON.stringify({found:false,data:null}),[STRIPPED]'Content-Type':'application/json','Access-Control-Allow-Origin':corsOrigin,...SECURITY_HEADERS}});
      const cols=q.result.cols.map(c=>c.name); const data={}; q.result.rows[0].forEach((cell,i)=>{ data[cols[i]]=cell.value??''; });
      return new Response(JSON.stringify({found:true,data}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':corsOrigin,...SECURITY_HEADERS}});
    }

    let response=await fetchAssetWithCleanUrls(request,env);
    if(!response||response.status===404){
      if(path.startsWith('/api/')) return new Response(JSON.stringify({error:'Not found'}),{status:404,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':corsOrigin,...SECURITY_HEADERS}});
      return new Response(`<h1>404 ${path}</h1><a href="/Index-Secure-Professional.html">الرئيسية</a>`,{status:404,headers:{'Content-Type':'text/html; charset=utf-8','Access-Control-Allow-Origin':corsOrigin,...SECURITY_HEADERS}});
    }
    if((response.headers.get('Content-Type')||'').includes('text/html')){
      const isIndex=path==='/'||path.toLowerCase().includes('index');
      if(isIndex) return addEntryCookieToResponse(addSecurityHeaders(response,corsOrigin),corsOrigin);
      return addSecurityHeaders(response,corsOrigin);
    }
    return addSecurityHeaders(response,corsOrigin);
  }
}
