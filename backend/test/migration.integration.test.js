import test from 'node:test';
import assert from 'node:assert/strict';

test('deployment migration handler refuses destructive modes and initialization over existing data', { skip: !process.env.POMOGIT_TEST_DATABASE_URL }, async (t) => {
  const database = new URL(process.env.POMOGIT_TEST_DATABASE_URL);
  assert.match(database.pathname, /_(test|verification)$/);
  Object.assign(process.env, { NODE_ENV: 'development', DATABASE_URL: database.href, DATABASE_SSL: 'false' });
  const { handler } = await import('../src/lambdas/migrate.js');
  const { default: pool } = await import('../src/lib/db.js');
  try {
    await assert.rejects(handler({ mode: 'cleanup-legacy' }, {}), /Choose init or upgrade/);
    await assert.rejects(handler({ mode: 'init' }, {}), /empty database/);
    process.env.RUNTIME_DATABASE_ROLE = 'pomogit_runtime';
    const query = pool.query.bind(pool);
    // Inject a real PostgreSQL transaction failure at the permission step, regardless of other tests' roles.
    t.mock.method(pool, 'query', sql => query(sql.includes('-- Run as the schema owner') ? 'BEGIN; SELECT 1/0;' : sql));
    await assert.rejects(handler({ mode: 'upgrade' }, {}), { code: '22012' });
    assert.equal((await pool.query('SELECT 1 AS ok')).rows[0].ok, 1, 'Failed permission setup must release the aborted transaction');
    delete process.env.RUNTIME_DATABASE_ROLE;
  } finally { await pool.end(); }
});
