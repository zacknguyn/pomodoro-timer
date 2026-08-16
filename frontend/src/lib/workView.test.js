import assert from 'node:assert/strict'
import test from 'node:test'
import { deriveNowState, orderReadyTasks } from './workView.js'

const readyTask = (id, order = 0) => ({
  id,
  title: `Task ${id}`,
  status: 'ready',
  order,
  createdAt: `2026-08-${String(order + 1).padStart(2, '0')}T00:00:00.000Z`,
})

test('Now shows the empty state when no tasks exist', () => {
  assert.equal(deriveNowState({ tasks: [], session: null }).kind, 'empty')
})

test('Now gives an active session first priority', () => {
  const tasks = [readyTask('active'), readyTask('later', 1)]
  const session = { id: 'session-1', taskId: 'active', status: 'active' }
  const state = deriveNowState({ tasks, session })
  assert.equal(state.kind, 'active')
  assert.equal(state.task.id, 'active')
  assert.equal(state.action, 'Add checkpoint')
})

test('Now identifies a paused session', () => {
  const tasks = [readyTask('paused')]
  const session = { id: 'session-1', taskId: 'paused', status: 'paused' }
  const state = deriveNowState({ tasks, session })
  assert.equal(state.kind, 'paused')
  assert.equal(state.action, 'Resume')
})

test('Now selects the most recent saved next step before Ready order', () => {
  const tasks = [readyTask('first'), readyTask('continued', 1)]
  const checkpointsByTask = {
    continued: [{ outcome: 'continue', nextStep: 'Write the failing test', createdAt: '2026-08-16T10:00:00.000Z' }],
  }
  const state = deriveNowState({ tasks, session: null, checkpointsByTask })
  assert.equal(state.kind, 'continue')
  assert.equal(state.task.id, 'continued')
  assert.equal(state.checkpoint.nextStep, 'Write the failing test')
})

test('Now falls back to the first explicitly ordered Ready task', () => {
  const tasks = [readyTask('second', 2), readyTask('first', 0)]
  const state = deriveNowState({ tasks, session: null, checkpointsByTask: {} })
  assert.equal(state.kind, 'ready')
  assert.equal(state.task.id, 'first')
  assert.deepEqual(orderReadyTasks(tasks).map((task) => task.id), ['first', 'second'])
})
