// _worker.js - للـ Workers مع Assets (salary-portal)
// هذا الملف يحل محل functions/_middleware.js لأن salary-portal هو Worker وليس Pages
// يتصل بالـ API المدموج الجديد (turso-api + auth-api)

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
      console.log(`Worker check error with ${apiUrl}:`, e.message);
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

    // تجاهل لوحة التحكم والـ APIs والـ assets
    const skip = ['database-manager', 'test-control', 'turso-api', 'hafez-api', 'auth-api', 'auth', '/api/', 'favicon', '.js', '.css', '.json', '.png', '.jpg', '.svg', '.ico', '.woff', '.woff2'];
    const lowerPath = pathname.toLowerCase();
    if (skip.some(s => lowerPath.includes(s.toLowerCase()))) {
      // قدم الملف من الـ Assets مباشرة
      try {
        return await env.ASSETS.fetch(request);
      } catch {
        return new Response('Not found', {status:404});
      }
    }

    const isHtml = pathname.endsWith('.html') || pathname === '/' || !pathname.includes('.') || pathname.endsWith('/');
    
    if (isHtml) {
      // فحص هل الصفحة معطلة
      let shouldBlock = false;
      try {
        shouldBlock = await checkPageBlocked(pageName);
      } catch(e) {
        console.log("Worker check error", e.message);
      }

      if (shouldBlock) {
        return new Response(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>معطلة</title><link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@700;800&display=swap" rel="stylesheet"><style>*{font-family:'Tajawal',sans-serif}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8f9fb}</style></head><body><div style="text-align:center;background:white;padding:48px 36px;border-radius:20px;border:1px solid #e2e8f0;box-shadow:0 12px 32px rgba(0,0,0,0.1);max-width:440px;width:92%"><div style="font-size:64px;margin-bottom:12px">⛔</div><h1 style="font-size:22px;font-weight:800;margin:0 0 8px;color:#0f172a">الصفحة معطلة</h1><p style="color:#64748b;font-size:14px;margin:0 0 6px">تم إلغاء تفعيل <b style="color:#0f172a">${pageName}</b></p><p style="color:#94a3b8;font-size:11px;margin:0">بواسطة لوحة التحكم - Worker + Turso API المدموج</p><a href="/database-manager-FIXED.html" style="display:inline-block;margin-top:20px;padding:12px 22px;background:#0f172a;color:white;border-radius:12px;text-decoration:none;font-weight:700;font-size:13px">🔙 لوحة التحكم</a></div></body></html>`, {
          status: 403,
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }
        });
      }
    }

    // جلب من الـ Assets
    let response;
    try {
      response = await env.ASSETS.fetch(request);
    } catch(e) {
      return new Response('Asset not found: '+pathname, {status:404});
    }

    // إذا كان HTML، احقن Guard
    const ct = response.headers.get('Content-Type') || '';
    if (isHtml && ct.includes('text/html')) {
      const guardScript = `<script>console.log('%c[Worker] ACTIVE - Guard injected via _worker.js (merged API)', 'color: lime; background: black; padding: 4px;');(function(){const k='salary_portal_page_status';try{const d=JSON.parse(localStorage.getItem(k)||'{}');const p=(location.pathname.split('/').pop()||'index.html');const pn=p===''?'index.html':p;console.log('[Guard] LS:',d,'Page:',pn);if(d[pn]&&d[pn].enabled===false){document.documentElement.innerHTML='<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8f9fb;font-family:Tajawal;direction:rtl"><div style="text-align:center;background:white;padding:40px;border-radius:16px;border:1px solid #e2e8f0;max-width:400px"><div style="font-size:48px">⛔</div><h2>الصفحة معطلة</h2><p>'+pn+' (localStorage)</p><a href="/database-manager-FIXED.html" style="padding:8px 16px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;display:inline-block;margin-top:12px">لوحة التحكم</a></div></div>';}}catch(e){console.log('[Guard] error',e);}})();</script>`;
      
      try {
        // حاول استخدام HTMLRewriter
        return new HTMLRewriter().on('head', {
          element(el) { el.append(guardScript, {html:true}); }
        }).transform(response);
      } catch {
        // fallback: string replace
        let html = await response.text();
        if (html.includes('</head>')) {
          html = html.replace('</head>', guardScript + '</head>');
        } else {
          html = guardScript + html;
        }
        return new Response(html, {
          status: response.status,
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }
        });
      }
    }

    return response;
  }
}
