import React, { useState } from "react";
import { Github, Settings, Plus, ArrowRight, Shield } from "lucide-react";

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
  const [token, setToken] = useState(() => localStorage.getItem("github_token") || "");
  const [isSaved, setIsSaved] = useState(false);

  const saveToken = () => {
    localStorage.setItem("github_token", token);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="mc-card space-y-8 border" style={{ border: "1px solid oklch(var(--text) / 0.05)" }}>
        <div className="space-y-2">
          <h3 className="mc-display text-3xl italic">Registry Access Token</h3>
          <p className="mc-body text-sm max-w-lg" style={{ color: "oklch(var(--text-muted))" }}>
            Provision a GitHub Personal Access Token to link contributions with focus sessions.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="password"
            placeholder="ghp_xxxxxxxxxxxx"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="mc-input flex-1"
            style={{ background: "oklch(var(--canvas))" }}
          />
          <button onClick={saveToken} className="mc-btn-primary px-8 h-[54px] whitespace-nowrap">
            {isSaved ? "Saved ✓" : "Save token"}
          </button>
        </div>
        <div className="flex items-center gap-2.5 pt-2 border-t" style={{ borderColor: "oklch(var(--text) / 0.05)" }}>
          {React.createElement(Shield, { className: "w-3.5 h-3.5", style: { color: "oklch(var(--primary))" } })}
          <span className="mc-label">Stored locally in your browser — never sent to our servers.</span>
        </div>
      </div>

      <div className="mc-card space-y-8 border" style={{ border: "1px solid oklch(var(--text) / 0.05)" }}>
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: "oklch(var(--primary) / 0.1)", color: "oklch(var(--primary))" }}>
            {React.createElement(Github, { className: "w-7 h-7" })}
          </div>
          <div className="space-y-0.5">
            <h3 className="mc-display text-2xl">Registry Status</h3>
            <p className="mc-label" style={{ color: "oklch(var(--primary))" }}>Live Synchronization Active</p>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t" style={{ borderColor: "oklch(var(--text) / 0.05)" }}>
          <div className="flex items-center justify-between">
            <span className="mc-label">Tracked Repositories</span>
            <button className="flex items-center gap-1.5 mc-label hover:opacity-70 transition-opacity"
              style={{ color: "oklch(var(--text))" }}>
              {React.createElement(Plus, { className: "w-3 h-3" })} Provision New
            </button>
          </div>
          <div className="rounded-[24px] overflow-hidden border" style={{ borderColor: "oklch(var(--text) / 0.05)" }}>
            <RepoRow name="pomogit-core" branch="main" active />
            <RepoRow name="editorial-dash" branch="develop" active />
            <RepoRow name="internal-specs" branch="master" active={false} />
          </div>
        </div>
      </div>
    </div>
  );
};

const FocusSettings = () => {
  const [settings, setSettings] = useState(() => {
    const s = localStorage.getItem("kernel_settings");
    return s ? JSON.parse(s) : { pomodoro: 25, shortBreak: 5, longBreak: 15 };
  });

  const handleUpdate = (key, val) => setSettings(prev => ({ ...prev, [key]: parseInt(val) || 1 }));
  const commitChanges = () => localStorage.setItem("kernel_settings", JSON.stringify(settings));

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
        <button onClick={commitChanges} className="mc-btn-primary shadow-lg">Save changes</button>
      </div>
    </div>
  );
};

const RepoRow = ({ name, branch, active }) => (
  <div className="px-6 py-4 flex items-center justify-between group transition-colors border-b last:border-0 hover:bg-[oklch(var(--text)/0.02)]"
    style={{ borderColor: "oklch(var(--text) / 0.05)" }}>
    <div className="flex items-center gap-4">
      <div className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: active ? "oklch(var(--primary))" : "oklch(var(--text) / 0.1)" }} />
      <div className="space-y-0.5">
        <p className="mc-body text-sm font-bold" style={{ color: "oklch(var(--text))" }}>{name}</p>
        <p className="mc-label">{branch}</p>
      </div>
    </div>
    {React.createElement(ArrowRight, { className: "w-4 h-4 transition-all group-hover:translate-x-0.5 group-hover:text-[oklch(var(--primary))]", style: { color: "oklch(var(--text) / 0.1)" } })}
  </div>
);

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
