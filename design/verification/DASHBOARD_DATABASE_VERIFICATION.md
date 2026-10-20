# Dashboard fit and database verification — 2026-10-20

Local changes and tests only; nothing committed or deployed.

## Short-screen dashboard

Adjusted only navbar-mode Home at widths above 1200 px and heights up to 820 px. The navbar becomes 72 px tall with a 16 px top margin, chart height becomes 110 px, and card/grid spacing tightens. Text sizes and navigation controls remain unchanged. Other pages and navigation layouts retain their existing dimensions; normal scrolling remains available for expanded content.

At 1440×768, lower dashboard cards now end at 742.78 px rather than 790.78 px, leaving 25.22 px below them. The existing 20 px clearance assertion passes without weakening it. Both light and dark themes passed.

- Dashboard integration suite: **217 checks passed**, across 1440/375 px widths, both themes and both navigation modes, including chart inspection, filters, empty/error states and retry.
- Six unaffected screenshots (desktop sidebar and mobile in both navigation modes/themes) were pixel-identical before/after.
- Frontend `npm run lint && npm test && npm run build` passed, including 11 test files. `git diff --check` passed.
- Before screenshots: `/tmp/pomogit-dashboard-fit-before-*.png`. After screenshots/check records: `/tmp/pomogit-dashboard-integration`.

## Real PostgreSQL integration

Ran the eight existing opt-in integration tests sequentially against **PostgreSQL 17.11** in a separate Docker container:

| Test | Result |
| --- | --- |
| Account persistence, task/session/export parity, ownership isolation and expiry | Passed |
| Admin access, injected ownership and SQL-input isolation | Passed |
| GitHub project persistence, idempotent issue imports and project removal | Passed |
| GitHub OAuth validation and opaque sessions | Passed |
| Production secure cookies, origins and readiness | Passed |
| Better Auth migration preserves IDs, credentials and task ownership | Passed |
| Migration handler rejects destructive modes and recovers from transaction failure | Passed |
| Restricted API role and independent Lambda workers share authentication limits | Passed |

Database operations were real. GitHub provider responses were mocked by the existing tests; this does not verify live GitHub consent or production Neon/AWS behavior. Production-mode handlers and Lambda workers ran locally.

Isolation: generated temporary credentials, loopback-only random host port, memory-backed database storage, and a dedicated `pomogit_verification` database initialized from `backend/schema.sql`. The test environment did not inherit cloud credentials or production database URLs. The container and its storage were removed after testing; the downloaded `postgres:17-alpine` image remains cached for reuse. Existing containers were untouched.

The temporary harness was corrected to wait for the final TCP server rather than PostgreSQL's temporary initialization socket, and to let production tests supply their own API origin. Application security settings were not relaxed to make tests pass.

Results: `/tmp/pomogit-disposable-db-results.json`. To repeat, initialize a disposable local PostgreSQL 17 database from `backend/schema.sql`, set `POMOGIT_TEST_DATABASE_URL` privately to that database (its name must end in `_test` or `_verification`), and run the eight `backend/test/*.integration.test.js` files above individually. Never point these tests at production.
