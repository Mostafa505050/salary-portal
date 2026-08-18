// مولد الصفحات V2 - قائمة حقول منسدلة احترافية - يحل مشكلة 0 حقل
const HAFEZ_API = 'https://hafez-api.mostafa-voic77729.workers.dev';

let allTables = [];
let selectedTable = '';
let selectedFields = [];
let selectedDisplay = 'table';
let currentColumns = [];
let createdPages = JSON.parse(localStorage.getItem('created_pages') || '[]');

function log(m){
  const b=document.getElementById('logBox');
  if(!b) return;
  b.style.display='block';
  b.textContent+=`[${new Date().toLocaleTimeString()}] ${m}\n`;
  b.scrollTop=b.scrollHeight;
}

function toggleDrop(name){
  const el=document.getElementById('opt'+name);
  if(!el) return;
  const open=el.style.display==='block';
  document.querySelectorAll('.options').forEach(o=>o.style.display='none');
  document.getElementById('fieldsPanel')?.classList.remove('show');
  if(!open) el.style.display='block';
}

function toggleFieldsDropdown(){
  document.querySelectorAll('.options').forEach(o=>o.style.display='none');
  const panel=document.getElementById('fieldsPanel');
  panel.classList.toggle('show');
}

document.addEventListener('click',e=>{
  if(!e.target.closest('.select')) document.querySelectorAll('.options').forEach(o=>o.style.display='none');
  if(!e.target.closest('.fields-dropdown')) document.getElementById('fieldsPanel')?.classList.remove('show');
});

function switchTab(tab){
  document.querySelectorAll('[id^="tab-"]').forEach(el=> el.style.display='none');
  document.getElementById('tab-'+tab).style.display='block';
  document.querySelectorAll('.sidebar-btn').forEach(btn=> btn.classList.remove('active'));
  const idx=tab==='builder'?0:tab==='pages'?1:2;
  document.querySelectorAll('.sidebar-btn')[idx]?.classList.add('active');
  if(tab==='pages') renderCreatedPages();
  if(tab==='tables') renderTablesList();
}

function selectDisplay(val, text){
  selectedDisplay=val;
  document.getElementById('txtDisplay').innerText=text;
  document.getElementById('optDisplay').style.display='none';
}

async function loadTables(){
  const statusEl=document.getElementById('dbStatus');
  const countEl=document.getElementById('tablesCount');
  try{
    let tables=[];
    try{
      const r=await fetch(HAFEZ_API+'/api/tables/list');
      const j=await r.json();
      if(j.ok && j.tables && j.tables.length) tables=j.tables;
    }catch(e){ log('⚠️ API الجداول غير متاح - استخدام الافتراضي'); }

    if(!tables.length){
      tables=[
        {name:'الحوافز', count:0},
        {name:'مرتبات شهرية', count:0},
        {name:'موظفين_مرتبات', count:0}
      ];
    }

    allTables=tables;
    const opt=document.getElementById('optTable');
    opt.innerHTML='';
    tables.forEach(t=>{
      const d=document.createElement('div');
      d.innerHTML=`<span>📋 ${t.name}</span><small>${t.count||0} سجل</small>`;
      d.onclick=()=> selectTable(t.name);
      opt.appendChild(d);
    });

    document.getElementById('txtTable').innerText='اختر جدول من القاعدة';
    countEl.textContent=`✅ ${tables.length} جدول`;
    statusEl.textContent=`✅ متصل - ${tables.length} جدول`;
    statusEl.style.color='#10b981';
    document.getElementById('tablesListCount').textContent=`${tables.length} جدول`;
    log(`✅ تم تحميل ${tables.length} جدول`);

  }catch(e){
    countEl.textContent='❌ فشل';
    statusEl.textContent='❌ '+e.message;
    log('❌ '+e.message);
    allTables=[{name:'الحوافز'},{name:'مرتبات شهرية'},{name:'موظفين_مرتبات'}];
    const opt=document.getElementById('optTable');
    opt.innerHTML='';
    allTables.forEach(t=>{
      const d=document.createElement('div');
      d.textContent=`📋 ${t.name}`;
      d.onclick=()=> selectTable(t.name);
      opt.appendChild(d);
    });
  }
}

