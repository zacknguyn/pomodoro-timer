import assert from 'node:assert/strict'
import test from 'node:test'
import { buildActivityEvents } from './activity.js'
import { dashboardHistory } from './dashboard.js'

const now = new Date(2026, 9, 15, 18)
const stamp = (day, hour = 10) => new Date(2026, 9, day, hour).toISOString()
const task = (id, project = '', status = 'progress', notes = []) => ({ id, project, status, notes })
const focus = (id, taskId, day, seconds, status = 'ended') => ({ id, taskId, endedAt: stamp(day), status, durationActualSeconds: seconds })
test('dashboard reconciles focus and distinct completion totals across buckets and projects', () => {
  const tasks = [task('a', 'api', 'progress', [{ id: 'done1', kind: 'completion', createdAt: stamp(10) }, { id: 'done2', kind: 'change', text: 'Moved from progress to done.', createdAt: stamp(15) }]), task('b', '', 'done')]
  const sessions = [focus('one', 'a', 10, 125), focus('two', 'b', 15, 1800), focus('active', 'a', 15, 9999, 'active'), focus('future', 'a', 16, 9999), focus('one', 'a', 10, 125)]
  const history = dashboardHistory(tasks, buildActivityEvents(tasks, sessions), 7, now)
  assert.equal(history.summary.seconds, 1925)
  assert.equal(history.summary.completed, 1)
  assert.equal(history.statuses.find(row => row.status === 'progress').count, 1)
  assert.equal(history.buckets.reduce((total, row) => total + row.completed, 0), 1)
  assert.equal(history.buckets.reduce((total, row) => total + row.seconds, 0), 1925)
  assert.equal(history.series.reduce((total, row) => total + row.seconds, 0), 1925)
  assert.equal(history.series.find(row => row.name === 'No project').seconds, 1800)
})
test('many projects stay bounded and all recorded seconds remain represented', () => {
  const tasks = Array.from({ length: 8 }, (_, i) => task(String(i), i ? `repo${i}` : ''))
  const events = buildActivityEvents(tasks, tasks.map((row, i) => focus(row.id, row.id, 15, (i + 1) * 30)))
  const history = dashboardHistory(tasks, events, 7, now)
  assert.equal(history.projects.length, 8)
  assert.equal(history.series.length, 3)
  assert.equal(history.series.at(-1).name, 'Other work')
  assert.equal(history.series.at(-1).members.length, 6)
  assert.equal(history.series.reduce((total, row) => total + row.seconds, 0), history.summary.seconds)
  for (const bucket of history.buckets) assert.equal(history.series.reduce((total, row) => total + bucket[row.key], 0), bucket.minutes)
})
test('local calendar ranges, previous periods and all-history streak stay independent', () => {
  const tasks = [task('a')], sessions = [focus('a', 'a', 8, 100), focus('b', 'a', 14, 100), focus('c', 'a', 15, 100)]
  const events = buildActivityEvents(tasks, sessions)
  const week = dashboardHistory(tasks, events, 7, now), month = dashboardHistory(tasks, events, 30, now, 'sunday')
  assert.equal(week.summary.seconds, 200)
  assert.equal(week.previous.seconds, 100)
  assert.equal(week.streak, 2)
  assert.equal(month.streak, week.streak)
  assert.equal(month.summary.seconds, 300)
  assert.equal(week.calendar.filter(day => day.selected).length, 7)
  assert.equal(month.calendar.filter(day => day.selected).length, 30)
  assert.equal(new Date(`${month.calendar[0].key}T12:00:00`).getDay(), 0)
  const empty = dashboardHistory([], [], 90, now)
  assert.equal(empty.summary.seconds, 0)
  assert.equal(empty.series.length, 0)
  assert.equal(empty.streak, 0)
  assert.equal(empty.buckets.length, 13)
})

test('weekly and three-day chart buckets expose their exact local date boundaries', () => {
  for (const period of [7, 30, 90]) {
    const history = dashboardHistory([], [], period, now)
    assert.equal(history.buckets[0].fromDate, history.calendar.find(day => day.selected).key)
    assert.equal(history.buckets.at(-1).toDate, '2026-10-15')
    for (let index = 1; index < history.buckets.length; index++) {
      const previousEnd = new Date(`${history.buckets[index - 1].toDate}T12:00:00`)
      previousEnd.setDate(previousEnd.getDate() + 1)
      assert.equal(previousEnd.getDate(), new Date(`${history.buckets[index].fromDate}T12:00:00`).getDate())
    }
  }
})
