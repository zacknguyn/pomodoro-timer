# AWS showcase deployment

Prepared for the approved target: AWS application hosting with Neon PostgreSQL, aiming for **under US$10/month at low portfolio traffic**, excluding domain registration. This is a target, not a guaranteed bill or hard spending cap. The first deployment at `https://pomogit.live` completed on 2026-10-19; see [the live release record](../../design/verification/LIVE_RELEASE.md).

```text
Name.com registrar → Route 53 DNS
  pomogit.live     → CloudFront + ACM HTTPS → private S3 frontend
  api.pomogit.live → API Gateway + regional ACM HTTPS → Lambda → Neon PostgreSQL
                                                        ↘ GitHub OAuth/public API
```

There is one secured Express app behind Lambda, plus a separate IAM-only migration function. There are no RDS instances, NAT gateways, VPC endpoints, load balancers, Secrets Manager secrets, provisioned concurrency or keep-warm jobs. The app keeps its existing PostgreSQL schema and account model. Neon hosts only the database; its auth/backend products are not used.

The frontend calls `https://api.<domain>/api` with credentials. The API accepts only the exact frontend origin for CORS and mutations, keeps Secure HttpOnly host-only session cookies on the API hostname, and sends `no-store` headers. No parent-domain cookie is needed. API Gateway's default execute-api endpoint is disabled. Static routes use a CloudFront Function to load the SPA; its content security policy allows connections to the dedicated API origin.

## Costs and limits

