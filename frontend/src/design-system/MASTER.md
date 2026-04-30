# Pomogit Design System

## Aesthetic Direction
**Warm Editorial Utility** — breathable cream canvas, pill/circle geometry, signal orange accent, editorial typography. Feels like a well-designed internal tool, not a consumer app.

---

## Tokens (`globals.css`)

### Color (OKLCH)
| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--canvas` | `98% 0.008 80` | `11% 0.008 80` | Page background |
| `--surface` | `95% 0.008 80` | `15% 0.008 80` | Card backgrounds |
| `--surface-alt` | `92% 0.01 80` | `19% 0.01 80` | Nested surfaces |
| `--text` | `14% 0.01 80` | `95% 0.008 80` | Primary text |
| `--text-muted` | `34% 0.01 80` | `68% 0.008 80` | Labels, secondary text (WCAG AA) |
| `--primary` | `62% 0.20 35` | same | Signal orange — CTAs, accents |
| `--accent` | `72% 0.14 150` | same | Green — active/focus states |

All neutrals tinted toward hue 80 (warm orange) for subconscious brand cohesion.

### Typography
| Token | Value |
|-------|-------|
| `--font-display` | Epilogue (Google Fonts) |
| `--font-body` | Figtree (Google Fonts) |

### Geometry
| Token | Value |
|-------|-------|
| `--radius-card` | `28px` |
| `--radius-pill` | `9999px` |
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` |

---

## CSS Utility Classes

| Class | Purpose |
|-------|---------|
| `.mc-display` | Epilogue, 700, -0.025em tracking |
| `.mc-body` | Figtree |
| `.mc-label` | Figtree, 11px, 700, uppercase, 0.18em tracking, `--text-muted` |
| `.mc-card` | Surface bg, 28px radius, 2rem padding |
| `.mc-btn-primary` | Orange pill CTA with focus-visible ring |
| `.mc-pill` | Inline-flex pill shape, no default bg |
| `.mc-input` | Pill input with focus ring |
| `.mc-section-header` | Flex row, space-between, border-bottom |
| `.mc-orbit` | Circular overflow-hidden container |
| `.mc-satellite` | Absolute badge positioned bottom-right of orbit |
| `.mc-hover-lift` | `translateY(-2px)` on hover |
| `.mc-stagger-item` | Empty — initial state set via `gsap.set()` |

---

## Components (`src/components/`)

| Component | Props | Usage |
|-----------|-------|-------|
| `StatusBadge` | `variant` (success/active/muted), `children` | Session status, member status |
| `PageHero` | `eyebrow`, `pulse`, `children` (h1), `right` | Top of every screen |
| `SectionHeader` | `title` (string or JSX), `right` | Card/section headers |
| `AvatarOrbit` | `src`, `alt`, `size`, `active`, `loading` | Team member avatars |
| `EditorialCard` | `glow`, `glowPos`, `children` | Dark inverted emphasis cards |
| `Button` | `variant` (primary/pill/ghost), `size` (sm/md/lg/xl) | All buttons |
| `Sidebar` | `open`, `onClose` | Main nav, mobile drawer |
| `Header` | `onMenuClick`, `isDeepFocus` | Top bar, breadcrumb, avatar menu |
| `Loading` | — | Lazy route fallback |

---

## Patterns

### Inline style convention
All color values use CSS var tokens:
```jsx
style={{ color: "oklch(var(--text))" }}
style={{ background: "oklch(var(--primary) / 0.1)" }}
style={{ borderColor: "oklch(var(--text) / 0.06)" }}
```

### Dark card text (on `oklch(var(--text))` background)
Use `oklch(var(--canvas) / N)` — never `rgba(255,255,255,N)`:
```jsx
style={{ color: "oklch(var(--canvas) / 0.4)" }}   // muted
style={{ color: "oklch(var(--canvas) / 0.75)" }}  // readable
style={{ color: "oklch(var(--canvas))" }}          // full
```

### Dynamic icons
```jsx
// Always createElement — never <Icon /> for dynamic icon variables
React.createElement(Icon, { className: "w-4 h-4" })
```

### GSAP stagger (correct pattern)
```js
gsap.set(".reveal", { opacity: 0, y: 24 });   // set first
gsap.to(".reveal", { opacity: 1, y: 0, stagger: 0.1, duration: 1, ease: "power4.out" });
```

### Focus trap (drawers/dialogs)
Use `useFocusTrap(active, onClose)` hook pattern from `ProfileScreen.jsx`.

---

## Absolute Bans
- `border-left/right > 1px` colored stripes
- Gradient text (`background-clip: text`)
- `transition: all` — always specify properties
- `rgba(255,255,255,*)` — use `oklch(var(--canvas) / N)`
- Fonts: Newsreader, Instrument Sans, Inter, or any font in the reflex list
- `opacity: 0` on stagger items in CSS — use `gsap.set()`
- `shadow-xl` on hover (generic drop shadow anti-pattern)
