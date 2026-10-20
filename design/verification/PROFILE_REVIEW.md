# Profile audit and HTML proposals

Superseded design: the user rejected this A/B direction. See [PROFILE_REWORK_REVIEW.md](PROFILE_REWORK_REVIEW.md) for the revised HTML, current screenshots and verification.

Reviewed 2026-10-15. Approved scope: next milestone, Profile; audit and HTML review before React integration. This milestone adds isolated proposals and verification only. No React/backend/auth/AWS changes, user account access, commit or push. Existing uncommitted work is preserved. POMOGIT_REDESIGN_PLAN.md and OPENCODE_HANDOFF.md were not used.

- Proposal A (recommended): http://127.0.0.1:5196/design/profile-preview.html?layout=a
- Proposal B: http://127.0.0.1:5196/design/profile-preview.html?layout=b
- Comparison: http://127.0.0.1:5196/design/profile-review/index.html

## Brief and direction

Pomogit is a personal developer workspace. Profile introduces the person through selected completed work, with a supporting view of their working rhythm. Desktop and mobile matter equally. The user's prior choices establish identity and featured work as primary, a personal/expressive feel, Dither-only avatars, and review before React integration. Existing palette, navigation choices, shared Modal and type are retained.

A places identity above featured work, then rhythm and private context. B moves identity into a sticky desktop rail, with work and rhythm alongside; it stacks below 1100px. Recommend A for readable captions and consistent desktop/mobile ordering. The layout picker is a review tool, not a proposed persistent app setting.

## Audit findings

| Finding | Source | Proposal |
| --- | --- | --- |
| Profile and Activity can disagree about recorded focus: Profile groups every exported session by start day, including active sessions. | Read `Workbench.jsx` days/summary calculation and `activity.js`; not a live-account data comparison. | Integrate with Activity's normalized ended-session events and local end-day rules; use recorded duration. |
| Historical completions disappear from Profile after reopening the task. | Existing completion condition requires the task's current status to be done. Read code. | Count recorded completion events independently from current task status, deduplicating per task in the selected range like Activity. |
| Heatmap gives little date context and 24px cells are small click targets. | Current CSS and desktop/mobile mock screenshots. | Monday-aligned week columns, visible weekday labels, date range, legend and accessible summary. Use a normal-size date field + View day action instead of dozens of tiny interactive cells. |
| Profile mixes private workspace recovery, customization and a visitor-facing identity. | Current mock screenshots and conditional markup. | Identity/selected work first; clearly marked private context below. Visitor preview rebuilds content without private titles/notes, day controls or task-management actions. |
| Current visitor preview is not a published profile. | Existing labels and client-only profile preferences. | Keep that boundary explicit. No Copy link, Publish button or claimed public `/p/username` address in this milestone. |
| Per-profile accent can detach the page from the workspace palette. | Existing profile-specific accent override. Preference/consistency finding, not a measured contrast defect. | These proposals inherit the workspace palette. The profile accent picker is omitted deliberately for review; Dither identity customization remains. |

## Prototype behavior

- Edit name, headline, bio and optional GitHub/website URLs. Safe http/https links only. Cancel discards drafts. Edits exist in demo memory only; not localStorage or an account.
- Avatar variants are PNG snapshots captured from the existing mock Dither ProfileEditor at three seeds. No photo upload or new avatar generator. Production integration would reuse live DitherAvatar, not the PNG fixture cycle.
- Choose up to three completed tasks and write explicit public captions. No private note text is copied. Candidate selection/captions have Cancel/Save behavior. A new profile has no stale selections.
- Owner sees rhythm by default; including it in the visitor preview is opt-in. Visitors get only aggregates/heatmap/streak and never day details, private context or View task actions.
- Active day: recorded ended focus or a completion. Note-only days do not extend streaks. Current streak: consecutive local active days ending today or yesterday. Integration must derive this from normalized history, not the task's current status.
- Four-week fixture: 12 active days, 24 ended focus sessions, 600 recorded minutes, 4 completed tasks, current streak 3 days. Twelve-week fixture: 19 active days, 37 sessions, 925 minutes, 4 completions; same current streak. All dates and identity/work data are illustrative. Today is fixed to Oct 15, 2026 for repeatable review.
- Native date input keeps a familiar keyboard/touch calendar. Wide 12-week heatmaps scroll only inside their frame. Small cells are read-only; the calendar has an accessible aggregate label.
- Review tools offer both layouts, new/long/populated states, light/dark, navbar/sidebar. They are outside the proposed product UI.
- View task and Open Activity show explanatory read-only demo dialogs. After approval, these actions would reuse existing app handlers. The static proposal never starts a timer or changes work.

## Verification

- **200 proposal checks passed** across A/B × 1440/375px × dark/light: ordering, consistent totals/calendar, geometry, day details and Escape/focus return, avatar-only customization, Cancel/Save, URL protocol rejection, three-item limit, independent public captions, no stale empty selections, visitor DOM privacy, opt-in aggregates, empty/long states, navbar fit, no API traffic/browser errors/failed assets.
- Screenshots reviewed in `/tmp/pomogit-profile/preview/`; selected before/proposal screenshots and Dither fixture images retained in `design/profile-review/`.
- Initial A skill probe: six fixed widths plus 1440→375 sweep. Fixed a narrow-grid min-width issue so the 12-week heatmap remains contained; fixed isolated review-toolbar wrapping at 940–1060 by using explicit toolbar rows. Added text balancing for featured titles.
- Final B/light and A/dark probes at 375/768/1440: light has 0 mandatory broken findings; dark has P1 for the off-screen light-colored `.wb-skip` link at all three widths. Dismissed as the existing intentional high-contrast keyboard affordance, not a visible light surface. Kept focusable.
- Other probe suggestions: native date control retained for keyboard/touch familiarity; badge/button text inset differs intentionally because their controls have different padding. Existing shared scrollbar/menu/badge sizing suggestions remain outside Profile scope.
- Frontend `npm run lint && npm test && npm run build` passed (14 test files). `node --check design/profile-preview.js` and `git diff --check` passed.
- These checks verify an isolated HTML proposal. They do not verify integrated React profile statistics, production sharing or live account data.

Repeat with a repository static server on port 5196:

```sh
POMOGIT_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node design/verification/check_profile_preview.mjs
```

## Integration after layout approval

Reuse `buildActivityEvents`, `activityDayKey`, recorded duration and completion semantics. Derive selected-period totals and calendar days together; deduplicate completed tasks in totals while still marking each local day with recorded completion. Calculate streaks from all available normalized history rather than truncating at the selected period. Exclude active/paused sessions and clamp invalid durations. Keep visitor aggregates separate from private task objects so private strings never enter visitor markup.

Reuse DitherAvatar, ProfileEditor/featured dialog behavior, page navigation and task inspection. Keep profile preferences account-scoped and browser-local as today. Preserve validated optional profile links and deliberate public captions. No backend API, published profile route, new page or state system is needed for this UI integration.
