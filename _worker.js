// _worker.js - FIXED - إصلاح كسر صفحات الموقع - يحتفظ بكل الدوال السابقة
// المشكلة: html.replace('</body>', ...) يستبدل أول </body> حتى لو كان داخل JavaScript string
// في صفحة حافز V45 يوجد win.document.write(html) والـ html يحتوي </body> فانكسر الكود وظهر كـ نص
// الحل: استخدام HTMLRewriter الآمن بدلاً من replace

const HARDCODED_TURSO_URL = "https://company-alldata-mostafadarwish-mostafa505050.aws-eu-west-1.turso.io";
const HARDCODED_TURSO_TOKEN = "PASTE_YOUR_TURSO_TOKEN_HERE";

const FALLBACK_BLOCKED = ['addhafez1.html', 'addhafez1', 'tables.html', 'tables', 'salaryold.html', 'salaryold'];

function getTursoConfig(env) {
  let url = (env.TURSO_URL || env.TURSO_URLL || env.TURSO_URLI || HARDCODED_TURSO_URL || '').trim();
  let token = (env.TURSO_TOKEN || env.TURSO_TOKENL || env.TURSO_TOKENI || HARDCODED_TURSO_TOKEN || '').trim();
  if (token === "PASTE_YOUR_TURSO_TOKEN_HERE" || token.includes("PASTE_YOUR")) {
    return { url: null, token: null, hasHardcoded: false };
  }
  if (url.startsWith('libsql://')) url = 'https://' + url.slice(8);
  if (url && !url.startsWith('https://')) url = 'https://' + url;
  return { url: url || null, token: token || null, hasHardcoded: true };
}

async function queryTursoDirect(env) {
  const { url, token, hasHardcoded } = getTursoConfig(env);
  if (!url || !token) return { pages: null, error: 'no turso config' };
  try {
    const res = await fetch(`${url}/v2/pipeline`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          { type: "execute", stmt: { sql: `SELECT "اسم_الصفحة" FROM "صفحات_الموقع" WHERE "مفعلة"=0` } },
          { type: "close" }
        ]
      })
    });
    const txt = await res.text();
    let data;
    try { data = JSON.parse(txt); } catch { return { pages: null, error: 'JSON failed' }; }
    if (data.results?.[0]?.error) return { pages: null, error: data.results[0].error.message };
    const result = data.results?.[0]?.response?.result;
    if (result?.rows) {
      const cols = result.cols.map(c=>c.name);
      const idx = cols.indexOf("اسم_الصفحة");
      if (idx >= 0) {
        const pages = result.rows.map(r => String(r[idx].value ?? r[idx].text ?? "").toLowerCase().trim()).filter(Boolean);
        return { pages, source: hasHardcoded ? 'turso-direct-hardcoded' : 'turso-direct-env', error: null };
      }
    }
    return { pages: [], source: 'empty', error: null };
  } catch(e) {
    return { pages: null, error: e.message };
  }
}

async function executeTurso(env, sql, params = []) {
  const { url, token } = getTursoConfig(env);
  if (!url || !token) return { error: 'no config' };
  try {
    const args = params.map(v => ({ type: 'text', value: String(v) }));
    const res = await fetch(`${url}/v2/pipeline`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ type: "execute", stmt: { sql, args } }, { type: "close" }] })
    });
    const data = await res.json();
    if (data.results?.[0]?.error) return { error: data.results[0].error.message };
    return { result: data.results?.[0]?.response?.result, raw: data };
  } catch(e) { return { error: e.message }; }
}