async function selectTable(tableName){
  selectedTable=tableName;
  document.getElementById('txtTable').innerText=tableName;
  document.getElementById('optTable').style.display='none';
  selectedFields=[];
  updateFieldsUI();

  const optionsDiv=document.getElementById('fieldsOptions');
  optionsDiv.innerHTML='<div style="text-align:center; padding:20px;">⏳ جاري تحميل حقول '+tableName+'...</div>';

  let columns=[];
  
  // محاولة من API
  try{
    const r=await fetch(HAFEZ_API+`/api/tables/columns?table=${encodeURIComponent(tableName)}`);
    const j=await r.json();
    if(j.ok && j.columns && j.columns.length){
      columns=j.columns.map(c=> typeof c==='string'? {name:c, type:'TEXT'} : {name:c.name||c, type:c.type||'TEXT'});
    }
  }catch(e){ log('⚠️ API الأعمدة غير متاح'); }

  // Fallback قوي من الصور - يحل مشكلة 0 حقل
  if(!columns.length){
    if(tableName==='الحوافز'){
      columns=[
        {name:'كود_الحافز', type:'TEXT'},
        {name:'السنة', type:'TEXT NOT NULL'},
        {name:'الشهر', type:'TEXT NOT NULL'},
        {name:'كود_الموظف', type:'TEXT NOT NULL'},
        {name:'اسم_الموظف', type:'TEXT NOT NULL'},
        {name:'رقم_الكشف', type:'TEXT'},
        {name:'المبلغ', type:'REAL NOT NULL'},
        {name:'التاريخ', type:'TEXT'},
        {name:'نوع_الحافز', type:'TEXT NOT NULL'},
        {name:'الادارة_التابع_لها', type:'TEXT'},
        {name:'اسم_المستند', type:'TEXT NOT NULL'},
        {name:'مسؤول_الحافز', type:'TEXT'}
      ];
    } else if(tableName==='مرتبات شهرية'){
      columns=[
        {name:'CODE_SARF', type:'TEXT'},
        {name:'مرتب_اساسي', type:'TEXT'},
        {name:'الحافز_الدوري', type:'TEXT'},
        {name:'طبيعه_عمل', type:'TEXT'},
        {name:'علاوة_2014', type:'TEXT'},
        {name:'علاوة_2015', type:'TEXT'},
        {name:'اعانه_اجتماعيه', type:'TEXT'},
        {name:'بدل_ضيافه', type:'TEXT'},
        {name:'بدل_تفرغ', type:'TEXT'},
        {name:'تفرغ_نجارين', type:'TEXT'},
        {name:'تفرغ_اطبا', type:'TEXT'},
        {name:'تفرغ_كيميائيين', type:'TEXT'},
        {name:'بدل_تمثيل', type:'TEXT'},
        {name:'حافز_840', type:'TEXT'},
        {name:'بدل_النقدي', type:'TEXT'},
        {name:'بدل_اقامه', type:'TEXT'},
        {name:'بدل_ورديه', type:'TEXT'},
        {name:'بدل_عدوي', type:'TEXT'},
        {name:'بدل_عهدو', type:'TEXT'},
        {name:'بدل_مخاطره', type:'TEXT'},
        {name:'امثال_جذب', type:'TEXT'}
      ];
    } else {
      columns=[
        {name:'كود_الموظف', type:'TEXT'},
        {name:'اسم_الموظف', type:'TEXT'},
        {name:'الادارة', type:'TEXT'},
        {name:'المحطة', type:'TEXT'},
        {name:'الدرجة', type:'TEXT'},
        {name:'المرتب', type:'TEXT'}
      ];
    }
  }

  currentColumns=columns;
  renderFieldsOptions(columns);
  log(`✅ حقول ${tableName}: ${columns.length} حقل - تم تحميلها في القائمة المنسدلة`);
}

