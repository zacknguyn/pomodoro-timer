import { createElement, lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Home, GitBranch, ChevronDown, Clock, CircleCheck, Folder, Link, Pause, MoreHorizontal, GripVertical, Columns3, ListTree, PanelsTopLeft, Pencil, Search, Settings, Trash2, User, X } from 'lucide-react'
import { DitherAvatar } from './dither-kit/DitherAvatar'
import { LOCAL_PREVIEW } from '../lib/runtime'
import { workApi, githubApi } from '../lib/workApi'
import { writeProfile } from '../lib/preferences'
import { CompletionDialog, FloatingFocus, Modal, ProfileEditor, SettingsDialog, StatusLabel, TaskEditor, TaskInspection, TaskDeleteDialog, TaskNoteDialog, } from './WorkbenchPanels'
import { WORKBENCH_STATUSES, readableDate, safeReference, captureTask } from '../lib/workbenchView'
import ActivityView from './ActivityView'
import ProfileView from './ProfileView'
import { buildActivityEvents } from '../lib/activity'
import GithubRepositoryDialog from './GithubRepositoryDialog'
import './Workbench.css'

const DashboardView = lazy(() => import('./DashboardView'))

const LABELS = { home: 'Home', work: 'Workspace', tasks: 'Board', review: 'Activity', profile: 'Profile', admin: 'Admin' }
const LANE_HINTS = { inbox: 'New tasks arrive here. Open a card to add details.', ready: 'Tasks you have organized and can pick up next.', progress: 'Starting focus moves a task here.', done: 'Finished tasks stay here with their notes.' }

