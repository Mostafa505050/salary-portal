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

// ========== دوال جديدة مضافة فقط - لم يتم تعديل أي دالة قديمة - إصلاح الحظر ==========

// دالة جديدة 1: جلب IP بطريقة مضمونة إضافية
async function fetchIPFixed(){
  try{
    const res = await fetch('/api/get-ip-fixed', {cache:'no-store'});
    if(res.ok){
      const data = await res.json();
      if(data.ip && data.ip!=='unknown') return data.ip;
    }
  }catch{}
  try{
    const res = await fetch('/api/get-ip', {cache:'no-store'});
    if(res.ok){
      const data = await res.json();
      if(data.ip && data.ip!=='unknown') return data.ip;
    }
  }catch{}
  return localStorage.getItem('user_real_ip')||'unknown';
}

// دالة جديدة 2: حظر جهاز بطريقة مضمونة 100% - تستخدم endpoint جديد بدون datetime
window.blockDeviceFixed = async function(ip, device){
  console.log('blockDeviceFixed clicked', ip, device);
  if(!ip || !ip.includes('.') || ip==='local' || ip==='manual' || ip==='unknown'){
    alert('❌ IP غير حقيقي: '+ip+'\nافتح من الموقع وليس ملف محلي');
    return;
  }
  if(!confirm('حظر IP: '+ip+'\nالجهاز: '+device+'\n\nسيتم منعه من دخول كل الصفحات؟')) return;
  
  // استخدام endpoint جديد مضمون - لا يحتوي على datetime("now") بعلامات مزدوجة
  const payload = {ip: ip, device_model: device, reason: 'محظور من لوحة المراقبة - '+new Date().toLocaleString('ar-EG')};
  let ok=false;
  let errMsg='';
  
  // محاولة 1: endpoint الجديد المضمون
  try{
    const res = await fetch('/api/block-device-fixed', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    const txt = await res.text();
    console.log('block-device-fixed response', res.status, txt.slice(0,300));
    errMsg = txt.slice(0,300);
    if(res.ok){
      const data = JSON.parse(txt);
      if(data.success){ ok=true; }
    }
  }catch(e){ errMsg=e.message; }
  
  // محاولة 2: endpoint القديم كاحتياطي
  if(!ok){
    try{
      const res = await fetch('/api/turso', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({sql:"INSERT INTO blocked_devices (device_model, ip, reason) VALUES (?, ?, ?)", params:[device, ip, 'محظور من المراقبة']})});
      const txt = await res.text();
      console.log('fallback turso response', res.status, txt.slice(0,200));
      if(res.ok && !txt.toLowerCase().includes('error')) ok=true;
      else errMsg=txt.slice(0,200);
    }catch(e){ errMsg=e.message; }
  }
  
  if(ok){
    alert('✅ تم حظر IP: '+ip+'\nالجهاز: '+device+'\n\nالآن لن يستطيع الدخول');
    location.reload();
  } else {
    alert('❌ فشل الحظر\nالخطأ: '+errMsg+'\n\nتأكد من:\n1- Worker الجديد يحتوي التوكن\n2- جدول blocked_devices موجود\n3- افتح Console F12');
  }
};

// دالة جديدة 3: فك حظر بطريقة مضمونة
window.unblockDeviceFixed = async function(id){
  if(!confirm('فك حظر الجهاز رقم '+id+'؟')) return;
  try{
    const res = await fetch('/api/unblock-device-fixed', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id:id})});
    const txt = await res.text();
    console.log('unblock response', txt.slice(0,200));
    alert('✅ تم فك الحظر');
    location.reload();
  }catch(e){
    // fallback
    try{
      await fetch('/api/turso',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({sql:'DELETE FROM blocked_devices WHERE id=?', params:[id]})});
      location.reload();
    }catch(err){ alert('فشل: '+err.message); }
  }
};

// دالة جديدة 4: تسجيل حقيقي مضمون إضافي
async function logRealPageFixed(){
  const page = (typeof getPage==='function'?getPage():location.pathname);
  const site = location.hostname||'salary-portal';
  const device = (typeof getDevice==='function'?getDevice():'PC');
  const ip = await fetchIPFixed();
  console.log('📊 FIXED LOG:', page, device, ip);
  try{
    await fetch('/api/turso',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({sql:'INSERT INTO real_page_logs (page, site, device_model, ip) VALUES (?, ?, ?, ?)', params:[page, site, device, ip]})});
  }catch{}
}

// دالة جديدة 5: اختبار الحظر يدوياً
window.testBlockFixed = async function(){
  const ip = await fetchIPFixed();
  const device = (typeof getDevice==='function'?getDevice():'Test Device');
  alert('IP الحالي: '+ip+'\nالجهاز: '+device+'\n\nسيتم محاولة حظر هذا IP كاختبار');
  window.blockDeviceFixed(ip, device);
};

