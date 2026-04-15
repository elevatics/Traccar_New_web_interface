import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Wrench, 
  Search, 
  ChevronDown, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  FileText,
  AlertTriangle,
  DollarSign,
  Plus,
  History,
  TrendingUp,
  Car,
  User,
  ClipboardList
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import useFleetData from '@/hooks/useFleetData';

type ViewType = 'schedule' | 'in-progress' | 'completed' | 'create' | 'breakdown' | 'cost';

interface MaintenanceOrder {
  id: string;
  vehicleId: string;
  vehicleName: string;
  type: 'scheduled' | 'breakdown' | 'inspection';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'scheduled' | 'in-progress' | 'completed';
  scheduledDate: string;
  completedDate?: string;
  cost?: number;
  technician?: string;
  notes?: string;
}

const mockMaintenanceOrders: MaintenanceOrder[] = [
  {
    id: 'mo1',
    vehicleId: 'v1',
    vehicleName: 'Truck Alpha',
    type: 'scheduled',
    description: 'Oil change and filter replacement',
    priority: 'medium',
    status: 'scheduled',
    scheduledDate: '2025-11-01',
    cost: 150,
  },
  {
    id: 'mo2',
    vehicleId: 'v2',
    vehicleName: 'Van Beta',
    type: 'breakdown',
    description: 'Brake system repair',
    priority: 'critical',
    status: 'in-progress',
    scheduledDate: '2025-10-25',
    technician: 'Mike Johnson',
    cost: 450,
  },
  {
    id: 'mo3',
    vehicleId: 'v3',
    vehicleName: 'Truck Gamma',
    type: 'scheduled',
    description: 'Tire rotation and alignment',
    priority: 'low',
    status: 'completed',
    scheduledDate: '2025-10-15',
    completedDate: '2025-10-15',
    cost: 200,
    technician: 'John Smith',
  },
  {
    id: 'mo4',
    vehicleId: 'v4',
    vehicleName: 'Van Delta',
    type: 'inspection',
    description: 'Annual safety inspection',
    priority: 'high',
    status: 'scheduled',
    scheduledDate: '2025-10-28',
    cost: 100,
  },
  {
    id: 'mo5',
    vehicleId: 'v5',
    vehicleName: 'Truck Epsilon',
    type: 'breakdown',
    description: 'Engine overheating issue',
    priority: 'critical',
    status: 'in-progress',
    scheduledDate: '2025-10-24',
    technician: 'Sarah Williams',
    cost: 850,
  },
  {
    id: 'mo6',
    vehicleId: 'v1',
    vehicleName: 'Truck Alpha',
    type: 'scheduled',
    description: 'Battery replacement',
    priority: 'medium',
    status: 'completed',
    scheduledDate: '2025-10-10',
    completedDate: '2025-10-10',
    cost: 180,
    technician: 'Mike Johnson',
  },
];

