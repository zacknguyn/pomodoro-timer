# Pomogit — Product Context for Usefulness and Content Review

## Why you are receiving this document

You cannot inspect the application or its source code. This document is the complete product context available to you.

I want you to evaluate Pomogit as a product and as a potential user. I especially want help deciding:

- Whether the app solves a useful problem.
- Whether someone would actually use it repeatedly.
- Whether its current workflow is clear or unnecessarily complicated.
- Whether its current screens are the right screens.
- What purpose each screen should serve.
- What content and actions should appear on each screen.
- What should be removed, combined, renamed, or added.

Do not evaluate its code, infrastructure, business valuation, or visual polish. Evaluate the product idea, information architecture, workflow, and usefulness.

This document describes the current concept, but you may recommend a different structure if the current one is weak.

---

## 1. What kind of app is Pomogit?

Pomogit is a **personal productivity and work-continuity app for solo software developers**.

It combines:

- A small task board.
- A focus timer.
- A session journal or worklog.
- A visual thinking canvas.

However, it is not intended to be just another Kanban board or Pomodoro timer.

The main idea is to help someone answer two questions:

1. **What is the one useful outcome I should work on now?**
2. **When I return later, how do I immediately remember where I stopped?**

The product is based on the belief that developers often lose time not only while working, but while trying to recover context after interruptions, breaks, meetings, sleep, or switching projects.

Pomogit tries to preserve that context through a short checkpoint at the end of every focus session.

---

## 2. The problem it is trying to solve

Imagine a developer working on this task:

> Fix the OAuth callback retry bug.

They focus for 25 minutes and discover the likely cause, but the bug is not finished.

A conventional timer says the Pomodoro is complete. A conventional task board still shows the task as unfinished. Neither necessarily tells the developer what they discovered or what they should do next.

When the developer returns tomorrow, they may need to reopen files, inspect logs, reread the issue, and reconstruct their mental state.

Pomogit instead asks them to end the session with something like:

> What changed: Reproduced the duplicate callback and traced it to the retry handler.

> Next step: Add an integration test for the second callback attempt.

When they return, Pomogit should show that exact next step prominently.

The app is therefore trying to reduce:

- Context-recovery time.
- Unclear next actions.
- Starting too many things at once.
- Treating time spent as if it automatically means work completed.
- Losing useful progress notes between sessions.

---

## 3. The core product principle

Pomogit's main principle is:

> A completed focus session is not the same as a completed task.

A real task may require several focus sessions.

The app keeps three concepts separate:

### Task

The outcome the user ultimately wants to finish.

Example:

> Fix the OAuth callback retry bug.

### Focus session

A protected period spent advancing that task.

Example:

> Focus on this task for 25 minutes.

### Checkpoint

A record of what changed during one session and what should happen next.

Example:

> Reproduced the bug. Next, add the failing integration test.

A task can have multiple checkpoints before it is finally marked complete.

---

## 4. Intended user

The current intended user is a solo software developer who:

- Works on tasks that often span multiple sessions.
- Frequently switches between bugs, features, reviews, and research.
- Sometimes forgets the exact state of unfinished work.
- Wants a small personal system instead of a large project-management platform.
- Benefits from writing down the next concrete step.
- May want to associate progress with a commit, pull request, issue, or written note.
- Sometimes thinks spatially using rough notes and drawings.

The user is not necessarily a productivity enthusiast. Ideally, the app should reduce mental overhead rather than introduce another complicated productivity ritual.

An important question for you to evaluate is whether targeting developers is a strong, useful niche or an unnecessary limitation.

---

## 5. The current core workflow

The intended workflow is:

```text
Capture an outcome
        ↓
Clarify and place it in Ready
        ↓
Choose one task
        ↓
Run a focus session
        ↓
Record what changed
        ↓
Continue later or mark the task complete
        ↓
Return later and resume from the saved next step
```

In shorter form:

```text
Choose → Focus → Checkpoint → Resume or Complete
```

The app allows only one active focus session at a time.

---

## 6. Current application structure

The application currently contains these main experiences:

