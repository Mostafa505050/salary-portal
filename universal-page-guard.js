/**
 * universal-page-guard-v2.js - يتعرف على صيغة Turso الخاصة بك
 * من الصورة: pagesStatus = {"AddHafez1.html":{"db":"Turso","enabled":true/false}, ...}
 */
(function(){
  const hideStyle = document.createElement('style');
  hideStyle.id = 'guard-hide-style';
  hideStyle.textContent = 'html{visibility:hidden !important; opacity:0 !important;} html.guard-ready{visibility:visible !important; opacity:1 !important;} html.guard-disabled{visibility:visible !important; opacity:1 !important;}';
  document.documentElement.appendChild(hideStyle);

  function getCurrentFile(){
    let path = window.location.pathname;
    let file = path.split('/').pop() || 'index.html';
    file = file.split('?')[0].split('#')[0];
    if(!file.includes('.')) file += '.html';
    return file;
  }

  function isPageDisabled(fileName){
    try{
      const lowerFile = fileName.toLowerCase();
      const baseName = fileName.replace('.html','');

      // === 1. فحص pagesStatus بالصيغة الجديدة Turso ===
      // الصورة تظهر: {"AddHafez1.html":{"db":"Turso","enabled":true/false,"updated":...}}
      const pagesStatusRaw = localStorage.getItem('pagesStatus');
      if(pagesStatusRaw){
        try{
          const pagesStatus = JSON.parse(pagesStatusRaw);
          // فحص مباشر
          const keysToCheck = [fileName, baseName, lowerFile, fileName.toLowerCase()];
          for(let k of keysToCheck){
            if(pagesStatus[k] !== undefined){
              const cfg = pagesStatus[k];
              // الحالة 1: cfg هو object فيه enabled
              if(typeof cfg === 'object' && cfg !== null){
                if(cfg.enabled === false) return {disabled:true, source:`pagesStatus.${k}.enabled=false`};
                if(cfg.enabled === true) return {disabled:false};
                if(cfg.status === 'معطل' || cfg.status === false || cfg.status === 'disabled') return {disabled:true, source:`pagesStatus.${k}.status=${cfg.status}`};
                // لو cfg.enabled غير موجود، فحص isEnabled
                if(cfg.isEnabled === false) return {disabled:true, source:`pagesStatus.${k}.isEnabled=false`};
              }
              // الحالة 2: cfg هو boolean
              if(cfg === false) return {disabled:true, source:`pagesStatus.${k}=false`};
              if(cfg === true) return {disabled:false};
              // الحالة 3: cfg هو string
              if(typeof cfg === 'string'){
                if(cfg.includes('معطل') || cfg.toLowerCase().includes('disabled') || cfg === 'false') return {disabled:true, source:`pagesStatus.${k}="${cfg}"`};
                if(cfg.includes('مفعل') || cfg === 'true') return {disabled:false};
              }
            }
          }
          // فحص شامل لكل المفاتيح (case-insensitive)
          for(let key in pagesStatus){
            if(key.toLowerCase() === lowerFile){
              const cfg = pagesStatus[key];
              if(typeof cfg === 'object' && cfg.enabled === false) return {disabled:true, source:`pagesStatus.${key}.enabled=false`};
              if(cfg === false) return {disabled:true, source:`pagesStatus.${key}=false`};
            }
          }
        }catch(e){ console.log('خطأ parse pagesStatus:', e); }
      }

      // === 2. فحص مفاتيح منفصلة (من إصلاح saveToLocal) ===
      const directKeys = [fileName+'_status', fileName, baseName+'_status', lowerFile+'_status'];
      for(let k of directKeys){
        const v = localStorage.getItem(k);
        if(v){
          const lv = String(v).toLowerCase();
          if(lv.includes('معطل') || lv.includes('disabled') || lv === 'false' || lv === '0'){
            return {disabled:true, source:k+'='+v};
          }
          if(lv.includes('مفعل') || lv === 'true') return {disabled:false};
        }
      }

      // === 3. فحص pageStatus و LS_KEY القديم ===
      const otherKeys = ['pageStatus','myAdminPages','databaseManagerConfig','DatabaseManager','sitePages'];
      for(let mk of otherKeys){
        const val = localStorage.getItem(mk);
        if(!val) continue;
        try{
          const obj = JSON.parse(val);
          if(obj[fileName] !== undefined){
            const cfg = obj[fileName];
            if(typeof cfg === 'object' && cfg.enabled === false) return {disabled:true, source:`${mk}.${fileName}.enabled=false`};
            if(cfg === false) return {disabled:true, source:`${mk}.${fileName}=false`};
          }
        }catch(e){}
      }

    }catch(e){ console.error('خطأ فحص:', e); }
    return {disabled:false};
  }

  function showDisabledPage(fileName, source){
    document.documentElement.classList.remove('guard-ready');
    document.documentElement.classList.add('guard-disabled');
    
    const hideAll = document.createElement('style');
    hideAll.textContent = `body > * { display:none !important; } #pageDisabledGlobal { display:flex !important; } html { visibility:visible !important; opacity:1 !important; }`;
    document.documentElement.appendChild(hideAll);

    let div = document.getElementById('pageDisabledGlobal');
    if(!div){
      div = document.createElement('div');
      div.id = 'pageDisabledGlobal';
      div.style.cssText = `display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; padding:40px 20px; text-align:center; font-family:Cairo,sans-serif; background:#fff; position:fixed; inset:0; z-index:999999;`;
      div.innerHTML = `
        <div style="width:90px;height:90px;border-radius:50%;background:linear-gradient(180deg,#fee2e2,#fecaca);border:4px solid #fca5a5;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;font-size:48px">⛔</div>
        <h1 style="font-size:24px;font-weight:900;color:#7f1d1d;margin-bottom:8px">الصفحة معطلة</h1>
        <p style="font-size:14px;font-weight:700;color:#6b7280;margin-bottom:4px">${fileName}</p>
        <p style="font-size:12px;color:#9ca3af;margin-bottom:4px">تم تعطيلها من لوحة التحكم - Turso</p>
        <p style="font-size:10px;color:#d1d5db;margin-top:8px">المصدر: ${source}</p>
        <a href="Database-Manager.html" style="display:inline-flex;margin-top:24px;padding:12px 24px;border-radius:12px;background:linear-gradient(180deg,#6366f1,#4f46e5);color:#fff;text-decoration:none;font-size:13px;font-weight:800">🔧 لوحة التحكم</a>
        <a href="index.html" style="display:inline-flex;margin-top:12px;padding:10px 20px;border-radius:10px;background:#f3f4f6;color:#374151;text-decoration:none;font-size:12px;font-weight:700">🏠 الرئيسية</a>
      `;
      document.body.appendChild(div);
    }
    
    const gs = document.getElementById('guard-hide-style');
    if(gs) gs.remove();
    document.documentElement.style.visibility = 'visible';
    document.documentElement.style.opacity = '1';
    console.log('🚫 صفحة معطلة - تم الإخفاء:', fileName, source);
  }

  const currentFile = getCurrentFile();
  console.log('🔍 فحص:', currentFile);

  // لوحة التحكم لا تعطل أبداً
  if(currentFile.toLowerCase().includes('database-manager')){
    console.log('✅ لوحة التحكم - لا تعطل');
    document.documentElement.classList.add('guard-ready');
    setTimeout(()=>{ const s=document.getElementById('guard-hide-style'); if(s) s.remove(); }, 100);
    return;
  }

  const result = isPageDisabled(currentFile);
  if(result.disabled){
    if(document.body) showDisabledPage(currentFile, result.source);
    else document.addEventListener('DOMContentLoaded', ()=>showDisabledPage(currentFile, result.source));
  }else{
    console.log('✅ مفعلة:', currentFile);
    document.documentElement.classList.add('guard-ready');
    setTimeout(()=>{ const s=document.getElementById('guard-hide-style'); if(s) s.remove(); document.documentElement.style.visibility='visible'; document.documentElement.style.opacity='1'; }, 100);
  }
})();
