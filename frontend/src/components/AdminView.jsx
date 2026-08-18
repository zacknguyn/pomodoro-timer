import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, ShieldCheck, Trash2, UserRoundCog } from 'lucide-react'
import { adminApi } from '../lib/authApi'
import { DitherAreaChart } from './dither-kit/DitherCharts'

function formatDate(value) {
  if (!value) return 'Never'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default function AdminView({ currentUser }) {
  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState('')
  const [armedDelete, setArmedDelete] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [nextOverview, nextUsers] = await Promise.all([adminApi.overview(), adminApi.users()])
      setOverview(nextOverview)
      setUsers(nextUsers)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function mutate(userId, action) {
    setWorkingId(userId)
    setError('')
    try {
      await action()
      setArmedDelete('')
      await load()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setWorkingId('')
    }
  }

  const activity = overview?.activity?.length
    ? overview.activity.map((item) => ({ label: new Date(`${item.day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' }), value: item.count }))
    : Array.from({ length: 7 }, (_, index) => ({ label: `D${index + 1}`, value: 0 }))

  return (
    <div className="admin-view">
      <header className="admin-header">
        <div><p className="page-kicker">System / Administration</p><h1>Control room</h1><p>Account access, workspace health, and recorded operator actions.</p></div>
        <button className="button-secondary" type="button" onClick={load} disabled={loading}><RefreshCw size={16} /> Refresh</button>
      </header>

      {error && <p className="admin-error" role="alert">{error}</p>}
      <section className="admin-summary" aria-label="System summary">
        {['users', 'suspended', 'tasks', 'sessionsToday'].map((key) => <div key={key}><span>{key === 'sessionsToday' ? 'Sessions today' : key}</span><strong>{overview?.summary?.[key] ?? '—'}</strong></div>)}
      </section>

      <section className="admin-activity" aria-labelledby="activity-heading">
        <div><p className="section-kicker">Last seven days</p><h2 id="activity-heading">Focus activity</h2><p>Recorded sessions, not a productivity score.</p></div>
        <DitherAreaChart data={activity} label="Focus sessions over the last seven days" />
      </section>

      <section className="admin-users" aria-labelledby="users-heading">
        <header><div><p className="section-kicker">Access registry</p><h2 id="users-heading">Accounts</h2></div><span>{users.length} total</span></header>
        <div className="admin-table-wrap">
          <table>
            <thead><tr><th>Account</th><th>Role</th><th>Workspace</th><th>Last focus</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{users.map((user) => {
              const isSelf = user.id === currentUser.id
              return <tr key={user.id} className={user.banned ? 'is-suspended' : ''}>
                <td><strong>{user.email}</strong><small>{user.banned ? 'Suspended' : 'Active'} · joined {formatDate(user.created_at)}</small></td>
                <td><span className={`role-chip is-${user.role}`}><ShieldCheck size={13} /> {user.role}</span></td>
                <td>{user.task_count} tasks · {user.focus_session_count} sessions</td>
                <td>{formatDate(user.last_active)}</td>
                <td><div className="admin-row-actions">
                  {!isSelf && user.role !== 'superadmin' && <button type="button" disabled={workingId === user.id} onClick={() => mutate(user.id, () => adminApi.toggleBan(user.id))}>{user.banned ? 'Restore' : 'Suspend'}</button>}
                  {!isSelf && user.role !== 'superadmin' && currentUser.role === 'superadmin' && <button type="button" disabled={workingId === user.id} onClick={() => mutate(user.id, () => adminApi.setRole(user.id, user.role === 'admin' ? 'user' : 'admin'))}><UserRoundCog size={14} /> {user.role === 'admin' ? 'Remove admin' : 'Make admin'}</button>}
                  {!isSelf && user.role === 'user' && (armedDelete !== user.id
                    ? <button className="danger-link" type="button" onClick={() => setArmedDelete(user.id)}><Trash2 size={14} /> Delete</button>
                    : <button className="danger-confirm" type="button" disabled={workingId === user.id} onClick={() => mutate(user.id, () => adminApi.deleteUser(user.id))}>Confirm delete</button>)}
                </div></td>
              </tr>
            })}</tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
