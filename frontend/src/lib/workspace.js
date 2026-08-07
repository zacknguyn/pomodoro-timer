export const TASK_STATUSES = ['inbox', 'ready', 'focus', 'done']

export const EMPTY_CANVAS = {
  pins: [],
  notes: [],
  strokes: [],
}

function normalizeTask(task, fallbackStatus = 'ready') {
  return {
    ...task,
    id: task.id || `task-${Date.now()}`,
    objective: task.objective || task.title || 'Untitled outcome',
    durationMinutes: Number(task.durationMinutes) || 25,
    status: TASK_STATUSES.includes(task.status) ? task.status : fallbackStatus,
  }
}

export function migrateStore(raw = {}) {
  const history = Array.isArray(raw.history) ? raw.history : []
  const legacyQueue = Array.isArray(raw.queue) ? raw.queue : []
  let tasks = Array.isArray(raw.tasks)
    ? raw.tasks.map((task) => normalizeTask(task))
    : legacyQueue.map((task) => normalizeTask(task, 'ready'))
  let active = raw.active || null

  if (active && !active.taskId) {
    const taskId = `task-${active.id || Date.now()}`
    active = { ...active, taskId }
    tasks = [normalizeTask({ ...active, id: taskId, status: 'focus' }, 'focus'), ...tasks]
  }

  if (active?.taskId) {
    tasks = tasks.map((task) => task.id === active.taskId ? { ...task, status: 'focus' } : task)
    if (!tasks.some((task) => task.id === active.taskId)) {
      tasks.unshift(normalizeTask({ ...active, id: active.taskId, status: 'focus' }, 'focus'))
    }
  }

  const canvas = raw.canvas && typeof raw.canvas === 'object'
    ? {
        pins: Array.isArray(raw.canvas.pins) ? raw.canvas.pins : [],
        notes: Array.isArray(raw.canvas.notes) ? raw.canvas.notes : [],
        strokes: Array.isArray(raw.canvas.strokes) ? raw.canvas.strokes : [],
      }
    : EMPTY_CANVAS

  return {
    active,
    completed: raw.completed || null,
    history,
    tasks,
    canvas,
  }
}

export function createTask(details, status = 'inbox', id = `task-${Date.now()}`) {
  return normalizeTask({ ...details, id, status }, status)
}

export function moveTask(tasks, taskId, status) {
  if (!TASK_STATUSES.includes(status)) return tasks
  return tasks.map((task) => task.id === taskId ? { ...task, status } : task)
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
