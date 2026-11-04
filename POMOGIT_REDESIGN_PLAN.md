# Pomogit Redesign — Phase 1 Plan (Approved 2026-09-21)

Source of truth. Update this file when scope changes. Do not hallucinate files/routes that are not listed here.

## 0. Ground truth (verified 2026-09-21)

- Branch: `feat/pomogit-workspace-rebrand` (commits `2a574bc`, `50d7db9` on top of `baa7f0d`).
- Untracked, must preserve: `APP_CONTEXT_FOR_REVIEW.md`, `OPENCODE_HANDOFF.md`.
- Frontend (`frontend/src/`):
  - `App.jsx` — shell, hash routing, `VIEW_LOADERS` (work/tasks/review/profile/admin all lazy). Work+Tasks both render `components/WorkScreen.jsx` with `mode` prop.
  - `components/WorkScreen.jsx` — `NowCard`, `ReadySection`, `InboxSection`, `DoneSection`, `TaskCollection`, `TaskDrawer`, `FocusOverlay`, `CheckpointOverlay`.
  - `components/ReviewScreen.jsx` — By-task / Timeline, search + task/date/state/evidence filters.
  - `components/ProfileView.jsx` — localStorage identity + last 3 checkpoints (derived).
  - `components/AccountMenu.jsx` — sidebar/pagebar/mobile variants, shadcn Dropdown.
  - `components/SettingsSheet.jsx` — shadcn Sheet, appearance/protocol/data/security.
  - `components/WorkspaceRouteSkeleton.jsx` — per-view skeleton copy.
  - `lib/navigation.js` — `WORKSPACE_VIEWS = ['work','tasks','review','profile','admin']`.
  - `lib/authApi.js`, `lib/workApi.js`, `lib/preferences.js` — cookie sessions, no frontend tokens.
  - `index.css:62` + `globals.css:154` — global `prefers-reduced-motion` kill-switch.
- Backend (`backend/src/`):
  - `app.js` — Express, `/api/auth`, `/api/tasks`, `/api/sessions`, `/api/checkpoints`, `/api/export`, `/api/admin`.
  - `middleware/authMiddleware.js` — opaque HttpOnly cookie (`pomogit_session` / `__Host-pomogit_session` in prod), `DEV_BYPASS_AUTH` local-only.
  - Postgres. No Spring, no in-memory prod, no JWT.
- Checks passing at plan time: frontend lint + 39 tests + build; backend `check` + 7 tests.

## 1. User-approved phasing

- Phase 1 (NOW): looks good + feels functional. No DB migrations, no AWS.
- Phase 2 (LATER): DB hardening behind approved UI.
- Phase 3 (MUCH LATER, separate approval): AWS deploy. Do not touch `terraform/` or CI deploy now.

## 2. Phase 1 scope

Goal: 3 clear routes, no duplicated Ready list, no blank flashes, mobile + desktop clean.

Target IA:
- `Now` — active outcome, Start/Pause/End, next-step line, collapsed Inbox (max 20). Replaces current Work.
- `Trail` — chronological evidence grouped by outcome, search + filter, Resume button. Replaces current Review (rename only if approved; else keep route name `review`).
- `Profile` — identity editor + derived recent evidence. Unchanged data source (localStorage + review API).
- `Focus` — overlay only, never a nav destination.
- `Settings` — Sheet from AccountMenu only.
- `Admin` — hidden, role-gated, untouched.

Explicit non-goals (Phase 1):
- No new tables/migrations.
- No auth model change (keep server sessions).
- No new pages: Today/Queue/Plan/History/Groups/GitHub/social.
- No scores/streaks/vanity totals.
- No AWS/Terraform/CI deploy changes.

## 3. Phase 1 steps

1a. Routing/IA cleanup:
- `lib/navigation.js`: decide final view list (propose `['now','trail','profile','admin']` OR keep `['work','tasks','review',...]` with Tasks merged into Now — needs user pick before edit).
- `App.jsx`: remove Work/Tasks duplication; single Now entry; keep lazy + prefetch; keep hash routing.
- `WorkScreen.jsx`: merge ReadySection so it renders once; Inbox becomes collapsed section in Now.

