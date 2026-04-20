import { useMemo, useState, type MouseEvent } from 'react';
import { Vehicle, VehicleStatus } from '@/types/vehicle';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import StatusBadge from './StatusBadge';
import { cn } from '@/lib/utils';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import AddVehicleDialog from './AddVehicleDialog';
import useFleetData from '@/hooks/useFleetData';
import { formatDistanceToNow } from 'date-fns';
import { deleteDevice } from '@/services/deviceService';
import { toast } from 'sonner';

type FleetListItem = {
  id: string | number;
  deviceId?: number;
  protocol?: string;
  name: string;
  plateNumber?: string;
  driver?: string;
  status: string;
  address?: string;
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
  lat: number;
  lng: number;
};
const toVehicleStatus = (status?: string): VehicleStatus => {
  if (status === 'online' || status === 'idle' || status === 'offline') {
    return status;
  }
  return 'offline';
};

const getUpdatedText = (vehicle: FleetListItem) => {
  const updatedAt =
    vehicle.lastUpdate || vehicle.fixTime || vehicle.deviceTime || vehicle.serverTime;

  if (!updatedAt) {
    return "N/A";
  }

  const parsed = new Date(updatedAt);
  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
  }

  return formatDistanceToNow(parsed, { addSuffix: true });
};

interface VehicleListProps {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  onSelectVehicle: (vehicle: Vehicle | null) => void;
  filterStatus: VehicleStatus | 'all';
  onFilterChange: (status: VehicleStatus | 'all') => void;
}

