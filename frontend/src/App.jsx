import { useEffect, useState } from 'react'
import { BriefcaseBusiness, Moon, Settings, Sun } from 'lucide-react'
import WorkScreen from './components/WorkScreen'

const VALID_VIEWS = ['work', 'settings']

function initialView() {
  const requested = window.location.hash.slice(1)
  return VALID_VIEWS.includes(requested) ? requested : 'work'
}

function Brand() {
  return <span className="app-brand"><img src="/pomogit-logo.png" alt="" width="28" height="28" /><strong>Pomogit</strong></span>
}

function SettingsView({ theme, onTheme }) {
  return (
    <div className="settings-view">
      <header className="work-header"><div><p className="page-kicker">Workspace / Settings</p><h1>Settings</h1><p>Choose the viewing mode that keeps the interface quiet.</p></div></header>
      <section className="settings-panel" aria-labelledby="appearance-heading">
        <div><p className="section-kicker">Appearance</p><h2 id="appearance-heading">Theme</h2><p>Use the palette that fits your current environment.</p></div>
        <div className="theme-choice" aria-label="Theme">
          <button type="button" aria-pressed={theme === 'light'} onClick={() => onTheme('light')}><Sun size={17} /> Light</button>
          <button type="button" aria-pressed={theme === 'dark'} onClick={() => onTheme('dark')}><Moon size={17} /> Dark</button>
        </div>
      </section>
    </div>
  )
}

export default function App() {
  const [view, setView] = useState(initialView)
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('stillpoint.theme', theme)
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
