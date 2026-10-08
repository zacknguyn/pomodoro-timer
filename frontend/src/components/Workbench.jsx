import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, ChevronDown, Clock, CircleCheck, Folder, Link, Pause, GripVertical, Columns3, ListTree, PanelsTopLeft, Pencil, Search, Settings, User, X } from 'lucide-react'
import { DitherAvatar } from './dither-kit/DitherAvatar'
import { workApi } from '../lib/workApi'
import { writeProfile } from '../lib/preferences'
import { CompletionDialog, FloatingFocus, Modal, NoteHistory, ProfileEditor, SettingsDialog, StatusLabel, TaskEditor, TaskInspection, TaskNoteDialog, } from './WorkbenchPanels'
import { WORKBENCH_STATUSES, readableDate, safeReference } from '../lib/workbenchView'
import './Workbench.css'

const LABELS = { work: 'Workspace', tasks: 'Board', review: 'Activity', profile: 'Profile', admin: 'Admin' }
const PAGE_ICONS = { work: PanelsTopLeft, tasks: Columns3, review: ListTree, profile: User, admin: User }
const PAGE_DESCRIPTIONS = { work: 'Create a task or pick up your work', tasks: 'Organize tasks by status', review: 'Read saved notes and recent changes', profile: 'Your identity and featured work', admin: 'Manage workspace access' }
const LANE_HINTS = { inbox: 'New tasks arrive here. Open a card to add details.', ready: 'Tasks you have organized and can pick up next.', progress: 'Starting focus moves a task here.', done: 'Finished tasks stay here with their notes.' }
const PROFILE_ACCENTS = { mint: '165', blue: '255', plum: '320', amber: '65' }
const dateKey = (value) => new Date(value).toLocaleDateString('en-CA')

