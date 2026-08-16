// functions/_middleware.js - حماية الصفحات لـ Cloudflare Pages (salary-portal)
// يفحص جدول صفحات_الموقع قبل تقديم أي صفحة HTML

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;
  const pageName = pathname.split('/').pop() || 'index.html';

  // لا تمنع لوحة التحكم نفسها والـ assets والـ API
  const allowedPaths = [
    'database-manager', 'database-manager-FIXED', 'database-manager-activated',
    'guard.js', 'api/', 'functions/', '_worker', 'favicon'
  ];
  if (allowedPaths.some(p => pathname.includes(p))) {
    return await next();
  }

  // فقط الصفحات HTML
  const isHtmlPage = pathname.endsWith('.html') || pathname === '/' || !pathname.includes('.');
  if (!isHtmlPage) {
    return await next();
  }

  // تحديد اسم الصفحة
  let targetPage = pageName;
  if (pathname === '/' || pathname === '') targetPage = 'index.html';
  
  // فحص Turso
  try {
    if (env.TURSO_URL && env.TURSO_TOKEN) {
      let tUrl = env.TURSO_URL.trim();
      if (tUrl.startsWith('libsql://')) tUrl = 'https://' + tUrl.slice(8);
      if (!tUrl.startsWith('https://')) tUrl = 'https://' + tUrl;

      const sql = `SELECT "مفعلة" FROM "صفحات_الموقع" WHERE "اسم_الصفحة"='${targetPage.replace(/'/g, "''")}' LIMIT 1`;
      
      const res = await fetch(tUrl + '/v2/pipeline', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + env.TURSO_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            { type: "execute", stmt: { sql, args: [] } },
            { type: "close" }
          ]
        })
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = {}; }
      
      let rows = [];
      if (data.results && data.results[0]?.response?.result) {
        const cols = data.results[0].response.result.cols.map(c => c.name);
        rows = data.results[0].response.result.rows.map(r => {
          let o = {};
          r.forEach((c, i) => { o[cols[i]] = c.value ?? c.text ?? ""; });
          return o;
        });
      }

      if (rows[0] && (rows[0]["مفعلة"] == 0 || rows[0].مفعلة == 0 || rows[0].مفعلة == "0")) {
        return new Response(`
          <!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
          <title>صفحة معطلة</title>
          <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@700;800&display=swap" rel="stylesheet">
          <style>*{font-family:'Tajawal',sans-serif}</style></head>
          <body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8f9fb">
          <div style="text-align:center;background:white;padding:48px 36px;border-radius:20px;border:1px solid #e2e8f0;box-shadow:0 12px 32px rgba(0,0,0,0.1);max-width:440px;width:92%">
            <div style="font-size:64px;margin-bottom:12px">⛔</div>
            <h1 style="font-size:22px;font-weight:800;margin:0 0 8px;color:#0f172a">الصفحة معطلة من الخادم</h1>
            <p style="color:#64748b;font-size:14px;margin:0 0 6px">تم إلغاء تفعيل <b style="color:#0f172a">${targetPage}</b></p>
            <p style="color:#94a3b8;font-size:11px;margin:0 0 8px">بواسطة لوحة التحكم - حماية Pages Middleware</p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px;font-size:11px;color:#475569;margin:16px 0;text-align:right">
              <b>المستوى:</b> حماية خادم (Cloudflare Pages Functions)<br>
              <b>الجدول:</b> صفحات_الموقع<br>
              <b>الحالة:</b> مفعلة = 0
            </div>
            <a href="/database-manager-FIXED.html" style="display:inline-block;padding:12px 22px;background:#0f172a;color:white;border-radius:12px;text-decoration:none;font-weight:700;font-size:13px">🔙 لوحة التحكم</a>
            <div style="margin-top:16px"><a href="/" style="font-size:12px;color:#64748b;text-decoration:none">🏠 الرئيسية</a></div>
          </div></body></html>
        `, {
          status: 403,
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }
        });
      }
    }
  } catch (e) {
    console.log("Page control middleware error (fail-open):", e.message);
    // في حالة الخطأ، اسمح بالوصول (fail-open)
  }

  // الصفحة مفعلة - قدمها عادي
  return await next();
}
