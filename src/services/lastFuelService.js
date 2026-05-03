const ALERT_BACKEND_BASE_URL =
  import.meta.env.VITE_ALERT_BACKEND_URL || "https://backend-traccar.onrender.com";

const asNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const fetchLastFuelByDeviceIds = async (deviceIds = []) => {
  const normalized = deviceIds
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (normalized.length === 0) {
    return new Map();
  }

  const params = new URLSearchParams({
    deviceIds: normalized.join(","),
  });

  const response = await fetch(`${ALERT_BACKEND_BASE_URL}/api/fleet/last-fuel?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch last fuel (${response.status})`);
  }

  const payload = await response.json();
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return new Map(
    items.map((item) => [
      Number(item.deviceId),
      {
        fuel: asNumber(item.fuel),
        fuelLevel: asNumber(item.fuelLevel),
      },
    ])
  );
};

