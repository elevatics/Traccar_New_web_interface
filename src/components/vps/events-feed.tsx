import { motion, AnimatePresence } from "framer-motion";
import { ShieldX, AlertTriangle, Info, ShieldOff, Activity } from "lucide-react";
import type { RawEvent } from "@/lib/vps/types";
import { formatDistanceToNow } from "date-fns";

interface Props {
  events: RawEvent[];
}

function eventConfig(e: RawEvent) {
  const isBlock = e.category === "fail2ban_ban" && e.message.includes(" Ban ");
  const isUnblock = e.category === "fail2ban_ban" && e.message.includes(" Unban ");
  if (isBlock) return { icon: ShieldX, color: "#ff2d55", label: "BLOCK" };
  if (isUnblock) return { icon: ShieldOff, color: "#30d158", label: "UNBLOCK" };
  if (e.severity === "high" || e.severity === "critical")
    return { icon: AlertTriangle, color: "#ff3b30", label: e.severity.toUpperCase() };
  if (e.severity === "medium") return { icon: Activity, color: "#ff9f0a", label: "MEDIUM" };
  return { icon: Info, color: "#64d2ff", label: "INFO" };
}

export function EventsFeed({ events }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.5 }}
      className="rounded-xl border bg-card p-5 flex flex-col shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Security Event Feed</h2>
          <p className="text-xs mt-0.5 text-muted-foreground">
            Live fail2ban log — {events.length} events
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full animate-pulse bg-primary" />
          <span className="text-xs font-mono text-primary">LIVE</span>
        </div>
      </div>

      <div className="scrollbar-thin flex flex-col gap-2 overflow-y-auto max-h-[340px] pr-1">
        <AnimatePresence>
          {events.map((event, i) => {
            const cfg = eventConfig(event);
            const Icon = cfg.icon;
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-start gap-3 rounded-lg px-3 py-2.5 border bg-muted/40"
              >
                <div
                  className="w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: `${cfg.color}18` }}
                >
                  <Icon size={12} style={{ color: cfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded"
                      style={{ background: `${cfg.color}18`, color: cfg.color }}
                    >
                      {cfg.label}
                    </span>
                    {event.ip && (
                      <span className="text-[10px] font-mono font-semibold" style={{ color: cfg.color }}>
                        {event.ip}
                      </span>
                    )}
                    <span className="text-[10px] font-mono ml-auto text-muted-foreground">
                      {formatDistanceToNow(new Date(event.ts), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed truncate text-foreground">
                    {event.message}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
