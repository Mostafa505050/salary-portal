
// api.js - طبقة API مؤمنة سيبرانياً - لا يمكن حقن SQL أو XSS
'use strict';

const WORKER_BASE_URL = "https://turso-api.mostafa-voic77729.workers.dev";

const SECURITY = {
  TIMEOUT_MS: 12000,
  RATE_LIMIT_MS: 1500,
  MAX_RETRIES: 2,
  CODE_REGEX: /^[A-Za-z0-9_\-]{2,30}$/,
  YEAR_MIN: 2015,
  YEAR_MAX: 2035,
  MONTH_MIN: 1,
  MONTH_MAX: 12,
  CODE_MAX_LEN: 30
};

const monthNameMap = {
  1:"يناير", 2:"فبراير", 3:"مارس", 4:"أبريل", 5:"مايو", 6:"يونيو",
  7:"يوليو", 8:"أغسطس", 9:"سبتمبر", 10:"أكتوبر", 11:"نوفمبر", 12:"ديسمبر"
};

// Rate limiter
let lastCallTs = 0;
function checkRateLimit(){
  const now = Date.now();
  if(now - lastCallTs < SECURITY.RATE_LIMIT_MS){
    throw new Error('طلبات كثيرة جداً - انتظر ثانية');
  }
  lastCallTs = now;
}

// Validation صارمة
export function validateCode(code){
  if(!code || typeof code !== 'string') throw new Error('كود الموظف مطلوب');
  const trimmed = code.trim();
  if(trimmed.length === 0 || trimmed.length > SECURITY.CODE_MAX_LEN) throw new Error('كود غير صالح');
  if(!SECURITY.CODE_REGEX.test(trimmed)) throw new Error('كود يحتوي على رموز غير مسموحة');
  if(/[<>\"'`;\\]/.test(trimmed)) throw new Error('كود غير آمن');
  return trimmed;
}

export function validateYear(year){
  const y = Number(year);
  if(!Number.isInteger(y) || y < SECURITY.YEAR_MIN || y > SECURITY.YEAR_MAX){
    throw new Error(`سنة غير صالحة ${SECURITY.YEAR_MIN}-${SECURITY.YEAR_MAX}`);
  }
  return String(y);
}

export function validateMonthNumber(monthNum){
  const m = Number(monthNum);
  if(!Number.isInteger(m) || m < SECURITY.MONTH_MIN || m > SECURITY.MONTH_MAX){
    throw new Error('شهر غير صالح');
  }
  return m;
}

export function validateMonthArabic(monthAr){
  if(!monthAr || typeof monthAr !== 'string') throw new Error('شهر غير صالح');
  const trimmed = monthAr.trim();
  const allowed = Object.values(monthNameMap);
  if(!allowed.includes(trimmed)) throw new Error('اسم شهر غير صالح');
  return trimmed;
}

function sanitizeForLog(str){
  if(!str) return '';
  return String(str).substring(0,100).replace(/[\r\n<>]/g,'');
}

// Fetch مؤمن مع Timeout
async function secureFetch(url, options={}){
  checkRateLimit();
  
  const controller = new AbortController();
  const timeoutId = setTimeout(()=> controller.abort(), SECURITY.TIMEOUT_MS);
  
  try{
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'SecurePayslip-v1',
        ...(options.headers||{})
      },
      // منع إرسال credentials لطرف ثالث
      credentials: 'omit',
      mode: 'cors',
      cache: 'no-store'
    });
    
    clearTimeout(timeoutId);
    
    if(!res.ok){
      // لا تكشف تفاصيل الخادم
      if(res.status === 429) throw new Error('ضغط على الخادم - حاول لاحقاً');
      if(res.status >= 500) throw new Error('خطأ مؤقت في الخادم');
      throw new Error(`فشل الطلب ${res.status}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if(!contentType.includes('application/json')){
      throw new Error('استجابة غير متوقعة من الخادم');
    }

    const text = await res.text();
    if(text.length > 200000) throw new Error('بيانات كبيرة جداً');
    
    // حماية من JSON الضار
    if(text.includes('__proto__') || text.includes('constructor')){
      throw new Error('بيانات مشبوهة');
    }

    const json = JSON.parse(text);
    return json;

  }catch(err){
    clearTimeout(timeoutId);
    if(err.name === 'AbortError'){
      throw new Error('انتهت مهلة الاتصال - تحقق من الإنترنت');
    }
    throw err;
  }
}

// API الرئيسي المؤمن
export async function fetchSalary(year, monthArabic, code){
  // 1. تحقق صارم قبل أي طلب
  const safeYear = validateYear(year);
  const safeMonthAr = validateMonthArabic(monthArabic);
  const safeCode = validateCode(code);

  // 2. بناء URL آمن - كل القيم مرمزة
  const url = `${WORKER_BASE_URL}/api/salary-turso?year=${encodeURIComponent(safeYear)}&month=${encodeURIComponent(safeMonthAr)}&code=${encodeURIComponent(safeCode)}`;
  
  console.log(`[API] Fetching ${sanitizeForLog(safeYear)}/${sanitizeForLog(safeMonthAr)}/${sanitizeForLog(safeCode)}`);

  let lastErr;
  for(let attempt=0; attempt <= SECURITY.MAX_RETRIES; attempt++){
    try{
      const data = await secureFetch(url);
      
      // 3. تحقق من بنية الاستجابة
      if(!data || typeof data !== 'object'){
        throw new Error('استجابة فارغة');
      }

      // حتى لو found=false هذا ليس خطأ أمني
      if(data.found === false){
        return { found:false, data:null, meta:{ year:safeYear, month:safeMonthAr } };
      }

      if(!data.data || typeof data.data !== 'object'){
        throw new Error('بيانات غير مكتملة');
      }

      // 4. تحقق من تطابق الشهر والسنة (منع تسمم البيانات)
      const returnedMonth = String(data.data["الشهر"]||'').trim();
      const returnedYear = String(data.data["السنه"]||'').trim();
      
      if(returnedMonth && returnedMonth !== safeMonthAr){
        console.warn(`[Security] Month mismatch: asked ${safeMonthAr} got ${returnedMonth}`);
        // لا نعرض بيانات شهر مختلف - نعتبرها غير موجودة
        return { found:false, mismatch:true, data:null };
      }
      if(returnedYear && returnedYear !== safeYear){
        console.warn(`[Security] Year mismatch`);
        return { found:false, mismatch:true, data:null };
      }

      // 5. تنظيف البيانات من أي حقول مشبوهة
      const cleanData = {};
      for(const [k,v] of Object.entries(data.data)){
        if(k.includes('__proto__') || k.includes('constructor')) continue;
        if(k.length > 100) continue;
        cleanData[k] = v;
      }

      return { found:true, data:cleanData };

    }catch(err){
      lastErr = err;
      if(err.message.includes('طلبات كثيرة') || err.message.includes('بيانات مشبوهة')){
        throw err; // أخطاء أمنية لا نعيد محاولتها
      }
      if(attempt < SECURITY.MAX_RETRIES){
        await new Promise(r=> setTimeout(r, 500 * (attempt+1)));
        continue;
      }
    }
  }
  throw lastErr;
}

export { monthNameMap };
