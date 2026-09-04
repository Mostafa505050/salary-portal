// _worker.js - salary-portal - مع التوكن مكتوب داخل Work نفسه
// الحل لـ error 1042 - يقرأ مباشرة من Turso بدون الحاجة لـ fetch من turso-api

// ===== اكتب التوكن هنا مباشرة في Work - انسخهم من turso-api =====
const HARDCODED_TURSO_URL = "https://company-alldata-mostafadarwish-mostafa505050.aws-eu-west-1.turso.io";
const HARDCODED_TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODYyNzY3MDMsImlkIjoiMDE5ZmU2NjEtYzkwMS03ZjMyLWE2NDQtNWIwMTQyMzc3MjdkIiwia2lkIjoiN2JieU4xMTB1VEhfNXRJaTZPR3ZQc2oxOEJ5YWU2ZnF1eUdrMXJMYmZwVSIsInJpZCI6IjdjODI4MWExLWRlZTktNGE5Ny04OGJmLTU5ZTY2OWE5NzA5NiJ9.7D5X6e80tV8BY8ZlKb58y5aWq-3nDjAJ_djVpdOQBWqpyYZUbYsmOImOg8B0WDFn6JNiH5Rrui_PEhKX0-IYAg"; // الصق التوكن الكامل من turso-api هنا
// ===================================================================

const FALLBACK_BLOCKED = ['addhafez1.html', 'addhafez1', 'tables.html', 'tables', 'salaryold.html', 'salaryold'];

function getTursoConfig(env) {
  // يقرأ من المتغيرات أولاً، ثم من الهاردكود في Work
  let url = (env.TURSO_URL || env.TURSO_URLL || env.TURSO_URLI || HARDCODED_TURSO_URL || '').trim();
  let token = (env.TURSO_TOKEN || env.TURSO_TOKENL || env.TURSO_TOKENI || HARDCODED_TURSO_TOKEN || '').trim();
  
  // لو التوكن لسه PASTE_YOUR... يعني لم يتم لصقه
  if (token === "PASTE_YOUR_TURSO_TOKEN_HERE" || token.includes("PASTE_YOUR")) {
    return { url: null, token: null, hasHardcoded: false };
  }
  
  if (url.startsWith('libsql://')) url = 'https://' + url.slice(8);
  if (url && !url.startsWith('https://')) url = 'https://' + url;
  
  return { url: url || null, token: token || null, hasHardcoded: !!HARDCODED_TURSO_TOKEN && !HARDCODED_TURSO_TOKEN.includes("PASTE") };
}

