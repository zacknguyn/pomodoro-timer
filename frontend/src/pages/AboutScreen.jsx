import React from "react";
import { Link } from "react-router-dom";
import { Timer, Github, Users, BarChart2, Zap } from "lucide-react";

const FEATURES = [
  {
    icon: Timer,
    title: "Pomodoro timer",
    body: "25-minute focus cycles with configurable short and long breaks. Chimes on completion. Blocks navigation while running so you stay in the zone.",
  },
  {
    icon: BarChart2,
    title: "Focus heatmap",
    body: "A full year of session history visualised as a contribution-style heatmap. Overlay your GitHub commit activity to see how code output tracks with focus time.",
  },
  {
    icon: Users,
    title: "Group sessions",
    body: "Create a group tied to a GitHub repo. See your teammates' recent commits, session activity, and shared notes — all in one place.",
  },
  {
    icon: Github,
    title: "GitHub integration",
    body: "Connect GitHub once via OAuth. Your commit heatmap, repo selector, and group commit feed all update automatically.",
  },
  {
    icon: Zap,
    title: "Public profile",
    body: "Every user gets a public profile at /u/username showing their focus stats and heatmap. Share it or keep it as a personal record.",
  },
];

const AboutScreen = () => (
  <div className="max-w-3xl mx-auto px-6 pt-8 pb-32 space-y-20">

    {/* Hero */}
    <header className="space-y-6 pt-8">
      <p className="mc-label" style={{ color: "oklch(var(--primary))" }}>About Pomogit</p>
      <h1 className="mc-display text-6xl sm:text-7xl leading-[1.0] -tracking-[0.035em]">
        Focus time,<br />made visible.
      </h1>
      <p className="mc-body text-lg max-w-xl" style={{ color: "oklch(var(--text) / 0.5)" }}>
        Pomogit is a Pomodoro timer built for developers — it connects your focus sessions to your GitHub activity so you can see exactly where your time goes.
      </p>
      <div className="flex gap-4 flex-wrap">
        <Link to="/pomodoro"
          className="px-6 py-3 rounded-full mc-body text-sm font-bold uppercase tracking-widest transition-all hover:scale-105"
          style={{ background: "oklch(var(--text))", color: "oklch(var(--canvas))" }}>
          Start focusing
        </Link>
        <Link to="/profile"
          className="px-6 py-3 rounded-full mc-body text-sm font-bold uppercase tracking-widest border transition-all hover:scale-105"
          style={{ borderColor: "oklch(var(--text) / 0.12)", color: "oklch(var(--text))" }}>
          View profile
        </Link>
      </div>
    </header>

    {/* Divider */}
    <div className="h-px" style={{ background: "oklch(var(--text) / 0.06)" }} />

    {/* Features */}
    <section className="space-y-12">
      <h2 className="mc-display text-3xl tracking-tight">What it does</h2>
      <div className="space-y-10">
        {FEATURES.map(({ icon, title, body }) => (
          <div key={title} className="flex gap-6">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: "oklch(var(--text) / 0.05)" }}>
              {React.createElement(icon, { className: "w-4 h-4", style: { color: "oklch(var(--primary))" } })}
            </div>
            <div className="space-y-1.5">
              <p className="mc-body font-bold" style={{ color: "oklch(var(--text))" }}>{title}</p>
              <p className="mc-body text-sm leading-relaxed" style={{ color: "oklch(var(--text) / 0.5)" }}>{body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* Divider */}
    <div className="h-px" style={{ background: "oklch(var(--text) / 0.06)" }} />

    {/* Stack */}
    <section className="space-y-6">
      <h2 className="mc-display text-3xl tracking-tight">Built with</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {["Vite + React", "Node.js", "SQLite", "GSAP"].map(t => (
          <div key={t} className="px-4 py-3 rounded-2xl border text-center"
            style={{ background: "oklch(var(--surface))", borderColor: "oklch(var(--text) / 0.06)" }}>
            <p className="mc-body text-sm font-bold" style={{ color: "oklch(var(--text) / 0.7)" }}>{t}</p>
          </div>
        ))}
      </div>
    </section>

  </div>
);

export default AboutScreen;
