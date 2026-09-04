
// في Database-Manager.html - استبدل saveToLocal بهذه النسخة التي تحافظ على صيغة Turso
function saveToLocal(){
  try{
    // احفظ الصيغة الأصلية كما هي (Turso)
    localStorage.setItem(LS_KEY, JSON.stringify(pageConfig));

    // === إصلاح شامل - يحافظ على بنية Turso ===
    // pageConfig عندك = {"AddHafez1.html":{"db":"Turso","enabled":false,...}}
    // نحتاج نحفظه في pagesStatus بنفس البنية
    localStorage.setItem('pagesStatus', JSON.stringify(pageConfig));
    localStorage.setItem('pageStatus', JSON.stringify(pageConfig));

    // وأيضاً احفظ مفاتيح منفصلة للتوافق
    for(let file in pageConfig){
      let cfg = pageConfig[file];
      let isEnabled = true;
      
      // cfg قد يكون {db:"Turso", enabled:true/false}
      if(typeof cfg === 'object' && cfg !== null){
        if(cfg.enabled === false) isEnabled = false;
        else if(cfg.enabled === true) isEnabled = true;
        else if(cfg.status === 'معطل') isEnabled = false;
      }else if(cfg === false || cfg === 'معطل'){
        isEnabled = false;
      }

      localStorage.setItem(file + '_status', isEnabled? 'مفعل' : 'معطل');
      localStorage.setItem(file, isEnabled? 'مفعل' : 'معطل');
    }

  }catch(e){ console.error('خطأ حفظ:', e); }
}

// وأيضاً عدّل دالة التفعيل/التعطيل لتغير enabled وليس تحذف الكائن
function togglePage(fileName){
  if(!pageConfig[fileName]) pageConfig[fileName] = {db:"Turso", enabled:true, updated:new Date().toISOString()};
  
  // اقلب الحالة
  const currentEnabled = pageConfig[fileName].enabled !== undefined ? pageConfig[fileName].enabled : true;
  pageConfig[fileName].enabled = !currentEnabled;
  pageConfig[fileName].updated = new Date().toISOString();
  pageConfig[fileName].db = "Turso";
  
  saveToLocal();
  
  // حدث الواجهة
  // renderTable() أو أي دالة عندك لتحديث الجدول
}
