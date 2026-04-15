import { useState } from 'react';
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
  User
} from 'lucide-react';
import { mockVehicles } from '@/data/mockVehicles';
import { Vehicle } from '@/types/vehicle';
import StatusBadge from '@/components/StatusBadge';
import { useToast } from '@/hooks/use-toast';
import AddVehicleDialog from '@/components/AddVehicleDialog';

type ViewType = 'list' | 'status' | 'health' | 'documents' | 'categories' | 'tags';

export default function Vehicles() {
  const [currentView, setCurrentView] = useState<ViewType>('list');
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [healthDialogOpen, setHealthDialogOpen] = useState(false);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const { toast } = useToast();

  const viewOptions = [
    { value: 'list' as ViewType, label: 'Vehicle List', icon: Car },
    { value: 'status' as ViewType, label: 'Status', icon: Zap },
    { value: 'health' as ViewType, label: 'Health', icon: Heart },
    { value: 'documents' as ViewType, label: 'Documents', icon: FileText },
    { value: 'categories' as ViewType, label: 'Categories', icon: Tag },
    { value: 'tags' as ViewType, label: 'Asset Tags', icon: MapPinned },
  ];

  const currentViewLabel = viewOptions.find(opt => opt.value === currentView)?.label || 'Vehicle List';

  const filteredVehicles = mockVehicles.filter(vehicle =>
    vehicle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.driver.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleTrackLocation = (vehicle: Vehicle) => {
    toast({
      title: "Tracking Vehicle",
      description: `Now tracking ${vehicle.name} in real-time`,
    });
  };

  const getHealthStatus = (fuelLevel: number) => {
    if (fuelLevel >= 70) return { status: 'Excellent', color: 'text-green-600', icon: CheckCircle2 };
    if (fuelLevel >= 50) return { status: 'Good', color: 'text-blue-600', icon: CheckCircle2 };
    if (fuelLevel >= 30) return { status: 'Fair', color: 'text-yellow-600', icon: AlertTriangle };
    return { status: 'Critical', color: 'text-red-600', icon: AlertTriangle };
  };

  const renderVehicleList = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {filteredVehicles.map((vehicle) => {
        const health = getHealthStatus(vehicle.fuelLevel);
        const HealthIcon = health.icon;
        
        return (
          <Card key={vehicle.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Car className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{vehicle.name}</CardTitle>
                    <CardDescription>{vehicle.plateNumber}</CardDescription>
                  </div>
                </div>
                <StatusBadge status={vehicle.status} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Driver:</span>
                  <span className="font-medium">{vehicle.driver}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-muted-foreground" />
                    <span>{vehicle.speed} km/h</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Fuel className="h-4 w-4 text-muted-foreground" />
                    <span>{vehicle.fuelLevel}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <HealthIcon className={`h-4 w-4 ${health.color}`} />
                  <span className={health.color}>Health: {health.status}</span>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
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
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Car className="h-8 w-8 text-primary" />
                <div>
                  <h4 className="font-semibold">{vehicle.name}</h4>
                  <p className="text-sm text-muted-foreground">{vehicle.plateNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Speed</div>
                  <div className="font-semibold">{vehicle.speed} km/h</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Fuel</div>
                  <div className="font-semibold">{vehicle.fuelLevel}%</div>
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
        const health = getHealthStatus(vehicle.fuelLevel);
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
                    <span className="font-medium">{vehicle.fuelLevel}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all" 
                      style={{ width: `${vehicle.fuelLevel}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Odometer</span>
                    <span className="font-medium">{vehicle.odometer.toLocaleString()} km</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Battery</span>
                    <Badge variant="outline" className="text-green-600">Good</Badge>
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
      {filteredVehicles.map((vehicle) => (
        <Card key={vehicle.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              {vehicle.name}
            </CardTitle>
            <CardDescription>{vehicle.plateNumber}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <div className="text-sm font-medium">Registration</div>
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Valid
                </Badge>
                <div className="text-xs text-muted-foreground">Expires: 12/2025</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Insurance</div>
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Active
                </Badge>
                <div className="text-xs text-muted-foreground">Expires: 08/2025</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">Inspection</div>
                <Badge variant="outline" className="text-yellow-600">
                  <Calendar className="h-3 w-3 mr-1" />
                  Due Soon
                </Badge>
                <div className="text-xs text-muted-foreground">Due: 11/2024</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderCategoriesView = () => {
    const categories = {
      'Electric': mockVehicles.filter((_, i) => i % 3 === 0),
      'Hybrid': mockVehicles.filter((_, i) => i % 3 === 1),
      'Gasoline': mockVehicles.filter((_, i) => i % 3 === 2),
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
                  {vehicle.status === 'online' ? '85%' : vehicle.status === 'idle' ? '45%' : '0%'}
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
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">Vehicles</h2>
            <Button onClick={() => setAddVehicleOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Vehicle
            </Button>
          </div>
          <Popover open={viewDropdownOpen} onOpenChange={setViewDropdownOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[200px] justify-between">
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

      {currentView === 'list' && renderVehicleList()}
      {currentView === 'status' && renderStatusView()}
      {currentView === 'health' && renderHealthView()}
      {currentView === 'documents' && renderDocumentsView()}
      {currentView === 'categories' && renderCategoriesView()}
      {currentView === 'tags' && renderAssetTagsView()}

      {/* Vehicle Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              {selectedVehicle?.name}
            </DialogTitle>
            <DialogDescription>{selectedVehicle?.plateNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                <div className="font-medium">{selectedVehicle?.speed} km/h</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Fuel Level</div>
                <div className="font-medium">{selectedVehicle?.fuelLevel}%</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Odometer</div>
                <div className="font-medium">{selectedVehicle?.odometer.toLocaleString()} km</div>
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
              const health = getHealthStatus(selectedVehicle.fuelLevel);
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
                        <span className="font-medium">{selectedVehicle.fuelLevel}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${selectedVehicle.fuelLevel}%` }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Engine</div>
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Good
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Battery</div>
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Good
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Tires</div>
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Good
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Brakes</div>
                        <Badge variant="outline" className="text-yellow-600">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Check Soon
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
                  <div className="font-medium">Oil Change</div>
                  <div className="text-sm text-muted-foreground">Last service: 2 weeks ago</div>
                </div>
                <Badge variant="outline" className="text-green-600">Completed</Badge>
              </div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">Tire Rotation</div>
                  <div className="text-sm text-muted-foreground">Last service: 1 month ago</div>
                </div>
                <Badge variant="outline" className="text-green-600">Completed</Badge>
              </div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">Brake Inspection</div>
                  <div className="text-sm text-muted-foreground">Due in 2 weeks</div>
                </div>
                <Badge variant="outline" className="text-yellow-600">Upcoming</Badge>
              </div>
            </div>
            <div className="p-3 border rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">Annual Inspection</div>
                  <div className="text-sm text-muted-foreground">Last service: 3 months ago</div>
                </div>
                <Badge variant="outline" className="text-green-600">Completed</Badge>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddVehicleDialog open={addVehicleOpen} onOpenChange={setAddVehicleOpen} />
    </div>
  );
}