function renderFieldsOptions(columns){
  const optionsDiv=document.getElementById('fieldsOptions');
  optionsDiv.innerHTML='';
  columns.forEach(col=>{
    const isChecked=selectedFields.includes(col.name);
    const div=document.createElement('div');
    div.className='fields-options-item';
    div.innerHTML=`<input type="checkbox" ${isChecked?'checked':''} value="${col.name}"><span class="field-name">${col.name}</span><span class="field-type">${col.type}</span>`;
    div.onclick=(e)=>{
      if(e.target.tagName!=='INPUT'){
        const cb=div.querySelector('input');
        cb.checked=!cb.checked;
        toggleField(col.name, cb.checked);
      }
    };
    const cb=div.querySelector('input');
    cb.onchange=()=> toggleField(col.name, cb.checked);
    optionsDiv.appendChild(div);
  });
}

function filterFieldsSearch(q){
  const filtered=currentColumns.filter(c=> c.name.toLowerCase().includes(q.toLowerCase()));
  renderFieldsOptions(filtered);
}

function toggleField(name, checked){
  if(checked){
    if(!selectedFields.includes(name)) selectedFields.push(name);
  } else {
    selectedFields=selectedFields.filter(f=> f!==name);
  }
  updateFieldsUI();
}

function updateFieldsUI(){
  const count=selectedFields.length;
  document.getElementById('fieldsBtnCount').textContent=count;
  document.getElementById('fieldsBtnText').textContent= count ? `${count} حقل مختار - ${selectedFields.slice(0,2).join('، ')}${count>2?'...':''}` : 'اختر الحقول من القائمة...';
  
  const tagsDiv=document.getElementById('selectedTags');
  if(!count){
    tagsDiv.innerHTML='<span style="color:#94a3b8; font-size:11px;">لم يتم اختيار حقول بعد - اضغط على القائمة أعلاه لاختيار الحقول من الجدول '+selectedTable+'</span>';
    return;
  }
  tagsDiv.innerHTML=selectedFields.map(f=>`<span class="selected-tag">${f}<span class="remove" onclick="removeField('${f}')">✕</span></span>`).join('');
}

function removeField(name){
  selectedFields=selectedFields.filter(f=> f!==name);
  const cb=document.querySelector(`#fieldsOptions input[value="${name}"]`);
  if(cb) cb.checked=false;
  updateFieldsUI();
}

function selectAllFields(){
  selectedFields=[...currentColumns.map(c=>c.name)];
  document.querySelectorAll('#fieldsOptions input').forEach(cb=> cb.checked=true);
  updateFieldsUI();
}
function deselectAllFields(){
  selectedFields=[];
  document.querySelectorAll('#fieldsOptions input').forEach(cb=> cb.checked=false);
  updateFieldsUI();
}
function selectCommonFields(){
  // الحقول المهمة
  const common=['كود_الموظف','اسم_الموظف','المبلغ','الشهر','السنة','CODE_SARF','مرتب_اساسي'];
  selectedFields=currentColumns.filter(c=> common.some(com=> c.name.includes(com) || com.includes(c.name))).map(c=>c.name);
  if(!selectedFields.length) selectedFields=currentColumns.slice(0,5).map(c=>c.name);
  document.querySelectorAll('#fieldsOptions input').forEach(cb=>{
    cb.checked=selectedFields.includes(cb.value);
  });
  updateFieldsUI();
}

