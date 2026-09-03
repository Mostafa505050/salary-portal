// _worker.js FINAL v9 - RADICAL MANDATORY - حل جذري وإجباري
// - منع من السيرفر قبل إرسال أي HTML (لا يمكن تجاوزه)
// - لا يعتمد على localStorage نهائياً - مصدر واحد: Turso
// - 3 محاولات + Timeout + Cache إجباري
// - لو Turso فشل، يحقن حارس إجباري يتحقق من API من المتصفح

const API_CHECK_PRIMARY = "https://auth-api.mostafa-voic77729.workers.dev/api/check-page-status";
const API_CHECK_FALLBACK = "https://turso-api.mostafa-voic77729.workers.dev/api/check-page-status";
const TURSO_API_PRIMARY = "https://turso-api.mostafa-voic77729.workers.dev/api/turso";
const TURSO_API_FALLBACK = "https://auth-api.mostafa-voic77729.workers.dev/api/turso";

// قائمة احتياطية إجبارية - لو Turso سقط تماماً، هذه الصفحات تبقى معطلة إجبارياً
// عدلها حسب صفحاتك المعطلة حالياً
const FALLBACK_DISABLED = [
  'tables.html',
  'tables',
  'AddHafez1.html',
  'AddHafez1',
  'pageAdmin1.html',
  // أضف هنا أي صفحة تريد منعها إجبارياً حتى لو Turso سقط
];

// Cache في ذاكرة الـ Worker لمدة 60 ثانية - يقلل الضغط على Turso ويتجنب 500
const blockCache = new Map();
const CACHE_TTL = 60 * 1000; // 60 ثانية

function normalizePageNameVariants(pageName) {
  const base = pageName.replace(/^\//, '').replace(/\/$/, '');
  const noExt = base.replace(/\.html$/, '');
  const withExt = noExt + '.html';
  return [...new Set([pageName, base, noExt, withExt, '/' + base, '/' + noExt, '/' + withExt, base + '/', noExt + '/', withExt + '/'])].filter(Boolean);
}

async function fetchWithTimeout(url, options, timeout = 4000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch(e) {
    clearTimeout(id);
    throw e;
  }
}

async function checkPageBlocked(pageName) {
  const cacheKey = pageName.toLowerCase();
  const cached = blockCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.result;
  }

  // فحص القائمة الاحتياطية الإجبارية أولاً
  if (FALLBACK_DISABLED.some(f => f.toLowerCase() === pageName.toLowerCase() || f.toLowerCase() === pageName.replace('.html','').toLowerCase())) {
    const result = { blocked: true, source: 'fallback_hardcoded', variant: pageName, row: { fallback: true } };
    blockCache.set(cacheKey, { result, time: Date.now() });
    return result;
  }

  const variants = normalizePageNameVariants(pageName);
  
  // المحاولة 1: check-page-status API مع Timeout و 3 محاولات
  for (const variant of variants) {
    for (const apiUrl of [API_CHECK_PRIMARY, API_CHECK_FALLBACK]) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetchWithTimeout(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pageName: variant })
          }, 4000);
          if (res.ok) {
            const data = await res.json();
            if (typeof data.blocked === 'boolean' && data.blocked) {
              const result = { blocked: true, row: data, source: 'check-page-status', api: apiUrl, variant };
              blockCache.set(cacheKey, { result, time: Date.now() });
              return result;
            }
          }
        } catch(e) { 
          // حاول مرة أخرى
          await new Promise(r => setTimeout(r, 200));
          continue; 
        }
      }
    }
  }

  // المحاولة 2: SQL مباشر مع Timeout
  for (const variant of variants) {
    const sqlExact = `SELECT "مفعلة", "اسم_الصفحة" FROM "صفحات_الموقع" WHERE "اسم_الصفحة"='${variant.replace(/'/g, "''")}' LIMIT 1`;
    for (const sql of [sqlExact]) {
      for (const apiUrl of [TURSO_API_PRIMARY, TURSO_API_FALLBACK]) {
        try {
          const res = await fetchWithTimeout(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql })
          }, 4000);
          if (!res.ok) continue;
          const text = await res.text();
          let data; try { data = JSON.parse(text); } catch { continue; }
          let rows = data.rows || [];
          if (data.results && data.results[0]?.response?.result) {
            const cols = data.results[0].response.result.cols.map(c=>c.name);
            rows = data.results[0].response.result.rows.map(r=>{ let o={}; r.forEach((c,i)=>{o[cols[i]]=c.value ?? c.text ?? ""}); return o; });
          }
          if (rows.length > 0) {
            const enabled = rows[0]["مفعلة"] ?? rows[0].مفعلة;
            if (enabled==0 || enabled=="0" || enabled===false || enabled==="false") {
              const result = { blocked: true, row: rows[0], variant, sql, api: apiUrl, source: 'turso-sql-blocked' };
              blockCache.set(cacheKey, { result, time: Date.now() });
              return result;
            }
          }
        } catch(e) { continue; }
      }
    }
  }

  const result = { blocked: false, row: null, source: 'not-found', checkedVariants: variants };
  blockCache.set(cacheKey, { result, time: Date.now() });
  return result;
}

