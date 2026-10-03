# Active app UX review

Scope: the UI-only React app on the rebrand branch. Review preserves the approved visual direction, mocked work API and disabled auth. Dormant auth/admin surfaces and backend/infrastructure were not reactivated. This is an interaction review, not a claim that all subjective usability questions are settled.

| Surface | User expectation | Decision |
| --- | --- | --- |
| Navigation | Know where an option goes before choosing it | Names, purpose descriptions and counts use distinct rows. Profile is included when the switcher names it. The selected page uses a background highlight and `aria-current`; no selection tick. |
| Mobile header | Read the current destination and open the menu without clipping | At the smallest widths the logo symbol replaces the wordmark; the menu remains inside the viewport. |
| Browser history | Back/Forward return to the page just visited | Page navigation pushes history; hash/popstate changes update the rendered view. Skip-to-content focuses the main region without changing the page hash. |
| Workspace | Capture/select work without accidentally starting a timer | Capture still selects a new Inbox task. Task rows select context; editing stays explicit. |
| Board | Inspect a task before deciding what to do | Cards retain read-only inspection and explicit editing. “Open in Workspace” describes the actual result; it does not start focus. Status changes and pointer dragging remain available. |
| Focus | See which task Start/Pause/Stop affects | Compact panels now show the task title. Active focus remains global; idle panels are hidden on Activity/Profile and when there is no unfinished selected task. |
| Completion | Choose the next task where work happens | “Choose next task” returns to Workspace from Board. Stop and completion remain separate actions; notes stay optional. |
| Activity | Inspect history without an inconsistent jump | Activity titles open the same read-only inspection as Board, regardless of current task status. |
| Profile | Understand what visitor preview shares | Explicit featured tasks/public summaries and optional activity remain. Heatmap day summaries report focus sessions and completions rather than counting only note records. No verified GitHub linking or public publishing is implied. |
| Settings | Draft preferences, then save or cancel | Existing Save/Cancel/defaults behavior stays. Profile/settings notifications clear unrelated Undo actions. |
| Mobile notifications | Navigation remains reachable after an action | Notifications sit above the timer rather than covering the header. |
| Feedback | Undo refers to the action named in the current notification | Unchanged-note, profile and settings notifications clear stale Undo callbacks. |

Verification uses `design/verification/check_app.py`: responsive layout and menu bounds, long content, 100 tasks, 200% zoom, browser Back/Forward, Board completion to Workspace, compact timer context, Activity inspection, drafts, session transitions, completion/Undo, profile privacy, settings cancellation and first-use capture. Physical device and additional browser-engine review remain separate follow-up work.

Result: frontend lint, all 11 test files, production build and `git diff --check` passed. Firefox passed 55 geometry cases and the expanded interaction checks with zero backend requests. Menu screenshots are in `/tmp/pomogit-ux-review/page-menu-*.png`.
