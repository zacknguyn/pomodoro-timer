# Violet studio layout proposal

This is a review-only layout variant of the existing interactive HTML prototype. React is unchanged. Add `concept=violet` to the preview URL; omit it to compare with the previous layout. Tasks, drafts, filters, dialogs, completion and timer behavior reuse the same prototype code.

- [Homepage background + matching product pictures](http://localhost:4173/design/entry-preview.html?theme=electric&mode=dark&concept=violet#home)
- [Workspace](http://localhost:4173/design/pages-preview.html?concept=violet&theme=electric&mode=dark&scene=workspace)
- [Board](http://localhost:4173/design/pages-preview.html?concept=violet&theme=electric&mode=dark&scene=board)
- [Running focus panel](http://localhost:4173/design/pages-preview.html?concept=violet&theme=electric&mode=dark&scene=running)
- [Light Workspace](http://localhost:4173/design/pages-preview.html?concept=violet&theme=electric&mode=light&scene=workspace)

## Direction

The supplied Scale reference establishes the placement of hero artwork: full-width atmosphere behind the copy, fading into the page. The supplied purple product references establish depth and visual weight: deep violet canvas, distinct working surfaces, raised controls and selective light around focus. Pomogit's unchanged purple/pink Dither image gives the background its own texture. This is an interpretation, not a reproduction of those sites or their layouts.

Workspace puts the current task first, with unfinished work in a separate contextual rail on desktop. Notes begin collapsed; Add note opens and focuses the existing form. A typed draft stays available when changing tasks. Mobile presents the current task before a compact task chooser.

Settings now supports either a Navbar or Sidebar; see [SETTINGS_NAVIGATION_PROPOSAL.md](SETTINGS_NAVIGATION_PROPOSAL.md). The desktop sidebar gives the brand, page dropdown, reusable project shortcuts and account footer distinct positions. Project shortcuts operate the same native project filter, retain keyboard focus after rerender, and toggle off when selected again. Mobile retains the page dropdown, avatar and project filtering through Filters.

Board uses four explicit status columns, task counts, clearer drag handles, raised task cards and status-specific empty instructions. Cards still open the read-only task dialog. Move to remains available alongside pointer dragging, including on mobile. Smaller desktop widths use two columns; phones use compact stacked status groups.

The focus timer retains its bottom-right panel, minimize/maximize, pause/resume and stop controls. Its violet field and pink primary action distinguish it from task content. Existing elapsed-time progress stays semantic; there are no invented metrics or decorative charts.

Appearance still offers light/dark and the previous Sage palette. Both current layout and new variant remain available for comparison. The homepage's violet variant uses native screenshots captured from this new proposal; the normal homepage retains its existing theme pictures.

## Review and boundaries

Approve or revise the HTML before React integration. Accounts remain simulated, React auth disabled and workApi mocked. No dependencies, backend, AWS, deployment, commits or task state systems were added.

Serve the repository root with `python -m http.server 4173 --bind 127.0.0.1`.

Browser validation: `python design/verification/check_violet.py --output /tmp/pomogit-violet-review`. Homepage/account regression: `python design/verification/check_entry.py --output /tmp/pomogit-background-entry-review`. Native screenshot capture: `POMOGIT_PREVIEW_CONCEPT=violet python design/verification/capture_theme_images.py --output design/assets`.

Verified: 58 violet layout cases (including 200% zoom), 737 critical text contrast samples (minimum 6.66:1), project shortcuts and focus return, task drafts, dialogs, timer controls and reduced motion. The shared theme audit passed 118 cases and 1,478 contrast samples; homepage/account regressions passed 42 cases for the regular entry and 42 for the violet entry. `npm run lint && npm test && npm run build` and `git diff --check` passed.
