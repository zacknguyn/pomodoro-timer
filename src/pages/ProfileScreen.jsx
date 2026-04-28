import React, { useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { 
  MapPin, Mail, Github, Award, Clock, Activity, Zap, Target, Trophy, Timer, X 
} from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const ProfileScreen = () => {
  const badges = ["Deep Work", "Registry Core", "Efficiency Pro", "Early Bird"];
  const [trendMode, setTrendMode] = useState("github");
  const [hoveredCell, setHoveredCell] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const containerRef = useRef(null);
  
  const githubData = useMemo(() => Array.from({ length: 364 }, () => Math.floor(Math.random() * 5)), []);
  const pomogitData = useMemo(() => Array.from({ length: 364 }, () => Math.floor(Math.random() * 4)), []);
  const currentData = trendMode === "github" ? githubData : pomogitData;

  useGSAP(() => {
    gsap.fromTo(".stagger-item", 
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, stagger: 0.1, duration: 0.8, ease: "power3.out" }
    );
  }, { scope: containerRef });

  const handleMouseMove = (e, val, index) => {
    const startDate = new Date(new Date().getFullYear(), 0, 1);
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    
    setHoveredCell({
      val,
      date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleCellClick = (val, index) => {
    console.log("Cell clicked:", val, index);
    const startDate = new Date(new Date().getFullYear(), 0, 1);
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    setSelectedEntry({
      val,
      date: date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }),
    });
  };

  return (
    <div className="space-y-24 pb-20 relative" ref={containerRef}>
      <div className="absolute top-0 left-0 w-full overflow-hidden pointer-events-none z-0">
         <h1 className="mc-display text-[15rem] leading-[0.8] text-[var(--color-mc-ghost-cream)] font-bold tracking-tighter whitespace-nowrap">PROFILE_DOSSIER</h1>
      </div>

      {/* Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10 pt-20 stagger-item">
        <div className="relative group w-fit">
           <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-white shadow-2xl">
             <img src="https://github.com/shadcn.png" alt="Quang Dev" className="w-full h-full object-cover" />
             <div className="absolute inset-0 bg-mc-ink/10" />
           </div>
           <div className="mc-satellite !w-12 !h-12 bg-mc-emerald text-white shadow-lg border-4 border-white translate-x-2 translate-y-2">
             <Zap className="w-5 h-5 fill-current" />
           </div>
        </div>
        
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="mc-display text-6xl text-mc-ink font-medium">Quang Dev</h1>
            <p className="mc-body text-mc-ink/40 font-bold uppercase tracking-widest text-xs">Commander Node • Cluster_Alpha</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
             {badges.map((badge, i) => (
                <span key={i} className="px-4 py-2 bg-mc-ink text-white rounded-full mc-body text-[10px] font-bold uppercase tracking-widest shadow-md cursor-pointer hover:bg-mc-orange hover:scale-105 transition-all">
                  {badge}
                </span>
             ))}
          </div>

          <div className="flex items-center gap-8 pt-4">
             <a href="#" className="flex items-center gap-3 mc-body text-sm font-bold text-mc-ink hover:text-mc-orange transition-colors">
                <Mail className="w-4 h-4" /> quang@registry.org
             </a>
             <a href="#" className="flex items-center gap-3 mc-body text-sm font-bold text-mc-ink hover:text-mc-orange transition-colors">
                <Github className="w-4 h-4" /> github.com/quang-dev
             </a>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
        <StatCard label="Total Focus" value="124h" icon={Clock} color="text-mc-emerald" className="stagger-item" />
        <StatCard label="Efficiency" value="98.2%" icon={Activity} color="text-mc-orange" className="stagger-item" />
        <StatCard label="Registry Awards" value="12" icon={Award} color="text-mc-ink" className="stagger-item" />
        <StatCard label="Sprint Rank" value="01" icon={Trophy} color="text-mc-orange" className="stagger-item" />
      </section>

      <div className="relative w-full h-px pointer-events-none">
          <div className="absolute w-[80%] h-32 border-b-2 border-mc-orange/20 rounded-full left-10 -top-16 opacity-30" />
      </div>

      {/* Activity Heatmap */}
      <section className="mc-card bg-white p-12 space-y-10 relative z-10 stagger-item">
        <div className="flex items-center justify-between">
           <div className="space-y-2">
             <h3 className="mc-display text-3xl font-medium">Activity Heatmap</h3>
             <p className="mc-body text-[10px] font-bold uppercase tracking-widest italic text-mc-ink/40">
               <kbd className="text-[9px] px-1.5 py-0.5 font-sans border-b border-black/20 rounded-sm bg-black/5 mx-1">Click</kbd> cells to view registry details
             </p>
           </div>
           <div className="flex bg-mc-cream rounded-full p-1 border border-black/5">
              <button 
                onClick={() => setTrendMode("github")}
                className={cn("px-6 py-2 rounded-full mc-body text-[10px] font-bold uppercase tracking-widest transition-all", trendMode === "github" ? "bg-white text-mc-emerald shadow-sm" : "text-mc-ink/30")}
              >GitHub</button>
              <button 
                onClick={() => setTrendMode("pomogit")}
                className={cn("px-6 py-2 rounded-full mc-body text-[10px] font-bold uppercase tracking-widest transition-all", trendMode === "pomogit" ? "bg-white text-mc-orange shadow-sm" : "text-mc-ink/30")}
              >Pomogit</button>
           </div>
        </div>
        
        <div className="grid grid-cols-[repeat(52,minmax(0,1fr))] gap-1 relative">
          {currentData.map((val, i) => (
             <div 
               key={i} 
               onMouseMove={(e) => handleMouseMove(e, val, i)}
               onMouseLeave={() => setHoveredCell(null)}
               onClick={() => handleCellClick(val, i)}
               className={cn(
                 "aspect-square rounded-sm transition-colors cursor-pointer relative z-20",
                 val === 0 ? "bg-mc-cream" : 
                 val === 1 ? (trendMode === 'github' ? "bg-mc-emerald/30" : "bg-mc-orange/30") :
                 val === 2 ? (trendMode === 'github' ? "bg-mc-emerald/60" : "bg-mc-orange/60") :
                 (trendMode === 'github' ? "bg-mc-emerald" : "bg-mc-orange")
               )}
             />
          ))}

          {/* Tooltip */}
          {hoveredCell && (
            <div 
              className="absolute p-4 bg-mc-ink text-white rounded-lg shadow-xl z-[9999] pointer-events-none space-y-1 transition-opacity duration-100 ease-out"
              style={{ left: `${hoveredCell.x}px`, top: `${hoveredCell.y - 70}px`, transform: 'translateX(-50%)' }}
            >
              <p className="mc-body text-[10px] font-bold uppercase tracking-widest text-white/50">{hoveredCell.date}</p>
              <p className="mc-display text-base font-medium">
                {hoveredCell.val} {trendMode === 'github' ? 'Commits' : 'Sessions'}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Side Drawer */}
      {createPortal(
        <AnimatePresence>
          {selectedEntry && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 z-40" 
                onClick={() => setSelectedEntry(null)} 
              />
              <motion.div 
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed top-0 right-0 h-screen w-full max-w-lg bg-white border-l border-black/5 shadow-2xl z-50 p-12 space-y-10 overflow-y-auto"
              >
               <div className="flex items-center justify-between border-b border-black/5 pb-8">
                  <div className="space-y-1">
                     <p className="mc-body text-[10px] font-bold uppercase tracking-widest text-mc-ink/30">Registry Entry</p>
                     <h3 className="mc-display text-3xl font-medium">{selectedEntry.date}</h3>
                  </div>
                  <button onClick={() => setSelectedEntry(null)} className="p-2 hover:bg-mc-cream rounded-full transition-colors"><X className="w-5 h-5 text-mc-ink" /></button>
               </div>
               
               <div className="space-y-6">
                  <p className="mc-body text-[10px] font-bold uppercase tracking-widest text-mc-ink/30">Registry Log</p>
                  {selectedEntry.val === 0 ? (
                     <div className="p-10 text-center border-2 border-dashed border-black/5 rounded-[24px]">
                        <p className="mc-body text-sm text-mc-ink/30 italic">No activity logs recorded.</p>
                     </div>
                  ) : (
                    <div className="space-y-0">
                       {Array.from({ length: selectedEntry.val }).map((_, i) => (
                          <div key={i} className="flex items-start justify-between py-6 border-b border-black/5 last:border-0 group">
                            <div className="flex items-start gap-6">
                              <div className={cn("mt-1 w-6 h-6 rounded-full flex items-center justify-center border-2", trendMode === 'github' ? "border-mc-emerald text-mc-emerald" : "border-mc-orange text-mc-orange")}>
                                 {trendMode === 'github' ? <Github className="w-3 h-3" /> : <Timer className="w-3 h-3" />}
                              </div>
                              <div className="space-y-1">
                                 <p className="mc-body text-sm font-bold text-mc-ink">{trendMode === 'github' ? `Commit #${i+1}` : `Session Focus Cycle`}</p>
                                 <p className="mc-body text-[10px] text-mc-ink/40">Registered at 10:45 AM • ID: {Math.random().toString(36).substr(2, 6).toUpperCase()}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                               <div className="h-8 w-8 rounded-full border-2 border-black/10 flex items-center justify-center">
                                  <span className="mc-body text-[9px] font-bold">{Math.floor(Math.random() * 50) + 50}%</span>
                               </div>
                               <button className="mc-body text-[10px] font-bold text-mc-ink/40 hover:text-mc-orange transition-colors">View</button>
                            </div>
                          </div>
                       ))}
                    </div>
                  )}
               </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color, className }) => (
  <div className={cn("mc-card bg-white p-10 space-y-6 hover:-translate-y-2 transition-transform", className)}>
    <div className={cn("p-3 w-fit rounded-2xl bg-mc-cream", color)}>
       <Icon className="w-5 h-5" />
    </div>
    <div className="space-y-1">
      <p className="mc-body text-[10px] font-bold uppercase tracking-widest text-mc-ink/30">{label}</p>
      <p className="mc-display text-4xl text-mc-ink font-medium">{value}</p>
    </div>
  </div>
);

export default ProfileScreen;
