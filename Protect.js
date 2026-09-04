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
