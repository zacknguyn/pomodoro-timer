# Pomogit: continuation handoff

Updated 2026-10-20 after the frontend loading release and user confirmation.
This file is portable context for Claude, Codex, or another coding assistant. It is not
permission to make new production changes. User instructions and inspected current
source take precedence over this snapshot.

## Start here

1. Read this file, `README.md`, `design/verification/LIVE_RELEASE.md`, and
   `design/verification/FLOATING_NAVIGATION.md`.
2. Inspect `git status`, the current branch, and recent commits. Preserve unrelated edits.
3. Read the relevant source before proposing changes. Check the scope with the user;
   there is no unfinished redesign or deployment to automatically resume.
4. For new UI directions, build an isolated HTML preview and get approval before React
   integration. Small fixes within the approved design can proceed when requested.
5. Run the relevant checks. Commit, push, deploy, change cloud resources, or run live
   migrations only when the user authorizes that work. Honor approvals already given
   for the active task; do not ask again for each routine implementation step.

The old root redesign plan and OpenCode handoff were explicitly retired as references.
Do not revive their Phase 1 restrictions or old branch instructions. This is now a
live account-backed app; the development mock remains a separate review tool.

## Current release and evidence

- Repository: `https://github.com/zacknguyn/pomodoro-timer`; branch at handoff: `main`.
- Current release source: `c37fb248a69ac485f0e099dd75c2ebf934b3fdb7`.
- Previous performance release source: `625bcd2f7c72d6200f4af4c19da73f43154ce432`.
- Previous navigation release source: `235c9b23d777f6287b3c26b47928b08d7582ea6b`;
  its documentation commit was `93274e3`. Inspect HEAD and remote state; this
  latest release-record update may still be uncommitted.
- Live frontend: `https://pomogit.live`; API: `https://api.pomogit.live`.
- The 2026-10-20 deployment completed: backup, rollback snapshot, supported upgrade
  migrations, API Lambda version 5/live alias, frontend upload and CloudFront refresh.
  The API was published before the frontend; version 4 and the previous frontend
  from `625bcd2` remain the current rollback target. No Terraform apply was needed.
- Public readiness returned 200; anonymous `/api/auth/me` returned 401. Public HTML
  matched the production build. Desktop/phone public pages and GitHub handoff passed.
- The earlier navigation release passed 132 navigation assertions with intercepted API fixtures.
  The preceding local workflow pass covered 476 browser assertions, including capture,
  focus, completion, recorded figures, empty states, keyboard navigation and long menus.
- The earlier performance release passed 217 dashboard assertions against its
  deployed frontend with intercepted APIs, plus public desktop/phone login checks.
- After the performance release, the user confirmed GitHub sign-in returns Home and
  existing Board tasks and dashboard history look correct. This is user-reported
  manual verification, not automated account access.
- The latest loading release passed deployed desktop/phone font and public-screen
  checks with intercepted account APIs: all four WOFF2 fonts loaded, no raw TTFs
  were requested, and signed-in Home excluded the public screen chunks. Vietnamese
  text, layout overflow and browser exceptions were checked. The user separately
  confirmed Home and Board look correct; this does not prove a fresh OAuth flow.
- No next feature is approved just because this release is complete. If the user has
  given a new task, act on it; otherwise ask what they want next. Suggest focused
  improvements before adding pages or replacing systems.

Local-only skill/editor files and old notes were deliberately left out of the release.
Do not stage everything blindly. In particular, preserve `.codex/`, installed local Neon
skills, `skills-lock.json` edits, and root review notes unless their inclusion is requested.

## Performance release changes

These changes first shipped in API version 4 after the navigation release and
remain in the current release:

- Removed unreachable helpers/components and unused/overwritten CSS. Consolidated
  auth/workspace HTTP transport, preserving errors, credentials and 401 behavior.
- Indexed task/checkpoint history, deduplicated overlapping refreshes and retained
  fresh reads after mutations. Projects use an account-scoped, 60-second memory cache
  invalidated by repository changes.
- Added authenticated, owner-scoped `GET /api/sessions`. Normal refreshes use it
  instead of fetching a full workspace export; export downloads remain available.
- Chart loops sleep offscreen/while hidden and settle in reduced-motion mode, with
  keyboard inspection and app/OS preference changes waking them correctly.
