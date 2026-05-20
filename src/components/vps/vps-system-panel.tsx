import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { vpsGet, vpsPost } from "@/lib/vps/vpsApiClient";
import { motion } from "framer-motion";
import {
  Cpu, MemoryStick, HardDrive, Network, Server,
  RefreshCw, Power, Clock, Info, AlertTriangle,
} from "lucide-react";
import type { VpsSystemInfo } from "@/lib/vps/types";

async function fetchSystemInfo(): Promise<VpsSystemInfo> {
  const res = await vpsGet("/system");
  if (!res.ok) throw new Error("Failed to fetch system info");
  return res.json();
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function UsageBar({ percent, color }: { percent: number; color: string }) {
  const clamped = Math.min(100, Math.max(0, percent));
  const barColor =
    clamped >= 90 ? "#ff3b30" : clamped >= 70 ? "#ff9f0a" : color;
  return (
    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#ffffff10" }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: barColor }}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

export function VpsSystemPanel() {
  const [rebooting, setRebooting] = useState(false);
  const [rebootMsg, setRebootMsg] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<VpsSystemInfo>({
    queryKey: ["vps-system"],
    queryFn: fetchSystemInfo,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  async function handleReboot() {
    setConfirmOpen(false);
    setRebooting(true);
    setRebootMsg(null);
    try {
      const res = await vpsPost("/reboot", {});
      const json = await res.json();
      setRebootMsg(json.message ?? "Reboot scheduled.");
    } catch {
      setRebootMsg("Failed to send reboot command.");
    } finally {
      setRebooting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border bg-card p-5 shadow-sm"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Server size={15} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">VPS System Info</h2>
          {data && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[hsl(142_71%_96%)] text-[hsl(142_71%_38%)] border border-[hsl(142_71%_80%)]">
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-muted text-muted-foreground"
            title="Refresh"
          >
            <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={rebooting || isLoading || isError}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border text-destructive border-destructive/30 hover:bg-destructive/10 disabled:opacity-50"
          >
            <Power size={12} />
            {rebooting ? "Scheduling…" : "Reboot"}
          </button>
        </div>
      </div>

      {confirmOpen && (
        <div className="mb-4 p-3 rounded-lg border border-destructive/30 bg-destructive/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-destructive" />
            <span className="text-xs text-destructive">Schedule VPS reboot in 1 minute?</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setConfirmOpen(false)} className="text-xs px-3 py-1 rounded-lg cursor-pointer bg-muted text-muted-foreground hover:bg-muted/80">
              Cancel
            </button>
            <button onClick={handleReboot} className="text-xs px-3 py-1 rounded-lg font-semibold cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirm
            </button>
          </div>
        </div>
      )}

      {rebootMsg && (
        <div className="mb-4 p-2.5 rounded-lg text-xs bg-[hsl(38_92%_96%)] text-[hsl(38_92%_35%)] border border-[hsl(38_92%_80%)]">
          {rebootMsg}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-primary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </div>
      )}

      {isError && !isLoading && (
        <div className="flex items-center gap-2 py-6 justify-center text-xs text-destructive">
          <Info size={14} />
          <span>System endpoint not available — check VPS backend connection.</span>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 text-muted-foreground">
              System Information
            </p>
            <div className="space-y-2.5">
              <Row label="Hostname" value={data.hostname} mono />
              <Row label="OS" value={data.os} />
              <Row label="Machine ID" value={`${data.machine_id.slice(0, 16)}…`} mono />
              <Row label="Architecture" value={data.platform} />
              <Row
                label="Up since"
                value={formatUptime(data.uptime_seconds)}
                icon={<Clock size={12} className="text-[hsl(142_71%_38%)]" />}
              />
              <Row
                label="Boot time"
                value={new Date(data.boot_time * 1000).toLocaleString()}
              />
            </div>
          </div>

          <div className="mt-5 md:mt-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 text-muted-foreground">
              Resource Usage
            </p>
            <div className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <Cpu size={12} className="text-[hsl(270_67%_50%)]" />
                    <span className="text-xs text-foreground">CPU</span>
                    <span className="text-[10px] text-muted-foreground">{data.cpu_count} core{data.cpu_count !== 1 ? "s" : ""}</span>
                  </div>
                  <span className="text-xs font-mono text-[hsl(270_67%_50%)]">{data.cpu_percent.toFixed(1)}%</span>
                </div>
                <UsageBar percent={data.cpu_percent} color="hsl(270 67% 50%)" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <MemoryStick size={12} className="text-primary" />
                    <span className="text-xs text-foreground">Memory</span>
                  </div>
                  <span className="text-xs font-mono text-primary">
                    {formatBytes(data.memory_used_bytes)} / {formatBytes(data.memory_total_bytes)}
                  </span>
                </div>
                <UsageBar percent={data.memory_percent} color="hsl(217 91% 35%)" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <HardDrive size={12} className="text-[hsl(38_92%_40%)]" />
                    <span className="text-xs text-foreground">Disk</span>
                  </div>
                  <span className="text-xs font-mono text-[hsl(38_92%_40%)]">
                    {formatBytes(data.disk_used_bytes)} / {formatBytes(data.disk_total_bytes)}
                  </span>
                </div>
                <UsageBar percent={data.disk_percent} color="hsl(38 92% 40%)" />
              </div>

              <div className="pt-1 border-t">
                <div className="flex items-center gap-1.5 mb-2">
                  <Network size={12} className="text-[hsl(142_71%_38%)]" />
                  <span className="text-xs text-foreground">Network I/O</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg p-2 bg-[hsl(142_71%_96%)] border border-[hsl(142_71%_85%)]">
                    <p className="text-[10px] uppercase tracking-wide mb-0.5 text-muted-foreground">Received</p>
                    <p className="text-xs font-mono font-semibold text-[hsl(142_71%_38%)]">
                      {formatBytes(data.net_bytes_recv)}
                    </p>
                  </div>
                  <div className="rounded-lg p-2 bg-[hsl(217_91%_96%)] border border-[hsl(217_91%_85%)]">
                    <p className="text-[10px] uppercase tracking-wide mb-0.5 text-muted-foreground">Sent</p>
                    <p className="text-xs font-mono font-semibold text-primary">
                      {formatBytes(data.net_bytes_sent)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function Row({
  label,
  value,
  mono = false,
  icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className={`text-xs text-foreground ${mono ? "font-mono" : ""}`}>{value}</span>
      </div>
    </div>
  );
}
