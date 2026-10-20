# Floating navigation integration

The approved floating sidebar/navbar HTML direction is integrated into React.

- Existing saved Navigation choice selects a floating desktop icon rail or wide top bar.
- Home, Workspace, Board and Activity are direct page controls; Projects opens a filtered Board.
- Profile uses the existing Dither Kit avatar, rendered completely on first paint and replayed on hover/focus. No dark avatar tile. Light mode adjusts brightness for legibility.
- Settings remains directly available on desktop. More retains secondary/account actions, including logout and Admin for authorized administrators.
- Phones use a compact top bar for Navbar, or a bottom pill for Sidebar. More provides Profile, Settings, projects and account actions; its Profile indicator remains visible.
- Content and navigation inherit the same existing appearance tokens. No iframe backgrounds or separate preview palettes enter the app.
- Existing filters, preferences, task state, API/auth flows and timer logic are reused. No backend, infrastructure, dependency, commit or deployment changes in this pass.

## Verification

- `npm run lint`, `npm test` (16 test files), `npm run build`, and `git diff --check` passed.
- `check_floating_navigation.mjs`: isolated account fixtures, both navigation choices and both light/dark appearances at 1440, 1201, 1024, 800, 390 and 375px, 900px high.
- Additional 1440/390px checks at 600px high, with 24 extra long project names and a running timer: menus stay inside the viewport, timer stays clear of navigation.
- Covers page routes/indicators, rendered avatar, project filtering, Profile, switching navigation through Settings, persistence after reload, logout availability, Escape/focus restoration, shared canvas and overflow.
- No unexpected mutations or browser exceptions in the fixture checks. Fixtures do not verify live authentication or database behavior.
- Local sample-data React preview at `http://127.0.0.1:5173/#tasks` was verified to make zero account API calls. The bypass is a development-server environment flag, with no saved configuration change.
- Review screenshots: `/tmp/pomogit-floating-navigation-react/`.

Re-run the browser checks with `POMOGIT_PLAYWRIGHT_MODULE` pointing to an installed Playwright module and the account-mode React server at `POMOGIT_APP_URL` (default `http://127.0.0.1:5193`). `POMOGIT_NAV_WIDTHS`, `POMOGIT_NAV_HEIGHT`, `POMOGIT_NAV_LONG_PROJECTS=1` and `POMOGIT_NAV_ACTIVE_FOCUS=1` select focused/short-screen runs.

## Final workflow pass — 2026-10-20

Found and fixed one release issue: after Undo, a fixed notification could sit behind the mobile sidebar pill and make its dismiss button unreachable. Mobile Sidebar now shares one safe-area-aware clearance value across notifications, floating timers and the More menu. Docked Workspace notifications remain in normal content flow.

Verified this pass:

- 136 focus/finish assertions: start, pause, resume, stop, expiry/reload, saved duration, task completion, undo and optional closing notes; both layouts/themes on desktop and phone.
- 112 recorded-work journey assertions: Home → capture → Board → keyboard task inspection/editor → Workspace → focus → completion → Home figures → Activity drill-down → Profile; both layouts/themes on desktop and phone. Includes skip-link, keyboard capture, Enter and Escape/focus restoration.
- 88 first-use assertions: empty Workspace, capture/undo, accessible notification dismissal, repository connection/import and completion; both layouts on desktop and phone. Every account API response was intercepted.
- 140 short-screen navigation assertions: 1440/375px wide, 600px high, 24 additional long project names, active timer, both layouts/themes; verifies scrolling menus, route indicators, settings persistence, viewport bounds and timer clearance.
- Total: 476 browser assertions, no unexpected API writes/browser exceptions. Sample-data workflow tests block account API calls.
- `npm run lint && npm test && npm run build && git diff --check` passed; 16 test files passed.

Real signed-in account verification of the new navigation remains pending. The UI is not deployed and the local API at `127.0.0.1:3000` was offline. A user preference question remains open: verify after deployment or restore local account mode first. Fixture results do not establish live OAuth, repository or database success. No production configuration, account data, commits or deployments changed.
