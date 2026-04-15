import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { cn } from "@/lib/utils";

type TripRouteMapProps = {
  accessToken: string;
  /** [lng, lat][] */
  coordinates: [number, number][];
  className?: string;
};

/**
 * Single trip path on Mapbox (line + start/end emphasis via line only).
 */
export default function TripRouteMap({ accessToken, coordinates, className }: TripRouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !accessToken) {
      return;
    }

    mapboxgl.accessToken = accessToken;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: coordinates[0] || [-98.5, 39.8],
      zoom: coordinates.length >= 2 ? 10 : 4,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    let cancelled = false;
    const applyRoute = () => {
      if (cancelled) return;
      const coords = coordinates.filter((c) => Number.isFinite(c[0]) && Number.isFinite(c[1]));
      if (coords.length === 0) {
        return;
      }

      if (map.getLayer("trip-route-line")) {
        map.removeLayer("trip-route-line");
      }
      if (map.getSource("trip-route")) {
        map.removeSource("trip-route");
      }

      const geojson = {
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "LineString" as const,
          coordinates: coords,
        },
      };

      map.addSource("trip-route", {
        type: "geojson",
        data: geojson,
      });

      map.addLayer({
        id: "trip-route-line",
        type: "line",
        source: "trip-route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#2563eb",
          "line-width": 4,
          "line-opacity": 0.9,
        },
      });

      if (coords.length >= 2) {
        const bounds = new mapboxgl.LngLatBounds(coords[0], coords[0]);
        coords.forEach((c) => bounds.extend(c));
        map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 0 });
      } else {
        map.setCenter(coords[0]);
        map.setZoom(12);
      }
    };

    if (map.loaded()) {
      applyRoute();
    } else {
      map.once("load", applyRoute);
    }

    return () => {
      cancelled = true;
      map.off("load", applyRoute);
      map.remove();
    };
  }, [accessToken, coordinates]);

  if (!accessToken) {
    return (
      <div
        className={cn(
          "flex h-64 items-center justify-center rounded-md border bg-muted/30 text-center text-sm text-muted-foreground",
          className
        )}
      >
        Add <code className="text-xs">VITE_MAPBOX_TOKEN</code> to show the map.
      </div>
    );
  }

  return <div ref={containerRef} className={cn("h-64 w-full min-h-[240px] rounded-md overflow-hidden", className)} />;
}
