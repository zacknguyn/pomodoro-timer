import { lazy, Suspense, useState } from 'react'
import { ChevronDown, ChevronUp, LogOut, Settings, UserRound, X } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DitherAvatar } from './dither-kit/DitherAvatar'

const SettingsSheet = lazy(() => import('./SettingsSheet'))

function SettingsSheetSkeleton({ onClose }) {
  return <div className="settings-loading-layer" role="status" aria-label="Loading settings"><button type="button" onClick={onClose} aria-label="Close settings"><X size={17} /></button><aside><p className="section-kicker">Workspace control</p><h2>Settings</h2><div><span /><span /><span /><span /></div></aside></div>
}

export default function AccountMenu({ variant = 'sidebar', profile, user, active, localPreview, theme, onTheme, onProfile, onLogout }) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsMounted, setSettingsMounted] = useState(false)
  const name = profile.displayName || user?.email || 'Pomogit'

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {variant === 'sidebar' ? (
            <button className={`profile-link ${active ? 'active' : ''}`} type="button" aria-label="Open account menu" aria-current={active ? 'page' : undefined}>
              <DitherAvatar className="profile-avatar" name={name} animate={false} />
              <span><strong>{name}</strong><small>{localPreview ? 'Local profile' : user?.email}</small></span>
              <ChevronUp size={16} aria-hidden="true" />
            </button>
          ) : variant === 'pagebar' ? (
            <button className="pagebar-profile-trigger" type="button" aria-label="Open account menu"><DitherAvatar className="pagebar-avatar" name={name} animate={false} />{name}<ChevronDown size={13} aria-hidden="true" /></button>
          ) : (
            <button className={`mobile-profile-trigger ${active ? 'active' : ''}`} type="button" aria-label="Open account menu"><DitherAvatar className="pagebar-avatar" name={name} animate={false} /><ChevronDown size={13} aria-hidden="true" /></button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="account-menu-content" side={variant === 'sidebar' ? 'top' : 'bottom'} align="end" sideOffset={8}>
          <DropdownMenuLabel className="account-menu-label"><DitherAvatar name={name} size={36} animate={false} /><span><strong>{name}</strong><small>{localPreview ? 'Local development workspace' : user?.email}</small></span></DropdownMenuLabel>
          <DropdownMenuSeparator className="account-menu-separator" />
          <DropdownMenuItem className="account-menu-item" onSelect={onProfile}><UserRound /> Profile</DropdownMenuItem>
          <DropdownMenuItem className="account-menu-item" onSelect={() => { setSettingsMounted(true); setSettingsOpen(true) }}><Settings /> Settings</DropdownMenuItem>
          <DropdownMenuSeparator className="account-menu-separator" />
          <DropdownMenuItem className="account-menu-item is-danger" disabled={localPreview} onSelect={localPreview ? undefined : onLogout}><LogOut /> Logout {localPreview && <small>Auth off</small>}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {settingsMounted && <Suspense fallback={settingsOpen ? <SettingsSheetSkeleton onClose={() => setSettingsOpen(false)} /> : null}><SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} theme={theme} onTheme={onTheme} localPreview={localPreview} user={user} /></Suspense>}
    </>
  )
}
