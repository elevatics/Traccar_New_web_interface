import { useEffect, useMemo, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Map, 
  Car, 
  AlertTriangle, 
  MapPin, 
  Bell, 
  MessageSquare, 
  Navigation2,
  Eye,
  MonitorPlay,
  Wifi,
  WifiOff,
  Zap,
  Gauge,
  CheckCircle,
  Radio,
  XCircle,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import FleetMap from '@/components/FleetMap';
import Vehicle360View from '@/components/Vehicle360View';
import GeofenceManager from '@/components/GeofenceManager';
import { Vehicle } from '@/types/vehicle';
import { getEvents } from '@/services/eventService';
import useFleetData from '@/hooks/useFleetData';
import { useIsMobile } from '@/hooks/use-mobile';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? '';

/** Maximum waypoints kept in the live trip log */
const MAX_WAYPOINTS = 200;

export default function Fleet() {
  const isMobile = useIsMobile();

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [liveView, setLiveView] = useState(false);
  const [alerts, setAlerts] = useState<{ type: string; deviceId: number | null; eventTime: string | null }[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [trackingActive, setTrackingActive] = useState(false);
  const [trackedVehicle, setTrackedVehicle] = useState<Vehicle | null>(null);
  const [tripLog, setTripLog] = useState<{ time: string; lat: number; lng: number; speed: number }[]>([]);
  const tripLogRef = useRef(tripLog);

  /** The vehicle ID chosen in the tracker selector (empty = no explicit pick) */
  const [trackingVehicleId, setTrackingVehicleId] = useState<string>('');
  /** Show live trip log details */
  const [logExpanded, setLogExpanded] = useState(false);
  /** Fullscreen map toggle for mobile */
  const [mapFullscreen, setMapFullscreen] = useState(false);

  const { fleetData, loading: fleetLoading, error: fleetError } = useFleetData();

  const liveVehicles = useMemo<Vehicle[]>(
    () =>
      fleetData.map((item: any) => {
        const nowIso = new Date().toISOString();
        const status =
          item.status === 'online' || item.status === 'idle' || item.status === 'offline'
            ? item.status
            : 'offline';
        return {
          id: String(item.id),
          deviceId: Number(item.deviceId ?? item.id) || 0,
          protocol: item.protocol || 'traccar',
          name: item.name || `Device ${item.id}`,
          plateNumber: item.plateNumber || '-',
          driver: item.driver || '-',
          status,
          location: {
            lat: Number(item.lat) || 0,
            lng: Number(item.lng) || 0,
            address: item.address || 'Live location unavailable',
          },
          speed: Number(item.speed) || 0,
          serverTime: item.serverTime || nowIso,
          deviceTime: item.deviceTime || nowIso,
          fixTime: item.fixTime || nowIso,
          lastUpdate: item.lastUpdate || nowIso,
          fuelLevel: Number(item.fuelLevel) || 0,
          odometer: Number(item.odometer) || 0,
          outdated: Boolean(item.outdated),
          valid: item.valid !== false,
          altitude: Number(item.altitude) || 0,
          course: Number(item.course) || 0,
          accuracy: Number(item.accuracy) || 0,
          network: item.network,
          geofenceIds: item.geofenceIds,
          tripOdometer: Number(item.tripOdometer) || 0,
          fuelConsumption: Number(item.fuelConsumption) || 0,
          ignition: Boolean(item.ignition),
          statusCode: Number(item.statusCode) || 0,
          coolantTemp: item.coolantTemp,
          mapIntake: item.mapIntake,
          rpm: item.rpm,
          obdSpeed: item.obdSpeed,
          intakeTemp: item.intakeTemp,
          fuel: Number(item.fuel) || 0,
          distance: Number(item.distance) || 0,
          totalDistance: Number(item.totalDistance) || 0,
          motion: Boolean(item.motion),
          imageUrl: item.imageUrl || undefined,
        } as Vehicle;
      }),
    [fleetData]
  );

  // ── Live trip tracking — append position to log every poll cycle ─────────────
  useEffect(() => {
    if (!trackingActive || !trackedVehicle) return;
    const current = liveVehicles.find((v) => v.id === trackedVehicle.id);
    if (!current) return;

    const entry = {
      time: new Date().toLocaleTimeString(),
      lat: current.location.lat,
      lng: current.location.lng,
      speed: Math.round(current.speed * 1.852),
    };
    // Always record position changes (not just when moving) so we capture stops too
    const prev = tripLogRef.current;
    const last = prev[prev.length - 1];
    if (!last || last.lat !== entry.lat || last.lng !== entry.lng) {
      const next = [...prev, entry].slice(-MAX_WAYPOINTS);
      tripLogRef.current = next;
      setTripLog(next);
      setTrackedVehicle(current);
    }
  }, [liveVehicles, trackingActive, trackedVehicle]);

  // ── Switch tracked vehicle when selector changes while tracking is active ────
  useEffect(() => {
    if (!trackingActive || !trackingVehicleId) return;
    const newTarget = liveVehicles.find((v) => v.id === trackingVehicleId);
    if (!newTarget || newTarget.id === trackedVehicle?.id) return;
    // Immediately switch — reset trip log for the new vehicle
    setTrackedVehicle(newTarget);
    setTripLog([]);
    tripLogRef.current = [];
    setSelectedVehicle(newTarget);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingVehicleId, trackingActive]);

  const handleStartTracking = () => {
    const target =
      (trackingVehicleId ? liveVehicles.find((v) => v.id === trackingVehicleId) : null) ??
      selectedVehicle ??
      liveVehicles.find((v) => v.status === 'online') ??
      liveVehicles[0];
    if (!target) return;
    setTrackedVehicle(target);
    setTrackingVehicleId(target.id);
    setTripLog([]);
    tripLogRef.current = [];
    setTrackingActive(true);
    setLiveView(true);
    setSelectedVehicle(target);
  };

  const handleStopTracking = () => {
    setTrackingActive(false);
    setMapFullscreen(false);
  };

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        setAlertsLoading(true);
        setAlertsError(null);
        const data = await getEvents();
        setAlerts(data);
      } catch (error: any) {
        setAlertsError(error?.message || 'Failed to load alerts');
      } finally {
        setAlertsLoading(false);
      }
    };

    loadAlerts();
    const intervalId = setInterval(loadAlerts, 5000);
    return () => clearInterval(intervalId);
  }, []);

  const latestAlerts = useMemo(
    () =>
      [...alerts]
        .sort((a, b) => {
          const aTime = a.eventTime ? new Date(a.eventTime).getTime() : 0;
          const bTime = b.eventTime ? new Date(b.eventTime).getTime() : 0;
          return bTime - aTime;
        })
        .slice(0, 10),
    [alerts]
  );

  // Route passed to FleetMap as tail polyline
  const liveRoute = trackingActive && tripLog.length >= 2
    ? tripLog.map((p) => ({ lat: p.lat, lng: p.lng }))
    : undefined;

  // ── Shared FleetMap props ─────────────────────────────────────────────────────
  const fleetMapProps = {
    vehicles: liveVehicles,
    selectedVehicle,
    onSelectVehicle: setSelectedVehicle,
    onClearSelection: () => setSelectedVehicle(null),
    apiToken: MAPBOX_TOKEN,
    mapStorageKey: 'fleet_map_fleet',
    liveRoute,
    trackedVehicleId: trackingActive && trackedVehicle ? trackedVehicle.id : undefined,
    followTracked: trackingActive,
  };

  // ── Compact tracking overlay (used inside fullscreen map on mobile) ──────────
  const TrackingOverlay = () =>
    trackingActive && trackedVehicle ? (
      <div className="absolute bottom-4 left-4 right-16 z-20 bg-background/90 backdrop-blur-sm border border-border rounded-xl p-3 text-xs space-y-2 shadow-lg">
        <div className="flex items-center gap-2">
          <Radio className="h-3.5 w-3.5 text-blue-500 animate-pulse shrink-0" />
          <span className="font-semibold truncate">{trackedVehicle.name}</span>
          <span className={`ml-auto px-2 py-0.5 rounded-full font-medium ${
            trackedVehicle.motion
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}>
            {trackedVehicle.motion ? 'Moving' : 'Stationary'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-background border p-1.5 text-center">
            <p className="text-[10px] text-muted-foreground">Speed</p>
            <p className="font-bold">{Math.round(trackedVehicle.speed * 1.852)} km/h</p>
          </div>
          <div className="rounded-lg bg-background border p-1.5 text-center">
            <p className="text-[10px] text-muted-foreground">Lat</p>
            <p className="font-mono">{trackedVehicle.location.lat.toFixed(5)}</p>
          </div>
          <div className="rounded-lg bg-background border p-1.5 text-center">
            <p className="text-[10px] text-muted-foreground">Lng</p>
            <p className="font-mono">{trackedVehicle.location.lng.toFixed(5)}</p>
          </div>
        </div>
        <p className="text-muted-foreground text-center">{tripLog.length} waypoints recorded</p>
      </div>
    ) : null;

  return (
    <>
      {/* ── Mobile Fullscreen Map Overlay ─────────────────────────────────────── */}
      {mapFullscreen && isMobile && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="relative h-full w-full">
            <FleetMap {...fleetMapProps} mapStorageKey="fleet_map_fleet_fs" />
            <TrackingOverlay />
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-4 left-4 z-30 shadow-lg gap-1.5"
              onClick={() => setMapFullscreen(false)}
            >
              <Minimize2 className="h-4 w-4" />
              Exit Full Screen
            </Button>
            {trackingActive && (
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-4 right-4 z-30 shadow-lg gap-1.5"
                onClick={handleStopTracking}
              >
                <XCircle className="h-4 w-4" />
                Stop
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="p-4 sm:p-6 space-y-4 pb-8">
        <h2 className="text-xl sm:text-2xl font-bold">Fleet - Live Map & Status</h2>

        <Tabs defaultValue="live-map" className="w-full">
            <TabsList className="w-full overflow-x-auto justify-start sm:grid sm:grid-cols-5">
              <TabsTrigger value="live-map" className="flex items-center gap-2">
                <Map className="h-4 w-4" />
                <span className="hidden sm:inline">Live Map</span>
              </TabsTrigger>
              <TabsTrigger value="vehicle-status" className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                <span className="hidden sm:inline">Vehicle Status</span>
              </TabsTrigger>
              <TabsTrigger value="alerts" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:inline">Alerts</span>
              </TabsTrigger>
              <TabsTrigger value="geofences" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Geofences</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="live-map" className="mt-4">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Real-time Vehicle Locations</CardTitle>
                    <CardDescription>GPS tracking and live positioning</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* ── Vehicle selector + Quick Actions ─────────────────────── */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        {/* Vehicle selector — always visible so user can pre-select before starting */}
                        <Select
                          value={trackingVehicleId}
                          onValueChange={(val) => {
                            setTrackingVehicleId(val);
                            const v = liveVehicles.find((v) => v.id === val);
                            if (v) setSelectedVehicle(v);
                          }}
                        >
                          <SelectTrigger className="w-full sm:w-56 h-9 text-sm">
                            <SelectValue placeholder="Select vehicle to track…" />
                          </SelectTrigger>
                          <SelectContent>
                            {liveVehicles.length === 0 && (
                              <SelectItem value="__loading" disabled>
                                {fleetLoading ? 'Loading…' : 'No vehicles'}
                              </SelectItem>
                            )}
                            {liveVehicles.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                <span className="flex items-center gap-2">
                                  <span
                                    className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                                      v.status === 'online'
                                        ? 'bg-green-500'
                                        : v.status === 'idle'
                                        ? 'bg-yellow-400'
                                        : 'bg-red-400'
                                    }`}
                                  />
                                  <span className="truncate max-w-[160px]">{v.name}</span>
                                  <span className="text-xs text-muted-foreground ml-auto shrink-0">
                                    {Math.round(v.speed * 1.852)} km/h
                                  </span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const v = trackingVehicleId
                                ? liveVehicles.find((v) => v.id === trackingVehicleId)
                                : liveVehicles[0];
                              if (v) setSelectedVehicle(v);
                            }}
                            disabled={liveVehicles.length === 0 && fleetLoading}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View on Map
                          </Button>
                          <Button variant="outline" size="sm">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Send Message
                          </Button>
                          {trackingActive ? (
                            <Button variant="destructive" size="sm" onClick={handleStopTracking}>
                              <XCircle className="h-4 w-4 mr-2" />
                              Stop Tracking
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleStartTracking}
                              disabled={liveVehicles.length === 0}
                            >
                              <Radio className="h-4 w-4 mr-2" />
                              Track Live Trip
                            </Button>
                          )}
                          <Button 
                            variant={liveView ? 'default' : 'outline'} 
                            size="sm"
                            onClick={() => setLiveView(!liveView)}
                          >
                            <MonitorPlay className="h-4 w-4 mr-2" />
                            Live View
                          </Button>
                        </div>
                      </div>

                      {/* ── Map + optional 360 View ───────────────────────────────── */}
                      <div className={liveView ? 'grid grid-cols-1 xl:grid-cols-3 gap-4 h-auto xl:h-[520px]' : 'h-[50vh] min-h-[320px] sm:h-[520px]'}>
                        {liveView ? (
                          <>
                            {/* Map takes 2/3 */}
                            <div className="col-span-1 xl:col-span-2 border rounded-lg overflow-hidden h-[50vh] min-h-[320px] xl:h-auto relative">
                              <FleetMap {...fleetMapProps} />
                              {/* Mobile fullscreen button */}
                              {isMobile && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="absolute bottom-4 right-4 z-30 shadow-lg gap-1.5"
                                  onClick={() => setMapFullscreen(true)}
                                >
                                  <Maximize2 className="h-4 w-4" />
                                  Full Screen
                                </Button>
                              )}
                            </div>
                            {/* 360 View takes 1/3 */}
                            <div className="col-span-1 h-[50vh] min-h-[320px] xl:h-auto">
                              <Vehicle360View vehicle={selectedVehicle || liveVehicles[0] || null} />
                            </div>
                          </>
                        ) : (
                          <div className="relative h-full">
                            <FleetMap {...fleetMapProps} />
                            {/* Mobile fullscreen button */}
                            {isMobile && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="absolute bottom-4 right-4 z-30 shadow-lg gap-1.5"
                                onClick={() => setMapFullscreen(true)}
                              >
                                <Maximize2 className="h-4 w-4" />
                                Full Screen
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Live trip tracking panel ───────────────────────────────── */}
                    {trackingActive && trackedVehicle && (
                      <div className="mt-4 border rounded-xl bg-muted/30 p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <Radio className="h-4 w-4 text-blue-500 animate-pulse shrink-0" />
                            <span className="font-semibold text-sm truncate">
                              Live Tracking — {trackedVehicle.name}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              trackedVehicle.motion
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>
                              {trackedVehicle.motion ? 'Moving' : 'Stationary'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{tripLog.length} waypoints</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => setLogExpanded((e) => !e)}
                            >
                              {logExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div className="rounded-lg bg-background border p-2 text-center">
                            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                              <Gauge className="h-3 w-3" /> Speed
                            </p>
                            <p className="font-bold">
                              {Math.round(trackedVehicle.speed * 1.852)} km/h
                            </p>
                          </div>
                          <div className="rounded-lg bg-background border p-2 text-center">
                            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                              <Navigation2 className="h-3 w-3" /> Course
                            </p>
                            <p className="font-bold">{trackedVehicle.course}°</p>
                          </div>
                          <div className="rounded-lg bg-background border p-2 text-center">
                            <p className="text-xs text-muted-foreground">Latitude</p>
                            <p className="font-mono text-xs font-medium">{trackedVehicle.location.lat.toFixed(5)}</p>
                          </div>
                          <div className="rounded-lg bg-background border p-2 text-center">
                            <p className="text-xs text-muted-foreground">Longitude</p>
                            <p className="font-mono text-xs font-medium">{trackedVehicle.location.lng.toFixed(5)}</p>
                          </div>
                        </div>

                        {/* ── Switch vehicle while tracking ──────────────────────── */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground shrink-0">Switch vehicle:</span>
                          <Select
                            value={trackingVehicleId}
                            onValueChange={setTrackingVehicleId}
                          >
                            <SelectTrigger className="flex-1 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {liveVehicles.map((v) => (
                                <SelectItem key={v.id} value={v.id}>
                                  <span className="flex items-center gap-2">
                                    <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                                      v.status === 'online' ? 'bg-green-500' : v.status === 'idle' ? 'bg-yellow-400' : 'bg-red-400'
                                    }`} />
                                    {v.name}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* ── Waypoint log ───────────────────────────────────────── */}
                        {logExpanded && (
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {tripLog.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-2">
                                Waiting for position data…
                              </p>
                            ) : (
                              [...tripLog].reverse().map((pt, i) => (
                                <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground px-1">
                                  <span className="font-mono w-16 shrink-0">{pt.time}</span>
                                  <span className="shrink-0">{pt.speed} km/h</span>
                                  <span className="font-mono truncate min-w-0">{pt.lat.toFixed(5)}, {pt.lng.toFixed(5)}</span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                        {!logExpanded && tripLog.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-1">
                            Waiting for position data…
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="vehicle-status" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>All Vehicles Status</CardTitle>
                  <CardDescription>Current status of all fleet vehicles</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {fleetLoading && (
                      <p className="text-sm text-muted-foreground">Loading live vehicle status...</p>
                    )}
                    {!fleetLoading && fleetError && (
                      <p className="text-sm text-destructive">{fleetError}</p>
                    )}
                    {!fleetLoading && !fleetError && liveVehicles.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No live vehicle status available.
                      </p>
                    )}
                    {!fleetLoading && !fleetError && liveVehicles.map((vehicle) => (
                      <div 
                        key={vehicle.id} 
                        className={`p-4 border rounded-lg hover:bg-muted/50 transition-colors ${
                          selectedVehicle?.id === vehicle.id ? 'border-primary bg-primary/5' : ''
                        }`}
                        onClick={() => setSelectedVehicle(vehicle)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{vehicle.name}</h4>
                            <p className="text-sm text-muted-foreground">{vehicle.driver}</p>
                            <p className="text-xs text-muted-foreground">{vehicle.plateNumber}</p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                            vehicle.status === 'online' ? 'bg-green-100 text-green-700' :
                            vehicle.status === 'idle' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {vehicle.status}
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                          <div>Speed: {Math.round(vehicle.speed * 1.852)} km/h</div>
                          <div>Fuel: {(vehicle.fuel > 0 ? vehicle.fuel : vehicle.fuelLevel).toFixed(0)}%</div>
                          <div>Odometer: {(vehicle.odometer / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} km</div>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground truncate">
                          {vehicle.location.address}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="alerts" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle>Live Alerts</CardTitle>
                      <CardDescription>Most recent events from Traccar (auto-refreshes every 5s)</CardDescription>
                    </div>
                    {latestAlerts.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {latestAlerts.length} events
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {alertsLoading && <p className="text-sm text-muted-foreground">Loading latest alerts...</p>}
                    {!alertsLoading && alertsError && (
                      <p className="text-sm text-destructive">{alertsError}</p>
                    )}
                    {!alertsLoading && !alertsError && latestAlerts.length === 0 && (
                      <div className="flex flex-col items-center py-8 text-muted-foreground">
                        <CheckCircle className="h-8 w-8 mb-2 opacity-40" />
                        <p className="text-sm">No recent alerts available.</p>
                      </div>
                    )}
                    {!alertsLoading &&
                      !alertsError &&
                      latestAlerts.map((alert, index) => {
                        const isHighSeverity = ['deviceOverspeed', 'alarm'].includes(alert.type);
                        const isMediumSeverity = ['deviceOffline', 'geofenceEnter', 'geofenceExit'].includes(alert.type);
                        const borderColor = isHighSeverity
                          ? 'border-red-500'
                          : isMediumSeverity
                          ? 'border-yellow-500'
                          : 'border-blue-400';
                        const bgColor = isHighSeverity
                          ? 'bg-red-50 dark:bg-red-950/20'
                          : isMediumSeverity
                          ? 'bg-yellow-50 dark:bg-yellow-950/20'
                          : 'bg-blue-50/50 dark:bg-blue-950/10';
                        const icon =
                          alert.type === 'deviceOnline' ? <Wifi className="h-4 w-4 text-green-500" /> :
                          alert.type === 'deviceOffline' ? <WifiOff className="h-4 w-4 text-red-500" /> :
                          alert.type === 'deviceOverspeed' ? <Gauge className="h-4 w-4 text-red-600" /> :
                          ['ignitionOn', 'ignitionOff'].includes(alert.type) ? <Zap className="h-4 w-4 text-yellow-500" /> :
                          ['geofenceEnter', 'geofenceExit'].includes(alert.type) ? <MapPin className="h-4 w-4 text-blue-500" /> :
                          <AlertTriangle className="h-4 w-4 text-orange-500" />;
                        return (
                          <div
                            key={`${alert.deviceId}-${alert.eventTime}-${index}`}
                            className={`p-3 border-l-4 ${borderColor} ${bgColor} rounded-r-md`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 flex-shrink-0">{icon}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold text-sm capitalize">
                                    {alert.type.replace(/([A-Z])/g, ' $1').trim()}
                                  </h4>
                                  {isHighSeverity && (
                                    <Badge variant="destructive" className="text-[10px] h-4 px-1">Critical</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Device ID: {alert.deviceId ?? 'Unknown'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {alert.eventTime ? new Date(alert.eventTime).toLocaleString() : 'Time unavailable'}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="geofences" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Geofence Management</CardTitle>
                  <CardDescription>Create and manage zones and boundaries for fleet monitoring</CardDescription>
                </CardHeader>
                <CardContent>
                  <GeofenceManager />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle>Notification History</CardTitle>
                      <CardDescription>Full event log from Traccar (last 24 hours)</CardDescription>
                    </div>
                    <Button variant="outline" size="sm">
                      <Bell className="h-4 w-4 mr-2" />
                      Configure Alert Rules
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {alertsLoading && (
                      <p className="text-sm text-muted-foreground py-4 text-center">Loading notification history...</p>
                    )}
                    {!alertsLoading && alertsError && (
                      <p className="text-sm text-destructive py-4 text-center">{alertsError}</p>
                    )}
                    {!alertsLoading && !alertsError && latestAlerts.length === 0 && (
                      <div className="flex flex-col items-center py-8 text-muted-foreground">
                        <Bell className="h-8 w-8 mb-2 opacity-40" />
                        <p className="text-sm">No notifications available.</p>
                      </div>
                    )}
                    {!alertsLoading &&
                      !alertsError &&
                      latestAlerts.map((alert, index) => {
                        const isHighSeverity = ['deviceOverspeed', 'alarm'].includes(alert.type);
                        const isMediumSeverity = ['deviceOffline', 'geofenceEnter', 'geofenceExit'].includes(alert.type);
                        return (
                          <div
                            key={`notification-${alert.deviceId}-${alert.eventTime}-${index}`}
                            className="flex items-center gap-3 p-3 border rounded-lg text-sm hover:bg-muted/40 transition-colors"
                          >
                            <div className="flex-shrink-0">
                              {alert.type === 'deviceOnline' ? <Wifi className="h-4 w-4 text-green-500" /> :
                               alert.type === 'deviceOffline' ? <WifiOff className="h-4 w-4 text-red-500" /> :
                               alert.type === 'deviceOverspeed' ? <Gauge className="h-4 w-4 text-red-600" /> :
                               ['ignitionOn', 'ignitionOff'].includes(alert.type) ? <Zap className="h-4 w-4 text-yellow-500" /> :
                               ['geofenceEnter', 'geofenceExit'].includes(alert.type) ? <MapPin className="h-4 w-4 text-blue-500" /> :
                               <Bell className="h-4 w-4 text-muted-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium capitalize">
                                  {alert.type.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                {isHighSeverity && (
                                  <Badge variant="destructive" className="text-[10px] h-4 px-1">Critical</Badge>
                                )}
                                {isMediumSeverity && (
                                  <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">Warning</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">Device {alert.deviceId ?? 'Unknown'}</p>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                              {alert.eventTime
                                ? new Date(alert.eventTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                : 'Unknown time'}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
