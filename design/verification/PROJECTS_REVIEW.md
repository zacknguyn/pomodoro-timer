# Connected projects review

Reviewed and integrated 2026-10-11 after approval of the HTML proposal. The React projects dialog now uses the approved layout. Backend APIs and account/session handling are unchanged; verification intercepted API requests instead of accessing user data.

## Findings and proposal

| Current behavior | Proposed presentation |
| --- | --- |
| The “Connect GitHub repository” entry opens a dialog containing local project management as well as connection. | Once projects exist, call the entry “Manage projects” and the dialog “Projects & repositories.” Keep the first-use connection entry. |
| Connecting by URL appears before existing projects. | Show existing projects first; place connection controls in a collapsed “Connect another repository” section. Open that section when no projects exist. |
| Connected project action reads “Issues.” | Use “Import more issues.” Keep explicit GitHub-connected/local labels and task counts. |
| Local projects share the same Git branch icon as repositories. | Use GitHub icon for connected repositories and folder icon for local projects. Local “View tasks” uses the existing project-filtered Board flow. |
| No-issue text says manual tasks remain possible but offers no clear return to project work. | Explain that the connection remains, describe creating a task under the project, and offer “View project tasks” plus “Back to projects.” |
| All-imported issues remain disabled but have no next-step explanation. | Explain that loaded issues are already in Pomogit; offer viewing project tasks. Preserve pagination when more pages are available. |
| Project removal uses an icon-only action. | Expose a labeled Remove action and retain the existing confirmation that tasks/notes/history stay and GitHub remains unchanged. |

## Integration scope

Reused `GithubRepositoryDialog`, its existing selection/pagination/removal logic, and Workbench's project-filtered Board navigation. No new page, state system, or backend API. The real no-issues branch must distinguish an empty loaded page with further pagination from a repository without open issues; the preview demonstrates the latter. The preview's scenario buttons are review controls, not app controls.

## React verification

- **76 React projects checks passed** across 1440/375px and light/dark: project-first ordering, collapsed connection controls, distinct project icons/types, row/footer geometry, filtered Board navigation, empty repositories, empty paginated pages, already-imported rows, retry after loading failure, cancel/failed removal, and connected/local removal retaining tasks and clearing labels.
- **40 first-use flow checks passed** at 1440/375px: capture/Undo, connection without import, project management, selected issue import into the project-filtered Inbox, read-only task popup, focus transitions and optional completion notes.
- All account-mode API calls were intercepted using fixtures. These checks verify React behavior, not live OAuth, GitHub, or database operations.
- React screenshots: `/tmp/pomogit-projects-integration/`; first-use evidence in its `first-use/` subdirectory.
- Frontend `npm run lint && npm test && npm run build` passed (13 test files); `git diff --check` passed. No commit or push.
- Repeat with an account-mode frontend on port 5191 and `node design/verification/check_projects_integration.mjs` / `node design/verification/check_first_use.mjs`; set `POMOGIT_PLAYWRIGHT_MODULE` if needed.

## Proposal evidence

- `design/projects-preview.html`: interactive standalone sample; opens the proposed project dialog. No API traffic.
- **48 proposal checks passed** across 1440/375px and dark/light themes: management ordering, type labels, import selection, empty/already-imported states, removal/cancel, retained-task copy, normalized connection name, geometry, and console/API absence.
- Screenshots reviewed in `/tmp/pomogit-projects-preview/`.
- UI skill quick probe flagged a dark-mode item for the off-screen skip link. This is an intentionally high-contrast keyboard-focus affordance behind the modal, not a light surface in the visible dark interface; retained. Its input-alignment suggestion pairs hidden connection controls with a repository row button, not controls in the same form. Existing badge sizing, menu spacing, native checkbox and scrollbar style suggestions remain outside this proposal.
- Frontend lint, all **13 test files**, production build and `git diff --check` passed.

Repeat proposal checks with a local server at port 5196 serving the repository, then `node design/verification/check_projects_preview.mjs`; configure `POMOGIT_PLAYWRIGHT_MODULE` when Playwright is not on Node's default module path. These checks validate the proposal, not live GitHub or backend behavior.
