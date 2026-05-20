import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import NotificationBell from "@/components/NotificationBell";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden">
        <AppSidebar />
        <SidebarInset className="flex flex-col h-screen min-w-0 overflow-x-hidden">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-3 sm:gap-4 sm:px-4 shrink-0">
            <SidebarTrigger />
            <h1 className="text-sm font-semibold flex-1 truncate sm:text-lg">Fleet Management Portal</h1>
            <NotificationBell />
          </header>
          <main className="flex-1 min-h-0 w-full min-w-0 overflow-y-auto overflow-x-hidden">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
