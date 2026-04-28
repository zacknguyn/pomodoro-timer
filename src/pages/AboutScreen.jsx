import React, { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Globe, Award, Shield, Target, Zap, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const AboutScreen = () => {
  const containerRef = useRef(null);

  return (
    <div className="space-y-40 py-20 px-6 max-w-7xl mx-auto" ref={containerRef}>
      {/* Editorial Header */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
        <div className="space-y-12">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 bg-mc-orange rounded-full animate-pulse"></span>
            <span className="mc-body text-[10px] font-bold uppercase tracking-[0.3em] text-mc-ink/40">Institutional Dossier</span>
          </div>
          <h1 className="mc-display text-7xl sm:text-9xl text-mc-ink leading-[0.9] -tracking-[0.03em]">
            The Art <br />
            of Focus.
          </h1>
        </div>
        <div className="space-y-10 pt-10 lg:pt-32">
          <p className="mc-body text-2xl text-mc-ink/70 leading-relaxed italic border-l-2 border-mc-orange/30 pl-8">
            "Focus.registry represents the intersection of institutional stability and the editorial craft of deep work."
          </p>
          <div className="flex gap-4 items-center pt-4">
            <div className="h-px flex-1 bg-black/10" />
            <span className="mc-body text-[10px] font-bold text-mc-ink/20 uppercase tracking-[0.2em]">Established April 2026</span>
          </div>
        </div>
      </section>

      {/* Core Principles (Circular portraits) */}
      <section className="space-y-24">
        <div className="flex justify-between items-center border-b border-black/5 pb-8">
          <h2 className="mc-display text-5xl font-medium">Core Principles</h2>
          <Globe className="w-8 h-8 text-mc-ink/10" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
          <PrinciplePortrait 
            title="Institutional Warmth"
            desc="Canvas Cream foundation designed for long-duration ocular comfort and reduced cognitive load."
            img="https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&q=80&w=400"
            icon={Zap}
          />
          <PrinciplePortrait 
            title="Pill Precision"
            desc="Constraint-based geometry using stadium and circular motifs for interface harmony."
            img="https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400"
            icon={Target}
          />
          <PrinciplePortrait 
            title="Orbital Logic"
            desc="Connective arcs tracing the trajectory of technical achievements across the registry."
            img="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=400"
            icon={Globe}
          />
          <PrinciplePortrait 
            title="Editorial Density"
            desc="Meticulously curated typography and negative letter-spacing for high-impact communication."
            img="https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=400"
            icon={Award}
          />
        </div>
      </section>

      {/* Institutional Banner */}
      <section className="mc-card bg-mc-ink text-white p-20 rounded-[40px] space-y-12 relative overflow-hidden text-center shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-full bg-mc-orange/[0.03] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-mc-orange/10 rounded-full translate-x-32 translate-y-32 blur-3xl opacity-50" />
        
        <Award className="w-16 h-16 text-mc-orange mx-auto opacity-40 relative z-10" />
        <div className="space-y-6 max-w-2xl mx-auto relative z-10">
          <h3 className="mc-display text-6xl font-medium italic">Built for the Global Registry.</h3>
          <p className="mc-body text-xl text-white/50 leading-relaxed">
            Every session logged is a contribution to the institutional memory of your technical craft.
          </p>
        </div>
        <div className="pt-10 flex flex-wrap justify-center gap-x-12 gap-y-6 border-t border-white/10 relative z-10">
          <div className="flex items-center gap-2">
             <Shield className="w-3 h-3 text-mc-orange/50" />
             <span className="mc-body text-[10px] font-bold uppercase tracking-widest text-white/30">Security Verified</span>
          </div>
          <div className="flex items-center gap-2">
             <Zap className="w-3 h-3 text-mc-orange/50" />
             <span className="mc-body text-[10px] font-bold uppercase tracking-widest text-white/30">Sync Active</span>
          </div>
          <div className="flex items-center gap-2">
             <Clock className="w-3 h-3 text-mc-orange/50" />
             <span className="mc-body text-[10px] font-bold uppercase tracking-widest text-white/30">Registry Version 1.0</span>
          </div>
        </div>
      </section>
    </div>
  );
};

const PrinciplePortrait = ({ title, desc, img, icon: Icon }) => (
  <div className="space-y-10 group text-center lg:text-left">
    <div className="relative mx-auto lg:mx-0 w-full aspect-square max-w-[240px]">
      <div className="mc-orbit w-full h-full border-2 border-black/5 group-hover:border-mc-orange/20 transition-all duration-700">
        <img src={img} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-110 group-hover:scale-100" alt={title} loading="lazy" />
      </div>
      <div className="mc-satellite !w-14 !h-14 bg-white border border-black/5 shadow-xl transition-transform duration-500 group-hover:scale-110">
        <Icon className="w-6 h-6 text-mc-ink group-hover:text-mc-orange transition-colors" />
      </div>
    </div>
    <div className="space-y-4">
      <h4 className="mc-body text-sm font-bold uppercase tracking-[0.2em] text-mc-ink">{title}</h4>
      <p className="mc-body text-xs text-mc-ink/50 leading-relaxed italic">{desc}</p>
    </div>
  </div>
);

export default AboutScreen;
