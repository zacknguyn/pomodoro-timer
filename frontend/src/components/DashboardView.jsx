import { createElement, useMemo, useState } from 'react'
import { ArrowRight, BookOpen, ChevronDown, CircleCheck, CirclePlus, Clock, Folder, Github, History, Play, RotateCw } from 'lucide-react'
import { MotionConfig } from 'motion/react'
import { AreaChart, LineChart } from './dither-kit/charts/area-chart'
import { Area, Line } from './dither-kit/charts/area'
import { XAxis } from './dither-kit/charts/x-axis'
import { YAxis } from './dither-kit/charts/y-axis'
import { Legend } from './dither-kit/charts/legend'
import { Tooltip } from './dither-kit/charts/tooltip'
import { DitherDonutChart } from './dither-kit/DitherCharts'
import { PALETTE } from './dither-kit/palette'
import { Modal, StatusLabel } from './WorkbenchPanels'
import { activityDayKey } from '../lib/activity'
import { dashboardDate, dashboardDuration, dashboardHistory } from '../lib/dashboard'
import './DashboardView.css'

const number = value => new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)
function comparison(value, previous, period, duration = false) {
  const diff = value - previous
  return `${diff > 0 ? '+' : diff < 0 ? '−' : ''}${duration ? dashboardDuration(Math.abs(diff)) : number(Math.abs(diff))} vs previous ${period} days`
}
function HistoryChart({ type, history, period, onInspect }) {
  const focus = type === 'focus', [index, setIndex] = useState(null)
  const selected = history.buckets[index ?? history.buckets.length - 1]
  const config = focus ? Object.fromEntries(history.series.map(item => [item.key, { label: item.name, color: item.color }])) : { completed: { label: 'Completed', color: 'purple' } }
  const common = { data: history.buckets, config, animate: false, bloom: 'aura', markerIndex: index, margins: { top: focus ? 34 : 12, left: 34, right: 12, bottom: 24 }, onHoverChange: next => { if (next !== null) setIndex(next) }, className: 'kit-chart-root' }
  const available = focus ? history.summary.seconds > 0 : history.summary.completed > 0
  return <section className={`dash-panel dash-chart ${focus ? 'dash-focus' : 'dash-completions'}`} data-chart={type}>
    <header><div><h2>{focus ? 'Recorded focus' : 'Tasks completed'}</h2><p>{period === 7 ? 'Daily' : period === 30 ? 'Every 3 days' : 'Weekly'} {focus ? 'minutes · ended sessions' : 'completed tasks'}</p></div><span>{focus ? 'Minutes' : 'Tasks'}</span></header>
    {available ? <><div className="kit-upstream" data-kit-native={type} role="group" aria-label={focus ? 'Recorded focus by project. Exact values below.' : 'Completed tasks over this period. Exact values below.'}>
      {focus ? <AreaChart {...common} stackType="stacked"><XAxis dataKey="day" maxTicks={7} /><YAxis tickCount={3} /><Legend isClickable /><Tooltip labelKey="label" valueFormatter={value => dashboardDuration(value * 60)} />{history.series.map(item => <Area key={item.key} dataKey={item.key} variant="gradient" />)}</AreaChart> : <LineChart {...common}><XAxis dataKey="day" maxTicks={7} /><YAxis tickCount={3} tickFormatter={value => Number.isInteger(value) ? String(value) : ''} /><Tooltip labelKey="label" valueFormatter={value => `${value} tasks`} /><Line dataKey="completed" variant="gradient" /></LineChart>}
    </div><div className="chart-values" role="group" aria-label={`Inspect ${type} values`}>{history.buckets.map((bucket, i) => <button key={bucket.key} className="chart-value" aria-label={`${bucket.label}: ${focus ? `${dashboardDuration(bucket.seconds)} focus` : `${bucket.completed} completed tasks`}`} aria-pressed={(index ?? history.buckets.length - 1) === i} onPointerEnter={() => setIndex(i)} onFocus={() => setIndex(i)} onClick={() => { setIndex(i); onInspect(bucket) }}><strong>{number(focus ? bucket.minutes : bucket.completed)}</strong></button>)}</div><div className="chart-footer"><p className="chart-selection" aria-live="polite">{selected.label} · {focus ? `${dashboardDuration(selected.seconds)} recorded focus` : `${selected.completed} tasks completed`}</p><details className="chart-table"><summary>Data table</summary><div className="table-scroll"><table><thead><tr><th scope="col">Date</th><th scope="col">{focus ? 'Recorded focus' : 'Completed'}</th></tr></thead><tbody>{history.buckets.map(bucket => <tr key={bucket.key}><td>{bucket.label}</td><td>{focus ? dashboardDuration(bucket.seconds) : bucket.completed}</td></tr>)}</tbody></table></div></details></div></> : <div className="no-data"><strong>No {focus ? 'focus' : 'completions'} recorded this period.</strong><span>{focus ? 'Ended focus sessions will appear here.' : 'Finish a task to see it here.'}</span></div>}
  </section>
}
function RecentWork({ events, period, onOpenTask, onActivity }) {
  const time = value => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
  return <details className="dash-recent dash-disclosure">
    <summary className="dash-recent-summary dash-disclosure-summary">
      <History size={18} aria-hidden="true" />
      <span className="dash-disclosure-heading"><strong>Recent recorded work</strong><span>{events.length ? `Latest ${events.length} · last ${period} days` : 'No recorded work in this period'}</span></span>
      <ChevronDown className="dash-disclosure-chevron" size={17} aria-hidden="true" />
    </summary>
    {events.length ? <ol className="dash-recent-list">{events.map(event => {
      const focus = event.kind === 'focus'
      const content = <>
        <span className="dash-recent-icon" data-kind={event.kind}>{createElement(focus ? Clock : CircleCheck, { size: 17, 'aria-hidden': true })}</span>
        <span className="dash-recent-context"><strong>{event.task?.title || 'Task unavailable'}</strong><span className="dash-recent-meta"><span>{focus ? 'Focus session' : 'Task completed'}</span><span className="dash-recent-project"><Folder size={12} aria-hidden="true" />{event.task?.project || 'No project'}</span></span></span>
        <span className="dash-recent-outcome"><strong>{focus ? dashboardDuration(event.seconds) : 'Completed'}</strong><time dateTime={event.createdAt}>{dashboardDate(event.createdAt)} · {time(event.createdAt)}</time></span>
      </>
      return <li key={event.id}>{event.task ? <button className="dash-recent-row" aria-label={`View task: ${event.task.title}, ${focus ? dashboardDuration(event.seconds) + ' focus' : 'completed'}, ${dashboardDate(event.createdAt)} at ${time(event.createdAt)}`} onClick={() => onOpenTask(event.task.id)}>{content}<ArrowRight className="dash-recent-arrow" size={16} aria-hidden="true" /></button> : <div className="dash-recent-row">{content}</div>}</li>
    })}</ol> : <p className="dash-recent-empty">Ended focus sessions and completed tasks will appear here as you work.</p>}
    <footer><span>Newest first · recorded work only</span><button className="wb-ghost" onClick={() => onActivity()}>All activity<ArrowRight size={14} aria-hidden="true" /></button></footer>
  </details>
}

