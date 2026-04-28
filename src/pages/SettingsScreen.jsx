import React, { useState, useEffect } from "react";
import { 
  Github, 
  Settings, 
  Plus, 
  ArrowRight,
  GitBranch,
  Clock,
  Shield,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

const SettingsScreen = () => {
  const [activeTab, setActiveTab] = useState("github");

  const tabs = [
    { id: "github", label: "Registry Sync", icon: Github },
    { id: "focus", label: "Focus Engine", icon: Settings },
  ];

  return (
    <div className="space-y-24 max-w-4xl mx-auto pb-40">
      {/* Header */}
      <section className="space-y-10 border-b border-black/5 pb-12">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 bg-mc-orange rounded-full animate-pulse"></span>
          <span className="mc-body text-[10px] font-bold uppercase tracking-[0.3em] text-mc-ink/40">System Configuration</span>
        </div>
        <h1 className="mc-display text-7xl text-mc-ink leading-none -tracking-[0.03em]">Settings.</h1>
        <div className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-10 py-3 rounded-full mc-body text-[10px] font-bold uppercase tracking-widest transition-all border",
                activeTab === tab.id 
                  ? "bg-mc-ink text-white border-mc-ink shadow-lg" 
                  : "text-mc-ink/40 border-black/5 hover:text-mc-ink bg-white/50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* Content */}
      <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
        {activeTab === "github" && <GitHubSettings />}
        {activeTab === "focus" && <FocusSettings />}
      </div>
    </div>
  );
};

const GitHubSettings = () => (
  <div className="space-y-20">
    <div className="mc-card bg-white p-12 space-y-12 relative overflow-hidden">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-10">
        <div className="flex items-center gap-8">
          <div className="w-20 h-20 rounded-full bg-mc-ink flex items-center justify-center text-white shadow-xl relative overflow-hidden">
             <div className="absolute inset-0 bg-mc-orange/10 pointer-events-none" />
             <Github className="w-10 h-10 relative z-10" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl mc-display font-medium text-mc-ink">quang-dev</h3>
            <p className="mc-body text-[10px] font-bold text-mc-orange uppercase tracking-[0.2em]">Registry Synchronized</p>
          </div>
        </div>
        <button className="mc-pill px-8 py-3 border border-black/10 mc-body text-[10px] font-bold uppercase tracking-widest hover:bg-mc-ink hover:text-white transition-all">
          Revoke Access
        </button>
      </div>

      <div className="space-y-8 pt-12 border-t border-black/5">
        <div className="flex items-center justify-between">
          <h4 className="mc-body text-[10px] font-bold text-mc-ink/40 uppercase tracking-[0.3em]">Tracked Repositories</h4>
          <button className="mc-body text-[10px] font-bold text-mc-ink hover:text-mc-orange uppercase tracking-widest flex items-center gap-2">
            <Plus className="w-3 h-3" />
            Provision New
          </button>
        </div>

        <div className="grid grid-cols-1 border border-black/5 rounded-[32px] overflow-hidden shadow-sm">
          <RepoRow name="pomodoro-timer" branch="main" active />
          <RepoRow name="mastercard-editorial" branch="develop" active />
          <RepoRow name="internal-cli" branch="master" active={false} />
        </div>
      </div>
    </div>

    <div className="mc-card bg-mc-ink text-white p-12 rounded-[40px] flex gap-8 items-start shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-mc-orange/10 rounded-full translate-x-32 -translate-y-32 blur-3xl" />
      <GitBranch className="w-8 h-8 text-mc-orange shrink-0 relative z-10" />
      <div className="space-y-4 relative z-10">
        <h4 className="mc-display text-3xl font-medium tracking-tight">Injection Logic: Auto-Commit</h4>
        <p className="mc-body text-base text-white/50 leading-relaxed max-w-xl">
          The registry will automatically intercept push signals and bind them to active focusing sessions for institutional recording.
        </p>
        <button className="mc-body text-[10px] font-bold text-mc-orange uppercase tracking-widest hover:underline flex items-center gap-2 transition-all group">
          View Protocol Specs <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  </div>
);

const FocusSettings = () => {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("kernel_settings");
    return saved ? JSON.parse(saved) : {
      pomodoro: 25,
      shortBreak: 5,
      longBreak: 15,
    };
  });

  const handleUpdate = (key, val) => {
    setSettings(prev => ({ ...prev, [key]: parseInt(val) || 1 }));
  };

  const commitChanges = () => {
    localStorage.setItem("kernel_settings", JSON.stringify(settings));
  };

  return (
    <div className="mc-card bg-white p-12 space-y-16">
      <div className="space-y-10">
        <div className="space-y-1">
           <h3 className="mc-display text-4xl">Session Durations</h3>
           <p className="mc-body text-xs text-mc-ink/40 uppercase tracking-widest font-bold italic">Kernel Logic Configuration</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-6">
          <DurationItem label="Focus Cycle" value={settings.pomodoro} onChange={(v) => handleUpdate("pomodoro", v)} />
          <DurationItem label="Short Break" value={settings.shortBreak} onChange={(v) => handleUpdate("shortBreak", v)} />
          <DurationItem label="Long Break" value={settings.longBreak} onChange={(v) => handleUpdate("longBreak", v)} />
        </div>
      </div>

      <div className="space-y-10 pt-16 border-t border-black/5">
        <h3 className="mc-display text-3xl">Directives</h3>
        <div className="space-y-1">
          <DirectiveToggle title="Auto-start recovery periods" checked />
          <DirectiveToggle title="Auto-start focus sessions" />
          <DirectiveToggle title="Kernel level lockdown" checked />
        </div>
      </div>

      <div className="flex justify-end items-center gap-10 pt-12 border-t border-black/5">
         <button className="mc-body text-[10px] font-bold uppercase tracking-widest text-mc-ink/30 hover:text-mc-ink transition-colors">Discard Buffer</button>
         <button 
           onClick={commitChanges}
           className="mc-pill bg-mc-ink text-white shadow-xl hover:bg-mc-ink/90 transition-all text-sm font-bold"
         >
           Save Changes
         </button>
      </div>
    </div>
  );
};

