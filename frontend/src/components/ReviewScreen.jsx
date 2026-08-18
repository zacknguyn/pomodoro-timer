import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownUp,
  ArrowRight,
  ExternalLink,
  Filter,
  List,
  RotateCw,
  Search,
  X,
} from 'lucide-react'
import { workApi } from '../lib/workApi'
import { DitherGradient } from './dither-kit/DitherGradient'
import {
  filterReviewEntries,
  formatReviewDuration,
  getReviewEntryState,
  groupReviewEntries,
  groupReviewEntriesByTask,
} from '../lib/review'

const DEFAULT_FILTERS = {
  taskId: 'all',
  date: 'all',
  state: 'all',
  evidence: 'all',
  sort: 'newest',
}

const FILTER_LABELS = {
  date: { today: 'Today', '7days': 'Last 7 days', '30days': 'Last 30 days' },
  state: { open: 'Open handoff', completed: 'Completed', continued: 'Continued' },
  evidence: { changed: 'Has change note', next: 'Has next step', missing: 'Missing evidence' },
}

function formatDay(dateKey) {
  const date = new Date(`${dateKey}T12:00:00`)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(date)
}

function formatEntryDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value))
}

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

function EntryState({ entry, entries }) {
  const state = getReviewEntryState(entry, entries)
  const label = state === 'open' ? 'Open handoff' : state === 'completed' ? 'Completed' : 'Continued'
  return <span className={`review-state is-${state}`}>{label}</span>
}

function Evidence({ entry, entries, compact = false }) {
  const missing = !entry.whatChanged && !entry.nextStep
  return (
    <div className={`review-evidence-stack ${compact ? 'is-compact' : ''}`}>
      {entry.whatChanged && <div className="review-evidence"><span>Changed</span><p>{entry.whatChanged}</p></div>}
      {entry.nextStep && <div className={`review-evidence is-next ${getReviewEntryState(entry, entries) === 'open' ? 'is-open' : ''}`}><span>Next</span><p>{entry.nextStep}</p></div>}
      {missing && <p className="review-missing">No change note or next step was recorded.</p>}
    </div>
  )
}

function TimelineEntry({ entry, allEntries }) {
  return (
    <li className="review-entry">
      <div className="review-entry-meta">
        <time dateTime={entry.createdAt}>{formatTime(entry.createdAt)}</time>
        <EntryState entry={entry} entries={allEntries} />
        <span>{formatReviewDuration(entry.session.durationActualSeconds)}</span>
      </div>
      <div className="review-entry-body">
        <div className="review-entry-title">
          <h3>{entry.task.title}</h3>
          {entry.task.referenceUrl && (
            <a href={entry.task.referenceUrl} target="_blank" rel="noreferrer">
              Reference <ExternalLink size={13} aria-hidden="true" />
            </a>
          )}
        </div>
        <Evidence entry={entry} entries={allEntries} />
      </div>
    </li>
  )
}

function TaskStory({ group, allEntries }) {
  const stateLabel = group.state === 'open' ? 'Open handoff' : group.state === 'completed' ? 'Completed' : 'In progress'
  return (
    <section className="task-story" aria-labelledby={`task-story-${group.task.id}`}>
      <header>
        <div>
          <span className={`review-state is-${group.state}`}>{stateLabel}</span>
          <h2 id={`task-story-${group.task.id}`}>{group.task.title}</h2>
        </div>
        <p>{group.entries.length} {group.entries.length === 1 ? 'session' : 'sessions'} · {formatReviewDuration(group.totalSeconds)}</p>
      </header>
      <ol>
        {group.entries.map((entry) => (
          <li className="story-event" key={entry.id}>
            <div className="story-event-meta">
              <time dateTime={entry.createdAt}>{formatEntryDate(entry.createdAt)} · {formatTime(entry.createdAt)}</time>
              <EntryState entry={entry} entries={allEntries} />
              <span>{formatReviewDuration(entry.session.durationActualSeconds)}</span>
            </div>
            <Evidence entry={entry} entries={allEntries} compact />
          </li>
        ))}
      </ol>
    </section>
  )
}

function FilterField({ label, value, onChange, children }) {
  return <label className="review-filter-field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{children}</select></label>
}

