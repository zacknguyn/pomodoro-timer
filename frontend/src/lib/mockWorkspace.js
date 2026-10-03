// Phase 1 UI-only mock. No backend, no auth.
// Keeps existing task/session/checkpoint records; approved UI-only fields add projects,
// next steps, notes/change history and archived sessions. No backend schema changes.
// To remove in Phase 2: delete this file and restore workApi.js network calls.

const STORAGE_KEY = 'pomogit.mock.v1'

function isoMinutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

function seed() {
  const tasks = [
    { id: 'mock-ready-1', title: 'Fix the OAuth retry', status: 'ready', order: 0, referenceUrl: 'https://example.com/pull/42', createdAt: isoMinutesAgo(60 * 26) },
    { id: 'mock-ready-2', title: 'Ship the checkpoint copy pass', status: 'ready', order: 1, referenceUrl: '', createdAt: isoMinutesAgo(60 * 20) },
    { id: 'mock-ready-3', title: 'Tighten Review filters', status: 'ready', order: 2, referenceUrl: '', createdAt: isoMinutesAgo(60 * 9) },
    { id: 'mock-ready-4', title: 'Verify skeletons at 360px', status: 'ready', order: 3, referenceUrl: '', createdAt: isoMinutesAgo(60 * 5) },
    { id: 'mock-inbox-1', title: 'Explore mobile nav labels', status: 'inbox', order: 0, referenceUrl: '', createdAt: isoMinutesAgo(60 * 4) },
    { id: 'mock-inbox-2', title: 'Capture git evidence automatically', status: 'inbox', order: 0, referenceUrl: '', createdAt: isoMinutesAgo(90) },
    { id: 'mock-inbox-3', title: 'Queue offline export idea', status: 'inbox', order: 0, referenceUrl: '', createdAt: isoMinutesAgo(30) },
    { id: 'mock-done-1', title: 'Land the workspace rebrand', status: 'done', order: 0, referenceUrl: '', createdAt: isoMinutesAgo(60 * 30) },
    { id: 'mock-done-2', title: 'Secure workspace sessions', status: 'done', order: 0, referenceUrl: '', createdAt: isoMinutesAgo(60 * 50) },
  ]

  const checkpoints = [
    {
      id: 'mock-cp-1', taskId: 'mock-ready-1', sessionId: 'mock-session-0',
      whatChanged: 'Covered the expired callback branch.', nextStep: 'Open the pull request.',
      outcome: 'continue', createdAt: isoMinutesAgo(120),
    },
    {
      id: 'mock-cp-2', taskId: 'mock-ready-2', sessionId: 'mock-session-00',
      whatChanged: 'Split Work preview from Tasks management.', nextStep: 'Verify skeleton at 360px.',
      outcome: 'continue', createdAt: isoMinutesAgo(45),
    },
    {
      id: 'mock-cp-3', taskId: 'mock-done-1', sessionId: 'mock-session-done-1',
      whatChanged: 'Shipped calm editorial workspace with Dither surfaces.', nextStep: '',
      outcome: 'complete', createdAt: isoMinutesAgo(60 * 28),
    },
    {
      id: 'mock-cp-4', taskId: 'mock-done-2', sessionId: 'mock-session-done-2',
      whatChanged: 'Moved to opaque server sessions with HttpOnly cookies.', nextStep: '',
      outcome: 'complete', createdAt: isoMinutesAgo(60 * 48),
    },
  ]

  tasks.forEach((task, index) => {
    task.project = index === 0 ? 'checkout-api' : index < 5 ? 'web-client' : ''
    task.nextStep = checkpoints.find((entry) => entry.taskId === task.id)?.nextStep || ''
    task.notes = []
  })
  return { tasks, checkpoints, sessions: [], session: null, seq: 100 }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.tasks)) return parsed
    }
  } catch { /* seed below */ }
  const fresh = seed()
  persist(fresh)
  return fresh
}

function persist(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* ignore */ }
}

let state = load()

function delay(value) {
  return new Promise((resolve) => { window.setTimeout(() => resolve(value), 120) })
}

function nextId(prefix) {
  state.seq += 1
  return `${prefix}-${state.seq}`
}

function taskById(id) {
  return state.tasks.find((task) => task.id === id)
}

function toReviewEntry(checkpoint) {
  const task = taskById(checkpoint.taskId) || { id: checkpoint.taskId, title: 'Unknown task', status: 'ready', referenceUrl: '' }
  return {
    id: checkpoint.id,
    outcome: checkpoint.outcome,
    whatChanged: checkpoint.whatChanged,
    nextStep: checkpoint.nextStep,
    createdAt: checkpoint.createdAt,
    task: { id: task.id, title: task.title, status: task.status, referenceUrl: task.referenceUrl || '' },
    session: {
      id: checkpoint.sessionId,
      startedAt: checkpoint.createdAt,
      endedAt: checkpoint.createdAt,
      durationActualSeconds: 1500,
    },
  }
}

