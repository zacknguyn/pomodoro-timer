import React from "react";
import { 
  Users, 
  Target, 
  ArrowRight,
  Timer,
  Activity,
  Award
} from "lucide-react";
import { cn } from "@/lib/utils";

const TeamScreen = () => {
  const teamMembers = [
    { name: "Sarah Chen", avatar: "https://i.pravatar.cc/150?u=sarah", status: "Focusing", time: "42:10", task: "mobile-v2 / auth" },
    { name: "Alex Rivera", avatar: "https://i.pravatar.cc/150?u=alex", status: "Focusing", time: "38:45", task: "architect-ui / grid" },
    { name: "Quang Dev", avatar: "https://i.pravatar.cc/150?u=quang", status: "Ready", time: "32:45", task: "pomodoro-timer / mastercard", isUser: true },
    { name: "Jessica Wu", avatar: "https://i.pravatar.cc/150?u=jessica", status: "Idle", time: "28:20", task: "internal-cli / bug" },
    { name: "Marcus Thorne", avatar: "https://i.pravatar.cc/150?u=marcus", status: "Break", time: "15:10", task: "infra / k8s-sync" },
  ];

  return (
    <div className="space-y-24 pb-20">
      {/* 1. Hero Section */}
      <section className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-end">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 bg-mc-orange rounded-full animate-pulse" />
            <span className="mc-body text-[10px] font-bold uppercase tracking-[0.3em] text-mc-ink/40">Collaborative Cluster: Active</span>
          </div>
          <h1 className="mc-display text-7xl sm:text-8xl text-mc-ink leading-[0.95] -tracking-[0.03em]">
            Global <br />
            Registry.
          </h1>
          <p className="mc-body text-xl text-mc-ink/40 max-w-md">
            Collective focus synchronization across high-performance engineering nodes.
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-6">
          <div className="flex -space-x-4">
            {teamMembers.map((member, i) => (
              <div key={i} className="w-16 h-16 rounded-full border-4 border-mc-cream overflow-hidden shadow-sm">
                <img src={member.avatar} alt={member.name} />
              </div>
            ))}
            <div className="w-16 h-16 rounded-full border-4 border-mc-cream bg-mc-ink text-white flex items-center justify-center text-sm font-medium shadow-sm">
              +8
            </div>
          </div>
          <p className="mc-body text-[10px] font-bold text-mc-ink/30 uppercase tracking-[0.2em]">Active Nodes: 13 / 20</p>
        </div>
      </section>

      {/* 2. Live Orbits (Team Pulse) */}
      <section className="space-y-10">
        <div className="flex items-center justify-between border-b border-black/5 pb-6">
          <h3 className="mc-display text-3xl">Live Pulse</h3>
          <p className="mc-body text-xs text-mc-ink/40 uppercase tracking-widest font-bold italic">Real-time synchronization</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-12">
          {teamMembers.map((member, i) => (
            <div key={i} className="flex flex-col items-center gap-6 group cursor-pointer">
              <div className={cn(
                "mc-orbit w-24 h-24 border-2 transition-all duration-500 group-hover:scale-110 group-hover:shadow-2xl",
                member.status === "Focusing" ? "border-mc-emerald" : "border-black/5"
              )}>
                <img src={member.avatar} alt={member.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
              </div>
              <div className="text-center space-y-1">
                <p className="mc-body text-xs font-bold text-mc-ink uppercase tracking-wider">{member.name.split(' ')[0]}</p>
                <div className="flex items-center justify-center gap-2">
                   <span className={cn(
                     "w-1.5 h-1.5 rounded-full",
                     member.status === 'Focusing' ? "bg-mc-emerald" : member.status === 'Break' ? "bg-mc-orange" : "bg-black/10"
                   )} />
                   <span className="mc-body text-[9px] font-bold text-mc-ink/30 uppercase tracking-widest">{member.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Registry & Telemetry */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-8 space-y-10">
          <div className="flex items-center justify-between border-b border-black/5 pb-6">
            <h3 className="mc-display text-3xl">Node Registry</h3>
            <span className="mc-body text-[10px] font-bold uppercase tracking-widest text-mc-ink/30 italic">Epoch: Sprint 04</span>
          </div>
          
          <div className="mc-card bg-white p-0 overflow-hidden">
            {teamMembers.map((member, i) => (
              <NodeRow key={i} rank={`0${i+1}`} {...member} />
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-12">
          <div className="space-y-8">
            <h3 className="mc-display text-2xl text-mc-ink/40">Team Insights</h3>
            <div className="mc-card bg-white p-10 space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-mc-orange/5 rounded-full translate-x-10 -translate-y-10" />
              <TelemetryRow label="Network Load" value="13 / 20" icon={Users} />
              <TelemetryRow label="Focus Density" value="68.4%" icon={Activity} />
              <TelemetryRow label="Mean Session" value="48.2m" icon={Timer} />
              <TelemetryRow label="Cluster Awards" value="12" icon={Award} />
            </div>
          </div>

          <div className="mc-card bg-mc-ink text-white p-10 rounded-[40px] space-y-8 relative overflow-hidden">
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-mc-orange/10 rounded-full translate-x-20 translate-y-20 blur-2xl" />
            <h4 className="mc-body text-[10px] font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
              <Target className="w-4 h-4 text-mc-orange" />
              Cluster Objective
            </h4>
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-end">
                <span className="mc-display text-5xl italic text-mc-orange">65%</span>
                <span className="mc-body text-[10px] font-bold text-white/30 uppercase tracking-tighter">Target: 200h</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-mc-orange w-[65%] shadow-[0_0_10px_var(--color-mc-orange)]" />
              </div>
              <p className="mc-body text-[10px] text-white/40 leading-relaxed">
                Aggregated focus time required for Sprint 04 milestone delivery.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const NodeRow = ({ rank, name, time, task, status, isUser, avatar }) => (
  <div className={cn(
    "p-8 sm:p-10 flex items-center justify-between group transition-all border-b border-black/5 last:border-0 hover:bg-mc-cream/50",
    isUser && "bg-mc-cream/30"
  )}>
    <div className="flex items-center gap-8">
      <span className="mc-body text-xs font-bold text-mc-ink/10 group-hover:text-mc-orange transition-colors">{rank}</span>
      <div className="flex items-center gap-6">
        <div className="w-14 h-14 rounded-full overflow-hidden border border-black/5 shadow-sm bg-mc-cream">
          <img src={avatar} alt={name} loading="lazy" />
        </div>
        <div className="space-y-1">
          <p className="mc-body text-sm font-bold text-mc-ink uppercase tracking-tight">{name} {isUser && "(You)"}</p>
          <p className="mc-body text-xs text-mc-ink/40 italic">{task}</p>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-12">
      <div className="text-right hidden sm:block">
        <p className="text-lg mc-display text-mc-ink">{time}</p>
        <p className="mc-body text-[9px] font-bold text-mc-ink/20 uppercase tracking-widest">Focused</p>
      </div>
      <div className="w-24 text-right">
        <span className={cn(
          "mc-body text-[9px] font-bold px-4 py-1.5 rounded-full border uppercase tracking-widest transition-all",
          status === 'Focusing' ? "border-mc-emerald text-mc-emerald bg-mc-emerald/5" : "border-black/10 text-mc-ink/30"
        )}>
          {status}
        </span>
      </div>
      <ArrowRight className="w-5 h-5 text-mc-ink/10 group-hover:text-mc-ink group-hover:translate-x-1 transition-all" />
    </div>
  </div>
);

const TelemetryRow = ({ label, value, icon: Icon }) => (
  <div className="flex justify-between items-center group">
    <div className="flex items-center gap-3">
       <Icon className="w-4 h-4 text-mc-ink/20 group-hover:text-mc-orange transition-colors" />
       <p className="mc-body text-[10px] font-bold text-mc-ink/40 uppercase tracking-widest">{label}</p>
    </div>
    <p className="text-xl font-bold mc-display text-mc-ink">{value}</p>
  </div>
);

export default TeamScreen;
