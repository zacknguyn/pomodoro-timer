import { createElement, useEffect, useState } from 'react'
import {
  ArrowRight,
  Check,
  CirclePause,
  CirclePlay,
  Download,
  Eraser,
  ExternalLink,
  GitCommitHorizontal,
  GitPullRequest,
  History as HistoryIcon,
  Home,
  ListTodo,
  MoreHorizontal,
  Moon,
  MousePointer2,
  Pencil,
  Pin,
  Plus,
  Search,
  Settings as SettingsIcon,
  Square,
  StickyNote,
  Sun,
  Trash2,
} from 'lucide-react'
import {
  createRunningSession,
  formatClock,
  getElapsedMs,
  getRemainingMs,
  pauseSession,
  resumeSession,
} from './lib/focusMath'
import {
  DEFAULT_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  clampSidebarWidth,
} from './lib/sidebar'
import { resolveInitialView } from './lib/navigation'
import { createTask, migrateStore, moveTask, safeExternalUrl } from './lib/workspace'

const STORAGE_KEY = 'stillpoint.local.v1'
const WORKSPACE_KEY = 'pomogit.workspace.opened'
const SIDEBAR_WIDTH_KEY = 'pomogit.sidebar.width'
const SHORTCUTS_KEY = 'pomogit.shortcuts.v1'
const DURATION_OPTIONS = [15, 25, 45, 60]

function readStore() {
  try {
    return migrateStore(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {})
  } catch {
    return migrateStore()
  }
}

const DEFAULT_SHORTCUTS = [
  { type: 'action', id: 'new' },
  { type: 'action', id: 'focus' },
  { type: 'page', id: 'canvas' },
]

function readShortcuts() {
  try {
    const shortcuts = JSON.parse(localStorage.getItem(SHORTCUTS_KEY))
    return Array.isArray(shortcuts) && shortcuts.length === 3 ? shortcuts : DEFAULT_SHORTCUTS
  } catch {
    return DEFAULT_SHORTCUTS
  }
}

function readSidebarWidth() {
  return clampSidebarWidth(localStorage.getItem(SIDEBAR_WIDTH_KEY) || DEFAULT_SIDEBAR_WIDTH)
}

function withDevPreview(store) {
  if (!import.meta.env.DEV) return store
  const preview = new URLSearchParams(window.location.search).get('preview')
  const currentTime = Date.now()
  if (preview === 'focus') {
    const task = createTask({ objective: 'Fix the OAuth callback retry', reference: 'https://github.com/example/repo/issues/42', durationMinutes: 25 }, 'focus', 'preview-focus-task')
    const active = { ...createRunningSession(task, currentTime - 7 * 60_000), taskId: task.id }
    return { ...store, tasks: [task, ...store.tasks.filter((item) => item.id !== task.id)], active, completed: null }
  }
  if (preview === 'evidence') {
    const task = createTask({ objective: 'Fix the OAuth callback retry', durationMinutes: 25 }, 'focus', 'preview-evidence-task')
    const completed = { ...createRunningSession(task, currentTime - 25 * 60_000), taskId: task.id }
    return { ...store, tasks: [task, ...store.tasks.filter((item) => item.id !== task.id)], active: null, completed: { ...completed, elapsedMs: completed.durationMs } }
  }
  if (preview === 'history' || preview === 'worklog') {
    return {
      ...store,
      active: null,
      completed: null,
      history: [
        { id: 'preview-1', objective: 'Fix the OAuth callback retry', elapsedMs: 25 * 60_000, endedAt: currentTime, evidenceType: 'commit', evidence: '8f3ca2d', note: 'Add the integration test next.' },
        { id: 'preview-2', objective: 'Review pull request #84', elapsedMs: 18 * 60_000, endedAt: currentTime - 86_400_000, evidenceType: 'pull-request', evidence: 'github.com/pomogit/pull/84', note: '' },
        { id: 'preview-3', objective: 'Document the session recovery model', elapsedMs: 31 * 60_000, endedAt: currentTime - 172_800_000, evidenceType: 'note', evidence: 'Recovery uses an absolute deadline and exact paused remainder.', note: '' },
      ],
    }
  }
  return store
}

function initialView(store) {
  return resolveInitialView({
    requested: window.location.hash.slice(1),
    hasSession: Boolean(store.active || store.completed),
    workspaceOpened: Boolean(localStorage.getItem(WORKSPACE_KEY)),
  })
}

function Brand({ compact = false }) {
  return (
    <span className={`brand ${compact ? 'brand-compact' : ''}`}>
      <span className="brand-seed" aria-hidden="true"><i /><i /><i /></span>
      <span>pomogit</span>
    </span>
  )
}