- Fixed the navbar dashboard at 1440×768 while keeping mobile/sidebar visuals intact.
- Local verification: frontend lint, 11 test files, production build and diff checks;
  217 dashboard browser assertions; eight opt-in integration tests passed against
  disposable PostgreSQL 17.11. The temporary database/container was removed.
- Real database tests covered ownership, persistence, session/export parity, auth
  migrations, restricted permissions and shared auth limits. GitHub provider replies
  were mocked; these are not fresh live OAuth or production Neon/AWS checks.

See `design/verification/CODE_CLEANUP.md`, `WORKSPACE_PERFORMANCE.md`, and
`DASHBOARD_DATABASE_VERIFICATION.md`. The latter two paths are relative to
`design/verification/`. Browser scripts share `design/verification/browser.mjs`;
`check_workspace_performance.mjs` records local fixture request/rendering measurements.

The release published the backward-compatible backend endpoint before its frontend.
No new schema migration was required; the existing guarded upgrade path was retained.

## Frontend loading release

The frontend loading pass is deployed from `c37fb24` through the existing guarded
release workflow. Both GitHub CI runs passed before publication.
See `design/verification/FRONTEND_LOADING.md` for measurements and verification.
Public screens load on demand alongside session restoration; existing auth gating
and retry remain intact. The four application fonts use WOFF2 with their complete
character coverage retained, including Vietnamese. Original TTFs remain under
`design/fonts` for archived previews. No runtime dependency was added.

The local throttled Home measurement improved about 19%; public pages have an extra
chunk request and their single local timing samples are not a speed guarantee.
Lint/tests/build, 96 visual states, final public-page comparisons and mocked auth
expiry/error/retry checks passed. Inspect git history and the live release record:
repository HEAD can include changes newer than deployed source `c37fb24`.
Live package and HTML identity, readiness, anonymous access boundaries, public
GitHub authorization handoff and desktop/phone font checks all passed. See
`design/verification/LIVE_RELEASE.md` for the evidence and rollback target.

## Product and workflow

Pomogit is a developer work companion alongside GitHub, not an admin dashboard.

- **Home**: the signed-in landing dashboard, with recorded focus/completion data,
  project/status breakdowns, activity and drill-downs.
- **Board**: capture and organize through **Inbox → Ready → In progress → Done**.
- **Workspace**: choose one task, keep its next step/context visible, and focus on it.
- **Activity**: inspect saved focus, completions, notes and changes.
- **Profile**: expressive developer identity, selected work and history/heatmaps.
  Profile customization and visitor preview are browser-local; a public shareable
  `/p/github_username` profile is an idea, not a completed feature.
- **Settings** is a dialog. Navigation, palette, brightness, density and motion already
  have controls; do not turn every choice into another dropdown.

Task popups are read-only first, with explicit Edit and Work on this actions. Editing
keeps the title/footer controls fixed while the middle scrolls; properties live on the
right. Cancel discards unsaved edits. Starting focus moves a task to In progress;
opening a task does not start a timer. Stopping focus records time but does not complete
the task. Completion is quick, with an optional Add note action afterward.

GitHub sign-in establishes identity; it does not automatically import repositories or
tasks. Repository selection/connection and selected issue import are separate actions.
Current repository access is public-only. Removing a project keeps its Pomogit tasks
and clears their project label. Deleting a task removes its Pomogit history after
confirmation; an active/paused timer must be stopped first. GitHub data is unaffected.

## Design preferences and the approved navigation

The user dislikes generic or incoherent UI, excessive decoration, hard-to-scan spacing,
confusing controls, long horizontal divider lines, tiny low-contrast metadata, and
unexplained icons. Aim for compact, readable, tactile controls with useful hover/focus
feedback. Desktop and mobile matter equally. Do not restart the visual direction.

- Preserve the approved violet/pink Electric palette and alternate Sage palette, with
  light/dark/system brightness. Use shared app tokens; separate content palettes or
  gradients previously caused visible rectangular background seams.
- Settings selects a wide floating top navbar or a detached pill sidebar. Both have
  direct Home/Workspace/Board/Activity controls and a separate Projects menu.
