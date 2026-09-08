
// real-logger.js - يسجل الصفحات الحقيقية فقط بالوقت والتاريخ - لا بيانات وهمية
(function(){
  function getDeviceModel(){
    const ua = navigator.userAgent;
    if(/Android/i.test(ua)){
      const m = ua.match(/Android.*; (.*) Build/);
      return m ? m[1].trim().substring(0,50) : 'Android Phone';
    }
    if(/iPhone/i.test(ua)) return 'iPhone';
    if(/iPad/i.test(ua)) return 'iPad';
    if(/Windows/i.test(ua)) return 'Windows PC';
    if(/Mac/i.test(ua)) return 'Mac';
    return 'Unknown Device';
  }

  async function logRealPage(){
    const page = location.pathname + location.search;
    const site = location.hostname.includes('salary-portal') ? 'salary-portal' : location.hostname.includes('turso-api') ? 'turso-api' : location.hostname.includes('hafez-api') ? 'hafez-api' : 'unknown';
    const device = getDeviceModel();
    const now = new Date().toISOString();

    try{
      await fetch('https://turso-api.mostafa-voic77729.workers.dev/api/turso', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          sql: 'INSERT INTO real_page_logs (page, site, device_model, ip, user_agent, created_at) VALUES (?,?,?,?,?,?)',
          params: [page, site, device, '', navigator.userAgent.substring(0,200), now]
        })
      });
      console.log('✅ تم تسجيل صفحة حقيقية:', page, now);
    }catch(e){
      console.log('فشل التسجيل الحقيقي', e);
    }
  }

  // تسجيل فوري عند دخول أي صفحة - بيانات حقيقية فقط
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', logRealPage);
  else logRealPage();
})();
