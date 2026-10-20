# Two-domain and temporary pause readiness — 2026-10-19

Prepared, tested, and not deployed. Fresh reviewed plan: 36 additions,
zero changes or deletions. Account 730335441285, profile pomogit, us-east-1.
The private saved plan is terraform/deploy.tfplan (mode 600, ignored by Git).

## Normal mode

pomogit.live serves the React app through CloudFront/private S3.
api.pomogit.live serves API Gateway/Lambda with its own regional certificate.
The execute-api default endpoint is disabled. API cookies are host-only,
Secure, HttpOnly and SameSite=Lax; CORS and mutation checks trust the exact
frontend origin. CSP permits only the dedicated API origin in addition to self.
Production OAuth callback: https://api.pomogit.live/api/auth/github/callback.
Both Lambdas use default shared concurrency (10 currently available).
No quota increase, VPC, NAT, RDS or provisioned concurrency is needed.

## A week offline

After initial deployment, node deploy/aws/cli.mjs plan-pause prepares a reviewed
pause plan. Applying it serves a maintenance response at CloudFront and removes
both the public API route and Lambda invocation permission. Existing in-flight
requests may finish and CloudFront needs time to propagate the new function.
Users cannot invoke the app through the API hostname or default execute-api URL.
Saved accounts/tasks, database, DNS, certificates and frontend assets remain.
node deploy/aws/cli.mjs plan-resume prepares the reverse change. Neither command
applies automatically. Review the entire plan, including other pending changes,
and explicitly apply it; no direct pause/resume action has been performed.
Push and initialization are blocked while paused. Operator backups still work.
Retained storage, DNS, logs, rejected API requests and maintenance traffic can
still incur charges; pause mode is not a spending cap.
Neon's existing suspend_timeout_seconds is 0 (platform default, not -1/never);
no Neon settings or data were modified. Avoid continuous readiness probes.

## Verification

- Frontend lint, 61 unit tests and production build passed; packaged API artifact rebuilt.
- All 17 backend tests passed against disposable PostgreSQL (no skips).
- Local HTTPS browser registration across two hostnames, API-only secure cookie,
  authenticated reload, and logout/revocation passed with zero JavaScript errors.
  Self-signed test certificates were accepted only in that isolated browser.
- GitHub OAuth fixture uses a separate API callback and redirects to the frontend;
  state, expiry, replay, ban, verified-email and collision checks passed.
- 17 database/production rehearsal checks passed, including exact backup/restore.
- Two mocked Terraform plans passed (active and paused); local validation passed.
- Deployment and maintenance guard tests passed (five), plus production config test.
- Live read-only AWS/Neon preflight passed; saved active plan reviewed for API host,
  secret separation, shared concurrency, private S3 and disabled default endpoint.

No resources created, no DNS changes, no real database migrations, no commit/push.
A deployed pause/resume has not been exercised; public OAuth remains unverified.
Production GitHub credentials are still blank. Name.com DNS records must be
preserved when delegating the domain to the future Route 53 hosted zone.
See deploy/aws/README.md for exact operator steps.
