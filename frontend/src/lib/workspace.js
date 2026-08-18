import { createRunningSession, getElapsedMs } from './focusMath.js'

export const TASK_STAGES = ['inbox', 'ready', 'done']

export const EMPTY_CANVAS = {
  pins: [],
  notes: [],
  strokes: [],
}

function normalizeTask(task, fallbackStage = 'ready', fallbackRank = 0) {
  const legacyStage = task.stage || task.status
  const stage = legacyStage === 'focus'
    ? 'ready'
    : TASK_STAGES.includes(legacyStage) ? legacyStage : fallbackStage
  const createdAt = Number(task.createdAt) || Date.now()

  return {
    id: task.id || `task-${createdAt}-${fallbackRank}`,
    objective: task.objective || task.title || 'Untitled outcome',
    reference: task.reference || '',
    durationMinutes: Number(task.durationMinutes) || 25,
    stage,
    rank: Number.isFinite(Number(task.rank)) ? Number(task.rank) : fallbackRank,
    createdAt,
    updatedAt: Number(task.updatedAt) || createdAt,
  }
}

function normalizeRecord(item, index) {
  const endedAt = Number(item.endedAt) || Date.now()
  return {
    id: item.id || `record-${endedAt}-${index}`,
    sessionId: item.sessionId || item.id || `legacy-session-${endedAt}-${index}`,
    taskId: item.taskId || null,
    taskTitleSnapshot: item.taskTitleSnapshot || item.objective || 'Untitled outcome',
    disposition: item.disposition === 'continue' ? 'continue' : 'complete',
    evidenceType: item.evidenceType || 'note',
    evidence: item.evidence || 'Completed before the workspace upgrade.',
    nextStep: item.nextStep || item.note || '',
    startedAt: Number(item.startedAt) || Math.max(0, endedAt - (Number(item.elapsedMs) || 0)),
    endedAt,
    elapsedMs: Math.max(0, Number(item.elapsedMs) || 0),
  }
}

function normalizeSession(session, forceCheckpoint = false) {
  if (!session) return null
  const status = forceCheckpoint || session.status === 'awaiting-checkpoint'
    ? 'awaiting-checkpoint'
    : session.status === 'paused' ? 'paused' : 'running'

  return {
    ...session,
    taskId: session.taskId || null,
    objective: session.objective || 'Untitled outcome',
    reference: session.reference || '',
    durationMs: Math.max(60_000, Number(session.durationMs) || (Number(session.durationMinutes) || 25) * 60_000),
    startedAt: Number(session.startedAt) || Date.now(),
    remainingMs: Math.max(0, Number(session.remainingMs) || 0),
    status,
    elapsedMs: status === 'awaiting-checkpoint'
      ? Math.max(0, Number(session.elapsedMs) || Number(session.durationMs) || 0)
      : undefined,
  }
}

export function migrateStore(raw = {}) {
  const recordsSource = Array.isArray(raw.records) ? raw.records : Array.isArray(raw.history) ? raw.history : []
  const legacyQueue = Array.isArray(raw.queue) ? raw.queue : []
  const taskSource = Array.isArray(raw.tasks) ? raw.tasks : legacyQueue
  let tasks = taskSource.map((task, index) => normalizeTask(task, Array.isArray(raw.tasks) ? 'ready' : 'ready', index))
  let currentSession = normalizeSession(raw.currentSession || raw.session || raw.completed || raw.active, Boolean(raw.completed))

  if (currentSession && !currentSession.taskId) {
    const taskId = `task-${currentSession.id || Date.now()}`
    currentSession = { ...currentSession, taskId }
    tasks = [normalizeTask({ ...currentSession, id: taskId, stage: 'ready' }, 'ready', -1), ...tasks]
  }

  if (currentSession?.taskId && !tasks.some((task) => task.id === currentSession.taskId)) {
    tasks.unshift(normalizeTask({ ...currentSession, id: currentSession.taskId, stage: 'ready' }, 'ready', -1))
  }

  const canvas = raw.canvas && typeof raw.canvas === 'object'
    ? {
        pins: Array.isArray(raw.canvas.pins) ? raw.canvas.pins : [],
        notes: Array.isArray(raw.canvas.notes) ? raw.canvas.notes : [],
        strokes: Array.isArray(raw.canvas.strokes) ? raw.canvas.strokes : [],
      }
    : { ...EMPTY_CANVAS }

  return {
    version: 2,
    tasks,
    currentSession,
    records: recordsSource.map(normalizeRecord),
    canvas,
  }
}

