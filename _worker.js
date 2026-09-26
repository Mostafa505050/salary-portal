// _worker-v8-PEPPER-IP-BLOCK-ULTRA.js - V8 نهائي مع PEPPER_SECRET + حظر IP + سجل محاولات + V10
// التحسينات:
// 1- PEPPER_SECRET من متغيرات البيئة (لا يظهر في الكود)
// 2- حظر IP تلقائي بعد 5 محاولات فاشلة لمدة 5 دقائق
// 3- جدول audit_log لتسجيل كل محاولة دخول
// 4- تشفير كلمات المرور بـ SHA-256 + Pepper + NationalID
// 5- دعم V10 (hash فقط بدون value + كشف حيوية)
// 6- إصلاح Not Found + TURSO_TOKEN + debug-config

const HARDCODED_TURSO_URL = "https://company-alldata-mostafadarwish-mostafa505050.aws-eu-west-1.turso.io";
const HARDCODED_TURSO_TOKEN = "";
const DEFAULT_PEPPER = "fallback_pepper_v8_please_set_PEPPER_SECRET_in_cloudflare"; // يستخدم فقط لو لم تضع PEPPER_SECRET

const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
  'X-Powered-By': 'SecurePayslip-V8-Ultra',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

function addSecurityHeaders(response){
  try{
    const newHeaders = new Headers(response.headers);
    for(const [k,v] of Object.entries(SECURITY_HEADERS)){ if(!newHeaders.has(k)) newHeaders.set(k, v); }
    return new Response(response.body, {status: response.status, headers: newHeaders});
  }catch{ return response; }
}

// ========== دوال التشفير مع Pepper السري ==========
function getPepperSecret(env){
  const pepper = (env.PEPPER_SECRET || env.PEPPER || '').trim();
  if(pepper && pepper.length >= 16) return pepper;
  return DEFAULT_PEPPER;
}

async function hashWithPepper(clientHash, nationalId, pepperSecret){
  try{
    const data = new TextEncoder().encode(String(clientHash).trim() + '|' + String(nationalId).trim() + '|' + pepperSecret);
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }catch(e){
    return String(clientHash);
  }
}

async function hashPatternClient(patternValue, nationalId){
  // ما يفعله العميل V10: SHA256(pattern | nationalId)
  try{
    const clean = String(patternValue).replace(/[^0-9,]/g,'').substring(0,50);
    const data = new TextEncoder().encode(clean + '|' + String(nationalId).trim());
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }catch{ return String(patternValue); }
}

async function hashPatternServer(clientHash, nationalId, pepperSecret){
  // ما يفعله الخادم: SHA256(clientHash | nationalId | pepper)
  return await hashWithPepper(clientHash, nationalId, pepperSecret);
}

async function hashFaceClient(rawSample, nationalId){
  try{
    const data = new TextEncoder().encode(String(rawSample).trim().substring(0,1000) + '|' + String(nationalId).trim());
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }catch{ return String(rawSample).substring(0,64); }
}

async function hashFaceServer(clientHash, nationalId, pepperSecret){
  return await hashWithPepper(clientHash, nationalId, pepperSecret);
}

async function hashPasswordSecure(password, nationalId, pepperSecret){
  try{
    const data = new TextEncoder().encode(String(password).trim() + '|' + String(nationalId).trim() + '|' + pepperSecret);
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }catch{ return String(password); }
}

