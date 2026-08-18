// _worker.js FINAL v6 + Theme Global - 404 Fix + Global Theme API - لا يتم حذف أي دالة
const API_CHECK_PRIMARY = "https://auth-api.mostafa-voic77729.workers.dev/api/check-page-status";
const API_CHECK_FALLBACK = "https://turso-api.mostafa-voic77729.workers.dev/api/check-page-status";
const TURSO_API_PRIMARY = "https://turso-api.mostafa-voic77729.workers.dev/api/turso";
const TURSO_API_FALLBACK = "https://auth-api.mostafa-voic77729.workers.dev/api/turso";

function normalizePageNameVariants(pageName) {
  // يولد كل الاحتمالات: pageAdmin1, pageAdmin1.html, /pageAdmin1.html, pageAdmin1.html/, etc
  const base = pageName.replace(/^\//, '').replace(/\/$/, '');
  const noExt = base.replace(/\.html$/, '');
  const withExt = noExt + '.html';
  return [...new Set([
    pageName,
    base,
    noExt,
    withExt,
    '/' + base,
    '/' + noExt,
    '/' + withExt,
    base + '/',
    noExt + '/',
    withExt + '/'
  ])].filter(Boolean);
}

async function checkPageBlocked(pageName) {
  const variants = normalizePageNameVariants(pageName);
  
  // المحاولة 1: check-page-status endpoint مع كل variant
  for (const variant of variants) {
    for (const apiUrl of [API_CHECK_PRIMARY, API_CHECK_FALLBACK]) {
      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageName: variant })
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.blocked === 'boolean') {
            if (data.blocked) {
              return { blocked: true, row: data, source: 'check-page-status', api: apiUrl, variant, enabled: data.enabled };
            }
          }
        }
      } catch(e) { continue; }
    }
  }

  // المحاولة 2: SQL مباشر مع LIKE لكل variant
  for (const variant of variants) {
    const sqlExact = `SELECT "مفعلة", "اسم_الصفحة" FROM "صفحات_الموقع" WHERE "اسم_الصفحة"='${variant.replace(/'/g, "''")}' LIMIT 1`;
    const sqlLike = `SELECT "مفعلة", "اسم_الصفحة" FROM "صفحات_الموقع" WHERE "اسم_الصفحة" LIKE '%${variant.replace(/'/g, "''")}%' LIMIT 1`;
    
    for (const sql of [sqlExact, sqlLike]) {
      for (const apiUrl of [TURSO_API_PRIMARY, TURSO_API_FALLBACK]) {
        try {
          const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql })
          });
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
            const isBlocked = enabled==0 || enabled=="0" || enabled===false || enabled==="false";
            if (isBlocked) {
              return { blocked: true, row: rows[0], variant, sql, api: apiUrl, source: 'turso-sql-blocked' };
            }
          }
        } catch(e) { continue; }
      }
    }
  }

  // المحاولة 3: ابحث عن أي صف معطل يحتوي على noExt
  const noExt = pageName.replace(/\.html$/, '').replace(/^\//, '').replace(/\/$/, '');
  if (noExt) {
    const sqlAny = `SELECT "مفعلة", "اسم_الصفحة" FROM "صفحات_الموقع" WHERE "اسم_الصفحة" LIKE '%${noExt.replace(/'/g, "''")}%' LIMIT 5`;
    for (const apiUrl of [TURSO_API_PRIMARY, TURSO_API_FALLBACK]) {
      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: sqlAny })
        });
        if (!res.ok) continue;
        const data = await res.json();
        let rows = data.rows || [];
        if (data.results && data.results[0]?.response?.result) {
          const cols = data.results[0].response.result.cols.map(c=>c.name);
          rows = data.results[0].response.result.rows.map(r=>{ let o={}; r.forEach((c,i)=>{o[cols[i]]=c.value ?? c.text ?? ""}); return o; });
        }
        for (const r of rows) {
          const enabled = r["مفعلة"] ?? r.مفعلة;
          if (enabled==0 || enabled=="0" || enabled===false || enabled==="false") {
            return { blocked: true, row: r, variant: noExt, sql: sqlAny, api: apiUrl, source: 'turso-sql-like-any' };
          }
        }
      } catch(e) { continue; }
    }
  }

  return { blocked: false, row: null, source: 'not-found', checkedVariants: variants };
}

