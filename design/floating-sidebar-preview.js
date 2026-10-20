// Navigation review only: all content and task state belong to the existing HTML previews.
const $ = selector => document.querySelector(selector)
const pages = $('#pages'), home = $('#home')
const paths = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  workspace: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M3 9h6"/>',
  board: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/>',
  activity: '<path d="M8 5h13M8 12h13M8 19h13"/><circle cx="3" cy="5" r="1"/><circle cx="3" cy="12" r="1"/><circle cx="3" cy="19" r="1"/>',
  folder: '<path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2"/>',
  settings: '<path d="m9 3-.6 2.2-2 .9-2-.6-2 3.5L4 11v2l-1.6 2 2 3.5 2-.6 2 .9L9 21h6l.6-2.2 2-.9 2 .6 2-3.5-1.6-2v-2l1.6-2-2-3.5-2 .6-2-.9L15 3z"/><circle cx="12" cy="12" r="3"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
}
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`
document.querySelectorAll('[data-icon]').forEach(element => {
  element.innerHTML = icon(element.dataset.icon)
  if (element.matches('.pill-pages button')) {
    const label = document.createElement('span')
    label.className = 'nav-label'
    label.textContent = element.id === 'more-button' ? 'More' : element.getAttribute('aria-label')
    element.append(label)
  }
})
function setLayout(layout) {
  document.querySelectorAll('[popover]:popover-open').forEach(popover => popover.hidePopover())
  document.documentElement.dataset.layout = layout
  document.querySelectorAll('button[data-layout]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.layout === layout)))
  const url = new URL(location.href)
  url.searchParams.set('nav', layout)
  history.replaceState(null, '', url)
}
document.querySelectorAll('button[data-layout]').forEach(button => button.onclick = () => setLayout(button.dataset.layout))
setLayout(new URLSearchParams(location.search).get('nav') === 'sidebar' ? 'sidebar' : 'navbar')
const labels = { home: 'Home', continue: 'Workspace', board: 'Board', activity: 'Activity', profile: 'Profile' }
let returnFocus = null

function select(page) {
  document.querySelectorAll('.pill [data-page]').forEach(button => {
    if (button.dataset.page === page && !button.classList.contains('brand')) button.setAttribute('aria-current', 'page')
    else button.removeAttribute('aria-current')
  })
  $('#announcement').textContent = labels[page]
}
function navigate(page) {
  document.querySelectorAll('[popover]:popover-open').forEach(popover => popover.hidePopover())
  home.hidden = page !== 'home'; pages.hidden = page === 'home'
  if (page !== 'home') {
    const target = page === 'profile' ? '#open-profile' : `[data-view="${page}"]`
    pages.contentDocument.querySelector(target)?.click()
  }
  select(page)
}
document.querySelectorAll('[data-page]').forEach(button => button.onclick = () => navigate(button.dataset.page))

function positionMenu(menu, anchor) {
  const rect = anchor.getBoundingClientRect(), mobile = innerWidth <= 760
  if (document.documentElement.dataset.layout === 'navbar') {
    menu.style.left = `${Math.max(12, Math.min(innerWidth - 266, rect.right - 254))}px`
    menu.style.top = `${rect.bottom + 14}px`
    menu.style.bottom = 'auto'
    return
  }
  menu.style.left = `${mobile ? Math.max(12, Math.min(innerWidth - 266, rect.right - 254)) : rect.right + 22}px`
  menu.style.top = mobile ? 'auto' : `${Math.max(12, Math.min(innerHeight - 300, rect.top - 15))}px`
  menu.style.bottom = mobile ? `${innerHeight - rect.top + 16}px` : 'auto'
}
for (const [menu, anchor] of [['#projects-popover', '#projects-button'], ['#more-popover', '#more-button']]) {
  $(menu).addEventListener('beforetoggle', event => {
    if (event.newState === 'open') {
      positionMenu($(menu), innerWidth <= 760 ? $('#more-button') : $(anchor))
      if (menu === '#projects-popover') updateProjects()
    }
  })
}
function updateProjects() {
  const field = pages.contentDocument?.querySelector('#project')
  if (!field) return
  $('#project-links').replaceChildren(...[...field.options].map(option => {
    const button = document.createElement('button')
    button.innerHTML = icon('folder')
    const text = document.createElement('span'); text.textContent = option.textContent
    button.append(text); button.dataset.selected = String(option.value === field.value)
    button.onclick = () => {
      navigate('board'); field.value = option.value
      field.dispatchEvent(new Event('change', { bubbles: true }))
    }
    return button
  }))
}
$('[data-projects-menu]').onclick = () => { $('#more-popover').hidePopover(); $('#projects-popover').showPopover() }
document.querySelectorAll('[data-settings]').forEach(button => button.onclick = () => {
  $('#more-popover').hidePopover(); pages.hidden = false; home.hidden = true
  returnFocus = innerWidth <= 760 ? $('#more-button') : button
  pages.contentDocument.querySelector('#menu-settings')?.click()
})

const contentStyle = `
  html,body{height:100%;margin:0!important;overflow:hidden!important;background:var(--canvas,var(--wb-canvas))}
  body{display:block!important;padding:0!important;grid-template-columns:none!important}
  .prototype,.topbar,.review-bar,.wb-topbar,.theme-picker,.skip,.wb-skip{display:none!important}
  .workspace{height:100dvh;min-height:0!important;overflow:auto;margin:0!important;max-width:none!important;padding:12px 24px 28px!important;background:none!important}
  .premium-app.dashboard-demo{height:100dvh!important;display:block!important;--wb-height:100dvh}
  .dash-main{height:100dvh;overflow:auto;padding:12px 24px 28px!important}
  @media(max-width:760px){.workspace,.dash-main{padding:12px 12px 24px!important}}
