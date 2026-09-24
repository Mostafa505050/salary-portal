
// auth-guard.js - حارس مصادقة مؤمن سيبرانياً
(function(){
  'use strict';
  
  const SECURE_CONFIG = {
    maxLoginAge: 8 * 60 * 60 * 1000, // 8 ساعات
    allowedRedirects: ['index.html', '/index.html', './index.html'],
    codePattern: /^[A-Za-z0-9_\-]{2,30}$/
  };

  function safeJsonParse(str, fallback={}){
    try{
      if(!str || typeof str !== 'string') return fallback;
      if(str.length > 5000) return fallback; // حماية من payload كبير
      const obj = JSON.parse(str);
      if(typeof obj !== 'object' || obj === null) return fallback;
      return obj;
    }catch{ return fallback; }
  }

  function isValidSession(user){
    if(!user || typeof user !== 'object') return false;
    const code = String(user.code || user.emptid || user.id || '').trim();
    if(!code || !SECURE_CONFIG.codePattern.test(code)) return false;
    if(user.loginTime){
      const age = Date.now() - Number(user.loginTime);
      if(age > SECURE_CONFIG.maxLoginAge) return false;
    }
    // حماية من prototype pollution
    if('__proto__' in user || 'constructor' in user) return false;
    return true;
  }

  function secureRedirect(){
    // منع open redirect - فقط مسارات مسموحة
    window.location.replace('index.html');
  }

  function runGuard(){
    try{
      const logged = safeJsonParse(localStorage.getItem('logged_user'), null);
      const empCode = (localStorage.getItem('empCode')||'').trim();
      const emptid = (localStorage.getItem('emptid')||'').trim();

      // لو مفيش بيانات دخول
      if(!logged && !empCode && !emptid){
        secureRedirect();
        return;
      }

      // لو فيه logged_user لازم يكون صالح
      if(logged && !isValidSession(logged)){
        console.warn('[AuthGuard] Invalid session detected');
        localStorage.clear();
        secureRedirect();
        return;
      }

      // فحص سلامة الأكواد المخزنة
      const codesToCheck = [empCode, emptid].filter(Boolean);
      for(const c of codesToCheck){
        if(c.length > 50 || /[<>\"'`;\\]/.test(c)){
          console.warn('[AuthGuard] Malicious code in storage');
          localStorage.clear();
          secureRedirect();
          return;
        }
      }

      // منع تشغيل في iframe (Clickjacking protection)
      if(window.top !== window.self){
        window.top.location = window.self.location;
      }

    }catch(e){
      console.error('[AuthGuard] Error', e);
      // لا نكشف تفاصيل الخطأ للمستخدم
      localStorage.clear();
      window.location.replace('index.html');
    }
  }

  // شغل الحارس فوراً
  if(document.readyState === 'loading'){
    runGuard();
  }else{
    runGuard();
  }

  // مراقبة تغييرات localStorage المشبوهة
  window.addEventListener('storage', (e)=>{
    if(e.key === 'logged_user' && e.newValue && e.newValue.includes('__proto__')){
      localStorage.clear();
      secureRedirect();
    }
  });

})();
