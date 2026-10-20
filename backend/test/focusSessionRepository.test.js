import test from 'node:test';
import assert from 'node:assert/strict';
import focusSessionRepository from '../src/repositories/focusSessionRepository.js';
import { sessionToApi } from '../src/lib/workspaceApi.js';

test('session history uses an owner-scoped query and the export session format', async () => {
  const rows = [{ id: 's1', task_id: 't1', status: 'ended', duration_actual_seconds: 60, started_at: '2026-10-20T10:00:00Z', ended_at: '2026-10-20T10:01:00Z' }];
  const client = { query: async (sql, values) => {
    assert.match(sql, /WHERE user_id = \$1 ORDER BY started_at, id/);
    assert.deepEqual(values, ['owner-fixture']);
    return { rows };
  } };
  assert.deepEqual(await focusSessionRepository.findAll('owner-fixture', client), rows.map(sessionToApi));
});
