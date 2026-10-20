# Live release — 2026-10-19

Published https://pomogit.live with API at https://api.pomogit.live.
The approved empty database initialization completed through the IAM-only migration function.
A private PostgreSQL backup was taken before publication, then the API release and
frontend assets were published and CloudFront invalidated. No Git commit or push.

Frontend lint, 61 unit tests, production build and backend checks passed in the release
pipeline. Public readiness returns 200 and anonymous authentication returns 401.
Fresh strict-HTTPS desktop (1440px) and mobile (390px) browser checks passed with
no JavaScript exceptions or horizontal overflow. Screenshots are under
/tmp/pomogit-live-launch. The GitHub button returns a real authorization URL with
the production callback; automated provider navigation was intercepted without
using a user account. The user separately confirmed real GitHub login returns Home
and a task remains after reloading the live Board.

A fresh post-publication Terraform plan reports no changes, so the release is
consistent with the infrastructure configuration. Pause/resume remains available
as reviewed plan-only operator commands; no live pause/resume was performed.
The first release has no previous frontend to restore through the standard code
rollback command. Private backup and release metadata are under deploy/aws/.artifacts.

## Navigation release — 2026-10-20

Published source commit `235c9b23d777f6287b3c26b47928b08d7582ea6b` to
`https://pomogit.live` through the existing guarded release workflow.
AWS account/region and verified Neon connections/role boundaries passed before
publication. The workflow saved a private database backup (mode 0600), retained
the prior frontend/API alias for rollback, completed the supported upgrade
migrations, published API version 3 and moved the `live` alias, uploaded the
production frontend and completed CloudFront invalidation. No Terraform apply
or new infrastructure provisioning was performed.

Release packaging passed frontend lint, unit tests and production build,
plus backend syntax and tests (9 passed, 8 database-dependent tests skipped in
this packaging run). Earlier isolated UI workflow checks remain documented in
[FLOATING_NAVIGATION.md](FLOATING_NAVIGATION.md).

Post-publication checks:

- The public HTML references the exact JavaScript asset from the production build.
- API `/ready` returns 200; anonymous `/api/auth/me` returns 401.
- Fresh strict-HTTPS browsers at 1440px and 390px render landing/login without
  JavaScript exceptions or horizontal overflow.
- The real GitHub authorization handoff supplies a state and the callback
  `https://api.pomogit.live/api/auth/github/callback`. Provider navigation was
  intercepted before accessing a GitHub account; no credentials/codes were logged.
- The deployed frontend passed 132 navigation assertions across both layouts and
  themes at desktop/phone widths, with every account API request intercepted.
  These checks did not access or mutate real account data.

After publication, the user confirmed in their own browser that GitHub login
returns Home and existing Board tasks load. This is user-reported manual
verification for this release; automated checks did not access their account.

Local evidence: `/tmp/pomogit-public-release/` and
`/tmp/pomogit-floating-navigation-live-fixtures/`. Backups and rollback metadata
remain under ignored `deploy/aws/.artifacts/` and are not committed.

## Performance and dashboard release — 2026-10-20

Published source `625bcd2f7c72d6200f4af4c19da73f43154ce432` to
`https://pomogit.live` after GitHub CI succeeded. Deployment preflight verified
AWS account 730335441285/us-east-1 and both certificate-verified Neon connections
with the existing database role boundaries.

The guarded workflow saved a private database dump and rollback snapshot, ran the
supported upgrade path, published API version **4** and switched its `live` alias
before uploading the frontend. CloudFront invalidation completed. No Terraform
apply, infrastructure provisioning, credential changes or database initialization
was performed. The previous API version **3** and frontend remain available for
code rollback; database data is not automatically rolled back.

Packaging passed frontend lint, 35 unit tests, production build, backend syntax
and 10 backend tests; eight database-dependent tests were skipped in packaging.
Those eight had separately passed against disposable PostgreSQL 17.11 before
release; see [database verification](DASHBOARD_DATABASE_VERIFICATION.md).

Post-publication evidence:

- API version 4's code hash matches the packaged zip, and public HTML matches the
  production frontend build.
- `/ready` returns 200; anonymous `/api/auth/me` and `/api/sessions` return 401.
- Fresh strict-HTTPS browsers at 1440px/390px render public landing/login without
  JavaScript errors or horizontal overflow. The real GitHub authorization handoff
  uses the production callback and a state; provider navigation was intercepted
  before accessing an account.
- Backup is nonempty with mode 0600; the previous frontend snapshot exists.
- The deployed dashboard passed 217 assertions at desktop/phone widths across
  both themes and navigation modes, with all account API requests intercepted.
  These isolate UI behavior and do not read or alter real account data.
- The user confirmed GitHub login returns Home and existing Board tasks and
  recorded dashboard history look correct. This is user-reported live account
  verification, distinct from the isolated automated browser checks.

Local evidence: `/tmp/pomogit-release-provenance.json`,
`/tmp/pomogit-public-release/`, and `/tmp/pomogit-dashboard-integration/`.
Private backup and rollback files remain under ignored deployment artifacts.

## Frontend loading release — 2026-10-20

Published source `c37fb248a69ac485f0e099dd75c2ebf934b3fdb7` to
`https://pomogit.live` after both GitHub CI runs passed. The guarded preflight
verified the intended AWS account/region and certificate-verified Neon connections
and database role boundaries.

The workflow saved a nonempty private database backup (mode 0600) and previous
frontend snapshot, ran the existing supported upgrade path, published API version
**5** before the frontend, and completed CloudFront invalidation. No Terraform
apply, infrastructure provisioning, credential changes, database initialization
or new schema migration was required. The current code rollback target is API
version **4** and the frontend from `625bcd2`; database data is not automatically
rolled back. Older static assets remain available for existing tabs and rollback.

Packaging passed frontend lint, 35 unit tests, production build, backend syntax
and 10 backend tests. Eight database integration tests were skipped in packaging;
they passed separately before the preceding release against disposable PostgreSQL
17.11. This optimization did not change backend code.

Post-publication evidence:

- The live API code hash matches the packaged zip, and public HTML exactly matches
  the production build. `/ready` returns 200; anonymous `/api/auth/me` and
  `/api/sessions` return 401. An initial verification network timeout was resolved
  by retrying with certificate verification retained.
- Strict-HTTPS desktop (1440px) and phone (390px) browsers render public landing
  and login without exceptions or horizontal overflow. The real GitHub handoff
  supplies the production callback and authorization state. Provider navigation
  was intercepted before accessing any GitHub account.
- On the deployed frontend with all account APIs intercepted, Home does not load
  AuthScreen or LandingScreen chunks. All four WOFF2 fonts load with no raw TTF
  requests. Vietnamese task text and all retained Barlow weights were checked at
  desktop and phone widths, with no overflow or JavaScript exceptions. These
  checks do not access or mutate real account data.
- The user confirmed Home and Board look correct after refreshing the live app.
  This confirms the visible account screens and text, not a fresh OAuth consent
  flow. Local timing improvements in [FRONTEND_LOADING.md](FRONTEND_LOADING.md)
  are controlled benchmarks, not measured production speed gains.

Local evidence: `/tmp/pomogit-font-release-provenance.json`,
`/tmp/pomogit-public-release/`, and `/tmp/pomogit-live-fonts/results.json`.
Private backup and rollback files remain in ignored deployment artifacts.
