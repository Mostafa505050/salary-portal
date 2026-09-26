/**
 * _worker-final-router.js - حل مشكلة {"error":"Not found"} 
 * هذا الـ Worker يخدم الصفحات الثابتة + API في نفس الدومين
 * 
 * السبب: كنت تطلب /Index-Secure-Professional بدون .html والـ Worker القديم يرجع Not found لأي مسار ليس /api/
 * الحل: هذا Worker يفحص المسار، لو /api/ يعالج API، وإلا يحاول جلب الملف الثابت مع دعم Clean URLs
 */

const SECURITY_CONFIG = {
  HSTS_HEADER: "max-age=31536000; includeSubDomains; preload",
  ALLOWED_ORIGINS: [
    "https://salary-portal.mostafa-voic77729.workers.dev",
    "https://mostafa-voic77729.workers.dev",
  ],
  RATE_LIMIT_MAX: 20,
  RATE_LIMIT_WINDOW_MS: 60 * 1000,
  NATIONAL_ID_REGEX: /^\d{14}$/,
  CODE_REGEX: /^[A-Za-z0-9_\-]{2,30}$/,
  TOKEN_BYTES: 32,
};

const rateLimitStore = new Map();
function checkRateLimit(ip, endpoint){
  const key = `${ip}:${endpoint}`;
  const now = Date.now();
  let rec = rateLimitStore.get(key);
  if(!rec || now - rec.start > SECURITY_CONFIG.RATE_LIMIT_WINDOW_MS){
    rec = {count:1, start:now};
    rateLimitStore.set(key, rec);
    return true;
  }
  rec.count++;
  if(rec.count > SECURITY_CONFIG.RATE_LIMIT_MAX) return false;
  return true;
}
function getClientIp(req){ return req.headers.get('CF-Connecting-IP') || 'unknown'; }
function getCorsHeaders(req){
  const origin = req.headers.get('Origin') || '';
  const allowed = SECURITY_CONFIG.ALLOWED_ORIGINS.includes(origin) ? origin : SECURITY_CONFIG.ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}
