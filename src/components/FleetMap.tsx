import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useTheme } from 'next-themes';
import { Vehicle } from '@/types/vehicle';
import { Button } from '@/components/ui/button';
import { Map as MapIcon, Satellite, Layers, Locate } from 'lucide-react';
import { cn } from '@/lib/utils';
import VehicleDetailCard from './VehicleDetailCard';
import VehicleAIChat from './VehicleAIChat';
import { useFleetDataContext } from '@/contexts/FleetDataContext';
import { useTrackingPrefs } from '@/contexts/TrackingPrefsContext';
import { US_MAP_VIEW } from '@/utils/mapDefaults';
import {
  buildFleetVehiclesGeoJSON,
  ensureFleetVehicleLayers,
  FLEET_VEHICLES_LAYER,
  FLEET_VEHICLES_SOURCE,
  setFleetVehiclesData,
} from '@/utils/vehicleMapMarker';

interface FleetMapProps {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  onSelectVehicle: (vehicle: Vehicle) => void;
  onClearSelection: () => void;
  apiToken: string;
  /** Optional live trip route to draw as a polyline on the map */
  liveRoute?: { lat: number; lng: number }[];
  /** ID of the vehicle currently being tracked — gets a pulse ring on the car marker */
  trackedVehicleId?: string;
  /** Per-page sessionStorage key so dashboard and fleet maps do not share camera state */
  mapStorageKey?: string;
  /** When true, the map continuously pans to follow the tracked vehicle on each data update */
  followTracked?: boolean;
  /**
   * Real-time position override for the tracked vehicle.
   * Supplied by a 1-second fast-poll in Fleet.tsx so the marker and the map
   * pan update at 1 s instead of waiting for the 2 s general poll.
   */
  trackedVehiclePosition?: { lat: number; lng: number; course: number } | null;
  /**
   * Per-vehicle tail trails for ALL online+moving vehicles.
   * Key = vehicle id, value = ordered array of {lat,lng} positions.
   * When provided, a blue polyline is drawn for every entry with ≥2 points.
   */
  allVehicleTails?: Record<string, { lat: number; lng: number }[]>;
}

type MapStyle = 'streets' | 'satellite' | 'traffic';

/** Mapbox style URL for the selected basemap + app color theme. */
function resolveMapStyleUrl(style: MapStyle, isDark: boolean): string {
  if (style === 'satellite') return 'mapbox://styles/mapbox/satellite-streets-v12';
  if (isDark) return 'mapbox://styles/mapbox/dark-v11';
  return 'mapbox://styles/mapbox/streets-v12';
}

function isDocumentDark(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
}

/** Allow fitBounds to zoom in enough that nearby vehicles separate on screen. */
const FLEET_FIT_MAX_ZOOM = 16;

type FleetPoint = {
  id: string | number;
  deviceId?: number;
  protocol?: string;
  name: string;
  plateNumber?: string;
  driver?: string;
  status: string;
  address?: string;
  lat: number;
  lng: number;
  speed: number;
  serverTime?: string | null;
  deviceTime?: string | null;
  fixTime?: string | null;
  lastUpdate?: string | null;
  fuelLevel?: number;
  odometer?: number;
  outdated?: boolean;
  valid?: boolean;
  altitude?: number;
  course?: number;
  accuracy?: number;
  network?: string;
  geofenceIds?: string;
  tripOdometer?: number;
  fuelConsumption?: number;
  ignition?: boolean;
  statusCode?: number;
  coolantTemp?: number;
  mapIntake?: number;
  rpm?: number;
  obdSpeed?: number;
  intakeTemp?: number;
  fuel?: number;
  distance?: number;
  totalDistance?: number;
  motion?: boolean;
};

const DEFAULT_FLEET_MAP_VIEW_STORAGE_KEY = 'fleet_map_last_view';

function readStoredFleetMapView(storageKey: string): { center: [number, number]; zoom: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const o = JSON.parse(raw) as { center?: unknown; zoom?: unknown };
    if (
      Array.isArray(o.center) &&
      o.center.length === 2 &&
      typeof o.center[0] === 'number' &&
      typeof o.center[1] === 'number' &&
      typeof o.zoom === 'number' &&
      Number.isFinite(o.center[0]) &&
      Number.isFinite(o.center[1]) &&
      Number.isFinite(o.zoom)
    ) {
      const [lng, lat] = o.center;
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
      return { center: [lng, lat], zoom: Math.min(18, Math.max(4, o.zoom)) };
    }
  } catch {
    // ignore invalid JSON
  }
  return null;
}

