export function getSessionRemainingSeconds(session, now = Date.now()) {
  if (!session || session.status === 'ended') return 0
  if (session.status === 'paused') return Math.max(0, session.remainingSeconds)

  const deadline = new Date(session.deadlineAt).getTime()
  if (!Number.isFinite(deadline)) return Math.max(0, session.remainingSeconds || 0)
  return Math.max(0, Math.ceil((deadline - now) / 1000))
}

export function formatSessionClock(totalSeconds) {
  const safeSeconds = Math.max(0, Math.ceil(totalSeconds))
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function getSessionProgress(session, remainingSeconds) {
  if (!session?.durationPlannedSeconds) return 0
  const elapsed = session.durationPlannedSeconds - remainingSeconds
  return Math.min(1, Math.max(0, elapsed / session.durationPlannedSeconds))
}
