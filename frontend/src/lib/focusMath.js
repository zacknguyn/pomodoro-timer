const MIN_DURATION_MINUTES = 1
const MAX_DURATION_MINUTES = 180

export function clampDurationMinutes(value) {
  const minutes = Number(value)
  if (!Number.isFinite(minutes)) return 25
  return Math.min(MAX_DURATION_MINUTES, Math.max(MIN_DURATION_MINUTES, Math.round(minutes)))
}

export function createRunningSession({ objective, reference = '', durationMinutes }, now = Date.now()) {
  const durationMs = clampDurationMinutes(durationMinutes) * 60_000

  return {
    id: `focus-${now}`,
    objective: objective.trim(),
    reference: reference.trim(),
    durationMs,
    startedAt: now,
    endAt: now + durationMs,
    remainingMs: durationMs,
    status: 'running',
  }
}

export function getRemainingMs(session, now = Date.now()) {
  if (!session) return 0
  if (session.status === 'paused') return Math.max(0, session.remainingMs)
  return Math.max(0, session.endAt - now)
}

export function pauseSession(session, now = Date.now()) {
  return { ...session, status: 'paused', remainingMs: getRemainingMs(session, now), endAt: null }
}

export function resumeSession(session, now = Date.now()) {
  const remainingMs = getRemainingMs(session, now)
  return { ...session, status: 'running', remainingMs, endAt: now + remainingMs }
}

export function getElapsedMs(session, now = Date.now()) {
  return Math.min(session.durationMs, Math.max(0, session.durationMs - getRemainingMs(session, now)))
}

export function formatClock(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

