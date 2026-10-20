# Profile rework after design feedback

Latest revision: after the user specifically rejected the long horizontal separators, the current prototype uses a featured-work gallery with no section rules. See the new verification note below; earlier composition details are retained as a review record.

The user rejected the first proposal's structure, visual treatment and personality. This replaces the A/B layout choice with one revised HTML direction. The live React profile remains untouched; prior uncommitted application work is preserved. No backend, auth, AWS, publishing, commit or push.

Preview: http://127.0.0.1:5196/design/profile-preview.html
Comparison: http://127.0.0.1:5196/design/profile-review/index.html

## What changed

- Identity is a compact introduction on the page canvas, without a surrounding card or accent stripe.
- The first featured item carries more weight: larger title and an accompanying illustration of the concrete behavior it describes. Further work uses flat rows and rules. Repeated rounded panels, status icons and project pills are removed.
- Copy names actual fixture behavior: restoring a query/project, handling Escape, returning focus. Marketing-style headline and bio filler are replaced with plain role/current-work fields.
- Visitors can open public summaries. Owner-only View task remains inside the summary popup. Private context, task controls, day details and non-opted-in history never enter the visitor content DOM.
- History uses a compact heatmap beside ordinary figures. Counting rules and day inspection are native disclosures. Private activity is collapsed. Manual-like explanations are removed from the main reading flow.
- Existing Dither avatar, app fonts, plum palette, light theme and sidebar/navbar shell remain. Expressiveness comes from hierarchy and work content, not a replacement brand.
- Review options are in a small top-ribbon disclosure, avoiding the previous multi-row control bar on mobile.

## Content and integration boundaries

Identity, captions, work and dates are sample fixtures. The search-window visual is labeled Illustration; it is a CSS demonstration, not a screenshot or evidence fetched from a real task. It must not become fabricated per-task proof in React. Integration must use explicit public captions and existing safe reference links; show real public visuals only when those assets actually exist and are deliberately selected. It can omit an illustration while preserving the lead-entry hierarchy.

Dither PNG variants are captures from the current component, not a new generator. Existing Cancel/Save, optional safe profile links, three-feature limit, public-caption separation, opt-in aggregates, zero-history and long-name states remain interactive. Streak definition and fixture arithmetic are unchanged from the original review: 28 days = 12 active days / 10 h / 4 completed tasks / 3-day streak; 84 days = 19 active days / 15 h 25 min / 4 completions.

The prior prototype's A/B screenshots remain only for comparison. `PROFILE_REVIEW.md` records the original audit and implementation considerations; its A/B recommendation and old check counts are superseded by this revision.

## Verification

- **168 revised-proposal checks passed** across 1440/768/375px × dark/light: flat lead/supporting structure, fixture totals, calendar containment, visible day-button geometry, popup fit, Escape/focus return, Dither-only customization, Cancel/Save, account identity synchronization, safe URLs, selection limit, public-caption editing, visitor summaries without private actions/content, opt-in history, zero/long states, navbar fit, no API requests/browser errors/failed assets.
- Current screenshots: `/tmp/pomogit-profile-reworked/`; clean review captures retained as `design/profile-review/reworked-*.png`.
- Skill light probe: six widths and full 1440→375 sweep. Dark probe: 375/768/1440. No page overflow reported. Mandatory items reconciled below.
- Light P1 (1920 and sweep 375–1440), dark P1 (375/768/1440): View day label wrapping. The control is inside a native disclosure. The reported wrapping was not reproduced in its visible open state. Actual open-control measurements at 375/768/1440 show a single 17px text line within a 21px line-height, and the browser checks assert this. Classified as a probe artifact based on visible-control measurements and screenshots, not a reproduced wrapping defect.
- Dark P2 at 375/768/1440: light background on off-screen `.wb-skip`. Retained as the existing keyboard-focus affordance, not a visible light panel.
- Shared shell scrollbar/menu spacing/navigation badge suggestions remain outside this Profile proposal.
- Frontend `npm run lint && npm test && npm run build` passed with 14 test files. `node --check design/profile-preview.js` and `git diff --check` passed.

Checks cover HTML fixtures, not live sharing, real account records or integrated React Profile. No satisfaction claim is inferred from passing checks; the revised visual direction still needs the user's review.


## Gallery revision after divider feedback

The user clarified that the long horizontal divider lines were the issue and requested another revamp. The current preview removes the rules beneath identity, work entries and history. Grouping now comes from spacing, two side-by-side work samples on desktop, compact captions and aligned summary buttons. On mobile the samples stack. The keyboard illustration complements the search illustration; any additional selected task gets a typographic tile based on its explicit title/project, rather than fabricated proof. Illustrations remain clearly labeled fixtures, not real screenshots.

The composition, caption length and action treatment changed, beyond removing borders. The app palette, Dither avatar, modal behavior and private/visitor boundaries remain. React is untouched.

- **174 gallery proposal checks passed** at 1440/768/375 in dark/light, including an explicit computed-style assertion that identity, work articles and history have no horizontal separator rules. Editing, captions, safe links, visitor privacy, optional aggregates and empty states retain the existing coverage.
- Frontend lint, 14 test files and production build passed. JS syntax and `git diff --check` passed.
- Clean screenshots: `design/profile-review/gallery-*.png`; old divider composition retained in `divider-version-*.png`. Detailed temporary evidence: `/tmp/pomogit-profile-gallery/`.
- Current comparison: http://127.0.0.1:5196/design/profile-review/index.html
- Latest gallery probe reconciliation: light P1 (768/1440) and dark P2 (768/1440) concern View day wrapping; visible open-state single-line checks pass at all three widths, so these remain non-reproduced probe artifacts. Dark P1 (375/768/1440) is the intentionally high-contrast, off-screen skip link. Shared-shell suggestions remain outside this preview change.
