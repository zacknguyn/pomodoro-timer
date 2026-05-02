import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Mail, Github, Award, Clock, Activity, Zap, Trophy, Timer, X, ExternalLink, Download, Pencil } from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { toast } from "sonner";
import { sessionApi, githubApi, usersApi } from "@/lib/api";
import { useProfile, avatarUrl } from "@/hooks/useProfile";
import { parseUTC } from "@/lib/utils";
import Skeleton from "@/components/Skeleton";

const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

const useFocusTrap = (active, onClose) => {
  const ref = useRef(null);
  const handleKeyDown = useCallback((e) => {
    if (!ref.current) return;
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key !== 'Tab') return;
    const els = Array.from(ref.current.querySelectorAll(FOCUSABLE));
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    }
  }, [onClose]);

  useEffect(() => {
    if (!active) return;
    const prev = document.activeElement;
    const firstEl = ref.current?.querySelector(FOCUSABLE);
    firstEl?.focus();
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      prev?.focus();
    };
  }, [active, handleKeyDown]);

  return ref;
};

const ProfileScreen = () => {
  const [trendMode, setTrendMode] = useState("github");
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [pomogitData, setPomogitData] = useState(Array(364).fill(0));
  const [githubData, setGithubData] = useState([]); // [{date, level}]
  const [stats, setStats] = useState({ totalSessions: 0, totalFocusMinutes: 0, currentStreak: 0, longestStreak: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const containerRef = useRef(null);
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    await usersApi.updateMe({ displayName: editForm.displayName || null, bio: editForm.bio || null, avatarStyle: editForm.avatarStyle });
    await refreshProfile();
    setEditOpen(false);
    toast.success('Profile updated');
  };

  const closeDrawer = useCallback(() => setSelectedEntry(null), []);
  const drawerRef = useFocusTrap(!!selectedEntry, closeDrawer);

  const { profile, displayName, avatar, refresh: refreshProfile } = useProfile();
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('registry_user') || '{}'); } catch { return {}; }
  }, []);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ displayName: '', bio: '', avatarStyle: 'thumbs' });

  // Sync editForm when panel opens
  const openEdit = () => {
    setEditForm({ displayName: profile?.displayName || '', bio: profile?.bio || '', avatarStyle: profile?.avatarStyle || 'thumbs' });
    setEditOpen(true);
  };

  useEffect(() => {
    sessionApi.heatmap().then(setPomogitData).catch(() => {});
    sessionApi.stats().then(s => { setStats(s); setStatsLoading(false); }).catch(() => setStatsLoading(false));
    githubApi.heatmap().then(setGithubData).catch(() => {});
  }, []);

  const currentData = trendMode === "github"
    ? githubData.map(d => d.level ?? 0)
    : pomogitData.map(d => d.level ?? 0);

  const currentCounts = trendMode === "github"
    ? githubData.map(d => d.count ?? 0)
    : pomogitData.map(d => d.count ?? 0);

  const currentDates = trendMode === "github"
    ? githubData.map(d => d.date)
    : pomogitData.map(d => d.date);

  const focusHours = Math.floor(stats.totalFocusMinutes / 60);
  const focusMinutes = stats.totalFocusMinutes % 60;
  const focusLabel = focusHours > 0 ? `${focusHours}h ${focusMinutes}m` : `${focusMinutes}m`;

  const [drawerCommits, setDrawerCommits] = useState([]);
  const [drawerSessions, setDrawerSessions] = useState([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const handleCellClick = (val, index) => {
    let isoDate, displayDate;
    if (currentDates[index]) {
      isoDate = currentDates[index];
      displayDate = new Date(isoDate + 'T12:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    } else {
      const d = new Date();
      d.setDate(d.getDate() - (363 - index));
      isoDate = d.toISOString().slice(0, 10);
      displayDate = d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    }

    setSelectedEntry({ val, date: displayDate, isoDate, count: currentCounts[index] ?? val });
    setDrawerCommits([]);
    setDrawerSessions([]);

    if (val > 0) {
      setDrawerLoading(true);
      if (trendMode === 'github') {
        githubApi.searchCommits(isoDate)
          .then(setDrawerCommits).catch(() => {})
          .finally(() => setDrawerLoading(false));
      } else {
        sessionApi.byDate(isoDate)
          .then(setDrawerSessions).catch(() => {})
          .finally(() => setDrawerLoading(false));
      }
    }
  };

  useGSAP(() => {
    gsap.set(".reveal", { opacity: 0, y: 24 });
    gsap.to(".reveal", { opacity: 1, y: 0, stagger: 0.1, duration: 1, ease: "power4.out" });
  }, { scope: containerRef });

  return (
    <div className="space-y-20 pb-32 px-6 max-w-4xl mx-auto pt-8" ref={containerRef}>

      {/* Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center reveal">
        <div className="relative group w-fit">
          <div className="w-48 h-48 rounded-full overflow-hidden border-4 shadow-xl"
            style={{ borderColor: "oklch(var(--surface))", background: "oklch(var(--surface-alt))" }}>
            <img src={avatar} alt={displayName}
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
          </div>
          <div className="absolute bottom-3 right-3 w-12 h-12 rounded-full flex items-center justify-center border-4 shadow-lg animate-bounce"
            style={{ background: "oklch(var(--primary))", borderColor: "oklch(var(--canvas))", color: "white" }}>
            {React.createElement(Zap, { className: "w-5 h-5 fill-current" })}
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="mc-display text-7xl tracking-tighter">{displayName}.</h1>
            <div className="flex items-center gap-3">
              {profile?.bio
                ? <p className="mc-body text-sm" style={{ color: "oklch(var(--text) / 0.5)" }}>{profile.bio}</p>
                : <p className="mc-label" style={{ color: "oklch(var(--text) / 0.3)" }}>No bio yet.</p>
              }
              <button onClick={openEdit}
                className="flex items-center gap-1.5 mc-label hover:opacity-70 transition-opacity">
                {React.createElement(Pencil, { className: "w-3 h-3" })}
                Edit
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6 pt-2">
            <span className="flex items-center gap-2 mc-body text-sm font-bold"
              style={{ color: "oklch(var(--text))" }}>
              {React.createElement(Mail, { className: "w-4 h-4", style: { color: "oklch(var(--primary))" } })}
              {user.email || '—'}
            </span>
            {user.email && (
              <a href={`/u/${user.email.split('@')[0]}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 mc-label hover:opacity-70 transition-opacity">
                {React.createElement(ExternalLink, { className: "w-3 h-3" })}
                Public profile
              </a>
            )}
            <button onClick={() => sessionApi.exportCsv()}
              className="flex items-center gap-1.5 mc-label hover:opacity-70 transition-opacity">
              {React.createElement(Download, { className: "w-3 h-3" })}
              Export CSV
            </button>
          </div>
        </div>
      </section>

      {/* Stats — asymmetric: one large primary + three compact inline */}
      <section className="reveal" style={{ borderTop: "1px solid oklch(var(--text) / 0.06)", borderBottom: "1px solid oklch(var(--text) / 0.06)", padding: "2rem 0" }}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          {/* Primary stat */}
          <div className="lg:col-span-5 flex flex-col justify-center gap-1 pr-8 pb-6 lg:pb-0"
            style={{ borderBottom: "1px solid oklch(var(--text) / 0.06)" }}
            >
            <div className="lg:border-b-0" style={{ borderBottom: "none" }}>
              <div className="flex items-center gap-2 mb-2">
                {React.createElement(Clock, { className: "w-3.5 h-3.5", style: { color: "oklch(var(--accent))" } })}
                <span className="mc-label">Total Focus</span>
              </div>
              <div className="mc-display leading-none tracking-tighter" style={{ fontSize: "clamp(3rem, 7vw, 5rem)", color: "oklch(var(--text))" }}>
                {statsLoading ? <Skeleton style={{ width: "8rem", height: "4rem" }} /> : stats.totalFocusMinutes > 0 ? focusLabel : "—"}
              </div>
            </div>
          </div>
          {/* Three compact stats */}
          <div className="lg:col-span-7 grid grid-cols-3 pt-6 lg:pt-0 lg:pl-8 divide-x"
            style={{ borderTop: "1px solid oklch(var(--text) / 0.06)", "--tw-divide-opacity": 1 }}>
            {[
              { label: "Sessions", value: statsLoading ? null : stats.totalSessions > 0 ? stats.totalSessions : "—" },
              { label: "Streak", value: statsLoading ? null : stats.currentStreak > 0 ? `${stats.currentStreak}d` : "—" },
              { label: "Best", value: statsLoading ? null : stats.longestStreak > 0 ? `${stats.longestStreak}d` : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col justify-center px-6 gap-1">
                <p className="mc-label">{label}</p>
                <div className="mc-display text-3xl" style={{ color: "oklch(var(--text))" }}>
                  {value === null ? <Skeleton style={{ width: "3rem", height: "2rem" }} /> : value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Heatmap */}
      <section className="mc-card space-y-8 reveal border" style={{ border: "1px solid oklch(var(--text) / 0.05)" }}>
        <div className="mc-section-header">
          <div className="space-y-1">
            <h3 className="mc-display text-3xl tracking-tight">Activity Heatmap.</h3>
            <p className="mc-label italic">Click cells to view log entries</p>
          </div>
          <div className="flex rounded-full p-1 border" style={{ background: "oklch(var(--canvas))", borderColor: "oklch(var(--text) / 0.06)" }}>
            {["github", "pomogit"].map((m) => (
              <button key={m} onClick={() => setTrendMode(m)}
                className="px-5 py-2 rounded-full mc-body text-[10px] font-bold uppercase tracking-widest transition-all"
                style={trendMode === m
                  ? { background: "oklch(var(--text))", color: "oklch(var(--canvas))" }
                  : { color: "oklch(var(--text-muted))" }}>
                {m === "github" ? "GitHub" : "Pomogit"}
              </button>
            ))}
          </div>
        </div>
        <MagneticHeatmap
          key={trendMode + currentData.length}
          data={currentData}
          counts={currentCounts}
          dates={currentDates}
          onCellClick={handleCellClick}
          trendMode={trendMode}
        />
      </section>

      {/* Drawer */}
      {createPortal(
        <AnimatePresence>
          {selectedEntry && (
            <>
              <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] backdrop-blur-sm"
                style={{ background: "oklch(var(--text) / 0.35)" }}
                onClick={closeDrawer} />
              <Motion.div
                ref={drawerRef}
                role="dialog" aria-modal="true" aria-label={`Registry log for ${selectedEntry.date}`}
                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 35, stiffness: 350 }}
                className="fixed top-0 right-0 h-screen w-full max-w-lg z-[101] overflow-y-auto p-6 sm:p-12 space-y-12"
                style={{ background: "oklch(var(--canvas))", boxShadow: "-40px 0 80px oklch(var(--text) / 0.1)" }}>

                <div className="flex items-center justify-between pb-8 border-b" style={{ borderColor: "oklch(var(--text) / 0.06)" }}>
                  <div className="space-y-1">
                    <p className="mc-label">Registry Log</p>
                    <h3 className="mc-display text-3xl tracking-tighter italic">{selectedEntry.date}</h3>
                    {selectedEntry.count > 0 && (
                      <p className="mc-label" style={{ color: "oklch(var(--primary))" }}>
                        {selectedEntry.count} {trendMode === 'github' ? 'commit' : 'cycle'}{selectedEntry.count !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <button onClick={closeDrawer}
                    aria-label="Close log drawer"
                    className="p-3 rounded-full transition-colors hover:bg-[oklch(var(--text)/0.05)]">
                    {React.createElement(X, { className: "w-5 h-5", style: { color: "oklch(var(--text))" } })}
                  </button>
                </div>

                <div className="space-y-3">
                  {drawerLoading ? (
                    <div className="py-20 text-center">
                      <p className="mc-label">Loading commits…</p>
                    </div>
                  ) : selectedEntry.val === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed rounded-[32px]"
                      style={{ borderColor: "oklch(var(--text) / 0.06)" }}>
                      <p className="text-5xl mb-4" style={{ color: "oklch(var(--text) / 0.15)" }}>∅</p>
                      <p className="mc-body text-sm italic" style={{ color: "oklch(var(--text-muted))" }}>
                        No transmissions recorded.
                      </p>
                    </div>
                  ) : trendMode === 'github' ? drawerCommits.map((c) => (                    <a key={c.sha} href={c.url} target="_blank" rel="noreferrer"
                      className="flex items-start gap-4 p-5 rounded-2xl border transition-all group hover:border-[oklch(var(--primary)/0.2)] block"
                      style={{ background: "oklch(var(--text) / 0.02)", borderColor: "oklch(var(--text) / 0.05)" }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: "oklch(var(--canvas))", color: "oklch(var(--primary))" }}>
                        {React.createElement(Github, { className: "w-4 h-4" })}
                      </div>
                      <div className="space-y-1 min-w-0">
                        <p className="mc-body text-sm font-bold truncate" style={{ color: "oklch(var(--text))" }}>{c.message}</p>
                        <div className="flex items-center gap-2 mc-label">
                          <span style={{ color: "oklch(var(--primary) / 0.8)" }}>{c.repo}</span>
                          <span style={{ color: "oklch(var(--text) / 0.2)" }}>·</span>
                          <span>{c.sha}</span>
                          <span style={{ color: "oklch(var(--text) / 0.2)" }}>·</span>
                          <span>{parseUTC(c.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </a>
                  )) : drawerSessions.map((s) => (
                    <div key={s.id} className="p-5 rounded-2xl border space-y-2"
                      style={{ background: "oklch(var(--text) / 0.02)", borderColor: "oklch(var(--text) / 0.05)" }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {React.createElement(Timer, { className: "w-4 h-4", style: { color: "oklch(var(--accent))" } })}
                          <span className="mc-body text-sm font-bold" style={{ color: "oklch(var(--text))" }}>
                            {s.duration}m focus
                          </span>
                        </div>
                        <span className="mc-label">{parseUTC(s.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {s.intent && <p className="mc-body text-sm pl-7" style={{ color: "oklch(var(--text-muted))" }}>{s.intent}</p>}
                      {s.repo_name && <p className="mc-label pl-7" style={{ color: "oklch(var(--primary) / 0.8)" }}>{s.repo_name}</p>}
                    </div>
                  ))}
                </div>
              </Motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Edit profile panel */}
      {editOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[100] backdrop-blur-sm" style={{ background: "oklch(var(--text) / 0.35)" }} onClick={() => setEditOpen(false)} />
          <div className="fixed top-0 right-0 h-screen w-full max-w-sm z-[101] overflow-y-auto p-8 space-y-8"
            style={{ background: "oklch(var(--canvas))", boxShadow: "-40px 0 80px oklch(var(--text) / 0.1)" }}>
            <div className="flex items-center justify-between">
              <h2 className="mc-display text-2xl">Edit profile</h2>
              <button onClick={() => setEditOpen(false)} className="p-2 rounded-full hover:bg-[oklch(var(--text)/0.05)] transition-colors">
                {React.createElement(X, { className: "w-4 h-4" })}
              </button>
            </div>

            {/* Avatar preview */}
            <div className="flex items-center gap-4">
              <img src={avatarUrl(profile?.email || 'default', editForm.avatarStyle)} alt="Preview"
                className="w-16 h-16 rounded-full border-2" style={{ borderColor: "oklch(var(--text) / 0.08)" }} />
              <div className="space-y-1">
                <p className="mc-label">Avatar style</p>
                <div className="flex gap-2 flex-wrap">
                  {['thumbs', 'avataaars', 'bottts', 'lorelei', 'micah'].map(s => (
                    <button key={s} onClick={() => setEditForm(f => ({ ...f, avatarStyle: s }))}
                      className="px-3 py-1 rounded-full mc-body text-[10px] font-bold uppercase tracking-widest transition-all"
                      style={editForm.avatarStyle === s
                        ? { background: "oklch(var(--text))", color: "oklch(var(--canvas))" }
                        : { background: "oklch(var(--surface))", color: "oklch(var(--text) / 0.5)" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="edit-name" className="mc-label">Display name</label>
                <input id="edit-name" type="text" value={editForm.displayName}
                  onChange={e => setEditForm(f => ({ ...f, displayName: e.target.value }))}
                  placeholder={user.email?.split('@')[0] || 'Operator'}
                  className="w-full px-5 py-3 rounded-2xl mc-body text-sm outline-none border"
                  style={{ background: "oklch(var(--surface))", borderColor: "oklch(var(--text) / 0.08)", color: "oklch(var(--text))" }} />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-bio" className="mc-label">Bio</label>
                <textarea id="edit-bio" rows={3} value={editForm.bio}
                  onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="A short bio shown on your public profile…"
                  className="w-full px-5 py-3 rounded-2xl mc-body text-sm outline-none border resize-none"
                  style={{ background: "oklch(var(--surface))", borderColor: "oklch(var(--text) / 0.08)", color: "oklch(var(--text))" }} />
              </div>
              <button type="submit"
                className="w-full py-3.5 rounded-full mc-body text-sm font-bold uppercase tracking-widest transition-all hover:scale-[1.02]"
                style={{ background: "oklch(var(--text))", color: "oklch(var(--canvas))" }}>
                Save changes
              </button>
            </form>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};




// Module-level — safe to read during render, never changes after page load
const REDUCED_MOTION = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const IS_TOUCH = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches;

const CELL_COLORS = {
  github: [
    "oklch(var(--text) / 0.05)",
    "oklch(var(--github-green) / 0.25)",
    "oklch(var(--github-green) / 0.55)",
    "oklch(var(--github-green) / 0.9)",
  ],
  pomogit: [
    "oklch(var(--text) / 0.05)",
    "oklch(var(--primary) / 0.2)",
    "oklch(var(--primary) / 0.45)",
    "oklch(var(--primary) / 0.8)",
  ],
};
const RADIUS = 80;

// Mobile: last 26 weeks (6 months), tap to reveal tooltip
// Desktop: full 52 weeks, magnetic hover
const MagneticHeatmap = ({ data, counts, dates, onCellClick, trendMode }) => {
  const gridRef = useRef(null);
  const rafRef = useRef(null);
  const mouseRef = useRef({ x: -999, y: -999 });
  const [tooltip, setTooltip] = useState(null);
  const colors = CELL_COLORS[trendMode] ?? CELL_COLORS.pomogit;
  const mobileData = data.slice(-26 * 7);
  const mobileOffset = data.length - mobileData.length;

  // Wave animation when trendMode changes OR data first loads
  useEffect(() => {
    if (REDUCED_MOTION || !gridRef.current) return;
    const cells = Array.from(gridRef.current.querySelectorAll('[data-cell]'));
    if (!cells.length) return;
    gsap.fromTo(cells,
      { scale: 0.6, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.35, ease: "power3.out", stagger: { each: 0.002, from: "start" } }
    );
  }, [trendMode, data.length]);

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
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mouseRef.current = { x, y };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updateCells);
    const cell = e.target.closest('[data-cell]');
    if (cell) {
      const idx = parseInt(cell.dataset.cell, 10);
      const val = data[idx];
      const displayCount = counts?.[idx] ?? val;
      const dateStr = dates?.[idx]
        ? new Date(dates[idx] + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : (() => { const d = new Date(); d.setDate(d.getDate() - (363 - idx)); return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); })();
      setTooltip({ val: displayCount, x: e.clientX, y: e.clientY, date: dateStr });
    } else {
      setTooltip(null);
    }
  }, [updateCells, data, dates, counts]);

  const handleMouseLeave = useCallback(() => {
    if (IS_TOUCH) return;
    mouseRef.current = { x: -999, y: -999 };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updateCells);
    setTooltip(null);
  }, [updateCells]);

  // Touch: tap cell to show/dismiss tooltip
  const handleTouchCell = useCallback((val, idx) => {
    const displayCount = counts?.[idx] ?? val;
    const dateStr = dates?.[idx]
      ? new Date(dates[idx] + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : (() => { const d = new Date(); d.setDate(d.getDate() - (363 - idx)); return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); })();
    setTooltip(prev => prev?.idx === idx ? null : { val: displayCount, idx, date: dateStr, touch: true });
  }, [dates, counts]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // Build month labels from dates
  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = -1;
    for (let i = 0; i < data.length; i++) {
      const col = Math.floor(i / 7);
      const dateStr = dates?.[i];
      if (!dateStr) continue;
      const month = new Date(dateStr + 'T12:00:00').getMonth();
      if (month !== lastMonth) {
        labels.push({ col, label: new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, { month: 'short' }) });
        lastMonth = month;
      }
    }
    return labels;
  }, [data, dates]);

  return (
    <>
      {/* Desktop: full 52-week magnetic grid */}
      <div className="hidden sm:block" style={{ overflow: "visible" }}>
        {/* Month labels */}
        <div style={{ display: "grid", gridTemplateColumns: "24px 1fr", marginBottom: "4px" }}>
          <div />
          <div style={{ display: "grid", gridTemplateRows: "12px", gridAutoFlow: "column", gridAutoColumns: "12px", gap: "3px", position: "relative", height: "14px" }}>
            {monthLabels.map(({ col, label }) => (
              <span key={label + col} className="mc-label absolute" style={{ left: `${col * 15}px`, fontSize: "9px", color: "oklch(var(--text-muted))", whiteSpace: "nowrap" }}>
                {label}
              </span>
            ))}
          </div>
        </div>
        {/* Grid with day labels */}
        <div style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: "0" }}>
          {/* Day labels */}
          <div style={{ display: "grid", gridTemplateRows: "repeat(7, 12px)", gap: "3px" }}>
            {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d, i) => (
              <span key={i} className="mc-label flex items-center justify-end pr-1" style={{ fontSize: "9px", color: "oklch(var(--text-muted))", height: "12px" }}>{d}</span>
            ))}
          </div>
          <div ref={gridRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ display: "grid", gridTemplateRows: "repeat(7, 12px)", gridAutoFlow: "column", gridAutoColumns: "12px", gap: "3px", overflow: "visible" }}>
          {data.map((val, i) => (
            <div key={i} data-cell={i}
              onClick={() => onCellClick(val, i)}
              className="aspect-square rounded-[2px] cursor-pointer"
              style={{
                background: colors[val] ?? colors[0],
                transformOrigin: "center",
                transition: REDUCED_MOTION ? "none" : "transform 0.05s linear, filter 0.05s linear",
                willChange: "transform, filter",
              }}
            />
          ))}
          </div>
        </div>
      </div>
      {/* Tooltip via portal — fixed viewport coords, never clipped by card */}
      {tooltip && !tooltip.touch && createPortal(
        <div className="pointer-events-none z-[200] px-3 py-2 rounded-xl shadow-xl space-y-0.5"
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y - 56,
            transform: "translateX(-50%)",
            background: "oklch(var(--text))",
            color: "oklch(var(--canvas))",
          }}>
          <p className="mc-label" style={{ color: "oklch(var(--canvas) / 0.5)" }}>{tooltip.date}</p>
          <p className="mc-display text-base tracking-tight">{tooltip.val} {trendMode === 'github' ? 'commits' : 'cycles'}</p>
        </div>,
        document.body
      )}

      {/* Mobile: last 26 weeks, larger cells, tap tooltip */}
      <div className="sm:hidden space-y-3">
        <p className="mc-label">Last 6 months — tap a cell for details</p>
        <div className="relative"
          style={{ display: "grid", gridTemplateRows: "repeat(7, 10px)", gridAutoFlow: "column", gridAutoColumns: "10px", gap: "3px" }}>
          {mobileData.map((val, i) => {
            const globalIdx = mobileOffset + i;
            return (
              <div key={i}
                onClick={() => handleTouchCell(val, globalIdx)}
                className="aspect-square rounded-[2px] cursor-pointer active:scale-110 transition-transform"
                style={{ background: colors[val] ?? colors[0], minHeight: "10px" }}
              />
            );
          })}
        </div>
        {tooltip?.touch && (
          <div className="flex items-center justify-between px-4 py-3 rounded-2xl"
            style={{ background: "oklch(var(--text))", color: "oklch(var(--canvas))" }}>
            <p className="mc-label" style={{ color: "oklch(var(--canvas) / 0.5)" }}>{tooltip.date}</p>
            <p className="mc-display text-lg tracking-tight">{tooltip.val} {trendMode === 'github' ? 'commits' : 'cycles'}</p>
            <button onClick={() => setTooltip(null)} className="ml-4 opacity-40 hover:opacity-70"
              aria-label="Dismiss">×</button>
          </div>
        )}
        <button onClick={() => onCellClick(tooltip?.val ?? 0, tooltip?.idx ?? 0)}
          className="mc-label hover:opacity-70 transition-opacity"
          style={{ color: "oklch(var(--primary))" }}>
          {tooltip?.touch ? 'View log entries →' : ''}
        </button>
      </div>
    </>
  );
};

export default ProfileScreen;

