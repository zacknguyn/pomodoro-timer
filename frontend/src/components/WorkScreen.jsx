import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Inbox,
  Plus,
  RotateCw,
} from 'lucide-react'
import { DitherButton } from './dither-kit/DitherButton'
import { DitherGradient } from './dither-kit/DitherGradient'
import { CheckpointOverlay } from './CheckpointOverlay'
import { FocusOverlay } from './FocusOverlay'
import { workApi } from '../lib/workApi'
import { applyCheckpointToTasks } from '../lib/checkpointForm'
import { deriveNowState, groupTasks } from '../lib/workView'

const READY_PREVIEW_SIZE = 4

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function TaskReference({ url }) {
  if (!url) return null
  return (
    <a className="task-reference" href={url} target="_blank" rel="noreferrer">
      Reference <ExternalLink size={13} aria-hidden="true" />
    </a>
  )
}

function CaptureForm({ compact = false, onCreate, disabled }) {
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

function NowCard({ state, onCreate, onAction, disabled }) {
  const title = state.task?.title || (state.kind === 'empty' ? null : 'Choose what should move next')
  const supporting = state.kind === 'active'
    ? 'This session is running. Return when you are ready to leave a checkpoint.'
    : state.kind === 'paused'
      ? 'Your remaining focus time is preserved.'
      : state.kind === 'continue'
        ? state.checkpoint.nextStep
        : state.kind === 'ready'
          ? 'The first task in your Ready order.'
          : 'Move a task from Inbox into Ready, or capture a new one.'

  return (
    <section className={`now-card is-${state.kind}`} aria-labelledby={state.kind === 'empty' ? undefined : 'now-heading'} aria-label={state.kind === 'empty' ? 'Now' : undefined}>
      <DitherGradient from="blue" to="transparent" direction="right" cell={3} opacity={0.48} bloom="high" className="now-texture" />
      <div className="now-index" aria-hidden="true"><span>NOW</span><strong>01</strong></div>
      <div className="now-copy">
        <p className="section-kicker">{state.eyebrow}</p>
        {state.kind === 'empty' ? (
          <CaptureForm onCreate={onCreate} disabled={disabled} />
        ) : (
          <>
            <h2 id="now-heading">{title}</h2>
            <p>{supporting}</p>
            <TaskReference url={state.task?.referenceUrl} />
          </>
        )}
      </div>
      {state.kind !== 'empty' && (
        <DitherButton
          className="now-action"
          onClick={onAction}
          disabled={disabled}
          aria-label={`${state.action}${state.task ? `: ${state.task.title}` : ''}`}
        >
          {state.action} <ArrowRight size={17} aria-hidden="true" />
        </DitherButton>
      )}
    </section>
  )
}

function ReadySection({ tasks, checkpointsByTask, nowTaskId, expanded, onExpanded, onMoveToInbox, busyTaskId }) {
  const remaining = tasks.filter((task) => task.id !== nowTaskId)
  if (remaining.length === 0) return null
  const visible = expanded ? remaining : remaining.slice(0, READY_PREVIEW_SIZE)

  return (
    <section className="work-section" aria-labelledby="ready-heading">
      <header className="section-heading">
        <div><p className="section-kicker">Up next</p><h2 id="ready-heading">Ready</h2></div>
        <span className="count-pill" aria-label={`${remaining.length} ready tasks`}>{remaining.length}</span>
      </header>
      <ol className="task-list ready-list">
        {visible.map((task, index) => {
          const nextStep = (checkpointsByTask[task.id] || []).find((checkpoint) => checkpoint.outcome === 'continue')?.nextStep
          return (
            <li key={task.id}>
              <span className="task-order">{String(index + 2).padStart(2, '0')}</span>
              <div className="task-copy">
                <strong>{task.title}</strong>
                {nextStep && <span>Next: {nextStep}</span>}
                <TaskReference url={task.referenceUrl} />
              </div>
              <button className="text-action" type="button" onClick={() => onMoveToInbox(task.id)} disabled={busyTaskId === task.id}>Move to Inbox</button>
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

function InboxSection({ tasks, open, onOpen, onCreate, onMoveToReady, readyCount, busyTaskId }) {
  return (
    <section className="work-section collapsible-section" aria-labelledby="inbox-heading">
      <button className="collapse-trigger" type="button" onClick={() => onOpen(!open)} aria-expanded={open}>
        <span className="collapse-icon">{open ? <ChevronDown size={17} /> : <ChevronRight size={17} />}</span>
        <span><span className="section-kicker">Captured</span><strong id="inbox-heading">Inbox</strong></span>
        <span className="count-pill" aria-label={`${tasks.length} inbox tasks`}>{tasks.length}</span>
      </button>
      <div className="collapse-content" data-open={open}>
        <div>
          <CaptureForm compact onCreate={onCreate} disabled={Boolean(busyTaskId)} />
          {tasks.length === 0 ? <p className="section-empty">Nothing is waiting for clarification.</p> : (
            <ul className="task-list inbox-list">
              {tasks.map((task) => (
                <li key={task.id}>
                  <Inbox size={16} aria-hidden="true" />
                  <div className="task-copy"><strong>{task.title}</strong><TaskReference url={task.referenceUrl} /></div>
                  <button className="button-secondary" type="button" onClick={() => onMoveToReady(task.id, readyCount)} disabled={busyTaskId === task.id}>
                    Ready <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

function CheckpointHistory({ checkpoints, loading, error }) {
  if (loading) return <p className="history-status">Loading checkpoints…</p>
  if (error) return <p className="history-status is-error">{error}</p>
  if (!checkpoints?.length) return <p className="history-status">No checkpoints were saved for this task.</p>

  return (
    <ol className="checkpoint-list" aria-label="Checkpoint history">
      {checkpoints.map((checkpoint) => (
        <li key={checkpoint.id}>
          <div className="checkpoint-meta">
            <span>{checkpoint.outcome === 'complete' ? 'Completed' : 'Continued'}</span>
            <time dateTime={checkpoint.createdAt}>{formatDate(checkpoint.createdAt)}</time>
          </div>
          {checkpoint.whatChanged && <p><strong>Changed</strong>{checkpoint.whatChanged}</p>}
          {checkpoint.nextStep && <p><strong>Next</strong>{checkpoint.nextStep}</p>}
        </li>
      ))}
    </ol>
  )
}

function DoneSection({ tasks, checkpointsByTask, historyState, onToggleTask }) {
  const [open, setOpen] = useState(false)
  return (
    <section className="work-section collapsible-section" aria-labelledby="done-heading">
      <button className="collapse-trigger" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span className="collapse-icon">{open ? <ChevronDown size={17} /> : <ChevronRight size={17} />}</span>
        <span><span className="section-kicker">Closed loop</span><strong id="done-heading">Done</strong></span>
        <span className="count-pill" aria-label={`${tasks.length} completed tasks`}>{tasks.length}</span>
      </button>
      <div className="collapse-content" data-open={open}>
        <div>
          {tasks.length === 0 ? <p className="section-empty">Completed tasks will collect here.</p> : (
            <ul className="done-list">
              {tasks.map((task) => {
                const state = historyState[task.id] || {}
                return (
                  <li key={task.id}>
                    <button className="done-task-trigger" type="button" onClick={() => onToggleTask(task.id)} aria-expanded={Boolean(state.open)}>
                      <Check size={16} aria-hidden="true" />
                      <span>{task.title}</span>
                      {state.open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    {state.open && <CheckpointHistory checkpoints={checkpointsByTask[task.id]} loading={state.loading} error={state.error} />}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

function WorkSkeleton() {
  return <div className="work-skeleton" aria-label="Loading workspace" aria-busy="true"><div /><div /><div /></div>
}

export default function WorkScreen() {
  const [tasks, setTasks] = useState([])
  const [session, setSession] = useState(null)
  const [checkpointsByTask, setCheckpointsByTask] = useState({})
  const [historyState, setHistoryState] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyTaskId, setBusyTaskId] = useState('')
  const [readyExpanded, setReadyExpanded] = useState(false)
  const [inboxOpen, setInboxOpen] = useState(false)
  const [focusOpen, setFocusOpen] = useState(false)
  const [checkpointSession, setCheckpointSession] = useState(null)

  const loadWorkspace = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [nextTasks, nextSession] = await Promise.all([
        workApi.listTasks(),
        workApi.getActiveSession(),
      ])
      const readyTasks = nextTasks.filter((task) => task.status === 'ready')
      const histories = await Promise.all(readyTasks.map(async (task) => [task.id, await workApi.getTaskCheckpoints(task.id)]))
      setTasks(nextTasks)
      setSession(nextSession)
      setCheckpointsByTask(Object.fromEntries(histories))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadWorkspace() }, [loadWorkspace])

  const grouped = useMemo(() => groupTasks(tasks), [tasks])
  const now = useMemo(() => deriveNowState({ tasks, session, checkpointsByTask }), [tasks, session, checkpointsByTask])
  const focusTask = useMemo(() => tasks.find((task) => task.id === session?.taskId), [session, tasks])
  const checkpointTask = useMemo(() => tasks.find((task) => task.id === checkpointSession?.taskId), [checkpointSession, tasks])

  function openInboxComposer() {
    setInboxOpen(true)
    window.requestAnimationFrame(() => {
      const field = document.getElementById('inbox-task-title')
      field?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      field?.focus({ preventScroll: true })
    })
  }

  async function handleNowAction() {
    if (now.kind === 'idle') {
      openInboxComposer()
      return
    }
    if (now.kind === 'active' || now.kind === 'paused') {
      setFocusOpen(true)
      return
    }
    if (!now.task) return

    setBusyTaskId(now.task.id)
    setError('')
    try {
      const created = await workApi.createSession(now.task.id, 25 * 60)
      setSession(created)
      setFocusOpen(true)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyTaskId('')
    }
  }

  function handleSessionEnded(endedSession) {
    setSession(null)
    setFocusOpen(false)
    setCheckpointSession(endedSession)
  }

  function handleCheckpointSaved(checkpoint) {
    setTasks((current) => applyCheckpointToTasks(current, checkpoint))
    setCheckpointsByTask((current) => ({
      ...current,
      [checkpoint.taskId]: [checkpoint, ...(current[checkpoint.taskId] || [])],
    }))
    setCheckpointSession(null)
  }

  async function createTask(title, status = tasks.length === 0 ? 'ready' : 'inbox') {
    setBusyTaskId('creating')
    setError('')
    try {
      const task = await workApi.createTask({ title, status, ...(status === 'ready' ? { order: grouped.ready.length } : {}) })
      setTasks((current) => [...current, task])
      if (status === 'inbox') setInboxOpen(true)
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
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusyTaskId('')
    }
  }

  async function toggleDoneTask(taskId) {
    const current = historyState[taskId]
    if (current?.open) {
      setHistoryState((state) => ({ ...state, [taskId]: { ...state[taskId], open: false } }))
      return
    }

    setHistoryState((state) => ({ ...state, [taskId]: { open: true, loading: !checkpointsByTask[taskId], error: '' } }))
    if (checkpointsByTask[taskId]) return
    try {
      const checkpoints = await workApi.getTaskCheckpoints(taskId)
      setCheckpointsByTask((currentState) => ({ ...currentState, [taskId]: checkpoints }))
      setHistoryState((state) => ({ ...state, [taskId]: { open: true, loading: false, error: '' } }))
    } catch (requestError) {
      setHistoryState((state) => ({ ...state, [taskId]: { open: true, loading: false, error: requestError.message } }))
    }
  }

  if (loading) return <WorkSkeleton />

  return (
    <div className="work-view">
      <header className="work-header">
        <div><p className="page-kicker">Workspace / Work</p><h1>Work</h1><p>One task in motion, the next few within reach.</p></div>
        {tasks.length > 0 && <button className="button-secondary new-task-button" type="button" onClick={openInboxComposer}><Plus size={16} /> New task</button>}
      </header>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button type="button" onClick={loadWorkspace}><RotateCw size={15} /> Retry</button>
        </div>
      )}

      <NowCard state={now} onCreate={(title) => createTask(title, 'ready')} onAction={handleNowAction} disabled={Boolean(busyTaskId)} />

      {tasks.length > 0 && (
        <>
          <ReadySection
            tasks={grouped.ready}
            checkpointsByTask={checkpointsByTask}
            nowTaskId={now.task?.id}
            expanded={readyExpanded}
            onExpanded={setReadyExpanded}
            onMoveToInbox={(taskId) => moveTask(taskId, { status: 'inbox' })}
            busyTaskId={busyTaskId}
          />
          <InboxSection
            tasks={grouped.inbox}
            open={inboxOpen}
            onOpen={setInboxOpen}
            onCreate={(title) => createTask(title, 'inbox')}
            onMoveToReady={(taskId, order) => moveTask(taskId, { status: 'ready', order })}
            readyCount={grouped.ready.length}
            busyTaskId={busyTaskId}
          />
          <DoneSection tasks={grouped.done} checkpointsByTask={checkpointsByTask} historyState={historyState} onToggleTask={toggleDoneTask} />
        </>
      )}

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
