// real-logger.js V5 FINAL - يصلح زر الحظر + IP حقيقي
// سبب زر الحظر لا يفعل شيء: كان يحاول حظر IP = local/manual + /api/turso لا يعمل
// هذا الإصدار يصلح كل شيء

(function(){
  const TABLE='real_page_logs';
  const APIS=['/api/turso','https://turso-api.mostafa-voic77729.workers.dev/api/turso'];
  let REAL_IP = localStorage.getItem('user_real_ip') || '';
  
  async function fetchIP(){
    try{
      const res = await fetch('/api/get-ip', {cache:'no-store'});
      if(res.ok){
        const data = await res.json();
        if(data.ip && data.ip!=='unknown'){
          REAL_IP = data.ip;
          localStorage.setItem('user_real_ip', REAL_IP);
          console.log('✅ IP from Worker:', REAL_IP);
          return REAL_IP;
        }
      }
    }catch{}
    try{
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      if(data.ip){
        REAL_IP = data.ip;
        localStorage.setItem('user_real_ip', REAL_IP);
        return REAL_IP;
      }
    }catch{}
    REAL_IP = localStorage.getItem('user_real_ip') || 'unknown';
    return REAL_IP;
  }
  
  function getDevice(){
    const ua=navigator.userAgent;
    if(/Android/i.test(ua)){
      const m=ua.match(/Android.*;(.*?)\sBuild/i);
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
  
  function getPage(){
    let path=location.pathname;
    if(location.protocol==='file:') return location.href.split('/').pop().split('?')[0]||'index.html';
    let file=path.split('/').pop().split('?')[0];
    if(!file){ const segs=path.split('/').filter(s=>s); file=segs.pop()||'index.html'; }
    if(file==='html') file='hafez.html';
    return file;
  }
  
  function saveLocal(page,site,device,ip,created_at){
    try{
      let arr=JSON.parse(localStorage.getItem('real_page_logs')||'[]');
      arr.push({page,site,device_model:device,ip,created_at,user_agent:navigator.userAgent.substring(0,100)});
      if(arr.length>1000) arr=arr.slice(-1000);
      localStorage.setItem('real_page_logs',JSON.stringify(arr));
    }catch{}
  }
  
  async function saveTurso(page,site,device,ip,created_at){
    const ua=navigator.userAgent.substring(0,150);
    const sql=`INSERT INTO ${TABLE} (page,site,device_model,ip,user_agent,created_at) VALUES (?,?,?,?,?,?)`;
    const params=[page,site,device,ip,ua,created_at];
    for(const api of APIS){
      try{
        const res=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql,params})});
        const txt=await res.text();
        if(res.ok && !txt.toLowerCase().includes('error')) return true;
      }catch{}
    }
    return false;
  }
  
  async function logPage(){
    const page=getPage();
    const site=location.hostname.includes('salary-portal')?'salary-portal':location.hostname||'salary-portal';
    const device=getDevice();
    const created_at=nowStr();
    const ip=await fetchIP();
    console.log(`📊 ${page} | ${device} | IP:${ip}`);
    saveLocal(page,site,device,ip,created_at);
    await saveTurso(page,site,device,ip,created_at);
    if(location.href.toLowerCase().includes('real-monitoring')){
      setTimeout(showLocal,800);
    }
  }
  
  function showLocal(){
    try{
      const local=JSON.parse(localStorage.getItem('real_page_logs')||'[]');
      const tbody=document.getElementById('realTable');
      if(!tbody || local.length===0) return;
      tbody.innerHTML='';
      const today=new Date().toISOString().slice(0,10);
      const cnt=local.filter(r=>(r.created_at||'').includes(today)).length;
      local.slice(-30).reverse().forEach(r=>{
        const tr=document.createElement('tr');
        tr.innerHTML=`<td>${r.created_at}</td><td><b>${r.page}</b></td><td>${r.site}</td><td>${r.device_model}</td><td style="color:#dc2626;font-weight:800;background:#fee2e2;padding:2px 6px;border-radius:6px">${r.ip}</td><td>${((cnt/50000)*100).toFixed(1)}%</td><td><button onclick="window.blockDevice('${r.ip}','${r.device_model}')" style="background:#ef4444;color:#fff;border:none;padding:5px 10px;border-radius:6px;cursor:pointer">🚫 حظر</button></td>`;
        tbody.appendChild(tr);
      });
    }catch{}
  }
  
  window.blockDevice = async function(ip, device){
    console.log('blockDevice clicked', ip, device);
    if(!ip || ip==='local' || ip==='manual' || ip==='unknown' || ip==='' || !ip.includes('.')){
      alert('❌ لا يمكن حظر IP وهمي: '+ip+'\n\nالسبب: تفتح الصفحة من ملف محلي أو /api/get-ip لا يعمل\n\nالحل:\n1- تأكد أن Worker الجديد يحتوي على /api/get-ip و /api/turso\n2- افتح من https://salary-portal.mostafa-voic77729.workers.dev/Real-Monitoring\n3- امسح localStorage: localStorage.clear() ثم حدث');
      return;
    }
    if(!confirm('هل تريد حظر هذا الجهاز؟\nIP: '+ip+'\nالجهاز: '+device+'\n\nسيتم منعه من دخول كل الصفحات')) return;
    try{
      const sql='INSERT INTO blocked_devices (device_model, ip, reason, created_at) VALUES (?,?,?,datetime("now","localtime"))';
      const params=[device, ip, 'محظور من لوحة المراقبة - '+new Date().toLocaleString('ar-EG')];
      let ok=false;
      for(const api of APIS){
        try{
          const res=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql, params})});
          const txt=await res.text();
          console.log('block response', api, res.status, txt.slice(0,200));
          if(res.ok && !txt.toLowerCase().includes('error')){
            ok=true;
            break;
          }
        }catch(e){ console.log('block fail', api, e.message); }
      }
      if(ok){
        alert('✅ تم حظر IP: '+ip+'\nالجهاز: '+device+'\n\nالآن لن يستطيع الدخول للموقع');
        location.reload();
      } else {
        alert('❌ فشل الحظر - تأكد أن:\n1- Worker يحتوي على /api/turso\n2- التوكن صحيح\n3- جدول blocked_devices موجود');
      }
    }catch(e){
      alert('❌ خطأ: '+e.message);
    }
  };
  
  window.unblockDevice = async function(id){
    if(!confirm('فك حظر الجهاز رقم '+id+'؟')) return;
    try{
      await fetch('/api/turso',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql:'DELETE FROM blocked_devices WHERE id=?', params:[id]})});
      alert('✅ تم فك الحظر');
      location.reload();
    }catch(e){ alert('فشل: '+e.message); }
  };
  
  fetchIP().then(()=>{
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', logPage);
    else logPage();
  });
  
  console.log('[real-logger V5 FINAL] loaded');
})();
