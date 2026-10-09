import assert from 'node:assert/strict'
import { test } from 'node:test'

const data = new Map()
globalThis.localStorage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }
globalThis.window = { setTimeout: (callback) => setTimeout(callback, 0) }
const { mockWorkspace } = await import('./mockWorkspace.js')

test('focus stays global and stopping preserves unfinished work and session evidence', async () => {
  mockWorkspace.reset()
  const task = (await mockWorkspace.listTasks()).find((item) => item.status === 'ready')
  const session = await mockWorkspace.createSession(task.id, 1500)
  assert.equal((await mockWorkspace.listTasks()).find((item) => item.id === task.id).status, 'progress')
  await assert.rejects(mockWorkspace.createSession(task.id), /already/)
  await assert.rejects(mockWorkspace.updateTask(task.id, { status: 'done' }), /Stop the timer/)
  await assert.rejects(mockWorkspace.updateTask(task.id, { status: 'inbox' }), /Stop the timer/)
  const paused = await mockWorkspace.transitionSession(session.id, 'pause')
  assert.equal(paused.status, 'paused')
  const resumed = await mockWorkspace.transitionSession(session.id, 'resume')
  assert.equal(resumed.status, 'active')
  const ended = await mockWorkspace.transitionSession(session.id, 'end')
  assert.equal(ended.status, 'ended')
  assert.equal(await mockWorkspace.getActiveSession(), null)
  const exported = await mockWorkspace.exportWorkspace()
  assert.equal(exported.tasks.find((item) => item.id === task.id).status, 'progress')
  assert.equal(exported.sessions.find((item) => item.id === session.id).status, 'ended')
})

test('editing notes and lifecycle together retains both pieces of evidence', async () => {
  mockWorkspace.reset()
  const task = await mockWorkspace.createTask({ title: 'Keyboard access', project: 'web-client', nextStep: 'Check Escape.' })
  const note = { id: 'note-1', text: 'Focus returns correctly.', createdAt: new Date().toISOString(), kind: 'note' }
  const updated = await mockWorkspace.updateTask(task.id, { notes: [note], status: 'done' })
  assert.equal(updated.project, 'web-client')
  assert.equal(updated.notes.find((item) => item.id === note.id).text, note.text)
  assert.ok(updated.notes.some((item) => item.kind === 'change' && item.text.endsWith('to done.')))
  await assert.rejects(mockWorkspace.createSession(task.id), /unfinished/)
  await mockWorkspace.updateTask(task.id, { status: 'ready' })
  assert.equal((await mockWorkspace.listTasks()).find((item) => item.id === task.id).status, 'ready')
})


test('deletion blocks running or paused focus and removes only that task’s history', async () => {
  mockWorkspace.reset()
  const task = await mockWorkspace.createTask({ title: 'Discard this task' })
  const session = await mockWorkspace.createSession(task.id, 1500)
  await assert.rejects(mockWorkspace.deleteTask(task.id), /Stop the timer/)
  await mockWorkspace.transitionSession(session.id, 'pause')
  await assert.rejects(mockWorkspace.deleteTask(task.id), /Stop the timer/)
  await mockWorkspace.transitionSession(session.id, 'end')
  const before = await mockWorkspace.exportWorkspace()
  await mockWorkspace.deleteTask(task.id)
  const after = await mockWorkspace.exportWorkspace()
  assert.equal(after.tasks.length, before.tasks.length - 1)
  assert.ok(!after.tasks.some((item) => item.id === task.id))
  assert.ok(!after.sessions.some((item) => item.taskId === task.id))
})
