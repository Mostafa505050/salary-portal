// protect.js - يوضع بجانب الصفحات في /js/protect.js
(function(){
  const BLOCKED_KEY = 'blockedPages';
  async function loadBlocked(){
    try{
      const res = await fetch('/api/blocked-list');
      const data = await res.json();
      return data.blocked || [];
    }catch(e){ return []; }
  }
  async function init(){
    const blocked = await loadBlocked();
    document.addEventListener('click', function(e){
      const a = e.target.closest('a');
      if(!a) return;
      const href = (a.getAttribute('href')||'').toLowerCase();
      if(blocked.some(b=>href.includes(b.replace('.html','')))){
        e.preventDefault();
        alert('🔒 هذه الصفحة مغلقة (مفعلة=0 في صفحات_الموقع)');
      }
    });
  }
  init();
})();

// ========== دوال جديدة مضافة فقط - لم يتم تعديل أي دالة قديمة ==========

// دالة جديدة 1: تحميل الأجهزة المحظورة
async function loadBlockedDevicesFixed(){
  try{
    const res = await fetch('/api/blocked-devices');
    const data = await res.json();
    return data.blocked || [];
  }catch(e){ return []; }
}

// دالة جديدة 2: فحص إذا كان الجهاز الحالي محظور
async function isCurrentDeviceBlockedFixed(){
  try{
    const res = await fetch('/api/blocked-devices');
    const data = await res.json();
    return data.isBlocked || false;
  }catch(e){ return false; }
}

// دالة جديدة 3: حماية إضافية للأجهزة المحظورة
async function protectBlockedDevicesFixed(){
  const isBlocked = await isCurrentDeviceBlockedFixed();
  if(isBlocked){
    console.log('🚫 الجهاز محظور - سيتم منعه من قبل Worker');
  }
}

// دالة جديدة 4: مراقبة محاولات دخول صفحات محظورة مع IP
async function logBlockedAttemptFixed(pageName){
  try{
    const ipRes = await fetch('/api/get-ip');
    const ipData = await ipRes.json();
    console.log('محاولة دخول صفحة محظورة:', pageName, 'IP:', ipData.ip);
  }catch{}
}

// ========== ميزة IP واحد فقط - دوال جديدة مضافة فقط ==========

// دالة جديدة: تفعيل وضع IP واحد فقط
async function enableSingleIPModeFixed(allowedIP){
  try{
    const res = await fetch('/api/enable-single-ip', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ip: allowedIP})
    });
    const data = await res.json();
    return data;
  }catch(e){ return {success:false, error:e.message}; }
}

// دالة جديدة: إلغاء وضع IP واحد والسماح للجميع
async function disableSingleIPModeFixed(){
  try{
    const res = await fetch('/api/disable-single-ip', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({})
    });
    const data = await res.json();
    return data;
  }catch(e){ return {success:false, error:e.message}; }
}

// دالة جديدة: جلب حالة وضع IP الواحد
async function getWhitelistModeFixed(){
  try{
    const res = await fetch('/api/whitelist-mode');
    const data = await res.json();
    return data;
  }catch(e){ return {mode:'all', allowed_ip:null}; }
}

// دالة جديدة: إنشاء واجهة Checkbox للتحكم في IP واحد
function createSingleIPCheckboxFixed(containerId, currentIP){
  const container = document.getElementById(containerId);
  if(!container) return;
  
  container.innerHTML = `
    <div style="background:#fffbeb;border:2px solid #f59e0b;border-radius:12px;padding:14px;margin:12px 0">
      <h3 style="margin:0 0 10px;font-size:13px;color:#92400e">🔐 وضع IP واحد فقط - السماح لجهاز واحد وحظر الباقي</h3>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:800">
          <input type="checkbox" id="singleIPCheckbox" style="width:18px;height:18px" onchange="toggleSingleIPModeFixed(this.checked)">
          تفعيل وضع IP واحد فقط
        </label>
        <input type="text" id="allowedIPInput" value="${currentIP||''}" placeholder="أدخل IP المسموح" style="padding:6px 10px;border:1px solid #fcd34d;border-radius:6px;font-family:monospace;width:160px">
        <button onclick="applySingleIPFixed()" style="padding:6px 12px;background:#f59e0b;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer">تطبيق</button>
        <button onclick="allowAllIPsFixed()" style="padding:6px 12px;background:#10b981;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer">✅ السماح للجميع</button>
      </div>
      <div id="whitelistStatus" style="margin-top:8px;font-size:11px;color:#92400e"></div>
      <div style="margin-top:8px;font-size:10px;color:#a16207;background:#fef3c7;padding:6px;border-radius:6px">
        💡 عند التفعيل: فقط الـ IP المكتوب يستطيع دخول الموقع، باقي الـ IPs ستظهر لها صفحة محظور<br>
        ✅ عند إلغاء التفعيل: يعود السماح للجميع مع إمكانية حظر أجهزة محددة
      </div>
    </div>
  `;
  
  // تحميل الحالة الحالية
  getWhitelistModeFixed().then(data=>{
    const checkbox = document.getElementById('singleIPCheckbox');
    const input = document.getElementById('allowedIPInput');
    const status = document.getElementById('whitelistStatus');
    if(data.mode==='single'){
      if(checkbox) checkbox.checked=true;
      if(input && data.allowed_ip) input.value=data.allowed_ip;
      if(status) status.innerHTML=`🔒 <b>الوضع الحالي:</b> IP واحد فقط - المسموح: <span style="background:#fee2e2;padding:2px 6px;border-radius:4px;font-family:monospace;color:#dc2626">${data.allowed_ip}</span> - باقي الأجهزة محظورة`;
    } else {
      if(status) status.innerHTML=`✅ <b>الوضع الحالي:</b> السماح للجميع - يمكن حظر أجهزة محددة`;
    }
  });
}

