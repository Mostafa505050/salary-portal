// real-logger V7 - كشف اسم الجهاز الحقيقي للزائر (موديل الموبايل الفعلي)
(function(){
  const APIS=['/api/turso','https://turso-api.mostafa-voic77729.workers.dev/api/turso'];
  let REAL_IP=localStorage.getItem('user_real_ip')||'';
  
  // قاموس تحويل أكواد سامسونج لأسماء تجارية
  const SAMSUNG_MODELS={
    'SM-S911':'Galaxy S23','SM-S916':'Galaxy S23+','SM-S918':'Galaxy S23 Ultra',
    'SM-S921':'Galaxy S24','SM-S926':'Galaxy S24+','SM-S928':'Galaxy S24 Ultra',
    'SM-A546':'Galaxy A54','SM-A556':'Galaxy A55','SM-A336':'Galaxy A33','SM-A346':'Galaxy A34',
    'SM-A236':'Galaxy A23','SM-A235':'Galaxy A23','SM-M336':'Galaxy M33','SM-F946':'Galaxy Z Fold5','SM-F731':'Galaxy Z Flip5',
    'SM-G998':'Galaxy S21 Ultra','SM-G991':'Galaxy S21','SM-G996':'Galaxy S21+'
  };
  
  const XIAOMI_MODELS={
    'Redmi Note 12':'Redmi Note 12','Redmi Note 11':'Redmi Note 11','Redmi Note 13':'Redmi Note 13',
    'M2010J19':'POCO X3','M2102J20':'Redmi Note 10','2201117':'Redmi Note 11','22111317':'Redmi Note 12',
    'CPH2449':'OPPO Reno10','CPH2465':'OPPO A78','CPH2459':'OPPO A58'
  };

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

  function parseAndroidModel(ua){
    // محاولة استخراج الموديل الحقيقي: SM-S918B , Redmi Note 12 , CPH2449 etc
    let m=ua.match(/Android.*;(.*?)\sBuild/i);
    if(!m) m=ua.match(/\((.*?)\).*Android/i);
    let raw=m?m[1].trim(): '';
    // تنظيف
    raw=raw.split(';').pop().trim(); // آخر جزء بعد ; هو الموديل غالبا
    // إزالة كلمات زائدة
    raw=raw.replace(/\bwv\b/i,'').trim();
    if(raw.length>40) raw=raw.substring(0,40);
    
    // تحويل كود سامسونج لاسم تجاري
    for(const code in SAMSUNG_MODELS){
      if(raw.toUpperCase().includes(code)){
        return SAMSUNG_MODELS[code]+' ('+raw+')';
      }
    }
    for(const code in XIAOMI_MODELS){
      if(raw.includes(code)){
        return XIAOMI_MODELS[code]+' ('+raw+')';
      }
    }
    // إذا الموديل معروف مثل Pixel
    if(/Pixel/i.test(raw)) return raw;
    if(/Redmi|POCO|CPH|RMX|V2|M20|SM-/i.test(raw)) return raw;
    
    return raw || 'Android Device';
  }

  function getOSVersion(ua){
    let ver='';
    if(/Android\s([\d.]+)/i.test(ua)){
      const mm=ua.match(/Android\s([\d.]+)/i);
      ver='Android '+mm[1];
    } else if(/iPhone OS\s([\d_]+)/i.test(ua)){
      const mm=ua.match(/iPhone OS\s([\d_]+)/i);
      ver='iOS '+mm[1].replace(/_/g,'.');
    } else if(/CPU OS\s([\d_]+)/i.test(ua)){
      const mm=ua.match(/CPU OS\s([\d_]+)/i);
      ver='iOS '+mm[1].replace(/_/g,'.');
    } else if(/Windows NT\s([\d.]+)/i.test(ua)){
      const mm=ua.match(/Windows NT\s([\d.]+)/i);
      const map={'10.0':'10/11','6.3':'8.1','6.2':'8','6.1':'7'};
      ver='Windows '+(map[mm[1]]||mm[1]);
    } else if(/Mac OS X\s([\d_]+)/i.test(ua)){
      const mm=ua.match(/Mac OS X\s([\d_]+)/i);
      ver='macOS '+mm[1].replace(/_/g,'.');
    }
    return ver;
  }

  function getBrowser(ua){
    if(/Edg\//i.test(ua)) return 'Edge';
    if(/OPR\//i.test(ua) || /Opera/i.test(ua)) return 'Opera';
    if(/Chrome/i.test(ua) && !/Chromium/i.test(ua) && !/Edg/i.test(ua)) return 'Chrome';
    if(/Firefox/i.test(ua)) return 'Firefox';
    if(/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
    if(/SamsungBrowser/i.test(ua)) return 'Samsung Browser';
    return 'Browser';
  }

  // الدالة الأساسية الجديدة: اسم الجهاز الحقيقي
  async function getRealDeviceName(){
    const ua=navigator.userAgent;
    let deviceName='';
    let osVer=getOSVersion(ua);
    let browser=getBrowser(ua);
    
    // محاولة استخدام UserAgent Client Hints الحديثة (تعطي موديل حقيقي)
    if(navigator.userAgentData){
      try{
        // بعض المتصفحات تعطي model مباشرة (خاصة اندرويد)
        if(navigator.userAgentData.mobile){
          // موبايل
          if(typeof navigator.userAgentData.getHighEntropyValues==='function'){
            const hints=await navigator.userAgentData.getHighEntropyValues(['model','platform','platformVersion','fullVersionList','architecture']);
            if(hints.model && hints.model!==''){
              deviceName=hints.model; // مثال: Pixel 7 , SM-S918B
            }
            if(hints.platform){
              osVer=hints.platform+' '+(hints.platformVersion||'')+' - '+osVer;
            }
          }
        }
      }catch(e){}
    }

    // إذا لم نحصل على اسم من Client Hints، نحلل UA
    if(!deviceName){
      if(/Android/i.test(ua)){
        deviceName=parseAndroidModel(ua);
      } else if(/iPhone/i.test(ua)){
        // الآيفون لا يعطي موديل في UA، نستخدم دقة الشاشة لتخمين تقريبي
        const w=screen.width, h=screen.height;
        const ratio=window.devicePixelRatio||1;
        const modelGuess = (() => {
          // تخمين بسيط بناء على الدقة
          if(w===390 && h===844) return 'iPhone 12/12 Pro';
          if(w===428 && h===926) return 'iPhone 12 Pro Max/13 Pro Max';
          if(w===375 && h===812) return 'iPhone X/XS/11 Pro';
          if(w===414 && h===896) return 'iPhone XR/11/XS Max';
          if(w===393 && h===852) return 'iPhone 14 Pro';
          if(w===430 && h===932) return 'iPhone 14 Pro Max/15 Pro Max';
          return 'iPhone';
        })();
        deviceName=modelGuess;
      } else if(/iPad/i.test(ua)){
        deviceName='iPad';
      } else if(/Windows/i.test(ua)){
        deviceName='Windows PC';
      } else if(/Macintosh|Mac OS/i.test(ua)){
        deviceName='Mac - '+ ( /MacBook/i.test(ua)?'MacBook' : 'iMac/Mac');
      } else {
        deviceName='PC';
      }
    }

    // إضافة معلومات إضافية للتمييز: حجم الشاشة + المتصفح
    const screenInfo = `${screen.width}x${screen.height}`;
    const finalName = `${deviceName} - ${osVer} - ${browser} (${screenInfo})`.slice(0,80);
    return finalName;
  }

  // دالة قديمة للتوافق
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
    const page=getPage(); 
    const site=location.hostname||'salary-portal'; 
    const device=await getRealDeviceName(); // اسم الجهاز الحقيقي الآن
    const created_at=nowStr(); 
    const ip=await fetchIP();
    try{ let arr=JSON.parse(localStorage.getItem('real_page_logs')||'[]'); arr.push({page,site,device_model:device,ip,created_at}); if(arr.length>1000) arr=arr.slice(-1000); localStorage.setItem('real_page_logs',JSON.stringify(arr)); }catch{}
    const ua=navigator.userAgent.substring(0,200);
    const sql=`INSERT INTO real_page_logs (page,site,device_model,ip,user_agent,created_at) VALUES (?,?,?,?,?,?)`;
    const params=[page,site,device,ip,ua,created_at];
    for(const api of APIS){ try{ const res=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql,params})}); if(res.ok) break; }catch{} }
    console.log('📱 جهاز حقيقي:', device, 'IP:', ip, 'صفحة:', page);
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
    else{ alert('❌ فشل الحظر: '+err); }
  };
  
  window.unblockDevice=async function(id){
    if(!confirm('فك حظر '+id+'؟')) return;
    await fetch('/api/turso',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql:'DELETE FROM blocked_devices WHERE id=?',params:[id]})});
    location.reload();
  };
  
  window.getRealDeviceNameDebug = getRealDeviceName; // للاختبار من Console
  
  fetchIP().then(()=>{ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',logPage); else logPage(); });
})();

