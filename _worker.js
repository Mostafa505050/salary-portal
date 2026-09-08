// _worker.js - MERGED - يحتفظ بكل الدوال السابقة + يضيف IP إجباري + حظر أجهزة + حقن تلقائي
// لا يحذف أي دالة سابقة - يدمج كل شيء

// ===== اكتب التوكن هنا مباشرة في Work - انسخهم من turso-api =====
const HARDCODED_TURSO_URL = "https://company-alldata-mostafadarwish-mostafa505050.aws-eu-west-1.turso.io";
const HARDCODED_TURSO_TOKEN = "PASTE_YOUR_TURSO_TOKEN_HERE"; // الصق التوكن الكامل من turso-api هنا
// ===================================================================

const FALLBACK_BLOCKED = ['addhafez1.html', 'addhafez1', 'tables.html', 'tables', 'salaryold.html', 'salaryold'];

// ========== الدوال السابقة - محفوظة كما هي ==========
function getTursoConfig(env) {
  let url = (env.TURSO_URL || env.TURSO_URLL || env.TURSO_URLI || HARDCODED_TURSO_URL || '').trim();
  let token = (env.TURSO_TOKEN || env.TURSO_TOKENL || env.TURSO_TOKENI || HARDCODED_TURSO_TOKEN || '').trim();
  
  if (token === "PASTE_YOUR_TURSO_TOKEN_HERE" || token.includes("PASTE_YOUR")) {
    return { url: null, token: null, hasHardcoded: false };
  }
  
  if (url.startsWith('libsql://')) url = 'https://' + url.slice(8);
  if (url && !url.startsWith('https://')) url = 'https://' + url;
  
  return { url: url || null, token: token || null, hasHardcoded: !!HARDCODED_TURSO_URL && HARDCODED_TURSO_TOKEN && !HARDCODED_TURSO_TOKEN.includes("PASTE") };
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

// ========== الدوال الجديدة - مضافة بدون حذف القديم ==========
async function executeTurso(env, sql, params = []) {
  const { url, token } = getTursoConfig(env);
  if (!url || !token) return { error: 'no turso config' };
  
  try {
    const args = params.map(v => ({ type: 'text', value: String(v) }));
    const res = await fetch(`${url}/v2/pipeline`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          { type: "execute", stmt: { sql, args } },
          { type: "close" }
        ]
      })
    });
    const data = await res.json();
    if (data.results?.[0]?.error) return { error: data.results[0].error.message };
    return { result: data.results?.[0]?.response?.result, raw: data };
  } catch (e) {
    return { error: e.message };
  }
}

async function queryBlockedDevices(env) {
  const exec = await executeTurso(env, 'SELECT * FROM blocked_devices ORDER BY created_at DESC LIMIT 100');
  if (exec.error) return { blocked: [], error: exec.error };
  const result = exec.result;
  if (!result || !result.rows) return { blocked: [], error: null };
  
  // تحويل الصفوف إلى كائنات
  const cols = result.cols.map(c => c.name);
  const blocked = result.rows.map(row => {
    const obj = {};
    row.forEach((cell, i) => {
      obj[cols[i]] = cell.value ?? cell.text ?? '';
    });
    return obj;
  });
  return { blocked, error: null };
}

function blockedDevicePage(ip, device, reason) {
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>تم حظر جهازك</title><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@900&display=swap" rel="stylesheet"><style>body{min-height:100vh;background:linear-gradient(135deg,#fee2e2,#fecaca);font-family:Cairo,sans-serif;direction:rtl;display:flex;align-items:center;justify-content:center} .box{background:#fff;border-radius:20px;padding:30px;max-width:450px;width:92%;text-align:center;box-shadow:0 16px 40px rgba(0,0,0,0.15)} h1{color:#dc2626;margin:10px 0} .info{background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px;margin:12px 0;font-size:12px;text-align:right} .btn{display:inline-flex;padding:10px 20px;background:#25D366;color:#fff;text-decoration:none;border-radius:10px;font-weight:800;font-size:12px;margin-top:12px}</style></head><body><div class="box"><div style="font-size:60px">🚫</div><h1>تم حظر جهازك</h1><div class="info"><b>IP:</b> ${ip}<br><b>الجهاز:</b> ${device}<br><b>السبب:</b> ${reason || 'محظور من الإدارة'}<br><b>التواصل:</b> 01092259655</div><a href="https://wa.me/201092259655" class="btn">💬 تواصل واتساب</a></div></body></html>`;
}

