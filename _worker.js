// _worker.js - salary-portal - خفيف جداً - يقرأ من turso-api فقط
// بدون صورة كبيرة - يصلح error 1042

const FALLBACK_BLOCKED = ['addhafez1.html', 'addhafez1', 'tables.html', 'tables', 'salaryold.html', 'salaryold'];

async function getBlockedFromTursoApi() {
  // جرب turso-api فقط أولاً - هو اللي فيه TURSO_URLL
  try {
    const res = await fetch("https://turso-api.mostafa-voic77729.workers.dev/api/blocked-list", {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    const text = await res.text();
    try {
      const d = JSON.parse(text);
      if (d.blocked && Array.isArray(d.blocked) && d.blocked.length > 0) {
        return { pages: d.blocked.map(s=>String(s).toLowerCase()), source: 'via-turso-api', apiData: d, error: null };
      }
    } catch(e) {
      return { pages: FALLBACK_BLOCKED, source: 'fallback-json-failed', apiData: null, error: 'turso-api JSON failed: ' + text.slice(0,300) };
    }
  } catch(e) {
    // continue to try other apis
  }

  // لو فشل turso-api جرب الباقي
  const others = [
    "https://auth-api.mostafa-voic77729.workers.dev/api/blocked-list",
    "https://hafez-api.mostafa-voic77729.workers.dev/api/blocked-list"
  ];
  for (const apiUrl of others) {
    try {
      const res = await fetch(apiUrl);
      const d = await res.json();
      if (d.blocked) {
        return { pages: d.blocked.map(s=>String(s).toLowerCase()), source: 'via-'+new URL(apiUrl).hostname, apiData: d, error: null };
      }
    } catch(e) {}
  }
  return { pages: FALLBACK_BLOCKED, source: 'fallback-hardcoded', apiData: null, error: 'all apis failed' };
}

function isBlocked(pageName, blockedList) {
  const low = pageName.toLowerCase().replace('.html','').trim();
  for (const b of blockedList) {
    const bl = String(b).toLowerCase().replace('.html','').trim();
    if (bl===low || bl===low+'.html' || low.includes(bl) || bl.includes(low)) return true;
  }
  return false;
}

function blockedPage(pageName, blockedList, source) {
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>مغلقة - `+pageName+`</title><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@900&display=swap" rel="stylesheet"><style>body{min-height:100vh;background:#0a0a1a;font-family:Cairo,sans-serif;direction:rtl;display:flex;align-items:center;justify-content:center;color:white} .box{background:rgba(255,255,255,0.07);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:40px;max-width:600px;width:92%;text-align:center} h1{font-size:28px;margin-bottom:12px;background:linear-gradient(135deg,#fff,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent} .pn{font-family:monospace;background:rgba(167,139,250,0.15);padding:6px 12px;border-radius:8px;margin-bottom:12px;display:inline-block;font-size:13px} .msg{font-size:13px;color:#d1d5db;margin-bottom:12px;line-height:1.7} .src{font-size:10px;color:#9ca3af;background:rgba(0,0,0,0.3);padding:6px 10px;border-radius:6px;margin-bottom:16px;direction:ltr;font-family:monospace} .btn{display:inline-flex;padding:10px 20px;background:linear-gradient(135deg,#7850ff,#5040ff);color:white;text-decoration:none;border-radius:10px;font-weight:800;font-size:12px}</style></head><body><div class="box"><h1>🔒 الصفحة مغلقة</h1><div class="pn">`+pageName+`</div><p class="msg">عذراً، هذه الصفحة مغلقة من الإدارة.<br>تم تعطيلها من لوحة التحكم (مفعلة=0) في جدول صفحات_الموقع.</p><div class="src">Source: `+source+`<br>Blocked: `+blockedList.join(', ')+`</div><a href="/" class="btn">🏠 العودة للرئيسية</a></div></body></html>`;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/blocked-list') {
      const result = await getBlockedFromTursoApi();
      return new Response(JSON.stringify({
        blocked: result.pages,
        count: result.pages.length,
        table: 'صفحات_الموقع',
        column: 'مفعلة',
        rule: '0=منع,1=سماح',
        hasEnv: result.source.includes('via-'),
        hasUrl: false,
        hasToken: false,
        localVars: [],
        source: result.source,
        via: result.source,
        apiData: result.apiData,
        fetchError: result.error,
        note: result.source.includes('via-') ? '✅ يقرأ ديناميكي من turso-api (TURSO_URLL يعمل بدون مسح)' : '⚠️ احتياطي',
        supports: ['TURSO_URL','TURSO_URLL','TURSO_TOKEN','TURSO_TOKENL'],
        time: new Date().toISOString()
      }, null, 2), {
        headers: {'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache'}
      });
    }

    const skip = ['database-manager', 'turso-api', 'hafez-api', 'auth-api', 'auth', 'favicon', '.js', '.css', '.json', '.png', '.jpg', '.svg', '.ico', '.woff'];
    if (skip.some(s=>path.toLowerCase().includes(s))) {
      return await env.ASSETS.fetch(request);
    }

    let pageName = path.split('/').pop() || 'index.html';
    if (path === '/' || path === '') pageName = 'index.html';
    const isHtml = path.endsWith('.html') || path==='/' || path==='' || (!path.includes('.') && !path.startsWith('/api/'));

    if (isHtml) {
      const result = await getBlockedFromTursoApi();
      if (isBlocked(pageName, result.pages)) {
        return new Response(blockedPage(pageName, result.pages, result.source), {
          status:403,
          headers: {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'}
        });
      }
    }

    try {
      return await env.ASSETS.fetch(request);
    } catch(e) {
      return new Response('Not found', {status:404});
    }
  }
}
