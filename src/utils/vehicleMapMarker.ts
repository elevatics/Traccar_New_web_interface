/**
 * Shared Google Maps–style top-down car markers.
 * Fleet maps use Mapbox symbol layers (zoom-stable).
 * Replay / one-off maps can still use HTML Marker helpers.
 */

import type { GeoJSONSource, Map as MapboxMap } from 'mapbox-gl';

export const VEHICLE_MARKER_STATUS_COLORS: Record<string, string> = {
  online: '#34a853',
  idle: '#f9ab00',
  offline: '#ea4335',
  unknown: '#5f6368',
};

export const VEHICLE_MARKER_BOX = 40;
export const VEHICLE_MARKER_CAR_WIDTH = 22;

export const FLEET_VEHICLES_SOURCE = 'fleet-vehicles-src';
export const FLEET_VEHICLES_LAYER = 'fleet-vehicles-cars';
export const FLEET_VEHICLES_PULSE_LAYER = 'fleet-vehicles-pulse';

export const FLEET_CAR_IMAGE_IDS: Record<string, string> = {
  online: 'fleet-car-online',
  idle: 'fleet-car-idle',
  offline: 'fleet-car-offline',
  unknown: 'fleet-car-unknown',
};

export function getVehicleMarkerColor(status?: string): string {
  return VEHICLE_MARKER_STATUS_COLORS[status || ''] || VEHICLE_MARKER_STATUS_COLORS.unknown;
}

export function fleetCarImageId(status?: string): string {
  const key = status && FLEET_CAR_IMAGE_IDS[status] ? status : 'unknown';
  return FLEET_CAR_IMAGE_IDS[key];
}

/**
 * Classic Google Maps–style car path (viewBox ≈ 0 0 24 47).
 * Nose points up.
 */
const GOOGLE_CAR_PATH =
  'M17.402,0 H5.643 C2.526,0 0,3.467 0,6.584 v34.804 c0,3.116 2.526,5.644 5.643,5.644 h11.759 c3.116,0 5.644,-2.527 5.644,-5.644 V6.584 C23.044,3.467 20.518,0 17.402,0 z' +
  'M22.057,14.188 v11.665 l-2.729,0.351 v-4.806 L22.057,14.188 z' +
  'M20.625,10.773 c-1.016,3.9 -2.219,8.51 -2.219,8.51 H4.638 l-2.222,-8.51 C2.417,10.773 11.3,7.755 20.625,10.773 z' +
  'M3.748,21.713 v4.492 l-2.73,-0.349 V14.502 L3.748,21.713 z' +
  'M1.018,37.938 V27.579 l2.73,0.343 v8.196 L1.018,37.938 z' +
  'M2.575,40.882 l2.218,-3.336 h13.771 l2.219,3.336 H2.575 z' +
  'M19.328,35.805 v-7.872 l2.729,-0.355 v10.048 L19.328,35.805 z';

let _markerIdSeq = 0;
function nextUid(): string {
  _markerIdSeq += 1;
  return `gcar${_markerIdSeq}`;
}

function shadeHex(hex: string, amount: number): string {
  const raw = hex.replace('#', '');
  if (raw.length !== 6) return hex;
  const n = (i: number) =>
    Math.max(0, Math.min(255, parseInt(raw.slice(i, i + 2), 16) + amount));
  const h = (v: number) => v.toString(16).padStart(2, '0');
  return `#${h(n(0))}${h(n(2))}${h(n(4))}`;
}

/** Car paths only (no filter) — used inside HTML markers and icon images. */
export function carMarkerSvgMarkup(color: string, uid = nextUid()): string {
  const dark = shadeHex(color, -18);
  const light = shadeHex(color, 14);

  return `
    <defs>
      <linearGradient id="${uid}-body" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${dark}"/>
        <stop offset="40%" stop-color="${light}"/>
        <stop offset="100%" stop-color="${dark}"/>
      </linearGradient>
    </defs>
    <path
      d="${GOOGLE_CAR_PATH}"
      fill="url(#${uid}-body)"
      stroke="#ffffff"
      stroke-width="1.35"
      stroke-linejoin="round"
      paint-order="stroke fill"
    />
    <path d="M4.2 11.2 L19.8 11.2 L18.2 18.8 L5.8 18.8 Z" fill="#e8f1ff" fill-opacity="0.55"/>
    <path d="M5.2 33.2 L18.8 33.2 L17.6 38.2 L6.4 38.2 Z" fill="#ffffff" fill-opacity="0.22"/>
  `.trim();
}

