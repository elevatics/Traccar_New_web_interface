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
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* Map area */}
        <div className="flex-1 relative">
          <FleetMap
            vehicles={vehicles}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={setSelectedVehicle}
            onClearSelection={() => setSelectedVehicle(null)}
            apiToken={MAPBOX_TOKEN}
          />
        </div>

        {/* Sidebar with edge toggle handle */}
        <div className="relative flex-shrink-0">
          {/* Toggle handle - always visible on the left edge of sidebar */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 -left-4 z-30",
              "w-4 h-12 flex items-center justify-center",
              "bg-card border border-border border-r-0 rounded-l-md",
              "hover:bg-accent transition-colors cursor-pointer",
              "shadow-sm"
            )}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronLeft className="h-3 w-3 text-muted-foreground" />
            )}
          </button>

          <div
            className={cn(
              "h-full transition-[width] duration-300 ease-in-out overflow-hidden",
              sidebarOpen ? "w-80" : "w-0"
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
    </div>
  );
};

export default Index;
