import test from 'node:test';
import assert from 'node:assert/strict';
import checkpointRepository from '../src/repositories/checkpointRepository.js';
import workspaceExportRepository from '../src/repositories/workspaceExportRepository.js';

test('review queries are scoped to the authenticated owner', async () => {
  const calls = [];
  const client = { query: async (sql, values) => { calls.push({ sql, values }); return { rows: [] }; } };

  await checkpointRepository.findAll('owner-a', client);

  assert.match(calls[0].sql, /c\.user_id = \$1/);
  assert.deepEqual(calls[0].values, ['owner-a']);
});

test('workspace export scopes every record type to one owner', async () => {
  const calls = [];
  const client = { query: async (sql, values) => { calls.push({ sql, values }); return { rows: [] }; } };

  await workspaceExportRepository.createSnapshot('owner-b', client);

  assert.equal(calls.length, 3);
  for (const call of calls) {
    assert.match(call.sql, /user_id = \$1/);
    assert.deepEqual(call.values, ['owner-b']);
  }
});
