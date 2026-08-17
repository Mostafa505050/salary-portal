// _worker.js - للـ Workers مع Assets (salary-portal) - نسخة مبسطة للاختبار
const TURSO_API_PRIMARY = "https://turso-api.mostafa-voic77729.workers.dev/api/turso";
const TURSO_API_FALLBACK = "https://auth-api.mostafa-voic77729.workers.dev/api/turso";

async function checkPageBlocked(pageName) {
  const sql = `SELECT "مفعلة" FROM "صفحات_الموقع" WHERE "اسم_الصفحة"='${pageName.replace(/'/g, "''")}' LIMIT 1`;
  for (const apiUrl of [TURSO_API_PRIMARY, TURSO_API_FALLBACK]) {
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
      });
      if (res.ok) {
        const text = await res.text();
        let data; try { data = JSON.parse(text); } catch { data = {}; }
        let rows = data.rows || [];
        if (data.results && data.results[0]?.response?.result) {
          const cols = data.results[0].response.result.cols.map(c=>c.name);
          rows = data.results[0].response.result.rows.map(r=>{ let o={}; r.forEach((c,i)=>{o[cols[i]]=c.value ?? c.text ?? ""}); return o; });
        }
        if (rows[0]) {
          return rows[0]["مفعلة"]==0 || rows[0].مفعلة==0 || rows[0].مفعلة=="0";
        }
        return false;
      }
    } catch(e) {
      continue;
    }
  }
  return false;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    let pageName = pathname.split('/').pop() || 'index.html';
    if (pathname === '/' || pathname === '') pageName = 'index.html';

    const skip = ['database-manager', 'test-control', 'turso-api', 'hafez-api', 'auth-api', 'auth', '/api/', 'favicon', '.js', '.css', '.json', '.png', '.jpg', '.svg', '.ico', '.woff', '.woff2'];
    const lowerPath = pathname.toLowerCase();
    if (skip.some(s => lowerPath.includes(s.toLowerCase()))) {
      return await env.ASSETS.fetch(request);
    }

    const isHtml = pathname.endsWith('.html') || pathname === '/' || !pathname.includes('.') || pathname.endsWith('/');
    
    if (isHtml) {
      let shouldBlock = false;
      try {
        shouldBlock = await checkPageBlocked(pageName);
      } catch(e) {}
      if (shouldBlock) {
        return new Response(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>معطلة</title></head><body><div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8f9fb;font-family:Tajawal;direction:rtl"><div style="text-align:center;background:white;padding:40px;border-radius:16px;border:1px solid #e2e8f0;max-width:400px"><div style="font-size:48px">⛔</div><h2>الصفحة معطلة</h2><p>${pageName}</p><a href="/database-manager-FIXED.html" style="padding:8px 16px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;display:inline-block;margin-top:12px">لوحة التحكم</a></div></div></body></html>`, {
          status: 403,
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache, no-store, must-revalidate', 'X-Worker-Active': 'v2', 'X-Guard-Injected': 'true' }
        });
      }
    }

    let response;
    try {
      response = await env.ASSETS.fetch(request);
    } catch(e) {
      return new Response('Asset not found: '+pathname, {status:404});
    }

    // حقن Guard دائما لـ HTML - بدون فحص Content-Type
    if (isHtml) {
      let html = await response.text();
      const guardScript = `<script>console.log('%c[Worker] ACTIVE - Guard injected via _worker.js v2', 'color: lime; background: black; padding: 4px 8px; font-weight: bold;');(function(){try{var k='salary_portal_page_status';var d=JSON.parse(localStorage.getItem(k)||'{}');var p=(location.pathname.split('/').pop()||'index.html');var pn=p===''?'index.html':p;console.log('[Guard] LS:',d,'Page:',pn);if(d[pn]&&d[pn].enabled===false){document.documentElement.innerHTML='<div style=display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8f9fb;font-family:Tajawal;direction:rtl><div style=text-align:center;background:white;padding:40px;border-radius:16px;border:1px solid #e2e8f0;max-width:400px><div style=font-size:48px>⛔</div><h2>الصفحة معطلة</h2><p>'+pn+' (localStorage)</p><a href=/database-manager-FIXED.html style=padding:8px 16px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;display:inline-block;margin-top:12px>لوحة التحكم</a></div></div>';}}catch(e){console.log('[Guard] error',e);}})();</script>`;
      if (html.includes('</head>')) {
        html = html.replace('</head>', guardScript + '</head>');
      } else if (html.includes('<head>')) {
        html = html.replace('<head>', '<head>' + guardScript);
      } else {
        html = guardScript + html;
      }
      return new Response(html, {
        status: response.status,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache, no-store, must-revalidate', 'X-Worker-Active': 'v2', 'X-Guard-Injected': 'true' }
      });
    }

    return response;
  }
}
