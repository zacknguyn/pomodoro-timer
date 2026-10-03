# Electric / Sage appearance proposal

This is an HTML review, with no React theme, authentication, API, or backend changes.

## Review

- [Electric Light homepage](entry-preview.html?theme=electric&mode=light#home)
- [Electric Dark homepage](entry-preview.html?theme=electric&mode=dark#home)
- [Electric Light Workspace](pages-preview.html?scene=workspace&theme=electric&mode=light)
- [Electric Dark Workspace](pages-preview.html?scene=workspace&theme=electric&mode=dark)
- [Electric Dark Board](pages-preview.html?scene=board&theme=electric&mode=dark)
- [Sage Light Workspace](pages-preview.html?scene=workspace&theme=sage&mode=light)
- [Sage Dark Workspace](pages-preview.html?scene=workspace&theme=sage&mode=dark)

Serve the repository root on port 4173. Use **Appearance** in the preview ribbon to compare Color theme and Brightness. The current choices carry between the homepage and workbench in URL parameters. Refresh preserves an explicit URL choice. Device setting follows the browser's light/dark preference; an explicit Light or Dark choice takes priority. No storage is written.

The workspace's Settings → Look & feel also includes Color theme and Brightness. Changes apply only on Save; Cancel preserves the current appearance. Restore defaults proposes Electric with device brightness, and still requires Save. Switching appearance preserves task selection, drafts, filters, and running timers.

## Visual direction

Electric uses the supplied purple/pink Dither image as its brand artwork. Light mode has pale lilac surfaces, dark violet text, saturated violet primary buttons and pink focus controls. Dark mode has a deep violet canvas, raised violet panels, soft lilac actions and pink focus controls. Color is placed around clear text and controls; status labels remain visible with distinct semantic colors. Sage retains the previous green family and has a corresponding dark variant.

This is a designed dark palette, with differentiated surface levels and readable borders. It does not apply an inversion filter to the page or product screenshots. The monochrome logo is inverted in dark mode; generated Dither avatar colors remain intact.

Homepage screenshot sources follow the chosen palette and brightness. Electric and Sage Dark captures come from the themed **HTML proposal**, not an integrated React implementation. Original Sage Light pictures remain captures of the current mock React app. Captions label the theme proposal and sample data. Desktop/mobile picture sources preserve aspect ratio; the image link opens the selected full-size desktop capture. The reference image is copied unchanged to `assets/electric-dither.png`.

## Implementation / verification

`preview-theme.css` supplies shared surface, text, action, focus and status colors. `preview-theme.js` uses native selects, CSS attributes, device media queries and URL parameters. It has no dependency, storage service or React state system. Both HTML previews share the same controls and tokens.

Regenerate proposal pictures with:

```sh
python design/verification/capture_theme_images.py --output design/assets
```

Run the appearance audit with:

```sh
python design/verification/check_themes.py --output /tmp/pomogit-theme-review
```

The audit checks both palettes in both modes at 320, 768 and 1440px across homepage, Login, Register, signed-out screen, Workspace, Board, Profile, task editor and Settings. It samples critical text contrast, checks dialog/page bounds and themed images, then exercises 200% zoom, draft preservation, keyboard dismissal, Settings Save/Cancel, cross-preview navigation, device brightness, explicit override and reduced motion. These are representative contrast samples, not a full WCAG conformance claim.

The account-flow audit remains `check_entry.py`; the comprehensive prototype workflow audit remains `check_scaling.py`. Auth stays simulated and current React settings remain unchanged until visual approval.

## Current verification results

The final local run passed 118 appearance geometry cases and 1,478 representative text contrast samples (minimum 6.00:1), including both palettes/modes and the native appearance interactions. The existing workbench audit passed 107 geometry cases plus workflow checks, and the account proposal passed 42 layout cases plus entry/logout/recovery/reveal checks. Frontend lint, all 11 test files, production build, JavaScript syntax checks and `git diff --check` passed. Browser evidence is in the `/tmp/pomogit-theme-review`, `/tmp/pomogit-themed-workflow-review` and `/tmp/pomogit-themed-entry-review` folders.
