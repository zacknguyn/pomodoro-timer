import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Timer, Users, Settings, LogOut, Github, X, Clock, PanelLeftClose, PanelLeftOpen, ShieldCheck } from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Workspace', to: '/app' },
  { icon: Timer, label: 'Focus', to: '/app/pomodoro' },
  { icon: Clock, label: 'Sessions', to: '/app/sessions' },
  { icon: Users, label: 'Team', to: '/app/groups' },
  { icon: Settings, label: 'Settings', to: '/app/settings' },
];

const Sidebar = ({ open, onClose, collapsed, onToggleCollapse }) => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('registry_user') || '{}');
  const initial = user.email?.charAt(0).toUpperCase() || '?';
  const isAdmin = ['admin', 'superadmin'].includes(user.role);
  const allNavItems = isAdmin ? [...navItems, { icon: ShieldCheck, label: 'Admin', to: '/app/admin' }] : navItems;

  const handleLogout = () => {
    localStorage.removeItem('registry_token');
    localStorage.removeItem('registry_user');
    navigate('/login');
  };

  const handleNavClick = () => { if (onClose) onClose(); };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "oklch(var(--text) / 0.3)", backdropFilter: "blur(4px)" }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Main navigation"
        className={`fixed left-0 top-0 bottom-0 flex flex-col z-50 transition-all duration-300
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'w-16' : 'w-72'}`}
        style={{ background: "oklch(var(--canvas))", borderRight: "1px solid oklch(var(--text) / 0.06)" }}
      >
        {/* Logo */}
        <div className={`py-8 flex items-center ${collapsed ? 'flex-col gap-3 px-2' : 'justify-between px-8'}`}>
          {collapsed ? (
            <>
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "oklch(var(--primary))" }}>
                {React.createElement(Github, { className: "w-4 h-4", style: { color: "oklch(var(--canvas))" } })}
              </div>
              <button onClick={onToggleCollapse}
                className="p-2 rounded-full transition-colors hover:bg-[oklch(var(--text)/0.05)] hidden lg:flex"
                aria-label="Expand sidebar"
                style={{ color: "oklch(var(--text-muted))" }}>
                {React.createElement(PanelLeftOpen, { className: "w-4 h-4" })}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "oklch(var(--primary))" }}>
                  {React.createElement(Github, { className: "w-4 h-4", style: { color: "oklch(var(--canvas))" } })}
                </div>
                <span className="mc-display text-xl tracking-tight">Pomogit.</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={onToggleCollapse}
                  className="p-2 rounded-full transition-colors hover:bg-[oklch(var(--text)/0.05)] hidden lg:flex"
                  aria-label="Collapse sidebar"
                  style={{ color: "oklch(var(--text-muted))" }}>
                  {React.createElement(PanelLeftClose, { className: "w-4 h-4" })}
                </button>
                <button onClick={onClose}
                  className="p-2 rounded-full transition-colors hover:bg-[oklch(var(--text)/0.05)] lg:hidden"
                  aria-label="Close navigation"
                  style={{ color: "oklch(var(--text-muted))" }}>
                  {React.createElement(X, { className: "w-4 h-4" })}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-2 space-y-0.5">
          {allNavItems.map(({ icon: Icon, label, to }) => (
            <NavLink key={to} to={to} end
              onClick={handleNavClick}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-2xl mc-body text-[11px] font-bold uppercase tracking-[0.15em] transition-all ${
                  collapsed ? 'justify-center' : 'px-4'
                }`
              }
              style={({ isActive }) => ({
                background: isActive ? "oklch(var(--text) / 0.06)" : undefined,
                color: isActive ? "oklch(var(--text))" : "oklch(var(--text-muted))",
              })}
            >
              {({ isActive }) => (
                <>
                  {!collapsed && (
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all"
                      style={{ background: isActive ? "oklch(var(--primary))" : "transparent" }} />
                  )}
                  {React.createElement(Icon, {
                    className: "w-4 h-4 flex-shrink-0 transition-colors",
                    style: { color: isActive ? "oklch(var(--primary))" : undefined }
                  })}
                  {!collapsed && label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-2 py-6 border-t space-y-1" style={{ borderColor: "oklch(var(--text) / 0.06)" }}>
          <NavLink to="/app/profile" onClick={handleNavClick}
            title={collapsed ? 'Profile' : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 rounded-2xl transition-all mc-body text-[11px] font-bold uppercase tracking-[0.15em] ${
                collapsed ? 'justify-center' : 'px-4'
              }`
            }
            style={({ isActive }) => ({
              background: isActive ? "oklch(var(--text) / 0.06)" : undefined,
              color: isActive ? "oklch(var(--text))" : "oklch(var(--text-muted))",
            })}
          >
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
              style={{ background: "oklch(var(--primary) / 0.15)", color: "oklch(var(--primary))" }}>
              {initial}
            </div>
            {!collapsed && <span className="truncate">{user.email?.split('@')[0] || 'Operator'}</span>}
          </NavLink>
          <LogoutButton onClick={handleLogout} collapsed={collapsed} />
        </div>
      </aside>
    </>
  );
};

const LogoutButton = ({ onClick, collapsed }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={collapsed ? 'Terminate' : undefined}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-colors mc-body text-[11px] font-bold uppercase tracking-[0.15em] text-left ${collapsed ? 'justify-center' : 'px-4'}`}
      style={{ color: hovered ? "oklch(var(--primary))" : "oklch(var(--text-muted))" }}>
      {React.createElement(LogOut, { className: "w-4 h-4 flex-shrink-0" })}
      {!collapsed && 'Terminate'}
    </button>
  );
};

export default Sidebar;
