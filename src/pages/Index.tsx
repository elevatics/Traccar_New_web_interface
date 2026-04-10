import { useState } from 'react';
import { Vehicle, VehicleStatus } from '@/types/vehicle';
import { mockVehicles } from '@/data/mockVehicles';
import VehicleList from '@/components/VehicleList';
import FleetMap from '@/components/FleetMap';
import { Button } from '@/components/ui/button';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';

const MAPBOX_TOKEN = '[REDACTED_MAPBOX_TOKEN]';

const Index = () => {
  const [vehicles] = useState<Vehicle[]>(mockVehicles);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [filterStatus, setFilterStatus] = useState<VehicleStatus | 'all'>('all');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1">
          <FleetMap
            vehicles={vehicles}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={setSelectedVehicle}
            onClearSelection={() => setSelectedVehicle(null)}
            apiToken={MAPBOX_TOKEN}
          />
        </div>

        {/* Toggle button */}
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-4 right-4 z-20 shadow-lg"
          style={sidebarOpen ? { right: '21rem' } : {}}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </Button>

        {/* Collapsible sidebar */}
        <div
          className={`flex-shrink-0 transition-all duration-300 overflow-hidden ${
            sidebarOpen ? 'w-80' : 'w-0'
          }`}
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