// ========== ميزة IP واحد فقط - دوال جديدة في real-logger - إضافة فقط ==========

// دالة جديدة: تفعيل وضع IP واحد
window.enableSingleIPModeFixed = async function(allowedIP){
  try{
    const res = await fetch('/api/enable-single-ip', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ip: allowedIP})});
    const data = await res.json();
    return data;
  }catch(e){ return {success:false, error:e.message}; }
};

// دالة جديدة: إلغاء وضع IP واحد
window.disableSingleIPModeFixed = async function(){
  try{
    const res = await fetch('/api/disable-single-ip', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({})});
    const data = await res.json();
    return data;
  }catch(e){ return {success:false, error:e.message}; }
};

// دالة جديدة: جلب حالة القائمة البيضاء
window.getWhitelistModeFixed = async function(){
  try{
    const res = await fetch('/api/whitelist-mode');
    const data = await res.json();
    return data;
  }catch(e){ return {mode:'all', allowed_ip:null}; }
};

// دالة جديدة: إنشاء Checkbox في صفحة المراقبة
window.createWhitelistUIFixed = function(containerId){
  const container = document.getElementById(containerId);
  if(!container) return;
  
  // جلب IP الحالي
  fetch('/api/get-ip').then(r=>r.json()).then(ipData=>{
    const currentIP = ipData.ip||'';
    container.innerHTML = `
      <div style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border:2px solid #f59e0b;border-radius:14px;padding:16px;margin:16px 0">
        <h3 style="margin:0 0 12px;font-size:14px;color:#92400e">🔐 ميزة IP واحد فقط - السماح لجهاز واحد وحظر الباقي</h3>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:800;background:#fff;padding:8px 12px;border-radius:8px;border:1.5px solid #fcd34d">
            <input type="checkbox" id="singleIPCheckbox" style="width:20px;height:20px" onchange="window.toggleSingleIPFixed(this.checked)">
            تفعيل وضع IP واحد فقط
          </label>
          <input type="text" id="allowedIPInput" value="${currentIP}" placeholder="45.102.74.114" style="padding:8px 12px;border:1.5px solid #fcd34d;border-radius:8px;font-family:monospace;width:170px;font-weight:700">
          <button onclick="window.applySingleIPUIFixed()" style="padding:8px 14px;background:#f59e0b;color:#fff;border:none;border-radius:8px;font-weight:800;cursor:pointer">🔒 تطبيق الحظر</button>
          <button onclick="window.allowAllUIFixed()" style="padding:8px 14px;background:#10b981;color:#fff;border:none;border-radius:8px;font-weight:800;cursor:pointer">✅ السماح للجميع</button>
        </div>
        <div id="whitelistStatusFixed" style="background:#fff;padding:10px;border-radius:8px;font-size:12px;color:#92400e;border:1px solid #fde68a">⏳ جاري تحميل الحالة...</div>
        <div style="margin-top:10px;background:#fef3c7;padding:8px;border-radius:6px;font-size:11px;color:#92400e;line-height:1.6">
          <b>💡 كيف تعمل:</b><br>
          • <b>عند التفعيل:</b> فقط الـ IP المكتوب يدخل الموقع، أي IP آخر يرى صفحة <b>🚫 تم حظر جهازك - وضع IP واحد مفعل</b><br>
          • <b>عند الإلغاء:</b> يعود السماح للجميع مع إمكانية حظر أجهزة محددة من جدول الأجهزة المحظورة<br>
          • <b>مثال:</b> إذا كنت تريد الموقع لك فقط، ضع IP الخاص بك ${currentIP} وفعّل الوضع
        </div>
      </div>
    `;
    
    // تحميل الحالة
    window.getWhitelistModeFixed().then(data=>{
      const cb=document.getElementById('singleIPCheckbox');
      const inp=document.getElementById('allowedIPInput');
      const status=document.getElementById('whitelistStatusFixed');
      if(data.mode==='single'){
        if(cb) cb.checked=true;
        if(inp && data.allowed_ip) inp.value=data.allowed_ip;
        if(status) status.innerHTML=`🔒 <b>الوضع الحالي:</b> IP واحد فقط - المسموح: <span style="background:#fee2e2;color:#dc2626;padding:3px 8px;border-radius:6px;font-family:monospace;font-weight:800">${data.allowed_ip}</span> - باقي IPs محظورة (${data.count||0} محاولة محظورة)`;
      } else {
        if(status) status.innerHTML=`✅ <b>الوضع الحالي:</b> السماح للجميع - ${data.total_blocked||0} جهاز محظور محدد`;
      }
    });
  });
};

window.toggleSingleIPFixed = async function(checked){
  if(checked){
    await window.applySingleIPUIFixed();
  } else {
    await window.allowAllUIFixed();
  }
};

