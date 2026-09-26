// _worker-V9-FINAL-PROTECTED-AND-INDEX-FIXED.js
// يصلح 3 مشاكل معاً:
// 1- ERR_TOO_MANY_REDIRECTS / The page isn't redirecting properly - تم حذفه نهائياً
// 2- يدعم index.html و Index-Secure-Professional.html معاً
// 3- يرجع حماية الدخول عبر الرئيسية فقط لـ pageAdmin1 و pageUser1 بشكل صحيح

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
  // 1- كوكيز
  const entryCookie = getCookieFixed(request, ENTRY_COOKIE_NAME);
  if(entryCookie && entryCookie==='1') return true;
  // 2- Referer - تم تحسينه ليعمل مع strict-origin-when-cross-origin
  try{
    const ref = request.headers.get('Referer') || '';
    if(!ref) return false;
    const lowRef = ref.toLowerCase();
    // لو جاي من index.html أو الاسم القديم
    if(lowRef.includes('index.html') || lowRef.includes('index-secure-professional') || lowRef.includes('index-secure')) return true;
    if(lowRef.endsWith('/') || lowRef.includes('/index')) return true;
    // لو جاي من نفس الدومين (حتى لو الـ referer هو origin فقط بسبب Referrer-Policy)
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
  // استثناءات لا تحميها
  if(['/api/','/js/','.js','.css','.json','.png','.jpg','.svg','.ico','real-monitoring','whitelist','allowed-ips','block-device','get-ip','blocked-devices','blocked-list','turso','cache-','favicon','auth','login','dashboard','protect.js','real-logger.js','debug-config'].some(s=> low.includes(s.toLowerCase()))) return false;
  let pageName = path.split('/').pop() || '';
  if(path==='/' || path==='' || pageName==='' ) return false;
  // لا تحمي صفحات الدخول نفسها
  if(pageName.toLowerCase()==='index.html') return false;
  if(low.includes('index-secure-professional')) return false;
  if(low.includes('index-secure') && !low.includes('pageadmin') && !low.includes('pageuser')) return false;
  // احمي كل صفحات html الأخرى و pageAdmin1 و pageUser1 (حتى بدون امتداد)
  if(path.endsWith('.html')) return true;
  if(!pageName.includes('.') && !path.startsWith('/api/')) return true;
  return false;
}

function entryBlockedHTMLFixed(pageName){
  return `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>الدخول عبر الرئيسية</title><style>body{min-height:100vh;background:#0a0e1a;color:#fff;display:flex;align-items:center;justify-content:center;font-family:Cairo, Tahoma} .box{background:rgba(255,255,255,0.08);padding:40px;border-radius:24px;text-align:center;backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.1);max-width:400px} h1{color:#f59e0b;font-size:22px;margin:15px 0} p{color:#94a3b8;margin:10px 0} a{display:inline-block;margin-top:15px;padding:12px 30px;background:#10b981;color:#fff;text-decoration:none;border-radius:10px;font-weight:bold} a:hover{background:#059669}</style></head><body><div class="box"><div style="font-size:56px">🔐</div><h1>الدخول عبر الرئيسية فقط</h1><p>${pageName}</p><p style="font-size:13px">يجب تسجيل الدخول من الصفحة الرئيسية أولاً</p><a href="/index.html">الرئيسية</a></div></body></html>`;
}

