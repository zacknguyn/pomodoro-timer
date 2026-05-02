import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, ShieldOff, ShieldCheck, Users, Timer, Users2, Github, ExternalLink, Search, ArrowUpDown } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { parseUTC } from '@/lib/utils';
import { toast } from 'sonner';
import Skeleton from '@/components/Skeleton';

const Sparkline = ({ data }) => {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  const last7 = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    return data.find(r => r.day === key)?.count ?? 0;
  });
  return (
    <div className="flex items-end gap-0.5 h-8 mt-2">
      {last7.map((v, i) => (
        <div key={i} className="flex-1 rounded-sm transition-all"
          style={{
            height: `${Math.max(4, (v / max) * 100)}%`,
            background: v > 0 ? "oklch(var(--primary) / 0.7)" : "oklch(var(--text) / 0.08)",
          }} />
      ))}
    </div>
  );
};

const SORTS = ['newest', 'most active', 'banned'];

const AdminScreen = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // user id being acted on
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    Promise.all([adminApi.stats(), adminApi.users()])
      .then(([s, u]) => { setStats(s); setUsers(u); })
      .catch(() => toast.error('Failed to load admin data'))
      .finally(() => setLoading(false));
  }, []);

  const handleBan = async (id) => {
    setActionLoading(id);
    const res = await adminApi.ban(id);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, banned: res.banned ? 1 : 0 } : u));
    toast.success(res.banned ? 'User banned' : 'User unbanned');
    setConfirmAction(null);
    setActionLoading(null);
  };

  const handleDelete = async (id) => {
    setActionLoading(id);
    await adminApi.delete(id);
    setUsers(prev => prev.filter(u => u.id !== id));
    toast.success('User deleted');
    setConfirmAction(null);
    setActionLoading(null);
  };

  const filtered = useMemo(() => {
    let list = users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()));
    if (sort === 'most active') list = [...list].sort((a, b) => b.session_count - a.session_count);
    else if (sort === 'banned') list = [...list].sort((a, b) => b.banned - a.banned);
    return list;
  }, [users, search, sort]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-24 space-y-10">
      <header className="space-y-1">
        <h1 className="mc-display text-5xl tracking-tighter">Admin.</h1>
        <p className="mc-body text-sm" style={{ color: "oklch(var(--text) / 0.4)" }}>System overview and user management.</p>
      </header>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} style={{ height: '96px' }} />)}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Users, label: 'Users', value: stats.totalUsers },
            { icon: Timer, label: 'Sessions', value: stats.totalSessions },
            { icon: Users2, label: 'Groups', value: stats.totalGroups },
            { icon: ShieldOff, label: 'Banned', value: stats.bannedUsers },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="p-5 rounded-2xl border space-y-1"
              style={{ background: "oklch(var(--surface))", borderColor: "oklch(var(--text) / 0.05)" }}>
              <div className="flex items-center gap-2 mc-label">
                <Icon className="w-3.5 h-3.5" style={{ color: "oklch(var(--primary))" }} />
                {label}
              </div>
              <p className="mc-display text-3xl">{value}</p>
              {label === 'Sessions' && <Sparkline data={stats.sessionsPerDay} />}
            </div>
          ))}
        </div>
      )}

      {/* Users table */}
      <section className="space-y-4">
        <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
          <h2 className="mc-display text-2xl">Users</h2>
          <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "oklch(var(--text-muted))" }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search email…"
                className="w-full pl-9 pr-4 py-2 rounded-full mc-body text-sm outline-none focus-visible:ring-2 focus-visible:ring-[oklch(var(--primary)/0.4)] border"
                style={{ background: "oklch(var(--surface))", borderColor: "oklch(var(--text) / 0.08)", color: "oklch(var(--text))", minWidth: "0", maxWidth: "180px" }} />
            </div>
            {/* Sort */}
            <div className="flex items-center gap-1 p-1 rounded-full" style={{ background: "oklch(var(--surface))" }}>
              {SORTS.map(s => (
                <button key={s} onClick={() => setSort(s)}
                  className="px-3 py-1.5 rounded-full mc-body text-[10px] font-bold uppercase tracking-widest transition-all capitalize"
                  style={sort === s
                    ? { background: "oklch(var(--text))", color: "oklch(var(--canvas))" }
                    : { color: "oklch(var(--text-muted))" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} style={{ height: '56px' }} />)}</div>
        ) : filtered.length === 0 ? (
          <p className="mc-body text-sm italic py-8 text-center" style={{ color: "oklch(var(--text) / 0.3)" }}>No users found.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map(u => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-4 rounded-2xl border"
                style={{
                  background: "oklch(var(--surface))",
                  borderColor: u.banned ? "oklch(var(--primary) / 0.2)" : "oklch(var(--text) / 0.05)",
                  opacity: u.banned ? 0.7 : 1,
                }}>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="mc-body text-sm font-bold truncate">{u.email}</span>
                    {u.github_connected ? (
                      <Github className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "oklch(var(--text) / 0.4)" }} />
                    ) : null}
                    {u.banned ? (
                      <span className="mc-label px-2 py-0.5 rounded-full"
                        style={{ background: "oklch(var(--primary) / 0.1)", color: "oklch(var(--primary))" }}>
                        Banned
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3 mc-label flex-wrap">
                    <span>{u.session_count} sessions</span>
                    {u.last_active && (
                      <>
                        <span style={{ color: "oklch(var(--text) / 0.2)" }}>·</span>
                        <span>Last active {parseUTC(u.last_active).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </>
                    )}
                    <span style={{ color: "oklch(var(--text) / 0.2)" }}>·</span>
                    <span>Joined {parseUTC(u.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>

                {confirmAction?.id === u.id ? (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="mc-label" style={{ color: "oklch(var(--text-muted))" }}>
                      {confirmAction.type === 'delete' ? 'Delete user?' : u.banned ? 'Unban?' : 'Ban user?'}
                    </span>
                    <button onClick={() => confirmAction.type === 'delete' ? handleDelete(u.id) : handleBan(u.id)}
                      disabled={actionLoading === u.id}
                      className="mc-label px-3 py-1.5 rounded-full border transition-opacity hover:opacity-70 disabled:opacity-40"
                      style={{ borderColor: "oklch(var(--primary) / 0.4)", color: "oklch(var(--primary))" }}>
                      {actionLoading === u.id ? '…' : 'Confirm'}
                    </button>
                    <button onClick={() => setConfirmAction(null)}
                      className="mc-label px-3 py-1.5 rounded-full border transition-opacity hover:opacity-70"
                      style={{ borderColor: "oklch(var(--text) / 0.1)", color: "oklch(var(--text-muted))" }}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a href={`/u/${u.email.split('@')[0]}`} target="_blank" rel="noreferrer"
                      className="p-2 rounded-full transition-colors hover:bg-[oklch(var(--text)/0.05)]"
                      title="View public profile"
                      style={{ color: "oklch(var(--text-muted))" }}>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button onClick={() => setConfirmAction({ type: 'ban', id: u.id })}
                      className="p-2 rounded-full transition-colors hover:bg-[oklch(var(--text)/0.05)]"
                      title={u.banned ? 'Unban' : 'Ban'}
                      style={{ color: u.banned ? "oklch(var(--accent))" : "oklch(var(--text-muted))" }}>
                      {u.banned ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setConfirmAction({ type: 'delete', id: u.id })}
                      className="p-2 rounded-full transition-colors hover:bg-[oklch(var(--text)/0.05)]"
                      title="Delete user"
                      style={{ color: "oklch(var(--text-muted))" }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminScreen;
