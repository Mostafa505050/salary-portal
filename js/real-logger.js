// real-logger V6 - fix block button 
(function(){
  const APIS=['/api/turso','https://turso-api.mostafa-voic77729.workers.dev/api/turso'];
  let REAL_IP=localStorage.getItem('user_real_ip')||'';
  async function fetchIP(){
    try{
      const res=await fetch('/api/get-ip',{cache:'no-store'});
      if(res.ok){
        const data=await res.json();
        if(data.ip && data.ip!=='unknown'){ REAL_IP=data.ip; localStorage.setItem('user_real_ip',REAL_IP); return REAL_IP; }
      }
    }catch{}
    try{
      const res=await fetch('https://api.ipify.org?format=json');
      const data=await res.json();
      if(data.ip){ REAL_IP=data.ip; localStorage.setItem('user_real_ip',REAL_IP); return REAL_IP; }
    }catch{}
    return localStorage.getItem('user_real_ip')||'unknown';
  }
  function getDevice(){
    const ua=navigator.userAgent;
    if(/Android/i.test(ua)){ const m=ua.match(/Android.*;(.*?)\sBuild/i); return m?m[1].trim().substring(0,40):'Android'; }
    if(/iPhone/i.test(ua)) return 'iPhone';
    if(/Windows/i.test(ua)) return 'Windows PC';
    return 'PC';
  }
  function nowStr(){ const d=new Date(); const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; }
  function getPage(){ let path=location.pathname; if(location.protocol==='file:') return location.href.split('/').pop().split('?')[0]||'index.html'; let file=path.split('/').pop().split('?')[0]; if(!file){ const segs=path.split('/').filter(s=>s); file=segs.pop()||'index.html'; } if(file==='html') file='hafez.html'; return file; }
  async function logPage(){
    const page=getPage(); const site=location.hostname||'salary-portal'; const device=getDevice(); const created_at=nowStr(); const ip=await fetchIP();
    try{ let arr=JSON.parse(localStorage.getItem('real_page_logs')||'[]'); arr.push({page,site,device_model:device,ip,created_at}); if(arr.length>1000) arr=arr.slice(-1000); localStorage.setItem('real_page_logs',JSON.stringify(arr)); }catch{}
    const ua=navigator.userAgent.substring(0,150);
    const sql=`INSERT INTO real_page_logs (page,site,device_model,ip,user_agent,created_at) VALUES (?,?,?,?,?,?)`;
    const params=[page,site,device,ip,ua,created_at];
    for(const api of APIS){ try{ const res=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql,params})}); if(res.ok) break; }catch{} }
  }
  window.blockDevice=async function(ip,device){
    console.log('block',ip,device);
    if(!ip || !ip.includes('.') || ip==='local' || ip==='manual'){ alert('IP غير حقيقي: '+ip); return; }
    if(!confirm('حظر IP: '+ip+'\nالجهاز: '+device+'؟')) return;
    const sql="INSERT INTO blocked_devices (device_model, ip, reason, created_at) VALUES (?, ?, ?, datetime('now','localtime'))";
    const params=[device, ip, 'محظور من المراقبة'];
    let ok=false; let err='';
    for(const api of APIS){
      try{
        const res=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql,params})});
        const txt=await res.text();
        console.log('block resp',api,res.status,txt.slice(0,200));
        err=txt.slice(0,200);
        if(res.ok && !txt.toLowerCase().includes('error')){ ok=true; break; }
      }catch(e){ err=e.message; }
    }
    if(ok){ alert('✅ تم حظر '+ip); location.reload(); }
    else{ alert('❌ فشل الحظر: '+err+'\nتأكد من Worker و التوكن'); }
  };
  window.unblockDevice=async function(id){
    if(!confirm('فك حظر '+id+'؟')) return;
    await fetch('/api/turso',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql:'DELETE FROM blocked_devices WHERE id=?',params:[id]})});
    location.reload();
  };
  fetchIP().then(()=>{ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',logPage); else logPage(); });
})();
