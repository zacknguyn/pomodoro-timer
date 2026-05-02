import React, { useState, useEffect, useMemo } from "react";
import { Timer, Github, Target, Trash2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { sessionApi } from "@/lib/api";
import { parseUTC } from "@/lib/utils";
import Skeleton from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";

const MODE_LABEL = { pomodoro: "Focus", shortBreak: "Short break", longBreak: "Long break" };
const MODE_COLOR = {
  pomodoro: "oklch(var(--primary))",
  shortBreak: "oklch(var(--accent))",
  longBreak: "oklch(var(--accent))",
};

const SessionsScreen = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [searchParams] = useSearchParams();
  const [dateFilter, setDateFilter] = useState(searchParams.get("date") || "");
  const [modeFilter, setModeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  useEffect(() => {
    sessionApi.list().then(d => { setSessions(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    await sessionApi.delete(id);
    setSessions(prev => prev.filter(s => s.id !== id));
    setConfirmDelete(null);
  };

  const filtered = useMemo(() => {
    return sessions.filter(s => {
      if (modeFilter !== "all" && s.mode !== modeFilter) return false;
      if (dateFilter) {
        const day = parseUTC(s.completed_at).toLocaleDateString('en-CA');
        if (day !== dateFilter) return false;
      }
      return true;
    });
  }, [sessions, dateFilter, modeFilter]);

  useEffect(() => { setPage(1); }, [dateFilter, modeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalMinutes = filtered.filter(s => s.mode === "pomodoro").reduce((a, s) => a + s.duration, 0);

  return (
    <div className="max-w-4xl mx-auto px-6 pt-8 pb-24 space-y-10">
      <header className="space-y-1">
        <h1 className="mc-display text-5xl tracking-tighter">Sessions</h1>
        <p className="mc-body text-sm" style={{ color: "oklch(var(--text) / 0.4)" }}>Your complete focus history.</p>
      </header>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-center">
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          className="px-4 py-2 rounded-full mc-body text-sm outline-none border"
          style={{ background: "oklch(var(--surface))", borderColor: "oklch(var(--text) / 0.08)", color: "oklch(var(--text))" }} />
        {dateFilter && (
          <button onClick={() => setDateFilter("")} className="mc-label hover:opacity-70 transition-opacity">Clear</button>
        )}
        <div className="flex gap-1 p-1 rounded-full" style={{ background: "oklch(var(--surface))" }}>
          {["all", "pomodoro", "shortBreak", "longBreak"].map(m => (
            <button key={m} onClick={() => setModeFilter(m)}
              className="px-4 py-1.5 rounded-full mc-body text-xs font-bold uppercase tracking-widest transition-all"
              style={{
                background: modeFilter === m ? "oklch(var(--text))" : "transparent",
                color: modeFilter === m ? "oklch(var(--canvas))" : "oklch(var(--text) / 0.5)",
              }}>
              {m === "all" ? "All" : MODE_LABEL[m]}
            </button>
          ))}
        </div>
        {filtered.length > 0 && (
          <span className="mc-label ml-auto">{filtered.length} sessions · {totalMinutes}m focus</span>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} style={{ height: "56px" }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Timer} title="No sessions yet"
          body={modeFilter !== 'all' || dateFilter ? "No sessions match your filters." : "Complete your first focus session to see it here."}
          action={!modeFilter && !dateFilter ? { label: "Start a session", href: "/pomodoro" } : undefined} />
      ) : (
        <div className="space-y-2">
          {paged.map(s => (
            <div key={s.id} className="flex items-center gap-4 px-5 py-4 rounded-2xl border group"
              style={{ background: "oklch(var(--surface))", borderColor: "oklch(var(--text) / 0.05)" }}>
              {/* Mode badge */}
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: MODE_COLOR[s.mode] || "oklch(var(--text) / 0.2)" }} />
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="mc-body text-sm font-bold" style={{ color: "oklch(var(--text))" }}>
                    {MODE_LABEL[s.mode] || s.mode}
                  </span>
                  {s.intent && (
                    <span className="flex items-center gap-1 mc-label">
                      {React.createElement(Target, { className: "w-3 h-3" })}
                      <span className="truncate max-w-[200px]">{s.intent}</span>
                    </span>
                  )}
                  {s.repo_name && (
                    <span className="flex items-center gap-1 mc-label">
                      {React.createElement(Github, { className: "w-3 h-3" })}
                      {s.repo_name}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <span className="flex items-center gap-1.5 mc-label">
                  {React.createElement(Timer, { className: "w-3 h-3" })}
                  {s.duration}m
                </span>
                <span className="mc-label text-right" style={{ minWidth: "90px" }}>
                  {parseUTC(s.completed_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  {" · "}
                  {parseUTC(s.completed_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                </span>
                {confirmDelete === s.id ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleDelete(s.id)}
                      className="mc-label px-2 py-1 rounded-lg transition-opacity hover:opacity-70"
                      style={{ color: "oklch(var(--primary))" }}>Del</button>
                    <button onClick={() => setConfirmDelete(null)}
                      className="mc-label px-2 py-1 rounded-lg transition-opacity hover:opacity-70">✕</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(s.id)}
                    className="p-1.5 rounded-lg transition-opacity opacity-0 group-hover:opacity-40 hover:!opacity-100"
                    style={{ color: "oklch(var(--text))" }}>
                    {React.createElement(Trash2, { className: "w-3.5 h-3.5" })}
                  </button>
                )}
              </div>
            </div>
          ))}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="mc-label px-4 py-2 rounded-full transition-opacity disabled:opacity-30"
                style={{ background: "oklch(var(--surface))" }}>← Prev</button>
              <span className="mc-label">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="mc-label px-4 py-2 rounded-full transition-opacity disabled:opacity-30"
                style={{ background: "oklch(var(--surface))" }}>Next →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SessionsScreen;
