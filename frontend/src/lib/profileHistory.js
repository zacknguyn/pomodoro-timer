import { activityDayKey, activitySummary } from './activity.js'
import { safeReference } from './workbenchView.js'

export function featuredWork(tasks, profile) {
  return [...new Set(profile.featuredIds || [])]
    .map(id => tasks.find(task => task.id === id && task.status === 'done'))
    .filter(Boolean).slice(0, 3)
    .map(task => ({
      id: task.id, title: task.title, project: task.project || '',
      description: profile.featuredDescriptions?.[task.id] || '',
      referenceUrl: profile.featuredReferences?.[task.id] ? safeReference(task.referenceUrl) : '',
    }))
}

export function profileHistory(events, period = 28, now = new Date(), weekStart = 'monday') {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const start = new Date(today)
  start.setDate(start.getDate() - period + 1)
  const past = events.filter(event => new Date(event.createdAt) <= now)
  const byDay = new Map()
  const active = new Set()
  for (const event of past) {
    const key = activityDayKey(event.createdAt)
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key).push(event)
    if (event.kind === 'completion' || (event.kind === 'focus' && event.seconds > 0)) active.add(key)
  }
  const cursor = new Date(today)
  if (!active.has(activityDayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (active.has(activityDayKey(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1) }
  const selected = past.filter(event => new Date(event.createdAt) >= start)
  const first = new Date(start), last = new Date(today)
  const firstWeekday = weekStart === 'sunday' ? 0 : 1
  first.setDate(first.getDate() - (first.getDay() - firstWeekday + 7) % 7)
  last.setDate(last.getDate() + (firstWeekday + 6 - last.getDay() + 7) % 7)
  const startKey = activityDayKey(start), endKey = activityDayKey(today), days = []
  for (const date = new Date(first); date <= last; date.setDate(date.getDate() + 1)) {
    const key = activityDayKey(date), items = byDay.get(key) || [], summary = activitySummary(items)
    days.push({ key, events: items, summary, outside: key < startKey || key > endKey, level: Math.min(3, items.filter(event => event.kind === 'focus' && event.seconds > 0).length + summary.completed) })
  }
  return { days, startKey, endKey, summary: activitySummary(selected), activeDays: [...active].filter(key => key >= startKey && key <= endKey).length, streak }
}
