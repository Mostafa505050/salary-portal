// _worker.js - حل جذري إجباري - منع من السيرفر مباشرة
const BLOCKED = ['tables.html', 'tables', 'AddHafez1.html', 'AddHafez1'];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname.toLowerCase();
    let pageName = url.pathname.split('/').pop() || 'index.html';
    
    // فحص إجباري قبل أي شيء
    if (BLOCKED.some(b => b.toLowerCase() === pageName.toLowerCase() || pathname.includes(b.toLowerCase()))) {
      return new Response(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>معطلة إجبارياً</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f172a;color:white;font-family:Tajawal;direction:rtl} .card{background:rgba(255,255,255,0.06);padding:48px;border-radius:24px;text-align:center;border:1px solid rgba(255,255,255,0.1)} .icon{font-size:80px} h2{font-size:26px} p{color:#94a3b8} a{display:inline-block;margin-top:20px;padding:12px 24px;background:white;color:#0f172a;border-radius:12px;text-decoration:none;font-weight:800}</style></head><body><div class="card"><div class="icon">⛔</div><h2>الصفحة معطلة - منع إجباري جذري</h2><p>${pageName}</p><p>تم منعها من السيرفر مباشرة - لا يمكن تجاوزها</p><p style="font-size:11px;color:#f87171;margin-top:12px">🛡️ RADICAL MANDATORY - BLOCKED AT EDGE</p><a href="/Database-Manager.html">لوحة التحكم</a></div></body></html>`, {
        status: 403,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Blocked-By': 'RADICAL-v9' }
      });
    }
    
    try {
      const res = await env.ASSETS.fetch(request);
      return res;
    } catch(e) {
      return new Response('404', {status:404});
    }
  }
}
