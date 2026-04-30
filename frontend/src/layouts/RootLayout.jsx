import React, { useEffect, useState } from "react"
import Sidebar from "@/components/Sidebar"
import Header from "@/components/Header"
import { Outlet, useLocation } from "react-router-dom"

const RootLayout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  // Sidebar closes on nav click via Sidebar's handleNavClick

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  if (isAuthPage) return <Outlet />;

  return (
    <div className="min-h-screen bg-canvas text-text font-body selection:bg-primary/20 selection:text-text flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <main className="flex-1 lg:ml-72 pt-16 overflow-y-auto h-screen scroll-smooth">
        <Outlet />
      </main>
    </div>
  );
};

export default RootLayout;
