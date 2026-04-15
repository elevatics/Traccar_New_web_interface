import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
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
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? '';

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

interface Geofence {
  id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  color: string;
  is_active: boolean;
  created_at: string;
}

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
  const queryClient = useQueryClient();

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRadius, setNewRadius] = useState(500);
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [clickedPoint, setClickedPoint] = useState<[number, number] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Fetch geofences
  const { data: geofences = [], isLoading } = useQuery({
    queryKey: ['geofences'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('geofences')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Geofence[];
    },
  });

  // Create geofence
  const createMutation = useMutation({
    mutationFn: async (geofence: { name: string; center_lat: number; center_lng: number; radius_meters: number; color: string }) => {
      const { data, error } = await supabase.from('geofences').insert(geofence).select().single();
      if (error) throw error;
      return data;
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
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; is_active?: boolean }) => {
      const { error } = await supabase.from('geofences').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      setEditingId(null);
    },
    onError: () => toast.error('Failed to update geofence'),
  });

  // Delete geofence
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('geofences').delete().eq('id', id);
      if (error) throw error;
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
    setNewRadius(500);
    setNewColor(COLORS[0]);
    if (map.current) {
      map.current.getCanvas().style.cursor = '';
    }
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
      if (!isCreating) return;
      setClickedPoint([e.lngLat.lng, e.lngLat.lat]);
    };

    map.current.on('click', handleClick);

    if (isCreating) {
      map.current.getCanvas().style.cursor = 'crosshair';
    } else {
      map.current.getCanvas().style.cursor = '';
    }

    return () => { map.current?.off('click', handleClick); };
  }, [isCreating]);

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

    // Remove existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    // Draw existing geofences
    geofences.forEach((gf, i) => {
      if (!gf.is_active) return;

      const circle = createGeoJSONCircle([gf.center_lng, gf.center_lat], gf.radius_meters);
      const srcId = `geofence-src-${i}`;

      m.addSource(srcId, { type: 'geojson', data: circle as any });

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

    // Draw preview circle
    if (clickedPoint) {
      const preview = createGeoJSONCircle(clickedPoint, newRadius);
      m.addSource('preview-src', { type: 'geojson', data: preview as any });
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
  }, [geofences, clickedPoint, newRadius, newColor]);

  const handleSave = () => {
    if (!clickedPoint || !newName.trim()) {
      toast.error('Please click on the map and enter a name');
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
        {!isCreating ? (
          <Button onClick={() => setIsCreating(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Create New Geofence
          </Button>
        ) : (
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
              <Label className="text-xs">Radius: {newRadius >= 1000 ? `${(newRadius / 1000).toFixed(1)} km` : `${newRadius} m`}</Label>
              <Slider
                value={[newRadius]}
                onValueChange={([v]) => setNewRadius(v)}
                min={100}
                max={10000}
                step={100}
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

            {clickedPoint && (
              <p className="text-xs text-muted-foreground">
                📍 {clickedPoint[1].toFixed(5)}, {clickedPoint[0].toFixed(5)}
              </p>
            )}

            <Button
              className="w-full"
              size="sm"
              disabled={!clickedPoint || !newName.trim() || createMutation.isPending}
              onClick={handleSave}
            >
              <Check className="h-4 w-4 mr-2" />
              {createMutation.isPending ? 'Saving...' : 'Save Geofence'}
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
            <Card key={gf.id} className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: gf.color }}
                  />
                  {editingId === gf.id ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-6 text-sm py-0"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateMutation.mutate({ id: gf.id, name: editName });
                        }
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                  ) : (
                    <span className="text-sm font-medium text-foreground truncate">{gf.name}</span>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {editingId === gf.id ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => updateMutation.mutate({ id: gf.id, name: editName })}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => { setEditingId(gf.id); setEditName(gf.name); }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => deleteMutation.mutate(gf.id)}
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
