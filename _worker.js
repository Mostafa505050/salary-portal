// _worker.js - salary-portal - يقرأ من turso-api مباشرة - بدون Cache للـ blocked-list
// ضع المتغيرات فقط في turso-api - salary-portal يبقى فارغ

const PHOTO = "data:image/jpeg;base64,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";
const FALLBACK_BLOCKED = ['addhafez1.html', 'addhafez1', 'tables.html', 'tables', 'salaryold.html', 'salaryold'];

async function getBlockedFromTursoApi() {
  const apiUrls = [
    "https://turso-api.mostafa-voic77729.workers.dev/api/blocked-list",
    "https://auth-api.mostafa-voic77729.workers.dev/api/blocked-list",
    "https://hafez-api.mostafa-voic77729.workers.dev/api/blocked-list"
  ];
  
  let lastError = null;
  for (const apiUrl of apiUrls) {
    try {
      const res = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cf: { cacheTtl: 0, cacheEverything: false }
      });
      const text = await res.text();
      let d;
      try { d = JSON.parse(text); } catch(e) { lastError = 'JSON parse failed from '+apiUrl+': '+text.slice(0,200); continue; }
      if (res.ok && d.blocked && Array.isArray(d.blocked)) {
        return { pages: d.blocked.map(s=>String(s).toLowerCase()), source: 'via-'+new URL(apiUrl).hostname, apiData: d, error: null };
      } else {
        lastError = apiUrl + ' returned no blocked: ' + text.slice(0,300);
      }
    } catch(e) {
      lastError = apiUrl + ' fetch error: ' + e.message;
    }
  }
  return { pages: FALLBACK_BLOCKED, source: 'fallback-hardcoded', apiData: null, error: lastError };
}

function isBlocked(pageName, blockedList) {
  const low = pageName.toLowerCase().replace('.html','').trim();
  for (const b of blockedList) {
    const bl = String(b).toLowerCase().replace('.html','').trim();
    if (bl===low || bl===low+'.html' || low.includes(bl) || bl.includes(low)) return true;
  }
  return false;
}