// دالة جديدة: تبديل وضع IP واحد
async function toggleSingleIPModeFixed(checked){
  if(checked){
    const ip = document.getElementById('allowedIPInput')?.value || '';
    if(!ip || !ip.includes('.')){
      alert('أدخل IP صحيح أولاً');
      document.getElementById('singleIPCheckbox').checked=false;
      return;
    }
    await applySingleIPFixed();
  } else {
    await allowAllIPsFixed();
  }
}

// دالة جديدة: تطبيق IP واحد
async function applySingleIPFixed(){
  const ip = document.getElementById('allowedIPInput')?.value?.trim();
  if(!ip || !ip.includes('.')){
    alert('❌ أدخل IP صحيح مثل 45.102.74.114');
    return;
  }
  if(!confirm(`تفعيل وضع IP واحد فقط؟\n\nالـ IP المسموح: ${ip}\nباقي الأجهزة ستحظر ولن تستطيع الدخول\n\nهل أنت متأكد؟`)) return;
  
  const result = await enableSingleIPModeFixed(ip);
  if(result.success){
    alert(`✅ تم تفعيل وضع IP واحد فقط\n\nالمسموح: ${ip}\nباقي الأجهزة محظورة الآن`);
    document.getElementById('whitelistStatus').innerHTML=`🔒 الوضع: IP واحد فقط - المسموح: <span style="color:#dc2626">${ip}</span>`;
    location.reload();
  } else {
    alert('❌ فشل: '+(result.error||'خطأ غير معروف'));
  }
}

// دالة جديدة: السماح للجميع
async function allowAllIPsFixed(){
  if(!confirm('إلغاء وضع IP واحد والسماح للجميع؟\n\nسيعود الموقع متاحاً لكل الأجهزة مع إمكانية حظر محددة')) return;
  const result = await disableSingleIPModeFixed();
  if(result.success){
    alert('✅ تم إلغاء وضع IP واحد - السماح للجميع الآن');
    const checkbox = document.getElementById('singleIPCheckbox');
    if(checkbox) checkbox.checked=false;
    document.getElementById('whitelistStatus').innerHTML='✅ الوضع: السماح للجميع';
    location.reload();
  } else {
    alert('❌ فشل: '+(result.error||'خطأ'));
  }
}

// ========== ميزة السماح لعدة IPs - قائمة بيضاء متعددة - دوال جديدة مضافة فقط ==========

// دالة جديدة: إضافة IP إلى قائمة المسموحين
async function addAllowedIPFixed(ip, reason){
  try{
    const res = await fetch('/api/add-allowed-ip', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ip: ip, reason: reason||'مسموح'})
    });
    const data = await res.json();
    return data;
  }catch(e){ return {success:false, error:e.message}; }
}

// دالة جديدة: حذف IP من قائمة المسموحين
async function removeAllowedIPFixed(ip){
  try{
    const res = await fetch('/api/remove-allowed-ip', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ip: ip})
    });
    const data = await res.json();
    return data;
  }catch(e){ return {success:false, error:e.message}; }
}

// دالة جديدة: جلب قائمة الـ IPs المسموحة
async function getAllowedIPsFixed(){
  try{
    const res = await fetch('/api/allowed-ips');
    const data = await res.json();
    return data;
  }catch(e){ return {allowed:[], mode:'all'}; }
}

// دالة جديدة: تفعيل وضع القائمة البيضاء المتعددة
async function enableWhitelistModeFixed(){
  try{
    const res = await fetch('/api/enable-whitelist', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({})
    });
    const data = await res.json();
    return data;
  }catch(e){ return {success:false, error:e.message}; }
}

