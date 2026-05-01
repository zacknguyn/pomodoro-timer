import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Github, Users, Archive, Trash2, LogOut, ExternalLink } from "lucide-react";
import { groupApi, githubApi } from "@/lib/api";
import Skeleton from "@/components/Skeleton";
import AvatarOrbit from "@/components/AvatarOrbit";

const AVATAR = (name) => `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=141413&textColor=f3f0ee`;

const GroupDetailScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('registry_user') || '{}'); } catch { return {}; }
  })();

  const load = useCallback(() => {
    groupApi.get(id).then(data => {
      setGroup(data);
      setLoading(false);
      // Fetch recent commits for the group's repo
      const [owner, repo] = data.repo_full_name.split('/');
      githubApi.getCommits(owner, repo).then(setCommits).catch(() => {});
    }).catch(() => { setLoading(false); navigate('/groups'); });
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const isOwner = group?.owner_id === currentUser?.id;

  const handleArchive = async () => {
    setActionLoading(true);
    await groupApi.setStatus(id, group.status === 'active' ? 'archived' : 'active');
    load();
    setActionLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this group permanently?')) return;
    setActionLoading(true);
    await groupApi.delete(id);
    navigate('/groups');
  };

  const handleLeave = async () => {
    if (!confirm('Leave this group?')) return;
    setActionLoading(true);
    await groupApi.leave(id);
    navigate('/groups');
  };

  if (loading) return (
    <div className="space-y-8 pb-20 px-8 pt-8 max-w-4xl mx-auto">
      <Skeleton style={{ height: "120px" }} />
      <Skeleton style={{ height: "200px" }} />
    </div>
  );

  if (!group) return null;

  return (
    <div className="space-y-12 pb-20 px-8 pt-8 max-w-4xl mx-auto">

      {/* Back + header */}
      <div className="space-y-6">
        <Link to="/groups" className="flex items-center gap-2 mc-label hover:opacity-70 transition-opacity w-fit">
          {React.createElement(ArrowLeft, { className: "w-3.5 h-3.5" })}
          All groups
        </Link>
        <div className="flex items-start justify-between gap-6">
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
          <div className="flex items-center gap-2 flex-shrink-0">
            {isOwner && (
              <>
                <button onClick={handleArchive} disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full mc-body text-xs font-bold uppercase tracking-widest border transition-all disabled:opacity-40"
                  style={{ borderColor: "oklch(var(--text) / 0.1)", color: "oklch(var(--text-muted))" }}>
                  {React.createElement(Archive, { className: "w-3.5 h-3.5" })}
                  {group.status === 'active' ? 'Archive' : 'Reactivate'}
                </button>
                <button onClick={handleDelete} disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full mc-body text-xs font-bold uppercase tracking-widest border transition-all disabled:opacity-40"
                  style={{ borderColor: "oklch(var(--primary) / 0.3)", color: "oklch(var(--primary))" }}>
                  {React.createElement(Trash2, { className: "w-3.5 h-3.5" })}
                  Delete
                </button>
              </>
            )}
            {!isOwner && (
              <button onClick={handleLeave} disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full mc-body text-xs font-bold uppercase tracking-widest border transition-all disabled:opacity-40"
                style={{ borderColor: "oklch(var(--text) / 0.1)", color: "oklch(var(--text-muted))" }}>
                {React.createElement(LogOut, { className: "w-3.5 h-3.5" })}
                Leave
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Members */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          {React.createElement(Users, { className: "w-3.5 h-3.5", style: { color: "oklch(var(--text-muted))" } })}
          <h2 className="mc-label">{group.members?.length} members</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {group.members?.map(m => (
            <div key={m.id} className="flex flex-col items-center gap-3">
              <AvatarOrbit src={AVATAR(m.name)} alt={m.name} size="w-16 h-16" active={m.isActive} />
              <div className="text-center space-y-0.5">
                <p className="mc-body text-xs font-bold uppercase tracking-wide" style={{ color: "oklch(var(--text))" }}>
                  {m.name}{m.role === 'owner' ? ' ★' : ''}
                </p>
                <div className="flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.isActive ? "oklch(var(--accent))" : "oklch(var(--text) / 0.12)" }} />
                  <span className="mc-label">{m.isActive ? 'Active' : `${m.sessions_today} today`}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent commits */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          {React.createElement(Github, { className: "w-3.5 h-3.5", style: { color: "oklch(var(--text-muted))" } })}
          <h2 className="mc-label">Recent commits</h2>
        </div>
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
                    <span>{new Date(c.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    <span style={{ color: "oklch(var(--text) / 0.2)" }}>·</span>
                    <span style={{ color: "oklch(var(--primary) / 0.8)" }}>{c.sha?.slice(0, 7)}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default GroupDetailScreen;
