// _worker.js - V9.1 ULTRA MERGED FIXED - يبني 100%
const HARDCODED_TURSO_URL = "https://company-alldata-mostafadarwish-mostafa505050.aws-eu-west-1.turso.io";
const SECURITY_HEADERS = {
  'Strict-Transport-Security':'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options':'DENY','X-Content-Type-Options':'nosniff',
  'X-XSS-Protection':'1; mode=block','Referrer-Policy':'strict-origin-when-cross-origin',
  'Permissions-Policy':'camera=(self), microphone=(), geolocation=()',
  'X-Powered-By':'SecurePayslip-V9-Merged','Cache-Control':'no-store, no-cache, must-revalidate',
};
function addSecurityHeaders(r){ const h=new Headers(r.headers); for(const [k,v] of Object.entries(SECURITY_HEADERS)) h.set(k,v); return new Response(r.body,{status:r.status,headers:h}); }
function getPepperSecret(env){ return (env.PEPPER_SECRET||'').trim() || "fallback_pepper_v9_please_set"; }
async function hashWithPepper(c,n,p){ const d=new TextEncoder().encode(String(c).trim()+'|'+String(n).trim()+'|'+p); const b=await crypto.subtle.digest('SHA-256',d); return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join(''); }
async function hashPasswordSecure(p,n,pe){ return hashWithPepper(p,n,pe); }
async function hashPatternServer(c,n,p){ return hashWithPepper(c,n,p); }
async function hashFaceServer(c,n,p){ return hashWithPepper(c,n,p); }
function getClientIp(req){ return req.headers.get('CF-Connecting-IP')||'unknown'; }
function safeRowToObject(cols,row){ const o={}; row.forEach((c,i)=>{ const k=cols[i]; if(k.includes('__proto__')) return; o[k]=c.value??c.text??''; }); return o; }
function constantTimeCompare(a,b){ const sa=String(a),sb=String(b); if(sa.length!==sb.length) return false; let r=0; for(let i=0;i<sa.length;i++) r|=sa.charCodeAt(i)^sb.charCodeAt(i); return r===0; }
function isValidNationalIdSecure(id){ return /^\d{14}$/.test(String(id).trim()); }
function generateSecureTokenFixed(){ const a=new Uint8Array(32); crypto.getRandomValues(a); return `sec_${Array.from(a).map(b=>b.toString(16).padStart(2,'0')).join('')}_${Date.now()}`; }
function checkRateLimitSecure(ip,ep){ const k=`${ip}:${ep}`; const now=Date.now(); const e=LOGIN_RATE_LIMIT.get(k); if(!e){ LOGIN_RATE_LIMIT.set(k,{count:1,resetTime:now+60000}); return {allowed:true}; } if(now>e.resetTime){ LOGIN_RATE_LIMIT.set(k,{count:1,resetTime:now+60000}); return {allowed:true}; } e.count++; if(e.count>20) return {allowed:false,retryAfter:Math.ceil((e.resetTime-now)/1000)}; return {allowed:true}; }
let LOGIN_RATE_LIMIT=new Map();
function getTursoConfig(env){ let url=(env.TURSO_URL||HARDCODED_TURSO_URL||'').trim(); let token=(env.TURSO_TOKEN||'').trim(); if(!url) return {error:'TURSO_URL missing'}; if(!token||token.length<10) return {error:'TURSO_TOKEN missing'}; if(url.startsWith('libsql://')) url='https://'+url.slice(8); return {url,token,error:null}; }
async function tursoQuery(env,sql,params=[]){
  const cfg=getTursoConfig(env); if(cfg.error) return {error:cfg.error, isConfigError:true};
  try{
    const res=await fetch(`${cfg.url}/v2/pipeline`, {method:'POST', headers:{'Authorization':`Bearer ${cfg.token}`,'Content-Type':'application/json'}, body: JSON.stringify({requests:[{type:'execute', stmt:{sql, args:params.map(v=>({type:'text',value:String(v)}))}}, {type:'close'}]})});
    const txt=await res.text(); let data; try{ data=JSON.parse(txt); }catch{ return {error:`Turso HTTP ${res.status}: ${txt.slice(0,200)}`}; }
    if(data.results?.[0]?.error) return {error:data.results[0].error.message}; return {result:data.results?.[0]?.response?.result};
  }catch(e){ return {error:e.message}; }
}
async function findEmployeeByCard(env, card){
  const queries = [
    `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`,
    `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومي"=? LIMIT 1`,
    `SELECT * FROM موظفين_مرتبات WHERE الرقم_القومى=? LIMIT 1`,
    `SELECT * FROM "موظفين_مرتبات" WHERE "رقم_قومي"=? LIMIT 1`
  ];
  let lastError=null; for(const sql of queries){ const q=await tursoQuery(env, sql, [card]); if(q.isConfigError) return {found:false, isConfigError:true, error:q.error}; if(q.error){ lastError=q.error; continue; } if(q.result?.rows?.length>0) return {found:true, q, sqlUsed:sql}; } return {found:false, lastError, tried:queries.length};
}
async function ensureSecurityTables(env){ await tursoQuery(env, `CREATE TABLE IF NOT EXISTS failed_logins (ip TEXT PRIMARY KEY, attempts INTEGER, last_attempt INTEGER, blocked_until INTEGER)`); await tursoQuery(env, `CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, national_id TEXT, ip TEXT, action TEXT, result TEXT, timestamp INTEGER, details TEXT)`); }
async function checkIpBlocked(env,ip){ const q=await tursoQuery(env, `SELECT attempts, blocked_until FROM failed_logins WHERE ip=?`, [ip]); if(q.result?.rows?.length){ const c=q.result.cols.map(x=>x.name); const r=safeRowToObject(c,q.result.rows[0]); if(Number(r.blocked_until)>Date.now()) return {blocked:true, secondsLeft:Math.ceil((Number(r.blocked_until)-Date.now())/1000)}; } return {blocked:false}; }
async function recordFailedAttempt(env,ip,nid,act){ const now=Date.now(); const q=await tursoQuery(env, `SELECT attempts FROM failed_logins WHERE ip=?`, [ip]); let att=1; if(q.result?.rows?.length){ const c=q.result.cols.map(x=>x.name); att=Number(safeRowToObject(c,q.result.rows[0]).attempts||0)+1; await tursoQuery(env, `UPDATE failed_logins SET attempts=?, last_attempt=?, blocked_until=? WHERE ip=?`, [String(att),String(now),String(att>=5?now+300000:0),ip]); } else await tursoQuery(env, `INSERT INTO failed_logins (ip, attempts, last_attempt, blocked_until) VALUES (?,?,?,?)`, [ip,String(att),String(now),String(att>=5?now+300000:0)]); return att; }
async function clearFailedAttempts(env,ip){ await tursoQuery(env, `DELETE FROM failed_logins WHERE ip=?`, [ip]); }

