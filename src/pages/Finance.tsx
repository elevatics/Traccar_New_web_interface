import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import useFleetData from "@/hooks/useFleetData";
import { CircleDollarSign, Fuel, Gauge, Truck } from "lucide-react";

const FUEL_PRICE_PER_LITER = 1.25;
const COST_PER_KM = 0.22;

export default function Finance() {
  const { fleetData, loading, error } = useFleetData();

  const summary = useMemo(() => {
    const totalVehicles = fleetData.length;
    const movingVehicles = fleetData.filter((item: any) => item.motion || Number(item.speed) > 0).length;
    const totalDistanceKm = fleetData.reduce((sum: number, item: any) => {
      const km = Number(item.totalDistance || item.distance || 0) / 1000;
      return sum + (Number.isFinite(km) ? km : 0);
    }, 0);
    const totalFuelLiters = fleetData.reduce((sum: number, item: any) => {
      const liters = Number(item.fuelConsumption || item.fuelLevel || 0);
      return sum + (Number.isFinite(liters) ? liters : 0);
    }, 0);
    const estimatedFuelCost = totalFuelLiters * FUEL_PRICE_PER_LITER;
    const estimatedOperatingCost = totalDistanceKm * COST_PER_KM;

    return {
      totalVehicles,
      movingVehicles,
      totalDistanceKm,
      totalFuelLiters,
      estimatedFuelCost,
      estimatedOperatingCost,
      estimatedTotalCost: estimatedFuelCost + estimatedOperatingCost,
    };
  }, [fleetData]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Finance</h2>
        <p className="text-muted-foreground">
          Live operational cost view derived from your connected fleet telemetry.
        </p>
      </div>

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
                {summary.totalFuelLiters.toFixed(1)} L at ${FUEL_PRICE_PER_LITER}/L
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
                {summary.totalDistanceKm.toLocaleString(undefined, { maximumFractionDigits: 1 })} km at $
                {COST_PER_KM}/km
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
                  const speed = Number(item.speed) || 0;
                  const fuelLevel = Number(item.fuelLevel) || 0;
                  const statusLabel = item.status || "unknown";
                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{item.name || `Device ${item.id}`}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[420px]">
                          {item.address || "Live location unavailable"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{statusLabel}</Badge>
                        <Badge variant="secondary">{speed.toFixed(0)} km/h</Badge>
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