- Desktop sidebar is a compact icon rail with hover/focus labels and account controls.
  On phones it becomes a bottom pill; Navbar remains compact top navigation. More
  contains mobile Profile, Settings, projects and account actions.
- Avatars must remain **Dither Kit**, with a stable identity-derived pattern/color.
  Render the full pattern on first paint, replay on hover/focus, respect reduced motion.
  The user rejected a dark tile behind the avatar. Light-mode contrast is adjusted.
- The focus timer must be distinctive, with compact/expanded/maximized states. Keep
  floating timers, popups and dismissible notifications clear of the navigation.
- The last bug fixed: notifications after Undo could sit behind the phone sidebar pill.
  `--wb-mobile-nav-clearance` now shares safe-area-aware clearance between those layers.
- Dashboard charts use retained Dither Kit renderers with readable gradient/hatched
  fills and hover inspection. Do not replace them with coarse pixel-only charts.

Use existing tools/components before introducing dependencies or state systems. The
project has an Impeccable skill at `.agents/skills/impeccable/SKILL.md`. The user also
likes the installed evondev `ui-ux` skill and Ponytail's minimal-change approach; those
global tool installations may not exist on another machine. Install/configure skills
separately if needed; do not copy private tool configuration to another provider.

## Code map

- `frontend/`: React 19, Vite 7, Tailwind v4 plus component CSS, Lucide, Motion, Dither Kit.
  Node must satisfy package engine requirements (currently >=22.12; CI/Lambda use 24).
- `frontend/src/App.jsx`: auth restoration, routing, preferences. Routes are hashes:
  `#home`, `#work`, `#tasks`, `#review`, `#profile`, plus public auth/landing and gated Admin.
  UI labels differ from internal route names; retain compatibility in `lib/navigation.js`.
- `components/Workbench.jsx`, `Workbench.css`, `WorkbenchPanels.jsx`: navigation,
  Board/Workspace, task/focus flows, dialogs and Settings.
- `DashboardView`, `ActivityView`, `ProfileView`: their respective pages and styles.
- `GithubRepositoryDialog.jsx`: project management, connection/import and removal.
- `lib/workApi.js`, `authApi.js`: API clients. `lib/preferences.js`: per-account browser
  profile/appearance settings. `lib/runtime.js` and `mockWorkspace.js`: dev-only mock.
- `lib/dashboard.js`, `activity.js`, `profileHistory.js`, `sessionClock.js`: derived data;
  reuse these calculations instead of adding a competing statistics layer.
- `components/dither-kit/`: existing avatar/charts and upstream attribution.
- `backend/`: Express + PostgreSQL. `src/lib/auth.js` integrates self-hosted Better Auth;
  `src/app.js` exposes the secured API. Controllers/repositories enforce ownership.
- `backend/src/lambdas/app.js`: deployed app adapter. `lambdas/migrate.js`: separate
  IAM-only migration entrypoint. `migrations/`: supported, ordered SQL changes.
- `design/`: HTML previews and verification scripts/reports. `floating-sidebar-preview.*`
  preserves the approved comparison; it is not the production implementation.
- `terraform/`: infrastructure. `deploy/aws/`: guarded manual packaging/release tooling.

## Accounts, data and safety boundaries

Production uses real accounts and PostgreSQL on Neon. Better Auth runs in our AWS API;
this is **not** Neon Managed Auth, a browser-to-database connection, or a mock backend.
Task/project/note/focus data belongs to the account. Profile and appearance preferences
remain in account-scoped browser storage. Mock records never automatically become
real account data. Public profile publishing and password recovery are not connected.

Production sessions use the host-only `__Host-pomogit_session` Secure/HttpOnly cookie.
Retain session/CSRF/origin protections, owner isolation, restricted runtime DB access,
admin gates and shared database-backed auth limiting. Do not introduce client-stored
session tokens or persist GitHub provider tokens. Existing account IDs and task
ownership are preserved by the Better Auth migration.

Never print, commit or transmit `.env` values, OAuth secrets, database passwords/URLs,
AWS credentials, Terraform state/plans, backup dumps, or private MCP configuration.
Relevant ignored local files include `backend/.env`, `frontend/.env`,
`deploy/aws/backend.env`, `deploy/aws/config.json`, `deploy/aws/.artifacts/`, and
Terraform runtime files. Transfer source and safe examples, not those private files.

