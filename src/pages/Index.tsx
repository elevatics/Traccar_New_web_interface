import { useMemo, useState } from 'react';
import { Vehicle, VehicleStatus } from '@/types/vehicle';
import { mockVehicles } from '@/data/mockVehicles';
import VehicleList from '@/components/VehicleList';
import FleetMap from '@/components/FleetMap';
import { ChevronLeft, ChevronRight, Wifi, WifiOff, Clock, Car } from 'lucide-react';
import { cn } from '@/lib/utils';
import useFleetData from '@/hooks/useFleetData';
import { useIsMobile } from '@/hooks/use-mobile';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? '';

const StatChip = ({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) => (
  <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card', color)}>
    {icon}
    <span className="text-xs font-semibold tabular-nums">{value}</span>
    <span className="text-xs text-muted-foreground hidden sm:inline">{label}</span>
  </div>
);

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
        } as Vehicle;
      }),
    [fleetData]
  );

  const fallbackVehicles = vehicles.length > 0 ? vehicles : mockVehicles;
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [filterStatus, setFilterStatus] = useState<VehicleStatus | 'all'>('all');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isMobile = useIsMobile();

  const stats = useMemo(() => {
    const total = fallbackVehicles.length;
    const online = fallbackVehicles.filter(v => v.status === 'online').length;
    const idle = fallbackVehicles.filter(v => v.status === 'idle').length;
    const offline = fallbackVehicles.filter(v => v.status === 'offline').length;
    return { total, online, idle, offline };
  }, [fallbackVehicles]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Compact stats bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/20 shrink-0 overflow-x-auto">
        <StatChip
          icon={<Car className="h-3.5 w-3.5 text-muted-foreground" />}
          label="Total"
          value={stats.total}
          color="border-border"
        />
        <StatChip
          icon={<span className="h-2 w-2 rounded-full bg-green-500 inline-block" />}
          label="Online"
          value={stats.online}
          color="border-green-200 dark:border-green-900"
        />
        <StatChip
          icon={<Clock className="h-3.5 w-3.5 text-yellow-500" />}
          label="Idle"
          value={stats.idle}
          color="border-yellow-200 dark:border-yellow-900"
        />
        <StatChip
          icon={<WifiOff className="h-3.5 w-3.5 text-red-500" />}
          label="Offline"
          value={stats.offline}
          color="border-red-200 dark:border-red-900"
        />
        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Wifi className="h-3 w-3 text-green-500" />
          <span>Live</span>
        </div>
      </div>

      {/* Map + sidebar */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Map area — slightly reduced to give visual breathing room */}
        <div className={cn('min-w-0 relative', isMobile ? 'h-[48vh]' : 'flex-1')}>
          <FleetMap
            vehicles={fallbackVehicles}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={setSelectedVehicle}
            onClearSelection={() => setSelectedVehicle(null)}
            apiToken={MAPBOX_TOKEN}
          />
        </div>

        {/* Right sidebar with edge toggle */}
        <div className="relative flex-shrink-0 md:h-full">
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
              'transition-[width,height] duration-300 ease-in-out overflow-hidden border-border',
              isMobile
                ? 'w-full h-[calc(52vh-2.5rem)] border-t'
                : sidebarOpen
                  ? 'w-80 h-full border-l'
                  : 'w-0 h-full border-l-0'
            )}
          >
            <div className={cn('h-full', isMobile ? 'w-full' : 'w-80')}>
              <VehicleList
                vehicles={fallbackVehicles}
                selectedVehicle={selectedVehicle}
                onSelectVehicle={setSelectedVehicle}
                filterStatus={filterStatus}
                onFilterChange={setFilterStatus}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
