import test from 'node:test';
import assert from 'node:assert/strict';
import { checkpointSchema } from '../src/controllers/checkpointController.js';

const baseCheckpoint = {
  taskId: 'task-1',
  sessionId: 'session-1',
  whatChanged: 'Traced the callback race.',
};

test('continue checkpoints require a concrete next step', () => {
  const result = checkpointSchema.safeParse({ ...baseCheckpoint, outcome: 'continue' });
  assert.equal(result.success, false);
  assert.equal(result.error.issues[0].path[0], 'nextStep');
});

test('complete checkpoints do not require a next step', () => {
  const result = checkpointSchema.safeParse({ ...baseCheckpoint, outcome: 'complete' });
  assert.equal(result.success, true);
  assert.equal(result.data.nextStep, '');
});
