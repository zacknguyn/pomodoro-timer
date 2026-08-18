import test from 'node:test';
import assert from 'node:assert/strict';
import checkpointRepository from '../src/repositories/checkpointRepository.js';

test('review entries join checkpoint evidence with task and session context', async () => {
  const rows = [{
    id: 'checkpoint-1',
    task_id: 'task-1',
    session_id: 'session-1',
    task_title: 'Tighten the retry path',
    task_status: 'ready',
    task_reference_url: 'https://example.com/pull/1',
    session_started_at: '2026-08-18T00:00:00.000Z',
    session_ended_at: '2026-08-18T00:18:00.000Z',
    duration_actual_seconds: 1080,
    what_changed: 'Covered the expired callback branch.',
    next_step: 'Open the pull request.',
    outcome: 'continue',
    created_at: '2026-08-18T00:18:00.000Z',
  }];
  const client = { query: async () => ({ rows }) };

  const [entry] = await checkpointRepository.findAll('user-1', client);

  assert.equal(entry.task.title, 'Tighten the retry path');
  assert.equal(entry.task.status, 'ready');
  assert.equal(entry.session.durationActualSeconds, 1080);
  assert.equal(entry.whatChanged, 'Covered the expired callback branch.');
  assert.equal(entry.nextStep, 'Open the pull request.');
});
