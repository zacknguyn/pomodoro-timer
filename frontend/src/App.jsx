import { useEffect, useState } from 'react'
import { BriefcaseBusiness, Settings } from 'lucide-react'
import LandingScreen from './components/LandingScreen'
import SettingsView from './components/SettingsView'
import WorkScreen from './components/WorkScreen'
import { resolveInitialView } from './lib/navigation'
import { hasOpenedWorkspace, markWorkspaceOpened, readTheme, writeTheme } from './lib/preferences'

const VALID_VIEWS = ['work', 'settings']

function requestedView() {
  const requested = window.location.hash.slice(1)
  return VALID_VIEWS.includes(requested) ? requested : ''
}

function Brand() {
  return <span className="app-brand"><img src="/pomogit-logo.png" alt="" width="28" height="28" /><strong>Pomogit</strong></span>
}

export default function App() {
  const [workspaceOpened, setWorkspaceOpened] = useState(() => hasOpenedWorkspace(localStorage))
  const [view, setView] = useState(() => resolveInitialView({ requested: requestedView(), workspaceOpened: hasOpenedWorkspace(localStorage) }))
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || readTheme(localStorage, false))

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    writeTheme(localStorage, theme)
  }, [theme])

  useEffect(() => {
    if (window.location.hash !== `#${view}`) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${view}`)
    }
  }, [view])

  function navigate(nextView) {
    setView(nextView)
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${nextView}`)
    document.querySelector('.workspace-stage')?.scrollTo({ top: 0, behavior: 'auto' })
  }

  function openWorkspace() {
    markWorkspaceOpened(localStorage)
    setWorkspaceOpened(true)
    navigate('work')
  }

  if (!workspaceOpened || view === 'landing') {
    return <LandingScreen onOpen={openWorkspace} />
  }

  return (
    <div className="workspace-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className="workspace-sidebar">
        <button className="brand-button" type="button" onClick={() => navigate('work')} aria-label="Open Work"><Brand /></button>
        <nav aria-label="Workspace">
          <button type="button" className={view === 'work' ? 'active' : ''} onClick={() => navigate('work')} aria-current={view === 'work' ? 'page' : undefined}><BriefcaseBusiness size={18} /><span>Work</span></button>
        </nav>
        <button className={`settings-link ${view === 'settings' ? 'active' : ''}`} type="button" onClick={() => navigate('settings')} aria-current={view === 'settings' ? 'page' : undefined}><Settings size={18} /><span>Settings</span></button>
      </aside>
      <div className="workspace-frame">
        <header className="workspace-topbar">
          <Brand />
          <nav aria-label="Mobile workspace">
            <button type="button" className={view === 'work' ? 'active' : ''} onClick={() => navigate('work')}>Work</button>
            <button type="button" className={view === 'settings' ? 'active' : ''} onClick={() => navigate('settings')}>Settings</button>
          </nav>
        </header>
        <main className="workspace-stage" id="main-content" tabIndex="-1">
          {view === 'work' ? <WorkScreen /> : <SettingsView theme={theme} onTheme={setTheme} />}
        </main>
      </div>
    </div>
  )
}
