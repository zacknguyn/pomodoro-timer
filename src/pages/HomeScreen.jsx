import React, { useRef } from "react";
import { 
  ArrowRight,
  Timer,
  ChevronRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const containerRef = useRef(null);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.8 } });
    
    tl.to(".stagger-item", {
      opacity: 1,
      y: 0,
      stagger: 0.1,
    });
  }, { scope: containerRef });

  return (
    <div className="space-y-24" ref={containerRef}>
      {/* Anchor Header */}
      <section className="space-y-8 max-w-3xl stagger-item mc-stagger-item">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 bg-mc-orange rounded-full shadow-[0_0_8px_var(--mc-orange)] animate-pulse"></span>
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-mc-ink/30 italic">Session_Identity</span>
        </div>
        <h1 className="mc-display text-6xl sm:text-8xl text-mc-ink leading-[0.95] -tracking-[0.03em]">
          Ready to <br />
          Commence?
        </h1>
        <div className="pt-4">
          <Link to="/pomodoro" className="bg-mc-ink text-mc-cream px-12 py-5 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-mc-ink/90 transition-all shadow-xl flex items-center gap-4 w-fit group active:scale-95">
            <Timer className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            <span>Init Session</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform opacity-40" />
          </Link>
        </div>
      </section>

      {/* Simplified Metrics */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <CleanMetric label="Delta_Velocity" value="8.4/d" sub="+12% Improvement" className="stagger-item mc-stagger-item" />
        <CleanMetric label="Registry_Sync" value="Verified" sub="GitHub Secure" className="stagger-item mc-stagger-item" />
        <CleanMetric label="System_Integrity" value="99.9%" sub="Zero Interruptions" className="stagger-item mc-stagger-item" />
      </section>

      {/* Focus Registry (Visual Anchor) */}
      <section className="mc-card bg-white p-12 sm:p-20 space-y-16 stagger-item mc-stagger-item mc-hover-lift">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-black/5 pb-10">
          <div className="space-y-2">
            <h3 className="mc-display text-4xl">Registry_Log</h3>
            <p className="mc-body text-sm text-mc-ink/40">The institutional record of your focus achievements.</p>
          </div>
          <button className="text-[10px] font-bold uppercase tracking-widest text-mc-orange border-b border-mc-orange/30 pb-1 hover:border-mc-orange transition-all">
            Browse Archive
          </button>
        </div>
        
        <div className="space-y-12">
           <RegistryAnchor protocol="SESS_042" target="pomodoro-timer" time="25:00" status="SUCCESS" />
           <RegistryAnchor protocol="COMM_128" target="registry-sync" time="00:12" status="SUCCESS" />
           <RegistryAnchor protocol="SESS_041" target="internal-cli" time="25:00" status="INTERRUPT" />
        </div>
      </section>
    </div>
  );
};

const CleanMetric = ({ label, value, sub, className }) => (
  <div className={cn("space-y-6 group cursor-default transition-all", className)}>
    <div className="h-px bg-black/5 w-full group-hover:bg-mc-orange/30 transition-colors" />
    <div className="space-y-2 group-hover:translate-x-2 transition-transform">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-mc-ink/30">{label}</p>
      <p className="mc-display text-5xl text-mc-ink">{value}</p>
      <p className="text-[10px] font-medium text-mc-ink/30 italic uppercase tracking-tighter">{sub}</p>
    </div>
  </div>
);

const RegistryAnchor = ({ protocol, target, time, status }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between group gap-6 transition-all hover:translate-x-2 focus-within:ring-2 focus-within:ring-mc-orange focus-within:ring-offset-4 rounded-xl outline-none">
    <div className="flex items-center gap-10">
      <span className="mc-display text-5xl text-mc-ink/10 group-hover:text-mc-orange transition-colors">/</span>
      <div className="space-y-1">
        <p className="text-xl font-bold mc-display text-mc-ink">{target}</p>
        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-mc-ink/40">
          <span>{protocol}</span>
          <span className="w-1 h-1 bg-black/10 rounded-full" />
          <span>{time}</span>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-8">
      <span className={cn(
        "text-[9px] font-bold px-4 py-1.5 rounded-full border tracking-widest uppercase transition-all",
        status === 'SUCCESS' ? "border-mc-orange/20 text-mc-orange bg-mc-orange/5" : "border-black/10 text-mc-ink/30"
      )}>{status}</span>
      <ArrowRight className="w-5 h-5 text-mc-ink/10 group-hover:text-mc-ink group-hover:translate-x-1 transition-all" />
    </div>
  </div>
);

export default Dashboard;
