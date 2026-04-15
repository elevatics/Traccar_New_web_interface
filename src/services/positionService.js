import { traccarGet, traccarGetCollection } from "../api/traccarRequest";

const ADDRESS_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_GEOCODE_LOOKUPS_PER_POLL = 50;
const addressCache = new Map();

const normalizePosition = (position) => ({
  deviceId: position.deviceId,
  latitude: position.latitude,
  longitude: position.longitude,
  speed: position.speed,
  course: position.course,
  altitude: position.altitude,
  accuracy: position.accuracy,
  address: position.address,
  attributes: position.attributes ?? {},
  serverTime: position.serverTime,
  deviceTime: position.deviceTime,
  fixTime: position.fixTime,
  outdated: Boolean(position.outdated),
  valid: position.valid !== false,
});

const getCoordinateKey = (latitude, longitude) =>
  `${Number(latitude).toFixed(4)},${Number(longitude).toFixed(4)}`;

const getCachedAddress = (cacheKey) => {
  const cached = addressCache.get(cacheKey);
  if (!cached) {
    return null;
  }

  if (Date.now() - cached.timestamp > ADDRESS_CACHE_TTL_MS) {
    addressCache.delete(cacheKey);
    return null;
  }

  return cached.address;
};

const setCachedAddress = (cacheKey, address) => {
  addressCache.set(cacheKey, {
    address,
    timestamp: Date.now(),
  });
};

const reverseGeocode = async (latitude, longitude) => {
  try {
    const geocodeResult = await traccarGet("/server/geocode", {
      params: { latitude, longitude },
    });
    if (typeof geocodeResult === "string") {
      return geocodeResult;
    }
    if (geocodeResult && typeof geocodeResult.address === "string") {
      return geocodeResult.address;
    }
    return null;
  } catch (error) {
    console.warn("[Traccar Positions] Reverse geocode failed:", error?.message);
    return null;
  }
};

const enrichMissingAddresses = async (positions) => {
  const candidates = positions
    .filter((position) => !position.address)
    .slice(0, MAX_GEOCODE_LOOKUPS_PER_POLL);

  await Promise.all(
    candidates.map(async (position) => {
      const cacheKey = getCoordinateKey(position.latitude, position.longitude);
      const cachedAddress = getCachedAddress(cacheKey);
      if (cachedAddress) {
        position.address = cachedAddress;
        return;
      }

      const address = await reverseGeocode(position.latitude, position.longitude);
      if (address) {
        position.address = address;
        setCachedAddress(cacheKey, address);
      }
    })
  );

  return positions;
};

export const getPositions = async () => {
  const positions = await traccarGetCollection({
    url: "/positions",
    normalize: normalizePosition,
    emptyMessage:
      "[Traccar Positions] Empty response from GET /positions. Some Traccar setups require id/deviceId/from/to query params.",
  });

  return enrichMissingAddresses(positions);
};
