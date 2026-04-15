import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  MapPin,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Crosshair,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createGeofence, deleteGeofence, getGeofences, updateGeofence } from '@/services/geofenceService';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? '';

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

interface Geofence {
  id: string;
  rawId?: number | string;
  name: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  color: string;
  is_active: boolean;
  created_at: string;
  geometryType?: 'circle' | 'polygon' | 'unknown';
  polygon_coordinates?: number[][];
}
type CreateShape = 'circle' | 'triangle' | 'square' | 'rectangle' | 'polygon';

const hasValidCoordinates = (lng: number, lat: number) =>
  Number.isFinite(lng) &&
  Number.isFinite(lat) &&
  lat >= -90 &&
  lat <= 90 &&
  lng >= -180 &&
  lng <= 180;

const getPolygonBounds = (coordinates: number[][]) => {
  const valid = coordinates.filter(
    (pair) =>
      Array.isArray(pair) &&
      pair.length >= 2 &&
      hasValidCoordinates(Number(pair[0]), Number(pair[1]))
  );
  if (valid.length < 3) return null;

  let minLng = valid[0][0];
  let minLat = valid[0][1];
  let maxLng = valid[0][0];
  let maxLat = valid[0][1];

  valid.forEach(([lng, lat]) => {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  });

  return new mapboxgl.LngLatBounds([minLng, minLat], [maxLng, maxLat]);
};

const createRegularPolygonCoordinates = (
  center: [number, number],
  radiusMeters: number,
  sides: number
) => {
  const [lng, lat] = center;
  const km = radiusMeters / 1000;
  const distanceX = km / (111.32 * Math.cos((lat * Math.PI) / 180));
  const distanceY = km / 110.574;
  const points: [number, number][] = [];
  for (let i = 0; i < sides; i++) {
    const theta = (i / sides) * (2 * Math.PI) - Math.PI / 2;
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    points.push([lng + x, lat + y]);
  }
  points.push(points[0]);
  return points;
};

const createRectangleCoordinates = (
  start: [number, number],
  end: [number, number],
  square: boolean
) => {
  let [lng1, lat1] = start;
  let [lng2, lat2] = end;
  if (square) {
    const dx = lng2 - lng1;
    const dy = lat2 - lat1;
    const side = Math.max(Math.abs(dx), Math.abs(dy));
    lng2 = lng1 + Math.sign(dx || 1) * side;
    lat2 = lat1 + Math.sign(dy || 1) * side;
  }
  return [
    [lng1, lat1],
    [lng2, lat1],
    [lng2, lat2],
    [lng1, lat2],
    [lng1, lat1],
  ] as [number, number][];
};

function createGeoJSONCircle(center: [number, number], radiusMeters: number, points = 64) {
  const coords = [];
  const km = radiusMeters / 1000;
  const distanceX = km / (111.32 * Math.cos((center[1] * Math.PI) / 180));
  const distanceY = km / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([center[0] + x, center[1] + y]);
  }
  coords.push(coords[0]);

  return {
    type: 'Feature' as const,
    geometry: { type: 'Polygon' as const, coordinates: [coords] },
    properties: {},
  };
}

