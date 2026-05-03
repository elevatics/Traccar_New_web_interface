import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart3,
  FileText,
  TrendingUp,
  DollarSign,
  Fuel,
  Settings,
  Download,
  Eye,
  Plus,
  Calendar,
  FileDown,
  ChevronDown,
  User,
  Car,
  Route as RouteIcon,
  AlertCircle,
  MapPin,
  Activity,
  PieChart,
  PlayCircle,
  BarChart,
  Loader2,
  Navigation,
  Clock,
  Gauge,
  SlidersHorizontal,
  RefreshCw,
  ArrowRight,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import useFleetData from "@/hooks/useFleetData";
import { getDrivers } from "@/services/driverService";
import { getEvents } from "@/services/eventService";
import { getRouteReport, knotsToKmh } from "@/services/tripService";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type ReportSubmenu = "fleet" | "vehicle" | "driver" | "financial" | "fuel" | "custom" | "export";
type ReportTopic = "route" | "events" | "trips" | "stops" | "summary" | "chart" | "replay" | "statistics";

/** Traccar /reports/route position object */
interface RoutePosition {
  id: number;
  deviceId: number;
  protocol: string;
  serverTime: string;
  deviceTime: string;
  fixTime: string;
  outdated: boolean;
  valid: boolean;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number; // knots
  course: number;
  address: string;
  accuracy: number;
  network?: string;
  attributes: {
    satellites?: number;
    alarm?: string | null;
    status?: number;
    distance?: number;
    totalDistance?: number;
    motion?: boolean;
    fuel?: number;
    fuelConsumption?: number;
    ignition?: boolean;
    rpm?: number;
    obdSpeed?: number;
    commandResult?: string | null;
    mapIntake?: number;
    intakeTemp?: number;
    engineLoad?: number;
    odometer?: number;
    tripOdometer?: number;
    coolantTemp?: number;
    batteryLevel?: number;
    geofenceIds?: number[];
    [key: string]: unknown;
  };
}

// ── All column definitions (matching screenshots exactly) ─────────────────────

type ColumnKey =
  | "latitude" | "longitude" | "speed" | "course" | "altitude" | "accuracy"
  | "valid" | "protocol" | "address" | "deviceTime" | "fixTime" | "serverTime"
  | "geofences" | "satellites" | "coolantTemp" | "alarm" | "status"
  | "odometer" | "tripOdometer" | "fuel" | "fuelConsumption" | "ignition"
  | "distance" | "totalDistance" | "rpm" | "motion" | "obdSpeed"
  | "commandResult" | "mapIntake" | "intakeTemp" | "engineLoad";

const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "latitude",        label: "Latitude" },
  { key: "longitude",       label: "Longitude" },
  { key: "speed",           label: "Speed" },
  { key: "course",          label: "Course" },
  { key: "altitude",        label: "Altitude" },
  { key: "accuracy",        label: "Accuracy" },
  { key: "valid",           label: "Valid" },
  { key: "protocol",        label: "Protocol" },
  { key: "address",         label: "Address" },
  { key: "deviceTime",      label: "Device Time" },
  { key: "fixTime",         label: "Fix Time" },
  { key: "serverTime",      label: "Server Time" },
  { key: "geofences",       label: "Geofences" },
  { key: "satellites",      label: "Satellites" },
  { key: "coolantTemp",     label: "Coolant Temperature" },
  { key: "alarm",           label: "Alarm" },
  { key: "status",          label: "Status" },
  { key: "odometer",        label: "Odometer" },
  { key: "tripOdometer",    label: "Trip Odometer" },
  { key: "fuel",            label: "Fuel" },
  { key: "fuelConsumption", label: "Fuel Consumption" },
  { key: "ignition",        label: "Ignition" },
  { key: "distance",        label: "Distance" },
  { key: "totalDistance",   label: "Total Distance" },
  { key: "rpm",             label: "RPM" },
  { key: "motion",          label: "Motion" },
  { key: "obdSpeed",        label: "OBD Speed" },
  { key: "commandResult",   label: "Command result" },
  { key: "mapIntake",       label: "mapIntake" },
  { key: "intakeTemp",      label: "intakeTemp" },
  { key: "engineLoad",      label: "engineLoad" },
];

