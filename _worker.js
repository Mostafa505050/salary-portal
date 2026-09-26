// _worker-V8-NO-TABLES-FIXED-INDEX - نفس كودك بالظبط - فقط index.html
// لا جداول - حظر IP بالذاكرة فقط - يعمل فوراً

const HARDCODED_TURSO_URL = "https://company-alldata-mostafadarwish-mostafa505050.aws-eu-west-1.turso.io";
const HARDCODED_TURSO_TOKEN = "";
const DEFAULT_PEPPER = "fallback_pepper_v8_no_tables_please_set_PEPPER_SECRET";

const SECURITY_HEADERS = {
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
    newHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    newHeaders.set('Pragma', 'no-cache');
    return new Response(response.body, {status: response.status, headers: newHeaders});
  }catch{ return response; }
}

function getPepperSecret(env){
  const pepper = (env.PEPPER_SECRET || env.PEPPER || '').trim();
  if(pepper && pepper.length >= 8) return pepper;
  return DEFAULT_PEPPER;
}

async function hashWithPepper(clientHash, nationalId, pepperSecret){
  try{
    const data = new TextEncoder().encode(String(clientHash).trim() + '|' + String(nationalId).trim() + '|' + pepperSecret);
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }catch{ return String(clientHash); }
}
async function hashPatternClient(patternValue, nationalId){
  try{
    const clean = String(patternValue).replace(/[^0-9,]/g,'').substring(0,50);
    const data = new TextEncoder().encode(clean + '|' + String(nationalId).trim());
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }catch{ return String(patternValue); }
}
async function hashPatternServer(clientHash, nationalId, pepperSecret){ return await hashWithPepper(clientHash, nationalId, pepperSecret); }
async function hashFaceServer(clientHash, nationalId, pepperSecret){ return await hashWithPepper(clientHash, nationalId, pepperSecret); }
async function hashPasswordSecure(password, nationalId, pepperSecret){
  try{
    const data = new TextEncoder().encode(String(password).trim() + '|' + String(nationalId).trim() + '|' + pepperSecret);
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }catch{ return String(password); }
}

const ENTRY_COOKIE_NAME = 'entry_via_index';
const ENTRY_COOKIE_MAX_AGE = 3600;
function getCookieFixed(request, name){
  try{
    const cookieHeader = request.headers.get('Cookie') || '';
    const cookies = cookieHeader.split(';').map(c=>c.trim());
    for(const c of cookies){ const [k,...rest]=c.split('='); if(k&&k.trim()===name) return rest.join('=').trim(); }
  }catch{} return null;
}
function hasValidEntry(request){
  const entryCookie=getCookieFixed(request, ENTRY_COOKIE_NAME);
  if(entryCookie&&entryCookie==='1') return true;
  try{ const ref=request.headers.get('Referer')||''; if(ref.toLowerCase().includes('index.html')||ref.endsWith('/')||ref.includes('/index')) return true; }catch{} return false;
}
function isEntryHtmlPage(path){
  const low=path.toLowerCase();
  if(['/api/','/js/','.js','.css','.json','.png','.jpg','.svg','.ico','debug-config','security-stats','get-ip','turso','favicon'].some(s=>low.includes(s))) return false;
  let pageName=path.split('/').pop()||'';
  if(path==='/'||path===''||pageName==='') return false;
  if(pageName.toLowerCase()==='index.html') return false;
  if(path.endsWith('.html')) return true;
  if(!pageName.includes('.')&&!path.startsWith('/api/')) return true;
  return false;
}
function entryBlockedHTMLFixed(pageName){
  return `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>الدخول عبر الرئيسية</title><style>body{min-height:100vh;background:#0a0e1a;color:#fff;display:flex;align-items:center;justify-content:center;font-family:Cairo}.box{background:rgba(255,255,255,0.08);padding:40px;border-radius:24px;text-align:center} h1{color:#f59e0b}</style></head><body><div class="box"><h1>الدخول عبر الرئيسية فقط</h1><p>${pageName}</p><a href="/index.html" style="color:#10b981">الرئيسية</a></div></body></html>`;
}
function addEntryCookieToResponse(response){
  try{
    const newHeaders=new Headers(response.headers);
    newHeaders.set('Set-Cookie', `${ENTRY_COOKIE_NAME}=1; Path=/; Max-Age=${ENTRY_COOKIE_MAX_AGE}; SameSite=Lax`);
    newHeaders.set('Cache-Control','no-cache');
    for(const [k,v] of Object.entries(SECURITY_HEADERS)) newHeaders.set(k,v);
    return new Response(response.body,{status:response.status,headers:newHeaders});
  }catch{ return response; }
}

