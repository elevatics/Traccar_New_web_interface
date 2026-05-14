import { Vehicle } from '@/types/vehicle';
import { Card } from '@/components/ui/card';
import StatusBadge from './StatusBadge';
import { Clock, Fuel, Gauge, MapPin, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface VehicleCardProps {
  vehicle: Vehicle;
}

const VehicleCard = ({ vehicle }: VehicleCardProps) => {
  return (
    <Card className="p-4 shadow-lg border-border bg-card">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-card-foreground">{vehicle.name}</h3>
            <p className="text-sm text-muted-foreground">{vehicle.plateNumber}</p>
          </div>
          <StatusBadge status={vehicle.status} showLabel={false} size="lg" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Driver</p>
              <p className="font-medium text-card-foreground">{vehicle.driver}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Speed</p>
              <p className="font-medium text-card-foreground">{Math.round(vehicle.speed * 1.852)} km/h</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Fuel className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Fuel</p>
              <p className="font-medium text-card-foreground">{vehicle.fuel > 0 ? vehicle.fuel : vehicle.fuelLevel}%</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Updated</p>
              <p className="font-medium text-card-foreground">
                {formatDistanceToNow(new Date(vehicle.lastUpdate), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 text-sm pt-2 border-t border-border">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Location</p>
            <p className="text-card-foreground">{vehicle.location.address}</p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground pt-2 border-t border-border">
          Odometer: {(vehicle.odometer / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} km
        </div>
      </div>
    </Card>
  );
};

export default VehicleCard;