export default function Workbench({ view, onNavigate, profile, onProfile, admin, preferences, onPreferences, onExit }) {
  const [tasks, setTasks] = useState([])
  const [session, setSession] = useState(null)
  const [sessions, setSessions] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [undo, setUndo] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [project, setProject] = useState('')
  const [status, setStatus] = useState('')
  const [chooserOpen, setChooserOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [dialog, setDialog] = useState(null)
  const [panel, setPanel] = useState('compact')
  const [timerHeight, setTimerHeight] = useState(0)
  const [textEntry, setTextEntry] = useState(false)
  const [avatarReplay, setAvatarReplay] = useState(0)
  const [publicProfile, setPublicProfile] = useState(false)
  const [period, setPeriod] = useState(28)
  const [appHeight, setAppHeight] = useState(window.visualViewport?.height || window.innerHeight)
  const returnTaskId = useRef(preferences.lastTaskId)
  const capturedCardId = useRef(null)
  const drafts = useRef(new Map())
  const editorDrafts = useRef(new Map())
  const root = useRef(null)
  const searchRef = useRef(null)
  const captureRef = useRef(null)
  const captureDraft = useRef('')
  const noteRef = useRef(null)
  const drag = useRef(null)
  const [dropTarget, setDropTarget] = useState(null)
  const [draggingId, setDraggingId] = useState(null)
  const unreadSince = useRef(Date.now())
  const [readNoteIds, setReadNoteIds] = useState(() => new Set())

  const refresh = useCallback(async () => {
    const [nextTasks, nextSession, entries, snapshot] = await Promise.all([workApi.listTasks(), workApi.getActiveSession(), workApi.listReviewEntries(), workApi.exportWorkspace()])
    const hydrated = nextTasks.map((task) => {
      const history = entries.filter((entry) => entry.task.id === task.id)
      const notes = [...history.filter((entry) => entry.whatChanged).map((entry) => ({ id: entry.id, text: entry.whatChanged, createdAt: entry.createdAt, kind: entry.outcome === 'complete' ? 'completion' : 'note' })), ...(task.notes || [])]
      return { ...task, project: task.project || '', nextStep: task.nextStep ?? history[0]?.nextStep ?? '', notes: [...new Map(notes.map((note) => [note.id, note])).values()].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) }
    })
    setTasks(hydrated)
    setSession(nextSession)
    setSessions(snapshot.sessions || [])
    setSelectedId((current) => hydrated.find((task) => task.id === current && task.status !== 'done')?.id || hydrated.find((task) => task.id === nextSession?.taskId && task.status !== 'done')?.id || hydrated.find((task) => task.id === returnTaskId.current && task.status !== 'done')?.id || hydrated.find((task) => task.status !== 'done')?.id || null)
    return hydrated
  }, [])
  useEffect(() => {
    let active = true
    refresh().catch((failure) => { if (active) setError(failure.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [refresh])
  useEffect(() => {
    function update() {
      const viewport = window.visualViewport
      setAppHeight(viewport?.scale === 1 ? viewport.height : window.innerHeight)
      if (document.activeElement?.matches('input,textarea,select')) requestAnimationFrame(() => document.activeElement.scrollIntoView({ block: 'nearest', behavior: 'instant' }))
    }
    window.visualViewport?.addEventListener('resize', update)
    window.addEventListener('resize', update)
    return () => { window.visualViewport?.removeEventListener('resize', update); window.removeEventListener('resize', update) }
  }, [])
  useEffect(() => {
    const media = matchMedia('(max-width: 760px)')
    function changed(event) { if (event.matches) setPanel((current) => current === 'normal' ? 'compact' : current) }
    media.addEventListener('change', changed)
    return () => media.removeEventListener('change', changed)
  }, [])
  useEffect(() => {
    function keydown(event) {
      if (root.current?.closest('[hidden]')) return
      if (document.querySelector('.wb-modal[open]') || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input,textarea,select,[contenteditable=true]')) return
      if (event.key === '/' && view !== 'profile') { event.preventDefault(); searchRef.current?.focus() }
      if (event.key.toLowerCase() === 'n' && ['work', 'tasks'].includes(view)) { event.preventDefault(); captureRef.current?.focus() }
      if (event.key === '?') { event.preventDefault(); setDialog({ type: 'shortcuts' }) }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [view])
  useEffect(() => {
    function closeMenus(event) {
      root.current?.querySelectorAll('details.wb-menu[open]').forEach((menu) => { if (!menu.contains(event.target)) menu.open = false })
    }
    document.addEventListener('pointerdown', closeMenus)
    return () => document.removeEventListener('pointerdown', closeMenus)
  }, [])
  const filtered = useMemo(() => tasks.filter((task) => (!project || task.project === project) && (!status || task.status === status) && `${task.title} ${task.project} ${task.nextStep} ${task.notes.map((note) => note.text).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())), [tasks, project, status, query])
  useEffect(() => {
    if (view !== 'tasks' || !capturedCardId.current) return
    const card = root.current?.querySelector(`[data-task="${CSS.escape(capturedCardId.current)}"] .wb-card-title`)
    if (card) { card.scrollIntoView({ block: 'nearest', behavior: 'auto' }); card.focus({ preventScroll: true }); capturedCardId.current = null }
  }, [filtered, view])
  const projects = [...new Set(tasks.map((task) => task.project).filter(Boolean))].sort()
  const taskList = filtered.filter((task) => status === 'done' || task.status !== 'done')
  const hasFilters = Boolean(query || project || status)
  const selected = taskList.find((task) => task.id === selectedId) || taskList[0] || null
  const focused = tasks.find((task) => task.id === session?.taskId)
  const activeDialogTask = tasks.find((task) => task.id === dialog?.taskId)
  const allEvents = filtered.flatMap((task) => [{ id: `created-${task.id}`, text: 'Task created.', kind: 'change', createdAt: task.createdAt, task }, ...task.notes.map((note) => ({ ...note, task }))]).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const unread = tasks.flatMap((task) => task.notes).filter((note) => note.kind !== 'change' && new Date(note.createdAt).getTime() > unreadSince.current && !readNoteIds.has(note.id)).length
  useEffect(() => {
    if (view !== 'review') return undefined
    const ids = allEvents.filter((event) => event.kind !== 'change').map((event) => event.id)
    if (ids.every((id) => readNoteIds.has(id))) return undefined
    let active = true
    queueMicrotask(() => { if (active) setReadNoteIds((previous) => new Set([...previous, ...ids])) })
    return () => { active = false }
  }, [view, allEvents, readNoteIds])
  useEffect(() => {
    if (view === 'work' && selectedId && preferences.lastTaskId !== selectedId) onPreferences({ lastTaskId: selectedId })
  }, [view, selectedId, preferences.lastTaskId, onPreferences])
  function clearFilters() { setQuery(''); setProject(''); setStatus('') }
  function navigate(next) { setError(''); onNavigate(next) }
  function choose(task) { if (task.status === 'done') { setDialog({ type: 'inspect', taskId: task.id }); return } setSelectedId(task.id); setChooserOpen(false); navigate('work') }
  const perform = useCallback(async (action, message = '', undoAction = null) => {
    if (busy) return null
    setBusy(true); setError('')
    try { const result = await action(); await refresh(); if (message) { setNotice(message); setUndo(() => undoAction) } return result ?? true } catch (failure) { await refresh().catch(() => {}); setError(failure.message); return null } finally { setBusy(false) }
  }, [busy, refresh])
  async function capture(event) {
    event.preventDefault()
    const value = captureRef.current.value.trim()
    if (!value) return
    const reference = safeReference(value)
    const created = await perform(async () => { const task = await workApi.createTask({ title: reference ? new URL(reference).pathname.slice(1) || new URL(reference).hostname : value, referenceUrl: reference, project }); if (view === 'tasks') capturedCardId.current = task.id; return task }, view === 'tasks' ? 'Added to Inbox. Open the card to organize it.' : 'Task created. Starting focus is optional.')
    if (created) { setUndo(() => () => perform(async () => { const active = await workApi.getActiveSession(); if (active?.taskId === created.id) throw new Error('Stop this task’s timer before undoing its creation.'); return workApi.deleteTask(created.id) }, 'Task creation undone.')); captureDraft.current = ''; if (captureRef.current) captureRef.current.value = ''; clearFilters(); if (view !== 'tasks') { setSelectedId(created.id); navigate('work') } }
  }
  async function start(id) {
    if (session || !id) return
    const created = await perform(() => workApi.createSession(id, preferences.focusMinutes * 60))
    if (created) setPanel(preferences.expand !== false && !matchMedia('(max-width: 760px)').matches ? 'normal' : 'compact')
  }
  const transition = useCallback(async (action) => {
    if (!session) return
    const result = await perform(() => workApi.transitionSession(session.id, action), action === 'end' ? 'Timer stopped. Your task stays unfinished.' : '')
    if (result && action === 'end') setPanel('compact')
    return result
  }, [session, perform])
  async function updateTask(task, changes) {
    if (changes.status === 'done' && session?.taskId === task.id) {
      await workApi.transitionSession(session.id, 'end')
      setPanel('compact')
    }
    return workApi.updateTask(task.id, changes)
  }
  async function move(task, nextStatus) {
    if (task.status === nextStatus) return
    const result = await perform(() => updateTask(task, { status: nextStatus }), `Moved to ${WORKBENCH_STATUSES.find(([key]) => key === nextStatus)[1]}.`, () => perform(() => workApi.updateTask(task.id, { status: task.status }), 'Move undone.'))
    if (result && nextStatus === 'done') setDialog({ type: 'completed', taskId: task.id, previousStatus: task.status })
  }
  async function saveTask(values) {
    const task = activeDialogTask
    const notes = values.note.trim() ? [...task.notes, { id: crypto.randomUUID(), text: values.note.trim(), createdAt: new Date().toISOString(), kind: 'note' }] : task.notes
    const result = await perform(() => updateTask(task, { title: values.title.trim(), project: values.project.trim(), nextStep: values.nextStep.trim(), referenceUrl: values.referenceUrl.trim(), status: values.status, notes }), 'Task saved.', () => perform(() => workApi.updateTask(task.id, { title: task.title, project: task.project, nextStep: task.nextStep, referenceUrl: task.referenceUrl, status: task.status, notes: task.notes }), 'Edit undone.'))
    if (result) { editorDrafts.current.delete(task.id); setDialog(values.status === 'done' && task.status !== 'done' ? { type: 'completed', taskId: task.id, previousStatus: task.status } : null) }
  }
  async function saveNote(event) {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.target))
    const text = values.note.trim()
    const nextStep = values.nextStep.trim()
    if (!text && nextStep === selected.nextStep) { setUndo(null); setNotice('No changes to save.'); return }
    const result = await perform(() => workApi.updateTask(selected.id, { nextStep, notes: text ? [...selected.notes, { id: crypto.randomUUID(), text, createdAt: new Date().toISOString(), kind: 'note' }] : selected.notes }), text ? 'Note saved.' : 'Next step updated.', () => perform(() => workApi.updateTask(selected.id, { nextStep: selected.nextStep, notes: selected.notes }), 'Note change undone.'))
    if (result) { drafts.current.delete(selected.id); event.target.elements.note.value = ''; event.target.elements.nextStep.value = nextStep }
  }
  async function saveClosingNote(text) {
    const task = activeDialogTask
    const notes = [...task.notes, { id: crypto.randomUUID(), text: text.trim(), createdAt: new Date().toISOString(), kind: 'note' }]
    const result = await perform(() => workApi.updateTask(task.id, { notes }), 'Note saved.', () => perform(() => workApi.updateTask(task.id, { notes: task.notes }), 'Note undone.'))
    if (result) { drafts.current.set(task.id, { ...drafts.current.get(task.id), note: '' }); setDialog(null) }
  }
  function saveProfile(next) { writeProfile(localStorage, next); onProfile(next); setDialog(null); setUndo(null); setNotice('Profile saved locally.') }
  function finishDrag() {
    if (drag.current?.frame) cancelAnimationFrame(drag.current.frame)
    drag.current?.ghost?.remove(); drag.current = null; setDraggingId(null); setDropTarget(null)
  }
  function dragStart(event, task) {
    if (event.button !== 0 || !event.isPrimary || busy) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { task, x: event.clientX, y: event.clientY, pointerId: event.pointerId, moved: false, ghost: null }
    event.preventDefault()
  }
  function dragMove(event) {
    const current = drag.current
    if (!current) return
    if (!current.moved && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 6) return
    if (!current.moved) {
      current.moved = true
      const card = event.currentTarget.closest('.wb-board-card')
      current.ghost = card.cloneNode(true); current.ghost.classList.add('wb-drag-ghost'); current.ghost.style.width = `${card.offsetWidth}px`; current.ghost.inert = true; current.ghost.setAttribute('aria-hidden', 'true'); root.current.append(current.ghost); setDraggingId(current.task.id)
    }
    current.ghost.style.left = `${event.clientX - 20}px`; current.ghost.style.top = `${event.clientY - 16}px`
    const lane = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-drop]')
    current.lane = lane; current.target = lane?.dataset.drop; current.lastY = event.clientY; setDropTarget(current.target || null)
    if (!current.frame) {
      const scroll = () => {
        if (!drag.current) return
        const area = drag.current.lane
        if (area) { const bounds = area.getBoundingClientRect(); const y = drag.current.lastY; if (y < bounds.top + 48) area.scrollTop -= 10; else if (y > bounds.bottom - 48) area.scrollTop += 10 }
        drag.current.frame = requestAnimationFrame(scroll)
      }
      current.frame = requestAnimationFrame(scroll)
    }
  }
  function dragEnd() { const current = drag.current; finishDrag(); if (current?.moved && current.target) void move(current.task, current.target) }
  function exportTasks() {
    void perform(async () => {
      const data = await workApi.exportWorkspace(); const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'pomogit-workspace.json'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    }, 'Workspace exported.')
  }
  const draft = drafts.current.get(selected?.id)
  const writtenNotes = selected?.notes.filter((note) => note.kind !== 'change') || []
  const lastNote = writtenNotes.at(-1)
  const completed = tasks.filter((task) => task.status === 'done')
  const featured = (profile.featuredIds || []).map((id) => completed.find((task) => task.id === id)).filter(Boolean)
  const featureDraft = dialog?.type === 'featured' ? dialog.ids : []
  const days = Array.from({ length: period }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - period + index + 1); const key = dateKey(date); const events = tasks.flatMap((task) => task.notes.map((note) => ({ ...note, task }))).filter((note) => dateKey(note.createdAt) === key); const focusedSessions = sessions.filter((session) => dateKey(session.startedAt) === key); const completions = events.filter((event) => event.task.status === 'done' && (event.kind === 'completion' || (event.kind === 'change' && event.text.endsWith('to done.')))); return { key, date, events, focusedSessions, completions } })
  const profileHue = PROFILE_ACCENTS[profile.accent] || PROFILE_ACCENTS.mint
  return <div ref={root} data-navigation={preferences.navigation} className={`premium-app ${preferences.density === 'compact' ? 'wb-compact' : ''} ${preferences.motion === 'reduced' ? 'wb-reduced' : ''} ${textEntry ? 'wb-text-entry' : ''}`} style={{ '--wb-timer-space': `${timerHeight ? timerHeight + 24 : 0}px`, '--wb-height': `${appHeight}px`, '--wb-profile-hue': profileHue }} onFocusCapture={(event) => { if (event.target.matches('input,textarea,select')) setTextEntry(true) }} onBlurCapture={() => requestAnimationFrame(() => setTextEntry(Boolean(root.current?.contains(document.activeElement) && document.activeElement?.matches('input,textarea,select'))))} onKeyDown={(event) => { if (event.key === 'Escape') { finishDrag(); root.current.querySelectorAll('details.wb-menu[open]').forEach((menu) => { menu.open = false; menu.querySelector('summary').focus() }) } }}>
    <a className="wb-skip" href="#wb-main" onClick={(event) => { event.preventDefault(); document.getElementById('wb-main').focus() }}>Skip to content</a>
    <header className="wb-topbar"><button className="wb-brand wb-ghost" onClick={() => navigate('work')} aria-label="Pomogit workspace"><img className="wb-brand-mark" src="/pomogit-logo.png" alt="" width="32" height="32" /><span>pomogit</span></button><details className="wb-menu wb-page-menu" name="wb-navigation"><summary aria-label="Switch page"><span className="wb-page-label">{createElement(PAGE_ICONS[view] || PanelsTopLeft, { size: 17, 'aria-hidden': true })}{LABELS[view]}</span><ChevronDown size={16} aria-hidden="true" /></summary><nav aria-label="Workspace pages">{[['work', PanelsTopLeft], ['tasks', Columns3], ['review', ListTree], ['profile', User], ...(admin ? [['admin', User]] : [])].map(([key, Icon]) => <button key={key} aria-current={view === key ? 'page' : undefined} onClick={(event) => { event.currentTarget.closest('details').open = false; event.currentTarget.closest('details').querySelector('summary').focus(); navigate(key) }}><span className="wb-nav-copy"><span className="wb-nav-heading">{createElement(Icon, { size: 18, 'aria-hidden': true })}<strong>{LABELS[key]}</strong>{['work', 'tasks', 'review'].includes(key) && (key !== 'review' || unread > 0) && <small className="wb-nav-badge">{key === 'work' ? `${tasks.filter((task) => task.status !== 'done').length} unfinished` : key === 'tasks' ? `${tasks.filter((task) => task.status === 'inbox').length} inbox` : `${unread} new`}</small>}</span><small>{PAGE_DESCRIPTIONS[key]}</small></span></button>)}</nav></details><nav className="wb-project-shortcuts" aria-label="Project shortcuts"><p>Projects</p>{projects.map((name) => <button key={name} aria-pressed={project === name} onClick={() => { setProject(project === name ? '' : name); if (view === 'profile') navigate('tasks') }}><Folder size={18} aria-hidden="true" /><span>{name}</span></button>)}{!projects.length && <p className="wb-muted">Add a project in the task editor.</p>}</nav><details name="wb-navigation" className={`wb-menu wb-account-menu ${view === 'profile' || ['profile', 'settings'].includes(dialog?.type) ? 'wb-account-current' : ''}`}><summary aria-label="Account menu" onPointerEnter={() => setAvatarReplay((value) => value + 1)} onFocus={() => setAvatarReplay((value) => value + 1)}><DitherAvatar name={`${profile.avatarKey || profile.displayName}:${profile.avatarSeed || 0}`} size={32} replayToken={avatarReplay} animate={preferences.motion !== 'reduced'} /><span className="wb-account-identity"><strong>{profile.displayName}</strong><small>Personal workspace</small></span></summary><nav aria-label="Account"><button onClick={(event) => { event.currentTarget.closest('details').open = false; navigate('profile') }}><span><User size={18} aria-hidden="true" />Profile</span>{view === 'profile' && <small>Current</small>}</button><button onClick={(event) => { event.currentTarget.closest('details').open = false; setDialog({ type: 'settings' }) }}><span><Settings size={18} aria-hidden="true" />Settings</span>{dialog?.type === 'settings' && <small>Open</small>}</button><button onClick={(event) => { event.currentTarget.closest('details').open = false; navigate('landing') }}>Product homepage<ArrowRight size={16} /></button><button onClick={(event) => { event.currentTarget.closest('details').open = false; if (session) setDialog({ type: 'logout' }); else onExit() }}>Log out</button><p>Local UI preview · auth disabled</p></nav></details></header>
    <main id="wb-main" className={`wb-main ${view === 'work' && taskList.length && !loading ? 'wb-main-workspace' : ''}`} tabIndex={-1}><div className="wb-content" key={view}>
      <div className="wb-heading"><h1>{LABELS[view]}</h1><span>{view === 'profile' ? 'Local profile · nothing published' : view === 'review' ? `${allEvents.length} work records` : tasks.length ? `${tasks.filter((task) => task.status !== 'done').length} unfinished` : 'A title or link is enough. Details can wait.'}</span></div>
      {['work', 'tasks'].includes(view) && <form className="wb-capture" onSubmit={capture}><input ref={captureRef} defaultValue={captureDraft.current} onInput={(event) => { captureDraft.current = event.currentTarget.value }} disabled={busy || loading} aria-label="Task title or reference link" placeholder={!tasks.length ? 'e.g. Fix the OAuth callback retry' : 'Task title or reference link'} aria-describedby={!tasks.length ? 'wb-first-task-help' : undefined} required /><button className={!tasks.length ? 'wb-primary' : ''} disabled={busy || loading}>Create task</button></form>}
      {view !== 'profile' && tasks.length > 0 && <section className="wb-filters" aria-label="Filter work"><div><label className="wb-search"><Search size={16} /><input ref={searchRef} aria-label="Search tasks" placeholder="Search tasks…" value={query} onChange={(event) => setQuery(event.target.value)} /><kbd aria-hidden="true">/</kbd></label><button className="wb-filter-toggle" aria-expanded={filtersOpen} aria-controls="wb-filter-selects" onClick={() => setFiltersOpen(!filtersOpen)}>Filters {Number(Boolean(project)) + Number(Boolean(status)) || ''}<ChevronDown size={14} /></button><div id="wb-filter-selects" className={filtersOpen ? 'is-open' : ''}><label>Project<select aria-label="Filter by project" value={project} onChange={(event) => setProject(event.target.value)}><option value="">All projects</option>{projects.map((value) => <option key={value}>{value}</option>)}</select></label><label>Status<select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{WORKBENCH_STATUSES.map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label></div><span>{view === 'review' ? `${allEvents.length} records` : `${view === 'work' ? taskList.length : filtered.length} tasks`}</span>{(query || project || status) && <button className="wb-ghost" onClick={clearFilters}>Reset</button>}<button className="wb-shortcuts wb-ghost" aria-label="Keyboard shortcuts" onClick={() => setDialog({ type: 'shortcuts' })}>?</button></div>{(query || project || status) && <div className="wb-filter-chips">{[[project, 'Project', setProject], [status && WORKBENCH_STATUSES.find(([key]) => key === status)[1], 'Status', setStatus], [query, 'Search', setQuery]].filter(([value]) => value).map(([value, label, change]) => <button key={label} onClick={() => change('')} aria-label={`Remove ${label}: ${value}`}>{label}: {value}<X size={13} /></button>)}</div>}</section>}
      {notice && <div className="wb-notice" role="status">{notice}{undo && <button className="wb-ghost" onClick={undo} disabled={busy}>Undo</button>}<button className="wb-ghost" aria-label="Dismiss notification" onClick={() => { setNotice(''); setUndo(null) }}><X size={15} /></button></div>}{error && <div className="wb-error" role="alert">{error}<button onClick={() => { setError(''); void refresh().catch((failure) => setError(failure.message)) }} disabled={busy}>Reload workspace</button></div>}
      {loading ? <div className="wb-loading" aria-busy="true">Loading your workspace…</div> : <>
        {view === 'work' && (taskList.length ? <div className="wb-layout"><details className="wb-task-chooser" open={chooserOpen || !matchMedia('(max-width: 760px)').matches} onToggle={(event) => { if (matchMedia('(max-width: 760px)').matches) setChooserOpen(event.currentTarget.open) }}><summary>Choose a task<span>{taskList.length} tasks<ChevronDown size={14} /></span></summary><p className="wb-label wb-list-heading">{status === 'done' ? 'Completed work' : 'Unfinished work'}</p><aside className="wb-task-list" aria-label="Task context">{taskList.map((task) => <button key={task.id} className="wb-task-row" aria-pressed={selected?.id === task.id} onClick={() => choose(task)}><strong>{task.title}</strong><p>{task.nextStep || task.notes.filter((note) => note.kind !== 'change').at(-1)?.text || 'No saved context yet'}</p><div className="wb-meta"><span><Folder size={15} />{task.project || 'No project'}</span><StatusLabel status={task.status} />{session?.taskId === task.id && <span className="wb-timer-label">{session.status === 'paused' ? <Pause size={13} aria-hidden="true" /> : <Clock size={13} aria-hidden="true" />}Timer {session.status === 'paused' ? 'paused' : 'running'}</span>}</div></button>)}</aside></details><article className="wb-detail" key={selected.id}><header><div><div className="wb-meta"><span><Folder size={15} aria-hidden="true" />{selected.project || 'No project'}</span><StatusLabel status={selected.status} />{session?.taskId === selected.id && <span className="wb-timer-label">{session.status === 'paused' ? <Pause size={13} aria-hidden="true" /> : <Clock size={13} aria-hidden="true" />}Timer {session.status === 'paused' ? 'paused' : 'running'}</span>}</div><h2>{selected.title}</h2></div><button className="wb-ghost" onClick={() => setDialog({ type: 'edit', taskId: selected.id })}><Pencil size={16} />Edit</button></header><div className="wb-detail-body"><section><p className="wb-label">Next step</p><p className="wb-next-step">{selected.nextStep || 'No next step saved. Add one whenever it helps.'}</p></section><div className="wb-actions">{!session && selected.status !== 'done' && <button className="wb-primary" onClick={() => start(selected.id)} disabled={busy}><PlayIcon />Start focus</button>}{safeReference(selected.referenceUrl) ? <a className="wb-button" href={safeReference(selected.referenceUrl)} target="_blank" rel="noreferrer">Open reference<ArrowRight size={16} /></a> : <button onClick={() => setDialog({ type: 'edit', taskId: selected.id })}><Link size={16} aria-hidden="true" />Add reference</button>}<button className="wb-ghost" onClick={() => { const field = noteRef.current; if (field) { field.closest('.wb-note-disclosure').open = true; field.focus() } noteRef.current?.scrollIntoView({ block: 'center' }) }}><Pencil size={16} />Add note</button></div><section className="wb-saved-context"><div><p className="wb-label">Where you left off</p><time>{lastNote ? readableDate(lastNote.createdAt) : 'No notes yet'}</time></div><p>{lastNote?.text || 'Nothing to record? Leave this empty and get on with your work.'}</p>{safeReference(selected.referenceUrl) && <a href={safeReference(selected.referenceUrl)} target="_blank" rel="noreferrer">{new URL(selected.referenceUrl).pathname}</a>}</section><details className="wb-note-disclosure" open={Boolean(draft?.note)}><summary>Write a note</summary><form className="wb-form wb-note-form" onSubmit={saveNote} onInput={(event) => drafts.current.set(selected.id, Object.fromEntries(new FormData(event.currentTarget)))}><label>Add a note · optional<textarea ref={noteRef} name="note" defaultValue={draft?.note || ''} placeholder="What would help you pick this up later?" /><small>Drafts stay while you switch tasks.</small></label><details><summary>Update the next step</summary><label>Next step<input name="nextStep" defaultValue={draft?.nextStep ?? selected.nextStep} /></label></details><button type="submit" disabled={busy}>Save note</button></form></details></div><footer><span>{selected.status === 'done' ? 'Completed task' : 'Done with this task?'}</span><button onClick={() => move(selected, selected.status === 'done' ? 'ready' : 'done')} disabled={busy}><CircleCheck size={16} aria-hidden="true" />{selected.status === 'done' ? 'Reopen task' : 'Mark done'}</button></footer></article></div> : <section className="wb-empty wb-work-empty" aria-label="Workspace guidance">
          <p className="wb-label">{!tasks.length ? 'Start here' : hasFilters ? 'Filtered workspace' : 'Work complete'}</p>
          <h2>{!tasks.length ? 'Create your first task' : hasFilters ? 'No matching work' : 'All caught up'}</h2>
          <p id={!tasks.length ? 'wb-first-task-help' : undefined}>{!tasks.length ? 'Give it a title or paste a reference link above. Add details later; starting a focus timer is optional.' : hasFilters ? `No ${status === 'done' ? 'completed' : 'unfinished'} tasks match these filters. Your tasks are still in Board.` : 'Every task is in Done. Review what you finished, or capture your next task when you’re ready.'}</p>
          <div className="wb-empty-actions">{tasks.length > 0 && hasFilters ? <button className="wb-primary" onClick={clearFilters}>Clear filters</button> : <button className="wb-primary" onClick={() => captureRef.current?.focus()}>{tasks.length ? 'Write the next task' : 'Write a task title'}</button>}<button onClick={() => { clearFilters(); if (tasks.length && !hasFilters) setStatus('done'); navigate('tasks') }}>{tasks.length && !hasFilters ? 'View completed work' : 'Open Board'}</button></div>
        </section>)}
        {view === 'tasks' && <>
          {!tasks.length && <section className="wb-empty wb-board-empty" aria-label="Board guidance"><p className="wb-label">Capture first. Organize next.</p><h2>Start with one task</h2><p id="wb-first-task-help">Add a title or link above. Open the new Inbox card to add details. Choose Open in Workspace when you’re ready to work.</p><button onClick={() => { captureDraft.current = 'Fix the OAuth callback retry'; captureRef.current.value = captureDraft.current; captureRef.current.focus() }}>Use example title</button></section>}
          {tasks.length > 0 && !filtered.length && <section className="wb-empty" aria-label="Board filter results"><h2>No matching tasks</h2><p>Your filters hide every card. Clear them to see your tasks again.</p><button className="wb-primary" onClick={clearFilters}>Clear filters</button></section>}
          <p className="wb-board-guide">Drag a card to another column, or use its Move to control.</p><div className="wb-board">{WORKBENCH_STATUSES.map(([key, label]) => <section key={key} className={`wb-lane ${dropTarget === key ? 'wb-drop-active' : ''}`} data-drop={key} tabIndex={0} aria-label={`${label} tasks`}><h3><StatusLabel status={key} /><span>{filtered.filter((task) => task.status === key).length}</span></h3>{filtered.filter((task) => task.status === key).map((task) => <article key={task.id} className={`wb-board-card ${draggingId === task.id ? 'wb-dragging' : ''}`} data-task={task.id}><div className="wb-board-project">{task.project || 'No project'}</div><span className="wb-grip" title="Drag this card to another column" onPointerDown={(event) => dragStart(event, task)} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={finishDrag}><GripVertical size={16} /></span><button className="wb-card-title" onClick={() => setDialog({ type: 'inspect', taskId: task.id })}><span>{task.title}</span></button>{task.nextStep && <p>{task.nextStep}</p>}{session?.taskId === task.id && <span className="wb-timer-label">{session.status === 'paused' ? <Pause size={13} aria-hidden="true" /> : <Clock size={13} aria-hidden="true" />}Timer {session.status === 'paused' ? 'paused' : 'running'}</span>}<label className="wb-move-control">Move to<select aria-label={`Status for ${task.title}`} value={task.status} disabled={busy} onChange={(event) => move(task, event.target.value)}>{WORKBENCH_STATUSES.map(([value, copy]) => <option key={value} value={value}>{copy}</option>)}</select></label></article>)}{!filtered.some((task) => task.status === key) && <p className="wb-lane-empty">{hasFilters ? 'No matches in this column' : LANE_HINTS[key]}</p>}</section>)}</div></>}
        {view === 'review' && <div className="wb-activity"><p className="wb-muted">Notes and task changes. Open a task to recover its context.</p>{allEvents.map((entry) => <article key={entry.id}><div className="wb-activity-meta"><time>{readableDate(entry.createdAt)}</time><span>{entry.task.project || 'No project'}</span><span>{entry.kind === 'change' ? 'Task changed' : entry.kind === 'completion' ? 'Completed' : 'Note saved'}</span></div><div><button className="wb-activity-title" onClick={() => setDialog({ type: 'inspect', taskId: entry.task.id })}>{entry.task.title}<ArrowRight size={17} /></button><p>{entry.text}</p><StatusLabel status={entry.task.status} /></div></article>)}{!allEvents.length && <section className="wb-empty" aria-label="Activity guidance"><p className="wb-label">{tasks.length ? 'Filtered history' : 'Your work history'}</p><h2>{tasks.length ? 'No matching activity' : 'Your work will leave a trail here'}</h2><p>{tasks.length ? 'No task changes or notes match these filters. Clear them to see your work history.' : 'Task creation, status changes, and saved notes appear here as you work. Start with a task in Board; there’s no need to write a note first.'}</p>{tasks.length ? <button className="wb-primary" onClick={clearFilters}>Clear filters</button> : <button className="wb-primary" onClick={() => { clearFilters(); navigate('tasks') }}>Open Board</button>}</section>}</div>}
        {view === 'profile' && <div className="wb-profile" style={{ '--wb-accent': `oklch(36% .065 ${profileHue})` }}><div className="wb-profile-toolbar"><span>{publicProfile ? 'Visitor preview · not published' : 'Private · not published'}</span><div>{!publicProfile && <button className="wb-ghost" onClick={() => setDialog({ type: 'profile' })}><Pencil size={16} />Edit profile</button>}<button aria-pressed={publicProfile} onClick={() => setPublicProfile(!publicProfile)}><User size={16} />{publicProfile ? 'Back to my profile' : 'Preview as visitor'}</button></div></div><section className="wb-profile-identity"><DitherAvatar name={`${profile.avatarKey || profile.displayName}:${profile.avatarSeed || 0}`} size={88} animate={preferences.motion !== 'reduced'} /><div><p>{profile.headline}</p><h2>{profile.displayName}</h2><p>{profile.bio || 'Choose the work you want to be known for.'}</p><div>{safeReference(profile.github) && <a href={safeReference(profile.github)} target="_blank" rel="noreferrer">GitHub<ArrowRight size={15} /></a>}{safeReference(profile.website) && <a href={safeReference(profile.website)} target="_blank" rel="noreferrer">Website<ArrowRight size={15} /></a>}</div></div></section><section className="wb-featured"><header><h2>Featured work</h2>{!publicProfile && <button className="wb-ghost" onClick={() => setDialog({ type: 'featured', ids: [...(profile.featuredIds || [])], descriptions: { ...(profile.featuredDescriptions || {}) } })}><Pencil size={16} />Choose featured work</button>}</header>{featured.map((task) => <article key={task.id}><div className="wb-meta"><span>{task.project || 'No project'}</span></div><h3>{task.title}</h3>{/* Public identity intentionally excludes private notes. */}<p>{profile.featuredDescriptions?.[task.id] || 'Completed work.'}</p>{safeReference(task.referenceUrl) && <a className="wb-button" href={safeReference(task.referenceUrl)} target="_blank" rel="noreferrer">Open reference<ArrowRight size={16} /></a>}</article>)}{!featured.length && <p className="wb-empty">{publicProfile ? 'No featured work selected.' : 'Choose up to three completed tasks to introduce your work.'}</p>}<p className="wb-muted">{publicProfile ? 'Selected by the developer.' : 'Only selected tasks appear in the visitor preview. Private notes stay private.'}</p>{!publicProfile && <details className="wb-private-work"><summary>More from my work history<span>{completed.filter((task) => !profile.featuredIds?.includes(task.id)).length} private</span></summary>{completed.filter((task) => !profile.featuredIds?.includes(task.id)).map((task) => <button key={task.id} onClick={() => setDialog({ type: 'inspect', taskId: task.id })}>{task.title}<ArrowRight size={15} /></button>)}</details>}</section>{(!publicProfile || profile.shareActivity) && <section className="wb-rhythm"><header><div><h2>Working rhythm</h2><p className="wb-muted">Days with focus sessions or completed tasks · local sample workspace</p></div><label>Period<select value={period} onChange={(event) => setPeriod(Number(event.target.value))}><option value={28}>Last 4 weeks</option><option value={84}>Last 12 weeks</option></select></label></header><div className="wb-rhythm-body"><div><div className="wb-heatmap-scroll"><div className="wb-heatmap" style={{ '--wb-weeks': period / 7 }}>{days.map((day) => <button key={day.key} data-level={Math.min(3, day.focusedSessions.length + day.completions.length)} aria-label={`${readableDate(day.date)}: ${day.focusedSessions.length} focus sessions, ${day.completions.length} completions`} title={`${day.key} · ${day.focusedSessions.length} focus sessions, ${day.completions.length} completions`} onClick={() => setDialog({ type: 'day', day })} />)}</div></div><p className="wb-muted">Select a day to see its activity.</p></div><div className="wb-profile-stats"><div><strong>{new Set(days.flatMap((day) => day.completions.map((event) => event.task.id))).size}</strong><span>Tasks completed</span></div><div><strong>{(days.flatMap((day) => day.focusedSessions).reduce((total, session) => total + (session.durationActualSeconds || 0), 0) / 3600).toFixed(1)} h</strong><span>Focus time</span></div><div><strong>{days.filter((day) => day.focusedSessions.length || day.completions.length).length}</strong><span>Active days</span></div></div></div>{!publicProfile && <label className="wb-check"><input type="checkbox" checked={Boolean(profile.shareActivity)} onChange={(event) => saveProfile({ ...profile, shareActivity: event.target.checked })} />Include activity in the visitor preview</label>}</section>}<footer className="wb-muted">Pomogit profile · local preview · nothing published</footer></div>}
        {view === 'admin' && admin}
      </>}
    </div></main>
    <FloatingFocus session={session} task={focused} selectedTask={selected} duration={preferences.focusMinutes * 60} panel={panel} onPanel={setPanel} onStart={start} onTransition={transition} onSelect={(id) => { clearFilters(); setSelectedId(id); navigate('work') }} busy={busy} hidden={!tasks.length || (!session && (!['work', 'tasks'].includes(view) || !selected || selected.status === 'done')) || (textEntry && matchMedia('(max-width: 760px)').matches)} onHeight={setTimerHeight} />
    {dialog?.type === 'edit' && activeDialogTask && <TaskEditor key={activeDialogTask.id} task={activeDialogTask} projects={projects} draft={editorDrafts.current.get(activeDialogTask.id)} onDraft={(values) => editorDrafts.current.set(activeDialogTask.id, values)} onSave={saveTask} onClose={() => setDialog(null)} busy={busy} serverError={error} />}
    {dialog?.type === 'inspect' && activeDialogTask && <TaskInspection task={activeDialogTask} onClose={() => setDialog(null)} onEdit={() => setDialog({ type: 'edit', taskId: activeDialogTask.id })} onWork={async () => { if (activeDialogTask.status === 'done') { const result = await perform(() => workApi.updateTask(activeDialogTask.id, { status: 'ready' })); if (!result) return } clearFilters(); setSelectedId(activeDialogTask.id); setDialog(null); navigate('work') }} busy={busy} />}
    {dialog?.type === 'completed' && activeDialogTask && <CompletionDialog task={activeDialogTask} hasNextTask={tasks.some((task) => task.status !== 'done')} busy={busy} onClose={() => setDialog(null)} onNote={() => setDialog({ type: 'note', taskId: activeDialogTask.id })} onNext={() => { setDialog(null); clearFilters(); setSelectedId(tasks.find((task) => task.status !== 'done')?.id || null); setChooserOpen(tasks.some((task) => task.status !== 'done')); navigate('work') }} onUndo={async () => { const result = await perform(() => workApi.updateTask(activeDialogTask.id, { status: dialog.previousStatus }), 'Completion undone.'); if (result) setDialog(null) }} />}
    {dialog?.type === 'note' && activeDialogTask && <TaskNoteDialog task={activeDialogTask} draft={drafts.current.get(activeDialogTask.id)?.note || ''} onDraft={(note) => drafts.current.set(activeDialogTask.id, { ...drafts.current.get(activeDialogTask.id), note })} onSave={saveClosingNote} onClose={() => setDialog(null)} busy={busy} serverError={error} />}
    {dialog?.type === 'profile' && <ProfileEditor profile={profile} reducedMotion={preferences.motion === 'reduced'} onSave={saveProfile} onClose={() => setDialog(null)} />}
    {dialog?.type === 'logout' && <Modal title="Leave your workspace?" onClose={() => setDialog(null)} footer={<><button onClick={() => setDialog(null)}>Keep working</button><button className="wb-primary" disabled={busy} onClick={async () => { if (await transition('end')) { setDialog(null); onExit() } }}>Stop timer and log out</button></>}><p>Your focus timer will stop. The task stays in progress, and your saved work remains in this local preview.</p></Modal>}
    {dialog?.type === 'settings' && <SettingsDialog preferences={preferences} onClose={() => setDialog(null)} onSave={(next) => { const saved = { ...preferences, ...next }; onPreferences(saved); setDialog(null); setUndo(null); setNotice('Settings saved. Session length applies to the next timer.') }} onExport={exportTasks} onProfile={() => { setDialog(null); navigate('profile') }} />}
    {dialog?.type === 'featured' && <Modal title="Choose featured work" onClose={() => setDialog(null)} footer={<><button onClick={() => setDialog(null)}>Cancel</button><button className="wb-primary" onClick={() => saveProfile({ ...profile, featuredIds: featureDraft, featuredDescriptions: dialog.descriptions })}>Save featured work</button></>}><p className="wb-muted">Select up to three completed tasks. Private notes are never shared.</p>{completed.map((task) => <div className="wb-feature-option" key={task.id}><label className="wb-check"><input type="checkbox" checked={featureDraft.includes(task.id)} disabled={!featureDraft.includes(task.id) && featureDraft.length >= 3} onChange={(event) => setDialog({ ...dialog, ids: event.target.checked ? [...featureDraft, task.id] : featureDraft.filter((id) => id !== task.id) })} />{task.title}</label>{featureDraft.includes(task.id) && <label className="wb-feature-summary">Public summary · optional<textarea value={dialog.descriptions?.[task.id] || ''} onChange={(event) => setDialog({ ...dialog, descriptions: { ...dialog.descriptions, [task.id]: event.target.value } })} maxLength={400} placeholder="Describe the outcome you want to share." /></label>}{featureDraft.includes(task.id) && <div><button aria-label={`Move ${task.title} earlier`} disabled={featureDraft.indexOf(task.id) === 0} onClick={() => { const ids = [...featureDraft]; const index = ids.indexOf(task.id); [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]; setDialog({ ...dialog, ids }) }}>↑</button><button aria-label={`Move ${task.title} later`} disabled={featureDraft.indexOf(task.id) === featureDraft.length - 1} onClick={() => { const ids = [...featureDraft]; const index = ids.indexOf(task.id); [ids[index + 1], ids[index]] = [ids[index], ids[index + 1]]; setDialog({ ...dialog, ids }) }}>↓</button></div>}</div>)}</Modal>}
    {dialog?.type === 'day' && <Modal title={readableDate(dialog.day.date)} onClose={() => setDialog(null)}><p>{dialog.day.focusedSessions.length} focus sessions · {dialog.day.completions.length} completed tasks</p>{!publicProfile ? <NoteHistory notes={dialog.day.events} /> : <p className="wb-muted">Private task titles and notes are excluded from this visitor preview.</p>}</Modal>}
    {dialog?.type === 'shortcuts' && <Modal title="Keyboard shortcuts" onClose={() => setDialog(null)}><p><kbd>/</kbd> Search tasks</p><p><kbd>N</kbd> Capture a task</p><p><kbd>?</kbd> Show shortcuts</p><p><kbd>Esc</kbd> Close menus and dialogs</p></Modal>}
  </div>
}
function PlayIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m8 5 11 7-11 7z" /></svg> }
