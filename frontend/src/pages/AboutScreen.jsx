import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Globe, Award, Shield, Zap } from "lucide-react";

gsap.registerPlugin(useGSAP);

const AboutScreen = () => {
  const containerRef = useRef(null);

  useGSAP(() => {
    gsap.set(".reveal", { opacity: 0, y: 40 });
    gsap.to(".reveal", { opacity: 1, y: 0, stagger: 0.1, duration: 1.2, ease: "power4.out" });
  }, { scope: containerRef });

  return (
    <div className="space-y-24 py-20 px-6 max-w-5xl mx-auto" ref={containerRef}>

      {/* Editorial Header */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start reveal">
        <div className="space-y-10">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "oklch(var(--primary))" }} />
            <span className="mc-body text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: "oklch(var(--text-muted))" }}>
              Institutional Dossier
            </span>
          </div>
          <h1 className="mc-display text-6xl sm:text-8xl leading-[0.85] tracking-tighter" style={{ color: "oklch(var(--text))" }}>
            The Art <br />of <span className="italic">Focus.</span>
          </h1>
        </div>
        <div className="space-y-8 pt-6 lg:pt-32">
          <p className="mc-body text-xl leading-relaxed italic pl-8"
            style={{ color: "oklch(var(--text) / 0.7)", borderLeft: "1px solid oklch(var(--text) / 0.12)" }}>
            "Pomogit represents the intersection of technical stability and the editorial craft of deep, synchronized work."
          </p>
          <div className="flex gap-4 items-center pt-8">
            <div className="h-px flex-1" style={{ background: "oklch(var(--text) / 0.1)" }} />
            <span className="mc-body text-[10px] font-bold uppercase tracking-[0.4em]" style={{ color: "oklch(var(--text-muted))" }}>
              Est. April 2026
            </span>
          </div>
        </div>
      </section>

      {/* Core Principles */}
      <section className="space-y-16 reveal">
        <div className="flex justify-between items-end pb-10" style={{ borderBottom: "1px solid oklch(var(--text) / 0.05)" }}>
          <h2 className="mc-display text-4xl tracking-tight" style={{ color: "oklch(var(--text))" }}>Core Principles.</h2>
          {React.createElement(Globe, { className: "w-12 h-12", style: { color: "oklch(var(--text) / 0.05)" } })}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-16">
          <PrincipleItem
            title="Institutional Warmth"
            desc="Canvas Cream foundation designed for long-duration ocular comfort and reduced cognitive overhead."
            img="https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&q=80&w=600"
          />
          <PrincipleItem
            title="Pill Precision"
            desc="Constraint-based geometry using stadium motifs for interface harmony and logical flow."
            img="https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=600"
          />
          <PrincipleItem
            title="Orbital Logic"
            desc="Connective arcs tracing the trajectory of technical achievements across the global registry."
            img="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=600"
          />
          <PrincipleItem
            title="Editorial Density"
            desc="Meticulously curated typography and negative tracking for high-impact communication."
            img="https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=600"
          />
        </div>
      </section>

      {/* Call to Action */}
      <section className="mc-card p-16 text-center space-y-8 reveal overflow-hidden relative"
        style={{ background: "oklch(var(--text))" }}>
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full translate-x-20 -translate-y-20 blur-xl pointer-events-none"
          style={{ background: "oklch(var(--primary) / 0.07)" }} />
        {React.createElement(Award, { className: "w-12 h-12 mx-auto relative z-10", style: { color: "oklch(var(--primary))", opacity: 0.7 } })}
        <div className="space-y-4 max-w-2xl mx-auto relative z-10">
          <h3 className="mc-display text-4xl tracking-tighter italic" style={{ color: "oklch(var(--canvas))" }}>
            Join the Registry.
          </h3>
          <p className="mc-body text-base leading-relaxed" style={{ color: "oklch(var(--canvas) / 0.55)" }}>
            Every session logged contributes to the institutional memory of your technical craft.
          </p>
        </div>
        <div className="pt-8 flex flex-wrap justify-center gap-10 relative z-10"
          style={{ borderTop: "1px solid oklch(var(--canvas) / 0.08)" }}>
          <div className="flex items-center gap-3">
            {React.createElement(Shield, { className: "w-4 h-4", style: { color: "oklch(var(--primary))" } })}
            <span className="mc-body text-[11px] font-bold uppercase tracking-widest" style={{ color: "oklch(var(--canvas) / 0.4)" }}>
              Security Verified
            </span>
          </div>
          <div className="flex items-center gap-3">
            {React.createElement(Zap, { className: "w-4 h-4", style: { color: "oklch(var(--primary))" } })}
            <span className="mc-body text-[11px] font-bold uppercase tracking-widest" style={{ color: "oklch(var(--canvas) / 0.4)" }}>
              Operational Ready
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};

const PrincipleItem = ({ title, desc, img }) => (
  <div className="space-y-6 group">
    <div className="overflow-hidden rounded-[28px] aspect-[4/3]"
      style={{ border: "1px solid oklch(var(--text) / 0.05)", background: "oklch(var(--text) / 0.05)" }}>
      <img src={img} loading="lazy"
        className="w-full h-full object-cover grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 scale-105 group-hover:scale-100"
        alt={title} />
    </div>
    <div className="space-y-2">
      <h4 className="mc-display text-2xl tracking-tight" style={{ color: "oklch(var(--text))" }}>{title}</h4>
      <p className="mc-body text-sm leading-relaxed max-w-sm" style={{ color: "oklch(var(--text-muted))" }}>{desc}</p>
    </div>
  </div>
);

export default AboutScreen;
