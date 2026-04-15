import { useCallback, useEffect, useState } from "react";
import {
  Download,
  Play,
  History,
  BarChart3,
  FileText,
  MapPin,
  ChevronDown,
  X,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { getDevices } from "@/services/deviceService";
import {
  formatDistanceKm,
  formatDuration,
  getTripsReport,
  knotsToKmh,
  normalizeTrip,
  tripRowId,
} from "@/services/tripService";
import TripRouteMapSection from "@/components/TripRouteMapSection";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? "";

type DeviceOption = { id: number; name: string };
type TripRow = ReturnType<typeof normalizeTrip>;

function computeIsoRange(
  timeRange: string,
  customFrom: string,
  customTo: string
): { from: string; to: string } {
  const toDate = new Date();
  if (timeRange === "custom" && customFrom && customTo) {
    const f = new Date(customFrom);
    const t = new Date(customTo);
    if (!Number.isNaN(f.getTime()) && !Number.isNaN(t.getTime()) && f.getTime() <= t.getTime()) {
      return { from: f.toISOString(), to: t.toISOString() };
    }
  }
  const fromDate = new Date(toDate);
  switch (timeRange) {
    case "today":
      fromDate.setTime(
        Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate(), 0, 0, 0, 0)
      );
      break;
    case "hour":
      fromDate.setTime(toDate.getTime() - 3600000);
      break;
    case "day":
      fromDate.setTime(toDate.getTime() - 86400000);
      break;
    case "week":
      fromDate.setTime(toDate.getTime() - 7 * 86400000);
      break;
    case "month":
      fromDate.setMonth(fromDate.getMonth() - 1);
      break;
    default:
      fromDate.setTime(toDate.getTime() - 7 * 86400000);
  }
  return { from: fromDate.toISOString(), to: toDate.toISOString() };
}

