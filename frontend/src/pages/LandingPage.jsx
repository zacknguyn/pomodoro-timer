import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Timer, Github, Users, BarChart2, Zap, ArrowRight } from "lucide-react";
import BackgroundDots from "@/components/BackgroundDots";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

// Light-only palette — hardcoded, no theme token dependency
const C = {
  canvas:  "oklch(98% 0.008 80)",
  surface: "oklch(95% 0.008 80)",
  text:    "oklch(14% 0.01 80)",
  muted:   "oklch(50% 0.01 80)",
  primary: "oklch(62% 0.16 35)",
  border:  "oklch(14% 0.01 80 / 0.07)",
};

const STEPS = [
  { n: "01", title: "Set your intention", body: "Name what you're working on before the timer starts. It becomes the anchor for the session." },
  { n: "02", title: "Run the cycle", body: "25 minutes of focus, then a break. The timer blocks navigation so you stay in the zone." },
  { n: "03", title: "Link to a commit", body: "When the session ends, your intent and duration are logged alongside your GitHub activity." },
];

const FEATURES = [
  { icon: Timer,     title: "Pomodoro timer",     body: "Configurable cycles with chimes. Blocks navigation while running." },
  { icon: BarChart2, title: "Focus heatmap",      body: "A full year of sessions overlaid with your GitHub commit activity." },
  { icon: Users,     title: "Team groups",        body: "Create a group tied to a repo. See teammates' sessions, commits, and notes." },
  { icon: Github,    title: "GitHub integration", body: "Connect once via OAuth. Repos, commits, and heatmaps update automatically." },
  { icon: Zap,       title: "Public profile",     body: "Every user gets a public profile at /u/username with their focus stats." },
];

// Animated timer display for hero card — counts down slowly then loops
const HERO_TOTAL = 25 * 60;
const useHeroTimer = () => {
  const [secs, setSecs] = useState(HERO_TOTAL);
  useEffect(() => {
    const id = setInterval(() => setSecs(s => s <= 1 ? HERO_TOTAL : s - 1), 800);
    return () => clearInterval(id);
  }, []);
  return secs;
};

