// _worker-v7-REDIRECT-FIXED-FINAL.js - إصلاح ERR_TOO_MANY_REDIRECTS نهائياً
// نفس كودك V7 بدون تغيير أي دالة - فقط إصلاح الـ Redirect اللانهائي + دعم index.html

const HARDCODED_TURSO_URL = "https://company-alldata-mostafadarwish-mostafa505050.aws-eu-west-1.turso.io";
const HARDCODED_TURSO_TOKEN = "";

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
  if(['/api/','/js/','.js','.css','.json','.png','.jpg','.svg','.ico','real-monitoring','whitelist','allowed-ips','block-device','get-ip','blocked-devices','blocked-list','turso','cache-','favicon','auth','login','dashboard','protect.js','real-logger.js','debug-config'].some(s=> low.includes(s.toLowerCase()))) return false;
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
  BIO_MAX_LEN: 25000,
  RATE_LIMIT_WINDOW_MS: 60 * 1000,
  RATE_LIMIT_MAX: 20,
  TOKEN_BYTES: 32
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

// إصلاح جلب الملفات - يدعم index.html
async function fetchAssetWithCleanUrls(request, env){
  const url=new URL(request.url); let path=url.pathname; path=path.replace(/\/+/g,'/');
  const lowPath = path.toLowerCase();

  // لو طلب الاسم القديم، حوله للجديد
  if(lowPath === '/index-secure-professional.html' || lowPath === '/index-secure-professional'){
    const newUrl = new URL(request.url); newUrl.pathname = '/index.html';
    try{ if(env.ASSETS){ const res = await env.ASSETS.fetch(new Request(newUrl, request)); if(res.status!==404) return res; } }catch{}
  }

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
  }
  if(path==='/'||path===''){ 
    candidates.unshift('/index.html');
  }
  if(lowPath === '/' || lowPath === '/index.html'){
    candidates.unshift('/index.html');
  }

  const uniqueCandidates = [...new Set(candidates)];

  for(const candPath of uniqueCandidates){
    try{
      const candUrl=new URL(request.url); candUrl.pathname=candPath;
      const candReq=new Request(candUrl, request);
      if(env.ASSETS){
        const res=await env.ASSETS.fetch(candReq);
        if(res.status!==404) return res;
      }
    }catch{ continue; }
  }
  try{ 
    if(env.ASSETS){
      return await env.ASSETS.fetch(request);
    }
    // لا تعمل fetch(request) هنا - كان يسبب loop
    return null;
  }catch{ return null; }
}

