# Activity audit and HTML proposal

Reviewed and integrated 2026-10-15 after approval of the HTML proposal. Existing uncommitted work was preserved. React now renders the approved Activity view. Backend APIs and AWS are unchanged; no real account access, commit or push.

Preview: http://127.0.0.1:5196/design/activity-preview.html
Comparison: http://127.0.0.1:5196/design/activity-review/index.html

## React integration

- `ActivityView.jsx` renders the approved day groups, filters, matching summary, read-only event popup and current task properties. The popup's View task action opens the existing inspection with Edit / Open in Workspace. No new routes, dependencies or global state system.
- Existing page-scoped filters now store Activity's project, record query, event type and period. Clear filters resets all four without changing Board or Workspace filters.
- **All time** supplements the approved Today / Last 7 days controls so older history remains accessible.
- `activity.js` builds history from hydrated task notes and the existing sessions export. Stable note/session IDs prevent duplicate records; only ended/completed sessions with valid end timestamps enter history. Recorded duration excludes active timers and is clamped to a finite nonnegative value. Session end dates determine local day groups.
- Existing status-change text identifies recorded completions even when a task has since reopened. Ordinary notes remain separate. Legacy checkpoint notes are already deduplicated by the existing hydration path; no synthetic checkpoint durations are added to exported sessions.
- Missing tasks remain readable as Task unavailable; their event popup omits View task. Previous status, stop reason, and missing note content are never invented. Actual stop reasons are unavailable in the existing session API, so the app uses neutral Timer stopped wording rather than the prototype's illustrative early-stop label.
- All data access uses existing frontend APIs; no backend/schema/auth changes.

### Integrated verification

- **96 integrated Activity checks passed** at 1440/375 in dark/light with intercepted fixture APIs: actual-time totals, active exclusion, historical completion after reopening, hydrated checkpoint deduplication, popup and reference, Escape/focus return through event → task inspection, orphan sessions, record-level search, intersecting filters, clear recovery, old history, page-scoped filter persistence, loading/error/retry/first-use states, no account mutations or browser errors.
- Dialog tests shrink the viewport to 480px high and scroll its body, confirming header and footer stay fixed.
- **116 regression checks passed**: 40 first-use/task/timer checks and 76 project management checks. These also use intercepted APIs.
- Added Activity unit checks for deduplication, completed/reopened tasks, actual versus planned duration, intersecting filters, invalid durations/dates, missing tasks, future exclusion and local calendar boundaries over a daylight-saving transition.
- Frontend `npm run lint && npm test && npm run build` passed with **14 test files**. `git diff --check` passed.
- Integrated screenshots reviewed in `/tmp/pomogit-activity-integration/`. Mock Activity skill probe at 375/768/1440 found **0 mandatory broken findings**. Existing shared-shell scrollbar/menu/badge suggestions and row-density preferences were retained as outside this milestone.
- Updated existing acceptance selectors for Activity's new markup. Backend-dependent legacy scripts were syntax-checked, not executed against live accounts.
- Run account-mode frontend on port 5191, then `POMOGIT_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node design/verification/check_activity_integration.mjs`.

The original HTML and before/proposal comparison remain available as the approved design record. Live OAuth, GitHub and database operations were not re-tested in this frontend milestone.

## Original audit findings and proposal

| Finding | Evidence | Proposal |
| --- | --- | --- |
| Activity omits focus sessions even though Workspace loads them for the profile. | `Workbench.jsx`: `refresh` loads export session history; `allEvents` only builds task creation and note records. Read code, confirmed mock Activity screenshot. | Include recorded sessions alongside completion, note and task-change events. Show actual recorded time, not the planned timer length. |
| Historical records display the task's current status without identifying it as current. | Activity renders `StatusLabel status={entry.task.status}` for every past record. Read code. | Describe the event in the list; label the popup sidebar **Task now / Current status**. Don't invent previous statuses where no transition was recorded. |
| Current search/status controls select whole tasks, so searching a note can surface unrelated history for that task. Status filters mean current task status rather than event type. | `filtered` selects tasks before `allEvents` expands their records. Read code; behavior follows this data path, not a separately executed search test. | Search the displayed record title/project/text; use event-type, project and time filters. Compute summary from the same selected records. |
| Repeated full timestamps and widely separated metadata make the history slow to scan. | Viewed 1440/375 light/dark screenshots. Preference/readability finding, not a measured functional failure. | Newest-first day groups; event icon and label, task title, note or recorded duration, legible project label and explicit View details action. |
| Long task-title buttons wrap at 768–800px. | Before probe P1/P2. Text wraps legitimately without detected overflow; these are not broken buttons. | Let titles wrap as content; keep a short, separate action so task names don't carry the whole navigation affordance. |
| Users need context without accidentally starting work. | Existing task inspection is read-only with separate actions. | Read-only event popup using the established fixed header/footer and right-side properties; View task leads to existing task inspection on later integration. |

## Proposal behavior

