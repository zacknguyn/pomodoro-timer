import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Github, Users, Archive, Trash2, LogOut, ExternalLink, MessageSquare, X } from "lucide-react";
import { toast } from "sonner";
import { groupApi } from "@/lib/api";
import { parseUTC } from "@/lib/utils";
import Skeleton from "@/components/Skeleton";
import AvatarOrbit from "@/components/AvatarOrbit";

const AVATAR = (seed, style = 'thumbs') => `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;

const GroupDetailScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [commits, setCommits] = useState([]);
  const [telemetry, setTelemetry] = useState(null);
  const [notes, setNotes] = useState([]);
  const [noteInput, setNoteInput] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState(null); // 'delete' | 'leave'
  const [actionLoading, setActionLoading] = useState(false);

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('registry_user') || '{}'); } catch { return {}; }
  })();

  const [notMember, setNotMember] = useState(false);

  const load = useCallback(() => {
    groupApi.get(id).then(data => {
      setGroup(data);
      setLoading(false);
      groupApi.commits(id).then(setCommits).catch(() => {});
      groupApi.telemetry(id).then(setTelemetry).catch(() => {});
      groupApi.notes(id).then(setNotes).catch(() => {});
    }).catch((err) => {
      setLoading(false);
      if (err.message === 'Not a member' || err.message?.includes('member')) {
        setNotMember(true);
      } else {
        navigate('/app/groups');
      }
    });
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    await groupApi.addNote(id, noteInput.trim());
    setNoteInput('');
    groupApi.notes(id).then(setNotes).catch(() => {});
    toast.success('Note posted');
  };

  // Poll notes every 15s while panel is open
  useEffect(() => {
    if (!notesOpen) return;
    const interval = setInterval(() => {
      groupApi.notes(id).then(setNotes).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [notesOpen, id]);

  const isOwner = group?.owner_id === currentUser?.id;

  const handleArchive = async () => {
    setActionLoading(true);
    await groupApi.setStatus(id, group.status === 'active' ? 'archived' : 'active');
    load();
    setActionLoading(false);
  };

  const handleDelete = async () => {
    setActionLoading(true);
    await groupApi.delete(id);
    navigate('/app/groups');
  };

  const handleLeave = async () => {
    setActionLoading(true);
    await groupApi.leave(id);
    navigate('/app/groups');
  };

  if (loading) return (
    <div className="space-y-8 pb-20 px-4 sm:px-8 pt-8 max-w-4xl mx-auto">
      <Skeleton style={{ height: "120px" }} />
      <Skeleton style={{ height: "200px" }} />
    </div>
  );

  if (!group && notMember) return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-24 text-center space-y-4">
      <p className="mc-display text-5xl" style={{ color: "oklch(var(--text) / 0.08)" }}>403</p>
      <p className="mc-body" style={{ color: "oklch(var(--text-muted))" }}>You're not a member of this group.</p>
      <Link to="/app/groups" className="mc-label hover:opacity-70 transition-opacity inline-block">← Back to groups</Link>
    </div>
  );

  if (!group) return null;

  return (
    <div className="space-y-12 pb-28 px-4 sm:px-8 pt-8 max-w-4xl mx-auto">

      {/* Back + header */}
      <div className="space-y-6">
        <Link to="/app/groups" className="flex items-center gap-2 mc-label hover:opacity-70 transition-opacity w-fit">
          {React.createElement(ArrowLeft, { className: "w-3.5 h-3.5" })}
          All groups
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="mc-display text-4xl sm:text-5xl tracking-tighter">{group.name}</h1>
              {group.status === 'archived' && (
                <span className="mc-label px-3 py-1 rounded-full" style={{ background: "oklch(var(--text) / 0.06)" }}>Archived</span>
              )}
            </div>
            <div className="flex items-center gap-2 mc-label">
              {React.createElement(Github, { className: "w-3.5 h-3.5" })}
              <a href={`https://github.com/${group.repo_full_name}`} target="_blank" rel="noreferrer"
                className="hover:opacity-70 transition-opacity flex items-center gap-1">
                {group.repo_full_name}
                {React.createElement(ExternalLink, { className: "w-3 h-3" })}
              </a>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            {confirmAction ? (
              <div className="flex items-center gap-2">
                <span className="mc-label" style={{ color: "oklch(var(--text-muted))" }}>
                  {confirmAction === 'delete' ? 'Delete permanently?' : 'Leave group?'}
                </span>
                <button onClick={() => { confirmAction === 'delete' ? handleDelete() : handleLeave(); setConfirmAction(null); }}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-full mc-body text-xs font-bold uppercase tracking-widest border transition-all disabled:opacity-40"
                  style={{ borderColor: "oklch(var(--primary) / 0.4)", color: "oklch(var(--primary))" }}>
                  Confirm
                </button>
                <button onClick={() => setConfirmAction(null)}
                  className="px-4 py-2 rounded-full mc-body text-xs font-bold uppercase tracking-widest border transition-all"
                  style={{ borderColor: "oklch(var(--text) / 0.1)", color: "oklch(var(--text-muted))" }}>
                  Cancel
                </button>
              </div>
            ) : (
              <>
                {isOwner && (
                  <>
                    <button onClick={handleArchive} disabled={actionLoading}
                      className="flex items-center gap-2 px-4 py-3 rounded-full mc-body text-xs font-bold uppercase tracking-widest border transition-all disabled:opacity-40"
                      style={{ borderColor: "oklch(var(--text) / 0.1)", color: "oklch(var(--text-muted))" }}>
                      {React.createElement(Archive, { className: "w-3.5 h-3.5" })}
                      {group.status === 'active' ? 'Archive' : 'Reactivate'}
                    </button>
                    <button onClick={() => setConfirmAction('delete')} disabled={actionLoading}
                      className="flex items-center gap-2 px-4 py-3 rounded-full mc-body text-xs font-bold uppercase tracking-widest border transition-all disabled:opacity-40"
                      style={{ borderColor: "oklch(var(--primary) / 0.3)", color: "oklch(var(--primary))" }}>
                      {React.createElement(Trash2, { className: "w-3.5 h-3.5" })}
                      Delete
                    </button>
                  </>
                )}
                {!isOwner && (
                  <button onClick={() => setConfirmAction('leave')} disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-3 rounded-full mc-body text-xs font-bold uppercase tracking-widest border transition-all disabled:opacity-40"
                    style={{ borderColor: "oklch(var(--text) / 0.1)", color: "oklch(var(--text-muted))" }}>
                    {React.createElement(LogOut, { className: "w-3.5 h-3.5" })}
                    Leave
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Members */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          {React.createElement(Users, { className: "w-3.5 h-3.5", style: { color: "oklch(var(--text-muted))" } })}
          <p className="mc-label">{group.members?.length} members</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {group.members?.map(m => (
            <Link key={m.id} to={`/u/${m.name}`} className="flex flex-col items-center gap-3 group">
              <div className="transition-transform group-hover:scale-105">
                <AvatarOrbit src={AVATAR(m.email || m.name, m.avatarStyle)} alt={m.name} size="w-16 h-16" active={m.isActive} />
              </div>
              <div className="text-center space-y-0.5">
                <p className="mc-body text-xs font-bold uppercase tracking-wide group-hover:opacity-70 transition-opacity" style={{ color: "oklch(var(--text))" }}>
                  {m.name}{m.role === 'owner' ? ' ★' : ''}
                </p>
                <div className="flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.isActive ? "oklch(var(--accent))" : "oklch(var(--text) / 0.12)" }} />
                  <span className="mc-label">{m.isActive ? 'Active' : `${m.sessions_today} today`}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Telemetry */}
      {telemetry && (
        <section className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          {/* Focus Density — dominant */}
          <div className="sm:col-span-6 p-6 rounded-[20px] space-y-2" style={{ background: "oklch(var(--primary) / 0.07)", border: "1px solid oklch(var(--primary) / 0.15)" }}>
            <p className="mc-label" style={{ color: "oklch(var(--primary))" }}>Focus Density</p>
            <p className="mc-display" style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)", color: "oklch(var(--text))", lineHeight: 1 }}>{telemetry.focusDensity}<span className="mc-label text-base ml-1">/day</span></p>
            <p className="mc-label italic">sessions per member · last 7 days</p>
          </div>
          {/* Secondary stats */}
          <div className="sm:col-span-3 p-5 rounded-[20px] space-y-1" style={{ background: "oklch(var(--surface))" }}>
            <p className="mc-label">Mean Session</p>
            <p className="mc-display text-2xl" style={{ color: "oklch(var(--text))" }}>{telemetry.meanSession}m</p>
            <p className="mc-label italic">avg duration</p>
          </div>
          <div className="sm:col-span-3 p-5 rounded-[20px] space-y-1" style={{ background: "oklch(var(--surface))" }}>
            <p className="mc-label">Total Sessions</p>
            <p className="mc-display text-2xl" style={{ color: "oklch(var(--text))" }}>{telemetry.totalSessions}</p>
            <p className="mc-label italic">last 7 days</p>
          </div>
        </section>
      )}

      {/* Recent commits */}
      <div className="flex items-center gap-2">
        {React.createElement(Github, { className: "w-3.5 h-3.5", style: { color: "oklch(var(--text-muted))" } })}
        <h2 className="mc-label">Recent commits</h2>
      </div>
      <section className="space-y-6">
        {commits.length === 0 ? (
          <p className="mc-body text-sm italic" style={{ color: "oklch(var(--text-muted))" }}>No commits found or GitHub not connected.</p>
        ) : (
          <div className="space-y-2">
            {commits.slice(0, 10).map(c => (
              <a key={c.sha} href={`https://github.com/${group.repo_full_name}/commit/${c.sha}`}
                target="_blank" rel="noreferrer"
                className="flex items-start gap-4 p-4 rounded-2xl border transition-all hover:border-[oklch(var(--text)/0.15)] block"
                style={{ background: "oklch(var(--surface))", borderColor: "oklch(var(--text) / 0.05)" }}>
                <div className="space-y-0.5 min-w-0">
                  <p className="mc-body text-sm font-bold truncate" style={{ color: "oklch(var(--text))" }}>{c.message}</p>
                  <div className="flex items-center gap-2 mc-label">
                    <span>{c.author}</span>
                    <span style={{ color: "oklch(var(--text) / 0.2)" }}>·</span>
                    <span>{parseUTC(c.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    <span style={{ color: "oklch(var(--text) / 0.2)" }}>·</span>
                    <span style={{ color: "oklch(var(--primary) / 0.8)" }}>{c.sha?.slice(0, 7)}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
      {/* Notes FAB */}
      <button onClick={() => setNotesOpen(o => !o)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3.5 rounded-full mc-body text-sm font-bold uppercase tracking-widest shadow-xl transition-all hover:scale-105"
        style={{ background: "oklch(var(--text))", color: "oklch(var(--canvas))" }}>
        {React.createElement(MessageSquare, { className: "w-4 h-4" })}
        Notes {notes.length > 0 && `(${notes.length})`}
      </button>

      {/* Notes popup */}
      {notesOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setNotesOpen(false)} />
          <div className="fixed bottom-20 right-0 sm:right-6 z-50 w-full sm:w-96 rounded-t-[28px] sm:rounded-[28px] border shadow-2xl flex flex-col overflow-hidden"
            style={{ background: "oklch(var(--canvas))", borderColor: "oklch(var(--text) / 0.08)", maxHeight: "70vh" }}
            onKeyDown={e => e.key === 'Escape' && setNotesOpen(false)}>
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "oklch(var(--text) / 0.06)" }}>
              <div className="flex items-center gap-2">
                {React.createElement(MessageSquare, { className: "w-4 h-4", style: { color: "oklch(var(--primary))" } })}
                <span className="mc-display text-lg">Group Notes</span>
              </div>
              <button onClick={() => setNotesOpen(false)} className="p-1.5 rounded-full hover:bg-[oklch(var(--text)/0.05)] transition-colors">
                {React.createElement(X, { className: "w-4 h-4" })}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {notes.length === 0 ? (
                <p className="mc-body text-sm italic text-center py-8" style={{ color: "oklch(var(--text) / 0.35)" }}>No notes yet. Be the first.</p>
              ) : notes.map(n => (
                <div key={n.id} className="p-4 rounded-2xl border" style={{ background: "oklch(var(--surface))", borderColor: "oklch(var(--text) / 0.05)" }}>
                  <p className="mc-body text-sm" style={{ color: "oklch(var(--text))" }}>{n.content}</p>
                  <div className="flex items-center gap-2 mt-2 mc-label">
                    <span className="font-bold">{n.author}</span>
                    <span style={{ color: "oklch(var(--text) / 0.2)" }}>·</span>
                    <span>{parseUTC(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddNote} className="px-6 py-4 border-t flex gap-3" style={{ borderColor: "oklch(var(--text) / 0.06)" }}>
              <input type="text" value={noteInput} onChange={e => setNoteInput(e.target.value)}
                placeholder="Write a note…" autoFocus
                className="flex-1 px-4 py-2.5 rounded-full mc-body text-sm outline-none focus-visible:ring-2 focus-visible:ring-[oklch(var(--primary)/0.4)] border"
                style={{ background: "oklch(var(--surface))", borderColor: "oklch(var(--text) / 0.08)", color: "oklch(var(--text))" }} />
              <button type="submit" disabled={!noteInput.trim()}
                className="px-5 py-2.5 rounded-full mc-body text-sm font-bold uppercase tracking-widest transition-all disabled:opacity-40 hover:scale-105"
                style={{ background: "oklch(var(--text))", color: "oklch(var(--canvas))" }}>
                Post
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default GroupDetailScreen;
