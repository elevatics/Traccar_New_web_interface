import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import NotificationBell from "@/components/NotificationBell";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col h-screen">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-3 sm:gap-4 sm:px-4 shrink-0">
            <SidebarTrigger />
            <h1 className="text-sm font-semibold flex-1 truncate sm:text-lg">Fleet Management Portal</h1>
            <NotificationBell />
          </header>
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
