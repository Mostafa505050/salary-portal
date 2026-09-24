
// ui.js - واجهة رسم آمنة ضد XSS - لا تستخدم innerHTML نهائياً
'use strict';

const ARABIC_DIGITS = {'0':'٠','1':'١','2':'٢','3':'٣','4':'٤','5':'٥','6':'٦','7':'٧','8':'٨','9':'٩'};

// أدوات تأمين أساسية
export function escapeHtml(str){
  if(str===null || str===undefined) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

export function toArabicDigits(str){
  if(str===null||str===undefined) return "";
  return String(str).replace(/[0-9]/g, d => ARABIC_DIGITS[d] || d);
}

export function safeSetText(id, text){
  const el = document.getElementById(id);
  if(!el) return false;
  el.textContent = String(text ?? '');
  return true;
}

export function createSafeElement(tag, options={}){
  const el = document.createElement(tag);
  if(options.className) el.className = options.className;
  if(options.text) el.textContent = options.text;
  if(options.styles) Object.assign(el.style, options.styles);
  return el;
}

// Loader آمن
let loadTimer = null;
export function startLoadCounter(){
  const l = document.getElementById('loader');
  if(l) l.style.display='block';
  const counter = document.getElementById('loadCounter');
  let sec=0;
  if(counter) counter.textContent = toArabicDigits('0')+' ث';
  clearInterval(loadTimer);
  loadTimer=setInterval(()=>{
    sec++;
    if(counter) counter.textContent = toArabicDigits(sec)+' ث';
    if(sec>60){ stopLoadCounter(); } // حماية من timer مفتوح
  },1000);
}

export function stopLoadCounter(){
  clearInterval(loadTimer);
  loadTimer = null;
  const l=document.getElementById('loader');
  if(l) l.style.display='none';
}

// رسائل آمنة
export function showNoData(year, monthArabic, code){
  const area = document.getElementById('displayArea');
  const printArea = document.getElementById('printArea');
  if(!area || !printArea) return;
  area.style.display='block';
  printArea.textContent = ''; // مسح آمن

  const wrapper = createSafeElement('div', {
    styles: {
      background:'linear-gradient(180deg,#ffffff 0%,#fefcf6 50%,#f5e6c8 100%)',
      border:'3px solid #000',
      borderRadius:'18px',
      padding:'32px 20px',
      textAlign:'center',
      boxShadow:'0 10px 0 #d2b48c, 0 8px 0 #000'
    }
  });

  const title = createSafeElement('div', {
    text:`لا يوجد بيانات لشهر ${monthArabic} ${toArabicDigits(year)} - يرجى التواصل مع مسئول الموقع`,
    styles:{ fontSize:'18px', fontWeight:'900', color:'#b71c1c', marginBottom:'18px', lineHeight:'1.6', whiteSpace:'pre-line' }
  });

  const infoBox = createSafeElement('div', {
    styles:{ fontSize:'14px', fontWeight:'800', color:'#000', lineHeight:'2', background:'#fff', border:'2px solid #000', borderRadius:'12px', padding:'16px', display:'inline-block', minWidth:'280px' }
  });
  const nameSpan = createSafeElement('div', { text:'أ/ مصطفى درويش سيد', styles:{ fontSize:'16px', color:'#b71c1c', fontWeight:'900' } });
  const phoneLine = createSafeElement('div');
  phoneLine.textContent = 'هاتف / ';
  const phone = createSafeElement('span', { text:'01092259655', styles:{ fontFamily:'monospace', fontWeight:'900', direction:'ltr', display:'inline-block' } });
  phoneLine.appendChild(phone);

  const metaLine = createSafeElement('div', { 
    text:`السنة: ${toArabicDigits(year)} - الشهر: ${monthArabic} - الكود: ${toArabicDigits(code)}`,
    styles:{ fontSize:'11px', color:'#7a6652', marginTop:'8px' }
  });

  infoBox.appendChild(nameSpan);
  infoBox.appendChild(phoneLine);
  infoBox.appendChild(metaLine);

  wrapper.appendChild(title);
  wrapper.appendChild(infoBox);
  printArea.appendChild(wrapper);
}

export function showError(message){
  const area = document.getElementById('displayArea');
  const printArea = document.getElementById('printArea');
  if(!area || !printArea) return;
  area.style.display='block';
  printArea.textContent='';

  const box = createSafeElement('div', {
    text:`❌ ${message}`,
    styles:{ background:'#ffebee', padding:'20px', textAlign:'center', color:'#b71c1c', fontWeight:'800', border:'2px solid #ef9a9a', borderRadius:'12px' }
  });
  printArea.appendChild(box);
}

// رسم استمارة المرتب بشكل آمن 100% - بدون innerHTML
export function renderSalaryForm(row, currentYear, currentMonthNum){
  const area = document.getElementById('displayArea');
  const printArea = document.getElementById('printArea');
  if(!area || !printArea) return;
  area.style.display='block';
  printArea.textContent='';

  // تقسيم البيانات
  let allKeys = Object.keys(row);
  let startIdx = allKeys.findIndex(k => k.includes("مرتب_اساسي") || k.includes("مرتب اساسي"));
  let midIdx = allKeys.findIndex(k => k.includes("أجمالى_المستحق") || k.includes("اجمالى_المستحق") || k.includes("اجمالي_المستحق"));
  let endIdx = allKeys.findIndex(k => k.includes("الصافى") || k.includes("الصافي"));

  let instKeys, mustKeys, safyKey;
  if(startIdx!==-1 && midIdx!==-1){
    instKeys = allKeys.slice(startIdx, midIdx+1);
    if(endIdx!==-1){ mustKeys = allKeys.slice(midIdx+1, endIdx); safyKey = allKeys[endIdx]; }
    else mustKeys = allKeys.slice(midIdx+1);
  } else {
    const meta = ["السنه","الشهر","كود_العامل","الاسم","emptid","id","م","اسم_البنك_المحول_و_الفرع_المحول_اليه","رقم_الحساب_البنكى","كود_البنك","كود_القسم","البنك","الكود_البنكى","اسم_العامل"];
    let filtered = allKeys.filter(k=>!meta.includes(k) && row[k]!=null && row[k]!="" && !isNaN(parseFloat(row[k])));
    let mid = filtered.findIndex(k=>k.includes("المستحق"));
    if(mid!==-1){ instKeys=filtered.slice(0,mid+1); mustKeys=filtered.slice(mid+1); }
    else { instKeys=filtered.slice(0, Math.ceil(filtered.length/2)); mustKeys=filtered.slice(Math.ceil(filtered.length/2)); }
    let sIdx = filtered.findIndex(k=>k.includes("الصافى")||k.includes("الصافي"));
    if(sIdx!==-1){ safyKey=filtered[sIdx]; mustKeys=mustKeys.filter(k=>k!==safyKey); }
  }

  let inst=[], must=[];
  (instKeys||[]).forEach(k=>{
    let v=row[k];
    if(v!==null && v!=="" && !isNaN(parseFloat(v)) && parseFloat(v)!=0){
      inst.push({key: k.replace(/_/g," "), val: parseFloat(v).toFixed(2)});
    }
  });
  (mustKeys||[]).forEach(k=>{
    let v=row[k];
    if(v!==null && v!=="" && !isNaN(parseFloat(v)) && parseFloat(v)!=0){
      must.push({key: k.replace(/_/g," "), val: parseFloat(v).toFixed(2)});
    }
  });

  // بناء DOM آمن
  const container = createSafeElement('div', { styles:{ fontSize:'12px', width:'100%', position:'relative', direction:'rtl' } });

  // علامة مائية
  const watermark = createSafeElement('div', { 
    text:'لا يعتمد كمستند رسمى ولا يمكن التعامل بها مع الجهات الخارجية',
    styles:{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%) rotate(-30deg)', fontSize:'32px', color:'rgba(200,0,0,0.08)', fontWeight:'900', pointerEvents:'none', whiteSpace:'nowrap', zIndex:'0' }
  });
  watermark.id = 'realWatermark';
  container.appendChild(watermark);

  // اسم الموظف
  const nameBox = createSafeElement('div', {
    styles:{ textAlign:'center', padding:'6px', border:'1px solid #000', borderRadius:'6px', background:'#fff', marginBottom:'4px', fontWeight:'900' }
  });
  const empName = row["الاسم"] || row["اسم_العامل"] || "";
  const nameContent = createSafeElement('span', { text:`👤 اسم الموظف: ${empName}`, styles:{ fontSize:'13px', fontWeight:'900', color:'#7f0000' } });
  nameBox.appendChild(nameContent);
  container.appendChild(nameBox);

  // معلومات علوية - جدول صغير
  const topTable = createSafeElement('table', { styles:{ width:'100%', borderCollapse:'collapse', fontSize:'12px', fontWeight:'700', marginBottom:'4px', tableLayout:'fixed' } });
  const tr1 = createSafeElement('tr');
  const tdYear = createSafeElement('td', { text:`السنة المالية: ${toArabicDigits(row["السنه"]||currentYear)} -- بيان شهر: ${toArabicDigits(row["الشهر"]||'')}`, styles:{ border:'1px solid #000', padding:'4px', textAlign:'center', background:'#fffde7', color:'#000' } });
  const tdCode = createSafeElement('td', { text:`كود الموظف: ${toArabicDigits(row["emptid"]||row["كود_العامل"]||'')}`, styles:{ border:'1px solid #000', padding:'4px', textAlign:'center', background:'#fce4ec', color:'#ff0000', fontWeight:'900' } });
  tr1.appendChild(tdYear); tr1.appendChild(tdCode);

  const tr2 = createSafeElement('tr');
  const bankName = row["اسم_البنك_المحول_و_الفرع_المحول_اليه"] || "";
  const bankCode = row["رقم_الحساب_البنكى"] || "";
  const tdBank = createSafeElement('td', { text:`جهة الصرف: ${bankName||'--'}`, styles:{ border:'1px solid #000', padding:'4px', textAlign:'center', background:'#e3f2fd', color:'#000' } });
  const tdAcc = createSafeElement('td', { text:`رقم الحساب: ${toArabicDigits(bankCode)}`, styles:{ border:'1px solid #000', padding:'4px', textAlign:'center', background:'#f3e5f5', color:'#000' } });
  tr2.appendChild(tdBank); tr2.appendChild(tdAcc);

  topTable.appendChild(tr1); topTable.appendChild(tr2);
  container.appendChild(topTable);

  // جدول المرتب الرئيسي
  const mainWrapper = createSafeElement('div', { styles:{ width:'100%', border:'1px solid #000', borderRadius:'6px', overflow:'hidden' } });
  const mainTable = createSafeElement('table', { styles:{ width:'100%', borderCollapse:'collapse', textAlign:'center', fontWeight:'700', tableLayout:'fixed' } });
  mainTable.id = 'mainSalaryTable';

  const colgroup = createSafeElement('colgroup');
  [13,33,13,40].forEach(w=>{ const c = createSafeElement('col'); c.style.width = w+'%'; colgroup.appendChild(c); });
  mainTable.appendChild(colgroup);

  const thead = createSafeElement('thead');
  const headRow1 = createSafeElement('tr');
  const th1 = createSafeElement('th', { text:'الإستحقاقات', styles:{ background:'#b71c1c', color:'#fff', border:'1px solid #000', padding:'5px' } }); th1.colSpan=2;
  const th2 = createSafeElement('th', { text:'المستقطع', styles:{ background:'#b71c1c', color:'#fff', border:'1px solid #000', padding:'5px' } }); th2.colSpan=2;
  headRow1.appendChild(th1); headRow1.appendChild(th2);

  const headRow2 = createSafeElement('tr', { styles:{ background:'#e8f5e9' } });
  const labels = ['المبلغ','البيانات','المبلغ','البيانات'];
  labels.forEach(txt=>{
    const th = createSafeElement('th', { text:txt, styles:{ border:'1px solid #000', padding:'4px', color:'#000' } });
    headRow2.appendChild(th);
  });
  thead.appendChild(headRow1); thead.appendChild(headRow2);
  mainTable.appendChild(thead);

  const tbody = createSafeElement('tbody', { styles:{ background:'#fff', color:'#000' } });
  const max = Math.max(inst.length, must.length);
  for(let i=0;i<max;i++){
    const a=inst[i]||{key:"",val:""};
    const b=must[i]||{key:"",val:""};
    const tr = createSafeElement('tr', { styles:{ height:'24px' } });
    
    const tdAVal = createSafeElement('td', { text: a.val ? toArabicDigits(a.val) : '', styles:{ border:'1px solid #000', padding:'2px 3px', textAlign:'center', fontSize:'12px' } });
    const tdAKey = createSafeElement('td', { text: a.key, styles:{ border:'1px solid #000', padding:'2px 6px', textAlign:'right', fontSize:'12px' } });
    const tdBVal = createSafeElement('td', { text: b.val ? toArabicDigits(b.val) : '', styles:{ border:'1px solid #000', padding:'2px 3px', textAlign:'center', fontSize:'12px' } });
    const tdBKey = createSafeElement('td', { text: b.key, styles:{ border:'1px solid #000', padding:'2px 6px', textAlign:'right', fontSize:'12px' } });

    tr.appendChild(tdAVal); tr.appendChild(tdAKey); tr.appendChild(tdBVal); tr.appendChild(tdBKey);
    tbody.appendChild(tr);
  }

  // الصافي
  let safyVal = safyKey ? row[safyKey] : (row["الصافى"] || row["الصافي"]);
  if(safyVal){
    const trSafy = createSafeElement('tr');
    const tdLabel = createSafeElement('td', { text:'الصافي', styles:{ border:'2px solid #000', padding:'5px', textAlign:'center', fontWeight:'900', background:'#fff9c4', color:'#000' } }); tdLabel.colSpan=2;
    const tdVal = createSafeElement('td', { text: toArabicDigits(parseFloat(safyVal).toFixed(2)), styles:{ border:'2px solid #000', padding:'5px', textAlign:'center', fontWeight:'900', background:'#fff176', color:'#b71c1c', fontSize:'14px' } }); tdVal.colSpan=2;
    trSafy.appendChild(tdLabel); trSafy.appendChild(tdVal);
    tbody.appendChild(trSafy);

    const trDev = createSafeElement('tr');
    const tdDev = createSafeElement('td', { styles:{ border:'2px solid #000', padding:'10px', textAlign:'center', background:'#fffde7', color:'#000', fontSize:'11px', lineHeight:'1.8' } }); tdDev.colSpan=4;
    const line1 = createSafeElement('div', { text:'تم تطوير هذا الموقع بواسطه' });
    const line2 = createSafeElement('div', { text:'أ/ مصطفى درويش سيد درويش', styles:{ color:'#b71c1c', fontWeight:'900', fontSize:'13px' } });
    const line3 = createSafeElement('div', { styles:{ direction:'ltr' } });
    const phone = createSafeElement('span', { text:'01092259655', styles:{ fontFamily:'monospace', fontWeight:'900' } });
    line3.textContent = 'محمول / ';
    line3.appendChild(phone);
    tdDev.appendChild(line1); tdDev.appendChild(line2); tdDev.appendChild(line3);
    trDev.appendChild(tdDev);
    tbody.appendChild(trDev);
  }

  mainTable.appendChild(tbody);
  mainWrapper.appendChild(mainTable);
  container.appendChild(mainWrapper);

  printArea.appendChild(container);
}

// تحميل صورة آمن
export async function downloadImageSecure(currentYear, currentMonth, getCodeFn){
  const area = document.getElementById('printArea');
  if(!area) return;

  // تحقق من وجود html2canvas بشكل آمن
  if(typeof html2canvas !== 'function'){
    showError('مكتبة الصور غير محملة - حدث الصفحة');
    return;
  }

  try{
    const canvas = await html2canvas(area, { 
      scale:2, 
      backgroundColor:"#ffffff", 
      useCORS:true,
      allowTaint:false, // منع taint attacks
      logging:false
    });

    const code = getCodeFn ? getCodeFn() : 'unknown';
    // اسم ملف آمن - فقط أرقام وحروف
    const safeCode = String(code).replace(/[^A-Za-z0-9]/g,'').substring(0,20);
    const safeYear = String(currentYear).replace(/[^0-9]/g,'');
    const safeMonth = String(currentMonth).replace(/[^0-9]/g,'');
    
    const link = document.createElement('a');
    link.download = `salary-${safeYear}-${safeMonth}-${safeCode}.png`;
    link.href = canvas.toDataURL('image/png');
    
    // حماية من تحميل ملفات ضخمة
    if(link.href.length > 20 * 1024 * 1024){
      throw new Error('صورة كبيرة جداً');
    }
    
    link.click();
  }catch(e){
    console.error(e);
    showError('تعذر تحميل الصورة: ' + escapeHtml(e.message).substring(0,100));
  }
}