export default function Maintenance() {
  const { fleetData } = useFleetData();
  const [currentView, setCurrentView] = useState<ViewType>('schedule');
  const [viewDropdownOpen, setViewDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [createOrderDialogOpen, setCreateOrderDialogOpen] = useState(false);
  const [costDialogOpen, setCostDialogOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const { toast } = useToast();
  const vehiclesData = useMemo(
    () =>
      fleetData.map((rawItem) => {
        const item = rawItem as Record<string, unknown>;
        return {
          id: String(item.id),
          name: String(item.name || `Device ${String(item.id)}`),
          plateNumber: String(item.plateNumber || "-"),
        };
      }),
    [fleetData]
  );

  const viewOptions = [
    { value: 'schedule' as ViewType, label: 'Maintenance Schedule', icon: Wrench },
    { value: 'in-progress' as ViewType, label: 'In Progress', icon: Clock },
    { value: 'completed' as ViewType, label: 'Completed', icon: CheckCircle2 },
    { value: 'create' as ViewType, label: 'Create Order', icon: FileText },
    { value: 'breakdown' as ViewType, label: 'Breakdown Reports', icon: AlertTriangle },
    { value: 'cost' as ViewType, label: 'Maintenance Cost', icon: DollarSign },
  ];

  const currentViewLabel = viewOptions.find(opt => opt.value === currentView)?.label || 'Maintenance Schedule';

  const filteredOrders = mockMaintenanceOrders.filter(order =>
    order.vehicleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400';
      case 'high': return 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400';
      case 'low': return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'breakdown': return AlertTriangle;
      case 'inspection': return ClipboardList;
      default: return Wrench;
    }
  };

  const handleScheduleMaintenance = () => {
    setScheduleDialogOpen(true);
  };

  const handleViewHistory = () => {
    setHistoryDialogOpen(true);
  };

  const handleCreateOrder = () => {
    setCreateOrderDialogOpen(true);
  };

  const handleTrackCosts = () => {
    setCostDialogOpen(true);
  };

  const handleSubmitOrder = () => {
    toast({
      title: "Maintenance Order Created",
      description: "The maintenance order has been scheduled successfully.",
    });
    setCreateOrderDialogOpen(false);
  };

  const renderScheduleView = () => {
    const scheduledOrders = filteredOrders.filter(o => o.status === 'scheduled');
    
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {scheduledOrders.map((order) => {
          const TypeIcon = getTypeIcon(order.type);
          
          return (
            <Card key={order.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <TypeIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{order.vehicleName}</CardTitle>
                      <CardDescription>{order.description}</CardDescription>
                    </div>
                  </div>
                  <Badge className={getPriorityColor(order.priority)}>
                    {order.priority}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Scheduled:</span>
                    <span className="font-medium">
                      {new Date(order.scheduledDate).toLocaleDateString()}
                    </span>
                  </div>
                  {order.cost && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Estimated Cost:</span>
                      <span className="font-medium">${order.cost}</span>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      Start Work
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      Reschedule
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderInProgressView = () => {
    const inProgressOrders = filteredOrders.filter(o => o.status === 'in-progress');
    
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {inProgressOrders.map((order) => {
          const TypeIcon = getTypeIcon(order.type);
          
          return (
            <Card key={order.id} className="border-primary/50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <TypeIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{order.vehicleName}</CardTitle>
                      <CardDescription>{order.description}</CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                    In Progress
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.technician && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Technician:</span>
                      <span className="font-medium">{order.technician}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Started:</span>
                    <span className="font-medium">
                      {new Date(order.scheduledDate).toLocaleDateString()}
                    </span>
                  </div>
                  {order.cost && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Cost:</span>
                      <span className="font-medium">${order.cost}</span>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" className="flex-1">
                      Complete
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      Update Status
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderCompletedView = () => {
    const completedOrders = filteredOrders.filter(o => o.status === 'completed');
    
    return (
      <div className="space-y-4">
        {completedOrders.map((order) => {
          const TypeIcon = getTypeIcon(order.type);
          
          return (
            <Card key={order.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <TypeIcon className="h-6 w-6 text-muted-foreground" />
                    <div>
                      <h4 className="font-semibold">{order.vehicleName}</h4>
                      <p className="text-sm text-muted-foreground">{order.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {order.technician && (
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Technician</div>
                        <div className="font-medium">{order.technician}</div>
                      </div>
                    )}
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Completed</div>
                      <div className="font-medium">
                        {order.completedDate && new Date(order.completedDate).toLocaleDateString()}
                      </div>
                    </div>
                    {order.cost && (
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Cost</div>
                        <div className="font-medium">${order.cost}</div>
                      </div>
                    )}
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderCreateOrderView = () => {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Create New Maintenance Order</CardTitle>
          <CardDescription>Schedule maintenance for your fleet vehicles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle">Vehicle</Label>
              <Select>
                <SelectTrigger id="vehicle">
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehiclesData.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.name} - {vehicle.plateNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Maintenance Type</Label>
              <Select>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled Maintenance</SelectItem>
                  <SelectItem value="breakdown">Breakdown Repair</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select>
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                placeholder="Describe the maintenance work needed..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Scheduled Date</Label>
                <Input id="date" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Estimated Cost ($)</Label>
                <Input id="cost" type="number" placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="technician">Assign Technician (Optional)</Label>
              <Input id="technician" placeholder="Technician name" />
            </div>
            <Button className="w-full" onClick={handleSubmitOrder}>
              <Plus className="h-4 w-4 mr-2" />
              Create Maintenance Order
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderBreakdownView = () => {
    const breakdownOrders = filteredOrders.filter(o => o.type === 'breakdown');
    
    return (
      <div className="space-y-4">
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Emergency Breakdown Reports
            </CardTitle>
            <CardDescription>
              Critical vehicle issues requiring immediate attention
            </CardDescription>
          </CardHeader>
        </Card>
        
        <div className="grid gap-4 md:grid-cols-2">
          {breakdownOrders.map((order) => (
            <Card key={order.id} className="border-red-200 dark:border-red-900">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{order.vehicleName}</CardTitle>
                    <CardDescription>{order.description}</CardDescription>
                  </div>
                  <Badge className={getPriorityColor(order.priority)}>
                    {order.priority}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="outline" className={
                      order.status === 'in-progress' 
                        ? 'text-blue-600' 
                        : order.status === 'completed'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }>
                      {order.status}
                    </Badge>
                  </div>
                  {order.technician && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Technician:</span>
                      <span className="font-medium">{order.technician}</span>
                    </div>
                  )}
                  {order.cost && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Repair Cost:</span>
                      <span className="font-medium">${order.cost}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderCostView = () => {
    const totalCost = mockMaintenanceOrders.reduce((sum, order) => sum + (order.cost || 0), 0);
    const completedCost = mockMaintenanceOrders
      .filter(o => o.status === 'completed')
      .reduce((sum, order) => sum + (order.cost || 0), 0);
    const inProgressCost = mockMaintenanceOrders
      .filter(o => o.status === 'in-progress')
      .reduce((sum, order) => sum + (order.cost || 0), 0);
    const scheduledCost = mockMaintenanceOrders
      .filter(o => o.status === 'scheduled')
      .reduce((sum, order) => sum + (order.cost || 0), 0);

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Maintenance Cost</CardDescription>
              <CardTitle className="text-2xl">${totalCost.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Completed Work</CardDescription>
              <CardTitle className="text-2xl text-green-600">${completedCost.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>In Progress</CardDescription>
              <CardTitle className="text-2xl text-blue-600">${inProgressCost.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Scheduled</CardDescription>
              <CardTitle className="text-2xl text-yellow-600">${scheduledCost.toLocaleString()}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Maintenance Cost Breakdown</CardTitle>
            <CardDescription>Detailed expense tracking by vehicle</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {vehiclesData.map((vehicle) => {
                const vehicleOrders = mockMaintenanceOrders.filter(o => o.vehicleId === vehicle.id);
                const vehicleCost = vehicleOrders.reduce((sum, order) => sum + (order.cost || 0), 0);
                
                if (vehicleCost === 0) return null;
                
                return (
                  <div key={vehicle.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Car className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h4 className="font-semibold">{vehicle.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {vehicleOrders.length} maintenance order{vehicleOrders.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">${vehicleCost.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">
                        {((vehicleCost / totalCost) * 100).toFixed(1)}% of total
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost by Maintenance Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="h-4 w-4 text-primary" />
                  <span className="font-medium">Scheduled</span>
                </div>
                <div className="text-2xl font-semibold">
                  ${mockMaintenanceOrders
                    .filter(o => o.type === 'scheduled')
                    .reduce((sum, order) => sum + (order.cost || 0), 0)
                    .toLocaleString()}
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="font-medium">Breakdowns</span>
                </div>
                <div className="text-2xl font-semibold text-red-600">
                  ${mockMaintenanceOrders
                    .filter(o => o.type === 'breakdown')
                    .reduce((sum, order) => sum + (order.cost || 0), 0)
                    .toLocaleString()}
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardList className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Inspections</span>
                </div>
                <div className="text-2xl font-semibold">
                  ${mockMaintenanceOrders
                    .filter(o => o.type === 'inspection')
                    .reduce((sum, order) => sum + (order.cost || 0), 0)
                    .toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-2xl font-bold">Maintenance</h2>
          
          <div className="flex items-center gap-2">
            {/* Quick Actions */}
            <Button variant="outline" size="sm" onClick={handleScheduleMaintenance}>
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </Button>
            <Button variant="outline" size="sm" onClick={handleViewHistory}>
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
            <Button variant="outline" size="sm" onClick={handleCreateOrder}>
              <Plus className="h-4 w-4 mr-2" />
              Create Order
            </Button>
            <Button variant="outline" size="sm" onClick={handleTrackCosts}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Costs
            </Button>
            
            {/* View Selector */}
            <Popover open={viewDropdownOpen} onOpenChange={setViewDropdownOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[220px] justify-between">
                  {currentViewLabel}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-2">
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
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search maintenance orders or vehicles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {currentView === 'schedule' && renderScheduleView()}
      {currentView === 'in-progress' && renderInProgressView()}
      {currentView === 'completed' && renderCompletedView()}
      {currentView === 'create' && renderCreateOrderView()}
      {currentView === 'breakdown' && renderBreakdownView()}
      {currentView === 'cost' && renderCostView()}

      {/* Schedule Maintenance Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Maintenance</DialogTitle>
            <DialogDescription>
              Set up a new maintenance task for your vehicle
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="schedule-vehicle">Vehicle</Label>
              <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                <SelectTrigger id="schedule-vehicle">
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehiclesData.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.name} - {vehicle.plateNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-date">Date</Label>
              <Input id="schedule-date" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-type">Service Type</Label>
              <Select>
                <SelectTrigger id="schedule-type">
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oil">Oil Change</SelectItem>
                  <SelectItem value="tires">Tire Service</SelectItem>
                  <SelectItem value="brakes">Brake Service</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              handleSubmitOrder();
              setScheduleDialogOpen(false);
            }}>
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Maintenance History</DialogTitle>
            <DialogDescription>
              Complete service records for all vehicles
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {mockMaintenanceOrders
              .filter(o => o.status === 'completed')
              .map((order) => (
                <div key={order.id} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{order.vehicleName}</div>
                      <div className="text-sm text-muted-foreground">{order.description}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Completed: {order.completedDate && new Date(order.completedDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${order.cost}</div>
                      {order.technician && (
                        <div className="text-xs text-muted-foreground">{order.technician}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Order Dialog (Quick Action) */}
      <Dialog open={createOrderDialogOpen} onOpenChange={setCreateOrderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Create Maintenance Order</DialogTitle>
            <DialogDescription>
              Quickly schedule a new maintenance task
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Vehicle</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehiclesData.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Describe the work needed..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOrderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              handleSubmitOrder();
              setCreateOrderDialogOpen(false);
            }}>
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Track Costs Dialog */}
      <Dialog open={costDialogOpen} onOpenChange={setCostDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Maintenance Cost Summary
            </DialogTitle>
            <DialogDescription>
              Overview of maintenance expenses
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-primary/5 rounded-lg">
                <div className="text-sm text-muted-foreground">Total Spent</div>
                <div className="text-2xl font-bold">
                  ${mockMaintenanceOrders
                    .filter(o => o.status === 'completed')
                    .reduce((sum, order) => sum + (order.cost || 0), 0)
                    .toLocaleString()}
                </div>
              </div>
              <div className="p-4 bg-primary/5 rounded-lg">
                <div className="text-sm text-muted-foreground">Avg Cost per Order</div>
                <div className="text-2xl font-bold">
                  ${Math.round(
                    mockMaintenanceOrders
                      .filter(o => o.cost)
                      .reduce((sum, order) => sum + (order.cost || 0), 0) /
                    mockMaintenanceOrders.filter(o => o.cost).length
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Cost Distribution</div>
              {['scheduled', 'breakdown', 'inspection'].map((type) => {
                const typeCost = mockMaintenanceOrders
                  .filter(o => o.type === type)
                  .reduce((sum, order) => sum + (order.cost || 0), 0);
                const total = mockMaintenanceOrders.reduce((sum, order) => sum + (order.cost || 0), 0);
                const percentage = total > 0 ? (typeCost / total) * 100 : 0;
                
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{type}</span>
                      <span className="font-medium">${typeCost.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
