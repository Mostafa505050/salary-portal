// functions/_middleware.js - نسخة مطورة: حماية + حقن Guard تلقائياً
export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;
  const pageName = pathname.split('/').pop() || 'index.html';

  const skipPaths = ['database-manager', 'guard.js', '/api/', 'functions/', '_worker', 'favicon', '.js', '.css', '.json', '.png', '.jpg', '.svg'];
  if (skipPaths.some(p => pathname.includes(p))) {
    return await next();
  }

  const isHtmlPage = pathname.endsWith('.html') || pathname === '/' || !pathname.includes('.');
  if (!isHtmlPage) {
    return await next();
  }

  let targetPage = pageName;
  if (pathname === '/' || pathname === '') targetPage = 'index.html';

  try {
    if (env.TURSO_URL && env.TURSO_TOKEN) {
      let tUrl = env.TURSO_URL.trim();
      if (tUrl.startsWith('libsql://')) tUrl = 'https://' + tUrl.slice(8);
      if (!tUrl.startsWith('https://')) tUrl = 'https://' + tUrl;
      const sql = `SELECT "مفعلة" FROM "صفحات_الموقع" WHERE "اسم_الصفحة"='${targetPage.replace(/'/g, "''")}' LIMIT 1`;
      const res = await fetch(tUrl + '/v2/pipeline', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + env.TURSO_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: "execute", stmt: { sql, args: [] } }, { type: "close" }] })
      });
      const text = await res.text();
      let data; try { data = JSON.parse(text); } catch { data = {}; }
      let rows = [];
      if (data.results && data.results[0]?.response?.result) {
        const cols = data.results[0].response.result.cols.map(c => c.name);
        rows = data.results[0].response.result.rows.map(r => { let o = {}; r.forEach((c, i) => { o[cols[i]] = c.value ?? c.text ?? ""; }); return o; });
      }
      if (rows[0] && (rows[0]["مفعلة"] == 0 || rows[0].مفعلة == 0 || rows[0].مفعلة == "0")) {
        return new Response(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>صفحة معطلة</title><link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@700;800&display=swap" rel="stylesheet"><style>*{font-family:'Tajawal',sans-serif}</style></head><body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8f9fb"><div style="text-align:center;background:white;padding:48px 36px;border-radius:20px;border:1px solid #e2e8f0;box-shadow:0 12px 32px rgba(0,0,0,0.1);max-width:440px;width:92%"><div style="font-size:64px;margin-bottom:12px">⛔</div><h1 style="font-size:22px;font-weight:800;margin:0 0 8px;color:#0f172a">الصفحة معطلة</h1><p style="color:#64748b;font-size:14px;margin:0 0 6px">تم إلغاء تفعيل <b style="color:#0f172a">${targetPage}</b></p><p style="color:#94a3b8;font-size:11px;margin:0">بواسطة لوحة التحكم</p><a href="/database-manager-FIXED.html" style="display:inline-block;margin-top:20px;padding:12px 22px;background:#0f172a;color:white;border-radius:12px;text-decoration:none;font-weight:700;font-size:13px">🔙 لوحة التحكم</a></div></body></html>`, { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
    }
  } catch (e) { console.log(e.message); }

  const response = await next();
  const contentType = response.headers.get('Content-Type') || '';
  if (!contentType.includes('text/html')) return response;

  const guardScript = `<script>(function(){const LS_KEY='salary_portal_page_status';const TURSO_API='https://turso-api.mostafa-voic77729.workers.dev/api/turso';const page=location.pathname.split('/').pop()||'index.html';function showBlocked(src){if(document.getElementById('auto-guard-blocked'))return;const div=document.createElement('div');div.id='auto-guard-blocked';div.style.cssText='position:fixed;inset:0;z-index:999999;background:#f8f9fb;display:flex;align-items:center;justify-content:center;font-family:Tajawal,sans-serif;direction:rtl';div.innerHTML='<div style="text-align:center;background:white;padding:40px;border-radius:16px;border:1px solid #e2e8f0"><div style="font-size:48px">⛔</div><h2>الصفحة معطلة</h2><p>'+page+' ('+src+')</p><a href="/database-manager-FIXED.html" style="padding:8px 16px;background:#0f172a;color:white;border-radius:8px;text-decoration:none">لوحة التحكم</a></div>';document.documentElement.appendChild(div);if(document.body){for(let c of document.body.children){if(c.id!=='auto-guard-blocked')c.style.display='none';}}}try{const local=JSON.parse(localStorage.getItem(LS_KEY)||'{}');if(local[page]&&local[page].enabled===false){showBlocked('localStorage');return;}for(let k in local){if((page.includes(k)||k.includes(page))&&local[k].enabled===false){showBlocked('localStorage');return;}}}catch(e){}})();</scr`+`ipt>`;

  return new HTMLRewriter().on('head', { element(el) { el.append(guardScript, { html: true }); } }).transform(response);
}
