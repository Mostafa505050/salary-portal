
export async function onRequest(context) {
  const env = context.env || {};
  const url = env.TURSO_URL || env.LIBSQL_URL || "";
  const token = env.TURSO_TOKEN || env.LIBSQL_TOKEN || env.TURSO_AUTH_TOKEN || "";
  
  let blocked = [];
  let source = 'none';
  
  if (url && token) {
    try {
      const httpUrl = url.replace('libsql://', 'https://').replace('wss://','https://');
      const res = await fetch(httpUrl, {
        method:'POST',
        headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
        body: JSON.stringify({statements:["SELECT \"اسم_الصفحة\" FROM \"صفحات_الموقع\" WHERE \"مفعلة\"=0"]})
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data[0] && data[0].results) {
          const cols = data[0].results.columns || [];
          const idx = cols.indexOf("اسم_الصفحة");
          if (idx>=0) {
            blocked = data[0].results.rows.map(r=>String(r[idx]||"").toLowerCase().trim()).filter(Boolean);
            source = 'turso-direct';
          }
        }
      }
    } catch(e) { source = 'turso-error:'+e.message; }
  }

  if (blocked.length===0) {
    try {
      const res = await fetch("https://auth-api.mostafa-voic77729.workers.dev/api/blocked-list");
      if (res.ok) {
        const d = await res.json();
        if (d.blocked && d.blocked.length>0) {
          blocked = d.blocked;
          source = 'auth-api';
        }
      }
    } catch(e) {}
  }

  // احتياطي دائم - يعمل حتى بدون env
  if (blocked.length===0) {
    blocked = ['addhafez1.html', 'tables.html', 'salaryold.html'];
    source = 'fallback-hardcoded-from-image_c3958f';
  }

  return new Response(JSON.stringify({
    blocked, 
    count:blocked.length, 
    table:'صفحات_الموقع', 
    column:'مفعلة', 
    rule:'0=منع,1=سماح', 
    hasEnv:!!(url&&token), 
    source,
    time:new Date().toISOString(),
    note: hasEnv ? '✅ ديناميكي من Turso' : '⚠️ احتياطي - أضف TURSO_URL و TURSO_TOKEN في Pages Settings ليصبح ديناميكي'
  }, null, 2), {
    headers:{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache'}
  });
}