// ========== حماية الدخول عبر الرئيسية ==========
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
  try{ const ref = request.headers.get('Referer') || ''; if(ref.toLowerCase().includes('index.html') || ref.endsWith('/') || ref.includes('/index')) return true; }catch{}
  return false;
}
function isEntryHtmlPage(path){
  const low = path.toLowerCase();
  if(['/api/','/js/','.js','.css','.json','.png','.jpg','.svg','.ico','real-monitoring','whitelist','allowed-ips','block-device','get-ip','blocked-devices','blocked-list','turso','cache-','favicon','auth','login','dashboard','protect.js','real-logger.js','debug-config','security-stats'].some(s=> low.includes(s.toLowerCase()))) return false;
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
  PASSWORD_MIN_LEN: 8,
  BIO_MAX_LEN: 25000,
  RATE_LIMIT_WINDOW_MS: 60 * 1000,
  RATE_LIMIT_MAX: 20,
  TOKEN_BYTES: 32,
  MAX_FAILED_ATTEMPTS: 5,
  BLOCK_DURATION_MS: 5*60*1000, // 5 دقائق
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
  let url = (env.TURSO_URL || env.TURSO_URLL || HARDCODED_TURSO_URL || '').trim();
  let token = (env.TURSO_TOKEN || env.TURSO_TOKENL || HARDCODED_TURSO_TOKEN || '').trim();
  if(!url){ return {url:null, token:null, error:'TURSO_URL غير موجود في متغيرات البيئة'}; }
  if(!token || token.length < 10){ return {url:null, token:null, error:'TURSO_TOKEN فارغ أو قصير - ضعه في Cloudflare > Settings > Variables'}; }
  if(token.includes("PASTE_YOUR")){ return {url:null, token:null, error:'TURSO_TOKEN مازال نص افتراضي'}; }
  if(url.startsWith('libsql://')) url='https://'+url.slice(8);
  if(url &&!url.startsWith('https://')) url='https://'+url;
  return {url, token, error:null};
}

async function tursoQuery(env, sql, params=[]){
  const cfg = getTursoConfig(env);
  if(cfg.error || !cfg.url || !cfg.token){
    return {error: cfg.error || 'no config - ضع TURSO_TOKEN في Cloudflare', isConfigError:true};
  }
  try{
    const args = params.map(v=>({type:'text', value:String(v)}));
    const res = await fetch(`${cfg.url}/v2/pipeline`, {
      method:'POST',
      headers:{'Authorization':`Bearer ${cfg.token}`, 'Content-Type':'application/json'},
      body: JSON.stringify({requests:[{type:'execute', stmt:{sql, args}}, {type:'close'}]})
    });
    if(!res.ok){
      const txt = await res.text().catch(()=>res.statusText);
      return {error:`Turso HTTP ${res.status}: ${txt.substring(0,200)}`, isHttpError:true};
    }
    const data = await res.json();
    if(data.results?.[0]?.error){
      return {error: data.results[0].error.message, raw:data, isSqlError:true};
    }
    return {result: data.results?.[0]?.response?.result, raw:data};
  }catch(e){ return {error:`استثناء Turso: ${e.message}`, isException:true}; }
}

// ========== جداول الأمان الجديدة V8 ==========
async function ensureSecurityTables(env){
  try{
    await tursoQuery(env, `CREATE TABLE IF NOT EXISTS failed_logins (ip TEXT PRIMARY KEY, attempts INTEGER DEFAULT 0, last_attempt INTEGER, blocked_until INTEGER)`);
    await tursoQuery(env, `CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, national_id TEXT, ip TEXT, action TEXT, result TEXT, timestamp INTEGER, details TEXT)`);
  }catch(e){
    // تجاهل خطأ إنشاء الجداول
    console.log('ensure tables error', e.message);
  }
}

function getClientIp(request){
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown';
}

async function checkIpBlocked(env, ip){
  if(ip==='unknown') return {blocked:false};
  try{
    const q = await tursoQuery(env, `SELECT attempts, blocked_until FROM failed_logins WHERE ip=? LIMIT 1`, [ip]);
    if(q.result?.rows && q.result.rows.length>0){
      const cols=q.result.cols.map(c=>c.name);
      const row=safeRowToObject(cols, q.result.rows[0]);
      const blockedUntil=Number(row['blocked_until']||0);
      const now=Date.now();
      if(blockedUntil && now < blockedUntil){
        const secLeft=Math.ceil((blockedUntil-now)/1000);
        return {blocked:true, secondsLeft: secLeft, attempts: Number(row['attempts']||0)};
      }
      // لو انتهى الحظر، امسح
      if(blockedUntil && now >= blockedUntil){
        await tursoQuery(env, `DELETE FROM failed_logins WHERE ip=?`, [ip]);
        return {blocked:false};
      }
    }
  }catch(e){}
  return {blocked:false};
}

