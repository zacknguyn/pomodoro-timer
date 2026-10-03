# Approved preview integration

The user approved `pages-preview.html` for UI-only React integration. The active implementation is `frontend/src/components/Workbench.jsx`, with shared dialogs/timer in `WorkbenchPanels.jsx` and scoped styling in `Workbench.css`. The HTML remains available for comparison.

## Direction and routes

The approved green/ink workbench uses local Barlow/Bricolage fonts, the actual animated Dither Kit avatar, outlined secondary controls, distinct project/status labels, compact board cards and a floating focus instrument. Existing route identifiers remain compatible: `#work` is Workspace, `#tasks` is Board, `#review` is Activity, and `#profile` is Profile. Settings remains an account dialog. No new product routes were added; Admin remains role-gated.

## Behavior

Capture creates an Inbox task and selects it without starting focus. Starting focus moves the canonical mock task to In progress. The timer persists across pages, supports compact/normal/maximized layouts, pause/resume/stop and elapsed progress. Stopping never completes the task and requires no note. Completion is explicit, offers optional notes and supports undo/reopening.

Board cards open read-only inspection, with Edit and Work on this actions. Pointer grips provide lifted cards/drop highlighting and lane edge scrolling; status selectors are the keyboard/mobile alternative. Task editor headers/actions stay fixed while fields/history scroll. Search, project/status filters and in-memory per-task drafts are shared across the existing surfaces.

Profile uses explicitly selected completed tasks and separately written public summaries. Private notes are excluded from visitor preview. Activity statistics require opt-in for visitor preview; the local mock archives ended sessions so focus totals derive from session records. Profile customization uses generated Dither patterns and four accents. Settings supports density, reduced motion, next-session duration, timer expansion and local JSON export; Cancel leaves saved values unchanged.

## Data and scope

The existing `workApi` mock remains the canonical task/session source. Mock-only task fields extend project, next step and note/change records. Existing checkpoint fixtures are presented as history without duplicating task ownership. Profile/preferences use the existing storage helpers. There is no integration with GitHub and nothing is published.

Auth remains disabled (`DEV_BYPASS_AUTH = true`) and `USE_MOCK = true`. No backend, database, AWS, Terraform, deployment, or commit work is included. The redesign plan and handoff were excluded as design references as requested.

## Verification

Run frontend lint, tests and build from `frontend/`. With Vite on `127.0.0.1:5173`, run `python design/verification/check_app.py --output /tmp/pomogit-app-review` for the actual React browser audit. The separate `check_scaling.py` verifies the HTML preview, not the application.

The app audit exercises viewport geometry, fixed dialog actions, 100-task/long-content fixtures, actual 200% zoom, native pointer dragging, retained drafts, global timer behavior, explicit completion/undo, keyboard search, mobile controls, profile privacy, Cancel semantics and first-use capture. Browser profiles are isolated, and the audit checks that no `/api/` resource requests occurred. Physical phone keyboard behavior and additional browser engines still require device review.

Latest verification passed: frontend lint, all 11 test files, production build and `git diff --check`. The actual React Firefox audit passed 55 rendered geometry cases and interaction checks with zero backend requests, including retained editor status and inline blocked-transition feedback.

Workspace scrolling refinement: on wide, tall desktop windows, capture and filters remain visible while task context and detail fields scroll in bounded panes; shorter/narrower windows use page flow. Phone layouts reserve clearance for the floating timer. Native scrollbars remain visible with thin, canvas-matched tracks. Preview navigation descriptions, labeled counts, page icons and profile/settings account indicators are restored in React.

Approved Ponytail cleanup removed 30 disconnected frontend files (3,083 lines), the unused animation CSS import, and five direct dependencies: motion, radix-ui, clsx, tailwind-merge and tw-animate-css. npm removed 81 installed packages; surviving package versions did not change. Pre-cleanup file copies, including earlier local edits, are in `/tmp/pomogit-approved-cleanup-backup`. Active Workbench, Dither Kit, auth/backend code, historical data helpers/tests and HTML previews were preserved. Lint, all 11 test files, build, diff check and 55 React browser geometry/workflow cases passed afterward. The reviewed flow remains capture without starting focus, Board inspection and organization, explicit focus start/stop, then explicit completion with optional notes and Undo.

Latest requested refinements remove the page-selection tick while retaining active background/aria-current, place the task-list heading outside the scroll region with additional gutter spacing, and use Dither Kit's existing generated hue instead of a forced blue override. Avatar generation varies both pattern and color; the same seeded choice appears in editor/profile/account and survives saving. All frontend checks and 55 browser geometry cases plus interactions passed, including a rendered color-change assertion.