export default function Workbench({ accountId, view, onNavigate, profile, onProfile, admin, preferences, onPreferences, onExit }) {
  const [tasks, setTasks] = useState([])
  const [githubProjects, setGithubProjects] = useState([])
  const [session, setSession] = useState(null)
  const [sessions, setSessions] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [undo, setUndo] = useState(null)
  const [error, setError] = useState('')
  // Filters belong to their page, so opening work does not erase Board context.
  const [filters, setFilters] = useState({})
  const { query = '', project = '', status = '' } = filters[view] || {}
  function setFilter(key, value, target = view) { setFilters((current) => ({ ...current, [target]: { ...current[target], [key]: value } })) }
  function setQuery(value, target = view) { setFilter('query', value, target) }
  function setProject(value, target = view) { setFilter('project', value, target) }
  function setStatus(value, target = view) { setFilter('status', value, target) }
  const [chooserOpen, setChooserOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [dialog, setDialog] = useState(null)
  const [panel, setPanel] = useState('compact')
  const [timerHeight, setTimerHeight] = useState(0)
  const [textEntry, setTextEntry] = useState(false)
  const [avatarReplay, setAvatarReplay] = useState(0)
  const [appHeight, setAppHeight] = useState(window.visualViewport?.height || window.innerHeight)
  const returnTaskId = useRef(preferences.lastTaskId)
  const capturedCardId = useRef(null)
  const drafts = useRef(new Map())
  const editorDrafts = useRef(new Map())
  const root = useRef(null)
  const boardScroll = useRef({ main: 0, lanes: {} })
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
    const [nextTasks, nextSession, entries, snapshot, connectedProjects] = await Promise.all([workApi.listTasks(), workApi.getActiveSession(), workApi.listReviewEntries(), workApi.exportWorkspace(), LOCAL_PREVIEW ? Promise.resolve([]) : githubApi.projects()])
    const hydrated = nextTasks.map((task) => {
      const history = entries.filter((entry) => entry.task.id === task.id)
      const notes = [...history.filter((entry) => entry.whatChanged).map((entry) => ({ id: entry.id, text: entry.whatChanged, createdAt: entry.createdAt, kind: entry.outcome === 'complete' ? 'completion' : 'note' })), ...(task.notes || [])]
      return { ...task, project: task.project || '', nextStep: task.nextStep ?? history[0]?.nextStep ?? '', notes: [...new Map(notes.map((note) => [note.id, note])).values()].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) }
    })
    setTasks(hydrated)
    setGithubProjects(connectedProjects)
    setSession(nextSession)
    setSessions(snapshot.focusSessions || snapshot.sessions || [])
    setSelectedId((current) => hydrated.find((task) => task.id === current && task.status !== 'done')?.id || hydrated.find((task) => task.id === nextSession?.taskId && task.status !== 'done')?.id || hydrated.find((task) => task.id === returnTaskId.current && task.status !== 'done')?.id || hydrated.find((task) => task.status !== 'done')?.id || null)
    return hydrated
  }, [])
  useEffect(() => {
    let active = true
    refresh().catch((failure) => { if (active) setError(failure.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [refresh])
  useEffect(() => {
    const resume = () => { if (document.visibilityState === 'visible') refresh().catch((failure) => setError(failure.message)) }
    window.addEventListener('focus', resume)
    document.addEventListener('visibilitychange', resume)
    return () => { window.removeEventListener('focus', resume); document.removeEventListener('visibilitychange', resume) }
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
      if (event.key.toLowerCase() === 'n' && view === 'home') { event.preventDefault(); setDialog({ type: 'capture' }) }
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
  const filtered = useMemo(() => tasks.filter((task) => (!project || (project === '__no_project__' ? !task.project : task.project === project)) && (!status || task.status === status) && `${task.title} ${task.project} ${task.nextStep} ${task.notes.map((note) => note.text).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())), [tasks, project, status, query])
  useEffect(() => {
    if (view !== 'tasks' || !capturedCardId.current) return
    const card = root.current?.querySelector(`[data-task="${CSS.escape(capturedCardId.current)}"] .wb-card-title`)
    if (card) { card.scrollIntoView({ block: 'nearest', behavior: 'auto' }); card.focus({ preventScroll: true }); capturedCardId.current = null }
  }, [filtered, view])
  const projects = [...new Set([...tasks.map((task) => task.project), ...githubProjects.map(item => item.fullName)].filter(Boolean))].sort()
  const taskList = filtered.filter((task) => status === 'done' || task.status !== 'done')
  const hasFilters = Boolean(query || project || status)
  const selected = taskList.find((task) => task.id === selectedId) || taskList[0] || null
  const focused = tasks.find((task) => task.id === session?.taskId)
  const timerLabel = session?.status === 'paused' ? session.remainingSeconds === 0 ? 'Time is up' : 'Timer paused' : 'Timer running'
  const homeTask = focused || tasks.find(task => task.id === selectedId && task.status !== 'done') || tasks.find(task => task.status !== 'done')
  const activeDialogTask = tasks.find((task) => task.id === dialog?.taskId)
  const allEvents = useMemo(() => buildActivityEvents(tasks, sessions), [tasks, sessions])
  const unread = tasks.flatMap((task) => task.notes).filter((note) => note.kind !== 'change' && new Date(note.createdAt).getTime() > unreadSince.current && !readNoteIds.has(note.id)).length
  useEffect(() => {
    if (view !== 'review') return undefined
    const ids = allEvents.filter((event) => event.noteId && event.kind !== 'change').map((event) => event.noteId)
    if (ids.every((id) => readNoteIds.has(id))) return undefined
    let active = true
    queueMicrotask(() => { if (active) setReadNoteIds((previous) => new Set([...previous, ...ids])) })
    return () => { active = false }
  }, [view, allEvents, readNoteIds])
  useEffect(() => {
    if (view === 'work' && selectedId && preferences.lastTaskId !== selectedId) onPreferences({ lastTaskId: selectedId })
  }, [view, selectedId, preferences.lastTaskId, onPreferences])
  useLayoutEffect(() => {
    if (view !== 'tasks' || loading) return
    const main = root.current?.querySelector('.wb-main')
    if (main) main.scrollTop = boardScroll.current.main
    root.current?.querySelectorAll('[data-drop]').forEach((lane) => { lane.scrollTop = boardScroll.current.lanes[lane.dataset.drop] || 0 })
    const card = boardScroll.current.taskId && root.current?.querySelector(`[data-task="${CSS.escape(boardScroll.current.taskId)}"] .wb-card-title`)
    if (card) card.focus({ preventScroll: true })
  }, [view, loading])
  useLayoutEffect(() => {
    if (view !== 'work') return
    const list = root.current?.querySelector('.wb-task-list')
    const row = list?.querySelector('[aria-pressed="true"]')
    if (!row || list.scrollHeight <= list.clientHeight) return
    const bounds = list.getBoundingClientRect(), item = row.getBoundingClientRect()
    const bottom = bounds.bottom - parseFloat(getComputedStyle(list).paddingBottom)
    if (item.top < bounds.top) list.scrollTop += item.top - bounds.top
    else if (item.bottom > bottom) list.scrollTop += item.bottom - bottom
  }, [view, selected?.id, timerHeight, chooserOpen])
  function rememberBoardScroll(event) {
    if (view !== 'tasks') return
    const element = event.target
    if (element.classList.contains('wb-main')) boardScroll.current.main = element.scrollTop
    if (element.dataset.drop) boardScroll.current.lanes[element.dataset.drop] = element.scrollTop
  }
  function retryHistory() { setError(''); setLoading(true); void refresh().catch(failure => setError(failure.message)).finally(() => setLoading(false)) }
  function clearFilters(target = view) { setFilters(current => ({ ...current, [target]: {} })) }
  function navigate(next) { setError(''); root.current?.querySelectorAll('details.wb-menu[open]').forEach(menu => { menu.open = false }); onNavigate(next) }
  function closeMenu(event) {
    const menu = event.currentTarget.closest('details')
    menu.open = false
    menu.querySelector('summary').focus()
  }
  function cancelCapture() { captureDraft.current = ''; setDialog(null) }
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
    const input = captureTask(value, project === '__no_project__' ? '' : project)
    const created = await perform(async () => { const task = await workApi.createTask(input); if (view === 'tasks') capturedCardId.current = task.id; return task }, input.referenceUrl ? 'Saved as a task reference. Repository links do not import issues.' : view === 'tasks' ? 'Added to Inbox. Open the card to organize it.' : 'Task created. Starting focus is optional.')
    if (created) { if (dialog?.type === 'capture') setDialog(null); setUndo(() => () => perform(async () => { const active = await workApi.getActiveSession(); if (active?.taskId === created.id) throw new Error('Stop this task’s timer before undoing its creation.'); return workApi.deleteTask(created.id) }, 'Task creation undone.')); captureDraft.current = ''; if (captureRef.current) captureRef.current.value = ''; clearFilters(); if (view !== 'tasks') { setSelectedId(created.id); navigate('work') } }
  }
  async function start(id) {
    if (session || !id) return
    const created = await perform(() => workApi.createSession(id, preferences.focusMinutes * 60))
    if (created) setPanel(preferences.expand !== false && !matchMedia('(max-width: 760px)').matches ? 'normal' : 'compact')
  }
  const transition = useCallback(async (action) => {
    if (!session) return
    const result = await perform(() => workApi.transitionSession(session.id, action), action === 'end' ? 'Focus session saved. Mark done in Workspace when the task is finished.' : '')
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
  function confirmDelete(task, returnTo = null) { setError(''); setDialog({ type: 'delete', taskId: task.id, returnTo }) }
  async function deleteTask() {
    const task = activeDialogTask
    const result = await perform(async () => {
      const active = await workApi.getActiveSession()
      if (active?.taskId === task.id) throw new Error('Stop this task’s timer before deleting it.')
      return workApi.deleteTask(task.id)
    }, 'Task deleted.')
    if (!result) return
    drafts.current.delete(task.id); editorDrafts.current.delete(task.id)
    if (preferences.lastTaskId === task.id) onPreferences({ lastTaskId: null })
    if (profile.featuredIds?.includes(task.id)) {
      const next = { ...profile, featuredIds: profile.featuredIds.filter((id) => id !== task.id), featuredDescriptions: Object.fromEntries(Object.entries(profile.featuredDescriptions || {}).filter(([id]) => id !== task.id)) }
      onProfile(next)
      try { writeProfile(localStorage, next, accountId) } catch { /* The deleted task is already removed from the current profile. */ }
    }
    setDialog(null)
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
  function saveProfile(next) { writeProfile(localStorage, next, accountId); onProfile(next); setDialog(null); setUndo(null); setNotice('Profile saved locally.') }
  async function leave() {
    if (busy) return
    setBusy(true); setError('')
    try { await onExit() } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }
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
      current.ghost = card.cloneNode(true); current.ghost.querySelector('select').value = card.querySelector('select').value; current.ghost.classList.add('wb-drag-ghost'); current.ghost.style.width = `${card.offsetWidth}px`; current.ghost.inert = true; current.ghost.setAttribute('aria-hidden', 'true'); root.current.append(current.ghost); setDraggingId(current.task.id)
    }
    current.ghost.style.left = `${event.clientX - 20}px`; current.ghost.style.top = `${event.clientY - 16}px`
    const lane = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-drop]')
    current.lane = lane; current.target = lane?.dataset.drop; current.lastY = event.clientY; setDropTarget(current.target !== current.task.status ? current.target || null : null)
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
  const featureDraft = dialog?.type === 'featured' ? dialog.ids : []
  const statusFilter = <label className="wb-filter-status"><span className="wb-filter-label">Status</span><select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{WORKBENCH_STATUSES.map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
  const dockFocus = view === 'work' && taskList.length > 0 && !loading
  const firstUse = view === 'work' && !tasks.length && !loading
  const captureForm = <form id="wb-capture-task" className={`wb-capture${firstUse ? ' wb-first-use-capture' : ''}`} onSubmit={capture}><input ref={captureRef} defaultValue={captureDraft.current} onInput={(event) => { captureDraft.current = event.currentTarget.value }} disabled={busy || loading} aria-label="Task title or reference link" placeholder={firstUse || tasks.length ? 'Task title or reference link' : 'e.g. Fix the OAuth callback retry'} aria-describedby={!tasks.length ? 'wb-first-task-help' : undefined} required /><button className={!tasks.length ? 'wb-primary' : ''} disabled={busy || loading}>Create task</button></form>
  const focusPanel = <FloatingFocus session={session} task={focused} selectedTask={selected} duration={preferences.focusMinutes * 60} panel={panel} onPanel={setPanel} onStart={start} onTransition={transition} onSelect={(id) => { clearFilters('work'); setSelectedId(id); navigate('work') }} busy={busy} hidden={!tasks.length || (!session && (view !== 'work' || !selected || selected.status === 'done')) || (textEntry && matchMedia('(max-width: 760px)').matches)} onHeight={setTimerHeight} />
  const projectLinks = <>
    <button aria-current={view === 'tasks' && !project ? 'true' : undefined} onClick={(event) => { closeMenu(event); setProject('', 'tasks'); navigate('tasks') }}><Folder size={18} aria-hidden="true" />All projects</button>
    {projects.map((name) => <button key={name} aria-current={view === 'tasks' && project === name ? 'true' : undefined} onClick={(event) => { closeMenu(event); setProject(name, 'tasks'); navigate('tasks') }}><Folder size={18} aria-hidden="true" /><span>{name}</span></button>)}
    {!projects.length && <p>Add a project in the task editor.</p>}
  </>
  return <div ref={root} data-navigation={preferences.navigation} className={`premium-app ${preferences.density === 'compact' ? 'wb-compact' : ''} ${preferences.motion === 'reduced' ? 'wb-reduced' : ''} ${textEntry ? 'wb-text-entry' : ''}`} style={{ '--wb-timer-space': `${!dockFocus && timerHeight ? timerHeight + 24 : 0}px`, '--wb-height': `${appHeight}px` }} onFocusCapture={(event) => { if (event.target.matches('input,textarea,select')) setTextEntry(true) }} onBlurCapture={() => requestAnimationFrame(() => setTextEntry(Boolean(root.current?.contains(document.activeElement) && document.activeElement?.matches('input,textarea,select'))))} onKeyDown={(event) => { if (event.key === 'Escape') { finishDrag(); root.current.querySelectorAll('details.wb-menu[open]').forEach((menu) => { menu.open = false; menu.querySelector('summary').focus() }) } }}>
    <p className="wb-sr-only" role="status" aria-atomic="true">{LABELS[view]} page</p>
    <a className="wb-skip" href="#wb-main" onClick={(event) => { event.preventDefault(); document.getElementById('wb-main').focus() }}>Skip to content</a>
    <header className="wb-topbar">
      <button className="wb-brand wb-ghost" onClick={() => navigate('home')} aria-label="Pomogit home" data-tip="Pomogit home"><img className="wb-brand-mark" src="/pomogit-logo.png" alt="" width="32" height="32" /><span>pomogit</span></button>
      <nav className="wb-page-links" aria-label="Workspace pages">
        {[[ 'home', Home ],[ 'work', PanelsTopLeft ],[ 'tasks', Columns3 ],[ 'review', ListTree ]].map(([key, Icon]) => <button key={key} aria-label={LABELS[key]} aria-current={view === key ? 'page' : undefined} onClick={() => navigate(key)} data-tip={LABELS[key]}>
          {createElement(Icon, { size: 21, 'aria-hidden': true })}<span>{LABELS[key]}</span>{key === 'review' && unread > 0 && <small className="wb-unread-dot" aria-label={`${unread} new notes`} />}
        </button>)}
      </nav>
      <details className="wb-menu wb-project-menu" name="wb-navigation">
        <summary aria-label="Projects" data-tip="Projects"><Folder size={21} aria-hidden="true" /><span>Projects</span><ChevronDown size={14} className="wb-project-chevron" aria-hidden="true" /></summary>
        <nav aria-label="Projects"><p>Open a filtered Board</p>{projectLinks}</nav>
      </details>
      <div className="wb-navigation-footer">
        <button className="wb-nav-settings" aria-label="Settings" data-tip="Settings" onClick={() => setDialog({ type: 'settings' })}><Settings size={21} aria-hidden="true" /></button>
        <button className="wb-nav-profile" aria-label="Profile" data-tip="Profile" aria-current={view === 'profile' ? 'page' : undefined} onClick={() => navigate('profile')} onPointerEnter={() => setAvatarReplay((value) => value + 1)} onFocus={() => setAvatarReplay((value) => value + 1)}>
          <DitherAvatar name={`${profile.avatarKey || profile.displayName}:${profile.avatarSeed || 0}`} size={40} replayToken={avatarReplay} animate={avatarReplay > 0 && preferences.motion !== 'reduced'} /><span>Profile</span>
        </button>
        <details name="wb-navigation" className="wb-menu wb-more-menu">
          <summary aria-label="More navigation" data-tip="More" data-current={['profile', 'admin'].includes(view)}><MoreHorizontal size={21} aria-hidden="true" /><span>More</span></summary>
          <nav aria-label="More navigation">
            <div className="wb-mobile-account">
              <button onClick={(event) => { closeMenu(event); navigate('profile') }}><User size={18} aria-hidden="true" />Profile</button>
              <button onClick={(event) => { closeMenu(event); setDialog({ type: 'settings' }) }}><Settings size={18} aria-hidden="true" />Settings</button>
              <p>Projects</p>{projectLinks}
            </div>
            {admin && <button onClick={(event) => { closeMenu(event); navigate('admin') }}><User size={18} aria-hidden="true" />Admin</button>}
            <button onClick={(event) => { closeMenu(event); navigate('landing') }}>Product homepage<ArrowRight size={16} aria-hidden="true" /></button>
            <button onClick={(event) => { closeMenu(event); if (session) setDialog({ type: 'logout' }); else void leave() }}>Log out</button>
            <p>{profile.displayName} · {LOCAL_PREVIEW ? 'Local preview' : 'Your account'}</p>
          </nav>
        </details>
      </div>
    </header>
    <main onScrollCapture={rememberBoardScroll} id="wb-main" className={`wb-main ${view === 'home' ? 'wb-main-dashboard' : ''} ${view === 'work' && taskList.length && !loading ? 'wb-main-workspace' : ''}`} tabIndex={-1}><div className="wb-content" key={view}>
      {!['home', 'admin'].includes(view) && <div className="wb-heading">{view === 'work' && tasks.length > 0 && <button className="wb-ghost wb-back-board" onClick={() => navigate('tasks')}><ArrowLeft size={16} aria-hidden="true" />Back to Board</button>}<h1>{LABELS[view]}</h1>{view !== 'profile' && <span>{view === 'review' ? 'Private work history' : tasks.length ? `${tasks.filter((task) => task.status !== 'done').length} unfinished` : 'A title or link is enough. Details can wait.'}</span>}</div>}
      {!firstUse && !LOCAL_PREVIEW && ['work', 'tasks'].includes(view) && <button className="wb-connect-github" onClick={() => setDialog({ type: 'github' })}><GitBranch size={16} />{projects.length ? 'Manage projects' : 'Connect GitHub repository'}</button>}
      {!firstUse && ['work', 'tasks'].includes(view) && captureForm}
      {['work', 'tasks'].includes(view) && tasks.length > 0 && <section className={`wb-filters ${view === 'tasks' ? 'wb-filters-board' : ''}`} aria-label="Filter work"><div><label className="wb-search"><Search size={16} /><input ref={searchRef} aria-label="Search tasks" placeholder="Search tasks…" value={query} onChange={(event) => setQuery(event.target.value)} /><kbd aria-hidden="true">/</kbd></label><button className="wb-filter-toggle" aria-expanded={filtersOpen} aria-controls="wb-filter-selects" onClick={() => setFiltersOpen(!filtersOpen)}>Filters {Number(Boolean(project)) + Number(Boolean(status)) || ''}<ChevronDown size={14} /></button><div id="wb-filter-selects" className={filtersOpen ? 'is-open' : ''}><label><span className="wb-filter-label">Project</span><select aria-label="Filter by project" value={project} onChange={(event) => setProject(event.target.value)}><option value="">All projects</option><option value="__no_project__">No project</option>{projects.map((value) => <option key={value}>{value}</option>)}</select></label>{view !== 'tasks' && statusFilter}</div>{view === 'tasks' && statusFilter}<span>{view === 'review' ? `${allEvents.length} records` : `${view === 'work' ? taskList.length : filtered.length} tasks`}</span>{(query || project || status) && (view === 'tasks' ? filtered.length > 0 : taskList.length > 0) && <button className="wb-ghost" onClick={() => clearFilters()}>Clear filters</button>}<button className="wb-shortcuts wb-ghost" aria-label="Keyboard shortcuts" onClick={() => setDialog({ type: 'shortcuts' })}>?</button></div>{(query || project || status) && <div className="wb-filter-chips">{[[project === '__no_project__' ? 'No project' : project, 'Project', setProject], [status && WORKBENCH_STATUSES.find(([key]) => key === status)[1], 'Status', setStatus], [query, 'Search', setQuery]].filter(([value]) => value).map(([value, label, change]) => <button key={label} onClick={() => change('')} aria-label={`Remove ${label}: ${value}`}>{label}: {value}<X size={13} /></button>)}</div>}</section>}
      {notice && <div className="wb-notice" role="status">{notice}{undo && <button className="wb-ghost" onClick={undo} disabled={busy}>Undo</button>}<button className="wb-ghost" aria-label="Dismiss notification" onClick={() => { setNotice(''); setUndo(null) }}><X size={15} /></button></div>}{error && !['home', 'review', 'profile'].includes(view) && <div className="wb-error" role="alert">{error}<button onClick={() => { setError(''); void refresh().catch((failure) => setError(failure.message)) }} disabled={busy}>Reload workspace</button></div>}
      {loading && !['home', 'review', 'profile'].includes(view) ? <div className="wb-loading" aria-busy="true">Loading your workspace…</div> : <>
        {view === 'work' && (taskList.length ? <div className="wb-layout"><div className="wb-context-rail"><details className="wb-task-chooser" open={chooserOpen || !matchMedia('(max-width: 760px)').matches} onToggle={(event) => { if (matchMedia('(max-width: 760px)').matches) setChooserOpen(event.currentTarget.open) }}><summary>Choose a task<span>{taskList.length} tasks<ChevronDown size={14} /></span></summary><p className="wb-label wb-list-heading">{status === 'done' ? 'Completed work' : 'Unfinished work'}</p><aside className="wb-task-list" aria-label="Task context">{taskList.map((task) => <button key={task.id} className="wb-task-row" aria-pressed={selected?.id === task.id} onClick={() => choose(task)}><strong>{task.title}</strong><p>{task.nextStep || task.notes.filter((note) => note.kind !== 'change').at(-1)?.text || 'No saved context yet'}</p><div className="wb-meta"><span><Folder size={15} />{task.project || 'No project'}</span><StatusLabel status={task.status} />{session?.taskId === task.id && <span className="wb-timer-label">{session.status === 'paused' ? <Pause size={13} aria-hidden="true" /> : <Clock size={13} aria-hidden="true" />}{timerLabel}</span>}</div></button>)}</aside></details>{focusPanel}</div><article className="wb-detail" key={selected.id}><header><div><div className="wb-meta"><span><Folder size={15} aria-hidden="true" />{selected.project || 'No project'}</span><StatusLabel status={selected.status} />{session?.taskId === selected.id && <span className="wb-timer-label">{session.status === 'paused' ? <Pause size={13} aria-hidden="true" /> : <Clock size={13} aria-hidden="true" />}{timerLabel}</span>}</div><h2 data-long={selected.title.length > 96}>{selected.title}</h2>{selected.title.length > 96 && <details className="wb-full-title"><summary>Read full title</summary><p>{selected.title}</p></details>}</div><div className="wb-task-actions"><button className="wb-ghost" onClick={() => setDialog({ type: 'edit', taskId: selected.id })}><Pencil size={16} />Edit</button><button className="wb-danger wb-ghost" aria-label="Delete task" title="Delete task" onClick={() => confirmDelete(selected)} disabled={busy}><Trash2 size={16} /></button></div></header><div className="wb-detail-body">{session && focused && focused.id !== selected.id && <p className="wb-focus-other" role="status">Timer {session.status === 'paused' ? 'paused' : 'running'} for <strong>{focused.title}</strong>. Selecting a task doesn’t switch the timer.</p>}<section className="wb-next-action"><p className="wb-label">Next step</p><p className="wb-next-step">{selected.nextStep || 'No next step saved.'}</p>{!selected.nextStep && <button className="wb-ghost" onClick={() => setDialog({ type: 'edit', taskId: selected.id })}><Pencil size={14} aria-hidden="true" />Add next step</button>}</section><div className="wb-actions"><p className="wb-label wb-actions-label">Reference &amp; notes</p>{safeReference(selected.referenceUrl) ? <a className="wb-button" href={safeReference(selected.referenceUrl)} target="_blank" rel="noreferrer">Open reference<ArrowRight size={16} /></a> : <button onClick={() => setDialog({ type: 'edit', taskId: selected.id })}><Link size={16} aria-hidden="true" />Add reference</button>}<button className="wb-ghost" onClick={() => { const field = noteRef.current; if (field) { field.closest('.wb-note-disclosure').open = true; field.focus() } noteRef.current?.scrollIntoView({ block: 'center' }) }}><Pencil size={16} />Add note</button></div><section className="wb-saved-context"><div><p className="wb-label">Where you left off</p><time>{lastNote ? readableDate(lastNote.createdAt) : 'No notes yet'}</time></div><p>{lastNote?.text || 'Nothing to record? Leave this empty and get on with your work.'}</p>{safeReference(selected.referenceUrl) && <a href={safeReference(selected.referenceUrl)} target="_blank" rel="noreferrer">{new URL(selected.referenceUrl).pathname}</a>}</section><details className="wb-note-disclosure" open={Boolean(draft?.note)}><summary>Write a note</summary><form className="wb-form wb-note-form" onSubmit={saveNote} onInput={(event) => drafts.current.set(selected.id, Object.fromEntries(new FormData(event.currentTarget)))}><label>Add a note · optional<textarea ref={noteRef} name="note" defaultValue={draft?.note || ''} placeholder="What would help you pick this up later?" /><small>Drafts stay while you switch tasks.</small></label><details><summary>Update the next step</summary><label>Next step<input name="nextStep" defaultValue={draft?.nextStep ?? selected.nextStep} /></label></details><button type="submit" disabled={busy}>Save note</button></form></details></div><footer><span>{selected.status === 'done' ? 'Completed task' : session?.taskId === selected.id ? 'Mark done also stops and saves this task’s timer.' : 'Done with this task?'}</span><button onClick={() => move(selected, selected.status === 'done' ? 'ready' : 'done')} disabled={busy}><CircleCheck size={16} aria-hidden="true" />{selected.status === 'done' ? 'Reopen task' : 'Mark done'}</button></footer></article></div> : firstUse ? <section className="wb-work-empty wb-first-use" aria-label="Start your workspace">
          <h2>Start with one task</h2>
          <p className="wb-muted">Write something you want to do, or bring in a GitHub issue.</p>
          {captureForm}
          <p id="wb-first-task-help" className="wb-muted">Saved in Inbox. Add a project, next step, or notes later.</p>
          {!LOCAL_PREVIEW && <div className="wb-first-use-github">
            <h3>{projects.length ? 'Your connected projects are ready' : 'Already have work on GitHub?'}</h3>
            <p className="wb-muted">{projects.length ? 'Open your projects to import issues, or write a task above.' : 'Connect a public repository, then choose open issues to add as tasks.'}</p>
            <button disabled={busy} onClick={() => setDialog({ type: 'github' })}>{projects.length ? 'Manage projects' : 'Connect GitHub repository'}<ArrowRight size={16} aria-hidden="true" /></button>
          </div>}
          <p className="wb-first-use-hint">{!LOCAL_PREVIEW && 'Signing in doesn’t import anything. '}Choose a task before starting focus.</p>
        </section> : <section className="wb-empty wb-work-empty" aria-label="Workspace guidance">
          <p className="wb-label">{!tasks.length ? 'Start here' : hasFilters ? 'Filtered workspace' : 'Work complete'}</p>
          <h2>{!tasks.length ? 'Create your first task' : hasFilters ? 'No matching work' : 'All caught up'}</h2>
          <p id={!tasks.length ? 'wb-first-task-help' : undefined}>{!tasks.length ? 'Give it a title or paste a reference link above. Add details later; starting a focus timer is optional.' : hasFilters ? `No ${status === 'done' ? 'completed' : 'unfinished'} tasks match these filters. Your tasks are still in Board.` : 'Every task is in Done. Review what you finished, or capture your next task when you’re ready.'}</p>
          <div className="wb-empty-actions">{tasks.length > 0 && hasFilters ? <button className="wb-primary" onClick={() => clearFilters()}>Clear filters</button> : <button className="wb-primary" onClick={() => captureRef.current?.focus()}>{tasks.length ? 'Write the next task' : 'Write a task title'}</button>}<button onClick={() => { clearFilters('tasks'); if (tasks.length && !hasFilters) setStatus('done', 'tasks'); navigate('tasks') }}>{tasks.length && !hasFilters ? 'View completed work' : 'Open Board'}</button></div>
        </section>)}
        {view === 'tasks' && <>
          {!tasks.length && <section className="wb-empty wb-board-empty" aria-label="Board guidance"><p className="wb-label">Capture first. Organize next.</p><h2>Start with one task</h2><p id="wb-first-task-help">Add a title or link above. Open the new Inbox card to add details. Choose Work on this when you’re ready to work.</p><button onClick={() => { captureDraft.current = 'Fix the OAuth callback retry'; captureRef.current.value = captureDraft.current; captureRef.current.focus() }}>Use example title</button></section>}
          {tasks.length > 0 && !filtered.length && <section className="wb-empty" aria-label="Board filter results"><h2>No matching tasks</h2><p>Your filters hide every card. Clear them to see your tasks again.</p><button className="wb-primary" onClick={() => clearFilters()}>Clear filters</button></section>}
          <p className="wb-board-guide"><span className="wb-drag-guide">Drag cards between columns. </span>Change status with each card’s Move to control.</p><div className="wb-board" data-status={status}>{WORKBENCH_STATUSES.map(([key, label]) => <section key={key} className={`wb-lane ${dropTarget === key ? 'wb-drop-active' : ''}`} data-drop={key} data-match={status === key} tabIndex={0} aria-label={`${label} tasks`}><h3><StatusLabel status={key} /><span>{filtered.filter((task) => task.status === key).length}</span></h3>{dropTarget === key && <p className="wb-drop-hint" aria-live="polite">Release to move to {label}</p>}{filtered.filter((task) => task.status === key).map((task) => <article key={task.id} className={`wb-board-card ${draggingId === task.id ? 'wb-dragging' : ''}`} data-task={task.id} data-selected={task.id === preferences.lastTaskId && task.status !== 'done'}><div className="wb-board-project">{task.project || 'No project'}</div><span className="wb-grip" aria-hidden="true" title="Drag this card to another column" onPointerDown={(event) => dragStart(event, task)} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={finishDrag}><GripVertical size={16} /><span>Drag</span></span><button className="wb-card-title" title="View task details" aria-haspopup="dialog" onClick={() => { boardScroll.current.taskId = task.id; setDialog({ type: 'inspect', taskId: task.id }) }}><span>{task.title}</span></button>{task.nextStep && <p>{task.nextStep}</p>}{task.id === preferences.lastTaskId && task.status !== 'done' && <span className="wb-selected-work"><PanelsTopLeft size={13} aria-hidden="true" />Selected in Workspace</span>}{session?.taskId === task.id && <span className="wb-timer-label">{session.status === 'paused' ? <Pause size={13} aria-hidden="true" /> : <Clock size={13} aria-hidden="true" />}{timerLabel}</span>}<label className="wb-move-control">Move to<select aria-label={`Status for ${task.title}`} value={task.status} disabled={busy} onChange={(event) => move(task, event.target.value)}>{WORKBENCH_STATUSES.map(([value, copy]) => <option key={value} value={value}>{copy}</option>)}</select></label></article>)}{!filtered.some((task) => task.status === key) && <p className="wb-lane-empty">{hasFilters ? 'No matches in this column' : LANE_HINTS[key]}</p>}</section>)}</div></>}
        {view === 'home' && <Suspense fallback={<p role="status">Loading your dashboard…</p>}><DashboardView tasks={tasks} events={allEvents} loading={loading} error={error} preferences={preferences} nextTask={homeTask} timerStatus={focused ? session?.status : undefined} onConnect={LOCAL_PREVIEW ? undefined : () => setDialog({ type: 'github' })} onRetry={retryHistory} onCapture={() => setDialog({ type: 'capture' })} onContinue={() => { clearFilters('work'); setSelectedId(homeTask?.id); navigate('work') }} onBoard={values => { setFilters(current => ({ ...current, tasks: values })); navigate('tasks') }} onOpenTask={taskId => setDialog({ type: 'inspect', taskId })} onActivity={(selection = {}) => { setFilters(current => ({ ...current, review: { period: 'all', ...selection, origin: 'home' } })); navigate('review') }} period={filters.home?.period || 7} onPeriod={value => setFilter('period', value, 'home')} /></Suspense>}
        {view === 'review' && <ActivityView onHome={() => navigate('home')} events={allEvents} projects={projects} filters={filters.review || {}} onFilter={(key, value) => setFilter(key, value, 'review')} onClear={() => setFilters(current => ({ ...current, review: current.review?.origin === 'home' ? { origin: 'home', period: 'all' } : {} }))} loading={loading} error={error} searchRef={searchRef} onRetry={retryHistory} onOpenTask={taskId => setDialog({ type: 'inspect', taskId })} />}
        {view === 'profile' && <ProfileView loading={loading} onRetry={retryHistory} error={error} profile={profile} tasks={tasks} events={allEvents} preferences={preferences} onEdit={() => setDialog({ type: 'profile' })} onFeatured={() => setDialog({ type: 'featured', ids: (profile.featuredIds || []).filter(id => completed.some(task => task.id === id)).slice(0, 3), descriptions: { ...(profile.featuredDescriptions || {}) }, references: { ...(profile.featuredReferences || {}) } })} onSave={saveProfile} onOpenTask={taskId => setDialog({ type: 'inspect', taskId })} onActivity={() => navigate('review')} />}
        {view === 'admin' && admin}
      </>}
    </div></main>
    {!dockFocus && focusPanel}
    {dialog?.type === 'edit' && activeDialogTask && <TaskEditor key={activeDialogTask.id} task={activeDialogTask} projects={projects} draft={editorDrafts.current.get(activeDialogTask.id)} onDraft={(values) => editorDrafts.current.set(activeDialogTask.id, values)} onSave={saveTask} onClose={() => { if (!busy) { editorDrafts.current.delete(activeDialogTask.id); setError(''); setDialog(null) } }} busy={busy} serverError={error} />}
    {dialog?.type === 'inspect' && activeDialogTask && <TaskInspection focusActive={Boolean(session)} task={activeDialogTask} onDelete={() => confirmDelete(activeDialogTask, 'inspect')} onClose={() => setDialog(null)} onEdit={() => setDialog({ type: 'edit', taskId: activeDialogTask.id })} onWork={async () => { if (activeDialogTask.status === 'done') { const result = await perform(() => workApi.updateTask(activeDialogTask.id, { status: 'ready' })); if (!result) return } clearFilters('work'); setFiltersOpen(false); setChooserOpen(false); setSelectedId(activeDialogTask.id); setDialog(null); navigate('work') }} busy={busy} />}
    {dialog?.type === 'delete' && activeDialogTask && <TaskDeleteDialog task={activeDialogTask} blocked={session?.taskId === activeDialogTask.id} busy={busy} serverError={error} onDelete={deleteTask} onClose={() => { if (!busy) { setError(''); setDialog(dialog.returnTo ? { type: dialog.returnTo, taskId: activeDialogTask.id } : null) } }} onWork={() => { clearFilters('work'); setSelectedId(activeDialogTask.id); setDialog(null); navigate('work') }} />}
    {dialog?.type === 'completed' && activeDialogTask && <CompletionDialog task={activeDialogTask} hasNextTask={tasks.some((task) => task.status !== 'done')} busy={busy} onClose={() => setDialog(null)} onNote={() => setDialog({ type: 'note', taskId: activeDialogTask.id })} onNext={() => { setDialog(null); clearFilters('work'); setSelectedId(tasks.find((task) => task.status !== 'done')?.id || null); setChooserOpen(tasks.some((task) => task.status !== 'done')); navigate('work') }} onUndo={async () => { const result = await perform(() => workApi.updateTask(activeDialogTask.id, { status: dialog.previousStatus }), 'Completion undone.'); if (result) { setSelectedId(activeDialogTask.id); setDialog(null) } }} />}
    {dialog?.type === 'note' && activeDialogTask && <TaskNoteDialog task={activeDialogTask} draft={drafts.current.get(activeDialogTask.id)?.note || ''} onDraft={(note) => drafts.current.set(activeDialogTask.id, { ...drafts.current.get(activeDialogTask.id), note })} onSave={saveClosingNote} onClose={() => setDialog(null)} busy={busy} serverError={error} />}
    {dialog?.type === 'profile' && <ProfileEditor profile={profile} reducedMotion={preferences.motion === 'reduced'} onSave={saveProfile} onClose={() => setDialog(null)} />}
    {dialog?.type === 'logout' && <Modal busy={busy} title="Leave your workspace?" onClose={() => setDialog(null)} footer={<><button disabled={busy} onClick={() => setDialog(null)}>Keep working</button><button className="wb-primary" disabled={busy} onClick={() => void leave()}>Log out</button></>}><p>Your timer and saved work stay available. Sign back in to pick up where you left off.</p></Modal>}
    {dialog?.type === 'settings' && <SettingsDialog preferences={preferences} onClose={() => setDialog(null)} onSave={(next) => { const saved = { ...preferences, ...next }; onPreferences(saved); setDialog(null); setUndo(null); setNotice('Settings saved. Session length applies to the next timer.') }} onExport={exportTasks} onProfile={() => { setDialog(null); navigate('profile') }} />}
    {dialog?.type === 'featured' && <Modal title="Choose featured work" onClose={() => setDialog(null)} footer={<><button onClick={() => setDialog(null)}>Cancel</button><button className="wb-primary" onClick={() => saveProfile({ ...profile, featuredIds: featureDraft, featuredDescriptions: dialog.descriptions, featuredReferences: dialog.references })}>Save featured work</button></>}><p className="wb-muted">Select up to three completed tasks. Private notes are never copied into your public description.</p><p className="wb-muted" role="status">{featureDraft.length} of 3 selected</p>{!completed.length && <p className="wb-muted">No completed tasks yet.</p>}{completed.map((task) => <div className="wb-feature-option" key={task.id}><label className="wb-check"><input type="checkbox" checked={featureDraft.includes(task.id)} disabled={!featureDraft.includes(task.id) && featureDraft.length >= 3} onChange={(event) => setDialog({ ...dialog, ids: event.target.checked ? [...featureDraft, task.id] : featureDraft.filter((id) => id !== task.id) })} />{task.title}</label>{featureDraft.includes(task.id) && <label className="wb-feature-summary">Public description · optional<textarea value={dialog.descriptions?.[task.id] || ''} onChange={(event) => setDialog({ ...dialog, descriptions: { ...dialog.descriptions, [task.id]: event.target.value } })} maxLength={400} placeholder="Describe the outcome you want to share." /></label>}{featureDraft.includes(task.id) && safeReference(task.referenceUrl) && <label className="wb-check wb-feature-reference"><input type="checkbox" checked={Boolean(dialog.references?.[task.id])} onChange={event => setDialog({ ...dialog, references: { ...dialog.references, [task.id]: event.target.checked } })} />Include reference link in visitor preview</label>}{featureDraft.includes(task.id) && <div><button aria-label={`Move ${task.title} earlier`} disabled={featureDraft.indexOf(task.id) === 0} onClick={() => { const ids = [...featureDraft]; const index = ids.indexOf(task.id); [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]; setDialog({ ...dialog, ids }) }}>↑</button><button aria-label={`Move ${task.title} later`} disabled={featureDraft.indexOf(task.id) === featureDraft.length - 1} onClick={() => { const ids = [...featureDraft]; const index = ids.indexOf(task.id); [ids[index + 1], ids[index]] = [ids[index], ids[index + 1]]; setDialog({ ...dialog, ids }) }}>↓</button></div>}</div>)}</Modal>}
    {dialog?.type === 'github' && <GithubRepositoryDialog projects={githubProjects} projectNames={projects} tasks={tasks} onViewTasks={(name) => { clearFilters('tasks'); setProject(name, 'tasks'); setDialog(null); navigate('tasks') }} onRemoved={async (name, result) => { setGithubProjects(current => current.filter(item => item.fullName !== name)); setTasks(current => current.map(task => task.project === name ? { ...task, project: '' } : task)); setFilters((current) => Object.fromEntries(Object.entries(current).map(([page, values]) => [page, values.project === name ? { ...values, project: '' } : values]))); setNotice(`Project removed. ${result.tasksKept} tasks kept without a project.`); setUndo(null); await refresh().catch(failure => setError(failure.message)) }} onClose={() => setDialog(null)} onConnected={item => setGithubProjects(current => [...current.filter(existing => existing.id !== item.id), item])} onImported={async (item, result) => { await refresh(); clearFilters('tasks'); setProject(item.fullName, 'tasks'); navigate('tasks'); setNotice(`${result.imported} issues imported into Inbox.${result.skipped ? ` ${result.skipped} already imported.` : ''}`); setUndo(null); setDialog(null) }} />}
    {dialog?.type === 'capture' && <Modal title="New task" busy={busy} onClose={cancelCapture} footer={<><button disabled={busy} onClick={cancelCapture}>Cancel</button><p className="wb-muted">A title or link is enough. Details can wait.</p></>}>{!tasks.length && <p id="wb-first-task-help">Add a title or reference link to begin.</p>}{captureForm}{error && <p className="wb-error" role="alert">{error}</p>}</Modal>}
    {dialog?.type === 'shortcuts' && <Modal title="Keyboard shortcuts" onClose={() => setDialog(null)}><p><kbd>/</kbd> Search tasks</p><p><kbd>N</kbd> Capture a task</p><p><kbd>?</kbd> Show shortcuts</p><p><kbd>Esc</kbd> Close menus and dialogs</p></Modal>}
  </div>
}