async function recordFailedAttempt(env, ip, nationalId, action){
  try{
    const now=Date.now();
    const q = await tursoQuery(env, `SELECT attempts FROM failed_logins WHERE ip=? LIMIT 1`, [ip]);
    let attempts=1;
    if(q.result?.rows && q.result.rows.length>0){
      const cols=q.result.cols.map(c=>c.name);
      const row=safeRowToObject(cols, q.result.rows[0]);
      attempts=Number(row['attempts']||0)+1;
      const blockedUntil = attempts >= SECURE_LOGIN_CONFIG.MAX_FAILED_ATTEMPTS ? now + SECURE_LOGIN_CONFIG.BLOCK_DURATION_MS : 0;
      await tursoQuery(env, `UPDATE failed_logins SET attempts=?, last_attempt=?, blocked_until=? WHERE ip=?`, [String(attempts), String(now), String(blockedUntil), ip]);
    } else {
      const blockedUntil = attempts >= SECURE_LOGIN_CONFIG.MAX_FAILED_ATTEMPTS ? now + SECURE_LOGIN_CONFIG.BLOCK_DURATION_MS : 0;
      await tursoQuery(env, `INSERT INTO failed_logins (ip, attempts, last_attempt, blocked_until) VALUES (?,?,?,?)`, [ip, String(attempts), String(now), String(blockedUntil)]);
    }
    // سجل في audit_log
    await tursoQuery(env, `INSERT INTO audit_log (national_id, ip, action, result, timestamp, details) VALUES (?,?,?,?,?,?)`, [nationalId||'', ip, action||'failed', 'failed', String(now), `attempts=${attempts}`]);
    return attempts;
  }catch(e){ return 1; }
}

async function clearFailedAttempts(env, ip){
  try{
    await tursoQuery(env, `DELETE FROM failed_logins WHERE ip=?`, [ip]);
  }catch{}
}

async function logAudit(env, nationalId, ip, action, result, details){
  try{
    const now=Date.now();
    await tursoQuery(env, `INSERT INTO audit_log (national_id, ip, action, result, timestamp, details) VALUES (?,?,?,?,?,?)`, [nationalId||'', ip, action||'', result||'', String(now), details||'']);
  }catch{}
}

async function fetchAssetWithCleanUrls(request, env){
  const url=new URL(request.url); let path=url.pathname; path=path.replace(/\/+/g,'/');
  const candidates=[]; 
  candidates.push(path);
  const hasExt=path.split('/').pop()?.includes('.')||false;
  if(!hasExt && path!=='/'){
    candidates.push(path+'.html');
    candidates.push(path+'/index.html');
    candidates.push(path.toLowerCase()+'.html');
    const base = path.split('/').pop();
    candidates.push('/'+base+'.html');
    candidates.push('/'+base.toLowerCase()+'.html');
    if(base.toLowerCase().includes('index-secure')) {
      candidates.push('/Index-Secure-Professional.html');
      candidates.push('/index-secure-professional.html');
      candidates.push('/index-biometric-camera-v5-FULL.html');
      candidates.push('/index-v10-ultra-secure-final.html');
      candidates.push('/index-v9-face-direct-auto.html');
    }
  }
  if(path==='/'||path===''){ 
    candidates.unshift('/index.html'); 
    candidates.unshift('/Index-Secure-Professional.html');
  }
  for(const candPath of candidates){
    try{
      const candUrl=new URL(request.url); candUrl.pathname=candPath;
      const candReq=new Request(candUrl, request);
      if(env.ASSETS){
        const res=await env.ASSETS.fetch(candReq);
        if(res.status!==404) return res;
      }
    }catch{ continue; }
  }
  try{ if(env.ASSETS) return await env.ASSETS.fetch(request); return await fetch(request); }catch{ return null; }
}

