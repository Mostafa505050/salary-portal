// _worker.js - تعديل بإضافة دوال فقط بدون حذف أو تعديل أي دالة موجودة
// جميع الدوال القديمة محفوظة كما هي - تمت إضافة دوال جديدة فقط في الأسفل

const HARDCODED_TURSO_URL = "https://company-alldata-mostafadarwish-mostafa505050.aws-eu-west-1.turso.io";
const HARDCODED_TURSO_TOKEN = "PASTE_YOUR_TURSO_TOKEN_HERE";

const FALLBACK_BLOCKED = ['addhafez1.html', 'tables.html'];

// ========== الدوال القديمة - محفوظة بدون أي تعديل ==========
function getTursoConfig(env){
  let url = (env.TURSO_URL || env.TURSO_URLL || HARDCODED_TURSO_URL || '').trim();
  let token = (env.TURSO_TOKEN || env.TURSO_TOKENL || HARDCODED_TURSO_TOKEN || '').trim();
  if(token.includes("PASTE_YOUR")) return {url:null, token:null};
  if(url.startsWith('libsql://')) url='https://'+url.slice(8);
  if(url && !url.startsWith('https://')) url='https://'+url;
  return {url, token};
}

async function tursoQuery(env, sql, params=[]){
  const {url, token} = getTursoConfig(env);
  if(!url || !token) return {error:'no config - الصق التوكن في Worker'};
  try{
    const args = params.map(v=>({type:'text', value:String(v)}));
    const res = await fetch(`${url}/v2/pipeline`, {
      method:'POST',
      headers:{'Authorization':`Bearer ${token}`, 'Content-Type':'application/json'},
      body: JSON.stringify({requests:[{type:'execute', stmt:{sql, args}}, {type:'close'}]})
    });
    const data = await res.json();
    if(data.results?.[0]?.error) return {error: data.results[0].error.message, raw:data};
    return {result: data.results?.[0]?.response?.result, raw:data};
  }catch(e){ return {error:e.message}; }
}

function isBlocked(pageName, blockedList){
  const low=pageName.toLowerCase().replace('.html','').trim();
  for(const b of blockedList){
    const bl=String(b).toLowerCase().replace('.html','').trim();
    if(bl===low || low.includes(bl) || bl.includes(low)) return true;
  }
  return false;
}

