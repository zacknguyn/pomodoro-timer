import React from "react";
import { Users, Target, ArrowRight, Timer, Activity, Award } from "lucide-react";
import AvatarOrbit from "@/components/AvatarOrbit";
import StatusBadge from "@/components/StatusBadge";
import SectionHeader from "@/components/SectionHeader";
import EditorialCard from "@/components/EditorialCard";

const teamMembers = [
  { name: "Sarah Chen", avatar: "https://i.pravatar.cc/150?u=sarah", status: "Focusing", time: "42:10", task: "mobile-v2 / auth" },
  { name: "Alex Rivera", avatar: "https://i.pravatar.cc/150?u=alex", status: "Focusing", time: "38:45", task: "architect-ui / grid" },
  { name: "Quang Dev", avatar: "https://i.pravatar.cc/150?u=quang", status: "Ready", time: "32:45", task: "pomodoro-timer / ui", isUser: true },
  { name: "Jessica Wu", avatar: "https://i.pravatar.cc/150?u=jessica", status: "Idle", time: "28:20", task: "internal-cli / bug" },
  { name: "Marcus Thorne", avatar: "https://i.pravatar.cc/150?u=marcus", status: "Break", time: "15:10", task: "infra / k8s-sync" },
];

const TeamScreen = () => (
  <div className="space-y-16 pb-20 px-8 pt-8">

    {/* Hero */}
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-end">
      <div className="space-y-5">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "oklch(var(--primary))" }} />
          <span className="mc-label">Collaborative Cluster: Active</span>
        </div>
        <h1 className="mc-display text-5xl sm:text-6xl leading-[1.05] -tracking-[0.03em]">
          Global<br />Registry.
        </h1>
        <p className="mc-body text-base max-w-sm" style={{ color: "oklch(var(--text) / 0.45)" }}>
          Collective focus synchronization across high-performance engineering nodes.
        </p>
      </div>
      <div className="flex flex-col items-start lg:items-end gap-3">
        <div className="flex -space-x-3">
          {teamMembers.map((m, i) => (
            <div key={i} className="w-12 h-12 rounded-full border-2 overflow-hidden shadow-sm"
              style={{ borderColor: "oklch(var(--canvas))" }}>
              <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
            </div>
          ))}
          <div className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-xs font-bold shadow-sm"
            style={{ borderColor: "oklch(var(--canvas))", background: "oklch(var(--text))", color: "oklch(var(--canvas))" }}>
            +8
          </div>
        </div>
        <span className="mc-label">Active Nodes: 13 / 20</span>
      </div>
    </section>

    {/* Live Pulse */}
    <section className="space-y-6">
      <SectionHeader title="Live Pulse" right={<span className="mc-label italic">Real-time sync</span>} />
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-8">
        {teamMembers.map((m, i) => (
          <div key={i} className="flex flex-col items-center gap-4 group cursor-pointer">
            <AvatarOrbit
              src={m.avatar}
              alt={m.name}
              size="w-20 h-20"
              active={m.status === "Focusing"}
              className="group-hover:scale-105 [&_img]:grayscale [&_img]:group-hover:grayscale-0 [&_img]:transition-all"
            />
            <div className="text-center space-y-1">
              <p className="mc-body text-xs font-bold uppercase tracking-wide" style={{ color: "oklch(var(--text))" }}>
                {m.name.split(' ')[0]}
              </p>
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{
                  background: m.status === 'Focusing' ? "oklch(var(--accent))"
                    : m.status === 'Break' ? "oklch(var(--primary))"
                    : "oklch(var(--text) / 0.12)"
                }} />
                <span className="mc-label">{m.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* Registry + Telemetry */}
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      <div className="lg:col-span-8 space-y-6">
        <SectionHeader title="Node Registry" right={<span className="mc-label italic">Epoch: Sprint 04</span>} />
        <div className="mc-card p-0 overflow-hidden" style={{ background: "oklch(var(--surface))" }}>
          {teamMembers.map((m, i) => <NodeRow key={i} rank={`0${i + 1}`} {...m} />)}
        </div>
      </div>

      <div className="lg:col-span-4 space-y-6">
        <div className="mc-card space-y-6" style={{ background: "oklch(var(--surface))" }}>
          <h3 className="mc-display text-xl" style={{ color: "oklch(var(--text) / 0.5)" }}>Team Insights</h3>
          <TelemetryRow label="Network Load" value="13 / 20" icon={Users} />
          <TelemetryRow label="Focus Density" value="68.4%" icon={Activity} />
          <TelemetryRow label="Mean Session" value="48.2m" icon={Timer} />
          <TelemetryRow label="Cluster Awards" value="12" icon={Award} />
        </div>

        <EditorialCard glow glowPos="bottom-right" className="space-y-6">
          <div className="flex items-center gap-2">
            {React.createElement(Target, { className: "w-3.5 h-3.5", style: { color: "oklch(var(--primary))" } })}
            <span className="mc-label" style={{ color: "oklch(var(--canvas) / 0.4)" }}>Cluster Objective</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="mc-display text-4xl italic" style={{ color: "oklch(var(--primary))" }}>65%</span>
              <span className="mc-label" style={{ color: "oklch(var(--canvas) / 0.3)" }}>Target: 200h</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "oklch(var(--canvas) / 0.1)" }}>
              <div className="h-full w-[65%]" style={{ background: "oklch(var(--primary))" }} />
            </div>
            <p className="mc-body text-xs leading-relaxed" style={{ color: "oklch(var(--canvas) / 0.4)" }}>
              Aggregated focus time for Sprint 04 milestone.
            </p>
          </div>
        </EditorialCard>
      </div>
    </section>
  </div>
);

