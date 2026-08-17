// _worker.js FINAL - مع حجب صفحات من الخادم + Guard localStorage
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
          const enabled = rows[0]["مفعلة"] ?? rows[0].مفعلة;
          // 0 أو "0" أو false تعني معطلة
          return enabled==0 || enabled=="0" || enabled===false || enabled==="false";
        }
        return false; // صفحة غير موجودة = مفعلة افتراضيا
      }
    } catch(e) { continue; }
  }
  return false; // في حال فشل الاتصال، لا نحجب
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    let pageName = pathname.split('/').pop() || 'index.html';
    if (pathname === '/' || pathname === '') pageName = 'index.html';

    const skip = ['database-manager', 'test-control', 'turso-api', 'hafez-api', 'auth-api', 'auth', '/api/', 'favicon', '.js', '.css', '.json', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2', '.webp'];
    const lowerPath = pathname.toLowerCase();
    if (skip.some(s => lowerPath.includes(s.toLowerCase()))) {
      return await env.ASSETS.fetch(request);
    }

    const isHtml = pathname.endsWith('.html') || pathname === '/' || pathname === '' || !pathname.includes('.') || pathname.endsWith('/');

    if (isHtml) {
      let shouldBlock = false;
      try { shouldBlock = await checkPageBlocked(pageName); } catch(e) {}
      if (shouldBlock) {
        return new Response(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>الصفحة معطلة</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8f9fb;font-family:Tajawal,system-ui;direction:rtl} .card{text-align:center;background:white;padding:48px 32px;border-radius:20px;border:1px solid #e2e8f0;max-width:420px;box-shadow:0 8px 30px rgba(0,0,0,0.06)} .icon{font-size:56px;margin-bottom:16px} h2{margin:0 0 8px;font-size:22px;color:#0f172a} p{margin:0;color:#64748b;font-size:14px} a{display:inline-block;margin-top:20px;padding:10px 20px;background:#0f172a;color:white;border-radius:10px;text-decoration:none;font-size:14px}</style></head><body><div class="card"><div class="icon">⛔</div><h2>الصفحة معطلة</h2><p>${pageName}</p><p style="margin-top:8px;font-size:12px;color:#94a3b8">تم تعطيلها من لوحة التحكم</p><a href="/database-manager-FIXED.html">لوحة التحكم</a></div></body></html>`, {
          status: 403,
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache, no-store, must-revalidate', 'X-Blocked-By': 'Worker-Turso' }
        });
      }
    }

    let response;
    try { response = await env.ASSETS.fetch(request); } catch(e) { return new Response('Not found', {status:404}); }

    if (isHtml) {
      try {
        let html = await response.text();
        const guardScript = `<script>console.log('%c[Worker] ACTIVE FINAL - Guard injected', 'color: lime; background: black; padding: 4px 8px; font-weight: bold;');(function(){const k='salary_portal_page_status';try{const d=JSON.parse(localStorage.getItem(k)||'{}');const p=(location.pathname.split('/').pop()||'index.html');const pn=p===''?'index.html':p;console.log('[Guard] LS:',d,'Page:',pn);if(d[pn]&&d[pn].enabled===false){document.documentElement.innerHTML='<div style=display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8f9fb;font-family:Tajawal;direction:rtl><div style=text-align:center;background:white;padding:40px;border-radius:16px;border:1px solid #e2e8f0;max-width:400px><div style=font-size:48px>⛔</div><h2>الصفحة معطلة</h2><p>'+pn+' (localStorage)</p><a href=/database-manager-FIXED.html style=padding:8px 16px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;display:inline-block;margin-top:12px>لوحة التحكم</a></div></div>';}}catch(e){}})();</script>`;
        if (html.includes('</head>')) html = html.replace('</head>', guardScript + '</head>');
        else if (html.includes('<head>')) html = html.replace('<head>', '<head>' + guardScript);
        else html = guardScript + html;

        const newHeaders = new Headers(response.headers);
        newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        newHeaders.set('X-Worker-Active', 'FINAL');
        return new Response(html, { status: response.status, headers: newHeaders });
      } catch(e) {
        const newHeaders = new Headers(response.headers);
        newHeaders.set('X-Worker-Active', 'FINAL-error');
        return new Response(response.body, { status: response.status, headers: newHeaders });
      }
    }
    return response;
  }
}
