import React, { useState, useEffect } from 'react';
import { Trash2, ShieldOff, ShieldCheck, Users, Timer, Users2 } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { parseUTC } from '@/lib/utils';
import { toast } from 'sonner';
import Skeleton from '@/components/Skeleton';

const AdminScreen = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'ban'|'delete', id }

  useEffect(() => {
    Promise.all([adminApi.stats(), adminApi.users()])
      .then(([s, u]) => { setStats(s); setUsers(u); })
      .catch(() => toast.error('Failed to load admin data'))
      .finally(() => setLoading(false));
  }, []);

  const handleBan = async (id) => {
    const res = await adminApi.ban(id);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, banned: res.banned ? 1 : 0 } : u));
    toast.success(res.banned ? 'User banned' : 'User unbanned');
    setConfirmAction(null);
  };

  const handleDelete = async (id) => {
    await adminApi.delete(id);
    setUsers(prev => prev.filter(u => u.id !== id));
    toast.success('User deleted');
    setConfirmAction(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 pt-8 pb-24 space-y-10">
      <header className="space-y-1">
        <h1 className="mc-display text-5xl tracking-tighter">Admin.</h1>
        <p className="mc-body text-sm" style={{ color: "oklch(var(--text) / 0.4)" }}>System overview and user management.</p>
      </header>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} style={{ height: '80px' }} />)}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Users, label: 'Users', value: stats.totalUsers },
            { icon: Timer, label: 'Sessions', value: stats.totalSessions },
            { icon: Users2, label: 'Groups', value: stats.totalGroups },
            { icon: ShieldOff, label: 'Banned', value: stats.bannedUsers },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="p-5 rounded-2xl border space-y-2"
              style={{ background: "oklch(var(--surface))", borderColor: "oklch(var(--text) / 0.05)" }}>
              <div className="flex items-center gap-2 mc-label">
                <Icon className="w-3.5 h-3.5" style={{ color: "oklch(var(--primary))" }} />
                {label}
              </div>
              <p className="mc-display text-3xl">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Users table */}
      <section className="space-y-4">
        <h2 className="mc-display text-2xl">Users</h2>
        {loading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} style={{ height: '56px' }} />)}</div>
        ) : (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-4 rounded-2xl border"
                style={{
                  background: "oklch(var(--surface))",
                  borderColor: u.banned ? "oklch(var(--primary) / 0.2)" : "oklch(var(--text) / 0.05)",
                  opacity: u.banned ? 0.7 : 1,
                }}>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="mc-body text-sm font-bold truncate">{u.email}</span>
                    {u.banned ? (
                      <span className="mc-label px-2 py-0.5 rounded-full"
                        style={{ background: "oklch(var(--primary) / 0.1)", color: "oklch(var(--primary))" }}>
                        Banned
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3 mc-label">
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
                      {confirmAction.type === 'delete' ? 'Delete user?' : u.banned ? 'Unban user?' : 'Ban user?'}
                    </span>
                    <button onClick={() => confirmAction.type === 'delete' ? handleDelete(u.id) : handleBan(u.id)}
                      className="mc-label px-3 py-1.5 rounded-full border transition-opacity hover:opacity-70"
                      style={{ borderColor: "oklch(var(--primary) / 0.4)", color: "oklch(var(--primary))" }}>
                      Confirm
                    </button>
                    <button onClick={() => setConfirmAction(null)}
                      className="mc-label px-3 py-1.5 rounded-full border transition-opacity hover:opacity-70"
                      style={{ borderColor: "oklch(var(--text) / 0.1)", color: "oklch(var(--text-muted))" }}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setConfirmAction({ type: 'ban', id: u.id })}
                      className="p-2 rounded-full transition-colors hover:bg-[oklch(var(--text)/0.05)]"
                      title={u.banned ? 'Unban' : 'Ban'}
                      style={{ color: u.banned ? "oklch(var(--accent))" : "oklch(var(--text-muted))" }}>
                      {u.banned
                        ? <ShieldCheck className="w-4 h-4" />
                        : <ShieldOff className="w-4 h-4" />}
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
