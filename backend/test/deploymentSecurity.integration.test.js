import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import pg from 'pg';
import { verifyRuntimeRole, verifyMigrationRole } from '../../deploy/aws/database.mjs';

test('restricted API role and independent Lambda workers enforce shared auth limits', { skip: !process.env.POMOGIT_TEST_DATABASE_URL, timeout: 60000 }, async () => {
  const url = new URL(process.env.POMOGIT_TEST_DATABASE_URL);
  assert.match(url.pathname, /_(test|verification)$/);
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
  const owner = new pg.Pool({ connectionString: url.href, ssl: false });
  const database = `security_${randomBytes(6).toString('hex')}_verification`;
  const password = randomBytes(24).toString('hex');
  let admin, runtime, createdDatabase = false, createdRole = false;
  const workers = [];
  async function worker() {
    const child = spawn(process.execPath, ['--input-type=module', '-e', `
      import { handler } from './src/lambdas/app.js';
      process.on('message', async ({ id, event }) => {
        try { process.send({ id, result: await handler(event, { getRemainingTimeInMillis: () => 30000 }) }); }
        catch { process.send({ id, error: 'Invocation failed' }); }
      });
      process.send({ ready: true });
    `], { cwd: new URL('../', import.meta.url), stdio: ['ignore', 'ignore', 'inherit', 'ipc'], env: {
      ...process.env, NODE_ENV: 'production', DATABASE_URL: runtimeUrl.href, DATABASE_SSL: 'false',
      FRONTEND_URL: 'https://pomogit.example', DEV_BYPASS_AUTH: 'false',
      GITHUB_CLIENT_ID: '', GITHUB_CLIENT_SECRET: '', GITHUB_CALLBACK_URL: '',
      AWS_LAMBDA_FUNCTION_NAME: 'disposable-api-test',
    } });
    workers.push(child);
    assert.equal((await once(child, 'message'))[0].ready, true);
    return child;
  }
  function call(child, path = '/api/auth/login', body = {}, sourceIp = '192.0.2.24', extra = {}) {
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { cleanup(); reject(Error('Test invocation timed out')); }, 10000);
      const receive = message => {
        if (message.id !== id) return;
        cleanup();
        if (message.error) reject(Error(message.error)); else resolve(message.result);
      };
      const cleanup = () => { clearTimeout(timer); child.off('message', receive); };
      child.on('message', receive);
      child.send({ id, event: {
        version: '2.0', routeKey: '$default', rawPath: path, rawQueryString: '',
        headers: { host: 'api.example', origin: 'https://pomogit.example', 'content-type': 'application/json', 'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 200)}`, ...extra },
        requestContext: { stage: '$default', requestId: id, http: { method: 'POST', path, protocol: 'HTTP/1.1', sourceIp } },
        body: JSON.stringify(body), isBase64Encoded: false,
      } });
    });
  }
  const runtimeUrl = new URL(url);
  runtimeUrl.pathname = `/${database}`;
  runtimeUrl.username = 'pomogit_runtime'; runtimeUrl.password = password;
  try {
    await owner.query(`CREATE DATABASE ${database}`); createdDatabase = true;
    await owner.query(await readFile(new URL('../../deploy/aws/create-runtime-role.sql', import.meta.url), 'utf8')); createdRole = true;
    await owner.query(`ALTER ROLE pomogit_runtime PASSWORD '${password}'`);
    const adminUrl = new URL(url); adminUrl.pathname = `/${database}`;
    admin = new pg.Pool({ connectionString: adminUrl.href, ssl: false });
    await admin.query(await readFile(new URL('../schema.sql', import.meta.url), 'utf8'));
    // The real migration handler refreshes grants as the owner, with no OAuth credentials.
    const migration = spawn(process.execPath, ['--input-type=module', '-e', `
      import { handler } from './src/lambdas/migrate.js';
      import pool from './src/lib/db.js';
      try { await handler({ mode: 'upgrade' }, {}); } finally { await pool.end(); }
    `], { cwd: new URL('../', import.meta.url), stdio: ['ignore', 'ignore', 'inherit'], env: {
      ...process.env, NODE_ENV: 'production', DATABASE_URL: adminUrl.href, DATABASE_SSL: 'false',
      FRONTEND_URL: 'https://pomogit.example', DEV_BYPASS_AUTH: 'false', RUNTIME_DATABASE_ROLE: 'pomogit_runtime',
      GITHUB_CLIENT_ID: '', GITHUB_CLIENT_SECRET: '', GITHUB_CALLBACK_URL: '',
    } });
    assert.equal((await once(migration, 'exit'))[0], 0);
    runtime = new pg.Pool({ connectionString: runtimeUrl.href, ssl: false });
    await verifyRuntimeRole(runtime);
    await verifyMigrationRole(admin);
    await assert.rejects(verifyRuntimeRole(admin), /excessive permissions/);
    await assert.rejects(verifyMigrationRole(runtime), /own the schema/);
    for (const sql of ['CREATE TABLE public.forbidden (id int)', 'ALTER TABLE users ADD COLUMN forbidden int', 'DROP TABLE tasks', 'TRUNCATE auth_rate_limits', 'CREATE ROLE forbidden', 'SET ROLE pomogit']) {
      await assert.rejects(runtime.query(sql), { code: '42501' });
    }
    // Default privileges cover objects subsequently created by the migration owner.
    await admin.query('CREATE TABLE future_runtime_access (id int)');
    await runtime.query('INSERT INTO future_runtime_access VALUES (1)');
    await assert.rejects(runtime.query('DROP TABLE future_runtime_access'), { code: '42501' });
    await admin.query('DROP TABLE future_runtime_access');
    const [a, b] = await Promise.all([worker(), worker()]);
    assert.equal((await call(a, '/api/auth/login', {}, 'invalid-address')).statusCode, 503);
    await admin.query("INSERT INTO auth_rate_limits VALUES ($1, 1, NOW() - INTERVAL '1 minute')", ['f'.repeat(64)]);
    const responses = (await Promise.all([a, b].map(async child => {
      const results = [];
      for (let i = 0; i < 12; i++) results.push(await call(child));
      return results;
    }))).flat();
    assert.equal(responses.filter(r => r.statusCode === 400).length, 20);
    assert.equal(responses.filter(r => r.statusCode === 429).length, 4);
    assert.equal((await admin.query("SELECT 1 FROM auth_rate_limits WHERE key = $1", ['f'.repeat(64)])).rowCount, 0);
    assert.ok(responses.filter(r => r.statusCode === 429).every(r => Number(r.headers['retry-after']) > 0));
    a.kill(); await once(a, 'exit');
    const replacement = await worker();
    assert.equal((await call(replacement)).statusCode, 429, 'Cold worker must retain the limit');
    await admin.query("UPDATE auth_rate_limits SET expires_at = NOW() - INTERVAL '1 second'");
    assert.equal((await call(replacement)).statusCode, 400, 'Window expiry must allow requests again');
    const email = `${randomUUID()}@restricted-test.invalid`;
    const registration = await call(b, '/api/auth/register', { email, password: randomBytes(18).toString('hex') }, '192.0.2.25');
    assert.equal(registration.statusCode, 201);
    const cookie = registration.cookies.find(c => c.startsWith('__Host-pomogit_session=')).split(';')[0];
    assert.equal((await call(b, '/api/tasks', { title: 'Restricted role can create tasks' }, '192.0.2.25', { cookie })).statusCode, 201);
    await admin.query('ALTER TABLE auth_rate_limits RENAME TO auth_rate_limits_offline');
    assert.equal((await call(b)).statusCode, 503, 'Database/store failure must fail closed');
    await admin.query('ALTER TABLE auth_rate_limits_offline RENAME TO auth_rate_limits');
  } finally {
    await Promise.all(workers.filter(w => w.exitCode === null && !w.killed).map(async w => { w.kill(); await once(w, 'exit'); }));
    await runtime?.end(); await admin?.end();
    if (createdDatabase) await owner.query(`DROP DATABASE ${database} WITH (FORCE)`);
    if (createdRole) await owner.query('DROP ROLE pomogit_runtime');
    await owner.end();
  }
});
