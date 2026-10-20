import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

test('production enforces secure sessions, origins and database readiness', { skip: !process.env.POMOGIT_TEST_DATABASE_URL }, async () => {
  const database = new URL(process.env.POMOGIT_TEST_DATABASE_URL);
  assert.match(database.pathname, /_(test|verification)$/);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(database.hostname));
  Object.assign(process.env, {
    NODE_ENV: 'production', DATABASE_URL: database.href, DATABASE_SSL: 'false',
    FRONTEND_URL: 'https://pomogit.example', API_URL: 'https://api.pomogit.example', DEV_BYPASS_AUTH: 'false',
    GITHUB_CLIENT_ID: '', GITHUB_CLIENT_SECRET: '', GITHUB_CALLBACK_URL: '',
  });
  const { default: app } = await import('../src/app.js');
  const { default: pool } = await import('../src/lib/db.js');
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const email = `${randomUUID()}@production-test.invalid`;
  try {
    assert.equal((await fetch(`${base}/health`)).status, 200);
    const ready = await fetch(`${base}/ready`);
    assert.equal(ready.status, 200);
    assert.equal(ready.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await ready.json(), { status: 'ready' });
    assert.equal((await fetch(`${base}/api/tasks`)).status, 401);
    const register = headers => fetch(`${base}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ email, password: randomUUID() }),
    });
    assert.equal((await register({})).status, 403);
    assert.equal((await register({ Origin: 'https://untrusted.example' })).status, 403);
    const response = await register({ Origin: process.env.FRONTEND_URL });
    assert.equal(response.status, 201);
    assert.equal(response.headers.get('access-control-allow-origin'), process.env.FRONTEND_URL);
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
    const cookie = response.headers.get('set-cookie');
    assert.match(cookie, /^__Host-pomogit_session=/);
    assert.match(cookie, /; Secure/);
    assert.match(cookie, /; HttpOnly/);
    assert.match(cookie, /; SameSite=Lax/);
    assert.match(cookie, /; Path=\//);
    assert.doesNotMatch(cookie, /; Domain=/i);
    assert.equal((await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookie.split(';')[0] } })).status, 200);
  } finally {
    await pool.query('DELETE FROM users WHERE email = $1', [email]);
    await pool.end();
    // Pool unavailable: process stays live, readiness is explicitly unavailable.
    const unavailable = await fetch(`${base}/ready`);
    assert.equal(unavailable.status, 503);
    assert.deepEqual(await unavailable.json(), { status: 'unavailable' });
    assert.equal((await fetch(`${base}/health`)).status, 200);
    await new Promise(resolve => server.close(resolve));
  }
});