// ========== دوال إصلاح الحظر ==========
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

window.blockDeviceFixed = async function(ip, device){
  console.log('blockDeviceFixed clicked', ip, device);
  if(!ip || !ip.includes('.') || ip==='local' || ip==='manual' || ip==='unknown'){
    alert('❌ IP غير حقيقي: '+ip);
    return;
  }
  if(!confirm('حظر IP: '+ip+'\nالجهاز: '+device+'\n\nسيتم منعه من دخول كل الصفحات؟')) return;
  const payload = {ip: ip, device_model: device, reason: 'محظور من لوحة المراقبة - '+new Date().toLocaleString('ar-EG')};
  let ok=false; let errMsg='';
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
  if(!ok){
    try{
      const res = await fetch('/api/turso', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({sql:"INSERT INTO blocked_devices (device_model, ip, reason) VALUES (?, ?, ?)", params:[device, ip, 'محظور من المراقبة']})});
      const txt = await res.text();
      if(res.ok && !txt.toLowerCase().includes('error')) ok=true;
      else errMsg=txt.slice(0,200);
    }catch(e){ errMsg=e.message; }
  }
  if(ok){
    alert('✅ تم حظر IP: '+ip+'\nالجهاز: '+device);
    location.reload();
  } else {
    alert('❌ فشل الحظر\nالخطأ: '+errMsg);
  }
};