const DEFAULT_VISIBLE: ColumnKey[] = [
  "latitude", "longitude", "speed", "address", "deviceTime",
  "valid", "ignition", "fuel", "motion", "distance",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function isoDate(d: Date) {
  return d.toISOString().replace(/\.\d{3}Z$/, ".000Z");
}
function todayRange() {
  const now = new Date();
  const from = new Date(now); from.setHours(0, 0, 0, 0);
  const to   = new Date(now); to.setHours(23, 59, 59, 999);
  return { from: isoDate(from), to: isoDate(to) };
}
function last7DaysRange() {
  const to = new Date();
  const from = new Date(to); from.setDate(from.getDate() - 6); from.setHours(0, 0, 0, 0);
  return { from: isoDate(from), to: isoDate(to) };
}
function last30DaysRange() {
  const to = new Date();
  const from = new Date(to); from.setDate(from.getDate() - 29); from.setHours(0, 0, 0, 0);
  return { from: isoDate(from), to: isoDate(to) };
}

function fmtDateTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

function attr<T>(pos: RoutePosition, key: string): T | undefined {
  return pos.attributes?.[key] as T | undefined;
}

/** Get display value for a given column key from a route position */
// ── AddressCell ───────────────────────────────────────────────────────────────
// Shows the Traccar address if available.
// If null/empty, shows "lat, lng" text. On click it reverse-geocodes via
// OpenStreetMap Nominatim and replaces the text with the resolved address.

function AddressCell({ address, lat, lng }: { address: string; lat: number; lng: number }) {
  const [resolved, setResolved] = useState<string | null>(address || null);
  const [fetching, setFetching] = useState(false);
  const [tried, setTried]       = useState(false);  // don't retry after failure

  if (resolved) {
    return (
      <span className="max-w-[240px] block text-xs whitespace-normal break-words leading-snug">
        {resolved}
      </span>
    );
  }

  const lookup = async () => {
    if (fetching || tried) return;
    setFetching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { "Accept-Language": "en" } }
      );
      if (!res.ok) throw new Error("geocode failed");
      const data = await res.json();
      setResolved(data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } catch {
      setResolved(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setFetching(false);
      setTried(true);
    }
  };

  return (
    <button
      type="button"
      onClick={lookup}
      disabled={fetching}
      className="flex items-center gap-1.5 font-mono text-[11px] text-primary hover:text-primary/80 transition-colors disabled:cursor-wait group"
      title="Click to resolve address"
    >
      {fetching ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />
          <span className="text-muted-foreground">Resolving…</span>
        </>
      ) : (
        <>
          <MapPin className="h-3 w-3 flex-shrink-0 opacity-60 group-hover:opacity-100" />
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </>
      )}
    </button>
  );
}