/** Square SVG data-URL with the car centered (for map.addImage). */
export function buildFleetCarIconDataUrl(color: string, pixelSize = 128): string {
  const uid = nextUid();
  // Path is ~23×47; center in a 48×48 viewBox with light padding.
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${pixelSize}" height="${pixelSize}" viewBox="0 0 48 48">
      <g transform="translate(12.5,0.5)">
        ${carMarkerSvgMarkup(color, uid)}
      </g>
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function loadHtmlImage(src: string, size: number): Promise<HTMLImageElement> {
  const img = new Image(size, size);
  img.decoding = 'async';
  img.src = src;
  if (typeof img.decode === 'function') {
    await img.decode();
  } else {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load car icon'));
    });
  }
  return img;
}

/** Register status-colored car icons on a Mapbox map (safe to call repeatedly). */
export async function ensureFleetCarImages(map: MapboxMap): Promise<void> {
  const size = 128;
  for (const [status, color] of Object.entries(VEHICLE_MARKER_STATUS_COLORS)) {
    const id = FLEET_CAR_IMAGE_IDS[status];
    if (!id || map.hasImage(id)) continue;
    const img = await loadHtmlImage(buildFleetCarIconDataUrl(color, size), size);
    map.addImage(id, img, { pixelRatio: 2 });
  }
}

export type FleetVehicleFeatureProps = {
  id: string;
  name: string;
  status: string;
  course: number;
  tracked: number;
  icon: string;
};

type VehiclesFC = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: FleetVehicleFeatureProps;
  }>;
};