const RepoRow = ({ name, branch, active }) => (
  <div className="bg-white p-8 flex items-center justify-between group hover:bg-mc-cream/30 transition-colors border-b border-black/5 last:border-0">
    <div className="flex items-center gap-6">
      <div className={cn(
        "w-1.5 h-1.5 rounded-full",
        active ? "bg-mc-orange shadow-[0_0_8px_var(--mc-orange)]" : "bg-black/10"
      )} />
      <div className="space-y-0.5">
        <p className="mc-body text-sm font-bold uppercase tracking-tight text-mc-ink">{name}</p>
        <p className="mc-body text-[10px] font-bold text-mc-ink/30 uppercase tracking-widest">{branch}</p>
      </div>
    </div>
    <ArrowRight className="w-5 h-5 text-mc-ink/10 group-hover:text-mc-ink group-hover:translate-x-1 transition-all" />
  </div>
);

const DurationItem = ({ label, value, onChange }) => (
  <div className="space-y-4">
    <p className="mc-body text-[10px] font-bold text-mc-ink/40 uppercase tracking-widest">{label}</p>
    <div className="flex items-baseline gap-2 border-b-2 border-black/5 pb-2 focus-within:border-mc-ink transition-colors">
      <input 
        type="number" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-5xl font-medium mc-display w-full outline-none text-mc-ink" 
      />
      <span className="mc-body text-[10px] font-bold text-mc-ink/20 uppercase">min</span>
    </div>
  </div>
);

const DirectiveToggle = ({ title, checked: initialChecked }) => {
  const [checked, setChecked] = useState(initialChecked);
  return (
    <button 
      onClick={() => setChecked(!checked)}
      className="w-full flex items-center justify-between p-8 hover:bg-mc-cream/30 transition-all group border-b border-black/5 last:border-0"
    >
      <span className={cn("mc-body text-xs font-bold uppercase tracking-[0.2em] transition-colors", checked ? "text-mc-ink" : "text-mc-ink/30")}>{title}</span>
      <div className={cn(
        "w-12 h-6 rounded-full border transition-all relative flex items-center px-1",
        checked ? "bg-mc-ink border-mc-ink" : "bg-white border-black/10"
      )}>
        <div className={cn("w-3.5 h-3.5 rounded-full transition-all", checked ? "translate-x-6 bg-mc-cream" : "translate-x-0 bg-black/10 shadow-sm")} />
      </div>
    </button>
  );
};

export default SettingsScreen;
