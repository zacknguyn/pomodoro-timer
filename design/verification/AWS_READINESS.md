# AWS showcase readiness — 2026-10-17

Prepared and locally verified; **not deployed**. The user selected an under-US$10/month showcase target and approved AWS application hosting with Neon PostgreSQL. The Lightsail draft was removed. No AWS identity/profile was selected, no live Terraform plan/apply was run, and no AWS, DNS or Neon resources were changed.

## Result

- Setup recheck: `init-db`, `push`, and `rollback` now require Terraform state outputs to match the configured AWS account, region, and domain before updating resources. Missing identity outputs fail closed and require a reviewed infrastructure plan/apply. Four deployment guard/route tests pass, including mismatched and incomplete state cases.
- Security follow-up: production auth counters now use PostgreSQL across workers, API and migration database credentials are separated, and migration grants enforce the restricted runtime role. All 17 backend tests passed against disposable PostgreSQL. Live AWS/Neon roles and proxy addresses remain unverified; see [SECURITY_REVIEW.md](SECURITY_REVIEW.md).
- Terraform now describes Route 53, ACM, private S3/CloudFront, HTTP API Gateway, the complete secured Express app on Lambda, an IAM-only migration function, short-retention logs, shared default Lambda concurrency, API throttles and $5/$10 account-wide spend alerts.
- RDS, VPC/NAT infrastructure, provisioned concurrency and warm-up jobs are excluded. Budgets warn rather than cap spending; the target depends on actual traffic, storage and provider allowances.
- The old partial Lambda adapters now share the full Express app, preserving ownership, origin enforcement, errors and cookie serialization.
- Static SPA rewriting is restricted to the static CloudFront behavior. Backend caching is disabled; cookies, Origin and query strings are forwarded. API errors are not replaced with HTML.
- The deployment CLI verifies the expected account before operations, builds native dependencies for AWS Linux x86_64, supports a private connection preflight, and prepares plan/push/backup/rollback commands. A push backs up the database before migrations, publishes an API version through an alias, retains old static assets and uploads index.html last.
- First-time account authentication, domain delegation, production OAuth settings, Neon setup and reviewed infrastructure provisioning remain necessary. Later code updates use `node deploy/aws/cli.mjs push`.

## Verification

- Frontend lint, all 16 frontend test files and production build passed during packaging.
- Backend syntax checks passed. All 17 backend tests passed against a newly created disposable PostgreSQL container, with zero skipped tests. GitHub provider responses in those integration tests remain simulated.
- Four deployment guard/SPA tests passed, including a subprocess using a fake AWS CLI to confirm a wrong account stops before deployment.
- Terraform formatting, validation and the mocked infrastructure safety plan passed. Mocked plans do not verify IAM deployment permissions, service quotas or real resource creation.
- The Lambda zip built successfully using AWS's Node.js 24 Linux image. Native Argon2 hashing/verification passed inside that image. The 8.17 MiB zip includes the app and migration handlers and excludes environment files, certificates and database archives.
- Ten checks passed in AWS's local Lambda runtime emulator: health, six protected routes, invalid Origin rejection, Secure/HttpOnly cookie transport and missing-route status. No real database or AWS endpoint was used by that emulator check.
- The disposable database rehearsal again verified supported migration repeatability, native pg_dump/pg_restore data preservation and restored issue-import uniqueness. Its container and the emulator container were removed afterward.
- `git diff --check` passed. Nothing was committed or pushed.

See [the AWS deployment guide](../../deploy/aws/README.md) for setup, costs, secret/state handling, backup and rollback boundaries. Real Neon connectivity, actual AWS deployment and public GitHub OAuth remain unverified until the operator completes configuration and the live acceptance flow.

Better Auth migration: see [BETTER_AUTH_MIGRATION.md](BETTER_AUTH_MIGRATION.md) for preserved identities, forced re-login, secret configuration and auth-data restore verification.
