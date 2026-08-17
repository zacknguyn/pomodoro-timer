export function validateCheckpointForm({ outcome, nextStep }) {
  if (outcome === 'continue' && !nextStep.trim()) {
    return { nextStep: 'Name the next concrete step before continuing later.' }
  }
  return {}
}

export function createCheckpointPayload({ taskId, sessionId, outcome, nextStep, whatChanged }) {
  return {
    taskId,
    sessionId,
    outcome,
    nextStep: outcome === 'continue' ? nextStep.trim() : '',
    whatChanged,
  }
}

export function applyCheckpointToTasks(tasks, checkpoint) {
  return tasks.map((task) => {
    if (task.id === checkpoint.taskId) {
      return checkpoint.outcome === 'continue'
        ? { ...task, status: 'ready', order: 0 }
        : { ...task, status: 'done' }
    }
    if (checkpoint.outcome === 'continue' && task.status === 'ready') {
      return { ...task, order: task.order + 1 }
    }
    return task
  })
}
