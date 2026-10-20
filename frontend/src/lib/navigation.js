export const WORKSPACE_VIEWS = ['home', 'work', 'tasks', 'review', 'profile', 'admin']

export function resolveInitialView({ requested, workspaceOpened }) {
  if (!workspaceOpened) return 'landing'
  return WORKSPACE_VIEWS.includes(requested) ? requested : 'home'
}

// GitHub's existing callback still uses #work. A one-time browser hint lets the
// approved Home landing coexist with explicit Workspace links.
export const GITHUB_LANDING_KEY = 'pomogit.github-landing'
export function githubLandingView(requested, storage) {
  try { return requested === 'work' && storage.getItem(GITHUB_LANDING_KEY) === 'home' ? 'home' : requested } catch { return requested }
}