async function queryBlockedDevices(env) {
  const exec = await executeTurso(env, 'SELECT * FROM blocked_devices ORDER BY created_at DESC LIMIT 100');
  if (exec.error) return { blocked: [], error: exec.error };
  const result = exec.result;
  if (!result?.rows) return { blocked: [], error: null };
  const cols = result.cols.map(c => c.name);
  const blocked = result.rows.map(row => {
    const obj = {};
    row.forEach((cell, i) => { obj[cols[i]] = cell.value ?? cell.text ?? ''; });
    return obj;
  });
  return { blocked, error: null };
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
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>مغلقة</title><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@900&display=swap" rel="stylesheet"><style>body{min-height:100vh;background:#0a0a1a;font-family:Cairo,sans-serif;direction:rtl;display:flex;align-items:center;justify-content:center;color:white} .box{background:rgba(255,255,255,0.07);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:40px;max-width:600px;width:92%;text-align:center} h1{font-size:28px} .pn{font-family:monospace;background:rgba(167,139,250,0.15);padding:6px 12px;border-radius:8px;display:inline-block;font-size:13px} .btn{display:inline-flex;padding:10px 20px;background:linear-gradient(135deg,#7850ff,#5040ff);color:white;text-decoration:none;border-radius:10px;font-weight:800;font-size:12px}</style></head><body><div class="box"><h1>🔒 الصفحة مغلقة</h1><div class="pn">`+pageName+`</div><p>مغلقة من الإدارة (مفعلة=0)</p><div style="font-size:10px;color:#9ca3af">Source: `+source+`</div><a href="/" class="btn">🏠 الرئيسية</a></div></body></html>`;
}

