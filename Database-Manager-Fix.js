
// إضافة هذه الدالة في Database-Manager.html - لتوحيد طريقة التعطيل
// ضعها بدل الدالة الحالية للتعطيل

function setPageStatusUnified(fileName, isEnabled){
  // مفتاح موحد
  const status = isEnabled ? 'مفعل' : 'معطل';
  
  // 1. حفظ مباشر
  localStorage.setItem(fileName + '_status', status);
  localStorage.setItem(fileName, status);
  
  // 2. حفظ في خريطة موحدة pagesStatus
  let pagesStatus = {};
  try{
    const existing = localStorage.getItem('pagesStatus');
    if(existing) pagesStatus = JSON.parse(existing);
  }catch(e){}
  
  pagesStatus[fileName] = isEnabled ? true : false; // boolean للفحص السهل
  pagesStatus[fileName + '_text'] = status;
  localStorage.setItem('pagesStatus', JSON.stringify(pagesStatus));
  
  // 3. حفظ في pageStatus أيضاً للتوافق
  localStorage.setItem('pageStatus', JSON.stringify(pagesStatus));
  
  console.log(`✅ تم ${status} الصفحة:`, fileName, '→ pagesStatus');
  
  // إظهار رسالة
  // alert(`تم ${status} الصفحة: ${fileName}`);
}

// مثال للاستخدام في أزرار التفعيل/التعطيل:
// بدل: localStorage.setItem('MyAdmin.html', 'معطل')
// استخدم: setPageStatusUnified('MyAdmin.html', false) // false = معطل
// و: setPageStatusUnified('MyAdmin.html', true) // true = مفعل
