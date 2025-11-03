import { Vehicle } from '@/types/vehicle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from './StatusBadge';
import { 
  ChevronDown, 
  ChevronUp, 
  Gauge, 
  Fuel, 
  Navigation, 
  MapPin,
  Clock,
  Activity,
  Thermometer,
  Zap,
  CheckCircle,
  XCircle,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface VehicleDetailCardProps {
  vehicle: Vehicle;
  onClose?: () => void;
}

const VehicleDetailCard = ({ vehicle, onClose }: VehicleDetailCardProps) => {
  const [expanded, setExpanded] = useState(false);

  const getDirectionArrow = (course: number) => {
    const directions = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
    const index = Math.round(course / 45) % 8;
    return directions[index];
  };

  const DetailRow = ({ label, value, icon: Icon }: { label: string; value: string | number; icon?: any }) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
        {Icon && <Icon className="h-4 w-4" />}
        <span>{label}</span>
      </div>
      <span className="text-sm font-medium text-card-foreground">{value}</span>
    </div>
  );

  return (
    <Card className="w-full shadow-2xl max-h-[80vh] flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={vehicle.status} />
              <CardTitle className="text-lg">{vehicle.name}</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">{vehicle.plateNumber}</p>
          </div>
          {onClose && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose} 
              className="h-8 w-8 flex-shrink-0 hover:bg-destructive/10"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 overflow-y-auto flex-1 scrollbar-thin">
        {/* Quick Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
            <Gauge className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Speed</p>
              <p className="text-sm font-bold">{vehicle.speed} mph</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
            <Fuel className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Fuel</p>
              <p className="text-sm font-bold">{vehicle.fuel}%</p>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
          <MapPin className="h-4 w-4 text-primary mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-gray-600 dark:text-gray-400">Location</p>
            <p className="text-sm font-medium">{vehicle.location.address}</p>
          </div>
        </div>

        {/* Expand Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              Show More Details
            </>
          )}
        </Button>

        {/* Expanded Details */}
        <div className={cn(
          "space-y-4 overflow-hidden transition-all duration-300",
          expanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        )}>
          {/* Device Information */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Device Information
            </h4>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-1">
              <DetailRow label="ID" value={vehicle.id} />
              <DetailRow label="Device ID" value={vehicle.deviceId} />
              <DetailRow label="Protocol" value={vehicle.protocol} />
            </div>
          </div>

          {/* Time Information */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time & Status
            </h4>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-1">
              <DetailRow 
                label="Server Time" 
                value={format(new Date(vehicle.serverTime), 'yyyy-MM-dd HH:mm:ss')} 
              />
              <DetailRow 
                label="Device Time" 
                value={format(new Date(vehicle.deviceTime), 'yyyy-MM-dd HH:mm:ss')} 
              />
              <DetailRow 
                label="Fix Time" 
                value={format(new Date(vehicle.fixTime), 'yyyy-MM-dd HH:mm:ss')} 
              />
              <DetailRow 
                label="Outdated" 
                value={vehicle.outdated ? 'Yes' : 'No'} 
                icon={vehicle.outdated ? XCircle : CheckCircle}
              />
              <DetailRow 
                label="Valid" 
                value={vehicle.valid ? 'Yes' : 'No'} 
                icon={vehicle.valid ? CheckCircle : XCircle}
              />
            </div>
          </div>

          {/* Location Details */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
              <Navigation className="h-4 w-4" />
              Location Details
            </h4>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-1">
              <DetailRow label="Latitude" value={`${vehicle.location.lat.toFixed(6)}°`} />
              <DetailRow label="Longitude" value={`${vehicle.location.lng.toFixed(6)}°`} />
              <DetailRow label="Altitude" value={`${vehicle.altitude.toFixed(2)} ft`} />
              <DetailRow label="Course" value={getDirectionArrow(vehicle.course)} />
              <DetailRow label="Accuracy" value={vehicle.accuracy} />
              <DetailRow label="Address" value={vehicle.location.address} />
            </div>
          </div>

          {/* Movement & Distance */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              Movement & Distance
            </h4>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-1">
              <DetailRow label="Speed" value={`${vehicle.speed} mph`} />
              <DetailRow label="Odometer" value={`${vehicle.odometer.toLocaleString()} mi`} />
              <DetailRow label="Trip Odometer" value={vehicle.tripOdometer.toLocaleString()} />
              <DetailRow label="Distance" value={`${vehicle.distance.toFixed(2)} mi`} />
              <DetailRow label="Total Distance" value={`${vehicle.totalDistance} mi`} />
              <DetailRow 
                label="Motion" 
                value={vehicle.motion ? 'Yes' : 'No'}
                icon={vehicle.motion ? CheckCircle : XCircle}
              />
            </div>
          </div>

          {/* Fuel & Engine */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
              <Fuel className="h-4 w-4" />
              Fuel & Engine
            </h4>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-1">
              <DetailRow label="Fuel" value={`${vehicle.fuel}%`} />
              <DetailRow label="Fuel Consumption" value={vehicle.fuelConsumption.toLocaleString()} />
              <DetailRow 
                label="Ignition" 
                value={vehicle.ignition ? 'On' : 'Off'}
                icon={vehicle.ignition ? Zap : XCircle}
              />
              {vehicle.rpm !== undefined && <DetailRow label="RPM" value={vehicle.rpm} />}
              {vehicle.obdSpeed !== undefined && <DetailRow label="OBD Speed" value={`${vehicle.obdSpeed} mph`} />}
            </div>
          </div>

          {/* Temperature & Sensors */}
          {(vehicle.coolantTemp || vehicle.intakeTemp || vehicle.mapIntake) && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
                <Thermometer className="h-4 w-4" />
                Temperature & Sensors
              </h4>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-1">
                {vehicle.coolantTemp && <DetailRow label="Coolant Temp" value={`${vehicle.coolantTemp}°F`} />}
                {vehicle.intakeTemp && <DetailRow label="Intake Temp" value={`${vehicle.intakeTemp}°F`} />}
                {vehicle.mapIntake && <DetailRow label="MAP Intake" value={vehicle.mapIntake} />}
              </div>
            </div>
          )}

          {/* System Status */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              System Status
            </h4>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-1">
              <DetailRow label="Status Code" value={vehicle.statusCode} />
              {vehicle.network && <DetailRow label="Network" value={vehicle.network} />}
              {vehicle.geofenceIds && <DetailRow label="Geofence IDs" value={vehicle.geofenceIds} />}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VehicleDetailCard;
