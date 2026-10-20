# Better Auth migration — 2026-10-17

Implemented locally with Better Auth 1.7.10 pinned in the backend. No live database migration, AWS provisioning, deployment, commit, or push was performed.

## Behavior

- The browser continues using the existing login/register/logout/me/GitHub endpoints and JSON shape. Only the backend owns the Better Auth instance; no duplicate frontend auth state/client was introduced.
- Better Auth uses the existing users table with mapped profile fields, plus auth_accounts, better_auth_sessions and auth_verifications. User IDs and workspace ownership remain stable.
- Migration 007 imports existing credential hashes and immutable GitHub IDs. ON CONFLICT DO NOTHING prevents a repeated migration from overwriting a changed credential. Existing Argon2 and bcrypt hashes remain verifiable; new credentials use Argon2id.
- Historical auth tables and legacy fields remain available for investigation/rollback planning; there is no authentication fallback to them. Existing unsigned session cookies cannot sign in and users must authenticate again.
- Better Auth owns OAuth state/PKCE, provider exchange, signed cookies and database sessions. The registered GitHub callback URL remains /api/auth/github/callback through a compatibility handler; its internal Better Auth callback is not exposed as an alternate public endpoint.
- Provider tokens are stripped by create/update account hooks before persistence and never included in browser JSON. Implicit account linking by matching email remains disabled; GitHub identities require verified email.
- Banned users cannot create sessions. Protected app routes read current role/ban status from PostgreSQL; admin changes revoke the same Better Auth sessions. Cookie caching is disabled. Session refresh headers are forwarded and logout checks that the old session has been revoked.
- Only the existing explicitly exposed auth routes are mounted. The shared production PostgreSQL rate limiter therefore cannot be bypassed through Better Auth's default sign-up/sign-in routes. Production Origin enforcement remains ahead of these routes. The library receives only allowlisted headers and an application-supplied client IP.
- Cookie attributes remain Secure, HttpOnly, SameSite=Lax, Path=/, no Domain, with the __Host-pomogit_session name in production. The custom name deliberately suppresses the library's automatic __Secure- prefix while explicitly setting Secure; the HTTPS browser check verifies the result.

## Deployment

Set a stable private random BETTER_AUTH_SECRET of at least 32 characters. New local private keys were generated without printing them in backend/.env and deploy/aws/backend.env where present. Examples contain no real keys. Production validates the secret before serving; the migration function does not need or receive it. Development has a process-local fallback only when a stable secret is omitted.

Terraform passes the secret only to the API Lambda. State/plans therefore contain it and need the same protection as database/OAuth secrets. The private deployment CLI supplies it through TF_VAR_better_auth_secret. No secret is placed in frontend variables.

For new databases, schema.sql includes the auth schema. For an existing supported database, back up and rehearse first, run earlier required migrations followed by npm run db:auth as the owner, refresh runtime grants, then start the updated app. Lambda upgrades run migration 007 and refresh grants through the IAM-only migration function. Do not use the restricted API login to run schema migrations.

The schema migration does not remove legacy data, but rolling back auth code after new accounts/password changes requires a reviewed data reconciliation plan: legacy credential/session tables are no longer updated. Keep the signing secret with the separately encrypted deployment configuration; pg_dump does not back it up.

Email delivery, password-recovery UI, email-verification requirements, explicit account linking, MFA and passkeys remain unconfigured features. Installing the framework does not enable them automatically. Neon's managed-auth service is not used.

## Verification

- All 17 backend tests pass with zero skips against disposable PostgreSQL, including legacy password migration and ownership preservation, cookie/logout/expiry, GitHub fixtures, rejected implicit linking, no stored provider tokens, ordinary-user/admin boundaries, and cross-worker rate limits.
- Migration 007 runs repeatedly without overwriting a modified credential. Old unsigned cookies return 401 and the legacy user can sign in under its original ID.
- Full frontend lint/tests/build pass; the local Lambda zip includes Better Auth and migration 007 and no environment files.
- Local Caddy HTTPS + Chromium verifies readiness/routing, real registration into Home, accepted production cookie attributes and session persistence after reload. Local test certificate trust is bypassed only in this isolated browser; no public certificate/OAuth claim is made.
- pg_dump/pg_restore compares users, tasks, focus sessions, checkpoints, projects, auth accounts, Better Auth sessions and verification records. A restored Argon2 credential still verifies, and import uniqueness remains enforced.
- Ten local Lambda emulator checks pass. Better Auth import and native Argon2 hashing/verification also pass inside the AWS Node 24 Linux image.
- Terraform formatting/validation and mocked safety plan pass, including exclusion of the auth secret from migration environment variables. Four deployment guard/route tests pass. git diff --check passes.

Real AWS/Neon connectivity, IAM/DNS, deployed proxy source-address behavior and live GitHub OAuth remain unverified. Follow the deployment guide's live acceptance flow after explicit provisioning approval.
