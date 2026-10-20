# Approved Home dashboard integration

The approved compact HTML dashboard is now implemented as a React Home view. Workspace remains the task execution page, Board manages tasks, and Activity retains the detailed event feed. Home is available in the page switcher and opens from the brand button. Returning users and successful email sign-in default to Home; explicit Workspace/Board/Profile links remain supported.

GitHub's existing callback target remains unchanged on the backend. A one-time sessionStorage navigation hint set before GitHub authorization maps that callback to Home and is cleared afterward. This hint contains only a view name. It does not participate in authentication or store credentials. Storage-disabled browsers retain the existing Workspace callback behavior.

## Data and interaction

- Uses the Workbench's existing task and ended-session records. No seeded dashboard figures, new API calls, schema changes, backend changes or account migration.
- The headline, project donut and stacked areas reconcile to the same recorded seconds. Active/paused timers are excluded. An existing timer remains accessible in its floating panel.
- Counts distinct completed tasks within the selected reporting period, including tasks subsequently reopened. Chart buckets assign each counted completion to its latest completion within that period so their sum matches the headline. Active days still include every day with recorded focus or completion. Current status counts and all-history streak remain independent of the reporting period.
- Supports 7/30/90-day reporting, previous-period comparisons, local calendar boundaries, configured week start, day inspection, data tables, keyboard-accessible values and native hover tooltips.
- Uses the actual Dither Kit area/line renderer with gradient variants and aura bloom. The approved existing donut renderer is reused. Source/provenance is recorded under frontend/src/components/dither-kit/charts/README.md.
- More than three focus projects are represented by the top two plus Other work. All seconds remain included; the grouped detail dialog exposes individual project links.
- Project/status links open the existing filtered Board. Date/task links open read-only context and existing task inspection. Continue opens Workspace without starting focus. New task uses the existing capture flow; Cancel discards its draft.
- Loading, no history, first-use, failed-history and retry states have explicit treatments. History errors hide the figures rather than presenting incomplete totals.

## Layout and loading

Both navigation preferences and light/dark themes are preserved. The lower cards retain separate label/value columns and bottom clearance. Mobile stacks the cards; the short desktop view fits all five cards. Native chart/tooltip animation follows app and OS reduced-motion preferences.

Home and its chart dependencies are lazy loaded. The production build keeps Workbench around 94 kB (28 kB gzip); the chart dashboard is a separate chunk around 222 kB (76 kB gzip). Dependencies added are the upstream chart's motion, d3-scale, d3-shape, clsx and tailwind-merge. The production runtime still enforces authentication; the explicit development-only preview remains available.

## Verification and limits

Commands run from frontend: npm run lint && npm test && npm run build. All 16 unit test files pass, including dashboard aggregation and navigation regressions. git diff --check passes.

425 dashboard browser assertions passed. Browser suite: design/verification/check_dashboard_integration.mjs. It uses intercepted account fixtures, never live credentials or account data. It exercises both themes, both navigation modes and 1440/1024/768/375px at 768px height. Optional POMOGIT_DASHBOARD_WIDTHS can limit a rerun. Each completed context writes its results separately under /tmp/pomogit-dashboard-integration/ so an interrupted runner retains evidence.

Additional normal-motion hover/lower-card smoke checks: 12 passed at desktop/mobile in light/dark. Existing Profile integration: 174 checks passed. The installed UI/UX skill's static measurements were run against the intercepted dashboard at 375/768/1440 in both themes: no mandatory P findings. Desktop and mobile lower-card screenshots were visually inspected. Dynamic interactions are covered by the dedicated suite rather than the static probe.

A targeted intercepted browser check also confirms that capturing a task from the No project Board filter sends an empty project name, rather than the internal filter token.

These are local fixture checks, not fresh live OAuth, GitHub, or database verification. UI-only review server: http://127.0.0.1:5173/#home (authentication disabled and workApi mocked). Fixture test server: http://127.0.0.1:5191. No commit or push was requested or performed. Existing uncommitted work from prior milestones was preserved.

## Recent recorded work redesign

Replaced the plain disclosure list with a compact work log. It stays collapsed initially and shows the latest three records within the selected reporting period. Expanded rows separate task title, event kind, project, recorded result, and local date/time. Focus and completion use distinct Lucide icons and semantic colors; rows open the existing read-only task dialog and restore focus when it closes. An All activity button opens the existing unfiltered Activity feed. Deleted/unavailable tasks remain noninteractive records. No history data or API behavior was added or changed.

176 focused browser checks passed across both themes, both navigation modes, and 1440/1024/768/375px. Coverage includes keyboard disclosure, row inspection, return focus, Activity navigation, empty history, and long task/project names. The installed UI/UX probe's expanded-section measurements at 1440/768/375 in both themes returned no mandatory P findings; an initial scrolling flag came from the test's deliberate scroll and disappeared when measuring from the initial scroll position. Desktop/mobile screenshots were visually reviewed. Evidence: /tmp/pomogit-recent-work/. Runner: design/verification/check_recent_work.mjs. Lint, 16 test files, build, and git diff --check passed. No commit or push.

## Counting guide redesign

The counting explanation now uses a matching help card beside Recent recorded work. It opens the shared guide dialog instead of expanding a dense paragraph into the dashboard. Seven definitions are split between the selected reporting period and figures independent of that period. Comparison text follows the selected 7/30/90-day range. The dialog reuses the existing fixed header/footer, scrollable body, keyboard dismissal and focus restoration; mobile uses the existing full-screen dialog. Both cards stack at narrower widths. Calculation logic and API behavior are unchanged.

