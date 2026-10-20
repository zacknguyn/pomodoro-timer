import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';

test('Better Auth migration preserves legacy IDs, credentials and task ownership without accepting old sessions', { skip: !process.env.POMOGIT_TEST_DATABASE_URL }, async () => {
  const url = new URL(process.env.POMOGIT_TEST_DATABASE_URL);
  assert.match(url.pathname, /_(test|verification)$/);
  Object.assign(process.env, { NODE_ENV: 'development', DATABASE_URL: url.href, DATABASE_SSL: 'false', DEV_BYPASS_AUTH: 'false', FRONTEND_URL: 'http://localhost:5173' });
  const { default: pool } = await import('../src/lib/db.js');
  const { default: app } = await import('../src/app.js');
  const user = randomUUID(), task = randomUUID(), github = randomUUID();
  const email = `${user}@migration-test.invalid`, password = randomBytes(24).toString('hex');
  const hash = await bcrypt.hash(password, 10);
  const oldToken = randomBytes(32).toString('base64url');
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    await pool.query('INSERT INTO users(id,email,password,github_id) VALUES($1,$2,$3,$4)', [user,email,hash,github]);
    await pool.query("INSERT INTO tasks(id,user_id,title) VALUES($1,$2,'Keep ownership')", [task,user]);
    await pool.query("INSERT INTO auth_sessions(user_id,token_hash,expires_at) VALUES($1,$2,NOW()+INTERVAL '1 day')", [user,createHash('sha256').update(oldToken).digest('hex')]);
    const sql = await readFile(new URL('../migrations/007_better_auth.sql', import.meta.url), 'utf8');
    await pool.query(sql); await pool.query(sql);
    const records = (await pool.query('SELECT user_id, account_id, provider_id, password FROM auth_accounts WHERE user_id=$1 ORDER BY provider_id', [user])).rows;
    assert.deepEqual(records.map(r => [r.user_id,r.account_id,r.provider_id]), [[user,user,'credential'],[user,github,'github']]);
    assert.equal(records[0].password, hash);
    assert.equal((await pool.query('SELECT user_id FROM tasks WHERE id=$1', [task])).rows[0].user_id, user);
    const old = await fetch(`${base}/auth/me`, { headers: { Cookie: `pomogit_session=${oldToken}` } });
    assert.equal(old.status, 401);
    const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email,password }) });
    assert.equal(login.status, 200);
    const body = await login.json();
    assert.equal(body.user.id, user);
    assert.deepEqual(Object.keys(body), ['user']);
    assert.ok(!JSON.stringify(body).includes(hash));
    const cookie = login.headers.getSetCookie().find(c => c.startsWith('pomogit_session=')).split(';')[0];
    assert.equal((await fetch(`${base}/tasks/${task}`, { headers: { Cookie: cookie } })).status, 200);
    assert.equal((await fetch(`${base}/auth/sign-up/email`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name:'Elevated', email:'bypass@example.invalid', password, role:'superadmin' }) })).status, 404);
    await pool.query("UPDATE auth_accounts SET password='updated-hash' WHERE user_id=$1 AND provider_id='credential'", [user]);
    await pool.query(sql);
    assert.equal((await pool.query("SELECT password FROM auth_accounts WHERE user_id=$1 AND provider_id='credential'", [user])).rows[0].password, 'updated-hash');
  } finally {
    await pool.query('DELETE FROM users WHERE id=$1', [user]);
    await new Promise(resolve => server.close(resolve));
    await pool.end();
  }
});