export function createTask(details, stage = 'inbox', id = `task-${Date.now()}`, rank = Date.now()) {
  return normalizeTask({ ...details, id, stage, rank }, stage, rank)
}

export function moveTask(tasks, taskId, stage, now = Date.now()) {
  if (!TASK_STAGES.includes(stage)) return tasks
  const nextRank = tasks
    .filter((task) => task.stage === stage && task.id !== taskId)
    .reduce((maximum, task) => Math.max(maximum, Number(task.rank) || 0), -1) + 1
  return tasks.map((task) => task.id === taskId ? { ...task, stage, rank: nextRank, updatedAt: now } : task)
}

export function reorderReadyTask(tasks, taskId, direction, now = Date.now()) {
  const ready = tasks.filter((task) => task.stage === 'ready').sort((a, b) => a.rank - b.rank)
  const index = ready.findIndex((task) => task.id === taskId)
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (index < 0 || targetIndex < 0 || targetIndex >= ready.length) return tasks
  const current = ready[index]
  const target = ready[targetIndex]
  return tasks.map((task) => {
    if (task.id === current.id) return { ...task, rank: target.rank, updatedAt: now }
    if (task.id === target.id) return { ...task, rank: current.rank, updatedAt: now }
    return task
  })
}

export function orderedTasks(tasks, stage) {
  return tasks.filter((task) => task.stage === stage).sort((a, b) => a.rank - b.rank || a.createdAt - b.createdAt)
}

export function startTaskSession(store, taskId, now = Date.now()) {
  if (store.currentSession) return store
  const task = store.tasks.find((item) => item.id === taskId)
  if (!task || task.stage === 'done') return store
  return {
    ...store,
    currentSession: { ...createRunningSession(task, now), taskId: task.id },
  }
}

export function requestCheckpoint(store, now = Date.now()) {
  if (!store.currentSession || store.currentSession.status === 'awaiting-checkpoint') return store
  return {
    ...store,
    currentSession: {
      ...store.currentSession,
      status: 'awaiting-checkpoint',
      elapsedMs: getElapsedMs(store.currentSession, now),
      endedAt: now,
      endAt: null,
    },
  }
}

export function saveCheckpoint(store, checkpoint, now = Date.now()) {
  const session = store.currentSession
  if (!session || session.status !== 'awaiting-checkpoint') return store
  const disposition = checkpoint.disposition === 'complete' ? 'complete' : 'continue'
  if (!checkpoint.evidence?.trim()) return store
  if (disposition === 'continue' && !checkpoint.nextStep?.trim()) return store
  const task = store.tasks.find((item) => item.id === session.taskId)
  const record = {
    id: `record-${now}`,
    sessionId: session.id,
    taskId: session.taskId,
    taskTitleSnapshot: task?.objective || session.objective,
    disposition,
    evidenceType: checkpoint.evidenceType || 'note',
    evidence: checkpoint.evidence.trim(),
    nextStep: checkpoint.nextStep?.trim() || '',
    startedAt: session.startedAt,
    endedAt: Number(session.endedAt) || now,
    elapsedMs: Math.max(0, Number(session.elapsedMs) || 0),
  }

  return {
    ...store,
    currentSession: null,
    tasks: moveTask(store.tasks, session.taskId, disposition === 'complete' ? 'done' : 'ready', now),
    records: [record, ...store.records],
  }
}

export function discardCheckpoint(store) {
  if (!store.currentSession || store.currentSession.status !== 'awaiting-checkpoint') return store
  return { ...store, currentSession: null }
}

export function safeExternalUrl(value) {
  if (!value) return ''
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}
