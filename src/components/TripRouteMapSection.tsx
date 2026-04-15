import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import TripRouteMap from "@/components/TripRouteMap";
import { getRouteReport, positionsToLineCoordinates } from "@/services/tripService";

export type TripForMap = {
  deviceId: number;
  startTime: string;
  endTime: string;
  startLat?: number | null;
  startLon?: number | null;
  endLat?: number | null;
  endLon?: number | null;
};

type TripRouteMapSectionProps = {
  trip: TripForMap;
  accessToken: string;
};

function tripEndpointsLine(trip: TripForMap): [number, number][] {
  const slat = Number(trip.startLat);
  const slon = Number(trip.startLon);
  const elat = Number(trip.endLat);
  const elon = Number(trip.endLon);
  const a: [number, number][] = [];
  if (Number.isFinite(slon) && Number.isFinite(slat)) {
    a.push([slon, slat]);
  }
  if (Number.isFinite(elon) && Number.isFinite(elat)) {
    a.push([elon, elat]);
  }
  return a;
}

/**
 * Fetches /api/reports/route for the trip window and renders Mapbox path.
 */
export default function TripRouteMapSection({ trip, accessToken }: TripRouteMapSectionProps) {
  const [coords, setCoords] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setUsedFallback(false);
      try {
        const positions = await getRouteReport({
          deviceId: trip.deviceId,
          from: trip.startTime,
          to: trip.endTime,
        });
        if (cancelled) return;
        const line = positionsToLineCoordinates(positions);
        if (line.length >= 2) {
          setCoords(line);
        } else {
          const fallback = tripEndpointsLine(trip);
          if (fallback.length >= 2) {
            setCoords(fallback);
            setUsedFallback(true);
          } else {
            setCoords([]);
          }
        }
      } catch {
        if (!cancelled) {
          setError("Could not load route from Traccar");
          const fallback = tripEndpointsLine(trip);
          if (fallback.length >= 2) {
            setCoords(fallback);
            setUsedFallback(true);
          } else {
            setCoords([]);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trip.deviceId, trip.startTime, trip.endTime, trip.startLat, trip.startLon, trip.endLat, trip.endLon]);

  if (!accessToken) {
    return (
      <p className="text-sm text-muted-foreground">
        Set <code className="text-xs">VITE_MAPBOX_TOKEN</code> in your env to view the map.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 rounded-md border bg-muted/20 text-muted-foreground text-sm">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading route…
      </div>
    );
  }

  if (error && coords.length < 2) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (coords.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        No GPS path in this period (no route points and no start/end coordinates on the trip).
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {usedFallback && (
        <p className="text-xs text-muted-foreground">
          Showing straight line between trip start and end (sparse or missing route points in Traccar).
        </p>
      )}
      <TripRouteMap accessToken={accessToken} coordinates={coords} />
    </div>
  );
}
