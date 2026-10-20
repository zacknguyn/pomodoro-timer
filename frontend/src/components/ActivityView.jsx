import { useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, CircleCheck, Clock, CirclePlus, Folder, Pencil, X } from 'lucide-react'
import { Modal, StatusLabel } from './WorkbenchPanels'
import { activityDayKey, activityDuration, activityRangeLabel, activitySummary, filterActivity } from '../lib/activity'
import { readableDate, safeReference } from '../lib/workbenchView'
import './ActivityView.css'

const LABELS = { focus: 'Focus session', completion: 'Task completed', note: 'Note saved', change: 'Task change' }
const ICONS = { focus: Clock, completion: CircleCheck, note: Pencil, change: CirclePlus }
const time = value => new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
function EventIcon({ kind }) { const Icon = ICONS[kind]; return <Icon size={18} aria-hidden="true" /> }

export default function ActivityView({ events, projects, filters, onFilter, onClear, loading, error, onRetry, onOpenTask, searchRef, onHome }) {
  const [selectedId, setSelectedId] = useState(null)
  const selected = events.find(event => event.id === selectedId)
  const visible = filterActivity(events, filters)
  const totals = activitySummary(visible)
  const groups = new Map()
  visible.forEach(event => { const key = activityDayKey(event.createdAt); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(event) })
  const today = new Date(), yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  function dayLabel(event) {
    const key = activityDayKey(event.createdAt)
    const date = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(event.createdAt))
    return `${key === activityDayKey(today) ? 'Today · ' : key === activityDayKey(yesterday) ? 'Yesterday · ' : ''}${date}`
  }
  const filterChips = [
    filters.query?.trim() && { key: 'query', label: `Search: ${filters.query.trim()}`, remove: () => onFilter('query', '') },
    (filters.project || filters.projectNames?.length > 0) && { key: 'project', label: `Project: ${filters.projectNames?.length ? `${filters.projectLabel || 'Selected projects'} (${filters.projectNames.length})` : filters.project === '__no_project__' ? 'No project' : filters.project}`, remove: () => { onFilter('projectNames', undefined); onFilter('project', '') } },
    filters.kind && { key: 'type', label: `Type: ${LABELS[filters.kind]}`, remove: () => onFilter('kind', '') },
    filters.period && !['today', 'custom'].includes(filters.period) && { key: 'date', label: activityRangeLabel(filters), remove: () => onFilter('period', 'today') },
  ].filter(Boolean)
  const activeFilters = filterChips.length > 0 || filters.period === 'custom'
  const unavailable = loading || Boolean(error)
  const task = selected?.task
  const reference = safeReference(task?.referenceUrl)
  return <div className="activity-page">
    {filters.origin !== 'home' && <p className="activity-intro">Your saved focus, completions, and notes. Grouped by day and project.</p>}
    {filters.origin === 'home' && <section className="activity-context" aria-label="History opened from Home"><button className="wb-ghost" onClick={onHome}><ArrowLeft size={16} aria-hidden="true" />Back to Home</button><div><strong>{filters.projectNames?.length ? `${filters.projectLabel || 'Selected projects'} · ${filters.projectNames.length} projects` : filters.project === '__no_project__' ? 'No project' : filters.project || 'All projects'}</strong><span>{filters.kind === 'focus' ? 'Focus sessions' : filters.kind === 'completion' ? 'Completions' : filters.kind ? LABELS[filters.kind] : 'All activity'}</span></div></section>}
    <section className="activity-controls" aria-label="Filter activity">
      <label className="activity-search">Search activity<input ref={searchRef} type="search" disabled={unavailable} placeholder="Find a task or note…" value={filters.query || ''} onChange={event => onFilter('query', event.target.value)} /></label>
      <label>Project<select disabled={unavailable} value={filters.projectNames?.length ? '__group__' : filters.project || ''} onChange={event => { onFilter('projectNames', undefined); onFilter('project', event.target.value) }}><option value="">All projects</option>{filters.projectNames?.length > 0 && <option value="__group__">{filters.projectLabel || 'Selected projects'} ({filters.projectNames.length} projects)</option>}{projects.map(project => <option key={project}>{project}</option>)}<option value="__no_project__">No project</option></select></label>
      <label>Activity type<select disabled={unavailable} value={filters.kind || ''} onChange={event => onFilter('kind', event.target.value)}><option value="">All activity</option><option value="focus">Focus sessions</option><option value="completion">Completions</option><option value="note">Notes</option><option value="change">Task changes</option></select></label>
    </section>
    <div className="activity-period" role="group" aria-label="Activity period">{filters.period === 'custom' && <button className="activity-custom-range" disabled={unavailable} aria-label="Remove date filter" title={activityRangeLabel(filters)} onClick={() => onFilter('period', 'today')}><CalendarDays size={14} aria-hidden="true" />{activityRangeLabel(filters)}<X size={14} aria-hidden="true" /></button>}<div className="activity-date-presets"><button disabled={unavailable} aria-pressed={!filters.period || filters.period === 'today'} onClick={() => onFilter('period', 'today')}>Today</button><button disabled={unavailable} aria-pressed={filters.period === 'week'} onClick={() => onFilter('period', 'week')}>Last 7 days</button><button disabled={unavailable} aria-pressed={filters.period === 'all'} onClick={() => onFilter('period', 'all')}>All time</button></div>{!loading && !error && <small role="status">{visible.length} {visible.length === 1 ? 'record' : 'records'} · by day and project</small>}</div>
    {activeFilters && <section className="activity-applied" aria-label="Applied activity filters"><div>{filterChips.map(chip => <button key={chip.key} className="wb-ghost activity-filter-chip" disabled={unavailable} aria-label={`Remove ${chip.key} filter`} title={chip.label} onClick={() => { chip.remove(); if (chip.key === 'query') searchRef.current?.focus() }}><span>{chip.label}</span><X size={14} aria-hidden="true" /></button>)}</div><button className="wb-ghost" disabled={unavailable} onClick={onClear}>Clear filters</button></section>}
    {loading ? <p className="activity-state" role="status" aria-busy="true">Loading your work history…</p> : error ? <div className="activity-state wb-error" role="alert"><p>Work history couldn’t load. Your tasks are unchanged.</p><p>{error}</p><button onClick={onRetry}>Try again</button></div> : <>
      {events.length > 0 && <dl className="activity-summary" aria-label="Summary for this selection"><div><dt><strong>{activityDuration(totals.seconds)}</strong></dt><dd><span>focus recorded</span></dd></div><div><dt><strong>{totals.sessions}</strong></dt><dd><span>focus sessions</span></dd></div><div><dt><strong>{totals.completed}</strong></dt><dd><span>tasks completed</span></dd></div></dl>}
      {!visible.length && <p className="activity-empty">{events.length ? <>No activity matches this selection. {activeFilters ? 'Remove a filter above to see more work.' : <button className="wb-ghost" onClick={onClear}>Clear filters</button>}</> : 'Your task changes, notes, and recorded focus sessions will appear here as you work. Start with a task in Board.'}</p>}
      {[...groups].map(([key, entries]) => {
        const projectGroups = new Map()
        entries.forEach(event => { const project = event.task?.project || ''; if (!projectGroups.has(project)) projectGroups.set(project, []); projectGroups.get(project).push(event) })
        const summary = activitySummary(entries)
        return <section key={key} className="activity-section" aria-label={dayLabel(entries[0])}>
          <header className="activity-day"><h2>{dayLabel(entries[0])}</h2><span>{entries.length} {entries.length === 1 ? 'record' : 'records'}{summary.seconds > 0 && ` · ${activityDuration(summary.seconds)} focus`}</span></header>
          {[...projectGroups].map(([project, records]) => <section className="activity-project-group" key={project} aria-label={`${project || 'No project'} activity`}>
            <header className="activity-project-heading"><h3 className="activity-project"><Folder size={15} aria-hidden="true" />{project || 'No project'}</h3><span>{records.length} {records.length === 1 ? 'record' : 'records'} · newest first</span></header>
            <ol className="activity-events">{records.map(event => <li key={event.id} className="activity-event" data-record={event.id} data-kind={event.kind}>
              <span className="activity-event-icon"><EventIcon kind={event.kind} /></span><div className="activity-event-main"><div className="activity-event-heading"><span className="activity-event-kind">{LABELS[event.kind]}</span><time dateTime={event.createdAt}>{time(event.createdAt)}</time></div><p className="activity-event-title">{event.task?.title || 'Task unavailable'}</p><p className="activity-event-copy">{event.kind === 'focus' ? `${activityDuration(event.seconds)} recorded · timer stopped` : event.text || 'Completed without a closing note.'}</p></div>
              <button className="activity-open" aria-label={`View ${LABELS[event.kind].toLowerCase()} for ${event.task?.title || 'unavailable task'} at ${time(event.createdAt)}`} onClick={() => setSelectedId(event.id)}>View details<ArrowRight size={16} aria-hidden="true" /></button>
            </li>)}</ol>
          </section>)}
        </section>
      })}
      {events.length > 0 && <p className="activity-footnote">Focus time uses recorded session time. Stopping a timer does not complete a task.</p>}
    </>}
    {selected && <Modal wide title={task?.title || 'Task unavailable'} onClose={() => setSelectedId(null)} footer={<><p className="wb-task-open-hint">Read-only context. Opening a task never starts a timer.</p><button onClick={() => setSelectedId(null)}>Close</button>{task && <button className="wb-primary" onClick={() => { setSelectedId(null); onOpenTask(task.id) }}>View task<ArrowRight size={16} aria-hidden="true" /></button>}</>}>
      <div className="wb-task-dialog-grid"><div className="wb-task-dialog-main"><section className="activity-detail-record"><p className="activity-dialog-kicker"><EventIcon kind={selected.kind} />{LABELS[selected.kind]}</p><p className="activity-dialog-time">{readableDate(selected.createdAt)}</p><p>{selected.kind === 'focus' ? `${activityDuration(selected.seconds)} recorded · timer stopped` : selected.text || 'Completed without a closing note. Notes are optional.'}</p>{selected.session && <p className="wb-muted">{selected.session.startedAt && Number.isFinite(new Date(selected.session.startedAt).getTime()) && <>{readableDate(selected.session.startedAt)} — {readableDate(selected.session.endedAt)}<br /></>}Recorded focus time excludes pauses. Task completion is a separate action.</p>}</section><section className="activity-dialog-next"><h3>Current next step</h3><p>{task?.nextStep || 'No next step saved.'}</p></section><p className="wb-muted">This record describes the event. Task properties show where the task stands now.</p></div><aside className="wb-task-properties" aria-label="Current task properties"><h3>Task now</h3><dl><div><dt>Current status</dt><dd>{task ? <StatusLabel status={task.status} /> : 'Task unavailable'}</dd></div><div><dt>Project</dt><dd>{task?.project || 'No project'}</dd></div></dl><div><p className="wb-label">Reference</p>{reference ? <a href={reference} target="_blank" rel="noreferrer">Open reference<ArrowRight size={16} aria-hidden="true" /></a> : <p className="wb-muted">No reference added.</p>}</div></aside></div>
    </Modal>}
  </div>
}
