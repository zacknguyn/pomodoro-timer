# Pomogit preview direction

Current design input: the user likes the existing app/preview and wants refinement, continuing from `pages-preview.html`. The redesign plan and handoff are excluded as references for this pass.

## Precise developer workbench

Audience: developers capturing work, choosing an outcome, optionally focusing, and saving enough context to return. Personality: direct, calm, assured. Preserve the established green/ink palette, Barlow/Bricolage typography, Dither avatar and dropdown navigation.

Hierarchy follows work: project → task title → next step → supporting controls. Board columns carry lifecycle status; cards avoid repeating status badges already explained by their column. Drag grips remain visible and Move to remains available. Missing next steps do not produce repeated filler text.

Selected context receives the strongest title and clear project/status labels. The timer is a distinct ink-green instrument with tabular numerals, elapsed progress and explicit pause/stop actions. Completion remains separate.

Workspace, Board, Activity, Profile and Settings share the same control shapes, type weights, border treatment and icon vocabulary. Motion communicates interaction; reduced motion stays supported. Existing responsive scroll and fixed-dialog-action behavior remain required.

## Implementation and review

`workbench.css` layers the visual refinement after `scaling.css`. Behavior and fixtures remain in the existing standalone HTML. The user subsequently approved a React port, documented in APP_INTEGRATION.md. No new routes, backend, auth changes, AWS work or commit.

Review scenes: returning Workspace, Board, running/minimized/maximized timer, Activity, Profile, Settings, first visit and 100-task stress fixtures. The user approved this direction for UI-only integration. Automated geometry checks support behavior and scaling; the user provided aesthetic approval.

### Readability and live-state follow-up

Project labels use 13px and status labels 12px at the default font size. Distinct status icons supplement their labels. Activity uses the linked task title as its single entry action; its filter result counts work records. Timer progress updates alongside each countdown tick, freezes on pause, and disappears on stop without replacing controls or stealing focus. These behaviors have browser regression coverage in the existing scaling audit.
