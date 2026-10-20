// Isolated review fixtures. No API, account, storage or GitHub changes.
const $ = selector => document.querySelector(selector)
let app
const paths = {
 plus:'<path d="M12 5v14M5 12h14"/>', close:'<path d="m6 6 12 12M6 18 18 6"/>',
 play:'<path d="m9 5 11 7-11 7Z"/>', pause:'<path d="M8 5v14M16 5v14"/>', stop:'<rect x="6" y="6" width="12" height="12" rx="1"/>',
 minus:'<path d="M5 12h14"/>', max:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
 arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>', edit:'<path d="m16 3 5 5-12 12-6 1 1-6Z"/>',
 folder:'<path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11H3Z"/>',
 search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>', info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
 link:'<path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7"/>', done:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
 workspace:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/>', clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>', inbox:'<path d="M3 4h18v16H3Z M3 13h5l2 3h4l2-3h5"/>', ready:'<circle cx="12" cy="12" r="9"/><path d="M12 8v8m-4-4h8"/>',
}
const icon = (name, size=16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.info}</svg>`
const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
for (const [name,key] of [['PLUS','plus'],['CLOSE','close']]) document.body.innerHTML=document.body.innerHTML.replaceAll(`ICON_${name}`,icon(key))
const seed = [
 {id:1,title:'Fix the OAuth callback retry',project:'checkout-api',status:'progress',next:'Reproduce the expired-code case, then check the retry response.',note:'The callback succeeds on the first attempt. The retry still needs a fresh code before it can continue.',reference:'https://github.com/example/checkout-api/issues/42'},
 {id:2,title:'Keep search filters after going back',project:'web-client',status:'progress',next:'Check Back navigation after opening a result.',note:'The query survives. The project filter resets when returning to the list.',reference:'https://github.com/example/web-client/issues/18'},
 {id:3,title:'Check keyboard access to the task editor',project:'web-client',status:'ready',next:'Verify Escape closes the editor and returns focus.',note:'',reference:''},
 {id:4,title:'Write down the release steps',project:'',status:'inbox',next:'',note:'',reference:''},
]
app=$('.workspace-demo')
$('.wb-page-label svg').outerHTML=icon('workspace',17)
$('.wb-account-menu').classList.remove('wb-account-current')
let tasks, selected, focus, remaining, size, query='', project='', opener, editing=null
const statusNames={inbox:'Inbox',ready:'Ready',progress:'In progress',done:'Done'}
function status(task){return `<span class="ws-status" data-status="${task.status}">${icon(task.status==='progress'?'play':task.status==='done'?'done':task.status==='ready'?'ready':'inbox',13)}${statusNames[task.status]}</span>`}
function meta(task){return `<div class="ws-meta"><span class="ws-project">${icon('folder',14)}${esc(task.project || 'No project')}</span>${status(task)}</div>`}
function announce(message){$('#announcement').textContent=message}
function reset(){
 tasks=structuredClone(seed);selected=1;focus=$('#scenario').value==='active'?{id:1,paused:false}:null;remaining=19*60+42;query='';project='';size=innerWidth<=760?'compact':'normal'
 if($('#scenario').value==='idle'){remaining=25*60;focus=null}
 if($('#scenario').value==='empty'){tasks=[];selected=null;focus=null}
 if($('#scenario').value==='long')tasks[0]={...tasks[0],title:'Preserve every search filter and restore the scroll position when returning from a repository issue to a very long list of unfinished work',note:Array(12).fill('Keep the project, query and status filter intact. Check keyboard navigation as well as browser Back.').join('\n\n')}
 render()
}
function render(){
 const task=tasks.find(item=>item.id===selected)
 $('#workspace-count').textContent=tasks.length?`${tasks.filter(item=>item.status!=='done').length} unfinished · selecting a task doesn’t start focus`:'Capture one task to get started.'
 $('#workspace-content').innerHTML=task?`<div class="ws-layout"><article class="ws-task" aria-label="Selected task"><header class="ws-task-header">${meta(task)}<h2>${esc(task.title)}</h2><div class="ws-task-tools">${task.reference?`<a class="ws-reference" href="${esc(task.reference)}" target="_blank" rel="noreferrer">${icon('link',14)}Open reference</a>`:''}<button data-action="edit" data-id="${task.id}">${icon('edit',14)}Edit task</button></div></header><div class="ws-task-scroll"><section><p class="ws-section-label">Next step</p><p class="ws-next">${esc(task.next || 'No next step yet.')}</p></section><section><p class="ws-section-label">Where you left off</p><p class="ws-note">${esc(task.note || 'No saved notes.')}</p>${task.note?'<time class="ws-note-date">Sample note · today, 09:12</time>':''}</section><details class="ws-note-disclosure"><summary>Add a note · optional</summary><form class="ws-note-form" id="note-form"><label>Note<textarea name="note" placeholder="What would help you pick this up later?"></textarea></label><button>Save note</button><small>Sample changes reset when you reload.</small></form></details></div><footer class="ws-task-footer"><span>Finishing doesn’t require a note.</span><button data-action="complete" data-id="${task.id}">${icon(task.status==='done'?'ready':'done')}${task.status==='done'?'Reopen task':'Mark done'}</button></footer></article><aside class="ws-queue" aria-label="Task context"><details class="ws-mobile-chooser" ${innerWidth>760||app.dataset.layout==='queue'?'open':''}><summary>Choose a task<span>${tasks.filter(task=>task.status!=='done').length} unfinished</span></summary><header class="ws-queue-header"><h2>Unfinished work</h2><span id="queue-count"></span></header><label class="ws-search">${icon('search')}<input id="queue-search" aria-label="Find unfinished task" placeholder="Find a task…" value="${esc(query)}"></label><div class="ws-queue-list" id="queue-list"></div></details></aside></div>`:`<section class="ws-empty"><h2>Start with one task</h2><p>Write something you want to do. You can add details later.</p><form id="empty-form"><input name="title" required aria-label="Task title" placeholder="What do you want to do?" maxlength="300"><button class="primary">Create task</button></form><small>Saved in Inbox. Focus starts only when you choose.</small><p>Already have work on GitHub? Repository connection stays in the real app; this preview uses sample tasks only.</p></section>`
 renderQueue();renderTimer()
}
function renderQueue(){
 if(!$('#queue-list'))return
 const visible=tasks.filter(task=>task.status!=='done'&&(!project||task.project===project)&&task.title.toLowerCase().includes(query.toLowerCase()))
 $('#queue-count').textContent=`${visible.length} ${visible.length===1?'task':'tasks'}`
 $('#queue-list').innerHTML=visible.map(task=>`<div class="ws-row" data-selected="${task.id===selected}"><button class="ws-row-main" data-action="select" data-id="${task.id}" aria-pressed="${task.id===selected}"><strong>${esc(task.title)}</strong>${meta(task)}${focus?.id===task.id?`<small>${icon('clock',13)}${focus.paused?'Focus paused':'Focusing now'}</small>`:''}</button><button class="ws-row-info" data-action="inspect" data-id="${task.id}" aria-label="View details for ${esc(task.title)}">${icon('info')}</button></div>`).join('')||'<p class="ws-no-matches">No unfinished tasks match.<br>Change the search or project.</p>'
}
function renderTimer(){
 const timer=$('#timer'),task=tasks.find(task=>task.id===(focus?.id || selected));timer.hidden=!task;if(!task){measureTimer();return}
 timer.dataset.size=size;timer.dataset.running=Boolean(focus&&!focus.paused)
 timer.innerHTML=`<header class="ws-timer-header"><span class="ws-timer-state"><i class="ws-signal"></i>${focus?remaining===0?'Time is up':focus.paused?'Focus paused':'Focusing now':'Ready to focus'}</span><div class="ws-window-actions"><button data-action="minimize" aria-label="${size==='compact'?'Expand':'Minimize'} timer">${icon(size==='compact'?'max':'minus',14)}</button>${size!=='compact'?`<button data-action="maximize" aria-label="${size==='large'?'Restore':'Maximize'} timer">${icon('max',14)}</button>`:''}</div></header><div class="ws-clock"><time role="timer" aria-live="off">${clock()}</time><span>${focus?'remaining':'minutes of focus'}</span></div><p class="ws-timer-task">${esc(task.title)}</p><div class="ws-timer-controls">${focus?`<button class="primary" data-action="pause" ${remaining===0?'disabled':''}>${icon(focus.paused?'play':'pause',14)}${focus.paused?'Resume':'Pause'}</button><button data-action="stop">${icon('stop',14)}Stop</button>`:`<button class="primary" data-action="start">${icon('play',14)}Start focus</button>`}</div>${focus&&focus.id!==selected?'<button class="ws-timer-return" data-action="return">Return to focused task '+icon('arrow',14)+'</button>':''}`
 measureTimer()
}
function measureTimer(){requestAnimationFrame(()=>app.style.setProperty('--ws-timer-height',`${$('#timer').hidden?0:$('#timer').getBoundingClientRect().height}px`))}
function clock(){return `${String(Math.floor(remaining/60)).padStart(2,'0')}:${String(remaining%60).padStart(2,'0')}`}
function openDialog(dialog){opener=document.activeElement;dialog.showModal()}
function closeDialog(dialog){dialog.close();if(opener?.isConnected)opener.focus();else $('#workspace-main').focus()}
function showTask(id,edit=false){
 const task=tasks.find(task=>task.id===id);editing=edit?id:null
 $('#task-dialog h2').textContent=edit?'Edit task':'Task details'
 $('#dialog-body').innerHTML=edit?`<form id="edit-form"><label>Title<input name="title" required maxlength="300" value="${esc(task.title)}"></label><label>Next step<textarea name="next" maxlength="1200">${esc(task.next)}</textarea></label><p>Project: ${esc(task.project||'No project')} · ${statusNames[task.status]}</p><p>Saved note</p><p>${esc(task.note||'No saved notes.')}</p><label>New note · optional<textarea name="note" maxlength="3000"></textarea></label></form>`:`${meta(task)}<h3 style="margin-top:24px">${esc(task.title)}</h3><dl><div><dt>Next step</dt><dd>${esc(task.next||'No next step saved.')}</dd></div><div><dt>Saved note</dt><dd>${esc(task.note||'No saved notes.')}</dd></div></dl>`
 $('#dialog-footer').innerHTML=edit?'<button data-close>Cancel</button><button class="primary" form="edit-form">Save changes</button>':`<p>Opening a task doesn’t start or switch your focus timer.</p><button data-action="dialog-edit" data-id="${id}">${icon('edit')}Edit</button><button class="primary" data-action="dialog-work" data-id="${id}">Open in Workspace${icon('arrow')}</button>`
 if(!$('#task-dialog').open)openDialog($('#task-dialog'))
}
app.addEventListener('click',event=>{
 const button=event.target.closest('[data-action]');if(!button)return
 const action=button.dataset.action,id=Number(button.dataset.id)
 if(action==='select'){selected=id;render();announce('Task selected. Focus is unchanged.')}
 if(action==='inspect'||action==='edit')showTask(id,action==='edit')
 if(action==='start'){focus={id:selected,paused:false};remaining=25*60;tasks.find(task=>task.id===selected).status='progress';render();announce('Focus started. Task moved to In progress.')}
 if(action==='pause'){focus.paused=!focus.paused;renderQueue();renderTimer();announce(focus.paused?'Focus paused.':'Focus resumed.')}
 if(action==='stop'){focus=null;remaining=25*60;renderQueue();renderTimer();announce('Focus stopped. Task stays unfinished.')}
 if(action==='minimize'){size=size==='compact'?'normal':'compact';renderTimer();$('[data-action=minimize]').focus()}
 if(action==='maximize'){size=size==='large'?'normal':'large';renderTimer();$('[data-action=maximize]').focus()}
 if(action==='return'){selected=focus.id;render();announce('Returned to focused task.')}
 if(action==='complete'){
  if(focus?.id===id){focus=null;remaining=25*60}
  const task=tasks.find(task=>task.id===id);task.status=task.status==='done'?'ready':'done';render();announce(task.status==='done'?'Task completed. Add a note whenever it helps.':'Task reopened.');if(task.status==='done'){showTask(id);$('#task-dialog h2').textContent='Task completed';$('#dialog-body').innerHTML='<h3>'+esc(task.title)+'</h3><p>Saved in Done. You can add a note now or come back later.</p>';$('#dialog-footer').innerHTML='<button data-close>Close</button><button data-action="completed-note">Add note · optional</button>'}
 }
})
document.addEventListener('input',event=>{if(event.target.id==='queue-search'){query=event.target.value;renderQueue()}})
document.addEventListener('submit',event=>{
 const form=event.target;if(!['capture-form','empty-form','note-form','edit-form'].includes(form.id))return;event.preventDefault();const values=Object.fromEntries(new FormData(form))
 if(form.id==='capture-form'||form.id==='empty-form'){
  const title=(form.id==='capture-form'?$('#new-title').value:values.title).trim();if(!title)return
  const task={id:Date.now(),title,project:'',status:'inbox',next:'',note:'',reference:''};tasks.push(task);selected=task.id;if($('#capture-dialog').open)closeDialog($('#capture-dialog'));render();announce('Task created in Inbox. Focus has not started.')
 }
 if(form.id==='note-form'){const note=values.note.trim();if(!note)return;tasks.find(task=>task.id===selected).note=note;render();announce('Sample note saved.')}
 if(form.id==='edit-form'){if(!values.title.trim())return;Object.assign(tasks.find(task=>task.id===editing),{title:values.title.trim(),next:values.next});if(values.note.trim())tasks.find(task=>task.id===editing).note=values.note.trim();closeDialog($('#task-dialog'));render();announce('Sample changes saved.')}
})
document.addEventListener('click',event=>{
 if(event.target.closest('[data-close]'))closeDialog(event.target.closest('dialog'))
 const action=event.target.closest('#dialog-footer [data-action]');if(action){const id=Number(action.dataset.id);if(action.dataset.action==='completed-note'){closeDialog($('#task-dialog'));$('.ws-note-disclosure').open=true;$('#note-form textarea').focus()}if(action.dataset.action==='dialog-edit')showTask(id,true);if(action.dataset.action==='dialog-work'){selected=id;closeDialog($('#task-dialog'));render();$('#workspace-main').focus()}}
 const layout=event.target.closest('[data-layout]');if(layout?.tagName==='BUTTON'){app.dataset.layout=layout.dataset.layout;$('.review-layouts [aria-pressed=true]').setAttribute('aria-pressed','false');layout.setAttribute('aria-pressed','true');if($('.ws-mobile-chooser'))$('.ws-mobile-chooser').open=innerWidth>760||layout.dataset.layout==='queue';$('#rationale').textContent=layout.dataset.layout==='task'?'A gives the current task most of the space. The queue stays alongside it; the timer has a reserved corner.':'B puts the queue first. Picking a task is easier; the task panel gives up space to keep the timer visible.';measureTimer()}
})
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog(dialog)})
$('#capture-open').onclick=()=>{ $('#capture-form').reset();openDialog($('#capture-dialog')) }
$('#scenario').onchange=reset;$('#reset').onclick=reset
$('#theme').onclick=()=>{const dark=document.documentElement.dataset.theme==='dark';document.documentElement.dataset.theme=dark?'light':'dark';$('#theme').textContent=dark?'Switch to dark':'Switch to light'}
$('#navigation').onclick=()=>{const side=app.dataset.navigation==='sidebar';app.dataset.navigation=side?'navbar':'sidebar';$('#navigation').textContent=side?'Use sidebar':'Use navbar';measureTimer()}
$('#motion').onclick=()=>{const reduced=document.documentElement.dataset.motion==='reduced';document.documentElement.dataset.motion=reduced?'full':'reduced';$('#motion').textContent=reduced?'Reduce motion':'Use animation'}
for(const button of document.querySelectorAll('.wb-page-menu nav button,.wb-account-menu nav button')){button.disabled=true;button.title='Outside this Workspace layout preview'}
for(const button of document.querySelectorAll('.wb-project-shortcuts button'))button.onclick=()=>{project=project===button.title?'':button.title;for(const item of document.querySelectorAll('.wb-project-shortcuts button'))item.setAttribute('aria-pressed',String(item.title===project));renderQueue()}
$('.wb-brand').onclick=()=>{project='';query='';render()}
setInterval(()=>{if(!focus||focus.paused||remaining<=0)return;remaining--;const time=$('#timer time');if(time)time.textContent=clock();if(remaining===0){focus.paused=true;renderQueue();renderTimer();announce('Time is up. Your task stays in progress.')}},1000)
new ResizeObserver(measureTimer).observe($('#timer'))
window.addEventListener('resize',measureTimer)
const params=new URLSearchParams(location.search);if(['dark','light'].includes(params.get('theme')))document.documentElement.dataset.theme=params.get('theme');if(params.get('layout')==='queue'){app.dataset.layout='queue';for(const button of document.querySelectorAll('.review-layouts button'))button.setAttribute('aria-pressed',String(button.dataset.layout==='queue'))}
reset()
