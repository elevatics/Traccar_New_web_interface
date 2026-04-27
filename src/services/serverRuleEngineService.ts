import type { RuleMetric } from './notificationRulesService';

type FleetDeviceSnapshot = {
  id?: number;
  deviceId?: number;
  name?: string;
  speed?: number;
  status?: string;
};

export type ServerRuleEvent = {
  _id: string;
  deviceId: number;
  deviceName: string;
  metric: 'speed' | 'device_offline' | 'device_online';
  value: string | null;
  message: string;
  source: 'custom' | 'traccar';
  eventTime: string;
  whatsappSid?: string | null;
  whatsappStatus?: string | null;
};

const ALERT_BACKEND_URL =
  import.meta.env.VITE_ALERT_BACKEND_URL || 'https://backend-traccar.onrender.com';

export const upsertServerRule = async ({
  deviceId,
  vehicleName,
  metric,
  limit,
  enabled,
}: {
  deviceId: number;
  vehicleName: string;
  metric: RuleMetric;
  limit: number | null;
  enabled: boolean;
}) => {
  try {
    await fetch(`${ALERT_BACKEND_URL}/api/rules/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, vehicleName, metric, limit, enabled }),
    });
  } catch {
    // server sync is best-effort; local rule still works for bell UI
  }
};

export const evaluateRulesOnServer = async (devices: FleetDeviceSnapshot[]) => {
  if (!Array.isArray(devices) || devices.length === 0) return;
  try {
    await fetch(`${ALERT_BACKEND_URL}/api/rules/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        devices: devices.map((d) => ({
          deviceId: Number(d.deviceId ?? d.id ?? -1),
          name: d.name ?? '',
          speed: Number(d.speed ?? 0),
          status: String(d.status ?? '').toLowerCase() || 'unknown',
        })),
      }),
    });
  } catch {
    // do not block UI behavior on backend availability
  }
};

export const fetchServerRuleEvents = async (limit = 60): Promise<ServerRuleEvent[]> => {
  try {
    const response = await fetch(
      `${ALERT_BACKEND_URL}/api/rules/events?limit=${encodeURIComponent(String(limit))}`
    );
    if (!response.ok) return [];
    const data = (await response.json()) as { events?: ServerRuleEvent[] };
    return Array.isArray(data.events) ? data.events : [];
  } catch {
    return [];
  }
};
