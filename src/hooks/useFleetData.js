import { useCallback, useEffect, useRef, useState } from "react";
import { getDevices } from "../services/deviceService";
import { getPositions } from "../services/positionService";
import { mapDeviceData } from "../utils/mapDeviceData";
import { fetchLastFuelByDeviceIds } from "../services/lastFuelService";

/** Minimum gap between the end of one poll and the start of the next.
 *  Intentionally shorter than before so position updates feel near-real-time. */
const POLLING_INTERVAL_MS = 2000;

const isSameFleetData = (previous, next) => {
  if (previous.length !== next.length) {
    return false;
  }

  for (let index = 0; index < previous.length; index += 1) {
    const prevItem = previous[index];
    const nextItem = next[index];

    if (
      prevItem.id !== nextItem.id ||
      prevItem.name !== nextItem.name ||
      prevItem.status !== nextItem.status ||
      prevItem.lat !== nextItem.lat ||
      prevItem.lng !== nextItem.lng ||
      prevItem.speed !== nextItem.speed ||
      prevItem.fuel !== nextItem.fuel ||
      prevItem.fuelLevel !== nextItem.fuelLevel
    ) {
      return false;
    }
  }

  return true;
};

export const useFleetData = () => {
  const [fleetData, setFleetData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fleetDataRef = useRef([]);

  const fetchFleetData = useCallback(async () => {
    try {
      setError(null);

      const [devices, positions] = await Promise.all([
        getDevices(),
        getPositions(),
      ]);

      const mergedData = mapDeviceData(devices, positions);
      const backendFuelByDeviceId = await fetchLastFuelByDeviceIds(
        mergedData.map((item) => item.deviceId)
      ).catch(() => new Map());
      const previousById = new Map(
        fleetDataRef.current.map((item) => [String(item.id), item])
      );
      const hydratedFuelData = mergedData.map((item) => {
        const previous = previousById.get(String(item.id));
        const nextItem = { ...item };

        if (nextItem.fuel <= 0 && previous?.fuel > 0) {
          nextItem.fuel = previous.fuel;
        }

        if (nextItem.fuelLevel <= 0 && previous?.fuelLevel > 0) {
          nextItem.fuelLevel = previous.fuelLevel;
        }

        const backendFuel = backendFuelByDeviceId.get(Number(item.deviceId));
        if (nextItem.fuel <= 0 && Number(backendFuel?.fuel) > 0) {
          nextItem.fuel = Number(backendFuel.fuel);
        }

        if (nextItem.fuelLevel <= 0 && Number(backendFuel?.fuelLevel) > 0) {
          nextItem.fuelLevel = Number(backendFuel.fuelLevel);
        }

        if (nextItem.fuel <= 0 && nextItem.fuelLevel > 0) {
          nextItem.fuel = nextItem.fuelLevel;
        }

        if (nextItem.fuelLevel <= 0 && nextItem.fuel > 0) {
          nextItem.fuelLevel = nextItem.fuel;
        }

        return nextItem;
      });
      if (!isSameFleetData(fleetDataRef.current, hydratedFuelData)) {
        fleetDataRef.current = hydratedFuelData;
        setFleetData(hydratedFuelData);
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        setError("Unauthorized: please login to Elevatics first.");
      } else {
        setError(err?.message || "Failed to fetch fleet data");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let timeoutId = null;

    // Sequential polling: the next request only fires AFTER the previous one
    // finishes, so requests never pile up even when the server is slow.
    const scheduleNext = () => {
      if (!isMounted) return;
      timeoutId = setTimeout(async () => {
        if (!isMounted) return;
        await fetchFleetData();
        scheduleNext();
      }, POLLING_INTERVAL_MS);
    };

    // First load immediately, then keep chaining
    fetchFleetData().then(() => { if (isMounted) scheduleNext(); });

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [fetchFleetData]);

  return {
    fleetData,
    loading,
    error,
    refresh: fetchFleetData,
  };
};

export default useFleetData;
