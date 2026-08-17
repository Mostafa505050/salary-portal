// _worker.js v3 - Debug version - always inject and always add header
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Always try to fetch asset first
    let response;
    try {
      response = await env.ASSETS.fetch(request);
    } catch(e) {
      return new Response('Asset not found: '+pathname+' - Worker v3 active', {status:404, headers:{'X-Worker-Active':'v3-debug'}});
    }

    // Add debug header to all responses
    const newHeaders = new Headers(response.headers);
    newHeaders.set('X-Worker-Active', 'v3-debug');
    newHeaders.set('X-Worker-Path', pathname);
    newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');

    const contentType = response.headers.get('Content-Type') || '';
    const isHtml = pathname.endsWith('.html') || pathname === '/' || pathname === '' || !pathname.includes('.') || contentType.includes('text/html');

    if (isHtml) {
      try {
        let html = await response.text();
        // Simple injection - add at top of body or head
        const guardScript = `<script>console.log('%c[Worker] ACTIVE v3 - '+location.pathname, 'color: lime; background: black; padding: 4px 8px; font-weight: bold; font-size: 14px;');</script>`;
        if (html.includes('</head>')) {
          html = html.replace('</head>', guardScript + '</head>');
        } else if (html.includes('<body')) {
          html = html.replace(/<body[^>]*>/i, (m) => m + guardScript);
        } else {
          html = guardScript + html;
        }
        return new Response(html, {
          status: response.status,
          headers: newHeaders
        });
      } catch(e) {
        // If text() fails, return original with header
        return new Response(response.body, {
          status: response.status,
          headers: newHeaders
        });
      }
    }

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders
    });
  }
}
