import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useFleetDataContext } from "@/contexts/FleetDataContext";
import { CircleDollarSign, Fuel, Gauge, Settings, Truck } from "lucide-react";

const FINANCE_SETTINGS_KEY = 'fleet_finance_settings_v1';

interface FinanceSettings {
  fuelPricePerLiter: number;
  costPerKm: number;
  assumedL100km: number;
}

const DEFAULT_SETTINGS: FinanceSettings = {
  fuelPricePerLiter: 1.25,
  costPerKm: 0.22,
  assumedL100km: 12,
};

function loadFinanceSettings(): FinanceSettings {
  try {
    const raw = localStorage.getItem(FINANCE_SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<FinanceSettings>;
    return {
      fuelPricePerLiter: Number(parsed.fuelPricePerLiter) || DEFAULT_SETTINGS.fuelPricePerLiter,
      costPerKm: Number(parsed.costPerKm) || DEFAULT_SETTINGS.costPerKm,
      assumedL100km: Number(parsed.assumedL100km) || DEFAULT_SETTINGS.assumedL100km,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function Finance() {
  const { fleetData, loading, error } = useFleetDataContext();
  const [settings, setSettings] = useState<FinanceSettings>(loadFinanceSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState<FinanceSettings>(settings);

  const { fuelPricePerLiter, costPerKm, assumedL100km } = settings;

  const summary = useMemo(() => {
    const totalVehicles = fleetData.length;
    const movingVehicles = fleetData.filter((item) => item.motion || item.speed > 0).length;
    const totalDistanceKm = fleetData.reduce((sum, item) => {
      const km = (item.totalDistance || item.distance) / 1000;
      return sum + (Number.isFinite(km) ? km : 0);
    }, 0);
    // Estimate fuel consumed from distance driven at an assumed fleet average rate.
    // fuelConsumption is an L/h rate (not total litres), and fuelLevel is a
    // percentage — neither can be summed as litres, so we use distance instead.
    const totalFuelLiters = totalDistanceKm * assumedL100km / 100;
    const estimatedFuelCost = totalFuelLiters * fuelPricePerLiter;
    const estimatedOperatingCost = totalDistanceKm * costPerKm;

    return {
      totalVehicles,
      movingVehicles,
      totalDistanceKm,
      totalFuelLiters,
      estimatedFuelCost,
      estimatedOperatingCost,
      estimatedTotalCost: estimatedFuelCost + estimatedOperatingCost,
    };
  }, [fleetData, fuelPricePerLiter, costPerKm, assumedL100km]);

  const saveSettings = () => {
    const validated: FinanceSettings = {
      fuelPricePerLiter: Math.max(0, Number(draft.fuelPricePerLiter) || DEFAULT_SETTINGS.fuelPricePerLiter),
      costPerKm: Math.max(0, Number(draft.costPerKm) || DEFAULT_SETTINGS.costPerKm),
      assumedL100km: Math.max(1, Number(draft.assumedL100km) || DEFAULT_SETTINGS.assumedL100km),
    };
    setSettings(validated);
    localStorage.setItem(FINANCE_SETTINGS_KEY, JSON.stringify(validated));
    setSettingsOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Finance</h2>
          <p className="text-muted-foreground">
            Live operational cost view derived from your connected fleet telemetry.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setDraft(settings); setSettingsOpen(true); }}>
          <Settings className="h-4 w-4 mr-1.5" />
          Cost Settings
        </Button>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cost Settings</DialogTitle>
            <DialogDescription>Adjust rates used for finance estimations.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label htmlFor="fuelPrice">Fuel Price ($ / L)</Label>
              <Input
                id="fuelPrice"
                type="number"
                min="0"
                step="0.01"
                value={draft.fuelPricePerLiter}
                onChange={(e) => setDraft((d) => ({ ...d, fuelPricePerLiter: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="costPerKm">Operating Cost ($ / km)</Label>
              <Input
                id="costPerKm"
                type="number"
                min="0"
                step="0.01"
                value={draft.costPerKm}
                onChange={(e) => setDraft((d) => ({ ...d, costPerKm: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="l100km">Assumed Consumption (L / 100 km)</Label>
              <Input
                id="l100km"
                type="number"
                min="1"
                step="0.5"
                value={draft.assumedL100km}
                onChange={(e) => setDraft((d) => ({ ...d, assumedL100km: Number(e.target.value) }))}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={saveSettings}>Save</Button>
              <Button variant="outline" className="flex-1" onClick={() => { setDraft(DEFAULT_SETTINGS); }}>
                Reset Defaults
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {loading && <p className="text-sm text-muted-foreground">Loading finance metrics...</p>}
      {!loading && error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !error && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Estimated Cost</CardDescription>
                <CardTitle className="text-2xl">
                  ${summary.estimatedTotalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4" />
                Fuel + distance-based operating estimate
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Fuel Cost Estimate</CardDescription>
                <CardTitle className="text-2xl">
                  ${summary.estimatedFuelCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground flex items-center gap-2">
                <Fuel className="h-4 w-4" />
                ~{summary.totalFuelLiters.toFixed(1)} L est. @ {assumedL100km} L/100km · ${fuelPricePerLiter}/L
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Distance Cost Estimate</CardDescription>
                <CardTitle className="text-2xl">
                  ${summary.estimatedOperatingCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                {summary.totalDistanceKm.toLocaleString(undefined, { maximumFractionDigits: 1 })} km at ${costPerKm}/km
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Fleet Utilization</CardDescription>
                <CardTitle className="text-2xl">
                  {summary.totalVehicles === 0
                    ? "0%"
                    : `${Math.round((summary.movingVehicles / summary.totalVehicles) * 100)}%`}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground flex items-center gap-2">
                <Truck className="h-4 w-4" />
                {summary.movingVehicles} of {summary.totalVehicles} vehicles moving
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Vehicle Cost Signals</CardTitle>
              <CardDescription>
                Live vehicle-level indicators to support fuel and operations budgeting.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fleetData.slice(0, 12).map((item: any) => {
                  // speed from Traccar is in knots → convert to km/h
                  const speedKmh = Math.round((Number(item.speed) || 0) * 1.852);
                  // prefer 'fuel' attribute; fall back to 'fuelLevel' (both 0–100 %)
                  const fuel = Number(item.fuel) || 0;
                  const fuelLevel = fuel > 0 ? fuel : (Number(item.fuelLevel) || 0);
                  const statusLabel = item.status || "unknown";
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{item.name || `Device ${item.id}`}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.address || "Live location unavailable"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <Badge variant="outline">{statusLabel}</Badge>
                        <Badge variant="secondary">{speedKmh} km/h</Badge>
                        <Badge variant={fuelLevel < 20 ? "destructive" : "outline"}>
                          Fuel {fuelLevel.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                {fleetData.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No live fleet telemetry available to compute finance metrics.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
