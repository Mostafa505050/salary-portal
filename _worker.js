var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// _worker.js
var TURSO_API_PRIMARY = "https://turso-api.mostafa-voic77729.workers.dev/api/turso";
var TURSO_API_FALLBACK = "https://auth-api.mostafa-voic77729.workers.dev/api/turso";
async function checkPageBlocked(pageName) {
  let lastError = null;
  let lastResponse = null;
  const variants = [pageName, pageName.replace(/\/$/, ""), pageName + "/"];
  for (const variant of [...new Set(variants)]) {
    const sqlSimple = `SELECT "\u0645\u0641\u0639\u0644\u0629", "\u0627\u0633\u0645_\u0627\u0644\u0635\u0641\u062D\u0629" FROM "\u0635\u0641\u062D\u0627\u062A_\u0627\u0644\u0645\u0648\u0642\u0639" WHERE "\u0627\u0633\u0645_\u0627\u0644\u0635\u0641\u062D\u0629"='${variant.replace(/'/g, "''")}' LIMIT 1`;
    for (const apiUrl of [TURSO_API_PRIMARY, TURSO_API_FALLBACK]) {
      try {
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sql: sqlSimple })
        });
        lastResponse = { status: res.status, url: apiUrl, sql: sqlSimple };
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          data = { raw: text.slice(0, 500) };
        }
        let rows = data.rows || [];
        if (data.results && data.results[0]?.response?.result) {
          const cols = data.results[0].response.result.cols.map((c) => c.name);
          rows = data.results[0].response.result.rows.map((r) => {
            let o = {};
            r.forEach((c, i) => {
              o[cols[i]] = c.value ?? c.text ?? "";
            });
            return o;
          });
        }
        if (rows.length > 0) {
          const enabled = rows[0]["\u0645\u0641\u0639\u0644\u0629"] ?? rows[0].\u0645\u0641\u0639\u0644\u0629;
          const isBlocked = enabled == 0 || enabled == "0" || enabled === false || enabled === "false";
          return { blocked: isBlocked, row: rows[0], variant, sql: sqlSimple, api: apiUrl, debug: { status: res.status, rowsCount: rows.length } };
        }
        const sqlLike = `SELECT "\u0645\u0641\u0639\u0644\u0629", "\u0627\u0633\u0645_\u0627\u0644\u0635\u0641\u062D\u0629" FROM "\u0635\u0641\u062D\u0627\u062A_\u0627\u0644\u0645\u0648\u0642\u0639" WHERE "\u0627\u0633\u0645_\u0627\u0644\u0635\u0641\u062D\u0629" LIKE '%${variant.replace(/'/g, "''")}%' LIMIT 1`;
        const res2 = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sql: sqlLike })
        });
        const text2 = await res2.text();
        let data2;
        try {
          data2 = JSON.parse(text2);
        } catch {
          data2 = { raw: text2.slice(0, 500) };
        }
        let rows2 = data2.rows || [];
        if (data2.results && data2.results[0]?.response?.result) {
          const cols = data2.results[0].response.result.cols.map((c) => c.name);
          rows2 = data2.results[0].response.result.rows.map((r) => {
            let o = {};
            r.forEach((c, i) => {
              o[cols[i]] = c.value ?? c.text ?? "";
            });
            return o;
          });
        }
        if (rows2.length > 0) {
          const enabled = rows2[0]["\u0645\u0641\u0639\u0644\u0629"] ?? rows2[0].\u0645\u0641\u0639\u0644\u0629;
          const isBlocked = enabled == 0 || enabled == "0" || enabled === false || enabled === "false";
          return { blocked: isBlocked, row: rows2[0], variant, sql: sqlLike, api: apiUrl, debug: { status: res2.status, rowsCount: rows2.length } };
        }
        lastResponse = { status: res.status, url: apiUrl, sql: sqlSimple, likeSql: sqlLike, simpleRows: rows.length, likeRows: rows2.length, data, data2 };
      } catch (e) {
        lastError = { message: e.message, url: apiUrl, variant };
        continue;
      }
    }
  }
  return { blocked: false, row: null, variant: null, sql: null, lastError, lastResponse };
}
__name(checkPageBlocked, "checkPageBlocked");
var worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    let pageName = pathname.split("/").pop() || "index.html";
    if (pathname === "/" || pathname === "") pageName = "index.html";
    const skip = ["database-manager", "test-control", "turso-api", "hafez-api", "auth-api", "auth", "/api/", "favicon", ".js", ".css", ".json", ".png", ".jpg", ".jpeg", ".svg", ".ico", ".woff", ".woff2", ".webp", "fonts.googleapis"];
    const lowerPath = pathname.toLowerCase();
    if (skip.some((s) => lowerPath.includes(s.toLowerCase()))) {
      return await env.ASSETS.fetch(request);
    }
    const isHtml = pathname.endsWith(".html") || pathname === "/" || pathname === "" || !pathname.includes(".") || pathname.endsWith("/");
    let blockInfo = { blocked: false };
    if (isHtml) {
      try {
        blockInfo = await checkPageBlocked(pageName);
      } catch (e) {
        blockInfo = { blocked: false, error: e.message };
      }
      if (blockInfo.blocked) {
        return new Response(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>\u0645\u0639\u0637\u0644\u0629</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8f9fb;font-family:Tajawal,system-ui;direction:rtl} .card{text-align:center;background:white;padding:48px 32px;border-radius:20px;border:1px solid #e2e8f0;max-width:480px;box-shadow:0 8px 30px rgba(0,0,0,0.06)} .icon{font-size:56px} h2{margin:8px 0;font-size:22px;color:#0f172a} p{margin:4px 0;color:#64748b;font-size:13px} a{display:inline-block;margin-top:20px;padding:10px 20px;background:#0f172a;color:white;border-radius:10px;text-decoration:none}</style></head><body><div class="card"><div class="icon">\u26D4</div><h2>\u0627\u0644\u0635\u0641\u062D\u0629 \u0645\u0639\u0637\u0644\u0629</h2><p>${pageName}</p><p>\u062A\u0645 \u062A\u0639\u0637\u064A\u0644\u0647\u0627 \u0645\u0646 \u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645</p><p style="font-size:10px;color:#94a3b8;margin-top:8px">${JSON.stringify(blockInfo.row || {}).slice(0, 200)}</p><a href="/database-manager-FIXED.html">\u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645</a></div></body></html>`, {
          status: 403,
          headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache", "X-Blocked-By": "Worker-Turso-v3", "X-Block-Info": JSON.stringify(blockInfo).slice(0, 1e3) }
        });
      }
    }
    let response;
    try {
      response = await env.ASSETS.fetch(request);
    } catch (e) {
      return new Response("Not found " + pathname, { status: 404 });
    }
    if (isHtml) {
      try {
        let html = await response.text();
        const blockInfoJson = JSON.stringify(blockInfo).replace(/</g, "\\u003c");
        const guardScript = `<script>console.log('%c[Worker] FINAL v3', 'color: lime; background: black; padding: 4px 8px; font-weight: bold;'); console.log('[BlockInfo]', ${blockInfoJson}); (function(){const k='salary_portal_page_status';try{const d=JSON.parse(localStorage.getItem(k)||'{}');const p=(location.pathname.split('/').pop()||'index.html');const pn=p===''?'index.html':p;console.log('[Guard] LS:',d,'Page:',pn);if(d[pn]&&d[pn].enabled===false){document.documentElement.innerHTML='<div style=display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8f9fb;font-family:Tajawal;direction:rtl><div style=text-align:center;background:white;padding:40px;border-radius:16px;border:1px solid #e2e8f0;max-width:400px><div style=font-size:48px>\u26D4</div><h2>\u0627\u0644\u0635\u0641\u062D\u0629 \u0645\u0639\u0637\u0644\u0629</h2><p>'+pn+' (localStorage)</p><a href=/database-manager-FIXED.html style=padding:8px 16px;background:#0f172a;color:white;border-radius:8px;text-decoration:none;display:inline-block;margin-top:12px>\u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645</a></div></div>';}}catch(e){}})();<\/script>`;
        if (html.includes("</head>")) html = html.replace("</head>", guardScript + "</head>");
        else if (html.includes("<head>")) html = html.replace("<head>", "<head>" + guardScript);
        else html = guardScript + html;
        const newHeaders = new Headers(response.headers);
        newHeaders.set("Cache-Control", "no-cache, no-store, must-revalidate");
        newHeaders.set("X-Worker-Active", "FINAL-v3");
        newHeaders.set("X-Block-Check", blockInfo.blocked ? "blocked" : "allowed");
        newHeaders.set("X-Block-Debug", JSON.stringify(blockInfo).slice(0, 1e3));
        return new Response(html, { status: response.status, headers: newHeaders });
      } catch (e) {
        const newHeaders = new Headers(response.headers);
        newHeaders.set("X-Worker-Active", "FINAL-v3-error");
        newHeaders.set("X-Error", e.message.slice(0, 500));
        return new Response(response.body, { status: response.status, headers: newHeaders });
      }
    }
    return response;
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=_worker.js.map
