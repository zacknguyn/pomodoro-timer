# Product entry and account proposal

Open [entry-preview.html](entry-preview.html). Serve the repository root with `python -m http.server 4173 --bind 127.0.0.1`, then visit http://127.0.0.1:4173/design/entry-preview.html.

## Product structure

The proposed production addresses are `/` for product discovery, `/login` and `/register` for account entry, `/app` for the private workspace, and `/p/:github_username` for a published developer profile. These are proposed addresses, not new React routes. The HTML uses hash links to make the review navigable in one file.

The public page explains the developer's loop: capture a task or reference, choose work, optionally focus, and leave useful context. It shows captured screenshots of the actual mock React Workspace and Board, plus an illustrative developer profile, with a small FAQ explaining privacy and the current GitHub boundary. Login and account creation have distinct calls to action. Product navigation stays separate from workspace navigation. No invented customer logos, metrics, testimonials, pricing, or automatic repository-sync claims.

The latest visuals use the Electric purple/pink direction, with Sage as an alternative, local Barlow and Bricolage fonts, pressable controls, and generated Dither avatars. The uploaded Dither image sits behind the homepage hero as a full-width atmospheric background. The `concept=violet` homepage presents native pictures of the new Workspace and Board layout proposal; see [VIOLET_LAYOUT_PROPOSAL.md](VIOLET_LAYOUT_PROPOSAL.md). The marketing page has a larger editorial rhythm; account forms stay compact and predictable. At narrow widths, forms take precedence over the decorative story. Native links, forms, details, and dialog provide the interaction model; there are no new dependencies.

## Account decisions for review

The draft is **GitHub first, email/password alternative**. This account-model question remains open for user feedback. GitHub provides identity only in the proposed entry flow; repository permissions should not be required just to begin. The production OAuth scope and account-linking policy require a later backend specification.

Registration begins with an empty workspace and a single task capture action. Returning login restores the small demo's unfinished task and note draft. The password field supports reveal, password-manager autocomplete, visible field errors, and a proposed 12-character signup minimum. Login accepts existing shorter passwords. Password recovery gives a neutral response without revealing account existence.

Logout lives in the avatar account menu. Idle logout goes directly to a signed-out screen with Log back in and Explore Pomogit. Active focus opens a confirmation describing the consequence: stop the timer, leave the task in progress. Keep working and Escape preserve the running session and return keyboard focus to the account control. A failure keeps the user in the workspace and offers retry.

Use **Review states** in the bottom-right to inspect session expiry, incorrect login, existing email, GitHub failure, password recovery, and logout failure. Pending actions visibly disable repeated submission. The small workspace is an account-flow sandbox; the full workspace/profile remains in [pages-preview.html](pages-preview.html).

## Boundaries

All account actions are simulated. No credentials are sent or persisted. Tasks and drafts are held in page memory, reset on refresh, and are not live app data. No OAuth, email delivery, cookies, API calls, GitHub synchronization, profile publishing, AWS, or deployment is implemented. React auth remains disabled and workApi remains mocked. This HTML requires visual approval before integration.

## Verification

Run `python design/verification/check_entry.py --output /tmp/pomogit-entry-review` with the static server running. `POMOGIT_ENTRY_URL` can override the preview URL.

The local Firefox audit covers the public page, Login, Register, password recovery, signed-out screen, workspace sandbox, and active-focus logout at 320–1440px, plus 200% zoom. It checks horizontal overflow, dialog bounds, local font loading, form validation, password reveal, pending feedback, email/GitHub entry, first-use capture, preserved context, cancellation and retry, recovery wording, keyboard Escape/focus return, reduced motion, and absence of API requests/storage writes. Screenshots are exported for visual review. This validates the standalone design, not real authentication or persistence.

Latest local verification: 42 rendered geometry cases and all account interaction checks passed, including reduced motion and zero external/API requests or storage writes. Frontend lint, all 11 test files, production build, and `git diff --check` also passed. Screenshots and machine-readable results are in `/tmp/pomogit-entry-review/`.

## Product imagery and scroll pass

The homepage now uses actual React screenshots for Workspace and Board. Responsive `picture` sources select the desktop or mobile capture; both link to full-size images. These captures use an isolated browser profile and the application's default sample data. They are static pictures, with separate links to interactive proposals.

Original lightweight SVG art in `assets/thread-dither.svg` gives the developer's task/reference/next-step thread a pixel motif. `assets/dither-grain.svg` adds restrained background texture. Account screens echo the artwork without adding controls or obscuring the form. Artwork is decorative and excluded from screen-reader output; product pictures have descriptive alternative text and explicit dimensions. The Board picture loads lazily.

Native IntersectionObserver reveals off-screen sections once with a short opacity/transform transition. Initial viewport content remains visible; no scrolling is captured or pinned. Reduced motion and keyboard focus reveal content immediately. Navigating away disconnects the observer; no animation library or application state system was introduced.

Recapture images with `POMOGIT_APP_URL=http://127.0.0.1:5175 python design/verification/capture_entry_images.py --output design/assets` while Vite serves the mock app. Screenshot dimensions/provenance are recorded in `assets/screenshots.json`.

The updated local Firefox audit passed all 42 geometry cases and account interactions, including loaded artwork and scroll-triggered reveal. Desktop/mobile section screenshots and results are in `/tmp/pomogit-entry-art-review/`.

The latest color/brightness proposal supersedes the green-only direction above. See [THEME_PROPOSAL.md](THEME_PROPOSAL.md). Shared appearance controls and themed pictures now support Electric and Sage in both light and dark modes.

## Current account redesign

Login, Register and recovery now use a single centered, image-free form. There is no background artwork, grain texture, example task or marketing column on account screens. The solid violet canvas and raised input surfaces connect account entry to the workspace without distracting from it.

Login reads “Log in to Pomogit”; Register reads “Create your workspace.” GitHub is the primary entry action. Email inputs and a quieter email submit action sit below a clear separator. The form uses 48px controls, native password autocomplete and visible errors. Recovery, password reveal and first-use/returning flows retain their simulated behavior. Review-state controls stay below the form.

Review [Login](http://localhost:4173/design/entry-preview.html?theme=electric&mode=dark&concept=violet#login) or [Register](http://localhost:4173/design/entry-preview.html?theme=electric&mode=dark&concept=violet#register). This remains HTML-only and awaits visual approval before React integration.

Verified: 42 account/product cases, including an assertion that account screens contain no background image or artwork; 118 theme cases and 1,296 critical text contrast samples, with a 6.00:1 minimum sampled ratio. Validation, recovery, password reveal and simulated account failures passed. Lint, tests, build and `git diff --check` passed.
