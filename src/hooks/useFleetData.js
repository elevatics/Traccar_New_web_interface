import { useCallback, useEffect, useRef, useState } from "react";
import { getDevices } from "../services/deviceService";
import { getPositions } from "../services/positionService";
import { mapDeviceData } from "../utils/mapDeviceData";

const POLLING_INTERVAL_MS = 5000;

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
      prevItem.speed !== nextItem.speed
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
      if (!isSameFleetData(fleetDataRef.current, mergedData)) {
        fleetDataRef.current = mergedData;
        setFleetData(mergedData);
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        setError("Unauthorized: please login to Traccar first.");
      } else {
        setError(err?.message || "Failed to fetch fleet data");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!isMounted) {
        return;
      }

      await fetchFleetData();
    };

    loadData();
    const intervalId = setInterval(loadData, POLLING_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
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
