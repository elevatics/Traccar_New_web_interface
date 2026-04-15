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

/**
 * Traccar ReportTrips.duration is documented as seconds, but some servers/versions
 * return milliseconds. Pick seconds vs ms/1000 by best match to start/end wall time.
 */
export const normalizeDurationSec = (t) => {
  const raw = Number(t.duration);
  if (!Number.isFinite(raw) || raw <= 0) {
    return 0;
  }
  const start = Date.parse(t.startTime);
  const end = Date.parse(t.endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return raw > 1e7 ? Math.round(raw / 1000) : Math.round(raw);
  }
  const spanSec = (end - start) / 1000;
  const asSeconds = raw;
  const fromMillis = raw / 1000;
  const tol = Math.max(60, spanSec * 0.08);
  const errSec = Math.abs(asSeconds - spanSec);
  const errMs = Math.abs(fromMillis - spanSec);
  if (fromMillis > 0 && errMs <= errSec && errMs <= tol) {
    return Math.round(fromMillis);
  }
  if (errSec <= tol) {
    return Math.round(asSeconds);
  }
  if (spanSec > 120 && asSeconds > spanSec * 50) {
    return Math.round(fromMillis);
  }
  return Math.round(asSeconds);
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
  durationSec: normalizeDurationSec(t),
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
