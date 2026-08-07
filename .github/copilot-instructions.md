## Design Context

### Users

Pomogit is for solo software developers who want a focused bridge between intention and shipped work. They plan concrete outcomes, protect time to finish them, and close sessions with evidence such as a commit, pull request, or written result.

The product should reduce planning friction and make progress inspectable. It is not a generic Pomodoro timer, social network, or productivity-score dashboard.

### Brand Personality

Graphic, direct, assured.

Pomogit should feel like a carefully designed independent software product with the directness and graphic economy of Sprout: confident typography, plainspoken copy, useful humor in small details, and no ornamental polish that obscures the product.

### Aesthetic Direction

Use Sprout as the sole dominant visual reference: a nearly white canvas, near-black grotesk typography, acid-lime primary actions, thin neutral rules, compact navigation, sparse pixel-like brand details, generous whitespace, and simple outlined modules.

Replace the cream and forest-heavy palette. Light mode should be overwhelmingly white and black with lime used only for actions and current selection. Dark mode should invert the neutral field while keeping lime controlled. Drop glassmorphism, decorative ASCII, atmospheric gradients, soft auras, giant framed cards, random glyphs, conventional dashboard tiles, and generic blue-purple effects.

Layouts should be flat, crisp, and grid-aware. Use small radii, one-pixel outlines, firm rectangular controls, and almost no shadows. Motion should be quick and functional, using opacity and transform only.

The product shell must always answer three questions without interpretation: where am I, what stage of the workflow am I in, and where can I go next. Desktop uses a quiet utility sidebar inspired by compact browser sidebars: a row of three icon shortcut tiles for Today / Focus / History, then a simple vertical list of concrete destinations such as the dashboard, queue, current session, and evidence library. Use short labels, restrained rounded selection surfaces, and no redundant descriptions. Mobile uses a compact page header and labeled bottom navigation.

Keep marketing composition on the landing page. Inside the workspace, use fixed-size application typography, compact page titles, section rules, and task-dense layouts. A product route should feel like a specific working surface, never like another homepage with a giant slogan.

On desktop, the sidebar sits directly on the application background outside the rounded workspace frame. Only the page region is wrapped: its persistent header and independently scrolling body share one outlined, rounded surface. Keep the navigation rail visually quiet and borderless so it reads as the shell around the workspace, not as a second card. Its width is user-resizable from the seam, persists locally, and moves the workspace edge with it. Do not add redundant locality labels to the rail. Interactive controls throughout the product use a restrained machined treatment: cool-neutral vertical gradients, hairline borders, inset highlights, and shallow pressed states. Inputs use the same material more quietly and remain visually recessed. Lime gradients are reserved for primary actions and active selections; content surfaces stay flat. Hover feedback never moves controls or changes surrounding geometry; use finish, border, color, and inset depth in place. Long workspace pages expose a persistent, scroll-aware local index so users always know their current section and can jump directly to another.

### Design Principles

1. Make Pomogit recognizable through graphic economy, not decoration.
2. Let the work outcome lead; the timer supports it.
3. Show the real product as the visual centerpiece.
4. Use white space, black type, thin rules, and rare lime accents to create hierarchy.
5. Close every completed session with inspectable evidence.
6. Preserve accessibility, reduced motion, keyboard use, and responsive composition.
7. Never rely on icon-only navigation or color alone to communicate location and progress.
8. Separate global journey switching from page and section navigation.
9. Prefer quiet utility surfaces over diagrammatic navigation or oversized containers.
10. Keep the sidebar outside one rounded page wrapper, with the persistent header inside that wrapper.
