import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createTask,
  discardCheckpoint,
  migrateStore,
  moveTask,
  orderedTasks,
  reorderReadyTask,
  requestCheckpoint,
  safeExternalUrl,
  saveCheckpoint,
  startTaskSession,
} from './workspace.js'

test('migrateStore converts legacy queue items into ordered ready tasks', () => {
  const store = migrateStore({ queue: [{ id: 'old-1', objective: 'Ship the retry', durationMinutes: 25 }] })
  assert.deepEqual(store.tasks.map(({ id, stage, rank }) => ({ id, stage, rank })), [{ id: 'old-1', stage: 'ready', rank: 0 }])
  assert.deepEqual(store.canvas, { pins: [], notes: [], strokes: [] })
  assert.deepEqual(store.records, [])
})

test('migrateStore separates a legacy active session from task stage', () => {
  const store = migrateStore({ active: { id: 'session-1', objective: 'Review pull request', durationMinutes: 15 } })
  assert.equal(store.currentSession.taskId, 'task-session-1')
  assert.equal(store.currentSession.status, 'running')
  assert.equal(store.tasks[0].stage, 'ready')
})

test('migrateStore converts legacy completed sessions and history without data loss', () => {
  const store = migrateStore({
    completed: { id: 'session-2', taskId: 'task-2', objective: 'Fix retry', durationMs: 1_500_000, elapsedMs: 900_000 },
    tasks: [{ id: 'task-2', objective: 'Fix retry', status: 'focus' }],
    history: [{ id: 'old-record', objective: 'Ship auth', evidence: 'abc123', note: 'Add coverage', elapsedMs: 600_000, endedAt: 4_000 }],
  })
  assert.equal(store.currentSession.status, 'awaiting-checkpoint')
  assert.equal(store.tasks[0].stage, 'ready')
  assert.equal(store.records[0].taskTitleSnapshot, 'Ship auth')
  assert.equal(store.records[0].nextStep, 'Add coverage')
})

test('task helpers preserve identity and deterministic ready ordering', () => {
  const first = createTask({ objective: 'Write recovery notes', durationMinutes: 45 }, 'inbox', 'task-1', 1)
  const second = createTask({ objective: 'Add integration test', durationMinutes: 25 }, 'ready', 'task-2', 2)
  const moved = moveTask([first, second], 'task-1', 'ready', 10)
  assert.equal(moved[0].stage, 'ready')
  assert.deepEqual(orderedTasks(moved, 'ready').map((task) => task.id), ['task-2', 'task-1'])
  assert.deepEqual(orderedTasks(reorderReadyTask(moved, 'task-1', 'up', 11), 'ready').map((task) => task.id), ['task-1', 'task-2'])
})

test('one task can create multiple continue checkpoints before completion', () => {
  const task = createTask({ objective: 'Refactor the callback', durationMinutes: 25 }, 'ready', 'task-1', 0)
  let store = migrateStore({ tasks: [task] })

  store = startTaskSession(store, task.id, 1_000)
  assert.equal(store.currentSession.taskId, task.id)
  store = requestCheckpoint(store, 61_000)
  store = saveCheckpoint(store, { disposition: 'continue', evidenceType: 'note', evidence: 'Mapped the failure path.', nextStep: 'Add the retry test.' }, 62_000)
  assert.equal(store.tasks[0].stage, 'ready')
  assert.equal(store.records[0].disposition, 'continue')
  assert.equal(store.records[0].nextStep, 'Add the retry test.')

  store = startTaskSession(store, task.id, 70_000)
  store = requestCheckpoint(store, 130_000)
  store = saveCheckpoint(store, { disposition: 'complete', evidenceType: 'commit', evidence: 'abc123', nextStep: '' }, 131_000)
  assert.equal(store.tasks[0].stage, 'done')
  assert.equal(store.records.length, 2)
  assert.equal(store.records[0].disposition, 'complete')
})

test('discarding an awaiting checkpoint does not add a work record', () => {
  const task = createTask({ objective: 'Try a spike' }, 'ready', 'task-1', 0)
  let store = startTaskSession(migrateStore({ tasks: [task] }), task.id, 1_000)
  store = requestCheckpoint(store, 2_000)
  store = discardCheckpoint(store)
  assert.equal(store.currentSession, null)
  assert.equal(store.records.length, 0)
  assert.equal(store.tasks[0].stage, 'ready')
})

test('checkpoint invariants reject empty evidence and missing continuation context', () => {
  const task = createTask({ objective: 'Trace a race condition' }, 'ready', 'task-1', 0)
  let store = startTaskSession(migrateStore({ tasks: [task] }), task.id, 1_000)
  store = requestCheckpoint(store, 2_000)
  assert.equal(saveCheckpoint(store, { disposition: 'complete', evidence: '', nextStep: '' }, 3_000), store)
  assert.equal(saveCheckpoint(store, { disposition: 'continue', evidence: 'Mapped the race.', nextStep: '' }, 3_000), store)
})

test('external references only allow HTTP and HTTPS URLs', () => {
  assert.equal(safeExternalUrl('https://github.com/example/repo'), 'https://github.com/example/repo')
  assert.equal(safeExternalUrl('http://localhost:3000/task'), 'http://localhost:3000/task')
  assert.equal(safeExternalUrl('javascript:alert(1)'), '')
  assert.equal(safeExternalUrl('data:text/html,unsafe'), '')
  assert.equal(safeExternalUrl('not a url'), '')
})