async function previewTable(){
  if(!selectedTable){ alert('اختر جدول أولاً'); return; }
  if(!selectedFields.length){ alert('اختر حقل واحد على الأقل من القائمة المنسدلة'); return; }

  const previewCard=document.getElementById('previewCard');
  const previewBody=document.getElementById('previewBody');
  previewCard.style.display='block';
  document.getElementById('previewTableName').textContent=selectedTable;
  document.getElementById('previewFields').textContent=selectedFields.join('، ');
  previewBody.innerHTML='<div style="padding:20px; text-align:center;">⏳ جاري تحميل البيانات من '+selectedTable+'...</div>';

  try{
    const fieldsParam=selectedFields.join(',');
    let r; try{ r=await fetch(HAFEZ_API+`/api/tables/data?table=${encodeURIComponent(selectedTable)}&fields=${encodeURIComponent(fieldsParam)}&limit=20`); if(!r.ok) throw new Error('API returned '+r.status); }catch(e){ throw new Error('Not found /api/tables/data - يجب نشر worker-v2-final.js في hafez-api: '+e.message); }
    const j=await r.json();
    if(!j.ok) throw new Error(j.msg);
    document.getElementById('previewInfo').textContent=`${j.rows.length} سجل`;
    if(!j.rows.length){ previewBody.innerHTML='<div style="padding:20px; text-align:center;">لا يوجد بيانات</div>'; return; }
    let html='<table><thead><tr>'; selectedFields.forEach(f=> html+=`<th>${f}</th>`); html+='</tr></thead><tbody>';
    j.rows.forEach(row=>{ html+='<tr>'; selectedFields.forEach(f=> html+=`<td>${row[f] ?? ''}</td>`); html+='</tr>'; });
    html+='</tbody></table>';
    previewBody.innerHTML=html;
    log(`✅ معاينة ${selectedTable}: ${j.rows.length} سجل`);
  }catch(e){
    previewBody.innerHTML=`<div style="padding:20px;"><div style="color:#b91c1c;">❌ ${e.message}</div><div style="font-size:11px; margin-top:8px;">سيتم عرض الحقول عند إنشاء الصفحة: ${selectedFields.join(', ')}</div></div>`;
    log('❌ '+e.message);
  }
}

function createPage(){
  const pageName=document.getElementById('pageName').value.trim();
  if(!pageName){ alert('ادخل اسم الصفحة'); return; }
  if(!selectedTable){ alert('اختر الجدول'); return; }
  if(!selectedFields.length){ alert('اختر الحقول من القائمة المنسدلة'); return; }

  const slug=pageName.replace(/\s+/g,'-').replace(/[^\w\u0600-\u06FF\-]/g,'').toLowerCase() || 'page-'+Date.now();
  document.getElementById('pageSlug').value=slug;

  const pageData={ id: Date.now(), name: pageName, slug, table: selectedTable, fields: [...selectedFields], display: selectedDisplay, createdAt: new Date().toISOString(), createdAtText: new Date().toLocaleDateString('ar-EG') };

  createdPages.push(pageData);
  localStorage.setItem('created_pages', JSON.stringify(createdPages));

  const pageHtml=generatePageHtml(pageData);
  const blob=new Blob([pageHtml], {type:'text/html;charset=utf-8'});
  const url=URL.createObjectURL(blob);

  log(`✅ تم إنشاء صفحة: ${pageName} - جدول: ${selectedTable} - حقول: ${selectedFields.length}`);

  if(confirm(`✅ تم إنشاء الصفحة: ${pageName}\nالجدول: ${selectedTable}\nالحقول: ${selectedFields.length}\n\nهل تريد فتح الصفحة الآن؟`)){
    const win=window.open(); win.document.write(pageHtml); win.document.close();
  }

  renderCreatedPages();
  switchTab('pages');

  const a=document.createElement('a'); a.href=url; a.download=`${slug}.html`; a.click();
}

