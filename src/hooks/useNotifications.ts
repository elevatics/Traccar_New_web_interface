import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getEvents } from '../services/eventService';

export type AlertSeverity = 'high' | 'medium' | 'low';
export type NotificationType =
  | 'device_online'
  | 'device_offline'
  | 'geofence'
  | 'ignition'
  | 'overspeed'
  | 'alert'
  | 'info';

export interface AppNotification {
  id: string;
  type: NotificationType;
  severity: AlertSeverity;
  message: string;
  detail?: string;
  time: Date;
  deviceId: number | null;
  read: boolean;
}

type TraccarEvent = { type: string; deviceId: number | null; eventTime: string | null };

const EVENT_MAP: Record<string, { type: NotificationType; severity: AlertSeverity; label: string }> = {
  deviceOnline:    { type: 'device_online',  severity: 'low',    label: 'came online' },
  deviceOffline:   { type: 'device_offline', severity: 'medium', label: 'went offline' },
  deviceUnknown:   { type: 'device_offline', severity: 'low',    label: 'status unknown' },
  deviceInactive:  { type: 'device_offline', severity: 'medium', label: 'is inactive' },
  deviceMoving:    { type: 'info',           severity: 'low',    label: 'started moving' },
  deviceStopped:   { type: 'info',           severity: 'low',    label: 'stopped' },
  deviceOverspeed: { type: 'overspeed',      severity: 'high',   label: 'exceeded speed limit' },
  geofenceEnter:   { type: 'geofence',       severity: 'medium', label: 'entered geofence' },
  geofenceExit:    { type: 'geofence',       severity: 'medium', label: 'exited geofence' },
  ignitionOn:      { type: 'ignition',       severity: 'low',    label: 'ignition turned ON' },
  ignitionOff:     { type: 'ignition',       severity: 'low',    label: 'ignition turned OFF' },
  alarm:           { type: 'alert',          severity: 'high',   label: 'alarm triggered' },
};

const classify = (traccarType: string) =>
  EVENT_MAP[traccarType] ?? {
    type: 'info' as NotificationType,
    severity: 'low' as AlertSeverity,
    label: traccarType.replace(/([A-Z])/g, ' $1').trim().toLowerCase(),
  };

const makeId = (ev: TraccarEvent) => `${ev.deviceId}-${ev.type}-${ev.eventTime}`;

const POLLING_INTERVAL = 8000;
const MAX_NOTIFICATIONS = 60;

export function useNotifications(deviceNameMap?: Record<number, string>) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const seenIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  const fetchAndMerge = useCallback(async () => {
    try {
      const events = (await getEvents()) as TraccarEvent[];
      if (!Array.isArray(events)) return;

      const incoming: AppNotification[] = [];

      for (const ev of events) {
        const id = makeId(ev);
        if (seenIds.current.has(id)) continue;
        seenIds.current.add(id);

        const { type, severity, label } = classify(ev.type);
        const deviceName =
          ev.deviceId != null && deviceNameMap
            ? (deviceNameMap[ev.deviceId] ?? `Device ${ev.deviceId}`)
            : `Device ${ev.deviceId ?? 'Unknown'}`;

        const notification: AppNotification = {
          id,
          type,
          severity,
          message: `${deviceName} ${label}`,
          detail: ev.type,
          time: ev.eventTime ? new Date(ev.eventTime) : new Date(),
          deviceId: ev.deviceId,
          read: false,
        };

        incoming.push(notification);

        if (!isFirstLoad.current) {
          if (severity === 'high') {
            toast.error(notification.message, {
              description: notification.time.toLocaleString(),
              duration: 6000,
            });
          } else if (severity === 'medium') {
            toast.warning(notification.message, {
              description: notification.time.toLocaleString(),
              duration: 5000,
            });
          } else {
            toast.info(notification.message, {
              description: notification.time.toLocaleString(),
              duration: 4000,
            });
          }
        }
      }

      if (incoming.length > 0) {
        setNotifications(prev => [...incoming, ...prev].slice(0, MAX_NOTIFICATIONS));
      }

      isFirstLoad.current = false;
    } catch {
      // Notifications are best-effort; suppress errors silently
    }
  }, [deviceNameMap]);

  useEffect(() => {
    fetchAndMerge();
    const id = setInterval(fetchAndMerge, POLLING_INTERVAL);
    return () => clearInterval(id);
  }, [fetchAndMerge]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification, clearAll };
}
