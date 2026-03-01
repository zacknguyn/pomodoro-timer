import AppSidebar from "@/components/AppSidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Outlet } from "react-router-dom"

const RootLayout = () => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="border border-border shadow-gray-300">
        <main className="flex-1 overflow-hidden p-4">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default RootLayout