`
function syncAppearance(frame) {
  const mode = document.documentElement.dataset.mode
  const doc = frame.contentDocument
  if (frame === pages) frame.contentWindow.setPreviewAppearance?.('electric', mode)
  else doc.documentElement.dataset.theme = mode
  const palette = getComputedStyle(document.documentElement)
  for (const name of ['canvas', 'paper', 'ink', 'muted', 'line', 'wash', 'accent']) {
    const value = palette.getPropertyValue(`--${name}`)
    doc.documentElement.style.setProperty(`--${name}`, value)
    doc.querySelector('.premium-app')?.style.setProperty(`--wb-${name}`, value)
  }
  doc.documentElement.style.setProperty('--raised', palette.getPropertyValue('--wash'))
  doc.documentElement.style.setProperty('--on-accent', palette.getPropertyValue('--accent-ink'))
  if (frame === home) frame.contentWindow.mountDashboardDonut?.()
}
function prepare(frame) {
  const doc = frame.contentDocument
  const style = doc.createElement('style'); style.textContent = contentStyle; doc.head.append(style)
  if (frame === pages) {
    const heading = doc.querySelector('#heading')
    const sync = () => {
      if (pages.hidden) return
      const active = doc.querySelector('[data-view][aria-current="page"]')?.dataset.view
      select(doc.querySelector('#surface')?.classList.contains('profile-page') ? 'profile' : active || 'board')
    }
    if (heading) new MutationObserver(sync).observe(heading, { childList: true, subtree: true, characterData: true })
    const paintAvatar = (animate = false) => frame.contentWindow.paintDitherAvatar?.($('#dither-avatar'), frame.contentWindow.avatarKey(), animate)
    for (const dialog of doc.querySelectorAll('dialog')) dialog.addEventListener('close', () => { returnFocus?.focus(); paintAvatar() })
    // Draw the complete Dither model instead of freezing its first animation frame.
    paintAvatar()
    $('.pill .profile').onpointerenter = () => paintAvatar(true)
    $('.pill .profile').onfocus = () => paintAvatar(true)
    sync()
  } else {
    doc.addEventListener('click', event => {
      if (event.target.closest('a[href*="workspace-preview"]')) { event.preventDefault(); navigate('continue') }
    }, true)
  }
  syncAppearance(frame)
}
for (const frame of [pages, home]) frame.addEventListener('load', () => prepare(frame))
document.querySelectorAll('[data-theme]').forEach(button => button.onclick = () => {
  const theme = button.dataset.theme
  document.documentElement.dataset.mode = theme
  document.querySelectorAll('[data-theme]').forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)))
  for (const frame of [pages, home]) if (frame.contentDocument?.readyState === 'complete') syncAppearance(frame)
})
addEventListener('resize', () => document.querySelectorAll('[popover]:popover-open').forEach(popover => popover.hidePopover()))
