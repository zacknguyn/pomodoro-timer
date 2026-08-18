import assert from 'node:assert/strict'
import test from 'node:test'
import {
  filterReviewEntries,
  formatReviewDuration,
  getReviewEntryState,
  groupReviewEntries,
  groupReviewEntriesByTask,
} from './review.js'

const entries = [
  { id: '1', outcome: 'continue', createdAt: '2026-08-18T12:00:00.000Z', task: { id: 'retry', title: 'Retry path', status: 'ready' }, session: { durationActualSeconds: 1080 }, whatChanged: 'Traced callback', nextStep: 'Write the test' },
  { id: '2', outcome: 'complete', createdAt: '2026-08-17T12:00:00.000Z', task: { id: 'docs', title: 'Recovery docs', status: 'done' }, session: { durationActualSeconds: 60 }, whatChanged: 'Published docs', nextStep: null },
  { id: '3', outcome: 'continue', createdAt: '2026-08-16T12:00:00.000Z', task: { id: 'retry', title: 'Retry path', status: 'ready' }, session: { durationActualSeconds: 120 }, whatChanged: '', nextStep: 'Trace callback' },
]

test('review search covers task, changed evidence, and saved next step', () => {
  assert.deepEqual(filterReviewEntries(entries, { query: 'callback' }).map((entry) => entry.id), ['1', '3'])
  assert.deepEqual(filterReviewEntries(entries, { query: 'write the test' }).map((entry) => entry.id), ['1'])
})

test('only the latest unresolved continuation is an open handoff', () => {
  assert.equal(getReviewEntryState(entries[0], entries), 'open')
  assert.equal(getReviewEntryState(entries[2], entries), 'continued')
  assert.deepEqual(filterReviewEntries(entries, { state: 'open' }).map((entry) => entry.id), ['1'])
})

test('review supports task, date, evidence, and sort filters', () => {
  const now = new Date('2026-08-18T14:00:00.000Z')
  assert.deepEqual(filterReviewEntries(entries, { taskId: 'docs' }, now).map((entry) => entry.id), ['2'])
  assert.deepEqual(filterReviewEntries(entries, { date: 'today' }, now).map((entry) => entry.id), ['1'])
  assert.deepEqual(filterReviewEntries(entries, { evidence: 'changed' }, now).map((entry) => entry.id), ['1', '2'])
  assert.deepEqual(filterReviewEntries(entries, { sort: 'oldest' }, now).map((entry) => entry.id), ['3', '2', '1'])
})

test('review entries can group by date or task story', () => {
  assert.equal(groupReviewEntries(entries).length, 3)
  const taskGroups = groupReviewEntriesByTask(entries)
  assert.equal(taskGroups.length, 2)
  assert.equal(taskGroups[0].entries.length, 2)
  assert.equal(taskGroups[0].totalSeconds, 1200)
})

test('review duration stays factual and readable', () => {
  assert.equal(formatReviewDuration(42), 'Under 1 min')
  assert.equal(formatReviewDuration(1080), '18 min')
})
