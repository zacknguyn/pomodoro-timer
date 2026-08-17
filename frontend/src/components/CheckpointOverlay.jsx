import { useEffect, useRef, useState } from 'react'
import { Check, CornerUpRight } from 'lucide-react'
import { DitherButton } from './dither-kit/DitherButton'
import { workApi } from '../lib/workApi'
import { createCheckpointPayload, validateCheckpointForm } from '../lib/checkpointForm'

export function CheckpointOverlay({ open, session, task, onSaved }) {
  const dialogRef = useRef(null)
  const [outcome, setOutcome] = useState('continue')
  const [nextStep, setNextStep] = useState('')
  const [whatChanged, setWhatChanged] = useState('')
  const [errors, setErrors] = useState({})
  const [requestError, setRequestError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    if (!session) return
    setOutcome('continue')
    setNextStep('')
    setWhatChanged('')
    setErrors({})
    setRequestError('')
  }, [session])

  if (!session || !task) return null

  function chooseOutcome(nextOutcome) {
    setOutcome(nextOutcome)
    setErrors({})
    setRequestError('')
  }

  async function submit(event) {
    event.preventDefault()
    const nextErrors = validateCheckpointForm({ outcome, nextStep })
    setErrors(nextErrors)
    setRequestError('')
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    try {
      const checkpoint = await workApi.createCheckpoint(createCheckpointPayload({
        taskId: task.id,
        sessionId: session.id,
        outcome,
        nextStep,
        whatChanged,
      }))
      onSaved(checkpoint)
    } catch (error) {
      setRequestError(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="checkpoint-dialog"
      aria-labelledby="checkpoint-title"
      onCancel={(event) => event.preventDefault()}
    >
      <div className="checkpoint-surface">
        <header className="checkpoint-topbar">
          <span className="app-brand"><strong>Pomogit</strong></span>
          <span className="checkpoint-status"><i aria-hidden="true" /> Session ended</span>
        </header>

        <div className="checkpoint-layout">
          <section className="checkpoint-context" aria-labelledby="checkpoint-title">
            <p className="section-kicker">Close the loop</p>
            <h1 id="checkpoint-title">Leave a checkpoint</h1>
            <p className="checkpoint-task">{task.title}</p>
            <p className="checkpoint-guidance">Write enough for tomorrow-you to continue without reconstructing today.</p>
          </section>

          <form className="checkpoint-form" onSubmit={submit} noValidate>
            <div className="checkpoint-outcomes" role="group" aria-label="What happens to this task?">
              <button type="button" aria-pressed={outcome === 'continue'} onClick={() => chooseOutcome('continue')}>
                <CornerUpRight size={17} aria-hidden="true" />
                <span><strong>Continue later</strong><small>Return this task to Ready</small></span>
              </button>
              <button type="button" aria-pressed={outcome === 'complete'} onClick={() => chooseOutcome('complete')}>
                <Check size={17} aria-hidden="true" />
                <span><strong>Mark complete</strong><small>Move this task to Done</small></span>
              </button>
            </div>

            {outcome === 'continue' && (
              <div className="checkpoint-field">
                <label htmlFor="checkpoint-next-step">Next step <span>Required</span></label>
                <input
                  id="checkpoint-next-step"
                  value={nextStep}
                  onChange={(event) => { setNextStep(event.target.value); if (errors.nextStep) setErrors({}) }}
                  placeholder="e.g. Add a regression test for the retry path"
                  maxLength={2000}
                  aria-invalid={Boolean(errors.nextStep)}
                  aria-describedby={errors.nextStep ? 'checkpoint-next-step-error' : 'checkpoint-next-step-hint'}
                  autoFocus
                />
                {errors.nextStep
                  ? <p className="field-error" id="checkpoint-next-step-error">{errors.nextStep}</p>
                  : <p className="field-hint" id="checkpoint-next-step-hint">Start with a verb. Make the handoff unambiguous.</p>}
              </div>
            )}

            <div className="checkpoint-field">
              <label htmlFor="checkpoint-changed">What changed <span>Optional</span></label>
              <textarea
                id="checkpoint-changed"
                value={whatChanged}
                onChange={(event) => setWhatChanged(event.target.value)}
                placeholder="Result, commit message, or a short note"
                maxLength={4000}
                rows={5}
                autoFocus={outcome === 'complete'}
              />
              <p className="field-hint">Commit messages are stored exactly as entered.</p>
            </div>

            {requestError && <p className="checkpoint-error" role="alert">{requestError}</p>}

            <div className="checkpoint-submit-row">
              <span>{outcome === 'continue' ? 'Task returns to the top of Ready.' : 'Task moves to Done.'}</span>
              <DitherButton variant="solid" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save checkpoint'}
              </DitherButton>
            </div>
          </form>
        </div>
      </div>
    </dialog>
  )
}
