import React, { useRef, useState, useEffect, useMemo } from "react";
import { ArrowRight, Timer, Users, Github, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { sessionApi, groupApi } from "@/lib/api";
import { parseUTC } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";
import AvatarOrbit from "@/components/AvatarOrbit";
import StatusBadge from "@/components/StatusBadge";
import SectionHeader from "@/components/SectionHeader";
import EditorialCard from "@/components/EditorialCard";

import Skeleton from "@/components/Skeleton";

const Dashboard = () => {
  const containerRef = useRef(null);
  const { displayName } = useProfile();
  const [stats, setStats] = useState({ totalSessions: 0, totalFocusMinutes: 0, currentStreak: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [orbitMembers, setOrbitMembers] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [dailyGoal, setDailyGoal] = useState(() => parseInt(localStorage.getItem('daily_goal') || '4'));
  const [editingGoal, setEditingGoal] = useState(false);
  const lastRepo = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('last_repo') || 'null'); } catch { return null; }
  }, []);

  useEffect(() => {
    sessionApi.stats().then(s => { setStats(s); setStatsLoading(false); }).catch(() => setStatsLoading(false));
    sessionApi.list().then(s => setRecentSessions(s.slice(0, 5))).catch(() => {});
    groupApi.list('active').then(groups => {
      if (groups.length > 0) groupApi.get(groups[0].id).then(g => setOrbitMembers(g.members || [])).catch(() => {});
    }).catch(() => {});
  }, []);

  const focusHours = Math.floor(stats.totalFocusMinutes / 60);
  const focusMinutes = stats.totalFocusMinutes % 60;
  const focusLabel = focusHours > 0 ? `${focusHours}h ${focusMinutes}m` : `${focusMinutes}m`;
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
  const todaySessions = recentSessions.filter(s => s.mode === 'pomodoro' && parseUTC(s.completed_at).toLocaleDateString('en-CA') === todayStr).length;
  const goalProgress = Math.min(todaySessions / dailyGoal, 1);
  const R = 20;
  const circumference = 2 * Math.PI * R;

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
              Welcome back,<br />{displayName}.
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
          <div className="mc-display leading-none tracking-tighter"
            style={{ fontSize: "clamp(3.5rem, 8vw, 6rem)", color: "oklch(var(--text))" }}>
            {statsLoading ? <Skeleton style={{ width: "8rem", height: "5rem" }} /> : stats.totalFocusMinutes > 0 ? focusLabel : "—"}
          </div>
          <p className="mc-body text-sm mt-3" style={{ color: "oklch(var(--text) / 0.4)" }}>
            across {stats.totalSessions} pomodoro {stats.totalSessions === 1 ? "cycle" : "cycles"}
          </p>
        </div>

        <div className="lg:col-span-3 flex flex-col justify-center gap-0 divide-y"
          style={{ "--tw-divide-opacity": 1, borderColor: "oklch(var(--text) / 0.06)" }}>
          <div className="py-5">
            <p className="mc-label mb-1">Sessions</p>
            <div className="mc-display text-3xl" style={{ color: "oklch(var(--text))" }}>
              {statsLoading ? <Skeleton style={{ width: "3rem", height: "2rem" }} /> : stats.totalSessions > 0 ? stats.totalSessions : "—"}
            </div>
          </div>
          <div className="py-5">
            <p className="mc-label mb-1">Streak</p>
            <div className="mc-display text-3xl" style={{ color: "oklch(var(--text))" }}>
              {statsLoading ? <Skeleton style={{ width: "3rem", height: "2rem" }} /> : stats.currentStreak > 0 ? `${stats.currentStreak}d` : "—"}
            </div>
          </div>
          <div className="py-5">
            <p className="mc-label mb-2">Today's goal</p>
            <div className="flex items-center gap-3">
              <svg width="48" height="48" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r={R} fill="none" strokeWidth="3"
                  stroke="oklch(var(--text) / 0.07)" />
                <circle cx="24" cy="24" r={R} fill="none" strokeWidth="3"
                  stroke="oklch(var(--primary))"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - goalProgress)}
                  strokeLinecap="round"
                  transform="rotate(-90 24 24)"
                  style={{ transition: "stroke-dashoffset 0.6s ease" }} />
              </svg>
              <div>
                <div className="mc-display text-2xl leading-none" style={{ color: "oklch(var(--text))" }}>
                  {todaySessions}<span className="mc-label text-base">/{dailyGoal}</span>
                </div>
                {editingGoal ? (
                  <input type="number" min="1" max="20" defaultValue={dailyGoal} autoFocus
                    className="mt-1 w-16 px-2 py-0.5 rounded-lg mc-body text-xs outline-none border"
                    style={{ background: "oklch(var(--surface))", borderColor: "oklch(var(--text) / 0.1)", color: "oklch(var(--text))" }}
                    onBlur={e => { const v = Math.max(1, parseInt(e.target.value) || 4); setDailyGoal(v); localStorage.setItem('daily_goal', v); setEditingGoal(false); }}
                    onKeyDown={e => e.key === 'Enter' && e.target.blur()} />
                ) : (
                  <button onClick={() => setEditingGoal(true)} className="mc-label hover:opacity-60 transition-opacity mt-0.5 block">
                    set goal
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* In Orbit */}
        <section className="lg:col-span-4 mc-card space-y-6" style={{ background: "oklch(var(--surface))" }}>
          <SectionHeader
            title={<h3 className="mc-display text-xl">In Orbit</h3>}
            right={React.createElement(Users, { className: "w-4 h-4", style: { color: "oklch(var(--text) / 0.2)" } })}
          />
          {orbitMembers.length === 0 ? (
            <p className="mc-body text-sm italic pb-4" style={{ color: "oklch(var(--text-muted))" }}>
              Create or join a group to see your team here.
            </p>
          ) : (
            <div className="flex flex-wrap gap-8 pt-2">
              {orbitMembers.map((m) => (
                <Link key={m.id} to={`/u/${m.name}`} className="relative group cursor-pointer">
                  <AvatarOrbit
                    src={`https://api.dicebear.com/7.x/${m.avatarStyle || 'thumbs'}/svg?seed=${encodeURIComponent(m.email || m.name)}`}
                    alt={m.name}
                    active={m.isActive}
                    className="group-hover:scale-110"
                  />
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none"
                    style={{ background: "oklch(var(--text))", color: "oklch(var(--canvas))" }}>
                    {m.name}
                  </div>
                </Link>
              ))}
            </div>
          )}
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
            {lastRepo ? (
              <>
                <h3 className="mc-display text-3xl" style={{ color: "oklch(var(--canvas))" }}>{lastRepo.name}</h3>
                <div className="flex items-center gap-3">
                  <span className="mc-body text-xs font-bold uppercase" style={{ color: "oklch(var(--primary))" }}>{lastRepo.owner}</span>
                  <span className="w-1 h-1 rounded-full" style={{ background: "oklch(var(--canvas) / 0.15)" }} />
                  <span className="mc-body text-xs" style={{ color: "oklch(var(--canvas) / 0.35)" }}>{lastRepo.full_name}</span>
                </div>
              </>
            ) : (
              <p className="mc-body text-sm italic" style={{ color: "oklch(var(--canvas) / 0.35)" }}>No repo selected yet. Pick one in the Timer.</p>
            )}
          </div>
          {recentSessions[0]?.intent && (
            <div className="p-5 rounded-2xl border space-y-2"
              style={{ background: "oklch(var(--canvas) / 0.05)", borderColor: "oklch(var(--canvas) / 0.08)" }}>
              <p className="mc-label italic" style={{ color: "oklch(var(--canvas) / 0.3)" }}>Last Intent</p>
              <p className="mc-body text-sm font-mono leading-relaxed" style={{ color: "oklch(var(--canvas) / 0.75)" }}>
                {recentSessions[0].intent}
              </p>
            </div>
          )}
          <Link to="/pomodoro" className="mc-pill w-full py-3.5 text-sm font-bold shadow-lg text-center block"
            style={{ background: "oklch(var(--canvas))", color: "oklch(var(--text))" }}>
            Go to Timer
          </Link>
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
              <Link to="/sessions" className="mc-body text-xs font-bold pb-0.5 transition-opacity hover:opacity-70"
                style={{ color: "oklch(var(--primary))", borderBottom: "1px solid oklch(var(--primary) / 0.3)" }}>
                Archive
              </Link>
            }
          />
          <div className="space-y-6">
            {recentSessions.length === 0 ? (
              <p className="mc-body text-sm italic" style={{ color: "oklch(var(--text) / 0.4)" }}>No sessions yet. Start your first focus cycle.</p>
            ) : recentSessions.map((s) => (
              <RegistryAnchor key={s.id}
                target={s.repo_name || 'Focus session'}
                protocol={`${s.duration}m`}
                time={parseUTC(s.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                status="SUCCESS"
                intent={s.intent}
                date={parseUTC(s.completed_at).toLocaleDateString('en-CA')}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

const RegistryAnchor = React.memo(({ protocol, target, time, status, intent, date }) => (
  <Link to={`/sessions${date ? `?date=${date}` : ''}`} className="flex items-center justify-between group transition-all hover:translate-x-1.5 rounded-xl relative pl-3"
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
          {intent && <><span className="w-1 h-1 rounded-full" style={{ background: "oklch(var(--text) / 0.1)" }} /><span className="italic truncate max-w-[160px]">{intent}</span></>}
        </div>
      </div>
    </div>
    <div className="flex items-center gap-5">
      <StatusBadge variant={status === "SUCCESS" ? "success" : "muted"}>{status}</StatusBadge>
      {React.createElement(ArrowRight, { className: "w-4 h-4 transition-all group-hover:translate-x-0.5", style: { color: "oklch(var(--text) / 0.12)" } })}
    </div>
  </Link>
));

export default Dashboard;