// ==================== إضافة جديدة: Theme Global API - لا تحذف ما فوق ====================
async function handleThemeAPI(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method === 'GET') {
    // جلب آخر ثيم محفوظ
    for (const apiUrl of [TURSO_API_PRIMARY, TURSO_API_FALLBACK]) {
      try {
        const sql = `SELECT settings FROM themes ORDER BY id DESC LIMIT 1`;
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql })
        });
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
    // لو لا يوجد ثيم - ارجع افتراضي فارغ
    return new Response(JSON.stringify({}), { headers: corsHeaders });
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const settingsObj = body.settings || body;
      const settingsStr = JSON.stringify(settingsObj).replace(/'/g, "''");
      const updatedBy = (body.updated_by || 'admin').replace(/'/g, "''");
      // تأكد أن الجدول موجود
      const createSql = `CREATE TABLE IF NOT EXISTS themes (id INTEGER PRIMARY KEY AUTOINCREMENT, settings TEXT NOT NULL, updated_by TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`;
      const insertSql = `INSERT INTO themes (settings, updated_by) VALUES ('${settingsStr}', '${updatedBy}')`;

      for (const apiUrl of [TURSO_API_PRIMARY, TURSO_API_FALLBACK]) {
        try {
          await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql: createSql }) });
          const res = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql: insertSql }) });
          if (res.ok) {
            return new Response(JSON.stringify({ ok: true, saved: true }), { headers: corsHeaders });
          }
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

    // ===== إضافة جديدة: معالجة API الثيمات قبل أي Skip - Global Theme =====
    if (pathname === '/api/themes' || pathname === '/api/theme' || pathname.startsWith('/api/themes/')) {
      return await handleThemeAPI(request);
    }

    const skip = ['database-manager', 'test-control', 'turso-api', 'hafez-api', 'auth-api', 'auth', 'favicon', '.js', '.css', '.json', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2', '.webp', 'fonts.googleapis', 'sidebar_admin', 'sidebar'];
    const lowerPath = pathname.toLowerCase();
    // استثناء: لا تعمل skip لـ /api/themes لأنه تمت معالجته فوق
    if (skip.some(s => lowerPath.includes(s.toLowerCase())) && !lowerPath.includes('/api/themes') && !lowerPath.includes('/api/theme')) {
      return await env.ASSETS.fetch(request);
    }

    const isHtml = pathname.endsWith('.html') || pathname === '/' || pathname === '' || !pathname.includes('.') || pathname.endsWith('/');

    let blockInfo = { blocked: false };
    if (isHtml) {
      try { blockInfo = await checkPageBlocked(pageName); } catch(e) { blockInfo = { blocked: false, error: e.message }; }
      if (blockInfo.blocked) {
        return new Response(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>الصفحة معطلة</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8f9fb;font-family:Tajawal,system-ui;direction:rtl} .card{text-align:center;background:white;padding:48px 32px;border-radius:20px;border:1px solid #e2e8f0;max-width:520px;box-shadow:0 8px 30px rgba(0,0,0,0.06)} .icon{font-size:56px} h2{margin:8px 0;font-size:22px;color:#0f172a} p{margin:4px 0;color:#64748b;font-size:13px} a{display:inline-block;margin-top:20px;padding:10px 20px;background:#0f172a;color:white;border-radius:10px;text-decoration:none} .debug{font-size:10px;color:#94a3b8;margin-top:12px;word-break:break-all;text-align:left;direction:ltr;background:#f8fafc;padding:8px;border-radius:8px}</style></head><body><div class="card"><div class="icon">⛔</div><h2>الصفحة معطلة</h2><p>${pageName}</p><p>تم تعطيلها من لوحة التحكم (Turso: مفعلة=0)</p><p class="debug">Source: ${blockInfo.source}<br>Variant: ${blockInfo.variant||''}<br>API: ${blockInfo.api||''}<br>Row: ${JSON.stringify(blockInfo.row||{}).slice(0,400)}</p><a href="/database-manager-FIXED.html">لوحة التحكم</a><a href="/" style="margin-right:8px;background:#f1f5f9;color:#0f172a">الرئيسية</a></div></body></html>`, {
          status: 403,
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache, no-store, must-revalidate', 'X-Blocked-By': 'Worker-v5', 'X-Block-Source': blockInfo.source||'', 'X-Block-Variant': blockInfo.variant||'' }
        });
      }
    }

    let response;
    try { 
      response = await env.ASSETS.fetch(request);
      if (response.status === 404) {
        if (isHtml) {
          return new Response(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>404 - غير موجودة</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#020a05;color:#e2e8f0;font-family:Cairo,Tajawal;direction:rtl} .card{text-align:center;background:rgba(255,255,255,0.05);backdrop-filter:blur(20px);padding:48px 32px;border-radius:20px;border:1px solid rgba(255,255,255,0.08);max-width:500px} h1{font-size:48px;margin:0} h2{margin:12px 0;font-size:20px} p{color:#94a3b8;font-size:13px} a{display:inline-block;margin:6px;padding:10px 18px;background:#10b981;color:white;border-radius:10px;text-decoration:none;font-size:13px} .list{text-align:right;margin-top:16px;background:rgba(0,0,0,0.2);padding:12px;border-radius:12px;font-size:11px;max-height:200px;overflow:auto}</style></head><body><div class="card"><h1>404</h1><h2>الصفحة غير موجودة</h2><p>${pageName} غير موجودة في الموقع</p><p style="font-size:11px;color:#64748b">المسار: ${pathname}</p><a href="/">🏠 الرئيسية</a><a href="/database-manager-FIXED.html" style="background:rgba(255,255,255,0.1)">🛠 لوحة التحكم</a><div class="list"><b>الصفحات المتاحة:</b><br>• index.html<br>• pageAdmin1.html<br>• pageUser1.html<br>• dashboard.html<br>• hafez.html<br>• Hafez-V35-Plus-40468.html<br>• salary.html<br>• employees.html<br>• tables.html<br>• database-manager-FIXED.html</div></div></body></html>`, {
            status: 404,
            headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Worker-404': 'true', 'X-Requested-Path': pathname }
          });
        }
        return response;
      }
    } catch(e) { 
      return new Response(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>404</title></head><body style="font-family:Tajawal;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#020a05;color:white"><div style="text-align:center"><h1>404</h1><p>${pathname} غير موجودة</p><a href="/" style="color:#10b981">الرئيسية</a></div></body></html>`, {status:404, headers:{'Content-Type':'text/html; charset=utf-8'}}); 
    }

    if (isHtml) {
      try {
        let html = await response.text();
        const blockInfoJson = JSON.stringify(blockInfo).replace(/</g, '\\u003c').slice(0,3000);
        const variantsJson = JSON.stringify(normalizePageNameVariants(pageName));
        const guardScript = `<script>console.log('%c[Worker] FINAL v6 + Theme Global - variants:'+${variantsJson}, 'color: lime; background: black; padding: 4px 8px; font-weight: bold;'); console.log('[BlockInfo v5]', ${blockInfoJson}); (function(){const k='salary_portal_page_status';try{const d=JSON.parse(localStorage.getItem(k)||'{}');let p=(location.pathname.split('/').pop()||'index.html');if(p==='')p='index.html';let pn=p;let pnNoExt=p.replace(/\\.html$/,'');let pnWithExt=pnNoExt+'.html';console.log('[Guard v5] LS:',d,'Page:',pn,'noExt:',pnNoExt,'withExt:',pnWithExt);let blocked=false;let key='';if(d[pn]&&d[pn].enabled===false){blocked=true;key=pn;}else if(d[pnNoExt]&&d[pnNoExt].enabled===false){blocked=true;key=pnNoExt;}else if(d[pnWithExt]&&d[pnWithExt].enabled===false){blocked=true;key=pnWithExt;}if(blocked){console.log('[Guard v5] BLOCKED by',key);document.documentElement.innerHTML='<div style=display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8f9fb;font-family:Tajawal;direction:rtl><div style=text-align:center;background:white;padding:40px;border-radius:16px;border:1px solid #e2e8f0;max-width:400px><div style=font-size:48px>⛔</div><h2>الصفحة معطلة</h2><p>'+key+' (localStorage)</p><a href=/database-manager-FIXED.html style=padding:8px 16px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;display:inline-block;margin-top:12px>لوحة التحكم</a></div></div>';}}catch(e){console.log('[Guard v5] error',e);}})();<\/script>`;
        // theme-loader auto injection for all pages (global)
        const themeLoaderInjection = `<script src="/theme-loader.js"><\/script>`;
        if (html.includes('</head>')) html = html.replace('</head>', guardScript + themeLoaderInjection + '</head>');
        else if (html.includes('<head>')) html = html.replace('<head>', '<head>' + guardScript + themeLoaderInjection);
        else html = guardScript + themeLoaderInjection + html;

        const newHeaders = new Headers(response.headers);
        newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        newHeaders.set('X-Worker-Active', 'FINAL-v6-Theme-Global');
        newHeaders.set('X-Block-Check', blockInfo.blocked ? 'blocked' : 'allowed');
        newHeaders.set('X-Block-Source', blockInfo.source || 'not-found');
        newHeaders.set('X-Block-Variant', blockInfo.variant || pageName);
        return new Response(html, { status: response.status, headers: newHeaders });
      } catch(e) {
        const newHeaders = new Headers(response.headers);
        newHeaders.set('X-Worker-Active', 'FINAL-v6-error');
        newHeaders.set('X-Error', e.message.slice(0,500));
        return new Response(response.body, { status: response.status, headers: newHeaders });
      }
    }
    return response;
  }
}