1. Landing
2. Home
3. Board
4. Canvas
5. Focus
6. Checkpoint
7. Worklog
8. Settings

The persistent navigation currently shows:

- Home
- Board
- Canvas
- Worklog

Focus and Checkpoint are temporary modes, not normal navigation destinations.

Settings is a utility destination.

The app also has a customizable three-item shortcut row. Its default actions are:

- New task
- Start or resume focus
- Search Worklog

---

## 7. Landing screen

### Current purpose

Explain what Pomogit is before the user opens the local workspace.

### Current message

> Keep the thread. Move the work.

It explains that the user should:

- Choose one outcome.
- Protect time for it.
- Leave a checkpoint.
- Return later without reconstructing their context.

### Current content

- Product name and logo.
- Short value proposition.
- Open workspace button.
- Light/dark theme button.
- Explanation of context recovery.
- Explanation of ordered work.
- Explanation of spatial thinking.
- Explanation of checkpoints.
- A small product preview.
- A three-step explanation: Choose, Focus, Continue or Complete.
- A local-first privacy statement.

### Main action

Open the workspace.

### Open question

Does the landing page explain a valuable problem clearly, or does it make a simple productivity app sound more complicated than it is?

---

## 8. Home screen

### Current purpose

Home is intended to be the user's command dashboard and re-entry point.

It should answer:

- What is happening now?
- What should I do next?
- Where did I stop?
- What has moved recently?

Home is not intended to be where users organize all tasks. That belongs to Board.

### Current content

#### A. Now

The largest section on Home.

It displays one of these states:

- The currently running session.
- A paused session.
- A session that is waiting for a checkpoint.
- The most recent unfinished task with a saved next step.
- The first task in Ready.
- An empty state with a New task button.

Its main action changes depending on the state:

- Resume focus.
- Add checkpoint.
- Continue task.
- Start focus.
- Create a task.

#### B. Up next

Shows up to three additional Ready tasks after the primary task.

It currently displays:

- Task title.
- Planned focus duration.
- Position in the Ready order.
- Start button.
- Total number of Ready tasks.
- Total planned Ready minutes.

#### C. Task flow

A small donut chart showing:

- Number of Inbox tasks.
- Number of Ready tasks.
- Number of Done tasks.

It also links to Canvas.

#### D. Focus activity

A seven-day chart showing actual focus minutes recorded each day.

It does not calculate productivity scores, streaks, efficiency, or predictions.

#### E. Recent checkpoints

Shows the three most recent session records.

Each record may contain:

- Task title.
- Continued or Completed status.
- Evidence or written update.
- Saved next step.
- Date.
- Focus duration.

### Current Home design question

Home is supposed to summarize everything important without duplicating Board or Worklog.

Please evaluate:

- Whether these are the right dashboard sections.
- Whether the charts are useful or decorative.
- Whether Home contains too much information.
- Whether another type of content would better help the user orient and act.
- What should be shown first when the user opens the app after a day away.
- What Home should show for a brand-new user with no data.

---

## 9. Board screen

### Current purpose

Board is the canonical place for capturing, clarifying, ordering, and managing tasks.

It should answer:

- What work have I captured?
- What is ready to begin?
- What has been completed?
- Which single task is active?

### Current structure

The Board has three task columns:

#### Inbox

Tasks that have been captured but are not necessarily clear or ready.

#### Ready

Tasks that are clear enough to begin.

Ready tasks are deliberately ordered from top to bottom.

The first Ready task is treated as the default next task.

#### Done

Tasks completed through the focus checkpoint flow.

### Active session strip

Above the three columns is a separate active-session strip.

It shows the single task currently being focused on.

It is not a fourth normal Kanban column because the app only permits one active focus session.

### Current task information

A task contains:

- A recognizable outcome.
- Planned focus duration.
- Optional reference URL, such as a GitHub issue.
- Current stage.
- Position in Ready.

### Current Board actions