function CountingGuide({ period }) {
  const [open, setOpen] = useState(false)
  return <><section className="dash-counting dash-disclosure">
    <button className="dash-counting-summary dash-disclosure-summary" aria-haspopup="dialog" onClick={() => setOpen(true)}><BookOpen size={18} aria-hidden="true" /><span className="dash-disclosure-heading"><strong>How these figures are counted</strong><span>Definitions and date ranges</span></span><ArrowRight className="dash-disclosure-chevron" size={17} aria-hidden="true" /></button>
    </section>
    {open && <Modal title="How these figures are counted" onClose={() => setOpen(false)} footer={<button onClick={() => setOpen(false)}>Close guide</button>}>
    <div className="dash-counting-body">
      <section aria-label="Figures for the selected dates"><h3>For the selected {period} days</h3><dl>
        <div><dt>Focus recorded</dt><dd>Actual time saved when a focus session ends. Running and paused timers are excluded.</dd></div>
        <div><dt>Tasks completed</dt><dd>Each task counts once in this period, even if you later reopen it. The chart places it at its latest completion in the period.</dd></div>
        <div><dt>Active days</dt><dd>A day with recorded focus or a task completion. Notes and task edits alone don’t count.</dd></div>
        <div><dt>Focus by project</dt><dd>Uses each task’s current project. Unassigned work appears as No project. When there are more than three projects, Other work includes the remaining projects.</dd></div>
      </dl><p className="dash-counting-comparison">Comparisons use the previous {period} days, with the same local-day boundaries.</p></section>
      <section aria-label="Figures independent of the selected dates"><h3>Independent of the date range</h3><dl>
        <div><dt>Current streak</dt><dd>Consecutive active days ending today or yesterday, using all recorded history.</dd></div>
        <div><dt>Tasks by status</dt><dd>A snapshot of your Board right now. Changing the date range doesn’t change these counts.</dd></div>
        <div><dt>Work activity</dt><dd>A 90-day calendar, with the selected dates shown brighter. It follows your week-start setting.</dd></div>
      </dl></section>
      <p className="dash-counting-note">More recorded time isn’t automatically better.</p>
    </div>
    </Modal>}
  </>
}