export default function Trips() {
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<number[]>([]);
  const [timeRange, setTimeRange] = useState("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [currentView, setCurrentView] = useState("history");
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [tripRows, setTripRows] = useState<TripRow[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [devicesLoading, setDevicesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getDevices();
        if (cancelled) return;
        const opts = list
          .filter((d) => d.id != null)
          .map((d) => ({
            id: Number(d.id),
            name: (d.name && String(d.name).trim()) || `Device ${d.id}`,
          }));
        setDevices(opts);
        const ids = opts.map((o) => o.id).filter((n) => Number.isFinite(n));
        if (ids.length) setSelectedDeviceIds(ids);
      } catch {
        toast.error("Could not load devices for trips");
      } finally {
        if (!cancelled) setDevicesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDeviceToggle = (id: number) => {
    setSelectedDeviceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const loadTrips = useCallback(async () => {
    if (selectedDeviceIds.length === 0) {
      toast.error("Select at least one vehicle");
      return;
    }
    const { from, to } = computeIsoRange(timeRange, customFrom, customTo);
    setTripsLoading(true);
    try {
      const raw = await getTripsReport({ deviceIds: selectedDeviceIds, from, to });
      const rows = raw.map(normalizeTrip);
      rows.sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());
      setTripRows(rows);
      toast.success(`Loaded ${rows.length} trip(s) from Traccar`);
    } catch {
      toast.error("Trips request failed — check date range and permissions");
      setTripRows([]);
    } finally {
      setTripsLoading(false);
    }
  }, [selectedDeviceIds, timeRange, customFrom, customTo]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold">Trip Management</h2>
          <p className="text-muted-foreground">Manage and track vehicle trips</p>
        </div>
        
        <div className="flex gap-2 items-center">
          <Select value={currentView} onValueChange={setCurrentView}>
            <SelectTrigger className="w-[200px] bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="active">
                <div className="flex items-center">
                  <Play className="h-4 w-4 mr-2" />
                  Active Trips
                </div>
              </SelectItem>
              <SelectItem value="history">
                <div className="flex items-center">
                  <History className="h-4 w-4 mr-2" />
                  Trip History
                </div>
              </SelectItem>
              <SelectItem value="analytics">
                <div className="flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Trip Analytics
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={() => void loadTrips()} disabled={tripsLoading || selectedDeviceIds.length === 0}>
            {tripsLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Load trips
          </Button>
        </div>
      </div>

      {/* Vehicle & Time Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Trips use Traccar <code className="text-xs">GET /api/reports/trips</code> (ISO <code className="text-xs">from</code> /{" "}
            <code className="text-xs">to</code>, one or more <code className="text-xs">deviceId</code>).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vehicles (devices)</Label>
              <Popover open={vehicleDropdownOpen} onOpenChange={setVehicleDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between" disabled={devicesLoading}>
                    {devicesLoading ? (
                      "Loading devices…"
                    ) : selectedDeviceIds.length === 0 ? (
                      "Select vehicles…"
                    ) : (
                      <span className="truncate">{selectedDeviceIds.length} device(s) selected</span>
                    )}
                    <ChevronDown className="h-4 w-4 opacity-50 ml-2 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-3 bg-background z-50" align="start">
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Devices</p>
                      {selectedDeviceIds.length > 0 && (
                        <Button variant="ghost" size="sm" className="h-auto p-1 text-xs" onClick={() => setSelectedDeviceIds([])}>
                          Clear all
                        </Button>
                      )}
                    </div>
                    {devices.map((d) => (
                      <div key={d.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`device-${d.id}`}
                          checked={selectedDeviceIds.includes(d.id)}
                          onCheckedChange={() => handleDeviceToggle(d.id)}
                        />
                        <label htmlFor={`device-${d.id}`} className="text-sm cursor-pointer flex-1 truncate">
                          {d.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              {selectedDeviceIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedDeviceIds.map((id) => {
                    const name = devices.find((d) => d.id === id)?.name ?? String(id);
                    return (
                      <Badge key={id} variant="secondary" className="text-xs max-w-[200px] truncate">
                        {name}
                        <X className="h-3 w-3 ml-1 shrink-0 cursor-pointer" onClick={() => handleDeviceToggle(id)} />
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Time range</Label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="today">Today (UTC)</SelectItem>
                  <SelectItem value="hour">Last hour</SelectItem>
                  <SelectItem value="day">Last 24 hours</SelectItem>
                  <SelectItem value="week">Last 7 days</SelectItem>
                  <SelectItem value="month">Last month</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {timeRange === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From (local)</Label>
                <Input type="datetime-local" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>To (local)</Label>
                <Input type="datetime-local" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content based on selected view */}
      <div className="space-y-4">
        {/* Active Trips — not a separate Traccar trips API */}
        {currentView === "active" && (
          <Card>
            <CardHeader>
              <CardTitle>Live trips</CardTitle>
              <CardDescription>
                Traccar exposes completed trip segments via <code className="text-xs">/api/reports/trips</code> (see Trip
                History). For current movement use the Fleet map and positions.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Trip History — GET /api/reports/trips */}
        {currentView === "history" && (
          <div className="space-y-4">
            {tripsLoading && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading trips…
              </p>
            )}
            {!tripsLoading && tripRows.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  No trips loaded. Choose devices and time range, then click <strong>Load trips</strong>.
                </CardContent>
              </Card>
            )}
            <div className="grid gap-4">
              {tripRows.map((trip) => {
                const id = tripRowId(trip);
                const avgKmh = knotsToKmh(trip.averageSpeedKnots);
                const maxKmh = knotsToKmh(trip.maxSpeedKnots);
                return (
                  <Card key={id}>
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <CardTitle className="text-lg truncate">{trip.deviceName}</CardTitle>
                          <CardDescription className="truncate">
                            {trip.driverName || "Driver —"} · {new Date(trip.startTime).toLocaleString()} →{" "}
                            {new Date(trip.endTime).toLocaleString()}
                          </CardDescription>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <FileText className="h-4 w-4 mr-2" />
                              Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Trip — {trip.deviceName}</DialogTitle>
                              <DialogDescription>
                                Traccar ReportTrips; map uses <code className="text-xs">GET /api/reports/route</code> for
                                the same time window.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3 text-sm">
                              <div>
                                <Label>Driver</Label>
                                <p>{trip.driverName || "—"}{trip.driverUniqueId ? ` (${trip.driverUniqueId})` : ""}</p>
                              </div>
                              <div>
                                <Label>Start</Label>
                                <p>{new Date(trip.startTime).toLocaleString()}</p>
                                <p className="text-muted-foreground break-words">{trip.startAddress || "—"}</p>
                              </div>
                              <div>
                                <Label>End</Label>
                                <p>{new Date(trip.endTime).toLocaleString()}</p>
                                <p className="text-muted-foreground break-words">{trip.endAddress || "—"}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label>Duration</Label>
                                  <p>{formatDuration(trip.durationSec)}</p>
                                </div>
                                <div>
                                  <Label>Distance</Label>
                                  <p>{formatDistanceKm(trip.distanceM)}</p>
                                </div>
                                <div>
                                  <Label>Avg speed</Label>
                                  <p>{avgKmh.toFixed(0)} km/h</p>
                                </div>
                                <div>
                                  <Label>Max speed</Label>
                                  <p>{maxKmh.toFixed(0)} km/h</p>
                                </div>
                                {trip.spentFuel != null && (
                                  <div className="col-span-2">
                                    <Label>Fuel (report)</Label>
                                    <p>{trip.spentFuel.toFixed(2)} L</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2 border-t pt-4 mt-4">
                              <Label className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4" />
                                Route map
                              </Label>
                              <TripRouteMapSection trip={trip} accessToken={MAPBOX_TOKEN} />
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Duration</p>
                          <p className="font-medium">{formatDuration(trip.durationSec)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Distance</p>
                          <p className="font-medium">{formatDistanceKm(trip.distanceM)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Avg speed</p>
                          <p className="font-medium">{avgKmh.toFixed(0)} km/h</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Route</p>
                          <p className="font-medium line-clamp-2" title={`${trip.startAddress} → ${trip.endAddress}`}>
                            {(trip.startAddress || "Start").slice(0, 24)}… → {(trip.endAddress || "End").slice(0, 24)}…
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Trip Analytics — derived from last loaded trips */}
        {currentView === "analytics" && (
          <div className="space-y-4">
            {tripRows.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  Load trips on <strong>Trip History</strong> first; totals below update from that result.
                </CardContent>
              </Card>
            ) : null}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Total trips</CardTitle>
                  <CardDescription>Loaded segment count</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{tripRows.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Total distance</CardTitle>
                  <CardDescription>Sum of trip distances</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {(tripRows.reduce((s, t) => s + t.distanceM, 0) / 1000).toFixed(1)} km
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Total driving time</CardTitle>
                  <CardDescription>Sum of durations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatDuration(tripRows.reduce((s, t) => s + t.durationSec, 0))}</div>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Charts</CardTitle>
                <CardDescription>Traccar trips report does not include chart payloads; aggregate from loaded trips only.</CardDescription>
              </CardHeader>
              <CardContent className="h-48 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                  <p className="text-sm">Use external BI or export if you need charts</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
