# Pomogit / OpenCode handoff

This file is a continuation note for the next coding agent. Read it before changing the repository.

## Product

Pomogit is a local-first developer work/recovery tool, not a generic pomodoro timer. Its core loop is:

`capture outcome -> make it ready -> focus session -> record checkpoint/proof -> continue later or complete -> recover from Worklog`

The app should help a developer answer three questions quickly:

1. What is active or blocked?
2. What should I do next?
3. What changed and where do I resume?

Do not reintroduce productivity scores, streaks, vanity focus totals, fake trends, or duplicate task systems.

## Product model and invariants

- A task/outcome is durable work. It can require multiple focus sessions.
- A focus session is temporary execution state. Ending a session does **not** automatically complete its task.
- A checkpoint/work record is append-only history containing what changed and the next step.
- There is at most one active focus session.
- Board/task state is canonical. Home is a derived view and should not own duplicate data.
- Worklog is chronological evidence/recovery history, not a second Done board.
- Canvas is optional thinking space. Pins must reference canonical task IDs; Canvas must not create an independent task state machine.
- No task should become Done without an explicit completion/evidence action.

## Current information architecture

- **Work**: task lifecycle and the current active/resume strip. Owns Inbox/Ready/Done actions.
- **Tasks**: task-focused workspace surface where task details and ordering are managed.
- **Review**: searchable checkpoint/worklog history. It should make continuation notes and proof easy to find.
- **Profile**: local identity, avatar, recent proof/identity information.
- **Focus**: temporary mode/overlay reached from a task; it should not be an empty permanent navigation destination.
- **Settings**: opened from the profile/account dropdown as a shadcn Sheet/drawer, not duplicated inside Profile.
- **Admin**: only shown for an admin user.

Navigation should stay small and distinct. Every page needs one clear job. Avoid returning to separate Today, Queue, Plan, History, Groups, GitHub, or social surfaces unless there is a new approved product reason.

## Visual direction

The approved visual direction is calm, minimal, editorial and dither-based:

- Dither Kit visuals are the priority for gradients, avatars, charts, fields and hero/background treatment.
- Use restrained blue/neutral colors and avoid the old mechanized gradient buttons.
- Prefer clean stock buttons with no unnecessary border; use dither as a surface treatment, not decoration everywhere.
- The sidebar is outside the rounded workspace wrapper. Account/profile controls live in the shell header/footer.
- Avoid excessive rounded cards, repeated hero slogans, giant metric grids, and pages that all look identical.
- Use shadcn primitives for behavior (Dropdown Menu, Sheet), but keep the product styling Dither Kit-first.
- Motion must be subtle and reversible. `tw-animate-css` is installed because generated shadcn components need it for smooth open/close transitions.
- Respect `prefers-reduced-motion`.

## Current implementation

The active branch is `feat/pomogit-workspace-rebrand`, pushed to:

`https://github.com/zacknguyn/pomodoro-timer/tree/feat/pomogit-workspace-rebrand`

Recent commits:

- `2a574bc refactor(auth): secure workspace sessions`
- `50d7db9 feat(ui): rebrand Pomogit workspace`

The branch is based on `origin/main` at `baa7f0d`. Do not assume it is merged.

Frontend (`frontend/`):

- React + Vite + Tailwind v4.
- Dither components: `src/components/dither-kit/`.
- Main shell and routing state: `src/App.jsx`, `src/App.css`.
- shadcn components: `src/components/ui/dropdown-menu.jsx`, `src/components/ui/sheet.jsx`.
- Account dropdown: `src/components/AccountMenu.jsx`.
- Settings drawer: `src/components/SettingsSheet.jsx`.
- Route fallback: `src/components/WorkspaceRouteSkeleton.jsx`.
- Route chunks use `React.lazy`/`Suspense`; Work, Review, Profile and Admin are lazy-loaded. Sidebar hover/focus prefetches chunks.
- `tw-animate-css` is imported from `src/index.css`.
- Local preview auth bypass is opt-in only: `VITE_DEV_BYPASS_AUTH=false` in `.env.example`.

Backend (`backend/`):

- Express + PostgreSQL. Keep PostgreSQL; do not replace it with Spring or an in-memory production store.
- Auth uses opaque server-side sessions in PostgreSQL and an HttpOnly cookie. Do not bring back browser JWT/localStorage auth.
- Workspace records are ownership-scoped through auth middleware/repositories.
- Migrations: `backend/migrations/001_secure_accounts.sql` and `002_remove_legacy_product.sql`.
- Legacy GitHub/groups/settings/users controllers and repositories were intentionally removed in the rebrand.
- `backend/backend.zip` was intentionally removed.

Infrastructure:

- Terraform and CI files exist as rehearsal/future delivery foundation only.
- AWS has not been made the current hosting dependency. Do not mutate AWS or deploy without an explicit new request.
- The immediate priority is local app quality and frontend UX.

## How to run locally

From the repository root, use separate terminals:

```sh
cd backend
npm install
cp .env.example .env
# Set DATABASE_URL to a local PostgreSQL database
npm run dev
```

```sh
cd frontend
npm install
npm run dev
```

Frontend defaults to `http://localhost:5173`; backend defaults to `http://localhost:3000`.

Useful checks:

```sh
cd frontend
npm run lint
npm run build
npm test

cd ../backend
npm run check
npm test
```

At the time of handoff, frontend lint/build/tests pass (10 tests) and backend syntax/tests pass (4 tests). `npm audit --omit=dev` previously reported zero vulnerabilities for both packages.

## Important current workspace state

The worktree may contain an untracked `APP_CONTEXT_FOR_REVIEW.md`. It is a user review artifact and was deliberately not committed. Preserve it unless the user explicitly asks to edit/delete it.

Before editing:

1. Run `git status -sb`.
2. Read the relevant current source; do not rely only on this note.
3. Preserve unrelated user changes.
4. Do not reset, force-push, delete data, or deploy infrastructure without explicit approval.
5. After changes, run the narrow tests plus `git diff --check` and report what was actually verified.

## Next likely work

The next work should be UX refinement, not a new infrastructure migration:

- Run the local frontend and inspect the real browser at desktop and mobile widths.
- Audit whether Work, Tasks and Review are sufficiently distinct and understandable.
- Verify dropdown and Settings Sheet keyboard behavior, focus return, Escape close, and reduced-motion behavior.
- Verify lazy route skeletons do not cause blank flashes or layout shifts on cold load.
- Improve task details/checkpoint flows only after checking the current data model and API ownership rules.
- Add account registration/login UI integration only with the existing secure server-session model; never add secrets or tokens to frontend storage.

When uncertain, stop and explain the product/architecture tradeoff before adding another page or another state system.

## Suggested first instruction for OpenCode

> Read `OPENCODE_HANDOFF.md`, then inspect the current branch and source before editing. Do not assume this note is complete. Start by running the frontend/backend checks and reviewing the current Work, Tasks, Review, AccountMenu, SettingsSheet and auth/session code. Propose a small, reviewable UX plan first. Keep Dither Kit as the visual priority, shadcn as behavior primitives, PostgreSQL/server sessions as the backend model, and do not deploy AWS or add a second task/state system.
