// _worker.js - V8.3 FIX غير موجود
const HARDCODED_TURSO_URL = "https://company-alldata-mostafadarwish-mostafa505050.aws-eu-west-1.turso.io";
const SECURITY_HEADERS = {
  'X-Frame-Options':'DENY','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'
};
function addSecurityHeaders(r){ const h=new Headers(r.headers); for(const [k,v] of Object.entries(SECURITY_HEADERS)) h.set(k,v); return new Response(r.body,{status:r.status,headers:h}); }
function getPepperSecret(env){ return (env.PEPPER_SECRET||'').trim() || "fallback_pepper_v8_please_set"; }
async function hashWithPepper(c,n,p){ const d=new TextEncoder().encode(String(c).trim()+'|'+String(n).trim()+'|'+p); const b=await crypto.subtle.digest('SHA-256',d); return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join(''); }
async function hashPasswordSecure(p,n,pe){ return hashWithPepper(p,n,pe); }
async function hashPatternServer(c,n,p){ return hashWithPepper(c,n,p); }
async function hashFaceServer(c,n,p){ return hashWithPepper(c,n,p); }
function getClientIp(req){ return req.headers.get('CF-Connecting-IP')||'unknown'; }
function safeRowToObject(cols,row){ const o={}; row.forEach((c,i)=>{ const k=cols[i]; if(k.includes('__proto__')) return; o[k]=c.value??c.text??''; }); return o; }
function constantTimeCompare(a,b){ const sa=String(a),sb=String(b); if(sa.length!==sb.length) return false; let r=0; for(let i=0;i<sa.length;i++) r|=sa.charCodeAt(i)^sb.charCodeAt(i); return r===0; }
function isValidNationalIdSecure(id){ return /^\d{14}$/.test(String(id).trim()); }
function generateSecureTokenFixed(){ const a=new Uint8Array(32); crypto.getRandomValues(a); return `sec_${Array.from(a).map(b=>b.toString(16).padStart(2,'0')).join('')}_${Date.now()}`; }

function getTursoConfig(env){
  let url=(env.TURSO_URL||HARDCODED_TURSO_URL||'').trim(); let token=(env.TURSO_TOKEN||'').trim();
  if(!url) return {error:'TURSO_URL missing'}; if(!token||token.length<10) return {error:'TURSO_TOKEN missing - ضعه في Cloudflare Variables'};
  if(url.startsWith('libsql://')) url='https://'+url.slice(8);
  return {url,token,error:null};
}
async function tursoQuery(env,sql,params=[]){
  const cfg=getTursoConfig(env); if(cfg.error) return {error:cfg.error, isConfigError:true};
  try{
    const res=await fetch(`${cfg.url}/v2/pipeline`, {method:'POST', headers:{'Authorization':`Bearer ${cfg.token}`,'Content-Type':'application/json'}, body: JSON.stringify({requests:[{type:'execute', stmt:{sql, args:params.map(v=>({type:'text',value:String(v)}))}}, {type:'close'}]})});
    const txt=await res.text(); let data; try{ data=JSON.parse(txt); }catch{ return {error:`Turso HTTP ${res.status}: ${txt.slice(0,200)}`}; }
    if(data.results?.[0]?.error) return {error:data.results[0].error.message};
    return {result:data.results?.[0]?.response?.result};
  }catch(e){ return {error:e.message}; }
}

// يجرب كل أشكال العمود
async function findEmployeeByCard(env, card){
  const queries = [
    `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`,
    `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومي"=? LIMIT 1`,
    `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومى" =? LIMIT 1`,
    `SELECT * FROM "موظفين_مرتبات" WHERE "الرقم_القومى"=? LIMIT 1`,
    `SELECT * FROM موظفين_مرتبات WHERE الرقم_القومى=? LIMIT 1`,
    `SELECT * FROM "موظفين_مرتبات" WHERE "رقم_قومي"=? LIMIT 1`
  ];
  let lastError = null;
  for(const sql of queries){
    const q = await tursoQuery(env, sql, [card]);
    if(q.error){ lastError = q.error; continue; }
    if(q.result?.rows?.length>0) return {found:true, q, sqlUsed: sql};
  }
  return {found:false, lastError, tried: queries.length};
}

