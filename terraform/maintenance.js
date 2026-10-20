function handler(event) {
  return {
    statusCode: 503,
    statusDescription: 'Service Unavailable',
    headers: {
      'content-type': { value: 'text/html; charset=utf-8' },
      'cache-control': { value: 'no-store' },
      'retry-after': { value: '3600' },
      'x-content-type-options': { value: 'nosniff' }
    },
    body: event.request.method === 'HEAD' ? '' : '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pomogit is taking a break</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#15121c;color:#eee8f5;font:16px/1.6 system-ui"><main style="max-width:32rem;padding:2rem"><p style="color:#bea6e8">Pomogit</p><h1>Taking a short break.</h1><p>The workspace is temporarily offline. Your saved work will be here when we return.</p></main></body></html>'
  };
}