- One Activity screen; no new page, chart, streak or backend API.
- Existing app shell, Dither avatar, plum/lilac light/dark tokens and sidebar/navbar choice retained. Shared Workbench CSS is snapshotted in the HTML; font URLs are adjusted for serving from the repository root.
- Today / Last 7 days controls, project and event-type filters; search includes record text. Totals follow all selected filters.
- Sample Today has 8 records: 4 stopped focus sessions totaling 95 minutes, 2 task completions, 1 saved note and 1 task creation. Last 7 days adds 2 records, one a 30-minute session: 125 minutes total. All data and dates are fixtures.
- Task completion does not require a note. Stopping a timer does not imply completion. An early stop is labeled explicitly.
- The read-only popup distinguishes event time from current next step/status. Mobile properties stack and the dialog fills the viewport; its body scrolls between fixed header and footer.
- Review-state, theme and navigation controls in the top ribbon are prototype tools, not proposed app controls. View task shows a small read-only placeholder for the existing task popup; Edit / Open in Workspace will reuse the app's current flow after approval.
- A static Dither avatar snapshot represents the current avatar component. Production avatar behavior is unchanged.

## Verification

- **108 proposal checks passed** across 1440/768/375px and dark/light themes: day grouping, consistent summaries, intersecting filters, no-match recovery, long task titles, project-less work, optional closing note, event detail, Escape/focus return, dialog/footer geometry, navbar fit, loading/error/empty/retry states, and no browser errors, failed assets or API traffic.
- Skill probe before: six fixed widths plus a 1440→375 sweep. Proposal: same sweep; then final light and dark probes at 375/768/1440 after visual corrections. The review ribbon wrap at 780–800 was fixed by moving its title to a full row below 900px. Missing standalone font URL was fixed.
- Final light probe: 0 mandatory broken findings. Final dark probe: 1 mandatory finding, P1 at all three widths, the off-screen light-colored `.wb-skip` link. Dismissed as an intentional high-contrast keyboard affordance, not a visible light surface; kept focusable. Screenshots reviewed.
- Other shared-shell probe suggestions remain outside this Activity proposal: 8px scrollbar styling, hidden page-menu spacing, 11px navigation counts, and a preference for lighter borders. Dense-row heuristic counts metadata and optional note lines; rows were reviewed at mobile and desktop and deliberately show explanatory text rather than truncating history.
- `npm run lint && npm test && npm run build` passed; all 13 frontend test files passed. `node --check design/activity-preview.js` and `git diff --check` passed.
- This is HTML/fixture verification, not live OAuth, database, GitHub or integrated React Activity verification.

Run the static server at repository root on port 5196, then:

```sh
POMOGIT_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node design/verification/check_activity_preview.mjs
```

Detailed temporary evidence: `/tmp/pomogit-activity/`. Selected screenshots are retained in `design/activity-review/`.

## Integration considerations (addressed above)

Reuse the existing sessions export and hydrated task notes, keyed by stable record IDs. Normalize session end timestamps and recorded duration; exclude active sessions from finished-history totals. Preserve unlinked sessions without guessing a task. Keep completion changes and optional notes distinct while avoiding duplicate checkpoint/note records. Historical status or early-stop reasons must come from recorded data, otherwise use neutral wording. Use the user's local day boundaries. Reuse page-scoped filters, the task inspection flow and shared Modal; no new global state system.

## Activity polish after Home integration

Activity now groups each local day into project sections, including No project for unassigned and unavailable tasks. Days stay newest first; projects within a day are ordered by their latest event and each project's records stay newest first. Day headers show record counts and recorded focus. Project names appear once per group, keeping repeated task rows easier to scan. Focus, completion, note and change records retain text labels and distinct Lucide icons; completion uses the existing semantic color. The long summary divider was removed and rows use the same plum surfaces as Home.

Applied search, project, event type and non-default dates can be removed individually, with a visible Clear filters action. Custom dates opened from Home are removable directly from their date button instead of being repeated in the chip list. Removing a search returns focus to the input. Controls are disabled during loading/error states. Mobile filter spacing was tightened and the introductory copy is omitted when Home's return context already explains the selection. Filtering, aggregation and APIs are reused unchanged.

The shared Modal now returns focus without scrolling the opener and restores its original main-content scroll position. This corrects position loss after a viewport resize and applies when moving from an event's detail dialog into the existing read-only task dialog. Disconnected openers still use the existing main-content fallback.

Verification used only intercepted account APIs or explicit local mock storage: 512 Activity assertions across 1440/1024/768/375, light/dark and sidebar/navbar; 144 Home recent-work/counting-guide assertions at desktop/mobile in both themes/navigation modes; and 36 task/focus/completion workflow assertions. Activity coverage includes grouping order, removable filters, query-focus return, empty/loading/error/retry, orphaned sessions, fixed dialog header/footer, task inspection and exact scroll restoration after resizing. The existing Activity runner's obsolete brand-to-Workspace assumption was updated to an explicit Workspace route. UI/UX measurements and screenshots cover 1440/768/375 in both themes. No live GitHub, OAuth, or database behavior was verified. No commit or push.

Final checks: 210 Home-to-Activity assertions also passed after the removable custom-date update. The installed UI/UX probe returned no mandatory P findings at 1440/768/375 in both themes; final screenshots were inspected. Lint, all 16 frontend test files, production build, and git diff --check passed. Evidence: /tmp/pomogit-activity-integration/, /tmp/pomogit-dashboard-activity/, /tmp/pomogit-recent-work/, /tmp/pomogit-recorded-work-flow/.