export default {
  async fetch(request, env, ctx){
    const url=new URL(request.url); const path=url.pathname;

    // ========== إصلاح ERR_TOO_MANY_REDIRECTS ==========
    // السبب القديم: url.protocol==='http:' يسبب loop لأن Cloudflare يرسل http داخلياً دائماً
    // الحل: احذف الـ redirect تماماً - Cloudflare يتولى HTTPS عبر Always Use HTTPS
    // أو افحص الهيدر الصحيح فقط
    const xForwardedProto = request.headers.get('X-Forwarded-Proto');
    const cfVisitor = request.headers.get('CF-Visitor');
    let realProto = xForwardedProto;
    try{ if(cfVisitor){ const parsed = JSON.parse(cfVisitor); if(parsed.scheme) realProto = parsed.scheme; } }catch{}
    // فقط إذا كان فعلاً http من المتصفح وليس داخلياً
    if(realProto === 'http' && xForwardedProto === 'http' && !url.hostname.includes('localhost')){
      // لا تعمل redirect هنا - اترك Cloudflare يعالجه
      // إذا أردت فرض HTTPS فعله من Cloudflare Dashboard > SSL > Always Use HTTPS = ON
    }

    if(request.method==='OPTIONS'){
      return new Response(null,{status:204, headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization',...SECURITY_HEADERS}});
    }

    if(isEntryHtmlPage(path)){
      if(!hasValidEntry(request) && !path.toLowerCase().includes('index')){
        let pageName=path.split('/').pop()||path;
        const isSecureLogin = pageName.toLowerCase().includes('index-secure')||pageName.toLowerCase().includes('secure')||pageName.toLowerCase().includes('biometric')||pageName.toLowerCase().includes('professional');
        if(!isSecureLogin){
          return new Response(entryBlockedHTMLFixed(pageName),{status:403, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache',...SECURITY_HEADERS}});
        }
      }
    }

    if(path==='/api/debug-config'){
      const cfg = getTursoConfig(env);
      const hasAssets = !!env.ASSETS;
      const ip = request.headers.get('CF-Connecting-IP')||'unknown';
      return new Response(JSON.stringify({
        v: 'V7-REDIRECT-FIXED-FINAL',
        tursoUrl: cfg.url ? cfg.url.substring(0,30)+'...' : 'missing',
        hasToken: !!cfg.token,
        tokenLength: cfg.token ? cfg.token.length : 0,
        configError: cfg.error,
        hasAssets,
        ip,
        xForwardedProto: request.headers.get('X-Forwarded-Proto'),
        cfVisitor: request.headers.get('CF-Visitor'),
        time: new Date().toISOString(),
        fix: 'تم حذف redirect loop - ERR_TOO_MANY_REDIRECTS fixed'
      }, null, 2), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
    }

    if(path==='/api/get-ip'){
      const ip=request.headers.get('CF-Connecting-IP')||'unknown';
      return new Response(JSON.stringify({ip}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache',...SECURITY_HEADERS}});
    }

    if(path==='/api/check-by-card-secure' && request.method==='POST'){
      try{
        const ip=request.headers.get('CF-Connecting-IP')||'unknown';
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
        if(!q.result?.rows||q.result.rows.length===0) return new Response(JSON.stringify({ok:false,msg:'رقم البطاقة غير موجود في جدول موظفين_مرتبات'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const cols=q.result.cols.map(c=>c.name); const userObj=safeRowToObject(cols,q.result.rows[0]);
        const safeUser={...userObj}; delete safeUser['كلمة_المرور']; delete safeUser['كلمة المرور']; delete safeUser['password'];
        return new Response(JSON.stringify({ok:true,user:safeUser}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }catch(e){
        return new Response(JSON.stringify({ok:false,msg:`خطأ خادم: ${e.message}`, stack:e.stack?.substring(0,500)}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
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

    if(path==='/api/verify-password-secure' && request.method==='POST'){
      try{
        const body=await request.json().catch(()=>({})); const cardNumber=String(body.cardNumber||'').trim(); const password=String(body.password||'').trim();
        if(!isValidNationalIdSecure(cardNumber)) return new Response(JSON.stringify({ok:false,msg:'بيانات غير صحيحة'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const q=await tursoQuery(env, `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`, [cardNumber]);
        if(q.isConfigError) return new Response(JSON.stringify({ok:false,msg:`خطأ إعدادات: ${q.error}`}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        if(q.error||!q.result?.rows||q.result.rows.length===0) return new Response(JSON.stringify({ok:false,msg:'بيانات غير صحيحة'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const cols=q.result.cols.map(c=>c.name); const userObj=safeRowToObject(cols,q.result.rows[0]); const storedPass=String(userObj['كلمة_المرور']||'').trim();
        if(!constantTimeCompare(storedPass,password)) return new Response(JSON.stringify({ok:false,msg:'بيانات غير صحيحة'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const token=generateSecureTokenFixed(); return new Response(JSON.stringify({ok:true,token,role:userObj['الصلاحيات']||'User'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }catch(e){ return new Response(JSON.stringify({ok:false,msg:`خطأ خادم: ${e.message}`}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
    }

    if(path==='/api/register-by-card-secure' && request.method==='POST'){
      try{
        const body=await request.json().catch(()=>({})); const cardNumber=String(body.cardNumber||'').trim(); let bio=String(body.bio||'').trim(); const password=String(body.password||'').trim();
        if(!isValidNationalIdSecure(cardNumber)) return new Response(JSON.stringify({ok:false,msg:'رقم غير صالح'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        if(password.length<8) return new Response(JSON.stringify({ok:false,msg:'كلمة المرور 8 أحرف'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        if(bio.length > SECURE_LOGIN_CONFIG.BIO_MAX_LEN) return new Response(JSON.stringify({ok:false,msg:`البصمة كبيرة جداً ${bio.length} > ${SECURE_LOGIN_CONFIG.BIO_MAX_LEN}`}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        
        const checkQ=await tursoQuery(env, `SELECT "بصمة" FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`, [cardNumber]);
        if(checkQ.isConfigError) return new Response(JSON.stringify({ok:false,msg:`خطأ إعدادات: ${checkQ.error}`}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        
        try{
          const bioObj=JSON.parse(bio);
          if(bioObj.type==='pattern'&&bioObj.value){
            const hashed=await hashPatternSecure(bioObj.value,cardNumber); bioObj.hash=hashed; bioObj.value=undefined; bio=JSON.stringify(bioObj);
          }
          if(bioObj.type==='face_camera'&&bioObj.hash){
            const serverHash=await hashFaceSecure(bioObj.hash,cardNumber); bioObj.serverHash=serverHash; bio=JSON.stringify(bioObj);
          }
        }catch{}
        const updateQ=await tursoQuery(env, `UPDATE "موظفين_مرتبات" SET "بصمة"=?, "كلمة_المرور"=? WHERE "الرقم_القومى"=?`, [bio,password,cardNumber]);
        if(updateQ.isConfigError) return new Response(JSON.stringify({ok:false,msg:`خطأ إعدادات: ${updateQ.error}`}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        if(updateQ.error) return new Response(JSON.stringify({ok:false,msg:`فشل الحفظ: ${updateQ.error}`}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }catch(e){ return new Response(JSON.stringify({ok:false,msg:`خطأ خادم: ${e.message}`}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
    }

    if(path==='/api/bio-login-by-card-secure' && request.method==='POST'){
      try{
        const body=await request.json().catch(()=>({})); const cardNumber=String(body.cardNumber||'').trim(); const bioAttempt=body.bioAttempt?String(body.bioAttempt).trim():null;
        if(!isValidNationalIdSecure(cardNumber)) return new Response(JSON.stringify({ok:false,msg:'رقم غير صالح'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const q=await tursoQuery(env, `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`, [cardNumber]);
        if(q.isConfigError) return new Response(JSON.stringify({ok:false,msg:`خطأ إعدادات: ${q.error}`}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        if(q.error||!q.result?.rows||q.result.rows.length===0) return new Response(JSON.stringify({ok:false,msg:'غير موجود'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const cols=q.result.cols.map(c=>c.name); const userObj=safeRowToObject(cols,q.result.rows[0]); const savedBioStr=String(userObj['بصمة']||'').trim();
        if(!savedBioStr) return new Response(JSON.stringify({ok:false,msg:'لا توجد بصمة'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        let savedBio; try{ savedBio=JSON.parse(savedBioStr); }catch{ return new Response(JSON.stringify({ok:false,msg:'بيانات تالفة'}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }

        if(savedBio.type==='pattern'){
          if(!bioAttempt) return new Response(JSON.stringify({ok:false,msg:'أدخل النقش'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
          let ok=false; if(savedBio.hash){ const attemptHash=await hashPatternSecure(bioAttempt,cardNumber); ok=constantTimeCompare(attemptHash,savedBio.hash); } else { ok=constantTimeCompare(String(savedBio.value||'').trim(),bioAttempt.trim()); }
          if(!ok) return new Response(JSON.stringify({ok:false,msg:'النقش غير مطابق'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        } else if(savedBio.type==='face_camera'){
          if(!bioAttempt) return new Response(JSON.stringify({ok:false,msg:'التقط الوجه أولاً'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
          let ok=false;
          if(savedBio.hash && constantTimeCompare(savedBio.hash, bioAttempt)) ok=true;
          else if(savedBio.serverHash){ const attemptServerHash=await hashFaceSecure(bioAttempt,cardNumber); if(constantTimeCompare(savedBio.serverHash, attemptServerHash)) ok=true; }
          if(!ok) return new Response(JSON.stringify({ok:false,msg:'الوجه غير مطابق - إضاءة أفضل'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        }
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

    // جلب الملفات - بدون loop
    let response;
    try{
      const assetRes=await fetchAssetWithCleanUrls(request,env);
      if(assetRes&&assetRes.status!==404) response=assetRes;
      else { 
        if(env.ASSETS){ 
          response=await env.ASSETS.fetch(request); 
          if(response.status===404&&!path.includes('.')){ 
            const urlHtml=new URL(request.url); urlHtml.pathname=path+'.html'; 
            const resHtml=await env.ASSETS.fetch(new Request(urlHtml,request)); 
            if(resHtml.status!==404) response=resHtml; 
          } 
        } else { 
          response=null; // لا تعمل fetch(request) - كان يسبب loop
        } 
      }
    }catch(e){ 
      return new Response(`Not found - ${path} - ${e.message}`,{status:404,headers:{'Content-Type':'text/plain',...SECURITY_HEADERS}}); 
    }

    if(!response || response.status===404){
      if(path.startsWith('/api/')) return new Response(JSON.stringify({error:"Not found", path}),{status:404,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      // محاولة أخيرة لجلب index.html
      if(path==='/' || path==='/index.html' || path.toLowerCase().includes('index-secure')){
        try{
          if(env.ASSETS){
            const directIndex = await env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
            if(directIndex.status !== 404) return addEntryCookieToResponse(addSecurityHeaders(directIndex));
          }
        }catch{}
      }
      return new Response(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>404</title></head><body style="background:#020a05;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:Cairo"><div style="text-align:center"><h1>404</h1><p>${path} غير موجود</p><p>تأكد أن الملف اسمه index.html</p><a href="/index.html" style="color:#10b981">الرئيسية</a><br><br><a href="/api/debug-config" style="color:#a78bfa">debug-config</a></div></body></html>`,{status:404,headers:{'Content-Type':'text/html; charset=utf-8',...SECURITY_HEADERS}});
    }

    const contentType=response.headers.get('Content-Type')||'';
    if(contentType.includes('text/html')&&response.status===200){
      const isIndex=(path==='/'||path===''||path.toLowerCase().endsWith('index.html')||path.toLowerCase().includes('index-secure'));
      if(isIndex) return addEntryCookieToResponse(addSecurityHeaders(response));
      return addSecurityHeaders(response);
    }
    return addSecurityHeaders(response);
  }
}
