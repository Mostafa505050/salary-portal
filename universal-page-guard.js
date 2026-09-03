**
 * universal-page-guard-FINAL-v3.js - نسخة نهائية قوية
 * تحذف كل محتوى الصفحة وتظهر فقط رسالة معطلة - تحل مشكلة ظهور العناصر في الأسفل نهائياً
 * ضعها كأول سطر في <head> في كل صفحة
 */
(function(){
  // إخفاء فوري جداً قبل أي رسم
  document.documentElement.style.visibility = 'hidden';
  document.documentElement.style.opacity = '0';

  function getCurrentFile(){
    let path = window.location.pathname;
    let file = path.split('/').pop() || 'index.html';
    file = file.split('?')[0].split('#')[0];
    if(!file) return 'index.html';
    if(!file.includes('.')) file += '.html';
    return file;
  }

  function isDisabled(fileName){
    try{
      const lower = fileName.toLowerCase();
      const raw = localStorage.getItem('pagesStatus');
      if(raw){
        try{
          const obj = JSON.parse(raw);
          // فحص مباشر وبحروف صغيرة
          for(let k in obj){
            if(k.toLowerCase() === lower){
              const cfg = obj[k];
              if(typeof cfg === 'object'){
                if(cfg.enabled === false) return {yes:true, src:`pagesStatus.${k}.enabled=false`};
                if(cfg.enabled === true) return {yes:false};
                if(cfg.status === 'معطل') return {yes:true, src:`pagesStatus.${k}.status=معطل`};
              }
              if(cfg === false) return {yes:true, src:`pagesStatus.${k}=false`};
              if(cfg === true) return {yes:false};
            }
          }
        }catch(e){}
      }
      // مفاتيح منفصلة
      const v = localStorage.getItem(fileName + '_status') || localStorage.getItem(fileName) || localStorage.getItem(lower + '_status');
      if(v){
        const lv = String(v).toLowerCase();
        if(lv.includes('معطل') || lv === 'false' || lv === 'disabled') return {yes:true, src:fileName+'_status='+v};
        if(lv.includes('مفعل') || lv === 'true') return {yes:false};
      }
    }catch(e){}
    return {yes:false};
  }

  function killPageAndShowDisabled(fileName, src){
    // هذه الدالة تمسح كل شيء تماماً وتترك فقط رسالة معطلة
    function doKill(){
      // احذف كل شيء من body
      if(document.body){
        document.body.innerHTML = '';
        document.body.style.cssText = 'margin:0; padding:0; background:#f9fafb; font-family:Cairo,sans-serif;';
        
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 20px; text-align:center; background:#fff;';
        wrapper.innerHTML = `
          <div style="width:100px;height:100px;border-radius:50%;background:linear-gradient(180deg,#fee2e2,#fecaca);border:5px solid #fca5a5;display:flex;align-items:center;justify-content:center;margin:0 auto 28px;font-size:56px">⛔</div>
          <h1 style="font-size:28px;font-weight:900;color:#7f1d1d;margin-bottom:10px">الصفحة معطلة</h1>
          <p style="font-size:16px;font-weight:700;color:#6b7280;margin-bottom:6px">${fileName}</p>
          <p style="font-size:13px;color:#9ca3af;margin-bottom:6px">تم تعطيلها من لوحة التحكم</p>
          <p style="font-size:10px;color:#e5e7eb;margin-top:12px;direction:ltr">Source: ${src}</p>
          <a href="Database-Manager.html" style="display:inline-flex;margin-top:28px;padding:14px 28px;border-radius:14px;background:linear-gradient(180deg,#6366f1,#4f46e5);color:#fff;text-decoration:none;font-size:14px;font-weight:800;box-shadow:0 6px 0 rgba(79,70,229,0.3)">🔧 لوحة التحكم</a>
          <a href="index.html" style="display:inline-flex;margin-top:14px;padding:12px 22px;border-radius:12px;background:#f3f4f6;color:#374151;text-decoration:none;font-size:13px;font-weight:700">🏠 الرئيسية</a>
          <div style="margin-top:24px;font-size:11px;color:#9ca3af">إذا كنت المسؤول، فعل الصفحة من Database-Manager.html</div>
        `;
        document.body.appendChild(wrapper);
        document.documentElement.style.visibility = 'visible';
        document.documentElement.style.opacity = '1';
        console.log('🚫 تم قتل الصفحة وإظهار معطلة فقط:', fileName, src);
      }
    }

    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', doKill);
    }else{
      doKill();
    }
    // حاول مرة أخرى بعد قليل للتأكد
    setTimeout(doKill, 100);
    setTimeout(doKill, 500);
  }

  function allowPage(){
    document.documentElement.style.visibility = 'visible';
    document.documentElement.style.opacity = '1';
    console.log('✅ صفحة مفعلة - السماح بالعرض:', getCurrentFile());
  }

  const file = getCurrentFile();
  console.log('🔍 فحص Turso:', file);

  if(file.toLowerCase().includes('database-manager')){
    allowPage();
    return;
  }

  const res = isDisabled(file);
  if(res.yes){
    killPageAndShowDisabled(file, res.src);
  }else{
    allowPage();
  }
})();
