// real-logger.js - V4 - إصلاح كتابة /html بدل اسم الصفحة - بيانات حقيقية فقط
// المشكلة من صورتك: تفتح الملف من C:/Users/HP/Downloads/Real-Monitoring-Fixed.html ببروتوكول file://
// location.pathname في هذه الحالة = /C:/Users/HP/Downloads/... فيكتب المسار كامل
// الحل: استخراج اسم الملف فقط بدون المسار المحلي

(function(){
  const SAFE_LIMIT = 50000;
  const TABLE = 'real_page_logs';
  const APIS = [
    'https://turso-api.mostafa-voic77729.workers.dev/api/turso',
    '/api/turso'
  ];

  function getDevice(){
    const ua=navigator.userAgent;
    if(/Android/i.test(ua)){
      const m=ua.match(/Android.*;(.*?)\sBuild/);
      return m?m[1].trim().substring(0,40):'Android';
    }
    if(/iPhone/i.test(ua)) return 'iPhone';
    if(/Windows/i.test(ua)) return 'Windows PC';
    if(/Mac/i.test(ua)) return 'Mac';
    return 'PC';
  }

  function nowStr(){
    const d=new Date();
    const p=n=>String(n).padStart(2,'0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  function getRealPageName(){
    let path = location.pathname;
    let href = location.href;
    
    // إذا كان file:// مثل C:/Users/HP/Downloads/Real-Monitoring-Fixed.html
    if(location.protocol==='file:' || path.includes('C:/') || path.includes('/Users/')){
      // استخرج اسم الملف فقط من href
      // C:/Users/HP/Downloads/Real-Monitoring-Fixed.html -> Real-Monitoring-Fixed.html
      const parts = href.split('/').pop().split('\\').pop(); // آخر جزء
      const fileName = parts.split('?')[0].split('#')[0] || 'Real-Monitoring-No-Fake';
      console.log('[real-logger] FILE protocol detected, fileName:', fileName, 'from', href);
      // إذا كان الملف هو المراقبة نفسه، ارجع اسمه الحقيقي
      if(fileName.toLowerCase().includes('real-monitoring')){
        return fileName.replace('.html','').replace(/-/g,' ') + '.html';
      }
      return fileName || 'index.html';
    }
    
    // للمواقع العادية https://salary-portal.../hafez.html
    // location.pathname = /hafez.html أو /Real-Monitoring-No-Fake
    let fileName = path.split('/').pop(); // آخر جزء بعد /
    fileName = fileName.split('?')[0].split('#')[0]; // بدون query
    
    // إذا كان فارغ (مثل / أو /html/) خذ الجزء قبل الأخير
    if(!fileName || fileName===''){
      const segs = path.split('/').filter(s=>s!=='');
      fileName = segs.pop() || 'index.html';
    }
    
    // إذا كان /html/ أو html فقط، استخدم عنوان الصفحة أو المسار الكامل
    if(fileName==='html' || fileName==='html/'){
      // استخدم document.title أو المسار الكامل
      const title = document.title || 'صفحة غير معروفة';
      // حاول استخراج الاسم من title
      if(title.includes('مراقبة') || title.includes('بيانات حقيقية')){
        return 'Real-Monitoring-No-Fake.html';
      }
      return path || '/hafez.html';
    }
    
    // إذا بدون امتداد مثل /Real-Monitoring-No-Fake أضف .html للوضوح
    if(fileName && !fileName.includes('.') && fileName.length>2){
      return fileName; // اتركه كما هو مثل Real-Monitoring-No-Fake
    }
    
    return fileName || 'index.html';
  }

  function getSiteName(){
    if(location.protocol==='file:') return 'salary-portal (محلي)';
    if(location.hostname.includes('salary-portal')) return 'salary-portal';
    if(location.hostname.includes('turso')) return 'turso-api';
    if(location.hostname.includes('hafez')) return 'hafez-api';
    return location.hostname || 'salary-portal';
  }

  function saveLocal(page, site, device, created_at){
    try{
      let arr=JSON.parse(localStorage.getItem('real_page_logs')||'[]');
      // لا تكرر نفس الصفحة بنفس الثانية
      const last = arr[arr.length-1];
      if(last && last.page===page && last.created_at===created_at) return arr;
      
      arr.push({page, site, device_model: device, created_at, ip:'local', user_agent: navigator.userAgent.substring(0,100)});
      if(arr.length>500) arr=arr.slice(-500);
      localStorage.setItem('real_page_logs', JSON.stringify(arr));
      console.log('✅ LOCAL:', page, created_at);
      return arr;
    }catch(e){ return []; }
  }

  async function saveTurso(page, site, device, created_at){
    const ua=navigator.userAgent.substring(0,150);
    const sql=`INSERT INTO ${TABLE} (page, site, device_model, ip, user_agent, created_at) VALUES (?,?,?,?,?,?)`;
    const params=[page, site, device, '', ua, created_at];
    for(const api of APIS){
      try{
        const res=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql, params})});
        const txt=await res.text();
        console.log(`[TURSO ${api}]`, res.status, txt.substring(0,150));
        if(res.ok && !txt.toLowerCase().includes('error')) return true;
      }catch(e){ console.log(`FAIL ${api}`, e.message); }
    }
    return false;
  }

  async function logPage(){
    let page = getRealPageName();
    const site = getSiteName();
    const device = getDevice();
    const created_at = nowStr();

    console.log('[real-logger] REAL PAGE:', page, 'SITE:', site, 'HREF:', location.href);

    // إصلاح: إذا كتب /html/ أو مسار ويندوز، استبدله باسم حقيقي
    if(page.includes('C:/') || page.includes('Users') || page==='html' || page==='html/' || page==='/html/' || page.startsWith('C:')){
      page = document.title ? document.title.substring(0,50)+'.html' : 'Real-Monitoring-No-Fake.html';
      // إذا كنا في صفحة المراقبة، استخدم اسم واضح
      if(location.href.toLowerCase().includes('real-monitoring')){
        page = 'Real-Monitoring-No-Fake.html';
      } else if(location.href.toLowerCase().includes('hafez')){
        page = 'hafez-V53.html';
      }
      console.log('[real-logger] FIXED PAGE NAME:', page);
    }

    saveLocal(page, site, device, created_at);
    await saveTurso(page, site, device, created_at);

    if(location.pathname.toLowerCase().includes('real-monitoring') || location.href.toLowerCase().includes('real-monitoring')){
      setTimeout(showLocalInMonitoring, 800);
    }
  }

  function showLocalInMonitoring(){
    try{
      const local=JSON.parse(localStorage.getItem('real_page_logs')||'[]');
      if(local.length===0) return;
      const tbody=document.getElementById('realTable');
      if(!tbody) return;
      const isEmpty = tbody.innerText.includes('لا يوجد بيانات') || tbody.children.length===0;
      if(isEmpty || local.length>0){
        const empty=document.getElementById('emptyReal');
        if(empty) empty.style.display='none';
        tbody.innerHTML='';
        const todayStr=new Date().toISOString().slice(0,10);
        const todayCount=local.filter(r=> (r.created_at||'').includes(todayStr)).length;
        local.slice(-50).reverse().forEach(r=>{
          // تنظيف اسم الصفحة من المسارات المحلية
          let cleanPage = r.page;
          if(cleanPage.includes('C:/') || cleanPage.includes('Users/')){
            cleanPage = cleanPage.split('/').pop().split('\\').pop();
          }
          if(cleanPage==='html' || cleanPage==='html/') cleanPage='hafez-V53.html';
          
          const tr=document.createElement('tr');
          const pct=((todayCount/50000)*100).toFixed(2);
          tr.innerHTML=`<td>${r.created_at}</td><td><b>${cleanPage}</b></td><td>${r.site}</td><td>${r.device_model}</td><td>حقيقي-محلي</td><td>${pct}%</td><td>✅ ${todayCount<50000?'آمن':'تحذير'}</td>`;
          tr.style.background='#f0fdf4';
          tbody.appendChild(tr);
        });
        const todayEl=document.getElementById('todayCount');
        if(todayEl) todayEl.innerText=todayCount;
        const monthEl=document.getElementById('monthCount');
        if(monthEl) monthEl.innerText=local.length;
        console.log('[MERGE] عرض', local.length, 'سجل حقيقي');
      }
    }catch(e){ console.log('merge error', e); }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', logPage);
  } else {
    logPage();
  }

  if(location.href.toLowerCase().includes('real-monitoring')){
    setInterval(showLocalInMonitoring, 2000);
    setTimeout(showLocalInMonitoring, 1000);
  }

  console.log('[real-logger] V4 FIXED loaded - page:', getRealPageName(), 'from', location.href);
})();