function blockedPageHTML(pageName, source){
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>مغلقة</title><style>body{min-height:100vh;background:#0a0a1a;color:#fff;display:flex;align-items:center;justify-content:center;font-family:Cairo,sans-serif} .box{background:rgba(255,255,255,0.07);padding:30px;border-radius:20px;text-align:center}</style></head><body><div class="box"><h1>🔒 الصفحة مغلقة</h1><p>${pageName}</p><p style="font-size:10px">Source: ${source}</p><a href="/" style="color:#a78bfa">الرئيسية</a></div></body></html>`;
}

function blockedDeviceHTML(ip, device, reason){
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>محظور</title><style>body{min-height:100vh;background:linear-gradient(135deg,#fee2e2,#fecaca);display:flex;align-items:center;justify-content:center;font-family:Cairo,sans-serif} .box{background:#fff;padding:30px;border-radius:20px;text-align:center;box-shadow:0 16px 40px rgba(0,0,0,0.15)} h1{color:#dc2626}</style></head><body><div class="box"><div style="font-size:60px">🚫</div><h1>تم حظر جهازك</h1><p>IP: ${ip}<br>الجهاز: ${device}<br>السبب: ${reason||'محظور'}<br>01092259655</p><a href="https://wa.me/201092259655" style="display:inline-block;padding:10px 20px;background:#25D366;color:#fff;border-radius:10px;text-decoration:none;margin-top:12px">واتساب</a></div></body></html>`;
}

// ========== دوال جديدة مضافة فقط - لم يتم تعديل أي دالة قديمة ==========

// دالة جديدة 1: إدخال حظر بطريقة مضمونة 100% - تعتمد على DEFAULT للـ created_at
async function insertBlockedDeviceFixed(env, device_model, ip, reason){
  // الحل الجذري: لا نرسل created_at إطلاقاً - نترك قاعدة البيانات تستخدم DEFAULT datetime('now','localtime')
  // هذا يضمن عدم وجود خطأ في datetime("now") بعلامات مزدوجة
  const sql = "INSERT INTO blocked_devices (device_model, ip, reason) VALUES (?, ?, ?)";
  const params = [device_model, ip, reason];
  const result = await tursoQuery(env, sql, params);
  console.log('insertBlockedDeviceFixed result:', result);
  return result;
}

// دالة جديدة 2: جلب الأجهزة المحظورة بطريقة مضمونة
async function getBlockedDevicesFixed(env){
  const result = await tursoQuery(env, "SELECT * FROM blocked_devices ORDER BY id DESC LIMIT 100", []);
  if(result.error) return {blocked:[], error:result.error};
  let blocked=[];
  if(result.result?.rows){
    const cols=result.result.cols.map(c=>c.name);
    blocked=result.result.rows.map(row=>{
      const obj={};
      row.forEach((cell,i)=>{ obj[cols[i]]=cell.value??cell.text??''; });
      return obj;
    });
  }
  return {blocked, error:null};
}

// دالة جديدة 3: حذف حظر بطريقة مضمونة
async function deleteBlockedDeviceFixed(env, id){
  const result = await tursoQuery(env, "DELETE FROM blocked_devices WHERE id=?", [id]);
  return result;
}

// دالة جديدة 4: الحصول على IP الحقيقي بطريقة مضمونة
function getRealIPFixed(request){
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || request.headers.get('X-Real-IP') || 'unknown';
  return ip;
}

// دالة جديدة 5: تسجيل حقيقي مضمون لـ real_page_logs
async function insertRealPageLogFixed(env, page, site, device_model, ip, user_agent){
  const sql = "INSERT INTO real_page_logs (page, site, device_model, ip, user_agent) VALUES (?, ?, ?, ?, ?)";
  const params = [page, site, device_model, ip, user_agent];
  const result = await tursoQuery(env, sql, params);
  return result;
}

// دالة جديدة 6: معالجة طلب حظر جهاز جديد - endpoint جديد
async function handleBlockDeviceRequestFixed(request, env){
  try{
    const body = await request.json();
    const ip = body.ip || '';
    const device_model = body.device_model || body.device || 'Unknown';
    const reason = body.reason || 'محظور من لوحة المراقبة';
    
    if(!ip || !ip.includes('.')){
      return new Response(JSON.stringify({success:false, error:'IP غير صالح: '+ip}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    }
    
    const result = await insertBlockedDeviceFixed(env, device_model, ip, reason);
    if(result.error){
      return new Response(JSON.stringify({success:false, error:result.error, raw:result.raw}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    }
    
    return new Response(JSON.stringify({success:true, affected:result.result?.affected_row_count, lastId:result.result?.last_insert_rowid, raw:result.raw}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  }catch(e){
    return new Response(JSON.stringify({success:false, error:e.message}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  }
}

// دالة جديدة 7: معالجة طلب فك حظر
async function handleUnblockDeviceRequestFixed(request, env){
  try{
    const body = await request.json();
    const id = body.id;
    if(!id) return new Response(JSON.stringify({success:false, error:'id مطلوب'}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    const result = await deleteBlockedDeviceFixed(env, id);
    if(result.error) return new Response(JSON.stringify({success:false, error:result.error}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    return new Response(JSON.stringify({success:true, affected:result.result?.affected_row_count}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  }catch(e){
    return new Response(JSON.stringify({success:false, error:e.message}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  }
}



// ========== ميزة السماح لعدة IPs - قائمة بيضاء متعددة - دوال جديدة مضافة فقط ==========

// دالة جديدة: إنشاء جدول الـ IPs المسموحة
async function ensureAllowedIPsTableFixed(env){
  const sql1 = `CREATE TABLE IF NOT EXISTS allowed_ips (
    ip TEXT PRIMARY KEY,
    reason TEXT DEFAULT 'مسموح',
    added_at TEXT DEFAULT (datetime('now','localtime'))
  )`;
  await tursoQuery(env, sql1, []);
  // تأكد أيضاً من وجود جدول إعدادات القائمة البيضاء
  await ensureWhitelistTableFixed(env);
}

// دالة جديدة: إضافة IP إلى قائمة المسموحين
async function addAllowedIPFixed(env, ip, reason){
  await ensureAllowedIPsTableFixed(env);
  const sql = "INSERT OR REPLACE INTO allowed_ips (ip, reason) VALUES (?, ?)";
  const result = await tursoQuery(env, sql, [ip, reason||'مسموح']);
  return result;
}

// دالة جديدة: حذف IP من قائمة المسموحين
async function removeAllowedIPFixed(env, ip){
  await ensureAllowedIPsTableFixed(env);
  const result = await tursoQuery(env, "DELETE FROM allowed_ips WHERE ip=?", [ip]);
  return result;
}

// دالة جديدة: جلب كل الـ IPs المسموحة
async function getAllowedIPsFixed(env){
  await ensureAllowedIPsTableFixed(env);
  const q = await tursoQuery(env, "SELECT * FROM allowed_ips ORDER BY added_at DESC", []);
  if(q.error) return {allowed:[], error:q.error};
  let allowed=[];
  if(q.result?.rows){
    const cols=q.result.cols.map(c=>c.name);
    allowed=q.result.rows.map(row=>{
      const obj={};
      row.forEach((cell,i)=>{ obj[cols[i]]=cell.value??cell.text??''; });
      return obj;
    });
  }
  return {allowed, error:null};
}

// دالة جديدة: تفعيل وضع القائمة البيضاء (فقط المسموحين يدخلون)
async function enableWhitelistModeFixed(env){
  await ensureAllowedIPsTableFixed(env);
  await tursoQuery(env, "DELETE FROM ip_whitelist_config", []);
  const result = await tursoQuery(env, "INSERT INTO ip_whitelist_config (allowed_ip, mode) VALUES ('multiple', 'whitelist')", []);
  return result;
}

// دالة جديدة: تعطيل وضع القائمة البيضاء والسماح للجميع
async function disableWhitelistModeFixed(env){
  await ensureAllowedIPsTableFixed(env);
  await tursoQuery(env, "DELETE FROM ip_whitelist_config", []);
  const result = await tursoQuery(env, "INSERT INTO ip_whitelist_config (allowed_ip, mode) VALUES ('0.0.0.0', 'all')", []);
  return result;
}

// دالة جديدة: فحص هل IP مسموح في وضع القائمة البيضاء المتعددة
async function isIPAllowedInWhitelistFixed(env, currentIP){
  const modeData = await getWhitelistModeFixedBackend(env);
  if(modeData.mode!=='whitelist') return true; // إذا الوضع all فالكل مسموح
  
  // في وضع whitelist، يجب أن يكون IP في جدول allowed_ips
  const allowedData = await getAllowedIPsFixed(env);
  const isAllowed = allowedData.allowed.some(a=>a.ip===currentIP);
  return isAllowed;
}

// دالة جديدة: HTML لصفحة محظورة بسبب وضع القائمة البيضاء
function whitelistBlockedPageFixed(currentIP, allowedList){
  const listHTML = allowedList.map(a=>`<span style="background:#dcfce7;color:#065f46;padding:2px 8px;border-radius:6px;margin:2px;display:inline-block;font-family:monospace">${a.ip}</span>`).join(' ');
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>الموقع مغلق - قائمة بيضاء</title><style>body{min-height:100vh;background:linear-gradient(135deg,#fef3c7,#fde68a);display:flex;align-items:center;justify-content:center;font-family:Cairo,sans-serif} .box{background:#fff;padding:30px;border-radius:20px;text-align:center;box-shadow:0 16px 40px rgba(0,0,0,0.15);max-width:600px;width:92%} h1{color:#d97706} .ip{font-family:monospace;background:#fee2e2;color:#dc2626;padding:4px 10px;border-radius:8px;font-weight:800}</style></head><body><div class="box"><div style="font-size:60px">🔐</div><h1>الموقع في وضع القائمة البيضاء</h1><p>عذراً، الموقع متاح فقط لعناوين IP محددة</p><div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:12px;margin:12px 0;text-align:right;font-size:12px"><b>IP الخاص بك:</b> <span class="ip">${currentIP}</span><br><br><b>IPs المسموحة حالياً:</b><br>${listHTML||'لا يوجد'}<br><br>تواصل مع الإدارة لإضافة IP الخاص بك: 01092259655</div><a href="https://wa.me/201092259655" style="display:inline-block;padding:10px 20px;background:#25D366;color:#fff;border-radius:10px;text-decoration:none;font-weight:800;margin-top:12px">💬 واتساب</a></div></body></html>`;
}

// دالة جديدة: معالجة إضافة IP مسموح
async function handleAddAllowedIPFixed(request, env){
  try{
    const body = await request.json();
    const ip = body.ip?.trim();
    const reason = body.reason?.trim() || 'مسموح';
    if(!ip || !ip.includes('.')) return new Response(JSON.stringify({success:false, error:'IP غير صالح'}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    const result = await addAllowedIPFixed(env, ip, reason);
    if(result.error) return new Response(JSON.stringify({success:false, error:result.error}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    return new Response(JSON.stringify({success:true, ip:ip}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  }catch(e){ return new Response(JSON.stringify({success:false, error:e.message}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }
}

// دالة جديدة: معالجة حذف IP مسموح
async function handleRemoveAllowedIPFixed(request, env){
  try{
    const body = await request.json();
    const ip = body.ip?.trim();
    if(!ip) return new Response(JSON.stringify({success:false, error:'IP مطلوب'}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    const result = await removeAllowedIPFixed(env, ip);
    if(result.error) return new Response(JSON.stringify({success:false, error:result.error}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    return new Response(JSON.stringify({success:true}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  }catch(e){ return new Response(JSON.stringify({success:false, error:e.message}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }
}

// دالة جديدة: معالجة جلب قائمة المسموحين
async function handleGetAllowedIPsFixed(request, env){
  try{
    const allowedData = await getAllowedIPsFixed(env);
    const modeData = await getWhitelistModeFixedBackend(env);
    return new Response(JSON.stringify({allowed:allowedData.allowed, mode:modeData.mode, allowed_ip:modeData.allowed_ip, error:allowedData.error}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache'}});
  }catch(e){ return new Response(JSON.stringify({allowed:[], error:e.message}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }
}

// دالة جديدة: معالجة تفعيل وضع القائمة البيضاء
async function handleEnableWhitelistFixed(request, env){
  try{
    const result = await enableWhitelistModeFixed(env);
    if(result.error) return new Response(JSON.stringify({success:false, error:result.error}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    return new Response(JSON.stringify({success:true, mode:'whitelist'}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  }catch(e){ return new Response(JSON.stringify({success:false, error:e.message}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }
}

// دالة جديدة: معالجة تعطيل وضع القائمة البيضاء
async function handleDisableWhitelistFixed(request, env){
  try{
    const result = await disableWhitelistModeFixed(env);
    if(result.error) return new Response(JSON.stringify({success:false, error:result.error}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    return new Response(JSON.stringify({success:true, mode:'all'}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  }catch(e){ return new Response(JSON.stringify({success:false, error:e.message}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }
}


// ========== ميزة IP واحد فقط - دوال جديدة مضافة فقط - بدون تعديل أي دالة قديمة ==========

// دالة جديدة: إنشاء جدول إعدادات القائمة البيضاء إذا لم يكن موجود
async function ensureWhitelistTableFixed(env){
  const sql = `CREATE TABLE IF NOT EXISTS ip_whitelist_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    allowed_ip TEXT NOT NULL,
    mode TEXT NOT NULL DEFAULT 'all',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT DEFAULT (datetime('now','localtime'))
  )`;
  await tursoQuery(env, sql, []);
}

// دالة جديدة: تفعيل وضع IP واحد فقط
async function enableSingleIPModeFixedBackend(env, allowedIP){
  await ensureWhitelistTableFixed(env);
  // حذف أي إعداد قديم
  await tursoQuery(env, "DELETE FROM ip_whitelist_config", []);
  // إدخال الإعداد الجديد - IP واحد مسموح والباقي محظور
  const result = await tursoQuery(env, "INSERT INTO ip_whitelist_config (allowed_ip, mode) VALUES (?, 'single')", [allowedIP]);
  return result;
}

// دالة جديدة: إلغاء وضع IP واحد والسماح للجميع
async function disableSingleIPModeFixedBackend(env){
  await ensureWhitelistTableFixed(env);
  // حذف إعداد IP الواحد أو تحديثه إلى mode all
  await tursoQuery(env, "DELETE FROM ip_whitelist_config", []);
  const result = await tursoQuery(env, "INSERT INTO ip_whitelist_config (allowed_ip, mode) VALUES ('0.0.0.0', 'all')", []);
  return result;
}

// دالة جديدة: جلب حالة وضع القائمة البيضاء
async function getWhitelistModeFixedBackend(env){
  await ensureWhitelistTableFixed(env);
  const q = await tursoQuery(env, "SELECT * FROM ip_whitelist_config ORDER BY id DESC LIMIT 1", []);
  if(q.error || !q.result?.rows || q.result.rows.length===0){
    return {mode:'all', allowed_ip:null, count:0, total_blocked:0};
  }
  const cols=q.result.cols.map(c=>c.name);
  const row=q.result.rows[0];
  const obj={}; row.forEach((cell,i)=>{ obj[cols[i]]=cell.value??cell.text??''; });
  
  // جلب عدد المحاولات المحظورة
  const blockedQ = await tursoQuery(env, "SELECT COUNT(*) as cnt FROM blocked_devices", []);
  let total_blocked=0;
  if(!blockedQ.error && blockedQ.result?.rows?.length>0){
    total_blocked = blockedQ.result.rows[0][0]?.value || 0;
  }
  
  return {
    mode: obj.mode||'all',
    allowed_ip: obj.allowed_ip,
    created_at: obj.created_at,
    count: 0,
    total_blocked: total_blocked,
    raw: obj
  };
}

// دالة جديدة: فحص هل IP الحالي مسموح في وضع IP واحد
async function isIPAllowedInSingleModeFixed(env, currentIP){
  const modeData = await getWhitelistModeFixedBackend(env);
  if(modeData.mode!=='single') return true; // إذا الوضع all فالكل مسموح
  if(!modeData.allowed_ip) return true;
  return currentIP===modeData.allowed_ip;
}

// دالة جديدة: HTML لصفحة محظورة بسبب وضع IP واحد
function singleIPBlockedPageFixed(currentIP, allowedIP){
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>الموقع مغلق - IP واحد فقط</title><style>body{min-height:100vh;background:linear-gradient(135deg,#fef3c7,#fde68a);display:flex;align-items:center;justify-content:center;font-family:Cairo,sans-serif} .box{background:#fff;padding:30px;border-radius:20px;text-align:center;box-shadow:0 16px 40px rgba(0,0,0,0.15);max-width:500px;width:92%} h1{color:#d97706} .ip{font-family:monospace;background:#fee2e2;color:#dc2626;padding:4px 10px;border-radius:8px;font-weight:800} .allowed{background:#dcfce7;color:#065f46;padding:4px 10px;border-radius:8px;font-family:monospace;font-weight:800}</style></head><body><div class="box"><div style="font-size:60px">🔐</div><h1>الموقع في وضع IP واحد فقط</h1><p>عذراً، الموقع متاح حالياً لعنوان IP واحد فقط</p><div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;padding:12px;margin:12px 0;text-align:right;font-size:12px"><b>IP الخاص بك:</b> <span class="ip">${currentIP}</span><br><b>IP المسموح حالياً:</b> <span class="allowed">${allowedIP}</span><br><br>تواصل مع الإدارة للسماح لجهازك: 01092259655</div><a href="https://wa.me/201092259655" style="display:inline-block;padding:10px 20px;background:#25D366;color:#fff;border-radius:10px;text-decoration:none;font-weight:800;margin-top:12px">💬 تواصل واتساب</a></div></body></html>`;
}

// دالة جديدة: معالجة تفعيل وضع IP واحد - endpoint
async function handleEnableSingleIPFixed(request, env){
  try{
    const body = await request.json();
    const ip = body.ip?.trim();
    if(!ip || !ip.includes('.')) return new Response(JSON.stringify({success:false, error:'IP غير صالح'}), {status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    const result = await enableSingleIPModeFixedBackend(env, ip);
    if(result.error) return new Response(JSON.stringify({success:false, error:result.error}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    return new Response(JSON.stringify({success:true, allowed_ip:ip, mode:'single'}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  }catch(e){ return new Response(JSON.stringify({success:false, error:e.message}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }
}

// دالة جديدة: معالجة إلغاء وضع IP واحد
async function handleDisableSingleIPFixed(request, env){
  try{
    const result = await disableSingleIPModeFixedBackend(env);
    if(result.error) return new Response(JSON.stringify({success:false, error:result.error}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    return new Response(JSON.stringify({success:true, mode:'all'}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
  }catch(e){ return new Response(JSON.stringify({success:false, error:e.message}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }
}

// دالة جديدة: معالجة جلب حالة القائمة البيضاء
async function handleGetWhitelistModeFixed(request, env){
  try{
    const data = await getWhitelistModeFixedBackend(env);
    return new Response(JSON.stringify(data), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache'}});
  }catch(e){ return new Response(JSON.stringify({mode:'all', error:e.message}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}}); }
}


// ========== Worker الرئيسي - الدوال القديمة محفوظة + استدعاء الدوال الجديدة ==========
export default {
  async fetch(request, env, ctx){
    const url = new URL(request.url);
    const path = url.pathname;

    // === ميزة السماح لعدة IPs - قائمة بيضاء متعددة - endpoints جديدة ===
    if(path==='/api/allowed-ips'){
      return await handleGetAllowedIPsFixed(request, env);
    }
    if(path==='/api/add-allowed-ip'){
      return await handleAddAllowedIPFixed(request, env);
    }
    if(path==='/api/remove-allowed-ip'){
      return await handleRemoveAllowedIPFixed(request, env);
    }
    if(path==='/api/enable-whitelist'){
      return await handleEnableWhitelistFixed(request, env);
    }
    if(path==='/api/disable-whitelist'){
      return await handleDisableWhitelistFixed(request, env);
    }

    // === ميزة IP واحد فقط - endpoints جديدة مضافة فقط ===
    if(path==='/api/enable-single-ip'){
      return await handleEnableSingleIPFixed(request, env);
    }
    if(path==='/api/disable-single-ip'){
      return await handleDisableSingleIPFixed(request, env);
    }
    if(path==='/api/whitelist-mode'){
      return await handleGetWhitelistModeFixed(request, env);
    }
    // فحص وضع IP واحد أو القائمة البيضاء المتعددة قبل أي شيء
    if(!['/api/','/js/','.js','.css','.json','.png','.jpg','.svg','.ico','Real-Monitoring','whitelist-mode','enable-single-ip','disable-single-ip','block-device-fixed','unblock-device-fixed','get-ip','get-ip-fixed','blocked-devices','blocked-list','turso','allowed-ips','add-allowed-ip','remove-allowed-ip','enable-whitelist','disable-whitelist'].some(s=>path.toLowerCase().includes(s.toLowerCase()))){
      const currentIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || '';
      if(currentIP){
        const modeData = await getWhitelistModeFixedBackend(env);
        if(modeData.mode==='single' && modeData.allowed_ip && currentIP!==modeData.allowed_ip){
          return new Response(singleIPBlockedPageFixed(currentIP, modeData.allowed_ip), {status:403, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'}});
        }
        if(modeData.mode==='whitelist'){
          const allowed = await isIPAllowedInWhitelistFixed(env, currentIP);
          if(!allowed){
            const allowedData = await getAllowedIPsFixed(env);
            return new Response(whitelistBlockedPageFixed(currentIP, allowedData.allowed), {status:403, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'}});
          }
        }
      }
    }

    // === endpoints جديدة مضافة فقط - تستخدم الدوال الجديدة ===
    if(path==='/api/block-device-fixed'){
      return await handleBlockDeviceRequestFixed(request, env);
    }
    if(path==='/api/unblock-device-fixed'){
      return await handleUnblockDeviceRequestFixed(request, env);
    }
    if(path==='/api/get-ip-fixed'){
      const ip = getRealIPFixed(request);
      return new Response(JSON.stringify({ip, country:request.cf?.country||'unknown'}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    }

    // === الدوال القديمة محفوظة كما هي بدون أي تعديل ===
    if(path==='/api/get-ip'){
      const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown';
      return new Response(JSON.stringify({ip, country:request.cf?.country||'unknown', city:request.cf?.city||''}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache'}});
    }

    if(path==='/api/turso'){
      try{
        const body = await request.json();
        const q = await tursoQuery(env, body.sql, body.params||[]);
        if(q.error) return new Response(JSON.stringify({error:q.error, rows:[], raw:q.raw}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
        let rows=[];
        if(q.result?.rows){
          const cols=q.result.cols.map(c=>c.name);
          rows=q.result.rows.map(row=>{
            const obj={};
            row.forEach((cell,i)=>{ obj[cols[i]]=cell.value??cell.text??''; });
            return obj;
          });
        }
        const affected = q.result?.affected_row_count;
        const lastId = q.result?.last_insert_rowid;
        return new Response(JSON.stringify({rows, affected_row_count:affected, last_insert_rowid:lastId, raw:q.raw}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      }catch(e){
        return new Response(JSON.stringify({error:e.message, rows:[]}), {status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      }
    }

    if(path==='/api/blocked-list'){
      const q = await tursoQuery(env, 'SELECT "اسم_الصفحة" FROM "صفحات_الموقع" WHERE "مفعلة"=0');
      let pages=[];
      if(!q.error && q.result?.rows){
        const cols=q.result.cols.map(c=>c.name);
        const idx=cols.indexOf("اسم_الصفحة");
        if(idx>=0) pages=q.result.rows.map(r=> String(r[idx].value??r[idx].text??'').toLowerCase().trim()).filter(Boolean);
      }
      if(pages.length===0) pages=FALLBACK_BLOCKED;
      return new Response(JSON.stringify({blocked:pages, count:pages.length, time:new Date().toISOString()}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache'}});
    }

    if(path==='/api/blocked-devices'){
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const q = await tursoQuery(env, 'SELECT * FROM blocked_devices ORDER BY created_at DESC LIMIT 100');
      let blocked=[];
      if(!q.error && q.result?.rows){
        const cols=q.result.cols.map(c=>c.name);
        blocked=q.result.rows.map(row=>{
          const obj={};
          row.forEach((cell,i)=>{ obj[cols[i]]=cell.value??cell.text??''; });
          return obj;
        });
      }
      const isBlocked = blocked.some(b=>b.ip===ip);
      return new Response(JSON.stringify({blocked, isBlocked, currentIp:ip, count:blocked.length, error:q.error||null}), {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache'}});
    }

    // فحص حظر الأجهزة
    if(!['/api/','/js/','.js','.css','.json','.png','.jpg','.svg','.ico','Real-Monitoring'].some(s=>path.toLowerCase().includes(s.toLowerCase()))){
      const currentIp = request.headers.get('CF-Connecting-IP') || '';
      if(currentIp){
        const q = await tursoQuery(env, 'SELECT * FROM blocked_devices WHERE ip=? LIMIT 1', [currentIp]);
        if(!q.error && q.result?.rows?.length>0){
          const cols=q.result.cols.map(c=>c.name);
          const row=q.result.rows[0];
          const obj={}; row.forEach((cell,i)=>{ obj[cols[i]]=cell.value??cell.text??''; });
          return new Response(blockedDeviceHTML(obj.ip, obj.device_model, obj.reason), {status:403, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'}});
        }
      }
    }

    // فحص حظر الصفحات
    if(!['database-manager','turso-api','hafez-api','auth-api','favicon','.js','.css','.json','.png','.jpg','.svg','.ico','/api/'].some(s=>path.toLowerCase().includes(s.toLowerCase()))){
      let pageName = path.split('/').pop() || 'index.html';
      if(path==='/' || path==='') pageName='index.html';
      const isHtml = path.endsWith('.html') || path==='/' || path==='' || (!path.includes('.') && !path.startsWith('/api/'));
      if(isHtml){
        const q = await tursoQuery(env, 'SELECT "اسم_الصفحة" FROM "صفحات_الموقع" WHERE "مفعلة"=0');
        let pages=FALLBACK_BLOCKED;
        if(!q.error && q.result?.rows){
          const cols=q.result.cols.map(c=>c.name);
          const idx=cols.indexOf("اسم_الصفحة");
          if(idx>=0) pages=q.result.rows.map(r=> String(r[idx].value??r[idx].text??'').toLowerCase().trim()).filter(Boolean);
        }
        if(isBlocked(pageName, pages)){
          return new Response(blockedPageHTML(pageName, 'turso'), {status:403, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'}});
        }
      }
    }

    let response;
    try{
      if(env.ASSETS) response=await env.ASSETS.fetch(request);
      else response=await fetch(request);
    }catch{ return new Response('Not found',{status:404}); }

    const contentType=response.headers.get('Content-Type')||'';
    if(contentType.includes('text/html') && response.status===200 && !path.toLowerCase().includes('real-monitoring')){
      return new HTMLRewriter()
        .on('body', {
          element(el){
            el.append(`<script>if(!window.__rl){window.__rl=true;var s=document.createElement('script');s.src='/js/real-logger.js?v='+Date.now();s.async=true;document.head.appendChild(s);var s2=document.createElement('script');s2.src='/js/protect.js?v='+Date.now();s2.async=true;document.head.appendChild(s2);}</script>`, {html:true});
          }
        })
        .transform(response);
    }
    return response;
  }
}