- Create a task.
- Add it to Inbox.
- Start it immediately.
- Move it between Inbox and Ready.
- Reorder Ready tasks.
- Start focus.
- Reopen a completed task.
- Delete a task.
- Pin a task to Canvas.
- Pin a task into the shortcut row.

Tasks cannot be dragged directly into Done. The user must finish a focus session and explicitly mark the task complete with a checkpoint.

### Current limitation

There is not yet a strong task-editing experience after creation.

### Current Board design question

Please evaluate:

- Whether Inbox, Ready, and Done are enough.
- Whether the active-session strip is understandable.
- Whether explicit Ready ordering is useful.
- Whether preventing direct movement to Done is valuable discipline or annoying restriction.
- Whether a Kanban board is the right planning model for this product.
- What information each task card should contain.
- Whether estimates, due dates, labels, projects, priorities, or subtasks are necessary or harmful.

---

## 10. Focus screen

### Current purpose

Focus is a temporary distraction-reduced mode for advancing one outcome.

It should answer only:

- What am I working on?
- How much time remains?
- Do I need to pause or stop?

### Current content

- Current task outcome.
- Optional reference link.
- Countdown timer.
- Visual session progress.
- Pause button.
- Resume button.
- End session button.

### Current behavior

- Only one session can be active.
- Refreshing should preserve the correct remaining time.
- Pausing preserves the exact remaining time.
- The user may end early.
- Reaching zero automatically opens Checkpoint.

### Current Focus design question

Please evaluate:

- Whether a countdown is actually valuable to this product.
- Whether Pomodoro-style fixed sessions help or distract from outcome-based work.
- Whether the app should support count-up, stopwatch, open-ended, or flow modes.
- What should and should not appear during Focus.
- Whether references, notes, subtasks, or session intentions belong here.

---

## 11. Checkpoint screen

### Current purpose

Checkpoint closes a focus session without assuming the entire task is finished.

This is the central behavior intended to differentiate Pomogit from an ordinary timer.

### Current first decision

The user chooses:

- Continue later.
- Mark complete.

### Current evidence options

- Written update.
- Commit.
- Pull request.

Commit and pull-request evidence is currently entered manually. It is not automatically verified.

### Current required fields

Every saved checkpoint requires an explanation or evidence of what changed.

If the task will continue, the user must also enter the next concrete step.

### Example

Task:

> Fix the OAuth callback retry bug.

What changed:

> Reproduced the duplicate callback and traced it to the retry handler.

Next step:

> Add an integration test for the second callback attempt.

### Current outcomes

#### Continue later

- Save the checkpoint.
- Return the task to Ready.
- Preserve the next step.
- Make the next step visible when the user returns.

#### Mark complete

- Save the checkpoint.
- Move the task to Done.

#### Discard session

- Save no checkpoint.
- Do not complete the task.

### Current Checkpoint design question

This may be the app's strongest feature or its biggest source of friction.

Please evaluate:

- Whether users would consistently write checkpoints.
- How much information should be required.
- Whether evidence should be optional.
- Whether commit and pull-request options provide real value without integration.
- Whether the flow could capture useful context with less effort.
- When the app should prompt for a next step.
- Whether the checkpoint should happen after every session or only when requested.

---

## 12. Worklog screen

### Current purpose

Worklog is a chronological history of focus sessions and checkpoints.

It should answer:

- What did I work on?
- What changed?
- What evidence did I leave?
- Which tasks continued and which were completed?
- What was the saved next step?

### Current content

- Search field.
- Filters for All, Continued, and Completed.
- Number of checkpoints.
- Total recorded focus minutes.
- Chronological checkpoint list.

Each checkpoint displays:

- Task title.
- Written update, commit, or pull-request evidence.
- Continue or Complete status.
- Next step, if present.
- Date.
- Session duration.

### Relationship to Board

- Board's Done column represents current task state.
- Worklog represents historical session events.

They are intended to be different, even though both involve completed work.

### Current Worklog design question

Please evaluate:

- Whether users need a dedicated Worklog screen.
- Whether it duplicates Done.
- Whether chronology, grouping by task, grouping by day, or another structure would be more useful.
- Whether total focus minutes are meaningful.
- What filters or summaries would actually help users.
- Whether completed work should be reviewed weekly or simply searched when needed.

