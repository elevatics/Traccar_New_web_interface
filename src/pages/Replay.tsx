import { useCallback, useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  Loader2, Play, Pause, Square, Navigation2, SkipBack, SkipForward,
  Car, Clock, Gauge, Route as RouteIcon, ChevronDown, ChevronUp,
  RotateCcw, Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getDevices } from '@/services/deviceService';
import { getRouteReport } from '@/services/tripService';
import { useToast } from '@/hooks/use-toast';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? '';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Position {
  id: number;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  fixTime: string;
  attributes: Record<string, unknown>;
}
interface DeviceOption { id: number; name: string; }

const FULL_ROUTE_SRC   = 'rp-full';
const FULL_ROUTE_LAYER = 'rp-full-line';
const TAIL_SRC         = 'rp-tail';
const TAIL_LAYER       = 'rp-tail-line';
const TAIL_GLOW        = 'rp-tail-glow';

const PERIOD_OPTIONS = [
  { value: 'today',     label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'thisWeek',  label: 'This Week' },
  { value: 'prevWeek',  label: 'Previous Week' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'prevMonth', label: 'Previous Month' },
  { value: 'custom',    label: 'Custom' },
];

const SPEED_OPTIONS = [
  { value: '0.25', label: '0.25×' },
  { value: '0.5',  label: '0.5×'  },
  { value: '1',    label: '1×'    },
  { value: '2',    label: '2×'    },
  { value: '4',    label: '4×'    },
  { value: '8',    label: '8×'    },
  { value: '16',   label: '16×'   },
  { value: '32',   label: '32×'   },
  { value: '64',   label: '64×'   },
  { value: '128',  label: '128×'  },
  { value: '256',  label: '256×'  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const sd = (d: Date) => { const r = new Date(d); r.setHours(0,0,0,0); return r; };
const ed = (d: Date) => { const r = new Date(d); r.setHours(23,59,59,999); return r; };

function getPeriodRange(period: string, cf?: string, ct?: string): { from: string; to: string } {
  const now = new Date();
  switch (period) {
    case 'today':     return { from: sd(now).toISOString(), to: ed(now).toISOString() };
    case 'yesterday': { const y = new Date(now); y.setDate(y.getDate()-1); return { from: sd(y).toISOString(), to: ed(y).toISOString() }; }
    case 'thisWeek':  { const d=now.getDay(), m=new Date(now); m.setDate(now.getDate()-((d===0?7:d)-1)); return { from: sd(m).toISOString(), to: now.toISOString() }; }
    case 'prevWeek':  {
      const d=now.getDay(), tm=new Date(now); tm.setDate(now.getDate()-((d===0?7:d)-1));
      const pm=new Date(tm); pm.setDate(tm.getDate()-7);
      const ps=new Date(tm); ps.setDate(tm.getDate()-1);
      return { from: sd(pm).toISOString(), to: ed(ps).toISOString() };
    }
    case 'thisMonth': { const s=new Date(now.getFullYear(),now.getMonth(),1); return { from: s.toISOString(), to: now.toISOString() }; }
    case 'prevMonth': { const s=new Date(now.getFullYear(),now.getMonth()-1,1), e=new Date(now.getFullYear(),now.getMonth(),0); return { from: s.toISOString(), to: ed(e).toISOString() }; }
    case 'custom': { if (cf && ct) { const f=new Date(cf), t=new Date(ct); if (!isNaN(f.getTime())&&!isNaN(t.getTime())&&f<=t) return { from: f.toISOString(), to: t.toISOString() }; } return { from: sd(now).toISOString(), to: ed(now).toISOString() }; }
    default: return { from: sd(now).toISOString(), to: ed(now).toISOString() };
  }
}

function lerp(a: number, b: number, t: number) { return a + (b-a) * Math.max(0, Math.min(1,t)); }
function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return a + d * Math.max(0, Math.min(1,t));
}
function knotsToKmh(k: number) { return Math.round(k * 1.852); }
function fmtTime(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' });
}
function fmtDuration(from?: string, to?: string) {
  if (!from || !to) return '—';
  const diff = new Date(to).getTime() - new Date(from).getTime();
  if (diff < 0 || isNaN(diff)) return '—';
  const h=Math.floor(diff/3600000), m=Math.floor((diff%3600000)/60000), s=Math.floor((diff%60000)/1000);
  return h>0 ? `${h}h ${m}m` : m>0 ? `${m}m ${s}s` : `${s}s`;
}

function buildLineFC(coords: [number,number][]) {
  return {
    type: 'FeatureCollection' as const,
    features: coords.length >= 2 ? [{ type:'Feature' as const, properties:{}, geometry:{ type:'LineString' as const, coordinates:coords } }] : [],
  };
}

// ── Marker SVG ────────────────────────────────────────────────────────────────
function createMarkerEl(): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'width:48px;height:48px;position:relative;pointer-events:none;';

  const pulse = document.createElement('div');
  pulse.style.cssText = `
    position:absolute;inset:-8px;border-radius:50%;
    background:radial-gradient(circle,rgba(37,99,235,0.3) 0%,transparent 70%);
    animation:rp-pulse 2s ease-in-out infinite;
  `;

  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('width','48'); svg.setAttribute('height','48'); svg.setAttribute('viewBox','0 0 48 48');
  svg.style.cssText = 'position:absolute;inset:0;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.4));transition:transform 0.15s linear;';
  svg.innerHTML = `
    <defs>
      <radialGradient id="rg1" cx="40%" cy="30%" r="60%">
        <stop offset="0%" stop-color="#3b82f6"/>
        <stop offset="100%" stop-color="#1d4ed8"/>
      </radialGradient>
    </defs>
    <circle cx="24" cy="24" r="20" fill="url(#rg1)" stroke="white" stroke-width="3"/>
    <path d="M24 9 L30 35 L24 30 L18 35 Z" fill="white" opacity="0.95"/>
    <circle cx="24" cy="24" r="3" fill="white" opacity="0.6"/>
  `;

  wrap.appendChild(pulse);
  wrap.appendChild(svg);
  return wrap;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Replay() {
  const { toast } = useToast();

  // Filter UI state
  const [devices, setDevices]               = useState<DeviceOption[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [period, setPeriod]                 = useState<string>('today');
  const [customFrom, setCustomFrom]         = useState('');
  const [customTo, setCustomTo]             = useState('');
  const [filtersOpen, setFiltersOpen]       = useState(true);

  // Data & playback state
  const [positions, setPositions]       = useState<Position[]>([]);
  const [loading, setLoading]           = useState(false);
  const [playState, setPlayState]       = useState<'idle'|'playing'|'paused'|'stopped'>('idle');
  const [currentStep, setCurrentStep]   = useState(0);
  const [displaySpeed, setDisplaySpeed] = useState(0);
  const [speedMult, setSpeedMult]       = useState<string>('1');

  // Map
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<mapboxgl.Map | null>(null);
  const markerRef    = useRef<mapboxgl.Marker | null>(null);
  const markerElRef  = useRef<HTMLDivElement | null>(null);

  // Animation (all mutable refs — no re-renders from these)
  const rafRef           = useRef<number | null>(null);
  const animRouteTimeRef = useRef<number>(0);
  const animWallTimeRef  = useRef<number>(0);
  const stepRef          = useRef(0);
  const playingRef       = useRef(false);
  const positionsRef     = useRef<Position[]>([]);
  const speedRef         = useRef(1);
  const lastTailSegRef   = useRef(-1);

  // ── Load devices ───────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getDevices();
        if (!cancelled) setDevices(
          list.filter((d: any) => d.id != null)
              .map((d: any) => ({ id: Number(d.id), name: d.name?.trim() || `Device ${d.id}` }))
        );
      } catch { toast({ title: 'Could not load devices', variant: 'destructive' }); }
      finally { if (!cancelled) setDevicesLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [toast]);

  // ── Map init ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-98.5795, 39.8283], // continental US center
      zoom: 4,
    });

    // Disable globe projection (v3 default)
    const disableGlobe = () => {
      try { (mapRef.current as any).setProjection({ name: 'mercator' }); } catch {}
    };
    mapRef.current.on('style.load', disableGlobe);
    mapRef.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), 'top-right');
    mapRef.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    const ro = new ResizeObserver(() => mapRef.current?.resize());
    ro.observe(mapContainer.current!);
    return () => {
      cancelAnim();
      ro.disconnect();
      markerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync speed ref ─────────────────────────────────────────────────────────
  useEffect(() => { speedRef.current = parseFloat(speedMult); }, [speedMult]);

  // ── Map helpers ────────────────────────────────────────────────────────────
  function setSource(id: string, data: ReturnType<typeof buildLineFC>) {
    if (!mapRef.current) return;
    const src = mapRef.current.getSource(id) as mapboxgl.GeoJSONSource | undefined;
    if (src) src.setData(data as any); else mapRef.current.addSource(id, { type: 'geojson', data: data as any });
  }

  function ensureTailLayers() {
    if (!mapRef.current) return;
    if (!mapRef.current.getLayer(TAIL_LAYER)) {
      mapRef.current.addLayer({ id: TAIL_LAYER, type: 'line', source: TAIL_SRC, layout: { 'line-join':'round','line-cap':'round' }, paint: { 'line-color':'#2563eb','line-width':4.5,'line-opacity':0.92 } });
    }
    if (!mapRef.current.getLayer(TAIL_GLOW)) {
      mapRef.current.addLayer({ id: TAIL_GLOW, type: 'line', source: TAIL_SRC, layout: { 'line-join':'round','line-cap':'round' }, paint: { 'line-color':'#93c5fd','line-width':14,'line-opacity':0.22 } }, TAIL_LAYER);
    }
  }

  // ── Place / move marker ────────────────────────────────────────────────────
  function moveMarker(lat: number, lng: number, course: number) {
    if (!mapRef.current) return;
    if (!markerRef.current) {
      const el = createMarkerEl();
      markerElRef.current = el;
      markerRef.current = new mapboxgl.Marker({ element: el, rotationAlignment: 'map' })
        .setLngLat([lng, lat]).addTo(mapRef.current);
    } else {
      markerRef.current.setLngLat([lng, lat]);
    }
    const svg = markerElRef.current?.querySelector('svg') as HTMLElement | null;
    if (svg) svg.style.transform = `rotate(${course}deg)`;
  }

  // ── Update tail polyline ───────────────────────────────────────────────────
  function updateTailAt(segIdx: number) {
    if (!mapRef.current) return;
    const posArr = positionsRef.current;
    const coords: [number,number][] = posArr.slice(0, segIdx+1).map(p => [p.longitude, p.latitude]);
    const apply = () => { setSource(TAIL_SRC, buildLineFC(coords)); ensureTailLayers(); };
    if (mapRef.current.loaded()) apply(); else mapRef.current.once('load', apply);
  }

  // ── Cancel rAF loop ────────────────────────────────────────────────────────
  function cancelAnim() {
    playingRef.current = false;
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }

  // ── rAF animation loop (smooth interpolation) ─────────────────────────────
  const animLoop = useCallback(() => {
    const posArr = positionsRef.current;
    if (!playingRef.current || posArr.length < 2) return;

    const now          = performance.now();
    const virtualNow   = animRouteTimeRef.current + (now - animWallTimeRef.current) * speedRef.current;
    const routeEndMs   = new Date(posArr[posArr.length-1].fixTime).getTime();

    if (virtualNow >= routeEndMs) {
      const last = posArr[posArr.length-1];
      moveMarker(last.latitude, last.longitude, last.course);
      updateTailAt(posArr.length-1);
      setCurrentStep(posArr.length-1);
      setDisplaySpeed(0);
      setPlayState('stopped');
      playingRef.current = false;
      return;
    }

    // Binary search for segment
    let lo = 0, hi = posArr.length - 2;
    while (lo < hi) {
      const mid = (lo+hi+1)>>1;
      if (new Date(posArr[mid].fixTime).getTime() <= virtualNow) lo = mid; else hi = mid-1;
    }
    const seg = lo;
    const t0  = new Date(posArr[seg].fixTime).getTime();
    const t1  = new Date(posArr[seg+1].fixTime).getTime();
    const frac = t1 > t0 ? (virtualNow-t0)/(t1-t0) : 0;

    const p0 = posArr[seg], p1 = posArr[seg+1];
    moveMarker(lerp(p0.latitude,p1.latitude,frac), lerp(p0.longitude,p1.longitude,frac), lerpAngle(p0.course,p1.course,frac));
    setDisplaySpeed(knotsToKmh(lerp(p0.speed, p1.speed, frac)));

    // Only update tail & step counter when crossing a segment boundary
    if (seg !== lastTailSegRef.current) {
      lastTailSegRef.current = seg;
      updateTailAt(seg);
      stepRef.current = seg;
      setCurrentStep(seg);
    }

    rafRef.current = requestAnimationFrame(animLoop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startAnim(fromStep: number) {
    const posArr = positionsRef.current;
    if (posArr.length < 2) return;
    const clamped = Math.max(0, Math.min(fromStep, posArr.length-2));
    animRouteTimeRef.current = new Date(posArr[clamped].fixTime).getTime();
    animWallTimeRef.current  = performance.now();
    lastTailSegRef.current   = clamped - 1;
    playingRef.current = true;
    rafRef.current = requestAnimationFrame(animLoop);
  }

  // ── Playback handlers ──────────────────────────────────────────────────────
  const handlePlay = useCallback(() => {
    if (positionsRef.current.length < 2) return;
    cancelAnim();
    setPlayState('playing');
    startAnim(playState === 'stopped' ? 0 : stepRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playState, animLoop]);

  const handlePause = useCallback(() => { cancelAnim(); setPlayState('paused'); }, []);
  const handleStop  = useCallback(() => {
    cancelAnim();
    const posArr = positionsRef.current;
    if (posArr.length > 0) {
      const p = posArr[0];
      moveMarker(p.latitude, p.longitude, p.course);
      updateTailAt(0);
    }
    stepRef.current = 0; lastTailSegRef.current = -1;
    setCurrentStep(0); setPlayState('stopped');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStepBack = useCallback(() => {
    cancelAnim(); setPlayState('paused');
    const ns = Math.max(0, stepRef.current-1);
    const p = positionsRef.current[ns];
    if (p) { moveMarker(p.latitude, p.longitude, p.course); updateTailAt(ns); }
    stepRef.current = ns; lastTailSegRef.current = ns-1; setCurrentStep(ns);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStepForward = useCallback(() => {
    cancelAnim(); setPlayState('paused');
    const ns = Math.min(positionsRef.current.length-1, stepRef.current+1);
    const p = positionsRef.current[ns];
    if (p) { moveMarker(p.latitude, p.longitude, p.course); updateTailAt(ns); }
    stepRef.current = ns; lastTailSegRef.current = ns-1; setCurrentStep(ns);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScrub = useCallback((frac: number) => {
    const posArr = positionsRef.current;
    if (posArr.length < 2) return;
    const wasPlaying = playingRef.current;
    cancelAnim();
    const target = Math.round(frac * (posArr.length-1));
    const p = posArr[target];
    if (p) { moveMarker(p.latitude, p.longitude, p.course); updateTailAt(target); }
    stepRef.current = target; lastTailSegRef.current = target-1; setCurrentStep(target);
    if (wasPlaying) { setPlayState('playing'); startAnim(target); }
    else setPlayState('paused');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animLoop]);

  // ── Load route ─────────────────────────────────────────────────────────────
  const handleLoad = useCallback(async () => {
    if (!selectedDevice) { toast({ title: 'Select a device first', variant: 'destructive' }); return; }
    cancelAnim();
    setPlayState('idle'); setCurrentStep(0); setDisplaySpeed(0);
    stepRef.current = 0; lastTailSegRef.current = -1;

    if (mapRef.current) {
      [TAIL_GLOW, TAIL_LAYER, FULL_ROUTE_LAYER].forEach(id => { if (mapRef.current?.getLayer(id)) mapRef.current.removeLayer(id); });
      [TAIL_SRC, FULL_ROUTE_SRC].forEach(id => { if (mapRef.current?.getSource(id)) mapRef.current.removeSource(id); });
    }
    markerRef.current?.remove(); markerRef.current = null; markerElRef.current = null;

    setLoading(true);
    try {
      const { from, to } = getPeriodRange(period, customFrom, customTo);
      const raw = await getRouteReport({ deviceId: Number(selectedDevice), from, to });
      const posArr: Position[] = Array.isArray(raw) ? raw : [];
      positionsRef.current = posArr;
      setPositions(posArr);

      if (posArr.length < 2) {
        toast({ title: 'No route data', description: 'No GPS positions found for this period', variant: 'destructive' });
        return;
      }

      // Draw full route
      const coords: [number,number][] = posArr.map(p => [p.longitude, p.latitude]);
      const applyRoute = () => {
        if (!mapRef.current) return;
        setSource(FULL_ROUTE_SRC, buildLineFC(coords));
        if (!mapRef.current.getLayer(FULL_ROUTE_LAYER)) {
          mapRef.current.addLayer({ id: FULL_ROUTE_LAYER, type: 'line', source: FULL_ROUTE_SRC, layout: { 'line-join':'round','line-cap':'round' }, paint: { 'line-color':'#94a3b8','line-width':2.5,'line-opacity':0.4,'line-dasharray':[3,3] } });
        }
        const bounds = new mapboxgl.LngLatBounds(coords[0], coords[0]);
        coords.forEach(c => bounds.extend(c));
        mapRef.current.fitBounds(bounds, { padding: 72, maxZoom: 16, duration: 900 });
      };
      if (mapRef.current?.loaded()) applyRoute(); else mapRef.current?.once('load', applyRoute);

      // Place marker at start
      setTimeout(() => { const p0 = posArr[0]; if (p0) moveMarker(p0.latitude, p0.longitude, p0.course); }, 200);

      toast({ title: `Loaded ${posArr.length} position points`, description: 'Press ▶ to start replay' });
      setFiltersOpen(false);
    } catch (err: any) {
      toast({ title: 'Failed to load route', description: err?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDevice, period, customFrom, customTo, toast]);

  // ── New search ─────────────────────────────────────────────────────────────
  const handleNewSearch = useCallback(() => {
    cancelAnim();
    setPlayState('idle'); setPositions([]); setCurrentStep(0); setDisplaySpeed(0);
    stepRef.current = 0; lastTailSegRef.current = -1; positionsRef.current = [];
    if (mapRef.current) {
      [TAIL_GLOW, TAIL_LAYER, FULL_ROUTE_LAYER].forEach(id => { if (mapRef.current?.getLayer(id)) mapRef.current.removeLayer(id); });
      [TAIL_SRC, FULL_ROUTE_SRC].forEach(id => { if (mapRef.current?.getSource(id)) mapRef.current.removeSource(id); });
    }
    markerRef.current?.remove(); markerRef.current = null; markerElRef.current = null;
    setFiltersOpen(true);
  }, []);

  useEffect(() => () => { cancelAnim(); }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const currentPos  = positions[currentStep];
  const firstPos    = positions[0];
  const lastPos     = positions[positions.length-1];
  const progress    = positions.length > 1 ? (currentStep / (positions.length-1)) * 100 : 0;
  const deviceName  = devices.find(d => String(d.id) === selectedDevice)?.name ?? '';
  const periodLabel = PERIOD_OPTIONS.find(o => o.value === period)?.label ?? period;
  const totalDur    = fmtDuration(firstPos?.fixTime, lastPos?.fixTime);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Global pulse keyframe for marker */}
      <style>{`@keyframes rp-pulse{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:.15;transform:scale(1.6)}}`}</style>

      {/* ── Top bar ── */}
      <div className="shrink-0 border-b bg-background/95 backdrop-blur-sm z-20">

        {/* Always-visible header row */}
        <div className="flex items-center gap-2 px-3 sm:px-4 h-12">
          <Navigation2 className="h-4 w-4 text-primary shrink-0" />
          <span className="font-semibold text-sm">Route Replay</span>

          {!filtersOpen && positions.length > 0 && (
            <div className="flex items-center gap-1.5 ml-2 flex-1 min-w-0 overflow-hidden">
              <Badge variant="secondary" className="text-xs max-w-[130px] truncate">{deviceName}</Badge>
              <Badge variant="outline" className="text-xs hidden sm:inline-flex shrink-0">{periodLabel}</Badge>
              <Badge variant="outline" className="text-xs hidden md:inline-flex shrink-0">{positions.length} pts</Badge>
            </div>
          )}

          <div className="flex items-center gap-1 ml-auto shrink-0">
            {positions.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleNewSearch} className="h-7 px-2 text-xs gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New Search</span>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setFiltersOpen(v => !v)} className="h-7 px-2 text-xs gap-1">
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Filters</span>
              {filtersOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {/* Collapsible filters */}
        {filtersOpen && (
          <div className="px-3 sm:px-4 pb-3 border-t pt-3 bg-muted/20">
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-stretch sm:items-end">
              <div className="space-y-1 flex-1 min-w-0 sm:min-w-[150px] sm:max-w-[220px]">
                <Label className="text-xs font-medium">Device</Label>
                <Select value={selectedDevice} onValueChange={setSelectedDevice} disabled={devicesLoading}>
                  <SelectTrigger className="h-9 text-sm">
                    {devicesLoading
                      ? <span className="flex items-center gap-1 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin"/>Loading…</span>
                      : <SelectValue placeholder="Select device…" />}
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 flex-1 min-w-0 sm:min-w-[140px] sm:max-w-[180px]">
                <Label className="text-xs font-medium">Period</Label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {period === 'custom' && (
                <>
                  <div className="space-y-1 flex-1 min-w-0 sm:min-w-[180px]">
                    <Label className="text-xs font-medium">From</Label>
                    <Input type="datetime-local" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1 flex-1 min-w-0 sm:min-w-[180px]">
                    <Label className="text-xs font-medium">To</Label>
                    <Input type="datetime-local" value={customTo} onChange={e => setCustomTo(e.target.value)} className="h-9 text-sm" />
                  </div>
                </>
              )}

              <div className="flex items-end">
                <Button onClick={handleLoad} disabled={loading || !selectedDevice} className="h-9 w-full sm:w-auto min-w-[120px]">
                  {loading
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Loading…</>
                    : <><RouteIcon className="h-4 w-4 mr-2"/>Load Route</>}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Map area ── */}
      <div className="flex-1 relative min-h-0">
        {!MAPBOX_TOKEN && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/60 z-20 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Add <code className="bg-muted px-1 rounded text-xs">VITE_MAPBOX_TOKEN</code> to enable the map.
            </p>
          </div>
        )}
        <div ref={mapContainer} className="absolute inset-0" />

        {/* Empty state */}
        {positions.length === 0 && !loading && (
          <div className="absolute inset-0 flex items-end justify-center pb-16 pointer-events-none z-[5]">
            <div className="bg-background/92 backdrop-blur-md rounded-2xl border shadow-xl p-5 text-center max-w-xs mx-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Car className="h-6 w-6 text-primary opacity-70" />
              </div>
              <p className="text-sm font-semibold">No route loaded</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Select a device and period above, then click <strong>Load Route</strong>
              </p>
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-background/50 backdrop-blur-sm">
            <div className="bg-background border rounded-2xl shadow-2xl p-6 flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm font-semibold">Loading route data…</span>
            </div>
          </div>
        )}

        {/* ── Playback Controls ── */}
        {positions.length >= 2 && (
          <div className="absolute bottom-0 left-0 right-0 z-10 p-3 sm:p-4">
            <Card className="max-w-2xl mx-auto shadow-2xl bg-background/97 backdrop-blur-lg border-border/50">
              <CardContent className="p-3 sm:p-4 space-y-3">

                {/* Header: device + status badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      playState === 'playing' ? 'bg-green-500 animate-pulse' :
                      playState === 'paused'  ? 'bg-yellow-500' : 'bg-muted-foreground/40'
                    )} />
                    <span className="text-xs font-semibold truncate">{deviceName}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono text-muted-foreground tabular-nums">{fmtTime(currentPos?.fixTime)}</span>
                    <Badge variant="outline" className={cn(
                      'text-[10px] h-5 px-1.5',
                      playState === 'playing' ? 'border-green-500/40 text-green-600 bg-green-500/8' :
                      playState === 'paused'  ? 'border-yellow-500/40 text-yellow-600 bg-yellow-500/8' :
                      'border-muted-foreground/30 text-muted-foreground'
                    )}>
                      {playState==='playing'?'▶ Playing':playState==='paused'?'⏸ Paused':playState==='stopped'?'■ Ended':'○ Ready'}
                    </Badge>
                  </div>
                </div>

                {/* Progress track */}
                <div className="space-y-1.5">
                  <div
                    className="relative h-3 rounded-full bg-muted cursor-pointer group"
                    onClick={e => {
                      const r = e.currentTarget.getBoundingClientRect();
                      handleScrub((e.clientX - r.left) / r.width);
                    }}
                  >
                    <div className="absolute inset-y-0 left-0 bg-primary rounded-full" style={{ width: `${progress}%` }} />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary border-2 border-background rounded-full shadow-md z-10 group-hover:scale-125 transition-transform duration-100"
                      style={{ left: `calc(${progress}% - 8px)` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                    <span>{fmtTime(firstPos?.fixTime)}</span>
                    <span className="text-foreground font-medium">{currentStep+1} / {positions.length}</span>
                    <span>{fmtTime(lastPos?.fixTime)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  {/* Playback buttons */}
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleStepBack} disabled={currentStep===0}>
                      <SkipBack className="h-3.5 w-3.5" />
                    </Button>
                    {playState === 'playing' ? (
                      <Button className="h-10 w-10 rounded-full shadow-md" onClick={handlePause}>
                        <Pause className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button className="h-10 w-10 rounded-full shadow-md" onClick={handlePlay}>
                        <Play className="h-4 w-4 ml-0.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleStop} title="Reset to start">
                      <Square className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleStepForward} disabled={currentStep>=positions.length-1}>
                      <SkipForward className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Speed + stats */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide hidden sm:block">Speed</span>
                      <Select value={speedMult} onValueChange={setSpeedMult}>
                        <SelectTrigger className="h-7 w-[72px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SPEED_OPTIONS.map(o => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-1.5 bg-primary/8 border border-primary/20 rounded-lg px-2.5 py-1">
                      <Gauge className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-bold tabular-nums">{displaySpeed}</span>
                      <span className="text-[10px] text-muted-foreground">km/h</span>
                    </div>

                    <div className="hidden sm:flex items-center gap-1.5 bg-muted/60 rounded-lg px-2.5 py-1">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{totalDur}</span>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
