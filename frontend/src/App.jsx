import { lazy, Suspense, useEffect, useState } from 'react'
import AuthScreen from './components/AuthScreen'
import LandingScreen from './components/LandingScreen'
import { authApi } from './lib/authApi'
import { resolveInitialView, WORKSPACE_VIEWS } from './lib/navigation'
import { hasOpenedWorkspace, markWorkspaceOpened, readProfile, readWorkProtocol, writeWorkProtocol } from './lib/preferences'

import { LOCAL_PREVIEW } from './lib/runtime'

const PUBLIC_VIEWS = ['landing', 'login', 'register', 'recover']
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
  const [view, setView] = useState(() => {
    const requested = requestedView()
    if (LOCAL_PREVIEW) return requested || 'work'
    return requested || resolveInitialView({ requested, workspaceOpened: hasOpenedWorkspace(localStorage) })
  })
  const [preferences, setPreferences] = useState(() => readWorkProtocol(localStorage))
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches)
  const theme = preferences.brightness === 'system' ? (systemDark ? 'dark' : 'light') : preferences.brightness
  const [profile, setProfile] = useState(() => readProfile(localStorage))
  const [auth, setAuth] = useState(() => LOCAL_PREVIEW
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
    writeWorkProtocol(localStorage, saved, LOCAL_PREVIEW ? null : auth.user?.id)
    setPreferences(saved)
  }

  useEffect(() => {
    if (LOCAL_PREVIEW) return undefined
    let active = true
    authApi.me()
      .then(({ user }) => { if (active) { setProfile(readProfile(localStorage, user.id, user.email.split('@')[0])); setPreferences(readWorkProtocol(localStorage, user.id)); setAuth({ status: 'ready', user }) } })
      .catch((error) => { if (active) setAuth({ status: error.status === 401 ? 'ready' : 'error', user: null, error: error.message }) })
    const expire = () => { setAuth({ status: 'ready', user: null }); setView('login') }
    window.addEventListener('pomogit:auth-expired', expire)
    return () => { active = false; window.removeEventListener('pomogit:auth-expired', expire) }
  }, [])

  const canAccessAdmin = ['admin', 'superadmin'].includes(auth.user?.role)
  const currentView = !auth.user && auth.status === 'ready' && !PUBLIC_VIEWS.includes(view)
    ? 'login'
    : view === 'admin' && !canAccessAdmin ? 'work' : view

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
    setProfile(readProfile(localStorage, user.id, user.email.split('@')[0]))
    setPreferences(readWorkProtocol(localStorage, user.id))
    markWorkspaceOpened(localStorage)
    setAuth({ status: 'ready', user })
    navigate(WORKSPACE_VIEWS.includes(view) && (view !== 'admin' || ['admin', 'superadmin'].includes(user.role)) ? view : 'work')
  }

  async function logout() {
    if (!LOCAL_PREVIEW) await authApi.logout()
    setAuth({ status: 'ready', user: LOCAL_PREVIEW ? LOCAL_PREVIEW_USER : null })
    navigate('login')
  }

  if (auth.status === 'error') return <main className="auth-loading"><Brand /><p role="alert">{auth.error}</p><button onClick={() => window.location.reload()}>Try again</button></main>
  if (auth.status === 'loading') return <AuthLoading />
  const publicView = PUBLIC_VIEWS.includes(currentView)
  const openWorkspace = () => { markWorkspaceOpened(localStorage); navigate('work') }
  return <>
    {(publicView || !auth.user) && (currentView === 'landing'
      ? <LandingScreen onNavigate={navigate} onOpen={() => navigate('register')} onDemo={LOCAL_PREVIEW || auth.user ? openWorkspace : () => navigate('register')} preview={LOCAL_PREVIEW} palette={preferences.palette} theme={theme} reducedMotion={preferences.motion === 'reduced'} />
      : <AuthScreen key={currentView} preview={LOCAL_PREVIEW} initialMode={currentView === 'register' ? 'register' : currentView === 'recover' ? 'recover' : 'login'} onAuthenticated={LOCAL_PREVIEW ? openWorkspace : authenticated} onNavigate={navigate} onBack={() => navigate('landing')} />)}
    {auth.user && <div hidden={publicView}><Suspense fallback={<main className="auth-loading">Loading workspace…</main>}><Workbench key={auth.user.id} accountId={LOCAL_PREVIEW ? null : auth.user.id} view={publicView ? 'work' : currentView} onNavigate={navigate} profile={profile} onProfile={setProfile} preferences={preferences} onPreferences={savePreferences} onExit={logout}
      admin={canAccessAdmin ? <Suspense fallback={<p>Loading admin…</p>}><AdminView currentUser={auth.user} /></Suspense> : null} /></Suspense></div>}
  </>
}
