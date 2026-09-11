import { lazy, Suspense } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { UserRoleProvider } from "./contexts/UserRoleContext";
import { TraccarAuthProvider, useTraccarAuth } from "./contexts/TraccarAuthContext";
import { TrackingPrefsProvider } from "./contexts/TrackingPrefsContext";
import { FleetDataProvider } from "./contexts/FleetDataContext";

import Index from "./pages/Index";
import Login from "./pages/Login";

const Fleet       = lazy(() => import("./pages/Fleet"));
const Trips       = lazy(() => import("./pages/Trips"));
const Drivers     = lazy(() => import("./pages/Drivers"));
const Vehicles    = lazy(() => import("./pages/Vehicles"));
const Maintenance = lazy(() => import("./pages/Maintenance"));
const Reports     = lazy(() => import("./pages/Reports"));
const Finance     = lazy(() => import("./pages/Finance"));
const Settings    = lazy(() => import("./pages/Settings"));
const Profile     = lazy(() => import("./pages/Profile"));
const UserAccess  = lazy(() => import("./pages/UserAccess"));
const Replay      = lazy(() => import("./pages/Replay"));
const VpsMonitor  = lazy(() => import("./pages/VpsMonitor"));
const ResetPassword  = lazy(() => import("./pages/ResetPassword"));
const NotFound       = lazy(() => import("./pages/NotFound"));

const PageLoader = () => (
  <div className="flex items-center justify-center h-screen w-full bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const queryClient = new QueryClient();

const ProtectedRoutes = () => {
  const { isAuthenticated } = useTraccarAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <FleetDataProvider>
      <Layout>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </Layout>
    </FleetDataProvider>
  );
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  <QueryClientProvider client={queryClient}>
    <TrackingPrefsProvider>
      <UserRoleProvider>
        <TraccarAuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route element={<ProtectedRoutes />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/fleet" element={<Fleet />} />
                  <Route path="/trips" element={<Trips />} />
                  <Route path="/drivers" element={<Drivers />} />
                  <Route path="/vehicles" element={<Vehicles />} />
                  <Route path="/maintenance" element={<Maintenance />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/replay" element={<Replay />} />
                  <Route path="/finance" element={<Finance />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/user-access" element={<UserAccess />} />
                  <Route path="/cyber-threat-analysis" element={<VpsMonitor />} />
                </Route>
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </TraccarAuthProvider>
      </UserRoleProvider>
    </TrackingPrefsProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
