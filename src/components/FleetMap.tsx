import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Vehicle } from '@/types/vehicle';
import { Button } from '@/components/ui/button';
import { Map as MapIcon, Satellite, Navigation, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import VehicleDetailCard from './VehicleDetailCard';

interface FleetMapProps {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  onClearSelection: () => void;
  apiToken: string;
}

type MapStyle = 'streets' | 'satellite' | 'traffic';

const FleetMap = ({ vehicles, selectedVehicle, onClearSelection, apiToken }: FleetMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [mapStyle, setMapStyle] = useState<MapStyle>('streets');
  const [cardPosition, setCardPosition] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    if (selectedVehicle) {
      setCardPosition({ x: 0, y: 0 });
    }
  }, [selectedVehicle]);

  useEffect(() => {
    if (!mapContainer.current || !apiToken) return;

    mapboxgl.accessToken = apiToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-73.9776, 40.7580],
      zoom: 12,
      pitch: 45,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, [apiToken]);

  useEffect(() => {
    if (!map.current) return;

    // Remove existing markers
    Object.values(markers.current).forEach((marker) => marker.remove());
    markers.current = {};

    // Add markers for each vehicle
    vehicles.forEach((vehicle) => {
      const el = document.createElement('div');
      el.className = 'vehicle-marker';
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.cursor = 'pointer';

      const statusColors = {
        online: 'hsl(142, 71%, 45%)',
        idle: 'hsl(45, 93%, 47%)',
        offline: 'hsl(0, 84%, 60%)',
      };

      el.innerHTML = `
        <div style="
          width: 100%;
          height: 100%;
          background: ${statusColors[vehicle.status]};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: white;
          font-size: 12px;
        ">
          ${vehicle.name.charAt(0)}
        </div>
      `;

      const marker = new mapboxgl.Marker(el)
        .setLngLat([vehicle.location.lng, vehicle.location.lat])
        .addTo(map.current!);

      markers.current[vehicle.id] = marker;
    });
  }, [vehicles]);

  useEffect(() => {
    if (!map.current || !selectedVehicle) return;

    map.current.flyTo({
      center: [selectedVehicle.location.lng, selectedVehicle.location.lat],
      zoom: 15,
      duration: 1500,
    });
  }, [selectedVehicle]);

  useEffect(() => {
    if (!map.current) return;

    const styleUrls = {
      streets: 'mapbox://styles/mapbox/streets-v12',
      satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
      traffic: 'mapbox://styles/mapbox/streets-v12',
    };

    map.current.setStyle(styleUrls[mapStyle]);

    if (mapStyle === 'traffic') {
      map.current.on('style.load', () => {
        if (!map.current) return;
        
        // Add traffic layer
        if (!map.current.getLayer('traffic')) {
          map.current.addLayer({
            id: 'traffic',
            type: 'line',
            source: {
              type: 'vector',
              url: 'mapbox://mapbox.mapbox-traffic-v1',
            },
            'source-layer': 'traffic',
            paint: {
              'line-width': 2,
              'line-color': [
                'case',
                ['==', ['get', 'congestion'], 'low'], '#4CAF50',
                ['==', ['get', 'congestion'], 'moderate'], '#FFC107',
                ['==', ['get', 'congestion'], 'heavy'], '#F44336',
                ['==', ['get', 'congestion'], 'severe'], '#9C27B0',
                '#808080',
              ],
            },
          });
        }
      });
    }
  }, [mapStyle]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="absolute inset-0" />

      <div className="absolute top-4 left-4 flex gap-2 z-10">
        <Button
          variant={mapStyle === 'streets' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => setMapStyle('streets')}
          className="shadow-lg"
        >
          <MapIcon className="h-4 w-4 mr-2" />
          Street
        </Button>
        <Button
          variant={mapStyle === 'satellite' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => setMapStyle('satellite')}
          className="shadow-lg"
        >
          <Satellite className="h-4 w-4 mr-2" />
          Satellite
        </Button>
        <Button
          variant={mapStyle === 'traffic' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => setMapStyle('traffic')}
          className="shadow-lg"
        >
          <Layers className="h-4 w-4 mr-2" />
          Traffic
        </Button>
      </div>

      {selectedVehicle && (
        <div 
          className="absolute z-10 w-96 max-w-[90vw]"
          style={{
            left: cardPosition.x === 0 ? '50%' : `${cardPosition.x}px`,
            bottom: cardPosition.y === 0 ? '2rem' : 'auto',
            top: cardPosition.y !== 0 ? `${cardPosition.y}px` : 'auto',
            transform: cardPosition.x === 0 ? 'translateX(-50%)' : 'none',
          }}
        >
          <VehicleDetailCard 
            vehicle={selectedVehicle} 
            onClose={onClearSelection}
            position={cardPosition}
            onPositionChange={setCardPosition}
          />
        </div>
      )}
    </div>
  );
};

export default FleetMap;
