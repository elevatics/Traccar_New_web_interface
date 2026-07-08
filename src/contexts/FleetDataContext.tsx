import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Vehicle } from '@/types/vehicle';
import useFleetData from '@/hooks/useFleetData';
import { mapFleetToVehicles, FleetDataItem } from '@/utils/mapFleetToVehicles';
import { getNotificationRules } from '@/services/notificationRulesService';

interface FleetDataContextValue {
  /** Typed Vehicle array ready for UI consumption (nested location object). */
  vehicles: Vehicle[];
  /**
   * Raw flat telemetry records from the Traccar poll.
   * Use this when you need fields not on the Vehicle type (e.g. fuelConsumption
   * for charting, totalDistance for finance calculations, etc.).
   */
  fleetData: FleetDataItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Unix ms timestamp for when each vehicle (by string id) entered idle state. */
  idleStartTimes: Record<string, number>;
}

const FleetDataContext = createContext<FleetDataContextValue | null>(null);

/**
 * Provides a single shared Traccar polling loop to the entire protected-route
 * tree. Replaces the previous pattern of calling useFleetData() independently
 * in every consuming component, which caused N×2s concurrent network polls.
 *
 * Mount this once inside ProtectedRoutes (post-auth) so the poll only runs
 * while the user is logged in.
 */
export function FleetDataProvider({ children }: { children: ReactNode }) {
  const { fleetData: rawData, loading, error, refresh } = useFleetData();

  const fleetData = rawData as FleetDataItem[];
  const vehicles = useMemo(() => mapFleetToVehicles(fleetData), [fleetData]);

  // ── Idle time tracking ──────────────────────────────────────────────────────
  const [idleStartTimes, setIdleStartTimes] = useState<Record<string, number>>({});

  useEffect(() => {
    const now = Date.now();
    setIdleStartTimes((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const item of fleetData) {
        const key = item.id;
        if (item.status === 'idle') {
          if (!next[key]) { next[key] = now; changed = true; }
        } else {
          if (next[key] !== undefined) { delete next[key]; changed = true; }
        }
      }
      return changed ? next : prev;
    });
  }, [fleetData]);

  // ── Local rule evaluation: idle_time + low_fuel ─────────────────────────────
  const firedIdleRef = useRef<Set<string>>(new Set());
  const firedFuelRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const rules = getNotificationRules();

    for (const rule of rules) {
      if (!rule.enabled || rule.limit === null) continue;

      if (rule.metric === 'idle_time') {
        const key = String(rule.deviceId);
        const idleStart = idleStartTimes[key];
        if (!idleStart) {
          firedIdleRef.current.delete(key);
          continue;
        }
        const idleMinutes = (Date.now() - idleStart) / 60000;
        if (idleMinutes >= rule.limit && !firedIdleRef.current.has(key)) {
          firedIdleRef.current.add(key);
          toast.warning(`${rule.vehicleName} idle for ${Math.round(idleMinutes)} min`, {
            description: `Idle alert: threshold ${rule.limit} min`,
            duration: 8000,
          });
        }
      }

      if (rule.metric === 'low_fuel') {
        const key = String(rule.deviceId);
        const device = fleetData.find((v) => v.deviceId === rule.deviceId);
        if (!device) continue;
        const fuel = device.fuel > 0 ? device.fuel : device.fuelLevel;
        if (fuel <= rule.limit && !firedFuelRef.current.has(key)) {
          firedFuelRef.current.add(key);
          toast.warning(`${rule.vehicleName} fuel low: ${fuel.toFixed(0)}%`, {
            description: `Below ${rule.limit}% threshold`,
            duration: 8000,
          });
        } else if (fuel > rule.limit + 5) {
          firedFuelRef.current.delete(key);
        }
      }
    }
  }, [fleetData, idleStartTimes]);

  // ── Error toast ─────────────────────────────────────────────────────────────
  // Show a non-blocking toast on first error; dismiss automatically when poll recovers.
  const errorToastIdRef = useRef<string | number | null>(null);
  useEffect(() => {
    if (error && !loading) {
      if (!errorToastIdRef.current) {
        errorToastIdRef.current = toast.error('Fleet data unavailable', {
          description: error,
          duration: Infinity,
          action: { label: 'Retry', onClick: () => void refresh() },
        });
      }
    } else if (!error && errorToastIdRef.current) {
      toast.dismiss(errorToastIdRef.current);
      errorToastIdRef.current = null;
    }
  }, [error, loading, refresh]);

  const value = useMemo<FleetDataContextValue>(
    () => ({ vehicles, fleetData, loading, error, refresh, idleStartTimes }),
    [vehicles, fleetData, loading, error, refresh, idleStartTimes]
  );

  return (
    <FleetDataContext.Provider value={value}>
      {children}
    </FleetDataContext.Provider>
  );
}

/**
 * Consumes the shared fleet data context.
 * Must be used inside a component tree wrapped by <FleetDataProvider>.
 */
export function useFleetDataContext(): FleetDataContextValue {
  const ctx = useContext(FleetDataContext);
  if (!ctx) {
    throw new Error('useFleetDataContext must be called inside <FleetDataProvider>');
  }
  return ctx;
}