## AWS operating context

Release target: AWS account `730335441285`, profile `pomogit`, region `us-east-1`.
These are the last verified deployment coordinates; verify again before operating.

```text
Name.com registration → Route 53 DNS
  pomogit.live     → CloudFront + ACM → private S3 frontend
  api.pomogit.live → API Gateway + ACM → app Lambda → Neon PostgreSQL
                                                    ↘ GitHub OAuth/public API
```

There is a separate IAM-only migration Lambda and schema-owner DB connection. Runtime
uses `pomogit_runtime`. The default execute-api endpoint is disabled. The low-traffic
budget target is under US$10/month excluding the domain, not a guarantee or spending
cap. Avoid adding RDS, VPC/NAT, provisioned concurrency or keep-warm jobs without a
cost/scope discussion. Budget alerts do not stop spending.

Read `deploy/aws/README.md` before deployment. Root commands:

- `node deploy/aws/cli.mjs check`: verify config, AWS identity and database roles.
- `node deploy/aws/cli.mjs push`: production build/checks, private backup, rollback
  snapshot, upgrade migrations, Lambda publication, S3 upload, invalidation and smoke.
- `node deploy/aws/cli.mjs rollback`: previous code/frontend, **not** automatic DB restore.
- `node deploy/aws/cli.mjs plan-pause` / `plan-resume`: plan only. Review and authorize
  application separately. Pausing blocks the website/public API while keeping data;
  it reduces usage charges but does not make the account free.

AWS login can expire even for this IAM-user setup. The last recovery was
`aws login --profile pomogit`, completed by the user. Never disable the account/region
guards or ask the user to paste keys. Do not repoint the production GitHub OAuth App
to localhost for testing: the production callback is
`https://api.pomogit.live/api/auth/github/callback`.

## Local review and verification

From `frontend/`:

```sh
npm run lint && npm test && npm run build
VITE_DEV_BYPASS_AUTH=true npm run dev -- --host 127.0.0.1 --port 5173
```

The second command is an explicit development-only sample-data review. Keep auth/API
enabled for account-mode testing. Production builds always use real accounts; the
release tool explicitly builds with the production API URL and bypass disabled.
Normal Vite `/api` requests proxy to `127.0.0.1:3000`; the local backend must actually
be running/configured for real local account checks. Never assume old servers persist.

From `backend/`: `npm run check && npm test`. Database-dependent tests are opt-in;
inspect their requirements and use a disposable test database, never live Neon data.
The deployed release packaging run passed 9 backend tests and skipped 8 DB-dependent
tests; the subsequent disposable-database pass above ran all eight integration tests.

From root: `git diff --check`; before committing, also `git diff --cached --check`
(unstaged diff checks do not cover new untracked files). For infrastructure changes:
`terraform -chdir=terraform fmt -check`, `validate`, and mocked `test`.

Browser suites in `design/verification/`:

- `check_floating_navigation.mjs`: isolated account API fixtures; layout, menus, long
  projects, settings persistence, viewport bounds, indicators and timer clearance.
- `check_first_use.mjs`: intercepted repository/capture/import/undo/completion flows.
- `check_focus_finish.mjs`: dev mock; timing, pause/resume/expiry, completion and undo.
- `check_recorded_work_flow.mjs`: dev mock; full journey, keyboard/focus, exact recorded
  figures, history drill-down and Profile, across layouts and themes.

Scripts use an installed Playwright module selected through
`POMOGIT_PLAYWRIGHT_MODULE`; inspect their URL/environment settings before running.
No need to add Playwright to app dependencies just to reuse these scripts. Keep
screenshots/caches outside source unless they are deliberate review artifacts.

**Evidence rule:** mocked/intercepted UI checks prove UI behavior only. Public `/ready`,
anonymous auth and OAuth handoff checks do not prove a completed login. Clearly
separate automated fixtures, actual public checks, and user-reported account checks.
Request manual sign-in when needed; never access a personal browser profile, handle
credentials, or silently create/alter live tasks to manufacture a passing test.

## Suggested first message from the next assistant

“I’ve read the handoff and inspected the checkout. The floating-navigation release is
complete and live. Here is the current branch/worktree state and the scope I understand
for your next request.” Then address the user's new request; do not repeat completed work.
