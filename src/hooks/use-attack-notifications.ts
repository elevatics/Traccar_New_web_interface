import { useEffect, useRef, useCallback, useState } from "react";
import type { AlertEvent, RawEvent } from "@/lib/vps/types";
import type { ToastAlert } from "@/components/vps/attack-toast";

export type { ToastAlert };

const VPS_BASE = "http://15.204.117.106:8090";
const POLL_INTERVAL_MS = 10_000;

const TYPE_EMOJI: Record<string, string> = {
  BAN: "🚫",
  CRITICAL: "🔴",
  HIGH: "🟠",
  FOUND: "👁️",
};

const TYPE_TITLE: Record<string, string> = {
  BAN: "IP BLOCKED",
  CRITICAL: "CRITICAL ATTACK",
  HIGH: "HIGH SEVERITY",
  FOUND: "ATTACKER DETECTED",
};

type AlertType = "BAN" | "CRITICAL" | "HIGH" | "FOUND";

function classifyEvent(e: RawEvent): AlertType | null {
  if (e.category === "fail2ban_ban" && e.message.includes(" Ban ")) return "BAN";
  if (e.severity === "critical") return "CRITICAL";
  if (e.severity === "high") return "HIGH";
  if (e.category === "fail2ban_ban" && e.message.includes(" Found ")) return "FOUND";
  return null;
}

async function geoEnrichSingle(ip: string): Promise<{ country: string; countryCode: string; org: string }> {
  try {
    const res = await fetch(
      "http://ip-api.com/batch?fields=status,query,country,countryCode,isp,org",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ query: ip }]),
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!res.ok) return { country: "Unknown", countryCode: "XX", org: "Unknown" };
    const results = await res.json();
    const r = results[0];
    if (r?.status === "success") {
      return {
        country: r.country ?? "Unknown",
        countryCode: r.countryCode ?? "XX",
        org: r.isp ?? r.org ?? "Unknown",
      };
    }
  } catch {
    // fall through
  }
  return { country: "Unknown", countryCode: "XX", org: "Unknown" };
}

function flagEmoji(code: string): string {
  if (!code || code === "XX") return "🌐";
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join("");
}

export function useAttackNotifications() {
  const [toasts, setToasts] = useState<ToastAlert[]>([]);
  const [permissionState, setPermissionState] = useState<NotificationPermission>("default");
  // Track the highest event id we've already processed
  const lastSeenIdRef = useRef<number>(-1);
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermissionState(result);
  }, []);

  const fireNotification = useCallback((alert: AlertEvent) => {
    const emoji = TYPE_EMOJI[alert.type] ?? "⚠️";
    const title = `${emoji} ${TYPE_TITLE[alert.type] ?? alert.type} — CyberShield`;
    const flag = flagEmoji(alert.countryCode);
    const body = [
      `IP: ${alert.ip}`,
      `Origin: ${flag} ${alert.country} · ${alert.org}`,
      alert.username ? `User: ${alert.username}` : null,
      `Severity: ${alert.severity.toUpperCase()}`,
      alert.message.length > 80 ? alert.message.slice(0, 80) + "…" : alert.message,
    ]
      .filter(Boolean)
      .join("\n");

    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        const n = new Notification(title, {
          body,
          icon: "/shield-icon.png",
          tag: `attack-${alert.id}`,
          requireInteraction: alert.type === "BAN" || alert.type === "CRITICAL",
        });
        n.onclick = () => { window.focus(); n.close(); };
      } catch {
        // some browsers block Notification constructor silently
      }
    }

    const toastId = `${alert.id}-${Date.now()}`;
    setToasts((prev) => [{ ...alert, toastId }, ...prev].slice(0, 8));
    const ttl = alert.type === "BAN" || alert.type === "CRITICAL" ? 20_000 : 8_000;
    setTimeout(() => dismissToast(toastId), ttl);
  }, [dismissToast]);

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setPermissionState(Notification.permission);
    }

    let stopped = false;

    // Seed lastSeenId so we only alert on NEW events going forward
    async function seed() {
      try {
        const res = await fetch(`${VPS_BASE}/api/events?limit=1`);
        if (res.ok) {
          const events: RawEvent[] = await res.json();
          if (events.length > 0) lastSeenIdRef.current = events[0].id;
        }
      } catch {
        // start from -1
      }
    }

    async function poll() {
      if (stopped) return;
      try {
        const res = await fetch(`${VPS_BASE}/api/events?limit=50`, {
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return;
        const events: RawEvent[] = await res.json();

        const newEvents = events
          .filter((e) => e.id > lastSeenIdRef.current)
          .sort((a, b) => a.id - b.id);

        if (newEvents.length > 0) {
          lastSeenIdRef.current = newEvents[newEvents.length - 1].id;

          const alertable = newEvents.filter((e) => classifyEvent(e) !== null);
          for (const e of alertable) {
            if (stopped) break;
            const type = classifyEvent(e)!;
            const geo = e.ip ? await geoEnrichSingle(e.ip) : { country: "Unknown", countryCode: "XX", org: "Unknown" };
            const alert: AlertEvent = {
              id: e.id,
              ts: e.ts,
              ip: e.ip ?? "unknown",
              country: geo.country,
              countryCode: geo.countryCode,
              org: geo.org,
              severity: e.severity,
              category: e.category,
              type: type as AlertEvent["type"],
              message: e.message,
              username: e.username,
            };
            fireNotification(alert);
          }
        }
      } catch {
        // VPS temporarily unreachable — keep polling
      } finally {
        if (!stopped) {
          pollingRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        }
      }
    }

    seed().then(() => {
      if (!stopped) {
        pollingRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      }
    });

    return () => {
      stopped = true;
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, [fireNotification]);

  return { toasts, dismissToast, permissionState, requestPermission };
}
