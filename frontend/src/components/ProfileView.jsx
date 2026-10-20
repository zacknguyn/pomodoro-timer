import { useState } from 'react'
import { ArrowRight, Pencil } from 'lucide-react'
import { DitherAvatar } from './dither-kit/DitherAvatar'
import { Modal } from './WorkbenchPanels'
import { activityDuration } from '../lib/activity'
import { featuredWork, profileHistory } from '../lib/profileHistory'
import { readableDate, safeReference } from '../lib/workbenchView'
import './ProfileView.css'

export default function ProfileView({ profile, tasks, events, preferences, onEdit, onFeatured, onSave, onOpenTask, onActivity, error, loading, onRetry }) {
  const [visitor, setVisitor] = useState(false)
  const [period, setPeriod] = useState(28)
  const [panel, setPanel] = useState(null)
  const [selectedDay, setSelectedDay] = useState('')
  const work = featuredWork(tasks, profile)
  const history = profileHistory(events, period, new Date(), preferences.weekStart)
  const dayKey = selectedDay >= history.startKey && selectedDay <= history.endKey ? selectedDay : history.endKey
  const story = panel?.type === 'story' && work.find(item => item.id === panel.id)
  const day = panel?.type === 'day' && history.days.find(item => item.key === panel.key)
  const weekdays = preferences.weekStart === 'sunday' ? ['Sun', '', 'Tue', '', 'Thu', '', 'Sat'] : ['Mon', '', 'Wed', '', 'Fri', '', 'Sun']
  const recent = events.filter(event => new Date(event.createdAt) <= new Date()).slice(0, 3)
  return <div className="pg-profile-page">
    <div className="pg-profile-preview-notice"><p>{visitor ? 'Visitor preview · not published' : 'Private profile · not published'}</p><button aria-pressed={visitor} onClick={() => { setPanel(null); setVisitor(!visitor) }}>{visitor ? 'Back to my profile' : 'Preview as visitor'}</button></div>
    <section className="pg-profile-identity" aria-label="Developer identity">
      <DitherAvatar name={`${profile.avatarKey || profile.displayName}:${profile.avatarSeed || 0}`} className="pg-profile-avatar" animate={preferences.motion !== 'reduced'} />
      <div className="pg-profile-identity-copy"><h2>{profile.displayName}</h2>{profile.headline && <p className="headline">{profile.headline}</p>}{profile.bio && <p className="bio">{profile.bio}</p>}
        {(safeReference(profile.github) || safeReference(profile.website)) && <div className="pg-profile-links">{safeReference(profile.github) && <a href={safeReference(profile.github)} target="_blank" rel="noreferrer">GitHub<ArrowRight size={15} aria-hidden="true" /></a>}{safeReference(profile.website) && <a href={safeReference(profile.website)} target="_blank" rel="noreferrer">Website<ArrowRight size={15} aria-hidden="true" /></a>}</div>}
      </div>{!visitor && <button onClick={onEdit}><Pencil size={15} aria-hidden="true" />Edit profile</button>}
    </section>
    {loading ? <p className="pg-profile-state" role="status" aria-busy="true">Loading your work history…</p> : error ? <section className="pg-profile-state" role="alert"><h2>Work history couldn’t load</h2><p className="wb-muted">{error}</p><button onClick={onRetry}>Try again</button></section> : <div className="pg-profile-composition"><div className="pg-profile-main">
      <section className="pg-profile-section" aria-label="Featured work"><header className="pg-profile-section-heading"><h2>Featured work</h2>{!visitor && <button onClick={onFeatured}>Choose featured work</button>}</header>
        <div className="pg-profile-featured">{work.map(item => <article className="pg-profile-work" key={item.id}>
          <div className="pg-profile-evidence evidence-type" aria-hidden="true"><span>{item.project || 'Personal work'}</span><strong>{item.title}</strong></div>
          <div className="pg-profile-work-copy"><span className="pg-profile-project">{item.project || 'Personal work'}</span><h3>{item.title}</h3><p>{item.description || 'No public description added.'}</p><button className="pg-profile-read" onClick={() => setPanel({ type: 'story', id: item.id })} aria-label={`Read summary for ${item.title}`}>Read summary<ArrowRight size={16} aria-hidden="true" /></button></div>
        </article>)}{!work.length && <p className="pg-profile-empty">{visitor ? 'No featured work selected.' : tasks.some(task => task.status === 'done') ? 'Choose completed work to feature here.' : 'Complete a task, then choose whether to feature it here.'}</p>}</div>
      </section>
      {(!visitor || profile.shareActivity) && (<section className="pg-profile-rhythm" aria-label="Work history">
        <header className="pg-profile-section-heading"><h2>Work history</h2><div className="pg-profile-period" role="group" aria-label="History period"><button aria-pressed={period === 28} onClick={() => setPeriod(28)}>4 weeks</button><button aria-pressed={period === 84} onClick={() => setPeriod(84)}>12 weeks</button></div></header>
        <div className="pg-profile-history-layout"><div><div className="pg-profile-calendar"><div className="pg-profile-weekdays" aria-hidden="true">{weekdays.map((label, index) => <span key={index}>{label}</span>)}</div><div className="pg-profile-map" role="img" aria-label={`${period}-day work history: ${history.activeDays} active days, ${activityDuration(history.summary.seconds)} of recorded focus, ${history.summary.completed} completed tasks. Newest week is on the right.`}>
          {history.days.map(item => <span key={item.key} className="pg-profile-cell" data-level={item.outside ? 0 : item.level} data-outside={item.outside} title={item.outside ? `${item.key} · outside selection` : `${item.key} · ${item.summary.sessions} focus sessions, ${item.summary.completed} completed tasks`} />)}
        </div></div><div className="pg-profile-legend"><span>{history.startKey} — {history.endKey}</span><span>Less<i /><i /><i />More</span></div></div>
          <dl className="pg-profile-summary"><div><dt>Focus recorded</dt><dd>{activityDuration(history.summary.seconds)}</dd></div><div><dt>Tasks completed</dt><dd>{history.summary.completed}</dd></div><div><dt>Active days</dt><dd>{history.activeDays}</dd></div><div><dt>Current streak</dt><dd>{history.streak} {history.streak === 1 ? 'day' : 'days'}</dd></div></dl>
        </div>
        <details className="pg-profile-count-rule"><summary>How this is counted</summary><p>An active day has recorded focus or a task completion. A streak counts consecutive local days, ending today or yesterday. Notes alone don’t extend it.</p></details>
        {!visitor && <div className="pg-profile-history-tools"><details><summary>Inspect a day</summary><form className="pg-profile-day-form" onSubmit={event => { event.preventDefault(); setPanel({ type: 'day', key: dayKey }) }}><label>Date<input type="date" value={dayKey} min={history.startKey} max={history.endKey} required onChange={event => setSelectedDay(event.target.value)} /></label><button>View day</button></form></details><button onClick={() => setPanel({ type: 'visibility', include: Boolean(profile.shareActivity) })}>Preview contents</button><span>{profile.shareActivity ? 'History included in visitor preview.' : 'History is private.'}</span></div>}
      </section>)}
      {!visitor && <details className="pg-profile-recent" aria-label="Private recent work"><summary>Private activity<span>{recent.length ? `${recent.length} recent records` : 'No records'}</span></summary><div className="pg-profile-recent-body">{!recent.length ? <p className="pg-profile-empty">No work recorded yet.</p> : <ol>{recent.map(event => <li key={event.id}><div><strong>{event.task?.title || 'Task unavailable'}</strong><p>{event.kind === 'focus' ? `${activityDuration(event.seconds)} recorded` : event.text}</p></div><time className="pg-profile-private-label">{readableDate(event.createdAt)}</time></li>)}</ol>}<button onClick={onActivity}>Open Activity<ArrowRight size={15} aria-hidden="true" /></button></div></details>}
    </div></div>}
    <p className="pg-profile-footnote">Profile preferences stay in this browser.</p>
    {story && <Modal title={story.title} onClose={() => setPanel(null)} footer={<><button onClick={() => setPanel(null)}>Close</button>{story.referenceUrl && <a className="wb-button" href={story.referenceUrl} target="_blank" rel="noreferrer">Open reference<ArrowRight size={16} aria-hidden="true" /></a>}{!visitor && <button className="wb-primary" onClick={() => { setPanel(null); onOpenTask(story.id) }}>View task</button>}</>}>
      <section className="pg-profile-story"><p className="pg-profile-private-label">Public summary · {story.project || 'Personal work'}</p><p>{story.description || 'No public description added.'}</p></section>
    </Modal>}
    {day && !visitor && <Modal title={`Your activity · ${day.key}`} onClose={() => setPanel(null)} footer={<button onClick={() => setPanel(null)}>Close</button>}><div className="pg-profile-day-records"><p className="pg-profile-private-label">Private day details</p><p>{day.summary.sessions} {day.summary.sessions === 1 ? 'focus session' : 'focus sessions'} · {activityDuration(day.summary.seconds)} recorded · {day.summary.completed} {day.summary.completed === 1 ? 'task' : 'tasks'} completed</p>{!day.events.length ? <p className="wb-muted">No recorded work on this day.</p> : <ol>{day.events.map(event => <li key={event.id}><strong>{event.task?.title || 'Task unavailable'}</strong><p>{event.kind === 'focus' ? `${activityDuration(event.seconds)} recorded` : event.text}</p></li>)}</ol>}</div></Modal>}
    {panel?.type === 'visibility' && !visitor && <Modal title="Visitor preview contents" onClose={() => setPanel(null)} footer={<><button onClick={() => setPanel(null)}>Cancel</button><button className="wb-primary" form="pg-profile-visibility">Save preview contents</button></>}><p>Identity and selected work appear in the visitor preview. Nothing is published.</p><form id="pg-profile-visibility" onSubmit={event => { event.preventDefault(); onSave({ ...profile, shareActivity: panel.include }); setPanel(null) }}><label className="pg-profile-share-setting"><input type="checkbox" checked={panel.include} onChange={event => setPanel({ ...panel, include: event.target.checked })} /><span><strong>Include work history</strong><br />Show recorded focus, completions and the heatmap. Task titles, notes and day details remain private.</span></label></form><p className="wb-muted">A public profile URL is not available in this milestone.</p></Modal>}
  </div>
}
