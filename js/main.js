
// main.js - الملف الرئيسي الآمن - يربط كل شيء
'use strict';

import { fetchSalary, validateCode, monthNameMap } from './api.js';
import { 
  toArabicDigits, safeSetText, startLoadCounter, stopLoadCounter,
  showNoData, showError, renderSalaryForm, downloadImageSecure
} from './ui.js';
import { initRouting, currentMonth, currentYear, changeMonth, updateMonthLabels, getCurrentState } from './routing.js';

// إعدادات أمان عامة
const APP_SECURITY = {
  CODE_REGEX: /^[A-Za-z0-9_\-]{2,30}$/,
  MAX_NAME_LEN: 100
};

let lastData = null;
let isFetching = false;

// دوال آمنة لاستخراج بيانات المستخدم
function safeJsonParse(str, fallback=null){
  try{
    if(!str || typeof str !== 'string' || str.length > 5000) return fallback;
    if(str.includes('__proto__') || str.includes('constructor')) return fallback;
    const obj = JSON.parse(str);
    if(typeof obj !== 'object' || obj===null) return fallback;
    return obj;
  }catch{ return fallback; }
}

function getEmpCodeFromHeader(){
  try{
    const sources = [
      localStorage.getItem('empCode'),
      localStorage.getItem('emptid')
    ];

    for(const src of sources){
      if(src){
        const trimmed = String(src).trim();
        if(trimmed && trimmed.length <= 30 && APP_SECURITY.CODE_REGEX.test(trimmed)){
          return trimmed;
        }
      }
    }

    const logged = safeJsonParse(localStorage.getItem('logged_user'), {});
    const candidates = [logged.code, logged.emptid, logged.id];
    for(const cand of candidates){
      if(cand){
        const s = String(cand).trim();
        if(s && APP_SECURITY.CODE_REGEX.test(s)){
          return s;
        }
      }
    }

    // من الهيدر - تنظيف
    const el = document.getElementById('headerCode');
    if(el){
      const txt = el.textContent || '';
      const match = txt.match(/[A-Za-z0-9_\-]{2,30}/);
      if(match && match[0] !== '--' && APP_SECURITY.CODE_REGEX.test(match[0])){
        return match[0];
      }
    }
  }catch(e){
    console.warn('[Security] Error getting code', e);
  }
  return "";
}