const VehicleList = ({
  vehicles,
  selectedVehicle,
  onSelectVehicle,
  filterStatus,
  onFilterChange,
}: VehicleListProps) => {
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { fleetData, loading, error, refresh } = useFleetData();

  const handleDeleteDevice = async (e: MouseEvent, fleetVehicle: FleetListItem) => {
    e.preventDefault();
    e.stopPropagation();
    const deviceId = Number(fleetVehicle.deviceId ?? fleetVehicle.id);
    const label = fleetVehicle.name || `Device ${deviceId}`;
    if (!window.confirm(`Delete vehicle "${label}" from Traccar? This cannot be undone.`)) {
      return;
    }
    setDeletingId(String(fleetVehicle.id));
    try {
      await deleteDevice(deviceId);
      toast.success("Vehicle removed from Traccar");
      if (String(selectedVehicle?.id) === String(fleetVehicle.id)) {
        onSelectVehicle(null);
      }
      await refresh();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string }; status?: number } }).response?.data
              ?.message
          : null;
      toast.error(message || (err instanceof Error ? err.message : "Could not delete vehicle"));
    } finally {
      setDeletingId(null);
    }
  };

  const fleetVehicles = useMemo(
    () =>
      fleetData.map((item) => ({
        ...item,
        id: item.id,
        name: item.name,
        status: item.status ?? 'offline',
        speed: item.speed ?? 0,
        lat: item.lat,
        lng: item.lng,
      })),
    [fleetData]
  );

  const filteredVehicles =
    filterStatus === 'all'
      ? fleetVehicles
      : fleetVehicles.filter((v) => v.status === filterStatus);

  const statusCounts = {
    all: fleetVehicles.length,
    online: fleetVehicles.filter((v) => v.status === 'online').length,
    idle: fleetVehicles.filter((v) => v.status === 'idle').length,
    offline: fleetVehicles.filter((v) => v.status === 'offline').length,
  };

  const getVehicleForSelection = (fleetVehicle: FleetListItem): Vehicle => {
    const nowIso = new Date().toISOString();
    const matchedVehicle = vehicles.find(
      (vehicle) => String(vehicle.id) === String(fleetVehicle.id)
    );

    if (matchedVehicle) {
      return {
        ...matchedVehicle,
        status: toVehicleStatus(fleetVehicle.status) ?? matchedVehicle.status,
        speed: fleetVehicle.speed,
        location: {
          ...matchedVehicle.location,
          lat: fleetVehicle.lat,
          lng: fleetVehicle.lng,
        },
      };
    }

    return {
      id: String(fleetVehicle.id),
      deviceId: Number(fleetVehicle.deviceId ?? fleetVehicle.id),
      protocol: fleetVehicle.protocol || 'traccar',
      name: fleetVehicle.name,
      plateNumber: fleetVehicle.plateNumber || '-',
      driver: fleetVehicle.driver || '-',
      status: toVehicleStatus(fleetVehicle.status),
      location: {
        lat: fleetVehicle.lat,
        lng: fleetVehicle.lng,
        address: fleetVehicle.address || 'Live location',
      },
      speed: fleetVehicle.speed,
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

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-card-foreground">Fleet Overview</h2>
          <Button size="sm" variant="outline" onClick={() => setAddVehicleOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Button
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            className="justify-start"
            onClick={() => onFilterChange('all')}
          >
            <span className="font-semibold">All</span>
            <span className="ml-auto text-xs">{statusCounts.all}</span>
          </Button>
          <Button
            variant={filterStatus === 'online' ? 'default' : 'outline'}
            className="justify-start"
            onClick={() => onFilterChange('online')}
          >
            <div className="h-2 w-2 rounded-full bg-[hsl(var(--status-online))] mr-2" />
            <span>Online</span>
            <span className="ml-auto text-xs">{statusCounts.online}</span>
          </Button>
          <Button
            variant={filterStatus === 'idle' ? 'default' : 'outline'}
            className="justify-start"
            onClick={() => onFilterChange('idle')}
          >
            <div className="h-2 w-2 rounded-full bg-[hsl(var(--status-idle))] mr-2" />
            <span>Idle</span>
            <span className="ml-auto text-xs">{statusCounts.idle}</span>
          </Button>
          <Button
            variant={filterStatus === 'offline' ? 'default' : 'outline'}
            className="justify-start"
            onClick={() => onFilterChange('offline')}
          >
            <div className="h-2 w-2 rounded-full bg-[hsl(var(--status-offline))] mr-2" />
            <span>Offline</span>
            <span className="ml-auto text-xs">{statusCounts.offline}</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading && <p className="text-sm text-muted-foreground">Loading devices...</p>}
        {!loading && error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {!loading && !error && filteredVehicles.map((vehicle) => (
          <Collapsible key={vehicle.id}>
            <Card
              className={cn(
                'transition-all border',
                String(selectedVehicle?.id) === String(vehicle.id)
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <CollapsibleTrigger asChild>
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => onSelectVehicle(getVehicleForSelection(vehicle))}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <StatusBadge status={vehicle.status as VehicleStatus} showLabel={false} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-card-foreground truncate">{vehicle.name}</p>
                      <p className="text-xs text-muted-foreground">{vehicle.plateNumber || '-'}</p>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180" />
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div 
                  className="px-3 pb-3 pt-1 space-y-2 border-t border-border/50 cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() => onSelectVehicle(getVehicleForSelection(vehicle))}
                >
                  <div className="text-xs space-y-1.5">
                    <p className="text-muted-foreground">
                      Driver: <span className="text-card-foreground font-medium">{vehicle.driver || '-'}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Speed: <span className="text-card-foreground font-medium">{vehicle.speed} mph</span>
                    </p>
                    <p className="text-muted-foreground">
                      Updated: <span className="text-card-foreground font-medium">{getUpdatedText(vehicle)}</span>
                    </p>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      variant={String(selectedVehicle?.id) === String(vehicle.id) ? "default" : "outline"}
                      type="button"
                    >
                      View on Map
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 text-destructive hover:text-destructive"
                      type="button"
                      disabled={deletingId === String(vehicle.id)}
                      title="Delete from Traccar"
                      onClick={(e) => void handleDeleteDevice(e, vehicle)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>
      <AddVehicleDialog
        open={addVehicleOpen}
        onOpenChange={setAddVehicleOpen}
        onVehicleAdded={refresh}
      />
    </div>
  );
};

export default VehicleList;