export default {
  async fetch(request, env, ctx){
    const url=new URL(request.url); const path=url.pathname;
    if(request.method==='OPTIONS') return new Response(null,{status:204, headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization',...SECURITY_HEADERS}});
    ctx.waitUntil(ensureSecurityTables(env));
    const clientIp=getClientIp(request);
    if(['/api/check-by-card-secure','/api/verify-password-secure'].includes(path)){ const b=await checkIpBlocked(env,clientIp); if(b.blocked) return new Response(JSON.stringify({ok:false,msg:`محظور ${b.secondsLeft} ثانية`}),{status:429,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }

    if(path==='/api/debug-config'){
      const cfg=getTursoConfig(env);
      const countQ=await tursoQuery(env, `SELECT COUNT(*) as c FROM "موظفين_مرتبات"`); let count=countQ.error? countQ.error : '0'; if(countQ.result?.rows?.length){ const cols=countQ.result.cols.map(c=>c.name); count=safeRowToObject(cols,countQ.result.rows[0]).c; }
      return new Response(JSON.stringify({v:'V9.1-FIXED', tursoOk:!cfg.error, tableCount:count, ip:clientIp},null,2),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
    }
    if(path==='/api/get-ip') return new Response(JSON.stringify({ip:clientIp}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});

    if(path==='/api/check-by-card-secure' && request.method==='POST'){
      const body=await request.json().catch(()=>({})); const card=String(body.cardNumber||'').trim();
      if(!isValidNationalIdSecure(card)) return new Response(JSON.stringify({ok:false,msg:'14 رقم'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      const foundRes=await findEmployeeByCard(env, card);
      if(foundRes.isConfigError) return new Response(JSON.stringify({ok:false,msg:`خطأ إعدادات: ${foundRes.error}`}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      if(!foundRes.found) return new Response(JSON.stringify({ok:false,msg:'غير موجود', debug:foundRes.lastError||`جربنا ${foundRes.tried} صيغ`}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      const cols=foundRes.q.result.cols.map(c=>c.name); const u=safeRowToObject(cols,foundRes.q.result.rows[0]); delete u['كلمة_المرور'];
      return new Response(JSON.stringify({ok:true,user:u}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
    }

    if(path==='/api/verify-password-secure' && request.method==='POST'){
      const body=await request.json().catch(()=>({})); const card=String(body.cardNumber||'').trim(); const pass=String(body.password||'').trim();
      const foundRes=await findEmployeeByCard(env, card); if(!foundRes.found) return new Response(JSON.stringify({ok:false,msg:'بيانات غير صحيحة'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      const cols=foundRes.q.result.cols.map(c=>c.name); const u=safeRowToObject(cols,foundRes.q.result.rows[0]); const stored=String(u['كلمة_المرور']||'').trim(); const pepper=getPepperSecret(env); const hashed=await hashPasswordSecure(pass,card,pepper);
      let ok=constantTimeCompare(stored,hashed)||constantTimeCompare(stored,pass); if(!ok){ const att=await recordFailedAttempt(env,clientIp,card,'password-failed'); return new Response(JSON.stringify({ok:false,msg:`بيانات غير صحيحة بقي ${5-att}`}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
      await clearFailedAttempts(env,clientIp); const token=generateSecureTokenFixed();
      return new Response(JSON.stringify({ok:true,token,role:u['الصلاحيات']||'User'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
    }

    if(path==='/api/salary-turso'){
      const year=url.searchParams.get('year')?.trim(); const month=url.searchParams.get('month')?.trim(); const code=url.searchParams.get('code')?.trim();
      const q=await tursoQuery(env, `SELECT * FROM "مرتبات_شهرية" WHERE "السنه"=? AND "الشهر"=? AND ("كود_العامل"=? OR "الكود_البنكى"=?) LIMIT 1`, [year,month,code,code]);
      if(!q.result?.rows?.length){
        return new Response(JSON.stringify({found:false,data:null}), {
          headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}
        });
      }
      const cols=q.result.cols.map(c=>c.name); const data={}; q.result.rows[0].forEach((cell,i)=>{ data[cols[i]]=cell.value??''; });
      return new Response(JSON.stringify({found:true,data}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
    }

    // Static files
    try{
      if(env.ASSETS){ const res=await env.ASSETS.fetch(request); if(res.status!==404) return addSecurityHeaders(res); }
      return new Response(`404 ${path}`,{status:404,headers:{'Content-Type':'text/html',...SECURITY_HEADERS}});
    }catch{ return new Response('Not found',{status:404}); }
  }
}
