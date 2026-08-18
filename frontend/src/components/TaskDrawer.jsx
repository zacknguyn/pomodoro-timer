import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  ExternalLink,
  Inbox,
  Pencil,
  Play,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'
import { DitherButton } from './dither-kit/DitherButton'

const STATUS_COPY = {
  inbox: { label: 'Inbox', description: 'Captured, but not committed to the queue.' },
  ready: { label: 'Ready', description: 'Clarified and available to focus.' },
  done: { label: 'Done', description: 'Closed with a checkpoint.' },
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function DrawerHistory({ checkpoints, loading, error }) {
  if (loading) return <p className="drawer-history-status">Loading history…</p>
  if (error) return <p className="drawer-history-status is-error">{error}</p>
  if (!checkpoints?.length) return <p className="drawer-history-status">No checkpoints yet. Finish a focus session to leave the first one.</p>

  return (
    <ol className="drawer-history-list">
      {checkpoints.map((checkpoint) => (
        <li key={checkpoint.id}>
          <div className="drawer-checkpoint-meta">
            <span>{checkpoint.outcome === 'complete' ? 'Completed' : 'Continued'}</span>
            <time dateTime={checkpoint.createdAt}>{formatDate(checkpoint.createdAt)}</time>
          </div>
          {checkpoint.whatChanged && <p><span>Changed</span>{checkpoint.whatChanged}</p>}
          {checkpoint.nextStep && <p className="is-next"><span>Next</span>{checkpoint.nextStep}</p>}
          {!checkpoint.whatChanged && !checkpoint.nextStep && <small>No change note or next step was recorded.</small>}
        </li>
      ))}
    </ol>
  )
}

export function TaskDrawer({
  open,
  task,
  checkpoints,
  historyLoading,
  historyError,
  session,
  busy,
  onClose,
  onStart,
  onReturnToFocus,
  onMove,
  onUpdate,
  onDelete,
}) {
  const dialogRef = useRef(null)
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [title, setTitle] = useState(task?.title || '')
  const [referenceUrl, setReferenceUrl] = useState(task?.referenceUrl || '')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return undefined
    const handleClose = () => onClose()
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [onClose])

  if (!task) return null

  const status = STATUS_COPY[task.status] || STATUS_COPY.inbox
  const hasOpenSession = session?.taskId === task.id

  async function submitEdit(event) {
    event.preventDefault()
    const nextTitle = title.trim()
    if (!nextTitle) {
      setFormError('Name the task before saving it.')
      return
    }
    const updated = await onUpdate(task.id, { title: nextTitle, referenceUrl: referenceUrl.trim() })
    if (updated) setEditing(false)
  }

  async function deleteTask() {
    const deleted = await onDelete(task.id)
    if (deleted) onClose()
  }

  return (
    <dialog ref={dialogRef} className="task-drawer-dialog" aria-labelledby="task-drawer-title">
      <div className="task-drawer">
        <header className="task-drawer-topbar">
          <div>
            <span className={`task-status is-${task.status}`}>{status.label}</span>
            <span>{status.description}</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close task details"><X size={18} /></button>
        </header>

        <div className="task-drawer-body">
          {editing ? (
            <form className="task-edit-form" onSubmit={submitEdit}>
              <div className="task-drawer-heading">
                <p className="section-kicker">Edit task</p>
                <h2 id="task-drawer-title">Task details</h2>
              </div>
              <label>
                Title
                <input value={title} onChange={(event) => { setTitle(event.target.value); setFormError('') }} maxLength={240} autoFocus />
              </label>
              <label>
                Reference URL <span>Optional</span>
                <input type="url" value={referenceUrl} onChange={(event) => setReferenceUrl(event.target.value)} placeholder="https://github.com/…" />
              </label>
              {formError && <p className="field-error">{formError}</p>}
              <div className="task-edit-actions">
                <button className="button-secondary" type="button" onClick={() => setEditing(false)}>Cancel</button>
                <DitherButton type="submit" disabled={busy}>Save changes</DitherButton>
              </div>
            </form>
          ) : (
            <>
              <section className="task-drawer-summary">
                <p className="section-kicker">Task detail</p>
                <h2 id="task-drawer-title">{task.title}</h2>
                {task.referenceUrl && (
                  <a href={task.referenceUrl} target="_blank" rel="noreferrer">
                    Open reference <ExternalLink size={14} aria-hidden="true" />
                  </a>
                )}
              </section>

              <section className="task-drawer-actions" aria-labelledby="task-actions-heading">
                <div className="drawer-section-heading">
                  <p className="section-kicker">Next action</p>
                  <h3 id="task-actions-heading">Move this task</h3>
                </div>
                {hasOpenSession && (
                  <DitherButton onClick={onReturnToFocus} disabled={busy}>
                    Return to focus <ArrowRight size={16} aria-hidden="true" />
                  </DitherButton>
                )}
                {!hasOpenSession && task.status === 'ready' && (
                  <DitherButton onClick={() => onStart(task.id)} disabled={busy || Boolean(session)}>
                    <Play size={16} aria-hidden="true" /> Start focus
                  </DitherButton>
                )}
                {task.status === 'inbox' && (
                  <DitherButton onClick={() => onMove(task.id, 'ready')} disabled={busy}>
                    Move to Ready <ArrowRight size={16} aria-hidden="true" />
                  </DitherButton>
                )}
                {task.status === 'ready' && !hasOpenSession && (
                  <button className="button-secondary" type="button" onClick={() => onMove(task.id, 'inbox')} disabled={busy}>
                    <Inbox size={16} aria-hidden="true" /> Return to Inbox
                  </button>
                )}
                {task.status === 'done' && (
                  <DitherButton onClick={() => onMove(task.id, 'ready')} disabled={busy}>
                    <RotateCcw size={16} aria-hidden="true" /> Reopen task
                  </DitherButton>
                )}
                {session && !hasOpenSession && task.status === 'ready' && (
                  <p className="drawer-action-note">A different task is already in focus. Finish or checkpoint it before starting this one.</p>
                )}
              </section>

              <section className="task-drawer-history" aria-labelledby="task-history-heading">
                <div className="drawer-section-heading">
                  <p className="section-kicker">Recorded work</p>
                  <h3 id="task-history-heading">Checkpoint history</h3>
                </div>
                <DrawerHistory checkpoints={checkpoints} loading={historyLoading} error={historyError} />
              </section>

              <section className="task-drawer-utilities" aria-labelledby="task-utilities-heading">
                <div className="drawer-section-heading">
                  <p className="section-kicker">Task controls</p>
                  <h3 id="task-utilities-heading">Manage</h3>
                </div>
                <button type="button" onClick={() => setEditing(true)}><Pencil size={15} /> Edit details</button>
                {!confirmingDelete ? (
                  <button className="is-danger" type="button" onClick={() => setConfirmingDelete(true)} disabled={hasOpenSession}>
                    <Trash2 size={15} /> Delete task
                  </button>
                ) : (
                  <div className="delete-confirmation" role="alert">
                    <p><strong>Delete this task?</strong><span>Its saved checkpoints will no longer be attached to Work.</span></p>
                    <div>
                      <button type="button" onClick={() => setConfirmingDelete(false)}>Keep task</button>
                      <button className="is-danger" type="button" onClick={deleteTask} disabled={busy}><Trash2 size={14} /> Delete</button>
                    </div>
                  </div>
                )}
                {hasOpenSession && <p className="drawer-utility-note">End the current session before deleting this task.</p>}
              </section>
            </>
          )}
        </div>
      </div>
    </dialog>
  )
}
