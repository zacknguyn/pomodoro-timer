import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Archive,
  Check,
  ChevronDown,
  ExternalLink,
  Inbox,
  PanelRightOpen,
  Plus,
  RotateCw,
  Square,
} from 'lucide-react'
import { DitherButton } from './dither-kit/DitherButton'
import { DitherGradient } from './dither-kit/DitherGradient'
import { CheckpointOverlay } from './CheckpointOverlay'
import { FocusOverlay } from './FocusOverlay'
import { TaskDrawer } from './TaskDrawer'
import { workApi } from '../lib/workApi'
import { applyCheckpointToTasks } from '../lib/checkpointForm'
import { formatSessionClock, getSessionRemainingSeconds } from '../lib/sessionClock'
import { deriveNowState, groupTasks } from '../lib/workView'
import { readWorkProtocol } from '../lib/preferences'

const READY_PREVIEW_SIZE = 3
const INBOX_PREVIEW_SIZE = 4
const DONE_PREVIEW_SIZE = 3

function formatCompactDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value))
}

function TaskReference({ url }) {
  if (!url) return null
  return (
    <a className="task-reference" href={url} target="_blank" rel="noreferrer">
      Reference <ExternalLink size={13} aria-hidden="true" />
    </a>
  )
}

function CaptureForm({ compact = false, onCreate, onCreated, disabled }) {
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    const value = title.trim()
    if (!value) {
      setError('Name the task before adding it.')
      return
    }
    const created = await onCreate(value)
    if (!created) return
    setTitle('')
    setError('')
    onCreated?.()
  }

  return (
    <form className={`capture-form ${compact ? 'is-compact' : ''}`} onSubmit={submit}>
      <label htmlFor={compact ? 'inbox-task-title' : 'first-task-title'}>
        {compact ? 'Task' : 'Add your first task'}
      </label>
      <div className="capture-row">
        <input
          id={compact ? 'inbox-task-title' : 'first-task-title'}
          value={title}
          onChange={(event) => { setTitle(event.target.value); if (error) setError('') }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${compact ? 'inbox' : 'first'}-task-error` : undefined}
          placeholder="e.g. Fix the OAuth retry"
          autoComplete="off"
          disabled={disabled}
        />
        <button className="button-secondary" type="submit" disabled={disabled}>
          <Plus size={16} aria-hidden="true" /> Add
        </button>
      </div>
      {error && <p className="field-error" id={`${compact ? 'inbox' : 'first'}-task-error`}>{error}</p>}
    </form>
  )
}

function NowCard({ state, compact = false, onCreate, onAction, onEndSession, onOpenTask, disabled }) {
  const [remaining, setRemaining] = useState(() => getSessionRemainingSeconds(state.session))

  useEffect(() => {
    const update = () => setRemaining(getSessionRemainingSeconds(state.session))
    const immediate = window.setTimeout(update, 0)
    const timer = state.kind === 'active' ? window.setInterval(update, 1000) : null
    return () => {
      window.clearTimeout(immediate)
      if (timer) window.clearInterval(timer)
    }
  }, [state.kind, state.session])

  const savedNextStep = state.checkpoint?.nextStep?.trim()
  const headline = savedNextStep || state.task?.title || (state.kind === 'empty' ? null : 'Choose what should move next')
  const showTaskContext = Boolean(savedNextStep && state.task?.title)
  const isSessionOpen = state.kind === 'active' || state.kind === 'paused'
  const contextLabel = savedNextStep ? 'Next step' : state.kind === 'ready' ? 'Ready' : null

  return (
    <section className={`now-card is-${state.kind} ${compact ? 'is-compact' : ''}`} aria-labelledby={state.kind === 'empty' ? undefined : 'now-heading'} aria-label={state.kind === 'empty' ? 'Now' : undefined}>
      <DitherGradient from="blue" to="transparent" direction="right" cell={3} opacity={0.34} bloom="off" className="now-texture" />
      <div className="now-copy">
        {isSessionOpen && (
          <div className="now-session-status">
            <span><i aria-hidden="true" /> {state.eyebrow}</span>
            <time aria-label={`${remaining} seconds remaining`}>{formatSessionClock(remaining)} remaining</time>
          </div>
        )}
        {!isSessionOpen && <p className="section-kicker">{state.eyebrow}</p>}
        {state.kind === 'empty' ? (
          <CaptureForm onCreate={onCreate} disabled={disabled} />
        ) : (
          <>
            {contextLabel && <p className="now-context-label">{contextLabel}</p>}
            <h2 id="now-heading">{headline}</h2>
            {showTaskContext && <p className="now-task-context"><span>Task</span>{state.task.title}</p>}
            {state.kind === 'idle' && <p>Move a task from Inbox into Ready, or capture a new one.</p>}
            <TaskReference url={state.task?.referenceUrl} />
          </>
        )}
      </div>
      {state.kind !== 'empty' && (
        <div className="now-actions">
          <DitherButton
            className="now-action"
            onClick={onAction}
            disabled={disabled}
            aria-label={`${state.action}${state.task ? `: ${state.task.title}` : ''}`}
          >
            {state.action} <ArrowRight size={17} aria-hidden="true" />
          </DitherButton>
          {isSessionOpen && (
            <div className="now-session-controls">
              <button className="now-task-details" type="button" onClick={() => onOpenTask(state.task)} disabled={disabled}>
                <PanelRightOpen size={15} aria-hidden="true" /> Task details
              </button>
              <button className="now-end-session" type="button" onClick={onEndSession} disabled={disabled}>
                <Square size={13} aria-hidden="true" /> End session
              </button>
            </div>
          )}
          {!isSessionOpen && state.task && (
            <button className="now-task-details" type="button" onClick={() => onOpenTask(state.task)} disabled={disabled}>
              <PanelRightOpen size={15} aria-hidden="true" /> Task details
            </button>
          )}
        </div>
      )}
    </section>
  )
}

function ReadySection({ tasks, checkpointsByTask, nowTaskId, expanded, onExpanded, onOpenTask, onStartTask, session, busyTaskId }) {
  const remaining = tasks.filter((task) => task.id !== nowTaskId)
  if (remaining.length === 0) return null
  const visible = expanded ? remaining : remaining.slice(0, READY_PREVIEW_SIZE)

  return (
    <section className="work-section" aria-labelledby="ready-heading">
      <header className="section-heading">
        <div><p className="section-kicker">Up next</p><h2 id="ready-heading">Ready</h2></div>
        <span className="count-pill" aria-label={`${remaining.length} ready tasks`}>{remaining.length} {remaining.length === 1 ? 'task' : 'tasks'}</span>
      </header>
      <ol className="task-list ready-list">
        {visible.map((task) => {
          const nextStep = (checkpointsByTask[task.id] || []).find((checkpoint) => checkpoint.outcome === 'continue')?.nextStep
          return (
            <li key={task.id}>
              <div className="task-copy">
                <button className="task-title-button" type="button" onClick={() => onOpenTask(task)}>{task.title}</button>
                {nextStep && <span>Next: {nextStep}</span>}
                <TaskReference url={task.referenceUrl} />
              </div>
              <div className="row-actions">
                <button className="row-detail-action" type="button" onClick={() => onOpenTask(task)}><PanelRightOpen size={15} /> Details</button>
                <button className="row-action" type="button" onClick={() => onStartTask(task.id)} disabled={busyTaskId === task.id || Boolean(session)}>
                  Start focus <ArrowRight size={15} aria-hidden="true" />
                </button>
              </div>
            </li>
          )
        })}
      </ol>
      {remaining.length > READY_PREVIEW_SIZE && (
        <button className="section-toggle" type="button" onClick={() => onExpanded(!expanded)} aria-expanded={expanded}>
          {expanded ? 'Show less' : `Show all ${remaining.length}`} <ChevronDown size={15} aria-hidden="true" />
        </button>
      )}
    </section>
  )
}

function InboxSection({ tasks, composerOpen, onComposerOpen, onComposerClose, onCreate, onMoveToReady, onOpenTask, readyCount, busyTaskId }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? tasks : tasks.slice(0, INBOX_PREVIEW_SIZE)

  return (
    <section className="collection-panel inbox-panel" id="inbox-panel" role="tabpanel" aria-labelledby="inbox-tab">
      <header className="collection-panel-header">
        <div><p className="section-kicker">Triage</p><h2>Decide what moves next</h2><p>Captured ideas stay here until they are clear enough to become Ready.</p></div>
        <div className="work-zone-controls">
          {!composerOpen && <button className="zone-add-action" type="button" onClick={onComposerOpen}><Plus size={15} /> Capture task</button>}
        </div>
      </header>

      <div className="inbox-composer" data-open={composerOpen}>
        <div>{composerOpen && <CaptureForm compact onCreate={onCreate} onCreated={onComposerClose} disabled={Boolean(busyTaskId)} />}</div>
      </div>

      {tasks.length === 0 ? (
        <div className="zone-empty"><Inbox size={17} /><p><strong>Inbox clear.</strong><span>Capture something only when it is worth deciding later.</span></p></div>
      ) : (
        <ol className="inbox-queue">
          {visible.map((task, index) => (
            <li key={task.id}>
              <span className="queue-position">{String(index + 1).padStart(2, '0')}</span>
              <div className="task-copy">
                <button className="task-title-button" type="button" onClick={() => onOpenTask(task)}>{task.title}</button>
                <span>Captured {formatCompactDate(task.createdAt)}</span>
                <TaskReference url={task.referenceUrl} />
              </div>
              <div className="row-actions">
                <button className="row-detail-action" type="button" onClick={() => onOpenTask(task)}><PanelRightOpen size={15} /> Details</button>
                <button className="button-secondary" type="button" onClick={() => onMoveToReady(task.id, readyCount)} disabled={busyTaskId === task.id}>
                  Ready <ArrowRight size={15} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      {tasks.length > INBOX_PREVIEW_SIZE && (
        <button className="zone-show-all" type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
          {expanded ? 'Show fewer' : `Show all ${tasks.length} captured tasks`} <ChevronDown size={15} />
        </button>
      )}
    </section>
  )
}

function DoneSection({ tasks, checkpointsByTask, onOpenTask }) {
  const [expanded, setExpanded] = useState(false)
  const ordered = [...tasks].sort((left, right) => {
    const leftDate = checkpointsByTask[left.id]?.[0]?.createdAt || left.createdAt
    const rightDate = checkpointsByTask[right.id]?.[0]?.createdAt || right.createdAt
    return new Date(rightDate) - new Date(leftDate)
  })
  const visible = expanded ? ordered : ordered.slice(0, DONE_PREVIEW_SIZE)

  return (
    <section className="collection-panel done-panel" id="done-panel" role="tabpanel" aria-labelledby="done-tab">
      <header className="collection-panel-header">
        <div><p className="section-kicker">Evidence archive</p><h2>Completed with context</h2><p>Every closed outcome keeps the proof that moved it forward.</p></div>
      </header>

      {tasks.length === 0 ? (
        <div className="zone-empty"><Archive size={17} /><p><strong>No closed loops yet.</strong><span>Completed tasks and their checkpoints will collect here.</span></p></div>
      ) : (
        <ol className="done-archive">
          {visible.map((task) => {
            const taskCheckpoints = checkpointsByTask[task.id] || []
            const checkpoint = taskCheckpoints.find((item) => item.whatChanged?.trim()) || taskCheckpoints[0]
            const evidence = checkpoint?.whatChanged || checkpoint?.nextStep || 'Completed without a written change note.'
            return (
              <li key={task.id}>
                <span className="archive-mark"><Check size={15} aria-hidden="true" /></span>
                <div className="archive-copy">
                  <button type="button" onClick={() => onOpenTask(task)}>{task.title}</button>
                  <p>{evidence}</p>
                </div>
                <div className="archive-meta">
                  <time dateTime={checkpoint?.createdAt || task.createdAt}>{formatCompactDate(checkpoint?.createdAt || task.createdAt)}</time>
                  <button type="button" onClick={() => onOpenTask(task)}>View proof <ArrowRight size={14} /></button>
                </div>
              </li>
            )
          })}
        </ol>
      )}
      {tasks.length > DONE_PREVIEW_SIZE && (
        <button className="zone-show-all" type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
          {expanded ? 'Show recent only' : `Open all ${tasks.length} completed tasks`} <ChevronDown size={15} />
        </button>
      )}
    </section>
  )
}

function TaskCollection({ view, onView, inboxTasks, doneTasks, checkpointsByTask, inboxProps, onOpenTask }) {
  function handleTabKey(event) {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
    event.preventDefault()
    const nextView = view === 'inbox' ? 'done' : 'inbox'
    onView(nextView)
    window.requestAnimationFrame(() => document.getElementById(`${nextView}-tab`)?.focus())
  }

  return (
    <section className="task-collection" aria-label="Task collection">
      <div className="collection-tabs" role="tablist" aria-label="Choose task state" onKeyDown={handleTabKey}>
        <button
          id="inbox-tab"
          type="button"
          role="tab"
          aria-selected={view === 'inbox'}
          aria-controls="inbox-panel"
          tabIndex={view === 'inbox' ? 0 : -1}
          onClick={() => onView('inbox')}
        >
          <Inbox size={16} aria-hidden="true" />
          <span>Inbox</span>
          <b>{inboxTasks.length}</b>
        </button>
        <button
          id="done-tab"
          type="button"
          role="tab"
          aria-selected={view === 'done'}
          aria-controls="done-panel"
          tabIndex={view === 'done' ? 0 : -1}
          onClick={() => onView('done')}
        >
          <Archive size={16} aria-hidden="true" />
          <span>Done</span>
          <b>{doneTasks.length}</b>
        </button>
      </div>

      <div className="collection-stage" key={view}>
        {view === 'inbox'
          ? <InboxSection tasks={inboxTasks} onOpenTask={onOpenTask} {...inboxProps} />
          : <DoneSection tasks={doneTasks} checkpointsByTask={checkpointsByTask} onOpenTask={onOpenTask} />}
      </div>
    </section>
  )
}

function WorkSkeleton({ mode }) {
  return <div className="work-view"><header className="work-header"><div><p className="page-kicker">{mode === 'work' ? 'Execute' : 'Organize'}</p><h1>{mode === 'work' ? 'Work' : 'Tasks'}</h1><p>{mode === 'work' ? 'One clear move now. The rest can wait.' : 'Capture, clarify, and choose what becomes ready.'}</p></div></header><div className="work-skeleton" aria-label="Loading workspace" aria-busy="true"><p className="section-kicker">Loading workspace</p><div /><div /></div></div>
}

export default function WorkScreen({ mode = 'work', onOpenTasks, onOpenReview }) {
  const [tasks, setTasks] = useState([])
  const [session, setSession] = useState(null)
  const [checkpointsByTask, setCheckpointsByTask] = useState({})
  const [drawerHistoryState, setDrawerHistoryState] = useState({ loading: false, error: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyTaskId, setBusyTaskId] = useState('')
  const [readyExpanded, setReadyExpanded] = useState(false)
  const [inboxComposerOpen, setInboxComposerOpen] = useState(false)
  const [collectionView, setCollectionView] = useState('inbox')
  const [focusOpen, setFocusOpen] = useState(false)
  const [checkpointSession, setCheckpointSession] = useState(null)
  const [selectedTaskId, setSelectedTaskId] = useState('')

  const loadWorkspace = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [nextTasks, nextSession] = await Promise.all([
        workApi.listTasks(),
        workApi.getActiveSession(),
      ])
      const tasksWithHistory = nextTasks.filter((task) => task.status !== 'inbox')
      setTasks(nextTasks)
      setSession(nextSession)
      setCheckpointsByTask({})
      setLoading(false)

      const histories = await Promise.all(tasksWithHistory.map(async (task) => {
        try {
          return [task.id, await workApi.getTaskCheckpoints(task.id)]
        } catch {
          return [task.id, []]
        }
      }))
      setCheckpointsByTask(Object.fromEntries(histories))
    } catch (requestError) {
      setError(requestError.message)
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadWorkspace() }, [loadWorkspace])

  const grouped = useMemo(() => groupTasks(tasks), [tasks])
  const now = useMemo(() => deriveNowState({ tasks, session, checkpointsByTask }), [tasks, session, checkpointsByTask])
  const focusTask = useMemo(() => tasks.find((task) => task.id === session?.taskId), [session, tasks])
  const checkpointTask = useMemo(() => tasks.find((task) => task.id === checkpointSession?.taskId), [checkpointSession, tasks])
  const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedTaskId), [selectedTaskId, tasks])

  function openInboxComposer() {
    setCollectionView('inbox')
    setInboxComposerOpen(true)
    window.requestAnimationFrame(() => {
      const field = document.getElementById('inbox-task-title')
      field?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      field?.focus({ preventScroll: true })
    })
  }

  async function openTaskDrawer(task) {
    setSelectedTaskId(task.id)
    setDrawerHistoryState({ loading: !checkpointsByTask[task.id], error: '' })
    if (checkpointsByTask[task.id]) return
    try {
      const checkpoints = await workApi.getTaskCheckpoints(task.id)
      setCheckpointsByTask((current) => ({ ...current, [task.id]: checkpoints }))
      setDrawerHistoryState({ loading: false, error: '' })
    } catch (requestError) {
      setDrawerHistoryState({ loading: false, error: requestError.message })
    }
  }

  async function startTask(taskId) {
    if (session) return false
    setBusyTaskId(taskId)
    setError('')
    try {
      const created = await workApi.createSession(taskId, readWorkProtocol(localStorage).focusMinutes * 60)
      setSession(created)
      setSelectedTaskId('')
      setFocusOpen(true)
      return true
    } catch (requestError) {
      setError(requestError.message)
      return false
    } finally {
      setBusyTaskId('')
    }
  }

  async function handleNowAction() {
    if (now.kind === 'idle') {
      if (mode === 'work' && onOpenTasks) onOpenTasks()
      else openInboxComposer()
      return
    }
    if (now.kind === 'active' || now.kind === 'paused') {
      setFocusOpen(true)
      return
    }
    if (!now.task) return

    await startTask(now.task.id)
  }

  function handleSessionEnded(endedSession) {
    setSession(null)
    setFocusOpen(false)
    setCheckpointSession(endedSession)
  }

  async function handleEndSession() {
    if (!session) return
    setBusyTaskId(session.taskId)
    setError('')
    try {
      const ended = await workApi.transitionSession(session.id, 'end')
      handleSessionEnded(ended)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyTaskId('')
    }
  }

  function handleCheckpointSaved(checkpoint) {
    setTasks((current) => applyCheckpointToTasks(current, checkpoint))
    setCheckpointsByTask((current) => ({
      ...current,
      [checkpoint.taskId]: [checkpoint, ...(current[checkpoint.taskId] || [])],
    }))
    setCollectionView(checkpoint.outcome === 'complete' ? 'done' : 'inbox')
    setCheckpointSession(null)
  }

  async function createTask(title, status = tasks.length === 0 ? 'ready' : 'inbox') {
    setBusyTaskId('creating')
    setError('')
    try {
      const task = await workApi.createTask({ title, status, ...(status === 'ready' ? { order: grouped.ready.length } : {}) })
      setTasks((current) => [...current, task])
      return true
    } catch (requestError) {
      setError(requestError.message)
      return false
    } finally {
      setBusyTaskId('')
    }
  }

  async function moveTask(taskId, changes) {
    setBusyTaskId(taskId)
    setError('')
    try {
      const updated = await workApi.updateTask(taskId, changes)
      setTasks((current) => current.map((task) => task.id === taskId ? updated : task))
      if (updated.status === 'ready' && !checkpointsByTask[taskId]) {
        const history = await workApi.getTaskCheckpoints(taskId)
        setCheckpointsByTask((current) => ({ ...current, [taskId]: history }))
      }
      return updated
    } catch (requestError) {
      setError(requestError.message)
      return null
    } finally {
      setBusyTaskId('')
    }
  }

  async function moveTaskToStatus(taskId, status) {
    const changes = status === 'ready' ? { status, order: grouped.ready.length } : { status }
    return moveTask(taskId, changes)
  }

  async function deleteTask(taskId) {
    setBusyTaskId(taskId)
    setError('')
    try {
      await workApi.deleteTask(taskId)
      setTasks((current) => current.filter((task) => task.id !== taskId))
      setCheckpointsByTask((current) => {
        const next = { ...current }
        delete next[taskId]
        return next
      })
      return true
    } catch (requestError) {
      setError(requestError.message)
      return false
    } finally {
      setBusyTaskId('')
    }
  }

  if (loading) return <WorkSkeleton mode={mode} />

  return (
    <div className={`work-view is-${mode}`}>
      <header className="work-header">
        <div>
          <p className="page-kicker">{mode === 'work' ? 'Execute' : 'Organize'}</p>
          <h1>{mode === 'work' ? 'Work' : 'Tasks'}</h1>
          <p>{mode === 'work' ? 'One clear move now. The rest can wait.' : 'Capture, clarify, and choose what becomes ready.'}</p>
        </div>
        {tasks.length > 0 && <button className="button-secondary new-task-button" type="button" onClick={mode === 'work' && onOpenTasks ? onOpenTasks : openInboxComposer}><Plus size={16} /> New task</button>}
      </header>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button type="button" onClick={loadWorkspace}><RotateCw size={15} /> Retry</button>
        </div>
      )}

      {mode === 'work' && <NowCard
          state={now}
          onCreate={(title) => createTask(title, 'ready')}
          onAction={handleNowAction}
          onEndSession={handleEndSession}
          onOpenTask={openTaskDrawer}
          disabled={Boolean(busyTaskId)}
        />}

      {mode === 'tasks' && (now.kind === 'active' || now.kind === 'paused') && <NowCard
          state={now}
          compact
          onCreate={(title) => createTask(title, 'ready')}
          onAction={handleNowAction}
          onEndSession={handleEndSession}
          onOpenTask={openTaskDrawer}
          disabled={Boolean(busyTaskId)}
        />}

      {mode === 'tasks' && tasks.length === 0 && (
        <section className="tasks-first-capture">
          <div><p className="section-kicker">Empty workspace</p><h2>Capture the first thing worth moving.</h2><p>It will enter Ready immediately, so Work has a clear starting point.</p></div>
          <CaptureForm onCreate={(title) => createTask(title, 'ready')} disabled={Boolean(busyTaskId)} />
        </section>
      )}

      {tasks.length > 0 && (
        <>
          <ReadySection
            tasks={grouped.ready}
            checkpointsByTask={checkpointsByTask}
            nowTaskId={now.task?.id}
            expanded={readyExpanded}
            onExpanded={setReadyExpanded}
            onOpenTask={openTaskDrawer}
            onStartTask={startTask}
            session={session}
            busyTaskId={busyTaskId}
          />
          {mode === 'tasks' && <TaskCollection
              view={collectionView}
              onView={(nextView) => { setCollectionView(nextView); setInboxComposerOpen(false) }}
              inboxTasks={grouped.inbox}
              doneTasks={grouped.done}
              checkpointsByTask={checkpointsByTask}
              onOpenTask={openTaskDrawer}
              inboxProps={{
                composerOpen: inboxComposerOpen,
                onComposerOpen: openInboxComposer,
                onComposerClose: () => setInboxComposerOpen(false),
                onCreate: (title) => createTask(title, 'inbox'),
                onMoveToReady: (taskId, order) => moveTask(taskId, { status: 'ready', order }),
                readyCount: grouped.ready.length,
                busyTaskId,
              }}
            />}
          {mode === 'work' && (
            <nav className="work-crosslinks" aria-label="Continue through Pomogit">
              <button type="button" onClick={onOpenTasks}><span><b>Need to reorganize?</b><small>Open every captured and completed task.</small></span><ArrowRight size={16} /></button>
              <button type="button" onClick={onOpenReview}><span><b>Looking for context?</b><small>Read checkpoints and saved handoffs.</small></span><ArrowRight size={16} /></button>
            </nav>
          )}
        </>
      )}

      <TaskDrawer
        key={selectedTask?.id || 'closed-task-drawer'}
        open={Boolean(selectedTask)}
        task={selectedTask}
        checkpoints={selectedTask ? checkpointsByTask[selectedTask.id] : []}
        historyLoading={drawerHistoryState.loading}
        historyError={drawerHistoryState.error}
        session={session}
        busy={busyTaskId === selectedTask?.id}
        onClose={() => setSelectedTaskId('')}
        onStart={startTask}
        onReturnToFocus={() => { setSelectedTaskId(''); setFocusOpen(true) }}
        onMove={moveTaskToStatus}
        onUpdate={moveTask}
        onDelete={deleteTask}
      />

      <FocusOverlay
        open={focusOpen}
        session={session}
        task={focusTask}
        onClose={() => setFocusOpen(false)}
        onSessionChange={setSession}
        onEnded={handleSessionEnded}
      />
      <CheckpointOverlay
        open={Boolean(checkpointSession)}
        session={checkpointSession}
        task={checkpointTask}
        onSaved={handleCheckpointSaved}
      />
    </div>
  )
}
