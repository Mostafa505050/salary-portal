// real-logger.js - حل جذري - يعمل حتى لو فشل Turso - يسجل بيانات حقيقية فقط
// ⚠️ مهم: في GitHub يجب أن يكون اسم الملف بالضبط: real-logger.js (حروف صغيرة)
// الصورة تظهر الملف باسم Real-Logger.js وهذا يسبب 404 على Cloudflare (Linux حساس لحالة الحروف)
// الحل: اذهب إلى GitHub > js > اضغط على Real-Logger.js > Rename > اكتب real-logger.js

(function(){
  const SAFE_LIMIT = 50000;
  const FULL_LIMIT = 100000;
  const TABLE = 'real_page_logs';
  const APIS = [
    'https://turso-api.mostafa-voic77729.workers.dev/api/turso',
    '/api/turso',
    'https://hafez-api.mostafa-voic77729.workers.dev/api/turso'
  ];

  function getDevice(){
    const ua=navigator.userAgent;
    if(/Android/i.test(ua)){
      const m=ua.match(/Android.*;\s*(.*?)\s+Build/i);
      return m ? m[1].trim().substring(0,50) : 'Android Phone';
    }
    if(/iPhone/i.test(ua)) return 'iPhone';
    if(/iPad/i.test(ua)) return 'iPad';
    if(/Windows/i.test(ua)) return 'Windows PC';
    if(/Mac/i.test(ua)) return 'Mac';
    if(/Linux/i.test(ua)) return 'Linux PC';
    return 'Unknown';
  }

  function nowLocal(){
    // تنسيق يفهمه Turso: YYYY-MM-DD HH:MM:SS
    const d=new Date();
    const pad=n=>String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  async function insertTurso(page, site, device, ua, created_at){
    // جرب 3 صيغ مختلفة لأن كل Worker قد يتوقع صيغة مختلفة
    const payloads = [
      { sql: `INSERT INTO ${TABLE} (page, site, device_model, ip, user_agent, created_at) VALUES (?,?,?,?,?,?)`, params: [page, site, device, '', ua, created_at] },
      { sql: `INSERT INTO ${TABLE} (page, site, device_model, user_agent, created_at) VALUES (?,?,?,?,?)`, params: [page, site, device, ua, created_at] },
      { sql: `INSERT INTO ${TABLE} (page, site, device_model, created_at) VALUES ('${page.replace(/'/g,"''")}', '${site}', '${device.replace(/'/g,"''")}', '${created_at}')` }
    ];

    for(const api of APIS){
      for(const payload of payloads){
        try{
          const res = await fetch(api, {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify(payload)
          });
          const text = await res.text();
          let data;
          try{ data=JSON.parse(text); }catch{ data={raw:text}; }
          console.log(`[real-logger] API ${api} payload ->`, res.status, data);
          if(res.ok && !text.includes('error') && !text.includes('Error')){
            return true; // نجح
          }
        }catch(e){
          console.log(`[real-logger] FAIL ${api}:`, e.message);
        }
      }
    }
    return false;
  }

  async function logRealPage(){
    const page = location.pathname + location.search;
    // لا تسجل صفحات المراقبة نفسها لتجنب التكرار
    if(page.includes('Real-Monitoring') || page.includes('debug') || page.includes('Debug')) {
      console.log('[real-logger] skip monitoring pages');
      return;
    }
    const site = location.hostname.includes('salary-portal') ? 'salary-portal' : location.hostname.includes('turso') ? 'turso-api' : location.hostname.includes('hafez') ? 'hafez-api' : 'salary-portal';
    const device = getDevice();
    const created_at = nowLocal();
    const ua = navigator.userAgent.substring(0,200);

    // 1. حفظ محلي فوري - يضمن ظهور البيانات حتى لو فشل Turso
    try{
      let local = JSON.parse(localStorage.getItem('real_page_logs')||'[]');
      local.push({ page, site, device_model: device, ip: '', user_agent: ua, created_at });
      if(local.length>500) local = local.slice(-500);
      localStorage.setItem('real_page_logs', JSON.stringify(local));
      console.log('✅ [real-logger] LOCAL SAVED:', page, created_at);
    }catch(e){ console.log('LOCAL FAIL', e); }

    // 2. حفظ في Turso (الجدول موجود كما في صورتك)
    const ok = await insertTurso(page, site, device, ua, created_at);
    if(ok){
      console.log('✅ [real-logger] TURSO SAVED:', page);
    } else {
      console.log('⚠️ [real-logger] TURSO FAILED - but local saved, will appear after merge');
      // حاول بـ sendBeacon كمحاولة أخيرة
      try{
        const blob = new Blob([JSON.stringify({ page, site, device_model: device, user_agent: ua, created_at })], {type:'application/json'});
        navigator.sendBeacon(APIS[0], blob);
      }catch{}
    }

    // 3. إذا كنا في صفحة المراقبة الحقيقية، ادمج البيانات المحلية مع Turso فوراً
    if(location.pathname.includes('Real-Monitoring-No-Fake') || location.pathname.includes('real-monitoring')){
      setTimeout(mergeLocalIntoMonitoring, 1000);
    }
  }

  function mergeLocalIntoMonitoring(){
    // هذه الدالة تعمل فقط في صفحة المراقبة - تدمج localStorage مع جدول Turso
    try{
      const local = JSON.parse(localStorage.getItem('real_page_logs')||'[]');
      if(local.length===0) return;
      const tbody = document.getElementById('realTable') || document.querySelector('tbody');
      const empty = document.getElementById('emptyReal');
      if(!tbody) return;
      
      // إذا كان الجدول فارغ من Turso، اعرض البيانات المحلية كحل جذري
      if(tbody.children.length===0 || tbody.innerText.includes('لا يوجد بيانات')){
        if(empty) empty.style.display='none';
        tbody.innerHTML='';
        local.slice(-20).reverse().forEach(r=>{
          const tr=document.createElement('tr');
          tr.style.background='#f0fdf4';
          const safePct = ((local.length / SAFE_LIMIT)*100).toFixed(1);
          tr.innerHTML=`<td>${r.created_at}</td><td><b>${r.page}</b> (محلي)</td><td>${r.site}</td><td>${r.device_model}</td><td>محلي</td><td>${safePct}%</td><td>✅ محلي</td>`;
          tbody.appendChild(tr);
        });
        // حدث الإحصائيات
        const todayStr = new Date().toISOString().split('T')[0];
        const todayCount = local.filter(r=> (r.created_at||'').startsWith(todayStr)).length;
        const el = document.getElementById('todayCount');
        if(el) el.innerText = todayCount + ' (محلي)';
        console.log('[real-logger] MERGED local data into monitoring page:', local.length);
      }
    }catch(e){ console.log('merge fail', e); }
  }

  // تسجيل فوري
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', logRealPage);
  } else {
    logRealPage();
  }

  // تسجيل عند تغيير الصفحة (SPA)
  let lastPage = location.pathname;
  setInterval(()=>{
    if(location.pathname!==lastPage){
      lastPage=location.pathname;
      logRealPage();
    }
  }, 2000);

  // إذا كنا في صفحة المراقبة، حاول الدمج كل 3 ثواني
  if(location.pathname.toLowerCase().includes('real-monitoring')){
    setInterval(mergeLocalIntoMonitoring, 3000);
    setTimeout(mergeLocalIntoMonitoring, 1500);
  }

  console.log('[real-logger] loaded - file name must be lowercase: real-logger.js - Current file:', document.currentScript?.src);
})();
