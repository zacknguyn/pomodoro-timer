// Standalone review only: no fetch, credentials storage, or changes to the React app.
const screen = document.getElementById('screen')
const toast = document.querySelector('.toast')
const logoutDialog = document.getElementById('logout-dialog')
let focusActive = false
let newAccount = false
let taskTitle = 'Fix the callback retry'
let taskIsSample = true
let taskStatus = 'Ready'
let noteDraft = ''
let scenario = ''
let noticeTimer
let pendingTimer
let revealObserver
const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="#${name}"/></svg>`
const $ = (id) => document.getElementById(id)
function announce(message) {
  clearTimeout(noticeTimer)
  toast.querySelector('span').textContent = message
  toast.hidden = false
  noticeTimer = setTimeout(() => { toast.hidden = true }, 5000)
}
function go(route) {
  if (location.hash === `#${route}`) render()
  else location.hash = route
}
function render() {
  clearTimeout(pendingTimer)
  const route = location.hash.slice(1) || 'home'
  if (['how-it-works', 'your-work'].includes(route)) {
    if (!document.querySelector('.hero')) renderTemplate('home')
    $(route)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
    return
  }
  const auth = ['login', 'register', 'recover'].includes(route)
  renderTemplate(auth ? 'auth' : route === 'signed-out' ? 'signed-out' : route === 'app' ? 'app' : 'home')
  if (auth) setupAuth(route)
  if (route === 'app') setupApp()
  document.title = `Pomogit — ${route === 'home' ? 'the work between commits' : route === 'app' ? 'workspace demo' : route === 'register' ? 'create account' : route === 'recover' ? 'password recovery' : route === 'signed-out' ? 'logged out' : 'log in'}`
  window.scrollTo(0, 0)
  $('main').focus({ preventScroll: true })
}
function renderTemplate(name) {
  revealObserver?.disconnect()
  screen.replaceChildren($(name + '-template').content.cloneNode(true))
  $('main').tabIndex = -1
  window.refreshPreviewAppearance?.()
  document.querySelectorAll('[data-avatar]').forEach((canvas) => paintDitherAvatar(canvas, canvas.dataset.avatar))
  if (name === 'home') revealMarketing()
}
function revealMarketing() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return
  revealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      entry.target.classList.remove('reveal-wait')
      entry.target.classList.add('reveal-in')
      revealObserver.unobserve(entry.target)
    }
  }, { threshold: 0.08 })
  for (const element of screen.querySelectorAll('[data-reveal]')) {
    // Start only off-screen content hidden, so first paint and deep links stay readable.
    if (element.getBoundingClientRect().top >= innerHeight) element.classList.add('reveal-wait')
    revealObserver.observe(element)
  }
}
function setupAuth(mode) {
  const register = mode === 'register', recover = mode === 'recover'
  $('auth-eyebrow').textContent = recover ? 'Find your way back' : register ? 'MAKE ROOM FOR YOUR WORK' : 'WELCOME BACK'
  $('auth-heading').textContent = recover ? 'Reset your password.' : register ? 'Create your workspace.' : 'Log in to Pomogit.'
  $('auth-description').textContent = recover ? 'Enter the email you use for Pomogit.' : register ? 'Capture tasks. Keep your next step close.' : 'Pick up where you left off.'
  $('account-submit').innerHTML = `${recover ? 'Send reset link' : register ? 'Create account with email' : 'Log in with email'}${icon('arrow')}`
  $('account-password').autocomplete = register ? 'new-password' : 'current-password'
  $('account-password').minLength = register ? 12 : 1
  $('password-hint').hidden = !register
  $('forgot-link').hidden = register
  $('password-section').hidden = recover
  $('account-password').disabled = recover
  for (const selector of ['#github-continue', '#github-caption', '.auth-divider']) document.querySelector(selector).hidden = recover
  $('account-switch').innerHTML = recover ? '<a href="#login">Back to log in</a>' : register ? 'Already have an account?<a href="#login">Log in</a>' : 'New to Pomogit?<a href="#register">Create an account</a>'
  if (scenario === 'expired' && mode === 'login') {
    $('auth-banner').hidden = false
    $('auth-banner').textContent = 'Your session ended. Log in again to return to your work.'
  }
  if (scenario === 'login-error' && mode === 'login') accountError('Email or password doesn’t match. Try again, or reset your password.')
  if (scenario === 'register-error' && register) accountError('This email already has an account. Log in instead, or use another email.')
  if (scenario === 'github-error') accountError('GitHub couldn’t connect. Try again, or continue with email.')
  $('show-password').onclick = () => {
    const show = $('account-password').type === 'password'
    $('account-password').type = show ? 'text' : 'password'
    $('show-password').setAttribute('aria-label', show ? 'Hide password' : 'Show password')
    $('show-password').setAttribute('aria-pressed', String(show))
  }
  $('github-continue').onclick = () => {
    setPending(true, 'Connecting to GitHub…', true)
    pendingTimer = setTimeout(() => {
      if (scenario === 'github-error') { accountError('GitHub couldn’t connect. Try again, or continue with email.'); setPending(false, '', true); scenario = ''; return }
      enterWorkspace(register)
    }, 800)
  }
  $('account-form').onsubmit = (event) => {
    event.preventDefault()
    $('account-error').hidden = true
    const email = $('account-email'), password = $('account-password')
    const emailError = !email.value.trim() ? 'Enter your email.' : !email.validity.valid ? 'Use a valid email address.' : ''
    const passwordError = recover ? '' : !password.value ? 'Enter your password.' : register && password.value.length < 12 ? 'Use at least 12 characters.' : ''
    fieldError('email', emailError); fieldError('password', passwordError)
    if (emailError || passwordError) { (emailError ? email : password).focus(); return }
    setPending(true, recover ? 'Sending…' : register ? 'Creating account…' : 'Logging in…')
    pendingTimer = setTimeout(() => {
      if (scenario === 'login-error' || scenario === 'register-error') {
        accountError(register ? 'This email already has an account. Log in instead, or use another email.' : 'Email or password doesn’t match. Try again, or reset your password.')
        setPending(false); scenario = ''; return
      }
      if (recover) {
        $('auth-banner').hidden = false
        $('auth-banner').textContent = 'If an account uses this email, we’ll send a reset link. Check your inbox and spam folder. This review sends no email.'
        setPending(false)
        $('account-submit').innerHTML = `Send again${icon('arrow')}`
      } else enterWorkspace(register)
    }, 800)
  }
}
function fieldError(name, message) {
  const input = $('account-' + name), hint = $(name + '-error')
  hint.textContent = message; hint.hidden = !message
  input.setAttribute('aria-invalid', String(Boolean(message)))
}
function accountError(message) { $('account-error').textContent = message; $('account-error').hidden = false }
function setPending(pending, label, github = false) {
  const mode = location.hash.slice(1), register = mode === 'register', recover = mode === 'recover'
  $('account-form').setAttribute('aria-busy', String(pending))
  $('account-submit').disabled = pending
  $('github-continue').disabled = pending
  $('account-submit').innerHTML = pending && !github ? label : `${recover ? 'Send reset link' : register ? 'Create account with email' : 'Log in with email'}${icon('arrow')}`
  $('github-continue').innerHTML = `${icon('github')}${pending && github ? label : 'Continue with GitHub'}${icon('arrow')}`
}
function enterWorkspace(register) {
  newAccount = register; scenario = ''; focusActive = false
  if (register) { taskTitle = ''; noteDraft = ''; taskIsSample = false; taskStatus = 'Inbox' }
  go('app')
  announce(register ? 'Account creation preview. Start with one task; nothing was registered.' : 'Login preview complete. No real account was accessed.')
}
function setupApp() {
  $('demo-heading').textContent = newAccount && !taskTitle ? 'What are you working on?' : 'Pick up your work.'
  $('demo-task').hidden = !taskTitle
  $('demo-task-title').textContent = taskTitle
  $('demo-project').textContent = taskIsSample ? 'checkout-api' : 'No project'
  $('demo-next-step').textContent = taskIsSample ? 'Reproduce the expired-code case, then check the retry response.' : 'No next step saved. Add the details later.'
  $('demo-note').value = noteDraft
  $('demo-note').oninput = (event) => { noteDraft = event.target.value; $('demo-draft').textContent = 'Draft kept for this review session. Nothing is stored on disk.' }
  $('demo-focus').innerHTML = `${icon(focusActive ? 'clock' : 'play')}${focusActive ? 'Stop focus' : 'Start focus'}`
  $('demo-status').textContent = taskStatus
  $('demo-status').classList.toggle('ready', taskStatus === 'Ready')
  $('demo-capture').onsubmit = (event) => {
    event.preventDefault()
    const title = $('demo-title').value.trim()
    if (!title) return
    taskTitle = title; taskIsSample = false; taskStatus = 'Inbox'; newAccount = false; focusActive = false; noteDraft = ''; render()
    announce('Task captured. Focus starts only when you choose it.')
  }
  $('demo-focus').onclick = () => { focusActive = !focusActive; if (focusActive) taskStatus = 'In progress'; render(); $('demo-focus').focus(); announce(focusActive ? 'Focus is running in this demo. Try Log out from the avatar menu.' : 'Focus stopped. Your task stays unfinished.') }
  $('log-out').onclick = () => {
    document.querySelector('.account-menu').open = false
    if (focusActive) {
      $('logout-task-name').textContent = taskTitle
      $('logout-error').hidden = true
      logoutDialog.showModal()
    } else signOut()
  }
}
function signOut() {
  if (scenario === 'logout-error') {
    if (!logoutDialog.open) { $('logout-task-name').textContent = taskTitle; logoutDialog.showModal() }
    $('logout-error').textContent = 'We couldn’t end the session. You’re still logged in. Try again; your task has not changed.'
    $('logout-error').hidden = false; scenario = ''; return
  }
  focusActive = false
  if (logoutDialog.open) logoutDialog.close()
  go('signed-out')
}
$('confirm-logout').onclick = signOut
logoutDialog.addEventListener('close', () => { if (location.hash === '#app') document.querySelector('.account-menu summary')?.focus() })
document.addEventListener('click', (event) => {
  const close = event.target.closest('[data-close]')
  if (close) $(close.dataset.close).close()
  const review = event.target.closest('[data-review]')
  if (review) {
    scenario = review.dataset.review
    if (scenario === 'logout-error') { focusActive = true; taskStatus = 'In progress'; if (!taskTitle) taskTitle = 'Fix the callback retry'; go('app') }
    else go(scenario === 'register-error' ? 'register' : 'login')
  }
  if (event.target.closest('.review-tools nav a,.review-tools nav button')) document.querySelector('.review-tools').open = false
  if (event.target.closest('.skip')) { event.preventDefault(); $('main').focus(); return }
  const menu = document.querySelector('.account-menu')
  if (menu && !menu.contains(event.target)) menu.open = false
})
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { const menu = document.querySelector('.account-menu[open]'); if (menu) { menu.open = false; menu.querySelector('summary').focus() } } })
toast.querySelector('button').onclick = () => { toast.hidden = true }
window.addEventListener('hashchange', render)
render()
