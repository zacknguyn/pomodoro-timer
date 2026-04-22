import Header from "@/components/Header"
import Sidebar from "@/components/Sidebar"
import { Outlet } from "react-router-dom"

const RootLayout = () => {
  return (
    <div className="min-h-screen bg-mc-cream text-mc-ink font-primary selection:bg-mc-orange selection:text-white overflow-hidden flex transition-colors duration-1000">
      <Sidebar />
      <div className="flex-1 flex flex-col relative h-screen overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto px-6 sm:px-10 lg:pl-32 py-12 pb-32 lg:pb-12 relative custom-scrollbar scroll-smooth">
          <div className="max-w-[1200px] mx-auto space-y-20">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default RootLayout
