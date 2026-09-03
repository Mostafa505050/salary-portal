// _worker.js FINAL v7 - Fixed Content Leak + Turso + Theme Global - لا يتم حذف أي دالة
const API_CHECK_PRIMARY = "https://auth-api.mostafa-voic77729.workers.dev/api/check-page-status";
const API_CHECK_FALLBACK = "https://turso-api.mostafa-voic77729.workers.dev/api/check-page-status";
const TURSO_API_PRIMARY = "https://turso-api.mostafa-voic77729.workers.dev/api/turso";
const TURSO_API_FALLBACK = "https://auth-api.mostafa-voic77729.workers.dev/api/turso";

function normalizePageNameVariants(pageName) {
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
    return new Response(JSON.stringify({}), { headers: corsHeaders });
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const settingsObj = body.settings || body;
      const settingsStr = JSON.stringify(settingsObj).replace(/'/g, "''");
      const updatedBy = (body.updated_by || 'admin').replace(/'/g, "''");
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

    if (pathname === '/api/themes' || pathname === '/api/theme' || pathname.startsWith('/api/themes/')) {
      return await handleThemeAPI(request);
    }

    const skip = ['database-manager', 'test-control', 'turso-api', 'hafez-api', 'auth-api', 'auth', 'favicon', '.js', '.css', '.json', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2', '.webp', 'fonts.googleapis', 'sidebar_admin', 'sidebar'];
    const lowerPath = pathname.toLowerCase();
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
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache, no-store, must-revalidate', 'X-Blocked-By': 'Worker-v7', 'X-Block-Source': blockInfo.source||'', 'X-Block-Variant': blockInfo.variant||'' }
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
        
        // === حارس نهائي مصلح - يمسح كل المحتوى 100% ===
        const guardScript = `<script>
console.log('%c[Worker] FINAL v7 - Fixed Leak - variants:'+${variantsJson}, 'color: lime; background: black; padding: 4px 8px; font-weight: bold;');
console.log('[BlockInfo v7]', ${blockInfoJson});
(function(){
  function getFile(){ let p=(location.pathname.split('/').pop()||'index.html'); if(p==='')p='index.html'; return p; }
  function isDisabled(){
    const file = getFile().toLowerCase();
    const checkKeys = ['pagesStatus','pageStatus','salary_portal_page_status','myAdminPages','databaseManagerConfig'];
    for(let k of checkKeys){
      try{
        const raw = localStorage.getItem(k);
        if(!raw) continue;
        const obj = JSON.parse(raw);
        for(let key in obj){
          if(key.toLowerCase() === file || key.toLowerCase() === file.replace('.html','') || (file.replace('.html','').toLowerCase() === key.toLowerCase())){
            const cfg = obj[key];
            if(typeof cfg === 'object'){
              if(cfg.enabled === false) return {yes:true, src:k+'.'+key+'.enabled=false'};
              if(cfg.status === 'معطل' || cfg.status === false) return {yes:true, src:k+'.'+key+'.status=معطل'};
            }
            if(cfg === false) return {yes:true, src:k+'.'+key+'=false'};
          }
        }
      }catch(e){}
    }
    // مفاتيح منفصلة
    const direct = [getFile(), getFile()+'_status', getFile().toLowerCase(), getFile().toLowerCase()+'_status', getFile().replace('.html','').toLowerCase()+'_status'];
    for(let k of direct){
      const v = localStorage.getItem(k);
      if(v){
        const lv = String(v).toLowerCase();
        if(lv.includes('معطل') || lv==='false' || lv.includes('disabled')) return {yes:true, src:k+'='+v};
      }
    }
    return {yes:false};
  }
  function killPage(src){
    function doKill(){
      if(!document.body) return;
      document.body.innerHTML = '';
      document.body.style.cssText = 'margin:0; padding:0; background:#f8f9fb; font-family:Tajawal,Cairo,sans-serif;';
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 20px; text-align:center; background:#fff;';
      wrapper.innerHTML = '<div style=width:100px;height:100px;border-radius:50%;background:linear-gradient(180deg,#fee2e2,#fecaca);border:5px solid #fca5a5;display:flex;align-items:center;justify-content:center;margin:0 auto 28px;font-size:56px>⛔</div><h1 style=font-size:28px;font-weight:900;color:#7f1d1d;margin-bottom:10px>الصفحة معطلة</h1><p style=font-size:16px;font-weight:700;color:#6b7280;margin-bottom:6px>'+getFile()+'</p><p style=font-size:13px;color:#9ca3af;margin-bottom:6px>تم تعطيلها من لوحة التحكم (localStorage)</p><p style=font-size:10px;color:#e5e7eb;margin-top:12px;direction:ltr>Source: '+src+'</p><a href=/Database-Manager.html style=display:inline-flex;margin-top:28px;padding:14px 28px;border-radius:14px;background:linear-gradient(180deg,#6366f1,#4f46e5);color:#fff;text-decoration:none;font-size:14px;font-weight:800>🔧 لوحة التحكم</a><a href=/ style=display:inline-flex;margin-top:14px;padding:12px 22px;border-radius:12px;background:#f3f4f6;color:#374151;text-decoration:none;font-size:13px;font-weight:700>🏠 الرئيسية</a>';
      document.body.appendChild(wrapper);
      document.documentElement.style.visibility='visible';
      document.documentElement.style.opacity='1';
      console.log('🚫 [Guard v7 FINAL] تم مسح الصفحة تماما:', getFile(), src);
    }
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', doKill);
    }else{
      doKill();
    }
    setTimeout(doKill, 50);
    setTimeout(doKill, 300);
    setTimeout(doKill, 1000);
  }
  const res = isDisabled();
  if(res.yes){
    console.log('%c[Guard v7] BLOCKED - Killing page: '+res.src, 'color:red; font-weight:bold; font-size:14px');
    killPage(res.src);
  }else{
    console.log('%c[Guard v7] ALLOWED: '+getFile(), 'color:green; font-weight:bold');
    document.documentElement.style.visibility='visible';
    document.documentElement.style.opacity='1';
  }
})();
<\/script>`;

        const themeLoaderInjection = `<script src="/theme-loader.js"><\/script>`;
        if (html.includes('</head>')) html = html.replace('</head>', guardScript + themeLoaderInjection + '</head>');
        else if (html.includes('<head>')) html = html.replace('<head>', '<head>' + guardScript + themeLoaderInjection);
        else html = guardScript + themeLoaderInjection + html;

        const newHeaders = new Headers(response.headers);
        newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        newHeaders.set('X-Worker-Active', 'FINAL-v7-Fixed-Leak');
        newHeaders.set('X-Block-Check', blockInfo.blocked ? 'blocked' : 'allowed');
        newHeaders.set('X-Block-Source', blockInfo.source || 'not-found');
        newHeaders.set('X-Block-Variant', blockInfo.variant || pageName);
        return new Response(html, { status: response.status, headers: newHeaders });
      } catch(e) {
        const newHeaders = new Headers(response.headers);
        newHeaders.set('X-Worker-Active', 'FINAL-v7-error');
        newHeaders.set('X-Error', e.message.slice(0,500));
        return new Response(response.body, { status: response.status, headers: newHeaders });
      }
    }
    return response;
  }
}
