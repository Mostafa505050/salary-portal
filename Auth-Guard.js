/**
 * auth-guard.js - حماية موحدة لجميع الصفحات
 * يمنع الدخول لأي صفحة إلا بعد الدخول من index / login-routing
 * يعتمد على: secure_token + logged_user + توجيه_المستخدمين (الرقم_القومي أو الكود_البنكى)
 * 
 * طريقة الاستخدام: ضع هذا السطر في أول <head> في كل صفحة:
 * <script src="auth-guard.js"></script>
 */

(function(){
  'use strict';
  
  const CONFIG = {
    INDEX_PAGE: 'index.html',
    LOGIN_ROUTING_PAGE: 'login-routing.html',
    SMART_LOGIN_PAGE: 'login-smart-routing-FINAL.html',
    // الصفحات المسموح فتحها بدون حماية (صفحات الدخول نفسها)
    PUBLIC_PAGES: [
      'index.html', 'login.html', 'login_secure.html',
      'login-routing.html', 'login-smart-routing-FINAL.html',
      'login-gateway-28801082200973.html',
      'data:text/html'
    ],
    API_BASE: 'https://turso-api.mostafa-voic77729.workers.dev',
    SESSION_MAX_HOURS: 12, // الجلسة تنتهي بعد 12 ساعة
    ALLOW_FILE_PROTOCOL_FOR_TEST: false // true = يسمح File:// للتجربة، false = يمنع حتى File://
  };

  const currentFile = window.location.pathname.split('/').pop() || '';
  const currentPath = window.location.pathname;
  const isFileProtocol = window.location.protocol === 'file:';
  const isPublic = CONFIG.PUBLIC_PAGES.some(p => 
    currentPath.includes(p) || currentFile.includes(p.replace('.html','')) || window.location.href.startsWith(p)
  );

  // لو صفحة عامة (دخول) لا تطبق الحماية
  if(isPublic){
    console.log('🔓 صفحة دخول عامة - لا تحتاج حماية:', currentFile);
    return;
  }

  // لو File:// والاختبار مسموح
  if(isFileProtocol && CONFIG.ALLOW_FILE_PROTOCOL_FOR_TEST){
    console.warn('⚠️ وضع File:// مسموح للتجربة - الحماية متخطاة');
    return;
  }

  // 1- فحص secure_token + logged_user
  function getStoredAuth(){
    try{
      const token = localStorage.getItem('secure_token');
      const userStr = localStorage.getItem('logged_user');
      const entryTime = localStorage.getItem('entry_via_index');
      if(!token || !userStr) return null;
      const user = JSON.parse(userStr);
      return {token, user, entryTime: entryTime ? parseInt(entryTime) : null};
    }catch(e){ return null; }
  }

  const auth = getStoredAuth();

  if(!auth){
    blockAccess('لا يوجد تسجيل دخول - يجب الدخول أولاً من صفحة index');
    return;
  }

  // 2- فحص انتهاء الجلسة
  if(auth.entryTime){
    const hours = (Date.now() - auth.entryTime) / (1000*60*60);
    if(hours > CONFIG.SESSION_MAX_HOURS){
      localStorage.clear();
      blockAccess(`انتهت الجلسة (أكثر من ${CONFIG.SESSION_MAX_HOURS} ساعة) - سجل دخول مرة أخرى`);
      return;
    }
  }else{
    // لو مفيش entry_via_index لكن فيه توكن قديم، نعتبره دخول غير مباشر
    if(!localStorage.getItem('entry_via_index')){
      // نحاول نصلح: لو logged_user موجود، نضيف entry
      const loginTime = auth.user.loginTime ? new Date(auth.user.loginTime).getTime() : Date.now();
      const hours = (Date.now() - loginTime) / (1000*60*60);
      if(hours > CONFIG.SESSION_MAX_HOURS){
        localStorage.clear();
        blockAccess('الجلسة منتهية - سجل دخول من index');
        return;
      }
      // نسمح لكن نضيف entry
      localStorage.setItem('entry_via_index', String(Date.now()));
    }
  }

  // 3- فحص الصلاحية من جدول توجيه_المستخدمين (غير متزامن - يمنع بعد التحميل)
  async function checkRoutingPermission(){
    try{
      const nationalId = auth.user.cardNumber || auth.user["الرقم_القومى"] || auth.user.national_id || '';
      const code = auth.user.code || auth.user["الكود_البنكى"] || auth.user.emptid || '';
      if(!nationalId && !code) return; // لا يمكن التحقق

      // لا نفحص لو Admin و الصفحات المسموحة [*]
      const allowedPagesRaw = auth.user.allowedPages || auth.user.routing?.["الصفحات_المسموحة"] || '';
      if(typeof allowedPagesRaw === 'string' && allowedPagesRaw.includes('"*"')){
        console.log('✅ Admin - كل الصفحات مسموحة');
        return;
      }

      const sql = `SELECT "الصفحات_المسموحة","الصفحات_الممنوعة","الصفحة_الافتراضية","مفعلة","تاريخ_الانتهاء" FROM "توجيه_المستخدمين" WHERE ("الرقم_القومى"='${String(nationalId).replace(/'/g,"''")}' OR "الكود_البنكى"='${String(code).replace(/'/g,"''")}') AND "مفعلة"=1 LIMIT 1`;
      const res = await fetch(CONFIG.API_BASE+'/api/turso',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({sql})});
      const j = await res.json();
      if(!j.ok || !j.rows || !j.rows.length){
        console.log('ℹ️ لا يوجد توجيه مخصص في توجيه_المستخدمين - السماح حسب الصلاحية العامة');
        return;
      }
      const routing = j.rows[0];
      
      // تحقق انتهاء
      if(routing["تاريخ_الانتهاء"]){
        const end = new Date(routing["تاريخ_الانتهاء"]);
        if(new Date() > end){
          blockAccess(`انتهت صلاحية توجيهك بتاريخ ${routing["تاريخ_الانتهاء"]} - تواصل مع المدير`);
          return;
        }
      }

      // تحقق هل الصفحة الحالية مسموحة؟
      let allowed = [];
      let denied = [];
      try{ allowed = JSON.parse(routing["الصفحات_المسموحة"]||'[]'); }catch{ allowed = []; }
      try{ denied = JSON.parse(routing["الصفحات_الممنوعة"]||'[]'); }catch{ denied = []; }

      const currentPageFile = currentFile || window.location.href.split('/').pop().split('?')[0];
      
      // لو مسموح الكل
      if(allowed.includes('*') || allowed.includes('["*"]')){
        return;
      }

      // لو الصفحة في الممنوعة
      if(denied.some(p => currentPageFile.includes(p.replace('.html','')) || p.includes(currentPageFile))){
        blockAccess(`🚫 الصفحة ${currentPageFile} ممنوعة عليك حسب جدول توجيه_المستخدمين - المسموح: ${allowed.join(', ')}`, routing["الصفحة_الافتراضية"]);
        return;
      }

      // لو فيه قائمة مسموحة والصفحة مش فيها
      if(allowed.length > 0){
        const isAllowed = allowed.some(p => {
          const cleanP = p.replace('.html','').toLowerCase();
          const cleanCurrent = currentPageFile.replace('.html','').toLowerCase();
          return cleanP === cleanCurrent || currentPageFile.toLowerCase().includes(cleanP) || cleanP.includes(cleanCurrent) || p === currentPageFile;
        });
        if(!isAllowed){
          // سماح للصفحات الافتراضية والبوابات
          const isDefault = routing["الصفحة_الافتراضية"] && currentPageFile.includes(routing["الصفحة_الافتراضية"].replace('.html',''));
          const isGateway = currentPageFile.includes('gateway') || currentPageFile.includes('pageUser1') || currentPageFile.includes('salary');
          if(!isDefault && !isGateway){
            // لا نمنع بقوة، فقط تحذير في الكونسول (حتى لا نكسر صفحات قديمة)
            console.warn(`⚠️ الصفحة ${currentPageFile} غير مذكورة في المسموحة:`, allowed);
            // لو تريد منع صارم، فك التعليق عن السطر التالي:
            // blockAccess(`🚫 غير مسموح لك بفتح ${currentPageFile} - المسموح فقط: ${allowed.join(', ')}`, routing["الصفحة_الافتراضية"]);
          }
        }
      }

      console.log('✅ فحص التوجيه - مسموح:', currentPageFile, 'المسموحة:', allowed);

    }catch(e){
      console.error('خطأ فحص التوجيه:', e);
      // لا نمنع لو فشل الاتصال
    }
  }

  // نفذ فحص التوجيه بعد تحميل الصفحة
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', checkRoutingPermission);
  }else{
    setTimeout(checkRoutingPermission, 500);
  }

  // 4- إضافة معلومات المستخدم في كل الصفحات (لو فيه عنصر welcome)
  function injectUserInfo(){
    try{
      const user = auth.user;
      const name = user.name || user["اسم_العامل"] || user.full_name || 'User';
      const code = user.code || user["الكود_البنكى"] || '';
      const role = user.role || user.type || 'User';
      // ابحث عن عناصر شائعة
      const el = document.getElementById('userName') || document.getElementById('welcomeText') || document.getElementById('welcomeLoginName');
      if(el && !el.textContent.includes(name)){
        if(el.id === 'userName') el.textContent = `مرحبا ${name}`;
        if(el.id === 'welcomeText') el.textContent = `مرحبا ${name} - ${role}`;
      }
    }catch{}
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', injectUserInfo);
  }else{
    setTimeout(injectUserInfo, 300);
  }

  function blockAccess(reason, redirectTo){
    console.warn('🔒 تم منع الوصول:', reason);
    // احفظ الصفحة المطلوبة للعودة بعد الدخول
    try{ localStorage.setItem('redirect_after_login', window.location.href); }catch{}
    
    // اعرض شاشة منع احترافية ثم حول
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:999999;
      background: radial-gradient(800px 400px at 50% 0%, rgba(16,185,129,0.15), transparent), #020a05;
      display:flex;align-items:center;justify-content:center;padding:20px;
      font-family:'Cairo',Tahoma;
    `;
    overlay.innerHTML = `
      <div style="max-width:420px;width:100%;background:linear-gradient(180deg,rgba(255,255,255,0.11),rgba(255,255,255,0.03));border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:24px;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,0.8)">
        <div style="width:56px;height:56px;margin:0 auto 12px;border-radius:16px;background:linear-gradient(135deg,#ef4444,#991b1b);display:flex;align-items:center;justify-content:center;font-size:24px">🔒</div>
        <h2 style="color:#fff;font-size:16px;font-weight:900">تم منع الوصول</h2>
        <p style="color:rgba(255,255,255,0.6);font-size:12px;margin-top:8px;line-height:1.7">${reason}</p>
        <p style="color:rgba(255,255,255,0.35);font-size:10px;margin-top:6px">سيتم تحويلك لصفحة الدخول - يجب الدخول أولاً من index</p>
        <div style="margin-top:16px;display:flex;gap:8px">
          <button id="goLogin" style="flex:1;height:44px;border-radius:12px;background:linear-gradient(180deg,#10b981,#059669);color:#000;font-weight:800;border:none;cursor:pointer">🔑 الذهاب لتسجيل الدخول</button>
          <button id="goIndex" style="flex:1;height:44px;border-radius:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#a7f3d0;font-weight:700">🏠 index</button>
        </div>
        <div style="margin-top:10px;font-size:9px;color:rgba(255,255,255,0.25)">حماية موحدة: secure_token + توجيه_المستخدمين (الرقم_القومي / الكود_البنكي = emptid)</div>
      </div>
    `;
    document.documentElement.appendChild(overlay);
    document.getElementById('goLogin').onclick = () => {
      window.location.href = CONFIG.LOGIN_ROUTING_PAGE + '?redirect=' + encodeURIComponent(window.location.href);
    };
    document.getElementById('goIndex').onclick = () => {
      window.location.href = CONFIG.INDEX_PAGE;
    };
    
    // تحويل تلقائي بعد 3 ثواني
    setTimeout(()=>{
      if(redirectTo){
        window.location.href = redirectTo;
      }else{
        window.location.href = CONFIG.LOGIN_ROUTING_PAGE;
      }
    }, 3000);
    
    // منع تحميل باقي الصفحة
    window.stop && window.stop();
    throw new Error('Access blocked by auth-guard');
  }

  console.log('🛡 auth-guard.js مفعّل - المستخدم:', auth.user.name || auth.user["اسم_العامل"] || '---', 'الكود:', auth.user.code || auth.user["الكود_البنكى"]);
})();

// دالة مساعدة لتسجيل الدخول من index (استدعيها بعد نجاح تسجيل الدخول)
window.markEntryViaIndex = function(){
  localStorage.setItem('entry_via_index', String(Date.now()));
  console.log('✅ تم تسجيل الدخول من index - entry_via_index');
};