export default {
  async fetch(request, env, ctx){
    const url=new URL(request.url); const path=url.pathname;
    if(request.method==='OPTIONS') return new Response(null,{status:204, headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization',...SECURITY_HEADERS}});

    if(path==='/api/debug-config'){
      const cfg=getTursoConfig(env);
      // جرب عد الصفوف لمعرفة هل الجدول موجود
      const countQ = await tursoQuery(env, `SELECT COUNT(*) as c FROM "موظفين_مرتبات"`);
      let count = countQ.error? `error: ${countQ.error}` : null;
      if(countQ.result?.rows?.length){ const cols=countQ.result.cols.map(c=>c.name); count=safeRowToObject(cols,countQ.result.rows[0]).c; }
      return new Response(JSON.stringify({v:'V8.3', tursoUrlOk:!cfg.error, tursoError:cfg.error, tableCount: count, hasPepper:!!env.PEPPER_SECRET, ip:getClientIp(request)},null,2),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
    }

    if(path==='/api/get-ip') return new Response(JSON.stringify({ip:getClientIp(request)}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});

    if(path==='/api/check-by-card-secure' && request.method==='POST'){
      try{
        const body=await request.json().catch(()=>({})); const card=String(body.cardNumber||'').trim();
        if(!isValidNationalIdSecure(card)) return new Response(JSON.stringify({ok:false,msg:'رقم البطاقة يجب أن يكون 14 رقم'}),{status:400,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});

        const foundRes = await findEmployeeByCard(env, card);
        if(!foundRes.found){
          return new Response(JSON.stringify({
            ok:false,
            msg:'غير موجود',
            debug: foundRes.lastError? `آخر خطأ DB: ${foundRes.lastError}` : `جربنا ${foundRes.tried} صيغ للعمود ولم نجد`,
            hint: foundRes.lastError?.includes('no such column')? 'اسم العمود في Turso مختلف - افتح Turso Dashboard وتأكد من اسم العمود' : 'تأكد أن الرقم موجود فعلاً في جدول موظفين_مرتبات'
          }),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
        }
        const cols=foundRes.q.result.cols.map(c=>c.name); const userObj=safeRowToObject(cols,foundRes.q.result.rows[0]); delete userObj['كلمة_المرور'];
        return new Response(JSON.stringify({ok:true,user:userObj, sqlUsed:foundRes.sqlUsed}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }catch(e){
        return new Response(JSON.stringify({ok:false,msg:`خطأ خادم: ${e.message}`}),{status:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      }
    }

    if(path==='/api/verify-password-secure' && request.method==='POST'){
      const body=await request.json().catch(()=>({})); const card=String(body.cardNumber||'').trim(); const pass=String(body.password||'').trim();
      const foundRes = await findEmployeeByCard(env, card);
      if(!foundRes.found) return new Response(JSON.stringify({ok:false,msg:'بيانات غير صحيحة'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      const cols=foundRes.q.result.cols.map(c=>c.name); const u=safeRowToObject(cols,foundRes.q.result.rows[0]); const stored=String(u['كلمة_المرور']||'').trim();
      const pepper=getPepperSecret(env); const hashed=await hashPasswordSecure(pass,card,pepper);
      const ok=constantTimeCompare(stored,hashed)||constantTimeCompare(stored,pass);
      if(!ok) return new Response(JSON.stringify({ok:false,msg:'بيانات غير صحيحة'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
      const token=generateSecureTokenFixed();
      return new Response(JSON.stringify({ok:true,token,role:u['الصلاحيات']||'User'}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
    }

    if(path==='/api/salary-turso'){
      const year=url.searchParams.get('year')?.trim(); const month=url.searchParams.get('month')?.trim(); const code=url.searchParams.get('code')?.trim();
      const q=await tursoQuery(env, `SELECT * FROM "مرتبات_شهرية" WHERE "السنه"=? AND "الشهر"=? AND ("كود_العامل"=? OR "الكود_البنكى"=?) LIMIT 1`, [year,month,code,code]);
      if(!q.result?.rows?.length){
        return new Response(JSON.stringify({found:false,data:null}), {
          headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}
        });
      }
      const cols=q.result.cols.map(c=>c.name); const data={}; q.result.rows[0].forEach((cell,i)=>{ data[cols[i]]=cell.value??''; });
      return new Response(JSON.stringify({found:true,data}),{headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*',...SECURITY_HEADERS}});
    }

    // الملفات الثابتة
    try{
      if(env.ASSETS){ const res=await env.ASSETS.fetch(request); if(res.status!==404) return addSecurityHeaders(res); }
      return new Response(`404 ${path} - تأكد من وجود index.html`,{status:404,headers:{'Content-Type':'text/html; charset=utf-8',...SECURITY_HEADERS}});
    }catch{ return new Response('Not found',{status:404}); }
  }
}
