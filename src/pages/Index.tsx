import { useState } from 'react';
import { Vehicle, VehicleStatus } from '@/types/vehicle';
import { mockVehicles } from '@/data/mockVehicles';
import VehicleList from '@/components/VehicleList';
import FleetMap from '@/components/FleetMap';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAPBOX_TOKEN = '[REDACTED_MAPBOX_TOKEN]';

const Index = () => {
  const [vehicles] = useState<Vehicle[]>(mockVehicles);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [filterStatus, setFilterStatus] = useState<VehicleStatus | 'all'>('all');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="h-full flex overflow-hidden">
      {/* Map fills all available space */}
      <div className="flex-1 min-w-0 relative">
        <FleetMap
          vehicles={vehicles}
          selectedVehicle={selectedVehicle}
          onSelectVehicle={setSelectedVehicle}
          onClearSelection={() => setSelectedVehicle(null)}
          apiToken={MAPBOX_TOKEN}
        />
      </div>

      {/* Right sidebar with edge toggle */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -left-5 z-30",
            "w-5 h-14 flex items-center justify-center",
            "bg-card border border-border border-r-0 rounded-l-md",
            "hover:bg-accent transition-colors cursor-pointer",
            "shadow-md"
          )}
          aria-label={sidebarOpen ? 'Collapse Fleet Overview' : 'Expand Fleet Overview'}
        >
          {sidebarOpen ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        <div
          className={cn(
            "h-full transition-[width] duration-300 ease-in-out overflow-hidden border-l border-border",
            sidebarOpen ? "w-80" : "w-0 border-l-0"
          )}
        >
          <div className="w-80 h-full">
            <VehicleList
              vehicles={vehicles}
              selectedVehicle={selectedVehicle}
              onSelectVehicle={setSelectedVehicle}
              filterStatus={filterStatus}
              onFilterChange={setFilterStatus}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
