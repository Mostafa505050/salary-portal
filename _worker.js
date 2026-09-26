// _worker.js - V8.1 FIXED BUILD
const HARDCODED_TURSO_URL = "https://company-alldata-mostafadarwish-mostafa505050.aws-eu-west-1.turso.io";
const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

function addSecurityHeaders(response){
  const h = new Headers(response.headers);
  for(const [k,v] of Object.entries(SECURITY_HEADERS)) if(!h.has(k)) h.set(k,v);
  return new Response(response.body, {status:response.status, headers:h});
}
function getPepperSecret(env){
  return (env.PEPPER_SECRET || env.PEPPER || '').trim() || "fallback_pepper_v8_please_set_PEPPER_SECRET_in_cloudflare";
}
async function hashWithPepper(clientHash, nationalId, pepperSecret){
  const data = new TextEncoder().encode(String(clientHash).trim() + '|' + String(nationalId).trim() + '|' + pepperSecret);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function hashPasswordSecure(p, nid, pepper){ return hashWithPepper(p, nid, pepper); }
async function hashPatternServer(c, nid, p){ return hashWithPepper(c, nid, p); }
async function hashFaceServer(c, nid, p){ return hashWithPepper(c, nid, p); }

const ENTRY_COOKIE_NAME='entry_via_index';
function getCookieFixed(req,name){
  const ch=req.headers.get('Cookie')||'';
  for(const c of ch.split(';').map(s=>s.trim())){
    const [k,...r]=c.split('='); if(k.trim()===name) return r.join('=').trim();
  } return null;
}
function hasValidEntry(req){
  const ec=getCookieFixed(req,ENTRY_COOKIE_NAME); if(ec==='1') return true;
  const ref=req.headers.get('Referer')||''; if(ref.toLowerCase().includes('index.html')||ref.endsWith('/')) return true;
  return false;
}
function isEntryHtmlPage(path){
  const low=path.toLowerCase();
  if(['/api/','/js/','.js','.css','.json','.png','.jpg','.svg','.ico','get-ip','debug-config','security-stats'].some(s=>low.includes(s))) return false;
  const bn=path.split('/').pop()||''; if(path==='/'||!bn||bn.toLowerCase()==='index.html') return false;
  if(path.endsWith('.html')) return true;
  if(!bn.includes('.')&&!path.startsWith('/api/')) return true;
  return false;
}

const SECURE_LOGIN_CONFIG = { NATIONAL_ID_REGEX:/^\d{14}$/, RATE_LIMIT_MAX:20, RATE_LIMIT_WINDOW_MS:60000, TOKEN_BYTES:32, MAX_FAILED_ATTEMPTS:5, BLOCK_DURATION_MS:300000 };
let LOGIN_RATE_LIMIT=new Map();
function isValidNationalIdSecure(id){ return SECURE_LOGIN_CONFIG.NATIONAL_ID_REGEX.test(String(id).trim()); }
function generateSecureTokenFixed(){ const a=new Uint8Array(32); crypto.getRandomValues(a); return `sec_${Array.from(a).map(b=>b.toString(16).padStart(2,'0')).join('')}_${Date.now()}_${crypto.randomUUID()}`; }
function checkRateLimitSecure(ip,ep){ const k=`${ip}:${ep}`; const now=Date.now(); const e=LOGIN_RATE_LIMIT.get(k); if(!e){ LOGIN_RATE_LIMIT.set(k,{count:1,resetTime:now+60000}); return {allowed:true}; } if(now>e.resetTime){ LOGIN_RATE_LIMIT.set(k,{count:1,resetTime:now+60000}); return {allowed:true}; } e.count++; if(e.count>20) return {allowed:false, retryAfter: Math.ceil((e.resetTime-now)/1000)}; return {allowed:true}; }
function safeRowToObject(cols,row){ const o={}; row.forEach((c,i)=>{ const k=cols[i]; if(!k||k.includes('__proto__')) return; o[k]=c.value??c.text??''; }); return o; }
function constantTimeCompare(a,b){ const sa=String(a),sb=String(b); if(sa.length!==sb.length) return false; let r=0; for(let i=0;i<sa.length;i++) r|=sa.charCodeAt(i)^sb.charCodeAt(i); return r===0; }
function getTursoConfig(env){
  let url=(env.TURSO_URL||HARDCODED_TURSO_URL||'').trim(); let token=(env.TURSO_TOKEN||'').trim();
  if(!url) return {error:'TURSO_URL missing'}; if(!token||token.length<10) return {error:'TURSO_TOKEN missing'};
  if(url.startsWith('libsql://')) url='https://'+url.slice(8); if(!url.startsWith('https://')) url='https://'+url;
  return {url,token,error:null};
}
async function tursoQuery(env,sql,params=[]){
  const cfg=getTursoConfig(env); if(cfg.error) return {error:cfg.error, isConfigError:true};
  try{
    const res=await fetch(`${cfg.url}/v2/pipeline`, {method:'POST', headers:{'Authorization':`Bearer ${cfg.token}`,'Content-Type':'application/json'}, body: JSON.stringify({requests:[{type:'execute', stmt:{sql, args:params.map(v=>({type:'text',value:String(v)}))}}, {type:'close'}]})});
    const data=await res.json(); if(data.results?.[0]?.error) return {error:data.results[0].error.message};
    return {result:data.results?.[0]?.response?.result};
  }catch(e){ return {error:e.message}; }
}
async function ensureSecurityTables(env){
  await tursoQuery(env, `CREATE TABLE IF NOT EXISTS failed_logins (ip TEXT PRIMARY KEY, attempts INTEGER, last_attempt INTEGER, blocked_until INTEGER)`);
  await tursoQuery(env, `CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, national_id TEXT, ip TEXT, action TEXT, result TEXT, timestamp INTEGER, details TEXT)`);
}
function getClientIp(req){ return req.headers.get('CF-Connecting-IP')||req.headers.get('X-Forwarded-For')?.split(',')[0]||'unknown'; }
async function checkIpBlocked(env,ip){
  const q=await tursoQuery(env, `SELECT blocked_until FROM failed_logins WHERE ip=?`, [ip]);
  if(q.result?.rows?.length){ const c=q.result.cols.map(x=>x.name); const r=safeRowToObject(c,q.result.rows[0]); if(Number(r.blocked_until)>Date.now()) return {blocked:true, secondsLeft: Math.ceil((Number(r.blocked_until)-Date.now())/1000)}; }
  return {blocked:false};
}
async function recordFailedAttempt(env,ip,nid,act){
  const now=Date.now(); const q=await tursoQuery(env, `SELECT attempts FROM failed_logins WHERE ip=?`, [ip]); let att=1;
  if(q.result?.rows?.length){ const c=q.result.cols.map(x=>x.name); att=Number(safeRowToObject(c,q.result.rows[0]).attempts||0)+1; await tursoQuery(env, `UPDATE failed_logins SET attempts=?, last_attempt=?, blocked_until=? WHERE ip=?`, [String(att),String(now),String(att>=5?now+300000:0),ip]); }
  else await tursoQuery(env, `INSERT INTO failed_logins (ip, attempts, last_attempt, blocked_until) VALUES (?,?,?,?)`, [ip,String(att),String(now),String(att>=5?now+300000:0)]);
  await tursoQuery(env, `INSERT INTO audit_log (national_id, ip, action, result, timestamp, details) VALUES (?,?,?,?,?,?)`, [nid||'',ip,act||'failed','failed',String(now),`attempts=${att}`]); return att;
}
async function clearFailedAttempts(env,ip){ await tursoQuery(env, `DELETE FROM failed_logins WHERE ip=?`, [ip]); }

async function fetchAssetWithCleanUrls(request,env){
  let path=new URL(request.url).pathname.replace(/\/+/g,'/');
  const cands=[path, path+'.html', path.toLowerCase()+'.html', '/'+(path.split('/').pop()||'')+'.html'];
  if(path==='/'||path==='') cands.unshift('/Index-Secure-Professional.html','/index.html');
  if(path.toLowerCase().includes('index-secure')) cands.push('/Index-Secure-Professional.html');
  for(const cp of [...new Set(cands)]){
    try{ const u=new URL(request.url); u.pathname=cp; const r=await (env.ASSETS?env.ASSETS.fetch(new Request(u,request)):fetch(new Request(u,request))); if(r.status!==404) return r; }catch{}
  }
  return env.ASSETS?await env.ASSETS.fetch(request):await fetch(request);
}

export default {
  async fetch(request, env, ctx){
    const url=new URL(request.url); let path=url.pathname;
    // حذف redirect http->https الذي يسبب Loop
    if(request.method==='OPTIONS') return new Response(null,{status:204, headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization',...SECURITY_HEADERS}});
    ctx.waitUntil(ensureSecurityTables(env));
    const clientIp=getClientIp(request);
    if(['/api/check-by-card-secure','/api/verify-password-secure','/api/bio-login-by-card-secure'].includes(path)){
      const b=await checkIpBlocked(env,clientIp); if(b.blocked) return new Response(JSON.stringify({ok:false,msg:`محظور ${b.secondsLeft} ثانية`}),{status:429,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
    }
    if(path==='/api/debug-config'){
      const cfg=getTursoConfig(env); const pepper=getPepperSecret(env);
      return new Response(JSON.stringify({v:'V8.1-FIXED',tursoOk:!cfg.error,hasPepper:pepper.length>16,ip:clientIp,time:new Date().toISOString()},null,2),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
    }
    if(path==='/api/get-ip') return new Response(JSON.stringify({ip:clientIp}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});

    if(path==='/api/check-by-card-secure' && request.method==='POST'){
      const body=await request.json().catch(()=>({})); const card=String(body.cardNumber||'').trim();
      if(!isValidNationalIdSecure(card)) return new Response(JSON.stringify({ok:false,msg:'14 رقم'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      const q=await tursoQuery(env, `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`, [card]);
      if(!q.result?.rows?.length) return new Response(JSON.stringify({ok:false,msg:'غير موجود'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      const cols=q.result.cols.map(c=>c.name); const u=safeRowToObject(cols,q.result.rows[0]); delete u['كلمة_المرور'];
      return new Response(JSON.stringify({ok:true,user:u}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
    }

    if(path==='/api/verify-password-secure' && request.method==='POST'){
      const body=await request.json().catch(()=>({})); const card=String(body.cardNumber||'').trim(); const pass=String(body.password||'').trim();
      const q=await tursoQuery(env, `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`, [card]);
      if(!q.result?.rows?.length) return new Response(JSON.stringify({ok:false,msg:'بيانات غير صحيحة'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      const cols=q.result.cols.map(c=>c.name); const u=safeRowToObject(cols,q.result.rows[0]); const stored=String(u['كلمة_المرور']||'').trim();
      const pepper=getPepperSecret(env); const hashed=await hashPasswordSecure(pass,card,pepper);
      let ok=constantTimeCompare(stored,hashed)||constantTimeCompare(stored,pass);
      if(!ok){ const att=await recordFailedAttempt(env,clientIp,card,'password-failed'); return new Response(JSON.stringify({ok:false,msg:`بيانات غير صحيحة بقي ${5-att}`}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
      await clearFailedAttempts(env,clientIp); const token=generateSecureTokenFixed();
      return new Response(JSON.stringify({ok:true,token,role:u['الصلاحيات']||'User'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
    }

    if(path==='/api/salary-turso'){
      const year=url.searchParams.get('year')?.trim(); const month=url.searchParams.get('month')?.trim(); const code=url.searchParams.get('code')?.trim();
      const q=await tursoQuery(env, `SELECT * FROM "مرتبات_شهرية" WHERE "السنه"=? AND "الشهر"=? AND ("كود_العامل"=? OR "الكود_البنكى"=?) LIMIT 1`, [year,month,code,code]);
      if(!q.result?.rows?.length) return new Response(JSON.stringify({found:false,data:null}),[STRIPPED]'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      const cols=q.result.cols.map(c=>c.name); const data={}; q.result.rows[0].forEach((cell,i)=>{ data[cols[i]]=cell.value??''; });
      return new Response(JSON.stringify({found:true,data}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
    }

    let response=await fetchAssetWithCleanUrls(request,env);
    if(!response||response.status===404){
      if(path.startsWith('/api/')) return new Response(JSON.stringify({error:'Not found'}),{status:404,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      return new Response(`404 ${path}`,{status:404,headers:{'Content-Type':'text/html',...SECURITY_HEADERS}});
    }
    return addSecurityHeaders(response);
  }
}
