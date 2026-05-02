import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { User, LogOut, Menu, Sun, Moon } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";

const ROUTE_LABELS = {
  '/': 'Workspace',
  '/home': 'Workspace',
  '/pomodoro': 'Focus Session',
  '/team': 'Team Registry',
  '/settings': 'Settings',
  '/about': 'Protocol',
  '/profile': 'Profile',
};

const Header = ({ isDeepFocus, onMenuClick, collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const ref = useRef(null);
  const { displayName, avatar } = useProfile();

  const pageLabel = ROUTE_LABELS[location.pathname] || 'Workspace';

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    if (next) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  };

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (isDeepFocus) return null;

  return (
    <header className={`fixed top-0 left-0 right-0 z-40 px-4 lg:px-8 h-16 flex items-center justify-between transition-all duration-300 ${collapsed ? 'lg:left-16' : 'lg:left-72'}`}
      style={{ background: "oklch(var(--canvas) / 0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid oklch(var(--text) / 0.05)" }}>

      {/* Hamburger — mobile only */}
      <button onClick={onMenuClick}
        className="p-2 rounded-full transition-colors hover:bg-[oklch(var(--text)/0.05)] lg:hidden"
        aria-label="Open navigation"
        style={{ color: "oklch(var(--text-muted))" }}>
        {React.createElement(Menu, { className: "w-5 h-5" })}
      </button>

      {/* Breadcrumb */}
      <div className="hidden lg:flex items-center gap-3">
        <span className="mc-label" style={{ color: "oklch(var(--text-muted))" }}>Pomogit</span>
        <span className="mc-label" style={{ color: "oklch(var(--text) / 0.2)" }}>/</span>
        <span className="mc-body text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: "oklch(var(--text))" }}>
          {pageLabel}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Dark mode toggle */}
        <button onClick={toggleDark}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          className="p-2 rounded-full transition-colors hover:bg-[oklch(var(--text)/0.05)]"
          style={{ color: "oklch(var(--text-muted))" }}>
          {React.createElement(dark ? Sun : Moon, { className: "w-4 h-4" })}
        </button>

        {/* Avatar */}
        <div className="relative" ref={ref}>
          <button onClick={() => setOpen(!open)}
            aria-label="Open profile menu"
            aria-expanded={open}
            className="w-9 h-9 rounded-full overflow-hidden border-2 transition-all hover:scale-105"
            style={{ borderColor: open ? "oklch(var(--primary))" : "oklch(var(--text) / 0.1)" }}>
            <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
          </button>

          {open && (
            <div className="absolute top-full right-0 mt-3 w-52 rounded-2xl border shadow-xl overflow-hidden z-50"
              style={{ background: "oklch(var(--canvas))", borderColor: "oklch(var(--text) / 0.07)" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "oklch(var(--text) / 0.06)" }}>
                <p className="mc-label" style={{ color: "oklch(var(--text))" }}>{displayName}</p>
              </div>
              <DropdownItem icon={User} label="Profile" onClick={() => { setOpen(false); navigate('/profile'); }} />
              <div className="h-px mx-4" style={{ background: "oklch(var(--text) / 0.06)" }} />
              <DropdownItem icon={LogOut} label="Terminate" danger
                onClick={() => {
                  localStorage.removeItem('registry_token');
                  localStorage.removeItem('registry_user');
                  localStorage.removeItem('github_token');
                  navigate('/login');
                }} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

const DropdownItem = ({ icon: Icon, label, onClick, danger }) => (
  <button onClick={onClick}
    className="w-full flex items-center gap-3 px-5 py-3.5 transition-colors text-left hover:bg-[oklch(var(--text)/0.04)]"
    style={{ color: danger ? "oklch(var(--primary))" : "oklch(var(--text))" }}>
    {React.createElement(Icon, { className: "w-3.5 h-3.5 flex-shrink-0" })}
    <span className="mc-body text-[11px] font-bold uppercase tracking-widest">{label}</span>
  </button>
);

export default Header;
