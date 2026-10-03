# Preview scaling review

Scope: standalone `pages-preview.html` approval preview. React integration remains pending; auth stays disabled, workApi mocked, and no backend or AWS work is included.

## Changes

- Long titles, project names, notes, profile text and links wrap without widening the page. Task previews clamp text; dialogs retain full content.
- Desktop board columns have bounded scrolling and sticky headings. Workspace list and column scroll positions survive task selection and timer updates. Mobile columns use the main content scroller.
- Mobile filters disclose project/status controls while retaining search and applied filter chips. Compact touch controls have larger targets.
- Mobile content reserves measured space for the floating timer. Text entry hides the panel without stopping focus; VisualViewport changes resize the content and dialog bodies.
- Dialog headers and actions remain fixed while their bodies scroll.
- Drag handles lift cards with a ghost and destination highlight; edge scrolling supports crowded lanes. Status selectors remain available for keyboard and mobile use.

## Reproducible verification

Run `python design/verification/check_scaling.py` from the repo root. Requires local Firefox and Python 3; uses an isolated temporary browser profile and no third-party automation dependency. Results and screenshots go to `/tmp/pomogit-scaling-review` by default.

The audit covers 107 geometry cases: 320, 390, 768, 1024 and 1440px windows; short and tall phone windows; actual 200% browser zoom; first-use, single-task, 30-task and 100-task fixtures; unbroken text; profile variations; settings, task/profile dialogs and expanded timer. It checks horizontal overflow, dialog/footer reachability and timer bounds.

Interactions exercise native pointer dragging, keyboard search, filters, scroll preservation, note/editor drafts, mobile timer behavior, completion and reopening. Keyboard-size VisualViewport contraction is simulated; physical phone keyboard behavior and other browser engines still require device review. Local 100-task render timings are diagnostics, not a production performance guarantee.

Frontend lint, tests and build are separate baseline checks; passing this audit does not verify the React app's responsive layout. No application port or commit is included.

Latest local result: PASS — 107 geometry cases and all interaction checks, including simulated keyboard viewport contraction. Five 100-task render samples were 5, 5, 6, 5 and 4ms. Required frontend lint, tests and build passed; inline JavaScript syntax checks and `git diff --check` passed.