window.applySingleIPUIFixed = async function(){
  const ip = document.getElementById('allowedIPInput')?.value?.trim();
  if(!ip || !ip.includes('.')){ alert('❌ أدخل IP صحيح'); return; }
  if(!confirm(`🔒 تفعيل وضع IP واحد فقط؟\n\nIP المسموح: ${ip}\nباقي الأجهزة ستحظر\n\nمتأكد؟`)) return;
  const result = await window.enableSingleIPModeFixed(ip);
  if(result.success){
    alert(`✅ تم التفعيل\nالمسموح: ${ip}\nالباقي محظور`);
    location.reload();
  } else {
    alert('❌ فشل: '+(result.error||'خطأ'));
  }
};

window.allowAllUIFixed = async function(){
  if(!confirm('✅ السماح للجميع وإلغاء وضع IP واحد؟')) return;
  const result = await window.disableSingleIPModeFixed();
  if(result.success){
    alert('✅ تم السماح للجميع');
    location.reload();
  } else {
    alert('❌ فشل: '+(result.error||'خطأ'));
  }
};

// دالة جديدة: اختبار هل IP الحالي مسموح
window.checkIfCurrentIPAllowedFixed = async function(){
  const mode = await window.getWhitelistModeFixed();
  if(mode.mode==='single'){
    const currentRes = await fetch('/api/get-ip');
    const currentData = await currentRes.json();
    const currentIP = currentData.ip;
    if(currentIP!==mode.allowed_ip){
      console.log('🚫 IP الحالي محظور في وضع IP واحد:', currentIP, 'المسموح:', mode.allowed_ip);
      return false;
    }
  }
  return true;
};

// ========== ميزة السماح لعدة IPs - قائمة بيضاء متعددة - دوال جديدة مضافة فقط ==========

window.addAllowedIPFixed = async function(ip, reason){
  try{
    const res = await fetch('/api/add-allowed-ip', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ip: ip, reason: reason||'مسموح'})});
    const data = await res.json();
    return data;
  }catch(e){ return {success:false, error:e.message}; }
};

window.removeAllowedIPFixed = async function(ip){
  try{
    const res = await fetch('/api/remove-allowed-ip', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ip: ip})});
    const data = await res.json();
    return data;
  }catch(e){ return {success:false, error:e.message}; }
};

window.getAllowedIPsFixed = async function(){
  try{
    const res = await fetch('/api/allowed-ips');
    const data = await res.json();
    return data;
  }catch(e){ return {allowed:[], mode:'all'}; }
};

window.enableWhitelistModeFixed = async function(){
  try{
    const res = await fetch('/api/enable-whitelist', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({})});
    const data = await res.json();
    return data;
  }catch(e){ return {success:false, error:e.message}; }
};

window.disableWhitelistModeFixed = async function(){
  try{
    const res = await fetch('/api/disable-whitelist', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({})});
    const data = await res.json();
    return data;
  }catch(e){ return {success:false, error:e.message}; }
};

window.createMultiIPUIFixed = function(containerId){
  const container = document.getElementById(containerId);
  if(!container) return;
  
  fetch('/api/get-ip').then(r=>r.json()).then(ipData=>{
    const currentIP = ipData.ip||'';
    container.innerHTML = `
      <div style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:2px solid #10b981;border-radius:14px;padding:16px;margin:16px 0">
        <h3 style="margin:0 0 12px;font-size:14px;color:#065f46">✅ إضافة أي IP للسماح - قائمة بيضاء متعددة</h3>
        <div style="background:#fff;border-radius:10px;padding:12px;margin-bottom:12px;border:1px solid #a7f3d0">
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px">
            <input type="text" id="newAllowedIP2" value="${currentIP}" placeholder="45.102.74.114" style="padding:8px 12px;border:1.5px solid #6ee7b7;border-radius:8px;font-family:monospace;width:180px;font-weight:700">
            <input type="text" id="newAllowedReason2" placeholder="السبب مثل: مكتب الإدارة" style="padding:8px 12px;border:1.5px solid #6ee7b7;border-radius:8px;width:180px">
            <button onclick="window.addNewAllowedIP2Fixed()" style="padding:8px 14px;background:#10b981;color:#fff;border:none;border-radius:8px;font-weight:800;cursor:pointer">➕ إضافة IP للسماح</button>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:800;background:#ecfdf5;padding:8px 12px;border-radius:8px;border:1.5px solid #6ee7b7">
              <input type="checkbox" id="whitelistModeCheckbox2" style="width:20px;height:20px" onchange="window.toggleWhitelist2Fixed(this.checked)">
              تفعيل وضع القائمة البيضاء (فقط المسموحين)
            </label>
            <button onclick="window.refreshAllowed2Fixed()" style="padding:6px 12px;background:#059669;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer">🔄 تحديث</button>
            <button onclick="window.allowAllMulti2Fixed()" style="padding:6px 12px;background:#6b7280;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer">✅ السماح للجميع</button>
          </div>
        </div>
        <div id="allowedIPsList2Fixed" style="background:#fff;border-radius:10px;padding:10px;border:1px solid #a7f3d0;max-height:300px;overflow-y:auto">⏳ جاري تحميل...</div>
        <div id="multiIPStatus2Fixed" style="margin-top:10px;background:#fff;padding:10px;border-radius:8px;font-size:12px;color:#065f46;border:1px solid #a7f3d0">⏳ جاري تحميل الحالة...</div>
      </div>
    `;
    window.refreshAllowed2Fixed();
  });
};

