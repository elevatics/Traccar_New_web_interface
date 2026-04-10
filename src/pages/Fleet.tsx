import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Map, 
  Car, 
  AlertTriangle, 
  MapPin, 
  Bell, 
  MessageSquare, 
  Navigation,
  Eye,
  MonitorPlay
} from 'lucide-react';
import FleetMap from '@/components/FleetMap';
import Vehicle360View from '@/components/Vehicle360View';
import VehicleList from '@/components/VehicleList';
import { mockVehicles } from '@/data/mockVehicles';
import { Vehicle } from '@/types/vehicle';

const MAPBOX_TOKEN = '[REDACTED_MAPBOX_TOKEN]';

export default function Fleet() {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [liveView, setLiveView] = useState(false);
  const [selectedVehicles, setSelectedVehicles] = useState<Vehicle[]>([mockVehicles[0]]);

  const toggleVehicleSelection = (vehicle: Vehicle) => {
    setSelectedVehicles(prev => {
      const exists = prev.find(v => v.id === vehicle.id);
      if (exists) {
        return prev.filter(v => v.id !== vehicle.id);
      }
      return [...prev, vehicle];
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b bg-background">
        <h2 className="text-2xl font-bold mb-4">Fleet - Live Map & Status</h2>
        
        <Tabs defaultValue="live-map" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
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
                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedVehicle(mockVehicles[0])}>
                        <Eye className="h-4 w-4 mr-2" />
                        View on Map
                      </Button>
                      <Button variant="outline" size="sm">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Send Message
                      </Button>
                      <Button variant="outline" size="sm">
                        <Navigation className="h-4 w-4 mr-2" />
                        Track Live Trip
                      </Button>
                      <Button 
                        variant={liveView ? "default" : "outline"} 
                        size="sm"
                        onClick={() => setLiveView(!liveView)}
                      >
                        <MonitorPlay className="h-4 w-4 mr-2" />
                        Live View
                      </Button>
                    </div>

                    {/* Map + 360 View Layout */}
                    <div className={liveView ? "grid grid-cols-3 gap-4 h-[600px]" : "h-[600px]"}>
                      {liveView ? (
                        <>
                          {/* Map takes 2/3 */}
                          <div className="col-span-2 border rounded-lg overflow-hidden">
                            <FleetMap 
                              vehicles={mockVehicles} 
                              selectedVehicle={selectedVehicle}
                              onSelectVehicle={setSelectedVehicle}
                              onClearSelection={() => setSelectedVehicle(null)}
                              apiToken={MAPBOX_TOKEN}
                            />
                          </div>
                          {/* 360 View takes 1/3 */}
                          <div className="col-span-1">
                            <Vehicle360View vehicle={selectedVehicle || mockVehicles[0]} />
                          </div>
                        </>
                      ) : (
                        <FleetMap 
                          vehicles={mockVehicles} 
                          selectedVehicle={selectedVehicle}
                          onSelectVehicle={setSelectedVehicle}
                          onClearSelection={() => setSelectedVehicle(null)}
                          apiToken={MAPBOX_TOKEN}
                        />
                      )}
                    </div>
                  </div>
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
                  {liveView && (
                    <div className="text-sm text-muted-foreground mb-2">
                      Click on vehicles to add/remove from live view tracking
                    </div>
                  )}
                  {mockVehicles.map((vehicle) => (
                    <div 
                      key={vehicle.id} 
                      className={`p-4 border rounded-lg hover:bg-muted/50 transition-colors ${
                        liveView && selectedVehicles.find(v => v.id === vehicle.id) 
                          ? 'border-primary bg-primary/5' 
                          : ''
                      }`}
                      onClick={() => liveView && toggleVehicleSelection(vehicle)}
                      style={{ cursor: liveView ? 'pointer' : 'default' }}
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
                      <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                        <div>Speed: {vehicle.speed} km/h</div>
                        <div>Fuel: {vehicle.fuelLevel}%</div>
                        <div>Odometer: {vehicle.odometer} km</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Alerts & Notifications</CardTitle>
                <CardDescription>Current warnings and critical notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-4 border-l-4 border-red-500 bg-red-50 dark:bg-red-950/20 rounded">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-red-700 dark:text-red-400">Speed Limit Exceeded</h4>
                        <p className="text-sm text-red-600 dark:text-red-300">Truck Alpha - 85 km/h in 60 km/h zone</p>
                        <p className="text-xs text-muted-foreground mt-1">2 minutes ago</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 rounded">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-yellow-700 dark:text-yellow-400">Low Fuel Warning</h4>
                        <p className="text-sm text-yellow-600 dark:text-yellow-300">Van Delta - Fuel level at 45%</p>
                        <p className="text-xs text-muted-foreground mt-1">15 minutes ago</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="geofences" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Geofence Management</CardTitle>
                <CardDescription>Manage zones and boundaries for fleet monitoring</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button>
                    <MapPin className="h-4 w-4 mr-2" />
                    Create New Geofence
                  </Button>
                  <div className="space-y-2">
                    <div className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">Downtown Delivery Zone</h4>
                          <p className="text-sm text-muted-foreground">Radius: 5 km</p>
                        </div>
                        <div className="text-sm text-muted-foreground">3 vehicles inside</div>
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">Warehouse Area</h4>
                          <p className="text-sm text-muted-foreground">Radius: 2 km</p>
                        </div>
                        <div className="text-sm text-muted-foreground">1 vehicle inside</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Alert History & Rules</CardTitle>
                <CardDescription>Configure and view notification history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button variant="outline">
                    <Bell className="h-4 w-4 mr-2" />
                    Configure Alert Rules
                  </Button>
                  <div className="space-y-2">
                    <div className="p-3 border rounded-lg text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">Speed limit violation - Truck Alpha</span>
                        <span className="text-muted-foreground">2m ago</span>
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">Low fuel alert - Van Delta</span>
                        <span className="text-muted-foreground">15m ago</span>
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">Maintenance due - Truck Gamma</span>
                        <span className="text-muted-foreground">1h ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
