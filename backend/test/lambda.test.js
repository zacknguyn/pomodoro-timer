import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

test('Lambda serves the full secured app and preserves API errors and cookie headers', async () => {
  Object.assign(process.env, {
    BETTER_AUTH_SECRET: randomBytes(48).toString('base64url'), NODE_ENV: 'production', FRONTEND_URL: 'https://pomogit.example',
    DATABASE_URL: 'postgresql://unused@db.example/pomogit', DATABASE_SSL: 'true',
    DEV_BYPASS_AUTH: 'false', GITHUB_CLIENT_ID: '', GITHUB_CLIENT_SECRET: '', GITHUB_CALLBACK_URL: '',
  });
  const { handler } = await import('../src/lambdas/app.js');
  const invoke = (path, method = 'GET', headers = {}) => handler({
    version: '2.0', routeKey: '$default', rawPath: path, rawQueryString: '',
    headers: { host: 'api.example', ...headers },
    requestContext: { stage: '$default', requestId: 'local-test', http: { method, path, protocol: 'HTTP/1.1', sourceIp: '127.0.0.1' } },
    isBase64Encoded: false,
  }, { awsRequestId: 'local-test', getRemainingTimeInMillis: () => 30_000 });
  assert.equal((await invoke('/health')).statusCode, 200);
  for (const path of ['/api/tasks', '/api/sessions/active', '/api/checkpoints', '/api/export', '/api/github/projects', '/api/admin/users']) {
    assert.equal((await invoke(path)).statusCode, 401, path);
  }
  assert.equal((await invoke('/api/auth/logout', 'POST')).statusCode, 403);
  assert.equal((await invoke('/api/auth/logout', 'POST', { origin: 'https://untrusted.example' })).statusCode, 403);
  const logout = await invoke('/api/auth/logout', 'POST', { origin: process.env.FRONTEND_URL });
  assert.equal(logout.statusCode, 204);
  assert(logout.cookies.some(cookie => cookie.startsWith('__Host-pomogit_session=') && cookie.includes('Secure') && cookie.includes('HttpOnly')));
  assert.equal((await invoke('/api/not-a-route')).statusCode, 404);
});
