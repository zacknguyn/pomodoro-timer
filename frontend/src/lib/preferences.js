export const WORKSPACE_OPENED_KEY = 'pomogit.workspace-opened'
export const THEME_KEY = 'pomogit.theme'
const LEGACY_THEME_KEY = 'stillpoint.theme'

export function hasOpenedWorkspace(storage) {
  return storage.getItem(WORKSPACE_OPENED_KEY) === 'true'
}

export function markWorkspaceOpened(storage) {
  storage.setItem(WORKSPACE_OPENED_KEY, 'true')
}

export function readTheme(storage, prefersDark = false) {
  const stored = storage.getItem(THEME_KEY) || storage.getItem(LEGACY_THEME_KEY)
  return stored === 'dark' || stored === 'light' ? stored : prefersDark ? 'dark' : 'light'
}

export function writeTheme(storage, theme) {
  storage.setItem(THEME_KEY, theme)
}
