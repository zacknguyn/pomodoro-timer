import React, { useState, useEffect } from "react";
import { Button } from "@/components/Button";
import { 
  Github, 
  Settings, 
  Bell, 
  Lock, 
  Monitor, 
  GitBranch, 
  Plus, 
  ExternalLink,
  Trash2,
  Check,
  Terminal,
  Cpu,
  Shield,
  Zap,
  HardDrive,
  ArrowRight,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

const SettingsScreen = () => {
  const [activeTab, setActiveTab] = useState("github");

  const tabs = [
    { id: "github", label: "Sync_Registry", icon: Github },
    { id: "focus", label: "Kernel_Logic", icon: Settings },
  ];

  return (
    <div className="space-y-32 max-w-4xl mx-auto pb-40">
      {/* Header */}
      <section className="space-y-10 border-b border-black/5 pb-12">
        <div className="flex items-center gap-2">
          <span className="w-1 h-1 bg-mc-orange rounded-full"></span>
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-mc-ink/40">Configuration_Protocol</span>
        </div>
        <h1 className="mc-display text-7xl text-mc-ink leading-none">Settings.</h1>
        <div className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-10 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border",
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
          <div className="space-y-2">
            <h3 className="text-xl mc-display font-bold uppercase tracking-tight">quang-dev</h3>
            <p className="text-[10px] font-bold text-mc-orange uppercase tracking-[0.2em]">OAUTH_2.0: Synchronized</p>
          </div>
        </div>
        <button className="px-8 py-3 rounded-full border border-black/10 text-xs font-bold uppercase tracking-widest hover:bg-mc-ink hover:text-white transition-all">
          Revoke Access
        </button>
      </div>

      <div className="space-y-10 pt-12 border-t border-black/5">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-bold text-mc-ink/40 uppercase tracking-[0.3em]">Tracked_Clusters</h4>
          <button className="text-[10px] font-bold text-mc-ink hover:text-mc-orange uppercase tracking-widest flex items-center gap-2">
            <Plus className="w-3 h-3" />
            Provision New
          </button>
        </div>

        <div className="grid grid-cols-1 gap-px bg-black/5 border border-black/5 rounded-[32px] overflow-hidden">
          <RepoRow name="pomodoro-timer" branch="main" active />
          <RepoRow name="mastercard-editorial" branch="develop" active />
          <RepoRow name="internal-cli" branch="master" active={false} />
        </div>
      </div>
    </div>

    <div className="mc-card bg-mc-ink text-white p-12 rounded-[40px] flex gap-8 items-start shadow-2xl">
      <GitBranch className="w-8 h-8 text-mc-orange shrink-0" />
      <div className="space-y-4">
        <h4 className="mc-display text-2xl italic tracking-tight">Injection_Logic: Auto-Commit</h4>
        <p className="mc-body text-sm text-white/50 leading-relaxed uppercase tracking-tighter max-w-xl">
          The registry will automatically intercept push signals and bind them to active focusing sessions.
        </p>
        <button className="text-[10px] font-bold text-mc-orange uppercase tracking-widest hover:underline flex items-center gap-2">
          View Protocol Specs <ArrowRight className="w-3 h-3" />
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
    // GSAP feedback could trigger here
  };

  return (
    <div className="mc-card bg-white p-12 space-y-16">
      <div className="space-y-10">
        <h3 className="mc-display text-3xl">Temporal_Params</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <DurationItem label="Focus_Cycle" value={settings.pomodoro} onChange={(v) => handleUpdate("pomodoro", v)} />
          <DurationItem label="Recovery_A" value={settings.shortBreak} onChange={(v) => handleUpdate("shortBreak", v)} />
          <DurationItem label="Recovery_B" value={settings.longBreak} onChange={(v) => handleUpdate("longBreak", v)} />
        </div>
      </div>

      <div className="space-y-10 pt-16 border-t border-black/5">
        <h3 className="mc-display text-3xl">Directives</h3>
        <div className="space-y-1">
          <DirectiveToggle title="AUTO_START_BREAKS" checked />
          <DirectiveToggle title="AUTO_START_FOCUS" />
          <DirectiveToggle title="KERNEL_LOCKDOWN" checked />
        </div>
      </div>

      <div className="flex justify-end gap-6 pt-12 border-t border-black/5">
         <button className="text-xs font-bold uppercase tracking-widest text-mc-ink/30 hover:text-mc-ink transition-colors">Discard_Buffer</button>
         <button 
           onClick={commitChanges}
           className="bg-mc-ink text-white px-10 py-3 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg hover:bg-mc-ink/90 transition-all"
         >
           Commit_Changes
         </button>
      </div>
    </div>
  );
};

const RepoRow = ({ name, branch, active }) => (
  <div className="bg-white p-8 flex items-center justify-between group hover:bg-mc-cream/30 transition-colors">
    <div className="flex items-center gap-6">
      <div className={cn(
        "w-2 h-2 rounded-full",
        active ? "bg-mc-orange shadow-[0_0_10px_var(--mc-orange)]" : "bg-black/10"
      )} />
      <div className="space-y-0.5">
        <p className="text-sm font-bold uppercase tracking-tight text-mc-ink">{name}</p>
        <p className="text-[10px] font-bold text-mc-ink/30 uppercase tracking-widest">{branch}</p>
      </div>
    </div>
    <ArrowRight className="w-5 h-5 text-mc-ink/10 group-hover:text-mc-ink transition-all" />
  </div>
);

const DurationItem = ({ label, value, onChange }) => (
  <div className="space-y-4">
    <p className="text-[10px] font-bold text-mc-ink/40 uppercase tracking-widest">{label}</p>
    <div className="flex items-baseline gap-2 border-b-2 border-black/5 pb-2 focus-within:border-mc-ink transition-colors">
      <input 
        type="number" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-5xl font-bold mc-display w-full outline-none" 
      />
      <span className="text-[10px] font-bold text-mc-ink/20">MIN</span>
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
      <span className={cn("text-xs font-bold uppercase tracking-[0.2em] transition-colors", checked ? "text-mc-ink" : "text-mc-ink/30")}>{title}</span>
      <div className={cn(
        "w-12 h-6 rounded-full border transition-all relative flex items-center px-1",
        checked ? "bg-mc-ink border-mc-ink" : "bg-white border-black/10"
      )}>
        <div className={cn("w-3.5 h-3.5 rounded-full transition-all", checked ? "translate-x-6 bg-mc-cream" : "translate-x-0 bg-black/10")} />
      </div>
    </button>
  );
};

export default SettingsScreen;
