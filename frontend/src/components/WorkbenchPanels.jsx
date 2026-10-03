import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, CircleCheck, CirclePlus, Clock, Download, PanelsTopLeft, Sun, Moon, Monitor, Inbox, Maximize, Minus, Pause, Pencil, Play, Square, X } from 'lucide-react'
import { DEFAULT_WORK_PROTOCOL } from '../lib/preferences'
import { WORKBENCH_STATUSES, readableDate, safeReference } from '../lib/workbenchView'
import { DitherAvatar } from './dither-kit/DitherAvatar'
import { formatSessionClock, getSessionProgress, getSessionRemainingSeconds } from '../lib/sessionClock'

const STATUS_ICONS = { inbox: Inbox, ready: CirclePlus, progress: Play, done: CircleCheck }
export function StatusLabel({ status }) {
  const Icon = STATUS_ICONS[status] || Inbox
  return <span className="wb-status" data-status={status}><Icon size={13} aria-hidden="true" />{WORKBENCH_STATUSES.find(([key]) => key === status)?.[1] || 'Inbox'}</span>
}
export function Modal({ title, children, footer, onClose, wide = false }) {
  const ref = useRef(null)
  const trigger = useRef(document.activeElement)
  useEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    const source = trigger.current
    return () => { dialog.close(); if (source?.isConnected) source.focus() }
  }, [])
  return <dialog ref={ref} className={`wb-modal ${wide ? 'wb-modal-wide' : ''}`} aria-label={title} onCancel={(event) => { event.preventDefault(); onClose() }}>
    <header><h2>{title}</h2><button className="wb-ghost" onClick={onClose} aria-label={`Close ${title}`}><X size={18} /></button></header>
    <div className="wb-modal-body">{children}</div>
    {footer && <footer>{footer}</footer>}
  </dialog>
}
export function TaskEditor({ task, projects, draft, onDraft, onSave, onClose, busy, serverError }) {
  const [error, setError] = useState('')
  const dirty = useRef(new Set(draft?.dirty || []))
  function fields(form) { return Object.fromEntries(new FormData(form)) }
  function save(event) {
    event.preventDefault()
    const values = fields(event.target)
    if (!values.title.trim()) { setError('Give this task a title.'); return }
    if (values.referenceUrl && !safeReference(values.referenceUrl)) { setError('Use an http or https reference link.'); return }
    onSave(values)
  }
  const initial = { ...task, note: draft?.note || '' }
  for (const key of draft?.dirty || []) initial[key] = draft[key] ?? initial[key]
  return <Modal title="Edit task" onClose={onClose} footer={<><button onClick={onClose}>Cancel</button><button className="wb-primary" type="submit" form="wb-edit-task" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></>}>
    <form id="wb-edit-task" className="wb-form" onSubmit={save} onInput={(event) => { dirty.current.add(event.target.name); onDraft({ ...fields(event.currentTarget), dirty: [...dirty.current] }) }}>
      <label>Title<input name="title" required defaultValue={initial.title} /></label>
      <label>Next step · optional<textarea name="nextStep" defaultValue={initial.nextStep || ''} /></label>
      <label>Project · optional<input name="project" list="wb-projects" defaultValue={initial.project || ''} /><datalist id="wb-projects">{projects.map((project) => <option key={project} value={project} />)}</datalist></label>
      <label>Reference · optional<input name="referenceUrl" type="url" defaultValue={initial.referenceUrl || ''} /></label>
      <label>Status<select name="status" defaultValue={initial.status}>{WORKBENCH_STATUSES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <section><h3>Saved notes</h3><NoteHistory notes={task.notes} /></section>
      <label>Add a note · optional<textarea name="note" defaultValue={initial.note || ''} /></label>
      {error && <p className="wb-error" role="alert">{error}</p>}
      {serverError && <p className="wb-error" role="alert">{serverError}</p>}
    </form>
  </Modal>
}
export function NoteHistory({ notes = [] }) {
  const written = notes.filter((note) => note.kind !== 'change')
  return written.length ? <div className="wb-note-history">{written.slice().reverse().map((note) => <article key={note.id}><time>{readableDate(note.createdAt)}</time><p>{note.text}</p></article>)}</div> : <p className="wb-muted">No saved notes yet.</p>
}
export function TaskInspection({ task, onClose, onEdit, onWork, busy }) {
  return <Modal title={task.title} onClose={onClose} footer={<><button onClick={onEdit}><Pencil size={16} />Edit</button><button className="wb-primary" onClick={onWork} disabled={busy}><ArrowRight size={16} />{task.status === 'done' ? 'Reopen in Workspace' : 'Open in Workspace'}</button></>}>
    <div className="wb-meta"><span>{task.project || 'No project'}</span><StatusLabel status={task.status} /></div>
    <section><p className="wb-label">Next step</p><p>{task.nextStep || 'No next step saved.'}</p></section>
    {safeReference(task.referenceUrl) && <a className="wb-button" href={safeReference(task.referenceUrl)} target="_blank" rel="noreferrer">Open reference<ArrowRight size={16} /></a>}
    <section><h3>Saved notes</h3><NoteHistory notes={task.notes} /></section>
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
  return <aside ref={ref} className={`wb-focus wb-focus-${panel}`} hidden={hidden} aria-label="Focus timer" data-running={Boolean(session)}>
    <header><span><Clock size={20} /><span>Focus<small>{session ? remaining === 0 ? 'Time is up' : paused ? 'Paused' : 'Focusing' : 'Ready to focus'}</small></span></span><div><button onClick={() => onPanel(panel === 'compact' ? 'normal' : 'compact')} aria-label={panel === 'compact' ? 'Expand timer' : 'Minimize timer'} aria-expanded={panel !== 'compact'}>{panel === 'compact' ? <Maximize size={16} /> : <Minus size={16} />}</button>{panel !== 'compact' && <button onClick={() => onPanel(panel === 'large' ? 'normal' : 'large')} aria-label={panel === 'large' ? 'Restore timer size' : 'Maximize timer'}><Maximize size={16} /></button>}</div></header>
    <div className="wb-focus-body"><div className="wb-readout"><time aria-label={`${remaining} seconds remaining`}>{formatSessionClock(remaining)}</time><span>{session ? 'remaining' : 'minutes of focus'}</span>{session && <div className="wb-focus-meter" role="progressbar" aria-label="Focus session elapsed" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}><span style={{ transform: `scaleX(${progress})` }} /></div>}</div>
      <div className="wb-focus-context"><p className="wb-label">{session ? 'Focusing on' : 'Selected task'}</p><strong>{focused?.title || 'Choose a task when you’re ready'}</strong>{session && task?.id !== selectedTask?.id && <button onClick={() => onSelect(task.id)}>Return to focused task<ArrowRight size={16} /></button>}</div>
      <div className="wb-focus-actions">{session ? <><button className="wb-primary" onClick={() => onTransition(paused ? 'resume' : 'pause')} disabled={busy || (paused && remaining === 0)}>{paused ? <Play size={16} /> : <Pause size={16} />}{paused ? 'Resume' : 'Pause'}</button><button onClick={() => onTransition('end')} disabled={busy}><Square size={15} />Stop</button></> : <button className="wb-primary" onClick={() => onStart(focused?.id)} disabled={busy || !focused || focused.status === 'done'}><Play size={16} />Start focus</button>}</div>
    </div>
  </aside>
}
export function ProfileEditor({ profile, onSave, onClose, reducedMotion = false }) {
  const [seed, setSeed] = useState(profile.avatarSeed || 0)
  const [accent, setAccent] = useState(profile.accent || 'mint')
  const [error, setError] = useState('')
  function submit(event) {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.target))
    values.displayName = values.displayName.trim()
    if (!values.displayName) { setError('Give your profile a display name.'); return }
    if ((values.github && !safeReference(values.github)) || (values.website && !safeReference(values.website))) { setError('Use http or https links.'); return }
    onSave({ ...profile, ...values, avatarKey: profile.avatarKey || profile.displayName, avatarSeed: seed, accent })
  }
  return <Modal title="Edit profile" onClose={onClose} footer={<><button onClick={onClose}>Cancel</button><button className="wb-primary" type="submit" form="wb-profile-form">Save profile</button></>}>
    <form id="wb-profile-form" className="wb-form" onSubmit={submit}>
      <div className="wb-avatar-editor"><DitherAvatar name={`${profile.avatarKey || profile.displayName}:${seed}`} size={64} animate={!reducedMotion} /><div><h3>Dither avatar</h3><p className="wb-muted">Generate a new pattern and color.</p><button type="button" onClick={() => setSeed(seed + 1)}>Generate another avatar</button></div></div>
      <label>Display name<input name="displayName" defaultValue={profile.displayName} required maxLength={60} /></label><label>Headline<input name="headline" defaultValue={profile.headline} maxLength={100} /></label><label>Bio<textarea name="bio" defaultValue={profile.bio || ''} maxLength={400} /></label>
      <label>GitHub · optional<input name="github" type="url" defaultValue={profile.github || ''} /></label><label>Website · optional<input name="website" type="url" defaultValue={profile.website || ''} /></label>
      <fieldset><legend>Profile accent</legend><div className="wb-accent-picker">{['mint', 'blue', 'plum', 'amber'].map((value) => <button key={value} type="button" data-accent={value} aria-pressed={accent === value} onClick={() => setAccent(value)}>{value}</button>)}</div></fieldset>
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
      <section><h3><PanelsTopLeft size={18} />Make room for your work</h3><p className="wb-muted">Choose where navigation lives. Mobile keeps a compact header.</p>
        <SettingChoices name="navigation" title="Navigation" value={preferences.navigation} choices={[[ 'navbar','Navbar','Across the top'],['sidebar','Sidebar','Projects within reach']]} />
        <SettingChoices name="brightness" title="Appearance" value={preferences.brightness} choices={[[ 'light','Light',null,Sun],['dark','Dark',null,Moon],['system','System',null,Monitor]]} />
        <SettingChoices name="palette" title="Color palette" value={preferences.palette} choices={[[ 'electric','Electric','Violet & pink'],['sage','Sage','A softer green']]} />
        <SettingChoices name="density" title="Task spacing" value={preferences.density} choices={[[ 'comfortable','Comfortable'],['compact','Compact']]} />
        <SettingChoices name="motion" title="Animation" value={preferences.motion} choices={[[ 'system','Follow system','Respects device preference'],['reduced','Reduce motion','Keep transitions still']]} />
      </section>
      <section><h3><Clock size={18} />Focus timer</h3><p className="wb-muted">Changes apply to your next session.</p><SettingChoices name="focusMinutes" title="Session length" value={preferences.focusMinutes} choices={lengths.map((minutes) => [minutes,`${minutes} min`])} /><label className="wb-switch">Expand when focus starts<input name="expand" type="checkbox" role="switch" defaultChecked={preferences.expand !== false} /></label><p className="wb-muted">Stopping the timer never completes your task.</p></section>
      <section className="wb-settings-data"><h3><Download size={18} />Your data & profile</h3><p className="wb-muted">Saved in this browser. Nothing is published.</p><div><div><strong>Take your tasks with you</strong><p className="wb-muted">Tasks, links, and notes in one JSON file.</p><button type="button" onClick={onExport}><Download size={16} />Export tasks</button></div><div><strong>Make it personal</strong><p className="wb-muted">Choose your avatar and featured work.</p><button type="button" onClick={onProfile}>Profile preferences<ArrowRight size={16} /></button></div></div></section>
    </form>
  </Modal>
}
export function CompletionDialog({ task, onClose, onNote, onNext, onUndo, busy }) {
  return <Modal title="Task completed" onClose={onClose} footer={<><button onClick={onUndo} disabled={busy}>Undo completion</button><button onClick={onNote}>Add note · optional</button><button className="wb-primary" onClick={onNext}>Choose next task</button></>}><h3><Check size={18} />{task.title}</h3><p className="wb-muted">Your work is in Done. You can add a closing note now or later.</p></Modal>
}
