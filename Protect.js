// protect.js - ملف حماية يوضع بجانب الصفحات
// ضعه في مجلد js/ بجانب الصفحات: /js/protect.js

(function() {
  // قائمة الصفحات المحجوبة (نفس قائمة _worker.js)
  const BLOCKED_PAGES = ['tables.html', 'tables', 'AddHafez1.html', 'AddHafez1', 'pageAdmin1.html', 'salaryold.html'];
  
  // تحقق هل الصفحة الحالية محجوبة (حماية إضافية من جانب العميل)
  function isCurrentPageBlocked() {
    const path = window.location.pathname.toLowerCase();
    const page = path.split('/').pop().toLowerCase();
    return BLOCKED_PAGES.some(b => b.toLowerCase() === page || path.includes(b.toLowerCase()));
  }

  // إذا كانت الصفحة محجوبة على جانب العميل، اعرض رسالة
  function showBlockedMessage() {
    if (isCurrentPageBlocked()) {
      // هذه الحماية إضافية فقط - الحماية الحقيقية من السيرفر (_worker.js)
      console.log('🔒 هذه الصفحة محجوبة من السيرفر');
    }
  }

  // دالة لإدراج الحماية في أي صفحة
  function initProtection() {
    showBlockedMessage();
    
    // أضف حماية للروابط
    document.addEventListener('click', function(e) {
      const link = e.target.closest('a');
      if (link) {
        const href = link.getAttribute('href') || '';
        const isBlockedLink = BLOCKED_PAGES.some(b => href.toLowerCase().includes(b.toLowerCase()));
        if (isBlockedLink) {
          e.preventDefault();
          alert('🔒 هذه الصفحة مغلقة حالياً من قبل الإدارة');
          return false;
        }
      }
    });
  }

  // تشغيل عند تحميل الصفحة
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProtection);
  } else {
    initProtection();
  }

  // تصدير للاستخدام الخارجي
  window.PageProtection = {
    isBlocked: isCurrentPageBlocked,
    blockedList: BLOCKED_PAGES,
    checkPage: function(pageName) {
      const low = pageName.toLowerCase();
      return BLOCKED_PAGES.some(b => b.toLowerCase() === low || b.toLowerCase().includes(low));
    }
  };

  console.log('🛡️ ملف الحماية تم تحميله - الإصدار الخيالي');
})();
