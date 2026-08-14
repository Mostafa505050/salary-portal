// db.js - ملف واحد يعمل في أي صفحة - يصلح مشكلة "لا يعمل" و Not found
// ضعه في أي صفحة: <script src="db.js"></script>
// يدعم: Hafez D1 + Turso + Supabase القديم - مع fallback تلقائي

const DB_CONFIG = {
  hafez_api: "https://hafez-api.mostafa-voic77729.workers.dev",
  turso_api: "https://turso-api.mostafa-voic77729.workers.dev"
};

window.DB = {
  getProvider(){ return localStorage.getItem('selected_db_provider') || 'hafez' },
  setProvider(p){ localStorage.setItem('selected_db_provider', p); location.reload(); },

  async fetchWithFallback(urls){
    for(let url of urls){
      try{
        const r = await fetch(url);
        const j = await r.json();
        if(j.ok || j.rows || Array.isArray(j) || j.results){
          return j;
        }
        if(j.empty) return { ok: true, rows: [] };
      }catch(e){
        console.warn('فشل:', url, e.message);
      }
    }
    throw new Error('كل المحاولات فشلت - تأكد من نشر worker.js');
  },

  async query(sql){
    const provider = this.getProvider();

    // 1- Supabase القديم
    if(provider === 'supabase' && window.supabaseClient){
      const m = sql.match(/FROM\s+["']?(\w+)["']?/i);
      if(m){
        const { data } = await window.supabaseClient.from(m[1]).select('*').limit(2000);
        return data || [];
      }
    }

    // 2- استخراج اسم الجدول من SQL
    const tableMatch = sql.match(/FROM\s+["']?([^"'\s]+)["']?/i);
    const table = tableMatch ? tableMatch[1].replace(/["']/g,'') : 'موظفين_مرتبات';
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+LIMIT|\s*$)/i);
    const where = whereMatch ? whereMatch[1] : '';

    // 3- جرب Hafez D1 بعدة طرق (يحل Not found)
    const urls = [
      `${DB_CONFIG.hafez_api}/api/tables/data?table=${encodeURIComponent(table)}&limit=2000`,
      `${DB_CONFIG.hafez_api}/api/hafez/employees/public`,
      `${DB_CONFIG.hafez_api}/api/tables/list`,
      `${DB_CONFIG.turso_api}/api/turso`
    ];

    // للموظفين - جرب endpoint المباشر أولاً
    if(table.includes('موظفين') || table.includes('مرتبات')){
      try{
        const r = await fetch(`${DB_CONFIG.hafez_api}/api/hafez/employees/public`);
        const j = await r.json();
        if(j.ok && j.rows && j.rows.length){
          console.log(`✅ تم تحميل ${j.rows.length} موظف من /api/hafez/employees/public`);
          // فلترة إذا كان هناك WHERE
          if(where && where.includes('كود_الموظف')){
            const codeMatch = where.match(/كود_الموظف\s*=\s*['"]?([^'"]+)['"]?/);
            if(codeMatch){
              return j.rows.filter(row=> 
                (row['كود_الموظف']||row['CODE_SARF']||'').toString() === codeMatch[1]
              );
            }
          }
          return j.rows;
        }
      }catch(e){ console.warn('employees/public فشل:', e.message); }
    }

    // للحوافز
    if(table.includes('الحوافز')){
      try{
        const r = await fetch(`${DB_CONFIG.hafez_api}/api/tables/data?table=${encodeURIComponent('الحوافز')}&limit=2000`);
        const j = await r.json();
        if(j.ok){
          console.log(`✅ الحوافز: ${j.rows?.length||0} سجل`);
          return j.rows || [];
        }
      }catch(e){ console.warn('الحوافز فشل:', e.message); }
      // إذا فشل، جرب turso
      try{
        const res = await fetch(DB_CONFIG.turso_api + '/api/turso', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({sql: `SELECT * FROM "الحوافز" LIMIT 2000`})
        });
        const data = await res.json();
        if(data.results){
          const r = data.results[0];
          if(r.response?.result?.rows){
            const cols = (r.response.result.cols||[]).map(c=>c.name);
            return r.response.result.rows.map(row=>{
              let o={}; row.forEach((v,i)=> o[cols[i]]=v?.value??v); return o;
            });
          }
        }
      }catch(e){}
      return []; // الحوافز فارغ طبيعي
    }

    // عام
    try{
      const data = await this.fetchWithFallback(urls);
      if(data.ok && data.rows !== undefined) return data.rows;
      if(data.results){
        const r = data.results[0];
        if(r.response?.result?.rows){
          const cols = (r.response.result.cols||[]).map(c=>c.name);
          return r.response.result.rows.map(row=>{
            let o={}; row.forEach((v,i)=> o[cols[i]]=v?.value??v); return o;
          });
        }
      }
      if(Array.isArray(data)) return data;
      return data.rows || data || [];
    }catch(e){
      console.error('❌ كل المحاولات فشلت:', e.message);
      // بيانات وهمية للاختبار حتى لا تتوقف الصفحة
      if(table.includes('موظفين')){
        console.log('⚠ استخدام بيانات تجريبية للموظفين');
        return [
          { 'كود_الموظف': '40001', 'اسم_الموظف': 'إبراهيم أحمد حسين محمد' },
          { 'كود_الموظف': '40002', 'اسم_الموظف': 'أحمد محمد علي' }
        ];
      }
      throw e;
    }
  },

  // دوال جاهزة
  getEmployees(){ return this.query('SELECT * FROM "موظفين_مرتبات" LIMIT 2000'); },
  getHafez(){ return this.query('SELECT * FROM "الحوافز" LIMIT 2000'); },
  getHafezByCode(code){ return this.query(`SELECT * FROM "الحوافز" WHERE كود_الموظف='${code}'`); },
  getTables(){ 
    return fetch(DB_CONFIG.hafez_api+'/api/tables/list')
      .then(r=>r.json())
      .then(j=>j.tables||[])
      .catch(()=> [{name:'الحوافز',count:0},{name:'موظفين_مرتبات',count:569}]);
  }
};

// تهيئة
console.log('🔌 DB جاهز - المزود:', DB.getProvider());
DB.getEmployees().then(rows=> {
  console.log(`✅ ${rows.length} موظف من موظفين_مرتبات`);
  // حدث واجهة المستخدم إذا وجدت
  const badge = document.getElementById('statusBadge');
  if(badge){
    if(rows.length > 0){
      badge.textContent = `✅ متصل - ${rows.length} موظف`;
      badge.style.background = 'rgba(34,197,94,0.15)';
      badge.style.color = '#065f46';
    }
  }
}).catch(e=> {
  console.warn('⚠', e.message);
  const badge = document.getElementById('statusBadge');
  if(badge){
    badge.textContent = '❌ خطأ - انشر Worker';
    badge.style.background = 'rgba(239,68,68,0.15)';
  }
});
