import { useState } from 'react'
import { Download, Moon, Sun } from 'lucide-react'
import { workApi } from '../lib/workApi'
import { downloadWorkspaceExport } from '../lib/workspaceExport'

export default function SettingsView({ theme, onTheme }) {
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  async function exportData() {
    setExporting(true)
    setExportError('')
    try {
      downloadWorkspaceExport(await workApi.exportWorkspace())
    } catch (error) {
      setExportError(error.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="settings-view">
      <header className="work-header"><div><p className="page-kicker">Workspace / Settings</p><h1>Settings</h1><p>Appearance and a portable copy of your work.</p></div></header>
      <section className="settings-panel" aria-labelledby="appearance-heading">
        <div><p className="section-kicker">Appearance</p><h2 id="appearance-heading">Theme</h2><p>Choose the contrast that fits your environment.</p></div>
        <div className="theme-choice" aria-label="Theme">
          <button type="button" aria-pressed={theme === 'light'} onClick={() => onTheme('light')}><Sun size={17} aria-hidden="true" /> Light</button>
          <button type="button" aria-pressed={theme === 'dark'} onClick={() => onTheme('dark')}><Moon size={17} aria-hidden="true" /> Dark</button>
        </div>
      </section>
      <section className="settings-panel" aria-labelledby="export-heading">
        <div><p className="section-kicker">Your data</p><h2 id="export-heading">Export workspace</h2><p>Download tasks, focus sessions, and checkpoints as JSON.</p>{exportError && <p className="settings-error" role="alert">{exportError}</p>}</div>
        <button className="button-secondary export-button" type="button" onClick={exportData} disabled={exporting}>
          <Download size={16} aria-hidden="true" /> {exporting ? 'Preparing…' : 'Export JSON'}
        </button>
      </section>
    </div>
  )
}
