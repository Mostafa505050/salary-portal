
// routing.js - إدارة التنقل والشهر بشكل آمن
'use strict';

import { validateMonthNumber, validateYear, monthNameMap } from './api.js';
import { toArabicDigits, safeSetText } from './ui.js';

export let currentMonth = new Date().getMonth() + 1;
export let currentYear = new Date().getFullYear();

const ROUTING_SECURITY = {
  MIN_YEAR: 2015,
  MAX_YEAR: 2035
};

export function initRouting(){
  const now = new Date();
  currentMonth = now.getMonth() + 1;
  currentYear = now.getFullYear();
  // تحقق من URL params لو موجودة - مع تنظيف
  try{
    const params = new URLSearchParams(window.location.search);
    const mParam = params.get('m');
    const yParam = params.get('y');
    if(mParam){
      const m = parseInt(mParam,10);
      if(m>=1 && m<=12) currentMonth = m;
    }
    if(yParam){
      const y = parseInt(yParam,10);
      if(y>=ROUTING_SECURITY.MIN_YEAR && y<=ROUTING_SECURITY.MAX_YEAR) currentYear = y;
    }
  }catch(e){ /* تجاهل */ }
}

export function updateMonthLabels(){
  const monthName = monthNameMap[currentMonth] || String(currentMonth);
  safeSetText('currentMonthLabel', monthName);
  safeSetText('currentYearLabel', toArabicDigits(String(currentYear)));
  
  // تحديث عنوان الصفحة بشكل آمن
  try{
    document.title = `بيان راتب - ${monthName} ${currentYear}`;
  }catch(e){}
}

export function changeMonth(delta, onChangeCallback){
  // تحقق صارم من delta
  if(delta !== 1 && delta !== -1){
    console.warn('[Routing] Invalid delta', delta);
    return false;
  }

  let newMonth = currentMonth + delta;
  let newYear = currentYear;

  if(newMonth > 12){ newMonth = 1; newYear++; }
  if(newMonth < 1){ newMonth = 12; newYear--; }

  // حدود آمنة
  if(newYear < ROUTING_SECURITY.MIN_YEAR || newYear > ROUTING_SECURITY.MAX_YEAR){
    console.warn('[Routing] Year out of bounds');
    return false;
  }

  try{
    validateMonthNumber(newMonth);
    validateYear(newYear);
  }catch(e){
    console.warn('[Routing] Validation failed', e);
    return false;
  }

  currentMonth = newMonth;
  currentYear = newYear;
  
  updateMonthLabels();

  // تحديث URL بدون إعادة تحميل - مع تنظيف
  try{
    const url = new URL(window.location);
    url.searchParams.set('m', String(currentMonth));
    url.searchParams.set('y', String(currentYear));
    window.history.replaceState({}, '', url);
  }catch(e){}

  if(typeof onChangeCallback === 'function'){
    onChangeCallback(currentYear, currentMonth);
  }
  return true;
}

export function getCurrentState(){
  return { month: currentMonth, year: currentYear, monthArabic: monthNameMap[currentMonth] };
}
