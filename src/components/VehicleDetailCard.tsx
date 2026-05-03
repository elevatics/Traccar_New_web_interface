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
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface VehicleDetailCardProps {
  vehicle: Vehicle;
  onClose?: () => void;
  position?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  onOpenAIChat?: () => void;
}

const VehicleDetailCard = ({ vehicle, onClose, onPositionChange, onOpenAIChat }: VehicleDetailCardProps) => {
  const navigate = useNavigate();
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
  const fuelLow = vehicle.fuel < 20;
  const speedKmh = Math.round(vehicle.speed * 1.852);

  const getDirectionLabel = (course: number) => {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(course / 45) % 8];
  };

  return (
    <div
      ref={cardRef}
      className={cn(
        "w-full bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[82vh] overflow-hidden",
        isDragging && "cursor-grabbing select-none"
      )}
    >
      {/* ── Header ── */}
      <div
        className="flex items-start justify-between gap-2 px-4 pt-4 pb-3 border-b border-border cursor-grab active:cursor-grabbing flex-shrink-0"
        onMouseDown={handleMouseDown}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <StatusBadge status={vehicle.status} />
            <h3 className="font-semibold text-base truncate">{vehicle.name}</h3>
          </div>
          <p className="text-xs text-muted-foreground">{vehicle.plateNumber}</p>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 flex-shrink-0 hover:bg-destructive/10 rounded-lg"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div className="overflow-y-auto flex-1 space-y-3 px-4 py-3">

        {/* ── SECTION 1: Live Status ── */}
        <SectionLabel icon={<Activity className="h-3.5 w-3.5" />} label="Live Status" />
        <div className="grid grid-cols-2 gap-2">
          {/* Speed */}
          <StatChip
            label="Speed"
            value={`${speedKmh} km/h`}
            icon={<Gauge className="h-4 w-4" />}
            color={speedKmh > 80 ? 'orange' : speedKmh > 0 ? 'green' : 'muted'}
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
          {/* Fuel bar */}
          <div className="rounded-xl bg-muted/50 border border-border/60 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Fuel className="h-3.5 w-3.5" />
                <span>Fuel Level</span>
              </div>
              <span className={cn("font-semibold", fuelLow ? "text-orange-500" : "text-foreground")}>
                {vehicle.fuel}%
                {fuelLow && <AlertTriangle className="h-3.5 w-3.5 inline ml-1 text-orange-500" />}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  vehicle.fuel < 20 ? "bg-orange-500" : vehicle.fuel < 50 ? "bg-yellow-500" : "bg-green-500"
                )}
                style={{ width: `${Math.min(100, vehicle.fuel)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <MetricItem label="Odometer" value={`${(vehicle.odometer / 1000).toFixed(0)} km`} icon={<Route className="h-3.5 w-3.5" />} />
            <MetricItem label="Trip" value={`${(vehicle.tripOdometer / 1000).toFixed(1)} km`} icon={<Navigation className="h-3.5 w-3.5" />} />
            <MetricItem label="Total" value={`${Math.round(vehicle.totalDistance)} km`} icon={<Activity className="h-3.5 w-3.5" />} />
          </div>

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