export default function ReviewScreen({ onOpenWork }) {
  const [entries, setEntries] = useState([])
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [mode, setMode] = useState('tasks')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadReview() {
    setLoading(true)
    setError('')
    try {
      setEntries(await workApi.listReviewEntries())
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadReview() }, [])

  const tasks = useMemo(() => {
    const unique = new Map(entries.map((entry) => [entry.task.id, entry.task]))
    return [...unique.values()].sort((left, right) => left.title.localeCompare(right.title))
  }, [entries])
  const visibleEntries = useMemo(
    () => filterReviewEntries(entries, { ...filters, query }),
    [entries, filters, query],
  )
  const timelineGroups = useMemo(() => groupReviewEntries(visibleEntries), [visibleEntries])
  const taskGroups = useMemo(() => groupReviewEntriesByTask(visibleEntries, entries), [entries, visibleEntries])
  const activeFilters = useMemo(() => {
    const chips = []
    if (query.trim()) chips.push({ key: 'query', label: `Search: ${query.trim()}` })
    if (filters.taskId !== 'all') chips.push({ key: 'taskId', label: `Task: ${tasks.find((task) => task.id === filters.taskId)?.title || 'Selected'}` })
    for (const key of ['date', 'state', 'evidence']) {
      if (filters[key] !== 'all') chips.push({ key, label: FILTER_LABELS[key][filters[key]] })
    }
    return chips
  }, [filters, query, tasks])

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function clearFilter(key) {
    if (key === 'query') setQuery('')
    else updateFilter(key, 'all')
  }

  function resetFilters() {
    setQuery('')
    setFilters(DEFAULT_FILTERS)
  }

  if (loading) {
    return <div className="review-view"><header className="review-header"><div><p className="page-kicker">Recover</p><h1>Review</h1><p>Read the trail of changes and find the exact handoff.</p></div></header><div className="review-loading" aria-label="Loading review" aria-busy="true"><p className="section-kicker">Loading checkpoints</p><span /><span /><span /></div></div>
  }

  return (
    <div className="review-view">
      <header className="review-header">
        <div><p className="page-kicker">Recover</p><h1>Review</h1><p>Read the trail of changes and find the exact handoff.</p></div>
        <span>{entries.length} {entries.length === 1 ? 'checkpoint' : 'checkpoints'} across {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</span>
      </header>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button type="button" onClick={loadReview}><RotateCw size={15} /> Retry</button>
        </div>
      )}

      {!error && entries.length === 0 ? (
        <section className="review-empty">
          <DitherGradient from="blue" to="transparent" direction="right" cell={3} opacity={0.24} bloom="off" className="review-empty-texture" />
          <div><p className="section-kicker">No checkpoints yet</p><h2>Your work will leave a trail here.</h2><p>End a focus session and record what changed. That checkpoint becomes the starting point for tomorrow.</p><button type="button" onClick={onOpenWork}>Start in Work <ArrowRight size={16} aria-hidden="true" /></button></div>
          <ol aria-label="How Review fills up"><li><span>01</span><b>Focus</b><small>Move one task.</small></li><li><span>02</span><b>Checkpoint</b><small>Write the change and next step.</small></li><li><span>03</span><b>Recover</b><small>Return without reconstructing context.</small></li></ol>
        </section>
      ) : !error && (
        <>
          <div className="review-mode-row">
            <div className="review-modes" aria-label="Review presentation">
              <button type="button" aria-pressed={mode === 'tasks'} onClick={() => setMode('tasks')}><List size={15} aria-hidden="true" /> By task</button>
              <button type="button" aria-pressed={mode === 'timeline'} onClick={() => setMode('timeline')}><ArrowDownUp size={15} aria-hidden="true" /> Timeline</button>
            </div>
          </div>

          <div className="review-tools">
            <label className="review-search">
              <Search size={16} aria-hidden="true" />
              <span className="sr-only">Search checkpoints</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search task, change, or next step" />
            </label>
            <div className="review-tool-actions">
              <button className="review-filter-button" type="button" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}>
                <Filter size={15} aria-hidden="true" /> Filters {activeFilters.filter((filter) => filter.key !== 'query').length || ''}
              </button>
              <label className="review-sort"><span className="sr-only">Sort checkpoints</span><select value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
            </div>
          </div>

          <div className="review-filter-disclosure" data-open={filtersOpen}>
            <div>
              <div className="review-filter-panel">
                <FilterField label="Task" value={filters.taskId} onChange={(value) => updateFilter('taskId', value)}><option value="all">All tasks</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</FilterField>
                <FilterField label="Date" value={filters.date} onChange={(value) => updateFilter('date', value)}><option value="all">Any time</option><option value="today">Today</option><option value="7days">Last 7 days</option><option value="30days">Last 30 days</option></FilterField>
                <FilterField label="State" value={filters.state} onChange={(value) => updateFilter('state', value)}><option value="all">Any state</option><option value="open">Open handoff</option><option value="completed">Completed</option><option value="continued">Continued history</option></FilterField>
                <FilterField label="Evidence" value={filters.evidence} onChange={(value) => updateFilter('evidence', value)}><option value="all">Any evidence</option><option value="changed">Has change note</option><option value="next">Has next step</option><option value="missing">Missing evidence</option></FilterField>
              </div>
            </div>
          </div>

          {activeFilters.length > 0 && (
            <div className="review-active-filters" aria-label="Active filters">
              {activeFilters.map((filter) => <button key={filter.key} type="button" onClick={() => clearFilter(filter.key)}>{filter.label} <X size={12} aria-hidden="true" /></button>)}
              <button className="clear-all" type="button" onClick={resetFilters}>Clear all</button>
            </div>
          )}

          {visibleEntries.length === 0 ? (
            <p className="review-no-results">No checkpoints match these filters.</p>
          ) : mode === 'timeline' ? timelineGroups.map((group) => (
            <section className="review-day" key={group.dateKey} aria-labelledby={`review-${group.dateKey}`}>
              <header><h2 id={`review-${group.dateKey}`}>{formatDay(group.dateKey)}</h2><span>{group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'}</span></header>
              <ol>{group.entries.map((entry) => <TimelineEntry key={entry.id} entry={entry} allEntries={entries} />)}</ol>
            </section>
          )) : (
            <div className="task-stories">{taskGroups.map((group) => <TaskStory key={group.task.id} group={group} allEntries={entries} />)}</div>
          )}
        </>
      )}
    </div>
  )
}
