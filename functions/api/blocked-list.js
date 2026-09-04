
export async function onRequest(context) {
  const env = context.env || {};
  const url = env.TURSO_URL || env.LIBSQL_URL || "";
  const token = env.TURSO_TOKEN || env.LIBSQL_TOKEN || env.TURSO_AUTH_TOKEN || "";
  
  let blocked = [];
  
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
          }
        }
      }
    } catch(e) {}
  }

  if (blocked.length===0) {
    try {
      const res = await fetch("https://auth-api.mostafa-voic77729.workers.dev/api/blocked-list");
      if (res.ok) {
        const d = await res.json();
        blocked = d.blocked || [];
      }
    } catch(e) {}
  }

  if (blocked.length===0) blocked = ['addhafez1.html', 'tables.html'];

  return new Response(JSON.stringify({blocked, count:blocked.length, table:'صفحات_الموقع', rule:'مفعلة=0 منع', time:new Date().toISOString()}, null, 2), {
    headers:{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache'}
  });
}
