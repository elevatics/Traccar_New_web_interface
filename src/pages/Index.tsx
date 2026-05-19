import { useMemo, useState } from 'react';
import { Vehicle, VehicleStatus } from '@/types/vehicle';
import VehicleList from '@/components/VehicleList';
import FleetMap from '@/components/FleetMap';
import { ChevronLeft, ChevronRight, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import useFleetData from '@/hooks/useFleetData';
import { useIsMobile } from '@/hooks/use-mobile';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? '';

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
          />
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
