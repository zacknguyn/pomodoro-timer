# Daily workflow milestone

Status: approved and implemented on `feat/pomogit-daily-workflow`; publication approved for pull request review.

## Implemented behavior

1. **Board capture stays in Board.** New tasks appear in Inbox and receive keyboard focus after rendering. Filters clear so the card is visible. Open the card to organize it, then choose Open in Workspace. Workspace capture still selects its new task directly.
2. **Focused work completes in one action.** Mark done, Board's Move to Done, and the full task editor share the completion path. If the task owns the current session, stop that session before marking it done. Completing another task leaves the session running. A failed stop leaves the task unfinished; a failed completion refreshes the ended timer while leaving the task unfinished.
3. **Optional notes have a specific dialog.** Add note after completion opens one note field with Save note and Skip. The existing modal keeps its header/footer fixed while its body scrolls. The full task editor remains available through Edit.
4. **Workspace restores its return point.** Initial load prioritizes the active focused task, then the last selected unfinished task, then another unfinished task. Completed, deleted, and malformed remembered IDs fall back safely. The return point extends the existing `pomogit.work-protocol` preference object; no new storage system was added.

Native scroll spacing keeps focused Board cards clear of sticky headings and task rows clear of the expanded floating timer.

## Scope

The visual direction, page names, Dither Kit, and Navbar/Sidebar choices remain in place. Authentication is disabled and workApi mocked. No additional pages, admin dashboard, backend, GitHub connection, AWS work, or deployment.

## Verification

`design/verification/check_daily_workflow.py` exercises capture, organization, read-only inspection, focus transitions, one-action completion, closing notes, reload persistence, and Activity at desktop (1440 px) and phone (390 px). It also covers Skip, active-session priority, completed/deleted return points, completing another task during focus, full-editor completion, and injected stop/completion failures. It runs in a temporary Firefox profile; user browser data is untouched, and no API requests are expected.

Run with local Vite on port 5180, or set `POMOGIT_APP_URL`. Use `--output` for the results and screenshots directory. Fault injection uses the loaded mock API in the page's JavaScript context.

Required checks: `npm run lint && npm test && npm run build` from `frontend`, `git diff --check` from the repository root.
