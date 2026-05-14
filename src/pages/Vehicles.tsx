import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Car, 
  Search, 
  ChevronDown, 
  Eye, 
  Activity, 
  History, 
  MapPin,
  Zap,
  Heart,
  FileText,
  Tag,
  MapPinned,
  Plus,
  Battery,
  Gauge,
  Fuel,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  User,
  Trash2,
  Pencil,
} from 'lucide-react';
import { Vehicle } from '@/types/vehicle';
import StatusBadge from '@/components/StatusBadge';
import { useToast } from '@/hooks/use-toast';
import AddVehicleDialog from '@/components/AddVehicleDialog';
import EditVehicleDialog from '@/components/EditVehicleDialog';
import useFleetData from '@/hooks/useFleetData';
import { deleteDevice } from '@/services/deviceService';

type ViewType = 'list' | 'status' | 'health' | 'documents' | 'categories' | 'tags';

export default function Vehicles() {
  const { fleetData, refresh } = useFleetData();
  const [currentView, setCurrentView] = useState<ViewType>('list');
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [healthDialogOpen, setHealthDialogOpen] = useState(false);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [deleteSubmittingId, setDeleteSubmittingId] = useState<string | null>(null);
  const [editVehicleOpen, setEditVehicleOpen] = useState(false);
  const [editVehicleTarget, setEditVehicleTarget] = useState<Vehicle | null>(null);
  const { toast } = useToast();

  /** Traccar speed is in knots — convert to km/h for display. */
  const toKmh = (knots: number) => Math.round(knots * 1.852);
  /** Prefer the 'fuel' attribute; fall back to 'fuelLevel'. Both are 0–100 %. */
  const fuelPct = (v: { fuel?: number; fuelLevel?: number }) => {
    const f = Number(v.fuel) || 0;
    return f > 0 ? f : (Number(v.fuelLevel) || 0);
  };
  /** Traccar odometer is in metres — convert to km for display. */
  const fmtOdo = (meters: number) =>
    `${(meters / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} km`;

  const vehiclesData = useMemo<Vehicle[]>(
    () =>
      fleetData.map((rawItem) => {
        const item = rawItem as Record<string, unknown>;
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
          serverTime: (item.serverTime as string) || '',
          deviceTime: (item.deviceTime as string) || '',
          fixTime: (item.fixTime as string) || '',
          lastUpdate: (item.lastUpdate as string) || '',
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

  const viewOptions = [
    { value: 'list' as ViewType, label: 'Vehicle List', icon: Car },
    { value: 'status' as ViewType, label: 'Status', icon: Zap },
    { value: 'health' as ViewType, label: 'Health', icon: Heart },
    { value: 'documents' as ViewType, label: 'Documents', icon: FileText },
    { value: 'categories' as ViewType, label: 'Categories', icon: Tag },
    { value: 'tags' as ViewType, label: 'Asset Tags', icon: MapPinned },
  ];

  const currentViewLabel = viewOptions.find(opt => opt.value === currentView)?.label || 'Vehicle List';

  const filteredVehicles = vehiclesData.filter(vehicle =>
    vehicle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.driver.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const onlineCount = vehiclesData.filter((vehicle) => vehicle.status === 'online').length;
  const idleCount = vehiclesData.filter((vehicle) => vehicle.status === 'idle').length;
  const offlineCount = vehiclesData.filter((vehicle) => vehicle.status === 'offline').length;
  const avgFuelLevel = vehiclesData.length
    ? Math.round(vehiclesData.reduce((sum, v) => sum + fuelPct(v), 0) / vehiclesData.length)
    : 0;
  // speed is in knots — average then convert to km/h for display
  const avgSpeed = vehiclesData.length
    ? Math.round(vehiclesData.reduce((sum, v) => sum + v.speed, 0) / vehiclesData.length * 1.852)
    : 0;

  const handleViewDetails = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setDetailsDialogOpen(true);
  };

  const handleCheckHealth = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setHealthDialogOpen(true);
  };

  const handleViewMaintenance = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setMaintenanceDialogOpen(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditVehicleTarget(vehicle);
    setEditVehicleOpen(true);
  };

  const handleTrackLocation = (vehicle: Vehicle) => {
    toast({
      title: "Tracking Vehicle",
      description: `Now tracking ${vehicle.name} in real-time`,
    });
  };

  const handleDeleteVehicle = async (vehicle: Vehicle) => {
    if (!window.confirm(`Delete "${vehicle.name}" from Traccar? This cannot be undone.`)) {
      return;
    }
    const deviceId = vehicle.deviceId || Number(vehicle.id);
    setDeleteSubmittingId(vehicle.id);
    try {
      await deleteDevice(deviceId);
      toast({ title: "Vehicle deleted", description: `${vehicle.name} was removed from Traccar.` });
      if (selectedVehicle?.id === vehicle.id) {
        setSelectedVehicle(null);
        setDetailsDialogOpen(false);
        setHealthDialogOpen(false);
        setMaintenanceDialogOpen(false);
      }
      await refresh();
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "response" in error
          ? String(
              (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
                "Delete failed"
            )
          : error instanceof Error
            ? error.message
            : "Delete failed";
      toast({
        title: "Could not delete vehicle",
        description: message,
        variant: "destructive",
      });
    } finally {
      setDeleteSubmittingId(null);
    }
  };

  const getHealthStatus = (fuelLevel: number) => {
    if (fuelLevel >= 70) return { status: 'Excellent', color: 'text-green-600', icon: CheckCircle2 };
    if (fuelLevel >= 50) return { status: 'Good', color: 'text-blue-600', icon: CheckCircle2 };
    if (fuelLevel >= 30) return { status: 'Fair', color: 'text-yellow-600', icon: AlertTriangle };
    return { status: 'Critical', color: 'text-red-600', icon: AlertTriangle };
  };

  const getBatteryStatus = (vehicle: Vehicle) => {
    const score = Math.max(0, Math.min(100, Math.round((fuelPct(vehicle) * 0.6) + (vehicle.status === 'online' ? 35 : 15))));
    if (score >= 75) return { label: 'Excellent', className: 'text-green-600' };
    if (score >= 50) return { label: 'Good', className: 'text-blue-600' };
    if (score >= 30) return { label: 'Fair', className: 'text-yellow-600' };
    return { label: 'Low', className: 'text-red-600' };
  };

  const getUtilization = (vehicle: Vehicle) => {
    if (vehicle.status === 'online') {
      // Compare km/h (converted from knots) against a 120 km/h reference
      return Math.min(100, Math.max(10, Math.round((toKmh(vehicle.speed) / 120) * 100)));
    }
    if (vehicle.status === 'idle') return 35;
    return 0;
  };

  const renderVehicleList = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filteredVehicles.map((vehicle) => {
        const health = getHealthStatus(fuelPct(vehicle));
        const HealthIcon = health.icon;
        
        return (
          <Card key={vehicle.id} className="hover:shadow-xl hover:-translate-y-0.5 transition-all border-border/70">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {vehicle.imageUrl ? (
                      <img
                        src={vehicle.imageUrl}
                        alt={vehicle.name}
                        className="h-12 w-16 object-cover rounded-xl border border-border shadow-sm"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="p-2.5 bg-primary/10 rounded-xl">
                        <Car className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-base">{vehicle.name}</CardTitle>
                      <CardDescription className="text-xs">{vehicle.plateNumber}</CardDescription>
                    </div>
                  </div>
                  <StatusBadge status={vehicle.status} />
                </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Driver:</span>
                  <span className="font-medium">{vehicle.driver}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2">
                    <Gauge className="h-4 w-4 text-muted-foreground" />
                    <span>{toKmh(vehicle.speed)} km/h</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2">
                    <Fuel className="h-4 w-4 text-muted-foreground" />
                    <span>{fuelPct(vehicle)}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <HealthIcon className={`h-4 w-4 ${health.color}`} />
                  <span className={health.color}>Health: {health.status}</span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleViewDetails(vehicle)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Details
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditVehicle(vehicle)}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleCheckHealth(vehicle)}
                  >
                    <Activity className="h-3 w-3 mr-1" />
                    Health
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleViewMaintenance(vehicle)}
                  >
                    <History className="h-3 w-3 mr-1" />
                    History
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleTrackLocation(vehicle)}
                  >
                    <MapPin className="h-3 w-3 mr-1" />
                    Track
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    disabled={deleteSubmittingId === vehicle.id}
                    onClick={() => void handleDeleteVehicle(vehicle)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    {deleteSubmittingId === vehicle.id ? "…" : "Delete"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const renderStatusView = () => (
    <div className="space-y-4">
      {filteredVehicles.map((vehicle) => (
        <Card key={vehicle.id}>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-4">
                <Car className="h-8 w-8 text-primary shrink-0" />
                <div>
                  <h4 className="font-semibold">{vehicle.name}</h4>
                  <p className="text-sm text-muted-foreground">{vehicle.plateNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <div className="text-xs text-muted-foreground">Speed</div>
                  <div className="font-semibold text-sm">{toKmh(vehicle.speed)} km/h</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Fuel</div>
                  <div className="font-semibold text-sm">{fuelPct(vehicle)}%</div>
                </div>
                <StatusBadge status={vehicle.status} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderHealthView = () => (
    <div className="grid gap-4 md:grid-cols-2">
      {filteredVehicles.map((vehicle) => {
        const health = getHealthStatus(fuelPct(vehicle));
        const HealthIcon = health.icon;
        
        return (
          <Card key={vehicle.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{vehicle.name}</span>
                <HealthIcon className={`h-5 w-5 ${health.color}`} />
              </CardTitle>
              <CardDescription>{vehicle.plateNumber}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Overall Health</span>
                  <span className={`font-semibold ${health.color}`}>{health.status}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Fuel Level</span>
                    <span className="font-medium">{fuelPct(vehicle)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all" 
                      style={{ width: `${fuelPct(vehicle)}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Odometer</span>
                    <span className="font-medium">{fmtOdo(vehicle.odometer)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Battery</span>
                    <Badge variant="outline" className={getBatteryStatus(vehicle).className}>
                      {getBatteryStatus(vehicle).label}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const renderDocumentsView = () => (
    <div className="space-y-4">
      <Card className="border-dashed">
        <CardContent className="py-8 text-center space-y-2">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">
            Document tracking not available from Traccar
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Registration, insurance, and inspection dates are not stored in the
            Traccar API. Configure vehicle maintenance reminders directly in
            Traccar under <span className="font-medium">Maintenance → Service Intervals</span>.
          </p>
        </CardContent>
      </Card>
      {filteredVehicles.map((vehicle) => (
        <Card key={vehicle.id} className="opacity-60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Car className="h-4 w-4" />
              {vehicle.name}
            </CardTitle>
            <CardDescription className="text-xs">{vehicle.plateNumber} · Last seen: {vehicle.lastUpdate ? new Date(vehicle.lastUpdate).toLocaleString() : 'Unknown'}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground italic">
              No document data available — configure in Traccar maintenance settings.
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderCategoriesView = () => {
    const categories = {
      'Online': vehiclesData.filter((vehicle) => vehicle.status === 'online'),
      'Idle': vehiclesData.filter((vehicle) => vehicle.status === 'idle'),
      'Offline': vehiclesData.filter((vehicle) => vehicle.status === 'offline'),
    };

    return (
      <div className="space-y-6">
        {Object.entries(categories).map(([category, vehicles]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Battery className="h-5 w-5 text-primary" />
                {category}
                <Badge variant="secondary">{vehicles.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {vehicles.map((vehicle) => (
                  <div key={vehicle.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{vehicle.name}</div>
                        <div className="text-sm text-muted-foreground">{vehicle.plateNumber}</div>
                      </div>
                    </div>
                    <StatusBadge status={vehicle.status} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderAssetTagsView = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filteredVehicles.map((vehicle) => (
        <Card key={vehicle.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPinned className="h-4 w-4 text-primary" />
              {vehicle.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Asset ID</span>
                <span className="font-mono">{vehicle.id.toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plate Number</span>
                <span className="font-medium">{vehicle.plateNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Location</span>
                <Badge variant="outline" className="text-xs">
                  <MapPin className="h-3 w-3 mr-1" />
                  Tracked
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Utilization</span>
                <span className="font-medium">
                  {getUtilization(vehicle)}%
                </span>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full"
              onClick={() => handleTrackLocation(vehicle)}
            >
              <MapPin className="h-3 w-3 mr-1" />
              View on Map
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-bold">Vehicles</h2>
            <Button onClick={() => setAddVehicleOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Vehicle
            </Button>
          </div>
          <Popover open={viewDropdownOpen} onOpenChange={setViewDropdownOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-[200px] justify-between">
                {currentViewLabel}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-2">
              <div className="space-y-1">
                {viewOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Button
                      key={option.value}
                      variant={currentView === option.value ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => {
                        setCurrentView(option.value);
                        setViewDropdownOpen(false);
                      }}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vehicles, plate numbers, or drivers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardDescription>Fleet Availability</CardDescription>
            <CardTitle className="text-2xl">{onlineCount}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">Online vehicles right now</CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardDescription>Idle Vehicles</CardDescription>
            <CardTitle className="text-2xl">{idleCount}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">Vehicles waiting for dispatch</CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardDescription>Average Speed</CardDescription>
            <CardTitle className="text-2xl">{avgSpeed} km/h</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">Across all connected vehicles</CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardDescription>Average Fuel Level</CardDescription>
            <CardTitle className="text-2xl">{avgFuelLevel}%</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">{offlineCount} currently offline</CardContent>
        </Card>
      </div>

      {filteredVehicles.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No vehicles matched your search. Try a different vehicle name, plate, or driver.
          </CardContent>
        </Card>
      )}

      {currentView === 'list' && renderVehicleList()}
      {currentView === 'status' && renderStatusView()}
      {currentView === 'health' && renderHealthView()}
      {currentView === 'documents' && renderDocumentsView()}
      {currentView === 'categories' && renderCategoriesView()}
      {currentView === 'tags' && renderAssetTagsView()}

      {/* Vehicle Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              {selectedVehicle?.name}
            </DialogTitle>
            <DialogDescription>{selectedVehicle?.plateNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Driver</div>
                <div className="font-medium">{selectedVehicle?.driver}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="mt-1">
                  {selectedVehicle && <StatusBadge status={selectedVehicle.status} />}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Speed</div>
                <div className="font-medium">{selectedVehicle ? toKmh(selectedVehicle.speed) : 0} km/h</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Fuel Level</div>
                <div className="font-medium">{selectedVehicle ? fuelPct(selectedVehicle) : 0}%</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Odometer</div>
                <div className="font-medium">{selectedVehicle ? fmtOdo(selectedVehicle.odometer) : '—'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Last Update</div>
                <div className="font-medium text-sm">
                  {selectedVehicle && new Date(selectedVehicle.lastUpdate).toLocaleString()}
                </div>
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-2">Current Location</div>
              <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                <MapPin className="h-4 w-4 text-primary mt-0.5" />
                <div className="text-sm">{selectedVehicle?.location.address}</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Health Check Dialog */}
      <Dialog open={healthDialogOpen} onOpenChange={setHealthDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Vehicle Health Report
            </DialogTitle>
            <DialogDescription>{selectedVehicle?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedVehicle && (() => {
              const svFuel = fuelPct(selectedVehicle);
              const svKmh  = toKmh(selectedVehicle.speed);
              const health = getHealthStatus(svFuel);
              const HealthIcon = health.icon;
              return (
                <>
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <span className="font-medium">Overall Health</span>
                    <div className="flex items-center gap-2">
                      <HealthIcon className={`h-5 w-5 ${health.color}`} />
                      <span className={`font-semibold ${health.color}`}>{health.status}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Fuel Level</span>
                        <span className="font-medium">{svFuel}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${svFuel}%` }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Engine</div>
                        <Badge variant="outline" className={selectedVehicle.status === 'online' ? 'text-green-600' : 'text-yellow-600'}>
                          {selectedVehicle.status === 'online' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                          {selectedVehicle.status === 'online' ? 'Stable' : 'Needs Check'}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Battery</div>
                        <Badge variant="outline" className={getBatteryStatus(selectedVehicle).className}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {getBatteryStatus(selectedVehicle).label}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Tires</div>
                        <Badge variant="outline" className={svKmh > 90 ? 'text-yellow-600' : 'text-green-600'}>
                          {svKmh > 90 ? <AlertTriangle className="h-3 w-3 mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {svKmh > 90 ? 'Monitor Wear' : 'Normal'}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Brakes</div>
                        <Badge variant="outline" className={svKmh > 110 ? 'text-red-600' : 'text-green-600'}>
                          {svKmh > 110 ? <AlertTriangle className="h-3 w-3 mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {svKmh > 110 ? 'High Usage' : 'Normal'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Maintenance History Dialog */}
      <Dialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Maintenance History
            </DialogTitle>
            <DialogDescription>{selectedVehicle?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 border rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">Telemetry Sync</div>
                  <div className="text-sm text-muted-foreground">
                    Last update: {selectedVehicle ? new Date(selectedVehicle.lastUpdate).toLocaleString() : 'N/A'}
                  </div>
                </div>
                <Badge variant="outline" className="text-green-600">Updated</Badge>
              </div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">Distance Milestone</div>
                  <div className="text-sm text-muted-foreground">
                    Odometer: {selectedVehicle ? fmtOdo(selectedVehicle.odometer) : '—'}
                  </div>
                </div>
                <Badge variant="outline" className="text-green-600">Recorded</Badge>
              </div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">Fuel Trend</div>
                  <div className="text-sm text-muted-foreground">
                    Current fuel: {selectedVehicle ? fuelPct(selectedVehicle) : 0}%
                  </div>
                </div>
                <Badge variant="outline" className={selectedVehicle && fuelPct(selectedVehicle) < 30 ? 'text-yellow-600' : 'text-green-600'}>
                  {selectedVehicle && fuelPct(selectedVehicle) < 30 ? 'Monitor' : 'Stable'}
                </Badge>
              </div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">Driving Activity</div>
                  <div className="text-sm text-muted-foreground">
                    Speed: {selectedVehicle ? toKmh(selectedVehicle.speed) : 0} km/h
                  </div>
                </div>
                <Badge variant="outline" className={selectedVehicle?.status === 'online' ? 'text-green-600' : 'text-muted-foreground'}>
                  {selectedVehicle?.status === 'online' ? 'Active' : 'Idle/Offline'}
                </Badge>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddVehicleDialog
        open={addVehicleOpen}
        onOpenChange={setAddVehicleOpen}
        onVehicleAdded={refresh}
      />

      <EditVehicleDialog
        open={editVehicleOpen}
        onOpenChange={setEditVehicleOpen}
        deviceId={editVehicleTarget ? (editVehicleTarget.deviceId || Number(editVehicleTarget.id)) : 0}
        deviceName={editVehicleTarget?.name}
        onVehicleUpdated={refresh}
      />
    </div>
  );
}