async function queryTursoDirect(env) {
  const { url, token, hasHardcoded } = getTursoConfig(env);
  if (!url || !token) return { pages: null, error: 'no turso config - أضف التوكن في Work' };
  
  try {
    const res = await fetch(`${url}/v2/pipeline`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          { type: "execute", stmt: { sql: `SELECT "اسم_الصفحة" FROM "صفحات_الموقع" WHERE "مفعلة"=0` } },
          { type: "close" }
        ]
      })
    });
    const txt = await res.text();
    let data;
    try { data = JSON.parse(txt); } catch(e) { return { pages: null, error: 'JSON failed: ' + txt.slice(0,300) }; }
    
    if (data.results && data.results[0] && data.results[0].error) {
      return { pages: null, error: 'Turso error: ' + data.results[0].error.message };
    }
    
    const result = data.results?.[0]?.response?.result;
    if (result && result.rows) {
      const cols = result.cols.map(c=>c.name);
      const idx = cols.indexOf("اسم_الصفحة");
      if (idx >= 0) {
        const pages = result.rows.map(r => {
          const cell = r[idx];
          return String(cell.value ?? cell.text ?? "").toLowerCase().trim();
        }).filter(Boolean);
        return { pages, source: hasHardcoded ? 'turso-direct-hardcoded-in-work' : 'turso-direct-env', error: null };
      }
    }
    return { pages: [], source: 'turso-direct-empty', error: null };
  } catch(e) {
    return { pages: null, error: 'fetch failed: ' + e.message };
  }
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
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>مغلقة - `+pageName+`</title><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@900&display=swap" rel="stylesheet"><style>body{min-height:100vh;background:#0a0a1a;font-family:Cairo,sans-serif;direction:rtl;display:flex;align-items:center;justify-content:center;color:white} .box{background:rgba(255,255,255,0.07);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:40px;max-width:600px;width:92%;text-align:center} h1{font-size:28px;margin-bottom:12px} .pn{font-family:monospace;background:rgba(167,139,250,0.15);padding:6px 12px;border-radius:8px;margin-bottom:12px;display:inline-block;font-size:13px} .msg{font-size:13px;color:#d1d5db;margin-bottom:12px;line-height:1.7} .src{font-size:10px;color:#9ca3af;background:rgba(0,0,0,0.3);padding:6px 10px;border-radius:6px;margin-bottom:16px;direction:ltr;font-family:monospace} .btn{display:inline-flex;padding:10px 20px;background:linear-gradient(135deg,#7850ff,#5040ff);color:white;text-decoration:none;border-radius:10px;font-weight:800;font-size:12px}</style></head><body><div class="box"><h1>🔒 الصفحة مغلقة</h1><div class="pn">`+pageName+`</div><p class="msg">عذراً، هذه الصفحة مغلقة من الإدارة (مفعلة=0).</p><div class="src">Source: `+source+`<br>Blocked: `+blockedList.join(', ')+`</div><a href="/" class="btn">🏠 الرئيسية</a></div></body></html>`;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/blocked-list') {
      const direct = await queryTursoDirect(env);
      let pages, source, apiData, fetchError;
      
      if (direct.pages) {
        pages = direct.pages;
        source = direct.source;
        apiData = { blocked: pages, count: pages.length, source: source, hasEnv: true };
        fetchError = null;
      } else {
        // فشل المباشر - احتياطي
        pages = FALLBACK_BLOCKED;
        source = 'fallback-hardcoded';
        apiData = null;
        fetchError = direct.error;
      }
      
      const hasEnv = !!getTursoConfig(env).url;
      
      return new Response(JSON.stringify({
        blocked: pages,
        count: pages.length,
        table: 'صفحات_الموقع',
        column: 'مفعلة',
        rule: '0=منع,1=سماح',
        hasEnv: hasEnv,
        hasUrl: !!getTursoConfig(env).url,
        hasToken: !!getTursoConfig(env).token,
        hasHardcoded: getTursoConfig(env).hasHardcoded,
        localVars: Object.keys(env).filter(k=>k.includes('TURSO')),
        source: source,
        via: source,
        apiData: apiData,
        fetchError: fetchError,
        note: source.includes('turso-direct') ? '✅ يقرأ ديناميكي من Turso - التوكن في Work' : '⚠️ احتياطي - الصق التوكن في Work',
        supports: ['TURSO_URL','TURSO_URLL','TURSO_TOKEN','TURSO_TOKENL','HARDCODED_IN_WORK'],
        time: new Date().toISOString()
      }, null, 2), {
        headers: {'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache'}
      });
    }

    const skip = ['database-manager', 'turso-api', 'hafez-api', 'auth-api', 'favicon', '.js', '.css', '.json', '.png', '.jpg', '.svg', '.ico', '.woff'];
    if (skip.some(s=>path.toLowerCase().includes(s))) {
      return await env.ASSETS.fetch(request);
    }

    let pageName = path.split('/').pop() || 'index.html';
    if (path === '/' || path === '') pageName = 'index.html';
    const isHtml = path.endsWith('.html') || path==='/' || path==='' || (!path.includes('.') && !path.startsWith('/api/'));

    if (isHtml) {
      const direct = await queryTursoDirect(env);
      const pages = direct.pages || FALLBACK_BLOCKED;
      const source = direct.pages ? direct.source : 'fallback';
      if (isBlocked(pageName, pages)) {
        return new Response(blockedPage(pageName, pages, source), {
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
