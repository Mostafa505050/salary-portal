/**
 * universal-page-guard.js - حماية شاملة لكل صفحات الموقع
 * يحل مشكلة ظهور العناصر في الأسفل عند تعطيل الصفحة من لوحة التحكم
 * ضع هذا الملف في جذر الموقع واعمله include في أول <head> في كل صفحة
 */
(function(){
  // منع ظهور الصفحة قبل الفحص - إخفاء فوري
  const style = document.createElement('style');
  style.id = 'guard-hide-style';
  style.textContent = 'html{visibility:hidden !important; opacity:0 !important;} html.guard-ready{visibility:visible !important; opacity:1 !important;} html.guard-disabled{visibility:visible !important; opacity:1 !important;}';
  document.documentElement.appendChild(style);

  function getCurrentFile(){
    let path = window.location.pathname;
    let file = path.split('/').pop();
    if(!file || file === '' || file === '/') return 'index.html';
    // إزالة الـ query string
    file = file.split('?')[0].split('#')[0];
    // لو بدون امتداد، أضف .html
    if(!file.includes('.')) file = file + '.html';
    return file;
  }

  function isPageDisabled(fileName){
    try{
      // أسماء الملف بدون مسار
      const baseName = fileName.replace('.html','');
      const lowerFile = fileName.toLowerCase();
      
      // 1. فحص مفاتيح مباشرة لكل صيغ الملف
      const directKeys = [
        fileName + '_status', fileName, baseName + '_status', baseName,
        'page_' + fileName, 'disabled_' + fileName, 'status_' + fileName,
        fileName + '_disabled', baseName + '_disabled',
        lowerFile + '_status', lowerFile
      ];
      
      for(let k of directKeys){
        const v = localStorage.getItem(k);
        if(v){
          const lv = String(v).toLowerCase();
          if(lv.includes('معطل') || lv.includes('disabled') || lv === 'false' || lv === '0' || lv === 'مغلق' || lv.includes('off')){
            console.log('🚫 معطل من المفتاح المباشر:', k, '=', v);
            return {disabled:true, source:k};
          }
        }
      }

      // 2. فحص خرائط JSON
      const mapKeys = ['pagesStatus','pageStatus','pages','DatabaseManager','TursoStatus','pageStatuses','appPagesStatus','sitePagesStatus','allPagesStatus'];
      for(let mk of mapKeys){
        const val = localStorage.getItem(mk);
        if(!val) continue;
        try{
          const obj = JSON.parse(val);
          // فحص بكل الصيغ
          const checkNames = [fileName, baseName, lowerFile, fileName.toLowerCase()];
          for(let ck of checkNames){
            if(obj[ck] !== undefined){
              const v = obj[ck];
              if(v === false || v === 0) return {disabled:true, source:mk+'.'+ck};
              if(typeof v === 'string' && (v.includes('معطل') || v.toLowerCase().includes('disabled') || v === 'false')) return {disabled:true, source:mk+'.'+ck};
              if(typeof v === 'object' && v.status !== undefined){
                if(v.status === false || String(v.status).includes('معطل') || String(v.status).toLowerCase().includes('disabled')) return {disabled:true, source:mk+'.'+ck+'.status'};
              }
            }
          }
          // فحص كل المفاتيح التي تحتوي اسم الملف
          for(let key in obj){
            if(key.toLowerCase() === lowerFile || key.toLowerCase() === baseName.toLowerCase()){
              const v = obj[key];
              if(v === false || (typeof v === 'string' && (v.includes('معطل') || v.toLowerCase().includes('disabled')))){
                return {disabled:true, source:mk+'.'+key};
              }
            }
          }
        }catch(e){}
      }

      // 3. فحص شامل لأي مفتاح يحتوي اسم الملف
      for(let i=0; i<localStorage.length; i++){
        const key = localStorage.key(i);
        if(!key) continue;
        const kl = key.toLowerCase();
        // لو المفتاح يحتوي اسم الملف
        if(kl.includes(lowerFile.replace('.html','')) || kl.includes(baseName.toLowerCase())){
          const val = localStorage.getItem(key);
          if(val){
            const lv = String(val).toLowerCase();
            if(lv.includes('معطل') || lv.includes('disabled') || lv === 'false' || lv === '0'){
              console.log('🚫 معطل من المفتاح العام:', key, val);
              return {disabled:true, source:key};
            }
          }
        }
      }

    }catch(e){ console.error('خطأ فحص التعطيل:', e); }
    return {disabled:false};
  }

  function showDisabledPage(fileName, source){
    // إزالة كل شيء وإظهار صفحة معطلة فقط
    document.documentElement.classList.remove('guard-ready');
    document.documentElement.classList.add('guard-disabled');
    
    // إخفاء كل العناصر الموجودة
    const hideStyle = document.createElement('style');
    hideStyle.textContent = `
      body > * { display:none !important; }
      #pageDisabledGlobal { display:flex !important; }
      html { visibility:visible !important; opacity:1 !important; }
    `;
    document.documentElement.appendChild(hideStyle);

    // إنشاء صفحة معطلة موحدة
    let disabledDiv = document.getElementById('pageDisabledGlobal');
    if(!disabledDiv){
      disabledDiv = document.createElement('div');
      disabledDiv.id = 'pageDisabledGlobal';
      disabledDiv.style.cssText = `
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        min-height:100vh; padding:40px 20px; text-align:center; font-family:Cairo, sans-serif;
        background:#fff; position:fixed; inset:0; z-index:999999;
      `;
      disabledDiv.innerHTML = `
        <div style="width:90px;height:90px;border-radius:50%;background:linear-gradient(180deg,#fee2e2,#fecaca);border:4px solid #fca5a5;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;font-size:48px">⛔</div>
        <h1 style="font-size:24px;font-weight:900;color:#7f1d1d;margin-bottom:8px">الصفحة معطلة</h1>
        <p style="font-size:14px;font-weight:700;color:#6b7280;margin-bottom:4px">${fileName} (localStorage)</p>
        <p style="font-size:12px;color:#9ca3af;margin-bottom:4px">تم تعطيل هذه الصفحة من لوحة التحكم</p>
        <p style="font-size:10px;color:#d1d5db;margin-top:8px">المصدر: ${source}</p>
        <a href="Database-Manager.html" style="display:inline-flex;margin-top:24px;padding:12px 24px;border-radius:12px;background:linear-gradient(180deg,#6366f1,#4f46e5);color:#fff;text-decoration:none;font-size:13px;font-weight:800;box-shadow:0 4px 0 rgba(79,70,229,0.3)">🔧 لوحة التحكم</a>
        <a href="index.html" style="display:inline-flex;margin-top:12px;padding:10px 20px;border-radius:10px;background:#f3f4f6;color:#374151;text-decoration:none;font-size:12px;font-weight:700">🏠 الصفحة الرئيسية</a>
        <div style="margin-top:20px;padding:12px;background:#f9fafb;border-radius:10px;font-size:10px;color:#6b7280;max-width:400px">
          إذا كنت المسؤول، فعل الصفحة من Database-Manager.html<br>
          المفتاح: ${source}
        </div>
      `;
      document.body.appendChild(disabledDiv);
    }
    
    // إظهار الصفحة
    const guardStyle = document.getElementById('guard-hide-style');
    if(guardStyle) guardStyle.remove();
    document.documentElement.style.visibility = 'visible';
    document.documentElement.style.opacity = '1';
    
    console.log('🚫 الصفحة معطلة - تم إخفاء كل المحتوى وإظهار صفحة معطلة فقط:', fileName);
  }

  // === الفحص الفوري عند التحميل ===
  const currentFile = getCurrentFile();
  console.log('🔍 فحص حالة الصفحة:', currentFile);
  
  // استثناء لوحة التحكم نفسها - لا تعطل أبداً
  if(currentFile.toLowerCase().includes('database-manager') || currentFile.toLowerCase().includes('myadmin')){
    // MyAdmin نفحصه لكن Database-Manager لا نعطله أبداً
    if(currentFile.toLowerCase().includes('database-manager')){
      console.log('✅ لوحة التحكم - لا يتم تعطيلها أبداً');
      document.documentElement.classList.add('guard-ready');
      const s = document.getElementById('guard-hide-style');
      if(s) setTimeout(()=>s.remove(), 100);
      return;
    }
  }

  const result = isPageDisabled(currentFile);
  if(result.disabled){
    // انتظر حتى body يكون موجود
    if(document.body){
      showDisabledPage(currentFile, result.source);
    }else{
      document.addEventListener('DOMContentLoaded', ()=>showDisabledPage(currentFile, result.source));
    }
  }else{
    console.log('✅ الصفحة مفعلة - إظهار المحتوى:', currentFile);
    document.documentElement.classList.add('guard-ready');
    // إزالة إخفاء بعد قليل
    setTimeout(()=>{
      const s = document.getElementById('guard-hide-style');
      if(s) s.remove();
      document.documentElement.style.visibility = 'visible';
      document.documentElement.style.opacity = '1';
    }, 100);
  }
})();
