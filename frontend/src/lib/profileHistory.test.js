import assert from 'node:assert/strict'
import test from 'node:test'
import process from 'node:process'
import { featuredWork, profileHistory } from './profileHistory.js'
const now = new Date(2026, 9, 15, 12)
const at = day => new Date(2026, 9, day, 10).toISOString()
const task = { id: 'task', title: 'Keyboard editor', project: 'web', status: 'ready', notes: [{ text: 'private note' }], nextStep: 'private next step', referenceUrl: 'https://github.com/demo/web/issues/1' }
const event = (id, kind, day, seconds = 0) => ({ id, kind, createdAt: at(day), seconds, task })
test('historical completions and actual duration agree with Activity; notes and zero timers do not extend streaks', () => {
  const result = profileHistory([event('done', 'completion', 14), event('done-again', 'completion', 14), event('focus', 'focus', 13, 1200), event('note', 'note', 15), event('zero', 'focus', 15), event('future', 'focus', 16, 1000)], 28, now)
  assert.equal(result.summary.completed, 1)
  assert.equal(result.summary.seconds, 1200)
  assert.equal(result.activeDays, 2)
  assert.equal(result.streak, 2)
  assert.equal(result.days.find(day => day.key === '2026-10-14').summary.completed, 1)
  assert.equal(result.days.find(day => day.key === '2026-10-15').level, 0)
})
test('streak uses all available history and resets after a gap', () => {
  const events = Array.from({ length: 40 }, (_, index) => {
    const date = new Date(now); date.setDate(date.getDate() - index)
    return { id: `${index}`, kind: 'focus', seconds: 60, createdAt: date.toISOString(), task: null }
  })
  assert.equal(profileHistory(events, 28, now).streak, 40)
  assert.equal(profileHistory(events, 28, now).summary.sessions, 28)
  assert.equal(profileHistory(events.slice(2), 84, now).streak, 0)
})
test('calendar follows local boundaries and chosen week start across daylight saving', () => {
  const previous = process.env.TZ
  process.env.TZ = 'America/New_York'
  try {
    const localNow = new Date(2026, 10, 2, 12)
    const events = [{ id: 'overnight', kind: 'focus', seconds: 120, task: null, createdAt: new Date(2026, 10, 2, 0, 5).toISOString() }]
    const monday = profileHistory(events, 28, localNow), sunday = profileHistory(events, 84, localNow, 'sunday')
    assert.equal(monday.endKey, '2026-11-02')
    assert.equal(monday.startKey, '2026-10-06')
    assert.equal(new Date(`${monday.days[0].key}T12:00:00`).getDay(), 1)
    assert.equal(new Date(`${sunday.days[0].key}T12:00:00`).getDay(), 0)
    assert.equal(monday.days.filter(day => !day.outside).length, 28)
    assert.equal(sunday.days.filter(day => !day.outside).length, 84)
    assert.equal(new Set(sunday.days.map(day => day.key)).size, sunday.days.length)
    assert.equal(monday.days.find(day => day.key === '2026-11-02').summary.seconds, 120)
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous }
})
test('featured projection has no private fields and references require explicit opt-in', () => {
  const completed = { ...task, status: 'done' }
  const profile = { featuredIds: ['missing', 'task', 'task'], featuredDescriptions: { task: 'Public caption' } }
  const [publicWork] = featuredWork([completed], profile)
  assert.deepEqual(Object.keys(publicWork).sort(), ['description', 'id', 'project', 'referenceUrl', 'title'])
  assert.equal(publicWork.referenceUrl, '')
  assert.equal(publicWork.description, 'Public caption')
  assert.equal(featuredWork([task], profile).length, 0)
  assert.equal(featuredWork([completed], { ...profile, featuredReferences: { task: true } })[0].referenceUrl, completed.referenceUrl)
  assert.equal(featuredWork([{ ...completed, referenceUrl: 'javascript:alert(1)' }], { ...profile, featuredReferences: { task: true } })[0].referenceUrl, '')
  assert.equal(featuredWork(Array.from({ length: 4 }, (_, id) => ({ ...completed, id })), { featuredIds: [0, 1, 2, 3] }).length, 3)
})
