import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Timer, Search, Bell, Activity, User, Settings, LogOut, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const Header = ({ isDeepFocus }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className={cn(
      "lg:fixed lg:top-8 lg:left-1/2 lg:-translate-x-1/2 z-40 w-full lg:w-[calc(100%-12rem)] max-w-[1280px] px-6 py-4 lg:py-0 transition-all duration-700",
      isDeepFocus ? "opacity-0 -translate-y-full pointer-events-none" : "opacity-100 translate-y-0"
    )}>
      <div className="bg-white/90 backdrop-blur-xl border border-black/5 lg:rounded-full px-6 lg:px-10 py-4 flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.04)] transition-all duration-700">
        
        {/* Left Side: Logo & Status */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex -space-x-3">
              <div className="w-8 h-8 rounded-full bg-mc-orange/90 blur-[0.5px] transition-transform group-hover:-translate-x-1" />
              <div className="w-8 h-8 rounded-full bg-mc-ink/90 blur-[0.5px] transition-transform group-hover:translate-x-1" />
            </div>
            <span className="mc-display text-lg font-bold text-mc-ink tracking-tight hidden sm:block">Focus.registry</span>
          </Link>
          
          <div className="h-4 w-px bg-black/5 hidden md:block" />
          
          <div className="hidden md:flex items-center gap-2">
            <span className="w-1 h-1 bg-mc-emerald rounded-full animate-pulse" />
            <span className="mc-body text-[10px] font-bold uppercase tracking-[0.2em] text-mc-ink/30">System Verified</span>
          </div>
        </div>

        {/* Right Side: Search & Actions */}
        <div className="flex items-center gap-4 lg:gap-8">
          {/* Search Pill */}
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-black/5 rounded-full border border-transparent focus-within:bg-white focus-within:border-black/5 transition-all group">
            <Search className="w-3.5 h-3.5 text-mc-ink/30 group-focus-within:text-mc-ink" />
            <input 
              type="text" 
              placeholder="Search registry..." 
              className="bg-transparent border-none outline-none mc-body text-[11px] font-medium w-32 md:w-48 placeholder:text-mc-ink/30"
            />
          </div>

          <div className="flex items-center gap-3 lg:gap-6 border-l border-black/5 pl-4 lg:pl-8 relative" ref={dropdownRef}>
            <button 
              aria-label="Activity stream"
              className="p-2 text-mc-ink/30 hover:text-mc-ink transition-colors relative"
            >
              <Activity className="w-4 h-4" />
            </button>
            
            <button 
              aria-label="Notifications"
              className="p-2 text-mc-ink/30 hover:text-mc-ink transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-1 h-1 bg-mc-orange rounded-full" />
            </button>

            {/* Avatar Dropdown Trigger */}
            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 group"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden border border-black/5 shadow-sm hover:scale-105 active:scale-95 transition-all">
                  <img src="https://github.com/shadcn.png" alt="User avatar" className="w-full h-full object-cover" loading="lazy" />
                </div>
                <ChevronDown className={cn("w-3 h-3 text-mc-ink/30 transition-transform", isProfileOpen && "rotate-180")} />
              </button>

              {/* Dropdown Menu */}
              {isProfileOpen && (
                <div className="absolute top-full right-0 mt-4 w-56 bg-white rounded-[24px] border border-black/5 shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="px-4 py-3 border-b border-black/5 mb-2">
                    <p className="mc-body text-xs font-bold text-mc-ink uppercase tracking-wider">Quang Dev</p>
                    <p className="mc-body text-[10px] text-mc-ink/40">Commander Node</p>
                  </div>
                  
                  <DropdownItem icon={User} label="Profile" onClick={() => { setIsProfileOpen(false); navigate('/profile'); }} />
                  <DropdownItem icon={Settings} label="Settings" onClick={() => { setIsProfileOpen(false); navigate('/settings/github'); }} />
                  
                  <div className="h-px bg-black/5 my-2" />
                  
                  <DropdownItem icon={LogOut} label="Logout" color="text-mc-orange" onClick={() => { setIsProfileOpen(false); navigate('/login'); }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

const DropdownItem = ({ icon: Icon, label, onClick, color = "text-mc-ink/60" }) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-mc-cream rounded-2xl transition-all group text-left"
  >
    <Icon className={cn("w-4 h-4", color)} />
    <span className={cn("mc-body text-xs font-bold uppercase tracking-widest group-hover:translate-x-1 transition-transform", color)}>{label}</span>
  </button>
);

export default Header;