function persistFleetMapView(mapInstance: mapboxgl.Map, storageKey: string) {
  const z = mapInstance.getZoom();
  // Avoid persisting the default whole-earth view before fleet data fits the map
  if (z < 4) return;
  try {
    const c = mapInstance.getCenter();
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({ center: [c.lng, c.lat], zoom: z })
    );
  } catch {
    // quota / private mode
  }
}

type LatLng = { lat: number; lng: number };

function filterValidCoords(coords: LatLng[]): LatLng[] {
  return coords.filter(
    ({ lat, lng }) =>
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180 &&
      !(lat === 0 && lng === 0)
  );
}

/** Rough center/zoom before Map has fitBounds (first paint, no sessionStorage). */
function approximateViewFromCoords(coords: LatLng[]): { center: [number, number]; zoom: number } | null {
  const pts = filterValidCoords(coords);
  if (pts.length === 0) return null;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  pts.forEach(({ lat, lng }) => {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  });
  const center: [number, number] = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
  const latSpan = Math.max(1e-6, maxLat - minLat);
  const lngSpan = Math.max(1e-6, maxLng - minLng);
  const span = Math.max(latSpan, lngSpan, pts.length === 1 ? 0.06 : 0);
  const zoom =
    span > 40
      ? 3.5
      : span > 20
        ? 4.5
        : span > 10
          ? 5.5
          : span > 5
            ? 6.5
            : span > 2
              ? 7.5
              : span > 1
                ? 8.5
                : span > 0.5
                  ? 9.5
                  : span > 0.2
                    ? 10.5
                    : span > 0.1
                      ? 12
                      : span > 0.05
                        ? 13.5
                        : span > 0.02
                          ? 14.5
                          : span > 0.01
                            ? 15.5
                            : 16;
  return { center, zoom: Math.min(FLEET_FIT_MAX_ZOOM, Math.max(4, zoom)) };
}

const toVehicleStatus = (status?: string): Vehicle['status'] => {
  if (status === 'online' || status === 'idle' || status === 'offline') {
    return status;
  }
  return 'offline';
};

const createFallbackVehicle = (fleetVehicle: FleetPoint): Vehicle => {
  const nowIso = new Date().toISOString();

  return {
    id: String(fleetVehicle.id),
    deviceId: Number(fleetVehicle.deviceId ?? fleetVehicle.id) || 0,
    protocol: fleetVehicle.protocol || 'elevatics iot platform',
    name: fleetVehicle.name || 'Unknown Device',
    plateNumber: fleetVehicle.plateNumber || '-',
    driver: fleetVehicle.driver || '-',
    status: toVehicleStatus(fleetVehicle.status),
    location: {
      lat: Number(fleetVehicle.lat) || 0,
      lng: Number(fleetVehicle.lng) || 0,
      address: fleetVehicle.address || 'Live location',
    },
    speed: Number(fleetVehicle.speed) || 0,
    serverTime: fleetVehicle.serverTime || nowIso,
    deviceTime: fleetVehicle.deviceTime || nowIso,
    fixTime: fleetVehicle.fixTime || nowIso,
    lastUpdate: fleetVehicle.lastUpdate || nowIso,
    fuelLevel: Number(fleetVehicle.fuelLevel) || 0,
    odometer: Number(fleetVehicle.odometer) || 0,
    outdated: Boolean(fleetVehicle.outdated),
    valid: fleetVehicle.valid !== false,
    altitude: Number(fleetVehicle.altitude) || 0,
    course: Number(fleetVehicle.course) || 0,
    accuracy: Number(fleetVehicle.accuracy) || 0,
    network: fleetVehicle.network,
    geofenceIds: fleetVehicle.geofenceIds,
    tripOdometer: Number(fleetVehicle.tripOdometer) || 0,
    fuelConsumption: Number(fleetVehicle.fuelConsumption) || 0,
    ignition: Boolean(fleetVehicle.ignition),
    statusCode: Number(fleetVehicle.statusCode) || 0,
    coolantTemp: fleetVehicle.coolantTemp,
    mapIntake: fleetVehicle.mapIntake,
    rpm: fleetVehicle.rpm,
    obdSpeed: fleetVehicle.obdSpeed,
    intakeTemp: fleetVehicle.intakeTemp,
    fuel: Number(fleetVehicle.fuel) || 0,
    distance: Number(fleetVehicle.distance) || 0,
    totalDistance: Number(fleetVehicle.totalDistance) || 0,
    motion: Boolean(fleetVehicle.motion),
  };
};