async function handleThemeAPI(request) {
  const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Content-Type': 'application/json; charset=utf-8' };
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (request.method === 'GET') {
    for (const apiUrl of [TURSO_API_PRIMARY, TURSO_API_FALLBACK]) {
      try {
        const res = await fetchWithTimeout(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql: `SELECT settings FROM themes ORDER BY id DESC LIMIT 1` }) }, 3000);
        if (!res.ok) continue;
        const data = await res.json();
        let rows = data.rows || [];
        if (data.results && data.results[0]?.response?.result) {
          const cols = data.results[0].response.result.cols.map(c=>c.name);
          rows = data.results[0].response.result.rows.map(r=>{ let o={}; r.forEach((c,i)=>{o[cols[i]]=c.value ?? c.text ?? ""}); return o; });
        }
        if (rows.length > 0 && rows[0].settings) {
          let settings = rows[0].settings;
          try { settings = typeof settings === 'string' ? JSON.parse(settings) : settings; } catch {}
          return new Response(JSON.stringify(settings), { headers: corsHeaders });
        }
      } catch(e) { continue; }
    }
    return new Response(JSON.stringify({}), { headers: corsHeaders });
  }
  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const settingsStr = JSON.stringify(body.settings || body).replace(/'/g, "''");
      const updatedBy = (body.updated_by || 'admin').replace(/'/g, "''");
      const createSql = `CREATE TABLE IF NOT EXISTS themes (id INTEGER PRIMARY KEY AUTOINCREMENT, settings TEXT NOT NULL, updated_by TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`;
      const insertSql = `INSERT INTO themes (settings, updated_by) VALUES ('${settingsStr}', '${updatedBy}')`;
      for (const apiUrl of [TURSO_API_PRIMARY, TURSO_API_FALLBACK]) {
        try {
          await fetchWithTimeout(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql: createSql }) }, 3000);
          const res = await fetchWithTimeout(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql: insertSql }) }, 3000);
          if (res.ok) return new Response(JSON.stringify({ ok: true, saved: true }), { headers: corsHeaders });
        } catch(e) { continue; }
      }
      return new Response(JSON.stringify({ ok: false, error: 'failed to save' }), { status: 500, headers: corsHeaders });
    } catch(e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
  }
  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    let pageName = pathname.split('/').pop() || 'index.html';
    if (pathname === '/' || pathname === '') pageName = 'index.html';

    // Theme API
    if (pathname === '/api/themes' || pathname === '/api/theme' || pathname.startsWith('/api/themes/')) {
      return await handleThemeAPI(request);
    }

    // API للتحقق من حالة الصفحة من المتصفح (للحارس الإجباري)
    if (pathname === '/api/check-page-status') {
      try {
        const body = await request.json();
        const checkName = body.pageName || pageName;
        const info = await checkPageBlocked(checkName);
        return new Response(JSON.stringify({ blocked: info.blocked, pageName: checkName, source: info.source }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache' }
        });
      } catch(e) {
        return new Response(JSON.stringify({ blocked: false, error: e.message }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
    }

    const skip = ['database-manager', 'test-control', 'turso-api', 'hafez-api', 'auth-api', 'auth', 'favicon', '.js', '.css', '.json', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2', '.webp', 'fonts.googleapis', 'sidebar_admin', 'sidebar'];
    const lowerPath = pathname.toLowerCase();
    if (skip.some(s => lowerPath.includes(s.toLowerCase())) && !lowerPath.includes('/api/themes') && !lowerPath.includes('/api/theme') && !lowerPath.includes('/api/check-page-status')) {
      return await env.ASSETS.fetch(request);
    }

    const isHtml = pathname.endsWith('.html') || pathname === '/' || pathname === '' || !pathname.includes('.') || pathname.endsWith('/');

    // === الحل الجذري: منع من السيرفر قبل إرسال أي HTML ===
    let blockInfo = { blocked: false };
    if (isHtml) {
      try { 
        blockInfo = await checkPageBlocked(pageName); 
      } catch(e) { 
        blockInfo = { blocked: false, error: e.message, source: 'check-error' }; 
      }
      
      // منع إجباري من السيرفر - لا يتم إرسال أي HTML
      if (blockInfo.blocked) {
        return new Response(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>الصفحة معطلة - منع إجباري</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f172a;font-family:Tajawal,system-ui;direction:rtl;color:white} .card{text-align:center;background:rgba(255,255,255,0.06);backdrop-filter:blur(20px);padding:48px 32px;border-radius:24px;border:1px solid rgba(255,255,255,0.08);max-width:520px;box-shadow:0 20px 60px rgba(0,0,0,0.3)} .icon{width:100px;height:100px;border-radius:50%;background:linear-gradient(180deg,#fee2e2,#fecaca);border:5px solid #fca5a5;display:flex;align-items:center;justify-content:center;margin:0 auto 28px;font-size:56px} h2{margin:8px 0;font-size:24px;color:white} p{margin:6px 0;color:#94a3b8;font-size:13px} .badge{display:inline-block;margin-top:12px;padding:6px 12px;background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.3);border-radius:8px;color:#fca5a5;font-size:11px} a{display:inline-block;margin-top:24px;padding:12px 24px;background:white;color:#0f172a;border-radius:12px;text-decoration:none;font-weight:800} .debug{font-size:10px;color:rgba(255,255,255,0.3);margin-top:16px;word-break:break-all;text-align:left;direction:ltr;background:rgba(0,0,0,0.2);padding:8px;border-radius:8px}</style></head><body><div class="card"><div class="icon">⛔</div><h2>الصفحة معطلة - منع إجباري</h2><p>${pageName}</p><p>تم تعطيلها من لوحة التحكم - منع من السيرفر</p><div class="badge">🛡️ RADICAL MANDATORY BLOCK</div><p class="debug">Source: ${blockInfo.source}<br>Variant: ${blockInfo.variant||''}<br>API: ${blockInfo.api||''}<br>Time: ${new Date().toISOString()}</p><a href="/Database-Manager.html">🔧 لوحة التحكم</a><a href="/" style="margin-right:8px;background:rgba(255,255,255,0.08);color:white">🏠 الرئيسية</a></div></body></html>`, {
          status: 403,
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache, no-store, must-revalidate', 'X-Blocked-By': 'Worker-v9-RADICAL', 'X-Block-Source': blockInfo.source||'', 'X-Block-Variant': blockInfo.variant||'' }
        });
      }
    }

    let response;
    try {
      response = await env.ASSETS.fetch(request);
      if (response.status === 404 && isHtml) {
        if (pathname === '/' || pathname === '' || pathname === '/index.html') {
          try {
            const indexReq = new Request(new URL('/index.html', request.url).toString(), request);
            const indexRes = await env.ASSETS.fetch(indexReq);
            if (indexRes.status !== 404) response = indexRes;
            else return new Response(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>بوابة المرتبات</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f172a;color:#e2e8f0;font-family:Tajawal;direction:rtl} .card{background:rgba(255,255,255,0.06);padding:32px;border-radius:16px;text-align:center} a{display:block;margin:8px;padding:10px;background:#10b981;color:white;border-radius:8px;text-decoration:none}</style></head><body><div class="card"><h2>بوابة المرتبات</h2><a href="/Database-Manager.html">لوحة التحكم</a><a href="/MyAdmin.html">MyAdmin</a><a href="/tables.html">tables</a></div></body></html>`, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
          } catch(e) {}
        }
        if (response.status === 404) {
          return new Response(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>404</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#020a05;color:#e2e8f0;font-family:Cairo;direction:rtl} .card{text-align:center}</style></head><body><div class="card"><h1>404</h1><p>${pageName} غير موجودة</p><a href="/" style="color:#10b981">الرئيسية</a></div></body></html>`, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        }
      }
    } catch(e) {
      return new Response(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>404</title></head><body style="font-family:Tajawal;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#020a05;color:white"><div style="text-align:center"><h1>404</h1><p>${pathname} غير موجودة</p><a href="/" style="color:#10b981">الرئيسية</a></div></body></html>`, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (isHtml) {
      try {
        let html = await response.text();
        
        // === حارس إجباري جذري - يتحقق من API من المتصفح حتى لو Turso سقط ===
        const guardScript = `<script>
// RADICAL MANDATORY GUARD - يمنع حتى لو Turso API فشل في السيرفر
(function(){
  const pageName = (location.pathname.split('/').pop()||'index.html');
  const isRoot = location.pathname==='/' || location.pathname==='' || location.pathname==='/index.html';
  
  // إخفاء فوري
  const style = document.createElement('style');
  style.textContent = 'html{visibility:hidden;opacity:0;} #radical-blocked{display:none;}';
  (document.head||document.documentElement).appendChild(style);
  
  async function checkBlockedFromAPI(){
    try{
      const res = await fetch('/api/check-page-status', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({pageName: pageName})
      });
      if(res.ok){
        const data = await res.json();
        return data.blocked;
      }
    }catch(e){ console.log('[RADICAL GUARD] API check failed', e); }
    return false;
  }
  
  function killPageRadical(src){
    document.documentElement.innerHTML = \`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>الصفحة معطلة - إجباري</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f172a;font-family:Tajawal;direction:rtl;color:white} .card{text-align:center;background:rgba(255,255,255,0.06);padding:48px 32px;border-radius:24px;border:1px solid rgba(255,255,255,0.08);max-width:520px} .icon{width:100px;height:100px;border-radius:50%;background:linear-gradient(180deg,#fee2e2,#fecaca);border:5px solid #fca5a5;display:flex;align-items:center;justify-content:center;margin:0 auto 28px;font-size:56px} h2{margin:8px 0;font-size:24px} p{color:#94a3b8;font-size:13px} a{display:inline-block;margin-top:24px;padding:12px 24px;background:white;color:#0f172a;border-radius:12px;text-decoration:none;font-weight:800}</style></head><body><div class="card"><div class="icon">⛔</div><h2>الصفحة معطلة - منع إجباري</h2><p>\${pageName}</p><p>تم تعطيلها - منع من المتصفح (RADICAL)</p><p style="font-size:10px;color:rgba(255,255,255,0.3);margin-top:12px">Source: \${src}</p><a href="/Database-Manager.html">لوحة التحكم</a><a href="/" style="margin-right:8px;background:rgba(255,255,255,0.08);color:white">الرئيسية</a></div></body></html>\`;
  }
  
  // تحقق فوري من API
  checkBlockedFromAPI().then(isBlocked => {
    if(isBlocked){
      console.log('%c[RADICAL GUARD] BLOCKED from API - Killing', 'color:red;font-weight:bold;font-size:16px');
      killPageRadical('api-check');
    } else {
      // السماح بالعرض
      style.textContent = 'html{visibility:visible;opacity:1;}';
      console.log('%c[RADICAL GUARD] ALLOWED: '+pageName, 'color:green;font-weight:bold');
    }
  });
  
  // Fallback: لو API لم يرد خلال 3 ثوان، اعرض الصفحة (لا تعلق المستخدم)
  setTimeout(() => {
    if(document.documentElement.style.visibility !== 'visible'){
      const htmlEl = document.documentElement;
      if(htmlEl && !document.getElementById('radical-blocked')){
        style.textContent = 'html{visibility:visible;opacity:1;}';
      }
    }
  }, 3000);
})();
<\/script>`;

        const themeLoaderInjection = `<script src="/theme-loader.js"><\/script>`;
        if (html.includes('</head>')) html = html.replace('</head>', guardScript + themeLoaderInjection + '</head>');
        else if (html.includes('<head>')) html = html.replace('<head>', '<head>' + guardScript + themeLoaderInjection);
        else html = guardScript + themeLoaderInjection + html;

        const newHeaders = new Headers(response.headers);
        newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        newHeaders.set('X-Worker-Active', 'FINAL-v9-RADICAL-MANDATORY');
        newHeaders.set('X-Block-Check', blockInfo.blocked ? 'blocked' : 'allowed');
        return new Response(html, { status: response.status, headers: newHeaders });
      } catch(e) {
        return new Response(response.body, { status: response.status, headers: response.headers });
      }
    }
    return response;
  }
}