---

## 13. Canvas screen

### Current purpose

Canvas is a secondary spatial thinking surface for work that is not yet neatly structured.

It is intended to help users think before converting ideas into Board tasks.

### Current content and actions

- Pin an existing task.
- Move task pins spatially.
- Start focus from a task pin.
- Create freeform notes.
- Move and edit notes.
- Convert a note into an Inbox task.
- Draw freehand.
- Erase drawings.
- Remove pins or notes.

Task pins refer to the same tasks used by Board. Canvas does not maintain a separate task system.

### Current limitations

- No zoom controls.
- No infinite-canvas navigation.
- No formal connectors.
- No multiple canvases or documents.
- No collaboration.
- No structured diagrams.
- No version history.

### Current Canvas design question

Please evaluate:

- Whether Canvas meaningfully supports the product's core job.
- Whether it is unnecessary scope.
- Whether it should remain a primary navigation destination.
- Whether it should be renamed or reframed.
- What would make it genuinely useful instead of a decorative whiteboard.
- Whether notes should convert into tasks, attach to tasks, or remain separate.
- Whether another feature would be more valuable than Canvas.

---

## 14. Settings screen

### Current purpose

Settings manages appearance, navigation preferences, and local data.

### Current content

- Light theme.
- Dark theme.
- Configure three shortcut slots.
- Restore default shortcuts.
- Display number of locally stored tasks and checkpoints.
- Export workspace data as JSON.

### Current limitations

- Data can be exported but not imported.
- No cloud backup.
- No account.
- No cross-device sync.
- No timer-default settings yet.

### Current Settings design question

Please evaluate what preferences are actually necessary and whether shortcut customization provides meaningful value.

---

## 15. Local-first behavior

The current product works entirely in one browser.

Advantages:

- No account required.
- Immediate setup.
- Private by default.
- No server dependency.
- User owns an exportable copy of the workspace.

Disadvantages:

- No synchronization between devices.
- No automatic backup.
- Clearing browser data can lose the workspace.
- Export exists, but import does not.
- No collaboration.
- No automatic GitHub evidence.

Please evaluate whether local-first is a meaningful product advantage for this use case or whether lack of synchronization would prevent serious use.

---

## 16. What Pomogit is not intended to be

Pomogit is not currently trying to be:

- A full project-management platform.
- A team collaboration tool.
- A GitHub replacement.
- A calendar.
- A habit tracker.
- A streak-based productivity game.
- An employee-monitoring system.
- A productivity-score dashboard.
- A generic notes application.
- A complex issue tracker.

However, you may conclude that the current product still overlaps too heavily with existing task boards, timers, and notes applications.

---

## 17. What currently exists versus what does not

### Currently present in the product concept

- Landing explanation.
- Home dashboard.
- Inbox/Ready/Done Board.
- One active focus session.
- Focus timer with pause and resume.
- Continue-or-Complete checkpoint.
- Written progress update.
- Manual commit or pull-request evidence.
- Required next step for continued work.
- Searchable Worklog.
- Spatial Canvas.
- Custom shortcuts.
- Light and dark themes.
- Local browser persistence.
- JSON export.

### Not currently present

- Accounts.
- Cloud synchronization.
- Cross-device use.
- Data import or restore.
- Automatic GitHub integration.
- Team collaboration.
- Multiple projects or workspaces.
- Due dates.
- Recurring tasks.
- Calendar integration.
- Notifications.
- Subtasks.
- Rich task editing.
- Verified product analytics.
- Proven active users.

Do not assume missing features must be added. Decide whether they would strengthen the core product or make it more generic and complicated.

---

## 18. Current uncertainties

These questions are not resolved:

1. Is Pomogit fundamentally a focus timer, task manager, developer journal, or context-recovery tool?
2. Is the combination of all four understandable to users?
3. Is the checkpoint ritual valuable enough to become a habit?
4. Would users duplicate tasks already stored in GitHub Issues, Linear, Jira, or another system?
5. Is manual evidence useful without GitHub integration?
6. Does Canvas belong in the product?
7. Are Home charts useful or are they decorative productivity UI?
8. Is the Board too simple to replace another task manager but too complex to accompany one?
9. Does local-only storage create trust and simplicity, or does it make the app feel unsafe?
10. Is the developer-specific positioning a strong niche or an artificially narrow audience?
11. Which single feature would make someone return after the first week?
12. What content should each screen contain so that no two screens feel redundant?

---

## 19. Competing alternatives

A potential user may already use some combination of:

- GitHub Issues.
- GitHub Projects.
- Linear.
- Jira.
- Trello.
- Notion.
- Obsidian.
- Todoist.
- A normal Pomodoro timer.
- A text file containing today's tasks.
- IDE comments or scratch notes.

Pomogit must provide enough additional value to justify either replacing these tools or being used alongside them.

The evaluation should determine whether context recovery and checkpoints create that value.

---

## 20. What I want you to produce

Please act as a senior product designer, product strategist, information architect, and skeptical potential user.

Do not merely suggest more features. First decide what the product should fundamentally be.

### A. Define the product

Provide:

- The clearest product category.
- A one-sentence description.
- The primary user.
- The primary problem.
- The primary promise.
- The main reason someone would use it instead of existing tools.

### B. Give a usefulness verdict

Explain:

- Whether the problem is real, painful, and frequent.
- Whether the current workflow solves it.
- Whether you would personally use the app.
- Why users would return.
- Why users would abandon it.
- Whether the concept should continue, pivot, or be stopped.

### C. Audit the current navigation

Evaluate:

- Home.
- Board.
- Canvas.
- Focus.
- Checkpoint.
- Worklog.
- Settings.

For every screen, state:

1. Whether it should exist.
2. Its single clear purpose.
3. The user question it should answer.
4. Its primary action.
5. Its recommended content, in order.
6. What current content should be removed.
7. What content is missing.
8. Its empty state.
9. Its populated state.
10. Whether it overlaps another screen.

### D. Propose the best screen structure

Give a final recommended navigation and explain:

- Which screens should remain.
- Which screens should be merged.
- Which screens should be removed.
- Which screens should be renamed.
- Which screens are permanent destinations.
- Which experiences should only appear temporarily.

### E. Redesign Home conceptually

Describe the ideal Home screen in detail:

- What appears first.
- What appears when a session is active.
- What appears when the user returns after a break.
- What appears for a new user.
- Whether charts belong there.
- Which information is actionable.
- Which information is vanity or clutter.

### F. Evaluate the core loop

Critique:

```text
Board → Focus → Checkpoint → Resume or Complete → Worklog
```

Determine:

- Which steps are necessary.
- Which steps are too demanding.
- How to reduce friction without destroying the value.
- Whether the timer should remain central.
- Whether checkpointing should be mandatory.

### G. Evaluate Canvas separately

Decide one:

- Keep it as a core feature.
- Keep it as a secondary tool.
- Redesign it around a clearer job.
- Remove it from the initial product.

Explain the decision.

### H. Define the minimum useful product

List the smallest version of Pomogit that is worth testing with real users.

Separate:

- Essential features.
- Useful later features.
- Features to remove or defer.

### I. Recommend validation

Propose:

- The fastest realistic user test.
- What behavior should be observed.
- What questions should be asked.
- What success would look like.
- What result would invalidate the product concept.

### J. Give final scores

Score each from 1 to 10:

- Problem importance.
- Product clarity.
- Workflow clarity.
- Differentiation.
- Daily usefulness.
- Friction.
- Retention potential.
- Trustworthiness.
- Current screen structure.
- Overall concept worthiness.

Finish with one verdict:

- Stop building it.
- Pivot substantially.
- Continue as a focused experiment.
- Develop it into a complete product.

Be direct and critical. Do not praise the amount of work. Do not confuse visual style with usefulness. Do not recommend generic productivity features unless they directly strengthen the core problem being solved.