const LIVE_ROUTE_SOURCE = 'live-trip-route-src';
const LIVE_ROUTE_LAYER  = 'live-trip-route-line';
const ALL_TAILS_SOURCE  = 'all-vehicle-tails-src';
const ALL_TAILS_LAYER   = 'all-vehicle-tails-line';
const ALL_TAILS_GLOW    = 'all-vehicle-tails-glow';

const FleetMap = ({
  vehicles,
  selectedVehicle,
  onSelectVehicle,
  onClearSelection,
  apiToken,
  liveRoute,
  trackedVehicleId,
  mapStorageKey = DEFAULT_FLEET_MAP_VIEW_STORAGE_KEY,
  followTracked = false,
  trackedVehiclePosition = null,
  allVehicleTails,
}: FleetMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  /** Latest selectable Vehicle objects keyed by id (for symbol-layer clicks). */
  const vehicleClickDataRef = useRef<Record<string, Vehicle>>({});
  /** Latest geo points used to patch tracked vehicle without full rebuild. */
  const fleetPointsRef = useRef<FleetPoint[]>([]);
  /** True after we've run fitBounds for live Traccar positions (once per map instance unless re-center). */
  const hasFittedLiveFleet = useRef(false);
  /** One-time framing from parent `vehicles` while API positions are still loading. */
  const hasFittedVehiclePreview = useRef(false);
  /** Last Mapbox style URL applied — skip redundant setStyle that would reset camera. */
  const lastStyleUrlRef = useRef<string | null>(null);
  /** Tracks mapStyle + dark so we reload when either changes (including traffic overlay). */
  const appliedStyleKeyRef = useRef<string | null>(null);
  const vehiclesForInitRef = useRef(vehicles);
  vehiclesForInitRef.current = vehicles;
  const { resolvedTheme } = useTheme();
  const [mapStyle, setMapStyle] = useState<MapStyle>('streets');
  const [cardPosition, setCardPosition] = useState<{ x: number; y: number } | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiChatVehicle, setAiChatVehicle] = useState<Vehicle | null>(null);
  const [aiChatPosition, setAiChatPosition] = useState<{ x: number; y: number } | null>(null);
  const [isAiChatDragging, setIsAiChatDragging] = useState(false);
  const [aiChatDragOffset, setAiChatDragOffset] = useState({ x: 0, y: 0 });
  const aiChatWrapperRef = useRef<HTMLDivElement>(null);
  const { fleetData } = useFleetDataContext();
  const { prefs } = useTrackingPrefs();
  const vehiclesById = useMemo(
    () =>
      new Map(vehicles.map((vehicle) => [String(vehicle.id), vehicle])),
    [vehicles]
  );
  
  useEffect(() => {
    if (selectedVehicle) {
      setCardPosition(null);
    }
  }, [selectedVehicle]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isAiChatDragging) return;
      const wrapper = aiChatWrapperRef.current;
      const mapRoot = wrapper?.closest('.fleet-map-root') as HTMLElement | null;
      if (!wrapper || !mapRoot) return;

      const rootRect = mapRoot.getBoundingClientRect();
      const nextX = e.clientX - rootRect.left - aiChatDragOffset.x;
      const nextY = e.clientY - rootRect.top - aiChatDragOffset.y;
      const maxX = rootRect.width - wrapper.offsetWidth;
      const maxY = rootRect.height - wrapper.offsetHeight;

      setAiChatPosition({
        x: Math.max(0, Math.min(nextX, maxX)),
        y: Math.max(0, Math.min(nextY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsAiChatDragging(false);
    };

    if (isAiChatDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [aiChatDragOffset, isAiChatDragging]);

  const handleAiChatDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, textarea, a, [role="tab"], [role="tablist"]')) {
      return;
    }
    const wrapper = aiChatWrapperRef.current;
    const mapRoot = wrapper?.closest('.fleet-map-root') as HTMLElement | null;
    if (!wrapper || !mapRoot) return;
    const rect = wrapper.getBoundingClientRect();
    const rootRect = mapRoot.getBoundingClientRect();
    setAiChatPosition((prev) => prev ?? { x: rect.left - rootRect.left, y: rect.top - rootRect.top });
    setAiChatDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsAiChatDragging(true);
  };

  useEffect(() => {
    if (!mapContainer.current || !apiToken) return;

    hasFittedLiveFleet.current = false;
    hasFittedVehiclePreview.current = false;

    mapboxgl.accessToken = apiToken;

    const vehicleBootstrap = approximateViewFromCoords(
      vehiclesForInitRef.current.map((v) => ({
        lat: v.location.lat,
        lng: v.location.lng,
      }))
    );
    const storedView = readStoredFleetMapView(mapStorageKey);
    const bootstrapView = vehicleBootstrap ?? storedView ?? US_MAP_VIEW;
    const initialDark = isDocumentDark();
    const initialStyleUrl = resolveMapStyleUrl('streets', initialDark);
    lastStyleUrlRef.current = initialStyleUrl;
    appliedStyleKeyRef.current = `streets:${initialDark}`;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: initialStyleUrl,
      center: bootstrapView.center,
      zoom: bootstrapView.zoom,
      pitch: 0,
    });

    let persistTimer: ReturnType<typeof setTimeout> | null = null;
    const schedulePersistView = () => {
      if (persistTimer) clearTimeout(persistTimer);
      persistTimer = setTimeout(() => {
        if (map.current) persistFleetMapView(map.current, mapStorageKey);
      }, 500);
    };
    map.current.on('moveend', schedulePersistView);
    map.current.on('load', () => {
      requestAnimationFrame(() => map.current?.resize());
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    return () => {
      if (persistTimer) clearTimeout(persistTimer);
      map.current?.off('moveend', schedulePersistView);
      map.current?.remove();
    };
  }, [apiToken, mapStorageKey]);

  useEffect(() => {
    if (!map.current || !mapContainer.current) return;

    const resizeMap = () => {
      map.current?.resize();
    };

    const resizeObserver = new ResizeObserver(() => {
      resizeMap();
    });

    resizeObserver.observe(mapContainer.current);
    window.addEventListener('resize', resizeMap);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', resizeMap);
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    const mapInstance = map.current;

    const clickData: Record<string, Vehicle> = {};
    const points: FleetPoint[] = [];

    (fleetData as FleetPoint[]).forEach((fleetVehicle) => {
      const markerId = String(fleetVehicle.id);
      const matchedVehicle = vehiclesById.get(markerId);
      const selectedVehicleData = matchedVehicle
        ? {
            ...matchedVehicle,
            deviceId: Number(fleetVehicle.deviceId ?? matchedVehicle.deviceId),
            protocol: fleetVehicle.protocol || matchedVehicle.protocol,
            plateNumber: fleetVehicle.plateNumber || matchedVehicle.plateNumber,
            driver: fleetVehicle.driver || matchedVehicle.driver,
            status: toVehicleStatus(fleetVehicle.status),
            speed: Number(fleetVehicle.speed) || 0,
            location: {
              ...matchedVehicle.location,
              lat: Number(fleetVehicle.lat) || 0,
              lng: Number(fleetVehicle.lng) || 0,
              address: fleetVehicle.address || matchedVehicle.location.address,
            },
            serverTime: fleetVehicle.serverTime || matchedVehicle.serverTime,
            deviceTime: fleetVehicle.deviceTime || matchedVehicle.deviceTime,
            fixTime: fleetVehicle.fixTime || matchedVehicle.fixTime,
            lastUpdate: fleetVehicle.lastUpdate || matchedVehicle.lastUpdate,
            fuelLevel: Number(fleetVehicle.fuelLevel ?? matchedVehicle.fuelLevel) || 0,
            odometer: Number(fleetVehicle.odometer ?? matchedVehicle.odometer) || 0,
            outdated: fleetVehicle.outdated ?? matchedVehicle.outdated,
            valid: fleetVehicle.valid ?? matchedVehicle.valid,
            altitude: Number(fleetVehicle.altitude ?? matchedVehicle.altitude) || 0,
            course: Number(fleetVehicle.course ?? matchedVehicle.course) || 0,
            accuracy: Number(fleetVehicle.accuracy ?? matchedVehicle.accuracy) || 0,
            network: fleetVehicle.network ?? matchedVehicle.network,
            geofenceIds: fleetVehicle.geofenceIds ?? matchedVehicle.geofenceIds,
            tripOdometer:
              Number(fleetVehicle.tripOdometer ?? matchedVehicle.tripOdometer) || 0,
            fuelConsumption:
              Number(
                fleetVehicle.fuelConsumption ?? matchedVehicle.fuelConsumption
              ) || 0,
            ignition: fleetVehicle.ignition ?? matchedVehicle.ignition,
            statusCode:
              Number(fleetVehicle.statusCode ?? matchedVehicle.statusCode) || 0,
            coolantTemp: fleetVehicle.coolantTemp ?? matchedVehicle.coolantTemp,
            mapIntake: fleetVehicle.mapIntake ?? matchedVehicle.mapIntake,
            rpm: fleetVehicle.rpm ?? matchedVehicle.rpm,
            obdSpeed: fleetVehicle.obdSpeed ?? matchedVehicle.obdSpeed,
            intakeTemp: fleetVehicle.intakeTemp ?? matchedVehicle.intakeTemp,
            fuel: Number(fleetVehicle.fuel ?? matchedVehicle.fuel) || 0,
            distance: Number(fleetVehicle.distance ?? matchedVehicle.distance) || 0,
            totalDistance:
              Number(fleetVehicle.totalDistance ?? matchedVehicle.totalDistance) || 0,
            motion: fleetVehicle.motion ?? matchedVehicle.motion,
          }
        : createFallbackVehicle(fleetVehicle);

      clickData[markerId] = selectedVehicleData;
      points.push(fleetVehicle);
    });

    vehicleClickDataRef.current = clickData;
    fleetPointsRef.current = points;

    const geojson = buildFleetVehiclesGeoJSON(points, trackedVehicleId);

    let cancelled = false;
    const sync = async () => {
      await ensureFleetVehicleLayers(mapInstance);
      if (cancelled || !map.current) return;
      setFleetVehiclesData(mapInstance, geojson);
    };

    const run = () => {
      void sync();
    };
    if (mapInstance.isStyleLoaded()) run();
    else mapInstance.once('load', run);

    // After setStyle, images/layers are wiped — rebuild when style finishes loading
    const onStyleLoad = () => {
      void sync();
    };
    mapInstance.on('style.load', onStyleLoad);

    return () => {
      cancelled = true;
      mapInstance.off('style.load', onStyleLoad);
      mapInstance.off('load', run);
    };
  }, [fleetData, vehiclesById, trackedVehicleId]);

  // Symbol-layer click → select vehicle (same behavior as old HTML markers)
  useEffect(() => {
    if (!map.current) return;
    const mapInstance = map.current;

    const onClick = (e: mapboxgl.MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      const id = feature?.properties?.id;
      if (id == null) return;
      const vehicle = vehicleClickDataRef.current[String(id)];
      if (vehicle) onSelectVehicle(vehicle);
    };
    const onEnter = () => {
      mapInstance.getCanvas().style.cursor = 'pointer';
    };
    const onLeave = () => {
      mapInstance.getCanvas().style.cursor = '';
    };

    const unbind = () => {
      mapInstance.off('click', FLEET_VEHICLES_LAYER, onClick);
      mapInstance.off('mouseenter', FLEET_VEHICLES_LAYER, onEnter);
      mapInstance.off('mouseleave', FLEET_VEHICLES_LAYER, onLeave);
    };
    const bind = () => {
      unbind();
      if (!mapInstance.getLayer(FLEET_VEHICLES_LAYER)) return;
      mapInstance.on('click', FLEET_VEHICLES_LAYER, onClick);
      mapInstance.on('mouseenter', FLEET_VEHICLES_LAYER, onEnter);
      mapInstance.on('mouseleave', FLEET_VEHICLES_LAYER, onLeave);
    };

    bind();
    mapInstance.on('style.load', bind);
    mapInstance.on('idle', bind); // ← retry once the vehicle layer has actually been added

    return () => {
      unbind();
      mapInstance.off('style.load', bind);
      mapInstance.off('idle', bind); // ← added
    };
  }, [onSelectVehicle]);

  // Re-apply zoom only when the defaultZoom preference itself changes
  const prevDefaultZoomRef = useRef(prefs.defaultZoom);
  useEffect(() => {
    if (!map.current || !map.current.loaded()) return;
    if (prevDefaultZoomRef.current === prefs.defaultZoom) return;
    prevDefaultZoomRef.current = prefs.defaultZoom;
    if (!selectedVehicle) {
      map.current.easeTo({ zoom: Math.max(prefs.defaultZoom, 15), duration: 600 });
    }
  }, [prefs.defaultZoom, selectedVehicle]);

  // Fly to selected vehicle — only when autoCenter is enabled in prefs
  useEffect(() => {
    if (!map.current || !selectedVehicle || !prefs.autoCenter) return;

    map.current.flyTo({
      center: [selectedVehicle.location.lng, selectedVehicle.location.lat],
      zoom: Math.max(prefs.defaultZoom, 15), // street-level when selecting so markers do not stack
      duration: 1500,
    });
  }, [selectedVehicle, prefs.autoCenter, prefs.defaultZoom]);

  const getValidFleetCoords = (): LatLng[] =>
    filterValidCoords(
      (fleetData as FleetPoint[]).map((item) => ({
        lat: Number(item.lat),
        lng: Number(item.lng),
      }))
    );

  const getValidVehicleCoords = (): LatLng[] =>
    filterValidCoords(
      vehicles.map((v) => ({
        lat: Number(v.location.lat),
        lng: Number(v.location.lng),
      }))
    );

  const fitToCoords = (coords: LatLng[], duration: number) => {
    if (!map.current || coords.length === 0) return;
    if (coords.length === 1) {
      const { lng, lat } = coords[0];
      map.current.easeTo({
        center: [lng, lat],
        zoom: Math.max(prefs.defaultZoom, 15),
        duration,
      });
      return;
    }
    const bounds = new mapboxgl.LngLatBounds();
    coords.forEach(({ lat, lng }) => bounds.extend([lng, lat]));
    map.current.fitBounds(bounds, {
      padding: { top: 56, bottom: 56, left: 56, right: 56 },
      // Cap only as a ceiling — tight clusters zoom in enough to separate car icons
      maxZoom: Math.max(prefs.defaultZoom, FLEET_FIT_MAX_ZOOM),
      duration,
    });
  };

  // Fit map: prefer live Traccar positions, else parent vehicle list (e.g. loading placeholders).
  const fitToDevices = (duration = 1200) => {
    const fleetCoords = getValidFleetCoords();
    const coords = fleetCoords.length > 0 ? fleetCoords : getValidVehicleCoords();
    fitToCoords(coords, duration);
    if (fleetCoords.length > 0) {
      hasFittedLiveFleet.current = true;
    }
  };

  const whenMapReady = (fn: () => void) => {
    if (!map.current) return;
    if (map.current.loaded()) {
      fn();
    } else {
      map.current.once('load', fn);
    }
  };

  // Frame map when positions exist: preview from `vehicles` while API is empty, then live fleet.
  useEffect(() => {
    if (!map.current || selectedVehicle) return;

    const fleetCoords = getValidFleetCoords();
    const vehicleCoords = getValidVehicleCoords();

    if (fleetCoords.length > 0) {
      if (hasFittedLiveFleet.current) return;
      whenMapReady(() => {
        fitToCoords(fleetCoords, fleetCoords.length === 1 ? 400 : 800);
        hasFittedLiveFleet.current = true;
      });
      return;
    }

    if (vehicleCoords.length > 0 && !hasFittedVehiclePreview.current) {
      whenMapReady(() => {
        fitToCoords(vehicleCoords, 0);
        hasFittedVehiclePreview.current = true;
      });
    }
  }, [fleetData, vehicles, selectedVehicle]);

  useEffect(() => {
    if (!map.current || !resolvedTheme) return;

    const isDark = resolvedTheme === 'dark';
    const styleUrl = resolveMapStyleUrl(mapStyle, isDark);
    const styleKey = `${mapStyle}:${isDark}`;

    // Avoid reloading the same basemap+mode (setStyle resets camera / layers)
    if (appliedStyleKeyRef.current === styleKey) return;
    appliedStyleKeyRef.current = styleKey;
    lastStyleUrlRef.current = styleUrl;

    map.current.setStyle(styleUrl);

    if (mapStyle === 'traffic') {
      map.current.once('style.load', () => {
        if (!map.current) return;

        if (!map.current.getLayer('traffic')) {
          map.current.addLayer({
            id: 'traffic',
            type: 'line',
            source: {
              type: 'vector',
              url: 'mapbox://mapbox.mapbox-traffic-v1',
            },
            'source-layer': 'traffic',
            paint: {
              'line-width': 2,
              'line-color': [
                'case',
                ['==', ['get', 'congestion'], 'low'], '#4CAF50',
                ['==', ['get', 'congestion'], 'moderate'], '#FFC107',
                ['==', ['get', 'congestion'], 'heavy'], '#F44336',
                ['==', ['get', 'congestion'], 'severe'], '#9C27B0',
                '#808080',
              ],
            },
          });
        }
      });
    }
  }, [mapStyle, resolvedTheme]);

  // Draw / update live trip route polyline on map
  useEffect(() => {
    if (!map.current) return;

    const applyRoute = () => {
      if (!map.current) return;
      const hasSource = !!map.current.getSource(LIVE_ROUTE_SOURCE);

      if (!liveRoute || liveRoute.length < 2) {
        if (map.current.getLayer(LIVE_ROUTE_LAYER)) map.current.removeLayer(LIVE_ROUTE_LAYER);
        if (hasSource) map.current.removeSource(LIVE_ROUTE_SOURCE);
        return;
      }

      const geojsonData = {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: liveRoute.map((p) => [p.lng, p.lat]),
        },
        properties: {},
      };

      if (hasSource) {
        (map.current.getSource(LIVE_ROUTE_SOURCE) as mapboxgl.GeoJSONSource).setData(geojsonData);
      } else {
        map.current.addSource(LIVE_ROUTE_SOURCE, { type: 'geojson', data: geojsonData });
        // Glow layer below the main line (matches Replay section style)
        map.current.addLayer({
          id: LIVE_ROUTE_LAYER + '-glow',
          type: 'line',
          source: LIVE_ROUTE_SOURCE,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#93c5fd', 'line-width': 14, 'line-opacity': 0.22 },
        });
        map.current.addLayer({
          id: LIVE_ROUTE_LAYER,
          type: 'line',
          source: LIVE_ROUTE_SOURCE,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#2563eb',
            'line-width': 4.5,
            'line-opacity': 0.92,
          },
        });
      }
    };

    if (map.current.loaded()) {
      applyRoute();
    } else {
      map.current.once('load', applyRoute);
    }
  }, [liveRoute]);

  // ── All-vehicle tails (dashboard: every online+moving vehicle) ───────────────
  useEffect(() => {
    if (!map.current) return;

    const applyAllTails = () => {
      if (!map.current) return;
      const hasSource = !!map.current.getSource(ALL_TAILS_SOURCE);

      // Collect valid multi-line coordinates
      const lines: number[][][] = [];
      if (allVehicleTails) {
        Object.values(allVehicleTails).forEach((trail) => {
          if (trail.length < 2) return;
          lines.push(trail.map((p) => [p.lng, p.lat]));
        });
      }

      if (lines.length === 0) {
        if (map.current.getLayer(ALL_TAILS_GLOW)) map.current.removeLayer(ALL_TAILS_GLOW);
        if (map.current.getLayer(ALL_TAILS_LAYER)) map.current.removeLayer(ALL_TAILS_LAYER);
        if (hasSource) map.current.removeSource(ALL_TAILS_SOURCE);
        return;
      }

      const geojsonData = {
        type: 'Feature' as const,
        geometry: {
          type: 'MultiLineString' as const,
          coordinates: lines,
        },
        properties: {},
      };

      if (hasSource) {
        (map.current.getSource(ALL_TAILS_SOURCE) as mapboxgl.GeoJSONSource).setData(geojsonData);
      } else {
        map.current.addSource(ALL_TAILS_SOURCE, { type: 'geojson', data: geojsonData });
        // Soft glow
        map.current.addLayer({
          id: ALL_TAILS_GLOW,
          type: 'line',
          source: ALL_TAILS_SOURCE,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#93c5fd', 'line-width': 14, 'line-opacity': 0.22 },
        });
        // Main blue line
        map.current.addLayer({
          id: ALL_TAILS_LAYER,
          type: 'line',
          source: ALL_TAILS_SOURCE,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#2563eb', 'line-width': 4.5, 'line-opacity': 0.92 },
        });
      }
    };

    if (map.current.loaded()) {
      applyAllTails();
    } else {
      map.current.once('load', applyAllTails);
    }
  }, [allVehicleTails]);

  // ── Fast tracked-vehicle position update (1 s cadence from Fleet.tsx) ───────
  // Patches the symbol-layer GeoJSON and pans without waiting for the general poll.
  useEffect(() => {
    if (!trackedVehiclePosition || !trackedVehicleId || !map.current) return;
    const { lat, lng, course } = trackedVehiclePosition;
    if (lat === 0 && lng === 0) return;

    const points = fleetPointsRef.current.map((p) =>
      String(p.id) === trackedVehicleId
        ? { ...p, lat, lng, course }
        : p
    );
    fleetPointsRef.current = points;
    if (map.current.getSource(FLEET_VEHICLES_SOURCE)) {
      setFleetVehiclesData(
        map.current,
        buildFleetVehiclesGeoJSON(points, trackedVehicleId),
      );
    }

    if (followTracked) {
      map.current.easeTo({ center: [lng, lat], duration: 600 });
    }
  }, [trackedVehiclePosition, trackedVehicleId, followTracked]);

  // Auto-follow tracked vehicle via general fleetData poll (Dashboard path)
  useEffect(() => {
    if (!followTracked || !trackedVehicleId || !map.current) return;
    // Skip if the fast-position path is active (avoid double-pan)
    if (trackedVehiclePosition) return;
    const tracked = (fleetData as FleetPoint[]).find((v) => String(v.id) === trackedVehicleId);
    if (!tracked || tracked.lat === 0 || tracked.lng === 0) return;
    map.current.easeTo({
      center: [tracked.lng, tracked.lat],
      duration: 800,
    });
  }, [fleetData, trackedVehicleId, followTracked, trackedVehiclePosition]);

  return (
    <div className="relative h-full w-full fleet-map-root">
      <div ref={mapContainer} className="absolute inset-0" />

      <div className="absolute top-4 left-4 flex flex-wrap gap-1.5 z-10 max-w-[calc(100%-5rem)]">
        <Button
          variant={mapStyle === 'streets' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => setMapStyle('streets')}
          className="shadow-lg h-8 px-2 sm:px-3"
          title="Street view"
        >
          <MapIcon className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline text-xs">Street</span>
        </Button>
        <Button
          variant={mapStyle === 'satellite' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => setMapStyle('satellite')}
          className="shadow-lg h-8 px-2 sm:px-3"
          title="Satellite view"
        >
          <Satellite className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline text-xs">Satellite</span>
        </Button>
        <Button
          variant={mapStyle === 'traffic' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => setMapStyle('traffic')}
          className="shadow-lg h-8 px-2 sm:px-3"
          title="Traffic view"
        >
          <Layers className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline text-xs">Traffic</span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            hasFittedLiveFleet.current = false;
            fitToDevices(800);
          }}
          className="shadow-lg h-8 px-2 sm:px-3"
          title={`Fit map to all devices (up to zoom ${Math.max(prefs.defaultZoom, FLEET_FIT_MAX_ZOOM)})`}
        >
          <Locate className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline text-xs">Re-center</span>
        </Button>
      </div>

      {selectedVehicle && (
        <>
          {/* Click-outside backdrop to close — only visible on mobile-ish sizes */}
          <div
            className="absolute inset-0 z-[9] sm:hidden"
            onClick={onClearSelection}
          />
          <div
            className="absolute z-10 w-80 max-w-[92vw]"
            style={
              cardPosition
                ? { left: `${cardPosition.x}px`, top: `${cardPosition.y}px` }
                : { right: '1rem', top: '4.5rem' }
            }
          >
            <VehicleDetailCard
              vehicle={selectedVehicle}
              onClose={onClearSelection}
              position={cardPosition}
              onPositionChange={setCardPosition}
              onOpenAIChat={() => {
                setAiChatVehicle(selectedVehicle);
                setShowAIChat(true);
                onClearSelection();
              }}
            />
          </div>
        </>
      )}

      {/* AI Chat Window */}
      {showAIChat && aiChatVehicle && (
        <div
          ref={aiChatWrapperRef}
          className={cn(
            'absolute z-[70] overflow-hidden rounded-lg',
            'min-w-[320px] min-h-[380px] max-w-[95vw] max-h-[90vh] resize'
          )}
          style={{
            width: '420px',
            height: '560px',
            left: aiChatPosition ? `${aiChatPosition.x}px` : 'auto',
            top: aiChatPosition ? `${aiChatPosition.y}px` : '1rem',
            right: aiChatPosition ? 'auto' : '1rem',
          }}
        >
          <VehicleAIChat 
            vehicle={aiChatVehicle} 
            onDragStart={handleAiChatDragStart}
            useExternalLayout
            onClose={() => {
              setShowAIChat(false);
              setAiChatVehicle(null);
              setAiChatPosition(null);
            }} 
          />
        </div>
      )}
    </div>
  );
};

export default FleetMap;