export const mockWorkspace = {
  reset() {
    state = seed()
    persist(state)
  },

  async listTasks() {
    return delay([...state.tasks])
  },

  async createTask({ title, status = 'inbox', order = 0, referenceUrl = '', project = '', nextStep = '' }) {
    const task = { id: nextId('mock-task'), title: String(title).trim(), status, order, referenceUrl, project, nextStep, notes: [], createdAt: new Date().toISOString() }
    state.tasks.push(task)
    persist(state)
    return delay({ ...task })
  },

  async updateTask(taskId, changes) {
    const task = taskById(taskId)
    if (!task) throw new Error('Task not found')
    if (changes.status && changes.status !== task.status && state.session?.taskId === taskId) throw new Error('Stop the timer before changing this task’s status.')
    const previousStatus = task.status
    Object.assign(task, changes)
    if (changes.status && changes.status !== previousStatus) {
      const event = { id: nextId('mock-change'), text: `Moved from ${previousStatus} to ${changes.status}.`, createdAt: new Date().toISOString(), kind: 'change' }
      task.notes = [...(task.notes || []), event]
    }
    persist(state)
    return delay({ ...task })
  },

  async deleteTask(taskId) {
    state.tasks = state.tasks.filter((task) => task.id !== taskId)
    state.checkpoints = state.checkpoints.filter((checkpoint) => checkpoint.taskId !== taskId)
    if (state.session?.taskId === taskId) state.session = null
    persist(state)
    return delay(null)
  },

  async getActiveSession() {
    return delay(state.session ? { ...state.session } : null)
  },

  async createSession(taskId, durationPlannedSeconds = 1500) {
    if (state.session) throw new Error('A focus session is already active or paused')
    const task = taskById(taskId)
    if (!task || task.status === 'done') throw new Error('Choose an unfinished task before starting focus.')
    const now = Date.now()
    task.status = 'progress'
    task.notes = [...(task.notes || []), { id: nextId('mock-change'), text: 'Focus started · moved to In progress.', createdAt: new Date(now).toISOString(), kind: 'change' }]
    state.session = {
      id: nextId('mock-session'),
      taskId,
      startedAt: new Date(now).toISOString(),
      endedAt: null,
      durationPlannedSeconds,
      durationActualSeconds: 0,
      status: 'active',
      deadlineAt: new Date(now + durationPlannedSeconds * 1000).toISOString(),
      remainingSeconds: durationPlannedSeconds,
    }
    persist(state)
    return delay({ ...state.session })
  },

  async transitionSession(sessionId, action) {
    const session = state.session
    if (!session || session.id !== sessionId) throw new Error('Focus session not found')
    if (action === 'pause' && session.status === 'active') {
      const remaining = Math.max(0, Math.ceil((new Date(session.deadlineAt).getTime() - Date.now()) / 1000))
      session.status = 'paused'
      session.remainingSeconds = remaining
    } else if (action === 'resume' && session.status === 'paused') {
      session.status = 'active'
      session.deadlineAt = new Date(Date.now() + session.remainingSeconds * 1000).toISOString()
    } else if (action === 'end') {
      const elapsed = session.durationPlannedSeconds - (session.status === 'paused'
        ? session.remainingSeconds
        : Math.max(0, Math.ceil((new Date(session.deadlineAt).getTime() - Date.now()) / 1000)))
      session.status = 'ended'
      session.endedAt = new Date().toISOString()
      session.durationActualSeconds = Math.max(0, elapsed)
      const ended = { ...session }
      state.sessions = [...(state.sessions || []), ended]
      state.session = null
      persist(state)
      return delay(ended)
    } else {
      throw new Error(`Cannot ${action} a ${session.status} session`)
    }
    persist(state)
    return delay({ ...session })
  },

  async getTaskCheckpoints(taskId) {
    return delay(
      state.checkpoints
        .filter((checkpoint) => checkpoint.taskId === taskId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map((checkpoint) => ({ ...checkpoint })),
    )
  },

  async createCheckpoint({ taskId, sessionId, outcome, nextStep = '', whatChanged = '' }) {
    if (outcome === 'continue' && !String(nextStep).trim()) {
      throw new Error('Name the next concrete step before continuing later.')
    }
    const checkpoint = {
      id: nextId('mock-cp'),
      taskId,
      sessionId,
      outcome,
      nextStep: outcome === 'continue' ? String(nextStep).trim() : '',
      whatChanged: String(whatChanged),
      createdAt: new Date().toISOString(),
    }
    state.checkpoints.unshift(checkpoint)
    const task = taskById(taskId)
    if (task) {
      if (outcome === 'complete') {
        task.status = 'done'
      } else {
        state.tasks.filter((item) => item.status === 'ready' && item.id !== taskId)
          .forEach((item) => { item.order += 1 })
        task.status = 'ready'
        task.order = 0
      }
    }
    persist(state)
    return delay({ ...checkpoint })
  },

  async listReviewEntries() {
    return delay(
      [...state.checkpoints]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(toReviewEntry),
    )
  },

  async exportWorkspace() {
    return delay({
      exportedAt: new Date().toISOString(),
      tasks: [...state.tasks],
      checkpoints: [...state.checkpoints],
      sessions: [...(state.sessions || []), ...(state.session ? [{ ...state.session }] : [])],
    })
  },
}