export default function GeofenceManager() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});
  const vertexMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const queryClient = useQueryClient();

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [createShape, setCreateShape] = useState<CreateShape>('circle');
  const [newRadius, setNewRadius] = useState(500);
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [clickedPoint, setClickedPoint] = useState<[number, number] | null>(null);
  const [newPolygonPoints, setNewPolygonPoints] = useState<[number, number][]>([]);
  const [rectangleStartPoint, setRectangleStartPoint] = useState<[number, number] | null>(null);
  const [editingGeofenceId, setEditingGeofenceId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRadius, setEditRadius] = useState(500);
  const [editColor, setEditColor] = useState(COLORS[0]);
  const [editPoint, setEditPoint] = useState<[number, number] | null>(null);
  const [editPolygonPoints, setEditPolygonPoints] = useState<[number, number][]>([]);
  const [editingGeometryEnabled, setEditingGeometryEnabled] = useState(false);
  const [focusedGeofenceId, setFocusedGeofenceId] = useState<string | null>(null);

  const isPolygonClosed = (points: [number, number][]) => {
    if (points.length < 4) return false;
    const [fLng, fLat] = points[0];
    const [lLng, lLat] = points[points.length - 1];
    return fLng === lLng && fLat === lLat;
  };

  // Fetch geofences
  const { data: geofences = [], isLoading } = useQuery({
    queryKey: ['geofences'],
    queryFn: async () => getGeofences() as Promise<Geofence[]>,
  });

  // Create geofence
  const createMutation = useMutation({
    mutationFn: async (geofence: {
      name: string;
      center_lat: number;
      center_lng: number;
      radius_meters: number;
      color: string;
      polygon_coordinates?: number[][];
    }) => {
      return createGeofence(geofence);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      toast.success('Geofence created');
      resetCreation();
    },
    onError: () => toast.error('Failed to create geofence'),
  });

  // Update geofence
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      name?: string;
      is_active?: boolean;
      color?: string;
      center_lat?: number;
      center_lng?: number;
      radius_meters?: number;
      polygon_coordinates?: number[][];
    }) => {
      return updateGeofence(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      toast.success('Geofence updated');
      setEditingGeofenceId(null);
      setEditingGeometryEnabled(false);
      setEditPoint(null);
      setEditPolygonPoints([]);
    },
    onError: () => toast.error('Failed to update geofence'),
  });

  // Delete geofence
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteGeofence(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      toast.success('Geofence deleted');
    },
    onError: () => toast.error('Failed to delete geofence'),
  });

  const resetCreation = () => {
    setIsCreating(false);
    setClickedPoint(null);
    setNewName('');
    setCreateShape('circle');
    setNewRadius(500);
    setNewColor(COLORS[0]);
    setNewPolygonPoints([]);
    setRectangleStartPoint(null);
    if (map.current) {
      map.current.getCanvas().style.cursor = '';
    }
  };

  const currentEditingGeofence =
    editingGeofenceId != null ? geofences.find((g) => g.id === editingGeofenceId) || null : null;

  const startEditingGeofence = (gf: Geofence) => {
    setEditingGeofenceId(gf.id);
    setEditName(gf.name);
    setEditRadius(Math.max(100, Number(gf.radius_meters) || 500));
    setEditColor(gf.color || COLORS[0]);
    setEditPoint(hasValidCoordinates(gf.center_lng, gf.center_lat) ? [gf.center_lng, gf.center_lat] : null);
    const polygonPoints =
      gf.geometryType === 'polygon' && Array.isArray(gf.polygon_coordinates)
        ? gf.polygon_coordinates
            .slice(0, -1)
            .filter((pair) => pair.length >= 2 && hasValidCoordinates(Number(pair[0]), Number(pair[1])))
            .map((pair) => [Number(pair[0]), Number(pair[1])] as [number, number])
        : [];
    setEditPolygonPoints(polygonPoints);
    setEditingGeometryEnabled(true);
  };

  const cancelEditingGeofence = () => {
    setEditingGeofenceId(null);
    setEditName('');
    setEditRadius(500);
    setEditColor(COLORS[0]);
    setEditPoint(null);
    setEditPolygonPoints([]);
    setEditingGeometryEnabled(false);
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-73.9776, 40.758],
      zoom: 12,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => { map.current?.remove(); };
  }, []);

  // Handle map clicks for creation
  useEffect(() => {
    if (!map.current) return;

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      if (isCreating) {
        const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        if (createShape === 'polygon') {
          setNewPolygonPoints((prev) => {
            const working = isPolygonClosed(prev) ? prev.slice(0, -1) : prev.slice();
            return [...working, point];
          });
        } else if (createShape === 'rectangle' || createShape === 'square') {
          if (!rectangleStartPoint) {
            setRectangleStartPoint(point);
            setClickedPoint(point);
          } else {
            setClickedPoint(point);
          }
        } else {
          setClickedPoint(point);
        }
        return;
      }
      if (editingGeofenceId && editingGeometryEnabled) {
        if (currentEditingGeofence?.geometryType === 'polygon') {
          setEditPolygonPoints((prev) => [...prev, [e.lngLat.lng, e.lngLat.lat]]);
        } else {
          setEditPoint([e.lngLat.lng, e.lngLat.lat]);
        }
      }
    };

    map.current.on('click', handleClick);

    if (isCreating || (editingGeofenceId && editingGeometryEnabled)) {
      map.current.getCanvas().style.cursor = 'crosshair';
    } else {
      map.current.getCanvas().style.cursor = '';
    }

    return () => { map.current?.off('click', handleClick); };
  }, [
    isCreating,
    editingGeofenceId,
    editingGeometryEnabled,
    currentEditingGeofence,
    createShape,
    rectangleStartPoint,
  ]);

  // Draw geofences on map
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    const m = map.current;

    // Clean up existing layers/sources
    geofences.forEach((_, i) => {
      const fillId = `geofence-fill-${i}`;
      const lineId = `geofence-line-${i}`;
      const srcId = `geofence-src-${i}`;
      if (m.getLayer(fillId)) m.removeLayer(fillId);
      if (m.getLayer(lineId)) m.removeLayer(lineId);
      if (m.getSource(srcId)) m.removeSource(srcId);
    });

    // Also clean any leftover indices
    for (let i = 0; i < 100; i++) {
      const fillId = `geofence-fill-${i}`;
      const lineId = `geofence-line-${i}`;
      const srcId = `geofence-src-${i}`;
      if (m.getLayer(fillId)) m.removeLayer(fillId);
      if (m.getLayer(lineId)) m.removeLayer(lineId);
      if (m.getSource(srcId)) m.removeSource(srcId);
    }

    // Clean preview
    if (m.getLayer('preview-fill')) m.removeLayer('preview-fill');
    if (m.getLayer('preview-line')) m.removeLayer('preview-line');
    if (m.getSource('preview-src')) m.removeSource('preview-src');
    if (m.getLayer('edit-preview-fill')) m.removeLayer('edit-preview-fill');
    if (m.getLayer('edit-preview-line')) m.removeLayer('edit-preview-line');
    if (m.getSource('edit-preview-src')) m.removeSource('edit-preview-src');

    // Remove existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};
    vertexMarkersRef.current.forEach((marker) => marker.remove());
    vertexMarkersRef.current = [];

    // Draw existing geofences. Always render the focused geofence so it can be viewed
    // on click even if it is currently inactive.
    geofences.forEach((gf, i) => {
      const shouldRender = gf.is_active || focusedGeofenceId === gf.id;
      if (!shouldRender) return;
      if (!hasValidCoordinates(gf.center_lng, gf.center_lat)) return;

      const isPolygon = gf.geometryType === 'polygon' && Array.isArray(gf.polygon_coordinates) && gf.polygon_coordinates.length >= 3;
      const geometry = isPolygon
        ? {
            type: 'Feature' as const,
            geometry: {
              type: 'Polygon' as const,
              coordinates: [gf.polygon_coordinates as number[][]],
            },
            properties: {},
          }
        : createGeoJSONCircle([gf.center_lng, gf.center_lat], gf.radius_meters);
      const srcId = `geofence-src-${i}`;

      m.addSource(srcId, { type: 'geojson', data: geometry as any });

      m.addLayer({
        id: `geofence-fill-${i}`,
        type: 'fill',
        source: srcId,
        paint: { 'fill-color': gf.color, 'fill-opacity': 0.15 },
      });

      m.addLayer({
        id: `geofence-line-${i}`,
        type: 'line',
        source: srcId,
        paint: { 'line-color': gf.color, 'line-width': 2, 'line-dasharray': [2, 2] },
      });

      // Center marker with label
      const el = document.createElement('div');
      el.className = 'flex flex-col items-center';
      el.innerHTML = `
        <div style="background:${gf.color};color:white;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.3);">
          ${gf.name}
        </div>
        <div style="width:8px;height:8px;background:${gf.color};border:2px solid white;border-radius:50%;margin-top:2px;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>
      `;

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([gf.center_lng, gf.center_lat])
        .addTo(m);

      markersRef.current[gf.id] = marker;
    });

    // Draw preview for create flow
    let creationPreview: any = null;
    if (isCreating) {
      if (createShape === 'polygon' && newPolygonPoints.length >= 3) {
        const [firstLng, firstLat] = newPolygonPoints[0];
        creationPreview = {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[...newPolygonPoints, [firstLng, firstLat]]],
          },
          properties: {},
        };
      } else if (
        (createShape === 'rectangle' || createShape === 'square') &&
        rectangleStartPoint &&
        clickedPoint
      ) {
        const rectangle = createRectangleCoordinates(
          rectangleStartPoint,
          clickedPoint,
          createShape === 'square'
        );
        creationPreview = {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [rectangle] },
          properties: {},
        };
      } else if (createShape === 'triangle' && clickedPoint) {
        const triangle = createRegularPolygonCoordinates(clickedPoint, newRadius, 3);
        creationPreview = {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [triangle] },
          properties: {},
        };
      } else if (createShape === 'circle' && clickedPoint) {
        creationPreview = createGeoJSONCircle(clickedPoint, newRadius);
      }
    }
    if (creationPreview) {
      m.addSource('preview-src', { type: 'geojson', data: creationPreview as any });
      m.addLayer({
        id: 'preview-fill',
        type: 'fill',
        source: 'preview-src',
        paint: { 'fill-color': newColor, 'fill-opacity': 0.25 },
      });
      m.addLayer({
        id: 'preview-line',
        type: 'line',
        source: 'preview-src',
        paint: { 'line-color': newColor, 'line-width': 2.5 },
      });
    }
    if (
      editPoint &&
      editingGeofenceId &&
      editingGeometryEnabled &&
      currentEditingGeofence?.geometryType !== 'polygon'
    ) {
      const editPreview = createGeoJSONCircle(editPoint, editRadius);
      m.addSource('edit-preview-src', { type: 'geojson', data: editPreview as any });
      m.addLayer({
        id: 'edit-preview-fill',
        type: 'fill',
        source: 'edit-preview-src',
        paint: { 'fill-color': editColor, 'fill-opacity': 0.25 },
      });
      m.addLayer({
        id: 'edit-preview-line',
        type: 'line',
        source: 'edit-preview-src',
        paint: { 'line-color': editColor, 'line-width': 2.5 },
      });
    }
    if (
      editingGeofenceId &&
      currentEditingGeofence?.geometryType === 'polygon' &&
      editPolygonPoints.length >= 3
    ) {
      const [firstLng, firstLat] = editPolygonPoints[0];
      const closedPolygon = [...editPolygonPoints, [firstLng, firstLat]];
      const polygonPreview = {
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [closedPolygon],
        },
        properties: {},
      };
      m.addSource('edit-preview-src', { type: 'geojson', data: polygonPreview as any });
      m.addLayer({
        id: 'edit-preview-fill',
        type: 'fill',
        source: 'edit-preview-src',
        paint: { 'fill-color': editColor, 'fill-opacity': 0.25 },
      });
      m.addLayer({
        id: 'edit-preview-line',
        type: 'line',
        source: 'edit-preview-src',
        paint: { 'line-color': editColor, 'line-width': 2.5 },
      });
    }

    // Vertex drag handles for polygon create/edit
    const showCreatePolygonHandles = isCreating && createShape === 'polygon' && newPolygonPoints.length > 0;
    const showEditPolygonHandles =
      editingGeofenceId &&
      currentEditingGeofence?.geometryType === 'polygon' &&
      editPolygonPoints.length > 0;
    if (showCreatePolygonHandles || showEditPolygonHandles) {
      const sourcePoints = (showEditPolygonHandles ? editPolygonPoints : newPolygonPoints).slice();
      const effectivePoints =
        sourcePoints.length > 1 && isPolygonClosed(sourcePoints)
          ? sourcePoints.slice(0, -1)
          : sourcePoints;

      effectivePoints.forEach((point, index) => {
        const el = document.createElement('div');
        el.style.width = '12px';
        el.style.height = '12px';
        el.style.borderRadius = '50%';
        el.style.background = '#ffffff';
        el.style.border = `2px solid ${showEditPolygonHandles ? editColor : newColor}`;
        el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.35)';
        el.style.cursor = 'grab';

        const marker = new mapboxgl.Marker({
          element: el,
          draggable: true,
        })
          .setLngLat(point)
          .addTo(m);

        marker.on('dragend', () => {
          const lngLat = marker.getLngLat();
          const nextPoint: [number, number] = [lngLat.lng, lngLat.lat];

          if (showEditPolygonHandles) {
            setEditPolygonPoints((prev) => {
              const base = isPolygonClosed(prev) ? prev.slice(0, -1) : prev.slice();
              if (index >= base.length) return prev;
              base[index] = nextPoint;
              return base;
            });
          } else {
            setNewPolygonPoints((prev) => {
              const base = isPolygonClosed(prev) ? prev.slice(0, -1) : prev.slice();
              if (index >= base.length) return prev;
              base[index] = nextPoint;
              return base;
            });
          }
        });

        vertexMarkersRef.current.push(marker);
      });
    }
  }, [
    geofences,
    isCreating,
    createShape,
    newPolygonPoints,
    rectangleStartPoint,
    clickedPoint,
    newRadius,
    newColor,
    focusedGeofenceId,
    editingGeofenceId,
    editPoint,
    editPolygonPoints,
    editRadius,
    editColor,
    editingGeometryEnabled,
    currentEditingGeofence,
    editName,
  ]);

  const handleSave = () => {
    if (!newName.trim()) {
      toast.error('Please enter a name');
      return;
    }
    if (createShape === 'polygon') {
      if (newPolygonPoints.length < 4 || !isPolygonClosed(newPolygonPoints)) {
        toast.error('Polygon must be closed with at least 3 vertices');
        return;
      }
      createMutation.mutate({
        name: newName.trim(),
        center_lat: 0,
        center_lng: 0,
        radius_meters: 0,
        color: newColor,
        polygon_coordinates: newPolygonPoints,
      });
      return;
    }

    if ((createShape === 'rectangle' || createShape === 'square') && rectangleStartPoint && clickedPoint) {
      const rectangle = createRectangleCoordinates(
        rectangleStartPoint,
        clickedPoint,
        createShape === 'square'
      );
      createMutation.mutate({
        name: newName.trim(),
        center_lat: 0,
        center_lng: 0,
        radius_meters: 0,
        color: newColor,
        polygon_coordinates: rectangle,
      });
      return;
    }

    if (createShape === 'triangle' && clickedPoint) {
      const triangle = createRegularPolygonCoordinates(clickedPoint, newRadius, 3);
      createMutation.mutate({
        name: newName.trim(),
        center_lat: 0,
        center_lng: 0,
        radius_meters: 0,
        color: newColor,
        polygon_coordinates: triangle,
      });
      return;
    }

    if (!clickedPoint) {
      toast.error('Please click on the map to set geofence position');
      return;
    }

    createMutation.mutate({
      name: newName.trim(),
      center_lat: clickedPoint[1],
      center_lng: clickedPoint[0],
      radius_meters: newRadius,
      color: newColor,
    });
  };

  const handleSaveEdit = () => {
    if (!editingGeofenceId || !editName.trim()) {
      toast.error('Please provide a geofence name');
      return;
    }
    const payload: {
      id: string;
      name: string;
      color: string;
      center_lat?: number;
      center_lng?: number;
      radius_meters?: number;
      polygon_coordinates?: number[][];
    } = {
      id: editingGeofenceId,
      name: editName.trim(),
      color: editColor,
    };

    if (editingGeometryEnabled) {
      if (currentEditingGeofence?.geometryType === 'polygon') {
        if (editPolygonPoints.length < 3) {
          toast.error('Polygon needs at least 3 points');
          return;
        }
        payload.polygon_coordinates = editPolygonPoints;
      } else {
        if (!editPoint) {
          toast.error('Click on the map to set geofence center');
          return;
        }
        payload.center_lng = editPoint[0];
        payload.center_lat = editPoint[1];
        payload.radius_meters = editRadius;
      }
    }
    updateMutation.mutate(payload);
  };

  const focusGeofence = (geofence: Geofence) => {
    setFocusedGeofenceId(geofence.id);
    if (!map.current) return;
    const polygonBounds =
      geofence.geometryType === 'polygon' && Array.isArray(geofence.polygon_coordinates)
        ? getPolygonBounds(geofence.polygon_coordinates)
        : null;

    if (polygonBounds) {
      map.current.fitBounds(polygonBounds, {
        padding: 60,
        duration: 1200,
        maxZoom: 16,
      });
      return;
    }

    if (!hasValidCoordinates(geofence.center_lng, geofence.center_lat)) {
      toast.error('This geofence has invalid coordinates');
      return;
    }

    // For larger circles, pick zoom based on radius so the full fence is visible.
    const radius = Number(geofence.radius_meters) || 0;
    const zoom =
      radius > 10000 ? 10 :
      radius > 5000 ? 11 :
      radius > 2000 ? 12 :
      radius > 1000 ? 13 :
      14;

    map.current.flyTo({
      center: [geofence.center_lng, geofence.center_lat],
      zoom,
      duration: 1200,
    });
  };

  return (
    <div className="flex gap-4 h-[600px]">
      {/* Map */}
      <div className="flex-1 rounded-lg overflow-hidden border border-border relative">
        <div ref={mapContainer} className="w-full h-full" />

        {isCreating && !clickedPoint && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-card border border-border rounded-lg px-4 py-2 shadow-lg flex items-center gap-2">
            <Crosshair className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm font-medium text-foreground">Click on the map to place geofence center</span>
          </div>
        )}
      </div>

      {/* Sidebar panel */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
        {/* Create button / form */}
        {!isCreating && !editingGeofenceId ? (
          <Button onClick={() => setIsCreating(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Create New Geofence
          </Button>
        ) : isCreating ? (
          <Card className="p-4 space-y-3 border-primary">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-foreground">New Geofence</h4>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={resetCreation}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input
                placeholder="e.g. Warehouse Zone"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Shape</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['circle', 'triangle', 'square', 'rectangle', 'polygon'] as CreateShape[]).map((shape) => (
                  <Button
                    key={shape}
                    type="button"
                    variant={createShape === shape ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs capitalize"
                    onClick={() => {
                      setCreateShape(shape);
                      setClickedPoint(null);
                      setNewPolygonPoints([]);
                      setRectangleStartPoint(null);
                    }}
                  >
                    {shape}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Radius: {newRadius >= 1000 ? `${(newRadius / 1000).toFixed(1)} km` : `${newRadius} m`}</Label>
              <Slider
                value={[newRadius]}
                onValueChange={([v]) => setNewRadius(v)}
                min={100}
                max={10000}
                step={100}
                disabled={createShape === 'polygon' || createShape === 'rectangle' || createShape === 'square'}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Color</Label>
              <div className="flex gap-1.5 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className={cn(
                      'w-6 h-6 rounded-full border-2 transition-transform cursor-pointer',
                      newColor === c ? 'border-foreground scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => setNewColor(c)}
                  />
                ))}
              </div>
            </div>

            {createShape === 'polygon' && (
              <>
                <p className="text-xs text-muted-foreground">
                  Click on map to add polygon points, then close the polygon.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      setNewPolygonPoints((prev) => {
                        if (prev.length < 3 || isPolygonClosed(prev)) return prev;
                        return [...prev, prev[0]];
                      })
                    }
                    disabled={newPolygonPoints.length < 3 || isPolygonClosed(newPolygonPoints)}
                  >
                    Close Polygon
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setNewPolygonPoints((prev) => prev.slice(0, -1))}
                    disabled={newPolygonPoints.length === 0}
                  >
                    Undo Last
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setNewPolygonPoints([])}
                    disabled={newPolygonPoints.length === 0}
                  >
                    Clear
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Points: {newPolygonPoints.length}{' '}
                  {isPolygonClosed(newPolygonPoints) ? '(closed)' : '(open)'}
                </p>
              </>
            )}
            {(createShape === 'rectangle' || createShape === 'square') && (
              <p className="text-xs text-muted-foreground">
                Click first corner, then opposite corner.
              </p>
            )}

            {clickedPoint && createShape !== 'polygon' && (
              <p className="text-xs text-muted-foreground">
                📍 {clickedPoint[1].toFixed(5)}, {clickedPoint[0].toFixed(5)}
              </p>
            )}

            <Button
              className="w-full"
              size="sm"
              disabled={
                !newName.trim() ||
                createMutation.isPending ||
                (createShape === 'polygon' &&
                  (newPolygonPoints.length < 4 || !isPolygonClosed(newPolygonPoints))) ||
                ((createShape === 'rectangle' || createShape === 'square') &&
                  (!rectangleStartPoint || !clickedPoint)) ||
                ((createShape === 'circle' || createShape === 'triangle') && !clickedPoint)
              }
              onClick={handleSave}
            >
              <Check className="h-4 w-4 mr-2" />
              {createMutation.isPending ? 'Saving...' : 'Save Geofence'}
            </Button>
          </Card>
        ) : (
          <Card className="p-4 space-y-3 border-primary">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-foreground">Edit Geofence</h4>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEditingGeofence}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Color</Label>
              <div className="flex gap-1.5 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={`edit-${c}`}
                    className={cn(
                      'w-6 h-6 rounded-full border-2 transition-transform cursor-pointer',
                      editColor === c ? 'border-foreground scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: c }}
                    onClick={() => setEditColor(c)}
                  />
                ))}
              </div>
            </div>

            {currentEditingGeofence?.geometryType === 'polygon' ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Click on map to add polygon vertices.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      setEditPolygonPoints((prev) => {
                        if (prev.length < 3 || isPolygonClosed(prev)) return prev;
                        return [...prev, prev[0]];
                      })
                    }
                    disabled={editPolygonPoints.length < 3 || isPolygonClosed(editPolygonPoints)}
                  >
                    Close Polygon
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setEditPolygonPoints((prev) => prev.slice(0, -1))}
                    disabled={editPolygonPoints.length === 0}
                  >
                    Undo Last Point
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setEditPolygonPoints([])}
                    disabled={editPolygonPoints.length === 0}
                  >
                    Clear Points
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Points: {editPolygonPoints.length}{' '}
                  {isPolygonClosed(editPolygonPoints) ? '(closed)' : '(open)'}
                </p>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Radius: {editRadius >= 1000 ? `${(editRadius / 1000).toFixed(1)} km` : `${editRadius} m`}
                  </Label>
                  <Slider
                    value={[editRadius]}
                    onValueChange={([v]) => setEditRadius(v)}
                    min={100}
                    max={10000}
                    step={100}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Click on map to move center.
                </p>
                {editPoint && (
                  <p className="text-xs text-muted-foreground">
                    📍 {editPoint[1].toFixed(5)}, {editPoint[0].toFixed(5)}
                  </p>
                )}
              </>
            )}

            <Button
              className="w-full"
              size="sm"
              disabled={!editName.trim() || updateMutation.isPending}
              onClick={handleSaveEdit}
            >
              <Check className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? 'Updating...' : 'Update Geofence'}
            </Button>
          </Card>
        )}

        {/* Existing geofences list */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">
            Geofences ({geofences.length})
          </h4>

          {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

          {geofences.map((gf) => (
            <Card
              key={gf.id}
              className={cn(
                "p-3 space-y-2 cursor-pointer transition-colors",
                focusedGeofenceId === gf.id && "border-primary bg-primary/5"
              )}
              onClick={() => focusGeofence(gf)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: gf.color }}
                  />
                  <span className="text-sm font-medium text-foreground truncate">{gf.name}</span>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(event) => {
                      event.stopPropagation();
                      focusGeofence(gf);
                    }}
                  >
                    <MapPin className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-6 w-6", editingGeofenceId === gf.id && "text-primary")}
                    onClick={(event) => {
                      event.stopPropagation();
                      startEditingGeofence(gf);
                    }}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteMutation.mutate(gf.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {gf.radius_meters >= 1000
                    ? `${(gf.radius_meters / 1000).toFixed(1)} km radius`
                    : `${gf.radius_meters} m radius`}
                </span>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Active</Label>
                  <Switch
                    checked={gf.is_active}
                    onCheckedChange={(checked) =>
                      updateMutation.mutate({ id: gf.id, is_active: checked })
                    }
                    onClick={(event) => event.stopPropagation()}
                    className="scale-75"
                  />
                </div>
              </div>
            </Card>
          ))}

          {!isLoading && geofences.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No geofences yet. Click "Create New Geofence" to get started.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
