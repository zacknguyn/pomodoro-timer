import React from "react";
import { Button } from "@/components/Button";
import { 
  Users, 
  Trophy, 
  Target, 
  Flame, 
  Github,
  ChevronRight,
  TrendingUp,
  Clock,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const TeamScreen = () => {
  return (
    <div className="space-y-32">
      {/* Cluster Header */}
      <section className="relative grid grid-cols-1 lg:grid-cols-2 gap-20 items-end">
        <div className="space-y-10">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-mc-orange rounded-full"></span>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-mc-ink/60">Node_Cluster: Connected</span>
          </div>
          <h1 className="mc-display text-7xl sm:text-9xl text-mc-ink leading-[0.9] -tracking-[0.03em]">
            Global <br />
            Registry.
          </h1>
          <p className="mc-body text-xl text-mc-ink/70 max-w-md">
            Collective focus synchronization across high-performance engineering nodes.
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-6">
          <div className="flex -space-x-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-16 h-16 rounded-full border-4 border-mc-cream overflow-hidden shadow-lg">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="Avatar" />
              </div>
            ))}
            <div className="w-16 h-16 rounded-full border-4 border-mc-cream bg-mc-ink text-white flex items-center justify-center text-sm font-bold shadow-lg">
              +8
            </div>
          </div>
          <p className="text-xs font-bold text-mc-ink/40 uppercase tracking-widest">Active_Nodes: 13 / 20</p>
        </div>
      </section>

      {/* Node Hierarchy (Leaderboard) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-20">
        <div className="lg:col-span-2 space-y-12">
          <div className="flex items-center justify-between border-b border-black/5 pb-8">
            <h3 className="mc-display text-4xl">Node_Hierarchy</h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-mc-ink/30 italic">Epoch: Sprint_04</span>
          </div>
          
          <div className="space-y-px bg-black/5">
            <NodeRow rank="01" name="Sarah Chen" time="42:10" task="mobile-v2 / auth" status="FOCUSING" />
            <NodeRow rank="02" name="Alex Rivera" time="38:45" task="architect-ui / grid" status="FOCUSING" />
            <NodeRow rank="03" name="Quang Dev" time="32:45" task="pomodoro-timer / mastercard" status="READY" isUser />
            <NodeRow rank="04" name="Jessica Wu" time="28:20" task="internal-cli / bug" status="IDLE" />
          </div>
        </div>

        <div className="space-y-16">
          <div className="space-y-8">
            <h3 className="mc-display text-2xl text-mc-ink/40">Telemetry_Stream</h3>
            <div className="mc-card bg-white p-10 space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-mc-orange/5 rounded-full translate-x-10 -translate-y-10" />
              <TelemetryRow label="Network_Load" value="13 / 20" />
              <TelemetryRow label="Focus_Density" value="68.4%" />
              <TelemetryRow label="Mean_Session" value="48.2m" />
            </div>
          </div>

          <div className="mc-card bg-mc-ink text-white p-10 rounded-[40px] space-y-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Cluster_Objective
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="mc-display text-4xl italic">65%</span>
                <span className="text-[10px] font-bold text-white/20">Target: 200h</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-mc-orange w-[65%]" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const NodeRow = ({ rank, name, time, task, status, isUser }) => (
  <div className={cn(
    "bg-white p-10 flex items-center justify-between group transition-all hover:bg-mc-cream/50",
    isUser && "bg-mc-cream/30"
  )}>
    <div className="flex items-center gap-10">
      <span className="text-xs font-bold text-mc-ink/20 group-hover:text-mc-orange transition-colors">{rank}</span>
      <div className="flex items-center gap-6">
        <div className="w-14 h-14 rounded-full overflow-hidden border border-black/5 shadow-sm">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`} alt={name} loading="lazy" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold uppercase tracking-tight text-mc-ink">{name} {isUser && "(Self)"}</p>
          <p className="mc-body text-xs text-mc-ink/40 italic">{task}</p>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-12">
      <div className="text-right hidden sm:block">
        <p className="text-lg mc-display text-mc-ink">{time}</p>
        <p className="text-[9px] font-bold text-mc-ink/20 uppercase tracking-widest">Aggregate</p>
      </div>
      <div className="w-24 text-right">
        <span className={cn(
          "text-[9px] font-bold px-4 py-1.5 rounded-full border uppercase tracking-widest",
          status === 'FOCUSING' ? "border-mc-orange/20 text-mc-orange bg-mc-orange/5" : "border-black/10 text-mc-ink/30"
        )}>
          {status}
        </span>
      </div>
      <ArrowRight className="w-5 h-5 text-mc-ink/10 group-hover:text-mc-ink group-hover:translate-x-1 transition-all" />
    </div>
  </div>
);

const TelemetryRow = ({ label, value }) => (
  <div className="flex justify-between items-center border-b border-black/5 pb-4">
    <p className="text-[10px] font-bold text-mc-ink/40 uppercase tracking-widest">{label}</p>
    <p className="text-xl font-bold mc-display text-mc-ink">{value}</p>
  </div>
);

export default TeamScreen;