function fantasyBlockedPage(pageName, blockedList, info) {
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>مغلقة - `+pageName+`</title><link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@700;900&family=Cairo:wght@900&display=swap" rel="stylesheet"><style>
*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;background:#0a0a1a;background:radial-gradient(ellipse at top,#1a1a40 0%,#0a0a1a 50%,#000 100%);font-family:Tajawal,Cairo,sans-serif;direction:rtl;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative}
body::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 20% 30%,rgba(120,80,255,0.18) 0%,transparent 50%),radial-gradient(circle at 80% 70%,rgba(255,80,180,0.14) 0%,transparent 50%)}
.stars{position:absolute;inset:0;background-image:radial-gradient(2px 2px at 20px 30px,#fff,transparent),radial-gradient(2px 2px at 40px 70px,rgba(255,255,255,0.8),transparent);background-repeat:repeat;background-size:200px 200px;opacity:0.25;animation:s 120s linear infinite}@keyframes s{from{transform:translateY(0)}to{transform:translateY(-200px)}}
.box{position:relative;z-index:2;display:flex;gap:48px;align-items:center;background:rgba(255,255,255,0.07);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.12);border-radius:32px;padding:48px;max-width:920px;width:92%;box-shadow:0 20px 60px rgba(0,0,0,0.5),0 0 80px rgba(120,80,255,0.18);animation:f 6s ease-in-out infinite}@keyframes f{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.ph{position:relative;flex-shrink:0}.phw{position:relative;width:220px;height:220px}.phg{position:absolute;inset:-10px;border-radius:50%;background:conic-gradient(from 0deg,#7850ff,#ff50b4,#50c8ff,#7850ff);animation:r 4s linear infinite;filter:blur(14px);opacity:0.85}@keyframes r{to{transform:rotate(360deg)}}.phb{position:absolute;inset:-4px;border-radius:50%;background:conic-gradient(from 0deg,#7850ff,#ff50b4,#50c8ff,#7850ff);animation:r 4s linear infinite reverse}.phi{position:relative;width:100%;height:100%;border-radius:50%;object-fit:cover;border:4px solid rgba(255,255,255,0.95);box-shadow:0 8px 32px rgba(0,0,0,0.5);z-index:2}.phd{position:absolute;bottom:6px;right:6px;width:52px;height:52px;background:linear-gradient(135deg,#ef4444,#dc2626);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;border:3px solid white;z-index:3;box-shadow:0 4px 16px rgba(239,68,68,0.5);animation:bp 2s ease-in-out infinite}@keyframes bp{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
.ct{flex:1;text-align:right}.ct h1{font-family:Cairo,sans-serif;font-size:32px;font-weight:900;color:white;margin-bottom:10px;background:linear-gradient(135deg,#fff,#c4b5fd);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.pn{font-size:16px;font-weight:700;color:#a78bfa;margin-bottom:12px;font-family:monospace;direction:ltr;text-align:right;background:rgba(167,139,250,0.15);padding:8px 14px;border-radius:10px;border:1px solid rgba(167,139,250,0.3);display:inline-block}.msg{font-size:14px;color:#d1d5db;line-height:1.8;margin-bottom:14px}.env{font-size:10px;padding:4px 8px;border-radius:6px;margin-bottom:8px;display:inline-block}.env.true{background:#ecfdf5;color:#065f46}.env.false{background:#fef2f2;color:#991b1b}.src{font-size:11px;color:#9ca3af;background:rgba(0,0,0,0.3);padding:8px 12px;border-radius:8px;margin-bottom:16px;direction:ltr;font-family:monospace}.fts{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px}.ft{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);padding:6px 10px;border-radius:8px;font-size:11px;color:#9ca3af}.hb{display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:linear-gradient(135deg,#7850ff,#5040ff);color:white;text-decoration:none;border-radius:12px;font-weight:800;font-size:13px;box-shadow:0 8px 24px rgba(120,80,255,0.35)}@media (max-width:768px){.box{flex-direction:column;padding:28px 20px;gap:24px;text-align:center}.ct{text-align:center}.phw{width:180px;height:180px;margin:0 auto}}
</style></head><body><div class="stars"></div><div class="box"><div class="ph"><div class="phw"><div class="phg"></div><div class="phb"></div><img src="`+PHOTO+`" class="phi" alt="مصطفي درويش"><div class="phd">🔒</div></div></div><div class="ct"><h1>الصفحة مغلقة</h1><div class="pn">`+pageName+`</div><div class="env `+info.hasEnv+`">`+info.label+`</div><p class="msg">عذراً، هذه الصفحة مغلقة حالياً من قبل الإدارة.<br>تم تعطيلها من لوحة التحكم (مفعلة=0) في جدول صفحات_الموقع.</p><div class="src">Source: `+info.source+`<br>Blocked: `+blockedList.join(', ')+`</div><div class="fts"><div class="ft">🛡️ عبر turso-api</div><div class="ft">✨ ديناميكي</div><div class="ft">🔒 مفعلة=0</div><div class="ft">`+info.source+`</div></div><a href="/" class="hb">🏠 العودة للرئيسية</a></div></div></body></html>`;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/blocked-list') {
      const result = await getBlockedFromTursoApi();
      const hasLocal = ['TURSO_URL','TURSO_URLL','TURSO_URLI'].some(n=>!!env[n]) && ['TURSO_TOKEN','TURSO_TOKENL','TURSO_TOKENI'].some(n=>!!env[n]);
      return new Response(JSON.stringify({
        blocked: result.pages,
        count: result.pages.length,
        table: 'صفحات_الموقع',
        column: 'مفعلة',
        rule: '0=منع,1=سماح',
        hasEnv: hasLocal || result.source.includes('via-'),
        hasUrl: ['TURSO_URL','TURSO_URLL'].some(n=>!!env[n]),
        hasToken: ['TURSO_TOKEN','TURSO_TOKENL'].some(n=>!!env[n]),
        localVars: Object.keys(env).filter(k=>k.includes('TURSO')),
        source: result.source,
        via: result.source,
        apiData: result.apiData || null,
        fetchError: result.error || null,
        note: result.source.includes('via-') ? '✅ يقرأ ديناميكي من turso-api (المتغيرات في turso-api)' : '⚠️ احتياطي - '+(result.error||'لم يصل لـ turso-api'),
        supports: ['TURSO_URL','TURSO_URLL','TURSO_URLI','TURSO_TOKEN','TURSO_TOKENL'],
        time: new Date().toISOString()
      }, null, 2), {
        headers: {'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache, no-store'}
      });
    }

    const skip = ['database-manager', 'turso-api', 'hafez-api', 'auth-api', 'auth', 'favicon', '.js', '.css', '.json', '.png', '.jpg', '.svg', '.ico', '.woff', 'fonts.googleapis', 'sidebar', 'protect.js', 'wrangler.toml'];
    if (skip.some(s=>path.toLowerCase().includes(s.toLowerCase()))) {
      return await env.ASSETS.fetch(request);
    }

    let pageName = path.split('/').pop() || 'index.html';
    if (path === '/' || path === '') pageName = 'index.html';
    const isHtml = path.endsWith('.html') || path==='/' || path==='' || (!path.includes('.') && !path.startsWith('/api/'));

    if (isHtml) {
      const result = await getBlockedFromTursoApi();
      if (isBlocked(pageName, result.pages)) {
        const info = {
          hasEnv: String(!result.source.includes('fallback')),
          label: result.source.includes('via-') ? '✅ عبر turso-api (ديناميكي من صفحات_الموقع)' : '⚠️ احتياطي',
          source: result.source
        };
        return new Response(fantasyBlockedPage(pageName, result.pages, info), {
          status:403,
          headers: {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Blocked-Source':result.source}
        });
      }
    }

    try {
      return await env.ASSETS.fetch(request);
    } catch(e) {
      return new Response('Not found: '+e.message, {status:404});
    }
  }
}
