# 🍅 Pomodoro Timer

> A premium productivity timer built with intention — where institutional reliability meets editorial elegance.

---

## What It Is

A Pomodoro Timer built with **Vite + React** on the frontend and **Java Spring Boot** on the backend. It solves the gap between productivity tools that are functional and ones users actually *want* to return to — most timers are either too bare or too cluttered to feel intentional.

This project also explores an **AI-driven design workflow**, where an AI agent transformed a structured creative brief into a full, production-ready design system — compressing what would normally be days of design work into a consistent, implementable specification.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite + React |
| Backend | Java Spring Boot |
| Styling | CSS + shadcn/ui |
| Design System | AI-generated via `.impeccable.md` → `DESIGN.md` |

---

## AI-Driven Design Workflow

Rather than hand-crafting a design system, this project used an **AI agent as a design reasoning layer**:

1. **Intent Brief** (`.impeccable.md`) — A structured creative brief defining brand personality, aesthetic direction ("Mastercard Editorial"), color palette, and visual constraints. This served as the agent's source of truth.

2. **Design System Generation** (`DESIGN.md`) — The AI consumed the brief and produced a 365-line specification covering color palettes with semantic roles, full typography hierarchy, component-level styling, layout principles, spacing scales, responsive breakpoints, and a reusable prompt guide for downstream generation.

3. **Component Implementation** — The generated spec became the authoritative reference for building React components — timer display, session controls, mode switching — keeping the UI consistent without manual design decisions at every step.

4. **Backend Integration** — Spring Boot handles session persistence and Pomodoro cycle tracking, decoupled from the frontend so the UI stays stateless and clean.

The AI wasn't used to generate code. It acted as a **design reasoning agent** — the human role was intent-setting, validation, and execution.

---

## Design Philosophy

The UI is inspired by the **Mastercard Editorial** design language:

- **Canvas Cream** (`#F3F0EE`) as the foundation — never sterile white
- **Extreme border-radius** — stadium shapes (40px), pills (999px), perfect circles. Zero sharp corners
- **Ink Black** (`#141413`) for all primary content and CTAs
- **Signal Orange** (`#CF4500`) used sparingly as an attention cue
- **Orbital motifs** — thin arcs connecting elements to imply a constellation of features, not a list
- **Cushioned elevation** — shadows at 48px spread, 8% opacity. Never hard-edged

---

## Getting Started

### Frontend

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

---

## Project Structure

```
pomodoro-timer/
├── src/                  # React frontend source
├── public/               # Static assets
├── .impeccable.md        # AI design intent brief
├── DESIGN.md             # AI-generated design system spec
├── components.json       # shadcn/ui component config
├── vite.config.js        # Vite configuration
└── package.json
```

---

## What I Learned

Building this project reinforced that **design consistency is a systems problem**, not a taste problem. By using an AI agent to reason through the design layer-by-layer — color first, then type, then components, then layout — the output was more coherent than most manually produced design systems. The human role shifted from making decisions to *validating* them, which is a meaningfully different (and faster) way to build.

---

## License

MIT
