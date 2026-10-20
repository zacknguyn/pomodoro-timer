import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, CircleCheck, CirclePlus, Clock, Download, Folder, PanelsTopLeft, Sun, Moon, Monitor, Inbox, Maximize, Minus, Pause, Pencil, Play, Square, Trash2, X } from 'lucide-react'
import { LOCAL_PREVIEW } from '../lib/runtime'
import { DEFAULT_WORK_PROTOCOL } from '../lib/preferences'
import { WORKBENCH_STATUSES, readableDate, safeReference } from '../lib/workbenchView'
import { DitherAvatar } from './dither-kit/DitherAvatar'
import { formatSessionClock, getSessionProgress, getSessionRemainingSeconds } from '../lib/sessionClock'

const STATUS_ICONS = { inbox: Inbox, ready: CirclePlus, progress: Play, done: CircleCheck }
export function StatusLabel({ status }) {
  const Icon = STATUS_ICONS[status] || Inbox
  return <span className="wb-status" data-status={status}><Icon size={13} aria-hidden="true" />{WORKBENCH_STATUSES.find(([key]) => key === status)?.[1] || 'Inbox'}</span>
}
export function Modal({ title, children, footer, onClose, wide = false, task, editing = false, busy = false }) {
  const ref = useRef(null)
  // Keep the original opener when one modal replaces another.
  const trigger = useRef(document.activeElement?.closest('.wb-modal')?.returnFocusTarget || document.activeElement)
  useEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    const source = trigger.current
    const scrollArea = source?.closest('.wb-main')
    const scrollPosition = scrollArea && { top: scrollArea.scrollTop, left: scrollArea.scrollLeft }
    dialog.returnFocusTarget = source
    return () => {
      dialog.close()
      if (source?.isConnected && source !== document.body && !source.disabled && source.getClientRects().length) {
        source.focus({ preventScroll: true })
        if (scrollArea?.isConnected) scrollArea.scrollTo({ ...scrollPosition, behavior: 'instant' })
      } else document.getElementById('wb-main')?.focus()
    }
  }, [])
  return <dialog ref={ref} className={`wb-modal ${wide ? 'wb-modal-wide' : ''} ${task ? 'wb-task-modal' : ''}`} aria-label={title} aria-busy={busy} onCancel={(event) => { event.preventDefault(); if (!busy) onClose() }}>
    <header>{task ? <div className="wb-task-modal-identity"><p className="wb-label">{editing ? 'Editing task' : 'Task details'}</p><h2>{task.title}</h2><div className="wb-meta"><span><Folder size={15} aria-hidden="true" />{task.project || 'No project'}</span><StatusLabel status={task.status} /></div></div> : <h2>{title}</h2>}<button className="wb-ghost" disabled={busy} onClick={onClose} aria-label={`Close ${title}`}><X size={18} /></button></header>
    <div className="wb-modal-body">{children}</div>
    {footer && <footer>{footer}</footer>}
  </dialog>
}
export function TaskEditor({ task, projects, draft, onDraft, onSave, onClose, busy, serverError }) {
  const dirty = useRef(new Set(draft?.dirty || []))
  function fields(form) { return Object.fromEntries(new FormData(form)) }
  function save(event) {
    event.preventDefault()
    const values = fields(event.target)
    if (!values.title.trim()) { const field = event.currentTarget.elements.title; field.setCustomValidity('Give this task a title.'); field.setAttribute('aria-invalid', 'true'); field.reportValidity(); return }
    if (values.referenceUrl && !safeReference(values.referenceUrl)) { const field = event.currentTarget.elements.referenceUrl; field.setCustomValidity('Use an http or https reference link.'); field.setAttribute('aria-invalid', 'true'); field.reportValidity(); return }
    onSave(values)
  }
  const initial = { ...task, note: draft?.note || '' }
  for (const key of draft?.dirty || []) initial[key] = draft[key] ?? initial[key]
  return <Modal busy={busy} title="Edit task" task={task} editing onClose={onClose} footer={<><button onClick={onClose} disabled={busy}>Cancel</button><p className="wb-editor-hint">Cancel discards unsaved edits.</p><button className="wb-primary" type="submit" form="wb-edit-task" disabled={busy}>{busy ? 'Saving…' : serverError ? 'Retry save' : 'Save changes'}</button></>}>
    <form id="wb-edit-task" className="wb-form wb-task-dialog-grid" onSubmit={save} onInput={(event) => { event.target.setCustomValidity(''); event.target.removeAttribute('aria-invalid'); dirty.current.add(event.target.name); onDraft({ ...fields(event.currentTarget), dirty: [...dirty.current] }) }}>
      <div className="wb-task-dialog-main">
        <label>Title<input name="title" required defaultValue={initial.title} /></label>
        <label>Next step · optional<textarea name="nextStep" defaultValue={initial.nextStep || ''} /></label>
        <section><h3>Saved notes</h3><NoteHistory notes={task.notes} /></section>
        <label>Add a note · optional<textarea name="note" defaultValue={initial.note || ''} /></label>
        {serverError && <p className="wb-error" role="alert">{serverError}</p>}
      </div>
      <aside className="wb-task-properties" aria-label="Task properties">
        <h3>Task properties</h3>
        <label>Project name · optional<input name="project" list="wb-projects" defaultValue={initial.project || ''} /><datalist id="wb-projects">{projects.map((project) => <option key={project} value={project} />)}</datalist></label>
        <label>Status<select name="status" defaultValue={initial.status}>{WORKBENCH_STATUSES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label>Reference · optional<input name="referenceUrl" type="url" defaultValue={initial.referenceUrl || ''} /></label>
      </aside>
    </form>
  </Modal>
}
export function NoteHistory({ notes = [] }) {
  const written = notes.filter((note) => note.kind !== 'change')
  return written.length ? <div className="wb-note-history">{written.slice().reverse().map((note) => <article key={note.id}><time>{readableDate(note.createdAt)}</time><p>{note.text}</p></article>)}</div> : <p className="wb-muted">No saved notes yet.</p>
}
export function TaskInspection({ task, onClose, onEdit, onWork, onDelete, busy, focusActive = false }) {
  const reference = safeReference(task.referenceUrl)
  return <Modal busy={busy} title={task.title} task={task} onClose={onClose} footer={<><p className="wb-task-open-hint">{focusActive ? 'Opens Workspace for this task. Your current focus session continues.' : 'Opens Workspace for this task. The timer starts only when you choose Start focus.'}</p><button className="wb-danger wb-ghost wb-task-delete" onClick={onDelete} disabled={busy}><Trash2 size={16} />Delete task</button><button disabled={busy} onClick={onEdit}><Pencil size={16} />Edit</button><button className="wb-primary" onClick={onWork} disabled={busy}><ArrowRight size={16} />{task.status === 'done' ? 'Reopen in Workspace' : 'Work on this'}</button></>}>
    <div className="wb-task-dialog-grid">
      <div className="wb-task-dialog-main">
        <section className="wb-task-dialog-next"><p className="wb-label">Next step</p><p>{task.nextStep || 'No next step saved.'}</p></section>
        <section><h3>Saved notes</h3><NoteHistory notes={task.notes} /></section>
      </div>
      <aside className="wb-task-properties" aria-label="Task properties">
        <h3>Task properties</h3>
        <dl><div><dt>Status</dt><dd><StatusLabel status={task.status} /></dd></div><div><dt>Project</dt><dd>{task.project || 'No project'}</dd></div></dl>
        <div><p className="wb-label">Reference</p>{reference ? <a href={reference} target="_blank" rel="noreferrer">{new URL(reference).host + new URL(reference).pathname}<ArrowRight size={16} aria-hidden="true" /></a> : <p className="wb-muted">No reference added.</p>}</div>
      </aside>
    </div>
  </Modal>
}
export function TaskDeleteDialog({ task, blocked, busy, serverError, onClose, onDelete, onWork }) {
  const cancel = useRef(null)
  useEffect(() => { cancel.current?.focus() }, [])
  return <Modal busy={busy} title="Delete task?" onClose={onClose} footer={<><button onClick={onClose} disabled={busy} ref={cancel}>Cancel</button>{blocked ? <button className="wb-primary" onClick={onWork} disabled={busy}>Go to timer</button> : <button className="wb-danger-solid" onClick={onDelete} disabled={busy}><Trash2 size={16} />{busy ? 'Deleting…' : 'Delete task'}</button>}</>}>
    <h3>{task.title}</h3>
    <p>This permanently removes the task, its notes, and its focus history from Pomogit. This cannot be undone.</p>
    <p className="wb-muted">Linked GitHub issues and pull requests are unaffected.</p>
    {blocked && <p role="status">Stop this task’s active or paused timer before deleting it.</p>}
    {serverError && <p className="wb-error" role="alert">{serverError}</p>}
  </Modal>
}
export function FloatingFocus({ session, task, selectedTask, duration, panel, onPanel, onStart, onTransition, onSelect, busy, hidden, onHeight }) {
  const ref = useRef(null)
  const [now, setNow] = useState(Date.now)
  const expiration = useRef(null)
  useEffect(() => {
    if (session?.status !== 'active') return undefined
    const interval = setInterval(() => { setNow(Date.now()); if (!busy && getSessionRemainingSeconds(session) === 0 && expiration.current !== session.id) { expiration.current = session.id; void onTransition('pause') } }, 1000)
    return () => clearInterval(interval)
  }, [session, busy, onTransition])
  useEffect(() => {
    const element = ref.current
    if (!element) return undefined
    const observer = new ResizeObserver(() => onHeight(hidden ? 0 : element.getBoundingClientRect().height))
    observer.observe(element)
    return () => observer.disconnect()
  }, [hidden, onHeight])
  const remaining = session ? getSessionRemainingSeconds(session, now) : duration
  const progress = getSessionProgress(session, remaining)
  const focused = session ? task : selectedTask
  const paused = session?.status === 'paused'
  const expired = Boolean(session) && remaining === 0
  const timerState = !session ? 'ready' : expired ? 'elapsed' : paused ? 'paused' : 'running'
  const stateLabel = { ready: 'Ready to focus', running: 'Running', paused: 'Paused', elapsed: 'Time is up' }[timerState]
  const announcement = session
    ? remaining === 0 ? 'Focus time is up. Your task stays in progress.'
      : paused ? 'Focus paused.' : `Focusing on ${task?.title || 'your task'}.`
    : 'Ready to focus.'
  return <><p className="wb-sr-only" role="status" aria-atomic="true">{announcement}</p><aside ref={ref} className={`wb-focus wb-focus-${panel}`} hidden={hidden} aria-label="Focus timer" data-running={Boolean(session)} data-state={timerState}>
    <header><span><Clock size={20} /><span>Focus<small className="wb-focus-state"><span aria-hidden="true" />{stateLabel}</small></span></span><div><button onClick={() => onPanel(panel === 'compact' ? 'normal' : 'compact')} aria-label={panel === 'compact' ? 'Expand timer' : 'Minimize timer'} aria-expanded={panel !== 'compact'}>{panel === 'compact' ? <Maximize size={16} /> : <Minus size={16} />}</button>{panel !== 'compact' && <button onClick={() => onPanel(panel === 'large' ? 'normal' : 'large')} aria-label={panel === 'large' ? 'Restore timer size' : 'Maximize timer'}><Maximize size={16} /></button>}</div></header>
    <div className="wb-focus-body"><div className="wb-readout"><time role="timer" aria-live="off" aria-label={`${Math.floor(remaining / 60)} minutes ${remaining % 60} seconds remaining`}>{formatSessionClock(remaining)}</time><span>{session ? 'remaining' : 'minutes of focus'}</span>{session && <div className="wb-focus-meter" role="progressbar" aria-label="Focus session elapsed" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}><span style={{ transform: `scaleX(${progress})` }} /></div>}</div>
      <div className="wb-focus-context"><p className="wb-label">{session ? 'Session task' : 'Selected task'}</p><strong title={focused?.title}>{focused?.title || 'Choose a task when you’re ready'}</strong>{session && task?.id !== selectedTask?.id && <button onClick={() => onSelect(task.id)}>Return to focused task<ArrowRight size={16} /></button>}</div>
      <div className="wb-focus-actions">{session ? expired ? <button className="wb-primary" onClick={() => onTransition('end')} disabled={busy}><Check size={16} aria-hidden="true" />Save session</button> : <><button className="wb-primary" onClick={() => onTransition(paused ? 'resume' : 'pause')} disabled={busy}>{paused ? <Play size={16} /> : <Pause size={16} />}{paused ? 'Resume' : 'Pause'}</button><button onClick={() => onTransition('end')} disabled={busy}><Square size={15} />Stop timer</button></> : <button className="wb-primary" onClick={() => onStart(focused?.id)} disabled={busy || !focused || focused.status === 'done'}><Play size={16} />Start focus</button>}</div>
    </div>
    <p className="wb-focus-hint">{expired ? 'Save your focus time. The task stays In progress until you mark it done.' : session ? 'Stop timer saves focus time. Mark done in Workspace to finish the task.' : 'Starting focus moves this task to In progress.'}</p>
  </aside></>
}
export function ProfileEditor({ profile, onSave, onClose, reducedMotion = false }) {
  const [seed, setSeed] = useState(profile.avatarSeed || 0)
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.target))
    values.displayName = values.displayName.trim()
    if (!values.displayName) { setError('Give your profile a display name.'); return }
    if ((values.github && !safeReference(values.github)) || (values.website && !safeReference(values.website))) { setError('Use http or https links.'); return }
    onSave({ ...profile, ...values, avatarKey: profile.avatarKey || profile.displayName, avatarSeed: seed })
  }
  return <Modal title="Edit profile" onClose={onClose} footer={<><button onClick={onClose}>Cancel</button><button className="wb-primary" type="submit" form="wb-profile-form">Save profile</button></>}>
    <form id="wb-profile-form" className="wb-form" onSubmit={submit}>
      <div className="wb-avatar-editor"><DitherAvatar name={`${profile.avatarKey || profile.displayName}:${seed}`} size={64} animate={!reducedMotion} /><div><h3>Dither avatar</h3><p className="wb-muted">Generate a new pattern and color.</p><button type="button" onClick={() => setSeed(seed + 1)}>Generate another avatar</button></div></div>
      <label>Display name<input name="displayName" defaultValue={profile.displayName} required maxLength={60} /></label><label>Headline<input name="headline" defaultValue={profile.headline} maxLength={100} /></label><label>Bio<textarea name="bio" defaultValue={profile.bio || ''} maxLength={400} /></label>
      <label>GitHub · optional<input name="github" type="url" defaultValue={profile.github || ''} /></label><label>Website · optional<input name="website" type="url" defaultValue={profile.website || ''} /></label>
      {error && <p className="wb-error" role="alert">{error}</p>}
    </form>
  </Modal>
}
function SettingChoices({ name, title, choices, value }) {
  return <fieldset className={`wb-choices wb-choices-${name}`}><legend>{title}</legend><div>{choices.map(([key, label, detail, Icon]) => <label key={key}><input type="radio" name={name} value={key} defaultChecked={String(value) === String(key)} />{name === 'navigation' && <span className={`wb-nav-thumbnail wb-nav-${key}`} aria-hidden="true"><i /><b /><em /></span>}{Icon && <Icon size={20} aria-hidden="true" />}{name === 'palette' && <span className={`wb-swatch wb-swatch-${key}`} aria-hidden="true" />}<strong>{label}</strong>{detail && <small>{detail}</small>}</label>)}</div></fieldset>
}
export function SettingsDialog({ preferences, onSave, onClose, onExport, onProfile }) {
  const lengths = [15, 25, 45, 60]
  if (!lengths.includes(preferences.focusMinutes)) lengths.push(preferences.focusMinutes)
  return <Modal wide title="Settings" onClose={onClose} footer={<><button className="wb-ghost" type="reset" form="wb-settings-form">Restore defaults</button><div><button onClick={onClose}>Cancel</button><button className="wb-primary" type="submit" form="wb-settings-form">Save settings</button></div></>}>
    <form id="wb-settings-form" className="wb-settings-grid" onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.target); onSave({ palette: data.get('palette'), brightness: data.get('brightness'), navigation: data.get('navigation'), focusMinutes: Number(data.get('focusMinutes')), density: data.get('density'), motion: data.get('motion'), expand: data.has('expand') }) }} onReset={(event) => { event.preventDefault(); const form = event.target; for (const name of ['palette','brightness','navigation','density','motion','focusMinutes']) form.elements.namedItem(name).value = String(DEFAULT_WORK_PROTOCOL[name]); form.elements.expand.checked = DEFAULT_WORK_PROTOCOL.expand }}>
      <section><h3><PanelsTopLeft size={18} />Make room for your work</h3><p className="wb-muted">Choose a floating bar across the top or a compact rail. On phones, the rail becomes a bottom bar.</p>
        <SettingChoices name="navigation" title="Navigation" value={preferences.navigation} choices={[[ 'navbar','Navbar','Floating bar across the top'],['sidebar','Sidebar','Floating icon rail']]} />
        <SettingChoices name="brightness" title="Appearance" value={preferences.brightness} choices={[[ 'light','Light',null,Sun],['dark','Dark',null,Moon],['system','System',null,Monitor]]} />
        <SettingChoices name="palette" title="Color palette" value={preferences.palette} choices={[[ 'electric','Electric','Violet & pink'],['sage','Sage','A softer green']]} />
        <SettingChoices name="density" title="Task spacing" value={preferences.density} choices={[[ 'comfortable','Comfortable'],['compact','Compact']]} />
        <SettingChoices name="motion" title="Animation" value={preferences.motion} choices={[[ 'system','Follow system','Respects device preference'],['reduced','Reduce motion','Keep transitions still']]} />
      </section>
      <section><h3><Clock size={18} />Focus timer</h3><p className="wb-muted">Changes apply to your next session.</p><SettingChoices name="focusMinutes" title="Session length" value={preferences.focusMinutes} choices={lengths.map((minutes) => [minutes,`${minutes} min`])} /><label className="wb-switch">Expand when focus starts<input name="expand" type="checkbox" role="switch" defaultChecked={preferences.expand !== false} /></label><p className="wb-muted">Stopping the timer never completes your task.</p></section>
      <section className="wb-settings-data"><h3><Download size={18} />Your data & profile</h3><p className="wb-muted">{LOCAL_PREVIEW ? 'Saved in this browser. Nothing is published.' : 'Tasks, notes, and focus sessions are saved to your account. Profile and appearance preferences stay in this browser.'}</p><div><div><strong>Take your tasks with you</strong><p className="wb-muted">Tasks, links, and notes in one JSON file.</p><button type="button" onClick={onExport}><Download size={16} />Export tasks</button></div><div><strong>Make it personal</strong><p className="wb-muted">Choose your avatar and featured work.</p><button type="button" onClick={onProfile}>Profile preferences<ArrowRight size={16} /></button></div></div></section>
    </form>
  </Modal>
}
export function TaskNoteDialog({ task, draft, onDraft, onSave, onClose, busy, serverError }) {
  return <Modal busy={busy} title="Add a closing note" onClose={onClose} footer={<><button onClick={onClose} disabled={busy}>Skip</button><button className="wb-primary" form="wb-closing-note" type="submit" disabled={busy}>{busy ? 'Saving…' : serverError ? 'Retry save' : 'Save note'}</button></>}>
    <p>{task.title}</p><p className="wb-muted">The task is already done. Leave a useful note, or skip this.</p>
    <form id="wb-closing-note" className="wb-form" onSubmit={(event) => { event.preventDefault(); const field = event.currentTarget.elements.note; const text = field.value.trim(); if (!text) { field.setCustomValidity('Write a note or choose Skip.'); field.reportValidity(); return } onSave(text) }}>
      <label>Closing note<textarea name="note" defaultValue={draft} required placeholder="What changed? Anything useful for later?" onInput={(event) => { event.currentTarget.setCustomValidity(''); onDraft(event.currentTarget.value) }} /></label>
      {serverError && <p className="wb-error" role="alert">{serverError}</p>}
    </form>
  </Modal>
}
export function CompletionDialog({ task, hasNextTask, onClose, onNote, onNext, onUndo, busy }) {
  return <Modal busy={busy} title="Task completed" onClose={onClose} footer={<><button onClick={onUndo} disabled={busy}>Undo completion</button><button disabled={busy} onClick={onNote}><Pencil size={16} aria-hidden="true" />Add note · optional</button><button className="wb-primary" disabled={busy} onClick={onNext}>{hasNextTask ? 'Choose next task' : 'Back to Workspace'}</button></>}><section className="wb-completion"><span className="wb-completion-icon"><CircleCheck size={24} aria-hidden="true" /></span><div><p className="wb-label">Saved in Done</p><h3>{task.title}</h3><p className="wb-completion-project"><Folder size={14} aria-hidden="true" />{task.project || 'No project'}</p></div></section><p className="wb-muted">You’re finished. Add a note now, or come back to it later.</p></Modal>
}