// ========== Worker الرئيسي - مدمج بدون حذف ==========
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // === 1. API للـ IP الحقيقي (جديد - إجباري) ===
    if (path === '/api/get-ip') {
      const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown';
      const country = request.cf?.country || 'unknown';
      const city = request.cf?.city || '';
      return new Response(JSON.stringify({ ip, country, city, timestamp: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache' }
      });
    }

    // === 2. API لـ Turso (جديد - للكتابة والقراءة من real_page_logs و blocked_devices) ===
    if (path === '/api/turso') {
      try {
        const body = await request.json();
        const { url: tursoUrl, token } = getTursoConfig(env);
        if (!tursoUrl || !token) {
          return new Response(JSON.stringify({ error: 'no turso config - أضف التوكن' }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
        }
        
        // دعم صيغتين: {sql, params} و {sql} مباشر
        const sql = body.sql;
        const params = body.params || [];
        const args = params.map(v => ({ type: 'text', value: String(v) }));
        
        const res = await fetch(`${tursoUrl}/v2/pipeline`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [
              { type: "execute", stmt: { sql, args } },
              { type: "close" }
            ]
          })
        });
        const data = await res.json();
        
        // تحويل النتيجة إلى صيغة {rows: []} المتوقعة من الواجهة الأمامية
        let rows = [];
        if (data.results?.[0]?.response?.result?.rows) {
          const result = data.results[0].response.result;
          const cols = result.cols.map(c => c.name);
          rows = result.rows.map(row => {
            const obj = {};
            row.forEach((cell, i) => {
              obj[cols[i]] = cell.value ?? cell.text ?? '';
            });
            return obj;
          });
        }
        
        return new Response(JSON.stringify({ rows, result: data.results?.[0]?.response?.result, raw: data }), {
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message, rows: [] }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
    }

    // === 3. API لقائمة الصفحات المحظورة (قديم - محفوظ كما هو) ===
    if (path === '/api/blocked-list') {
      const direct = await queryTursoDirect(env);
      let pages, source, apiData, fetchError;
      
      if (direct.pages) {
        pages = direct.pages;
        source = direct.source;
        apiData = { blocked: pages, count: pages.length, source: source, hasEnv: true };
        fetchError = null;
      } else {
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
        note: source.includes('turso-direct') ? '✅ يقرأ ديناميكي من Turso - التوكن في Work' : '⚠ احتياطي - الصق التوكن في Work',
        supports: ['TURSO_URL','TURSO_URLL','TURSO_TOKEN','TURSO_TOKENL','HARDCODED_IN_WORK'],
        time: new Date().toISOString()
      }, null, 2), {
        headers: {'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache'}
      });
    }

    // === 4. API للأجهزة المحظورة (جديد - IP إجباري) ===
    if (path === '/api/blocked-devices') {
      const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown';
      const { blocked, error } = await queryBlockedDevices(env);
      const isBlocked = blocked.some(b => b.ip === ip);
      
      return new Response(JSON.stringify({ 
        blocked, 
        isBlocked, 
        currentIp: ip,
        count: blocked.length,
        error,
        time: new Date().toISOString()
      }, null, 2), {
        headers: {'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache'}
      });
    }

    // === 5. فحص حظر الأجهزة أولاً (جديد - قبل فحص الصفحات) ===
    const skipDeviceCheck = ['/api/', '/js/', '.js', '.css', '.json', '.png', '.jpg', '.svg', '.ico', '.woff', 'Real-Monitoring'];
    const shouldCheckDevice = !skipDeviceCheck.some(s => path.toLowerCase().includes(s.toLowerCase()));
    
    if (shouldCheckDevice) {
      const currentIp = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || '';
      if (currentIp) {
        const { blocked } = await queryBlockedDevices(env);
        const matched = blocked.find(b => b.ip === currentIp);
        if (matched) {
          return new Response(blockedDevicePage(matched.ip, matched.device_model, matched.reason), {
            status: 403,
            headers: {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'}
          });
        }
      }
    }

    // === 6. فحص حظر الصفحات (قديم - محفوظ كما هو) ===
    const skip = ['database-manager', 'turso-api', 'hafez-api', 'auth-api', 'favicon', '.js', '.css', '.json', '.png', '.jpg', '.svg', '.ico', '.woff', '/api/'];
    const shouldCheckPage = !skip.some(s=>path.toLowerCase().includes(s.toLowerCase()));
    
    if (shouldCheckPage) {
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
    }

    // === 7. جلب الأصل مع حقن تلقائي لـ real-logger.js (جديد - لا يحتاج <script> في كل صفحة) ===
    let response;
    try {
      if (env.ASSETS) {
        response = await env.ASSETS.fetch(request);
      } else {
        response = await fetch(request);
      }
    } catch(e) {
      return new Response('Not found', {status:404});
    }

    // حقن تلقائي لـ real-logger.js و protect.js في كل صفحة HTML
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('text/html') && response.status === 200) {
      let html = await response.text();
      
      // لا تحقن في صفحة الحظر نفسها
      if (!html.includes('الصفحه مغلقه') && !html.includes('تم حظر جهازك')) {
        const injection = `
<!-- AUTO INJECTED by Worker - تفاعل مباشر بدون كتابة <script> في كل صفحة + IP إجباري -->
<script>
(function(){
  if(window.__real_logger_injected) return;
  window.__real_logger_injected = true;
  const s=document.createElement('script');
  s.src='/js/real-logger.js?v='+Date.now();
  s.async=true;
  document.head.appendChild(s);
  const s2=document.createElement('script');
  s2.src='/js/protect.js?v='+Date.now();
  s2.async=true;
  document.head.appendChild(s2);
})();
</script>
</body>`;
        
        if (html.includes('</body>')) {
          html = html.replace('</body>', injection);
        } else if (html.includes('</html>')) {
          html = html.replace('</html>', injection + '</html>');
        } else {
          html += injection;
        }
        
        return new Response(html, {
          status: response.status,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    return response;
  }
}
