export function orderReadyTasks(tasks) {
  return tasks
    .filter((task) => task.status === 'ready')
    .sort((left, right) => left.order - right.order || new Date(left.createdAt) - new Date(right.createdAt))
}

export function latestContinuation(tasks, checkpointsByTask) {
  return tasks
    .filter((task) => task.status === 'ready')
    .flatMap((task) => (checkpointsByTask[task.id] || [])
      .filter((checkpoint) => checkpoint.outcome === 'continue' && checkpoint.nextStep?.trim())
      .map((checkpoint) => ({ task, checkpoint })))
    .sort((left, right) => new Date(right.checkpoint.createdAt) - new Date(left.checkpoint.createdAt))[0] || null
}

export function deriveNowState({ tasks, session, checkpointsByTask = {} }) {
  const taskById = new Map(tasks.map((task) => [task.id, task]))

  if (session) {
    const task = taskById.get(session.taskId)
    const checkpoint = (checkpointsByTask[session.taskId] || [])
      .filter((item) => item.outcome === 'continue' && item.nextStep?.trim())
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))[0] || null
    return {
      kind: session.status === 'paused' ? 'paused' : 'active',
      task,
      session,
      checkpoint,
      eyebrow: session.status === 'paused' ? 'Paused' : 'Focusing',
      action: 'Return to focus',
    }
  }

  const continuation = latestContinuation(tasks, checkpointsByTask)
  if (continuation) {
    return {
      kind: 'continue',
      task: continuation.task,
      checkpoint: continuation.checkpoint,
      eyebrow: 'Resume from here',
      action: 'Start focus',
    }
  }

  const firstReady = orderReadyTasks(tasks)[0]
  if (firstReady) {
    return {
      kind: 'ready',
      task: firstReady,
      eyebrow: 'Up next',
      action: 'Start focus',
    }
  }

  return {
    kind: tasks.length === 0 ? 'empty' : 'idle',
    eyebrow: tasks.length === 0 ? 'Start here' : 'Inbox waiting',
    action: tasks.length === 0 ? 'New task' : 'Choose from Inbox',
  }
}

export function groupTasks(tasks) {
  return {
    ready: orderReadyTasks(tasks),
    inbox: tasks.filter((task) => task.status === 'inbox'),
    done: tasks
      .filter((task) => task.status === 'done')
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
  }
}
