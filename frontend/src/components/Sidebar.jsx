import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Timer, Users, Settings, Info, LogOut, Github, Sun, Moon, X } from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Workspace', to: '/' },
  { icon: Timer, label: 'Focus', to: '/pomodoro' },
  { icon: Users, label: 'Team', to: '/groups' },
  { icon: Settings, label: 'Settings', to: '/settings' },
  { icon: Info, label: 'Protocol', to: '/about' },
];

const Sidebar = ({ open, onClose }) => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('registry_user') || '{}');
  const initial = user.email?.charAt(0).toUpperCase() || '?';
  const [isDark, setIsDark] = useState(
    () => document.documentElement.getAttribute('data-theme') === 'dark'
  );

  const handleLogout = () => {
    localStorage.removeItem('registry_token');
    localStorage.removeItem('registry_user');
    navigate('/login');
  };

  const toggleTheme = () => {
    const next = !isDark;
    if (next) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.removeItem('theme');
    }
    setIsDark(next);
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
        className={`fixed left-0 top-0 bottom-0 w-72 flex flex-col z-50 transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ background: "oklch(var(--canvas))", borderRight: "1px solid oklch(var(--text) / 0.06)" }}
      >
        {/* Logo */}
        <div className="px-8 py-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "oklch(var(--primary))" }}>
              {React.createElement(Github, { className: "w-4 h-4 text-white" })}
            </div>
            <span className="mc-display text-xl tracking-tight">Pomogit.</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggleTheme}
              className="p-2 rounded-full transition-colors hover:bg-[oklch(var(--text)/0.05)]"
              aria-label="Toggle theme"
              style={{ color: "oklch(var(--text-muted))" }}>
              {React.createElement(isDark ? Sun : Moon, { className: "w-4 h-4" })}
            </button>
            {/* Close button — mobile only */}
            <button onClick={onClose}
              className="p-2 rounded-full transition-colors hover:bg-[oklch(var(--text)/0.05)] lg:hidden"
              aria-label="Close navigation"
              style={{ color: "oklch(var(--text-muted))" }}>
              {React.createElement(X, { className: "w-4 h-4" })}
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-2 space-y-0.5">
          {navItems.map(({ icon: Icon, label, to }) => (
            <NavLink key={to} to={to} end={to === '/'}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl mc-body text-[11px] font-bold uppercase tracking-[0.15em] transition-all ${
                  isActive ? 'text-text' : 'text-text-muted hover:text-text'
                }`
              }
              style={({ isActive }) => isActive ? { background: "oklch(var(--text) / 0.06)" } : undefined}
            >
              {({ isActive }) => (
                <>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all"
                    style={{ background: isActive ? "oklch(var(--primary))" : "transparent" }} />
                  {React.createElement(Icon, {
                    className: "w-4 h-4 flex-shrink-0 transition-colors",
                    style: { color: isActive ? "oklch(var(--primary))" : undefined }
                  })}
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-6 border-t space-y-1" style={{ borderColor: "oklch(var(--text) / 0.06)" }}>
          <NavLink to="/profile" onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all mc-body text-[11px] font-bold uppercase tracking-[0.15em] ${
                isActive ? 'text-text' : 'text-text-muted hover:text-text'
              }`
            }
            style={({ isActive }) => isActive ? { background: "oklch(var(--text) / 0.06)" } : undefined}
          >
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
              style={{ background: "oklch(var(--primary) / 0.15)", color: "oklch(var(--primary))" }}>
              {initial}
            </div>
            <span className="truncate">{user.email?.split('@')[0] || 'Operator'}</span>
          </NavLink>
          <LogoutButton onClick={handleLogout} />
        </div>
      </aside>
    </>
  );
};

const LogoutButton = ({ onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors mc-body text-[11px] font-bold uppercase tracking-[0.15em] text-left"
      style={{ color: hovered ? "oklch(var(--primary))" : "oklch(var(--text-muted))" }}>
      {React.createElement(LogOut, { className: "w-4 h-4 flex-shrink-0" })}
      Terminate
    </button>
  );
};

export default Sidebar;
