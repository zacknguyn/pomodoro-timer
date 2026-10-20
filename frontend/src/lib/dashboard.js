import { activityDayKey, activitySummary } from './activity.js'
import { profileHistory } from './profileHistory.js'

const COLORS = ['blue', 'purple', 'pink', 'green', 'orange']
export const dashboardDate = value => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value))
export function dashboardDuration(seconds) {
  if (!seconds) return '0 min'
  if (seconds < 60) return 'Under 1 min'
  const minutes = Math.floor(seconds / 60)
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`
}
const secondsOf = event => event.kind === 'focus' && Number.isFinite(event.seconds) ? Math.max(0, event.seconds) : 0
function countedEvents(events) {
  // Match Activity/Profile: a task counts once per reporting period, even if reopened.
  const completed = new Map()
  for (const event of [...events].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))) {
    if (event.kind === 'completion' && event.task) completed.set(event.task.id, event)
  }
  return events.filter(event => event.kind !== 'completion' || completed.get(event.task?.id) === event)
}
export function dashboardHistory(tasks, events, period = 7, now = new Date(), weekStart = 'monday') {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const start = new Date(today); start.setDate(start.getDate() - period + 1)
  const previousStart = new Date(start); previousStart.setDate(start.getDate() - period)
  const past = events.filter(event => Number.isFinite(new Date(event.createdAt).getTime()) && new Date(event.createdAt) <= now)
  const selected = past.filter(event => new Date(event.createdAt) >= start)
  const counted = countedEvents(selected)
  const previousEvents = past.filter(event => new Date(event.createdAt) >= previousStart && new Date(event.createdAt) < start)
  const previous = countedEvents(previousEvents)
  const focus = selected.filter(event => secondsOf(event) > 0)
  const names = [...new Set(past.filter(event => secondsOf(event) > 0).map(event => event.task?.project || ''))].sort()
  const projects = names.map(name => ({ name: name || 'No project', project: name, seconds: focus.filter(event => (event.task?.project || '') === name).reduce((total, event) => total + secondsOf(event), 0), color: name ? COLORS[names.filter(Boolean).indexOf(name) % COLORS.length] : 'grey', members: [name] })).filter(item => item.seconds > 0).sort((a, b) => b.seconds - a.seconds || a.name.localeCompare(b.name))
  const groups = projects.length <= 3 ? projects : [...projects.slice(0, 2), { name: 'Other work', color: 'grey', seconds: projects.slice(2).reduce((total, item) => total + item.seconds, 0), members: projects.slice(2).map(item => item.project) }]
  const series = groups.map((group, index) => ({ ...group, key: `project${index}` }))
  const step = period === 90 ? 7 : period === 30 ? 3 : 1, buckets = []
  for (let offset = 0; offset < period; offset += step) {
    const first = new Date(start); first.setDate(start.getDate() + offset)
    const last = new Date(start); last.setDate(start.getDate() + Math.min(period - 1, offset + step - 1))
    const end = new Date(last); end.setDate(last.getDate() + 1)
    const entries = counted.filter(event => new Date(event.createdAt) >= first && new Date(event.createdAt) < end)
    const seconds = entries.reduce((total, event) => total + secondsOf(event), 0)
    buckets.push({ key: activityDayKey(first), fromDate: activityDayKey(first), toDate: activityDayKey(last), label: first.getTime() === last.getTime() ? dashboardDate(first) : `${dashboardDate(first)}–${dashboardDate(last)}`, day: period === 7 ? new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(first) : dashboardDate(first), seconds, minutes: seconds / 60, completed: activitySummary(entries).completed, events: entries, ...Object.fromEntries(series.map(group => [group.key, entries.filter(event => group.members.includes(event.task?.project || '')).reduce((total, event) => total + secondsOf(event), 0) / 60])) })
  }
  const history = profileHistory(past, 90, now, weekStart), selectedHistory = profileHistory(past, period, now, weekStart)
  const statuses = ['inbox', 'ready', 'progress', 'done'].map(status => ({ status, count: tasks.filter(task => task.status === status).length }))
  return { start, today, summary: activitySummary(counted), previous: activitySummary(previous), activeDays: selectedHistory.activeDays, previousActiveDays: new Set(previousEvents.filter(event => secondsOf(event) > 0 || event.kind === 'completion').map(event => activityDayKey(event.createdAt))).size, streak: history.streak, series, projects, buckets, statuses, calendar: history.days.map(day => ({ ...day, selected: !day.outside && day.key >= activityDayKey(start) })), recent: selected.filter(event => secondsOf(event) > 0 || event.kind === 'completion').slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3) }
}
