import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Palette, MousePointer2, Zap, Heart, Shield, Globe, Award } from "lucide-react";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const AboutScreen = () => {
  const containerRef = useRef(null);

  return (
    <div className="space-y-40 py-20 px-6 max-w-7xl mx-auto" ref={containerRef}>
      {/* Editorial Header */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
        <div className="space-y-12">
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 bg-mc-orange rounded-full"></span>
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-mc-ink/40">Institution_Dossier: ARCHITECT</span>
          </div>
          <h1 className="mc-display text-7xl sm:text-9xl text-mc-ink leading-[0.9] -tracking-[0.03em]">
            The Art <br />
            of Focus.
          </h1>
        </div>
        <div className="space-y-8 pt-10 lg:pt-32">
          <p className="mc-body text-2xl text-mc-ink/70 leading-relaxed italic border-l-2 border-mc-orange/30 pl-8">
            "Mastercard Focus represents the intersection of institutional stability and the editorial craft of deep work."
          </p>
          <div className="flex gap-4 items-center">
            <div className="h-px flex-1 bg-black/10" />
            <span className="text-[10px] font-bold text-mc-ink/20 uppercase tracking-widest">Est_2026.04.22</span>
          </div>
        </div>
      </section>

      {/* Core Logic (Circular portraits) */}
      <section className="space-y-24">
        <div className="flex justify-between items-center border-b border-black/5 pb-8">
          <h2 className="mc-display text-5xl">System_Principles</h2>
          <Globe className="w-8 h-8 text-mc-ink/20" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
          <PrinciplePortrait 
            title="Institutional_Warmth"
            desc="Canvas Cream foundation designed for long-duration ocular comfort."
            img="https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&q=80&w=400"
          />
          <PrinciplePortrait 
            title="Pill_Precision"
            desc="Constraint-based geometry using stadium and circular motifs."
            img="https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400"
          />
          <PrinciplePortrait 
            title="Orbital_Logic"
            desc="Connective arcs tracing the trajectory of technical achievements."
            img="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=400"
          />
          <PrinciplePortrait 
            title="Editorial_Density"
            desc="Meticulously curated typography and negative letter-spacing."
            img="https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=400"
          />
        </div>
      </section>

      {/* Institutional Banner */}
      <section className="mc-card bg-mc-ink text-white p-20 rounded-[40px] space-y-12 relative overflow-hidden text-center">
        <div className="absolute top-0 left-0 w-full h-full bg-mc-orange/5 pointer-events-none" />
        <Award className="w-16 h-16 text-mc-orange mx-auto opacity-40" />
        <div className="space-y-6 max-w-2xl mx-auto relative z-10">
          <h3 className="mc-display text-6xl italic">Built for the Global Registry.</h3>
          <p className="mc-body text-xl text-white/50">
            Every session logged is a contribution to the institutional memory of your craft.
          </p>
        </div>
        <div className="pt-10 flex justify-center gap-8 border-t border-white/10 relative z-10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Security_Verified</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Sync_Active</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Registry_v1.0</span>
        </div>
      </section>
    </div>
  );
};

const PrinciplePortrait = ({ title, desc, img }) => (
  <div className="space-y-8 group">
    <div className="relative mx-auto w-full aspect-square max-w-[240px]">
      <div className="w-full h-full rounded-full overflow-hidden border border-black/5 shadow-md group-hover:scale-105 transition-all duration-700">
        <img src={img} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt={title} loading="lazy" />
      </div>
      <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg border border-black/5">
        <Shield className="w-5 h-5 text-mc-ink" />
      </div>
    </div>
    <div className="space-y-3">
      <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-mc-ink">{title}</h4>
      <p className="text-xs mc-body text-mc-ink/50 leading-relaxed uppercase tracking-tighter">{desc}</p>
    </div>
  </div>
);

export default AboutScreen;
