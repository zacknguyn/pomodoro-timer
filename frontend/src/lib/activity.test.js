import assert from 'node:assert/strict'
import test from 'node:test'
import process from 'node:process'
import { activityDayKey, activityDuration, activitySummary, buildActivityEvents, filterActivity } from './activity.js'

const now = new Date(2026, 9, 15, 12)
const stamp = (day, hour = 10) => new Date(2026, 9, day, hour).toISOString()
const task = { id: 'task', title: 'Retry callback', project: 'api', status: 'ready', createdAt: stamp(8), notes: [
  { id: 'done', kind: 'change', text: 'Moved from progress to done.', createdAt: stamp(15, 9) },
  { id: 'reopen', kind: 'change', text: 'Moved from done to ready.', createdAt: stamp(15, 10) },
  { id: 'note', kind: 'note', text: 'Expired code covered', createdAt: stamp(14) },
  { id: 'note', kind: 'note', text: 'Expired code covered', createdAt: stamp(14) },
  { id: 'invalid', text: 'Ignored invalid date', createdAt: 'invalid' },
] }
const session = { id: 'session', taskId: task.id, status: 'ended', startedAt: stamp(15, 9), endedAt: stamp(15, 10), durationActualSeconds: 1200, durationPlannedSeconds: 3600 }

test('history preserves recorded completion after reopening and deduplicates notes/sessions', () => {
  const events = buildActivityEvents([task], [session, session, { ...session, id: 'active', status: 'active' }, { ...session, id: 'paused', status: 'paused' }])
  assert.equal(events.length, 5)
  assert.equal(events.find(event => event.noteId === 'done').kind, 'completion')
  assert.equal(events.find(event => event.noteId === 'done').text, 'Moved from In progress to Done.')
  assert.equal(events.find(event => event.noteId === 'reopen').kind, 'change')
  assert.equal(activitySummary(filterActivity(events, {}, now)).seconds, 1200)
  assert.equal(activitySummary(filterActivity(events, {}, now)).completed, 1)
})
test('record search and intersecting filters do not return sibling task history', () => {
  const events = buildActivityEvents([task], [session])
  assert.deepEqual(filterActivity(events, { query: 'expired', period: 'week' }, now).map(event => event.noteId), ['note'])
  assert.equal(filterActivity(events, { project: 'api', kind: 'focus' }, now).length, 1)
  assert.equal(filterActivity(events, { project: 'other', kind: 'focus' }, now).length, 0)
})
test('unlinked sessions stay readable and unsafe durations never pollute totals', () => {
  const events = buildActivityEvents([], [session, { ...session, id: 'negative', durationActualSeconds: -10 }, { ...session, id: 'invalid', durationActualSeconds: 'invalid' }, { ...session, id: 'bad-date', endedAt: 'invalid' }])
  assert.equal(events.length, 3)
  assert(events.every(event => event.task === null))
  assert.equal(filterActivity(events, { project: '__no_project__' }, now).length, 3)
  assert.deepEqual(activitySummary(events), { seconds: 1200, sessions: 3, completed: 0 })
  assert.equal(activityDuration(0), '0 min')
  assert.equal(activityDuration(30), 'Under 1 min')
})
test('local calendar ranges include midnight, exclude future and seven-day-old records', () => {
  const oldTimezone = process.env.TZ
  process.env.TZ = 'America/New_York'
  try {
    const noon = new Date(2026, 10, 2, 12) // Crosses the daylight-saving transition in the week range.
    const events = [new Date(2026, 10, 2), new Date(2026, 9, 27), new Date(2026, 9, 26, 23, 59), new Date(2026, 10, 2, 13)].map((date, i) => ({ id: i, createdAt: date.toISOString(), kind: 'note', text: '' }))
    assert.equal(activityDayKey(events[0].createdAt), '2026-11-02')
    assert.deepEqual(filterActivity(events, {}, noon).map(event => event.id), [0])
    assert.deepEqual(filterActivity(events, { period: 'week' }, noon).map(event => event.id), [0, 1])
    assert.deepEqual(filterActivity(events, { period: 'all' }, noon).map(event => event.id), [0, 1, 2])
  } finally { if (oldTimezone === undefined) delete process.env.TZ; else process.env.TZ = oldTimezone }
})

test('dashboard date ranges include complete local days across daylight saving', () => {
  const oldTimezone = process.env.TZ
  process.env.TZ = 'America/New_York'
  try {
    const dates = ['2026-10-31T23:59:59-04:00', '2026-11-01T00:00:00-04:00', '2026-11-01T01:30:00-04:00', '2026-11-01T01:30:00-05:00', '2026-11-01T23:59:59-05:00', '2026-11-02T00:00:00-05:00']
    const events = dates.map((createdAt, id) => ({ id, createdAt, kind: 'focus', task: { project: 'api' }, text: '' }))
    const filters = { period: 'custom', fromDate: '2026-11-01', toDate: '2026-11-01' }
    const now = new Date('2026-11-03T12:00:00-05:00')
    assert.deepEqual(filterActivity(events, filters, now).map(event => event.id), [1, 2, 3, 4])
    assert.equal(filterActivity(events, { ...filters, fromDate: '2026-11-02' }, now).length, 0)
    assert.equal(filterActivity(events, { ...filters, toDate: '2026-02-30' }, now).length, 0)
    assert.equal(filterActivity(events, { period: 'custom' }, now).length, 0)
  } finally { if (oldTimezone === undefined) delete process.env.TZ; else process.env.TZ = oldTimezone }
})
test('grouped dashboard projects preserve unassigned work and intersect type/date/search', () => {
  const events = [
    { id: 'api', task: { project: 'api' }, kind: 'focus', text: 'callback', createdAt: stamp(14) },
    { id: 'unassigned', task: null, kind: 'focus', text: 'callback', createdAt: stamp(14) },
    { id: 'other', task: { project: 'web' }, kind: 'focus', text: 'callback', createdAt: stamp(14) },
    { id: 'note', task: { project: 'api' }, kind: 'note', text: 'callback', createdAt: stamp(14) },
  ]
  const filters = { period: 'custom', fromDate: '2026-10-14', toDate: '2026-10-14', projectNames: ['api', ''], kind: 'focus', query: 'callback' }
  assert.deepEqual(filterActivity(events, filters, now).map(event => event.id), ['api', 'unassigned'])
  assert.deepEqual(filterActivity(events, { ...filters, projectNames: undefined, project: 'web' }, now).map(event => event.id), ['other'])
})

test('focus history links each session to its task and preserves unlinked records', () => {
  const tasks = Array.from({ length: 200 }, (_, index) => ({ ...task, id: `task-${index}`, notes: [] }))
  const sessions = [0, 199, 'missing'].map(index => ({ ...session, id: `session-${index}`, taskId: `task-${index}` }))
  const events = buildActivityEvents([...tasks, { ...tasks[0], title: 'Duplicate must not replace the original' }], sessions)
  const focus = events.filter(event => event.kind === 'focus')
  assert.deepEqual(focus.map(event => event.task?.id || null), ['task-0', 'task-199', null])
  assert.equal(focus[0].task, tasks[0])
  assert.equal(activitySummary(focus).seconds, 3600)
})
