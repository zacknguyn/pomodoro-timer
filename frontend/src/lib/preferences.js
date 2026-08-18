export const WORKSPACE_OPENED_KEY = 'pomogit.workspace-opened'
export const THEME_KEY = 'pomogit.theme'
export const PROFILE_KEY = 'pomogit.profile'
export const WORK_PROTOCOL_KEY = 'pomogit.work-protocol'
const LEGACY_THEME_KEY = 'stillpoint.theme'

export const DEFAULT_PROFILE = {
  displayName: 'Local maker',
  headline: 'Shipping one meaningful change at a time.',
}

export const DEFAULT_WORK_PROTOCOL = {
  focusMinutes: 25,
  checkpointRule: 'always',
  weekStart: 'monday',
}

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

function readObject(storage, key, fallback) {
  try {
    const value = JSON.parse(storage.getItem(key) || 'null')
    return value && typeof value === 'object' ? { ...fallback, ...value } : fallback
  } catch {
    return fallback
  }
}

export function readProfile(storage) {
  return readObject(storage, PROFILE_KEY, DEFAULT_PROFILE)
}

export function writeProfile(storage, profile) {
  storage.setItem(PROFILE_KEY, JSON.stringify({ ...DEFAULT_PROFILE, ...profile }))
}

export function readWorkProtocol(storage) {
  const protocol = readObject(storage, WORK_PROTOCOL_KEY, DEFAULT_WORK_PROTOCOL)
  const focusMinutes = Number(protocol.focusMinutes)
  return {
    ...protocol,
    focusMinutes: Number.isFinite(focusMinutes) ? Math.min(120, Math.max(5, focusMinutes)) : DEFAULT_WORK_PROTOCOL.focusMinutes,
  }
}

export function writeWorkProtocol(storage, protocol) {
  storage.setItem(WORK_PROTOCOL_KEY, JSON.stringify({ ...DEFAULT_WORK_PROTOCOL, ...protocol }))
}