export default function DashboardView({ tasks, events, loading, error, preferences, onRetry, onCapture, onContinue, onBoard, onOpenTask, onActivity, onConnect, nextTask, timerStatus, period = 7, onPeriod }) {
  const [detail, setDetail] = useState(null)
  const history = useMemo(() => dashboardHistory(tasks, events, period, new Date(), preferences.weekStart), [tasks, events, period, preferences.weekStart])
  const dateRange = `${dashboardDate(history.start)}–${dashboardDate(history.today)}, ${history.today.getFullYear()}`
  const largestStatus = Math.max(1, ...history.statuses.map(item => item.count))
  const metrics = [
    ['Focus recorded', dashboardDuration(history.summary.seconds), comparison(history.summary.seconds, history.previous.seconds, period, true), Clock],
    ['Tasks completed', history.summary.completed, `${comparison(history.summary.completed, history.previous.completed, period)} · tasks`, CircleCheck],
    ['Active days', history.activeDays, `${comparison(history.activeDays, history.previousActiveDays, period)} · days`, CirclePlus],
    ['Current streak', `${history.streak} ${history.streak === 1 ? 'day' : 'days'}`, 'Through today or yesterday · all history', Play],
  ]
  const inspectDay = event => {
    event.preventDefault()
    const key = new FormData(event.currentTarget).get('date'), day = history.calendar.find(item => item.key === key)
    if (day) setDetail({ title: dashboardDate(`${key}T12:00:00`), seconds: day.summary.seconds, completed: day.summary.completed, events: day.events, activity: { period: 'custom', fromDate: key, toDate: key } })
  }
  const firstUse = !tasks.length && !events.length
  return <div className="dashboard-page">
    <div className="dash-heading"><h1>Home</h1><div><button disabled={loading || Boolean(error)} onClick={onCapture}>New task</button></div></div>
    <div className="dash-controls"><div className="dash-periods" role="group" aria-label="Dashboard period">{[7, 30, 90].map(days => <button key={days} aria-pressed={period === days} disabled={loading || Boolean(error)} onClick={() => onPeriod(days)}>{days} days</button>)}</div><p>{dateRange}</p><p className="dash-recorded">Recorded work only</p></div>
    {loading ? <section className="dash-loading" role="status" aria-busy="true"><p>Loading your work history…</p><div className="dash-grid" aria-hidden="true"><div className="dash-metrics">{metrics.map(([label]) => <div className="dash-skeleton-metric" key={label}><span /><span /><span /></div>)}</div>{['dash-focus', 'dash-completions', 'dash-projects', 'dash-distribution', 'dash-rhythm'].map(name => <div key={name} className={`dash-panel dash-skeleton-panel ${name}`}><span /><span /><div /></div>)}</div></section> : error ? <section className="dash-state wb-error" role="alert"><h2>Work history couldn’t load</h2><p>{error}</p><p>Your figures will appear once the connection recovers.</p><button onClick={onRetry}><RotateCw size={15} aria-hidden="true" />Try again</button></section> : firstUse ? <>
      <section className="dash-state dash-empty"><h2>Start with a task.</h2><p>Capture something you want to do, or bring in issues from a GitHub repository. Choose a task in Workspace when you’re ready to focus.</p><div className="dash-start-actions"><button className="wb-primary" onClick={onCapture}><CirclePlus size={16} aria-hidden="true" />Create your first task</button>{onConnect && <button onClick={onConnect}><Github size={16} aria-hidden="true" />Connect GitHub repository</button>}</div><p className="dash-start-hint">{onConnect ? 'Connecting a repository lets you choose which issues to import.' : 'GitHub connection is available in the signed-in app.'}</p></section>
      <div className="dash-grid dash-empty-charts"><HistoryChart type="focus" history={history} period={period} /><HistoryChart type="completed" history={history} period={period} /></div>
    </> : <>
      <section className="dash-next" aria-label="Your next action">{nextTask ? <><div className="dash-next-context">{timerStatus && <p className="dash-next-label">{timerStatus === 'paused' ? 'Timer paused' : 'Timer running'}</p>}<h2>{nextTask.title}</h2><div className="dash-next-meta"><span><Folder size={14} aria-hidden="true" />{nextTask.project || 'No project'}</span><StatusLabel status={nextTask.status} /></div>{nextTask.nextStep && <p className="dash-next-step">{nextTask.nextStep}</p>}</div><div className="dash-next-actions"><button onClick={onContinue}>Continue task<ArrowRight size={15} aria-hidden="true" /></button><button className="wb-ghost" onClick={() => onBoard({})}>View Board</button></div></> : <><div className="dash-next-context"><h2>{tasks.length ? 'No unfinished tasks.' : 'Ready for your next task?'}</h2><p className="dash-next-step">{tasks.length ? 'Review completed work on the Board, or capture what’s next.' : 'Your recorded history stays here when tasks are removed.'}</p></div><button onClick={() => onBoard({})}>View Board<ArrowRight size={15} aria-hidden="true" /></button></>}</section>
      <MotionConfig reducedMotion={preferences.motion === 'reduced' ? 'always' : 'user'}><div className="dash-grid">
      <dl className="dash-metrics">{metrics.map(([label, value, copy, Icon]) => <div className="dash-metric" key={label}><dt>{createElement(Icon, { size: 13, 'aria-hidden': true })}{label}</dt><dd><strong className="dash-value">{value}</strong><span className="dash-comparison">{copy}</span></dd></div>)}</dl>
      <HistoryChart key={`focus-${period}-${preferences.motion}`} type="focus" history={history} period={period} onInspect={bucket => setDetail({ title: bucket.label, ...bucket, activity: { period: 'custom', fromDate: bucket.fromDate, toDate: bucket.toDate, kind: 'focus' } })} />
      <HistoryChart key={`completed-${period}-${preferences.motion}`} type="completed" history={history} period={period} onInspect={bucket => setDetail({ title: bucket.label, ...bucket, activity: { period: 'custom', fromDate: bucket.fromDate, toDate: bucket.toDate, kind: 'completion' } })} />
      <section className="dash-panel dash-projects"><header><div><h2>Focus by project</h2><p>Share of recorded time in this period</p></div><span>{history.projects.length} with focus</span></header>{history.series.length ? <div className="project-layout"><div className="project-donut"><DitherDonutChart label="Project share of recorded focus. Exact values beside the donut." data={history.series.map(item => ({ name: item.name, value: item.seconds, color: item.color }))} /></div><div className="project-rows">{history.series.map(item => <div className="project-row" key={item.key} style={{ '--key': `rgb(${PALETTE[item.color].fill.join(',')})` }}><div className="project-text"><button className="project-name" onClick={() => setDetail({ title: item.name, projects: history.projects.filter(project => item.members.includes(project.project)), activity: { period: 'custom', fromDate: activityDayKey(history.start), toDate: activityDayKey(history.today), kind: 'focus', ...(item.members.length === 1 ? { project: item.members[0] || '__no_project__' } : { projectNames: item.members, projectLabel: item.name }) }, seconds: item.seconds, events: events.filter(event => event.kind === 'focus' && item.members.includes(event.task?.project || '') && new Date(event.createdAt) >= history.start && new Date(event.createdAt) <= new Date()) })}>{item.name}</button><span>{dashboardDuration(item.seconds)}</span></div><p className="project-meta">{Math.round(item.seconds / history.summary.seconds * 100)}% of focus time</p></div>)}</div></div> : <div className="no-data"><strong>No project focus to compare.</strong><span>Unassigned work appears as No project.</span></div>}</section>
      <section className="dash-panel dash-distribution"><header><div><h2>Tasks by status</h2><p>Current Board · all dates</p></div></header><div className="status-rows">{history.statuses.map(item => <div className="status-row" key={item.status}><button className="status-name" onClick={() => onBoard({ status: item.status })}><StatusLabel status={item.status} /></button><div className="status-track" aria-hidden="true"><span style={{ width: `${item.count / largestStatus * 100}%` }} /></div><span>{item.count}</span></div>)}</div><p className="status-total">{tasks.length} tasks currently on the Board</p></section>
      <section className="dash-panel dash-rhythm"><header><div><h2>Work activity</h2><p>{history.activeDays} active days · last {period} days</p></div></header><div className="calendar-wrap"><div className="calendar"><div className="weekdays" aria-hidden="true">{(preferences.weekStart === 'sunday' ? ['Sun', '', 'Tue', '', 'Thu', '', 'Sat'] : ['Mon', '', 'Wed', '', 'Fri', '', 'Sun']).map((day, index) => <span key={index}>{day}</span>)}</div><div className="heatmap" role="img" aria-label={`90-day activity calendar. Selected ${period} days highlighted.`}>{history.calendar.map(day => <span className="heat-cell" key={day.key} data-level={day.level} data-selected={day.selected} data-outside={day.outside} title={`${day.key}: ${dashboardDuration(day.summary.seconds)}, ${day.summary.completed} completed`} />)}</div></div></div><p className="calendar-caption">{dashboardDate(`${history.calendar.find(day => !day.outside).key}T12:00:00`)}–{dashboardDate(history.today)} · selected range bright</p><details className="inspect-day"><summary>Inspect a day</summary><form onSubmit={inspectDay}><label>Date<input type="date" name="date" required min={history.calendar.find(day => !day.outside).key} max={activityDayKey(history.today)} defaultValue={activityDayKey(history.today)} /></label><button>View day</button></form></details></section>
      <div className="dash-secondary"><RecentWork events={history.recent} period={period} onOpenTask={onOpenTask} onActivity={onActivity} /><CountingGuide period={period} /></div>
    </div></MotionConfig></>}
    <p className="dash-footnote">Private dashboard · nothing published</p>
    {detail && <Modal title={detail.title} onClose={() => setDetail(null)} footer={<><button onClick={() => setDetail(null)}>Close</button>{detail.activity && <button className="wb-primary" onClick={() => { const selection = detail.activity; setDetail(null); onActivity(selection) }}>View in Activity<ArrowRight size={15} aria-hidden="true" /></button>}</>}><div className="dash-detail"><dl><div><dt>Focus recorded</dt><dd>{dashboardDuration(detail.seconds)}</dd></div>{detail.completed !== undefined && <div><dt>Tasks completed</dt><dd>{detail.completed}</dd></div>}</dl>{detail.projects?.map(project => <button key={project.project} onClick={() => { setDetail(null); onBoard({ project: project.project || '__no_project__' }) }}>View {project.name} on Board<ArrowRight size={15} aria-hidden="true" /></button>)}{[...new Map((detail.events || []).filter(event => event.task).map(event => [event.task.id, event.task])).values()].map(task => <button key={task.id} className="dash-detail-task" onClick={() => { setDetail(null); onOpenTask(task.id) }}>{task.title}<ArrowRight size={15} aria-hidden="true" /></button>)}<p className="wb-muted">Recorded history only. Opening a task never starts a timer.</p></div></Modal>}
  </div>
}
