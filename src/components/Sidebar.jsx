import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Timer, 
  LayoutDashboard, 
  Users, 
  Github, 
  Layers,
  Zap,
  Activity,
  Minimize2,
  Box,
  GitBranch
} from "lucide-react";
import { cn } from "@/lib/utils";

const Sidebar = ({ onToggleDeepFocus, isDeepFocus }) => {
  const location = useLocation();

  const primaryItems = [
    { id: "dash", url: "/", icon: LayoutDashboard, label: "Registry" },
    { id: "engine", url: "/pomodoro", icon: Timer, label: "Engine" },
    { id: "nodes", url: "/team", icon: Users, label: "Cluster" },
  ];

  const secondaryItems = [
    { id: "config", url: "/about", icon: Layers, label: "Specs" },
  ];

  return (
    <>
      {/* Mobile: Floating Navigation Pill */}
      <nav className={cn(
        "fixed bottom-8 left-1/2 -translate-x-1/2 z-50 lg:hidden bg-white/90 backdrop-blur-xl border border-black/5 rounded-full px-6 py-3 flex items-center gap-2 shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-700",
        isDeepFocus ? "opacity-0 translate-y-20 pointer-events-none" : "opacity-100 translate-y-0"
      )}>
        {primaryItems.map((item) => {
          const isActive = location.pathname === item.url;
          return (
            <Link
              key={item.id}
              to={item.url}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90",
                isActive ? "bg-mc-ink text-white shadow-md" : "text-mc-ink/30"
              )}
            >
              <item.icon className="w-5 h-5" />
            </Link>
          );
        })}
      </nav>

      {/* Desktop: Command Rail (Floating Vertical Pill) */}
      <aside className={cn(
        "hidden lg:flex fixed left-8 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-6 transition-all duration-700",
        isDeepFocus ? "opacity-0 -translate-x-full pointer-events-none" : "opacity-100 translate-x-0"
      )}>
        <div className="bg-white/90 backdrop-blur-xl border border-black/5 rounded-full py-8 px-3 flex flex-col gap-6 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
          {/* Primary Nav */}
          <div className="flex flex-col gap-2">
            {primaryItems.map((item) => {
              const isActive = location.pathname === item.url;
              return (
                <Link
                  key={item.id}
                  to={item.url}
                  aria-label={item.label}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all group relative",
                    isActive 
                      ? "bg-mc-ink text-white shadow-xl scale-105" 
                      : "text-mc-ink/30 hover:text-mc-ink hover:bg-mc-cream"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 transition-transform", isActive ? "scale-110" : "group-hover:scale-110")} />
                  <span className="absolute left-full ml-6 px-3 py-1.5 bg-mc-ink text-mc-cream mc-body text-[10px] font-bold uppercase tracking-widest rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all -translate-x-2 group-hover:translate-x-0 whitespace-nowrap z-50 shadow-xl">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="h-px bg-black/5 mx-2" />

          {/* Context Widget */}
          <div className="flex flex-col items-center gap-4 py-2">
             <div className="w-12 h-12 rounded-full border border-black/5 flex items-center justify-center text-mc-ink/30 hover:bg-mc-cream hover:text-mc-orange transition-all cursor-pointer group relative">
                <Box className="w-5 h-5" />
                <div className="absolute left-full ml-6 px-4 py-3 bg-white border border-black/5 rounded-3xl w-48 shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all -translate-x-2 group-hover:translate-x-0 z-50 space-y-2">
                   <p className="mc-body text-[9px] font-bold uppercase tracking-widest text-mc-ink/40">Active Context</p>
                   <p className="mc-body text-xs font-bold text-mc-ink">pomodoro-timer</p>
                   <div className="flex items-center gap-2 text-mc-ink/60">
                     <GitBranch className="w-3 h-3" />
                     <span className="mc-body text-[10px]">main</span>
                   </div>
                </div>
             </div>
          </div>

          <div className="h-px bg-black/5 mx-2" />

          {/* Secondary Nav */}
          <div className="flex flex-col gap-2">
            {secondaryItems.map((item) => {
              const isActive = location.pathname === item.url;
              return (
                <Link
                  key={item.id}
                  to={item.url}
                  aria-label={item.label}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all group relative",
                    isActive 
                      ? "bg-mc-ink text-white shadow-xl scale-105" 
                      : "text-mc-ink/30 hover:text-mc-ink hover:bg-mc-cream"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 transition-transform", isActive ? "scale-110" : "group-hover:scale-110")} />
                  <span className="absolute left-full ml-6 px-3 py-1.5 bg-mc-ink text-mc-cream mc-body text-[10px] font-bold uppercase tracking-widest rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all -translate-x-2 group-hover:translate-x-0 whitespace-nowrap z-50 shadow-xl">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <button 
          onClick={onToggleDeepFocus}
          className="w-12 h-12 rounded-full bg-mc-orange text-white flex items-center justify-center shadow-xl hover:shadow-mc-orange/20 hover:scale-110 active:scale-95 transition-all group relative"
        >
          <Minimize2 className="w-5 h-5" />
          <span className="absolute left-full ml-6 px-3 py-1.5 bg-mc-ink text-mc-cream mc-body text-[10px] font-bold uppercase tracking-widest rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all -translate-x-2 group-hover:translate-x-0 whitespace-nowrap z-50 shadow-xl">
            Deep Focus
          </span>
        </button>
      </aside>
    </>
  );
};

export default Sidebar;
