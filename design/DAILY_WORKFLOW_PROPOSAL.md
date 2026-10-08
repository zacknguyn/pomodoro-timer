# Daily workflow milestone: proposed next pass

Status: review only. Maintenance fixes dependencies and removes unused preview helpers; it does not implement the interaction changes below.

## What works today

An isolated Firefox walkthrough passed at desktop (1440 px) and phone (390 px): empty workspace, capture, project and next-step editing, Board inspection, focus start/pause/resume/stop, notes, completion, persisted task/notes after reload, and Activity. Account bypass and the local workApi mock remain enabled; no API requests were observed. User browser data was not reset or changed.

## Four changes to approve

1. **Keep Board capture in Board.** Capturing a task in Board currently switches to Workspace immediately. Keep the new card in Inbox, bring it into view, and let the user inspect/organize it before choosing “Open in Workspace.” Capturing from Workspace can keep its current destination.
2. **Complete focused work in one action.** Clicking Mark done while its timer runs currently raises “Stop the timer.” When completing the focused task, end that session, then mark the task done and show the existing completion dialog. Do not stop a session for another task. If either operation fails, show the error and preserve unfinished work.
3. **Make the optional note action specific.** Add note after completion currently opens Edit task with title, project, reference, status, and all other fields. Use the existing dialog component for a short note form with Save note and Skip. Preserve the full editor behind Edit.
4. **Remember the return point.** Selecting “Ship the checkpoint copy pass” and reloading currently shows “Fix the OAuth retry.” Restore the active focused task first, otherwise the last selected unfinished task; fall back to another unfinished task if it was completed or removed. Use the existing preference storage rather than a new state system.

## Scope and acceptance

Keep the current visual direction, page names, Dither Kit, and Navbar/Sidebar choices. No additional pages, admin dashboard, backend, real authentication, GitHub connection, AWS work, or deployment.

Acceptance: a user captures and organizes without an unexpected page switch, completes focused work without a corrective error, adds a note without editing unrelated fields, and returns to the same unfinished task on desktop and mobile. Existing drafts, timer transitions, filter behavior, and dialog scroll boundaries must remain intact.

## Evidence

`design/verification/check_daily_workflow.py` is a snapshot audit of the current workflow and its four gaps. Run with local Vite on port 5180, or set `POMOGIT_APP_URL`. The audit uses a temporary Firefox profile and saves results/screenshots under the provided `--output` directory. Update it when these proposed interactions are approved and implemented.