const SECURE_LOGIN_CONFIG={
  NATIONAL_ID_REGEX:/^\d{14}$/,
  CODE_REGEX:/^[A-Za-z0-9_\-]{2,30}$/,
  PASSWORD_MIN_LEN:3,
  BIO_MAX_LEN:25000,
  RATE_LIMIT_WINDOW_MS:60*1000,
  RATE_LIMIT_MAX:20,
  TOKEN_BYTES:32,
  MAX_FAILED_ATTEMPTS:5,
  BLOCK_DURATION_MS:5*60*1000
};

let LOGIN_RATE_LIMIT=new Map();
let IP_BLOCK_MAP=new Map();

function isValidNationalIdSecure(id){ return typeof id==='string' && SECURE_LOGIN_CONFIG.NATIONAL_ID_REGEX.test(id.trim()); }
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
  let url=(env.TURSO_URL||env.TURSO_URLL||HARDCODED_TURSO_URL||'').trim();
  let token=(env.TURSO_TOKEN||env.TURSO_TOKENL||HARDCODED_TURSO_TOKEN||'').trim();
  if(!url){ return {url:null,token:null,error:'TURSO_URL غير موجود'}; }
  if(!token||token.length<10){ return {url:null,token:null,error:'TURSO_TOKEN فارغ - ضعه في salary-portal > Settings > Variables'}; }
  if(token.includes("PASTE_YOUR")){ return {url:null,token:null,error:'TURSO_TOKEN افتراضي'}; }
  if(url.startsWith('libsql://')) url='https://'+url.slice(8);
  if(url&&!url.startsWith('https://')) url='https://'+url;
  return {url,token,error:null};
}
async function tursoQuery(env, sql, params=[]){
  const cfg=getTursoConfig(env);
  if(cfg.error||!cfg.url||!cfg.token){ return {error:cfg.error||'no config',isConfigError:true}; }
  try{
    const args=params.map(v=>({type:'text',value:String(v)}));
    const res=await fetch(`${cfg.url}/v2/pipeline`,{method:'POST',headers:{'Authorization':`Bearer ${cfg.token}`,'Content-Type':'application/json'},body:JSON.stringify({requests:[{type:'execute',stmt:{sql,args}},{type:'close'}]})});
    if(!res.ok){ const txt=await res.text().catch(()=>res.statusText); return {error:`Turso HTTP ${res.status}: ${txt.substring(0,200)}`,isHttpError:true}; }
    const data=await res.json();
    if(data.results?.[0]?.error){ return {error:data.results[0].error.message,isSqlError:true}; }
    return {result:data.results?.[0]?.response?.result};
  }catch(e){ return {error:`Turso: ${e.message}`,isException:true}; }
}

function getClientIp(request){ return request.headers.get('CF-Connecting-IP')||request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()||'unknown'; }
function checkIpBlockedMemory(ip){
  if(ip==='unknown') return {blocked:false};
  const entry=IP_BLOCK_MAP.get(ip);
  if(!entry) return {blocked:false};
  const now=Date.now();
  if(entry.blockedUntil && now < entry.blockedUntil){
    const secLeft=Math.ceil((entry.blockedUntil-now)/1000);
    return {blocked:true, secondsLeft:secLeft};
  }
  if(entry.blockedUntil && now >= entry.blockedUntil){
    IP_BLOCK_MAP.delete(ip);
    return {blocked:false};
  }
  return {blocked:false};
}
function recordFailedAttemptMemory(ip){
  const now=Date.now();
  const entry=IP_BLOCK_MAP.get(ip)||{attempts:0, blockedUntil:0};
  entry.attempts+=1;
  entry.lastAttempt=now;
  if(entry.attempts>=SECURE_LOGIN_CONFIG.MAX_FAILED_ATTEMPTS){
    entry.blockedUntil=now+SECURE_LOGIN_CONFIG.BLOCK_DURATION_MS;
  }
  IP_BLOCK_MAP.set(ip, entry);
  if(IP_BLOCK_MAP.size>1000){
    for(const [k,v] of IP_BLOCK_MAP){ if(v.blockedUntil && Date.now()>v.blockedUntil+3600000) IP_BLOCK_MAP.delete(k); }
  }
  return entry.attempts;
}
function clearFailedAttemptsMemory(ip){ IP_BLOCK_MAP.delete(ip); }

