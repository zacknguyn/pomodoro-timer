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
  ArrowRight
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
    if (containerRef.current) {
      gsap.fromTo(containerRef.current.querySelector(".param-box"), 
        { backgroundColor: "rgba(207, 69, 0, 0.2)" }, 
        { backgroundColor: "rgba(207, 69, 0, 0)", duration: 1 }
      );
    }
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
        gsap.to(stageRef.current, { backgroundColor: `${color}10`, duration: 1.5, ease: "sine.inOut" });
        gsap.to(stageRef.current.querySelector(".timer-text"), { color: color, duration: 0.8 });
      } else {
        gsap.to(stageRef.current, { backgroundColor: "rgba(255,255,255,1)", duration: 0.5 });
        gsap.to(stageRef.current.querySelector(".timer-text"), { color: "#141413", duration: 0.5 });
      }
    }
    
    // Initial entrance
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
      {/* Engine Core (Timer) */}
      <div className="lg:col-span-8 space-y-8 stagger-item mc-stagger-item">
         <section 
           ref={stageRef}
           className="mc-card bg-white p-12 flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-700"
         >
            <div className="absolute top-0 left-0 w-full h-full bg-mc-orange/[0.01] pointer-events-none" />
            
            <div className="flex gap-4 p-1 bg-black/5 rounded-full mb-12 relative z-10">
              <span className={cn(
                "px-8 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm",
                mode === "pomodoro" ? "bg-mc-emerald text-white" : "bg-mc-orange text-white"
              )}>
                {mode === "pomodoro" ? "Focus_Cycle" : mode === "shortBreak" ? "Recovery_A" : "Recovery_B"}
              </span>
            </div>

            <div className="timer-text mc-display text-[10rem] sm:text-[12rem] font-bold text-mc-ink leading-none -tracking-[0.05em] mb-4 relative z-10">
               {formatTime(timeLeft)}
            </div>
            
            <div className="flex items-center gap-3 mb-8 relative z-10">
              <span className={cn(
                "w-2 h-2 rounded-full",
                isActive 
                  ? mode === 'pomodoro' ? "bg-mc-emerald animate-pulse shadow-[0_0_10px_var(--color-mc-emerald)]" : "bg-mc-orange animate-pulse shadow-[0_0_10px_var(--color-mc-orange)]"
                  : "bg-black/20"
              )} />
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-mc-ink/40">
                {isActive ? "Engine_Executing" : "System_Standby"}
              </span>
            </div>

            <div className="flex gap-2 mb-12 relative z-10">
              {[0, 1, 2, 3].map((i) => (
                <div 
                  key={i}
                  className={cn(
                    "w-12 h-1 rounded-full transition-all duration-500",
                    i < sessionInSet ? "bg-mc-ink" : i === sessionInSet && mode === "pomodoro" ? "bg-mc-ink/20 animate-pulse" : "bg-black/5"
                  )}
                />
              ))}
            </div>

            <button 
              onClick={toggleTimer}
              aria-label={isActive ? "Pause timer" : "Start timer"}
              className={cn(
                "w-24 h-24 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all relative z-10 group/btn",
                mode === "pomodoro" ? "bg-mc-emerald" : "bg-mc-orange"
              )}
            >
              {isActive ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current translate-x-1" />}
            </button>

            <div className="absolute bottom-10 right-10 flex gap-4">
              <button 
                onClick={resetTimer} 
                aria-label="Reset timer"
                className="p-3 rounded-full hover:bg-mc-cream text-mc-ink/20 hover:text-mc-ink transition-all active:rotate-180 focus-visible:ring-2 focus-visible:ring-mc-orange outline-none"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button 
                onClick={skipTimer} 
                aria-label="Skip current session"
                className="p-3 rounded-full hover:bg-mc-cream text-mc-ink/20 hover:text-mc-ink transition-all active:translate-x-2 focus-visible:ring-2 focus-visible:ring-mc-orange outline-none"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>
         </section>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="mc-card bg-white p-8 space-y-6 mc-hover-lift">
               <h4 className="text-[10px] font-bold uppercase tracking-widest text-mc-ink/30 flex items-center gap-2">
                <Github className="w-3 h-3 text-mc-emerald" /> Registry_Context
               </h4>
               <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-mc-ink">{selectedRepo.name}</span>
                    <span className="text-[10px] font-bold text-mc-emerald">{selectedRepo.branch.toUpperCase()}</span>
                  </div>
                  <div className="p-4 bg-mc-cream/50 rounded-2xl border border-black/5">
                    <p className="text-[10px] font-mono text-mc-ink/50 leading-relaxed italic">
                      {">"} {selectedRepo.lastCommit}
                    </p>
                  </div>
               </div>
            </div>
            <div className="mc-card bg-white p-8 space-y-6 mc-hover-lift">
               <h4 className="text-[10px] font-bold uppercase tracking-widest text-mc-ink/30 flex items-center gap-2">
                <History className="w-3 h-3" /> Session_Registry
               </h4>
               <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center justify-between border-b border-black/5 pb-2 last:border-0 hover:translate-x-1 transition-transform">
                      <span className="text-[10px] font-bold text-mc-ink/60 italic">SESS_{sessionsCompleted - i + 1}</span>
                      <span className="text-[10px] font-mono text-mc-emerald font-bold">SUCCESS</span>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>

      {/* Control Side Rail */}
      <div className="lg:col-span-4 space-y-8 stagger-item mc-stagger-item">
        <section className="mc-card bg-mc-ink text-white p-10 space-y-10 relative overflow-hidden param-box">
           <div className="absolute top-0 right-0 w-32 h-32 bg-mc-orange/10 rounded-full translate-x-12 -translate-y-12" />
           <div className="space-y-2 relative z-10">
             <h3 className="mc-display text-3xl">Parameters.</h3>
             <p className="text-xs text-white/40 uppercase tracking-widest font-bold italic text-mc-orange">Cycle_Configuration</p>
           </div>
           
           <div className="space-y-10 relative z-10 pt-4 border-t border-white/10">
              <ParameterInput label="Focus_Cycle" value={settings.pomodoro} onChange={(v) => handleSettingChange("pomodoro", v)} />
              <ParameterInput label="Recovery_A" value={settings.shortBreak} onChange={(v) => handleSettingChange("shortBreak", v)} />
              <ParameterInput label="Recovery_B" value={settings.longBreak} onChange={(v) => handleSettingChange("longBreak", v)} />
           </div>

           <button 
             onClick={saveSettings}
             className="w-full bg-mc-orange text-white py-4 rounded-full text-xs font-bold uppercase tracking-widest shadow-xl hover:bg-mc-orange/90 active:scale-95 transition-all"
           >
             Initialize Custom Kernel
           </button>
        </section>

        <section className="p-8 border border-black/5 rounded-[40px] bg-white space-y-6 mc-hover-lift">
           <div className="flex items-center gap-2 text-mc-ink/30">
              <Info className="w-4 h-4 text-mc-emerald" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Analytics_Delta</span>
           </div>
           <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <span className="text-[10px] font-bold text-mc-ink/40">SESSIONS_TOTAL</span>
                 <span className="mc-display text-xl font-bold">{sessionsCompleted}</span>
              </div>
              <div className="flex justify-between items-center">
                 <span className="text-[10px] font-bold text-mc-ink/40">INTEGRITY_SCORE</span>
                 <span className="mc-display text-xl font-bold text-mc-emerald">98.2%</span>
              </div>
           </div>
        </section>
      </div>
    </div>
  );
};

const ParameterInput = ({ label, value, onChange }) => (
  <div className="space-y-3 group/param">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 group-focus-within/param:text-mc-orange transition-colors">{label}</span>
      <span className="text-[10px] font-bold text-mc-orange opacity-0 group-focus-within/param:opacity-100 transition-opacity">EDITING</span>
    </div>
    <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/10 focus-within:border-mc-orange focus-within:bg-white/10 transition-all">
      <Clock className="w-4 h-4 text-white/20" />
      <input 
        type="number" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-xl font-bold mc-display text-white w-full outline-none" 
      />
    </div>
  </div>
);

export default PomodoroScreen;
