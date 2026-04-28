import React, { useState } from "react"
import Header from "@/components/Header"
import Sidebar from "@/components/Sidebar"
import { Outlet } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Minimize2 } from "lucide-react"

const RootLayout = () => {
  const [isDeepFocus, setIsDeepFocus] = useState(false);

  return (
    <div className="min-h-screen bg-mc-cream text-mc-ink font-primary selection:bg-mc-orange selection:text-white overflow-hidden flex transition-colors duration-1000">
      <Sidebar onToggleDeepFocus={() => setIsDeepFocus(!isDeepFocus)} isDeepFocus={isDeepFocus} />
      
      <div className="flex-1 flex flex-col relative h-screen overflow-hidden">
        <Header isDeepFocus={isDeepFocus} />
        
        <main className={cn(
          "flex-1 overflow-y-auto px-6 sm:px-10 py-12 pb-32 lg:pb-20 relative custom-scrollbar scroll-smooth transition-all duration-700",
          isDeepFocus ? "lg:pl-10 pt-12" : "lg:pl-32 lg:pt-40 pt-12"
        )}>
          <div className="max-w-[1200px] mx-auto space-y-20">
            <Outlet />
          </div>
        </main>

        {/* Deep Focus Exit Toggle */}
        {isDeepFocus && (
          <button 
            onClick={() => setIsDeepFocus(false)}
            className="fixed bottom-8 right-8 w-12 h-12 rounded-full bg-mc-orange text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-50 animate-in fade-in zoom-in duration-500"
            title="Exit Deep Focus"
          >
            <Minimize2 className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}

export default RootLayout
