import { useEffect, useMemo, useState } from 'react';
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
import GeofenceManager from '@/components/GeofenceManager';
import { mockVehicles } from '@/data/mockVehicles';
import { Vehicle } from '@/types/vehicle';
import { getEvents } from '@/services/eventService';
import useFleetData from '@/hooks/useFleetData';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? '';

export default function Fleet() {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [liveView, setLiveView] = useState(false);
  const [alerts, setAlerts] = useState<{ type: string; deviceId: number | null; eventTime: string | null }[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);
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
        } as Vehicle;
      }),
    [fleetData]
  );

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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedVehicle(liveVehicles[0] || mockVehicles[0])}
                        disabled={liveVehicles.length === 0 && fleetLoading}
                      >
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
                              vehicles={liveVehicles} 
                              selectedVehicle={selectedVehicle}
                              onSelectVehicle={setSelectedVehicle}
                              onClearSelection={() => setSelectedVehicle(null)}
                              apiToken={MAPBOX_TOKEN}
                            />
                          </div>
                          {/* 360 View takes 1/3 */}
                          <div className="col-span-1">
                            <Vehicle360View vehicle={selectedVehicle || liveVehicles[0] || mockVehicles[0]} />
                          </div>
                        </>
                      ) : (
                        <FleetMap 
                          vehicles={liveVehicles} 
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
                      <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                        <div>Speed: {vehicle.speed} km/h</div>
                        <div>Fuel: {vehicle.fuelLevel}%</div>
                        <div>Odometer: {vehicle.odometer} km</div>
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
              <CardHeader>
                <CardTitle>Latest Alerts</CardTitle>
                <CardDescription>Most recent events from Traccar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alertsLoading && <p className="text-sm text-muted-foreground">Loading latest alerts...</p>}
                  {!alertsLoading && alertsError && (
                    <p className="text-sm text-destructive">{alertsError}</p>
                  )}
                  {!alertsLoading && !alertsError && latestAlerts.length === 0 && (
                    <p className="text-sm text-muted-foreground">No recent alerts available.</p>
                  )}
                  {!alertsLoading &&
                    !alertsError &&
                    latestAlerts.map((alert, index) => (
                      <div
                        key={`${alert.deviceId}-${alert.eventTime}-${index}`}
                        className="p-4 border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-950/20 rounded"
                      >
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                          <div>
                            <h4 className="font-semibold text-orange-700 dark:text-orange-300 capitalize">
                              {alert.type}
                            </h4>
                            <p className="text-sm text-orange-600 dark:text-orange-200">
                              Device ID: {alert.deviceId ?? 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {alert.eventTime ? new Date(alert.eventTime).toLocaleString() : 'Time unavailable'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
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
              <CardHeader>
                <CardTitle>Alert History & Rules</CardTitle>
                <CardDescription>Configure and view live notification history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button variant="outline">
                    <Bell className="h-4 w-4 mr-2" />
                    Configure Alert Rules
                  </Button>
                  <div className="space-y-2">
                    {alertsLoading && (
                      <p className="text-sm text-muted-foreground">Loading notification history...</p>
                    )}
                    {!alertsLoading && alertsError && (
                      <p className="text-sm text-destructive">{alertsError}</p>
                    )}
                    {!alertsLoading && !alertsError && latestAlerts.length === 0 && (
                      <p className="text-sm text-muted-foreground">No notifications available.</p>
                    )}
                    {!alertsLoading &&
                      !alertsError &&
                      latestAlerts.map((alert, index) => (
                        <div
                          key={`notification-${alert.deviceId}-${alert.eventTime}-${index}`}
                          className="p-3 border rounded-lg text-sm"
                        >
                          <div className="flex justify-between gap-4">
                            <span className="font-medium capitalize">
                              {alert.type} - Device {alert.deviceId ?? "Unknown"}
                            </span>
                            <span className="text-muted-foreground whitespace-nowrap">
                              {alert.eventTime
                                ? new Date(alert.eventTime).toLocaleString()
                                : "Time unavailable"}
                            </span>
                          </div>
                        </div>
                      ))}
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
