import { useQuery } from "@tanstack/react-query";
import type { SecurityData } from "@/lib/vps/types";
import { fetchVpsSecurityData } from "@/services/vpsSecurityService";
import { OverviewCards } from "@/components/vps/overview-cards";
import { AttackTrendChart } from "@/components/vps/attack-trend-chart";
import { WorldMap } from "@/components/vps/world-map";
import { CountryChart } from "@/components/vps/country-chart";
import { EventsFeed } from "@/components/vps/events-feed";
import { ThreatLevel } from "@/components/vps/threat-level";
import { BlockedIPTable } from "@/components/vps/banned-ip-table";
import { VpsSystemPanel } from "@/components/vps/vps-system-panel";
import { SshSecurityPanel } from "@/components/vps/ssh-security-panel";
import { AttackToastContainer } from "@/components/vps/attack-toast";
import { useAttackNotifications } from "@/hooks/use-attack-notifications";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  RefreshCw,
  Wifi,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function VpsMonitor() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery<SecurityData>({
    queryKey: ["vps-security"],
    queryFn: fetchVpsSecurityData,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  const { toasts, dismissToast, permissionState, requestPermission } = useAttackNotifications();

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center p-8 bg-background">
        <AttackToastContainer toasts={toasts} permissionState={permissionState} onDismiss={dismissToast} onRequestPermission={requestPermission} />
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-primary">
            <Shield size={28} className="text-primary-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase">
            Connecting to VPS…
          </p>
          <div className="mt-4 flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-primary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-full flex items-center justify-center p-8 bg-background">
        <AttackToastContainer toasts={toasts} permissionState={permissionState} onDismiss={dismissToast} onRequestPermission={requestPermission} />
        <div className="text-center">
          <AlertTriangle size={40} className="text-destructive mx-auto mb-3" />
          <p className="text-sm font-medium text-destructive">Failed to connect to VPS API</p>
          <p className="text-xs mt-1 text-muted-foreground">Check VPS backend connection and API key.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-background text-foreground">
      <AttackToastContainer
        toasts={toasts}
        permissionState={permissionState}
        onDismiss={dismissToast}
        onRequestPermission={requestPermission}
      />

      {/* Sub-header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between px-6 py-3 border-b bg-card shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-primary">
            <Shield size={16} className="text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">CyberShield Monitor</h2>
            <p className="text-xs text-muted-foreground">VPS Security Intelligence Platform</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5">
            <Wifi size={12} className="text-[hsl(142_71%_38%)]" />
            <span className="text-xs font-mono text-[hsl(142_71%_38%)] hidden md:inline">
              ubuntu@vps-24526f0b
            </span>
          </div>

          <Badge variant="outline" className="hidden sm:flex gap-1 text-[10px] border-[hsl(142_71%_38%)] text-[hsl(142_71%_38%)]">
            <Activity size={9} />
            LIVE
          </Badge>

          <span className="text-xs text-muted-foreground hidden md:inline">
            {data.timestamp ? formatDistanceToNow(new Date(data.timestamp), { addSuffix: true }) : "—"}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 h-8"
          >
            <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </motion.div>

      {/* Dashboard content */}
      <div className="flex-1 p-4 md:p-6 space-y-5 max-w-[1600px] mx-auto w-full">
        <OverviewCards data={data} />
        <AttackTrendChart data={data.trendData} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2">
            <WorldMap data={data.enrichedIPs} />
          </div>
          <CountryChart data={data.bySeverity} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2">
            <EventsFeed events={data.recentEvents} />
          </div>
          <ThreatLevel data={data} />
        </div>

        <VpsSystemPanel />
        <SshSecurityPanel />
        <BlockedIPTable ips={data.enrichedIPs} />
      </div>

      <footer className="px-6 py-3 border-t bg-card text-center shrink-0">
        <p className="text-xs text-muted-foreground font-mono">
          CYBERSHIELD MONITOR · FAIL2BAN SSHD · LIVE DATA ·{" "}
          <span className="text-[hsl(142_71%_38%)] font-medium">ubuntu@vps-24526f0b</span>
        </p>
      </footer>
    </div>
  );
}
