import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Timer, LayoutDashboard, Users, Github, Search, Bell, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const Header = () => {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 w-full bg-mc-cream/80 backdrop-blur-md border-b border-black/5 px-6 sm:px-10 py-6">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-10">
           <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-mc-ink rounded-full flex items-center justify-center text-mc-cream">
              <Timer className="w-5 h-5" />
            </div>
            <span className="mc-display text-xl tracking-tight font-bold text-mc-ink">Focus.registry</span>
          </div>
          
          <div className="h-6 w-px bg-black/10 hidden md:block" />
          
          <div className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-mc-ink/40">
            <span className="w-1.5 h-1.5 bg-mc-orange rounded-full animate-pulse" />
            System_Verified
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-black/5 rounded-full border border-black/5 group focus-within:bg-white focus-within:border-mc-ink transition-all">
            <Search className="w-4 h-4 text-mc-ink/30 group-focus-within:text-mc-ink" />
            <input 
              type="text" 
              placeholder="Search registry..." 
              className="bg-transparent border-none outline-none text-xs font-medium w-48 placeholder:text-mc-ink/30"
            />
          </div>

          <div className="flex items-center gap-3 border-l border-black/10 pl-6">
            <button 
              aria-label="Notifications"
              className="p-2 text-mc-ink/40 hover:text-mc-ink transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-mc-orange rounded-full" />
            </button>
            <div className="w-10 h-10 rounded-full overflow-hidden border border-black/5 shadow-sm" role="img" aria-label="User avatar">
              <img src="https://github.com/shadcn.png" alt="Quang Dev" className="w-full h-full object-cover" loading="lazy" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