window.unblockDeviceFixed = async function(id){
  if(!confirm('فك حظر ID: '+id+'؟')) return;
  try{
    const res=await fetch('/api/unblock-device-fixed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
    const txt=await res.text();
    const data=JSON.parse(txt);
    if(data.success){ alert('✅ تم فك الحظر'); location.reload(); }
    else alert('❌ فشل: '+(data.error||'خطأ'));
  }catch(e){ alert('❌ خطأ: '+e.message); }
};

// ========== دوال القائمة البيضاء ==========
window.getAllowedIPsFixed = async function(){
  try{
    const res=await fetch('/api/allowed-ips',{cache:'no-store'});
    const data=await res.json();
    return data;
  }catch(e){ return {allowed:[], error:e.message}; }
};

window.addAllowedIPFixed = async function(ip, reason, device_name){
  try{
    const res=await fetch('/api/add-allowed-ip',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ip, reason, device_name})});
    const data=await res.json();
    return data;
  }catch(e){ return {success:false, error:e.message}; }
};

window.removeAllowedIPFixed = async function(ip){
  try{
    const res=await fetch('/api/remove-allowed-ip',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ip})});
    const data=await res.json();
    return data;
  }catch(e){ return {success:false, error:e.message}; }
};

window.enableWhitelistModeFixed = async function(){
  try{
    const res=await fetch('/api/enable-whitelist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})});
    const data=await res.json();
    return data;
  }catch(e){ return {success:false, error:e.message}; }
};

window.disableWhitelistModeFixed = async function(){
  try{
    const res=await fetch('/api/disable-whitelist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})});
    const data=await res.json();
    return data;
  }catch(e){ return {success:false, error:e.message}; }
};

window.createMultiIPUIFixed = function(containerId){
  const container = document.getElementById(containerId);
  if(!container) return;
  fetch('/api/get-ip').then(r=>r.json()).then(ipData=>{
    const currentIP = ipData.ip||'';
    container.innerHTML = `
      <div style="background:#fff;border-radius:12px;padding:14px;border:2px solid #e2e8f0;border-bottom-width:4px">
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <input type="text" id="newAllowedIP2" value="${currentIP}" placeholder="45.102.74.114" style="padding:9px 12px;border:2px solid #e2e8f0;border-bottom-width:4px;border-radius:10px;font-family:monospace;width:160px;font-weight:700">
          <input type="text" id="newAllowedReason2" placeholder="السبب" style="padding:9px 12px;border:2px solid #e2e8f0;border-bottom-width:4px;border-radius:10px;width:140px">
          <button onclick="window.addNewAllowedIP2Fixed()" style="padding:9px 14px;background:#10b981;color:#fff;border:none;border-radius:10px;font-weight:800;cursor:pointer;box-shadow:0 5px 0 #047857">➕ إضافة IP</button>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:800;background:#f8fafc;padding:8px 12px;border-radius:10px;border:2px solid #e2e8f0;border-bottom-width:4px">
            <input type="checkbox" id="whitelistModeCheckbox2" style="width:18px;height:18px" onchange="window.toggleWhitelist2Fixed(this.checked)">
            القائمة البيضاء فقط
          </label>
          <button onclick="window.refreshAllowed2Fixed()" style="padding:8px 12px;background:#e2e8f0;color:#0f172a;border:none;border-radius:10px;font-weight:700;cursor:pointer;border-bottom:3px solid #cbd5e1">🔄 تحديث</button>
          <button onclick="window.allowAllMulti2Fixed()" style="padding:8px 12px;background:#e2e8f0;color:#0f172a;border:none;border-radius:10px;font-weight:700;cursor:pointer;border-bottom:3px solid #cbd5e1">✅ السماح للجميع</button>
        </div>
        <div id="allowedIPsList2Fixed" style="background:#f8fafc;border-radius:10px;padding:10px;border:1px solid #e2e8f0;max-height:220px;overflow-y:auto;margin-top:12px">⏳ جاري تحميل...</div>
        <div id="multiIPStatus2Fixed" style="margin-top:10px;background:#f8fafc;padding:8px;border-radius:8px;font-size:11px;border:1px solid #e2e8f0">⏳ جاري تحميل الحالة...</div>
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
        listDiv.innerHTML='<div style="text-align:center;color:#64748b;padding:20px">لا يوجد IPs - أضف أول IP</div>';
      } else {
        listDiv.innerHTML=allowed.map(item=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid #f1f5f9"><div><span style="font-family:monospace;background:#dcfce7;color:#065f46;padding:4px 10px;border-radius:6px;font-weight:800">${item.ip}</span><span style="font-size:11px;color:#64748b;margin-right:8px">${item.reason||''} ${item.device_name?' - '+item.device_name:''} - ${item.added_at||''}</span></div><button onclick="window.removeAllowedUIFixed('${item.ip}')" style="padding:4px 10px;background:#ef4444;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer">🗑️ حذف</button></div>`).join('');
      }
    }
    if(statusDiv){
      if(mode==='whitelist'){
        if(cb) cb.checked=true;
        statusDiv.innerHTML=`🔐 قائمة بيضاء مفعلة - ${allowed.length} IP مسموح - الباقي محظور`;
      } else {
        if(cb) cb.checked=false;
        statusDiv.innerHTML=`✅ السماح للجميع - ${allowed.length} IP في القائمة (غير مفعلة)`;
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
