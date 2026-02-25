import {
  LayoutDashboard,
  Map,
  Route as RouteIcon,
  Users,
  Car,
  Wrench,
  FileText,
  DollarSign,
  Settings,
  User,
  LogOut } from
"lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  useSidebar } from
"@/components/ui/sidebar";
import { useUserRole, rolePermissions } from "@/contexts/UserRoleContext";

const menuItems = [
{ title: "Dashboard", url: "/", icon: LayoutDashboard },
{ title: "Fleet", url: "/fleet", icon: Map },
{ title: "Trips", url: "/trips", icon: RouteIcon },
{ title: "Drivers", url: "/drivers", icon: Users },
{ title: "Vehicles", url: "/vehicles", icon: Car },
{ title: "Maintenance", url: "/maintenance", icon: Wrench },
{ title: "Reports", url: "/reports", icon: FileText },
{ title: "Finance", url: "/finance", icon: DollarSign },
{ title: "Settings", url: "/settings", icon: Settings }];


export function AppSidebar() {
  const { state } = useSidebar();
  const { role } = useUserRole();
  const collapsed = state === "collapsed";

  const allowedPaths = rolePermissions[role];
  const filteredMenuItems = menuItems.filter((item) => allowedPaths.includes(item.url));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Map className="h-5 w-5" />
          </div>
          {!collapsed &&
          <div className="flex flex-col">
              <span className="text-sm font-semibold">Turet Telematics

            </span>
              <span className="text-xs text-muted-foreground">GPS Tracking</span>
            </div>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                      isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : ""
                      }>

                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Profile">
              <NavLink to="/profile">
                <User className="h-4 w-4" />
                <span>Profile</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Logout">
              <button onClick={() => console.log("Logout")}>
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>);

}