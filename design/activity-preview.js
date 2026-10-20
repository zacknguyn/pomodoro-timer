// Standalone proposal. Fixtures only; no storage, API calls, or real task edits.
const requestedTheme = new URLSearchParams(location.search).get('theme')
if (['light','dark'].includes(requestedTheme)) document.documentElement.dataset.theme=requestedTheme
const taskData = {
  search: { title: 'Keep search filters after going back', project: 'web-client', status: 'Done', next: '', note: 'Back navigation now restores the search and selected project.' },
  oauth: { title: 'Fix the OAuth callback retry', project: 'checkout-api', status: 'In progress', next: 'Reproduce the expired-code case, then check the retry response.', note: 'Covered the expired callback branch. The retry response still needs a check.' },
  keyboard: { title: 'Check keyboard access to the task editor', project: 'web-client', status: 'Done', next: '', note: '' },
  export: { title: 'Preserve references and notes when exporting a workspace with disconnected projects', project: '', status: 'Ready', next: 'Check an export with a deleted project and two reference links.', note: '' },
}
const history = [
  { id: 'complete-search', task: 'search', kind: 'completion', day: 'today', time: '16:10', text: 'Moved from In progress to Done.', note: taskData.search.note },
  { id: 'focus-search', task: 'search', kind: 'focus', day: 'today', time: '15:55', minutes: 25, text: '25 min recorded · timer stopped', start: '15:30', end: '15:55' },
  { id: 'note-oauth', task: 'oauth', kind: 'note', day: 'today', time: '13:50', text: taskData.oauth.note },
  { id: 'focus-oauth', task: 'oauth', kind: 'focus', day: 'today', time: '13:45', minutes: 20, text: '20 min recorded · timer stopped early', start: '13:25', end: '13:45' },
  { id: 'complete-keyboard', task: 'keyboard', kind: 'completion', day: 'today', time: '11:00', text: 'Moved from In progress to Done.', note: '' },
  { id: 'focus-keyboard-2', task: 'keyboard', kind: 'focus', day: 'today', time: '10:50', minutes: 25, text: '25 min recorded · timer stopped', start: '10:25', end: '10:50' },
  { id: 'focus-keyboard-1', task: 'keyboard', kind: 'focus', day: 'today', time: '09:40', minutes: 25, text: '25 min recorded · timer stopped', start: '09:15', end: '09:40' },
  { id: 'created-oauth', task: 'oauth', kind: 'change', day: 'today', time: '09:05', text: 'Task created in Inbox.' },
  { id: 'note-export', task: 'export', kind: 'note', day: 'yesterday', time: '17:10', text: 'Keep the task history even when a project is removed. No reference added yet.' },
  { id: 'focus-export', task: 'export', kind: 'focus', day: 'yesterday', time: '17:00', minutes: 30, text: '30 min recorded · timer stopped', start: '16:30', end: '17:00' },
]
const labels = { focus: 'Focus session', completion: 'Task completed', note: 'Note saved', change: 'Task change' }
const paths = { focus: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', completion: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>', note: '<path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3M16 3l5 5-9 9H7v-5z"/>', change: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/>' }
const icon = kind => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[kind]}</svg>`
const escapeText = text => String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
const root = document.querySelector('.premium-app'), dialog = document.querySelector('dialog')
const results = document.querySelector('#activity-results'), summary = document.querySelector('.activity-summary')
let period = 'today', activeEntry = null, opener = null
function filtered() {
  const query = document.querySelector('#activity-search').value.trim().toLowerCase()
  const project = document.querySelector('#activity-project').value, type = document.querySelector('#activity-type').value
  return history.filter(entry => {
    const task = taskData[entry.task]
    return (period === 'week' || entry.day === 'today') && (!project || (project === 'none' ? !task.project : task.project === project)) && (!type || entry.kind === type) && `${task.title} ${task.project} ${entry.text} ${entry.note || ''}`.toLowerCase().includes(query)
  })
}
function render() {
  const state = document.querySelector('#preview-state').value, entries = filtered()
  const populated = state === 'populated'
  summary.hidden = !populated; document.querySelector('.activity-footnote').hidden = !populated
  document.querySelector('#record-count').textContent = populated ? `${entries.length} ${entries.length === 1 ? 'record' : 'records'} · newest first` : ''
  results.removeAttribute('aria-busy')
  if (state === 'loading') { results.setAttribute('aria-busy','true'); results.innerHTML='<p class="activity-state" role="status">Loading your work history…</p>'; return }
  if (state === 'error') { results.innerHTML='<div class="activity-state" role="alert"><p>Work history couldn’t load. Your tasks are unchanged.</p><button data-retry>Try again</button></div>';results.querySelector('[data-retry]').onclick=()=>{document.querySelector('#preview-state').value='populated';render()};return }
  if (state === 'empty') {results.innerHTML='<p class="activity-empty">Your task changes, notes, and recorded focus sessions will appear here as you work. Start with a task in Board.</p>';return}
  const minutes=entries.reduce((total,entry)=>total+(entry.minutes||0),0), completed=new Set(entries.filter(e=>e.kind==='completion').map(e=>e.task)).size
  summary.innerHTML=`<div><dt><strong>${minutes} min</strong></dt><dd><span>focus recorded</span></dd></div><div><dt><strong>${entries.filter(e=>e.kind==='focus').length}</strong></dt><dd><span>focus sessions</span></dd></div><div><dt><strong>${completed}</strong></dt><dd><span>tasks completed</span></dd></div>`
  if (!entries.length) {results.innerHTML='<p class="activity-empty">No activity matches this selection.<button class="wb-ghost" data-clear>Clear filters</button></p>';results.querySelector('[data-clear]').onclick=clearFilters;return}
  results.innerHTML=['today','yesterday'].map(day=>{
    const items=entries.filter(e=>e.day===day);if(!items.length)return ''
    const date=day==='today'?'Today · Oct 15, 2026':'Yesterday · Oct 14, 2026'
    return `<section class="activity-section" aria-label="${date}"><header class="activity-day"><h2>${date}</h2><span>${items.length} records</span></header><ol class="activity-events">${items.map(entry=>{const task=taskData[entry.task];return `<li class="activity-event" data-record="${entry.id}"><span class="activity-event-icon">${icon(entry.kind)}</span><div class="activity-event-main"><div class="activity-event-heading"><span class="activity-event-kind">${labels[entry.kind]}</span><time datetime="2026-10-${day==='today'?'15':'14'}T${entry.time}:00">${entry.time}</time></div><p class="activity-event-title">${escapeText(task.title)}</p><p class="activity-event-copy">${escapeText(entry.text)}</p>${entry.note?`<p class="activity-event-copy">${escapeText(entry.note)}</p>`:''}<div class="activity-event-bottom"><span class="activity-project">${escapeText(task.project||'No project')}</span>${entry.kind==='completion'&&!entry.note?'<span class="wb-muted">No closing note</span>':''}</div></div><button class="activity-open" data-open="${entry.id}" aria-label="View ${labels[entry.kind].toLowerCase()} for ${escapeText(task.title)} at ${entry.time}">View details <span aria-hidden="true">→</span></button></li>`}).join('')}</ol></section>`
  }).join('')
  results.querySelectorAll('[data-open]').forEach(button=>button.onclick=()=>showEntry(history.find(e=>e.id===button.dataset.open),button))
}
function clearFilters(){document.querySelectorAll('.activity-controls input,.activity-controls select').forEach(control=>control.value='');period='today';updatePeriod();render()}
function updatePeriod(){document.querySelectorAll('[data-period]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.period===period)))}
function showEntry(entry,button){
  activeEntry=entry;opener=button;const task=taskData[entry.task]
  document.querySelector('#activity-detail-title').textContent=task.title
  dialog.querySelector('.wb-modal-body').innerHTML=`<div class="wb-task-dialog-grid"><div class="wb-task-dialog-main"><section class="activity-detail-record"><p class="activity-dialog-kicker">${icon(entry.kind)}${labels[entry.kind]}</p><p class="activity-dialog-time">${entry.day==='today'?'Oct 15':'Oct 14'}, 2026 · ${entry.time}</p><p>${escapeText(entry.text)}</p>${entry.kind==='focus'?`<p class="wb-muted">${entry.start}–${entry.end} · ${entry.minutes} min recorded<br>Timer stopped. Task completion is a separate action.</p>`:''}${entry.kind==='completion'?`<p>${escapeText(entry.note||'Completed without a closing note. Notes are optional.')}</p>`:''}</section><section class="activity-dialog-next"><h3>Current next step</h3><p>${escapeText(task.next||'No next step saved.')}</p></section><p class="wb-muted">This record describes the event. Task properties show where the task stands now.</p></div><aside class="wb-task-properties" aria-label="Current task properties"><h3>Task now</h3><dl><div><dt>Current status</dt><dd>${task.status}</dd></div><div><dt>Project</dt><dd>${escapeText(task.project||'No project')}</dd></div></dl><div><p class="wb-label">Reference</p><p class="wb-muted">No reference added.</p></div></aside></div>`
  dialog.showModal();dialog.querySelector('[data-close]').focus()
}
dialog.querySelectorAll('[data-close]').forEach(button=>button.onclick=()=>dialog.close())
dialog.addEventListener('close',()=>opener?.focus())
document.querySelector('#open-task').onclick=()=>{
  const task=taskData[activeEntry.task]
  document.querySelector('#activity-detail-title').textContent=task.title
  dialog.querySelector('.wb-modal-body').innerHTML=`<div class="activity-dialog-section"><p class="wb-label">Read-only task preview · ${task.status}</p><section class="activity-dialog-next"><h3>Next step</h3><p>${escapeText(task.next||'No next step saved.')}</p></section><section class="activity-dialog-next"><h3>Saved notes</h3><p>${escapeText(task.note||'No saved notes yet.')}</p></section><p class="wb-muted">In the app, this opens the existing task popup with Edit and Open in Workspace actions. This HTML proposal does not edit tasks or run a timer.</p></div>`
}
document.querySelectorAll('.activity-controls input,.activity-controls select').forEach(control=>control.addEventListener('input',render))
document.querySelectorAll('[data-period]').forEach(button=>button.onclick=()=>{period=button.dataset.period;updatePeriod();render()})
document.querySelector('#preview-state').onchange=render
document.querySelector('#preview-theme').onclick=()=>document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark'
document.querySelector('#preview-navigation').onclick=()=>root.dataset.navigation=root.dataset.navigation==='sidebar'?'navbar':'sidebar'
root.querySelectorAll('.wb-project-shortcuts button').forEach(button=>button.onclick=()=>{document.querySelector('#activity-project').value=button.title;render()})
root.querySelector('.wb-skip').onclick=event=>{event.preventDefault();document.querySelector('#wb-main').focus()}
root.querySelectorAll('.wb-menu nav button,.wb-brand').forEach(button=>button.onclick=()=>{button.closest('details')?.removeAttribute('open');document.querySelector('#demo-feedback').textContent='This proposal covers Activity only. Other pages keep their current design.'})
function fit(){root.style.setProperty('--wb-height',`${innerHeight-document.querySelector('.prototype-tools').getBoundingClientRect().height}px`)}
addEventListener('resize',fit);document.fonts.ready.then(fit);render();fit()
