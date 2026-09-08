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

// ========== Worker الرئيسي - الدوال القديمة محفوظة + استدعاء الدوال الجديدة ==========
export default {
  async fetch(request, env, ctx){
    const url = new URL(request.url);
    const path = url.pathname;

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