function blockedDevicePage(ip, device, reason) {
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>تم حظر جهازك</title><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@900&display=swap" rel="stylesheet"><style>body{min-height:100vh;background:linear-gradient(135deg,#fee2e2,#fecaca);font-family:Cairo,sans-serif;direction:rtl;display:flex;align-items:center;justify-content:center} .box{background:#fff;border-radius:20px;padding:30px;max-width:450px;width:92%;text-align:center;box-shadow:0 16px 40px rgba(0,0,0,0.15)} h1{color:#dc2626} .info{background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px;margin:12px 0;font-size:12px;text-align:right} .btn{display:inline-flex;padding:10px 20px;background:#25D366;color:#fff;text-decoration:none;border-radius:10px;font-weight:800}</style></head><body><div class="box"><div style="font-size:60px">🚫</div><h1>تم حظر جهازك</h1><div class="info"><b>IP:</b> ${ip}<br><b>الجهاز:</b> ${device}<br><b>السبب:</b> ${reason||'محظور'}<br>01092259655</div><a href="https://wa.me/201092259655" class="btn">💬 واتساب</a></div></body></html>`;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // === APIs - محفوظة بدون حذف ===
    if (path === '/api/get-ip') {
      const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown';
      return new Response(JSON.stringify({ ip, country: request.cf?.country||'unknown', city: request.cf?.city||'', timestamp: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control':'no-cache' }
      });
    }

    if (path === '/api/turso') {
      try {
        const body = await request.json();
        const { url: tursoUrl, token } = getTursoConfig(env);
        if (!tursoUrl || !token) return new Response(JSON.stringify({ error: 'no config' }), { status: 500, headers: { 'Access-Control-Allow-Origin':'*' } });
        const args = (body.params||[]).map(v=>({type:'text', value:String(v)}));
        const res = await fetch(`${tursoUrl}/v2/pipeline`, {
          method:'POST',
          headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'},
          body: JSON.stringify({ requests: [{ type:"execute", stmt:{sql:body.sql, args} }, {type:"close"}] })
        });
        const data = await res.json();
        let rows=[];
        if(data.results?.[0]?.response?.result?.rows){
          const result=data.results[0].response.result;
          const cols=result.cols.map(c=>c.name);
          rows=result.rows.map(row=>{ const obj={}; row.forEach((cell,i)=>{obj[cols[i]]=cell.value??cell.text??'';}); return obj; });
        }
        return new Response(JSON.stringify({ rows, raw:data }), { headers:{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*'} });
      } catch(e){ return new Response(JSON.stringify({error:e.message, rows:[]}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }
    }

    if (path === '/api/blocked-list') {
      const direct = await queryTursoDirect(env);
      const pages = direct.pages || FALLBACK_BLOCKED;
      const source = direct.pages ? direct.source : 'fallback';
      return new Response(JSON.stringify({ blocked: pages, count: pages.length, source, time:new Date().toISOString() }, null, 2), {
        headers:{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache'}
      });
    }

    if (path === '/api/blocked-devices') {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const { blocked, error } = await queryBlockedDevices(env);
      const isBlocked = blocked.some(b=>b.ip===ip);
      return new Response(JSON.stringify({ blocked, isBlocked, currentIp:ip, count:blocked.length, error }, null, 2), {
        headers:{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache'}
      });
    }

    // === فحص حظر الأجهزة ===
    const skipDeviceCheck = ['/api/', '/js/', '.js', '.css', '.json', '.png', '.jpg', '.svg', '.ico', '.woff', 'Real-Monitoring'];
    if (!skipDeviceCheck.some(s=>path.toLowerCase().includes(s.toLowerCase()))) {
      const currentIp = request.headers.get('CF-Connecting-IP') || '';
      if (currentIp) {
        const { blocked } = await queryBlockedDevices(env);
        const matched = blocked.find(b=>b.ip===currentIp);
        if (matched) {
          return new Response(blockedDevicePage(matched.ip, matched.device_model, matched.reason), {
            status:403, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'}
          });
        }
      }
    }

    // === فحص حظر الصفحات ===
    const skipPage = ['database-manager','turso-api','hafez-api','auth-api','favicon','.js','.css','.json','.png','.jpg','.svg','.ico','.woff','/api/'];
    if (!skipPage.some(s=>path.toLowerCase().includes(s.toLowerCase()))) {
      let pageName = path.split('/').pop() || 'index.html';
      if (path==='/' || path==='') pageName='index.html';
      const isHtml = path.endsWith('.html') || path==='/' || path==='' || (!path.includes('.') && !path.startsWith('/api/'));
      if (isHtml) {
        const direct = await queryTursoDirect(env);
        const pages = direct.pages || FALLBACK_BLOCKED;
        const source = direct.pages ? direct.source : 'fallback';
        if (isBlocked(pageName, pages)) {
          return new Response(blockedPage(pageName, pages, source), { status:403, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'} });
        }
      }
    }

    // === جلب الأصل ===
    let response;
    try {
      if (env.ASSETS) response = await env.ASSETS.fetch(request);
      else response = await fetch(request);
    } catch(e) {
      return new Response('Not found', {status:404});
    }

    // === الحقن الآمن باستخدام HTMLRewriter (لا يكسر الصفحات) ===
    // بدلاً من html.replace('</body>') الذي كسر صفحة حافز V45
    const contentType = response.headers.get('Content-Type') || '';
    const isHtmlResponse = contentType.includes('text/html') && response.status===200;
    
    // لا تحقن في صفحات المراقبة أو إذا كان هناك خطأ
    if (isHtmlResponse && !path.toLowerCase().includes('real-monitoring') && path!=='/api/get-ip') {
      // استخدام HTMLRewriter - آمن 100% ولا يكسر JavaScript داخل الصفحة
      return new HTMLRewriter()
        .on('body', {
          element(el) {
            // يضيف قبل إغلاق </body> بأمان بدون كسر الكود
            el.append(`
<!-- AUTO INJECTED SAFELY by Worker - HTMLRewriter - لا يكسر الصفحات -->
<script>
(function(){
  if(window.__real_logger_injected) return;
  window.__real_logger_injected=true;
  var s=document.createElement('script');
  s.src='/js/real-logger.js?v='+Date.now();
  s.async=true;
  document.head.appendChild(s);
  var s2=document.createElement('script');
  s2.src='/js/protect.js?v='+Date.now();
  s2.async=true;
  document.head.appendChild(s2);
})();
</script>
`, {html:true});
          }
        })
        .transform(response);
    }

    return response;
  }
}
