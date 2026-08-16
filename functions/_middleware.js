// functions/_middleware.js - نسخة اختبار مبسطة جداً (تثبت أن Middleware يعمل)
export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  console.log(`[MW] ${url.pathname}`);
  
  const response = await next();
  
  // احقن سكريبت بسيط جداً بدون أي اقتباسات عربية معقدة
  const simpleGuard = `<script>
console.log('%c[MW] Middleware ACTIVE - Guard injected!', 'color: lime; background: black; padding: 4px; font-size: 14px;');
console.log('[MW] Page:', location.pathname);
(function(){
  const key = 'salary_portal_page_status';
  try {
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    console.log('[Guard] localStorage data:', data);
    const page = (location.pathname.split('/').pop() || 'index.html');
    const pageName = page === '' ? 'index.html' : page;
    console.log('[Guard] Checking page:', pageName);
    if (data[pageName] && data[pageName].enabled === false) {
      console.log('[Guard] BLOCKING', pageName);
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8f9fb;font-family:Tajawal"><div style="text-align:center;background:white;padding:40px;border-radius:16px;border:1px solid #e2e8f0"><div style="font-size:48px">⛔</div><h2>الصفحة معطلة</h2><p>'+pageName+' معطلة (localStorage)</p><a href="/database-manager-FIXED.html" style="padding:8px 16px;background:#0f172a;color:white;border-radius:8px;text-decoration:none">لوحة التحكم</a></div></div>';
    }
  } catch(e) {
    console.log('[Guard] Error:', e);
  }
})();
</script>`;

  try {
    return new HTMLRewriter()
      .on('head', {
        element(el) {
          el.append(simpleGuard, { html: true });
        }
      })
      .transform(response);
  } catch (e) {
    console.log('[MW] HTMLRewriter error:', e);
    return response;
  }
}