1b. Visual pass:
- Dither Kit first, restrained blue/neutral, single 720–960px column.
- Skeletons per route, no layout shift, reduced-motion respected (already global).
- Verify AccountMenu 3 variants + Settings Sheet Escape/focus-return.

1c. Verify:
- `cd frontend && npm run lint && npm test && npm run build`
- `cd backend && npm run check && npm test`
- `git diff --check`, `git status -sb`.

## 4. Open decision (needs user answer before 1a edits)

- Rename routes `work->now`, `review->trail`, drop `tasks`? Or keep URL names and only merge UI?
- Recommendation: keep URLs (`work`, `review`) for now to avoid breaking hashes/bookmarks; merge UI first, rename later.

## 5. Progress log

- 2026-09-21: Plan approved. Phase 1 documented. No code changes yet.
- 2026-09-21: Phase 1a slice 1 done — `WorkScreen.jsx:ReadySection` split into Work preview (`mode='work'`, max 3, no Details, `Manage all in Tasks` link) vs Tasks full management (expanded toggle + Details). URLs kept (`work`/`tasks`). Frontend lint + 39 tests + build pass, `git diff --check` clean.
- 2026-09-21: Auth gate disabled per user request (Phase 1 UI-only). `App.jsx:DEV_BYPASS_AUTH = true` hardcoded with re-enable note. No `.env` needed. Re-enable in Phase 2.
- 2026-09-21: All workspace API mocked per user request. New `frontend/src/lib/mockWorkspace.js` (localStorage `pomogit.mock.v1`, seed: 4 ready / 3 inbox / 2 done + 4 checkpoints, full session/checkpoint/review/export surface). `workApi.js:USE_MOCK = true`. No backend needed. Remove in Phase 2 by deleting mock + setting flag false.
- 2026-09-21: Phase 1b slice 1 done — theme radiogroup keyboard (ArrowLeft/Right, `role=radio` + `aria-checked`, CSS match), Work preview note styled (`.is-preview`), mobile topbar nav scrolls instead of squeezing. Lint + 39 tests + build pass.

## 6. Revised direction approved 2026-10-01

This section supersedes the earlier IA and Dither-first visual direction.

- Primary workspace: **Board**. Retire the separate Tasks/Work destinations.
- **Focus** is a temporary execution view with current task and a compact context list.
- **Activity** replaces Review in user-facing language. Profile and Settings live under account controls.
- Visual direction: Linear's quiet styling with Jira-style board/task dialog; compact and calm, no required Dither treatment.
- Desktop: movable cards in Inbox / Ready / In progress / Done. Visible title, next step, project, latest change note. Explicit status controls provide keyboard/touch alternatives to dragging.
- Mobile: compact list with status and project filters, full-screen task editor.
- Capture: required title and next step; optional reusable project and reference link.
- Editable task dialog: title, next step, project, reference, status, existing notes, append new note.
- Starting focus moves Ready to In progress. Ending focus stops the session immediately, keeps the task In progress, and offers optional Add note. Task completion stays explicit.
- In progress and reusable projects extend the **existing frontend mock model**, preserving existing stored tasks. No parallel task/state system.
- UI-only boundary continues: auth disabled, workApi mocked, no backend, migrations, AWS, Terraform, or deployment changes. No commit unless asked.

### Review checkpoint

- User approved Board + temporary Focus naming and the revised direction.
- `design/board-proposal.html` is an isolated interactive proposal with disposable sample data; it does not access application storage or APIs.
- Review the desktop/mobile composition and task/focus interactions before implementing the application redesign. No application redesign changes made in this proposal slice.
- Remaining app work includes Activity, Profile, Settings, account controls, entry/auth/Admin styling, route skeletons, light/dark themes, errors/empty states, keyboard focus and reduced motion.

### Visual revision requested after prototype review

