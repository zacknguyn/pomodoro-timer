export const WORKSPACE_VIEWS = ['work', 'settings']

export function resolveInitialView({ requested, workspaceOpened }) {
  if (!workspaceOpened) return 'landing'
  return WORKSPACE_VIEWS.includes(requested) ? requested : 'work'
}
