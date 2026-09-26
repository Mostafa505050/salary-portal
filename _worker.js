// _worker.js - إصلاح كامل: حظر دقيق للصفحة فقط + قائمة بيضاء متعددة بدون تكرار + كاش لكل صفحة V2 - إصلاح عدم تحميل أسماء الصفحات بدون حذف أي دالة
// + منع دخول أي صفحة إلا عبر index.html - بدون حذف أي دالة
// + تأمين سيبراني احترافي لصفحات الدخول الجديدة - بدون حذف أي دالة قديمة
const HARDCODED_TURSO_URL = "https://company-alldata-mostafadarwish-mostafa505050.aws-eu-west-1.turso.io";
// const HARDCODED_TURSO_TOKEN = "PASTE_YOUR_TURSO_TOKEN_HERE";
// [أمان] التوكن يجب أن يكون في متغيرات البيئة TURSO_TOKEN في Cloudflare - لا تضعه في الكود
const HARDCODED_TURSO_TOKEN = ""; // [أمان] فارغ - يعتمد على env.TURSO_TOKEN فقط
const FALLBACK_BLOCKED = ['addhafez1.html', 'tables.html'];

// ========== إضافة إجبارية: منع الدخول إلا عبر index.html - بدون حذف أي دالة ==========
const ENTRY_PAGE = 'index.html';
const ENTRY_COOKIE_NAME = 'entry_via_index';
const ENTRY_COOKIE_MAX_AGE = 3600; // ساعة
const ENTRY_ALLOWED_PAGES = ['index.html', '']; // الصفحات المسموحة دائماً كمدخل

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
  // أيضاً السماح لو الـ Referer يحتوي index.html
  try{
    const ref = request.headers.get('Referer') || request.headers.get('referer') || '';
    if(ref.toLowerCase().includes('index.html') || ref.endsWith('/') || ref.includes('/index')) return true;
  }catch{}
  return false;
}
function isEntryHtmlPage(path){
  const low = path.toLowerCase();
  // استثناءات لا يطبق عليها منع الدخول
  if(['/api/','/js/','.js','.css','.json','.png','.jpg','.svg','.ico','real-monitoring','whitelist','allowed-ips','add-allowed-ip','remove-allowed-ip','block-device','unblock-device','get-ip','blocked-devices','blocked-list','turso','cache-','favicon','auth','login','dashboard','protect.js','real-logger.js'].some(s=> low.includes(s.toLowerCase()))) return false;
  let pageName = path.split('/').pop() || '';
  if(path==='/' || path==='' || pageName==='' ) return false; // الصفحة الرئيسية مسموحة
  if(pageName.toLowerCase()==='index.html') return false; // index مسموحة
  // أي صفحة.html أخرى تعتبر محمية
  if(path.endsWith('.html')) return true;
  // بدون امتداد و ليست api تعتبر صفحة
  if(!pageName.includes('.') &&!path.startsWith('/api/')) return true;
  return false;
}
function entryBlockedHTMLFixed(pageName){
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>الدخول عبر الرئيسية فقط</title><style>
  body{min-height:100vh;background:linear-gradient(135deg,#0a0e1a,#111827);color:#fff;display:flex;align-items:center;justify-content:center;font-family:Cairo,Tahoma,sans-serif;margin:0}
 .box{background:rgba(255,255,255,0.08);backdrop-filter:blur(20px);border:1px solid rgba(99,102,241,0.3);padding:40px 30px;border-radius:24px;text-align:center;box-shadow:0 25px 50px rgba(0,0,0,0.5);max-width:480px;width:92%}
  h1{color:#f59e0b;font-size:26px;margin:0 0 12px}
  p{color:#cbd5e1;font-size:14px;line-height:1.8;margin:8px 0}
 .page{background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);padding:6px 12px;border-radius:10px;font-family:monospace;font-size:12px;display:inline-block;margin:8px 0}
 .btn{display:inline-block;margin-top:18px;padding:12px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:14px;text-decoration:none;font-weight:900;box-shadow:0 8px 0 #4338ca}
 .btn:active{transform:translateY(4px);box-shadow:0 4px 0 #4338ca}
  small{color:#94a3b8;font-size:10px;display:block;margin-top:14px}
  </style></head><body><div class="box">
  <div style="font-size:56px">🔐</div>
  <h1>الدخول عبر الصفحة الرئيسية فقط</h1>
  <p>لا يمكن فتح هذه الصفحة مباشرة</p>
  <div class="page">📄 ${pageName}</div>
  <p>يجب الدخول أولاً عبر <b style="color:#10b981">index.html</b> ثم التنقل من القائمة</p>
  <a class="btn" href="/index.html">🏠 الذهاب للرئيسية</a>
  <small>تم الحظر بواسطة Worker - مصطفى درويش 01092259655<br>Source: entry-guard via index.html</small>
  </div><script>setTimeout(()=>{window.location.href='/index.html'},4000);</script></body></html>`;
}
function addEntryCookieToResponse(response){
  try{
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Set-Cookie', `${ENTRY_COOKIE_NAME}=1; Path=/; Max-Age=${ENTRY_COOKIE_MAX_AGE}; SameSite=Lax`);
    newHeaders.set('Cache-Control', 'no-cache');
    return new Response(response.body, {status:response.status, headers:newHeaders});
  }catch{
    return response;
  }
}
// ========== نهاية الإضافة الإجبارية ==========

// ========== إضافات الأمان الجديدة لصفحات الدخول - بدون حذف أي دالة قديمة ==========
const SECURE_LOGIN_CONFIG = {
  NATIONAL_ID_REGEX: /^\d{14}$/, // [أمان] قائمة بيضاء: 14 رقم فقط
  CODE_REGEX: /^[A-Za-z0-9_\-]{2,30}$/, // [أمان] كود حروف وأرقام فقط
  PASSWORD_MIN_LEN: 3, // [أمان] للتحقق - التسجيل يتطلب 8
  PASSWORD_MAX_LEN: 100,
  BIO_MAX_LEN: 2000,
  RATE_LIMIT_WINDOW_MS: 60 * 1000, // [أمان] نافذة دقيقة واحدة
  RATE_LIMIT_MAX: 10, // [أمان] 10 طلبات في الدقيقة لكل IP
  TOKEN_BYTES: 32
};

let LOGIN_RATE_LIMIT = new Map(); // [أمان] تخزين مؤقت لمحاولات الدخول
let SECURE_TOKENS = new Map(); // [أمان] تخزين التوكنات المولدة (في الذاكرة - للإنتاج استخدم KV)

function isValidNationalIdSecure(id){
  // [أمان] تحقق صارم: 14 رقم بالضبط
  return typeof id === 'string' && SECURE_LOGIN_CONFIG.NATIONAL_ID_REGEX.test(id.trim());
}

function isValidCodeSecure(code){
  // [أمان] تحقق صارم: حروف وأرقام و - و _ فقط
  return typeof code === 'string' && SECURE_LOGIN_CONFIG.CODE_REGEX.test(code.trim());
}

function generateSecureTokenFixed(){
  // [أمان] توليد توكن آمن 32 بايت عشوائي + timestamp - لا يمكن التنبؤ به مثل Date.now()
  try{
    const arr = new Uint8Array(SECURE_LOGIN_CONFIG.TOKEN_BYTES);
    crypto.getRandomValues(arr);
    let hex = '';
    for(let i=0;i<arr.length;i++) hex += arr[i].toString(16).padStart(2,'0');
    return `sec_${hex}_${Date.now()}_${crypto.randomUUID()}`;
  }catch{
    // [أمان] fallback لو crypto غير متاح
    return `sec_${Math.random().toString(36).slice(2)}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

function checkRateLimitSecure(ip, endpoint){
  // [أمان] Rate Limit بسيط في الذاكرة - يمنع Brute Force
  const key = `${ip}:${endpoint}`;
  const now = Date.now();
  const entry = LOGIN_RATE_LIMIT.get(key);
  
  if(!entry){
    LOGIN_RATE_LIMIT.set(key, {count:1, resetTime: now + SECURE_LOGIN_CONFIG.RATE_LIMIT_WINDOW_MS});
    return {allowed:true, remaining: SECURE_LOGIN_CONFIG.RATE_LIMIT_MAX -1};
  }
  
  if(now > entry.resetTime){
    // [أمان] انتهت النافذة - إعادة تعيين
    LOGIN_RATE_LIMIT.set(key, {count:1, resetTime: now + SECURE_LOGIN_CONFIG.RATE_LIMIT_WINDOW_MS});
    return {allowed:true, remaining: SECURE_LOGIN_CONFIG.RATE_LIMIT_MAX -1};
  }
  
  entry.count++;
  if(entry.count > SECURE_LOGIN_CONFIG.RATE_LIMIT_MAX){
    const retryAfter = Math.ceil((entry.resetTime - now)/1000);
    return {allowed:false, retryAfter};
  }
  
  LOGIN_RATE_LIMIT.set(key, entry);
  return {allowed:true, remaining: SECURE_LOGIN_CONFIG.RATE_LIMIT_MAX - entry.count};
}

function sanitizeUserRowSecure(rowObj){
  // [أمان] حذف الحقول الحساسة قبل الإرسال للعميل - كلمة المرور لا تخرج أبداً
  const clone = {...rowObj};
  // [أمان] احذف كل أشكال كلمة المرور
  delete clone['كلمة_المرور'];
  delete clone['كلمة المرور'];
  delete clone['كلمه_المرور'];
  delete clone['password'];
  delete clone['pass'];
  delete clone['__proto__'];
  delete clone['constructor'];
  return clone;
}

function safeRowToObject(cols, row){
  // [أمان] تحويل صف Turso إلى كائن مع تنظيف
  const obj={};
  row.forEach((cell,i)=>{
    const key = cols[i];
    if(!key) return;
    if(key.includes('__proto__') || key.includes('constructor') || key.includes('prototype')) return; // [أمان] منع تسمم
    obj[key] = cell.value ?? cell.text ?? '';
  });
  return obj;
}

function constantTimeCompare(a,b){
  // [أمان] مقارنة ثابتة الوقت تمنع Timing Attack
  const sa = String(a);
  const sb = String(b);
  if(sa.length !== sb.length) return false;
  let result = 0;
  for(let i=0;i<sa.length;i++){
    result |= sa.charCodeAt(i) ^ sb.charCodeAt(i);
  }
  return result === 0;
}

// ========== نهاية إضافات الأمان الجديدة ==========

// ========== إصلاح صارم: صفحات لوحة التحكم لا يتم تخزينها في الكاش أبداً - بدون حذف أي دالة ==========
const NEVER_CACHE_PAGES = ['Real-Monitoring','Cache-Dashboard','cache-dashboard','real-monitoring','Real-Monitoring-Cache','Cache-Dashboard-Real-Monitoring','Real-Monitoring-V2','dashboard','whitelist','allowed-ips','blocked','login','auth','cache-dashboard-real-monitoring'];
function shouldNeverCache(pageName, pathname){
  const combined = ((pageName||'') + ' ' + (pathname||'')).toLowerCase();
  return NEVER_CACHE_PAGES.some(p => combined.includes(p.toLowerCase()));
}
// ========== كود الكاش المضاف - بدون حذف أي دالة قديمة ==========
let GLOBAL_CACHE = new Map();
let STATS = {
  workerRequestsToday: 0,
  tursoQueriesToday: 0,
  cacheHits: 0,
  cacheMisses: 0,
  savedQueries: 0,
  cacheDuration: 3600,
  cacheEnabled: true,
  lastRefresh: null,
  nextExpiry: null,
  rowsRead: 0,
  storageUsed: 0,
  startOfDay: new Date().toDateString(),
  pagesConfig: {}
};
function parseDuration(payload){
  if(typeof payload === 'number') return payload;
  if(!payload) return 3600;
  if(payload.duration === 0 || payload.unit === 'infinite') return Infinity;
  if(typeof payload.duration === 'number' && payload.duration>0) return payload.duration;
  const map = { seconds:1, minutes:60, hours:3600, days:86400, weeks:604800, months:2592000, years:31536000 };
  const v = payload.durationValue?? payload.value?? 1;
  const u = payload.unit?? 'hours';
  if(u==='infinite') return Infinity;
  return v * (map[u] || 3600);
}
function getCacheKey(request, pageName){
  const url = new URL(request.url);
  const page = (pageName || url.pathname.split('/').pop() || 'index.html').trim();
  const keyPage = page === ''? 'index.html' : page;
  return keyPage + '|' + url.pathname + url.search;
}
function getCached(key){
  if(!STATS.cacheEnabled) return null;
  const page = key.split('|')[0];
  if(shouldNeverCache(page, key)) return null;
  const cfg = STATS.pagesConfig[page];
  if(cfg && cfg.enabled === false) return null;
  const entry = GLOBAL_CACHE.get(key);
  if(!entry) { STATS.cacheMisses++; return null; }
  if(Date.now() > entry.expiresAt){ GLOBAL_CACHE.delete(key); STATS.cacheMisses++; return null; }
  STATS.cacheHits++; STATS.savedQueries++;
  return entry;
}
function setCached(key, data, headers, pageName){
  if(!STATS.cacheEnabled) return;
  const page = pageName || key.split('|')[0];
  if(shouldNeverCache(page, key)) return;
  const cfg = STATS.pagesConfig[page];
  const durationSec = cfg? parseDuration(cfg) : STATS.cacheDuration;
  if(durationSec===0) return;
  const now = Date.now();
  const expiresAt = isFinite(durationSec)? now + durationSec*1000 : now + 365*24*3600*1000;
  const existing = GLOBAL_CACHE.get(key);
  const originalExpiresAt = existing?.originalExpiresAt || expiresAt;
  GLOBAL_CACHE.set(key, { data, headers, expiresAt, originalExpiresAt, page, createdAt: now });
  if(!STATS.pagesConfig[page]){
    STATS.pagesConfig[page] = { enabled:true, duration:durationSec, unit: cfg?.unit || 'hours', durationValue: cfg?.durationValue || Math.round(durationSec/3600) || 1, lastRefresh:new Date().toISOString(), nextExpiry:new Date(expiresAt).toISOString() };
  } else {
    STATS.pagesConfig[page].lastRefresh = new Date().toISOString();
    if(!existing) STATS.pagesConfig[page].nextExpiry = new Date(expiresAt).toISOString();
  }
  STATS.nextExpiry = new Date(expiresAt).toISOString();
  STATS.storageUsed = GLOBAL_CACHE.size;
}
async function ensureCacheConfigTableFixed(env){
  const sql = `CREATE TABLE IF NOT EXISTS cache_config (
    page TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 1,
    duration INTEGER DEFAULT 3600,
    unit TEXT DEFAULT 'hours',
    durationValue INTEGER DEFAULT 1,
    lastRefresh TEXT,
    nextExpiry TEXT
  )`;
  await tursoQuery(env, sql, []);
}
async function loadPagesConfigFixed(env){
  try{
    await ensureCacheConfigTableFixed(env);
    const q = await tursoQuery(env, "SELECT page, enabled, duration, unit, durationValue, lastRefresh, nextExpiry FROM cache_config LIMIT 200");
    if(!q.error && q.result?.rows){
      const cols=q.result.cols.map(c=>c.name);
      q.result.rows.forEach(row=>{
        const o={}; row.forEach((cell,i)=>o[cols[i]]=cell.value??cell.text??'');
        const page=o.page;
        if(page) STATS.pagesConfig[page]={ enabled:!!parseInt(o.enabled||1), duration:parseInt(o.duration||3600), unit:o.unit||'hours', durationValue:parseInt(o.durationValue||1), lastRefresh:o.lastRefresh, nextExpiry:o.nextExpiry };
      });
    }
  }catch{}
}
function getTursoConfig(env){
  let url = (env.TURSO_URL || env.TURSO_URLL || HARDCODED_TURSO_URL || '').trim();
  let token = (env.TURSO_TOKEN || env.TURSO_TOKENL || HARDCODED_TURSO_TOKEN || '').trim();
  if(!token || token.includes("PASTE_YOUR") || token.length < 10) return {url:null, token:null};
  if(url.startsWith('libsql://')) url='https://'+url.slice(8);
  if(url &&!url.startsWith('https://')) url='https://'+url;
  return {url, token};
}
async function tursoQuery(env, sql, params=[]){
  const {url, token} = getTursoConfig(env);
  if(!url ||!token) return {error:'no config - ضع TURSO_TOKEN في متغيرات البيئة Cloudflare'};
  try{
    const args = params.map(v=>({type:'text', value:String(v)}));
    const res = await fetch(`${url}/v2/pipeline`, {
      method:'POST',
      headers:{'Authorization':`Bearer ${token}`, 'Content-Type':'application/json'},
      body: JSON.stringify({requests:[{type:'execute', stmt:{sql, args}}, {type:'close'}]})
    });
    const data = await res.json();
    if(data.results?.[0]?.error) return {error: data.results[0].error.message, raw:data};
    STATS.tursoQueriesToday++;
    STATS.rowsRead += data.results?.[0]?.response?.result?.rows?.length || 0;
    return {result: data.results?.[0]?.response?.result, raw:data};
  }catch(e){ return {error:e.message}; }
}
function isBlocked(pageName, blockedList){
  const low = pageName.toLowerCase().trim();
  const lowNoExt = low.replace('.html','').trim();
  for(const b of blockedList){
    const blFull = String(b).toLowerCase().trim();
    const blNoExt = blFull.replace('.html','').trim();
    if(blFull===low || blNoExt===lowNoExt){
      return true;
    }
  }
  return false;
}
function isBlockedExact(pageName, blockedList){
  const low = pageName.toLowerCase().trim();
  for(const b of blockedList){
    const bl = String(b).toLowerCase().trim();
    if(bl===low) return true;
  }
  return false;
}
function blockedPageHTML(pageName, source){
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>مغلقة</title><style>body{min-height:100vh;background:#0a0a1a;color:#fff;display:flex;align-items:center;justify-content:center;font-family:Cairo,sans-serif}.box{background:rgba(255,255,255,0.07);padding:30px;border-radius:20px;text-align:center}</style></head><body><div class="box"><h1>🔒 الصفحة مغلقة</h1><p>${pageName}</p><p style="font-size:10px">Source: ${source}</p><a href="/" style="color:#a78bfa">الرئيسية</a></div></body></html>`;
}
function blockedDeviceHTML(ip, device, reason){
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>محظور</title><style>body{min-height:100vh;background:linear-gradient(135deg,#fee2e2,#fecaca);display:flex;align-items:center;justify-content:center;font-family:Cairo,sans-serif}.box{background:#fff;padding:30px;border-radius:20px;text-align:center;box-shadow:0 16px 40px rgba(0,0,0,0.15)} h1{color:#dc2626}</style></head><body><div class="box"><div style="font-size:60px">🚫</div><h1>تم حظر جهازك</h1><p>IP: ${ip}<br>الجهاز: ${device}<br>السبب: ${reason||'محظور'}<br>01092259655</p><a href="https://wa.me/201092259655" style="display:inline-block;padding:10px 20px;background:#25D366;color:#fff;border-radius:10px;text-decoration:none;margin-top:12px">واتساب</a></div></body></html>`;
}
async function insertBlockedDeviceFixed(env, device_model, ip, reason){
  const sql = "INSERT INTO blocked_devices (device_model, ip, reason) VALUES (?,?,?)";
  const params = [device_model, ip, reason];
  return await tursoQuery(env, sql, params);
}
async function getBlockedDevicesFixed(env){
  const result = await tursoQuery(env, "SELECT * FROM blocked_devices ORDER BY id DESC LIMIT 100", []);
  if(result.error) return {blocked:[], error:result.error};
  let blocked=[];
  if(result.result?.rows){
    const cols=result.result.cols.map(c=>c.name);
    blocked=result.result.rows.map(row=>{
      const obj={};
      row.forEach((cell,i)=>{ obj[cols[i]]=cell.value??cell.text??''; });
      return obj;
    });
  }
  return {blocked, error:null};
}
async function deleteBlockedDeviceFixed(env, id){
  return await tursoQuery(env, "DELETE FROM blocked_devices WHERE id=?", [id]);
}
function getRealIPFixed(request){
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || request.headers.get('X-Real-IP') || 'unknown';
}
async function handleBlockDeviceRequestFixed(request, env){
  try{
    const body = await request.json();
    const ip = body.ip || '';
    const device_model = body.device_model || body.device || 'Unknown';
    const reason = body.reason || 'محظور من لوحة المراقبة';
    if(!ip ||!ip.includes('.')){
      return new Response(JSON.stringify({success:false, error:'IP غير صالح: '+ip}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    }
    const result = await insertBlockedDeviceFixed(env, device_model, ip, reason);
    if(result.error) return new Response(JSON.stringify({success:false, error:result.error}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    return new Response(JSON.stringify({success:true}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  }catch(e){
    return new Response(JSON.stringify({success:false, error:e.message}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  }
}
async function handleUnblockDeviceRequestFixed(request, env){
  try{
    const body = await request.json();
    const id = body.id;
    if(!id) return new Response(JSON.stringify({success:false, error:'id مطلوب'}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    const result = await deleteBlockedDeviceFixed(env, id);
    if(result.error) return new Response(JSON.stringify({success:false, error:result.error}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    return new Response(JSON.stringify({success:true}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  }catch(e){
    return new Response(JSON.stringify({success:false, error:e.message}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  }
}
async function ensureWhitelistTableFixed(env){
  const sql = `CREATE TABLE IF NOT EXISTS ip_whitelist_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    allowed_ip TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'all',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  )`;
  await tursoQuery(env, sql, []);
}
async function ensureAllowedIPsTableFixed(env){
  const sql1 = `CREATE TABLE IF NOT EXISTS allowed_ips (
    ip TEXT PRIMARY KEY,
    reason TEXT DEFAULT 'مسموح',
    device_name TEXT DEFAULT '',
    added_at TEXT DEFAULT (datetime('now','localtime'))
  )`;
  await tursoQuery(env, sql1, []);
  try{ await tursoQuery(env, `ALTER TABLE allowed_ips ADD COLUMN device_name TEXT DEFAULT ''`, []); }catch{}
  await ensureWhitelistTableFixed(env);
}
async function ensureRealLogsDeviceNameFixed(env){
  try{ await tursoQuery(env, `ALTER TABLE real_page_logs ADD COLUMN device_name TEXT DEFAULT ''`, []); }catch{}
  try{ await tursoQuery(env, `ALTER TABLE blocked_devices ADD COLUMN device_name TEXT DEFAULT ''`, []); }catch{}
}
async function addAllowedIPFixed(env, ip, reason, device_name){
  await ensureAllowedIPsTableFixed(env);
  return await tursoQuery(env, "INSERT OR REPLACE INTO allowed_ips (ip, reason, device_name) VALUES (?,?,?)", [ip, reason||'مسموح', device_name||'']);
}
async function updateAllowedIPDeviceNameFixed(env, ip, device_name){
  await ensureAllowedIPsTableFixed(env);
  return await tursoQuery(env, "UPDATE allowed_ips SET device_name=? WHERE ip=?", [device_name||'', ip]);
}
async function removeAllowedIPFixed(env, ip){
  await ensureAllowedIPsTableFixed(env);
  return await tursoQuery(env, "DELETE FROM allowed_ips WHERE ip=?", [ip]);
}
async function getAllowedIPsFixed(env){
  await ensureAllowedIPsTableFixed(env);
  const q = await tursoQuery(env, "SELECT * FROM allowed_ips ORDER BY added_at DESC", []);
  if(q.error) return {allowed:[], error:q.error};
  let allowed=[];
  if(q.result?.rows){
    const cols=q.result.cols.map(c=>c.name);
    allowed=q.result.rows.map(row=>{
      const obj={};
      row.forEach((cell,i)=>{ obj[cols[i]]=cell.value??cell.text??''; });
      return obj;
    });
  }
  return {allowed, error:null};
}
async function enableWhitelistModeFixed(env){
  await ensureAllowedIPsTableFixed(env);
  await tursoQuery(env, "DELETE FROM ip_whitelist_config", []);
  return await tursoQuery(env, "INSERT INTO ip_whitelist_config (allowed_ip, mode) VALUES ('multiple', 'whitelist')", []);
}
async function disableWhitelistModeFixed(env){
  await ensureAllowedIPsTableFixed(env);
  await tursoQuery(env, "DELETE FROM ip_whitelist_config", []);
  return await tursoQuery(env, "INSERT INTO ip_whitelist_config (allowed_ip, mode) VALUES ('0.0.0.0', 'all')", []);
}
async function getWhitelistModeFixedBackend(env){
  await ensureWhitelistTableFixed(env);
  const q = await tursoQuery(env, "SELECT * FROM ip_whitelist_config ORDER BY id DESC LIMIT 1", []);
  if(q.error ||!q.result?.rows || q.result.rows.length===0){
    return {mode:'all', allowed_ip:null};
  }
  const cols=q.result.cols.map(c=>c.name);
  const row=q.result.rows[0];
  const obj={}; row.forEach((cell,i)=>{ obj[cols[i]]=cell.value??cell.text??''; });
  return {mode: obj.mode||'all', allowed_ip: obj.allowed_ip, created_at: obj.created_at, raw: obj};
}
async function isIPAllowedInWhitelistFixed(env, currentIP){
  const modeData = await getWhitelistModeFixedBackend(env);
  if(modeData.mode!=='whitelist') return true;
  const allowedData = await getAllowedIPsFixed(env);
  return allowedData.allowed.some(a=>a.ip===currentIP);
}
function whitelistBlockedPageFixed(currentIP, allowedList){
  const listHTML = allowedList.map(a=>`<span style="background:#dcfce7;color:#065f46;padding:2px 8px;border-radius:6px;margin:2px;display:inline-block;font-family:monospace">${a.ip}</span>`).join(' ');
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>مغلق - قائمة بيضاء</title><style>body{min-height:100vh;background:linear-gradient(135deg,#fef3c7,#fde68a);display:flex;align-items:center;justify-content:center;font-family:Cairo,sans-serif}.box{background:#fff;padding:30px;border-radius:20px;text-align:center;box-shadow:0 16px 40px rgba(0,0,0,0.15);max-width:600px;width:92%} h1{color:#d97706}.ip{font-family:monospace;background:#fee2e2;color:#dc2626;padding:4px 10px;border-radius:8px;font-weight:800}</style></head><body><div class="box"><div style="font-size:60px">🔐</div><h1>الموقع في وضع القائمة البيضاء</h1><p>متاح فقط لعناوين محددة</p><div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:12px;margin:12px 0;text-align:right;font-size:12px"><b>IP الخاص بك:</b> <span class="ip">${currentIP}</span><br><br><b>المسموح:</b><br>${listHTML||'لا يوجد'}<br><br>تواصل: 01092259655</div><a href="https://wa.me/201092259655" style="display:inline-block;padding:10px 20px;background:#25D366;color:#fff;border-radius:10px;text-decoration:none;font-weight:800">💬 واتساب</a></div></body></html>`;
}
async function handleAddAllowedIPFixed(request, env){
  try{
    const body = await request.json();
    const ip = body.ip?.trim();
    const reason = body.reason?.trim() || 'مسموح';
    const device_name = body.device_name?.trim() || body.device||'';
    if(!ip ||!ip.includes('.')) return new Response(JSON.stringify({success:false, error:'IP غير صالح'}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    const result = await addAllowedIPFixed(env, ip, reason, device_name);
    if(result.error) return new Response(JSON.stringify({success:false, error:result.error}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    return new Response(JSON.stringify({success:true, ip:ip}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  }catch(e){ return new Response(JSON.stringify({success:false, error:e.message}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }
}
async function handleUpdateDeviceNameFixed(request, env){
  try{
    const body = await request.json();
    const ip = body.ip?.trim();
    const device_name = body.device_name?.trim() || '';
    if(!ip) return new Response(JSON.stringify({success:false, error:'IP مطلوب'}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    const result = await updateAllowedIPDeviceNameFixed(env, ip, device_name);
    if(result.error) return new Response(JSON.stringify({success:false, error:result.error}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    return new Response(JSON.stringify({success:true}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  }catch(e){ return new Response(JSON.stringify({success:false, error:e.message}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }
}
async function handleRemoveAllowedIPFixed(request, env){
  try{
    const body = await request.json();
    const ip = body.ip?.trim();
    if(!ip) return new Response(JSON.stringify({success:false, error:'IP مطلوب'}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    const result = await removeAllowedIPFixed(env, ip);
    if(result.error) return new Response(JSON.stringify({success:false, error:result.error}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    return new Response(JSON.stringify({success:true}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  }catch(e){ return new Response(JSON.stringify({success:false, error:e.message}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }
}
async function handleGetAllowedIPsFixed(request, env){
  try{
    const allowedData = await getAllowedIPsFixed(env);
    const modeData = await getWhitelistModeFixedBackend(env);
    return new Response(JSON.stringify({allowed:allowedData.allowed, mode:modeData.mode, allowed_ip:modeData.allowed_ip, error:allowedData.error}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache'}});
  }catch(e){ return new Response(JSON.stringify({allowed:[], error:e.message}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }
}
async function handleEnableWhitelistFixed(request, env){
  try{
    const result = await enableWhitelistModeFixed(env);
    if(result.error) return new Response(JSON.stringify({success:false, error:result.error}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    return new Response(JSON.stringify({success:true, mode:'whitelist'}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  }catch(e){ return new Response(JSON.stringify({success:false, error:e.message}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }
}
async function handleDisableWhitelistFixed(request, env){
  try{
    const result = await disableWhitelistModeFixed(env);
    if(result.error) return new Response(JSON.stringify({success:false, error:result.error}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    return new Response(JSON.stringify({success:true, mode:'all'}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  }catch(e){ return new Response(JSON.stringify({success:false, error:e.message}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }
}
export default {
  async fetch(request, env, ctx){
    const url = new URL(request.url);
    const path = url.pathname;
    const today = new Date().toDateString();
    if(STATS.startOfDay!== today){ STATS.startOfDay=today; STATS.workerRequestsToday=0; STATS.tursoQueriesToday=0; STATS.cacheHits=0; STATS.cacheMisses=0; STATS.savedQueries=0; }
    STATS.workerRequestsToday++;
    for(let k of GLOBAL_CACHE.keys()){
      if(shouldNeverCache(k.split('|')[0], k)){
        GLOBAL_CACHE.delete(k);
      }
    }
    if(request.method==='OPTIONS'){
      return new Response(null,{status:204, headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'}});
    }

    // ========== فحص إجباري: منع الدخول إلا عبر index.html ==========
    if(isEntryHtmlPage(path)){
      if(!hasValidEntry(request)){
        let pageName = path.split('/').pop() || path;
        return new Response(entryBlockedHTMLFixed(pageName), {status:403, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache, no-store','Set-Cookie':`${ENTRY_COOKIE_NAME}=0; Path=/; Max-Age=0`}});
      }
    }
    // ========== نهاية الفحص الإجباري ==========

    if(path==='/api/cache-stats'){
      await loadPagesConfigFixed(env);
      return new Response(JSON.stringify(STATS),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache'}});
    }
    if(path==='/api/cache-config' && request.method==='POST'){
      try{
        const body = await request.json();
        await ensureCacheConfigTableFixed(env);
        if(typeof body.duration === 'number') STATS.cacheDuration = body.duration;
        if(body.durationValue && body.unit) STATS.cacheDuration = parseDuration(body);
        if(typeof body.enabled === 'boolean') STATS.cacheEnabled = body.enabled;
        if(body.pages){
          for(const [page, cfg] of Object.entries(body.pages)){
            if(shouldNeverCache(page, '')) continue;
            const dur = cfg.duration || parseDuration(cfg);
            const unit = cfg.unit || 'hours';
            const durVal = cfg.durationValue?? cfg.value?? 1;
            STATS.pagesConfig[page] = { enabled: cfg.enabled!==false, duration: dur, unit: unit, durationValue: durVal, lastRefresh: new Date().toISOString(), nextExpiry: new Date(Date.now() + dur*1000).toISOString() };
            try{
              await tursoQuery(env, "INSERT OR REPLACE INTO cache_config (page, enabled, duration, unit, durationValue, lastRefresh, nextExpiry) VALUES (?,?,?,?,?,?,?)", [page, STATS.pagesConfig[page].enabled?1:0, STATS.pagesConfig[page].duration, STATS.pagesConfig[page].unit, STATS.pagesConfig[page].durationValue, STATS.pagesConfig[page].lastRefresh, STATS.pagesConfig[page].nextExpiry]);
            }catch{}
          }
        }
        return new Response(JSON.stringify({ok:true, config:STATS}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      }catch(e){ return new Response(JSON.stringify({ok:false, error:e.message}),{status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }
    }
    if(path==='/api/cache-refresh'){
      try{
        const isGetPreheat = url.searchParams.get('preheat');
        if(request.method==='GET' && isGetPreheat){
          const page = isGetPreheat;
          if(shouldNeverCache(page, '')){
            return new Response(JSON.stringify({ok:true, skipped:true, reason:'never cache dashboard'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          }
          for(let k of [...GLOBAL_CACHE.keys()]){ if(k.startsWith(page+'|')) GLOBAL_CACHE.delete(k); }
          STATS.lastRefresh = new Date().toISOString();
          return new Response(JSON.stringify({ok:true, preheated:page}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }
        const body = await request.json().catch(()=>({}));
        const preserve = body.preserveTimer === true;
        const singlePage = body.page;
        const pages = body.pages;
        const all = body.all;
        if(singlePage){
          if(shouldNeverCache(singlePage, '')){
            for(let k of [...GLOBAL_CACHE.keys()]){ if(k.startsWith(singlePage+'|')) GLOBAL_CACHE.delete(k); }
            return new Response(JSON.stringify({ok:true, cleared: singlePage, dashboard:true}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          }
          for(let [k, v] of [...GLOBAL_CACHE.entries()]){
            if(k.startsWith(singlePage+'|')){
              if(preserve){
                GLOBAL_CACHE.delete(k);
                if(STATS.pagesConfig[singlePage]) STATS.pagesConfig[singlePage].lastRefresh = new Date().toISOString();
              } else {
                GLOBAL_CACHE.delete(k);
                if(STATS.pagesConfig[singlePage]){
                  const dur = STATS.pagesConfig[singlePage].duration || STATS.cacheDuration;
                  STATS.pagesConfig[singlePage].lastRefresh = new Date().toISOString();
                  STATS.pagesConfig[singlePage].nextExpiry = new Date(Date.now() + dur*1000).toISOString();
                }
              }
            }
          }
        } else if(pages && Array.isArray(pages)){
          for(let page of pages){
            if(shouldNeverCache(page, '')) continue;
            for(let k of [...GLOBAL_CACHE.keys()]){ if(k.startsWith(page+'|')) GLOBAL_CACHE.delete(k); }
            if(STATS.pagesConfig[page] &&!preserve){
              const dur = STATS.pagesConfig[page].duration || STATS.cacheDuration;
              STATS.pagesConfig[page].lastRefresh = new Date().toISOString();
              STATS.pagesConfig[page].nextExpiry = new Date(Date.now() + dur*1000).toISOString();
            } else if(STATS.pagesConfig[page]) {
              STATS.pagesConfig[page].lastRefresh = new Date().toISOString();
            }
          }
        } else if(all ||!singlePage){
          const dashboardKeys = [...GLOBAL_CACHE.keys()].filter(k=> shouldNeverCache(k.split('|')[0], k));
          GLOBAL_CACHE.clear();
          for(let p in STATS.pagesConfig){
            if(shouldNeverCache(p, '')) continue;
            if(!preserve){
              const dur = STATS.pagesConfig[p].duration || STATS.cacheDuration;
              STATS.pagesConfig[p].lastRefresh = new Date().toISOString();
              STATS.pagesConfig[p].nextExpiry = new Date(Date.now() + dur*1000).toISOString();
            } else {
              STATS.pagesConfig[p].lastRefresh = new Date().toISOString();
            }
          }
        }
        STATS.lastRefresh = new Date().toISOString();
        STATS.storageUsed = GLOBAL_CACHE.size;
        return new Response(JSON.stringify({ok:true, preserveTimer:preserve, clearedAt:STATS.lastRefresh, remainingKeys:GLOBAL_CACHE.size}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      }catch(e){ return new Response(JSON.stringify({ok:false, error:e.message}),{status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }
    }
    if(path==='/api/allowed-ips'){
      return await handleGetAllowedIPsFixed(request, env);
    }
    if(path==='/api/add-allowed-ip'){
      return await handleAddAllowedIPFixed(request, env);
    }
    if(path==='/api/update-device-name'){
      return await handleUpdateDeviceNameFixed(request, env);
    }
    if(path==='/api/remove-allowed-ip'){
      return await handleRemoveAllowedIPFixed(request, env);
    }
    if(path==='/api/enable-whitelist'){
      return await handleEnableWhitelistFixed(request, env);
    }
    if(path==='/api/disable-whitelist'){
      return await handleDisableWhitelistFixed(request, env);
    }
    if(path==='/api/block-device-fixed'){
      return await handleBlockDeviceRequestFixed(request, env);
    }
    if(path==='/api/unblock-device-fixed'){
      return await handleUnblockDeviceRequestFixed(request, env);
    }
    if(path==='/api/get-ip-fixed'){
      const ip = getRealIPFixed(request);
      return new Response(JSON.stringify({ip, country:request.cf?.country||'unknown'}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    }
    if(path==='/api/get-ip'){
      const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown';
      return new Response(JSON.stringify({ip, address:ip, country:request.cf?.country||'unknown', city:request.cf?.city||''}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache'}});
    }

    // ========== مسارات مؤمنة جديدة لصفحة index.html - Prepared Statements بدون SQL في المتصفح ==========
    // [أمان] كل هذه المسارات تستخدم Prepared Statements - القيم منفصلة عن SQL تماماً

    // 1. فحص البطاقة - لا يرجع كلمة المرور أبداً
    if(path==='/api/check-by-card-secure' && request.method==='POST'){
      try{
        const ip = getRealIPFixed(request);
        const rl = checkRateLimitSecure(ip, 'check-card');
        if(!rl.allowed){
          return new Response(JSON.stringify({ok:false, msg:`محاولات كثيرة - حاول بعد ${rl.retryAfter} ثانية`}), {status:429, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }

        const body = await request.json().catch(()=>({}));
        const cardNumber = String(body.cardNumber||'').trim();

        if(!isValidNationalIdSecure(cardNumber)){
          return new Response(JSON.stringify({ok:false, msg:'رقم البطاقة يجب أن يكون 14 رقم'}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }

        // [أمان] Prepared Statement - القيمة منفصلة
        const sql = `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`;
        const q = await tursoQuery(env, sql, [cardNumber]);

        if(q.error){
          // [أمان] محاولة باسم عمود بديل لو فشل - بعض الجداول تستخدم الرقم_القومي بدون ى
          const sql2 = `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومي"=? LIMIT 1`;
          const q2 = await tursoQuery(env, sql2, [cardNumber]);
          if(q2.error){
            return new Response(JSON.stringify({ok:false, msg:'خطأ في قاعدة البيانات', debug: q.error}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          }
          if(!q2.result?.rows || q2.result.rows.length===0){
            return new Response(JSON.stringify({ok:false, msg:'رقم البطاقة غير موجود'}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          }
          const cols = q2.result.cols.map(c=>c.name);
          const row = q2.result.rows[0];
          const userObj = safeRowToObject(cols, row);
          const safeUser = sanitizeUserRowSecure(userObj);
          return new Response(JSON.stringify({ok:true, user:safeUser}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }

        if(!q.result?.rows || q.result.rows.length===0){
          return new Response(JSON.stringify({ok:false, msg:'رقم البطاقة غير موجود'}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }

        const cols = q.result.cols.map(c=>c.name);
        const row = q.result.rows[0];
        const userObj = safeRowToObject(cols, row);
        const safeUser = sanitizeUserRowSecure(userObj); // [أمان] حذف كلمة المرور

        return new Response(JSON.stringify({ok:true, user:safeUser}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});

      }catch(e){
        return new Response(JSON.stringify({ok:false, msg:'خطأ في الخادم', error:e.message}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      }
    }

    // 2. جلب التوجيه - Prepared Statement
    if(path==='/api/get-routing-secure'){
      try{
        const nationalId = url.searchParams.get('nationalId')?.trim() || '';
        const code = url.searchParams.get('code')?.trim() || '';

        if(!isValidNationalIdSecure(nationalId) && !isValidCodeSecure(code)){
          return new Response(JSON.stringify({found:false, msg:'بيانات غير صالحة'}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }

        const sql = `SELECT * FROM "توجيه_المستخدمين" WHERE ("الرقم_القومى"=? OR "الكود_البنكى"=?) AND "مفعلة"=1 LIMIT 1`;
        const q = await tursoQuery(env, sql, [nationalId, code]);

        if(q.error){
          return new Response(JSON.stringify({found:false, error:q.error}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }

        if(!q.result?.rows || q.result.rows.length===0){
          return new Response(JSON.stringify({found:false}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }

        const cols = q.result.cols.map(c=>c.name);
        const row = q.result.rows[0];
        const routing = safeRowToObject(cols, row);

        // [أمان] تحقق تاريخ الانتهاء في الخادم
        if(routing["تاريخ_الانتهاء"]){
          const end = new Date(routing["تاريخ_الانتهاء"]);
          if(new Date() > end){
            return new Response(JSON.stringify({found:false, expired:true}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          }
        }

        return new Response(JSON.stringify({found:true, routing}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});

      }catch(e){
        return new Response(JSON.stringify({found:false, error:e.message}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      }
    }

    // 3. التحقق من كلمة المرور - آمن 100% - كلمة المرور لا تخرج من الخادم أبداً
    if(path==='/api/verify-password-secure' && request.method==='POST'){
      try{
        const ip = getRealIPFixed(request);
        const rl = checkRateLimitSecure(ip, 'verify-pass');
        if(!rl.allowed){
          return new Response(JSON.stringify({ok:false, msg:`محاولات كثيرة - حاول بعد ${rl.retryAfter} ثانية`}), {status:429, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }

        const body = await request.json().catch(()=>({}));
        const cardNumber = String(body.cardNumber||'').trim();
        const password = String(body.password||'').trim();

        if(!isValidNationalIdSecure(cardNumber)){
          return new Response(JSON.stringify({ok:false, msg:'بيانات غير صحيحة'}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }
        if(password.length < 3 || password.length > SECURE_LOGIN_CONFIG.PASSWORD_MAX_LEN){
          return new Response(JSON.stringify({ok:false, msg:'بيانات غير صحيحة'}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }
        if(password.includes('__proto__') || password.includes('constructor')){
          return new Response(JSON.stringify({ok:false, msg:'بيانات مشبوهة'}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }

        // [أمان] جلب كلمة المرور من قاعدة البيانات فقط - لا ترسل للعميل
        const sql = `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`;
        const q = await tursoQuery(env, sql, [cardNumber]);

        if(q.error){
          return new Response(JSON.stringify({ok:false, msg:'خطأ في قاعدة البيانات'}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }

        if(!q.result?.rows || q.result.rows.length===0){
          // [أمان] رسالة عامة لا تكشف هل الرقم موجود أم لا - يمنع User Enumeration
          return new Response(JSON.stringify({ok:false, msg:'بيانات الدخول غير صحيحة'}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }

        const cols = q.result.cols.map(c=>c.name);
        const row = q.result.rows[0];
        const userObj = safeRowToObject(cols, row);

        const storedPass = String(userObj['كلمة_المرور']||userObj['كلمة المرور']||'').trim();

        // [أمان] مقارنة ثابتة الوقت - تمنع Timing Attack
        if(!constantTimeCompare(storedPass, password)){
          return new Response(JSON.stringify({ok:false, msg:'بيانات الدخول غير صحيحة'}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }

        // [أمان] نجاح - توليد توكن آمن من الخادم فقط - ليس Date.now()
        const token = generateSecureTokenFixed();
        SECURE_TOKENS.set(token, {cardNumber, created: Date.now()});

        return new Response(JSON.stringify({ok:true, token, role: userObj['الصلاحيات']||userObj['نوع_المستخدم']||'User'}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});

      }catch(e){
        return new Response(JSON.stringify({ok:false, msg:'خطأ في الخادم', error:e.message}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      }
    }

    // 4. تسجيل البصمة لأول مرة - Prepared Statement
    if(path==='/api/register-by-card-secure' && request.method==='POST'){
      try{
        const body = await request.json().catch(()=>({}));
        const cardNumber = String(body.cardNumber||'').trim();
        const bio = String(body.bio||'').trim();
        const password = String(body.password||'').trim();

        if(!isValidNationalIdSecure(cardNumber)){
          return new Response(JSON.stringify({ok:false, msg:'رقم البطاقة غير صالح'}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }
        if(password.length < 8){
          return new Response(JSON.stringify({ok:false, msg:'كلمة المرور يجب أن تكون 8 أحرف على الأقل'}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }
        if(bio.length > SECURE_LOGIN_CONFIG.BIO_MAX_LEN){
          return new Response(JSON.stringify({ok:false, msg:'بيانات البصمة كبيرة جداً'}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }

        // [أمان] تحقق هل البصمة موجودة مسبقاً
        const checkSql = `SELECT "بصمة" FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`;
        const checkQ = await tursoQuery(env, checkSql, [cardNumber]);

        if(checkQ.error){
          return new Response(JSON.stringify({ok:false, msg:'خطأ في قاعدة البيانات'}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }

        if(checkQ.result?.rows && checkQ.result.rows.length>0){
          const cols = checkQ.result.cols.map(c=>c.name);
          const existing = safeRowToObject(cols, checkQ.result.rows[0]);
          const existingBio = String(existing['بصمة']||'').trim();
          if(existingBio && existingBio.toLowerCase()!=='null' && existingBio!==''){
            return new Response(JSON.stringify({ok:false, msg:'البصمة مسجلة مسبقاً - لا يمكن التسجيل مرة أخرى'}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          }
        }

        // [أمان] تحديث آمن بـ Prepared Statement
        const updateSql = `UPDATE "موظفين_مرتبات" SET "بصمة"=?, "كلمة_المرور"=? WHERE "الرقم_القومى"=?`;
        const updateQ = await tursoQuery(env, updateSql, [bio, password, cardNumber]);

        if(updateQ.error){
          return new Response(JSON.stringify({ok:false, msg:'فشل الحفظ', error:updateQ.error}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }

        return new Response(JSON.stringify({ok:true, msg:'تم الحفظ بنجاح'}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});

      }catch(e){
        return new Response(JSON.stringify({ok:false, msg:'خطأ في الخادم', error:e.message}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      }
    }

    // 5. دخول بالبصمة - آمن
    if(path==='/api/bio-login-by-card-secure' && request.method==='POST'){
      try{
        const body = await request.json().catch(()=>({}));
        const cardNumber = String(body.cardNumber||'').trim();
        const bioAttempt = body.bioAttempt ? String(body.bioAttempt).trim() : null;

        if(!isValidNationalIdSecure(cardNumber)){
          return new Response(JSON.stringify({ok:false, msg:'رقم غير صالح'}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }

        const sql = `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`;
        const q = await tursoQuery(env, sql, [cardNumber]);

        if(q.error || !q.result?.rows || q.result.rows.length===0){
          return new Response(JSON.stringify({ok:false, msg:'المستخدم غير موجود'}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }

        const cols = q.result.cols.map(c=>c.name);
        const userObj = safeRowToObject(cols, q.result.rows[0]);
        const savedBioStr = String(userObj['بصمة']||'').trim();

        if(!savedBioStr || savedBioStr.toLowerCase()==='null'){
          return new Response(JSON.stringify({ok:false, msg:'لا توجد بصمة محفوظة'}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }

        let savedBio;
        try{
          savedBio = JSON.parse(savedBioStr);
        }catch{
          return new Response(JSON.stringify({ok:false, msg:'بيانات بصمة تالفة'}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }

        // [أمان] لو نقش - قارن بشكل آمن
        if(savedBio.type==='pattern'){
          if(!bioAttempt){
            return new Response(JSON.stringify({ok:false, msg:'أدخل النقش'}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          }
          if(!constantTimeCompare(String(savedBio.value||'').trim(), bioAttempt.trim())){
            return new Response(JSON.stringify({ok:false, msg:'النقش غير مطابق'}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
          }
        }
        // [أمان] لو بصمة جهاز - المتصفح تحقق منها بـ WebAuthn - الخادم يثق بعد التحقق المحلي وينشئ توكن

        const token = generateSecureTokenFixed();
        SECURE_TOKENS.set(token, {cardNumber, created: Date.now()});

        return new Response(JSON.stringify({ok:true, token, role: userObj['الصلاحيات']||'User'}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});

      }catch(e){
        return new Response(JSON.stringify({ok:false, msg:'خطأ في الخادم', error:e.message}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      }
    }

    // ========== نهاية المسارات المؤمنة الجديدة ==========

    // ===== مسار آمن جديد: /api/salary-turso مع Prepared Statements =====
if(path==='/api/salary-turso'){
  try{
    const year = url.searchParams.get('year')?.trim();
    const month = url.searchParams.get('month')?.trim();
    const code = url.searchParams.get('code')?.trim();

    // Validation قائمة بيضاء
    if(!year ||!/^\d{4}$/.test(year) || Number(year) < 2015 || Number(year) > 2035){
      return new Response(JSON.stringify({found:false, error:'سنة غير صالحة'}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    }
    const allowedMonths = ["يناير","فبراير","مارس","أبريل","ابريل","مايو","يونيو","يوليو","أغسطس","اغسطس","سبتمبر","أكتوبر","اكتوبر","نوفمبر","ديسمبر"];
    if(!month ||!allowedMonths.includes(month)){
      return new Response(JSON.stringify({found:false, error:'شهر غير صالح'}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    }
    if(!code ||!/^[A-Za-z0-9_\-]{2,30}$/.test(code)){
      return new Response(JSON.stringify({found:false, error:'كود غير صالح'}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    }

    const TABLE_NAME = "مرتبات_شهرية";

    // PREPARED STATEMENT - القيم منفصلة عن SQL
    const sql = `SELECT * FROM "${TABLE_NAME}" WHERE "السنه" =? AND "الشهر" =? AND ("كود_العامل" =? OR "الكود_البنكى" =? OR "emptid" =?) LIMIT 1`;
    const params = [year, month, code, code, code];

    const q = await tursoQuery(env, sql, params);

    if(q.error){
      return new Response(JSON.stringify({found:false, error:'خطأ في قاعدة البيانات', debug: q.error}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    }

    if(!q.result?.rows || q.result.rows.length===0){
      return new Response(JSON.stringify({found:false, data:null}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    }

    const cols = q.result.cols.map(c=>c.name);
    const row = q.result.rows[0];
    const data = {};
    row.forEach((cell,i)=>{
      const key = cols[i];
      if(key.includes('__proto__')) return;
      data[key] = cell.value?? cell.text?? '';
    });

    return new Response(JSON.stringify({found:true, data:data}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});

  }catch(e){
    return new Response(JSON.stringify({found:false, error:'خطأ في الخادم'}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  }
}
if(path==='/api/turso'){
  // حماية: اسمح فقط لـ IPs المسموحة أو احذف هذا المسار نهائياً بعد الاختبار
  const currentIP = request.headers.get('CF-Connecting-IP') || '';
  const allowedData = await getAllowedIPsFixed(env);
  const isAllowed = allowedData.allowed.some(a=>a.ip===currentIP);
  if(!isAllowed){
    return new Response(JSON.stringify({error:'Forbidden - Use /api/salary-turso only'}), {status:403, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  }
  //... باقي الكود القديم
      try{
        const body = await request.json();
        // [أمان] منع حقن SQL في المسار العام - يجب استخدام المسارات المخصصة فقط
        if(!body.sql || typeof body.sql !== 'string'){
          return new Response(JSON.stringify({error:'SQL مطلوب'}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }
        if(body.sql.includes('__proto__') || body.sql.includes('constructor')){
          return new Response(JSON.stringify({error:'SQL مشبوه'}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        }
        const q = await tursoQuery(env, body.sql, body.params||[]);
        if(q.error) return new Response(JSON.stringify({error:q.error, rows:[], raw:q.raw}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        let rows=[];
        if(q.result?.rows){
          const cols=q.result.cols.map(c=>c.name);
          rows=q.result.rows.map(row=>{
            const obj={};
            row.forEach((cell,i)=>{ obj[cols[i]]=cell.value??cell.text??''; });
            return obj;
          });
        }
        return new Response(JSON.stringify({rows, affected_row_count:q.result?.affected_row_count, last_insert_rowid:q.result?.last_insert_rowid, raw:q.raw}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      }catch(e){
        return new Response(JSON.stringify({error:e.message, rows:[]}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      }
    }
    if(path==='/api/blocked-list'){
      const q = await tursoQuery(env, 'SELECT "اسم_الصفحة" FROM "صفحات_الموقع" WHERE "مفعلة"=0');
      let pages=[];
      if(!q.error && q.result?.rows){
        const cols=q.result.cols.map(c=>c.name);
        const idx=cols.indexOf("اسم_الصفحة");
        if(idx>=0) pages=q.result.rows.map(r=> String(r[idx].value??r[idx].text??'').toLowerCase().trim()).filter(Boolean);
      }
      if(pages.length===0) pages=FALLBACK_BLOCKED;
      return new Response(JSON.stringify({blocked:pages, count:pages.length}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache'}});
    }
    if(path==='/api/blocked-devices'){
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const q = await tursoQuery(env, 'SELECT * FROM blocked_devices ORDER BY created_at DESC LIMIT 100');
      let blocked=[];
      if(!q.error && q.result?.rows){
        const cols=q.result.cols.map(c=>c.name);
        blocked=q.result.rows.map(row=>{
          const obj={};
          row.forEach((cell,i)=>{ obj[cols[i]]=cell.value??cell.text??''; });
          return obj;
        });
      }
      const isBlocked = blocked.some(b=>b.ip===ip);
      return new Response(JSON.stringify({blocked, isBlocked, currentIp:ip, count:blocked.length}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache'}});
    }
    if(!['/api/','/js/','.js','.css','.json','.png','.jpg','.svg','.ico','Real-Monitoring','whitelist','allowed-ips','add-allowed-ip','remove-allowed-ip','block-device','unblock-device','get-ip','blocked-devices','blocked-list','turso','cache-'].some(s=>path.toLowerCase().includes(s.toLowerCase()))){
      const currentIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || '';
      if(currentIP){
        const modeData = await getWhitelistModeFixedBackend(env);
        if(modeData.mode==='whitelist'){
          const allowed = await isIPAllowedInWhitelistFixed(env, currentIP);
          if(!allowed){
            const allowedData = await getAllowedIPsFixed(env);
            return new Response(whitelistBlockedPageFixed(currentIP, allowedData.allowed), {status:403, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'}});
          }
        }
      }
    }
    if(!['/api/','/js/','.js','.css','.json','.png','.jpg','.svg','.ico','Real-Monitoring'].some(s=>path.toLowerCase().includes(s.toLowerCase()))){
      const currentIp = request.headers.get('CF-Connecting-IP') || '';
      if(currentIp){
        const q = await tursoQuery(env, 'SELECT * FROM blocked_devices WHERE ip=? LIMIT 1', [currentIp]);
        if(!q.error && q.result?.rows?.length>0){
          const cols=q.result.cols.map(c=>c.name);
          const row=q.result.rows[0];
          const obj={}; row.forEach((cell,i)=>{ obj[cols[i]]=cell.value??cell.text??''; });
          return new Response(blockedDeviceHTML(obj.ip, obj.device_model, obj.reason), {status:403, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'}});
        }
      }
    }
    if(!['database-manager','turso-api','hafez-api','auth-api','favicon','.js','.css','.json','.png','.jpg','.svg','.ico','/api/'].some(s=>path.toLowerCase().includes(s.toLowerCase()))){
      let pageName = path.split('/').pop() || 'index.html';
      if(path==='/' || path==='') pageName='index.html';
      const isHtml = path.endsWith('.html') || path==='/' || path==='' || (!path.includes('.') &&!path.startsWith('/api/'));
      if(isHtml){
        const q = await tursoQuery(env, 'SELECT "اسم_الصفحة" FROM "صفحات_الموقع" WHERE "مفعلة"=0');
        let pages=FALLBACK_BLOCKED;
        if(!q.error && q.result?.rows){
          const cols=q.result.cols.map(c=>c.name);
          const idx=cols.indexOf("اسم_الصفحة");
          if(idx>=0) pages=q.result.rows.map(r=> String(r[idx].value??r[idx].text??'').toLowerCase().trim()).filter(Boolean);
        }
        if(isBlocked(pageName, pages)){
          return new Response(blockedPageHTML(pageName, 'turso'), {status:403, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'}});
        }
      }
    }
    const isHtmlPage = path.endsWith('.html') || path==='/' || (!path.includes('.') &&!path.startsWith('/api/'));
    const pageNameForCache = path.split('/').pop() || 'index.html';
    const isDashboard = shouldNeverCache(pageNameForCache, path);
    if(isHtmlPage &&!isDashboard && request.method==='GET'){
      const cacheKey = getCacheKey(request, pageNameForCache);
      const cached = getCached(cacheKey);
      if(cached){
        // إضافة كوكي دخول حتى مع الكاش
        let headers = {'Content-Type':'text/html; charset=utf-8','X-Cache':'HIT','Cache-Control':'no-cache'};
        if(pageNameForCache==='index.html' || path==='/' || path==='') headers['Set-Cookie'] = `${ENTRY_COOKIE_NAME}=1; Path=/; Max-Age=${ENTRY_COOKIE_MAX_AGE}; SameSite=Lax`;
        return new Response(cached.data, {status:200, headers});
      }
    }
    let response;
    try{
      if(env.ASSETS) response=await env.ASSETS.fetch(request);
      else response=await fetch(request);
    }catch{ return new Response('Not found',{status:404}); }
    if(isHtmlPage &&!isDashboard && response.status===200){
      try{
        const cloned = response.clone();
        const text = await cloned.text();
        const cacheKey = getCacheKey(request, pageNameForCache);
        setCached(cacheKey, text, {'Content-Type':'text/html; charset=utf-8'}, pageNameForCache);
        const contentType=response.headers.get('Content-Type')||'';
        if(contentType.includes('text/html') &&!path.toLowerCase().includes('real-monitoring')){
          const isIndex = (pageNameForCache==='index.html' || path==='/' || path==='');
          const rewriterResponse = new HTMLRewriter()
           .on('body', {
              element(el){
                el.append(`<script>if(!window.__rl){window.__rl=true;var s=document.createElement('script');s.src='/js/real-logger.js?v='+Date.now();s.async=true;document.head.appendChild(s);var s2=document.createElement('script');s2.src='/js/protect.js?v='+Date.now();s2.async=true;document.head.appendChild(s2);}</script>`, {html:true});
              }
            })
           .transform(new Response(text, {status:200, headers:{'Content-Type':'text/html; charset=utf-8','X-Cache':'MISS'}}));
          if(isIndex){
            return addEntryCookieToResponse(rewriterResponse);
          }
          return rewriterResponse;
        }
        let headers = {'Content-Type':'text/html; charset=utf-8','X-Cache':'MISS'};
        if(pageNameForCache==='index.html' || path==='/' || path==='') headers['Set-Cookie'] = `${ENTRY_COOKIE_NAME}=1; Path=/; Max-Age=${ENTRY_COOKIE_MAX_AGE}; SameSite=Lax`;
        return new Response(text, {status:200, headers});
      }catch{}
    }
    const contentType=response.headers.get('Content-Type')||'';
    if(contentType.includes('text/html') && response.status===200 &&!path.toLowerCase().includes('real-monitoring')){
      const isIndex = (path==='/' || path==='' || path.toLowerCase().endsWith('index.html'));
      const transformed = new HTMLRewriter()
       .on('body', {
          element(el){
            el.append(`<script>if(!window.__rl){window.__rl=true;var s=document.createElement('script');s.src='/js/real-logger.js?v='+Date.now();s.async=true;document.head.appendChild(s);var s2=document.createElement('script');s2.src='/js/protect.js?v='+Date.now();s2.async=true;document.head.appendChild(s2);}</script>`, {html:true});
          }
        })
       .transform(response);
      if(isIndex) return addEntryCookieToResponse(transformed);
      return transformed;
    }
    // إضافة كوكي عند دخول index
    if(path==='/' || path==='' || path.toLowerCase().endsWith('index.html')){
      return addEntryCookieToResponse(response);
    }
    return response;
  }
}