export function buildFleetVehiclesGeoJSON(
  points: Array<{
    id: string | number;
    name?: string;
    status?: string;
    lat: number;
    lng: number;
    course?: number;
  }>,
  trackedVehicleId?: string | null,
): VehiclesFC {
  const features: VehiclesFC['features'] = [];
  for (const p of points) {
    const lat = Number(p.lat);
    const lng = Number(p.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) continue;
    const id = String(p.id);
    const status = p.status && VEHICLE_MARKER_STATUS_COLORS[p.status] ? p.status : 'unknown';
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        id,
        name: p.name || id,
        status,
        course: Number(p.course) || 0,
        tracked: trackedVehicleId && id === trackedVehicleId ? 1 : 0,
        icon: fleetCarImageId(status),
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

/** Ensure GeoJSON source + symbol/pulse layers exist (re-run after setStyle). */
export async function ensureFleetVehicleLayers(map: MapboxMap): Promise<void> {
  await ensureFleetCarImages(map);

  if (!map.getSource(FLEET_VEHICLES_SOURCE)) {
    map.addSource(FLEET_VEHICLES_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }

  if (!map.getLayer(FLEET_VEHICLES_PULSE_LAYER)) {
    map.addLayer({
      id: FLEET_VEHICLES_PULSE_LAYER,
      type: 'circle',
      source: FLEET_VEHICLES_SOURCE,
      filter: ['==', ['get', 'tracked'], 1],
      paint: {
        'circle-radius': 22,
        'circle-color': [
          'match',
          ['get', 'status'],
          'online', VEHICLE_MARKER_STATUS_COLORS.online,
          'idle', VEHICLE_MARKER_STATUS_COLORS.idle,
          'offline', VEHICLE_MARKER_STATUS_COLORS.offline,
          VEHICLE_MARKER_STATUS_COLORS.unknown,
        ],
        'circle-opacity': 0.22,
        'circle-stroke-width': 2,
        'circle-stroke-color': [
          'match',
          ['get', 'status'],
          'online', VEHICLE_MARKER_STATUS_COLORS.online,
          'idle', VEHICLE_MARKER_STATUS_COLORS.idle,
          'offline', VEHICLE_MARKER_STATUS_COLORS.offline,
          VEHICLE_MARKER_STATUS_COLORS.unknown,
        ],
        'circle-stroke-opacity': 0.55,
      },
    });
  }

  if (!map.getLayer(FLEET_VEHICLES_LAYER)) {
    map.addLayer({
      id: FLEET_VEHICLES_LAYER,
      type: 'symbol',
      source: FLEET_VEHICLES_SOURCE,
      layout: {
        'icon-image': ['get', 'icon'],
        'icon-size': 0.55,
        'icon-rotate': ['get', 'course'],
        'icon-rotation-alignment': 'map',
        'icon-pitch-alignment': 'viewport',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-anchor': 'center',
      },
    });
  }
}

export function setFleetVehiclesData(map: MapboxMap, data: VehiclesFC): void {
  const src = map.getSource(FLEET_VEHICLES_SOURCE) as GeoJSONSource | undefined;
  if (src) src.setData(data);
}

// ── HTML Marker helpers (Replay / AI chat — single markers) ─────────────────

export type ApplyCarMarkerOptions = {
  color: string;
  course?: number;
  size?: number;
};

export function applyCarMarkerInner(
  innerEl: HTMLDivElement,
  { color, size = VEHICLE_MARKER_CAR_WIDTH }: ApplyCarMarkerOptions,
): void {
  const height = Math.round(size * (47 / 23));
  const box = Math.max(size, height);

  innerEl.innerHTML = '';
  innerEl.style.cssText = `
    width:${box}px;height:${box}px;
    display:flex;align-items:center;justify-content:center;
    background:transparent;border:none;box-shadow:none;
    line-height:0;pointer-events:none;
    flex-shrink:0;
  `;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(height));
  svg.setAttribute('viewBox', '-1 -1 25.5 49');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.style.cssText = 'display:block;overflow:visible;';
  svg.innerHTML = carMarkerSvgMarkup(color);
  innerEl.appendChild(svg);
}

export const VEHICLE_MARKER_MAPBOX_OPTIONS = {
  anchor: 'center' as const,
  rotationAlignment: 'map' as const,
  pitchAlignment: 'viewport' as const,
};

export type CreateCarMarkerElementOptions = {
  color?: string;
  course?: number;
  size?: number;
  box?: number;
  pulse?: boolean;
  pulseColor?: string;
};

export function createCarMarkerElement({
  color = VEHICLE_MARKER_STATUS_COLORS.online,
  size = VEHICLE_MARKER_CAR_WIDTH,
  box = VEHICLE_MARKER_BOX,
  pulse = false,
  pulseColor,
}: CreateCarMarkerElementOptions = {}): HTMLDivElement {
  const height = Math.round(size * (47 / 23));
  const side = Math.max(box, height + 4);
  const wrap = document.createElement('div');
  wrap.className = 'vehicle-car-marker';
  wrap.style.cssText = `
    width:${side}px;height:${side}px;
    display:flex;align-items:center;justify-content:center;
    position:relative;overflow:visible;pointer-events:none;
    box-sizing:border-box;
  `;

  if (pulse) {
    const ring = document.createElement('div');
    ring.dataset.role = 'pulse-ring';
    const pc = pulseColor || color;
    ring.style.cssText = `
      position:absolute;left:50%;top:50%;
      width:${side + 12}px;height:${side + 12}px;
      margin-left:-${(side + 12) / 2}px;margin-top:-${(side + 12) / 2}px;
      border-radius:50%;
      background:radial-gradient(circle,${pc}38 0%,transparent 68%);
      animation:rp-pulse 2s ease-in-out infinite;
      pointer-events:none;
    `;
    wrap.appendChild(ring);
  }

  const inner = document.createElement('div');
  applyCarMarkerInner(inner, { color, size });
  wrap.appendChild(inner);
  return wrap;
}

export function setCarMarkerCourse(_root: HTMLElement, _course: number): void {
  // no-op — use Marker.setRotation
}
