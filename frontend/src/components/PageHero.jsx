import React from "react";

/**
 * PageHero — eyebrow label + display heading used at the top of every screen.
 *
 * Props:
 *   eyebrow   — short uppercase label shown above heading (optional)
 *   pulse     — animate the dot indicator (default: false)
 *   children  — the h1 heading content (can include JSX for italic spans)
 *   right     — optional right-side slot (e.g. CTA button)
 *   className — extra classes on the wrapper
 *
 * Usage:
 *   <PageHero eyebrow="Collaborative Cluster: Active" pulse>
 *     Global<br />Registry.
 *   </PageHero>
 */
const PageHero = ({ eyebrow, pulse = false, children, right, className = "" }) => (
  <section className={`space-y-5 ${className}`}>
    {eyebrow && (
      <div className="flex items-center gap-2.5">
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${pulse ? "animate-pulse" : ""}`}
          style={{ background: "oklch(var(--primary))" }}
        />
        <span className="mc-label">{eyebrow}</span>
      </div>
    )}
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
      <h1 className="mc-display text-5xl sm:text-6xl leading-[1.05] -tracking-[0.03em]">
        {children}
      </h1>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  </section>
);

export default PageHero;