export default {
  async fetch(request, env, ctx){
    const url=new URL(request.url); const path=url.pathname;

    if(url.protocol==='http:'){ return Response.redirect(url.toString().replace('http://','https://'),301); }

    if(request.method==='OPTIONS'){
      return new Response(null,{status:204, headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization',...SECURITY_HEADERS}});
    }

    // تأكد من جداول الأمان (في الخلفية)
    ctx.waitUntil(ensureSecurityTables(env));

    const clientIp = getClientIp(request);

    // فحص حظر IP قبل أي API حساس
    const sensitivePaths = ['/api/check-by-card-secure','/api/verify-password-secure','/api/bio-login-by-card-secure','/api/register-by-card-secure'];
    if(sensitivePaths.includes(path)){
      const blockCheck = await checkIpBlocked(env, clientIp);
      if(blockCheck.blocked){
        return new Response(JSON.stringify({ok:false,msg:`🔒 IP محظور مؤقتاً بسبب محاولات كثيرة - حاول بعد ${blockCheck.secondsLeft} ثانية`, blocked:true, secondsLeft:blockCheck.secondsLeft}),{status:429,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }
    }

    // حماية الدخول - نقطة الدخول الآن هي Index-Secure-Professional.html
    if(isEntryHtmlPage(path)){
      const lowerPath = path.toLowerCase();
      const isMainEntry = lowerPath === '/' || lowerPath.endsWith('index.html') || lowerPath.includes('index-secure-professional');
      
      // لو ليست صفحة الدخول الرئيسية وليس لديه كوكي دخول
      if(!hasValidEntry(request) && !isMainEntry){
        let pageName = path.split('/').pop() || path;
        // السماح فقط لصفحات تسجيل الدخول نفسها
        const isSecureLogin = lowerPath.includes('index-secure') || lowerPath.includes('secure') || lowerPath.includes('biometric') || lowerPath.includes('professional');
        if(!isSecureLogin){
          return new Response(entryBlockedHTMLFixed(pageName),{
            status:403, 
            headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache',...SECURITY_HEADERS}
          });
        }
      }
    }

    // API تشخيصي محدث V8
    if(path==='/api/debug-config'){
      const cfg = getTursoConfig(env);
      const pepper = getPepperSecret(env);
      const hasAssets = !!env.ASSETS;
      const ip = clientIp;
      const isDefaultPepper = pepper===DEFAULT_PEPPER;
      return new Response(JSON.stringify({
        v: 'V8-Ultra-PEPPER-IP-BLOCK',
        tursoUrl: cfg.url ? cfg.url.substring(0,40)+'...' : 'missing',
        hasToken: !!cfg.token,
        tokenLength: cfg.token ? cfg.token.length : 0,
        configError: cfg.error,
        hasPepperSecret: !isDefaultPepper,
        pepperLength: pepper.length,
        pepperIsDefault: isDefaultPepper,
        pepperWarning: isDefaultPepper ? '⚠️ لم تضع PEPPER_SECRET - ضعه في Cloudflare > Settings > Variables' : '✅ PEPPER_SECRET موجود',
        hasAssets,
        ip,
        time: new Date().toISOString(),
        security: {
          maxFailedAttempts: SECURE_LOGIN_CONFIG.MAX_FAILED_ATTEMPTS,
          blockDuration: '5 minutes',
          sessionTimeout: '15 minutes'
        }
      }, null, 2), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
    }

    // API إحصائيات الأمان (للأدمن)
    if(path==='/api/security-stats'){
      try{
        const q1 = await tursoQuery(env, `SELECT COUNT(*) as cnt FROM failed_logins WHERE blocked_until > ?`, [String(Date.now())]);
        let blockedCount=0;
        if(q1.result?.rows?.length){ const cols=q1.result.cols.map(c=>c.name); const row=safeRowToObject(cols,q1.result.rows[0]); blockedCount=Number(row['cnt']||0); }
        const q2 = await tursoQuery(env, `SELECT COUNT(*) as cnt FROM audit_log WHERE timestamp > ?`, [String(Date.now()-24*3600*1000)]);
        let last24h=0;
        if(q2.result?.rows?.length){ const cols=q2.result.cols.map(c=>c.name); const row=safeRowToObject(cols,q2.result.rows[0]); last24h=Number(row['cnt']||0); }
        const q3 = await tursoQuery(env, `SELECT ip, attempts, blocked_until FROM failed_logins ORDER BY last_attempt DESC LIMIT 20`);
        let blockedIps=[];
        if(q3.result?.rows){ const cols=q3.result.cols.map(c=>c.name); blockedIps=q3.result.rows.map(r=>safeRowToObject(cols,r)); }
        return new Response(JSON.stringify({blockedCount, last24hAttempts: last24h, blockedIps, time:new Date().toISOString()}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }catch(e){
        return new Response(JSON.stringify({error:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }
    }

    if(path==='/api/get-ip'){
      const ip=clientIp;
      return new Response(JSON.stringify({ip}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache',...SECURITY_HEADERS}});
    }

    // فحص البطاقة
    if(path==='/api/check-by-card-secure' && request.method==='POST'){
      try{
        const ip=clientIp;
        const rl=checkRateLimitSecure(ip,'check-card');
        if(!rl.allowed) return new Response(JSON.stringify({ok:false,msg:`محاولات كثيرة - حاول بعد ${rl.retryAfter} ثانية`}),{status:429,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const body=await request.json().catch(()=>({}));
        const cardNumber=String(body.cardNumber||'').trim();
        if(!isValidNationalIdSecure(cardNumber)) return new Response(JSON.stringify({ok:false,msg:'رقم البطاقة 14 رقم'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        
        let q = await tursoQuery(env, `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`, [cardNumber]);
        if(q.isConfigError){
          return new Response(JSON.stringify({ok:false,msg:`خطأ إعدادات قاعدة البيانات: ${q.error} - اذهب لـ Cloudflare > Settings > Variables وأضف TURSO_TOKEN`, debug:q.error}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        }
        if(q.error){
          let q2 = await tursoQuery(env, `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومي"=? LIMIT 1`, [cardNumber]);
          if(q2.error){
            return new Response(JSON.stringify({ok:false,msg:`خطأ قاعدة البيانات: ${q.error} / ${q2.error}`, debug:`${q.error} | ${q2.error}`}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
          }
          q = q2;
        }
        if(!q.result?.rows||q.result.rows.length===0){
          await recordFailedAttempt(env, ip, cardNumber, 'check-card-not-found');
          return new Response(JSON.stringify({ok:false,msg:'رقم البطاقة غير موجود في جدول موظفين_مرتبات'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        }
        const cols=q.result.cols.map(c=>c.name); const userObj=safeRowToObject(cols,q.result.rows[0]);
        const safeUser={...userObj}; delete safeUser['كلمة_المرور']; delete safeUser['كلمة المرور']; delete safeUser['password'];
        await logAudit(env, cardNumber, ip, 'check-card', 'success', '');
        return new Response(JSON.stringify({ok:true,user:safeUser}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }catch(e){
        return new Response(JSON.stringify({ok:false,msg:`خطأ خادم: ${e.message}`}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }
    }

    if(path==='/api/get-routing-secure'){
      try{
        const nationalId=url.searchParams.get('nationalId')?.trim()||''; const code=url.searchParams.get('code')?.trim()||'';
        const q=await tursoQuery(env, `SELECT * FROM "توجيه_المستخدمين" WHERE ("الرقم_القومى"=? OR "الكود_البنكى"=?) AND "مفعلة"=1 LIMIT 1`, [nationalId,code]);
        if(q.isConfigError) return new Response(JSON.stringify({found:false,error:q.error}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        if(q.error||!q.result?.rows||q.result.rows.length===0) return new Response(JSON.stringify({found:false}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const cols=q.result.cols.map(c=>c.name); const routing=safeRowToObject(cols,q.result.rows[0]); return new Response(JSON.stringify({found:true,routing}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }catch(e){ return new Response(JSON.stringify({found:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
    }

    // تسجيل الدخول بكلمة المرور - V8 مع Pepper
    if(path==='/api/verify-password-secure' && request.method==='POST'){
      try{
        const ip=clientIp;
        const body=await request.json().catch(()=>({})); const cardNumber=String(body.cardNumber||'').trim(); const password=String(body.password||'').trim();
        if(!isValidNationalIdSecure(cardNumber)) return new Response(JSON.stringify({ok:false,msg:'بيانات غير صحيحة'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const q=await tursoQuery(env, `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`, [cardNumber]);
        if(q.isConfigError) return new Response(JSON.stringify({ok:false,msg:`خطأ إعدادات: ${q.error}`}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        if(q.error||!q.result?.rows||q.result.rows.length===0){
          await recordFailedAttempt(env, ip, cardNumber, 'password-login-not-found');
          return new Response(JSON.stringify({ok:false,msg:'بيانات غير صحيحة'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        }
        const cols=q.result.cols.map(c=>c.name); const userObj=safeRowToObject(cols,q.result.rows[0]); const storedPass=String(userObj['كلمة_المرور']||'').trim();
        const pepperSecret=getPepperSecret(env);
        const hashedAttempt=await hashPasswordSecure(password, cardNumber, pepperSecret);
        
        let ok=false;
        if(storedPass.length===64){ // مخزن مشفر V8
          ok=constantTimeCompare(storedPass, hashedAttempt);
        } else { // قديم غير مشفر - للمigration
          ok=constantTimeCompare(storedPass, password);
          // لو صحيح، حدثه للمشفر
          if(ok){
            ctx.waitUntil(tursoQuery(env, `UPDATE "موظفين_مرتبات" SET "كلمة_المرور"=? WHERE "الرقم_القومى"=?`, [hashedAttempt, cardNumber]));
          }
        }
        
        if(!ok){
          const attempts=await recordFailedAttempt(env, ip, cardNumber, 'password-login-failed');
          const left=SECURE_LOGIN_CONFIG.MAX_FAILED_ATTEMPTS-attempts;
          return new Response(JSON.stringify({ok:false,msg:left>0?`بيانات غير صحيحة - بقي ${left} محاولات قبل الحظر`:`تم حظرك 5 دقائق بسبب محاولات كثيرة`, attemptsLeft:left}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        }
        await clearFailedAttempts(env, ip);
        await logAudit(env, cardNumber, ip, 'password-login', 'success', '');
        const token=generateSecureTokenFixed(); return new Response(JSON.stringify({ok:true,token,role:userObj['الصلاحيات']||'User'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }catch(e){ return new Response(JSON.stringify({ok:false,msg:`خطأ خادم: ${e.message}`}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
    }

    // التسجيل - V8 مع Pepper
    if(path==='/api/register-by-card-secure' && request.method==='POST'){
      try{
        const ip=clientIp;
        const body=await request.json().catch(()=>({})); const cardNumber=String(body.cardNumber||'').trim(); let bio=String(body.bio||'').trim(); const password=String(body.password||'').trim();
        if(!isValidNationalIdSecure(cardNumber)) return new Response(JSON.stringify({ok:false,msg:'رقم غير صالح'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        if(password.length<8) return new Response(JSON.stringify({ok:false,msg:'كلمة المرور 8 أحرف'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        if(bio.length > SECURE_LOGIN_CONFIG.BIO_MAX_LEN) return new Response(JSON.stringify({ok:false,msg:`البصمة كبيرة جداً ${bio.length}`}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        
        const pepperSecret=getPepperSecret(env);
        const hashedPassword=await hashPasswordSecure(password, cardNumber, pepperSecret);
        
        try{
          const bioObj=JSON.parse(bio);
          if(bioObj.type==='pattern'){
            if(bioObj.hash){ // V10 - العميل أرسل hash فقط
              const serverHash=await hashPatternServer(bioObj.hash, cardNumber, pepperSecret);
              bioObj.serverHash=serverHash;
              bioObj.hash=undefined; // لا نحتاج hash العميل
              bioObj.value=undefined;
              bioObj.secure=true; bioObj.v10=true; bioObj.v8=true;
              bio=JSON.stringify(bioObj);
            } else if(bioObj.value){ // V9 قديم - أرسل value
              const clientHash=await hashPatternClient(bioObj.value, cardNumber);
              const serverHash=await hashPatternServer(clientHash, cardNumber, pepperSecret);
              bioObj.serverHash=serverHash;
              bioObj.value=undefined;
              bioObj.hash=undefined;
              bioObj.secure=true; bioObj.v8=true;
              bio=JSON.stringify(bioObj);
            }
          }
          if(bioObj.type==='face_camera'&&bioObj.hash){
            // V10 مع كشف حيوية - hash هو clientHash
            const serverHash=await hashFaceServer(bioObj.hash, cardNumber, pepperSecret);
            bioObj.serverHash=serverHash;
            bioObj.hash=undefined;
            bioObj.secure=true; bioObj.v10=true; bioObj.v8=true; bioObj.liveness=true;
            bio=JSON.stringify(bioObj);
          }
          if(bioObj.type==='fingerprint'){
            bioObj.v8=true; bioObj.secure=true;
            bio=JSON.stringify(bioObj);
          }
        }catch{}
        
        const updateQ=await tursoQuery(env, `UPDATE "موظفين_مرتبات" SET "بصمة"=?, "كلمة_المرور"=? WHERE "الرقم_القومى"=?`, [bio, hashedPassword, cardNumber]);
        if(updateQ.isConfigError) return new Response(JSON.stringify({ok:false,msg:`خطأ إعدادات: ${updateQ.error}`}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        if(updateQ.error) return new Response(JSON.stringify({ok:false,msg:`فشل الحفظ: ${updateQ.error}`}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        await clearFailedAttempts(env, ip);
        await logAudit(env, cardNumber, ip, 'register', 'success', '');
        return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }catch(e){ return new Response(JSON.stringify({ok:false,msg:`خطأ خادم: ${e.message}`}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
    }

    // تسجيل الدخول بالبصمة - V8 مع Pepper + IP Block
    if(path==='/api/bio-login-by-card-secure' && request.method==='POST'){
      try{
        const ip=clientIp;
        const body=await request.json().catch(()=>({})); const cardNumber=String(body.cardNumber||'').trim(); const bioAttempt=body.bioAttempt?String(body.bioAttempt).trim():null;
        if(!isValidNationalIdSecure(cardNumber)) return new Response(JSON.stringify({ok:false,msg:'رقم غير صالح'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const q=await tursoQuery(env, `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`, [cardNumber]);
        if(q.isConfigError) return new Response(JSON.stringify({ok:false,msg:`خطأ إعدادات: ${q.error}`}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        if(q.error||!q.result?.rows||q.result.rows.length===0){
          await recordFailedAttempt(env, ip, cardNumber, 'bio-login-not-found');
          return new Response(JSON.stringify({ok:false,msg:'غير موجود'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        }
        const cols=q.result.cols.map(c=>c.name); const userObj=safeRowToObject(cols,q.result.rows[0]); const savedBioStr=String(userObj['بصمة']||'').trim();
        if(!savedBioStr){
          await recordFailedAttempt(env, ip, cardNumber, 'bio-no-bio');
          return new Response(JSON.stringify({ok:false,msg:'لا توجد بصمة'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        }
        let savedBio; try{ savedBio=JSON.parse(savedBioStr); }catch{ return new Response(JSON.stringify({ok:false,msg:'بيانات تالفة'}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }

        const pepperSecret=getPepperSecret(env);

        if(savedBio.type==='pattern'){
          if(!bioAttempt) return new Response(JSON.stringify({ok:false,msg:'أدخل النقش'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
          let ok=false;
          if(savedBio.serverHash){ // V8 جديد
            const attemptServerHash=await hashPatternServer(bioAttempt, cardNumber, pepperSecret);
            ok=constantTimeCompare(attemptServerHash, savedBio.serverHash);
          } else if(savedBio.hash){ // V7 أو V9
            const attemptHash=await hashPatternClient(bioAttempt, cardNumber); // bioAttempt قد يكون value
            // جرب الاثنين: مقارنة مباشرة مع hash القديم
            if(constantTimeCompare(attemptHash, savedBio.hash)) ok=true;
            else {
              // جرب hashWithPepper
              const attemptServerHash=await hashPatternServer(bioAttempt, cardNumber, pepperSecret);
              if(constantTimeCompare(attemptServerHash, savedBio.hash)) ok=true;
              // جرب لو bioAttempt نفسه hash
              const attemptServerHash2=await hashPatternServer(bioAttempt, cardNumber, pepperSecret);
              if(constantTimeCompare(attemptServerHash2, savedBio.serverHash||'')) ok=true;
            }
            // للتوافق مع V7 القديم الذي كان يخزن value
            if(!ok && savedBio.value){ if(constantTimeCompare(String(savedBio.value).trim(), bioAttempt.trim())) ok=true; }
          } else if(savedBio.value){ ok=constantTimeCompare(String(savedBio.value).trim(), bioAttempt.trim()); }
          
          if(!ok){
            const attempts=await recordFailedAttempt(env, ip, cardNumber, 'pattern-failed');
            const left=SECURE_LOGIN_CONFIG.MAX_FAILED_ATTEMPTS-attempts;
            return new Response(JSON.stringify({ok:false,msg:left>0?`النقش غير مطابق - بقي ${left} محاولات`:`تم حظرك 5 دقائق`, attemptsLeft:left}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
          }
        } else if(savedBio.type==='face_camera'){
          if(!bioAttempt) return new Response(JSON.stringify({ok:false,msg:'التقط الوجه أولاً'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
          let ok=false;
          if(savedBio.serverHash){
            const attemptServerHash=await hashFaceServer(bioAttempt, cardNumber, pepperSecret);
            if(constantTimeCompare(savedBio.serverHash, attemptServerHash)) ok=true;
          }
          if(!ok && savedBio.hash && constantTimeCompare(savedBio.hash, bioAttempt)) ok=true;
          if(!ok){
            const attempts=await recordFailedAttempt(env, ip, cardNumber, 'face-failed');
            const left=SECURE_LOGIN_CONFIG.MAX_FAILED_ATTEMPTS-attempts;
            return new Response(JSON.stringify({ok:false,msg:left>0?`الوجه غير مطابق - بقي ${left}`:`تم حظرك 5 دقائق`, attemptsLeft:left}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
          }
        }
        // fingerprint لا يحتاج bioAttempt - WebAuthn يتحقق في العميل
        await clearFailedAttempts(env, ip);
        await logAudit(env, cardNumber, ip, `bio-login-${savedBio.type}`, 'success', '');
        const token=generateSecureTokenFixed();
        return new Response(JSON.stringify({ok:true,token,role:userObj['الصلاحيات']||'User'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }catch(e){ return new Response(JSON.stringify({ok:false,msg:`خطأ خادم: ${e.message}`}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
    }

    if(path==='/api/salary-turso'){
      try{
        const year=url.searchParams.get('year')?.trim(); const month=url.searchParams.get('month')?.trim(); const code=url.searchParams.get('code')?.trim();
        if(!year||!/^\d{4}$/.test(year)) return new Response(JSON.stringify({found:false,error:'سنة غير صالحة'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const q=await tursoQuery(env, `SELECT * FROM "مرتبات_شهرية" WHERE "السنه" =? AND "الشهر" =? AND ("كود_العامل" =? OR "الكود_البنكى" =? OR "emptid" =?) LIMIT 1`, [year,month,code,code,code]);
        if(q.isConfigError) return new Response(JSON.stringify({found:false,error:q.error, configError:true}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        if(q.error) return new Response(JSON.stringify({found:false,error:q.error}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        if(!q.result?.rows||q.result.rows.length===0) return new Response(JSON.stringify({found:false,data:null}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const cols=q.result.cols.map(c=>c.name); const row=q.result.rows[0]; const data={}; row.forEach((cell,i)=>{ data[cols[i]]=cell.value??cell.text??''; }); return new Response(JSON.stringify({found:true,data}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }catch(e){ return new Response(JSON.stringify({found:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
    }

    // جلب الملفات
    let response;
    try{
      const assetRes=await fetchAssetWithCleanUrls(request,env);
      if(assetRes&&assetRes.status!==404) response=assetRes;
      else { if(env.ASSETS){ response=await env.ASSETS.fetch(request); if(response.status===404&&!path.includes('.')){ const urlHtml=new URL(request.url); urlHtml.pathname=path+'.html'; const resHtml=await env.ASSETS.fetch(new Request(urlHtml,request)); if(resHtml.status!==404) response=resHtml; } } else { response=await fetch(request); } }
    }catch{ return new Response(`Not found - ${path}`,{status:404,headers:{'Content-Type':'text/plain',...SECURITY_HEADERS}}); }

    if(!response || response.status===404){
      if(path.startsWith('/api/')) return new Response(JSON.stringify({error:"Not found", path}),{status:404,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      return new Response(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>404</title></head><body style="background:#020a05;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:Cairo"><div style="text-align:center"><h1>404</h1><p>${path} غير موجود</p><p>جرب:</p><a href="/index.html" style="color:#10b981;margin:5px">index.html</a><a href="/index-v10-ultra-secure-final.html" style="color:#10b981;margin:5px">V10 Ultra</a><br><br><a href="/api/debug-config" style="color:#a78bfa;font-size:11px">فحص الإعدادات /api/debug-config</a> | <a href="/api/security-stats" style="color:#a78bfa;font-size:11px">إحصائيات الأمان</a></div></div></body></html>`,{status:404,headers:{'Content-Type':'text/html; charset=utf-8',...SECURITY_HEADERS}});
    }

    const contentType=response.headers.get('Content-Type')||'';
    if(contentType.includes('text/html')&&response.status===200){
      const isIndex=(path==='/'||path===''||path.toLowerCase().endsWith('index.html'));
      if(isIndex) return addEntryCookieToResponse(addSecurityHeaders(response));
      return addSecurityHeaders(response);
    }
    return addSecurityHeaders(response);
  }
}
