# Production preparation — 2026-10-16

Outcome: portable deployment preparation and isolated local rehearsal passed. Public hosting remains unconfigured. The owner has reserved a domain; no provider or DNS changes were made.

## Gaps addressed

- Production previously accepted the local frontend origin fallback. Startup now rejects missing/non-HTTPS origins, inconsistent or incomplete GitHub settings, auth bypass, remote unencrypted PostgreSQL, and connection-string query parameters that could override explicit database TLS settings. Errors name settings without printing credentials.
- Added `npm run check:production` for configuration validation without a database connection.
- Added `/ready` for database connectivity, separate from `/health`. Database failure returns a generic 503 and is never cached. It does not validate migration completeness.
- Added example environment, Caddy routing, systemd service, migration guidance, native PostgreSQL backup/restore instructions, and code/data rollback procedures in [the deployment runbook](../../deploy/README.md).

## Evidence

- Frontend lint, all 16 frontend test files, and production build passed.
- Backend syntax check passed. The full opt-in backend suite ran against a newly created disposable PostgreSQL container: 12 tests passed, zero skipped. This includes actual production cookie flags, mutation origin enforcement, and readiness success/failure. GitHub provider responses in the backend integration suite remain simulated.
- Supported migrations 001/003/004/005 ran twice on seeded current-schema records without losing notes. Destructive migration 002 was excluded. This is not an arbitrary legacy-schema upgrade test.
- Actual `pg_dump` and `pg_restore` reproduced users, tasks, focus sessions, checkpoints and connected repositories exactly in a second empty database. Restored import uniqueness remained enforced.
- The real Caddy template validated, and `systemd-analyze verify deploy/pomogit.service` passed without installing the service.
- A real Caddy proxy served the production frontend and production-mode backend over local HTTPS. The browser registered, accepted a Secure/HttpOnly/SameSite=Lax `__Host-pomogit_session`, reached Home and retained its session after reload. Missing static assets returned 404; unauthenticated API requests remained 401.
- The HTTPS rehearsal used a temporary local certificate and ignored its trust error only in the isolated test browser. Public certificate trust, DNS, production OAuth App settings, managed database TLS and live rollback have not been verified.
- `git diff --check` passed. No commit or push was made.

Re-run `design/verification/check_production_readiness.mjs` as described in the runbook; provide `POMOGIT_PLAYWRIGHT_MODULE` to include the HTTPS browser check. Temporary JSON and screenshot evidence is in `/tmp/pomogit-production-readiness/`. Test containers, their synthetic databases, proxy configuration and temporary API process were removed after verification. Existing account data was not used by the rehearsal.

Before launch, choose hosting, substitute the real domain, configure the production OAuth App and private environment, rehearse the actual target database migration, arrange encrypted off-host backups and monitoring, then perform the public-domain sign-in/task/import smoke check.
