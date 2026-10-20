# Interaction and accessibility pass — 2026-10-11

## Changes

- Task editor uses native field validation for whitespace-only titles and unsupported
  reference protocols. Invalid fields receive focus and expose their invalid state.
  Editing a field clears its custom validation immediately.
- Shared task and repository dialogs expose `aria-busy`, disable Close, and block
  Escape dismissal during pending operations. Relevant footer actions are disabled
  during saves, deletion, reopening, completion undo and logout.
- Admin account deletion now has an explicit Cancel action, account-specific action
  names, and focus return to the restored Delete button. Tests prohibit real mutations.
- Existing Firefox audit selectors now match the approved task footer and focus button.
- Added deterministic desktop/mobile regression checks for validation, pending saves,
  request failure recovery, focus return and administrative cancellation.

The approved page layouts, colors and navigation structure were preserved.

## Verification

| Suite | Result | Evidence |
| --- | --- | --- |
| Firefox keyboard, motion and timer regression | 73 passed | `/tmp/pomogit-interaction-audit/firefox-final/results.json` |
| Firefox contrast cases | 24 passed | Same file; Electric/Sage, light/dark |
| Chromium interaction consistency | 32 passed | `/tmp/pomogit-interaction-consistency/results.json` |
| Public/workspace visible-control naming scan | 16 screens passed | `/tmp/pomogit-interaction-audit/names.json` |
| Frontend lint, tests and build | Passed; 13 test files | Frontend npm commands |
| Diff whitespace | Passed | `git diff --check` |

Keyboard checks include skip navigation, Escape/menu focus, shortcuts while typing,
modal Tab/Shift-Tab containment, settings radio arrows and focus indicators,
keyboard task status changes, editor focus return and silent timer countdowns.
Motion checks cover system/user reduced motion and Dither replay.

Naming scans cover Workspace, Board, Activity, Profile, homepage, login, registration
and recovery at 375/1440px. They are structural checks; they do not compute a full
screen-reader accessibility tree. Native dialogs and settings were tested with
Firefox; invalid-field and pending/failure paths were tested with Chromium.

## Scope and limits

Mock workspaces and isolated browser contexts were used. Account-mode repository
and admin checks intercepted every API request, used fake account records, and
rejected unexpected account mutations. No saved user data or GitHub data changed.
This is not a WCAG certification or a manual screen-reader/physical-device review.
Backend security and live provider behavior remain covered by the separate account
acceptance report, not this mock/fixture pass.

## Re-running

Start the mock frontend on 5190 with `VITE_DEV_BYPASS_AUTH=true`. For the Chromium
repository/admin fixture checks, start a second frontend on 5191 with bypass false;
that browser suite intercepts its API requests before navigation.

```sh
POMOGIT_APP_URL=http://127.0.0.1:5190 python design/verification/check_accessibility.py --output /tmp/pomogit-accessibility
POMOGIT_PLAYWRIGHT_MODULE=/path/to/playwright node design/verification/check_interaction_consistency.mjs
```

The Chromium suite accepts `POMOGIT_APP_URL`, `POMOGIT_CONNECTED_APP_URL` and
`POMOGIT_INTERACTION_OUTPUT`. It checks for the explicit mock-mode marker before
mutating mock tasks. Evidence under `/tmp` is temporary. Nothing was committed.
