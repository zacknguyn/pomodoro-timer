import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clampDurationMinutes,
  createRunningSession,
  formatClock,
  getElapsedMs,
  getRemainingMs,
  pauseSession,
  resumeSession,
} from './focusMath.js'

test('duration stays within a useful local session range', () => {
  assert.equal(clampDurationMinutes(0), 1)
  assert.equal(clampDurationMinutes(27.6), 28)
  assert.equal(clampDurationMinutes(999), 180)
})

test('countdown derives from the deadline instead of interval ticks', () => {
  const session = createRunningSession({ objective: 'Ship the timer', durationMinutes: 25 }, 1_000)
  assert.equal(getRemainingMs(session, 61_000), 24 * 60_000)
  assert.equal(getElapsedMs(session, 61_000), 60_000)
})

test('pause and resume preserve the exact remaining time', () => {
  const session = createRunningSession({ objective: 'Ship the timer', durationMinutes: 25 }, 1_000)
  const paused = pauseSession(session, 31_000)
  const resumed = resumeSession(paused, 90_000)
  assert.equal(paused.remainingMs, 24.5 * 60_000)
  assert.equal(resumed.endAt, 90_000 + 24.5 * 60_000)
})

test('clock rounds up so a fresh minute does not display early', () => {
  assert.equal(formatClock(60_000), '01:00')
  assert.equal(formatClock(59_001), '01:00')
  assert.equal(formatClock(0), '00:00')
})

