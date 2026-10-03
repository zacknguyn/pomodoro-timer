import { lazy, Suspense, useEffect, useState } from 'react'
import AuthScreen from './components/AuthScreen'
import LandingScreen from './components/LandingScreen'
import { authApi } from './lib/authApi'
import { resolveInitialView, WORKSPACE_VIEWS } from './lib/navigation'
import { hasOpenedWorkspace, markWorkspaceOpened, readProfile, readWorkProtocol, writeWorkProtocol } from './lib/preferences'

const PUBLIC_VIEWS = ['landing', 'login', 'register', 'recover']
// Phase 1 UI-only: auth gate disabled by user request. Re-enable in Phase 2 (DB).
// To re-enable: restore `import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === 'true'`.
const DEV_BYPASS_AUTH = true
const LOCAL_PREVIEW_USER = { id: '00000000-0000-4000-8000-000000000001', email: 'Local preview', role: 'user' }

const VIEW_LOADERS = {
  work: () => import('./components/Workbench'),
  tasks: () => import('./components/Workbench'),
  review: () => import('./components/Workbench'),
  profile: () => import('./components/Workbench'),
  admin: () => import('./components/AdminView'),
}

const Workbench = lazy(VIEW_LOADERS.work)
const AdminView = lazy(VIEW_LOADERS.admin)

function requestedView() {
  const raw = window.location.hash.slice(1)
  const requested = raw === 'settings' ? 'profile' : raw
  return [...WORKSPACE_VIEWS, ...PUBLIC_VIEWS].includes(requested) ? requested : ''
}

function Brand() {
  return <span className="app-brand"><img src="/pomogit-logo.png" alt="" width="28" height="28" /><strong>Pomogit</strong></span>
}

function AuthLoading() {
  return <main className="auth-loading"><Brand /><span>Restoring secure session…</span></main>
}

export default function App() {
  const [workspaceOpened, setWorkspaceOpened] = useState(() => hasOpenedWorkspace(localStorage))
  const [view, setView] = useState(() => {
    const requested = requestedView()
    if (DEV_BYPASS_AUTH) return requested || 'work'
    return PUBLIC_VIEWS.includes(requested)
      ? requested
      : resolveInitialView({ requested, workspaceOpened: hasOpenedWorkspace(localStorage) })
  })
  const [preferences, setPreferences] = useState(() => readWorkProtocol(localStorage))
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches)
  const theme = preferences.brightness === 'system' ? (systemDark ? 'dark' : 'light') : preferences.brightness
  const [profile, setProfile] = useState(() => readProfile(localStorage))
  const [auth, setAuth] = useState(() => DEV_BYPASS_AUTH
    ? { status: 'ready', user: LOCAL_PREVIEW_USER }
    : { status: 'loading', user: null })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.palette = preferences.palette
    document.documentElement.dataset.motion = preferences.motion
  }, [theme, preferences.palette, preferences.motion])
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const changed = (event) => setSystemDark(event.matches)
    media.addEventListener('change', changed)
    return () => media.removeEventListener('change', changed)
  }, [])
  function savePreferences(next) {
    const saved = { ...preferences, ...next }
    writeWorkProtocol(localStorage, saved)
    setPreferences(saved)
  }

  useEffect(() => {
    if (DEV_BYPASS_AUTH) return undefined
    let active = true
    authApi.me()
      .then(({ user }) => { if (active) setAuth({ status: 'ready', user }) })
      .catch(() => { if (active) setAuth({ status: 'ready', user: null }) })
    const expire = () => setAuth({ status: 'ready', user: null })
    window.addEventListener('pomogit:auth-expired', expire)
    return () => { active = false; window.removeEventListener('pomogit:auth-expired', expire) }
  }, [])

  const canAccessAdmin = ['admin', 'superadmin'].includes(auth.user?.role)
  const currentView = view === 'admin' && !canAccessAdmin ? 'work' : view

  useEffect(() => {
    if (window.location.hash !== `#${currentView}`) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${currentView}`)
    }
  }, [currentView])

  useEffect(() => {
    function followLocation() { const next = requestedView(); setView(next || 'work') }
    window.addEventListener('popstate', followLocation)
    window.addEventListener('hashchange', followLocation)
    return () => { window.removeEventListener('popstate', followLocation); window.removeEventListener('hashchange', followLocation) }
  }, [])

  function navigate(nextView) {
    VIEW_LOADERS[nextView]?.()
    setView(nextView)
    if (nextView !== currentView) window.history.pushState(null, '', `${window.location.pathname}${window.location.search}#${nextView}`)
    document.querySelector('.wb-main')?.scrollTo({ top: 0, behavior: 'auto' })
  }

  function authenticated(user) {
    markWorkspaceOpened(localStorage)
    setWorkspaceOpened(true)
    setAuth({ status: 'ready', user })
    navigate(['admin', 'superadmin'].includes(user.role) && view === 'admin' ? 'admin' : 'work')
  }

  if (auth.status === 'loading') return <AuthLoading />
  const publicView = PUBLIC_VIEWS.includes(currentView)
  const openWorkspace = () => { markWorkspaceOpened(localStorage); setWorkspaceOpened(true); navigate('work') }
  return <>
    {(publicView || !auth.user) && (currentView === 'landing' || (!auth.user && !workspaceOpened)
      ? <LandingScreen onNavigate={navigate} onOpen={() => navigate('register')} onDemo={openWorkspace} palette={preferences.palette} theme={theme} reducedMotion={preferences.motion === 'reduced'} />
      : <AuthScreen key={currentView} initialMode={currentView === 'register' ? 'register' : currentView === 'recover' ? 'recover' : 'login'} onAuthenticated={DEV_BYPASS_AUTH ? openWorkspace : authenticated} onNavigate={navigate} onBack={() => navigate('landing')} />)}
    {auth.user && <div hidden={publicView}><Suspense fallback={<main className="auth-loading">Loading workspace…</main>}><Workbench view={publicView ? 'work' : currentView} onNavigate={navigate} profile={profile} onProfile={setProfile} preferences={preferences} onPreferences={savePreferences} onExit={() => navigate('login')}
      admin={canAccessAdmin ? <Suspense fallback={<p>Loading admin…</p>}><AdminView currentUser={auth.user} /></Suspense> : null} /></Suspense></div>}
  </>
}