window.refreshAllowed2Fixed = async function(){
  const listDiv=document.getElementById('allowedIPsList2Fixed');
  const statusDiv=document.getElementById('multiIPStatus2Fixed');
  const cb=document.getElementById('whitelistModeCheckbox2');
  try{
    const data=await window.getAllowedIPsFixed();
    const allowed=data.allowed||[];
    const mode=data.mode||'all';
    if(listDiv){
      if(allowed.length===0){
        listDiv.innerHTML='<div style="text-align:center;color:#6b7280;padding:20px">لا يوجد IPs - أضف أول IP</div>';
      } else {
        listDiv.innerHTML=allowed.map(item=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid #ecfdf5"><div><span style="font-family:monospace;background:#dcfce7;color:#065f46;padding:4px 10px;border-radius:6px;font-weight:800">${item.ip}</span><span style="font-size:11px;color:#6b7280;margin-right:8px">${item.reason||''} - ${item.added_at||''}</span></div><button onclick="window.removeAllowedUIFixed('${item.ip}')" style="padding:4px 10px;background:#ef4444;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer">🗑️ حذف</button></div>`).join('');
      }
    }
    if(statusDiv){
      if(mode==='whitelist'){
        if(cb) cb.checked=true;
        statusDiv.innerHTML=`🔐 الوضع: قائمة بيضاء مفعلة - ${allowed.length} IP مسموح - الباقي محظور`;
        statusDiv.style.background='#fef3c7';
      } else if(mode==='single'){
        statusDiv.innerHTML=`🔒 الوضع: IP واحد - ${data.allowed_ip} - استخدم ميزة IP واحد`;
      } else {
        if(cb) cb.checked=false;
        statusDiv.innerHTML=`✅ الوضع: السماح للجميع - ${allowed.length} IP في القائمة (غير مفعلة)`;
        statusDiv.style.background='#fff';
      }
    }
  }catch(e){ if(listDiv) listDiv.innerHTML='❌ خطأ: '+e.message; }
};

window.addNewAllowedIP2Fixed = async function(){
  const ip=document.getElementById('newAllowedIP2')?.value?.trim();
  const reason=document.getElementById('newAllowedReason2')?.value?.trim()||'مسموح';
  if(!ip || !ip.includes('.')){ alert('❌ أدخل IP صحيح'); return; }
  const result=await window.addAllowedIPFixed(ip, reason);
  if(result.success){ alert(`✅ تم إضافة IP: ${ip}`); document.getElementById('newAllowedIP2').value=''; document.getElementById('newAllowedReason2').value=''; window.refreshAllowed2Fixed(); }
  else{ alert('❌ فشل: '+(result.error||'خطأ')); }
};

window.removeAllowedUIFixed = async function(ip){
  if(!confirm(`حذف IP: ${ip} من المسموحين؟`)) return;
  const result=await window.removeAllowedIPFixed(ip);
  if(result.success){ alert(`✅ تم حذف ${ip}`); window.refreshAllowed2Fixed(); }
  else{ alert('❌ فشل: '+(result.error||'خطأ')); }
};

window.toggleWhitelist2Fixed = async function(checked){
  if(checked){
    if(!confirm('🔐 تفعيل القائمة البيضاء؟ فقط المسموحين يدخلون')){ document.getElementById('whitelistModeCheckbox2').checked=false; return; }
    const result=await window.enableWhitelistModeFixed();
    if(result.success){ alert('✅ تم التفعيل'); window.refreshAllowed2Fixed(); }
    else{ alert('❌ فشل: '+(result.error||'خطأ')); document.getElementById('whitelistModeCheckbox2').checked=false; }
  } else {
    await window.allowAllMulti2Fixed();
  }
};

window.allowAllMulti2Fixed = async function(){
  if(!confirm('✅ السماح للجميع؟')) return;
  const result=await window.disableWhitelistModeFixed();
  if(result.success){ alert('✅ السماح للجميع'); window.refreshAllowed2Fixed(); }
  else{ alert('❌ فشل: '+(result.error||'خطأ')); }
};
