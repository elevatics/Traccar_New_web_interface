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
  LogOut,
  ShieldCheck,
  Navigation2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserRole, rolePermissions } from "@/contexts/UserRoleContext";
import { useTraccarAuth } from "@/contexts/TraccarAuthContext";
import { getCurrentSession } from "@/services/authService";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Fleet", url: "/fleet", icon: Map },
  { title: "Trips", url: "/trips", icon: RouteIcon },
  { title: "Replay", url: "/replay", icon: Navigation2 },
  { title: "Drivers", url: "/drivers", icon: Users },
  { title: "Vehicles", url: "/vehicles", icon: Car },
  // { title: "Maintenance", url: "/maintenance", icon: Wrench },
  { title: "Reports", url: "/reports", icon: FileText },
  // { title: "Finance", url: "/finance", icon: DollarSign },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const { role } = useUserRole();
  const { logout } = useTraccarAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const collapsed = state === "collapsed";
  const isMobile = useIsMobile();

  const allowedPaths = rolePermissions[role];
  const filteredMenuItems = menuItems.filter((item) =>
    allowedPaths.includes(item.url),
  );

  useEffect(() => {
    let mounted = true;
    void getCurrentSession()
      .then((session: any) => {
        if (!mounted) return;
        setIsAdmin(Boolean(session?.administrator));
      })
      .catch(() => {
        if (!mounted) return;
        setIsAdmin(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
            <Map className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-semibold">Turet Telematics</span>
              <span className="text-xs text-muted-foreground">GPS Tracking</span>
            </div>
          )}
          {/* Close button — only on mobile */}
          {isMobile && (
            <button
              onClick={() => setOpenMobile(false)}
              className="ml-auto p-1.5 rounded-md hover:bg-sidebar-accent transition-colors text-sidebar-foreground/60 hover:text-sidebar-foreground"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : ""
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isAdmin && allowedPaths.includes("/user-access") ? (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="User Access">
                    <NavLink
                      to="/user-access"
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : ""
                      }
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>User Access</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
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
              <button
                onClick={async () => {
                  await logout();
                }}
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
