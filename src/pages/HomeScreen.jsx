import React, { useRef } from "react";
import { 
  ArrowRight,
  Timer,
  Users,
  Github,
  Zap,
  Clock,
  CheckCircle2
} from "lucide-react";
import { Link } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const containerRef = useRef(null);

  const teamMembers = [
    { name: "Alex", avatar: "https://i.pravatar.cc/150?u=alex", status: "Focusing", time: "12:04" },
    { name: "Jordan", avatar: "https://i.pravatar.cc/150?u=jordan", status: "Break", time: "04:20" },
    { name: "Taylor", avatar: "https://i.pravatar.cc/150?u=taylor", status: "Focusing", time: "18:45" },
    { name: "Casey", avatar: "https://i.pravatar.cc/150?u=casey", status: "Idle", time: "--:--" },
  ];

  const sessions = [
    { protocol: "SESS_042", target: "pomodoro-timer", time: "25:00", status: "SUCCESS" },
    { protocol: "COMM_128", target: "registry-sync", time: "00:12", status: "SUCCESS" },
    { protocol: "SESS_041", target: "internal-cli", time: "25:00", status: "INTERRUPT" },
  ];

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.8 } });
    
    tl.to(".stagger-item", {
      opacity: 1,
      y: 0,
      stagger: 0.1,
    });
  }, { scope: containerRef });

  return (
    <div className="space-y-16 pb-20" ref={containerRef}>
      {/* 1. Hero & Greeting */}
      <section className="stagger-item mc-stagger-item space-y-6">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 bg-mc-orange rounded-full" />
          <span className="mc-body text-[10px] font-bold uppercase tracking-[0.3em] text-mc-ink/30">System Status: Operational</span>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-4">
            <h1 className="mc-display text-6xl sm:text-7xl text-mc-ink leading-[1] -tracking-[0.03em]">
              Welcome back, <br />
              Commander.
            </h1>
            <p className="mc-body text-lg text-mc-ink/40 max-w-md">
              You've completed 4 focus cycles today. Your current efficiency is 12% above yesterday's baseline.
            </p>
          </div>
          <Link to="/pomodoro" className="mc-pill bg-mc-ink text-mc-cream hover:bg-mc-ink/90 shadow-2xl flex items-center gap-4 w-fit group active:scale-95 py-5 px-10 h-fit">
            <Timer className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="text-base">Start New Session</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform opacity-40" />
          </Link>
        </div>
      </section>

      {/* 2. Metrics & Team Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Metrics */}
        <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <MetricCard 
            label="Daily Efficiency" 
            value="94.2%" 
            sub="+2.4% vs prev" 
            icon={Zap} 
            className="stagger-item mc-stagger-item" 
          />
          <MetricCard 
            label="Focused Time" 
            value="3h 20m" 
            sub="4 sessions" 
            icon={Clock} 
            className="stagger-item mc-stagger-item" 
          />
          <MetricCard 
            label="Focus Streak" 
            value="12 Days" 
            sub="Personal Record" 
            icon={CheckCircle2} 
            className="stagger-item mc-stagger-item" 
          />
        </div>

        {/* In Orbit (Team) */}
        <section className="xl:col-span-4 mc-card bg-white p-8 space-y-8 stagger-item mc-stagger-item">
          <div className="flex items-center justify-between">
             <h3 className="mc-display text-2xl">In Orbit</h3>
             <Users className="w-5 h-5 text-mc-ink/20" />
          </div>
          <div className="flex flex-wrap gap-10 justify-center xl:justify-start pt-4">
            {teamMembers.map((member, i) => (
              <div key={i} className="relative group cursor-pointer">
                <div className={cn(
                  "mc-orbit w-16 h-16 border-2 transition-all group-hover:scale-110",
                  member.status === "Focusing" ? "border-mc-emerald" : "border-black/5"
                )}>
                  <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                </div>
                {member.status === "Focusing" && (
                  <div className="mc-satellite !w-6 !h-6 bg-mc-emerald text-white !translate-x-1/4 !translate-y-1/4 shadow-sm border border-white">
                    <Timer className="w-3 h-3" />
                  </div>
                )}
                {/* Tooltip */}
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-mc-ink text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                  {member.name}: {member.status} {member.time !== "--:--" && `(${member.time})`}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 3. Project Snapshot & Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Project Snapshot */}
        <section className="lg:col-span-5 mc-card bg-mc-ink text-white p-10 space-y-10 relative overflow-hidden stagger-item mc-stagger-item mc-hover-lift">
          <div className="absolute top-0 right-0 w-48 h-48 bg-mc-orange/10 rounded-full translate-x-20 -translate-y-20 blur-3xl" />
          <div className="space-y-4 relative z-10">
            <div className="flex items-center gap-3">
              <Github className="w-5 h-5 text-mc-orange" />
              <span className="mc-body text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Active Repository</span>
            </div>
            <h3 className="mc-display text-4xl">pomodoro-timer</h3>
            <div className="flex items-center gap-4">
               <span className="mc-body text-xs font-bold text-mc-orange uppercase">main branch</span>
               <span className="w-1 h-1 bg-white/20 rounded-full" />
               <span className="mc-body text-xs text-white/40">Last sync 2m ago</span>
            </div>
          </div>
          
          <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-3 relative z-10">
            <p className="mc-body text-[10px] font-bold uppercase tracking-widest text-white/30 italic">Current Focus Intent</p>
            <p className="mc-body text-sm font-mono text-white/80 leading-relaxed">
              feat(ui): platform density overhaul and editorial dashboard revamp
            </p>
          </div>

          <button className="mc-pill w-full bg-white text-mc-ink hover:bg-white/90 shadow-xl transition-all relative z-10 text-sm font-bold">
            Switch Context
          </button>
        </section>

        {/* Registry Log */}
        <section className="lg:col-span-7 mc-card bg-white p-10 space-y-12 stagger-item mc-stagger-item">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 border-b border-black/5 pb-8">
            <div className="space-y-2">
              <h3 className="mc-display text-3xl">Registry Log</h3>
              <p className="mc-body text-sm text-mc-ink/40">Institutional record of focus achievements.</p>
            </div>
            <button className="mc-body text-sm font-medium text-mc-orange border-b border-mc-orange/30 pb-1 hover:border-mc-orange transition-all">
              Browse Archive
            </button>
          </div>
          
          <div className="space-y-10">
             {sessions.map((session, i) => (
               <RegistryAnchor key={i} {...session} />
             ))}
          </div>
        </section>
      </div>
    </div>
  );
};

const RegistryAnchor = React.memo(({ protocol, target, time, status }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between group gap-6 transition-all hover:translate-x-2 focus-within:ring-2 focus-within:ring-mc-orange focus-within:ring-offset-4 rounded-xl outline-none">
    <div className="flex items-center gap-10">
      <span className="mc-display text-5xl text-mc-ink/10 group-hover:text-mc-orange transition-colors">/</span>
      <div className="space-y-1">
        <p className="text-xl font-medium mc-display text-mc-ink">{target}</p>
        <div className="flex items-center gap-4 mc-body text-[10px] font-bold uppercase tracking-wider text-mc-ink/40">
          <span>{protocol}</span>
          <span className="w-1 h-1 bg-black/10 rounded-full" />
          <span>{time}</span>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-8">
      <span className={cn(
        "mc-body text-[9px] font-bold px-4 py-1.5 rounded-full border tracking-widest uppercase transition-all",
        status === 'SUCCESS' ? "border-mc-orange/20 text-mc-orange bg-mc-orange/5" : "border-black/10 text-mc-ink/30"
      )}>{status}</span>
      <ArrowRight className="w-5 h-5 text-mc-ink/10 group-hover:text-mc-ink group-hover:translate-x-1 transition-all" />
    </div>
  </div>
));

const MetricCard = React.memo(({ label, value, sub, icon: Icon, className }) => (
  <div className={cn("mc-card bg-white p-8 space-y-6 mc-hover-lift group", className)}>
    <div className="flex items-center justify-between">
       <div className="p-3 bg-mc-cream rounded-2xl group-hover:bg-mc-orange/10 transition-colors">
          <Icon className="w-5 h-5 text-mc-ink group-hover:text-mc-orange transition-colors" />
       </div>
       <span className="mc-body text-[10px] font-bold text-mc-orange uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Live</span>
    </div>
    <div className="space-y-2">
      <p className="mc-body text-xs font-semibold uppercase tracking-wider text-mc-ink/30">{label}</p>
      <p className="mc-display text-5xl text-mc-ink">{value}</p>
      <p className="mc-body text-[10px] font-medium text-mc-ink/30 uppercase tracking-tighter italic">{sub}</p>
    </div>
  </div>
));

export default Dashboard;