- [Route 53](https://aws.amazon.com/route53/pricing/) lists $0.50/month per hosted zone for the first 25 zones, plus relevant DNS query charges. Reuse a matching existing zone when available.
- [Neon's Free plan](https://neon.com/pricing) currently includes 100 CU-hours/month per project, 1 GB storage, and idle scale-to-zero. Stay on Free for the showcase and monitor its limits; availability can be affected by exhausted allowances. Cold requests may take longer after the database sleeps.
- S3, API Gateway, Lambda, CloudFront and logs are usage-based. No AWS promotional credits or Free Tier eligibility are assumed. Use current regional pricing before applying a real plan.
- The API and migration functions share the account's default unreserved Lambda concurrency; the initial showcase account has a quota of 10 in us-east-1. API Gateway throttles requests to 10 per second with a burst of 20. These are request throttles, not a per-function concurrency cap; the functions compete for shared capacity and excess traffic can be throttled. Function logs are retained for seven days, with account-wide actual-cost notifications at $5 and $10. Notifications can lag and do not stop spending.
- Standard RDS has ongoing compute/storage costs, and a VPC-connected Lambda needs internet egress for GitHub. Those services were deliberately excluded to meet the chosen showcase budget. See [AWS's VPC Lambda networking guidance](https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-internet.html).

Do not add uptime probes to `/ready` that query Neon continuously; they can prevent idle scale-to-zero. Use `/health` for a lightweight process check when appropriate, and `/ready` during releases or diagnosis.

## First-time preparation

Requirements: Node.js 24, npm, Docker, Python 3, Terraform 1.9+, AWS CLI v2, and a Linux/macOS terminal or WSL. The packaging step builds Linux x86_64 native dependencies using AWS's Node.js 24 Lambda image. Docker must support that target architecture.

1. Install frontend and backend dependencies with `npm ci` in each directory.
2. Create a Neon Free project in a suitable region near the selected AWS region. Use a dedicated database for Pomogit. Keep scale-to-zero enabled. As its schema owner, execute [create-runtime-role.sql](create-runtime-role.sql) once, then set a unique password with psql's `\password pomogit_runtime` prompt. [SQL-created roles](https://neon.com/docs/manage/roles) avoid the broad memberships of Neon Console-created roles. Keep the owner URL as `MIGRATION_DATABASE_URL`; use a direct URL with the `pomogit_runtime` login for `DATABASE_URL`. Both URLs must target the same host and database with different usernames. Remove URL query parameters and set `DATABASE_SSL=true`. The app verifies the server certificate using system trust. Do not paste passwords into chat or frontend variables.
3. Authenticate with an AWS CLI profile. If your account uses IAM Identity Center:

   ```sh
   aws configure sso --profile pomogit
   aws sso login --profile pomogit
   ```

   An existing supported AWS CLI credential profile also works. Never put AWS keys in the app or configuration JSON. The profile needs permission to provision/manage the listed CloudFront/S3/ACM/Route 53/Lambda/HTTP API/IAM/logging/budget resources. Use a deployment role, not root credentials. The Lambda runtime role itself can write only to its own function logs; it has no AWS deployment permissions.

4. From the repository root:

   ```sh
   cp deploy/aws/config.example.json deploy/aws/config.json
   cp deploy/aws/backend.env.example deploy/aws/backend.env
   chmod 600 deploy/aws/config.json deploy/aws/backend.env
   ```

   Edit these private files. Set the expected AWS account ID, CLI profile, region, actual domain, budget email, and database connection. Set `FRONTEND_URL=https://<domain>` and `API_URL=https://api.<domain>`. If you have a matching Route 53 zone, set its ID in `hostedZoneId`; otherwise leave it empty.

5. Configure a production GitHub OAuth App. Its Homepage URL is `https://your-domain`; callback is `https://api.your-domain/api/auth/github/callback`. Fill all three GitHub variables in the private deployment environment. Leave them all empty only when deliberately deploying without GitHub login. Keep the local OAuth App/environment separate.
   Also set a stable, private random `BETTER_AUTH_SECRET` (at least 32 characters). The API signs Better Auth cookies with this key; the migration function never receives it. Rotating it without a key-rotation plan invalidates existing cookies. Better Auth runs inside the AWS API and uses Neon PostgreSQL; do not enable Neon's separate managed-auth service for this setup.
6. Review the source you intend to release. No commit is made by the tools. Package and check:

   ```sh
   node deploy/aws/cli.mjs package
   node deploy/aws/cli.mjs check
   ```

   `package` runs frontend lint/tests/build and backend checks/tests, builds the Lambda-native dependencies, and writes a private local zip. Database integration tests remain opt-in. `check` verifies configuration, the actual AWS account, its concurrency quota, both certificate-verified PostgreSQL connections, the restricted runtime role, and migration ownership; it creates no resources. The provider also enforces the expected account ID during apply. For an existing database, first apply `backend/migrations/runtime_permissions.sql` as the schema owner so grants satisfy the preflight. Initialization and every Lambda upgrade automatically refresh those grants.

## Domain and first infrastructure deployment

If an existing Route 53 zone is configured, skip zone creation and verify that your registrar already delegates the domain to it. A subdomain can use its parent zone. Do not create a duplicate zone and assume it is authoritative.

For a new zone, run:

```sh
node deploy/aws/cli.mjs zone
```

This is a **real, billable hosted-zone creation command**. Terraform shows its targeted plan and asks for normal apply confirmation. Set the domain's registrar nameservers to the reported values and wait for delegation. It does not transfer domain registration or automatically edit registrar settings. Targeting is used only to bootstrap DNS before ACM can validate the certificate; the next step plans the complete stack.

Then:

```sh
node deploy/aws/cli.mjs plan
# Review all resources and regional costs, then explicitly apply the saved plan:
AWS_PROFILE=pomogit terraform -chdir=terraform apply deploy.tfplan
```

Replace the example profile with your configured profile. The full apply creates billable resources and can take time while DNS, ACM and CloudFront become ready. The frontend certificate lives in `us-east-1` for CloudFront; a separate API certificate lives in the selected application region. There is no automatic apply in CI or during `push`.

The Terraform state and saved plan contain database/OAuth secrets despite sensitive-output redaction. They are gitignored; keep them private and backed up with encryption. The CLI uses a restrictive file-creation mask. For team/CI operation, move state to a separately protected encrypted backend with locking before allowing multiple writers. Never put state in the frontend bucket: CloudFront can serve objects from that origin.

Initialize **only a new empty deployment database**, then publish:

```sh
node deploy/aws/cli.mjs init-db
node deploy/aws/cli.mjs push
```

`init-db` refuses an existing public schema with tables. For an existing supported Pomogit database, first rehearse its migration on a copy; skip init and use the reviewed upgrade path. No destructive legacy cleanup runs.

Upgrade migration 007 imports legacy password hashes and immutable GitHub identities while retaining existing user IDs and task ownership. Existing cookies require a fresh sign-in. The login/register API paths remain compatible; production GitHub OAuth must use the dedicated API callback above, and Better Auth handles the underlying flows. Implicit linking by email is disabled, and provider tokens are stripped before database writes. Email delivery, password-recovery screens, verification requirements, MFA and passkeys are not enabled by this migration.

The API receives only runtime database credentials and GitHub OAuth settings. The IAM-only migration function receives owner credentials and the runtime role name, without OAuth secrets. The permission script grants table CRUD and sequence usage, revokes public-schema creation, and refuses a runtime role with memberships, administrative flags, or object ownership. It also sets default grants for future objects created by the migration owner. Run it only in the dedicated Pomogit database because it revokes schema creation from `PUBLIC`.

Production login, registration, and GitHub initiation share an atomic PostgreSQL counter: 20 attempts per 15 minutes. Expired counters are cleaned during authentication requests; a database/counter failure returns 503. Development retains its local memory limiter. In Lambda, the adapter-provided socket address comes from API Gateway's `requestContext.http.sourceIp`; caller-supplied forwarding headers cannot select the key. The browser calls API Gateway directly through the dedicated API hostname; verify deployed client-address behavior before unrestricted launch. The limiter does not claim per-account protection or prevent distributed abuse across different source addresses. See [AWS's payload documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html).

## Regular updates

With initial provisioning complete, updates use:

```sh
node deploy/aws/cli.mjs push
```

The command verifies the AWS identity and the account/region/domain recorded in Terraform state, packages the app, saves a private PostgreSQL dump locally, records the current Lambda alias and frontend for rollback, updates the IAM-only migration function, applies the supported upgrade migrations, publishes a new API version and moves its `live` alias, uploads static assets with the HTML shell last, invalidates CloudFront, and checks public HTTPS readiness/authentication. It stops on errors and never automatically restores database data. State created before the identity outputs were added requires a reviewed Terraform plan/apply before `init-db`, `push`, or `rollback` can proceed.

Old hashed assets are retained so existing browser tabs and rollback can still load them. Uploads do not delete bucket content. Infrastructure, environment-variable, domain and credential changes require a new reviewed Terraform plan/apply; `push` updates code, not those settings. Use the same local state/config for the chosen deployment. An alternate private config path can be selected with `POMOGIT_DEPLOY_CONFIG`.

Backups use the owner/migration connection and the PostgreSQL 18 client container with certificate verification. The source server must be PostgreSQL 18 or earlier. The dump is outside the served bucket under `deploy/aws/.artifacts/backups`. Keep an encrypted off-host copy; release-time backups are not a scheduled backup policy. Use the [backup/restore drill](../README.md#backup-and-restore-drill) to verify restoration. Monitor Neon's retention/storage allowances separately.

## Rollback

```sh
node deploy/aws/cli.mjs rollback
```

This restores the last recorded API alias and frontend, invalidates the CDN and checks readiness. It requires the local rollback record/assets from the previous `push`. The first publication has no previous frontend to restore. Database migrations/data are not reverted; this code rollback is suitable only while the schema remains compatible. Use the separate verified restore procedure for a data incident, reviewing writes since the backup before changing the connection. Do not delete the database or Terraform state as a rollback strategy.

## Validation and launch boundary

The implementation was checked with frontend lint/tests/build, 17 backend tests against disposable PostgreSQL, deployment guard/maintenance tests, Terraform validation and mocked active/paused plans, native Argon2 in the AWS image, and ten local Lambda emulator checks. Read-only AWS identity/quota and real Neon TLS connections have since been verified. The first AWS apply and public release completed on 2026-10-19; the user confirmed GitHub sign-in and task persistence. See [the live release record](../../design/verification/LIVE_RELEASE.md). Those launch checks are historical evidence; repeat public readiness and signed-in checks after each release. Mocked infrastructure tests do not establish current live permissions or health.

After a real deployment, repeat GitHub login → Home → repository browsing/import → note → focus/pause/reload → complete → logout/login. Confirm cookie flags, duplicate import prevention, data persistence and both billing dashboards. The CLI's automatic `/ready` and anonymous `/api/auth/me` checks are only a smoke check, not that full acceptance flow.


## Pause for a week and resume

After the first deployment, prepare either change from the repository root:

```sh
node deploy/aws/cli.mjs plan-pause
# Review the saved plan, then explicitly apply it:
AWS_PROFILE=pomogit terraform -chdir=terraform apply deploy.tfplan
```

`plan-pause` only prepares a plan and records the desired state in private config;
it does not turn off the live site by itself. Applying it switches all frontend
requests to a maintenance page (503 with Retry-After) at CloudFront, removes the
public API route and removes API Gateway's permission to invoke the Lambda alias.
The API hostname returns an unavailable-route response (normally 404), so existing
tabs cannot continue using the backend. Requests do not invoke the app or query
Neon. Already running requests may finish; the switch is not instantaneous while
CloudFront propagates. IAM-authorized operators can still invoke functions, and
manual/automated database connections can still wake Neon.

Accounts, tasks, database, S3 assets, certificates, DNS records and domain
registration are retained. API Gateway requests that get rejected and CloudFront
maintenance traffic can still have usage charges; DNS, retained storage and
retained logs can still cost money. This is a usage reduction, not a hard budget
cap. Idle Neon compute can suspend if scale-to-zero is enabled. Keep continuous
readiness probes off. No database or cloud infrastructure is destroyed.

To return:

```sh
node deploy/aws/cli.mjs plan-resume
# Review, then explicitly apply the new saved plan:
AWS_PROFILE=pomogit terraform -chdir=terraform apply deploy.tfplan
```

The route, invocation permission and normal frontend behavior are restored.
Verify Home, login, `/ready` and `/api/auth/me` on the API hostname after resuming.
A pause or resume plan may include other pending Terraform changes, so review the
entire plan before applying. Never apply an older saved plan after preparing a new
mode. These commands require the same private config and local state used to
create the deployment. They do not run migrations or rewrite the frontend build.
