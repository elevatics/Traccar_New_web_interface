import { Vehicle } from '@/types/vehicle';
import { Button } from '@/components/ui/button';
import StatusBadge from './StatusBadge';
import {
  Gauge,
  Fuel,
  Navigation,
  MapPin,
  Clock,
  Activity,
  Zap,
  CheckCircle,
  XCircle,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Thermometer,
  Route,
  AlertTriangle,
  Server,
  Cpu,
  BarChart3,
  Car,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTrackingPrefs, fmtSpeed, fmtDistance, fmtFuel } from '@/contexts/TrackingPrefsContext';

interface VehicleDetailCardProps {
  vehicle: Vehicle;
  onClose?: () => void;
  position?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  onOpenAIChat?: () => void;
}

const VehicleDetailCard = ({ vehicle, onClose, onPositionChange, onOpenAIChat }: VehicleDetailCardProps) => {
  const navigate = useNavigate();
  const { prefs } = useTrackingPrefs();
  const [systemExpanded, setSystemExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const cardRect = cardRef.current?.getBoundingClientRect();
    if (!cardRect) return;
    setIsDragging(true);
    setDragOffset({ x: e.clientX - cardRect.left, y: e.clientY - cardRect.top });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !onPositionChange) return;
      const cardEl = cardRef.current;
      if (!cardEl) return;
      const mapRootEl = cardEl.closest('.fleet-map-root') as HTMLElement | null;
      if (!mapRootEl) return;
      const parentRect = mapRootEl.getBoundingClientRect();
      const newX = e.clientX - parentRect.left - dragOffset.x;
      const newY = e.clientY - parentRect.top - dragOffset.y;
      const maxX = parentRect.width - cardEl.offsetWidth;
      const maxY = parentRect.height - cardEl.offsetHeight;
      onPositionChange({ x: Math.max(0, Math.min(newX, maxX)), y: Math.max(0, Math.min(newY, maxY)) });
    };
    const handleMouseUp = () => setIsDragging(false);
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, onPositionChange]);

  const lastUpdatedLabel = (() => {
    const t = vehicle.serverTime || vehicle.fixTime;
    if (!t) return 'Unknown';
    const d = new Date(t);
    if (isNaN(d.getTime())) return 'Unknown';
    return formatDistanceToNow(d, { addSuffix: true });
  })();

  const isOutdated = vehicle.outdated;
  /** Prefer primary fuel reading; fall back to fuelLevel when fuel is unset/zero (stash behavior). */
  const latestFuelPercent = vehicle.fuel > 0 ? vehicle.fuel : vehicle.fuelLevel;
  const fuelLow = latestFuelPercent < 20;

  // Speed — respects prefs unit, suppresses GPS drift when stationary
  const displaySpeed = fmtSpeed(
    vehicle.speed,
    prefs.speedUnit,
    vehicle.motion === false || vehicle.status === 'offline'
  );

  // Distance helpers respecting prefs unit
  const displayOdometer  = fmtDistance(vehicle.odometer,      prefs.distanceUnit);
  const displayTrip      = fmtDistance(vehicle.tripOdometer,  prefs.distanceUnit);
  const displayTotal     = fmtDistance(vehicle.totalDistance, prefs.distanceUnit);

  /** Format L/100km (or MPG) respecting prefs unit. */
  const fmtL100km = (l100km: number) => {
    if (prefs.fuelUnit === 'us_gallons')  return `${(235.214 / l100km).toFixed(1)} mpg`;
    if (prefs.fuelUnit === 'imp_gallons') return `${(282.481 / l100km).toFixed(1)} mpg`;
    return `${l100km.toFixed(1)} L/100km`;
  };

  /**
   * Average Fuel Consumption — two-path logic to handle the two ways Traccar
   * devices report `fuelConsumption`:
   *
   *  PATH A – Cumulative mL counter (large values > 200):
   *    Many OBD devices report accumulated fuel used in millilitres.
   *    L/100km = (rawValue ÷ 1000) ÷ distanceKm × 100
   *    Works even when the vehicle is stationary.
   *
   *  PATH B – Instantaneous L/h rate (small values ≤ 200):
   *    Some devices report a live fuel-flow rate in litres-per-hour.
   *    L/100km = (L/h) ÷ (km/h) × 100   [requires the vehicle to be moving]
   */
  const { avgFuelLabel, avgFuelMethod } = (() => {
    const raw     = vehicle.fuelConsumption;
    const speedKmh = vehicle.speed * 1.852;
    const distKm  = vehicle.tripOdometer > 0
      ? vehicle.tripOdometer / 1000
      : vehicle.totalDistance / 1000;

    if (raw <= 0) return { avgFuelLabel: 'N/A', avgFuelMethod: 'none' as const };

    // PATH A — accumulated mL total
    if (raw > 200 && distKm >= 1) {
      const fuelL  = raw / 1000;                    // mL → L
      const l100km = (fuelL / distKm) * 100;
      if (l100km >= 0.5 && l100km <= 200) {
        return { avgFuelLabel: fmtL100km(l100km), avgFuelMethod: 'distance' as const };
      }
    }

    // PATH B — L/h rate (needs speed)
    if (raw <= 200 && speedKmh >= 1) {
      const l100km = (raw / speedKmh) * 100;
      if (l100km >= 0.5 && l100km <= 150) {
        return { avgFuelLabel: fmtL100km(l100km), avgFuelMethod: 'rate' as const };
      }
    }

    return { avgFuelLabel: 'N/A', avgFuelMethod: 'none' as const };
  })();

  /** Format an instantaneous fuel flow rate (L/h) with unit preference. */
  const fmtFuelRate = (lph: number) => {
    if (prefs.fuelUnit === 'us_gallons')  return `${(lph * 0.264172).toFixed(1)} gal/h`;
    if (prefs.fuelUnit === 'imp_gallons') return `${(lph * 0.219969).toFixed(1)} imp gal/h`;
    return `${lph.toFixed(1)} L/h`;
  };

  // Secondary row: L/h rate when available (PATH B devices only)
  const traccarFuelDisplay =
    vehicle.fuelConsumption > 0 && vehicle.fuelConsumption <= 200
      ? fmtFuelRate(vehicle.fuelConsumption)
      : null;

  // Secondary row: total fuel used in sensible units (PATH A devices)
  const fuelUsedDisplay =
    vehicle.fuelConsumption > 200
      ? fmtFuel(vehicle.fuelConsumption / 1000, prefs.fuelUnit)   // mL → L
      : null;

  // Vehicle image stored in Traccar device attributes.imageUrl
  const vehicleImageUrl = vehicle.imageUrl;

  const getDirectionLabel = (course: number) => {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(course / 45) % 8];
  };

  return (
    <div
      ref={cardRef}
      className={cn(
        "w-full bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden",
        isDragging && "cursor-grabbing select-none"
      )}
    >
      {/* ── Header ── */}
      {vehicleImageUrl ? (
        /* Hero image banner with name / close overlaid */
        <div
          className="relative flex-shrink-0 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <img
            src={vehicleImageUrl}
            alt={vehicle.name}
            className="w-full h-40 object-cover rounded-t-2xl"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          {/* Dark gradient overlay so text is readable */}
          <div className="absolute inset-0 rounded-t-2xl bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Close button — top-right */}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-2 right-2 h-8 w-8 bg-black/40 hover:bg-black/60 text-white border border-white/20 rounded-lg backdrop-blur-sm"
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          {/* Name / plate / status pinned to bottom of image */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-6">
            <div className="flex items-end justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <StatusBadge status={vehicle.status} />
                </div>
                <h3 className="font-bold text-base text-white leading-tight truncate drop-shadow">
                  {vehicle.name}
                </h3>
                {vehicle.plateNumber && vehicle.plateNumber !== '-' && (
                  <p className="text-xs text-white/70 mt-0.5">{vehicle.plateNumber}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Standard compact header when no image */
        <div
          className="flex items-start justify-between gap-2 px-4 pt-4 pb-3 border-b border-border cursor-grab active:cursor-grabbing flex-shrink-0"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 border border-border">
              <Car className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <StatusBadge status={vehicle.status} />
                <h3 className="font-semibold text-base truncate">{vehicle.name}</h3>
              </div>
              <p className="text-xs text-muted-foreground">{vehicle.plateNumber}</p>
            </div>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 flex-shrink-0 hover:bg-destructive/10 rounded-lg border border-transparent hover:border-destructive/20"
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* ── Scrollable body ── */}
      <div className="overflow-y-auto flex-1 min-h-0 space-y-3 px-4 py-3">

        {/* ── SECTION 1: Live Status ── */}
        <SectionLabel icon={<Activity className="h-3.5 w-3.5" />} label="Live Status" />
        <div className="grid grid-cols-2 gap-2">
          {/* Speed */}
          <StatChip
            label="Speed"
            value={displaySpeed}
            icon={<Gauge className="h-4 w-4" />}
            color={
              (vehicle.motion === false || vehicle.status === 'offline' || vehicle.speed < 0.5)
                ? 'muted'
                : vehicle.speed * 1.852 > 80
                  ? 'orange'
                  : 'green'
            }
            large
          />
          {/* Ignition */}
          <StatChip
            label="Ignition"
            value={vehicle.ignition ? 'ON' : 'OFF'}
            icon={<Zap className="h-4 w-4" />}
            color={vehicle.ignition ? 'green' : 'red'}
            large
          />
          {/* Motion */}
          <StatChip
            label="Motion"
            value={vehicle.motion ? 'Moving' : 'Stopped'}
            icon={vehicle.motion ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            color={vehicle.motion ? 'green' : 'muted'}
          />
          {/* Last Update */}
          <StatChip
            label="Updated"
            value={lastUpdatedLabel}
            icon={<Clock className="h-4 w-4" />}
            color={isOutdated ? 'orange' : 'muted'}
          />
        </div>

        {/* ── SECTION 2: Location ── */}
        <SectionLabel icon={<MapPin className="h-3.5 w-3.5" />} label="Location" />
        <div className="rounded-xl bg-muted/50 border border-border/60 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm font-medium leading-snug line-clamp-2">{vehicle.location.address || 'Address unavailable'}</p>
          </div>
          <div className="flex items-center gap-4 pt-1 border-t border-border/40">
            <CoordItem label="Lat" value={vehicle.location.lat.toFixed(5)} />
            <CoordItem label="Lng" value={vehicle.location.lng.toFixed(5)} />
            <CoordItem label="Dir" value={getDirectionLabel(vehicle.course)} />
          </div>
        </div>

        {/* ── SECTION 3: Vehicle Health ── */}
        <SectionLabel icon={<Fuel className="h-3.5 w-3.5" />} label="Vehicle Health" />
        <div className="space-y-2">
          {/* Fuel bar — uses latestFuelPercent (fuel or fuelLevel fallback) */}
          <div className="rounded-xl bg-muted/50 border border-border/60 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Fuel className="h-3.5 w-3.5" />
                <span>Fuel Level</span>
              </div>
              <span className={cn("font-semibold", fuelLow ? "text-orange-500" : "text-foreground")}>
                {latestFuelPercent}%
                {fuelLow && <AlertTriangle className="h-3.5 w-3.5 inline ml-1 text-orange-500" />}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  latestFuelPercent < 20 ? "bg-orange-500" : latestFuelPercent < 50 ? "bg-yellow-500" : "bg-green-500"
                )}
                style={{ width: `${Math.min(100, latestFuelPercent)}%` }}
              />
            </div>
          </div>

          {prefs.showOdometer && (
            <div className="grid grid-cols-3 gap-2">
              <MetricItem label="Odometer" value={displayOdometer} icon={<Route className="h-3.5 w-3.5" />} />
              <MetricItem label="Trip" value={displayTrip} icon={<Navigation className="h-3.5 w-3.5" />} />
              <MetricItem label="Total" value={displayTotal} icon={<Activity className="h-3.5 w-3.5" />} />
            </div>
          )}

          {/* Fuel consumption block */}
          {prefs.showFuelConsumption && (
            <div className="rounded-xl bg-muted/50 border border-border/60 p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Avg Consumption</span>
                </div>
                <span className="font-semibold text-foreground">{avgFuelLabel}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {avgFuelMethod === 'distance'
                  ? `Based on device fuel counter · ${latestFuelPercent.toFixed(0)}% remaining`
                  : avgFuelMethod === 'rate'
                    ? `Live rate ÷ speed · ${latestFuelPercent.toFixed(0)}% remaining`
                    : `Fuel data unavailable · ${latestFuelPercent.toFixed(0)}% remaining`}
              </p>

              {/* PATH B: L/h rate row */}
              {traccarFuelDisplay && (
                <>
                  <div className="border-t border-border/40 pt-2 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Fuel className="h-3.5 w-3.5" />
                      <span>Fuel Rate</span>
                    </div>
                    <span className="font-semibold text-foreground">{traccarFuelDisplay}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Instantaneous fuel flow (L/h)</p>
                </>
              )}

              {/* PATH A: total fuel used row */}
              {fuelUsedDisplay && (
                <>
                  <div className="border-t border-border/40 pt-2 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Fuel className="h-3.5 w-3.5" />
                      <span>Total Fuel Used</span>
                    </div>
                    <span className="font-semibold text-foreground">{fuelUsedDisplay}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Cumulative fuel from device odometer</p>
                </>
              )}
            </div>
          )}

          {(vehicle.coolantTemp || vehicle.intakeTemp) && (
            <div className="grid grid-cols-2 gap-2">
              {vehicle.coolantTemp !== undefined && (
                <MetricItem label="Coolant" value={`${vehicle.coolantTemp}°`} icon={<Thermometer className="h-3.5 w-3.5" />} />
              )}
              {vehicle.intakeTemp !== undefined && (
                <MetricItem label="Intake" value={`${vehicle.intakeTemp}°`} icon={<Thermometer className="h-3.5 w-3.5" />} />
              )}
            </div>
          )}
        </div>

        {/* ── SECTION 4: System Info (collapsible) ── */}
        <button
          type="button"
          onClick={() => setSystemExpanded(p => !p)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-muted/40 border border-border/50 text-xs font-medium text-muted-foreground hover:bg-muted/70 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Server className="h-3.5 w-3.5" />
            System Info
          </span>
          {systemExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        <div className={cn(
          "overflow-hidden transition-all duration-300 space-y-1",
          systemExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
        )}>
          <div className="rounded-xl bg-muted/40 border border-border/50 p-3 space-y-1 text-xs">
            <SysRow label="Device ID" value={String(vehicle.deviceId)} icon={<Cpu className="h-3 w-3" />} />
            <SysRow label="Protocol" value={vehicle.protocol || 'N/A'} />
            <SysRow label="Server Time" value={fmtDate(vehicle.serverTime)} icon={<Clock className="h-3 w-3" />} />
            <SysRow label="Device Time" value={fmtDate(vehicle.deviceTime)} />
            <SysRow label="Fix Time" value={fmtDate(vehicle.fixTime)} />
            <SysRow label="Accuracy" value={`±${vehicle.accuracy}m`} />
            <SysRow
              label="Valid"
              value={vehicle.valid ? 'Yes' : 'No'}
              valueClass={vehicle.valid ? 'text-green-600 dark:text-green-400' : 'text-red-500'}
            />
            <SysRow
              label="Outdated"
              value={vehicle.outdated ? 'Yes' : 'No'}
              valueClass={vehicle.outdated ? 'text-orange-500' : 'text-green-600 dark:text-green-400'}
            />
            <SysRow label="Fuel %" value={`${latestFuelPercent}%`} icon={<Fuel className="h-3 w-3" />} />
            <SysRow label="Avg Consumption" value={avgFuelLabel} icon={<BarChart3 className="h-3 w-3" />} />
            {traccarFuelDisplay && <SysRow label="Fuel Rate" value={traccarFuelDisplay} icon={<Fuel className="h-3 w-3" />} />}
            {fuelUsedDisplay && <SysRow label="Fuel Used" value={fuelUsedDisplay} icon={<Fuel className="h-3 w-3" />} />}
            {prefs.showAltitude && <SysRow label="Altitude" value={`${vehicle.altitude.toFixed(0)} m`} />}
            {vehicle.network && <SysRow label="Network" value={vehicle.network} />}
            {vehicle.rpm !== undefined && <SysRow label="RPM" value={String(vehicle.rpm)} />}
          </div>
        </div>
      </div>

      {/* ── Footer Actions ── */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0 border-t border-border space-y-2">
        {/* Primary row */}
        <div className="flex gap-2">
          {onOpenAIChat && (
            <Button
              size="sm"
              className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 gap-1.5 rounded-xl h-9"
              onClick={onOpenAIChat}
            >
              <Sparkles className="h-4 w-4" />
              AI Companion
            </Button>
          )}
          {/* Reports button — navigates to /reports?deviceId=X and auto-loads route data */}
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-xl h-9 text-xs font-medium border-primary/30 text-primary hover:bg-primary/5 hover:text-primary"
            onClick={() => {
              if (onClose) onClose();
              navigate(`/reports?deviceId=${vehicle.deviceId}`);
            }}
          >
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
            View Reports
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VehicleDetailCard;

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">
      {icon}
      {label}
    </div>
  );
}

type ChipColor = 'green' | 'red' | 'orange' | 'muted';

function StatChip({
  label, value, icon, color = 'muted', large,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  color?: ChipColor;
  large?: boolean;
}) {
  const colorMap: Record<ChipColor, string> = {
    green: 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400',
    red: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400',
    orange: 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400',
    muted: 'bg-muted/50 border-border/60 text-muted-foreground',
  };
  return (
    <div className={cn("rounded-xl border p-3 flex items-center gap-2", colorMap[color])}>
      {icon && <span className="flex-shrink-0 opacity-80">{icon}</span>}
      <div>
        <p className="text-[10px] leading-none opacity-70 mb-1">{label}</p>
        <p className={cn("font-semibold leading-none", large ? "text-sm" : "text-xs")}>{value}</p>
      </div>
    </div>
  );
}

function CoordItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs font-medium font-mono">{value}</p>
    </div>
  );
}

function MetricItem({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-muted/50 border border-border/60 p-2.5 flex flex-col items-center gap-1 text-center">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <p className="text-xs font-semibold">{value}</p>
      <p className="text-[10px] text-muted-foreground leading-none">{label}</p>
    </div>
  );
}

function SysRow({ label, value, icon, valueClass }: { label: string; value: string; icon?: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <span className={cn("font-medium font-mono", valueClass)}>{value}</span>
    </div>
  );
}

function fmtDate(val?: string) {
  if (!val) return 'N/A';
  const d = new Date(val);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}