function getCellValue(pos: RoutePosition, key: ColumnKey): string | React.ReactNode {
  switch (key) {
    case "latitude":        return pos.latitude?.toFixed(6) ?? "—";
    case "longitude":       return pos.longitude?.toFixed(6) ?? "—";
    case "speed":           return `${Math.round(knotsToKmh(pos.speed))} km/h`;
    case "course":          return `${Math.round(pos.course)}°`;
    case "altitude":        return `${Math.round(pos.altitude)} m`;
    case "accuracy":        return `±${Math.round(pos.accuracy)} m`;
    case "valid":           return pos.valid
      ? <span className="flex items-center gap-1 text-green-600 dark:text-green-400"><CheckCircle className="h-3.5 w-3.5"/>Yes</span>
      : <span className="flex items-center gap-1 text-red-500"><XCircle className="h-3.5 w-3.5"/>No</span>;
    case "protocol":        return pos.protocol || "—";
    case "address":
      return <AddressCell address={pos.address} lat={pos.latitude} lng={pos.longitude} />;
    case "deviceTime":      return fmtDateTime(pos.deviceTime);
    case "fixTime":         return fmtDateTime(pos.fixTime);
    case "serverTime":      return fmtDateTime(pos.serverTime);
    case "geofences": {
      const ids = attr<number[]>(pos, "geofenceIds");
      return ids && ids.length > 0 ? ids.join(", ") : "—";
    }
    case "satellites":      return String(attr(pos, "satellites") ?? "—");
    case "coolantTemp": {
      const v = attr<number>(pos, "coolantTemp");
      return v != null ? `${v}°C` : "—";
    }
    case "alarm":           return String(attr(pos, "alarm") ?? "—");
    case "status":          return String(attr(pos, "status") ?? "—");
    case "odometer": {
      const v = attr<number>(pos, "odometer");
      return v != null ? `${(v / 1000).toFixed(1)} km` : "—";
    }
    case "tripOdometer": {
      const v = attr<number>(pos, "tripOdometer");
      return v != null ? `${(v / 1000).toFixed(2)} km` : "—";
    }
    case "fuel": {
      const v = attr<number>(pos, "fuel");
      return v != null ? `${v.toFixed(1)}%` : "—";
    }
    case "fuelConsumption": {
      const v = attr<number>(pos, "fuelConsumption");
      return v != null ? `${v.toFixed(2)} L/100km` : "—";
    }
    case "ignition": {
      const v = attr<boolean>(pos, "ignition");
      if (v === undefined || v === null) return "—";
      return v
        ? <span className="text-green-600 dark:text-green-400 font-medium">ON</span>
        : <span className="text-red-500 font-medium">OFF</span>;
    }
    case "distance": {
      const v = attr<number>(pos, "distance");
      return v != null ? `${v.toFixed(1)} m` : "—";
    }
    case "totalDistance": {
      const v = attr<number>(pos, "totalDistance");
      return v != null ? `${(v / 1000).toFixed(2)} km` : "—";
    }
    case "rpm":             return String(attr(pos, "rpm") ?? "—");
    case "motion": {
      const v = attr<boolean>(pos, "motion");
      if (v === undefined || v === null) return "—";
      return v
        ? <span className="text-green-600 dark:text-green-400">Moving</span>
        : <span className="text-muted-foreground">Stopped</span>;
    }
    case "obdSpeed": {
      const v = attr<number>(pos, "obdSpeed");
      return v != null ? `${Math.round(v)} km/h` : "—";
    }
    case "commandResult":   return String(attr(pos, "commandResult") ?? "—");
    case "mapIntake":       return String(attr(pos, "mapIntake") ?? "—");
    case "intakeTemp":      return String(attr(pos, "intakeTemp") ?? "—");
    case "engineLoad":      return String(attr(pos, "engineLoad") ?? "—");
    default:                return "—";
  }
}

/** Plain-text value for CSV export (no JSX) */
function getCsvValue(pos: RoutePosition, key: ColumnKey): string {
  switch (key) {
    case "valid":           return pos.valid ? "Yes" : "No";
    case "ignition":        return attr<boolean>(pos, "ignition") != null ? (attr<boolean>(pos, "ignition") ? "ON" : "OFF") : "—";
    case "motion":          return attr<boolean>(pos, "motion") != null ? (attr<boolean>(pos, "motion") ? "Moving" : "Stopped") : "—";
    case "address":         return pos.address || `${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)}`;
    default: {
      const val = getCellValue(pos, key);
      return typeof val === "string" ? val : "—";
    }
  }
}

