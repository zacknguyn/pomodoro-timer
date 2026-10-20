# First-use flow review

Reviewed 2026-10-11. Preserves the approved React layout, right-side task properties, Dither avatar, and account/session model. No backend/AWS changes or commits.

## Applied fixes

| Before | After | Evidence |
| --- | --- | --- |
| Repository introduction implied bringing issues into Board without clearly explaining the separate connection/import steps. | Explains that GitHub sign-in allows browsing, connecting creates a project, selected issues become Inbox tasks, and subsequent changes are not synced. | Current UI and backend import controller reviewed; fixture browser checks. |
| Import action with zero selection read “Import selected into Inbox.” | Disabled action reads “Select issues to import.” Positive selection keeps its count. | Desktop/mobile fixture checks. |
| Timer stop control read “Stop.” | Reads “Stop timer,” distinguishing it from task completion. | Desktop/mobile focus-to-completion checks. |
| Persistent Workspace notification could intercept clicks on “Mark done” after stopping focus. | Workspace notifications occupy page space above the task layout rather than covering completion controls. Other pages keep existing notification positioning. | Browser test failed on intercepted pointer events before the fix; passed afterward without dismissing or bypassing the notification. |

## Approved layout integrated into React

`design/first-use-preview.html` is a standalone first-use proposal using the current app's styles, navigation, repository dialogs, and captured Dither avatar.

Empty Workspace would put the task field beside its explanation, with a secondary “Connect GitHub repository” choice. It removes empty-screen navigation and filter clutter from the proposal. The sample connection/import/focus actions demonstrate the page jobs; their sample task result is explanatory and does not replace the approved task dialog or populated Workspace layout.

The user approved this proposal, and the empty Workspace layout is now integrated in `Workbench.jsx` with scoped CSS. Capture reuses the existing form, draft ref, and API handler. First-use Workspace has one capture form, no redundant empty Board navigation, and a GitHub connection choice in account mode. Populated, filtered, and completed work retain their existing flows. The existing task popup already offers separate Edit and Open in Workspace actions, explicitly says that opening does not start focus, and keeps notes optional after completion.

## Verification

- **38 account-mode fixture browser checks** at 1440px and 375px passed. Every API call was intercepted, including connection, import, focus, and completion. No requests wrote to a backend or GitHub.
- Verified first-task creation without automatic focus, undo returning to first-use with a cleared field, one capture form before and after creation, no horizontal overflow in capture controls, connection without import, returning to the connected project, one selected issue imported into Inbox, project-filtered Board, read-only inspection, opening without focus, starting focus moving to In progress, stopping without completion, and completion without a required note.
- Standalone proposal's connection/import/focus/completion/reset controls passed at both widths; screenshots reviewed.
- UI skill quick probe at 1440/375px reported no broken items after fixing an artifact CSS class collision. Existing badge sizing, menu spacing, native checkboxes, and scrollbar differences remain as style suggestions; they are outside this flow pass. New proposal text uses balanced paragraph wrapping.
- Frontend lint, all 13 test files, production build, and `git diff --check` passed.

Integration screenshots were reviewed in light account mode and dark mock mode at both widths. Mock mode keeps repository actions hidden, successfully creates a task, and makes no backend requests.

Local evidence: `/tmp/pomogit-first-use/` and `/tmp/pomogit-first-use-integration/`. Run fixture checks with account-mode frontend on port 5191 and `node design/verification/check_first_use.mjs`; set `POMOGIT_PLAYWRIGHT_MODULE` to the installed Playwright module if it is not available on Node's default module path.

Fixture tests establish UI behavior with controlled responses, not live OAuth/API availability. Prior live-account acceptance remains separate.
