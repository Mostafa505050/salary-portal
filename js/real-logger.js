// real-logger.js V5 FINAL - IP إجباري حقيقي
(function(){
  const TABLE='real_page_logs';
  const APIS=['/api/turso','https://turso-api.mostafa-voic77729.workers.dev/api/turso'];
  let REAL_IP=localStorage.getItem('user_real_ip')||'جاري...';
  async function fetchIP(){
    try{
      const res=await fetch('/api/get-ip',{cache:'no-store'});
      if(res.ok){
        const data=await res.json();
        if(data.ip && data.ip!=='unknown'){
          REAL_IP=data.ip;
          localStorage.setItem('user_real_ip',REAL_IP);
          return REAL_IP;
        }
      }
    }catch{}
    try{
      const res=await fetch('https://api.ipify.org?format=json');
      const data=await res.json();
      if(data.ip){
        REAL_IP=data.ip;
        localStorage.setItem('user_real_ip',REAL_IP);
        return REAL_IP;
      }
    }catch{}
    REAL_IP=localStorage.getItem('user_real_ip')||'unknown';
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
  function getSite(){
    if(location.hostname.includes('salary-portal')) return 'salary-portal';
    return location.hostname||'salary-portal';
  }
  function saveLocal(page,site,device,ip,created_at){
    try{
      let arr=JSON.parse(localStorage.getItem('real_page_logs')||'[]');
      arr.push({page,site,device_model:device,ip,created_at});
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
    const site=getSite();
    const device=getDevice();
    const created_at=nowStr();
    const ip=await fetchIP();
    saveLocal(page,site,device,ip,created_at);
    await saveTurso(page,site,device,ip,created_at);
    if(location.href.toLowerCase().includes('real-monitoring')){
      setTimeout(()=>{ try{ const local=JSON.parse(localStorage.getItem('real_page_logs')||'[]'); const tbody=document.getElementById('realTable'); if(tbody && local.length>0){ tbody.innerHTML=''; const today=new Date().toISOString().slice(0,10); const cnt=local.filter(r=>(r.created_at||'').includes(today)).length; local.slice(-30).reverse().forEach(r=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${r.created_at}</td><td><b>${r.page}</b></td><td>${r.site}</td><td>${r.device_model}</td><td style="color:#dc2626;font-weight:800">${r.ip}</td><td>${((cnt/50000)*100).toFixed(1)}%</td><td><button onclick="blockDevice('${r.ip}','${r.device_model}')" style="background:#ef4444;color:#fff;border:none;padding:4px 8px;border-radius:6px">حظر</button></td>`; tbody.appendChild(tr); }); } }catch{} },800);
    }
  }
  window.blockDevice=async function(ip,device){
    if(!ip || ip==='local' || ip==='manual' || ip==='unknown' || !ip.includes('.')){ alert('IP غير حقيقي: '+ip+' - افتح من https://salary-portal... و تأكد /api/get-ip يعمل'); return; }
    if(!confirm('حظر '+ip+'؟')) return;
    await fetch('/api/turso',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql:'INSERT INTO blocked_devices (device_model,ip,reason,created_at) VALUES (?,?,?,datetime("now","localtime"))',params:[device,ip,'محظور']})});
    alert('تم حظر '+ip); location.reload();
  };
  fetchIP().then(()=>{ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',logPage); else logPage(); });
})();
