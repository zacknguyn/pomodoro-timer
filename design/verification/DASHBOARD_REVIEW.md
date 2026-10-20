# Compact dashboard A: native Dither Kit gradients

Preview: http://127.0.0.1:5198/design/dashboard-preview.html

## Restart

From the repository root, install the isolated preview dependencies if missing:

```sh
npm install --prefix /tmp/pomogit-dither-defaults/deps --no-audit --no-fund --ignore-scripts motion d3-scale d3-shape clsx tailwind-merge
node design/verification/serve_dashboard_preview.mjs
```

POMOGIT_DITHER_DEPS can point to another node_modules directory containing those dependencies. The launcher uses the existing frontend React/esbuild installation, bundles the preview, and serves only staged public assets. Restart after editing sources. App package files are unchanged.

## Current treatment

The user's request for default gradients supersedes the earlier hand-rendered SVG texture approximation. The preview now composes actual upstream AreaChart/LineChart, XAxis, YAxis, Legend, Tooltip, Area and Line components. Registry provenance and the small accessibility/tooltip integration adjustments are recorded in dashboard-preview-kit/upstream/README.md.

Recorded focus uses stackType="stacked", bloom="aura" and gradient variants for all three project series: checkout-api blue, web-client violet, and No project gray. The native clickable legend highlights a project; the native tooltip reports exact minutes. Completion uses the native gradient line renderer. The existing donut renderer is retained. Status bars use solid fills to reduce visual noise.

Project totals and time buckets sum to the recorded-focus headline. Dates and minutes come from generated sample records through 15 October 2026. All-history streak and current task status remain independent of the selected reporting period. Date value controls retain keyboard/touch access and read-only detail dialogs. All five chart panels fit at 1440x768; smaller screens stack them.

This is an isolated HTML review, with no production integration or live account writes. Existing application edits from earlier milestones are preserved. The earlier temporary preview was reconstructed from review history; persistent sources now live under design/.

## Verification

484 browser assertions passed across dark/light, normal/reduced motion, and widths 1440/1024/768/375. The dedicated check covers native canvas/axes/legend selection, exact hover values and tooltip bounds, keyboard/touch date controls, sample arithmetic, period changes, donut painting, first-view fit, data tables, dialogs, empty/error states, Workspace handoff, and absence of external/account requests.

Run: node design/verification/check_dashboard_preview.mjs. POMOGIT_PLAYWRIGHT_MODULE can select another Playwright installation. Evidence: /tmp/evon-design/pomogit-dashboard/defaults-evidence/.

Frontend lint, all 15 unit test files, and production build passed. These checks do not verify live OAuth or database behavior.

Light/dark UI/UX quick probes at 375/768/1440 found no mandatory P failures or console errors. Remaining suggestions concern inherited shell scrollbar declarations, the light navigation menu border token, and a native date input. Gradient contrast requires visual assessment; desktop/mobile screenshots were inspected. The dedicated browser checks above cover interactions omitted by the quick probe. JavaScript syntax and git diff --check passed.

## Lower-card spacing correction

The short desktop view previously put the lower chart cards within 10px of the window edge. A 16px adjustment to the short-screen chart region now leaves at least 20px beneath all five chart panels at 1440x768. The main scroll container has 24px bottom clearance, including safe-area support. Project labels and recorded times use separate grid columns with tabular values; project card headings keep their count from wrapping into the title. No chart data or account behavior changed.

The browser check now also verifies lower-card content containment, label/value separation and footer clearance across both themes, both motion preferences and four widths. All 484 assertions passed. Light/dark quick probes have no mandatory P findings; existing shell scrollbar/date-input suggestions remain. Desktop and mobile bottom-edge captures were visually reviewed. Frontend lint, 15 test files, production build and git diff --check passed again.