function ThemeButton({ theme, onToggle }) {
  return (
    <button className="theme-button" type="button" onClick={onToggle} aria-label={`Use ${theme === 'dark' ? 'light' : 'dark'} theme`}>
      {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  )
}

function ProductPreview() {
  return (
    <div className="product-stage" aria-label="Preview of the Pomogit workspace overview">
      <div className="product-window">
        <div className="preview-bar"><Brand compact /><span>Home</span></div>
        <div className="preview-body">
          <div className="preview-nav"><i /><i /><i /></div>
          <div className="preview-content">
            <span className="preview-kicker">HOME · YOUR OVERVIEW</span>
            <h2>See everything. Move one thing.</h2>
            <div className="preview-next">
              <div><span>Next outcome</span><strong>Fix the OAuth callback retry</strong></div>
              <span className="preview-time">25:00</span>
            </div>
            <div className="preview-row"><span>Inbox · Review pull request #84</span><small>15 min</small></div>
            <div className="preview-row"><span>Ready · Document session recovery</span><small>25 min</small></div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Landing({ theme, onTheme, onEnter }) {
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <Brand />
        <nav aria-label="Landing navigation"><a href="#method">Method</a><a href="#local">Local first</a></nav>
        <div className="nav-actions"><ThemeButton theme={theme} onToggle={onTheme} /><button className="nav-cta" type="button" onClick={onEnter}>Open workspace</button></div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="hero-copy reveal" style={{ '--delay': '0ms' }}>
            <span className="hero-sprig" aria-hidden="true"><i /><i /><i /><i /></span>
            <span className="hero-label">A visual workspace for focused work</span>
            <h1>Keep work visible. Finish one thing.</h1>
            <p>Collect tasks on a board, think freely on a canvas, and enter focus only when one outcome is ready.</p>
            <button className="hero-action" type="button" onClick={onEnter}>Open your local workspace <ArrowRight size={18} /></button>
            <span className="local-note">No account. Nothing leaves this browser.</span>
          </div>
          <ol className="sprout-points reveal" style={{ '--delay': '120ms' }}>
            <li><span aria-hidden="true">⌂</span><strong>Useful overview</strong><p>See what is active, next, and recently completed.</p></li>
            <li><span aria-hidden="true">▦</span><strong>Kanban board</strong><p>Move tasks from inbox to ready, focus, and done.</p></li>
            <li><span aria-hidden="true">✎</span><strong>Working canvas</strong><p>Move task pins, write notes, and draw connections.</p></li>
            <li><span aria-hidden="true">◉</span><strong>Focus and proof</strong><p>Protect one task, then record what actually changed.</p></li>
          </ol>
        </section>

        <section className="demo-section">
          <div className="demo-copy"><span>One connected workspace</span><h2>Start with the whole picture.</h2><p>Home summarizes. Board organizes. Canvas helps you think. Focus handles the task in front of you.</p></div>
          <ProductPreview />
        </section>

        <section className="method-section" id="method">
          <p className="section-index">01 / THE METHOD</p>
          <div className="method-intro"><h2>Less process. More movement.</h2><p>Every task follows the same visible path, without asking you to maintain a second planning system.</p></div>
          <ol className="method-steps">
            <li><span>01</span><h3>Choose</h3><p>Name the result before starting the clock.</p></li>
            <li><span>02</span><h3>Focus</h3><p>Give one outcome a protected window.</p></li>
            <li><span>03</span><h3>Prove</h3><p>Close with a commit, pull request, or written result.</p></li>
          </ol>
        </section>

        <section className="local-section" id="local">
          <span>Local by design</span><h2>Your work record starts private.</h2><button type="button" onClick={onEnter}>Enter workspace <ArrowRight size={18} /></button>
        </section>
      </main>
    </div>
  )
}

const PRIMARY_PAGES = [
  { id: 'home', index: '01', title: 'Home', icon: Home },
  { id: 'board', index: '02', title: 'Board', icon: ListTodo },
  { id: 'canvas', index: '03', title: 'Canvas', icon: Pencil },
  { id: 'worklog', index: '04', title: 'Worklog', icon: HistoryIcon },
]

const PAGE_META = {
  home: { index: '01', label: 'Overview', title: 'Home' },
  board: { index: '02', label: 'Organize', title: 'Board' },
  canvas: { index: '03', label: 'Think', title: 'Canvas' },
  focus: { index: '03', label: 'Work', title: 'Focus' },
  worklog: { index: '04', label: 'Review', title: 'Worklog' },
  settings: { index: '05', label: 'Configure', title: 'Settings' },
}

const SHORTCUT_LIBRARY = {
  new: { title: 'New', icon: Plus },
  focus: { title: 'Focus', icon: CirclePlay },
  search: { title: 'Search', icon: Search },
  home: { title: 'Home', icon: Home },
  board: { title: 'Board', icon: ListTodo },
  canvas: { title: 'Canvas', icon: Pencil },
  worklog: { title: 'Worklog', icon: HistoryIcon },
}

function shortcutDetails(shortcut, tasks, hasActive) {
  if (shortcut.type === 'task') {
    const task = tasks.find((item) => item.id === shortcut.id)
    return task ? { title: task.objective, icon: ListTodo, task } : null
  }
  const details = SHORTCUT_LIBRARY[shortcut.id]
  if (!details) return null
  return shortcut.id === 'focus' && hasActive ? { ...details, title: 'Resume' } : details
}

function AppHeader({ view, onNavigate, theme, onTheme, hasActive, historyCount, taskCount, isCompleting, shortcuts, tasks, onShortcut, onShortcutMenu, onPageMenu }) {
  const currentPage = view === 'focus' && isCompleting
    ? { index: '02', label: 'Finish', title: 'Add evidence' }
    : PAGE_META[view] || PAGE_META.home

  return (
    <>
      <header className="mobile-app-header">
        <button className="brand-button" type="button" onClick={() => onNavigate('home')} aria-label="Go to Home"><Brand compact /></button>
        <div className="mobile-page-title"><span>{currentPage.index} / {currentPage.label}</span><strong>{currentPage.title}</strong></div>
        <button className="mobile-settings-button" type="button" onClick={() => onNavigate('settings')} aria-label="Open Settings"><SettingsIcon size={18} /></button>
      </header>

      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <button className="brand-button" type="button" onClick={() => onNavigate('home')} aria-label="Go to Home"><Brand /></button>
        </div>
        <nav className="journey-switcher" aria-label="Workspace shortcuts">
          {shortcuts.map((shortcut, index) => {
            const item = shortcutDetails(shortcut, tasks, hasActive)
            if (!item) return null
            return (
              <button key={`${shortcut.type}-${shortcut.id}`} type="button" className={shortcut.type === 'action' && shortcut.id === 'new' ? 'shortcut-primary' : ''} onClick={() => onShortcut(shortcut)} onContextMenu={(event) => onShortcutMenu(event, shortcut, index)} aria-label={shortcut.type === 'task' ? `Start ${item.title}` : item.title} title={item.title}>
                {createElement(item.icon, { size: 19 })}
                <span className="journey-label">{item.title}</span>
                {shortcut.id === 'focus' && hasActive && <i className="nav-live" aria-label="Session active" />}
              </button>
            )
          })}
        </nav>
        <div className="sidebar-pages">
          <span className="sidebar-section-title">Workspace</span>
          <nav className="sidebar-page-nav" aria-label="Workspace pages">
            {PRIMARY_PAGES.map((item) => (
              <button key={item.id} type="button" className={view === item.id ? 'active' : ''} onClick={() => onNavigate(item.id)} onContextMenu={(event) => onPageMenu(event, item)} aria-current={view === item.id ? 'page' : undefined}>
                {createElement(item.icon, { size: 17 })}
                <span className="nav-copy"><strong>{item.title}</strong></span>
                {item.id === 'board' && taskCount > 0 && <span className="nav-count">{taskCount}</span>}
                {item.id === 'worklog' && historyCount > 0 && <span className="nav-count">{historyCount}</span>}
                <span className="nav-menu-hint" aria-hidden="true"><MoreHorizontal size={15} /></span>
              </button>
            ))}
          </nav>
        </div>
        <div className="sidebar-utilities">
          <button type="button" className={view === 'settings' ? 'active' : ''} onClick={() => onNavigate('settings')} aria-current={view === 'settings' ? 'page' : undefined}><SettingsIcon size={17} /><span>Settings</span></button>
          <button type="button" onClick={onTheme}>{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}<span>{theme === 'dark' ? 'Light theme' : 'Dark theme'}</span></button>
        </div>
      </aside>

      <nav className="mobile-tabbar" aria-label="Workspace navigation">
        {PRIMARY_PAGES.map((item) => (
          <button key={item.id} type="button" className={view === item.id ? 'active' : ''} onClick={() => onNavigate(item.id)} aria-current={view === item.id ? 'page' : undefined}>
            <span className="mobile-tab-index">{item.index}</span>
            {createElement(item.icon, { size: 18 })}
            <span>{item.title}</span>
            {item.id === 'focus' && hasActive && <i className="nav-live" aria-label="Session active" />}
          </button>
        ))}
      </nav>
    </>
  )
}

function WorkspaceTopbar({ view, isCompleting, isRunning, historyCount, taskCount, focusedMinutes }) {
  let title = PAGE_META[view]?.title || 'Home'
  let context = taskCount === 1 ? '1 task in your workspace.' : `${taskCount} tasks in your workspace.`

  if (view === 'focus' && isCompleting) {
    title = 'Add evidence'
    context = 'Close the session with something you can inspect.'
  } else if (view === 'focus') {
    title = isRunning ? 'Current session' : 'Focus'
    context = isRunning ? 'Protect the outcome until the clock ends.' : 'Choose a planned outcome when you are ready.'
  } else if (view === 'worklog') {
    context = `${historyCount} outcomes · ${focusedMinutes} focused minutes`
  } else if (view === 'canvas') {
    context = 'Arrange tasks, leave notes, and sketch connections.'
  } else if (view === 'settings') {
    context = 'Appearance and local workspace data.'
  }

  return (
    <header className="workspace-topbar">
      <div className="global-page-title"><strong>{title}</strong><span>{context}</span></div>
      <div className="global-actions" />
    </header>
  )
}

function OutcomeComposer({ onStart, onSave }) {
  const [objective, setObjective] = useState('')
  const [reference, setReference] = useState('')
  const [duration, setDuration] = useState(25)
  const [error, setError] = useState('')
  const [referenceError, setReferenceError] = useState('')

  function details() {
    if (objective.trim().length < 4) {
      setError('Describe a result you will be able to recognize.')
      return null
    }
    const safeReference = safeExternalUrl(reference.trim())
    if (reference.trim() && !safeReference) {
      setReferenceError('Use a complete HTTP or HTTPS URL.')
      return null
    }
    return { objective, reference: safeReference, durationMinutes: duration }
  }

  function submit(event) {
    event.preventDefault()
    const value = details()
    if (value) onStart(value)
  }

  function save() {
    const value = details()
    if (!value) return
    onSave(value)
    setObjective('')
    setReference('')
  }

  return (
    <form className="outcome-composer" onSubmit={submit}>
      <div className="composer-heading"><h2>Define an outcome</h2><small>One clear result</small></div>
      <label htmlFor="outcome">What will be different when you stop?</label>
      <input id="outcome" value={objective} onChange={(event) => { setObjective(event.target.value); setError('') }} placeholder="Fix the failing OAuth callback retry" aria-invalid={Boolean(error)} aria-describedby={error ? 'outcome-error' : undefined} />
      {error && <p className="field-error" id="outcome-error">{error}</p>}
      <div className="composer-details">
        <div><label htmlFor="reference">Reference <span>Optional</span></label><input id="reference" type="url" value={reference} onChange={(event) => { setReference(event.target.value); setReferenceError('') }} placeholder="GitHub issue or task URL" aria-invalid={Boolean(referenceError)} aria-describedby={referenceError ? 'reference-error' : undefined} />{referenceError && <p className="field-error" id="reference-error">{referenceError}</p>}</div>
        <fieldset><legend>Focus length</legend><div className="duration-picker">{DURATION_OPTIONS.map((minutes) => <button key={minutes} type="button" aria-pressed={duration === minutes} onClick={() => setDuration(minutes)}>{minutes}</button>)}</div></fieldset>
      </div>
      <div className="composer-actions">
        <button className="action-primary" type="submit">Start focus <ArrowRight size={17} /></button>
        <button className="action-quiet" type="button" onClick={save}><Plus size={16} /> Add to inbox</button>
      </div>
    </form>
  )
}

const BOARD_COLUMNS = [
  { id: 'inbox', title: 'Inbox', hint: 'Unsorted ideas' },
  { id: 'ready', title: 'Ready', hint: 'Clear enough to begin' },
  { id: 'focus', title: 'In focus', hint: 'One active outcome' },
  { id: 'done', title: 'Done', hint: 'Evidence attached' },
]

function TaskCard({ task, onStart, onMenu, onDragStart }) {
  return (
    <article className={`task-card task-${task.status}`} draggable={task.status !== 'done'} onDragStart={(event) => onDragStart(event, task)} onContextMenu={(event) => onMenu(event, task)}>
      <div className="task-card-top"><span>{task.durationMinutes} min</span><button type="button" onClick={(event) => onMenu(event, task)} aria-label={`More actions for ${task.objective}`}><MoreHorizontal size={16} /></button></div>
      <h3>{task.objective}</h3>
      {task.reference && <span className="task-reference">Reference attached</span>}
      {task.status !== 'done' && <button className="task-start" type="button" onClick={() => onStart(task, task.id)}>{task.status === 'focus' ? 'Return to focus' : 'Start focus'} <ArrowRight size={15} /></button>}
      {task.status === 'done' && <span className="task-complete-label"><Check size={14} /> Completed</span>}
    </article>
  )
}

function HomeDashboard({ store, onStart, onNavigate, onNew }) {
  const current = store.active || store.completed
  const next = store.tasks.find((task) => task.status === 'ready') || store.tasks.find((task) => task.status === 'inbox')
  const openCount = store.tasks.filter((task) => task.status !== 'done').length
  const doneCount = store.tasks.filter((task) => task.status === 'done').length
  const recent = store.history.slice(0, 3)

  return (
    <main className="home-page" id="main-content">
      <header className="home-intro"><div><span className="page-kicker">Today</span><h1>Your work, at a glance.</h1></div><button className="action-primary" type="button" onClick={onNew}><Plus size={17} /> New task</button></header>
      <section className="home-current">
        <div className="home-section-label"><span>Now</span><small>{current ? current.status === 'paused' ? 'Paused' : store.completed ? 'Needs evidence' : 'In progress' : 'Clear'}</small></div>
        {current ? <div className="home-current-task"><div><h2>{current.objective}</h2><p>{store.completed ? 'The session is finished. Add evidence to close the loop.' : `${current.durationMinutes} minute focus session`}</p></div><button className="action-primary" type="button" onClick={() => onNavigate('focus')}>{store.completed ? 'Add evidence' : 'Return to focus'} <ArrowRight size={16} /></button></div> : next ? <div className="home-current-task"><div><h2>{next.objective}</h2><p>Next available · {next.durationMinutes} minutes</p></div><button className="action-primary" type="button" onClick={() => onStart(next, next.id)}>Start focus <CirclePlay size={16} /></button></div> : <div className="home-empty-line"><strong>Nothing is asking for your attention.</strong><span>Add a task when something becomes worth moving.</span></div>}
      </section>
      <section className="home-overview">
        <button type="button" onClick={() => onNavigate('board')}><span>Board</span><strong>{openCount} open</strong><small>{doneCount} completed tasks remain visible</small><ArrowRight size={17} /></button>
        <button type="button" onClick={() => onNavigate('canvas')}><span>Canvas</span><strong>{store.canvas.pins.length + store.canvas.notes.length} items</strong><small>{store.canvas.strokes.length} drawn strokes</small><ArrowRight size={17} /></button>
        <button type="button" onClick={() => onNavigate('worklog')}><span>Worklog</span><strong>{store.history.length} outcomes</strong><small>Evidence from completed focus</small><ArrowRight size={17} /></button>
      </section>
      <section className="home-recent"><header><div><span className="page-kicker">Recent evidence</span><h2>What moved</h2></div>{recent.length > 0 && <button type="button" onClick={() => onNavigate('worklog')}>View worklog <ArrowRight size={15} /></button>}</header>{recent.length === 0 ? <div className="home-empty-line"><strong>No evidence recorded yet.</strong><span>Completed focus sessions will appear here.</span></div> : <ol>{recent.map((item) => <EvidenceRow key={item.id} item={item} />)}</ol>}</section>
    </main>
  )
}

function Board({ store, onStart, onSave, onNavigate, onMove, onTaskMenu, forceOpen }) {
  const hasSession = Boolean(store.active || store.completed)
  const [showComposer, setShowComposer] = useState(Boolean(forceOpen) || store.tasks.length === 0)

  return (
    <main className="board-page" id="main-content">
      <section className="board-intro">
        <div><span className="page-kicker">Task flow</span><h1>Board</h1><p>Capture it, make it ready, then focus on one clear outcome.</p></div>
        <button className="action-primary" type="button" onClick={() => setShowComposer((value) => !value)}><Plus size={17} /> New task</button>
      </section>
      {hasSession && <section className="active-session-banner" aria-label="Active focus session"><div><span>{store.completed ? 'Evidence needed' : store.active.status === 'paused' ? 'Session paused' : 'Focus in progress'}</span><strong>{(store.active || store.completed).objective}</strong></div><button className="action-quiet" type="button" onClick={() => onNavigate('focus')}>{store.completed ? 'Add evidence' : 'Return to focus'} <ArrowRight size={16} /></button></section>}
      {showComposer && <OutcomeComposer onStart={onStart} onSave={(details) => { onSave(details); setShowComposer(false) }} />}
      <section className="kanban-board" aria-label="Task board">
        {BOARD_COLUMNS.map((column) => {
          const items = store.tasks.filter((task) => task.status === column.id)
          return <section key={column.id} className="kanban-column" onDragOver={(event) => event.preventDefault()} onDrop={(event) => onMove(event.dataTransfer.getData('text/task-id'), column.id)}>
            <header><div><h2>{column.title}</h2><p>{column.hint}</p></div><span>{String(items.length).padStart(2, '0')}</span></header>
            <div className="kanban-stack">{items.map((task) => <TaskCard key={task.id} task={task} onStart={onStart} onMenu={onTaskMenu} onDragStart={(event, item) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/task-id', item.id) }} />)}{items.length === 0 && <div className="column-empty">Drop a task here</div>}</div>
          </section>
        })}
      </section>
    </main>
  )
}

function Settings({ theme, onTheme, store }) {
  function exportData() {
    const file = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = `pomogit-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="app-main settings-view" id="main-content">
      <section className="page-header">
        <div><span className="page-kicker">Configure</span><h1>Settings</h1></div>
        <p>Keep the workspace comfortable and your local record portable.</p>
      </section>
      <section className="settings-section">
        <div><span>Appearance</span><h2>Theme</h2><p>Choose the surface that fits your working environment.</p></div>
        <div className="theme-options" aria-label="Theme">
          <button type="button" aria-pressed={theme === 'light'} onClick={() => onTheme('light')}><Sun size={17} /> Light</button>
          <button type="button" aria-pressed={theme === 'dark'} onClick={() => onTheme('dark')}><Moon size={17} /> Dark</button>
        </div>
      </section>
      <section className="settings-section">
        <div><span>Local data</span><h2>Workspace record</h2><p>{store.tasks.length} tasks and {store.history.length} completed outcomes are stored in this browser.</p></div>
        <button className="action-quiet" type="button" onClick={exportData}><Download size={17} /> Export data</button>
      </section>
    </main>
  )
}

function EvidenceRow({ item }) {
  const Icon = item.evidenceType === 'pull-request' ? GitPullRequest : item.evidenceType === 'commit' ? GitCommitHorizontal : Check
  return (
    <li>
      <Icon size={17} />
      <div><strong>{item.objective}</strong><span>{item.evidence}</span></div>
      <time>{new Date(item.endedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time>
      <span>{Math.max(1, Math.round(item.elapsedMs / 60_000))} min</span>
    </li>
  )
}

function FocusLandscape({ progress, paused }) {
  return (
    <div className={`focus-landscape ${paused ? 'is-paused' : ''}`} aria-hidden="true">
      <div className="focus-sun" style={{ '--progress': progress }} />
      <div className="contour contour-one" /><div className="contour contour-two" /><div className="contour contour-three" />
      <div className="horizon" />
    </div>
  )
}

function EvidenceForm({ session, onSave, onDiscard }) {
  const [type, setType] = useState('commit')
  const [evidence, setEvidence] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const types = [['commit', 'Commit', GitCommitHorizontal], ['pull-request', 'Pull request', GitPullRequest], ['note', 'Written result', Check]]

  function submit(event) {
    event.preventDefault()
    if (!evidence.trim()) {
      setError(type === 'note' ? 'Describe what changed before saving the outcome.' : 'Add a link or commit SHA before saving the outcome.')
      return
    }
    onSave({ type, evidence: evidence.trim(), note: note.trim() })
  }

  return (
    <main className="evidence-view" id="main-content">
      <div className="evidence-intro"><span className="page-kicker">Session complete · Step 03</span><h1>Add evidence</h1><p>Record what changed for <strong>{session.objective}</strong>.</p></div>
      <form className="evidence-form" onSubmit={submit}>
        <fieldset><legend>Evidence</legend><div className="evidence-types">{types.map(([value, label, icon]) => <button key={value} type="button" aria-pressed={type === value} onClick={() => { setType(value); setError('') }}>{createElement(icon, { size: 17 })}{label}</button>)}</div></fieldset>
        <label htmlFor="evidence">{type === 'note' ? 'What changed?' : 'Link or SHA'}</label>
        <input id="evidence" value={evidence} onChange={(event) => { setEvidence(event.target.value); setError('') }} placeholder={type === 'note' ? 'The callback now retries once and records the failure.' : 'https://github.com/… or a1b2c3d'} aria-invalid={Boolean(error)} />
        {error && <p className="field-error">{error}</p>}
        <label htmlFor="next-note">Note for the next session <span>Optional</span></label>
        <textarea id="next-note" rows="3" value={note} onChange={(event) => setNote(event.target.value)} placeholder="What is the clean next step?" />
        <div className="evidence-actions"><button className="action-primary" type="submit">Save outcome <Check size={17} /></button><button className="action-quiet" type="button" onClick={onDiscard}>Discard unfinished session</button></div>
      </form>
    </main>
  )
}

function Focus({ active, completed, planned, remainingMs, onPause, onResume, onEnd, onSave, onDiscard, onStart, onExit }) {
  if (completed) return <EvidenceForm session={completed} onSave={onSave} onDiscard={onDiscard} />
  if (!active) {
    const next = planned[0]
    return (
      <main className="focus-empty" id="main-content">
        <span className="page-kicker">Focus · Step 02</span>
        <h1>No active session</h1>
        <p>{next ? 'Your next ready task is here when you are.' : 'Choose a task from Home before starting the clock.'}</p>
        {next && (
          <div className="focus-next-outcome">
            <span>Next outcome</span>
            <strong>{next.objective}</strong>
            <small>{next.durationMinutes} minutes{next.reference ? ' · Reference attached' : ''}</small>
          </div>
        )}
        <div className="focus-empty-actions">
          {next && <button className="action-primary" type="button" onClick={() => onStart(next, next.id)}><CirclePlay size={17} /> Start next outcome</button>}
          <button className="action-quiet" type="button" onClick={onExit}>{next ? 'Choose another task' : 'Go Home'} <ArrowRight size={17} /></button>
        </div>
      </main>
    )
  }

  const progress = Math.min(1, Math.max(0, 1 - remainingMs / active.durationMs))
  return (
    <main className="focus-view" id="main-content">
      <FocusLandscape progress={progress} paused={active.status === 'paused'} />
      <div className="focus-content">
        <div className="focus-meta"><span><i className={active.status} /> 02 / {active.status === 'paused' ? 'Paused' : 'Focus in progress'}</span>{safeExternalUrl(active.reference) && <a href={safeExternalUrl(active.reference)} target="_blank" rel="noopener noreferrer">Open reference <ExternalLink size={14} /></a>}</div>
        <h1>{active.objective}</h1>
        <div className="focus-clock" aria-label={`${formatClock(remainingMs)} remaining`}>{formatClock(remainingMs)}</div>
        <div className="focus-progress"><span style={{ transform: `scaleX(${progress})` }} /></div>
        <div className="focus-controls">
          {active.status === 'paused' ? <button className="focus-main-action" type="button" onClick={onResume}><CirclePlay size={19} /> Resume</button> : <button className="focus-main-action" type="button" onClick={onPause}><CirclePause size={19} /> Pause</button>}
          <button type="button" onClick={onEnd}><Square size={15} /> End session</button>
        </div>
      </div>
    </main>
  )
}

const CANVAS_TOOLS = [
  ['select', 'Select', MousePointer2],
  ['draw', 'Draw', Pencil],
  ['erase', 'Erase', Eraser],
]

function Canvas({ tasks, canvas, onChange, onStart, onTaskMenu }) {
  const [tool, setTool] = useState('select')
  const [draft, setDraft] = useState(null)
  const [dragging, setDragging] = useState(null)
  const availableTasks = tasks.filter((task) => task.status !== 'done' && !canvas.pins.some((pin) => pin.taskId === task.id))
  const [selectedTask, setSelectedTask] = useState('')

  function point(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: Math.round(event.clientX - rect.left), y: Math.round(event.clientY - rect.top) }
  }

  function beginStroke(event) {
    if (tool !== 'draw') return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDraft({ id: `stroke-${Date.now()}`, points: [point(event)] })
  }

  function continueStroke(event) {
    if (dragging && tool === 'select') {
      const next = point(event)
      const position = { x: Math.max(16, next.x - dragging.offsetX), y: Math.max(16, next.y - dragging.offsetY) }
      if (dragging.kind === 'pin') onChange({ ...canvas, pins: canvas.pins.map((item) => item.id === dragging.id ? { ...item, ...position } : item) })
      if (dragging.kind === 'note') onChange({ ...canvas, notes: canvas.notes.map((item) => item.id === dragging.id ? { ...item, ...position } : item) })
      return
    }
    if (!draft || tool !== 'draw') return
    setDraft((current) => ({ ...current, points: [...current.points, point(event)] }))
  }

  function finishStroke(event) {
    if (dragging) {
      setDragging(null)
      return
    }
    if (!draft) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (draft.points.length > 1) onChange({ ...canvas, strokes: [...canvas.strokes, draft] })
    setDraft(null)
  }

  function addNote() {
    onChange({ ...canvas, notes: [...canvas.notes, { id: `note-${Date.now()}`, x: 96 + canvas.notes.length * 22, y: 90 + canvas.notes.length * 22, text: 'New note' }] })
  }

  function addTaskPin() {
    if (!selectedTask) return
    onChange({ ...canvas, pins: [...canvas.pins, { id: `pin-${Date.now()}`, taskId: selectedTask, x: 350 + canvas.pins.length * 24, y: 120 + canvas.pins.length * 24 }] })
    setSelectedTask('')
  }

  function beginDrag(event, kind, item) {
    if (tool !== 'select') return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const rect = event.currentTarget.closest('.canvas-stage').getBoundingClientRect()
    setDragging({ kind, id: item.id, offsetX: event.clientX - rect.left - item.x, offsetY: event.clientY - rect.top - item.y })
  }

  const renderedStrokes = draft ? [...canvas.strokes, draft] : canvas.strokes
  return (
    <main className="canvas-page" id="main-content">
      <header className="canvas-intro"><div><span className="page-kicker">Open space</span><h1>Canvas</h1><p>Pin real tasks beside rough notes and sketch the connections.</p></div><div className="canvas-add"><select value={selectedTask} onChange={(event) => setSelectedTask(event.target.value)} aria-label="Task to pin"><option value="">Choose a task</option>{availableTasks.map((task) => <option key={task.id} value={task.id}>{task.objective}</option>)}</select><button type="button" className="action-quiet" onClick={addTaskPin} disabled={!selectedTask}><Pin size={16} /> Pin task</button><button type="button" className="action-quiet" onClick={addNote}><StickyNote size={16} /> Note</button></div></header>
      <div className="canvas-toolbar" role="toolbar" aria-label="Canvas tools">{CANVAS_TOOLS.map(([id, label, icon]) => <button key={id} type="button" aria-pressed={tool === id} onClick={() => setTool(id)}>{createElement(icon, { size: 16 })} {label}</button>)}<span />{canvas.strokes.length > 0 && <button type="button" onClick={() => onChange({ ...canvas, strokes: [] })}><Trash2 size={15} /> Clear drawing</button>}</div>
      <div className="canvas-viewport">
        <div className={`canvas-stage tool-${tool}`} onPointerDown={beginStroke} onPointerMove={continueStroke} onPointerUp={finishStroke} onPointerCancel={finishStroke}>
          <svg className="canvas-ink" viewBox="0 0 1600 1000" aria-hidden="true">{renderedStrokes.map((stroke) => <polyline key={stroke.id} points={stroke.points.map(({ x, y }) => `${x},${y}`).join(' ')} onPointerDown={tool === 'erase' ? () => onChange({ ...canvas, strokes: canvas.strokes.filter((item) => item.id !== stroke.id) }) : undefined} />)}</svg>
          {canvas.pins.map((pin) => { const task = tasks.find((item) => item.id === pin.taskId); if (!task) return null; return <article key={pin.id} className="canvas-task-pin" style={{ left: pin.x, top: pin.y }} onContextMenu={(event) => onTaskMenu(event, task)}><div className="canvas-item-bar"><button type="button" onPointerDown={(event) => beginDrag(event, 'pin', pin)} aria-label={`Move ${task.objective}`}><MousePointer2 size={13} /></button><span><Pin size={13} /> {task.status}</span><button type="button" onClick={() => onChange({ ...canvas, pins: canvas.pins.filter((item) => item.id !== pin.id) })} aria-label={`Remove ${task.objective} from canvas`}><Trash2 size={13} /></button></div><h3>{task.objective}</h3><button className="canvas-focus-link" type="button" onClick={() => onStart(task, task.id)}>Focus <ArrowRight size={14} /></button></article> })}
          {canvas.notes.map((note) => <article key={note.id} className="canvas-note" style={{ left: note.x, top: note.y }}><div className="canvas-item-bar"><button type="button" onPointerDown={(event) => beginDrag(event, 'note', note)} aria-label="Move note"><MousePointer2 size={13} /></button><span>Note</span><button type="button" onClick={() => onChange({ ...canvas, notes: canvas.notes.filter((item) => item.id !== note.id) })} aria-label="Delete note"><Trash2 size={13} /></button></div><textarea value={note.text} aria-label="Canvas note" onPointerDown={(event) => event.stopPropagation()} onChange={(event) => onChange({ ...canvas, notes: canvas.notes.map((item) => item.id === note.id ? { ...item, text: event.target.value } : item) })} /></article>)}
          {canvas.pins.length === 0 && canvas.notes.length === 0 && canvas.strokes.length === 0 && <div className="canvas-empty"><Pencil size={20} /><strong>Start anywhere.</strong><span>Pin a task, add a note, or draw directly on the canvas.</span></div>}
        </div>
      </div>
    </main>
  )
}

function ContextMenu({ menu, onClose }) {
  useEffect(() => {
    if (!menu) return undefined
    const close = () => onClose()
    const keydown = (event) => { if (event.key === 'Escape') close() }
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', keydown)
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('keydown', keydown) }
  }, [menu, onClose])
  if (!menu) return null
  return <div className="context-menu" role="menu" style={{ left: Math.min(menu.x, window.innerWidth - 230), top: Math.min(menu.y, window.innerHeight - 280) }} onPointerDown={(event) => event.stopPropagation()}>{menu.label && <span>{menu.label}</span>}{menu.actions.map((action) => <button key={action.label} type="button" role="menuitem" className={action.danger ? 'danger' : ''} onClick={() => { action.run(); onClose() }}>{action.icon && createElement(action.icon, { size: 15 })}{action.label}</button>)}</div>
}

function Worklog({ items }) {
  const [query, setQuery] = useState('')
  const filtered = items.filter((item) => `${item.objective} ${item.evidence}`.toLowerCase().includes(query.toLowerCase()))
  const totalMinutes = items.reduce((sum, item) => sum + item.elapsedMs, 0) / 60_000

  return (
    <main className="app-main worklog-view" id="main-content">
      <section className="page-header history-heading"><div><span className="page-kicker">Completed work</span><h1>Worklog</h1></div><p>{items.length} outcomes · {Math.round(totalMinutes)} focused minutes</p></section>
      <label className="history-search" htmlFor="worklog-search"><Search size={18} /><span className="sr-only">Search worklog</span><input id="worklog-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search outcomes or evidence" /></label>
      {items.length === 0 ? <div className="history-empty"><h2>No evidence yet.</h2><p>Finish a focused session and attach proof to begin your local work record.</p></div> : filtered.length === 0 ? <div className="history-empty"><h2>No matching outcomes.</h2><p>Try a different outcome, link, or commit SHA.</p></div> : (
        <ol className="history-list">{filtered.map((item) => <EvidenceRow key={item.id} item={item} />)}</ol>
      )}
    </main>
  )
}

export default function App() {
  const [store, setStore] = useState(() => withDevPreview(readStore()))
  const [now, setNow] = useState(() => Date.now())
  const [view, setView] = useState(() => initialView(store))
  const [pendingFocus, setPendingFocus] = useState(null)
  const [shortcuts, setShortcuts] = useState(readShortcuts)
  const [contextMenu, setContextMenu] = useState(null)
  const [composerRequest, setComposerRequest] = useState(0)
  const [theme, setTheme] = useState(() => localStorage.getItem('stillpoint.theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
  const [sidebarWidth, setSidebarWidth] = useState(readSidebarWidth)
  const remainingMs = store.active ? getRemainingMs(store.active, now) : 0

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('stillpoint.theme', theme)
  }, [theme])

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)) }, [store])
  useEffect(() => { localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth)) }, [sidebarWidth])
  useEffect(() => { localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(shortcuts)) }, [shortcuts])

  useEffect(() => {
    if (view === 'landing') return
    const nextUrl = `${window.location.pathname}${window.location.search}#${view}`
    window.history.replaceState(null, '', nextUrl)
  }, [view])

  useEffect(() => {
    if (!pendingFocus) return
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(pendingFocus)?.focus()
      setPendingFocus(null)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [view, pendingFocus])

  useEffect(() => {
    if (!store.active || store.active.status !== 'running') return undefined
    const tick = () => {
      const currentTime = Date.now()
      setNow(currentTime)
      if (getRemainingMs(store.active, currentTime) <= 0) {
        setStore((current) => {
          if (!current.active || current.active.id !== store.active.id) return current
          return { ...current, active: null, completed: { ...current.active, elapsedMs: current.active.durationMs } }
        })
      }
    }
    tick()
    const interval = window.setInterval(tick, 250)
    return () => window.clearInterval(interval)
  }, [store.active])

  function enterWorkspace() {
    localStorage.setItem(WORKSPACE_KEY, 'true')
    navigate(store.active || store.completed ? 'focus' : 'home')
  }

  function navigate(nextView, focusId = null) {
    setView(nextView)
    setPendingFocus(focusId)
    window.requestAnimationFrame(() => document.querySelector('.workspace-stage')?.scrollTo({ top: 0, behavior: 'auto' }))
  }

  function start(details, taskId) {
    if (store.active || store.completed) {
      navigate('focus')
      return
    }
    const task = taskId ? details : createTask(details, 'focus')
    setStore((current) => ({
      ...current,
      active: { ...createRunningSession(task), taskId: task.id },
      completed: null,
      tasks: taskId ? moveTask(current.tasks, task.id, 'focus') : [task, ...current.tasks],
    }))
    navigate('focus')
  }

  function saveTask(details) {
    setStore((current) => ({ ...current, tasks: [createTask(details), ...current.tasks] }))
  }

  function moveTaskTo(taskId, status) {
    if (!taskId || status === 'done') return
    const task = store.tasks.find((item) => item.id === taskId)
    if (!task) return
    if (status === 'focus') {
      start(task, task.id)
      return
    }
    setStore((current) => ({ ...current, tasks: moveTask(current.tasks, taskId, status) }))
  }

  function endSession() {
    setStore((current) => ({ ...current, active: null, completed: { ...current.active, elapsedMs: getElapsedMs(current.active) } }))
  }

  function saveOutcome(outcome) {
    const completedTaskId = store.completed?.taskId
    setShortcuts((current) => current.map((shortcut, index) => shortcut.type === 'task' && shortcut.id === completedTaskId ? DEFAULT_SHORTCUTS[index] : shortcut))
    setStore((current) => {
      const complete = current.completed
      const item = { id: complete.id, taskId: complete.taskId, objective: complete.objective, reference: complete.reference, elapsedMs: complete.elapsedMs, endedAt: Date.now(), evidenceType: outcome.type, evidence: outcome.evidence, note: outcome.note }
      return { ...current, completed: null, tasks: moveTask(current.tasks, complete.taskId, 'done'), history: [item, ...current.history] }
    })
    navigate('worklog')
  }

  function discardSession() {
    setStore((current) => ({ ...current, completed: null, tasks: current.completed?.taskId ? moveTask(current.tasks, current.completed.taskId, 'ready') : current.tasks }))
    navigate('home')
  }

  function replaceShortcut(index, shortcut) {
    setShortcuts((current) => current.map((item, itemIndex) => itemIndex === index ? shortcut : item))
  }

  function shortcutReplacementActions(shortcut) {
    return shortcuts.map((item, index) => ({ label: `Pin over ${shortcutDetails(item, store.tasks, Boolean(store.active || store.completed))?.title || `slot ${index + 1}`}`, run: () => replaceShortcut(index, shortcut) }))
  }

  function openMenu(event, label, actions) {
    event.preventDefault()
    const rect = event.currentTarget?.getBoundingClientRect?.()
    setContextMenu({ x: event.clientX || rect?.right || 16, y: event.clientY || rect?.bottom || 16, label, actions })
  }

  function taskMenu(event, task) {
    const actions = []
    if (task.status !== 'done') actions.push({ label: task.status === 'focus' ? 'Return to focus' : 'Start focus', icon: CirclePlay, run: () => start(task, task.id) })
    if (task.status !== 'inbox' && task.status !== 'done') actions.push({ label: 'Move to Inbox', run: () => moveTaskTo(task.id, 'inbox') })
    if (task.status !== 'ready' && task.status !== 'done') actions.push({ label: 'Move to Ready', run: () => moveTaskTo(task.id, 'ready') })
    actions.push(...shortcutReplacementActions({ type: 'task', id: task.id }))
    actions.push({ label: 'Pin to Canvas', icon: Pin, run: () => { setStore((current) => current.canvas.pins.some((pin) => pin.taskId === task.id) ? current : { ...current, canvas: { ...current.canvas, pins: [...current.canvas.pins, { id: `pin-${Date.now()}`, taskId: task.id, x: 340, y: 130 }] } }); navigate('canvas') } })
    if (!store.active || store.active.taskId !== task.id) actions.push({ label: 'Delete task', icon: Trash2, danger: true, run: () => { setShortcuts((current) => current.map((shortcut, index) => shortcut.type === 'task' && shortcut.id === task.id ? DEFAULT_SHORTCUTS[index] : shortcut)); setStore((current) => ({ ...current, tasks: current.tasks.filter((item) => item.id !== task.id), canvas: { ...current.canvas, pins: current.canvas.pins.filter((pin) => pin.taskId !== task.id) } })) } })
    openMenu(event, task.objective, actions)
  }

  function runShortcut(shortcut) {
    if (shortcut.type === 'task') {
      const task = store.tasks.find((item) => item.id === shortcut.id)
      if (task) start(task, task.id)
      return
    }
    if (shortcut.id === 'new') { navigate('board'); setComposerRequest((value) => value + 1); return }
    if (shortcut.id === 'focus') { navigate(store.active || store.completed ? 'focus' : 'home'); return }
    navigate(shortcut.id)
  }

  const toggleTheme = () => setTheme((value) => value === 'dark' ? 'light' : 'dark')
  const stopSidebarResize = () => document.documentElement.classList.remove('is-resizing-sidebar')
  const resizeSidebarFromPointer = (event) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    setSidebarWidth(clampSidebarWidth(event.clientX))
  }
  const resizeSidebarFromKeyboard = (event) => {
    let nextWidth
    if (event.key === 'ArrowLeft') nextWidth = sidebarWidth - 8
    if (event.key === 'ArrowRight') nextWidth = sidebarWidth + 8
    if (event.key === 'Home') nextWidth = MIN_SIDEBAR_WIDTH
    if (event.key === 'End') nextWidth = MAX_SIDEBAR_WIDTH
    if (nextWidth === undefined) return
    event.preventDefault()
    setSidebarWidth(clampSidebarWidth(nextWidth))
  }
  const focusedMinutes = Math.round(store.history.reduce((sum, item) => sum + item.elapsedMs, 0) / 60_000)
  if (view === 'landing') return <Landing theme={theme} onTheme={toggleTheme} onEnter={enterWorkspace} />

  return (
    <div className="workspace-shell" style={{ '--sidebar-width': `${sidebarWidth}px` }}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <AppHeader view={view} onNavigate={navigate} theme={theme} onTheme={toggleTheme} hasActive={Boolean(store.active || store.completed)} historyCount={store.history.length} taskCount={store.tasks.filter((task) => task.status !== 'done').length} isCompleting={Boolean(store.completed)} shortcuts={shortcuts} tasks={store.tasks} onShortcut={runShortcut} onShortcutMenu={(event, shortcut, index) => openMenu(event, 'Shortcut', [{ label: 'Reset shortcut', run: () => replaceShortcut(index, DEFAULT_SHORTCUTS[index]) }])} onPageMenu={(event, page) => openMenu(event, page.title, [{ label: `Open ${page.title}`, run: () => navigate(page.id) }, ...shortcutReplacementActions({ type: 'page', id: page.id })])} />
      <div
        className="sidebar-resizer"
        role="separator"
        aria-label="Resize sidebar"
        aria-orientation="vertical"
        aria-valuemin={MIN_SIDEBAR_WIDTH}
        aria-valuemax={MAX_SIDEBAR_WIDTH}
        aria-valuenow={Math.round(sidebarWidth)}
        tabIndex={0}
        onKeyDown={resizeSidebarFromKeyboard}
        onPointerDown={(event) => {
          event.preventDefault()
          event.currentTarget.setPointerCapture(event.pointerId)
          document.documentElement.classList.add('is-resizing-sidebar')
        }}
        onPointerMove={resizeSidebarFromPointer}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture(event.pointerId)
          stopSidebarResize()
        }}
        onLostPointerCapture={stopSidebarResize}
      />
      <div className="workspace-content">
        <WorkspaceTopbar view={view} isCompleting={Boolean(store.completed)} isRunning={Boolean(store.active)} historyCount={store.history.length} taskCount={store.tasks.filter((task) => task.status !== 'done').length} focusedMinutes={focusedMinutes} />
        <div className="workspace-stage">
          {view === 'home' && <HomeDashboard store={store} onStart={start} onNavigate={navigate} onNew={() => { navigate('board'); setComposerRequest((value) => value + 1) }} />}
          {view === 'board' && <Board key={composerRequest} forceOpen={composerRequest} store={store} onStart={start} onSave={saveTask} onNavigate={navigate} onMove={moveTaskTo} onTaskMenu={taskMenu} />}
          {view === 'canvas' && <Canvas tasks={store.tasks} canvas={store.canvas} onChange={(canvas) => setStore((current) => ({ ...current, canvas }))} onStart={start} onTaskMenu={taskMenu} />}
          {view === 'focus' && <Focus active={store.active} completed={store.completed} planned={store.tasks.filter((task) => task.status === 'ready')} remainingMs={remainingMs} onPause={() => setStore((current) => ({ ...current, active: pauseSession(current.active) }))} onResume={() => setStore((current) => ({ ...current, active: resumeSession(current.active) }))} onEnd={endSession} onSave={saveOutcome} onDiscard={discardSession} onStart={start} onExit={() => navigate('home')} />}
          {view === 'worklog' && <Worklog items={store.history} />}
          {view === 'settings' && <Settings theme={theme} onTheme={setTheme} store={store} />}
        </div>
      </div>
      <ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} />
    </div>
  )
}
