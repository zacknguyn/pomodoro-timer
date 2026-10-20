# Workspace layout review

Review: http://127.0.0.1:5197/design/workspace-preview.html
Source: design/workspace-preview.html, workspace-preview.css, workspace-preview.js and workspace-preview-shell.css. The shell stylesheet is a snapshot of the established app navigation/type/control styles from the previous approved preview, with local font paths; proposal rules and copied palette tokens live in workspace-preview.css.

## Two directions

- A, task first (recommended): current task on the left, compact queue on the right, timer in a reserved bottom-right corner. Mobile task chooser starts collapsed above the current task. Work context has priority; browsing requires opening the mobile chooser.
- B, queue first: task list on the left, work context on the right. Timer remains bottom-right with reserved scrolling space and the completion action on the opposite side. Mobile chooser starts expanded. Easier browsing gives up room for context.

Both remove long horizontal section rules, separate project/status metadata, give scrollbars an inset, and use explicit select/details/edit actions. Creating a task saves it in Inbox without starting focus. Starting focus moves it to In progress. Selecting another task leaves the existing focus session unchanged, with Return to focused task in the timer. Completing its task ends focus and offers an optional note. Timer supports compact/normal/large states. Reduced motion is respected.

Current colors, Barlow/Bricolage fonts, navigation preference and existing Dither avatar fixture remain. The sample tasks, notes, GitHub references, timestamp and countdown are review data. The avatar PNG is captured from the existing Dither component, not a new generator. Nothing persists. Unrelated page/account menu actions are disabled in this isolated proposal; project shortcuts filter the sample queue. Repository connection remains outside the preview.

## Checks

- 264 browser checks passed: two layouts × dark/light × 1440/768/375px. Checks cover overflow, divider absence, local avatar assets, timer continuity, pause/resume/sizing, read-only task details, Cancel/Escape/focus restoration, search, completion/optional notes, empty capture, Inbox → In progress, long content, fixed modal header/footer, navbar fit, browser errors and no external/API requests.
- UI skill quick probe: light at 375/768/1024/1280/1440/1920 with a 1440→375 sweep; dark at 375/768/1440. No light-theme mandatory P findings and no sweep breaks. Final dark probe P1 is the intentionally lilac selected layout-review button; P2 is the existing high-contrast skip link, which is off-screen until keyboard focus. Both are retained, not missing-theme panels. This quick probe does not perform its own dynamic checks; the interaction suite above covers the proposal actions.
- Probe suggestions reconciled: inherited unused shell scrollbar selectors and overridden local rules are detected by source inspection; visible proposal scrollers use the final 4px WebKit rule with hover visibility and inset padding. Transparent row borders deliberately reserve selection geometry; unselected rows are not framed cards. Existing shared menu boundary color remains unchanged. These are recorded rather than claimed absent from probe output.
- Frontend lint, 15 unit test files and production build passed. JS syntax and git diff --check passed.
- Screenshots: design/workspace-review/{a,b}-{desktop,mobile}.png; detailed checks and other theme/width screenshots: /tmp/pomogit-workspace-evidence/.

Only the preview and review artifacts were added in this turn. Existing React and backend changes were preserved. No account requests, new dependencies, commit or push. React integration waits for the user's layout choice, as requested.

The review server serves only staged preview files, public fonts/logo and the Dither fixture under /tmp/pomogit-workspace-review; it does not expose the repository.

## React Board-to-Workspace handoff polish

Board cards explicitly identify their title action as View task details. The shared read-only task dialog separates Edit from Work on this (completed tasks retain Reopen in Workspace), with copy explaining that opening Workspace does not start a timer. The handoff clears only Workspace filters, collapses mobile filter controls and selects the exact task. Board's query/project/status filters remain intact. Board return restores main/lane scroll positions and focuses the originating card without scrolling it; the chosen task is identified as Selected in Workspace using the existing last-task preference.

Workspace now leads its task body with the saved next step, with an Add next step editor action when empty. Reference and note actions follow it. On desktop the context list scrolls its selected row into view above the timer. When a different task owns the active/paused timer, Workspace names that task and explains that choosing another task does not switch the timer. Start/pause/resume/stop/completion APIs and calculations are unchanged.

Verification uses isolated browser mock storage and blocks every API request. The Board handoff suite covers read-only details, discarded edits, exact selection without session/status mutation, next-step order, mobile filter collapse, preserved Board filters, restored main/lane scroll and originating focus, selected-row visibility, and timer ownership across task selection and pause. Widths: 1440/1024/768/375, both themes and navigation modes. The recorded-work workflow additionally covers capture, organize, start, pause, resume, stop, complete and history inspection. Installed UI/UX measurements at 1440/768/375 in both themes returned no mandatory P findings; desktop/mobile screenshots were inspected. Evidence: /tmp/pomogit-board-handoff/ and /tmp/pomogit-recorded-work-flow/. Runner: design/verification/check_board_handoff.mjs. No live GitHub, OAuth, database or backend behavior was verified. No dependency changes, commit or push.

Final results: 200 handoff assertions passed across the 16 contexts (desktop/tablet run plus the mobile rerun, whose selectors now include collapsed filter controls), and all 36 recorded-work flow assertions passed. Lint, all 16 frontend test files, production build, and git diff --check passed.

## Focus timer and finishing flow

The timer now exposes Ready to focus, Running, Paused and Time is up states at every panel size. The compact panel retains the task name, larger remaining-time readout and single-line actions. Running uses a restrained breathing indicator, disabled by either app or OS reduced-motion preference. Expanded panels explain that Stop timer records focus while Mark done finishes the task. At zero remaining time, Save session replaces the disabled Resume action; saving reuses the existing end-session operation and leaves the task In progress.

Workspace's completion action explains that it also stops and saves that task's timer when one is active. Completion confirmation identifies the task and project, keeps closing notes optional and offers Choose next task / Back to Workspace. Mobile uses a content-sized confirmation with a deliberate two-row action layout instead of an empty fullscreen page. Task editors and longer dialogs keep their existing layouts. Undo completion now restores selection to the task being undone, as well as restoring its prior status.

Verification: 204 focus/finish assertions passed across 1440/768/375, both themes and navigation modes, followed by the 68-assertion final mobile rerun. The checks cover ready/running/paused/expired, resize controls, reduced motion, paused-time exclusion, stop without completion, undo, optional note save, reload before saving an expired session, exactly-once focus records, and completion while a timer is running. The existing 36-assertion recorded-work journey also passed. All browser records were isolated mock data with API access blocked. No live OAuth, repositories or database behavior was verified.

The installed UI/UX probe and screenshots covered running and completion states in both themes at 1440/768/375. Mobile Mark done and Stop timer wrapping were corrected. Remaining tablet row-wrap heuristics concern the task header's metadata, which remains readable; completion's initial-scroll heuristic reflects the runner scrolling to Mark done before opening the dialog. Desktop/mobile screenshots were inspected and no horizontal page overflow was found. Evidence: /tmp/pomogit-focus-finish/. Runner: design/verification/check_focus_finish.mjs. Lint, all 16 frontend test files, build and git diff --check passed. No backend/schema/dependency changes, commit or push.
