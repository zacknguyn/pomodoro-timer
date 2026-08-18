import { useEffect, useState } from 'react'
import { Download, Moon, Save, Sun } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { DitherButton } from './dither-kit/DitherButton'
import { DitherGradient } from './dither-kit/DitherGradient'
import { workApi } from '../lib/workApi'
import { downloadWorkspaceExport } from '../lib/workspaceExport'
import { readWorkProtocol, writeWorkProtocol } from '../lib/preferences'

export default function SettingsSheet({ open, onOpenChange, theme, onTheme, localPreview, user }) {
  const [protocol, setProtocol] = useState(() => readWorkProtocol(localStorage))
  const [saved, setSaved] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) setProtocol(readWorkProtocol(localStorage))
  }, [open])

  function saveProtocol(event) {
    event.preventDefault()
    writeWorkProtocol(localStorage, protocol)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  async function exportData() {
    setExporting(true)
    setError('')
    try {
      downloadWorkspaceExport(await workApi.exportWorkspace())
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="settings-sheet" aria-describedby="settings-description">
        <div className="settings-sheet-wash" aria-hidden="true"><DitherGradient from="blue" to="transparent" direction="down" cell={3} opacity={0.32} bloom="off" /></div>
        <SheetHeader className="settings-sheet-header">
          <p className="section-kicker">Workspace control</p>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription id="settings-description">Tune how Pomogit feels and how a focus session begins.</SheetDescription>
        </SheetHeader>

        <div className="settings-sheet-body">
          <section className="settings-drawer-section" aria-labelledby="settings-appearance">
            <header><span>01</span><div><h2 id="settings-appearance">Appearance</h2><p>Choose the contrast for this device.</p></div></header>
            <div className="theme-choice" aria-label="Theme">
              <button type="button" aria-pressed={theme === 'light'} onClick={() => onTheme('light')}><Sun size={16} /> Light</button>
              <button type="button" aria-pressed={theme === 'dark'} onClick={() => onTheme('dark')}><Moon size={16} /> Dark</button>
            </div>
          </section>

          <form className="settings-drawer-section" onSubmit={saveProtocol}>
            <header><span>02</span><div><h2>Work protocol</h2><p>Defaults applied when the next focus session starts.</p></div></header>
            <label><span>Focus length</span><select value={protocol.focusMinutes} onChange={(event) => setProtocol((current) => ({ ...current, focusMinutes: Number(event.target.value) }))}><option value="15">15 minutes</option><option value="25">25 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option></select></label>
            <label><span>Week starts</span><select value={protocol.weekStart} onChange={(event) => setProtocol((current) => ({ ...current, weekStart: event.target.value }))}><option value="monday">Monday</option><option value="sunday">Sunday</option></select></label>
            <p className="settings-drawer-note">Checkpoints remain required when a focus session ends. They are the handoff that makes returning possible.</p>
            <DitherButton type="submit"><Save size={16} /> {saved ? 'Saved' : 'Save protocol'}</DitherButton>
          </form>

          <section className="settings-drawer-section" aria-labelledby="settings-data">
            <header><span>03</span><div><h2 id="settings-data">Your data</h2><p>Keep a portable copy of tasks, sessions, and checkpoints.</p></div></header>
            <button className="button-secondary" type="button" onClick={exportData} disabled={exporting}><Download size={16} /> {exporting ? 'Preparing…' : 'Export JSON'}</button>
            {error && <p className="settings-error" role="alert">{error}</p>}
          </section>

          <section className="settings-drawer-section is-security" aria-labelledby="settings-security">
            <header><span>04</span><div><h2 id="settings-security">Security</h2><p>{localPreview ? 'Authentication is bypassed only in this local development preview.' : `Workspace data is scoped to ${user?.email}.`}</p></div></header>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
