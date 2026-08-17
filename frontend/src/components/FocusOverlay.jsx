import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Pause, Play, Square } from 'lucide-react'
import { DitherButton } from './dither-kit/DitherButton'
import { workApi } from '../lib/workApi'
import { formatSessionClock, getSessionProgress, getSessionRemainingSeconds } from '../lib/sessionClock'

function useModalDialog(open, onClose) {
  const dialogRef = useRef(null)

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

  return dialogRef
}

export function FocusOverlay({ open, session, task, onClose, onSessionChange, onEnded }) {
  const dialogRef = useModalDialog(open, onClose)
  const [remaining, setRemaining] = useState(() => getSessionRemainingSeconds(session))
  const [busyAction, setBusyAction] = useState('')
  const [error, setError] = useState('')
  const endingRef = useRef(false)

  useEffect(() => {
    setRemaining(getSessionRemainingSeconds(session))
    endingRef.current = false
  }, [session])

  const transition = useCallback(async (action) => {
    if (!session || busyAction || (action === 'end' && endingRef.current)) return
    if (action === 'end') endingRef.current = true
    setBusyAction(action)
    setError('')
    try {
      const updated = await workApi.transitionSession(session.id, action)
      if (action === 'end') onEnded(updated)
      else onSessionChange(updated)
    } catch (requestError) {
      endingRef.current = false
      setError(requestError.message)
    } finally {
      setBusyAction('')
    }
  }, [busyAction, onEnded, onSessionChange, session])

  useEffect(() => {
    if (session?.status !== 'active') return undefined
    const update = () => {
      const next = getSessionRemainingSeconds(session)
      setRemaining(next)
      if (next === 0) void transition('end')
    }
    update()
    const timer = window.setInterval(update, 250)
    return () => window.clearInterval(timer)
  }, [session, transition])

  if (!session || !task) return null

  const paused = session.status === 'paused'
  const progress = getSessionProgress(session, remaining)

  return (
    <dialog ref={dialogRef} className="focus-dialog" aria-labelledby="focus-title">
      <div className="focus-surface">
        <header className="focus-topbar">
          <button className="focus-back" type="button" onClick={onClose}>
            <ArrowLeft size={17} aria-hidden="true" /> Back to Work
          </button>
          <span className={`focus-status ${paused ? 'is-paused' : ''}`}>
            <i aria-hidden="true" /> {paused ? 'Paused' : 'Focusing'}
          </span>
        </header>

        <div className="focus-main">
          <div className="focus-task">
            <p className="section-kicker">Current outcome</p>
            <h1 id="focus-title">{task.title}</h1>
            <p>{paused ? 'Time is held exactly where you left it.' : 'Stay with this outcome. Everything else can wait.'}</p>
          </div>

          <div className="focus-clock-block" aria-live="off">
            <span className="focus-clock" role="timer" aria-label={`${remaining} seconds remaining`}>
              {formatSessionClock(remaining)}
            </span>
            <div className="focus-progress" aria-hidden="true"><span style={{ transform: `scaleX(${progress})` }} /></div>
            <span className="focus-duration">{Math.ceil(session.durationPlannedSeconds / 60)} minute session</span>
          </div>

          {error && <p className="focus-error" role="alert">{error}</p>}

          <div className="focus-actions">
            <DitherButton
              variant="solid"
              onClick={() => transition(paused ? 'resume' : 'pause')}
              disabled={Boolean(busyAction)}
            >
              {paused ? <Play size={17} aria-hidden="true" /> : <Pause size={17} aria-hidden="true" />}
              {busyAction === (paused ? 'resume' : 'pause') ? 'Updating…' : paused ? 'Resume' : 'Pause'}
            </DitherButton>
            <button className="focus-end" type="button" onClick={() => transition('end')} disabled={Boolean(busyAction)}>
              <Square size={15} aria-hidden="true" /> {busyAction === 'end' ? 'Ending…' : 'End session'}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  )
}

export function CheckpointShell({ open, task, onClose }) {
  const dialogRef = useModalDialog(open, onClose)
  if (!task) return null

  return (
    <dialog ref={dialogRef} className="checkpoint-dialog" aria-labelledby="checkpoint-title">
      <div className="checkpoint-shell">
        <p className="section-kicker">Session ended</p>
        <h1 id="checkpoint-title">Leave a checkpoint</h1>
        <p><strong>{task.title}</strong> is ready for a short record of what changed and what happens next.</p>
        <button className="button-secondary" type="button" onClick={onClose}>Back to Work</button>
      </div>
    </dialog>
  )
}
