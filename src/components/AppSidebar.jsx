import { Home, Info, Timer } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "./ui/sidebar";

const navItems = [
  {
    motherTitle: "Menu",
    childrens: [
      { title: "Home", url: "/", icon: Home },
      { title: "About", url: "/about", icon: Info },
      { title: "Pomodoro", url: "/pomodoro", icon: Timer },
    ],
  },
];

const AppSidebar = () => {
  const location = useLocation();
  const { open } = useSidebar();

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="flex flex-row items-center justify-between px-2">
        {open && <span>Pomodoro</span>}
        <SidebarTrigger className="border border-border shadow rounded-md" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((mother) => (
            <SidebarMenuItem key={mother.motherTitle}>
              <div className="m-2 flex flex-row gap-1 items-center">
                <p className="uppercase text-[12px] text-gray-500 font-semibold text-center">
                  {mother.motherTitle}
                </p>
                <span className="m-2 w-dvw h-0 border border-border"></span>
              </div>
              {mother.childrens.map((children) => (
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === children.url}
                  className="text-[15px] text-center items-center p-5"
                >
                  <Link to={children.url}>
                    <children.icon strokeWidth={2} />
                    <span>{children.title}</span>
                  </Link>
                </SidebarMenuButton>
              ))}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
