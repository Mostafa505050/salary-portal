
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const page = url.searchParams.get('page') || 'AddHafez1.html';
  const low = page.toLowerCase().replace('.html','');

  const env = context.env || {};
  const tursoUrl = env.TURSO_URL || env.LIBSQL_URL || "";
  const token = env.TURSO_TOKEN || env.LIBSQL_TOKEN || "";

  let blockedList = [];
  let source = 'fallback';

  if (tursoUrl && token) {
    try {
      const httpUrl = tursoUrl.replace('libsql://', 'https://');
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
          blockedList = data[0].results.rows.map(r=>String(r[idx]||"").toLowerCase()).filter(Boolean);
          source = 'turso-direct';
        }
      }
    } catch(e) {}
  }

  const isBlocked = blockedList.some(b=>{
    const bl = b.toLowerCase().replace('.html','');
    return bl===low || low.includes(bl) || bl.includes(low);
  });

  return new Response(JSON.stringify({query:page, blocked:isBlocked, blockedList, source, hasEnv:!!(tursoUrl&&token), time:new Date().toISOString()}, null, 2), {
    headers:{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache'}
  });
}
