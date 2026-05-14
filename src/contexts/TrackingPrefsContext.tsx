import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { traccarGet, traccarPut } from "@/api/traccarRequest";
import { toast } from "sonner";

export interface TrackingPrefs {
  distanceUnit: "km" | "mi" | "nm";
  speedUnit: "kmh" | "mph" | "kn";
  fuelUnit: "liters" | "us_gallons" | "imp_gallons";
  volumeUnit: "liters" | "us_gallons" | "imp_gallons" | "cubic_meters";
  coordinateFormat: "decimal" | "dms" | "ddm";
  defaultZoom: number;
  timezone: string;
  showOdometer: boolean;
  showFuelConsumption: boolean;
  showAltitude: boolean;
  autoCenter: boolean;
}

export const DEFAULT_PREFS: TrackingPrefs = {
  distanceUnit: "km",
  speedUnit: "kmh",
  fuelUnit: "liters",
  volumeUnit: "liters",
  coordinateFormat: "decimal",
  defaultZoom: 13,
  timezone: "UTC",
  showOdometer: false,
  showFuelConsumption: false,
  showAltitude: false,
  autoCenter: true,
};

const STORAGE_KEY = "fleet_tracking_prefs";

/** Map Traccar server response → our prefs (only fields Traccar owns). */
function fromServer(server: Record<string, unknown>): Partial<TrackingPrefs> {
  const out: Partial<TrackingPrefs> = {};
  const su = String(server.speedUnit ?? "").toLowerCase();
  if (su === "kmh" || su === "mph" || su === "kn") out.speedUnit = su;
  const du = String(server.distanceUnit ?? "").toLowerCase();
  if (du === "km") out.distanceUnit = "km";
  else if (du === "mi") out.distanceUnit = "mi";
  else if (du === "nmi") out.distanceUnit = "nm";
  const vu = String(server.volumeUnit ?? "").toLowerCase();
  if (vu === "ltr") out.fuelUnit = "liters";
  else if (vu === "usgal") out.fuelUnit = "us_gallons";
  else if (vu === "impgal") out.fuelUnit = "imp_gallons";
  const cf = String(server.coordinateFormat ?? "").toLowerCase();
  if (cf === "dd") out.coordinateFormat = "decimal";
  else if (cf === "dms") out.coordinateFormat = "dms";
  else if (cf === "ddm") out.coordinateFormat = "ddm";
  if (server.timezone && typeof server.timezone === "string") out.timezone = server.timezone;
  return out;
}

/** Our prefs → Traccar server fields for PUT /api/server. */
function toServer(prefs: TrackingPrefs): Record<string, unknown> {
  const distMap: Record<string, string> = { km: "km", mi: "mi", nm: "nmi" };
  const volMap: Record<string, string> = {
    liters: "ltr",
    us_gallons: "usGal",
    imp_gallons: "impGal",
    cubic_meters: "ltr",
  };
  const cfMap: Record<string, string> = { decimal: "dd", dms: "dms", ddm: "ddm" };
  return {
    speedUnit: prefs.speedUnit,
    distanceUnit: distMap[prefs.distanceUnit] ?? "km",
    volumeUnit: volMap[prefs.fuelUnit] ?? "ltr",
    coordinateFormat: cfMap[prefs.coordinateFormat] ?? "dd",
    timezone: prefs.timezone,
  };
}

interface TrackingPrefsCtx {
  prefs: TrackingPrefs;
  savePrefs: (updated: TrackingPrefs) => Promise<void>;
  serverSaving: boolean;
}

const TrackingPrefsContext = createContext<TrackingPrefsCtx>({
  prefs: DEFAULT_PREFS,
  savePrefs: async () => {},
  serverSaving: false,
});

export function TrackingPrefsProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<TrackingPrefs>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
    } catch {}
    return DEFAULT_PREFS;
  });
  const [serverSaving, setServerSaving] = useState(false);

  // On mount: pull unit settings from Traccar server and merge into prefs
  useEffect(() => {
    (traccarGet("/server") as Promise<Record<string, unknown>>)
      .then((server) => {
        const serverPrefs = fromServer(server);
        if (Object.keys(serverPrefs).length > 0) {
          setPrefs((prev) => {
            const merged = { ...prev, ...serverPrefs };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            return merged;
          });
        }
      })
      .catch(() => {
        // Not admin or server unreachable — use localStorage prefs only
      });
  }, []);

  const savePrefs = useCallback(async (updated: TrackingPrefs) => {
    // Immediately apply locally so every component re-renders
    setPrefs(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setServerSaving(true);
    try {
      // Merge into current server settings so we don't clobber unrelated fields
      const current = (await traccarGet("/server")) as Record<string, unknown>;
      await traccarPut("/server", { ...current, ...toServer(updated) });
      toast.success("Preferences saved to Traccar server");
    } catch {
      toast.success("Preferences saved locally (Traccar server sync unavailable)");
    } finally {
      setServerSaving(false);
    }
  }, []);

  return (
    <TrackingPrefsContext.Provider value={{ prefs, savePrefs, serverSaving }}>
      {children}
    </TrackingPrefsContext.Provider>
  );
}

export function useTrackingPrefs() {
  return useContext(TrackingPrefsContext);
}

// ── Unit conversion helpers ─────────────────────────────────────────────────

/** Convert knots to display string using prefs. Pass `suppressDrift=true` when
 *  showing live speed — returns "0" for sub-noise readings. */
export function fmtSpeed(
  knots: number,
  unit: TrackingPrefs["speedUnit"],
  suppressDrift = false
): string {
  if (suppressDrift && knots < 0.5) {
    const label = unit === "mph" ? "mph" : unit === "kn" ? "kn" : "km/h";
    return `0 ${label}`;
  }
  if (unit === "mph") return `${(knots * 1.15078).toFixed(0)} mph`;
  if (unit === "kn") return `${knots.toFixed(1)} kn`;
  return `${(knots * 1.852).toFixed(0)} km/h`;
}

/** Convert metres to display string. */
export function fmtDistance(meters: number, unit: TrackingPrefs["distanceUnit"]): string {
  if (unit === "mi") return `${(meters / 1609.34).toFixed(1)} mi`;
  if (unit === "nm") return `${(meters / 1852).toFixed(1)} nm`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Convert litres to display string. */
export function fmtFuel(liters: number, unit: TrackingPrefs["fuelUnit"]): string {
  if (unit === "us_gallons") return `${(liters * 0.264172).toFixed(2)} gal`;
  if (unit === "imp_gallons") return `${(liters * 0.219969).toFixed(2)} imp gal`;
  return `${liters.toFixed(2)} L`;
}