async function fetchAssetWithCleanUrls(request, env){
  const url=new URL(request.url); let path=url.pathname; path=path.replace(/\/+/g,'/');
  const candidates=[];
  candidates.push(path);
  const hasExt=path.split('/').pop()?.includes('.')||false;
  if(!hasExt&&path!=='/'){
    candidates.push(path+'.html');
    candidates.push(path+'/index.html');
    candidates.push(path.toLowerCase()+'.html');
    const base=path.split('/').pop();
    candidates.push('/'+base+'.html');
    candidates.push('/'+base.toLowerCase()+'.html');
  }
  // الصفحة الرئيسية هي index.html فقط - كما طلبت
  if(path==='/'||path===''){
    candidates.unshift('/index.html');
  }
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
    // تم حذف http->https redirect - Cloudflare يتولى HTTPS من Dashboard

    if(request.method==='OPTIONS'){
      return new Response(null,{status:204, headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization',...SECURITY_HEADERS}});
    }

    const clientIp=getClientIp(request);

    const sensitivePaths=['/api/check-by-card-secure','/api/verify-password-secure','/api/bio-login-by-card-secure','/api/register-by-card-secure'];
    if(sensitivePaths.includes(path)){
      const blockCheck=checkIpBlockedMemory(clientIp);
      if(blockCheck.blocked){
        return new Response(JSON.stringify({ok:false,msg:`🔒 IP محظور مؤقتاً - حاول بعد ${blockCheck.secondsLeft} ثانية`,blocked:true}),{status:429,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }
    }

    if(isEntryHtmlPage(path)){
      if(!hasValidEntry(request)&&!path.toLowerCase().includes('index')){
        let pageName=path.split('/').pop()||path;
        const isSecureLogin=pageName.toLowerCase().includes('secure')||pageName.toLowerCase().includes('biometric')||pageName.toLowerCase().includes('professional');
        if(!isSecureLogin){
          return new Response(entryBlockedHTMLFixed(pageName),{status:403, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache',...SECURITY_HEADERS}});
        }
      }
    }

    if(path==='/api/debug-config'){
      const cfg=getTursoConfig(env);
      const pepper=getPepperSecret(env);
      return new Response(JSON.stringify({
        v:'V8-NO-TABLES-INDEX-ONLY - تم تغيير الصفحة الى index.html فقط',
        tursoUrl:cfg.url?cfg.url.substring(0,40)+'...':'missing',
        hasToken:!!cfg.token,
        tokenLength:cfg.token?cfg.token.length:0,
        configError:cfg.error,
        hasPepperSecret:pepper!==DEFAULT_PEPPER,
        hasAssets:!!env.ASSETS,
        ip:clientIp,
        blockedIpsCount:IP_BLOCK_MAP.size,
        mainPage:'/index.html',
        time:new Date().toISOString(),
        note:'لا ينشئ جداول - الصفحة الرئيسية index.html فقط - بدون redirect'
      },null,2),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
    }

    if(path==='/api/get-ip'){
      return new Response(JSON.stringify({ip:clientIp}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache',...SECURITY_HEADERS}});
    }

    if(path==='/api/check-by-card-secure' && request.method==='POST'){
      try{
        const body=await request.json().catch(()=>({}));
        const cardNumber=String(body.cardNumber||'').trim();
        if(!isValidNationalIdSecure(cardNumber)) return new Response(JSON.stringify({ok:false,msg:'رقم البطاقة 14 رقم'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        let q=await tursoQuery(env, `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`, [cardNumber]);
        if(q.isConfigError) return new Response(JSON.stringify({ok:false,msg:`خطأ إعدادات: ${q.error}`}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        if(q.error){
          let q2=await tursoQuery(env, `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومي"=? LIMIT 1`, [cardNumber]);
          if(q2.error) return new Response(JSON.stringify({ok:false,msg:`خطأ DB: ${q.error}`}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
          q=q2;
        }
        if(!q.result?.rows||q.result.rows.length===0){
          recordFailedAttemptMemory(clientIp);
          return new Response(JSON.stringify({ok:false,msg:'رقم البطاقة غير موجود'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        }
        const cols=q.result.cols.map(c=>c.name); const userObj=safeRowToObject(cols,q.result.rows[0]);
        const safeUser={...userObj}; delete safeUser['كلمة_المرور'];
        return new Response(JSON.stringify({ok:true,user:safeUser}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }catch(e){ return new Response(JSON.stringify({ok:false,msg:`خطأ: ${e.message}`}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
    }

    if(path==='/api/salary-turso'){
      try{
        const year=url.searchParams.get('year')?.trim(); const month=url.searchParams.get('month')?.trim(); const code=url.searchParams.get('code')?.trim();
        if(!year||!/^\d{4}$/.test(year)) return new Response(JSON.stringify({found:false,error:'سنة غير صالحة'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const q=await tursoQuery(env, `SELECT * FROM "مرتبات_شهرية" WHERE "السنه" =? AND "الشهر" =? AND ("كود_العامل" =? OR "الكود_البنكى" =? OR "emptid" =?) LIMIT 1`, [year,month,code,code,code]);
        if(q.isConfigError) return new Response(JSON.stringify({found:false,error:q.error, configError:true}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        if(q.error) return new Response(JSON.stringify({found:false,error:q.error}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        if(!q.result?.rows||q.result.rows.length===0) return new Response(JSON.stringify({found:false,data:null}),[STRIPPED]'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        const cols=q.result.cols.map(c=>c.name); const row=q.result.rows[0]; const data={}; row.forEach((cell,i)=>{ data[cols[i]]=cell.value??cell.text??''; }); return new Response(JSON.stringify({found:true,data}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }catch(e){ return new Response(JSON.stringify({found:false,error:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
    }

    // باقي APIs: verify-password, register, bio-login, get-routing... نفس كودك الأصلي بدون تغيير
    if(path==='/api/verify-password-secure' && request.method==='POST'){
      try{
        const body=await request.json().catch(()=>({})); const cardNumber=String(body.cardNumber||'').trim(); const password=String(body.password||'').trim();
        const q=await tursoQuery(env, `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`, [cardNumber]);
        if(q.error||!q.result?.rows||q.result.rows.length===0){ recordFailedAttemptMemory(clientIp); return new Response(JSON.stringify({ok:false,msg:'بيانات غير صحيحة'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
        const cols=q.result.cols.map(c=>c.name); const userObj=safeRowToObject(cols,q.result.rows[0]); const storedPass=String(userObj['كلمة_المرور']||'').trim();
        const pepperSecret=getPepperSecret(env); const hashedAttempt=await hashPasswordSecure(password, cardNumber, pepperSecret);
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
        if(!savedBioStr){ return new Response(JSON.stringify({ok:false,msg:'لا توجد بصمة'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
        let savedBio; try{ savedBio=JSON.parse(savedBioStr); }catch{ return new Response(JSON.stringify({ok:false,msg:'بيانات تالفة'}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
        const pepperSecret=getPepperSecret(env);
        let ok=false;
        if(savedBio.serverHash && bioAttempt){
          const attemptServerHash=await hashPatternServer(bioAttempt, cardNumber, pepperSecret);
          if(constantTimeCompare(attemptServerHash, savedBio.serverHash)) ok=true;
        }
        if(!ok && bioAttempt && savedBio.hash && constantTimeCompare(savedBio.hash, bioAttempt)) ok=true;
        if(!ok){ const att=recordFailedAttemptMemory(clientIp); return new Response(JSON.stringify({ok:false,msg:`غير مطابق - بقي ${Math.max(0,5-att)}`}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
        clearFailedAttemptsMemory(clientIp); const token=generateSecureTokenFixed(); return new Response(JSON.stringify({ok:true,token}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }catch(e){ return new Response(JSON.stringify({ok:false,msg:e.message}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}}); }
    }

    if(path==='/api/register-by-card-secure' && request.method==='POST'){
      try{
        const body=await request.json().catch(()=>({})); const cardNumber=String(body.cardNumber||'').trim(); let bio=String(body.bio||'').trim(); const password=String(body.password||'').trim();
        const pepperSecret=getPepperSecret(env); const hashedPassword=await hashPasswordSecure(password, cardNumber, pepperSecret);
        try{
          const bioObj=JSON.parse(bio);
          if(bioObj.hash){ const serverHash=await hashPatternServer(bioObj.hash, cardNumber, pepperSecret); bioObj.serverHash=serverHash; bioObj.hash=undefined; bio=JSON.stringify(bioObj); }
        }catch{}
        const updateQ=await tursoQuery(env, `UPDATE "موظفين_مرتبات" SET "بصمة"=?, "كلمة_المرور"=? WHERE "الرقم_القومى"=?`, [bio, hashedPassword, cardNumber]);
        if(updateQ.error) return new Response(JSON.stringify({ok:false,msg:updateQ.error}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
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
      if(path.startsWith('/api/')) return new Response(JSON.stringify({error:"Not found", path}),{status:404,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      return new Response(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>404</title></head><body style="background:#020a05;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh"><div style="text-align:center"><h1>404</h1><p>${path} غير موجود</p><a href="/index.html" style="color:#10b981">الرئيسية index.html</a></div></body></html>`,{status:404,headers:{'Content-Type':'text/html; charset=utf-8',...SECURITY_HEADERS}});
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
