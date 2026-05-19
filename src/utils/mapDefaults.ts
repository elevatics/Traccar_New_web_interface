/** Continental US center for Mapbox ([lng, lat]) */
export const US_MAP_CENTER: [number, number] = [-98.5795, 39.8283];

/** Default zoom when no fleet/geofence bounds are available */
export const US_MAP_ZOOM = 4;

export const US_MAP_VIEW = {
  center: US_MAP_CENTER,
  zoom: US_MAP_ZOOM,
} as const;
