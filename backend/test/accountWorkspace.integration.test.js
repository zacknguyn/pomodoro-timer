import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Opt-in only: point this at a disposable, initialized PostgreSQL database.
test('accounts persist the full workspace flow and isolate owners', { skip: !process.env.POMOGIT_TEST_DATABASE_URL }, async () => {
  const url = new URL(process.env.POMOGIT_TEST_DATABASE_URL);
  assert.match(url.pathname, /_(test|verification)$/);
  process.env.DATABASE_URL = url.href;
  process.env.DATABASE_SSL = 'false';
  process.env.DEV_BYPASS_AUTH = 'false';
  process.env.NODE_ENV = 'development';
  const { default: app } = await import('../src/app.js');
  const { default: pool } = await import('../src/lib/db.js');
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const users = [];
  const password = randomUUID();
  async function call(path, method = 'GET', body, cookie) {
    const response = await fetch(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, cookie: response.headers.get('set-cookie'), data: response.status === 204 ? null : await response.json() };
  }
  async function register() {
    const email = `${randomUUID()}@account-test.invalid`;
    const result = await call('/auth/register', 'POST', { email, password });
    assert.equal(result.status, 201);
    assert.match(result.cookie, /HttpOnly/i);
    assert.match(result.cookie, /SameSite=Lax/i);
    users.push(result.data.user.id);
    return { email, cookie: result.cookie.split(';')[0] };
  }
  try {
    assert.equal((await call('/tasks')).status, 401);
    assert.equal((await call('/auth/register', 'POST', { email: 'short@account-test.invalid', password: 'short' })).status, 400);
    const owner = await register();
    const stranger = await register();
    assert.equal((await call('/auth/login', 'POST', { email: owner.email, password: randomUUID() })).status, 401);
    assert.equal((await call('/auth/register', 'POST', { email: owner.email, password })).status, 409);
    assert.equal((await call('/auth/me', 'GET', null, owner.cookie)).data.user.id, users[0]);
    const created = await call('/tasks', 'POST', { title: 'Real workspace check', project: 'pomogit', nextStep: 'Verify persistence', referenceUrl: 'https://github.com/example/repo/issues/1' }, owner.cookie);
    assert.equal(created.status, 201);
    const id = created.data.id;
    const note = { id: randomUUID(), text: 'Saved context', createdAt: new Date().toISOString(), kind: 'note' };
    assert.equal((await call(`/tasks/${id}`, 'PATCH', { status: 'ready', notes: [note] }, owner.cookie)).status, 200);
    assert.equal((await call(`/tasks/${id}`, 'GET', null, stranger.cookie)).status, 404);
    assert.equal((await call(`/tasks/${id}`, 'PATCH', { title: 'Stolen' }, stranger.cookie)).status, 404);
    assert.equal((await call(`/tasks/${id}`, 'DELETE', null, stranger.cookie)).status, 404);
    assert.deepEqual((await call('/tasks', 'GET', null, stranger.cookie)).data, []);
    const session = await call('/sessions', 'POST', { taskId: id, durationPlannedSeconds: 1500 }, owner.cookie);
    assert.equal(session.status, 201);
    assert.equal((await call(`/tasks/${id}`, 'GET', null, owner.cookie)).data.status, 'progress');
    assert.equal((await call('/sessions', 'POST', { taskId: id, durationPlannedSeconds: 1500 }, owner.cookie)).status, 409);
    assert.equal((await call('/sessions', 'POST', { taskId: id, durationPlannedSeconds: 1500 }, stranger.cookie)).status, 404);
    assert.equal((await call(`/sessions/${session.data.id}`, 'PATCH', { action: 'pause' }, stranger.cookie)).status, 404);
    assert.equal((await call(`/tasks/${id}`, 'PATCH', { status: 'done' }, owner.cookie)).status, 409);
    assert.equal((await call(`/tasks/${id}`, 'DELETE', null, owner.cookie)).status, 409);
    assert.equal((await call(`/sessions/${session.data.id}`, 'PATCH', { action: 'pause' }, owner.cookie)).data.status, 'paused');
    assert.equal((await call(`/tasks/${id}`, 'DELETE', null, owner.cookie)).status, 409);
    assert.equal((await call('/auth/logout', 'POST', null, owner.cookie)).status, 204);
    assert.equal((await call('/auth/me', 'GET', null, owner.cookie)).status, 401);
    assert.equal((await call('/tasks', 'GET', null, owner.cookie)).status, 401);
    const login = await call('/auth/login', 'POST', { email: owner.email, password });
    assert.equal(login.status, 200);
    const secondBrowserCookie = login.cookie.split(';')[0];
    const restored = (await call(`/tasks/${id}`, 'GET', null, secondBrowserCookie)).data;
    assert.equal(restored.project, 'pomogit');
    assert.equal(restored.nextStep, 'Verify persistence');
    assert.equal(restored.notes[0].text, 'Saved context');
    assert.equal((await call('/sessions/active', 'GET', null, secondBrowserCookie)).data.status, 'paused');
    assert.equal((await call(`/sessions/${session.data.id}`, 'PATCH', { action: 'resume' }, secondBrowserCookie)).data.status, 'active');
    assert.equal((await call(`/sessions/${session.data.id}`, 'PATCH', { action: 'end' }, secondBrowserCookie)).data.status, 'ended');
    const done = await call(`/tasks/${id}`, 'PATCH', { status: 'done', notes: [...restored.notes, { ...note, id: randomUUID(), text: 'Closing note' }] }, secondBrowserCookie);
    assert.equal(done.status, 200);
    assert.equal(done.data.status, 'done');
    assert.ok(done.data.notes.some((entry) => entry.text === 'Closing note'));
    assert.ok(done.data.notes.some((entry) => entry.text.endsWith('to done.')));
    const exported = (await call('/export', 'GET', null, secondBrowserCookie)).data;
    assert.equal(exported.tasks[0].nextStep, 'Verify persistence');
    assert.equal(exported.focusSessions[0].status, 'ended');
    assert.deepEqual((await call('/export', 'GET', null, stranger.cookie)).data.tasks, []);
    assert.equal((await call('/sessions', 'POST', { taskId: id, durationPlannedSeconds: 1500 }, secondBrowserCookie)).status, 409);
    assert.equal((await call(`/tasks/${id}`, 'PATCH', { referenceUrl: 'javascript:alert(1)' }, secondBrowserCookie)).status, 400);
    assert.equal((await call(`/tasks/${id}`, 'PATCH', { notes: [{ ...note, kind: 'invalid' }] }, secondBrowserCookie)).status, 400);
    // Real PostgreSQL persistence survives a new connection, not browser storage.
    const disposable = await call('/tasks', 'POST', { title: 'Delete only this task' }, secondBrowserCookie);
    const disposableSession = await call('/sessions', 'POST', { taskId: disposable.data.id, durationPlannedSeconds: 60 }, secondBrowserCookie);
    await call(`/sessions/${disposableSession.data.id}`, 'PATCH', { action: 'end' }, secondBrowserCookie);
    const checkpoint = await call('/checkpoints', 'POST', { taskId: disposable.data.id, sessionId: disposableSession.data.id, outcome: 'complete', whatChanged: 'Disposable deletion evidence' }, secondBrowserCookie);
    assert.equal(checkpoint.status, 201);
    assert.equal((await call(`/tasks/${disposable.data.id}`, 'DELETE', null, secondBrowserCookie)).status, 204);
    const afterDelete = (await call('/export', 'GET', null, secondBrowserCookie)).data;
    assert.ok(!afterDelete.tasks.some((task) => task.id === disposable.data.id));
    assert.ok(!afterDelete.focusSessions.some((session) => session.taskId === disposable.data.id));
    assert.ok(!afterDelete.checkpoints.some((entry) => entry.taskId === disposable.data.id));
    assert.ok(afterDelete.tasks.some((task) => task.id === id));
    const invalidOrigin = await fetch(`${base}/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: secondBrowserCookie, Origin: 'https://untrusted.invalid' }, body: JSON.stringify({ title: 'Cross-site task' }) });
    assert.equal(invalidOrigin.status, 403);
    await pool.query("UPDATE auth_sessions SET expires_at = NOW() - INTERVAL '1 second' WHERE user_id = $1", [users[0]]);
    assert.equal((await call('/tasks', 'GET', null, secondBrowserCookie)).status, 401);
    const { rows: [stored] } = await pool.query('SELECT project, next_step, notes FROM tasks WHERE id = $1', [id]);
    assert.equal(stored.project, 'pomogit');
    assert.ok(stored.notes.some((entry) => entry.text === 'Closing note'));
  } finally {
    await pool.query('DELETE FROM users WHERE id = ANY($1::text[])', [users]);
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
});
