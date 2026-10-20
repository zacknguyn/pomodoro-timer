# Workspace performance — 2026-10-20

Local implementation and fixture verification only. No commit, deployment, cloud changes or live-account mutations.

## Implementation

- Added authenticated `GET /api/sessions`, scoped by the current account and using the same session representation/order as export. The full export remains available for downloads.
- Workspace refresh now requests session history directly, avoiding duplicate tasks/checkpoints from the full export.
- Overlapping foreground reads share a pending refresh. Reads following a mutation wait for any earlier read, then request fresh data. Failed reads release the pending operation and allow retry.
- Connected projects have a 60-second in-memory cache within the account's mounted workspace. Connection, removal and import invalidate it; older project reads cannot overwrite these changes.
- Chart loops stop offscreen and when the document is hidden. Reduced-motion charts stop scheduling frames after settling, and wake on changed chart inputs, keyboard inspection or app/OS motion changes. Normal-mode sparkles remain visible.

## Local production-build measurements

The same intercepted fixture contained 120 tasks, 60 checkpoints and 100 sessions. Response bytes are uncompressed fixture JSON, not measured production network transfer. A foreground burst dispatched focus and visibility events together, with 70 ms fixture response latency.

| Measurement | Before | After |
| --- | ---: | ---: |
| Initial requests, including account restoration | 6 | 6 |
| Initial response bytes | 118,489 | 66,305 |
| Foreground-burst requests | 10 | 4 |
| Foreground-burst response bytes | 236,826 | 66,227 |
| Offscreen chart canvas clears over 1.2 seconds, normal motion | 174 | 0 |
| Hidden-page chart clears over 1.2 seconds, normal motion | 170 | 0 |
| Settled chart clears over 1.2 seconds, reduced motion | 152 | 0 |

Initial fixture response volume fell about 44%; foreground-burst volume fell about 72%. Canvas clears count both visible chart layers, not individual animation frames. Hidden-page behavior was tested with a simulated document visibility event. Task-duration measurements varied between runs; no production CPU, latency or billing savings are claimed.

## Verification

- Frontend lint, 11 test files and production build passed; backend syntax and test commands passed. Opt-in database integration tests were not run against a live database.
- Added refresh race/recovery checks, session owner-query coverage, unauthenticated Lambda coverage and mock session-history parity. Extended the opt-in account integration test with history/export parity and cross-account isolation assertions.
- The saved performance check verifies foreground deduplication, cache expiry, offscreen/hidden sleeping, resumed animation, keyboard marker changes and dynamic app/OS reduced motion.
- First-use browser suite: 88 checks passed. Project suite: 76 checks passed. Mobile dashboard suite: 106 checks passed; desktop sidebar interactions also passed before the legacy navbar clearance assertion.
- Compared 96 page/dialog states against the preceding cleanup: 95 were pixel-identical. One mobile navigation border differed by one channel level at nine pixels. No layout change.
- Verification script syntax and `git diff --check` passed.

Known existing issue: the full dashboard suite fails its no-scroll clearance assertion at 1440×768 with navbar navigation. An isolated build using the earlier Workbench/API/chart source reproduced identical geometry: lower cards end at 790.78 px; the assertion requires at most 748 px. Sidebar lower cards end at 712.78 px. This performance pass does not change the layout or weaken that assertion.

Follow-up: the short-screen navbar clearance issue is now fixed, and all eight opt-in integration tests have passed against disposable PostgreSQL 17.11. See [dashboard and database verification](DASHBOARD_DATABASE_VERIFICATION.md) for the subsequent changes, results and live-provider boundaries.

## Reproduce

From `frontend`, build in account mode and run `npm run preview -- --host 127.0.0.1 --port 5194`. From the repository root:

```sh
POMOGIT_APP_URL=http://127.0.0.1:5194 node design/verification/check_workspace_performance.mjs
```

If Playwright is installed elsewhere, set `POMOGIT_PLAYWRIGHT_MODULE` to its module path. Results go to `/tmp/pomogit-workspace-performance/results.json`; temporary baseline measurements and screenshots are not permanent artifacts.

For a future release, deploy the backward-compatible backend endpoint before the frontend that calls it. No database migration is needed. Session history still loads in full; pagination can be considered if account sizes justify it.
