import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { EnrichedIP } from "@/lib/vps/types";

interface Props {
  data: EnrichedIP[];
}

const W = 960;
const H = 500;

function project(lon: number, lat: number): [number, number] {
  const x = ((lon + 180) / 360) * W;
  const y = ((90 - lat) / 180) * H;
  return [x, y];
}

function geoPathString(geometry: Geometry): string {
  const parts: string[] = [];

  function ring(coords: number[][]): string {
    return coords
      .map(([lon, lat], i) => {
        const [x, y] = project(lon, lat);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ") + " Z";
  }

  if (geometry.type === "Polygon") {
    geometry.coordinates.forEach((r) => parts.push(ring(r)));
  } else if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach((poly) => poly.forEach((r) => parts.push(ring(r))));
  }
  return parts.join(" ");
}

const COUNTRY_COORDS: Record<string, [number, number]> = {
  CN: [104, 35], RU: [100, 60], US: [-100, 38], NL: [5.3, 52.3],
  BR: [-51, -10], VN: [108, 14], IN: [78, 22], HK: [114, 22.3],
  ID: [118, -2], TR: [35, 39], TW: [121, 24], FR: [2.2, 46],
  DE: [10, 51], SG: [104, 1.3], ZA: [25, -29], KR: [128, 36],
  UA: [32, 49], MX: [-102, 24], CO: [-74, 4], BG: [25, 43],
  NG: [8, 10], RO: [25, 46], EC: [-78, -2], GB: [-3, 54],
  JP: [138, 36], AU: [133, -27], CA: [-95, 60], IT: [12, 42],
  ES: [-3.7, 40], PL: [20, 52], AR: [-65, -35], PK: [69, 30],
  BD: [90, 24], TH: [101, 15], MY: [112, 3], PH: [122, 13],
  EG: [30, 27], SA: [45, 24], IR: [53, 32], IQ: [44, 33],
  AZ: [47.6, 40.1], BY: [28, 53], MD: [28.4, 47], LT: [24, 56],
  ET: [38, 9], TZ: [35, -6], KE: [38, 1], GH: [-2, 8],
  MA: [-7, 32], DZ: [3, 28], LY: [17, 27], TN: [9, 34],
  PE: [-76, -10], CL: [-71, -35], VE: [-66, 8], BO: [-64, -17],
  UZ: [64, 41], KZ: [68, 48], MM: [96, 17], LK: [80.7, 7.8],
  NP: [84, 28], AF: [67, 33], SY: [38, 35], YE: [48, 16],
  CU: [-80, 22], HN: [-87, 15], GT: [-90, 15],
  ZW: [30, -20], MZ: [35, -18], AO: [18, -12], CM: [12, 4],
  HU: [19, 47], CZ: [15.5, 50], GR: [22, 39], PT: [-8, 40],
  SE: [15, 62], NO: [10, 62], FI: [26, 62], DK: [10, 56],
  CH: [8, 47], AT: [14, 47], BE: [4.5, 50.5], NZ: [174, -41],
};

function dotColor(ratio: number): string {
  if (ratio > 0.7) return "hsl(0 84% 55%)";
  if (ratio > 0.4) return "hsl(38 92% 40%)";
  return "hsl(45 93% 40%)";
}

function flagEmoji(code: string): string {
  if (!code || code === "XX") return "🌐";
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join("");
}

export function WorldMap({ data }: Props) {
  const [countryPaths, setCountryPaths] = useState<{ id: string; d: string }[]>([]);

  useEffect(() => {
    fetch("/countries-110m.json")
      .then((r) => r.json())
      .then((topology: Topology) => {
        const countries = topology.objects.countries as GeometryCollection;
        const fc = feature(topology, countries) as FeatureCollection;
        const paths = fc.features
          .map((f: Feature, idx: number) => ({
            id: `${idx}-${String((f as { id?: string | number }).id ?? idx)}`,
            d: f.geometry ? geoPathString(f.geometry) : "",
          }))
          .filter((p) => p.d);
        setCountryPaths(paths);
      })
      .catch((e) => console.error("[WorldMap] failed to load topology:", e));
  }, []);

  const byCountry: Record<string, { country: string; countryCode: string; count: number; ips: string[] }> = {};
  for (const e of data) {
    const cc = e.countryCode || "XX";
    if (!byCountry[cc]) byCountry[cc] = { country: e.country, countryCode: cc, count: 0, ips: [] };
    byCountry[cc].count += e.count;
    byCountry[cc].ips.push(e.ip);
  }
  const countries = Object.values(byCountry).sort((a, b) => b.count - a.count);
  const maxCount = countries[0]?.count ?? 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.5 }}
      className="rounded-xl border bg-card p-5 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Global Attack Origin Map</h2>
          <p className="text-xs mt-0.5 text-muted-foreground">
            {countries.length} countries · {data.length} unique IPs — live geo lookup
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block bg-destructive" />High
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: "hsl(38 92% 40%)" }} />Med
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: "hsl(45 93% 40%)" }} />Low
          </span>
        </div>
      </div>

      <div className="rounded-lg overflow-hidden mb-4 border">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: "block" }}>
          <rect width={W} height={H} fill="hsl(210 20% 96%)" />
          {[-60, -30, 0, 30, 60].map((lat) => {
            const [, y] = project(0, lat);
            return (
              <line key={`lat${lat}`} x1={0} y1={y} x2={W} y2={y}
                stroke={lat === 0 ? "hsl(215 20% 78%)" : "hsl(215 20% 88%)"}
                strokeWidth={lat === 0 ? 0.8 : 0.4} />
            );
          })}
          {[-120, -60, 0, 60, 120].map((lon) => {
            const [x] = project(lon, 0);
            return (
              <line key={`lon${lon}`} x1={x} y1={0} x2={x} y2={H}
                stroke="hsl(215 20% 88%)" strokeWidth={0.4} />
            );
          })}
          {countryPaths.map((p) => (
            <path key={p.id} d={p.d} fill="hsl(215 20% 88%)" stroke="hsl(215 20% 98%)" strokeWidth={0.5} />
          ))}
          {countries.map((c) => {
            const coords = COUNTRY_COORDS[c.countryCode];
            if (!coords) return null;
            const [x, y] = project(coords[0], coords[1]);
            const ratio = c.count / maxCount;
            const r = 5 + ratio * 22;
            const color = dotColor(ratio);
            return (
              <g key={c.countryCode} filter="url(#vpsDotGlow)">
                <motion.circle cx={x} cy={y} fill={color} opacity={0.12}
                  initial={{ r: 0 }} animate={{ r: r * 2.8 }}
                  transition={{ delay: 0.4, duration: 0.8 }} />
                <motion.circle cx={x} cy={y} fill={color} opacity={0.92}
                  initial={{ r: 0, opacity: 0 }} animate={{ r, opacity: 0.92 }}
                  transition={{ delay: 0.3, duration: 0.6 }}>
                  <title>{`${c.country} (${c.countryCode})\n${c.count} events · IPs: ${c.ips.slice(0, 3).join(", ")}${c.ips.length > 3 ? "…" : ""}`}</title>
                </motion.circle>
                <motion.circle cx={x} cy={y} fill="white" opacity={0.95}
                  initial={{ r: 0 }} animate={{ r: r * 0.28 }}
                  transition={{ delay: 0.3, duration: 0.6 }} />
              </g>
            );
          })}
          {countries.slice(0, 8).map((c) => {
            const coords = COUNTRY_COORDS[c.countryCode];
            if (!coords) return null;
            const [x, y] = project(coords[0], coords[1]);
            const ratio = c.count / maxCount;
            const r = 5 + ratio * 22;
            const lx = x + r + 5;
            const color = dotColor(ratio);
            return (
              <motion.text
                key={`lbl-${c.countryCode}`}
                x={lx > W - 80 ? x - r - 5 : lx}
                y={y + 3}
                fontSize={10}
                fill={color}
                opacity={0.9}
                textAnchor={lx > W - 80 ? "end" : "start"}
                style={{ fontFamily: "monospace" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.9 }}
                transition={{ delay: 0.9 }}
              >
                {c.country}
              </motion.text>
            );
          })}
          <text x={W - 6} y={H - 5} fontSize={8} fill="hsl(215 15% 65%)" textAnchor="end"
            style={{ fontFamily: "monospace" }}>
            LIVE GEO · ip-api.com
          </text>
        </svg>
      </div>

      <div className="scrollbar-thin grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
        {countries.map((c, i) => {
          const pct = Math.round((c.count / maxCount) * 100);
          const color = dotColor(c.count / maxCount);
          return (
            <motion.div
              key={c.countryCode}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.04 * i }}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 border bg-muted/40"
            >
              <span className="text-base leading-none shrink-0">{flagEmoji(c.countryCode)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs truncate font-medium text-foreground">
                    {c.country}
                  </span>
                  <span className="text-[10px] font-mono font-bold shrink-0" style={{ color }}>
                    {c.count}
                  </span>
                </div>
                <div className="mt-0.5 h-1 rounded-full w-full bg-muted">
                  <div className="h-1 rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
