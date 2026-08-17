import test from 'node:test'
import assert from 'node:assert/strict'
import { applyCheckpointToTasks, createCheckpointPayload, validateCheckpointForm } from './checkpointForm.js'

test('continue later requires a concrete next step', () => {
  assert.deepEqual(validateCheckpointForm({ outcome: 'continue', nextStep: '   ' }), {
    nextStep: 'Name the next concrete step before continuing later.',
  })
  assert.deepEqual(validateCheckpointForm({ outcome: 'continue', nextStep: 'Add retry coverage' }), {})
})

test('mark complete does not require a next step and preserves evidence as entered', () => {
  assert.deepEqual(validateCheckpointForm({ outcome: 'complete', nextStep: '' }), {})
  const payload = createCheckpointPayload({
    taskId: 'task-1',
    sessionId: 'session-1',
    outcome: 'complete',
    nextStep: 'Ignored draft',
    whatChanged: 'fix: retry callback\n\nPreserve this body exactly.\n',
  })
  assert.equal(payload.nextStep, '')
  assert.equal(payload.whatChanged, 'fix: retry callback\n\nPreserve this body exactly.\n')
})

test('continue later returns the task to the front of Ready', () => {
  const tasks = [
    { id: 'task-1', status: 'ready', order: 2 },
    { id: 'task-2', status: 'ready', order: 0 },
    { id: 'task-3', status: 'inbox', order: 0 },
  ]
  const next = applyCheckpointToTasks(tasks, { taskId: 'task-1', outcome: 'continue' })
  assert.deepEqual(next.map(({ id, status, order }) => ({ id, status, order })), [
    { id: 'task-1', status: 'ready', order: 0 },
    { id: 'task-2', status: 'ready', order: 1 },
    { id: 'task-3', status: 'inbox', order: 0 },
  ])
})

test('mark complete moves only the checkpoint task to Done', () => {
  const tasks = [
    { id: 'task-1', status: 'ready', order: 0 },
    { id: 'task-2', status: 'ready', order: 1 },
  ]
  const next = applyCheckpointToTasks(tasks, { taskId: 'task-1', outcome: 'complete' })
  assert.equal(next[0].status, 'done')
  assert.deepEqual(next[1], tasks[1])
})
