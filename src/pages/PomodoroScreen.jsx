import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  Github, 
  History,
  Info,
  Clock,
  ArrowRight,
  Target,
  Settings as SettingsIcon,
  Users
} from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

const PomodoroScreen = () => {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("kernel_settings");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
    return { pomodoro: 25, shortBreak: 5, longBreak: 15 };
  });

  const [mode, setMode] = useState("pomodoro");
  const [timeLeft, setTimeLeft] = useState(settings.pomodoro * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0); 
  const [sessionInSet, setSessionInSet] = useState(0); 
  const [focusIntent, setFocusIntent] = useState("Platform density overhaul and editorial dashboard revamp");
  const [selectedRepo] = useState({ name: "pomodoro-timer", branch: "main", lastCommit: "feat: platform density overhaul" });

  useEffect(() => {
    if (!isActive) {
      const duration = settings[mode] || 25;
      setTimeLeft(duration * 60);
    }
  }, [mode, settings, isActive]);

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      handleTimerComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleTimerComplete = useCallback(() => {
    if (mode === "pomodoro") {
      const newCount = sessionsCompleted + 1;
      const nextInSet = (sessionInSet + 1) % 4;
      setSessionsCompleted(newCount);
      setSessionInSet(nextInSet);
      setMode(nextInSet === 0 ? "longBreak" : "shortBreak");
    } else {
      setMode("pomodoro");
    }
  }, [mode, sessionsCompleted, sessionInSet]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft((settings[mode] || 25) * 60);
  };
  const skipTimer = () => {
    setIsActive(false);
    handleTimerComplete();
  };

  const saveSettings = () => {
    localStorage.setItem("kernel_settings", JSON.stringify(settings));
    resetTimer();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSettingChange = (key, value) => {
    const val = parseInt(value) || 1;
    setSettings(prev => ({ ...prev, [key]: val }));
  };

  useGSAP(() => {
    const color = mode === "pomodoro" ? "#00A650" : "#CF4500";
    if (stageRef.current) {
      if (isActive) {
        gsap.to(stageRef.current, { backgroundColor: "#F3F0EE", duration: 1.5, ease: "sine.inOut" });
        gsap.to(stageRef.current.querySelector(".timer-text"), { color: color, duration: 0.8 });
      } else {
        gsap.to(stageRef.current, { backgroundColor: "#FFFFFF", duration: 0.5 });
        gsap.to(stageRef.current.querySelector(".timer-text"), { color: "#141413", duration: 0.5 });
      }
    }
    
    gsap.to(containerRef.current.querySelectorAll(".stagger-item"), { 
      opacity: 1, 
      y: 0, 
      stagger: 0.1,
      ease: "power3.out",
      duration: 0.8
    });
  }, { scope: containerRef, dependencies: [isActive, mode] });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-visible" ref={containerRef}>
      {/* 1. Workboard (The Focus Core) */}
      <div className="lg:col-span-8 space-y-8 stagger-item mc-stagger-item">
         <section 
           ref={stageRef}
           className="mc-card bg-white p-12 sm:p-20 flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-700"
         >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-mc-orange/20 to-transparent" />
            
            <div className="w-full max-w-xl text-center space-y-4 mb-16 relative z-10">
               <div className="flex items-center justify-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-mc-orange" />
                  <span className="mc-body text-[10px] font-bold uppercase tracking-[0.2em] text-mc-ink/30">Primary Objective</span>
               </div>
               <input 
                 type="text"
                 value={focusIntent}
                 onChange={(e) => setFocusIntent(e.target.value)}
                 placeholder="What are you focusing on?"
                 className="w-full bg-transparent mc-display text-2xl sm:text-3xl text-center text-mc-ink outline-none border-b border-transparent focus:border-mc-orange/20 pb-2 transition-all"
               />
            </div>

            <div className="flex gap-4 p-1 bg-black/5 rounded-full mb-12 relative z-10">
              <span className={cn(
                "px-8 py-2 rounded-full mc-body text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm",
                mode === "pomodoro" ? "bg-mc-emerald text-white" : "bg-mc-orange text-white"
              )}>
                {mode === "pomodoro" ? "Focus Session" : "Recovery Phase"}
              </span>
            </div>

            <div className="timer-text mc-display text-[10rem] sm:text-[14rem] text-mc-ink leading-none -tracking-[0.05em] mb-8 relative z-10">
               {formatTime(timeLeft)}
            </div>
            
            <div className="flex items-center gap-3 mb-12 relative z-10">
              <span className={cn(
                "w-1.5 h-1.5 rounded-full",
                isActive 
                  ? mode === 'pomodoro' ? "bg-mc-emerald animate-pulse" : "bg-mc-orange animate-pulse"
                  : "bg-black/10"
              )} />
              <span className="mc-body text-[10px] font-bold uppercase tracking-[0.3em] text-mc-ink/40">
                {isActive ? "Engine Active" : "System Standby"}
              </span>
            </div>

            <div className="flex items-center gap-8 relative z-10">
              <button 
                onClick={resetTimer} 
                aria-label="Reset timer"
                className="p-4 rounded-full hover:bg-mc-cream text-mc-ink/20 hover:text-mc-ink transition-all active:rotate-180"
              >
                <RotateCcw className="w-6 h-6" />
              </button>

              <button 
                onClick={toggleTimer}
                aria-label={isActive ? "Pause timer" : "Start timer"}
                className={cn(
                  "w-28 h-28 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all group/btn",
                  mode === "pomodoro" ? "bg-mc-emerald" : "bg-mc-orange"
                )}
              >
                {isActive ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current translate-x-1" />}
              </button>

              <button 
                onClick={skipTimer} 
                aria-label="Skip current session"
                className="p-4 rounded-full hover:bg-mc-cream text-mc-ink/20 hover:text-mc-ink transition-all active:translate-x-2"
              >
                <SkipForward className="w-6 h-6" />
              </button>
            </div>

            <div className="flex gap-2 mt-16 relative z-10">
              {[0, 1, 2, 3].map((i) => (
                <div 
                  key={i}
                  className={cn(
                    "w-16 h-1 rounded-full transition-all duration-500",
                    i < sessionInSet ? "bg-mc-ink" : i === sessionInSet && mode === "pomodoro" ? "bg-mc-ink/20 animate-pulse" : "bg-black/5"
                  )}
                />
              ))}
            </div>
         </section>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="mc-card bg-mc-ink text-white p-8 space-y-6 mc-hover-lift relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-mc-orange/10 rounded-full translate-x-12 -translate-y-12" />
               <h4 className="mc-body text-[10px] font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                <Github className="w-3 h-3 text-mc-orange" /> GitHub Context
               </h4>
               <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-center">
                    <span className="mc-body text-xs font-bold text-white">{selectedRepo.name}</span>
                    <span className="mc-body text-[10px] font-bold text-mc-orange">{selectedRepo.branch.toUpperCase()}</span>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-mono text-white/40 leading-relaxed italic">
                      {">"} {selectedRepo.lastCommit}
                    </p>
                  </div>
               </div>
            </div>
            <div className="mc-card bg-white p-8 space-y-6 mc-hover-lift">
               <h4 className="mc-body text-[10px] font-bold uppercase tracking-widest text-mc-ink/30 flex items-center gap-2">
                <History className="w-3 h-3" /> Session History
               </h4>
               <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center justify-between border-b border-black/5 pb-2 last:border-0 hover:translate-x-1 transition-transform">
                      <span className="mc-body text-[10px] font-bold text-mc-ink/60 italic">SESS_{sessionsCompleted - i + 1}</span>
                      <span className="mc-body text-[10px] font-mono text-mc-emerald font-bold">SUCCESS</span>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>

      {/* 2. Side Rail (System Config & Team) */}
      <div className="lg:col-span-4 space-y-8 stagger-item mc-stagger-item">
        <section className="mc-card bg-white p-10 space-y-10 relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
           <div className="space-y-2">
             <div className="flex items-center gap-2 text-mc-ink/30">
                <SettingsIcon className="w-4 h-4" />
                <h3 className="mc-display text-2xl">Configuration</h3>
             </div>
             <p className="mc-body text-xs text-mc-ink/40 uppercase tracking-widest font-bold italic">Session Parameters</p>
           </div>
           
           <div className="space-y-10 pt-4 border-t border-black/5">
              <ParameterInput label="Focus Session" value={settings.pomodoro} onChange={(v) => handleSettingChange("pomodoro", v)} />
              <ParameterInput label="Short Break" value={settings.shortBreak} onChange={(v) => handleSettingChange("shortBreak", v)} />
              <ParameterInput label="Long Break" value={settings.longBreak} onChange={(v) => handleSettingChange("longBreak", v)} />
           </div>

           <button 
             onClick={saveSettings}
             className="mc-pill w-full bg-mc-ink text-mc-cream hover:bg-mc-ink/90 shadow-xl active:scale-95 transition-all text-sm font-bold"
           >
             Save Parameters
           </button>
        </section>

        <section className="p-8 border border-black/5 rounded-[40px] bg-white space-y-8 mc-hover-lift">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-mc-ink/30">
                 <Users className="w-4 h-4" />
                 <span className="mc-body text-[10px] font-bold uppercase tracking-widest">In Orbit</span>
              </div>
              <span className="mc-body text-[10px] font-bold text-mc-emerald">3 ACTIVE</span>
           </div>
           <div className="flex -space-x-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="mc-orbit w-10 h-10 border-2 border-white shadow-sm">
                   <img src={`https://i.pravatar.cc/100?u=${i}`} alt="Teammate" />
                </div>
              ))}
              <div className="w-10 h-10 rounded-full bg-mc-cream border-2 border-white flex items-center justify-center mc-body text-[10px] font-bold text-mc-ink/40">
                +4
              </div>
           </div>
           <div className="space-y-4 pt-4 border-t border-black/5">
              <div className="flex justify-between items-center">
                 <span className="mc-body text-[10px] font-bold text-mc-ink/40 uppercase">Total Sessions</span>
                 <span className="mc-display text-xl">{sessionsCompleted}</span>
              </div>
              <div className="flex justify-between items-center">
                 <span className="mc-body text-[10px] font-bold text-mc-ink/40 uppercase">Cluster Score</span>
                 <span className="mc-display text-xl text-mc-emerald">98.2%</span>
              </div>
           </div>
        </section>

        <section className="p-8 bg-mc-orange text-white rounded-[40px] space-y-4">
            <div className="flex items-center gap-2 text-white/60">
               <Info className="w-4 h-4" />
               <span className="mc-body text-[10px] font-bold uppercase tracking-widest">Pro Tip</span>
            </div>
            <p className="mc-body text-xs font-medium leading-relaxed">
              Long breaks occur every 4 focus sessions. Sync your registry often to track team progress.
            </p>
        </section>
      </div>
    </div>
  );
};

const ParameterInput = ({ label, value, onChange }) => (
  <div className="space-y-3 group/param">
    <div className="flex items-center justify-between">
      <span className="mc-body text-[10px] font-bold uppercase tracking-widest text-mc-ink/40 group-focus-within/param:text-mc-orange transition-colors">{label}</span>
      <span className="mc-body text-[10px] font-bold text-mc-orange opacity-0 group-focus-within/param:opacity-100 transition-opacity">EDITING</span>
    </div>
    <div className="flex items-center gap-4 bg-black/5 p-3 rounded-2xl border border-transparent focus-within:border-mc-orange/20 focus-within:bg-white transition-all shadow-inner">
      <Clock className="w-4 h-4 text-mc-ink/20" />
      <input 
        type="number" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-xl mc-display text-mc-ink w-full outline-none" 
      />
      <span className="mc-body text-[10px] font-bold text-mc-ink/20 uppercase tracking-tighter">min</span>
    </div>
  </div>
);

export default PomodoroScreen;
