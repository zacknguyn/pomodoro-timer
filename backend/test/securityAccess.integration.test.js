import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

test('ordinary accounts cannot reach admin controls, inject ownership or execute SQL through task input', { skip: !process.env.POMOGIT_TEST_DATABASE_URL }, async () => {
  const database = new URL(process.env.POMOGIT_TEST_DATABASE_URL);
  assert.match(database.pathname, /_(test|verification)$/);
  Object.assign(process.env, {
    NODE_ENV: 'development', DATABASE_URL: database.href, DATABASE_SSL: 'false',
    DEV_BYPASS_AUTH: 'false', FRONTEND_URL: 'http://localhost:5173',
  });
  const { default: app } = await import('../src/app.js');
  const { default: pool } = await import('../src/lib/db.js');
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const emails = Array.from({ length: 3 }, () => `${randomUUID()}@security-test.invalid`);
  const call = (path, method = 'GET', body, cookie) => fetch(`${base}${path}`, {
    method, headers: { Origin: process.env.FRONTEND_URL, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  try {
    assert.equal((await call('/auth/register', 'POST', { email: emails[0], password: randomUUID(), role: 'superadmin' })).status, 400);
    const accounts = [];
    for (const email of emails.slice(1)) {
      const response = await call('/auth/register', 'POST', { email, password: randomUUID() });
      assert.equal(response.status, 201);
      const user = (await response.json()).user;
      assert.equal(user.role, 'user');
      accounts.push({ user, cookie: response.headers.get('set-cookie').split(';')[0] });
    }
    const [owner, stranger] = accounts;
    for (const [path, method, body] of [
      ['/admin/users', 'GET'], ['/admin/overview', 'GET'],
      [`/admin/users/${owner.user.id}/role`, 'PATCH', { role: 'admin' }],
      [`/admin/users/${owner.user.id}/ban`, 'PATCH', {}],
      [`/admin/users/${owner.user.id}`, 'DELETE'],
    ]) assert.equal((await call(path, method, body, stranger.cookie)).status, 403);
    assert.equal((await call('/tasks', 'POST', { title: 'Forged owner', userId: owner.user.id }, stranger.cookie)).status, 400);
    const title = "'); DROP TABLE users; --";
    const created = await call('/tasks', 'POST', { title }, owner.cookie);
    assert.equal(created.status, 201);
    const task = await created.json();
    assert.equal(task.title, title);
    assert.equal((await call(`/tasks/${task.id}`, 'GET', null, stranger.cookie)).status, 404);
    assert.equal((await call(`/tasks/${task.id}`, 'PATCH', { title: 'Stolen' }, stranger.cookie)).status, 404);
    assert.equal((await call(`/tasks/${task.id}`, 'DELETE', null, stranger.cookie)).status, 404);
    assert.equal((await call('/auth/me', 'GET', null, owner.cookie)).status, 200);
    assert.equal((await pool.query('SELECT role FROM users WHERE id=$1', [owner.user.id])).rows[0].role, 'user');
  } finally {
    await pool.query('DELETE FROM users WHERE email = ANY($1::text[])', [emails]);
    await new Promise(resolve => server.close(resolve));
    await pool.end();
  }
});
