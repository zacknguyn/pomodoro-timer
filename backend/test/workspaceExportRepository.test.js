import test from 'node:test';
import assert from 'node:assert/strict';
import workspaceExportRepository from '../src/repositories/workspaceExportRepository.js';

test('workspace export contains all three MVP record types', async () => {
  const responses = [
    { rows: [{ id: 'task-1', title: 'Ship export', status: 'ready', ready_order: 0, reference_url: null, created_at: '2026-08-18T00:00:00.000Z' }] },
    { rows: [{ id: 'session-1', task_id: 'task-1', started_at: '2026-08-18T00:01:00.000Z', ended_at: '2026-08-18T00:02:00.000Z', duration_planned_seconds: 60, duration_actual_seconds: 60, status: 'ended', deadline_at: null, remaining_seconds: 0 }] },
    { rows: [{ id: 'checkpoint-1', task_id: 'task-1', session_id: 'session-1', what_changed: 'Exported all records.', next_step: null, outcome: 'complete', created_at: '2026-08-18T00:02:00.000Z' }] },
  ];
  const queries = [];
  const client = { query: async (sql) => { queries.push(sql); return responses.shift(); } };

  const snapshot = await workspaceExportRepository.createSnapshot('user-1', client, new Date('2026-08-18T00:03:00.000Z'));

  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.exportedAt, '2026-08-18T00:03:00.000Z');
  assert.equal(snapshot.tasks[0].order, 0);
  assert.equal(snapshot.focusSessions[0].taskId, 'task-1');
  assert.equal(snapshot.checkpoints[0].sessionId, 'session-1');
  assert.equal(queries.length, 3);
});
