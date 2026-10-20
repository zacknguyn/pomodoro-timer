# Pre-deployment security review — 2026-10-17

The two previously identified code/configuration findings are addressed and verified locally. This is not a live AWS/Neon audit or public-launch security sign-off. No AWS, DNS, Neon, real-user data, commits, or pushes were changed.

## Authentication throttling: fixed locally

Production login, registration, and GitHub initiation now use an atomic PostgreSQL UPSERT rather than a worker-local MemoryStore. One source address receives 20 attempts per 15-minute window, measured by database time. Counts saturate at 21, expired records are cleaned during requests, and counter errors fail closed with 503. Development retains its memory limiter.

On Lambda, the serverless adapter supplies the socket address from API Gateway payload v2 `requestContext.http.sourceIp`. Express forwarding-header trust is disabled there, and the production limiter uses the socket address directly. Caller-supplied X-Forwarded-For cannot select the key. On the portable server deployment, the existing one-proxy setting remains; deploy behind its intended trusted proxy.

The disposable integration test starts two independent Node processes running the actual Lambda handler. Concurrent sequences produce exactly 20 validation responses and four 429 responses, despite changing spoofed forwarding headers. A replacement worker remains blocked. Expiry restores access; an unavailable counter table returns 503. These are synthetic local Gateway events, not proof of deployed AWS header behavior.

Limitation: when CloudFront calls API Gateway, the gateway-observed source may be a shared edge/proxy address. The conservative limit can group users. Verify real viewer/proxy behavior before unrestricted launch; do not substitute unverified forwarding headers. This is source-address throttling, not per-account or distributed-abuse prevention. See [AWS's payload documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html).

## Database privilege separation: fixed locally

Terraform gives only the API function the restricted runtime `DATABASE_URL` and GitHub OAuth credentials. Only the IAM-invoked migration function receives the owner URL, through its own `DATABASE_URL`. No API route or public Lambda invocation permission exposes migration execution. The CLI uses the owner URL for database backups.

Create the fixed `pomogit_runtime` role once using the SQL file in `deploy/aws`; set its password privately. Initialization and upgrades refresh `runtime_permissions.sql`. The script refuses administrative flags, role memberships, and object ownership, revokes schema creation, grants table CRUD and sequence usage, and sets default privileges for later migration-owned objects. This script is for a dedicated app database because public-schema creation is revoked from PUBLIC. The deployment preflight checks both TLS connections and the runtime/migration role boundaries. Real Neon grants remain uninspected.

The disposable integration test exercises the actual migration handler with the owner login, then confirms the restricted login can register an account and create a task. PostgreSQL rejects CREATE, ALTER, DROP, TRUNCATE, and switching to the owner role. Default grants permit data writes to a subsequently created table while rejecting its deletion. See [PostgreSQL's privilege reference](https://www.postgresql.org/docs/16/ddl-priv.html) and [Neon's role documentation](https://neon.com/docs/manage/roles).

## Verification

Run `POMOGIT_RUN_DISPOSABLE_CHECK=true node design/verification/check_security_boundaries.mjs` to create a new loopback-only disposable PostgreSQL container, run the full backend integration suite and backup/restore rehearsal, and remove it afterward. It never reads backend/.env or uses an existing user database.

- All 17 backend tests passed against disposable PostgreSQL, with zero skipped tests. Coverage includes account ownership, opaque sessions, OAuth state/replay protections with simulated provider responses, admin boundaries, literal SQL-like task input, secure cookies, origins, runtime-role restrictions, and cross-worker throttling.
- Migration/data-preservation/backup-restore rehearsal checks passed, including the Better Auth tables and restored credential verification. Migration 006 is included and rerunnable.
- Four deployment guard/SPA tests passed. Missing/mismatched Terraform identity outputs and malformed/separate-credential settings are rejected.
- Terraform validation and its mocked safety plan passed, including separate function database URLs and absence of OAuth credentials from migration environment variables. Mocked plans do not verify deployment permissions or real resources.

Earlier advisory/working-tree secret-scan results remain dated snapshots; they were not repeated as part of this fix. No exhaustive Git-history secret scan or penetration test was performed.

## Remaining live-launch checks

- Verify AWS identity/IAM/MFA, deployed bucket policies, DNS/TLS, actual Neon grants, production OAuth and real proxy/client-address behavior.
- Keep Terraform state/plans and account-data backups private and encrypted. Sensitive marking and gitignore do not encrypt them. Runtime and migration URLs remain secrets in state.
- Budget alerts and concurrency/throttle settings do not cap bills. Public signup/data creation still lacks per-account storage quotas.
- The HTTP API origin remains public. CORS/Origin checks are not non-browser authentication; opaque sessions and ownership checks remain essential.
- Verify rollback compatibility and encrypted off-host restore before relying on release-time local dumps as recovery.