function getEmpNameFromHeader(){
  try{
    const logged = safeJsonParse(localStorage.getItem('logged_user'), {});
    if(logged.name){
      let name = String(logged.name).trim();
      if(name.length > APP_SECURITY.MAX_NAME_LEN) name = name.substring(0, APP_SECURITY.MAX_NAME_LEN);
      // منع حقن HTML
      if(/[<>"'`;\\]/.test(name)){
        return name.replace(/[<>"'`;\\]/g,'');
      }
      return name;
    }
  }catch(e){}
  return "User";
}

export function logout(){
  try{
    // مسح آمن
    const keysToRemove = ['logged_user','empCode','emptid','theme'];
    keysToRemove.forEach(k=> localStorage.removeItem(k));
    // محاولة مسح كل شيء لو فشل
    try{ localStorage.clear(); }catch(e){}
  }catch(e){}
  // redirect آمن ثابت
  window.location.replace('index.html');
}

// بحث آمن
async function executeSearch(){
  if(isFetching){
    console.log('[App] Already fetching');
    return;
  }

  const code = getEmpCodeFromHeader();
  if(!code){
    showError('لم يتم العثور على كود الموظف - سجل الدخول مرة أخرى');
    setTimeout(()=> logout(), 2000);
    return;
  }

  try{
    validateCode(code);
  }catch(e){
    showError('كود الموظف غير صالح - سجل الدخول مرة أخرى');
    console.warn('[Security] Invalid code', code);
    return;
  }

  isFetching = true;
  startLoadCounter();
  const displayArea = document.getElementById('displayArea');
  if(displayArea) displayArea.style.display = "none";

  const state = getCurrentState();
  const monthArabic = state.monthArabic;
  const yearStr = String(state.year);

  safeSetText('headerCode', "الكود: " + toArabicDigits(code));

  try{
    const result = await fetchSalary(yearStr, monthArabic, code);
    stopLoadCounter();

    if(!result.found){
      showNoData(yearStr, monthArabic, code);
      return;
    }

    if(result.data){
      lastData = result.data;
      renderSalaryForm(result.data, yearStr, state.month);
    }

  }catch(err){
    stopLoadCounter();
    console.error('[App] Fetch error', err.message);
    // رسائل آمنة لا تكشف تفاصيل داخلية
    let userMsg = 'حدث خطأ في جلب البيانات';
    if(err.message.includes('كود غير صالح') || err.message.includes('غير آمن')){
      userMsg = err.message;
    }else if(err.message.includes('طلبات كثيرة')){
      userMsg = 'طلبات كثيرة - انتظر قليلاً';
    }else if(err.message.includes('مهلة') || err.message.includes('إنترنت')){
      userMsg = 'مشكلة في الاتصال - تحقق من الإنترنت';
    }else if(err.message.includes('ضغط على الخادم')){
      userMsg = 'الخادم مشغول - حاول بعد دقيقة';
    }
    showError(userMsg);
  }finally{
    isFetching = false;
  }
}

// Theme toggle مؤمن
function initTheme(){
  const btn = document.getElementById('themeToggle');
  const html = document.documentElement;
  
  // قراءة آمنة
  let saved = 'dark';
  try{
    const stored = localStorage.getItem('theme');
    if(stored === 'light' || stored === 'dark') saved = stored;
  }catch(e){}

  html.setAttribute('data-theme', saved);
  if(btn) btn.textContent = saved === 'dark' ? '☀' : '🌙';
  
  function toggleTheme(){
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    try{ localStorage.setItem('theme', next); }catch(e){}
    if(btn){
      btn.textContent = next === 'dark' ? '☀' : '🌙';
      btn.style.transform = 'scale(0.8) rotate(180deg)';
      setTimeout(()=>{ btn.style.transform = ''; }, 300);
    }
    document.body.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    setTimeout(()=>{ document.body.style.transition = ''; }, 600);
  }
  
  if(btn) btn.addEventListener('click', toggleTheme);
}

// تهيئة آمنة
function initApp(){
  try{
    // منع تشغيل مزدوج
    if(window.__appInitialized) return;
    window.__appInitialized = true;

    // 1. تهيئة التوجيه
    initRouting();

    // 2. عرض اسم المستخدم بشكل آمن
    const userName = getEmpNameFromHeader();
    const nameEl = document.getElementById('userName');
    if(nameEl){
      nameEl.textContent = 'مرحبا ' + userName; // textContent آمن
    }

    const code = getEmpCodeFromHeader();
    safeSetText('headerCode', 'الكود: ' + (code ? toArabicDigits(code) : '--'));

    updateMonthLabels();
    initTheme();

    // 3. ربط الأزرار بشكل آمن (بدون onclick في HTML)
    document.querySelectorAll('[data-action]').forEach(btn=>{
      const action = btn.getAttribute('data-action');
      if(action === 'prev') btn.addEventListener('click', ()=> changeMonth(-1, executeSearch));
      if(action === 'next') btn.addEventListener('click', ()=> changeMonth(1, executeSearch));
      if(action === 'print') btn.addEventListener('click', ()=> window.print());
      if(action === 'download') btn.addEventListener('click', ()=> downloadImageSecure(currentYear, currentMonth, getEmpCodeFromHeader));
      if(action === 'logout') btn.addEventListener('click', logout);
    });

    // توافق مع الأزرار القديمة التي بها onclick
    window.changeMonth = (delta)=> changeMonth(delta, executeSearch);
    window.logout = logout;
    window.downloadImage = ()=> downloadImageSecure(currentYear, currentMonth, getEmpCodeFromHeader);

    // 4. تحميل أولي
    executeSearch();

    // 5. تأثير دخول آمن
    document.body.style.opacity = '0';
    document.body.style.transform = 'translateY(20px)';
    setTimeout(()=>{
      document.body.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
      document.body.style.opacity = '1';
      document.body.style.transform = 'translateY(0)';
    }, 100);

    console.log('[App] Secure app initialized');

  }catch(e){
    console.error('[App] Init failed', e);
    showError('فشل تحميل التطبيق - حدث الصفحة');
  }
}

// حماية إضافية: منع تعديل window المهمة
Object.defineProperty(window, 'WORKER_BASE_URL', { writable:false, configurable:false });

// تشغيل
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', initApp);
}else{
  initApp();
}

// تصدير للاستخدام في HTML القديم
export { executeSearch, getEmpCodeFromHeader, getEmpNameFromHeader };
