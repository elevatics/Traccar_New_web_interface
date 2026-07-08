import { useMemo, useState, type MouseEvent } from 'react';
import { Vehicle, VehicleStatus } from '@/types/vehicle';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import StatusBadge from './StatusBadge';
import { cn } from '@/lib/utils';
import { ChevronDown, Plus, Trash2, Pencil, Car } from 'lucide-react';
import AddVehicleDialog from './AddVehicleDialog';
import EditVehicleDialog from './EditVehicleDialog';
import { useFleetDataContext } from '@/contexts/FleetDataContext';
import { formatDistanceToNow } from 'date-fns';
import { deleteDevice } from '@/services/deviceService';
import { toast } from 'sonner';

const toVehicleStatus = (status?: string): VehicleStatus => {
  if (status === 'online' || status === 'idle' || status === 'offline') return status;
  return 'offline';
};

const getUpdatedText = (vehicle: Vehicle) => {
  const updatedAt =
    vehicle.lastUpdate || vehicle.fixTime || vehicle.deviceTime || vehicle.serverTime;

  if (!updatedAt) return 'N/A';

  const parsed = new Date(updatedAt);
  if (Number.isNaN(parsed.getTime())) return 'N/A';

  return formatDistanceToNow(parsed, { addSuffix: true });
};

interface VehicleListProps {
  selectedVehicle: Vehicle | null;
  onSelectVehicle: (vehicle: Vehicle | null) => void;
  filterStatus: VehicleStatus | 'all';
  onFilterChange: (status: VehicleStatus | 'all') => void;
}

const VehicleList = ({
  selectedVehicle,
  onSelectVehicle,
  filterStatus,
  onFilterChange,
}: VehicleListProps) => {
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{ deviceId: number; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);

  const { vehicles, loading, error, refresh, idleStartTimes } = useFleetDataContext();

  const getIdleLabel = (vehicleId: string): string | null => {
    const start = idleStartTimes[vehicleId];
    if (!start) return null;
    const mins = Math.floor((Date.now() - start) / 60000);
    if (mins < 1) return 'Idle < 1 min';
    return `Idle ${mins} min`;
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    const vehicle = deleteTarget;
    setDeleteTarget(null);
    setDeletingId(vehicle.id);
    try {
      await deleteDevice(vehicle.deviceId);
      toast.success(`"${vehicle.name}" removed from Elevatics IoT Platform`);
      if (selectedVehicle?.id === vehicle.id) onSelectVehicle(null);
      await refresh();
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      toast.error(message || (err instanceof Error ? err.message : 'Could not delete vehicle'));
    } finally {
      setDeletingId(null);
    }
  };

  const filteredVehicles = useMemo(
    () => (filterStatus === 'all' ? vehicles : vehicles.filter((v) => v.status === filterStatus)),
    [vehicles, filterStatus]
  );

  const statusCounts = useMemo(
    () => ({
      all: vehicles.length,
      online: vehicles.filter((v) => v.status === 'online').length,
      idle: vehicles.filter((v) => v.status === 'idle').length,
      offline: vehicles.filter((v) => v.status === 'offline').length,
    }),
    [vehicles]
  );

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
        {loading && (
          <>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </>
        )}
        {!loading && error && (
          <div className="flex flex-col items-center py-8 text-center gap-2">
            <p className="text-sm font-medium text-destructive">Connection error</p>
            <p className="text-xs text-muted-foreground">{error}</p>
            <Button size="sm" variant="outline" onClick={refresh} className="mt-1">Retry</Button>
          </div>
        )}
        {!loading && !error && filteredVehicles.length === 0 && (
          <div className="flex flex-col items-center py-10 text-center text-muted-foreground gap-3">
            <Car className="h-10 w-10 opacity-20" />
            <div>
              <p className="text-sm font-medium">No vehicles found</p>
              <p className="text-xs mt-0.5">
                {filterStatus === 'all'
                  ? 'Add a vehicle to get started'
                  : `No ${filterStatus} vehicles right now`}
              </p>
            </div>
            {filterStatus !== 'all' && (
              <Button size="sm" variant="ghost" onClick={() => onFilterChange('all')}>
                Show all
              </Button>
            )}
          </div>
        )}
        {!loading && !error && filteredVehicles.map((vehicle) => (
          <Collapsible key={vehicle.id}>
            <Card
              className={cn(
                'transition-all border',
                selectedVehicle?.id === vehicle.id
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <CollapsibleTrigger asChild>
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => onSelectVehicle(vehicle)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {vehicle.imageUrl ? (
                      <div className="relative flex-shrink-0">
                        <img
                          src={vehicle.imageUrl}
                          alt={vehicle.name}
                          className="h-12 w-16 object-cover rounded-xl shadow-sm"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                        <span
                          className={cn(
                            'absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-card shadow-sm',
                            vehicle.status === 'online' ? 'bg-green-500'
                              : vehicle.status === 'idle' ? 'bg-yellow-400'
                              : 'bg-red-500'
                          )}
                        />
                      </div>
                    ) : (
                      <StatusBadge status={toVehicleStatus(vehicle.status)} showLabel={false} size="sm" />
                    )}
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
                  onClick={() => onSelectVehicle(vehicle)}
                >
                  <div className="text-xs space-y-1.5">
                    <p className="text-muted-foreground">
                      Driver: <span className="text-card-foreground font-medium">{vehicle.driver || '-'}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Speed:{' '}
                      <span className="text-card-foreground font-medium">
                        {vehicle.motion === false || vehicle.status === 'offline' || vehicle.speed < 0.5
                          ? '0 km/h'
                          : `${Math.round(vehicle.speed * 1.852)} km/h`}
                      </span>
                    </p>
                    <p className="text-muted-foreground">
                      Updated: <span className="text-card-foreground font-medium">{getUpdatedText(vehicle)}</span>
                    </p>
                    {vehicle.status === 'idle' && getIdleLabel(vehicle.id) && (
                      <p className="inline-flex items-center gap-1 rounded-md bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 font-medium">
                        ⏱ {getIdleLabel(vehicle.id)}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      variant={selectedVehicle?.id === vehicle.id ? 'default' : 'outline'}
                      type="button"
                    >
                      View on Map
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      type="button"
                      title="Edit vehicle"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditTarget({ deviceId: vehicle.deviceId, name: vehicle.name });
                        setEditOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 text-destructive hover:text-destructive"
                      type="button"
                      disabled={deletingId === vehicle.id}
                      title="Delete from Elevatics IoT Platform"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget(vehicle); }}
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
      <EditVehicleDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        deviceId={editTarget?.deviceId ?? 0}
        deviceName={editTarget?.name}
        onVehicleUpdated={refresh}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove vehicle?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <span className="font-semibold text-foreground">"{deleteTarget?.name}"</span> from the Elevatics IoT Platform. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirmed}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VehicleList;
