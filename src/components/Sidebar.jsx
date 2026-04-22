import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Timer, 
  LayoutDashboard, 
  Users, 
  Github, 
  Layers,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

const Sidebar = () => {
  const location = useLocation();

  const primaryItems = [
    { id: "dash", url: "/", icon: LayoutDashboard, label: "Core" },
    { id: "engine", url: "/pomodoro", icon: Timer, label: "Engine" },
    { id: "nodes", url: "/team", icon: Users, label: "Nodes" },
  ];

  const secondaryItems = [
    { id: "registry", url: "/settings/github", icon: Github, label: "Registry" },
    { id: "config", url: "/about", icon: Layers, label: "Specs" },
  ];

  return (
    <>
      {/* Mobile/Tablet Bottom Navigation (Fixed) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white/90 backdrop-blur-xl border-t border-black/5 px-6 py-4 flex items-center justify-around pb-safe">
        {primaryItems.map((item) => {
          const isActive = location.pathname === item.url;
          return (
            <Link
              key={item.id}
              to={item.url}
              className={cn(
                "p-3 rounded-full transition-all active:scale-90",
                isActive ? "bg-mc-ink text-white shadow-lg" : "text-mc-ink/30"
              )}
            >
              <item.icon className="w-6 h-6" />
            </Link>
          );
        })}
        <Link
          to="/settings/github"
          className={cn(
            "p-3 rounded-full transition-all active:scale-90",
            location.pathname === "/settings/github" ? "bg-mc-ink text-white shadow-lg" : "text-mc-ink/30"
          )}
        >
          <Github className="w-6 h-6" />
        </Link>
      </nav>

      {/* Desktop Command Rail (Hidden on small screens) */}
      <aside className="hidden lg:flex fixed left-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-4">
        <div className="bg-white/80 backdrop-blur-xl border border-black/5 rounded-full py-6 px-3 flex flex-col gap-6 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
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
                    ? "bg-mc-ink text-white shadow-lg scale-110" 
                    : "text-mc-ink/30 hover:text-mc-ink hover:bg-mc-cream"
                )}
              >
                <item.icon className="w-5 h-5" />
                {/* Tooltip */}
                <span className="absolute left-full ml-4 px-3 py-1 bg-mc-ink text-white text-[10px] font-bold uppercase tracking-widest rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {item.label}
                </span>
              </Link>
            );
          })}

          <div className="h-px bg-black/5 mx-2" />

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
                    ? "bg-mc-ink text-white shadow-lg scale-110" 
                    : "text-mc-ink/30 hover:text-mc-ink hover:bg-mc-cream"
                )}
              >
                <item.icon className="w-5 h-5" />
                {/* Tooltip */}
                <span className="absolute left-full ml-4 px-3 py-1 bg-mc-ink text-white text-[10px] font-bold uppercase tracking-widest rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        <button className="w-12 h-12 rounded-full bg-mc-orange text-white flex items-center justify-center shadow-lg hover:rotate-90 transition-all">
          <Zap className="w-5 h-5 fill-current" />
        </button>
      </aside>
    </>
  );
};

export default Sidebar;
