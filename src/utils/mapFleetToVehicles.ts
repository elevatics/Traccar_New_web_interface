import { Vehicle, VehicleStatus } from '@/types/vehicle';

/**
 * Typed representation of a raw telemetry record returned by mapDeviceData
 * and surfaced through useFleetData(). All fields are already normalised
 * (fuel 0-100, speed in knots, odometer in metres).
 *
 * This type bridges the untyped JS hook and the typed Vehicle domain model.
 */
export interface FleetDataItem {
  id: string;
  deviceId: number;
  protocol: string;
  name: string;
  plateNumber: string;
  driver: string;
  status: string;
  lat: number;
  lng: number;
  address: string;
  speed: number;
  serverTime: string | null;
  deviceTime: string | null;
  fixTime: string | null;
  lastUpdate: string | null;
  fuelLevel: number;
  odometer: number;
  outdated: boolean;
  valid: boolean;
  altitude: number;
  course: number;
  accuracy: number;
  network?: string;
  geofenceIds?: string;
  tripOdometer: number;
  fuelConsumption: number;
  ignition: boolean;
  statusCode: number;
  coolantTemp?: number;
  mapIntake?: number;
  rpm?: number;
  obdSpeed?: number;
  intakeTemp?: number;
  fuel: number;
  distance: number;
  totalDistance: number;
  motion: boolean;
  imageUrl?: string;
}

function toVehicleStatus(raw: string): VehicleStatus {
  if (raw === 'online' || raw === 'idle' || raw === 'offline') return raw;
  return 'offline';
}

/**
 * Converts a single raw FleetDataItem (flat lat/lng from Traccar) into the
 * typed Vehicle shape (nested location object) used throughout the UI.
 */
export function mapFleetItemToVehicle(item: FleetDataItem): Vehicle {
  const nowIso = new Date().toISOString();
  return {
    id: item.id,
    deviceId: item.deviceId,
    protocol: item.protocol || 'traccar',
    name: item.name || `Device ${item.id}`,
    plateNumber: item.plateNumber || '-',
    driver: item.driver || '-',
    status: toVehicleStatus(item.status),
    location: {
      lat: item.lat,
      lng: item.lng,
      address: item.address || 'Live location unavailable',
    },
    speed: item.speed,
    serverTime: item.serverTime ?? nowIso,
    deviceTime: item.deviceTime ?? nowIso,
    fixTime: item.fixTime ?? nowIso,
    lastUpdate: item.lastUpdate ?? nowIso,
    fuelLevel: item.fuelLevel,
    odometer: item.odometer,
    outdated: item.outdated,
    valid: item.valid,
    altitude: item.altitude,
    course: item.course,
    accuracy: item.accuracy,
    network: item.network,
    geofenceIds: item.geofenceIds,
    tripOdometer: item.tripOdometer,
    fuelConsumption: item.fuelConsumption,
    ignition: item.ignition,
    statusCode: item.statusCode,
    coolantTemp: item.coolantTemp,
    mapIntake: item.mapIntake,
    rpm: item.rpm,
    obdSpeed: item.obdSpeed,
    intakeTemp: item.intakeTemp,
    fuel: item.fuel,
    distance: item.distance,
    totalDistance: item.totalDistance,
    motion: item.motion,
    imageUrl: item.imageUrl,
  };
}

/** Converts the full fleet data array to the typed Vehicle[] shape. */
export function mapFleetToVehicles(fleetData: FleetDataItem[]): Vehicle[] {
  return fleetData.map(mapFleetItemToVehicle);
}
