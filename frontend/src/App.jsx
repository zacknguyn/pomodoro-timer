import { lazy, Suspense, useEffect, useState } from 'react'
import { BriefcaseBusiness, ClipboardList, History, ShieldCheck } from 'lucide-react'
import AuthScreen from './components/AuthScreen'
import LandingScreen from './components/LandingScreen'
import AccountMenu from './components/AccountMenu'
import WorkspaceRouteSkeleton from './components/WorkspaceRouteSkeleton'
import { authApi } from './lib/authApi'
import { resolveInitialView, WORKSPACE_VIEWS } from './lib/navigation'
import { hasOpenedWorkspace, markWorkspaceOpened, readProfile, readTheme, writeTheme } from './lib/preferences'

const PUBLIC_VIEWS = ['landing', 'login', 'register']
const DEV_BYPASS_AUTH = import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === 'true'
const LOCAL_PREVIEW_USER = { id: '00000000-0000-4000-8000-000000000001', email: 'Local preview', role: 'user' }

const VIEW_LOADERS = {
  work: () => import('./components/WorkScreen'),
  tasks: () => import('./components/WorkScreen'),
  review: () => import('./components/ReviewScreen'),
  profile: () => import('./components/ProfileView'),
  admin: () => import('./components/AdminView'),
}

const WorkScreen = lazy(VIEW_LOADERS.work)
const ReviewScreen = lazy(VIEW_LOADERS.review)
const ProfileView = lazy(VIEW_LOADERS.profile)
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
    if (DEV_BYPASS_AUTH) return WORKSPACE_VIEWS.includes(requested) ? requested : 'work'
    return PUBLIC_VIEWS.includes(requested)
      ? requested
      : resolveInitialView({ requested, workspaceOpened: hasOpenedWorkspace(localStorage) })
  })
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || readTheme(localStorage, false))
  const [profile, setProfile] = useState(() => readProfile(localStorage))
  const [auth, setAuth] = useState(() => DEV_BYPASS_AUTH
    ? { status: 'ready', user: LOCAL_PREVIEW_USER }
    : { status: 'loading', user: null })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    writeTheme(localStorage, theme)
  }, [theme])

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

  function navigate(nextView) {
    VIEW_LOADERS[nextView]?.()
    setView(nextView)
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${nextView}`)
    document.querySelector('.workspace-stage')?.scrollTo({ top: 0, behavior: 'auto' })
  }

  function requestWorkspace() {
    navigate('login')
  }

  function authenticated(user) {
    markWorkspaceOpened(localStorage)
    setWorkspaceOpened(true)
    setAuth({ status: 'ready', user })
    navigate(['admin', 'superadmin'].includes(user.role) && view === 'admin' ? 'admin' : 'work')
  }

  async function logout() {
    try { await authApi.logout() } catch { /* clearing local account state is still safe */ }
    setAuth({ status: 'ready', user: null })
    navigate('login')
  }

  if (auth.status === 'loading') return <AuthLoading />
  if (!auth.user) {
    if (!workspaceOpened && view !== 'login' && view !== 'register') return <LandingScreen onOpen={requestWorkspace} />
    return <AuthScreen initialMode={view === 'register' ? 'register' : 'login'} onAuthenticated={authenticated} onBack={() => { setWorkspaceOpened(false); navigate('landing') }} />
  }

  const isAdmin = canAccessAdmin
  return (
    <div className="workspace-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="workspace-sidebar">
        <button className="brand-button" type="button" onClick={() => navigate('work')} aria-label="Open Work"><Brand /></button>
        <nav aria-label="Workspace">
          <button type="button" className={currentView === 'work' ? 'active' : ''} onPointerEnter={VIEW_LOADERS.work} onFocus={VIEW_LOADERS.work} onClick={() => navigate('work')} aria-current={currentView === 'work' ? 'page' : undefined}><BriefcaseBusiness size={18} /><span>Work</span></button>
          <button type="button" className={currentView === 'tasks' ? 'active' : ''} onPointerEnter={VIEW_LOADERS.tasks} onFocus={VIEW_LOADERS.tasks} onClick={() => navigate('tasks')} aria-current={currentView === 'tasks' ? 'page' : undefined}><ClipboardList size={18} /><span>Tasks</span></button>
          <button type="button" className={currentView === 'review' ? 'active' : ''} onPointerEnter={VIEW_LOADERS.review} onFocus={VIEW_LOADERS.review} onClick={() => navigate('review')} aria-current={currentView === 'review' ? 'page' : undefined}><History size={18} /><span>Review</span></button>
          {isAdmin && <button type="button" className={currentView === 'admin' ? 'active' : ''} onPointerEnter={VIEW_LOADERS.admin} onFocus={VIEW_LOADERS.admin} onClick={() => navigate('admin')} aria-current={currentView === 'admin' ? 'page' : undefined}><ShieldCheck size={18} /><span>Admin</span></button>}
        </nav>
        <AccountMenu variant="sidebar" profile={profile} user={auth.user} active={currentView === 'profile'} localPreview={DEV_BYPASS_AUTH} theme={theme} onTheme={setTheme} onProfile={() => navigate('profile')} onLogout={logout} />
      </aside>
      <div className="workspace-frame">
        <header className="workspace-topbar">
          <Brand />
          <nav aria-label="Mobile workspace">
            <button type="button" className={currentView === 'work' ? 'active' : ''} onClick={() => navigate('work')}>Work</button>
            <button type="button" className={currentView === 'tasks' ? 'active' : ''} onClick={() => navigate('tasks')}>Tasks</button>
            <button type="button" className={currentView === 'review' ? 'active' : ''} onClick={() => navigate('review')}>Review</button>
            {isAdmin && <button type="button" className={currentView === 'admin' ? 'active' : ''} onClick={() => navigate('admin')}>Admin</button>}
            <AccountMenu variant="mobile" profile={profile} user={auth.user} active={currentView === 'profile'} localPreview={DEV_BYPASS_AUTH} theme={theme} onTheme={setTheme} onProfile={() => navigate('profile')} onLogout={logout} />
          </nav>
        </header>
        <header className="workspace-pagebar">
          <span>Pomogit / <strong>{currentView === 'admin' ? 'Admin' : currentView[0].toUpperCase() + currentView.slice(1)}</strong></span>
          <AccountMenu variant="pagebar" profile={profile} user={auth.user} active={currentView === 'profile'} localPreview={DEV_BYPASS_AUTH} theme={theme} onTheme={setTheme} onProfile={() => navigate('profile')} onLogout={logout} />
        </header>
        <main className="workspace-stage" id="main-content" tabIndex="-1">
          <div className="workspace-route" key={currentView}>
            <Suspense fallback={<WorkspaceRouteSkeleton view={currentView} />}>
              {currentView === 'work' && <WorkScreen mode="work" onOpenTasks={() => navigate('tasks')} onOpenReview={() => navigate('review')} />}
              {currentView === 'tasks' && <WorkScreen mode="tasks" />}
              {currentView === 'review' && <ReviewScreen onOpenWork={() => navigate('work')} />}
              {currentView === 'profile' && <ProfileView user={auth.user} localPreview={DEV_BYPASS_AUTH} profile={profile} onProfile={setProfile} onOpenReview={() => navigate('review')} />}
              {currentView === 'admin' && isAdmin && <AdminView currentUser={auth.user} />}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
