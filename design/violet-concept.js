// A review-only layout variant reusing the existing task, dialog and timer flows.
function enableVioletLayout() {
  document.documentElement.dataset.concept = 'violet'
  const style = document.createElement('link')
  style.rel = 'stylesheet'; style.href = 'violet-concept.css'
  document.head.append(style)
  document.addEventListener('click', event => {
    if (event.target.closest('#jump-note')) {
      const panel = document.querySelector('.concept-note'); if (panel) panel.open = true
    }
  }, true)
  window.refreshVioletConcept = () => {
    const header = document.querySelector('.topbar')
    if (!header.querySelector('.concept-projects')) {
      const brand = header.querySelector('.brand')
      const logo = document.createElement('img')
      logo.src = '../frontend/public/pomogit-logo.png'; logo.alt = ''; logo.width = 32; logo.height = 32
      brand.prepend(logo)
      const projects = document.createElement('nav')
      projects.className = 'concept-projects'; projects.setAttribute('aria-label', 'Project shortcuts')
      header.querySelector('.page-switcher').after(projects)
      const footer = document.createElement('span')
      footer.className = 'concept-account'; footer.innerHTML = '<strong>Phong Nguyen</strong><small>Personal workspace</small>'
      header.querySelector('.header-utilities').append(footer)
      new ResizeObserver(([entry]) => document.documentElement.style.setProperty('--review-height', entry.target.getBoundingClientRect().height + 'px')).observe(document.querySelector('.prototype'))
      const label = document.createElement('p')
      label.className = 'concept-location'; label.textContent = 'YOUR WORKSPACE'
      document.querySelector('.heading').prepend(label)
    }
    for (const empty of document.querySelectorAll('.lane-empty')) {
      empty.textContent = { inbox: 'Capture a task above', ready: 'Move a task here when it’s ready', progress: 'Start focus or move a task here', done: 'Completed work lands here' }[empty.closest('.lane').dataset.drop]
    }
    const note = document.querySelector('#note-form')
    if (note && !note.closest('.concept-note')) {
      const panel = document.createElement('details')
      panel.className = 'concept-note'
      panel.open = !!note.querySelector('textarea').value
      const summary = document.createElement('summary'); summary.textContent = 'Write a note'
      note.before(panel); panel.append(summary, note)
    }
    const projects = header.querySelector('.concept-projects')
    projects.replaceChildren()
    const heading = document.createElement('p')
    heading.textContent = 'Projects'; projects.append(heading)
    const select = document.querySelector('#project')
    for (const option of [...select.options].slice(1)) {
      const button = document.createElement('button')
      button.type = 'button'; button.textContent = option.textContent
      button.insertAdjacentHTML('afterbegin', '<svg class="project-shortcut-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-opacity=".18" d="M3 7a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9H3Z"/><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" d="M3 7a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9H3Z"/><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M3 10h18"/></svg>')
      button.setAttribute('aria-pressed', String(select.value === option.value))
      button.onclick = () => {
        // Reuse the native filter and existing navigation; no second task state.
        if (document.querySelector('#surface').classList.contains('profile-page')) document.querySelector('[data-view="board"]').click()
        select.value = select.value === option.value ? '' : option.value
        select.dispatchEvent(new Event('change', { bubbles: true }))
        Array.from(document.querySelectorAll('.concept-projects button')).find(item => item.textContent === option.textContent)?.focus()
      }
      projects.append(button)
    }
    if (projects.children.length === 1) {
      const empty = document.createElement('small'); empty.textContent = 'Add a project when you create a task.'; projects.append(empty)
    }
  }
}

window.getPreviewNavigation = () => document.documentElement.dataset.navigation || 'navbar'
window.setPreviewNavigation = value => {
  const navigation = value === 'sidebar' ? 'sidebar' : 'navbar'
  const root = document.documentElement
  if (!root.dataset.concept && navigation === 'navbar') return
  if (!root.dataset.concept) enableVioletLayout()
  root.dataset.navigation = navigation
  const url = new URL(location.href)
  url.searchParams.set('concept', 'violet'); url.searchParams.set('nav', navigation)
  history.replaceState(history.state, '', url)
  window.refreshVioletConcept?.()
  window.dispatchEvent(new Event('resize'))
}
const navigationUrl = new URL(location.href)
if (navigationUrl.searchParams.get('concept') === 'violet' || navigationUrl.searchParams.has('nav')) {
  enableVioletLayout()
  document.documentElement.dataset.navigation = navigationUrl.searchParams.get('nav') === 'navbar' ? 'navbar' : 'sidebar'
}