function addEntryCookieToResponse(response){
  try{
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Set-Cookie', `${ENTRY_COOKIE_NAME}=1; Path=/; Max-Age=${ENTRY_COOKIE_MAX_AGE}; SameSite=Lax`);
    newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
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
  if(!token || token.length < 10){ return {url:null, token:null, error:'TURSO_TOKEN فارغ'}; }
  if(token.includes("PASTE_YOUR")){ return {url:null, token:null, error:'TURSO_TOKEN افتراضي'}; }
  if(url.startsWith('libsql://')) url='https://'+url.slice(8);
  if(url &&!url.startsWith('https://')) url='https://'+url;
  return {url, token, error:null};
}

async function tursoQuery(env, sql, params=[]){
  const cfg = getTursoConfig(env);
  if(cfg.error || !cfg.url || !cfg.token){ return {error: cfg.error, isConfigError:true}; }
  try{
    const args = params.map(v=>({type:'text', value:String(v)}));
    const res = await fetch(`${cfg.url}/v2/pipeline`, {
      method:'POST',
      headers:{'Authorization':`Bearer ${cfg.token}`, 'Content-Type':'application/json'},
      body: JSON.stringify({requests:[{type:'execute', stmt:{sql, args}}, {type:'close'}]})
    });
    if(!res.ok){ const txt = await res.text().catch(()=>res.statusText); return {error:`HTTP ${res.status}: ${txt.substring(0,200)}`, isHttpError:true}; }
    const data = await res.json();
    if(data.results?.[0]?.error){ return {error: data.results[0].error.message, isSqlError:true}; }
    return {result: data.results?.[0]?.response?.result};
  }catch(e){ return {error:e.message, isException:true}; }
}

// دعم index.html و Index-Secure-Professional.html معاً - بدون loop
async function fetchAssetWithCleanUrls(request, env){
  const url=new URL(request.url);
  let path=url.pathname.replace(/\/+/g,'/');
  const lowPath = path.toLowerCase();

  const candidates=[]; 

  // للرئيسية جرب كل الأسماء
  if(lowPath === '/' || lowPath === '/index.html' || lowPath === '/index-secure-professional.html' || lowPath === '/index-secure-professional'){
    candidates.push('/index.html');
    candidates.push('/Index-Secure-Professional.html');
    candidates.push('/index-secure-professional.html');
    candidates.push('/');
  } else {
    candidates.push(path);
    const hasExt=path.split('/').pop()?.includes('.')||false;
    if(!hasExt && path!=='/'){
      candidates.push(path+'.html');
      candidates.push(path+'/index.html');
      candidates.push(path.toLowerCase()+'.html');
      const base = path.split('/').pop();
      candidates.push('/'+base+'.html');
      candidates.push('/'+base.toLowerCase()+'.html');
      // دعم pageAdmin1
      if(lowPath.includes('pageadmin1')){ candidates.push('/pageAdmin1.html'); candidates.push('/pageAdmin1'); }
      if(lowPath.includes('pageuser1')){ candidates.push('/pageUser1.html'); candidates.push('/pageUser1'); }
    }
    if(lowPath.includes('index-secure')){
      candidates.unshift('/index.html');
      candidates.unshift('/Index-Secure-Professional.html');
    }
  }

  if(path==='/'||path===''){ 
    candidates.unshift('/index.html');
  }

  const uniqueCandidates = [...new Set(candidates)];

  for(const candPath of uniqueCandidates){
    try{
      const candUrl=new URL(request.url); candUrl.pathname=candPath;
      const candReq=new Request(candUrl, request);
      if(env.ASSETS){
        const res=await env.ASSETS.fetch(candReq);
        if(res && res.status!==404) return res;
      }
    }catch{ continue; }
  }
  try{ 
    if(env.ASSETS){
      return await env.ASSETS.fetch(request);
    }
    return null;
  }catch{ return null; }
}

export default {
  async fetch(request, env, ctx){
    const url=new URL(request.url); 
    const path=url.pathname;

    // === إصلاح نهائي لـ ERR_TOO_MANY_REDIRECTS ===
    // لا تعمل أي redirect هنا - Cloudflare Dashboard > SSL > Always Use HTTPS = ON يتولى الأمر

    if(request.method==='OPTIONS'){
      return new Response(null,{status:204, headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization',...SECURITY_HEADERS}});
    }

    // === إرجاع الحماية لـ pageAdmin1 و pageUser1 ===
    if(isEntryHtmlPage(path)){
      if(!hasValidEntry(request)){
        let pageName=path.split('/').pop()||path;
        return new Response(entryBlockedHTMLFixed(pageName),{status:403, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache',...SECURITY_HEADERS}});
      }
    }

    if(path==='/api/debug-config'){
      const cfg = getTursoConfig(env);
      const hasAssets = !!env.ASSETS;
      const ip = request.headers.get('CF-Connecting-IP')||'unknown';
      const xForwardedProto = request.headers.get('X-Forwarded-Proto')||'';
      const cfVisitor = request.headers.get('CF-Visitor')||'';
      const referer = request.headers.get('Referer')||'';
      const cookie = request.headers.get('Cookie')||'';
      return new Response(JSON.stringify({
        v: 'V9-FINAL-PROTECTED-AND-INDEX-FIXED',
        hasAssets,
        tursoConfigured: !cfg.error,
        tursoError: cfg.error,
        ip,
        xForwardedProto,
        cfVisitor,
        referer,
        hasEntryCookie: cookie.includes(ENTRY_COOKIE_NAME),
        fix: 'تم إرجاع الحماية + إصلاح Redirect Loop + دعم index.html والاسم القديم',
        time: new Date().toISOString()
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
        if(q.isConfigError) return new Response(JSON.stringify({ok:false,msg:q.error}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        if(q.error){ let q2 = await tursoQuery(env, `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومي"=? LIMIT 1`, [cardNumber]); if(!q2.error) q=q2; }
        if(!q.result?.rows||q.result.rows.length===0) return new Response(JSON.stringify({ok:false,msg:'رقم البطاقة غير موجود'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const cols=q.result.cols.map(c=>c.name); const userObj=safeRowToObject(cols,q.result.rows[0]);
        const safeUser={...userObj}; delete safeUser['كلمة_المرور']; delete safeUser['كلمة المرور'];
        return new Response(JSON.stringify({ok:true,user:safeUser}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }catch(e){ return new Response(JSON.stringify({ok:false,msg:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
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
        if(q.isConfigError) return new Response(JSON.stringify({ok:false,msg:q.error}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        if(q.error||!q.result?.rows||q.result.rows.length===0) return new Response(JSON.stringify({ok:false,msg:'بيانات غير صحيحة'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const cols=q.result.cols.map(c=>c.name); const userObj=safeRowToObject(cols,q.result.rows[0]); const storedPass=String(userObj['كلمة_المرور']||'').trim();
        if(!constantTimeCompare(storedPass,password)) return new Response(JSON.stringify({ok:false,msg:'بيانات غير صحيحة'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const token=generateSecureTokenFixed(); return new Response(JSON.stringify({ok:true,token,role:userObj['الصلاحيات']||'User'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }catch(e){ return new Response(JSON.stringify({ok:false,msg:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
    }

    if(path==='/api/register-by-card-secure' && request.method==='POST'){
      try{
        const body=await request.json().catch(()=>({})); const cardNumber=String(body.cardNumber||'').trim(); let bio=String(body.bio||'').trim(); const password=String(body.password||'').trim();
        if(!isValidNationalIdSecure(cardNumber)) return new Response(JSON.stringify({ok:false,msg:'رقم غير صالح'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        if(password.length<3) return new Response(JSON.stringify({ok:false,msg:'كلمة قصيرة'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        try{
          const bioObj=JSON.parse(bio);
          if(bioObj.type==='pattern'&&bioObj.value){ const hashed=await hashPatternSecure(bioObj.value,cardNumber); bioObj.hash=hashed; bioObj.value=undefined; bio=JSON.stringify(bioObj); }
          if(bioObj.type==='face_camera'&&bioObj.hash){ const serverHash=await hashFaceSecure(bioObj.hash,cardNumber); bioObj.serverHash=serverHash; bio=JSON.stringify(bioObj); }
        }catch{}
        const updateQ=await tursoQuery(env, `UPDATE "موظفين_مرتبات" SET "بصمة"=?, "كلمة_المرور"=? WHERE "الرقم_القومى"=?`, [bio,password,cardNumber]);
        if(updateQ.isConfigError) return new Response(JSON.stringify({ok:false,msg:updateQ.error}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        if(updateQ.error) return new Response(JSON.stringify({ok:false,msg:updateQ.error}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }catch(e){ return new Response(JSON.stringify({ok:false,msg:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
    }

    if(path==='/api/bio-login-by-card-secure' && request.method==='POST'){
      try{
        const body=await request.json().catch(()=>({})); const cardNumber=String(body.cardNumber||'').trim(); const bioAttempt=body.bioAttempt?String(body.bioAttempt).trim():null;
        if(!isValidNationalIdSecure(cardNumber)) return new Response(JSON.stringify({ok:false,msg:'رقم غير صالح'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const q=await tursoQuery(env, `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`, [cardNumber]);
        if(q.isConfigError) return new Response(JSON.stringify({ok:false,msg:q.error}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
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
          if(!ok) return new Response(JSON.stringify({ok:false,msg:'الوجه غير مطابق'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        }
        const token=generateSecureTokenFixed();
        return new Response(JSON.stringify({ok:true,token,role:userObj['الصلاحيات']||'User'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }catch(e){ return new Response(JSON.stringify({ok:false,msg:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
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

    // جلب الملفات - بدون fetch(request) الذي يسبب loop
    let response;
    try{
      const assetRes=await fetchAssetWithCleanUrls(request,env);
      if(assetRes&&assetRes.status!==404) response=assetRes;
      else if(env.ASSETS){
        response=await env.ASSETS.fetch(request);
        if(response.status===404 && !path.includes('.')){
          const urlHtml=new URL(request.url); urlHtml.pathname=path+'.html';
          const resHtml=await env.ASSETS.fetch(new Request(urlHtml,request));
          if(resHtml.status!==404) response=resHtml;
        }
      }
    }catch(e){ return new Response(`Not found - ${path} - ${e.message}`,{status:404,headers:{'Content-Type':'text/plain',...SECURITY_HEADERS}}); }

    if(!response || response.status===404){
      if(path.startsWith('/api/')) return new Response(JSON.stringify({error:"Not found", path}),{status:404,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      // محاولة أخيرة للرئيسية - جرب الاسمين
      const lowPath = path.toLowerCase();
      if(lowPath==='/' || lowPath==='/index.html' || lowPath.includes('index-secure')){
        try{
          if(env.ASSETS){
            const directIndex = await env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
            if(directIndex && directIndex.status!==404) return addEntryCookieToResponse(addSecurityHeaders(directIndex));
            const oldName = await env.ASSETS.fetch(new Request(new URL('/Index-Secure-Professional.html', request.url), request));
            if(oldName && oldName.status!==404) return addEntryCookieToResponse(addSecurityHeaders(oldName));
          }
        }catch{}
      }
      return new Response(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>404</title></head><body style="background:#020a05;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:Cairo"><div style="text-align:center"><h1>404</h1><p>${path} غير موجود</p><a href="/index.html" style="color:#10b981">الرئيسية</a><br><br><a href="/api/debug-config" style="color:#a78bfa">فحص</a></div></body></html>`,{status:404,headers:{'Content-Type':'text/html; charset=utf-8',...SECURITY_HEADERS}});
    }

    const contentType=response.headers.get('Content-Type')||'';
    if(contentType.includes('text/html')&&response.status===200){
      const isIndex=(path==='/'||path===''||path.toLowerCase().endsWith('index.html')||path.toLowerCase().includes('index-secure-professional')||path.toLowerCase().includes('index-secure'));
      if(isIndex) return addEntryCookieToResponse(addSecurityHeaders(response));
      return addSecurityHeaders(response);
    }
    return addSecurityHeaders(response);
  }
}

