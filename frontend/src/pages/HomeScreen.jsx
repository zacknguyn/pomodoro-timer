import React, { useRef, useState, useEffect } from "react";
import { ArrowRight, Timer, Users, Github, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { sessionApi } from "@/lib/api";
import AvatarOrbit from "@/components/AvatarOrbit";
import StatusBadge from "@/components/StatusBadge";
import SectionHeader from "@/components/SectionHeader";
import EditorialCard from "@/components/EditorialCard";

const Dashboard = () => {
  const containerRef = useRef(null);
  const [stats, setStats] = useState({ totalSessions: 0, totalFocusSeconds: 0 });

  useEffect(() => {
    sessionApi.stats().then(setStats).catch(() => {});
  }, []);

  const focusHours = Math.floor(stats.totalFocusSeconds / 3600);
  const focusMinutes = Math.floor((stats.totalFocusSeconds % 3600) / 60);
  const focusLabel = focusHours > 0 ? `${focusHours}h ${focusMinutes}m` : `${focusMinutes}m`;

  const teamMembers = [
    { name: "Alex", avatar: "https://i.pravatar.cc/150?u=alex", status: "Focusing" },
    { name: "Jordan", avatar: "https://i.pravatar.cc/150?u=jordan", status: "Break" },
    { name: "Taylor", avatar: "https://i.pravatar.cc/150?u=taylor", status: "Focusing" },
    { name: "Casey", avatar: "https://i.pravatar.cc/150?u=casey", status: "Idle" },
  ];

  const sessions = [
    { protocol: "SESS_042", target: "pomodoro-timer", time: "25:00", status: "SUCCESS" },
    { protocol: "COMM_128", target: "registry-sync", time: "00:12", status: "SUCCESS" },
    { protocol: "SESS_041", target: "internal-cli", time: "25:00", status: "INTERRUPT" },
  ];

  useGSAP(() => {
    gsap.set(".stagger-item", { opacity: 0, y: 16 });
    gsap.to(".stagger-item", { opacity: 1, y: 0, stagger: 0.08, duration: 0.7, ease: "power3.out" });
  }, { scope: containerRef });

  return (
    <div className="space-y-16 pb-20 px-8 pt-8" ref={containerRef}>

      {/* Hero */}
      <section className="stagger-item mc-stagger-item space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3">
            <h1 className="mc-display text-6xl sm:text-7xl leading-[1.0] -tracking-[0.035em]">
              Welcome back,<br />Commander.
            </h1>
            <p className="mc-body text-base max-w-md" style={{ color: "oklch(var(--text) / 0.45)" }}>
              {stats.totalSessions > 0
                ? `${stats.totalSessions} sessions · ${focusLabel} logged.`
                : "No sessions yet. Start your first focus cycle."}
            </p>
          </div>
          <Link to="/pomodoro"
            className="mc-pill gap-3 py-4 px-8 w-fit group active:scale-95"
            style={{
              background: "oklch(var(--text))",
              color: "oklch(var(--canvas))",
              boxShadow: "0 8px 28px oklch(var(--text) / 0.12)",
            }}>
            {React.createElement(Timer, { className: "w-4 h-4 group-hover:rotate-12 transition-transform" })}
            <span className="text-sm">Start Session</span>
            {React.createElement(ArrowRight, { className: "w-4 h-4 opacity-40 group-hover:translate-x-0.5 transition-transform" })}
          </Link>
        </div>
      </section>

      {/* Asymmetric Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch stagger-item mc-stagger-item">
        <div className="lg:col-span-5 flex flex-col justify-between py-6 px-2 border-b lg:border-b-0 lg:border-r"
          style={{ borderColor: "oklch(var(--text) / 0.06)" }}>
          <div className="flex items-center gap-2.5 mb-4">
            {React.createElement(Clock, { className: "w-3.5 h-3.5", style: { color: "oklch(var(--primary))" } })}
            <span className="mc-label">Total Focus Time</span>
          </div>
          <p className="mc-display leading-none tracking-tighter"
            style={{ fontSize: "clamp(3.5rem, 8vw, 6rem)", color: "oklch(var(--text))" }}>
            {stats.totalFocusSeconds > 0 ? focusLabel : "—"}
          </p>
          <p className="mc-body text-sm mt-3" style={{ color: "oklch(var(--text) / 0.4)" }}>
            across {stats.totalSessions} pomodoro {stats.totalSessions === 1 ? "cycle" : "cycles"}
          </p>
        </div>

        <div className="lg:col-span-3 flex flex-col justify-center gap-0 divide-y"
          style={{ "--tw-divide-opacity": 1, borderColor: "oklch(var(--text) / 0.06)" }}>
          <div className="py-5">
            <p className="mc-label mb-1">Sessions</p>
            <p className="mc-display text-3xl" style={{ color: "oklch(var(--text))" }}>
              {stats.totalSessions > 0 ? stats.totalSessions : "—"}
            </p>
          </div>
          <div className="py-5">
            <p className="mc-label mb-1">Streak</p>
            <p className="mc-display text-3xl" style={{ color: "oklch(var(--text))" }}>—</p>
          </div>
        </div>

        {/* In Orbit */}
        <section className="lg:col-span-4 mc-card space-y-6" style={{ background: "oklch(var(--surface))" }}>
          <SectionHeader
            title={<h3 className="mc-display text-xl">In Orbit</h3>}
            right={React.createElement(Users, { className: "w-4 h-4", style: { color: "oklch(var(--text) / 0.2)" } })}
          />
          <div className="flex flex-wrap gap-8 pt-2">
            {teamMembers.map((member, i) => (
              <div key={i} className="relative group cursor-pointer">
                <AvatarOrbit
                  src={member.avatar}
                  alt={member.name}
                  active={member.status === "Focusing"}
                  className="group-hover:scale-110"
                />
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none"
                  style={{ background: "oklch(var(--text))", color: "oklch(var(--canvas))" }}>
                  {member.name}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Project + Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <EditorialCard glow className="lg:col-span-5 space-y-8 stagger-item mc-stagger-item">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              {React.createElement(Github, { className: "w-4 h-4", style: { color: "oklch(var(--primary))" } })}
              <span className="mc-label" style={{ color: "oklch(var(--canvas) / 0.35)" }}>Active Repository</span>
            </div>
            <h3 className="mc-display text-3xl" style={{ color: "oklch(var(--canvas))" }}>pomodoro-timer</h3>
            <div className="flex items-center gap-3">
              <span className="mc-body text-xs font-bold uppercase" style={{ color: "oklch(var(--primary))" }}>main</span>
              <span className="w-1 h-1 rounded-full" style={{ background: "oklch(var(--canvas) / 0.15)" }} />
              <span className="mc-body text-xs" style={{ color: "oklch(var(--canvas) / 0.35)" }}>Last sync 2m ago</span>
            </div>
          </div>
          <div className="p-5 rounded-2xl border space-y-2"
            style={{ background: "oklch(var(--canvas) / 0.05)", borderColor: "oklch(var(--canvas) / 0.08)" }}>
            <p className="mc-label italic" style={{ color: "oklch(var(--canvas) / 0.3)" }}>Current Intent</p>
            <p className="mc-body text-sm font-mono leading-relaxed" style={{ color: "oklch(var(--canvas) / 0.75)" }}>
              feat(ui): editorial dashboard revamp
            </p>
          </div>
          <button className="mc-pill w-full py-3.5 text-sm font-bold shadow-lg"
            style={{ background: "oklch(var(--canvas))", color: "oklch(var(--text))" }}>
            Switch Context
          </button>
        </EditorialCard>

        <section className="lg:col-span-7 mc-card space-y-8 stagger-item mc-stagger-item" style={{ background: "oklch(var(--surface))" }}>
          <SectionHeader
            title={
              <div className="space-y-1">
                <h3 className="mc-display text-2xl">Registry Log</h3>
                <p className="mc-body text-xs" style={{ color: "oklch(var(--text) / 0.4)" }}>Your recent focus sessions.</p>
              </div>
            }
            right={
              <button className="mc-body text-xs font-bold pb-0.5 transition-opacity hover:opacity-70"
                style={{ color: "oklch(var(--primary))", borderBottom: "1px solid oklch(var(--primary) / 0.3)" }}>
                Archive
              </button>
            }
          />
          <div className="space-y-6">
            {sessions.map((s, i) => <RegistryAnchor key={i} {...s} />)}
          </div>
        </section>
      </div>
    </div>
  );
};

const RegistryAnchor = React.memo(({ protocol, target, time, status }) => (
  <div className="flex items-center justify-between group transition-all hover:translate-x-1.5 rounded-xl relative pl-3"
    style={{ borderLeft: "2px solid transparent", transition: "transform 0.2s ease, border-color 0.2s ease" }}
    onMouseEnter={e => e.currentTarget.style.borderLeftColor = "oklch(var(--primary) / 0.5)"}
    onMouseLeave={e => e.currentTarget.style.borderLeftColor = "transparent"}>
    <div className="flex items-center gap-6">
      <span className="mc-display text-4xl" style={{ color: "oklch(var(--primary) / 0.15)" }}>/</span>
      <div className="space-y-0.5">
        <p className="mc-display text-lg" style={{ color: "oklch(var(--text))" }}>{target}</p>
        <div className="flex items-center gap-3 mc-label">
          <span>{protocol}</span>
          <span className="w-1 h-1 rounded-full" style={{ background: "oklch(var(--text) / 0.1)" }} />
          <span>{time}</span>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-5">
      <StatusBadge variant={status === "SUCCESS" ? "success" : "muted"}>{status}</StatusBadge>
      {React.createElement(ArrowRight, { className: "w-4 h-4 transition-all group-hover:translate-x-0.5", style: { color: "oklch(var(--text) / 0.12)" } })}
    </div>
  </div>
));

export default Dashboard;