const LandingPage = () => {
  const pageRef    = useRef(null);
  const heroRef    = useRef(null);
  const stepsRef   = useRef(null);
  const featuresRef = useRef(null);
  const quoteRef   = useRef(null);
  const ctaRef     = useRef(null);
  const heroSecs   = useHeroTimer();
  const heroM = String(Math.floor(heroSecs / 60)).padStart(2, "0");
  const heroS = String(heroSecs % 60).padStart(2, "0");
  const heroProgress = ((HERO_TOTAL - heroSecs) / HERO_TOTAL) * 100;

  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add(
      {
        motion:  "(prefers-reduced-motion: no-preference)",
        reduced: "(prefers-reduced-motion: reduce)",
        desktop: "(min-width: 768px)",
      },
      (ctx) => {
        const { motion, desktop } = ctx.conditions;

        // ── Hero ──────────────────────────────────────────────────────────
        const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });

        if (motion) {
          // SplitText word-by-word reveal — no mask to avoid clipping
          const split = SplitText.create(".lp-headline", { type: "words" });

          heroTl
            .from(".lp-nav", { autoAlpha: 0, y: -16, duration: 0.6 })
            .from(".lp-badge", { autoAlpha: 0, y: 12, duration: 0.5 }, "-=0.2")
            .from(split.words, {
              autoAlpha: 0,
              y: 24,
              duration: 0.65,
              stagger: { each: 0.07, from: "start" },
              ease: "power3.out",
            }, "-=0.1")
            .from(".lp-sub", { autoAlpha: 0, y: 16, duration: 0.6 }, "-=0.3")
            .from(".lp-cta-group > *", {
              autoAlpha: 0, y: 12, duration: 0.5,
              stagger: 0.1,
            }, "-=0.3")
            .from(".lp-hero-card", {
              autoAlpha: 0, y: 32, scale: 0.97, duration: 0.8, ease: "power2.out",
            }, "-=0.5");

        } else {
          // Reduced motion: simple fade-in
          heroTl.from([".lp-nav", ".lp-badge", ".lp-headline", ".lp-sub", ".lp-cta-group", ".lp-hero-card"], {
            autoAlpha: 0, duration: 0.4, stagger: 0.06,
          });
        }

        // ── Steps section ─────────────────────────────────────────────────
        ScrollTrigger.batch(".lp-step", {
          start: "top 85%",
          once: true,
          onEnter: (els) => {
            gsap.from(els, {
              autoAlpha: 0,
              y: motion ? 28 : 0,
              duration: motion ? 0.65 : 0.3,
              stagger: 0.12,
              ease: "power3.out",
            });
          },
        });

        // ── Features grid ─────────────────────────────────────────────────
        ScrollTrigger.batch(".lp-feature", {
          start: "top 88%",
          once: true,
          onEnter: (els) => {
            gsap.from(els, {
              autoAlpha: 0,
              y: motion ? 24 : 0,
              scale: motion ? 0.97 : 1,
              duration: motion ? 0.55 : 0.3,
              stagger: 0.08,
              ease: "power3.out",
            });
          },
        });

        // ── Pull quote ────────────────────────────────────────────────────
        if (motion) {
          gsap.from(".lp-quote-inner", {
            scrollTrigger: { trigger: quoteRef.current, start: "top 80%", once: true },
            autoAlpha: 0,
            y: 20,
            duration: 0.8,
            ease: "power3.out",
          });

          // Subtle horizontal drift on the quote panel as it scrolls through
          if (desktop) {
            gsap.fromTo(".lp-quote-inner", { xPercent: -1 }, { xPercent: 1,
              ease: "none",
              scrollTrigger: {
                trigger: quoteRef.current,
                start: "top bottom",
                end: "bottom top",
                scrub: 2,
              },
            });
          }
        }

        // ── Footer CTA ────────────────────────────────────────────────────
        gsap.from(".lp-cta-final > *", {
          scrollTrigger: { trigger: ctaRef.current, start: "top 85%", once: true },
          autoAlpha: 0,
          y: motion ? 20 : 0,
          duration: motion ? 0.6 : 0.3,
          stagger: 0.1,
          ease: "power3.out",
        });

        // ── Nav scroll state: fade border in on scroll ────────────────────
        ScrollTrigger.create({
          start: "top -60px",
          onEnter: () => gsap.to(".lp-nav", { borderBottomColor: C.border, duration: 0.3 }),
          onLeaveBack: () => gsap.to(".lp-nav", { borderBottomColor: "transparent", duration: 0.3 }),
        });
      }
    );

    return () => mm.revert();
  }, { scope: pageRef });

  return (
    <div ref={pageRef} style={{ background: C.canvas, color: C.text, fontFamily: "var(--font-body)", minHeight: "100vh", position: "relative" }}>

      {/* Background layer */}
      <BackgroundDots />

      {/* Content — sits above dots */}
      <div style={{ position: "relative", zIndex: 1 }}>

        {/* Nav */}
        <nav className="lp-nav fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-12 h-16"
          aria-label="Main navigation"
          style={{ background: `${C.canvas}e6`, backdropFilter: "blur(12px)", borderBottom: "1px solid transparent" }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-0.02em", color: C.text }}>
            Pomogit.
          </span>
          <div className="flex items-center gap-3">
            <Link to="/login"
              className="px-4 py-2 rounded-full mc-body text-sm font-bold uppercase tracking-widest transition-all hover:opacity-70"
              style={{ color: C.muted }}>
              Sign in
            </Link>
            <Link to="/register"
              className="px-5 py-2 rounded-full mc-body text-sm font-bold uppercase tracking-widest transition-all hover:scale-105"
              style={{ background: C.text, color: C.canvas }}>
              Get started
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <main>
        <section ref={heroRef} className="min-h-screen flex flex-col justify-center px-6 sm:px-12 pt-24 pb-20 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

            <div className="lg:col-span-7 space-y-8">
              <div className="lp-badge">
                <span className="mc-body text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
                  style={{ background: `oklch(62% 0.16 35 / 0.1)`, color: C.primary }}>
                  Focus · Commit · Ship
                </span>
              </div>
              <h1 className="lp-headline mc-display leading-[0.95] -tracking-[0.04em]"
                style={{ fontSize: "clamp(3.5rem, 9vw, 7rem)", color: C.text, overflow: "visible", paddingTop: "0.1em" }}>
                Focus time,<br />made <span style={{ color: C.primary, fontStyle: "italic" }}>visible.</span>
              </h1>
              <p className="lp-sub mc-body text-lg max-w-lg leading-relaxed" style={{ color: C.muted }}>
                A Pomodoro timer built for engineering teams — connects your focus sessions to GitHub commits so you can see exactly where your time goes.
              </p>
              <div className="lp-cta-group flex items-center gap-4 flex-wrap">
                <Link to="/register"
                  className="flex items-center gap-2.5 px-7 py-4 rounded-full mc-body text-sm font-bold uppercase tracking-widest transition-all hover:scale-105 group"
                  style={{ background: C.text, color: C.canvas, boxShadow: `0 8px 32px oklch(14% 0.01 80 / 0.15)` }}>
                  Start for free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link to="/login"
                  className="px-7 py-4 rounded-full mc-body text-sm font-bold uppercase tracking-widest border transition-all hover:opacity-70"
                  style={{ borderColor: C.border, color: C.text }}>
                  Sign in
                </Link>
              </div>
            </div>

            <div className="lp-hero-card lg:col-span-5">
              <div className="rounded-[32px] p-8 space-y-6"
                style={{ background: C.text, boxShadow: `0 40px 80px oklch(14% 0.01 80 / 0.2)` }}>
                <div className="flex items-center gap-2">
                  <span className="mc-body text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full"
                    style={{ background: `oklch(62% 0.16 35 / 0.15)`, color: C.primary }}>
                    Focus Session
                  </span>
                  <span className="mc-label" style={{ color: `oklch(95% 0.008 80 / 0.35)` }}>Session 1 of 4</span>
                </div>
                <div className="mc-display tabular-nums leading-none -tracking-[0.04em]"
                  style={{ fontSize: "clamp(4rem, 12vw, 6rem)", color: C.canvas }}>
                  {heroM}:{heroS}
                </div>
                <div className="h-0.5 rounded-full" style={{ background: `oklch(95% 0.008 80 / 0.08)` }}>
                  <div className="h-full rounded-full transition-all duration-[800ms] ease-linear"
                    style={{ background: C.primary, width: `${heroProgress}%` }} />
                </div>
                <p className="mc-display text-xl italic" style={{ color: `oklch(95% 0.008 80 / 0.5)` }}>
                  "Refactor auth middleware"
                </p>
                <div className="flex items-center gap-2 mc-label" style={{ color: `oklch(95% 0.008 80 / 0.3)` }}>
                  <Github className="w-3.5 h-3.5" />
                  <span>pomogit / backend</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-6xl mx-auto px-6 sm:px-12">
          <div className="h-px" style={{ background: C.border }} />
        </div>

        {/* How it works */}
        <section ref={stepsRef} className="max-w-6xl mx-auto px-6 sm:px-12 py-28 space-y-16">
          <div className="space-y-3">
            <p className="mc-label" style={{ color: C.primary }}>How it works</p>
            <h2 className="mc-display text-4xl sm:text-5xl -tracking-[0.03em]" style={{ color: C.text }}>
              Three steps.<br />One habit.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0">
            {STEPS.map(({ n, title, body }, i) => (
              <div key={n} className="lp-step py-10 space-y-4"
                style={{ borderTop: `1px solid ${C.border}`, paddingRight: i < 2 ? "3rem" : 0 }}>
                <span className="mc-display text-5xl" style={{ color: `oklch(62% 0.16 35 / 0.15)` }}>{n}</span>
                <p className="mc-body font-bold text-base" style={{ color: C.text }}>{title}</p>
                <p className="mc-body text-sm leading-relaxed" style={{ color: C.muted }}>{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-6xl mx-auto px-6 sm:px-12">
          <div className="h-px" style={{ background: C.border }} />
        </div>

        {/* Features */}
        <section ref={featuresRef} className="max-w-6xl mx-auto px-6 sm:px-12 py-28 space-y-16">
          <div className="space-y-3">
            <p className="mc-label" style={{ color: C.primary }}>Features</p>
            <h2 className="mc-display text-4xl sm:text-5xl -tracking-[0.03em]" style={{ color: C.text }}>
              Everything a dev team needs.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="lp-feature p-7 rounded-[24px] space-y-4 border"
                style={{ background: C.surface, borderColor: C.border }}>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ background: `oklch(62% 0.16 35 / 0.1)` }}>
                  <Icon className="w-4 h-4" style={{ color: C.primary }} />
                </div>
                <p className="mc-body font-bold" style={{ color: C.text }}>{title}</p>
                <p className="mc-body text-sm leading-relaxed" style={{ color: C.muted }}>{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pull quote */}
        <section ref={quoteRef} className="max-w-6xl mx-auto px-6 sm:px-12 py-20">
          <div className="lp-quote-inner rounded-[32px] px-10 sm:px-20 py-16 text-center space-y-6"
            style={{ background: C.text }}>
            <p className="mc-display italic leading-tight -tracking-[0.02em]"
              style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", color: C.canvas }}>
              "The gap between productivity tools that are functional and ones you actually <span style={{ color: C.primary }}>want to return to.</span>"
            </p>
            <p className="mc-label" style={{ color: `oklch(95% 0.008 80 / 0.3)` }}>— Built for engineering teams who ship</p>
          </div>
        </section>

        {/* Footer CTA */}
        <section ref={ctaRef} className="max-w-6xl mx-auto px-6 sm:px-12 py-28">
          <div className="lp-cta-final space-y-10">
            <div className="space-y-4">
              <h2 className="mc-display text-4xl sm:text-6xl -tracking-[0.035em]" style={{ color: C.text }}>
                Ready to focus?
              </h2>
              <p className="mc-body text-lg" style={{ color: C.muted }}>Free. No credit card. Just focus.</p>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <Link to="/register"
                className="flex items-center gap-2.5 px-8 py-4 rounded-full mc-body text-sm font-bold uppercase tracking-widest transition-all hover:scale-105 group"
                style={{ background: C.text, color: C.canvas }}>
                Create account
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link to="/login"
                className="px-8 py-4 rounded-full mc-body text-sm font-bold uppercase tracking-widest border transition-all hover:opacity-70"
                style={{ borderColor: C.border, color: C.text }}>
                Sign in
              </Link>
            </div>
          </div>
        </section>

        </main>
        {/* Footer */}
        <footer className="border-t px-6 sm:px-12 py-8 flex items-center justify-between flex-wrap gap-4"
          style={{ borderColor: C.border }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", color: C.text }}>
            Pomogit.
          </span>
          <p className="mc-label" style={{ color: C.muted }}>Focus time, made visible.</p>
        </footer>

      </div>
    </div>
  );
};

export default LandingPage;
