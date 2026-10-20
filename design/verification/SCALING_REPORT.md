# React scaling and workload verification

Verified 2026-10-11 using isolated local UI-preview sessions. User account data and GitHub repositories were not modified.

## Confirmed issue and fix

Workspace's desktop grid started at 1001px while an older sidebar rule switched to one column through 1050px. Their combination could reduce the task detail panel to zero width. Both Workspace modes now switch at 1100px: narrower screens stack the focus/context rail and task detail; wider screens retain the approved two-column layout.

At 1024px with sidebar navigation, Chromium measured the task detail panel at 0px before and 714px after the fix. The workload checker now asserts that task details stay at least 240px wide across its matrix.

## Evidence

- Firefox workload: **64 layout cases and 21 interaction checks passed**. 50/100 tasks, 24 project names, long unbroken titles, 120 notes, sidebar/navbar navigation, and 1440/1024/390/320px window widths. Pages: Workspace, Board, Activity, Profile.
- Firefox reflow: **60 cases passed**. Both navigation choices, actual 200%/400% browser zoom, narrow 320px screens and short landscape windows. Includes task inspection and Settings dialogs. No document, main panel, dialog, or footer horizontal overflow in this matrix.
- Reviewed desktop/mobile screenshots and 400% Settings rendering. At extreme zoom, the fixed dialog header/footer leave a small scrolling body; this check establishes reflow, not comfortable use on a physical device.
- UI skill Chromium probe at 1440/375px found no items categorized as broken. Its style suggestions include existing navigation badge size, menu spacing, scrollbar styling, and a compact reference link. These were not treated as layout failures or used to replace the approved design.
- Frontend lint, all **13 test files**, production build, and `git diff --check` passed.

Evidence directories: `/tmp/pomogit-scaling-audit/workload-final`, `/tmp/pomogit-scaling-audit/zoom`, `/tmp/pomogit-scaling-audit/probe`. These temporary artifacts are local and may be removed by system cleanup.

## Repeat locally

Start frontend with `VITE_DEV_BYPASS_AUTH=true npm run dev -- --host 127.0.0.1 --port 5190 --strictPort`, then from the repository root:

```sh
POMOGIT_APP_URL=http://127.0.0.1:5190 python design/verification/check_workload.py --output /tmp/pomogit-workload
POMOGIT_APP_URL=http://127.0.0.1:5190 python design/verification/check_app_zoom.py --output /tmp/pomogit-zoom
```

These checks use disposable Firefox profiles and require the local mock preview. They do not establish real-device touch behavior, production performance, or real-account connectivity.
