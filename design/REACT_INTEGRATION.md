# Approved preview integration

The reviewed Workspace, Board, navigation, Settings, homepage, and account designs now run in the React frontend.

- Existing task/session state and mock workApi are retained. Authentication remains bypassed. Account preview actions open the existing local workspace; credentials are not stored or sent.
- Appearance extends `pomogit.work-protocol`: Electric/Sage palette, Light/Dark/System, Navbar/Sidebar, density, motion, timer length, and automatic expansion. Settings saves explicitly; Cancel/Escape discard staged changes. Restore defaults requires Save.
- Workspace puts the current task first, with unfinished work beside it on wide screens and below it on smaller screens. Notes open on demand and retain drafts while switching tasks.
- The sidebar uses folder icons for project shortcuts and a distinct Dither-avatar account footer. Notifications leave the account footer accessible.
- Board cards retain the existing drag grip and keyboard/touch-friendly Move to control. Read-only inspection opens before editing.
- The floating timer keeps the existing session clock and minimize/maximize controls. Stopping a timer does not complete a task.
- Homepage art uses the provided Dither image as an atmospheric background. Product images in `frontend/public/preview-assets` are actual React captures with matching palette/brightness and responsive sources.
- Login, registration, and recovery are separate public hash routes with centered, image-free forms. GitHub and email actions remain simulated. Recovery sends no email.

## Review locally

Run `npm run dev -- --host 127.0.0.1 --port 5175` from `frontend`.

Routes: `#work`, `#tasks`, `#review`, `#profile`, `#landing`, `#login`, `#register`, `#recover`.

Browser verification scripts use an isolated Firefox profile and localhost only:

- `design/verification/check_integration.py`: 322 geometry cases across both navigation layouts, palettes, brightness modes, five widths, and eight routes; Settings/account/editor interactions; no API requests.
- `design/verification/capture_react_assets.py`: actual screenshots, tablet readability, note draft retention, focus transitions, and homepage section navigation.

Required frontend checks: `npm run lint && npm test && npm run build`. Repository check: `git diff --check`.

No commit, backend integration, AWS work, or deployment is included.
