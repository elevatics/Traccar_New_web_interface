/**
 * Shared Google Maps–style top-down car markers for Mapbox maps.
 * Uses the classic Maps car silhouette (body + mirrors + window cutouts).
 * Online → green, idle → amber, offline → red.
 */

export const VEHICLE_MARKER_STATUS_COLORS: Record<string, string> = {
  online: '#34a853',
  idle: '#f9ab00',
  offline: '#ea4335',
  unknown: '#5f6368',
};

export function getVehicleMarkerColor(status?: string): string {
  return VEHICLE_MARKER_STATUS_COLORS[status || ''] || VEHICLE_MARKER_STATUS_COLORS.unknown;
}

/**
 * Classic Google Maps–style car path (viewBox ≈ 0 0 24 47).
 * Nose points up. Window / wheel arches are cutouts (evenodd).
 * Widely used as the Maps navigation vehicle silhouette.
 */
const GOOGLE_CAR_PATH =
  'M17.402,0 H5.643 C2.526,0 0,3.467 0,6.584 v34.804 c0,3.116 2.526,5.644 5.643,5.644 h11.759 c3.116,0 5.644,-2.527 5.644,-5.644 V6.584 C23.044,3.467 20.518,0 17.402,0 z' +
  'M22.057,14.188 v11.665 l-2.729,0.351 v-4.806 L22.057,14.188 z' +
  'M20.625,10.773 c-1.016,3.9 -2.219,8.51 -2.219,8.51 H4.638 l-2.222,-8.51 C2.417,10.773 11.3,7.755 20.625,10.773 z' +
  'M3.748,21.713 v4.492 l-2.73,-0.349 V14.502 L3.748,21.713 z' +
  'M1.018,37.938 V27.579 l2.73,0.343 v8.196 L1.018,37.938 z' +
  'M2.575,40.882 l2.218,-3.336 h13.771 l2.219,3.336 H2.575 z' +
  'M19.328,35.805 v-7.872 l2.729,-0.355 v10.048 L19.328,35.805 z';

/** Unique ids so multiple markers do not clash on gradient/filter refs. */
let _markerIdSeq = 0;
function nextUid(): string {
  _markerIdSeq += 1;
  return `gcar${_markerIdSeq}`;
}

export function carMarkerSvgMarkup(color: string, uid = nextUid()): string {
  // Slightly darker shade for depth on the body gradient
  const dark = shadeHex(color, -18);
  const light = shadeHex(color, 14);

  return `
    <defs>
      <linearGradient id="${uid}-body" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${dark}"/>
        <stop offset="40%" stop-color="${light}"/>
        <stop offset="100%" stop-color="${dark}"/>
      </linearGradient>
      <radialGradient id="${uid}-shadow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#000" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <!-- soft ground shadow (Google Maps style) -->
    <ellipse cx="11.52" cy="44.5" rx="9.5" ry="2.8" fill="url(#${uid}-shadow)"/>
    <!-- car body -->
    <path
      d="${GOOGLE_CAR_PATH}"
      fill="url(#${uid}-body)"
      stroke="#ffffff"
      stroke-width="1.35"
      stroke-linejoin="round"
      paint-order="stroke fill"
    />
    <!-- glass tint over windshield cutout area (reads clearer on busy maps) -->
    <path
      d="M4.2 11.2 L19.8 11.2 L18.2 18.8 L5.8 18.8 Z"
      fill="#e8f1ff"
      fill-opacity="0.55"
      stroke="none"
    />
    <!-- rear glass hint -->
    <path
      d="M5.2 33.2 L18.8 33.2 L17.6 38.2 L6.4 38.2 Z"
      fill="#ffffff"
      fill-opacity="0.22"
      stroke="none"
    />
  `.trim();
}

/** Lighten/darken a #rrggbb color by `amount` (-255..255). */
function shadeHex(hex: string, amount: number): string {
  const raw = hex.replace('#', '');
  if (raw.length !== 6) return hex;
  const n = (i: number) =>
    Math.max(0, Math.min(255, parseInt(raw.slice(i, i + 2), 16) + amount));
  const h = (v: number) => v.toString(16).padStart(2, '0');
  return `#${h(n(0))}${h(n(2))}${h(n(4))}`;
}

export type ApplyCarMarkerOptions = {
  color: string;
  course?: number;
  /** Marker width in px (height follows car aspect ~2:1). */
  size?: number;
};

/** Paint a Google Maps–style car into an existing marker inner element. */
export function applyCarMarkerInner(
  innerEl: HTMLDivElement,
  { color, course = 0, size = 26 }: ApplyCarMarkerOptions,
): void {
  // Path aspect ≈ 23 × 47
  const height = Math.round(size * (47 / 23));

  innerEl.innerHTML = '';
  innerEl.style.cssText = `
    width:${size}px;height:${height}px;
    background:transparent;border:none;border-radius:0;box-shadow:none;
    display:block;overflow:visible;line-height:0;
  `;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(height));
  svg.setAttribute('viewBox', '-1 -1 25.5 49');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.style.cssText = `
    display:block;
    overflow:visible;
    transform:rotate(${course}deg);
    transition:transform 0.15s linear;
    filter:drop-shadow(0 1px 1.5px rgba(0,0,0,0.4));
  `;
  svg.innerHTML = carMarkerSvgMarkup(color);
  innerEl.appendChild(svg);
}

export type CreateCarMarkerElementOptions = {
  color?: string;
  course?: number;
  size?: number;
  pulse?: boolean;
  pulseColor?: string;
};

/** Standalone marker root for Mapbox `new Marker({ element })`. */
export function createCarMarkerElement({
  color = VEHICLE_MARKER_STATUS_COLORS.online,
  course = 0,
  size = 28,
  pulse = false,
  pulseColor,
}: CreateCarMarkerElementOptions = {}): HTMLDivElement {
  const height = Math.round(size * (47 / 23));
  const wrap = document.createElement('div');
  wrap.className = 'vehicle-car-marker';
  wrap.style.cssText = `
    width:${size}px;height:${height}px;
    position:relative;pointer-events:none;overflow:visible;
  `;

  if (pulse) {
    const ring = document.createElement('div');
    ring.dataset.role = 'pulse-ring';
    const pc = pulseColor || color;
    const dim = Math.max(size, height) + 14;
    ring.style.cssText = `
      position:absolute;left:50%;top:50%;
      width:${dim}px;height:${dim}px;
      margin-left:-${dim / 2}px;margin-top:-${dim / 2}px;
      border-radius:50%;
      background:radial-gradient(circle,${pc}38 0%,transparent 68%);
      animation:rp-pulse 2s ease-in-out infinite;
      pointer-events:none;
    `;
    wrap.appendChild(ring);
  }

  const inner = document.createElement('div');
  applyCarMarkerInner(inner, { color, course, size });
  wrap.appendChild(inner);
  return wrap;
}

/** Rotate the car SVG to match heading (degrees, 0 = north). */
export function setCarMarkerCourse(root: HTMLElement, course: number): void {
  const svg = root.querySelector('svg') as SVGElement | null;
  if (svg) svg.style.transform = `rotate(${course}deg)`;
}