function getSecurityHeaders(){
  return {
    'Strict-Transport-Security': SECURITY_CONFIG.HSTS_HEADER,
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
    'Cache-Control': 'no-store, no-cache'
  };
}
function jsonResponse(data, status=200, req){
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...getCorsHeaders(req),
      ...getSecurityHeaders(),
    }
  });
}
function isValidNationalId(id){ return SECURITY_CONFIG.NATIONAL_ID_REGEX.test(String(id||'').trim()); }
function isValidCode(code){ return SECURITY_CONFIG.CODE_REGEX.test(String(code||'').trim()); }
function generateSecureToken(){
  const arr = new Uint8Array(SECURITY_CONFIG.TOKEN_BYTES);
  crypto.getRandomValues(arr);
  let bin=''; for(let i=0;i<arr.length;i++) bin+=String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
async function hashPattern(patternValue, nationalId){
  const clean = String(patternValue).replace(/[^0-9,]/g,'').substring(0,50);
  const salt = String(nationalId).trim();
  const data = new TextEncoder().encode(clean + '|' + salt + '|pepper_v4');
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function constantTimeCompare(a,b){
  if(!a || !b) return false;
  const sa = String(a); const sb = String(b);
  if(sa.length !== sb.length) return false;
  let result = 0;
  for(let i=0;i<sa.length;i++) result |= sa.charCodeAt(i) ^ sb.charCodeAt(i);
  return result === 0;
}
function sanitizeUserRow(row){
  if(!row || typeof row !== 'object') return null;
  const copy = {...row};
  delete copy['كلمة_المرور']; delete copy['كلمه_المرور']; delete copy['password'];
  if(copy['__proto__'] || copy['constructor']) return null;
  return copy;
}
async function tursoQuery(env, sql, params=[]){
  const url = env.TURSO_URL;
  const token = env.TURSO_TOKEN;
  if(!url || !token) throw new Error('TURSO env missing');
  const res = await fetch(url, {
    method:'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({sql, params, args: params})
  });
  if(!res.ok){ const txt = await res.text(); throw new Error(`Turso ${res.status}: ${txt.substring(0,200)}`); }
  return await res.json();
}

export default {
  async fetch(req, env, ctx){
    const url = new URL(req.url);
    const path = url.pathname;
    const ip = getClientIp(req);

    // 1. HTTP -> HTTPS Redirect
    if(url.protocol === 'http:'){
      return Response.redirect(url.toString().replace('http://','https://'), 301);
    }

    // 2. CORS Preflight
    if(req.method === 'OPTIONS'){
      return new Response(null, {status:204, headers:{...getCorsHeaders(req), ...getSecurityHeaders()}});
    }

    // ==================== API ROUTES ====================
    if(path.startsWith('/api/')){
      
      // /api/check-by-card-secure
      if(path === '/api/check-by-card-secure' && req.method === 'POST'){
        if(!checkRateLimit(ip, 'check-by-card')) return jsonResponse({ok:false, msg:'محظور مؤقتا'}, 429, req);
        try{
          const body = await req.json();
          const cardNumber = String(body.cardNumber||'').trim();
          if(!isValidNationalId(cardNumber)) return jsonResponse({ok:false, msg:'رقم البطاقة 14 رقم فقط'}, 400, req);
          const sql = `SELECT * FROM "المستخدمين" WHERE "الرقم_القومى" = ? LIMIT 1`;
          const q = await tursoQuery(env, sql, [cardNumber]);
          const row = q.results?.[0] || q.rows?.[0];
          if(!row) return jsonResponse({ok:false, msg:'الرقم غير موجود'}, 404, req);
          const user = sanitizeUserRow(row);
          return jsonResponse({ok:true, user}, 200, req);
        }catch(e){ return jsonResponse({ok:false, msg:'خطأ خادم'}, 500, req); }
      }

      // /api/get-routing-secure
      if(path === '/api/get-routing-secure' && req.method === 'GET'){
        try{
          const nationalId = url.searchParams.get('nationalId')||'';
          const code = url.searchParams.get('code')||'';
          if(!isValidNationalId(nationalId) && !isValidCode(code)) return jsonResponse({found:false}, 400, req);
          const sql = `SELECT * FROM "توجيه_المستخدمين" WHERE "الرقم_القومى" = ? AND "الكود_البنكى" = ? AND "مفعلة" = 1 LIMIT 1`;
          const q = await tursoQuery(env, sql, [nationalId, code]);
          const row = q.results?.[0] || q.rows?.[0];
          if(!row) return jsonResponse({found:false}, 200, req);
          if(row["تاريخ_الانتهاء"]){ const end = new Date(row["تاريخ_الانتهاء"]); if(new Date() > end) return jsonResponse({found:false, expired:true}, 200, req); }
          return jsonResponse({found:true, routing: row}, 200, req);
        }catch(e){ return jsonResponse({found:false}, 500, req); }
      }

      // /api/verify-password-secure
      if(path === '/api/verify-password-secure' && req.method === 'POST'){
        if(!checkRateLimit(ip, 'verify-pass')) return jsonResponse({ok:false, msg:'محظور'}, 429, req);
        try{
          const {cardNumber, password} = await req.json();
          if(!isValidNationalId(cardNumber)) return jsonResponse({ok:false, msg:'بيانات غير صالحة'}, 400, req);
          const sql = `SELECT * FROM "المستخدمين" WHERE "الرقم_القومى" = ? LIMIT 1`;
          const q = await tursoQuery(env, sql, [cardNumber]);
          const row = q.results?.[0] || q.rows?.[0];
          if(!row) return jsonResponse({ok:false, msg:'بيانات غير صحيحة'}, 401, req);
          const storedPass = row['كلمة_المرور'] || row['password'] || '';
          if(!constantTimeCompare(String(storedPass), String(password))) return jsonResponse({ok:false, msg:'بيانات غير صحيحة'}, 401, req);
          const token = generateSecureToken();
          return jsonResponse({ok:true, token, role: row['الصلاحيات']||'User'}, 200, req);
        }catch(e){ return jsonResponse({ok:false, msg:'خطأ'}, 500, req); }
      }

      // /api/register-by-card-secure
      if(path === '/api/register-by-card-secure' && req.method === 'POST'){
        try{
          const {cardNumber, bio, password} = await req.json();
          if(!isValidNationalId(cardNumber)) return jsonResponse({ok:false, msg:'رقم بطاقة غير صالح'}, 400, req);
          const checkSql = `SELECT "بصمة" FROM "المستخدمين" WHERE "الرقم_القومى" = ? LIMIT 1`;
          const checkQ = await tursoQuery(env, checkSql, [cardNumber]);
          const existing = checkQ.results?.[0] || checkQ.rows?.[0];
          const existingBio = existing?.['بصمة'];
          if(existingBio && String(existingBio).trim() !== '' && String(existingBio).toLowerCase() !== 'null'){
            return jsonResponse({ok:false, msg:'البصمة مسجلة مسبقا'}, 400, req);
          }
          let bioToStore = bio;
          try{
            const bioObj = JSON.parse(bio);
            if(bioObj.type === 'pattern' && bioObj.value){
              const hashed = await hashPattern(bioObj.value, cardNumber);
              bioObj.value = undefined; bioObj.hash = hashed; bioObj.hashed = true;
              bioToStore = JSON.stringify(bioObj);
            }
          }catch{}
          const updateSql = `UPDATE "المستخدمين" SET "بصمة" = ?, "كلمة_المرور" = ? WHERE "الرقم_القومى" = ?`;
          await tursoQuery(env, updateSql, [bioToStore, String(password||''), cardNumber]);
          return jsonResponse({ok:true}, 200, req);
        }catch(e){ return jsonResponse({ok:false, msg:e.message}, 500, req); }
      }

      // /api/bio-login-by-card-secure
      if(path === '/api/bio-login-by-card-secure' && req.method === 'POST'){
        try{
          const {cardNumber, bioAttempt} = await req.json();
          if(!isValidNationalId(cardNumber)) return jsonResponse({ok:false, msg:'بيانات غير صالحة'}, 400, req);
          const sql = `SELECT * FROM "المستخدمين" WHERE "الرقم_القومى" = ? LIMIT 1`;
          const q = await tursoQuery(env, sql, [cardNumber]);
          const row = q.results?.[0] || q.rows?.[0];
          if(!row) return jsonResponse({ok:false, msg:'غير موجود'}, 404, req);
          const storedBioStr = row['بصمة'] || '';
          const storedBio = JSON.parse(storedBioStr);
          if(storedBio.type === 'pattern'){
            if(!bioAttempt) return jsonResponse({ok:false, msg:'أدخل النقش'}, 400, req);
            const attemptHash = await hashPattern(bioAttempt, cardNumber);
            let ok = false;
            if(storedBio.hash) ok = constantTimeCompare(attemptHash, storedBio.hash);
            else if(storedBio.value) ok = constantTimeCompare(String(bioAttempt).trim(), String(storedBio.value).trim());
            if(!ok) return jsonResponse({ok:false, msg:'النقش غير مطابق'}, 401, req);
          }
          const token = generateSecureToken();
          return jsonResponse({ok:true, token, role: row['الصلاحيات']||'User'}, 200, req);
        }catch(e){ return jsonResponse({ok:false, msg:e.message}, 500, req); }
      }

      // /api/salary-turso
      if(path === '/api/salary-turso' && req.method === 'GET'){
        try{
          const year = url.searchParams.get('year')||'';
          const month = url.searchParams.get('month')||'';
          const code = url.searchParams.get('code')||'';
          if(!/^\d{4}$/.test(year)) return jsonResponse({found:false, error:'سنة غير صالحة'}, 400, req);
          const allowedMonths = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
          if(!allowedMonths.includes(month)) return jsonResponse({found:false, error:'شهر غير صالح'}, 400, req);
          if(!isValidCode(code)) return jsonResponse({found:false, error:'كود غير صالح'}, 400, req);
          const TABLE_NAME = 'مرتبات_شهرية';
          const sql = `SELECT * FROM "${TABLE_NAME}" WHERE "السنه" = ? AND "الشهر" = ? AND ("الكود_البنكي" = ? OR "الكود_البنكى" = ? OR "emptid" = ?) LIMIT 1`;
          const q = await tursoQuery(env, sql, [year, month, code, code, code]);
          const row = q.results?.[0] || q.rows?.[0];
          if(!row) return jsonResponse({found:false}, 200, req);
          return jsonResponse({found:true, data: row}, 200, req);
        }catch(e){ return jsonResponse({found:false, error:e.message}, 500, req); }
      }

      // أي /api غير معروف
      return jsonResponse({error:"Not found - API endpoint not found"}, 404, req);
    }

    // ==================== STATIC ASSETS ROUTING - حل مشكلة Not found ====================
    // هذا الجزء هو الذي يحل مشكلتك في الصورة
    try{
      // لو env.ASSETS موجود (Workers with Assets), استخدمه
      if(env.ASSETS){
        // دعم Clean URLs: /Index-Secure-Professional -> /Index-Secure-Professional.html
        let assetPath = path;
        // إزالة الـ slash في النهاية
        if(assetPath.endsWith('/') && assetPath.length > 1) assetPath = assetPath.slice(0,-1);
        
        // لو المسار بدون امتداد، جرب .html
        const hasExt = assetPath.includes('.') && assetPath.lastIndexOf('.') > assetPath.lastIndexOf('/');
        let requestsToTry = [req];
        
        if(!hasExt && assetPath !== '/'){
          // جرب 3 احتمالات: المسار نفسه, + .html, + /index.html
          const url1 = new URL(req.url); url1.pathname = assetPath + '.html';
          const url2 = new URL(req.url); url2.pathname = assetPath + '/index.html';
          const url3 = new URL(req.url); url3.pathname = '/index.html';
          requestsToTry = [new Request(url1, req), new Request(url2, req), new Request(url3, req), req];
        } else if(assetPath === '/' || assetPath === ''){
          const urlIdx = new URL(req.url); urlIdx.pathname = '/index.html';
          requestsToTry = [new Request(urlIdx, req), req];
        }

        for(const r of requestsToTry){
          try{
            const assetRes = await env.ASSETS.fetch(r);
            // لو وجد الملف (ليس 404)
            if(assetRes.status !== 404){
              // أضف headers الأمان للصفحات الثابتة أيضا
              const newHeaders = new Headers(assetRes.headers);
              Object.entries(getSecurityHeaders()).forEach(([k,v])=>{
                // لا تطبق CSP JSON على HTML
                if(k === 'Content-Security-Policy') return;
                newHeaders.set(k, v);
              });
              // CSP للصفحات HTML - يسمح Tailwind و Google Fonts
              if((newHeaders.get('content-type')||'').includes('text/html')){
                newHeaders.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com; font-src https://fonts.gstatic.com; connect-src 'self' https://salary-portal.mostafa-voic77729.workers.dev; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'");
                newHeaders.set('Strict-Transport-Security', SECURITY_CONFIG.HSTS_HEADER);
                newHeaders.set('X-Frame-Options', 'DENY');
              }
              return new Response(assetRes.body, {status: assetRes.status, headers: newHeaders});
            }
          }catch(e){ /* جرب التالي */ }
        }
      }
    }catch(e){
      console.error('Assets fetch error', e);
    }

    // لو وصلنا هنا ولم نجد الملف، ارجع صفحة 404 جميلة بدل JSON
    if(path.includes('.') || path.startsWith('/api/')){
      return jsonResponse({error:"Not found"}, 404, req);
    } else {
      // لصفحات HTML ارجع HTML 404
      return new Response(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>غير موجود</title></head><body style="font-family:Cairo;background:#020a05;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center"><div><h1>404 - الصفحة غير موجودة</h1><p>المسار ${path} غير موجود</p><p style="font-size:12px;color:#aaa">جرب: /index.html أو /Index-Secure-Professional.html</p><a href="/index.html" style="color:#10b981">العودة للرئيسية</a></div></body></html>`, {
        status:404,
        headers:{'Content-Type':'text/html; charset=utf-8', ...getSecurityHeaders()}
      });
    }
  }
}
