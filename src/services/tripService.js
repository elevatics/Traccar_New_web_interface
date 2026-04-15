import { traccarGet } from "../api/traccarRequest";

/**
 * Positions along a route for map — GET /api/reports/route
 * @see https://www.traccar.org/api-reference/
 */
export const getRouteReport = async ({ deviceId, from, to }) => {
  if (!deviceId || !from || !to) {
    throw new Error("deviceId, from, and to are required");
  }
  const qs = new URLSearchParams();
  qs.append("deviceId", String(deviceId));
  qs.set("from", from);
  qs.set("to", to);
  const data = await traccarGet(`/reports/route?${qs.toString()}`);
  return Array.isArray(data) ? data : [];
};

export const positionsToLineCoordinates = (positions) => {
  const out = [];
  for (const p of positions) {
    const lat = Number(p.latitude);
    const lng = Number(p.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      out.push([lng, lat]);
    }
  }
  return out;
};

/** Trips report — GET /api/reports/trips */
export const getTripsReport = async ({ deviceIds, from, to }) => {
  if (!from || !to) {
    throw new Error("from and to are required (ISO 8601)");
  }
  if (!deviceIds?.length) {
    throw new Error("Select at least one device");
  }
  const qs = new URLSearchParams();
  deviceIds.forEach((id) => qs.append("deviceId", String(id)));
  qs.set("from", from);
  qs.set("to", to);
  const data = await traccarGet(`/reports/trips?${qs.toString()}`);
  return Array.isArray(data) ? data : [];
};

export const normalizeTrip = (t) => ({
  deviceId: t.deviceId,
  deviceName: t.deviceName ?? `Device ${t.deviceId}`,
  driverName: t.driverName ?? "",
  driverUniqueId: t.driverUniqueId ?? "",
  startTime: t.startTime,
  endTime: t.endTime,
  startAddress: t.startAddress ?? "",
  endAddress: t.endAddress ?? "",
  startLat: t.startLat,
  startLon: t.startLon,
  endLat: t.endLat,
  endLon: t.endLon,
  distanceM: Number(t.distance) || 0,
  durationSec: Number(t.duration) || 0,
  averageSpeedKnots: Number(t.averageSpeed) || 0,
  maxSpeedKnots: Number(t.maxSpeed) || 0,
  spentFuel: t.spentFuel != null ? Number(t.spentFuel) : null,
});

export const formatDuration = (seconds) => {
  const s = Math.floor(Number(seconds) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export const formatDistanceKm = (meters) => {
  const km = (Number(meters) || 0) / 1000;
  return `${km.toFixed(1)} km`;
};

/** Traccar speeds are in knots */
export const knotsToKmh = (knots) => (Number(knots) || 0) * 1.852;

export const tripRowId = (trip) => `${trip.deviceId}-${trip.startTime}-${trip.endTime}`;