// دالة جديدة: تعطيل وضع القائمة البيضاء والسماح للجميع
async function disableWhitelistModeFixed(){
  try{
    const res = await fetch('/api/disable-whitelist', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({})
    });
    const data = await res.json();
    return data;
  }catch(e){ return {success:false, error:e.message}; }
}

// دالة جديدة: إنشاء واجهة لإضافة عدة IPs
function createMultiIPWhitelistUIFixed(containerId, currentIP){
  const container = document.getElementById(containerId);
  if(!container) return;
  
  container.innerHTML = `
    <div style="background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:2px solid #10b981;border-radius:14px;padding:16px;margin:16px 0">
      <h3 style="margin:0 0 12px;font-size:14px;color:#065f46">✅ قائمة الـ IPs المسموحة - إضافة أي IP للسماح</h3>
      
      <div style="background:#fff;border-radius:10px;padding:12px;margin-bottom:12px;border:1px solid #a7f3d0">
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px">
          <input type="text" id="newAllowedIP" value="${currentIP||''}" placeholder="أدخل IP للسماح مثل 45.102.74.114" style="padding:8px 12px;border:1.5px solid #6ee7b7;border-radius:8px;font-family:monospace;width:180px;font-weight:700">
          <input type="text" id="newAllowedReason" placeholder="السبب (اختياري) مثل: مكتب الإدارة" style="padding:8px 12px;border:1.5px solid #6ee7b7;border-radius:8px;width:180px">
          <button onclick="addNewAllowedIPFixed()" style="padding:8px 14px;background:#10b981;color:#fff;border:none;border-radius:8px;font-weight:800;cursor:pointer">➕ إضافة للسماح</button>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:800;background:#ecfdf5;padding:8px 12px;border-radius:8px;border:1.5px solid #6ee7b7">
            <input type="checkbox" id="whitelistModeCheckbox" style="width:20px;height:20px" onchange="toggleWhitelistModeFixed(this.checked)">
            تفعيل وضع القائمة البيضاء (فقط المسموحين يدخلون)
          </label>
          <button onclick="refreshAllowedIPsFixed()" style="padding:6px 12px;background:#059669;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer">🔄 تحديث القائمة</button>
          <button onclick="allowAllMultiFixed()" style="padding:6px 12px;background:#6b7280;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer">✅ السماح للجميع</button>
        </div>
      </div>
      
      <div id="allowedIPsListFixed" style="background:#fff;border-radius:10px;padding:10px;border:1px solid #a7f3d0;max-height:300px;overflow-y:auto">
        ⏳ جاري تحميل قائمة المسموحين...
      </div>
      
      <div id="multiIPStatusFixed" style="margin-top:10px;background:#fff;padding:10px;border-radius:8px;font-size:12px;color:#065f46;border:1px solid #a7f3d0">⏳ جاري تحميل الحالة...</div>
      
      <div style="margin-top:10px;background:#d1fae5;padding:8px;border-radius:6px;font-size:11px;color:#065f46;line-height:1.6">
        <b>💡 كيف تعمل إضافة عدة IPs:</b><br>
        • <b>أضف أي IP:</b> اكتب IP في الحقل واضغط ➕ إضافة - سيتم حفظه في قائمة المسموحين<br>
        • <b>تفعيل القائمة البيضاء:</b> فعّل Checkbox - فقط الـ IPs في القائمة ستدخل، الباقي يرى صفحة محظور<br>
        • <b>السماح للجميع:</b> ألغِ التفعيل - يعود الموقع للجميع مع إمكانية حظر محدد<br>
        • <b>حذف IP:</b> اضغط 🗑️ بجانب أي IP لحذفه من القائمة
      </div>
    </div>
  `;
  
  refreshAllowedIPsFixed();
}

