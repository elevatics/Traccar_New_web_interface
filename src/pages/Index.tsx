import { useEffect, useMemo, useRef, useState } from 'react';
import { Vehicle, VehicleStatus } from '@/types/vehicle';
import VehicleList from '@/components/VehicleList';
import FleetMap from '@/components/FleetMap';
import { ChevronLeft, ChevronRight, List, Radio, Navigation2, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import useFleetData from '@/hooks/useFleetData';
import { useIsMobile } from '@/hooks/use-mobile';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? '';

/** Maximum number of historical positions kept per vehicle for the tail trail */
const MAX_TAIL_POINTS = 120;

const Index = () => {
  const { fleetData } = useFleetData();
  const vehicles = useMemo<Vehicle[]>(
    () =>
      fleetData.map((rawItem) => {
        const item = rawItem as Record<string, unknown>;
        const nowIso = new Date().toISOString();
        const status =
          item.status === 'online' || item.status === 'idle' || item.status === 'offline'
            ? (item.status as VehicleStatus)
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

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [filterStatus, setFilterStatus] = useState<VehicleStatus | 'all'>('all');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const isMobile = useIsMobile();

  // ── Per-vehicle position history for tail visualization ─────────────────────
  // Stored in a ref (accumulator) — updated on each poll cycle
  const positionHistoryRef = useRef<Record<string, { lat: number; lng: number }[]>>({});

  useEffect(() => {
    vehicles.forEach((v) => {
      const { lat, lng } = v.location;
      if (lat === 0 && lng === 0) return;
      const history = positionHistoryRef.current[v.id] ?? [];
      const last = history[history.length - 1];
      if (!last || last.lat !== lat || last.lng !== lng) {
        positionHistoryRef.current[v.id] = [
          ...history,
          { lat, lng },
        ].slice(-MAX_TAIL_POINTS);
      }
    });
  }, [vehicles]);

  // Tail route for the currently selected vehicle (min 2 points to draw)
  const liveRoute = useMemo(() => {
    if (!selectedVehicle) return undefined;
    const hist = positionHistoryRef.current[selectedVehicle.id];
    return hist && hist.length >= 2 ? hist : undefined;
    // Re-compute whenever the selected vehicle changes or vehicles poll updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicle, vehicles]);

  // Tails for ALL online+moving vehicles (shown even without selection)
  const allVehicleTails = useMemo(() => {
    const tails: Record<string, { lat: number; lng: number }[]> = {};
    vehicles.forEach((v) => {
      if ((v.status === 'online' || v.status === 'idle') && v.motion) {
        const hist = positionHistoryRef.current[v.id];
        if (hist && hist.length >= 2) {
          tails[v.id] = hist;
        }
      }
    });
    return Object.keys(tails).length > 0 ? tails : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles]);

  // Keep selectedVehicle in sync with latest poll data so speed/position stay current
  useEffect(() => {
    if (!selectedVehicle) return;
    const latest = vehicles.find((v) => v.id === selectedVehicle.id);
    if (latest && (
      latest.location.lat !== selectedVehicle.location.lat ||
      latest.location.lng !== selectedVehicle.location.lng ||
      latest.speed !== selectedVehicle.speed
    )) {
      setSelectedVehicle(latest);
    }
  }, [vehicles, selectedVehicle]);

  return (
    <div
      className={cn(
        'h-full flex flex-col md:flex-row md:overflow-hidden',
        isMobile && 'min-h-0 overflow-y-auto'
      )}
    >
        {/* Map area */}
        <div
          className={cn(
            'min-w-0 relative shrink-0',
            isMobile
              ? mobileListOpen
                ? 'h-[45vh] min-h-[240px]'
                : 'h-[calc(100dvh-3.5rem)] min-h-[320px]'
              : 'flex-1 min-h-0'
          )}
        >
          <FleetMap
            vehicles={vehicles}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={setSelectedVehicle}
            onClearSelection={() => setSelectedVehicle(null)}
            apiToken={MAPBOX_TOKEN}
            mapStorageKey="fleet_map_dashboard"
            liveRoute={liveRoute}
            trackedVehicleId={selectedVehicle?.id}
            followTracked={!!selectedVehicle}
            allVehicleTails={allVehicleTails}
          />

          {/* Live tracking info strip — shown when a vehicle is selected and moving */}
          {selectedVehicle && (
            <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 bg-background/90 backdrop-blur-sm border border-border rounded-xl px-3 py-2 shadow-lg text-xs max-w-[calc(100%-2rem)]">
              <Radio className="h-3.5 w-3.5 text-blue-500 animate-pulse shrink-0" />
              <span className="font-semibold truncate max-w-[110px]">{selectedVehicle.name}</span>
              <span className="text-muted-foreground shrink-0">•</span>
              <Gauge className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-mono shrink-0">
                {selectedVehicle.motion && selectedVehicle.speed > 0.5
                  ? `${Math.round(selectedVehicle.speed * 1.852)} km/h`
                  : '0 km/h'}
              </span>
              <span className="text-muted-foreground shrink-0">•</span>
              <Navigation2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-mono text-muted-foreground truncate">
                {selectedVehicle.location.lat.toFixed(5)}, {selectedVehicle.location.lng.toFixed(5)}
              </span>
              {liveRoute && (
                <>
                  <span className="text-muted-foreground shrink-0">•</span>
                  <span className="text-blue-500 font-medium shrink-0">{liveRoute.length} pts</span>
                </>
              )}
            </div>
          )}

          {isMobile && (
            <Button
              size="sm"
              variant="secondary"
              className="absolute bottom-4 right-4 z-30 shadow-lg gap-1.5"
              onClick={() => setMobileListOpen((open) => !open)}
            >
              <List className="h-4 w-4" />
              {mobileListOpen ? 'Hide list' : 'Fleet list'}
            </Button>
          )}
        </div>

        {/* Right sidebar with edge toggle */}
        <div className="relative flex-shrink-0 md:h-full md:min-h-0">
          {!isMobile && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={cn(
                'absolute top-1/2 -translate-y-1/2 -left-5 z-30',
                'w-5 h-14 flex items-center justify-center',
                'bg-card border border-border border-r-0 rounded-l-md',
                'hover:bg-accent transition-colors cursor-pointer',
                'shadow-md'
              )}
              aria-label={sidebarOpen ? 'Collapse Fleet Overview' : 'Expand Fleet Overview'}
            >
              {sidebarOpen ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          )}

          <div
            className={cn(
              'transition-[width,height] duration-300 ease-in-out border-border',
              isMobile
                ? mobileListOpen
                  ? 'w-full flex-1 min-h-[40vh] border-t overflow-y-auto'
                  : 'hidden'
                : sidebarOpen
                  ? 'w-80 h-full border-l overflow-hidden'
                  : 'w-0 h-full border-l-0 overflow-hidden'
            )}
          >
            <div className={cn('h-full min-h-0', isMobile ? 'w-full' : 'w-80')}>
              <VehicleList
                vehicles={vehicles}
                selectedVehicle={selectedVehicle}
                onSelectVehicle={setSelectedVehicle}
                filterStatus={filterStatus}
                onFilterChange={setFilterStatus}
              />
            </div>
          </div>
        </div>
      </div>
  );
};

export default Index;
