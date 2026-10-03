# Settings and navigation proposal

Review [Settings](http://localhost:4173/design/pages-preview.html?concept=violet&theme=electric&mode=dark&nav=sidebar&scene=settings), [Sidebar Workspace](http://localhost:4173/design/pages-preview.html?concept=violet&theme=electric&mode=dark&nav=sidebar&scene=workspace), or [Navbar Workspace](http://localhost:4173/design/pages-preview.html?concept=violet&theme=electric&mode=dark&nav=navbar&scene=workspace).

Settings uses visible native radio groups instead of selects: illustrated Navbar/Sidebar choices, Light/Dark/System buttons, palette swatches, Comfortable/Compact spacing, motion choices and 15/25/45/60 minute sessions. The expand-timer preference uses a native checkbox presented as a switch. Native keyboard arrows, focus outlines and selected borders remain available. Filters with many projects and task status selectors remain dropdowns.

The header and Save/Cancel footer stay fixed within the dialog. Only the settings body scrolls. Appearance and navigation form one section, followed by focus and data/sharing. Export and Profile preferences remain direct actions, with no duplicate profile-editing controls.

Navbar and Sidebar share the existing page dropdown, avatar, tasks, filters, drafts and timer. Sidebar exposes project shortcuts with recognizable folder icons and an account footer. Selected projects highlight the folder and row; names have a consistent 12px gap from their icon. Navbar puts the same page control and account at the top; project filtering remains in the page. Both adapt to compact top navigation on phones. Switching layouts keeps the selected task and current focus session.

Save applies the choices. Cancel, Escape and the close button leave the applied setup alone; reopening pre-fills the applied values. Restore defaults stages Sidebar, Electric, system brightness, comfortable spacing, system motion, a 25-minute next session and an expanded focus panel; Save is still required.

Navigation, palette and brightness travel in the preview URL. Navigation can be inspected directly with `nav=navbar` or `nav=sidebar`, and survives refreshing that URL. Other preferences and all task data remain in memory. The current focus session retains its original duration for progress calculations when the next-session length changes.

This remains HTML-only, awaiting visual approval before React integration. React auth stays disabled and workApi stays mocked. No account preference backend, persistence system, dependencies, deployment, AWS or commits were added.

Validation: `python design/verification/check_settings.py --output /tmp/pomogit-settings-navigation-review`. This covers both layouts at 320/390/768/1440 pixels, light/dark, 200% zoom, native radio keyboard interaction, Save/Cancel/defaults, URL refresh and preservation of a paused active session.

Verified: 52 navigation/settings browser cases plus 118 theme and 107 workflow/scaling cases. Native Save/Cancel/defaults and keyboard checks passed. `npm run lint && npm test && npm run build` and `git diff --check` passed.
