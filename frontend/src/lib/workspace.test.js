import assert from 'node:assert/strict'
import test from 'node:test'
import { createTask, migrateStore, moveTask } from './workspace.js'

test('migrateStore converts legacy queue items into ready cards', () => {
  const store = migrateStore({ queue: [{ id: 'old-1', objective: 'Ship the retry', durationMinutes: 25 }] })
  assert.deepEqual(store.tasks.map(({ id, status }) => ({ id, status })), [{ id: 'old-1', status: 'ready' }])
  assert.deepEqual(store.canvas, { pins: [], notes: [], strokes: [] })
})

test('migrateStore links a legacy active session to an in-focus task', () => {
  const store = migrateStore({ active: { id: 'session-1', objective: 'Review pull request', durationMinutes: 15 } })
  assert.equal(store.active.taskId, 'task-session-1')
  assert.equal(store.tasks[0].status, 'focus')
})

test('task helpers create and move cards without changing their identity', () => {
  const task = createTask({ objective: 'Write recovery notes', durationMinutes: 45 }, 'inbox', 'task-1')
  assert.equal(task.status, 'inbox')
  assert.equal(moveTask([task], 'task-1', 'ready')[0].status, 'ready')
})
