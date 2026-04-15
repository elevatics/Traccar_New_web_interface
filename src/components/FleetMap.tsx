import { useEffect, useMemo, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Vehicle } from '@/types/vehicle';
import { Button } from '@/components/ui/button';
import { Map as MapIcon, Satellite, Navigation, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import VehicleDetailCard from './VehicleDetailCard';
import VehicleAIChat from './VehicleAIChat';
import useFleetData from '@/hooks/useFleetData';

interface FleetMapProps {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  onSelectVehicle: (vehicle: Vehicle) => void;
  onClearSelection: () => void;
  apiToken: string;
}

type MapStyle = 'streets' | 'satellite' | 'traffic';
type FleetPoint = {
  id: string | number;
  deviceId?: number;
  protocol?: string;
  name: string;
  plateNumber?: string;
  driver?: string;
  status: string;
  address?: string;
  lat: number;
  lng: number;
  speed: number;
  serverTime?: string | null;
  deviceTime?: string | null;
  fixTime?: string | null;
  lastUpdate?: string | null;
  fuelLevel?: number;
  odometer?: number;
  outdated?: boolean;
  valid?: boolean;
  altitude?: number;
  course?: number;
  accuracy?: number;
  network?: string;
  geofenceIds?: string;
  tripOdometer?: number;
  fuelConsumption?: number;
  ignition?: boolean;
  statusCode?: number;
  coolantTemp?: number;
  mapIntake?: number;
  rpm?: number;
  obdSpeed?: number;
  intakeTemp?: number;
  fuel?: number;
  distance?: number;
  totalDistance?: number;
  motion?: boolean;
};
type MarkerEntry = {
  marker: mapboxgl.Marker;
  element: HTMLDivElement;
  innerElement: HTMLDivElement;
  popup: mapboxgl.Popup;
  lastLat: number;
  lastLng: number;
  lastStatus: string;
  lastName: string;
};

const STATUS_COLORS: Record<string, string> = {
  online: 'hsl(142, 71%, 45%)',
  idle: 'hsl(45, 93%, 47%)',
  offline: 'hsl(0, 84%, 60%)',
  unknown: 'hsl(215, 16%, 47%)',
};

const getStatusColor = (status?: string) => STATUS_COLORS[status || ''] || STATUS_COLORS.unknown;
const toVehicleStatus = (status?: string): Vehicle['status'] => {
  if (status === 'online' || status === 'idle' || status === 'offline') {
    return status;
  }
  return 'offline';
};

const createFallbackVehicle = (fleetVehicle: FleetPoint): Vehicle => {
  const nowIso = new Date().toISOString();

  return {
    id: String(fleetVehicle.id),
    deviceId: Number(fleetVehicle.deviceId ?? fleetVehicle.id) || 0,
    protocol: fleetVehicle.protocol || 'traccar',
    name: fleetVehicle.name || 'Unknown Device',
    plateNumber: fleetVehicle.plateNumber || '-',
    driver: fleetVehicle.driver || '-',
    status: toVehicleStatus(fleetVehicle.status),
    location: {
      lat: Number(fleetVehicle.lat) || 0,
      lng: Number(fleetVehicle.lng) || 0,
      address: fleetVehicle.address || 'Live location',
    },
    speed: Number(fleetVehicle.speed) || 0,
    serverTime: fleetVehicle.serverTime || nowIso,
    deviceTime: fleetVehicle.deviceTime || nowIso,
    fixTime: fleetVehicle.fixTime || nowIso,
    lastUpdate: fleetVehicle.lastUpdate || nowIso,
    fuelLevel: Number(fleetVehicle.fuelLevel) || 0,
    odometer: Number(fleetVehicle.odometer) || 0,
    outdated: Boolean(fleetVehicle.outdated),
    valid: fleetVehicle.valid !== false,
    altitude: Number(fleetVehicle.altitude) || 0,
    course: Number(fleetVehicle.course) || 0,
    accuracy: Number(fleetVehicle.accuracy) || 0,
    network: fleetVehicle.network,
    geofenceIds: fleetVehicle.geofenceIds,
    tripOdometer: Number(fleetVehicle.tripOdometer) || 0,
    fuelConsumption: Number(fleetVehicle.fuelConsumption) || 0,
    ignition: Boolean(fleetVehicle.ignition),
    statusCode: Number(fleetVehicle.statusCode) || 0,
    coolantTemp: fleetVehicle.coolantTemp,
    mapIntake: fleetVehicle.mapIntake,
    rpm: fleetVehicle.rpm,
    obdSpeed: fleetVehicle.obdSpeed,
    intakeTemp: fleetVehicle.intakeTemp,
    fuel: Number(fleetVehicle.fuel) || 0,
    distance: Number(fleetVehicle.distance) || 0,
    totalDistance: Number(fleetVehicle.totalDistance) || 0,
    motion: Boolean(fleetVehicle.motion),
  };
};

const FleetMap = ({ vehicles, selectedVehicle, onSelectVehicle, onClearSelection, apiToken }: FleetMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Record<string, MarkerEntry>>({});
  const hasAutoCentered = useRef(false);
  const [mapStyle, setMapStyle] = useState<MapStyle>('streets');
  const [cardPosition, setCardPosition] = useState({ x: 0, y: 0 });
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiChatVehicle, setAiChatVehicle] = useState<Vehicle | null>(null);
  const { fleetData } = useFleetData();
  const vehiclesById = useMemo(
    () =>
      new Map(vehicles.map((vehicle) => [String(vehicle.id), vehicle])),
    [vehicles]
  );
  
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
      Object.values(markers.current).forEach((entry) => entry.marker.remove());
      markers.current = {};
      map.current?.remove();
    };
  }, [apiToken]);

  useEffect(() => {
    if (!map.current || !mapContainer.current) return;

    const resizeMap = () => {
      map.current?.resize();
    };

    const resizeObserver = new ResizeObserver(() => {
      resizeMap();
    });

    resizeObserver.observe(mapContainer.current);
    window.addEventListener('resize', resizeMap);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', resizeMap);
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;

    const nextIds = new Set<string>();

    (fleetData as FleetPoint[]).forEach((fleetVehicle) => {
      const markerId = String(fleetVehicle.id);
      nextIds.add(markerId);
      const matchedVehicle = vehiclesById.get(markerId);
      const selectedVehicleData = matchedVehicle
        ? {
            ...matchedVehicle,
            deviceId: Number(fleetVehicle.deviceId ?? matchedVehicle.deviceId),
            protocol: fleetVehicle.protocol || matchedVehicle.protocol,
            plateNumber: fleetVehicle.plateNumber || matchedVehicle.plateNumber,
            driver: fleetVehicle.driver || matchedVehicle.driver,
            status: toVehicleStatus(fleetVehicle.status),
            speed: Number(fleetVehicle.speed) || 0,
            location: {
              ...matchedVehicle.location,
              lat: Number(fleetVehicle.lat) || 0,
              lng: Number(fleetVehicle.lng) || 0,
              address: fleetVehicle.address || matchedVehicle.location.address,
            },
            serverTime: fleetVehicle.serverTime || matchedVehicle.serverTime,
            deviceTime: fleetVehicle.deviceTime || matchedVehicle.deviceTime,
            fixTime: fleetVehicle.fixTime || matchedVehicle.fixTime,
            lastUpdate: fleetVehicle.lastUpdate || matchedVehicle.lastUpdate,
            fuelLevel: Number(fleetVehicle.fuelLevel ?? matchedVehicle.fuelLevel) || 0,
            odometer: Number(fleetVehicle.odometer ?? matchedVehicle.odometer) || 0,
            outdated: fleetVehicle.outdated ?? matchedVehicle.outdated,
            valid: fleetVehicle.valid ?? matchedVehicle.valid,
            altitude: Number(fleetVehicle.altitude ?? matchedVehicle.altitude) || 0,
            course: Number(fleetVehicle.course ?? matchedVehicle.course) || 0,
            accuracy: Number(fleetVehicle.accuracy ?? matchedVehicle.accuracy) || 0,
            network: fleetVehicle.network ?? matchedVehicle.network,
            geofenceIds: fleetVehicle.geofenceIds ?? matchedVehicle.geofenceIds,
            tripOdometer:
              Number(fleetVehicle.tripOdometer ?? matchedVehicle.tripOdometer) || 0,
            fuelConsumption:
              Number(
                fleetVehicle.fuelConsumption ?? matchedVehicle.fuelConsumption
              ) || 0,
            ignition: fleetVehicle.ignition ?? matchedVehicle.ignition,
            statusCode:
              Number(fleetVehicle.statusCode ?? matchedVehicle.statusCode) || 0,
            coolantTemp: fleetVehicle.coolantTemp ?? matchedVehicle.coolantTemp,
            mapIntake: fleetVehicle.mapIntake ?? matchedVehicle.mapIntake,
            rpm: fleetVehicle.rpm ?? matchedVehicle.rpm,
            obdSpeed: fleetVehicle.obdSpeed ?? matchedVehicle.obdSpeed,
            intakeTemp: fleetVehicle.intakeTemp ?? matchedVehicle.intakeTemp,
            fuel: Number(fleetVehicle.fuel ?? matchedVehicle.fuel) || 0,
            distance: Number(fleetVehicle.distance ?? matchedVehicle.distance) || 0,
            totalDistance:
              Number(fleetVehicle.totalDistance ?? matchedVehicle.totalDistance) || 0,
            motion: fleetVehicle.motion ?? matchedVehicle.motion,
          }
        : createFallbackVehicle(fleetVehicle);
      const existingEntry = markers.current[markerId];

      if (!existingEntry) {
        const markerElement = document.createElement('div');
        markerElement.className = 'vehicle-marker';
        markerElement.style.width = '32px';
        markerElement.style.height = '32px';
        markerElement.style.cursor = 'pointer';

        const innerElement = document.createElement('div');
        innerElement.style.width = '100%';
        innerElement.style.height = '100%';
        innerElement.style.background = getStatusColor(fleetVehicle.status);
        innerElement.style.border = '3px solid white';
        innerElement.style.borderRadius = '50%';
        innerElement.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        innerElement.style.display = 'flex';
        innerElement.style.alignItems = 'center';
        innerElement.style.justifyContent = 'center';
        innerElement.style.fontWeight = 'bold';
        innerElement.style.color = 'white';
        innerElement.style.fontSize = '12px';
        innerElement.textContent = fleetVehicle.name?.charAt(0) || '?';
        markerElement.appendChild(innerElement);

        const popup = new mapboxgl.Popup({ offset: 25 }).setText(fleetVehicle.name);
        const marker = new mapboxgl.Marker(markerElement)
          .setLngLat([fleetVehicle.lng, fleetVehicle.lat])
          .setPopup(popup)
          .addTo(map.current!);

        markerElement.onclick = () => {
          onSelectVehicle(selectedVehicleData);
        };

        markers.current[markerId] = {
          marker,
          element: markerElement,
          innerElement,
          popup,
          lastLat: fleetVehicle.lat,
          lastLng: fleetVehicle.lng,
          lastStatus: fleetVehicle.status,
          lastName: fleetVehicle.name,
        };
        return;
      }

      if (
        existingEntry.lastLat !== fleetVehicle.lat ||
        existingEntry.lastLng !== fleetVehicle.lng
      ) {
        existingEntry.marker.setLngLat([fleetVehicle.lng, fleetVehicle.lat]);
        existingEntry.lastLat = fleetVehicle.lat;
        existingEntry.lastLng = fleetVehicle.lng;
      }

      if (existingEntry.lastStatus !== fleetVehicle.status) {
        existingEntry.innerElement.style.background = getStatusColor(fleetVehicle.status);
        existingEntry.lastStatus = fleetVehicle.status;
      }

      if (existingEntry.lastName !== fleetVehicle.name) {
        existingEntry.innerElement.textContent = fleetVehicle.name?.charAt(0) || '?';
        existingEntry.popup.setText(fleetVehicle.name);
        existingEntry.lastName = fleetVehicle.name;
      }

      existingEntry.element.style.cursor = 'pointer';
      existingEntry.element.onclick = () => {
        onSelectVehicle(selectedVehicleData);
      };
    });

    Object.entries(markers.current).forEach(([markerId, markerEntry]) => {
      if (!nextIds.has(markerId)) {
        markerEntry.marker.remove();
        delete markers.current[markerId];
      }
    });
  }, [fleetData, onSelectVehicle, vehiclesById]);

  useEffect(() => {
    if (!map.current || !selectedVehicle) return;

    map.current.flyTo({
      center: [selectedVehicle.location.lng, selectedVehicle.location.lat],
      zoom: 15,
      duration: 1500,
    });
  }, [selectedVehicle]);

  useEffect(() => {
    if (!map.current || hasAutoCentered.current || selectedVehicle) return;

    const validFleetCoords = (fleetData as FleetPoint[])
      .map((item) => ({
        lat: Number(item.lat),
        lng: Number(item.lng),
      }))
      .filter(
        ({ lat, lng }) =>
          Number.isFinite(lat) &&
          Number.isFinite(lng) &&
          Math.abs(lat) <= 90 &&
          Math.abs(lng) <= 180 &&
          !(lat === 0 && lng === 0)
      );

    if (validFleetCoords.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    validFleetCoords.forEach(({ lat, lng }) => bounds.extend([lng, lat]));

    map.current.fitBounds(bounds, {
      padding: 80,
      maxZoom: 14,
      duration: 1200,
    });
    hasAutoCentered.current = true;
  }, [fleetData, selectedVehicle]);

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
            onOpenAIChat={() => {
              setAiChatVehicle(selectedVehicle);
              setShowAIChat(true);
            }}
          />
        </div>
      )}

      {/* AI Chat Window */}
      {showAIChat && aiChatVehicle && (
        <div className="absolute z-20 top-4 right-4">
          <VehicleAIChat 
            vehicle={aiChatVehicle} 
            onClose={() => {
              setShowAIChat(false);
              setAiChatVehicle(null);
            }} 
          />
        </div>
      )}
    </div>
  );
};

export default FleetMap;
