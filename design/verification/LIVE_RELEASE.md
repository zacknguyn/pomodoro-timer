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
