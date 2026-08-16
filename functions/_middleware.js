// functions/_middleware.js - نسخة تشخيص + حل نهائي (لا تحتاج Secrets)
// هذه النسخة تختبر إذا كان الـ Middleware يعمل أصلاً، وتستخدم localStorage كـ fallback فوري

const TURSO_API = "https://turso-api.mostafa-voic77729.workers.dev/api/turso";

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Log للتشخيص
  console.log(`[Middleware] Request: ${pathname}`);

  // تجاهل الملفات غير المهمة
  if (pathname.includes('.js') || pathname.includes('.css') || pathname.includes('.json') || 
      pathname.includes('favicon') || pathname.includes('turso-api') || pathname.includes('hafez-api') ||
      pathname.includes('_middleware') || pathname.includes('database-manager')) {
    return await next();
  }

  const isHtml = pathname.endsWith('.html') || pathname === '/' || !pathname.includes('.') || pathname.endsWith('/');
  if (!isHtml) {
    return await next();
  }

  let targetPage = pathname.split('/').pop() || 'index.html';
  if (pathname === '/' || pathname === '' || pathname === '/index.html') targetPage = 'index.html';

  // ===== اختبار: حاول قراءة من Turso =====
  let shouldBlock = false;
  try {
    const sql = `SELECT "مفعلة" FROM "صفحات_الموقع" WHERE "اسم_الصفحة"='${targetPage.replace(/'/g, "''")}' LIMIT 1`;
    const res = await fetch(TURSO_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql })
    });
    
    console.log(`[Middleware] Turso response status: ${res.status} for ${targetPage}`);
    
    if (res.ok) {
      const text = await res.text();
      console.log(`[Middleware] Turso raw: ${text.slice(0, 300)}`);
      let data;
      try { data = JSON.parse(text); } catch { data = {}; }
      
      let rows = data.rows || [];
      if (data.results && data.results[0]?.response?.result) {
        const cols = data.results[0].response.result.cols.map(c => c.name);
        rows = data.results[0].response.result.rows.map(r => {
          let o = {};
          r.forEach((c, i) => { o[cols[i]] = c.value ?? c.text ?? ""; });
          return o;
        });
      }
      
      console.log(`[Middleware] Rows for ${targetPage}:`, JSON.stringify(rows));
      
      if (rows[0] && (rows[0]["مفعلة"] == 0 || rows[0].مفعلة == 0 || rows[0].مفعلة == "0")) {
        shouldBlock = true;
      }
    }
  } catch (e) {
    console.log(`[Middleware] Error: ${e.message}`);
  }

  if (shouldBlock) {
    console.log(`[Middleware] BLOCKING ${targetPage}`);
    return new Response(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>معطلة</title><style>*{font-family:Tajawal,sans-serif}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8f9fb}</style></head><body><div style="text-align:center;background:white;padding:40px;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 4px 12px rgba(0,0,0,0.05)"><div style="font-size:48px">⛔</div><h2>الصفحة معطلة</h2><p>${targetPage} معطلة من لوحة التحكم</p><p style="font-size:11px;color:#94a3b8">تم الحجب عبر Middleware + turso-api</p><a href="/database-manager-FIXED.html" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#0f172a;color:white;border-radius:10px;text-decoration:none">لوحة التحكم</a></div></body></html>`, {
      status: 403,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }
    });
  }

  // ===== الصفحة مفعلة - قدمها مع حقن Guard =====
  const response = await next();
  
  // إذا لم تكن HTML، ارجعها كما هي
  const ct = response.headers.get('Content-Type') || '';
  if (!ct.includes('text/html') && !isHtml) {
    return response;
  }

  // حقن Guard تلقائياً - يعمل حتى لو Turso فشل
  const guardScript = `<script>console.log('[Guard] Auto-injected guard active for '+location.pathname);(function(){const LS_KEY='salary_portal_page_status';const TURSO_API='https://turso-api.mostafa-voic77729.workers.dev/api/turso';const page=location.pathname.split('/').pop()||'index.html';if(page===''||page==='/')page='index.html';function block(src){console.log('[Guard] BLOCKING '+page+' from '+src);if(document.getElementById('__blocked__'))return;const d=document.createElement('div');d.id='__blocked__';d.style.cssText='position:fixed;inset:0;z-index:999999;background:#f8f9fb;display:flex;align-items:center;justify-content:center;font-family:Tajawal,sans-serif;direction:rtl';d.innerHTML='<div style="text-align:center;background:white;padding:40px;border-radius:16px;border:1px solid #e2e8f0;max-width:400px"><div style="font-size:48px">⛔</div><h2>الصفحة معطلة</h2><p>'+page+' ('+src+')</p><p style="font-size:11px;color:#94a3b8">Guard: localStorage + Turso</p><a href="/database-manager-FIXED.html" style="padding:8px 16px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;display:inline-block;margin-top:12px">لوحة التحكم</a></div>';(document.body||document.documentElement).appendChild(d);if(document.body){for(let c of document.body.children){if(c.id!=='__blocked__')c.style.display='none';}}}try{const ls=JSON.parse(localStorage.getItem(LS_KEY)||'{}');console.log('[Guard] localStorage:',ls);if(ls[page]&&ls[page].enabled===false){block('localStorage-direct');return;}for(let k in ls){if((page===k||page.includes(k)||k.includes(page))&&ls[k].enabled===false){block('localStorage-fuzzy:'+k);return;}}}catch(e){console.log('[Guard] LS error',e);}fetch(TURSO_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql:"SELECT \"مفعلة\" FROM \"صفحات_الموقع\" WHERE \"اسم_الصفحة\"='"+page.replace(/'/g,"''")+"' LIMIT 1"})}).then(r=>r.text()).then(t=>{console.log('[Guard] Turso response:',t.slice(0,300));try{const d=JSON.parse(t);let rows=d.rows||[];if(d.results){const cols=d.results[0].response.result.cols.map(c=>c.name);rows=d.results[0].response.result.rows.map(r=>{let o={};r.forEach((c,i)=>{o[cols[i]]=c.value});return o;});}if(rows[0]&&(rows[0]["مفعلة"]==0||rows[0].مفعلة==0))block('Turso-API');}catch(e){}}).catch(e=>console.log('[Guard] fetch error',e));})();</scr`+`ipt>`;

  try {
    return new HTMLRewriter()
      .on('head', {
        element(el) {
          el.append(guardScript, { html: true });
        }
      })
      .transform(response);
  } catch (e) {
    console.log(`[Middleware] HTMLRewriter error: ${e.message}`);
    return response;
  }
}
