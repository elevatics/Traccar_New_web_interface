import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, BellOff, ShieldAlert, Eye, AlertTriangle, ShieldX } from "lucide-react";
import type { AlertEvent } from "@/lib/vps/types";

export interface ToastAlert extends AlertEvent {
  toastId: string;
}

interface Props {
  toasts: ToastAlert[];
  permissionState: NotificationPermission;
  onDismiss: (id: string) => void;
  onRequestPermission: () => void;
}

const TYPE_CONFIG = {
  BAN:      { color: "hsl(0 84% 55%)",   bg: "hsl(0 84% 97%)",    border: "hsl(0 84% 85%)",    Icon: ShieldX,       label: "IP BLOCKED"    },
  CRITICAL: { color: "hsl(270 67% 50%)", bg: "hsl(270 67% 97%)",  border: "hsl(270 67% 85%)",  Icon: ShieldAlert,   label: "CRITICAL"      },
  HIGH:     { color: "hsl(0 84% 55%)",   bg: "hsl(0 84% 97%)",    border: "hsl(0 84% 85%)",    Icon: AlertTriangle, label: "HIGH SEVERITY" },
  FOUND:    { color: "hsl(38 92% 40%)",  bg: "hsl(38 92% 96%)",   border: "hsl(38 92% 80%)",   Icon: Eye,           label: "ATTACKER SEEN" },
} as const;

function flagEmoji(code: string): string {
  if (!code || code === "XX") return "🌐";
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join("");
}

export function AttackToastContainer({ toasts, permissionState, onDismiss, onRequestPermission }: Props) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80 pointer-events-none">
      <AnimatePresence>
        {permissionState === "default" && (
          <motion.div
            key="perm-prompt"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            className="pointer-events-auto rounded-xl px-4 py-3 flex items-center gap-3 border bg-card shadow-lg"
          >
            <Bell size={16} className="text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">Enable attack alerts?</p>
              <p className="text-[10px] mt-0.5 text-muted-foreground">Get browser notifications for blocks &amp; critical events</p>
            </div>
            <button
              onClick={onRequestPermission}
              className="shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/30"
            >
              ALLOW
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="sync">
        {toasts.map((toast) => {
          const cfg = TYPE_CONFIG[toast.type] ?? TYPE_CONFIG.HIGH;
          const Icon = cfg.Icon;
          const flag = flagEmoji(toast.countryCode);
          const time = new Date(toast.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

          return (
            <motion.div
              key={toast.toastId}
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="pointer-events-auto rounded-xl border overflow-hidden bg-card shadow-lg"
              style={{ borderColor: cfg.border }}
            >
              <div className="h-0.5 w-full" style={{ background: cfg.color }} />
              <div className="px-3.5 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                    <Icon size={13} style={{ color: cfg.color }} />
                  </div>
                  <span className="text-[10px] font-bold tracking-widest uppercase flex-1" style={{ color: cfg.color }}>
                    {cfg.label}
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground">{time}</span>
                  <button onClick={() => onDismiss(toast.toastId)} className="ml-1 rounded hover:opacity-70 transition-opacity text-muted-foreground">
                    <X size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono text-xs font-bold text-destructive">{toast.ip}</span>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-xs text-foreground">{flag} {toast.country}</span>
                </div>
                <p className="text-[10px] mb-1.5 truncate text-muted-foreground" title={toast.org}>{toast.org}</p>
                {toast.username && (
                  <p className="text-[10px] mb-1.5 font-mono" style={{ color: "hsl(38 92% 40%)" }}>user: {toast.username}</p>
                )}
                <p className="text-[10px] font-mono leading-relaxed line-clamp-2 text-muted-foreground" title={toast.message}>
                  {toast.message}
                </p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {permissionState === "denied" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="pointer-events-auto rounded-lg px-3 py-2 flex items-center gap-2 border bg-card shadow-sm"
        >
          <BellOff size={11} className="text-muted-foreground" />
          <span className="text-[9px] text-muted-foreground">
            Browser notifications blocked — enable in browser settings
          </span>
        </motion.div>
      )}
    </div>
  );
}
