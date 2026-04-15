import { traccarDelete, traccarGet, traccarGetCollection, traccarPost, traccarPut } from "../api/traccarRequest";

const CIRCLE_RE = /CIRCLE\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*,\s*([-\d.]+)\s*\)/i;
const POLYGON_RE = /POLYGON\s*\(\(\s*(.+)\s*\)\)/i;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isValidLatitude = (value) => Number.isFinite(value) && value >= -90 && value <= 90;
const isValidLongitude = (value) => Number.isFinite(value) && value >= -180 && value <= 180;

/**
 * Traccar geofence area strings are commonly in "lat lon" order.
 * This parser accepts both lat-lon and lon-lat to stay resilient.
 */
const parseCoordinatePair = (first, second) => {
  const a = toNumber(first, NaN);
  const b = toNumber(second, NaN);

  // Preferred interpretation: first=lat, second=lng
  if (isValidLatitude(a) && isValidLongitude(b)) {
    return [b, a]; // [lng, lat]
  }

  // Fallback: first=lng, second=lat
  if (isValidLongitude(a) && isValidLatitude(b)) {
    return [a, b];
  }

  // Last resort: keep existing ordering to avoid dropping data silently
  return [a, b];
};

const parsePolygonCoordinates = (area) => {
  const match = String(area || "").match(POLYGON_RE);
  if (!match?.[1]) return [];
  const coordinates = match[1]
    .split(",")
    .map((pair) => pair.trim().split(/\s+/))
    .filter((pair) => pair.length >= 2)
    .map(([first, second]) => parseCoordinatePair(first, second))
    .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));

  if (coordinates.length < 3) return coordinates;
  const [firstLng, firstLat] = coordinates[0];
  const [lastLng, lastLat] = coordinates[coordinates.length - 1];
  if (firstLng !== lastLng || firstLat !== lastLat) {
    coordinates.push([firstLng, firstLat]);
  }
  return coordinates;
};

const parseArea = (area) => {
  const circleMatch = String(area || "").match(CIRCLE_RE);
  if (circleMatch) {
    const [lng, lat] = parseCoordinatePair(circleMatch[1], circleMatch[2]);
    const radius = Math.max(1, toNumber(circleMatch[3], 100));
    return {
      geometryType: "circle",
      center_lat: lat,
      center_lng: lng,
      radius_meters: radius,
      polygon_coordinates: [],
    };
  }

  const polygonCoords = parsePolygonCoordinates(area);
  if (polygonCoords.length >= 3) {
    const points = polygonCoords.slice(0, -1);
    const safePoints = points.length >= 3 ? points : polygonCoords;
    const sum = safePoints.reduce(
      (acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }),
      { lng: 0, lat: 0 }
    );
    const centerLng = sum.lng / safePoints.length;
    const centerLat = sum.lat / safePoints.length;
    return {
      geometryType: "polygon",
      center_lat: centerLat,
      center_lng: centerLng,
      radius_meters: 0,
      polygon_coordinates: polygonCoords,
    };
  }

  return {
    geometryType: "unknown",
    center_lat: 0,
    center_lng: 0,
    radius_meters: 100,
    polygon_coordinates: [],
  };
};

const buildCircleArea = (centerLng, centerLat, radiusMeters) =>
  // Traccar generally expects CIRCLE(lat lon, radius)
  `CIRCLE (${Number(centerLat)} ${Number(centerLng)}, ${Math.max(1, Number(radiusMeters) || 100)})`;

const buildPolygonArea = (polygonCoordinates = []) => {
  const valid = polygonCoordinates.filter(
    (pair) =>
      Array.isArray(pair) &&
      pair.length >= 2 &&
      isValidLongitude(Number(pair[0])) &&
      isValidLatitude(Number(pair[1]))
  );
  if (valid.length < 3) {
    throw new Error("Polygon requires at least 3 valid points");
  }

  const open = valid.slice();
  const [fLng, fLat] = open[0];
  const [lLng, lLat] = open[open.length - 1];
  if (fLng !== lLng || fLat !== lLat) {
    open.push([fLng, fLat]);
  }

  const pointString = open
    // Traccar commonly expects "lat lon"
    .map(([lng, lat]) => `${Number(lat)} ${Number(lng)}`)
    .join(", ");
  return `POLYGON ((${pointString}))`;
};

const normalizeGeofence = (geofence) => {
  const parsed = parseArea(geofence?.area);
  return {
    id: String(geofence?.id ?? ""),
    rawId: geofence?.id,
    name: geofence?.name ?? "",
    color: geofence?.attributes?.color ?? "#3b82f6",
    is_active: geofence?.attributes?.is_active ?? true,
    created_at: geofence?.createdAt ?? geofence?.created_at ?? "",
    area: geofence?.area ?? "",
    geometryType: parsed.geometryType,
    center_lat: parsed.center_lat,
    center_lng: parsed.center_lng,
    radius_meters: parsed.radius_meters,
    polygon_coordinates: parsed.polygon_coordinates,
    attributes: geofence?.attributes && typeof geofence.attributes === "object" ? geofence.attributes : {},
    calendarId: geofence?.calendarId ?? 0,
    description: geofence?.description ?? "",
  };
};

export const getGeofences = async () =>
  traccarGetCollection({
    url: "/geofences",
    normalize: normalizeGeofence,
  });

export const getGeofenceById = async (geofenceId) => {
  const raw = await traccarGet(`/geofences/${geofenceId}`);
  return normalizeGeofence(raw);
};

export const createGeofence = async ({
  name,
  center_lat,
  center_lng,
  radius_meters,
  polygon_coordinates,
  color = "#3b82f6",
  is_active = true,
}) => {
  const hasPolygonShape =
    Array.isArray(polygon_coordinates) && polygon_coordinates.length >= 3;
  const payload = {
    name: String(name || "").trim(),
    area: hasPolygonShape
      ? buildPolygonArea(polygon_coordinates)
      : buildCircleArea(center_lng, center_lat, radius_meters),
    attributes: {
      color,
      is_active: Boolean(is_active),
    },
  };
  const created = await traccarPost("/geofences", payload);
  return normalizeGeofence(created);
};

export const updateGeofence = async (geofenceId, updates = {}) => {
  const currentRaw = await traccarGet(`/geofences/${geofenceId}`);
  const current = normalizeGeofence(currentRaw);
  const nextName = updates.name != null ? String(updates.name).trim() : current.name;
  const nextIsActive =
    updates.is_active != null ? Boolean(updates.is_active) : Boolean(current.is_active);
  const nextColor = updates.color != null ? String(updates.color) : current.color || "#3b82f6";
  const hasGeometryUpdate =
    updates.center_lat != null && updates.center_lng != null && updates.radius_meters != null;
  const hasPolygonUpdate =
    Array.isArray(updates.polygon_coordinates) && updates.polygon_coordinates.length >= 3;
  const nextArea = hasGeometryUpdate
    ? buildCircleArea(updates.center_lng, updates.center_lat, updates.radius_meters)
    : hasPolygonUpdate
    ? buildPolygonArea(updates.polygon_coordinates)
    : currentRaw?.area;

  const payload = {
    ...currentRaw,
    name: nextName,
    area: nextArea,
    attributes: {
      ...(currentRaw?.attributes && typeof currentRaw.attributes === "object"
        ? currentRaw.attributes
        : {}),
      color: nextColor,
      is_active: nextIsActive,
    },
  };

  const updated = await traccarPut(`/geofences/${geofenceId}`, payload);
  return normalizeGeofence(updated);
};

export const deleteGeofence = async (geofenceId) => {
  await traccarDelete(`/geofences/${geofenceId}`);
};