- User rejected the quiet neutral prototype as insufficiently distinctive, colorful, and pressable, especially its sidebar.
- Confirmed replacement: dark plum canvas, lilac and mint accents, softly raised controls; structured sidebar with a strong brand area, project shortcuts, and distinct account footer; expressive color across board columns and cards.
- Revised only the isolated design proposal and its documentation. Application implementation remains at the design review checkpoint.

### Independent workbench exploration

- User rejected the plum prototype as too generic and requested impeccable with a fresh design independent of current UI/palette.
- `design/workbench-proposal.html` explores chalk/graphite surfaces, deep red action accents, open board lanes, typographic navigation, and Barlow / Bricolage typography.
- Existing plum prototype retained for comparison. Application remains untouched by this exploration.
- This is a proposal for visual review, not a newly approved implementation direction.

### Continue-first skeptical-user exploration (2026-10-02)

- User approved exploring a low-upkeep GitHub companion, revising mandatory planning and next-step-at-capture requirements.
- `design/CONTINUE_PROPOSAL.md` defines concrete behavior and the later UI-only implementation slices.
- `design/continue-proposal.html` demonstrates title-or-link capture, unfinished context, optional notes/timer/board, explicit completion, and manually saved references.
- This supersedes board-first assumptions for the exploration; application implementation remains on hold pending review of the proposal. No GitHub integration or sync is claimed.

### Page-preview feedback awaiting approval

- User requested a bottom-right floating timer with minimize/maximize/restore, rather than an in-page timer strip.
- User rejected familiar tabs and duplicate Activity navigation. Prototype now uses a fixed Tasks menu (Workspace/Board), one Activity shortcut, and explicit current-location/active indicators including Profile/Settings.
- Dither Kit user avatar must animate; page motion should remain subtle, purposeful, and respect reduced motion.
- `design/pages-preview.html` and `design/dither-avatar.js` are review artifacts. Approval is still pending; do not port this revision into the application until the user approves it. No commit, backend, or AWS work.

### Navbar refinement awaiting approval
- One page dropdown contains Workspace, Board, and Activity. Its selected label indicates the current page.
- Remove the separate Activity shortcut and dot/location label. Keep the account avatar on the right; dialogs identify themselves through their headings.
- Standalone HTML preview only.

### Approved indicator and popup preview pass
- Added page-menu counts: unfinished tasks, Inbox tasks, and new notes since the last Activity visit. Visiting Activity clears its badge.
- Task cards show status/project/timer state; task clicks open editable details and notes in one dialog without changing the underlying page.
- Avatar opens a Profile/Settings popup. Creation, notes, and status moves show dismissible feedback with Undo.
- Implemented in the disposable HTML preview only; application port remains pending visual review.

### Task selection correction
- Clicking a task selects it and opens its context in Workspace. Edit explicitly opens the editable dialog.
- Task list uses spacing rather than divider lines between rows.

### Board usability review
- Visible desktop drag grips/instructions, hover lift, drag dimming, column drop highlights, and animated card relocation.
- Keep Move to selectors for mobile and keyboard; preserve Undo and prevent completing a timed task.
- Include next steps on cards; retain explicit Edit, fixed dialog header/footer, and floating timer controls.
- Review artifact only; animation behavior still needs hands-on browser review.

### Approved task inspection and timer direction
- Board cards open read-only details with Edit / Work on this actions, preserving board position. Done tasks can be inspected and explicitly reopened. Workspace rows still select tasks.
- Timer defaults compact while idle, expands when focus starts, and returns compact on stop. Compact controls remain usable.
- Focus panel has a clearer clock/context/action hierarchy; consistent inline SVG icons replace timer text symbols and identify page/account actions.
- This remains an HTML approval preview; no app/backend work or commits.

### Shareable developer Profile proposal
- User approved a separate Profile screen and a portfolio direction: identity, explicitly selected featured work (up to three), recent outcomes, period stats, and a clickable Pomogit activity heatmap counting focus or completion.
- Sharing is explicit: only featured outcomes show publicly; activity/period stats require separate opt-in. Private notes and unselected outcome/project details are excluded from public preview and day popups.
- Profile uses illustrative disposable fixtures. Public preview is local only: no publishing, integration, auth, backend, or application state changes.
- This revises the prior prohibition on stats for this profile exploration. Streaks remain secondary/optional and are not part of this first proposal.

