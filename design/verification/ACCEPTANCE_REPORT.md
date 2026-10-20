# Local account acceptance — 2026-10-10

The current production build passed the core account/workspace acceptance pass.
No product-code fixes were required during this pass. Four existing browser
verification scripts were updated to use the current notification and Start focus
controls, and configurable same-origin app URLs.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Backend syntax checks | Passed | `npm run check` in backend |
| Backend tests with real PostgreSQL | 10 passed, 0 skipped | Disposable `pomogit_verification` database |
| Connected production UI | 42 checks passed | `/tmp/pomogit-connected-workspace/results.json` |
| Live public GitHub import UI | 20 checks passed | `/tmp/pomogit-repository-import/results.json` |
| Project removal UI | 36 checks passed | `/tmp/pomogit-project-removal/results.json` |
| Task deletion UI | 45 checks passed | `/tmp/pomogit-task-delete/results.json` |
| Frontend lint, tests, build | Passed; 13 test files | Frontend npm commands |
| Diff whitespace check | Passed | `git diff --check` |
| User's live GitHub OAuth | User confirmed return to Workspace | Configured local app at `http://127.0.0.1:5173` |
| User's repository picker | User confirmed repository list loads | Same configured local app |

## Verified behavior

- Real registration/login creates HttpOnly sessions and isolates accounts.
- Saved task fields and notes survive reload and a second browser login.
- Focus sessions survive reload/logout; pause, resume, completion and export work.
- Wrong passwords, revoked/expired sessions and unavailable account services are handled.
- Public repository URLs display owner/repository; selected issues import into Inbox,
  persist after reload, and are excluded from repeat imports.
- Project removal preserves tasks, notes, references and paused focus history.
- Task deletion requires confirmation, is blocked during active/paused focus,
  retains data on failure, removes only the chosen task/history, and clears its
  featured-work references and remembered selection.
- Destructive-action dialogs were checked at 1440, 390 and 320px.

## Boundaries

Browser tests used the production build, real backend sessions and a separate
throwaway PostgreSQL instance. GitHub import read the live public API. Backend
OAuth/provider edge-case tests and project-removal repository browsing used
fixtures; they do not constitute live provider outage testing. The user's own
GitHub login and repository listing were confirmed by the user, not observed
through an attached browser.

No tests created or deleted tasks in the user's existing database. Nothing was
written to GitHub. No production deployment, AWS change, commit or push occurred.
Mobile checks used Chromium emulation, not a physical device. Public profiles and
password recovery remain separate, unfinished roadmap items.

## Re-running

Initialize a disposable database ending in `_test` or `_verification` with
`backend/schema.sql`. Point a dedicated backend at it with real auth enabled,
and serve the built frontend through a same-origin `/api` proxy to that backend.
Use a fresh backend process for each larger batch to avoid exhausting its real
login rate limiter. Never point these account-creation/deletion scripts at a
production or personal database.

Set `POMOGIT_PLAYWRIGHT_MODULE` to the installed Playwright module. Scripts accept:

- `check_connected_workspace.mjs`: `POMOGIT_APP_URL`
- `check_repository_import.mjs`: `POMOGIT_APP_URL`
- `check_project_removal.mjs`: `POMOGIT_APP_URL`, `POMOGIT_TEST_DATABASE_URL`
- `check_task_delete.mjs`: `POMOGIT_APP_URL`, `POMOGIT_API_URL`

Evidence under `/tmp` is local and temporary. Re-run to generate fresh results.
