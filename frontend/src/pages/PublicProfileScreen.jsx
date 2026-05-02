import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Github, ArrowLeft } from "lucide-react";
import { createPortal } from "react-dom";
import Skeleton from "@/components/Skeleton";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const RADIUS = 80;
const REDUCED_MOTION = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const IS_TOUCH = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches;

const LEVELS = [
  "oklch(var(--text) / 0.06)",
  "oklch(var(--primary) / 0.25)",
  "oklch(var(--primary) / 0.55)",
  "oklch(var(--primary))",
];

const PublicHeatmap = ({ heatmap }) => {
  const gridRef = useRef(null);
  const rafRef = useRef(null);
  const mouseRef = useRef({ x: -999, y: -999 });
  const [tooltip, setTooltip] = useState(null);
  const data = useMemo(() => heatmap.map(c => c.level ?? 0), [heatmap]);
  const dates = useMemo(() => heatmap.map(c => c.date), [heatmap]);
  const counts = useMemo(() => heatmap.map(c => c.count ?? 0), [heatmap]);

  const updateCells = useCallback(() => {
    if (!gridRef.current || REDUCED_MOTION || IS_TOUCH) return;
    const cells = gridRef.current.querySelectorAll('[data-cell]');
    const gridRect = gridRef.current.getBoundingClientRect();
    const { x: mx, y: my } = mouseRef.current;
    cells.forEach(cell => {
      const rect = cell.getBoundingClientRect();
      const cx = rect.left - gridRect.left + rect.width / 2;
      const cy = rect.top - gridRect.top + rect.height / 2;
      const dist = Math.sqrt((cx - mx) ** 2 + (cy - my) ** 2);
      const influence = Math.max(0, 1 - dist / RADIUS);
      cell.style.transform = `scale(${1 + influence * 0.55})`;
      cell.style.filter = `brightness(${1 + influence * 0.6})`;
      cell.style.zIndex = influence > 0.1 ? '20' : '0';
    });
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (IS_TOUCH) return;
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updateCells);
    const cell = e.target.closest('[data-cell]');
    if (cell) {
      const idx = parseInt(cell.dataset.cell, 10);
      const dateStr = dates[idx] ? new Date(dates[idx] + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
      setTooltip({ val: counts[idx], x: e.clientX, y: e.clientY, date: dateStr });
    } else setTooltip(null);
  }, [updateCells, dates, counts]);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current = { x: -999, y: -999 };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updateCells);
    setTooltip(null);
  }, [updateCells]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  return (
    <div className="space-y-3">
      <p className="mc-label">Focus activity</p>
      <div className="hidden sm:block">
        <div ref={gridRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
          style={{ display: "grid", gridTemplateRows: "repeat(7, 1fr)", gridAutoFlow: "column", gridAutoColumns: "1fr", gap: "3px", overflow: "visible", aspectRatio: "53 / 7" }}>
          {data.map((val, i) => (
            <div key={i} data-cell={i} className="rounded-[2px]"
              style={{ background: LEVELS[val] ?? LEVELS[0], transformOrigin: "center",
                transition: REDUCED_MOTION ? "none" : "transform 0.05s linear, filter 0.05s linear",
                willChange: "transform, filter" }} />
          ))}
        </div>
      </div>
      {/* Mobile */}
      <div className="sm:hidden overflow-x-auto pb-2">
        <div style={{ display: "grid", gridTemplateRows: "repeat(7, 10px)", gridAutoFlow: "column", gridAutoColumns: "10px", gap: "3px" }}>
          {data.slice(-26 * 7).map((val, i) => (
            <div key={i} className="aspect-square rounded-[2px]" style={{ background: LEVELS[val] ?? LEVELS[0] }} />
          ))}
        </div>
      </div>
      {tooltip && createPortal(
        <div className="pointer-events-none z-[200] px-3 py-2 rounded-xl shadow-xl space-y-0.5"
          style={{ position: "fixed", left: tooltip.x, top: tooltip.y - 56, transform: "translateX(-50%)",
            background: "oklch(var(--text))", color: "oklch(var(--canvas))" }}>
          <p className="mc-label" style={{ color: "oklch(var(--canvas) / 0.5)" }}>{tooltip.date}</p>
          <p className="mc-display text-base tracking-tight">{tooltip.val} cycles</p>
        </div>, document.body
      )}
    </div>
  );
};

const PublicProfileScreen = () => {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`${API}/users/${username}/profile`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [username]);

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 sm:px-8 pt-16 space-y-8">
      <Skeleton style={{ height: "120px" }} />
      <Skeleton style={{ height: "160px" }} />
    </div>
  );

  if (notFound) return (
    <div className="max-w-2xl mx-auto px-4 sm:px-8 pt-24 text-center space-y-4">
      <p className="mc-display text-6xl" style={{ color: "oklch(var(--text) / 0.08)" }}>404</p>
      <p className="mc-body" style={{ color: "oklch(var(--text-muted))" }}>No user found for <strong>@{username}</strong></p>
      <Link to="/" className="mc-label hover:opacity-70 transition-opacity">← Back home</Link>
    </div>
  );

  const { stats, heatmap } = data;
  const focusHours = Math.floor(stats.totalFocusMinutes / 60);
  const focusMins = stats.totalFocusMinutes % 60;

  return (
    <div className="min-h-screen" style={{ background: "oklch(var(--canvas))" }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-16 space-y-12">

        {/* Back */}
        <Link to="/" className="flex items-center gap-2 mc-label hover:opacity-70 transition-opacity w-fit">
          {React.createElement(ArrowLeft, { className: "w-3.5 h-3.5" })}
          Pomogit
        </Link>

        {/* Header */}
        <div className="space-y-3">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2" style={{ borderColor: "oklch(var(--text) / 0.08)" }}>
            <img src={`https://api.dicebear.com/7.x/${data.avatarStyle || 'thumbs'}/svg?seed=${encodeURIComponent(data.username)}`}
              alt={data.displayName || data.username} className="w-full h-full object-cover" />
          </div>
          <div className="space-y-1">
            <h1 className="mc-display text-4xl tracking-tighter">{data.displayName || `@${data.username}`}</h1>
            {data.displayName && <p className="mc-label">@{data.username}</p>}
            {data.bio && <p className="mc-body text-sm" style={{ color: "oklch(var(--text) / 0.6)" }}>{data.bio}</p>}
            {data.githubUsername && (
              <a href={`https://github.com/${data.githubUsername}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 mc-label hover:opacity-70 transition-opacity w-fit">
                {React.createElement(Github, { className: "w-3.5 h-3.5" })}
                {data.githubUsername}
              </a>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Focus time", value: focusHours > 0 ? `${focusHours}h ${focusMins}m` : `${stats.totalFocusMinutes}m` },
            { label: "Sessions", value: stats.totalSessions },
            { label: "Streak", value: stats.currentStreak > 0 ? `${stats.currentStreak}d` : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="p-5 rounded-[20px] space-y-1" style={{ background: "oklch(var(--surface))" }}>
              <p className="mc-label">{label}</p>
              <p className="mc-display text-2xl" style={{ color: "oklch(var(--text))" }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Heatmap */}
        <PublicHeatmap heatmap={heatmap} />

      </div>
    </div>
  );
};

export default PublicProfileScreen;