### Connected, expressive Profile composition
- User rejected disconnected profile sections and chose identity/featured work as the lead, with a personal and expressive tone.
- Recompose as one folio: identity column beside numbered featured outcomes, private history directly beneath them, and a shared activity section below with calendar/stats together.
- Preserve public selection/privacy behavior. HTML preview only.

### Profile replacement after folio rejection
- Replace split identity/numbered-outcome folio with a compact full-width identity header, aligned featured-work rows, and one activity/calendar panel.
- Remove framed folio, numbered outcomes, and editorial slogans. Keep explicit sharing and public/private behavior. HTML review only.

### Approved profile customization
- Dither avatar only, with selectable generated pattern; accent-only appearance (Mint/Blue/Plum/Amber), no cover/banner or image upload.
- Profile editor supports display name, headline, bio, GitHub and website links; Save applies edits and Cancel preserves the saved profile.
- Featured selection supports explicit ordering; use clear Choose featured work / Preview as visitor / reference destination labels.
- Profile is marked private/not published; idle timer hidden here, active timer remains accessible. HTML preview only.

### Settings rework
- Settings groups Workspace (density, system/reduced motion), Focus (next-session duration, expand-on-start), and Data/privacy (preview export, link to profile sharing).
- Fixed header/footer, scrolling body. Save applies preferences; Cancel discards draft changes; Restore defaults changes fields until saved. Running timer duration remains unchanged.
- Keep HTML-only scope. Do not add pages to compensate for shallow workflow behavior; propose workflow depth separately.

### Approved workflow-depth preview pass
- Task search and status filters work alongside project filtering; matching/completed-work states offer recovery and clear-filter actions.
- Workspace note/next-step drafts and task-editor drafts survive task switching and rerenders in memory; refresh still resets the preview.
- Activity includes task creation, status moves, focus-start status transitions, detail edits, completion, and reopening alongside notes. Filtered visits mark only visible notes read.
- Done task inspection and explicit reopening preserve recovery; keyboard shortcuts (/ search, N capture, ? help) avoid intercepting text entry or dialogs.
- Verification includes draft preservation, filters, completed recovery, and partial Activity read-state checks. No new app pages, state systems, backend, or commit.

### Filter design refinement
- Group search, project, and status in a compact toolbar; remove detached project filter from the page heading.
- Highlight applied selectors, show removable filter chips and result count, and hide Reset when unfiltered.
- Mobile places search above two selectors; Active filters preview scene demonstrates applied state. HTML-only.

### Settings visual replacement
- Replace long divider list with two compact Look & feel / Focus timer panels and a full-width Data & sharing area.
- Use consistent section icons, shorter labels, distinct data actions, and fixed header/footer with scrolling content.
- Preserve functioning preferences and Save/Cancel/defaults behavior. Preview only.

### Approved coherent-flow and mobile preview pass
- Start focus is explicit beside selected-task actions; reference stays secondary. Prevent starting another timer while one is active.
- Completion opens optional Add note / Choose next task actions and supports Undo; completion remains separate from stopping focus.
- Mobile task context becomes a compact expandable chooser with a scrollable list. Timer starts compact on mobile with manual expansion; idle timer uses a small corner panel rather than repeating the main start action.
- Added 30-task Workspace/Board and completed-work review scenes, with long titles, missing projects/next steps, and saved notes.
- Removed unrelated task-detail entrance replay on timer actions. HTML preview only; full app port still awaits approval.

### Standalone preview scaling pass
Responsive/content scaling now has a dedicated stylesheet and reproducible Firefox audit. Long text wraps, desktop board lanes scroll with sticky headings, mobile filters disclose secondary controls, dialogs retain fixed actions, and mobile content reserves floating timer space. Pointer drag adds a lifted card and destination feedback. Details and verification boundaries: `design/SCALING_REVIEW.md`. This remains approval-preview work; no React port, backend work or commit.
