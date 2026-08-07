export const WORKSPACE_VIEWS = ['home', 'board', 'canvas', 'focus', 'worklog', 'settings']

const LEGACY_VIEWS = {
  today: 'home',
  queue: 'board',
  plan: 'board',
  history: 'worklog',
}

export function resolveInitialView({ requested, hasSession, workspaceOpened }) {
  if (hasSession) return 'focus'
  const resolved = LEGACY_VIEWS[requested] || requested
  if (WORKSPACE_VIEWS.includes(resolved)) return resolved
  return workspaceOpened ? 'home' : 'landing'
}
