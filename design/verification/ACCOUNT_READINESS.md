# Account readiness — 2026-10-16

The existing account flow passed the checks below. No application behavior or backend schema was changed for this verification.

## Live account confirmation

The user confirmed, in the actual signed-in app at `http://127.0.0.1:5173`:

- Continue with GitHub returns to Home.
- Their public repository list loads in the connection dialog.

These two outcomes were user-observed, rather than automated with the user's credentials.

## Automated checks with real persistence

All automated writes used a separately created PostgreSQL database. The user's workspace database was not seeded, migrated, or modified by these tests. The production frontend at port 5174 called the existing backend at port 3002 with auth bypass disabled.

- Ten backend tests passed with an explicit disposable database URL and zero skipped tests. They cover owner isolation, full workspace persistence, checkpoint validation, exports, OAuth state/session handling, repository connections, and idempotent imports. Those backend tests simulate GitHub provider responses; their provider assertions are not live GitHub evidence.
- Twenty browser checks passed at 1440px and 390px, including registration, unauthorized route protection, HttpOnly session creation, saved task details and notes, paused focus after reload, server-side logout revocation, restoration in a fresh browser, resumed/ended focus with recorded time, task completion, and recovery after a failed history request.
- The browser suite also connected the public `cli/cli` repository through the actual GitHub API, imported an existing issue through the UI, and repeated its import through the backend. The repeat returned zero imports and one skip; only one matching Inbox task remained, with its GitHub reference. The project's own repository had no open issues available for this check. No GitHub content was created or edited.
- The history error was deliberately injected by aborting `/api/export`. Retry removed that interception and loaded the actual backend. Successful account, workspace, and import responses were not mocked in the browser suite.
- No uncaught JavaScript errors or horizontal viewport overflow were observed in the final run.

An initial browser tab crashed during logout. The runner was retried with Chromium's shared-memory workaround; the final desktop/mobile run passed. This does not establish that every browser/device is covered.

## Validation and evidence

- `npm run lint` — passed.
- `npm test` — 16 frontend test files passed.
- `npm run build` — passed.
- `git diff --check` — passed.
- Browser runner: `design/verification/check_account_readiness.mjs`.
- Temporary screenshots and check results: `/tmp/pomogit-account-readiness/`.

The browser runner requires an initialized, disposable account backend at port 3002 and a production frontend preview at port 5174 proxied to it. Never point it at a personal or production database. Set `POMOGIT_READINESS_DISPOSABLE=true`; optionally set `POMOGIT_READINESS_REPOSITORY=cli/cli` to include the live public import checks. Point `POMOGIT_PLAYWRIGHT_MODULE` to an installed Playwright module when it is not on the module path. Runtime-generated test passwords and session cookies are not written to reports.

This verifies local readiness, not deployed production configuration, email delivery, private repositories, or ongoing GitHub synchronization. Imports are copies; later GitHub edits are not synced. No commit or push was made.

Cleanup completed: the disposable database and its two test servers were removed/stopped. The actual account frontend at port 5173, its backend at port 3001, and the original PostgreSQL container remain running.