const NodeRow = ({ rank, name, time, task, status, isUser, avatar }) => (
  <div className="px-6 py-5 flex items-center justify-between group transition-all border-b last:border-0"
    style={{
      borderColor: "oklch(var(--text) / 0.05)",
      background: isUser ? "oklch(var(--canvas) / 0.6)" : "transparent",
    }}>
    <div className="flex items-center gap-5">
      <span className="mc-label w-6 text-right transition-colors group-hover:text-[oklch(var(--primary))]"
        style={{ color: "oklch(var(--text) / 0.1)" }}>{rank}</span>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full overflow-hidden border shadow-sm flex-shrink-0"
          style={{ borderColor: "oklch(var(--text) / 0.06)", background: "oklch(var(--canvas))" }}>
          <img src={avatar} alt={name} loading="lazy" className="w-full h-full object-cover" />
        </div>
        <div className="space-y-0.5">
          <p className="mc-body text-sm font-bold uppercase tracking-tight" style={{ color: "oklch(var(--text))" }}>
            {name}{isUser && " (You)"}
          </p>
          <p className="mc-body text-xs italic" style={{ color: "oklch(var(--text) / 0.4)" }}>{task}</p>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-6">
      <div className="text-right hidden sm:block">
        <p className="mc-display text-base" style={{ color: "oklch(var(--text))" }}>{time}</p>
        <p className="mc-label">Focused</p>
      </div>
      <StatusBadge variant={status === "Focusing" ? "active" : "muted"}>{status}</StatusBadge>
      {React.createElement(ArrowRight, { className: "w-4 h-4 transition-all group-hover:translate-x-0.5", style: { color: "oklch(var(--text) / 0.1)" } })}
    </div>
  </div>
);

const TelemetryRow = ({ label, value, icon: Icon }) => (
  <div className="flex justify-between items-center">
    <div className="flex items-center gap-2.5">
      {React.createElement(Icon, { className: "w-3.5 h-3.5", style: { color: "oklch(var(--text) / 0.2)" } })}
      <span className="mc-label">{label}</span>
    </div>
    <p className="mc-display text-lg" style={{ color: "oklch(var(--text))" }}>{value}</p>
  </div>
);

export default TeamScreen;