// دالة جديدة: تحديث قائمة الـ IPs المسموحة
async function refreshAllowedIPsFixed(){
  const listDiv = document.getElementById('allowedIPsListFixed');
  const statusDiv = document.getElementById('multiIPStatusFixed');
  const checkbox = document.getElementById('whitelistModeCheckbox');
  
  try{
    const data = await getAllowedIPsFixed();
    const allowed = data.allowed||[];
    const mode = data.mode||'all';
    
    if(listDiv){
      if(allowed.length===0){
        listDiv.innerHTML='<div style="text-align:center;color:#6b7280;padding:20px">لا يوجد IPs مسموحة - أضف أول IP من الأعلى</div>';
      } else {
        listDiv.innerHTML = allowed.map(item=>`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid #ecfdf5">
            <div>
              <span style="font-family:monospace;background:#dcfce7;color:#065f46;padding:4px 10px;border-radius:6px;font-weight:800">${item.ip}</span>
              <span style="font-size:11px;color:#6b7280;margin-right:8px">${item.reason||'مسموح'} - ${item.added_at||''}</span>
            </div>
            <button onclick="removeAllowedIPUIFixed('${item.ip}')" style="padding:4px 10px;background:#ef4444;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer">🗑️ حذف</button>
          </div>
        `).join('');
      }
    }
    
    if(statusDiv){
      if(mode==='whitelist'){
        if(checkbox) checkbox.checked=true;
        statusDiv.innerHTML=`🔐 <b>الوضع الحالي:</b> قائمة بيضاء مفعلة - فقط ${allowed.length} IP مسموح لهم بالدخول - باقي الأجهزة محظورة`;
        statusDiv.style.background='#fef3c7';
        statusDiv.style.borderColor='#fcd34d';
        statusDiv.style.color='#92400e';
      } else if(mode==='single'){
        statusDiv.innerHTML=`🔒 <b>الوضع الحالي:</b> IP واحد فقط - المسموح: ${data.allowed_ip} - استخدم ميزة IP واحد أعلاه`;
      } else {
        if(checkbox) checkbox.checked=false;
        statusDiv.innerHTML=`✅ <b>الوضع الحالي:</b> السماح للجميع - ${allowed.length} IP في قائمة المسموحين (غير مفعلة - فعّل القائمة البيضاء لتطبيقها)`;
        statusDiv.style.background='#fff';
        statusDiv.style.borderColor='#a7f3d0';
        statusDiv.style.color='#065f46';
      }
    }
  }catch(e){
    if(listDiv) listDiv.innerHTML='❌ خطأ: '+e.message;
  }
}

// دالة جديدة: إضافة IP جديد من الواجهة
async function addNewAllowedIPFixed(){
  const ipInput = document.getElementById('newAllowedIP');
  const reasonInput = document.getElementById('newAllowedReason');
  const ip = ipInput?.value?.trim();
  const reason = reasonInput?.value?.trim() || 'مسموح';
  
  if(!ip || !ip.includes('.')){
    alert('❌ أدخل IP صحيح مثل 45.102.74.114');
    return;
  }
  
  const result = await addAllowedIPFixed(ip, reason);
  if(result.success){
    alert(`✅ تم إضافة IP للسماح\nIP: ${ip}\nالسبب: ${reason}`);
    if(ipInput) ipInput.value='';
    if(reasonInput) reasonInput.value='';
    refreshAllowedIPsFixed();
  } else {
    alert('❌ فشل: '+(result.error||'خطأ'));
  }
}

// دالة جديدة: حذف IP من الواجهة
async function removeAllowedIPUIFixed(ip){
  if(!confirm(`حذف IP من قائمة المسموحين؟\nIP: ${ip}\n\nسيتم منعه إذا كانت القائمة البيضاء مفعلة`)) return;
  const result = await removeAllowedIPFixed(ip);
  if(result.success){
    alert(`✅ تم حذف IP: ${ip}`);
    refreshAllowedIPsFixed();
  } else {
    alert('❌ فشل: '+(result.error||'خطأ'));
  }
}

// دالة جديدة: تبديل وضع القائمة البيضاء
async function toggleWhitelistModeFixed(checked){
  if(checked){
    if(!confirm('🔐 تفعيل وضع القائمة البيضاء؟\n\nفقط الـ IPs في قائمة المسموحين ستدخل الموقع\nباقي الأجهزة ستحظر\n\nمتأكد؟')) {
      document.getElementById('whitelistModeCheckbox').checked=false;
      return;
    }
    const result = await enableWhitelistModeFixed();
    if(result.success){
      alert('✅ تم تفعيل وضع القائمة البيضاء\nفقط المسموحين يدخلون');
      refreshAllowedIPsFixed();
    } else {
      alert('❌ فشل: '+(result.error||'خطأ'));
      document.getElementById('whitelistModeCheckbox').checked=false;
    }
  } else {
    await allowAllMultiFixed();
  }
}

// دالة جديدة: السماح للجميع في وضع القائمة المتعددة
async function allowAllMultiFixed(){
  if(!confirm('✅ السماح للجميع وإلغاء وضع القائمة البيضاء؟')) return;
  const result = await disableWhitelistModeFixed();
  if(result.success){
    alert('✅ تم السماح للجميع - وضع القائمة البيضاء ملغي');
    const cb=document.getElementById('whitelistModeCheckbox');
    if(cb) cb.checked=false;
    refreshAllowedIPsFixed();
  } else {
    alert('❌ فشل: '+(result.error||'خطأ'));
  }
}
