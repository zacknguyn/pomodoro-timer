# Manual production deployment

For the selected AWS + Neon showcase setup and repeatable push command, use [the AWS deployment guide](./aws/README.md). The instructions below remain the portable single-host alternative.

Status: preparation and local rehearsal only. No hosting, DNS, AWS resources, or public certificates have been configured. The owner already has a domain; select a host before carrying out this runbook.

## Supported shape

Use one public HTTPS origin for the frontend and `/api`. The supplied examples target a Linux host with Node.js 24, PostgreSQL 16, systemd and Caddy. They are portable examples, not a requirement to buy a VPS or use a particular provider. A managed host must provide equivalent routing, environment settings, persistent PostgreSQL and restart behavior.

```text
https://your-domain → Caddy → frontend/dist
                         → /api/*, /health, /ready → loopback Express
                                                    → PostgreSQL
```

The backend trusts one proxy hop. Keep its listener private, and have the public proxy replace client-supplied forwarding headers. Do not put another public route directly to Node. Caddy's default reverse proxy handling supports this shape; extra proxy/CDN layers require reviewing the Express trust setting. See [Express proxy guidance](https://expressjs.com/en/guide/behind-proxies/) and [Caddy reverse proxy documentation](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy).

## Prepare a release

1. Review and commit the intended application changes when ready. Use an explicit commit ID as the release name. Do not build from an unreviewed working tree.
2. On a build machine with Node.js 24, run:

   ```sh
   cd frontend
   npm ci
   npm run lint && npm test
   VITE_API_URL=/api VITE_DEV_BYPASS_AUTH=false npm run build
   cd ../backend
   npm ci
   npm run check && npm test
   ```

3. Stage that release under `/srv/pomogit/releases/<commit>/`, including `backend` and the built `frontend/dist`. Install backend runtime dependencies there using `npm ci --omit=dev`. Native password hashing dependencies must be installed for the server's OS/architecture. Do not copy a developer's `node_modules`, `.env`, screenshots or database dumps.
4. Use a dedicated unprivileged `pomogit` system user. Keep release files read-only to it and the static files readable by Caddy. The examples use `/srv/pomogit/current` as a symlink to the selected release. Keep the previous release directory for rollback.

## Environment and GitHub

Copy `backend.env.example` to a private file outside the release, such as `/etc/pomogit/backend.env`. Allow only the owner/service account to read it (mode 0600, or a root-owned service-readable 0640 file). Populate actual values privately. Never place secrets in `VITE_` variables.

- Set `FRONTEND_URL=https://your-domain` exactly, without a path or trailing slash.
- Use the same domain for static files and `/api`; the production session uses a host-only `Secure`, `HttpOnly`, `SameSite=Lax` cookie.
- Set all three GitHub variables for GitHub login. The callback must be `https://your-domain/api/auth/github/callback`, matching the OAuth App settings exactly. Prefer a separate production OAuth App so local sign-in keeps working.
- Use `DATABASE_SSL=true` for a remote database. Supply its trusted CA through `DATABASE_CA_CERT` if needed. Only loopback PostgreSQL may use `DATABASE_SSL=false` in production.
- Remove query parameters from `DATABASE_URL` and use the explicit TLS variables. Connection-string SSL options can replace node-postgres's configured CA and verification settings; see [node-postgres SSL guidance](https://node-postgres.com/features/ssl).

With the production environment loaded by your service/host, run:

```sh
cd /srv/pomogit/current/backend
npm run check:production
```

This check validates configuration without printing secrets or connecting to the database. Startup also runs the same validation. It does not verify DNS, OAuth App settings at GitHub, the public certificate, or database credentials.

## Database initialization and upgrades

Use the app's production environment for these commands. First confirm the target database with its administrator. Never use `db:init` as an upgrade command.

- A new, empty database: `npm run db:init` in `backend`.
- An existing supported Pomogit database: back it up and rehearse on a restored copy first. Review which migrations it needs. The named commands correspond to:

  | Command | Migration |
  | --- | --- |
  | `npm run db:migrate` | `001_secure_accounts.sql`: legacy account ownership |
  | `npm run db:workspace` | `003_workspace_details.sql`: task details and In progress |
  | `npm run db:github` | `004_github_login.sql`: GitHub identity and OAuth state |
  | `npm run db:projects` | `005_github_projects.sql`: repository connections/import identity |
  | `npm run db:auth-limits` | `006_auth_rate_limits.sql`: shared production authentication counters |
  | `npm run db:auth` | `007_better_auth.sql`: preserve user IDs and import credentials into Better Auth |

`db:migrate` runs only migration 001, not all migrations. Apply required migrations in the listed order, with the old app stopped or writes paused. Migration 001 refuses to guess ownership of unowned legacy tasks when multiple users exist. Older unsupported schemas need inspection rather than automatic changes. There is no migration ledger or automatic startup migration.

`db:cleanup-legacy` is destructive and is excluded from this deployment path. Do not run it as routine setup.

Production authentication requires migration 006 before restarting the updated API. For a restricted runtime login, run migrations with the separate schema-owner connection. New databases initialized with `db:init` already include the counter table. See the [AWS role setup](aws/README.md) for separate API/migration credentials and grants.

Better Auth also requires migration 007 and a stable private `BETTER_AUTH_SECRET` of at least 32 random characters before starting this version. Existing user IDs, password hashes, GitHub identities, and task ownership are preserved. Existing browser sessions require sign-in again. The historical auth tables remain for rollback investigation but are no longer accepted by the application. Refresh runtime grants after migration. Never run Better Auth's automatic schema migration with the restricted API login.

