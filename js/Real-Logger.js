// real-logger.js - سجل الصفحات الحقيقية فقط - ضعه في /js/real-logger.js في GitHub
// هذا الملف هو السبب في عدم ظهور البيانات - كان غير موجود (404)
(function(){
  function getDevice(){
    const ua=navigator.userAgent;
    if(/Android/i.test(ua)){
      const m=ua.match(/Android.*;\s*(.*?)\s+Build/);
      return m?m[1].trim().substring(0,50):'Android Phone';
    }
    if(/iPhone/i.test(ua)) return 'iPhone';
    if(/iPad/i.test(ua)) return 'iPad';
    if(/Windows/i.test(ua)) return 'Windows PC';
    if(/Mac/i.test(ua)) return 'Mac';
    return 'Unknown Device';
  }
  async function logReal(){
    const page=location.pathname+location.search;
    const site=location.hostname.includes('salary-portal')?'salary-portal':location.hostname.includes('turso')?'turso-api':location.hostname.includes('hafez')?'hafez-api':location.hostname||'salary-portal';
    const device=getDevice();
    const now=new Date().toISOString().slice(0,19).replace('T',' ');
    const ua=navigator.userAgent.substring(0,200);
    
    // حفظ محلي فوري - حتى لو فشل Turso ستظهر البيانات
    try{
      let local=JSON.parse(localStorage.getItem('real_page_logs')||'[]');
      local.push({page,site,device_model:device,created_at:now,user_agent:ua});
      if(local.length>200) local=local.slice(-200);
      localStorage.setItem('real_page_logs',JSON.stringify(local));
      console.log('✅ LOCAL LOG:',page,now);
    }catch(e){}

    // حفظ في Turso - الجدول موجود كما في صورتك
    const apis=[
      'https://turso-api.mostafa-voic77729.workers.dev/api/turso',
      '/api/turso'
    ];
    for(const api of apis){
      try{
        const res=await fetch(api,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            sql:'INSERT INTO real_page_logs (page, site, device_model, ip, user_agent, created_at) VALUES (?,?,?,?,?,?)',
            params:[page, site, device, '', ua, now]
          })
        });
        const data=await res.json();
        console.log('✅ TURSO LOG via',api,data);
        if(res.ok) return;
      }catch(e){
        console.log('❌ TURSO FAIL',api,e.message);
        // جرب بدون params
        try{
          const res2=await fetch(api,{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({
              sql:`INSERT INTO real_page_logs (page, site, device_model, user_agent, created_at) VALUES ('${page.replace(/'/g,"''")}', '${site}', '${device.replace(/'/g,"''")}', '${ua.replace(/'/g,"''").substring(0,100)}', '${now}')`
            })
          });
          const d2=await res2.json();
          console.log('✅ TURSO LOG2',d2);
          if(res2.ok) return;
        }catch(e2){}
      }
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',logReal);
  else logReal();
})();
