type AlertPayload = {
  deviceId: number | null;
  deviceName: string;
  metric: string;
  value?: string | number | null;
  message: string;
  source: 'custom' | 'traccar';
};

const ALERT_BACKEND_URL =
  import.meta.env.VITE_ALERT_BACKEND_URL || 'https://backend-traccar.onrender.com';

export const sendWhatsappAlert = async (payload: AlertPayload) => {
  try {
    await fetch(`${ALERT_BACKEND_URL}/api/alerts/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // WhatsApp delivery is best-effort; keep UI alerts independent.
  }
};
