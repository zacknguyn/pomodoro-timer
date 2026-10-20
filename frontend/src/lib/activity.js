import { WORKBENCH_STATUSES } from './workbenchView.js'

const labels = Object.fromEntries(WORKBENCH_STATUSES)
const validDate = value => value && Number.isFinite(new Date(value).getTime())
export const activityDayKey = value => {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function activityDuration(seconds) {
  if (!seconds) return '0 min'
  return seconds < 60 ? 'Under 1 min' : `${Math.round(seconds / 60)} min`
}
export function buildActivityEvents(tasks, sessions) {
  const events = []
  for (const task of tasks) {
    if (validDate(task.createdAt)) events.push({ id: `created-${task.id}`, task, kind: 'change', text: 'Task created.', createdAt: task.createdAt })
    for (const note of new Map((task.notes || []).map(note => [note.id, note])).values()) {
      if (!validDate(note.createdAt)) continue
      const transition = note.kind === 'change' && /^Moved from (inbox|ready|progress|done) to (inbox|ready|progress|done)\.$/.exec(note.text)
      const kind = note.kind === 'completion' || transition?.[2] === 'done' ? 'completion' : note.kind === 'change' ? 'change' : 'note'
      events.push({ ...note, id: `note-${task.id}-${note.id}`, noteId: note.id, task, kind, text: transition ? `Moved from ${labels[transition[1]]} to ${labels[transition[2]]}.` : note.text })
    }
  }
  for (const session of new Map(sessions.map(session => [session.id, session])).values()) {
    if (!['ended', 'completed'].includes(session.status) || !validDate(session.endedAt)) continue
    const seconds = Number(session.durationActualSeconds)
    events.push({ id: `session-${session.id}`, task: tasks.find(task => task.id === session.taskId) || null, kind: 'focus', createdAt: session.endedAt, session, seconds: Number.isFinite(seconds) ? Math.max(0, seconds) : 0, text: 'Timer stopped.' })
  }
  return events.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}
function localDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isFinite(date.getTime()) && activityDayKey(date) === value ? date : null
}
export function activityRangeLabel({ period = 'today', fromDate, toDate } = {}) {
  if (period !== 'custom') return period === 'all' ? 'All time' : period === 'week' ? 'Last 7 days' : 'Today'
  const from = localDay(fromDate), to = localDay(toDate)
  if (!from || !to || from > to) return 'Invalid date range'
  const format = date => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
  return fromDate === toDate ? format(from) : `${format(from)} – ${format(to)}`
}
export function filterActivity(events, { query = '', project = '', projectNames, kind = '', period = 'today', fromDate, toDate } = {}, now = new Date()) {
  let start = new Date(now.getFullYear(), now.getMonth(), now.getDate()), end = null
  if (period === 'week') start.setDate(start.getDate() - 6)
  if (period === 'custom') {
    start = localDay(fromDate); end = localDay(toDate)
    if (!start || !end || start > end) return []
    end.setDate(end.getDate() + 1)
  }
  const search = query.trim().toLocaleLowerCase()
  const group = Array.isArray(projectNames) && projectNames.length ? projectNames : null
  return events.filter(event => {
    const date = new Date(event.createdAt)
    return (period === 'all' || date >= start) && (!end || date < end) && date <= now && (!project || (project === '__no_project__' ? !event.task?.project : event.task?.project === project)) && (!group || group.includes(event.task?.project || '')) && (!kind || event.kind === kind) && (!search || [event.task?.title, event.task?.project, event.text].some(value => String(value || '').toLocaleLowerCase().includes(search)))
  })
}
export function activitySummary(events) {
  const focus = events.filter(event => event.kind === 'focus')
  return { seconds: focus.reduce((total, event) => total + event.seconds, 0), sessions: focus.length, completed: new Set(events.filter(event => event.kind === 'completion').map(event => event.task.id)).size }
}