Counting-guide verification: 288 combined recent-work/guide browser assertions passed across light/dark, sidebar/navbar, and four widths. Coverage includes seven definitions, period-aware copy, viewport fit (including full-screen mobile), fixed header/footer during body scrolling, Escape dismissal, focus restoration and existing work-log interactions. The UI/UX measurements at 1440/768/375 in both themes returned no mandatory P findings after removing the runner's intentional opener scroll from initial-load measurements. Desktop/mobile guide screenshots were inspected. Lint, 16 test files, build and git diff --check passed. No commit or push.

## Home to Activity drill-downs

Date buckets, calendar-day details, and project summaries now offer View in Activity. They carry inclusive local dates plus the relevant event type and project into the existing Activity filters. Other work retains the full grouped project list (including unassigned work); choosing another project replaces that grouped filter. Activity displays the applied dates and a compact Back to Home context. Preset date buttons stay together at narrow widths. All activity clears drill-down constraints, and clearing filters keeps the return path available.

Home's reporting period now lives in the existing per-page Workbench filter state. Returning via Back to Home, the brand, or browser Back preserves the selected period while that account's Workbench remains mounted. It does not add persistent browser storage and resets on a full reload/account change. Activity lists the saved events in the requested dates; completion charts continue to assign each task's latest completion within the dashboard reporting period, as described by the counting guide.

Verification: 210 intercepted Home-to-Activity assertions passed across 1440/1024/768/375, light/dark, and sidebar/navbar. Unit cases cover inclusive local-day ranges, the repeated daylight-saving hour, invalid dates, grouped/unassigned projects, and exact bucket boundaries. 36 UI-only workflow assertions passed across desktop/mobile and both themes: create, organize, focus, pause, resume, stop, complete, and inspect the saved work in Home/Activity. The workflow recorded exactly 120 seconds of focus, excluded 120 seconds of pauses, and saved one ended session and one completed task; it blocked all API access and used only isolated browser storage. No live account, GitHub, OAuth, or database behavior was newly verified.

Runners: design/verification/check_dashboard_activity.mjs and design/verification/check_recorded_work_flow.mjs. The latter expects the explicit development-only mock app at port 5192 by default. Evidence: /tmp/pomogit-dashboard-activity/ and /tmp/pomogit-recorded-work-flow/. The installed UI/UX static measurements passed at 1440/768/375 in both themes after correcting tablet date-button wrapping. Desktop/mobile screenshots were reviewed. Lint, all 16 test files, build, and git diff --check passed. No backend/schema/dependency changes, commit, or push.

## Home first-use and return experience

The existing Home layout now handles first use with Create your first task and, in account mode, Connect GitHub repository. Both actions open the existing dialogs. Two empty chart cards explain that ended focus sessions and completed tasks populate the figures; no sample values or extra onboarding state is introduced. The explicit local mock preview explains that GitHub connection is available in the signed-in app and does not call GitHub.

Returning users see their selected unfinished task (or the active timer's task), project, status and saved next step. Continue task opens that exact task in Workspace without starting or resuming a timer. Running/paused timers are identified in the context. Accounts with only completed tasks get a Board action instead of a misleading Continue button. On wide screens this context shares the header area so the five chart cards still fit the tested 1440×768 viewport in both navigation modes; narrow screens stack it above the figures.

Loading uses neutral placeholders for metrics and chart surfaces without displaying zeros or the empty state. Capture and date controls stay disabled until history is available. Errors hide figures and offer the existing retry action. Shared colors, dialogs, avatars, date aggregation, and backend behavior are unchanged.

Focused verification: 272 first-use/return/loading/error/timer assertions across 1440/1024/768/375, light/dark, sidebar/navbar with every API intercepted. The final 375px dark scenario was checked again after compacting the desktop header. The existing recorded-work workflow passed all 36 assertions in isolated mock storage. Installed UI/UX measurements at 1440/768/375 in both themes returned no mandatory P findings; desktop navbar/sidebar, mobile first-use/return and error screenshots were reviewed. Evidence: /tmp/pomogit-home-entry/, /tmp/pomogit-home-probe/, /tmp/pomogit-dashboard-integration/. Temporary focused runner: /tmp/check-home-entry.mjs. No live OAuth, repositories, or database behavior was verified.

Final regression results: all 425 dashboard integration assertions passed across the 16 viewport/theme/navigation contexts (desktop/tablet contexts followed by a mobile rerun). The mobile runner now scrolls its chart into view before mouse-hover tooltip checks. Lint, all 16 frontend test files, production build, and git diff --check passed. No commit or push.

## Tall-screen height correction

Home's recorded-work layout now fills the available desktop height above 820px instead of leaving the charts at a fixed height. Extra space grows the two primary history charts; lower summary cards retain their natural size. Laptop and mobile sizing is unchanged. Intercepted browser measurements across 1440/768/375 widths, 768/900/1080/1440 heights, both themes and navigation modes checked overflow and sizing. At 1440×1080 and 1440×1440 the footer ends 24px above the viewport bottom with no unnecessary scroll; the smaller summary cards stay below 280px high. Desktop screenshots were inspected. Lint, 16 test files, production build, and git diff --check passed. No backend change or commit.