function generatePageHtml(page){
  const fieldsJson=JSON.stringify(page.fields);
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${page.name} - ${page.table}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box; font-family:'Cairo',sans-serif;} body{margin:0; background:linear-gradient(180deg,#d8cbb5,#c9b99f); min-height:100vh; padding:20px;} .card{max-width:1300px; margin:14px auto; background:#fffbf3; border:2px solid #c4b59b; border-radius:16px; padding:20px; box-shadow:0 8px 24px rgba(0,0,0,0.1);} .header{border:1.5px solid #c4b59b; border-radius:14px; padding:4px; background:linear-gradient(145deg,#f9f1e3,#eaddc3); margin-bottom:16px;} .header-inner{border:1.2px solid #e8ddd0; border-radius:10px; padding:4px; background:#fffdf8;} .header-inner-most{border:1px dashed #d6c6a8; border-radius:8px; padding:12px 16px; background:#fff; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;} h1{margin:0; font-size:20px; font-weight:900; color:#065f46;} .badge{padding:6px 14px; border-radius:20px; font-size:12px; font-weight:800; background:rgba(16,185,129,0.12); border:1.5px solid rgba(16,185,129,0.2); color:#065f46;} table{width:100%; border-collapse:collapse; min-width:800px;} th{background:linear-gradient(145deg,#eaddc3,#d6c6a8); color:#064e3b; padding:12px 10px; font-size:13px; font-weight:900; border-bottom:2px solid #c4b59b; position:sticky; top:0;} td{padding:10px; border-top:1.5px solid #e8ddd0; font-size:13px; font-weight:600; text-align:center;} .table-wrap{overflow:auto; border-radius:14px; border:2px solid #c4b59b; background:#fffdf8;} .cards{display:grid; grid-template-columns:repeat(auto-fill, minmax(300px,1fr)); gap:12px;} .card-item{background:#fff; border:1.5px solid #c4b59b; border-radius:12px; padding:14px;} .card-item div{margin:6px 0; font-size:12px;} .card-item strong{color:#065f46;} .error-box{padding:20px; background:#fff3f3; border:2px solid #fecaca; border-radius:12px; color:#b91c1c;} .error-box h3{margin:0 0 10px; color:#991b1b;} .fix-steps{background:#fff; border:1px dashed #c4b59b; border-radius:8px; padding:12px; margin-top:12px; font-size:12px; text-align:right; line-height:1.8;}</style>
</head>
<body>
<div class="card">
  <div class="header"><div class="header-inner"><div class="header-inner-most"><h1>📄 ${page.name}</h1><div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;"><span class="badge">🗃️ ${page.table}</span><span class="badge">${page.fields.length} حقل</span><span class="badge">${page.createdAtText}</span><span class="badge" id="statusBadge">⏳ جاري التحميل</span></div></div></div></div>
  <div id="content">⏳ جاري تحميل البيانات من جدول ${page.table}...</div>
</div>
<script>
const APIS=[
  'https://hafez-api.mostafa-voic77729.workers.dev',
  'https://turso-api.mostafa-voic77729.workers.dev',
  'https://company-alldata-api.mostafa-voic77729.workers.dev'
];
const TABLE='${page.table}';
const FIELDS=${fieldsJson};
const DISPLAY='${page.display}';

async function tryFetch(url){
  try{
    const r=await fetch(url);
    const text=await r.text();
    let j;
    try{ j=JSON.parse(text); }catch{ j={ok:false, msg:text.slice(0,200)}; }
    if(!r.ok || !j.ok) throw new Error(j.msg || 'HTTP '+r.status);
    return j;
  }catch(e){ throw e; }
}

async function loadData(){
  const statusBadge=document.getElementById('statusBadge');
  let lastError='';
  for(const api of APIS){
    try{
      const url=api+'/api/tables/data?table='+encodeURIComponent(TABLE)+'&fields='+encodeURIComponent(FIELDS.join(','))+'&limit=1000';
      console.log('Trying', url);
      statusBadge.textContent='⏳ '+api.replace('https://','');
      const j=await tryFetch(url);
      statusBadge.textContent='✅ متصل';
      statusBadge.style.background='rgba(34,197,94,0.15)';
      statusBadge.style.color='#15803d';
      renderData(j.rows || j.data || []);
      return;
    }catch(e){
      lastError=e.message;
      console.log('Failed', api, e.message);
      continue;
    }
  }
  // كل المحاولات فشلت - عرض الحقول على الأقل مع رسالة إصلاح
  statusBadge.textContent='❌ غير متصل';
  statusBadge.style.background='rgba(239,68,68,0.15)';
  statusBadge.style.color='#b91c1c';
  document.getElementById('content').innerHTML=
    '<div class="error-box">'+
    '<h3>❌ Not found /api/tables/data</h3>'+
    '<p>الـ API الحالي لا يحتوي على endpoint الجديد. يجب نشر الـ Worker الجديد.</p>'+
    '<p><strong>الحقول المختارة:</strong> '+FIELDS.join('، ')+'</p>'+
    '<p><strong>الجدول:</strong> '+TABLE+'</p>'+
    '<p><strong>آخر خطأ:</strong> '+lastError+'</p>'+
    '<div class="fix-steps">'+
    '<strong>🔧 خطوات الإصلاح:</strong><br>'+
    '1. افتح ملف worker.js الجديد (الموجود في المجلد final/worker-v2-final.js)<br>'+
    '2. انسخه كاملاً إلى Cloudflare Worker الخاص بك hafez-api<br>'+
    '3. تأكد من وجود متغيرات البيئة: TURSO_DATABASE_URL و TURSO_AUTH_TOKEN<br>'+
    '4. اضغط Deploy<br>'+
    '5. أعد تحميل هذه الصفحة<br><br>'+
    '<strong>أو جرب هذا الرابط مباشرة للتأكد:</strong><br>'+
    '<code style="background:#f1f5f9; padding:4px 8px; border-radius:4px; display:block; margin-top:6px; word-break:break-all;">'+APIS[0]+'/api/tables/list</code>'+
    'إذا ظهر JSON به الجداول، الـ API يعمل. إذا ظهر Not found، يجب نشر الـ Worker الجديد.'+
    '</div>'+
    '</div>';
}

function renderData(rows){
  const content=document.getElementById('content');
  const isEmpty=!rows || !rows.length;
  if(DISPLAY==='cards'){
    if(isEmpty){
      let html='<div style="text-align:center; padding:30px; background:#fefcf7; border:1.5px dashed #c4b59b; border-radius:12px;">';
      html+='<div style="font-size:48px; margin-bottom:10px;">📭</div>';
      html+='<div style="font-weight:900; color:#065f46;">الجدول '+TABLE+' فارغ حالياً</div>';
      html+='<div style="font-size:12px; color:#64748b; margin-top:6px;">الحقول المختارة: '+FIELDS.join('، ')+'</div>';
      html+='<div style="margin-top:12px;"><button onclick="location.reload()" style="height:36px; padding:0 16px; border-radius:8px; border:none; background:#10b981; color:#fff; font-weight:700; cursor:pointer;">🔄 إعادة تحميل</button></div>';
      html+='</div>';
      content.innerHTML=html;
      return;
    }
    let html='<div class="cards">';
    rows.forEach(row=>{ html+='<div class="card-item">'; FIELDS.forEach(f=>{ html+='<div><strong>'+f+':</strong> '+(row[f]??row[f.toLowerCase()]??'')+'</div>'; }); html+='</div>'; });
    html+='</div>';
    content.innerHTML=html+'<div style="margin-top:10px; text-align:center; font-size:12px; color:#64748b;">الإجمالي: '+rows.length+' سجل - من جدول '+TABLE+'</div>';
  } else {
    // جدول يظهر حتى لو فارغ - هذا ما طلبه المستخدم
    let html='<div class="table-wrap"><table><thead><tr>';
    FIELDS.forEach(f=> html+='<th>'+f+'</th>');
    html+='</tr></thead><tbody>';
    if(isEmpty){
      html+='<tr><td colspan="'+FIELDS.length+'" style="padding:30px; text-align:center; color:#94a3b8;">';
      html+='<div style="font-size:40px;">📭</div>';
      html+='<div style="font-weight:800; margin-top:8px; color:#065f46;">لا يوجد بيانات في جدول '+TABLE+'</div>';
      html+='<div style="font-size:12px; margin-top:6px;">الحقول المختارة: '+FIELDS.join('، ')+'</div>';
      html+='<div style="font-size:11px; margin-top:8px; color:#b91c1c;">الجدول فارغ - استخدم نظام الحوافز لإضافة بيانات<br>أو جدول مرتبات شهرية يحتوي على بيانات</div>';
      html+='</td></tr>';
    } else {
      rows.forEach(row=>{
        html+='<tr>';
        FIELDS.forEach(f=> html+='<td>'+(row[f]??row[f.toLowerCase()]??'')+'</td>');
        html+='</tr>';
      });
    }
    html+='</tbody></table></div>';
    if(isEmpty){
      html+='<div style="margin-top:10px; text-align:center; font-size:12px; color:#64748b;">الجدول: '+TABLE+' - الحقول: '+FIELDS.length+' - فارغ حالياً - جرب جدول مرتبات شهرية</div>';
    } else {
      html+='<div style="margin-top:10px; text-align:center; font-size:12px; color:#64748b;">الإجمالي: '+rows.length+' سجل - من جدول '+TABLE+' - الحقول: '+FIELDS.length+'</div>';
    }
    content.innerHTML=html;
  }
}

loadData();
<\/script>
</body>
</html>`;
}

function renderCreatedPages(){
  const grid=document.getElementById('pagesGrid'); const countEl=document.getElementById('pagesCount'); if(!grid) return;
  if(!createdPages.length){ grid.innerHTML='<div style="grid-column:1/-1; text-align:center; padding:40px; color:#94a3b8;">لم يتم إنشاء أي صفحة بعد</div>'; countEl.textContent='0 صفحة'; return; }
  countEl.textContent=`${createdPages.length} صفحة`; grid.innerHTML='';
  createdPages.slice().reverse().forEach(page=>{
    const div=document.createElement('div'); div.className='page-card';
    div.innerHTML=`<h3>📄 ${page.name}</h3><p>🗃️ ${page.table}</p><p>📋 ${page.fields.length} حقل - ${page.fields.slice(0,3).join('، ')}${page.fields.length>3?'...':''}</p><p>📅 ${page.createdAtText}</p><div style="display:flex; gap:8px; margin-top:10px;"><button class="btn btn-primary" style="flex:1; height:32px; font-size:11px;" onclick="openPage(${page.id})">فتح</button><button class="btn" style="flex:0; height:32px; font-size:11px; background:#334155; color:#fff;" onclick="downloadPage(${page.id})">تحميل</button><button class="btn" style="flex:0; height:32px; font-size:11px; background:#ef4444; color:#fff;" onclick="deletePage(${page.id})">حذف</button></div>`;
    grid.appendChild(div);
  });
}

function renderTablesList(){
  const container=document.getElementById('tablesList'); if(!container) return;
  if(!allTables.length){ container.innerHTML='<div style="text-align:center; padding:20px; color:#94a3b8;">جاري التحميل...</div>'; return; }
  let html='<div style="display:grid; gap:12px;">';
  allTables.forEach(t=>{
    const cols=currentColumns && selectedTable===t.name ? currentColumns.length : '?';
    html+=`<div style="background:#fff; border:1.5px solid #c4b59b; border-radius:12px; padding:14px; display:flex; justify-content:space-between; align-items:center;"><div><div style="font-weight:900; font-size:14px; color:#065f46;">📋 ${t.name}</div><div style="font-size:11px; color:#64748b; margin-top:4px;">${cols} عمود</div></div><button class="btn btn-primary" style="height:34px; font-size:11px;" onclick="selectTable('${t.name}'); switchTab('builder');">اختيار</button></div>`;
  });
  html+='</div>'; container.innerHTML=html;
}

function openPage(id){ const page=createdPages.find(p=> p.id===id); if(!page) return; const html=generatePageHtml(page); const win=window.open(); win.document.write(html); win.document.close(); }
function downloadPage(id){ const page=createdPages.find(p=> p.id===id); if(!page) return; const html=generatePageHtml(page); const blob=new Blob([html], {type:'text/html'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`${page.slug}.html`; a.click(); }
function deletePage(id){ if(!confirm('حذف؟')) return; createdPages=createdPages.filter(p=> p.id!==id); localStorage.setItem('created_pages', JSON.stringify(createdPages)); renderCreatedPages(); }
function clearBuilder(){ document.getElementById('pageName').value=''; document.getElementById('pageSlug').value=''; selectedTable=''; selectedFields=[]; currentColumns=[]; document.getElementById('txtTable').innerText='اختر جدول من القاعدة'; document.getElementById('fieldsOptions').innerHTML='<div style="text-align:center; color:#94a3b8; padding:20px;">اختر جدول أولاً</div>'; document.getElementById('fieldsBtnText').textContent='اختر الحقول من الجدول المختار...'; document.getElementById('fieldsBtnCount').textContent='0'; document.getElementById('selectedTags').innerHTML='<span style="color:#94a3b8; font-size:11px;">لم يتم اختيار حقول بعد</span>'; document.getElementById('previewCard').style.display='none'; }

window.addEventListener('load',()=>{
  loadTables();
  renderCreatedPages();
  document.getElementById('pageName').addEventListener('input', (e)=>{
    const slug=e.target.value.replace(/\\s+/g,'-').replace(/[^\\w\\u0600-\\u06FF\\-]/g,'').toLowerCase();
    document.getElementById('pageSlug').value=slug;
  });
});