## Backup and restore drill

Use the PostgreSQL client tools for your server version (these examples use version 16). Store credentials in a private libpq service/password file or your host's secret tooling, not command-line database URLs. Define `service=pomogit` for the source and `service=pomogit_restore` for a **separate empty restore database**. These client service names are independent of Node's `DATABASE_URL`. See [PostgreSQL connection service files](https://www.postgresql.org/docs/16/libpq-pgservice.html).

With a private writable backup directory prepared:

```sh
umask 077
backup_file="/var/backups/pomogit/pomogit-$(date -u +%Y%m%dT%H%M%SZ).dump"
pg_dump --dbname='service=pomogit' --format=custom --no-owner --no-acl --file="$backup_file"
pg_restore --list "$backup_file" > /dev/null
```

The archive includes private account data. Keep it outside the served tree, encrypt an off-host copy using your provider's backup tooling, and schedule regular backups before launch. A valid archive listing alone is not proof of restoration.

Have the database administrator create a separate empty restore database owned by the intended application role. Point the restore service at it, then run:

```sh
pg_restore --dbname='service=pomogit_restore' --single-transaction --exit-on-error --no-owner --no-acl "$backup_file"
```

No `--clean` is needed for an empty database. Check users, tasks and notes, ended/paused focus sessions, checkpoints and repository connections. Start an isolated app against the restored database and verify sign-in and the workspace. Do not send real users to it during the drill. The archive does not back up cluster roles, TLS certificates, the OAuth secret, browser-local appearance/profile preferences, or hosting configuration; keep those separately.

The automated local rehearsal is:

```sh
POMOGIT_RUN_DISPOSABLE_CHECK=true node design/verification/check_production_readiness.mjs
```

It creates its own loopback PostgreSQL container with no shared volume, initializes the schema, applies the supported migrations twice to seeded current-schema data, runs opt-in backend tests, dumps/restores into another empty database, compares restored workspace records and checks import uniqueness. It removes the container and test data afterward. This is not proof that an arbitrary historical database upgrades safely.

To include the built frontend behind the real Caddy proxy with production-mode session cookies, first build `frontend/dist` and make `caddy:2-alpine` available locally, then run:

```sh
POMOGIT_RUN_DISPOSABLE_CHECK=true \
POMOGIT_PLAYWRIGHT_MODULE=/path/to/playwright \
node design/verification/check_production_readiness.mjs
```

The proxy/browser check uses loopback HTTPS and a temporary local certificate, with certificate errors ignored **only in that test browser**. It verifies routing, registration, production cookie acceptance and reload. It does not prove public certificate trust, DNS or GitHub OAuth on the final domain. Evidence is written under `/tmp/pomogit-production-readiness/` without test credentials.

## Start and check the release

After the host and release directory are prepared:

1. Copy `pomogit.service` to the server's systemd configuration and verify the Node binary path. It loads `/etc/pomogit/backend.env`, checks production settings, and runs Node on loopback. It does not create the OS account or database and does not run migrations.
2. Replace `pomogit.example` in `Caddyfile` with the selected domain and install it as the Caddy configuration. Keep the document root limited to `frontend/dist`. Validate it with `caddy validate --config /etc/caddy/Caddyfile` before reload.
3. When ready to go public, point the domain's DNS records at the chosen host using its existing DNS provider. Route 53 is not required. Ensure the host accepts ports 80/443 and Caddy can retain its certificate state. Caddy provisions/renews HTTPS for a qualifying domain; see [its HTTPS requirements](https://caddyserver.com/docs/automatic-https).
4. Start PostgreSQL, then enable/start the API service and reload Caddy. Backend port 3000 and PostgreSQL port 5432 must remain private. Do not run Vite's dev/preview server as the public server.
5. Check `https://your-domain/health` (process alive) and `/ready` (database accepts a query). `/ready` returns 503 on database failure; it does not check migration completeness. Verify migrations separately before traffic.
6. Open the site with normal certificate validation. Check landing, login, hashed static assets, public profile paths, and a missing `/assets/...` returning 404 rather than HTML.
7. Repeat GitHub login → Home → connect public repository → import → save note → focus/pause → reload → complete → logout → login. Confirm duplicate import creates no additional task and the browser receives `__Host-pomogit_session` with Secure/HttpOnly/SameSite=Lax and no Domain attribute.

Keep access logs from recording full OAuth callback query strings. The template does not enable request access logging. Do not log cookies, Authorization headers, tokens or complete database URLs in hosting dashboards. API request failures are not a reason to enable auth bypass.

## Rollback

For a code-only regression with a compatible schema: pause writes, stop the API service, change `/srv/pomogit/current` back to the recorded previous release, restart the API, reload Caddy, and repeat `/ready`, sign-in and task checks. Preserve both releases' hashed static assets during the switch if supporting already-open browser tabs; otherwise users may need a reload.

There are no automatic down migrations. Do not reverse a migration by dropping columns or restore over the live database. For an incompatible schema or data incident, stop writes, retain the current database for investigation, restore the verified pre-release archive into a separate database, and review the data-loss window before switching the app's connection. Writes made after the backup are absent from that restored database. Revoke restored login sessions before reopening service if the incident could involve session credentials.

Public hosting, scheduled encrypted backups, alert routing, certificate issuance and live rollback remain deployment-stage checks. They have not been performed by preparing these files.