function exportCsv(positions: RoutePosition[], visibleCols: ColumnKey[]) {
  const header = ALL_COLUMNS.filter((c) => visibleCols.includes(c.key)).map((c) => c.label);
  const rows = positions.map((pos) =>
    visibleCols.map((key) => getCsvValue(pos, key))
  );
  const csv = [header, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `route_report_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Route Report Section ──────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

function RouteReportSection({
  fleetData,
  initialDeviceId,
}: {
  fleetData: any[];
  initialDeviceId?: string;
}) {
  const { toast } = useToast();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(initialDeviceId ?? "");
  const [dateRange, setDateRange] = useState("today");
  const [positions, setPositions] = useState<RoutePosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [visibleCols, setVisibleCols] = useState<ColumnKey[]>(DEFAULT_VISIBLE);
  const [scheduleDialog, setScheduleDialog] = useState(false);

  // Pagination state — default 10 rows, start on the LAST page (most recent)
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(positions.length / pageSize));

  // Positions are chronological — show the most recent first by defaulting to last page
  const pageStart = (currentPage - 1) * pageSize;
  const pageEnd   = Math.min(pageStart + pageSize, positions.length);
  const displayedPositions = positions.slice(pageStart, pageEnd);

  // Build a compact page-number window: always show first, last, current ±1
  const pageNumbers = useMemo(() => {
    const pages: (number | "…")[] = [];
    const add = (n: number) => { if (!pages.includes(n)) pages.push(n); };
    add(1);
    if (currentPage > 3) pages.push("…");
    for (let p = Math.max(2, currentPage - 1); p <= Math.min(totalPages - 1, currentPage + 1); p++) add(p);
    if (currentPage < totalPages - 2) pages.push("…");
    if (totalPages > 1) add(totalPages);
    return pages;
  }, [currentPage, totalPages]);

  const goToPage = (p: number) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));

  const devices = useMemo(
    () =>
      fleetData.map((v: any) => ({
        id: String(v.deviceId ?? v.id),
        name: v.name ?? `Device ${v.deviceId ?? v.id}`,
      })),
    [fleetData]
  );

  // Auto-load when arriving from a device popup
  useEffect(() => {
    if (initialDeviceId && fleetData.length > 0) {
      setSelectedDeviceId(initialDeviceId);
      loadPositions(initialDeviceId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDeviceId, fleetData.length]);

  const getRange = () => {
    switch (dateRange) {
      case "7d":  return last7DaysRange();
      case "30d": return last30DaysRange();
      default:    return todayRange();
    }
  };

  const loadPositions = async (deviceIdOverride?: string) => {
    const id = deviceIdOverride ?? selectedDeviceId;
    if (!id) {
      toast({ title: "Select a vehicle first", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { from, to } = getRange();
      const raw = await getRouteReport({ deviceId: Number(id), from, to });
      const fetched = raw as RoutePosition[];
      setPositions(fetched);
      setHasLoaded(true);
      // Jump to last page (most recent records) when data first loads
      const pages = Math.max(1, Math.ceil(fetched.length / pageSize));
      setCurrentPage(pages);
    } catch (err: any) {
      toast({ title: "Failed to load route report", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // When page size changes, stay on the same approximate record
  const handlePageSizeChange = (newSize: number) => {
    const firstRecord = pageStart + 1;
    setPageSize(newSize);
    setCurrentPage(Math.ceil(firstRecord / newSize));
  };

  const toggleColumn = (key: ColumnKey) =>
    setVisibleCols((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  const selectedDeviceName = devices.find((d) => d.id === selectedDeviceId)?.name ?? "";

  return (
    <div className="space-y-5">
      {/* Filter Bar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Route Report
            {selectedDeviceName && (
              <Badge variant="secondary" className="ml-2 font-normal">{selectedDeviceName}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Fetches position data from <code className="text-xs bg-muted px-1 rounded">/api/reports/route</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            {/* Device */}
            <div className="space-y-1 min-w-[190px]">
              <Label className="text-xs font-medium">Vehicle</Label>
              <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select vehicle…" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date range */}
            <div className="space-y-1 min-w-[140px]">
              <Label className="text-xs font-medium">Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Rows per page */}
            <div className="space-y-1 min-w-[110px]">
              <Label className="text-xs font-medium">Rows / page</Label>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => handlePageSizeChange(Number(v))}
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} rows</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Load */}
            <Button onClick={() => loadPositions()} disabled={loading} className="h-9">
              {loading
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading…</>
                : <><RefreshCw className="h-4 w-4 mr-2" />Load Report</>}
            </Button>

            {/* Export — only when data available */}
            {positions.length > 0 && (
              <>
                <Button variant="outline" className="h-9" onClick={() => exportCsv(positions, visibleCols)}>
                  <Download className="h-4 w-4 mr-2" />CSV
                </Button>
                <Button variant="outline" className="h-9" onClick={() => window.print()}>
                  <FileDown className="h-4 w-4 mr-2" />PDF
                </Button>
                <Button variant="outline" className="h-9" onClick={() => setScheduleDialog(true)}>
                  <Calendar className="h-4 w-4 mr-2" />Schedule
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {[...Array(pageSize > 10 ? 8 : pageSize)].map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-muted/50 animate-pulse" />
          ))}
        </div>
      )}

      {/* Summary stats */}
      {!loading && hasLoaded && positions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiChip
            label="Position Points"
            value={positions.length}
            icon={<Navigation className="h-4 w-4" />}
          />
          <KpiChip
            label="Time Span"
            value={(() => {
              const first = new Date(positions[0].fixTime);
              const last  = new Date(positions[positions.length - 1].fixTime);
              const diffMin = Math.round((last.getTime() - first.getTime()) / 60000);
              const h = Math.floor(diffMin / 60);
              const m = diffMin % 60;
              return h > 0 ? `${h}h ${m}m` : `${m}m`;
            })()}
            icon={<Clock className="h-4 w-4" />}
          />
          <KpiChip
            label="Max Speed"
            value={`${Math.round(knotsToKmh(Math.max(...positions.map((p) => p.speed))))} km/h`}
            icon={<Gauge className="h-4 w-4" />}
          />
          <KpiChip
            label="Total Distance"
            value={(() => {
              const last = positions[positions.length - 1];
              const v = last?.attributes?.totalDistance;
              return v != null ? `${(Number(v) / 1000).toFixed(1)} km` : "—";
            })()}
            icon={<RouteIcon className="h-4 w-4" />}
            accent
          />
        </div>
      )}

      {/* Data Table */}
      {!loading && hasLoaded && positions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {/* Table title + record range */}
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Position Data
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Showing{" "}
                  <span className="font-medium text-foreground">{pageStart + 1}–{pageEnd}</span>
                  {" "}of{" "}
                  <span className="font-medium text-foreground">{positions.length}</span>
                  {" "}records
                  {currentPage === totalPages && (
                    <span className="ml-1.5 text-primary font-medium">(most recent)</span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Jump to most-recent shortcut */}
                {currentPage !== totalPages && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => goToPage(totalPages)}
                  >
                    Latest {pageSize}
                  </Button>
                )}

                {/* Column selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      Columns
                      <span className="bg-primary/10 text-primary rounded px-1 text-[10px] font-medium">
                        {visibleCols.length}/{ALL_COLUMNS.length}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 max-h-[70vh] overflow-y-auto">
                    <DropdownMenuLabel className="text-xs sticky top-0 bg-popover py-2">
                      Toggle Columns ({visibleCols.length} visible)
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {ALL_COLUMNS.map((col) => (
                      <DropdownMenuCheckboxItem
                        key={col.key}
                        checked={visibleCols.includes(col.key)}
                        onCheckedChange={() => toggleColumn(col.key)}
                        className="text-xs"
                      >
                        {col.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs w-12 text-center sticky left-0 bg-muted/40">#</TableHead>
                    {ALL_COLUMNS.filter((c) => visibleCols.includes(c.key)).map((col) => (
                      <TableHead key={col.key} className="text-xs whitespace-nowrap font-semibold">
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedPositions.map((pos, idx) => (
                    <TableRow
                      key={pos.id ?? idx}
                      className={cn(
                        "text-xs hover:bg-primary/5 transition-colors",
                        idx % 2 === 1 ? "bg-muted/20" : ""
                      )}
                    >
                      <TableCell className="text-center text-muted-foreground font-mono sticky left-0 bg-inherit">
                        {pageStart + idx + 1}
                      </TableCell>
                      {ALL_COLUMNS.filter((c) => visibleCols.includes(c.key)).map((col) => (
                        <TableCell key={col.key} className="py-2 whitespace-nowrap">
                          {getCellValue(pos, col.key)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* ── Pagination controls ── */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-muted/10">
              {/* Info */}
              <p className="text-xs text-muted-foreground order-2 sm:order-1">
                Page <span className="font-semibold text-foreground">{currentPage}</span> of{" "}
                <span className="font-semibold text-foreground">{totalPages}</span>
                {" "}·{" "}{positions.length} total records
              </p>

              {/* Page buttons */}
              <div className="flex items-center gap-1 order-1 sm:order-2">
                {/* First */}
                <PaginationBtn
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  aria-label="First page"
                >
                  «
                </PaginationBtn>
                {/* Prev */}
                <PaginationBtn
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  ‹
                </PaginationBtn>

                {/* Page numbers */}
                {pageNumbers.map((p, i) =>
                  p === "…" ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-xs select-none">…</span>
                  ) : (
                    <PaginationBtn
                      key={p}
                      onClick={() => goToPage(p)}
                      active={p === currentPage}
                    >
                      {p}
                    </PaginationBtn>
                  )
                )}

                {/* Next */}
                <PaginationBtn
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  ›
                </PaginationBtn>
                {/* Last */}
                <PaginationBtn
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  aria-label="Last page"
                >
                  »
                </PaginationBtn>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && hasLoaded && positions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground space-y-3">
          <RouteIcon className="h-12 w-12 opacity-20" />
          <p className="text-sm font-medium">No route data found</p>
          <p className="text-xs">Try a different vehicle or wider date range.</p>
        </div>
      )}

      {!loading && !hasLoaded && (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground space-y-3">
          <Navigation className="h-12 w-12 opacity-20" />
          <p className="text-sm font-medium">Select a vehicle and click Load Report</p>
          <p className="text-xs">
            Loads position history from <code className="bg-muted px-1 rounded">/api/reports/route</code>
          </p>
        </div>
      )}

      {/* Schedule dialog */}
      <Dialog open={scheduleDialog} onOpenChange={setScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Report Delivery</DialogTitle>
            <DialogDescription>Receive this report automatically by email</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Frequency</Label>
              <Select defaultValue="weekly">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <input
                type="email"
                placeholder="recipient@example.com"
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <Button className="w-full" onClick={() => setScheduleDialog(false)}>
              Schedule Delivery
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Pagination button ─────────────────────────────────────────────────────────

function PaginationBtn({
  children,
  onClick,
  disabled,
  active,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-7 min-w-[28px] px-2 rounded-md text-xs font-medium transition-colors select-none",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : disabled
          ? "text-muted-foreground/40 cursor-not-allowed"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Reports() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { fleetData } = useFleetData();
  const [activeSubmenu, setActiveSubmenu] = useState<ReportSubmenu>("fleet");
  const [viewReportDialog, setViewReportDialog] = useState(false);
  const [createReportDialog, setCreateReportDialog] = useState(false);
  const [exportDialog, setExportDialog] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<ReportTopic[]>(["summary"]);
  const [driverCount, setDriverCount] = useState(0);
  const [eventRows, setEventRows] = useState<Array<{ type: string; eventTime: string | null }>>([]);

  // Read deviceId from URL if coming from a vehicle popup
  const initialDeviceId = searchParams.get("deviceId") ?? undefined;

  useEffect(() => {
    const loadSupportingData = async () => {
      try {
        const [drivers, events] = await Promise.all([getDrivers(), getEvents()]);
        setDriverCount(Array.isArray(drivers) ? drivers.length : 0);
        setEventRows(
          (Array.isArray(events) ? events : [])
            .slice(0, 12)
            .map((rawEvent) => {
              const event = rawEvent as Record<string, unknown>;
              return {
                type: typeof event.type === "string" ? event.type : "unknown",
                eventTime: typeof event.eventTime === "string" ? event.eventTime : null,
              };
            })
        );
      } catch (error) {
        console.error("Failed to load report source data", error);
      }
    };
    loadSupportingData();
  }, []);

  const fleetSummary = useMemo(() => {
    const total = fleetData.length;
    const active = fleetData.filter((v: any) => v.status === "online").length;
    const avgSpeed = total
      ? Math.round(fleetData.reduce((sum: number, v: any) => sum + (Number(v.speed) || 0), 0) / total)
      : 0;
    const totalDistance = Math.round(
      fleetData.reduce((sum: number, v: any) => sum + (Number(v.totalDistance) || 0), 0)
    );
    return { total, active, avgSpeed, totalDistance };
  }, [fleetData]);

  const performanceSummary = useMemo(() => {
    const totalFuelConsumption = fleetData.reduce((sum: number, v: any) => sum + (Number(v.fuelConsumption) || 0), 0);
    const avgFuelConsumption = fleetData.length ? totalFuelConsumption / fleetData.length : 0;
    const incidentCount = eventRows.filter((r) => r.type.includes("alarm") || r.type.includes("overspeed")).length;
    const estimatedRevenue = fleetSummary.totalDistance * 1.4;
    const estimatedExpenses = fleetSummary.totalDistance * 0.9;
    const netProfit = estimatedRevenue - estimatedExpenses;
    const profitMargin = estimatedRevenue > 0 ? (netProfit / estimatedRevenue) * 100 : 0;
    return { totalFuelConsumption, avgFuelConsumption, incidentCount, estimatedRevenue, estimatedExpenses, netProfit, profitMargin };
  }, [eventRows, fleetData, fleetSummary.totalDistance]);

  const submenuItems = [
    { id: "fleet" as ReportSubmenu,     label: "Fleet",     icon: BarChart3 },
    { id: "vehicle" as ReportSubmenu,   label: "Vehicles",  icon: Car },
    { id: "driver" as ReportSubmenu,    label: "Drivers",   icon: User },
    { id: "financial" as ReportSubmenu, label: "Financial", icon: DollarSign },
    { id: "fuel" as ReportSubmenu,      label: "Fuel",      icon: Fuel },
    { id: "custom" as ReportSubmenu,    label: "Custom",    icon: Settings },
    { id: "export" as ReportSubmenu,    label: "Export",    icon: Download },
  ];

  const reportTopics = [
    { id: "route" as ReportTopic,      label: "Route",      icon: RouteIcon },
    { id: "events" as ReportTopic,     label: "Events",     icon: AlertCircle },
    { id: "trips" as ReportTopic,      label: "Trips",      icon: Activity },
    { id: "stops" as ReportTopic,      label: "Stops",      icon: MapPin },
    { id: "summary" as ReportTopic,    label: "Summary",    icon: FileText },
    { id: "chart" as ReportTopic,      label: "Chart",      icon: PieChart },
    { id: "replay" as ReportTopic,     label: "Replay",     icon: PlayCircle },
    { id: "statistics" as ReportTopic, label: "Statistics", icon: BarChart },
  ];

  const prebuiltReports = useMemo(
    () => [
      { id: "fleet",     title: `Fleet Performance (${fleetSummary.total} vehicles)`,            icon: TrendingUp },
      { id: "driver",    title: `Driver Efficiency (${driverCount} drivers)`,                    icon: User },
      { id: "financial", title: `Financial Summary ($${Math.round(performanceSummary.netProfit).toLocaleString()} net)`, icon: DollarSign },
    ],
    [driverCount, fleetSummary.total, performanceSummary.netProfit]
  );

  const toggleTopic = (topic: ReportTopic) =>
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );

  const generateReport = () => {
    toast({ title: "Report Generated", description: `Report with ${selectedTopics.length} topic(s) generated.` });
    setCreateReportDialog(false);
  };

  const renderSubmenuContent = () => {
    switch (activeSubmenu) {
      case "fleet":
        return (
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard title="Total Distance"   value={`${fleetSummary.totalDistance.toLocaleString()} km`} sub="Live total from connected trackers" />
            <StatCard title="Active Vehicles"  value={`${fleetSummary.active}/${fleetSummary.total}`}       sub={`${fleetSummary.total ? Math.round((fleetSummary.active / fleetSummary.total) * 100) : 0}% utilization`} />
            <StatCard title="Average Speed"    value={`${fleetSummary.avgSpeed} km/h`}                      sub="Based on current telemetry" />
          </div>
        );
      case "vehicle":
        return (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Fuel Efficiency</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fleetData.slice(0, 8).map((v: any) => (
                  <TableRow key={String(v.id)}>
                    <TableCell className="font-medium">{v.name ?? `Device ${v.id}`}</TableCell>
                    <TableCell>{Math.round(Number(v.totalDistance) || 0).toLocaleString()} km</TableCell>
                    <TableCell>{Math.round(Number(v.fuelConsumption) || 0)} L/100km</TableCell>
                    <TableCell>
                      <Badge variant={v.status === "online" ? "secondary" : "outline"}>{v.status || "offline"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
      case "driver":
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead><TableHead>Trips</TableHead>
                <TableHead>Score</TableHead><TableHead>Incidents</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Registered Drivers</TableCell>
                <TableCell>{driverCount}</TableCell>
                <TableCell><Badge variant="secondary">{Math.min(100, 75 + Math.min(driverCount, 25))}/100</Badge></TableCell>
                <TableCell>{eventRows.filter((r) => r.type === "alarm").length}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        );
      case "financial":
        return (
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard title="Revenue"      value={`$${Math.round(performanceSummary.estimatedRevenue).toLocaleString()}`}  sub="Distance-based projection" />
            <StatCard title="Expenses"     value={`$${Math.round(performanceSummary.estimatedExpenses).toLocaleString()}`} sub="Operating projection" />
            <StatCard title="Net Profit"   value={`$${Math.round(performanceSummary.netProfit).toLocaleString()}`}         sub="Revenue minus expenses" />
            <StatCard title="Margin"       value={`${performanceSummary.profitMargin.toFixed(1)}%`}                        sub="Live KPI derived" />
          </div>
        );
      case "fuel":
        return (
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard title="Total Fuel Cost"       value={`$${Math.round(performanceSummary.totalFuelConsumption * 200).toLocaleString()}`} sub="From current fuel telemetry" />
            <StatCard title="Average Consumption"   value={`${Math.round(performanceSummary.avgFuelConsumption)} L/100km`}                   sub="Fleet average from API" />
            <StatCard title="Incidents"             value={String(performanceSummary.incidentCount)}                                         sub="Tracked in current event window" />
          </div>
        );
      case "custom":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Build Custom Report</CardTitle>
              <CardDescription>Select topics to include</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {reportTopics.map(({ id, label, icon: Icon }) => (
                  <div key={id} className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors" onClick={() => toggleTopic(id)}>
                    <Checkbox id={id} checked={selectedTopics.includes(id)} onCheckedChange={() => toggleTopic(id)} />
                    <Label htmlFor={id} className="flex items-center gap-2 cursor-pointer text-sm"><Icon className="h-4 w-4" />{label}</Label>
                  </div>
                ))}
              </div>
              <Button onClick={generateReport} className="mt-6 w-full">Generate Report</Button>
            </CardContent>
          </Card>
        );
      case "export":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Export Data</CardTitle>
              <CardDescription>Download reports in various formats</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Format</Label>
                <Select defaultValue="csv">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => toast({ title: "Export Started" })}>
                <Download className="mr-2 h-4 w-4" />Download Report
              </Button>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Reports</h2>
          <p className="text-muted-foreground text-sm">
            Analytics, route history &amp; fleet intelligence
            {initialDeviceId && (
              <span className="ml-2">
                — showing data for device{" "}
                <span className="text-primary font-medium">
                  {fleetData.find((v: any) => String(v.deviceId ?? v.id) === initialDeviceId)?.name ?? `#${initialDeviceId}`}
                </span>
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setViewReportDialog(true)}>
            <Eye className="mr-2 h-4 w-4" />Pre-built
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCreateReportDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />Create
          </Button>
          <Button variant="outline" size="sm" onClick={() => setExportDialog(true)}>
            <FileDown className="mr-2 h-4 w-4" />Export
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiChip label="Total Vehicles"  value={fleetSummary.total}                             icon={<Car className="h-4 w-4" />} />
        <KpiChip label="Online Now"      value={fleetSummary.active}                            icon={<Activity className="h-4 w-4" />} accent />
        <KpiChip label="Avg Speed"       value={`${fleetSummary.avgSpeed} km/h`}                icon={<Gauge className="h-4 w-4" />} />
        <KpiChip label="Total Distance"  value={`${fleetSummary.totalDistance.toLocaleString()} km`} icon={<RouteIcon className="h-4 w-4" />} />
      </div>

      {/* ── Route Report (primary, always shown) ── */}
      <div>
        <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
          <RouteIcon className="h-4 w-4 text-primary" />
          Route Report
        </h3>
        <RouteReportSection fleetData={fleetData} initialDeviceId={initialDeviceId} />
      </div>

      {/* ── Fleet Analytics sub-tabs ── */}
      <div>
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
          {submenuItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSubmenu(id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                activeSubmenu === id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
        {renderSubmenuContent()}
      </div>

      {/* Dialogs */}
      <Dialog open={viewReportDialog} onOpenChange={setViewReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pre-built Reports</DialogTitle>
            <DialogDescription>Select a report template to view</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {prebuiltReports.map(({ id, title, icon: Icon }) => (
              <Button key={id} variant="outline" className="w-full justify-between">
                <div className="flex items-center gap-2"><Icon className="h-4 w-4" />{title}</div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createReportDialog} onOpenChange={setCreateReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Custom Report</DialogTitle>
            <DialogDescription>Select topics to include</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            {reportTopics.map(({ id, label, icon: Icon }) => (
              <div key={id} className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors" onClick={() => toggleTopic(id)}>
                <Checkbox id={`d-${id}`} checked={selectedTopics.includes(id)} onCheckedChange={() => toggleTopic(id)} />
                <Label htmlFor={`d-${id}`} className="flex items-center gap-2 cursor-pointer text-sm"><Icon className="h-4 w-4" />{label}</Label>
              </div>
            ))}
          </div>
          <Button onClick={generateReport} className="w-full mt-2">Generate Report</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={exportDialog} onOpenChange={setExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Data</DialogTitle>
            <DialogDescription>Download in your preferred format</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Format</Label>
              <Select defaultValue="csv">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => { toast({ title: "Export Started" }); setExportDialog(false); }}>
              <Download className="mr-2 h-4 w-4" />Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Utility sub-components ────────────────────────────────────────────────────

function StatCard({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

function KpiChip({ label, value, icon, accent }: { label: string; value: string | number; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className={cn("rounded-xl border p-3 flex items-center gap-3", accent ? "bg-primary/5 border-primary/20" : "bg-card border-border")}>
      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0", accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}
