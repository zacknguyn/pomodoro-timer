function text(value) {
  return String(value || '').trim()
}

function sameLocalDay(left, right) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
}

export function latestReviewEntryIds(entries) {
  const latest = new Map()
  entries.forEach((entry) => {
    const current = latest.get(entry.task.id)
    if (!current || new Date(entry.createdAt) > new Date(current.createdAt)) latest.set(entry.task.id, entry)
  })
  return new Set([...latest.values()].map((entry) => entry.id))
}

export function getReviewEntryState(entry, entries) {
  if (entry.outcome === 'complete') return 'completed'
  const isLatest = latestReviewEntryIds(entries).has(entry.id)
  if (isLatest && entry.task.status !== 'done') return 'open'
  return 'continued'
}

export function filterReviewEntries(entries, filters = {}, now = new Date()) {
  const {
    query = '',
    taskId = 'all',
    date = 'all',
    state = 'all',
    evidence = 'all',
    sort = 'newest',
  } = filters
  const normalizedQuery = text(query).toLocaleLowerCase()
  const rangeDays = date === '7days' ? 7 : date === '30days' ? 30 : 0
  const rangeStart = rangeDays ? new Date(now.getTime() - rangeDays * 86_400_000) : null

  return entries
    .filter((entry) => {
      if (taskId !== 'all' && entry.task.id !== taskId) return false
      const createdAt = new Date(entry.createdAt)
      if (date === 'today' && !sameLocalDay(createdAt, now)) return false
      if (rangeStart && createdAt < rangeStart) return false
      if (state !== 'all' && getReviewEntryState(entry, entries) !== state) return false

      const hasChanged = Boolean(text(entry.whatChanged))
      const hasNext = Boolean(text(entry.nextStep))
      if (evidence === 'changed' && !hasChanged) return false
      if (evidence === 'next' && !hasNext) return false
      if (evidence === 'missing' && (hasChanged || hasNext)) return false

      if (!normalizedQuery) return true
      return [entry.task?.title, entry.whatChanged, entry.nextStep]
        .filter(Boolean)
        .some((value) => value.toLocaleLowerCase().includes(normalizedQuery))
    })
    .sort((left, right) => {
      const direction = sort === 'oldest' ? 1 : -1
      return direction * (new Date(left.createdAt) - new Date(right.createdAt))
    })
}

export function groupReviewEntries(entries) {
  const groups = new Map()
  entries.forEach((entry) => {
    const date = new Date(entry.createdAt)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(entry)
  })
  return [...groups].map(([dateKey, items]) => ({ dateKey, entries: items }))
}

export function groupReviewEntriesByTask(entries, allEntries = entries) {
  const groups = new Map()
  entries.forEach((entry) => {
    if (!groups.has(entry.task.id)) groups.set(entry.task.id, { task: entry.task, entries: [], totalSeconds: 0 })
    const group = groups.get(entry.task.id)
    group.entries.push(entry)
    group.totalSeconds += Math.max(0, Number(entry.session.durationActualSeconds) || 0)
  })
  return [...groups.values()].map((group) => {
    const allTaskEntries = allEntries.filter((entry) => entry.task.id === group.task.id)
    const latest = allTaskEntries.sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))[0]
    return {
      ...group,
      state: latest && getReviewEntryState(latest, allEntries) === 'open' ? 'open' : group.task.status === 'done' ? 'completed' : 'active',
    }
  })
}

export function formatReviewDuration(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0)
  if (safeSeconds < 60) return 'Under 1 min'
  return `${Math.round(safeSeconds / 60)} min`
}
