# Continue-first product proposal

Approved exploration: build for a developer who dislikes productivity tools and already uses GitHub. Application implementation remains on hold until this proposal is accepted.

## The reason to open Pomogit

Recover personal working context without reading back through an issue thread, recreating a plan, or starting a timer. Pomogit keeps what changed and what to do next beside manually saved development references. GitHub remains the place for shared code review and issue discussion.

## Main workspace

The starting view is Continue: unfinished tasks at left, selected task context at right. The first actionable content is a concrete next step, then an Open reference action and the last saved note. There is no dashboard, productivity summary, or required session ritual.

Continue is a derived presentation of the same tasks and notes, not a second backlog. Board is an optional presentation for moving those same tasks through Inbox / Ready / In progress / Done. Activity recovers notes. Profile and Settings remain under account controls.

## Friction budget

| Action | Required effort | Optional effort |
| --- | --- | --- |
| Capture | Title or reference link | Project, status, next step |
| Resume | Select a task / open its reference | Start a timer |
| Record context | Write a note when useful | Update next step |
| Stop timing | End timer | Add a note afterward |
| Complete task | Explicit Mark done action | Completion note / proof |
| Organize | None to begin working | Project filtering and board movement |

No automatic GitHub synchronization, fetched issue titles, PR status, or branch detection is promised. References are manually entered links in this phase. Links in the sample point to example.com and are labeled as sample references.

## Skeptical user review

- “Why another backlog?” → Continue and Board use the same canonical tasks. Capture is optional; no duplicated GitHub issue import is implied.
- “I do not want to plan first.” → A title or link alone creates an Inbox task; it is immediately selectable in Continue.
- “Do I need a timer?” → No. Opening a reference or saving a note works without a session.
- “Will stopping work ask me to write an essay?” → No. End timer returns immediately; task remains unfinished.
- “What will you remember for me?” → Exactly the notes and next steps the user saved. No fabricated context or inferred progress.
- “Can I fix a mistake?” → Edit fields and change status from the board; completed tasks remain recoverable.

## Visual exploration

A compact top navigation replaces the sidebar. A list/detail arrangement puts the content and action within one workspace. Neutral paper surfaces and dark green working controls avoid color coding every status. Color stays subordinate to readable context and affordances. Mobile uses a horizontally selectable unfinished-task strip above the context and full-screen editing.

## Prototype

Open `continue-proposal.html`. It uses disposable in-memory sample data, never application localStorage or APIs. Profile inputs are illustrative. Optional query scenes: `?scene=board`, `?scene=edit`, `?scene=empty`.

## App changes after proposal approval

1. Align documented design context with the accepted product and visual direction.
2. Keep auth disabled and workApi mocked. Preserve existing local task/checkpoint data.
3. Extend the same mock records for project, In progress, optional next step and task notes. Allow notes without a timer/session while preserving existing session-linked checkpoints. Do not replace or delete historical records.
4. Build one task workspace with Continue and Board presentations. Decide legacy hash compatibility during implementation; avoid adding a parallel state system.
5. Replace mandatory session checkpoint closeout with optional Add note. Explicit completion remains separate.
6. Apply accepted styling to Activity, task editor, Focus, account, Profile, Settings, and loading/error/empty states. Entry/auth/Admin surfaces remain UI-only if styled.
7. Verify existing data migration, one-session invariant, keyboard/touch alternatives, Escape/focus return, mobile, reduced motion, and light/dark behavior. Run frontend lint, tests, build and git diff --check. No AWS or backend changes; no commit unless asked.

## Acceptance test for the design

Can someone capture a task with no extra fields, open a saved reference, understand where they stopped, and leave again without using the timer or board? Does the screen still explain itself when there is no saved note? Those flows matter more than a prettier screenshot.
