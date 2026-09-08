// real-logger.js V5 - احترافي - IP إجباري + حظر + حقن تلقائي بدون script في كل صفحة
// يعمل تلقائياً عبر Worker injection - لا حاجة لكتابة <script src="/js/real-logger.js"> في كل صفحة
// لكنه يعمل أيضاً إذا كتبته يدوياً

(function(){
  const SAFE_LIMIT = 50000;
  const TABLE = 'real_page_logs';
  const APIS = [
    '/api/turso',
    'https://turso-api.mostafa-voic77729.workers.dev/api/turso'
  ];

  let REAL_IP = 'جاري الجلب...';
  let IP_FETCHED = false;

  // 1. جلب IP الحقيقي إجبارياً من Worker
  async function fetchRealIP(){
    try{
      const res = await fetch('/api/get-ip', {cache:'no-store'});
      const data = await res.json();
      REAL_IP = data.ip || 'unknown';
      IP_FETCHED = true;
      console.log('✅ REAL IP:', REAL_IP, data.country, data.city);
      // حفظ IP في localStorage للعرض الفوري
      localStorage.setItem('user_real_ip', REAL_IP);
      return REAL_IP;
    }catch(e){
      try{
        // محاولة ثانية من خدمة خارجية
        const res2 = await fetch('https://api.ipify.org?format=json');
        const data2 = await res2.json();
        REAL_IP = data2.ip || 'unknown';
        IP_FETCHED = true;
        localStorage.setItem('user_real_ip', REAL_IP);
        return REAL_IP;
      }catch{
        REAL_IP = localStorage.getItem('user_real_ip') || 'unknown';
        return REAL_IP;
      }
    }
  }

  function getDevice(){
    const ua=navigator.userAgent;
    if(/Android/i.test(ua)){
      const m=ua.match(/Android.*;(.*?)\sBuild/i);
      return m?m[1].trim().substring(0,40):'Android Phone';
    }
    if(/iPhone/i.test(ua)) return 'iPhone ' + (ua.match(/iPhone OS ([_\d]+)/)?.[1]||'');
    if(/iPad/i.test(ua)) return 'iPad';
    if(/Windows/i.test(ua)) return 'Windows PC';
    if(/Mac/i.test(ua)) return 'Mac';
    return 'PC';
  }

  function nowStr(){
    const d=new Date();
    const p=n=>String(n).padStart(2,'0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  function getPageName(){
    let path = location.pathname;
    if(location.protocol==='file:'){
      const file = location.href.split('/').pop().split('?')[0];
      return file || 'index.html';
    }
    let file = path.split('/').pop().split('?')[0];
    if(!file) {
      const segs = path.split('/').filter(s=>s);
      file = segs.pop() || 'index.html';
    }
    if(file==='html') file='hafez.html';
    return file;
  }

  function getSite(){
    if(location.protocol==='file:') return 'salary-portal';
    if(location.hostname.includes('salary-portal')) return 'salary-portal';
    return location.hostname || 'salary-portal';
  }

  function saveLocal(page, site, device, ip, created_at){
    try{
      let arr=JSON.parse(localStorage.getItem('real_page_logs')||'[]');
      arr.push({page, site, device_model: device, ip, created_at, user_agent: navigator.userAgent.substring(0,100)});
      if(arr.length>1000) arr=arr.slice(-1000);
      localStorage.setItem('real_page_logs', JSON.stringify(arr));
      return arr;
    }catch{ return []; }
  }

  async function saveTurso(page, site, device, ip, created_at){
    const ua=navigator.userAgent.substring(0,150);
    const sql=`INSERT INTO ${TABLE} (page, site, device_model, ip, user_agent, created_at) VALUES (?,?,?,?,?,?)`;
    const params=[page, site, device, ip, ua, created_at];
    for(const api of APIS){
      try{
        const res=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql, params})});
        const txt=await res.text();
        if(res.ok && !txt.toLowerCase().includes('error')){
          console.log('✅ TURSO SAVED IP:', ip);
          return true;
        }
      }catch{}
    }
    return false;
  }

  async function logPage(){
    const page = getPageName();
    const site = getSite();
    const device = getDevice();
    const created_at = nowStr();
    
    // جلب IP الحقيقي إجبارياً
    if(!IP_FETCHED){
      await fetchRealIP();
    }
    const ip = REAL_IP;

    console.log(`📊 REAL LOG: ${page} | ${device} | IP:${ip} | ${created_at}`);

    saveLocal(page, site, device, ip, created_at);
    await saveTurso(page, site, device, ip, created_at);

    // فحص الحظر
    checkIfBlocked(ip, device);

    // إذا في صفحة المراقبة، اعرض
    if(location.href.toLowerCase().includes('real-monitoring')){
      setTimeout(showInMonitoring, 800);
    }
  }

  async function checkIfBlocked(ip, device){
    try{
      const res=await fetch('/api/blocked-devices');
      const data=await res.json();
      const blocked = data.blocked || [];
      const isBlocked = blocked.some(b=> b.ip===ip || (b.device_model && device.includes(b.device_model)));
      if(isBlocked && !location.href.includes('blocked')){
        document.documentElement.innerHTML=`<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#fee2e2,#fecaca);font-family:Cairo,sans-serif;text-align:center;padding:20px" dir="rtl"><div style="background:#fff;border-radius:20px;padding:30px;max-width:400px;box-shadow:0 16px 40px rgba(0,0,0,0.15)"><div style="font-size:60px">🚫</div><h1 style="color:#dc2626">تم حظر جهازك</h1><p style="color:#64748b;font-size:13px">IP: ${ip}<br>الجهاز: ${device}<br>تواصل: 01092259655</p><button onclick="location.href='https://wa.me/201092259655'" style="padding:10px 20px;border:none;border-radius:10px;background:#25D366;color:#fff;font-weight:800">واتساب</button></div></div>`;
      }
    }catch{}
  }

  function showInMonitoring(){
    try{
      const local=JSON.parse(localStorage.getItem('real_page_logs')||'[]');
      const tbody=document.getElementById('realTable');
      if(!tbody || local.length===0) return;
      if(tbody.innerText.includes('لا يوجد بيانات') || local.length>0){
        tbody.innerHTML='';
        const todayStr=new Date().toISOString().slice(0,10);
        const todayCount=local.filter(r=> (r.created_at||'').includes(todayStr)).length;
        local.slice(-50).reverse().forEach(r=>{
          const tr=document.createElement('tr');
          tr.innerHTML=`<td>${r.created_at}</td><td><b>${r.page}</b></td><td>${r.site}</td><td>${r.device_model}</td><td style="font-weight:800;color:#dc2626">${r.ip||'unknown'}</td><td>${((todayCount/50000)*100).toFixed(1)}%</td><td><button onclick="blockDevice('${r.ip}','${r.device_model}')" style="padding:4px 8px;border:none;border-radius:6px;background:#ef4444;color:#fff;cursor:pointer;font-size:10px">🚫 حظر</button></td>`;
          tbody.appendChild(tr);
        });
      }
    }catch{}
  }

  window.blockDevice = async function(ip, device){
    if(!confirm(`حظر الجهاز IP:${ip} - ${device} ؟`)) return;
    try{
      await fetch('/api/turso',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql:'INSERT INTO blocked_devices (device_model, ip, reason, created_at) VALUES (?,?,?,datetime("now"))', params:[device, ip, 'محظور من لوحة المراقبة']})});
      alert('✅ تم حظر '+ip);
      location.reload();
    }catch(e){ alert('فشل: '+e.message); }
  }

  // تشغيل
  fetchRealIP().then(()=>{
    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded', logPage);
    } else {
      logPage();
    }
  });

  // مراقبة تغيير الصفحة
  let lastHref=location.href;
  setInterval(()=>{ if(location.href!==lastHref){ lastHref=location.href; logPage(); } }, 2000);

  console.log('[real-logger V5] PROFESSIONAL - IP compulsory + auto inject');
})();
