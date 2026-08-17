import test from 'node:test'
import assert from 'node:assert/strict'
import { formatSessionClock, getSessionProgress, getSessionRemainingSeconds } from './sessionClock.js'

const activeSession = {
  status: 'active',
  deadlineAt: '2026-08-17T10:25:00.000Z',
  durationPlannedSeconds: 1500,
  remainingSeconds: 1500,
}

test('active countdown is derived from the server deadline', () => {
  assert.equal(getSessionRemainingSeconds(activeSession, Date.parse('2026-08-17T10:01:00.000Z')), 1440)
})

test('refreshing later derives the new remaining time from the same session', () => {
  assert.equal(getSessionRemainingSeconds(activeSession, Date.parse('2026-08-17T10:12:30.000Z')), 750)
})

test('paused sessions preserve the server remaining value as wall time passes', () => {
  const paused = { ...activeSession, status: 'paused', deadlineAt: null, remainingSeconds: 713 }
  assert.equal(getSessionRemainingSeconds(paused, Date.parse('2030-01-01T00:00:00.000Z')), 713)
})

test('expired and ended sessions display zero', () => {
  assert.equal(getSessionRemainingSeconds(activeSession, Date.parse('2026-08-17T10:25:00.000Z')), 0)
  assert.equal(getSessionRemainingSeconds({ ...activeSession, status: 'ended' }), 0)
})

test('clock and progress stay within their display bounds', () => {
  assert.equal(formatSessionClock(1500), '25:00')
  assert.equal(formatSessionClock(59.1), '01:00')
  assert.equal(formatSessionClock(0), '00:00')
  assert.equal(getSessionProgress(activeSession, 750), 0.5)
  assert.equal(getSessionProgress(activeSession, -10), 1)
})
