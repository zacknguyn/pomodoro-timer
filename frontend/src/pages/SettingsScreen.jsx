import React, { useState, useEffect } from "react";
import { Github, Settings, Shield, CheckCircle } from "lucide-react";
import { settingsApi } from "@/lib/api";

const tabs = [
  { id: "github", label: "GitHub", icon: Github },
  { id: "focus", label: "Timer", icon: Settings },
];

const SettingsScreen = () => {
  const [activeTab, setActiveTab] = useState("github");

  return (
    <div className="space-y-10 max-w-3xl mx-auto pb-32 px-6 pt-8">
      <section className="space-y-6">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "oklch(var(--primary))" }} />
          <span className="mc-label">Configuration</span>
        </div>
        <h1 className="mc-display text-6xl lg:text-8xl leading-[0.9] tracking-tighter">Settings.</h1>
        <div className="flex gap-2 pt-2">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="px-6 py-2.5 rounded-full mc-body text-[11px] font-bold uppercase tracking-widest transition-all"
              style={activeTab === tab.id
                ? { background: "oklch(var(--text))", color: "oklch(var(--canvas))", boxShadow: "0 4px 12px oklch(var(--text) / 0.15)" }
                : { background: "oklch(var(--text) / 0.05)", color: "oklch(var(--text-muted))" }}>
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === "github" ? <GitHubSettings /> : <FocusSettings />}
      </div>
    </div>
  );
};

const GitHubSettings = () => {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    settingsApi.get().then(s => setConnected(!!s?.githubConnected)).catch(() => {});
  }, []);

  const handleConnect = () => {
    const token = localStorage.getItem('registry_token');
    const params = new URLSearchParams({
      client_id: 'Ov23liX2UIVhFWvirv5f',
      scope: 'repo read:org read:user',
      state: token || '',
    });
    window.location.href = `https://github.com/login/oauth/authorize?${params}`;
  };

  return (
    <div className="mc-card space-y-8 border" style={{ border: "1px solid oklch(var(--text) / 0.05)" }}>
      <div className="flex items-center gap-5">
        <div className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: "oklch(var(--primary) / 0.1)", color: "oklch(var(--primary))" }}>
          {React.createElement(Github, { className: "w-7 h-7" })}
        </div>
        <div className="space-y-0.5">
          <h3 className="mc-display text-2xl">GitHub</h3>
          <p className="mc-label" style={{ color: connected ? "oklch(var(--accent))" : "oklch(var(--text-muted))" }}>
            {connected ? "Connected" : "Not connected"}
          </p>
        </div>
        {connected && React.createElement(CheckCircle, { className: "w-5 h-5 ml-auto", style: { color: "oklch(var(--accent))" } })}
      </div>

      <p className="mc-body text-sm" style={{ color: "oklch(var(--text-muted))" }}>
        {connected
          ? "Your GitHub account is linked. Repos and commits are available in the Pomodoro screen."
          : "Connect your GitHub account to link commits with focus sessions."}
      </p>

      <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: "oklch(var(--text) / 0.05)" }}>
        <div className="flex items-center gap-2.5">
          {React.createElement(Shield, { className: "w-3.5 h-3.5", style: { color: "oklch(var(--primary))" } })}
          <span className="mc-label">Token stored securely on the server.</span>
        </div>
        <button onClick={handleConnect} className="mc-btn-primary px-8">
          {connected ? "Reconnect" : "Connect GitHub"}
        </button>
      </div>
    </div>
  );
};

const FocusSettings = () => {
  const [settings, setSettings] = useState(() => {
    const s = localStorage.getItem("kernel_settings");
    return s ? JSON.parse(s) : { pomodoro: 25, shortBreak: 5, longBreak: 15 };
  });
  const [saved, setSaved] = useState(false);

  const handleUpdate = (key, val) => setSettings(prev => ({ ...prev, [key]: parseInt(val) || 1 }));
  const commitChanges = () => {
    localStorage.setItem("kernel_settings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mc-card space-y-12 border" style={{ border: "1px solid oklch(var(--text) / 0.05)" }}>
      <div className="space-y-8">
        <div className="space-y-1">
          <h3 className="mc-display text-4xl">Durations.</h3>
          <p className="mc-label italic">Core Logic Parameters</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-2">
          <DurationItem label="Focus Cycle" value={settings.pomodoro} onChange={(v) => handleUpdate("pomodoro", v)} />
          <DurationItem label="Short Break" value={settings.shortBreak} onChange={(v) => handleUpdate("shortBreak", v)} />
          <DurationItem label="Long Break" value={settings.longBreak} onChange={(v) => handleUpdate("longBreak", v)} />
        </div>
      </div>

      <div className="space-y-6 pt-8 border-t" style={{ borderColor: "oklch(var(--text) / 0.05)" }}>
        <h3 className="mc-display text-3xl italic">Options.</h3>
        <div className="space-y-1">
          <DirectiveToggle title="Auto-start recovery periods" checked />
          <DirectiveToggle title="Auto-start focus sessions" />
          <DirectiveToggle title="Institutional lockdown mode" checked />
        </div>
      </div>

      <div className="flex justify-end items-center gap-8 pt-8 border-t" style={{ borderColor: "oklch(var(--text) / 0.05)" }}>
        <button className="mc-body text-[11px] font-bold uppercase tracking-widest transition-opacity hover:opacity-50"
          style={{ color: "oklch(var(--text-muted))" }}>
          Discard
        </button>
        <button onClick={commitChanges} className="mc-btn-primary shadow-lg">
          {saved ? "Saved ✓" : "Save changes"}
        </button>
      </div>
    </div>
  );
};

const DurationItem = ({ label, value, onChange }) => (
  <div className="space-y-3">
    <span className="mc-label">{label}</span>
    <div className="flex items-baseline gap-2 pb-3 border-b-2 focus-within:border-b-[oklch(var(--primary)/0.5)] transition-colors"
      style={{ borderColor: "oklch(var(--text) / 0.08)" }}>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent mc-display text-5xl w-full outline-none"
        style={{ color: "oklch(var(--text))" }}
      />
      <span className="mc-label">min</span>
    </div>
  </div>
);

const DirectiveToggle = ({ title, checked: init }) => {
  const [checked, setChecked] = useState(init);
  return (
    <button onClick={() => setChecked(!checked)}
      className="w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-colors hover:bg-[oklch(var(--text)/0.03)]">
      <span className="mc-body text-sm font-bold uppercase tracking-wide transition-colors"
        style={{ color: checked ? "oklch(var(--text))" : "oklch(var(--text-muted))" }}>
        {title}
      </span>
      <div className="w-12 h-6 rounded-full relative flex items-center px-1 border transition-all"
        style={checked
          ? { background: "oklch(var(--text))", borderColor: "oklch(var(--text))" }
          : { background: "transparent", borderColor: "oklch(var(--text) / 0.12)" }}>
        <div className="w-3.5 h-3.5 rounded-full transition-all"
          style={{
            transform: checked ? "translateX(1.25rem)" : "translateX(0)",
            background: checked ? "oklch(var(--canvas))" : "oklch(var(--text) / 0.15)"
          }} />
      </div>
    </button>
  );
};

export default SettingsScreen;
