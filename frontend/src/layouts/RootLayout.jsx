import React, { useEffect, useState } from "react"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import { Outlet, useLocation } from "react-router-dom"
import { Toaster } from "sonner"

const RootLayout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  const handleToggleCollapse = () => {
    setCollapsed(c => {
      localStorage.setItem('sidebar_collapsed', String(!c));
      return !c;
    });
  };

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  if (isAuthPage) return <Outlet />;

  return (
    <div className="min-h-screen flex" style={{ background: "oklch(var(--canvas))", color: "oklch(var(--text))" }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} collapsed={collapsed} onToggleCollapse={handleToggleCollapse} />
      <Header onMenuClick={() => setSidebarOpen(true)} collapsed={collapsed} />
      <main className={`flex-1 pt-16 overflow-y-auto h-screen scroll-smooth transition-all duration-300 ${collapsed ? 'lg:ml-16' : 'lg:ml-72'}`}>
        <Outlet />
      </main>
      <Toaster position="bottom-left" richColors closeButton />
    </div>
  );
};

export default RootLayout;
