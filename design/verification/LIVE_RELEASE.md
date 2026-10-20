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
