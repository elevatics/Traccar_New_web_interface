// Raw event from GET /api/vps/events
export interface RawEvent {
  id: number;
  ts: string;
  source: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  ip: string | null;
  username: string | null;
  message: string;
  raw: string;
  fingerprint: string;
}

// Severity bucket from GET /api/vps/summary
export interface SeverityCount {
  severity: string;
  count: number;
}

// Top IP entry from GET /api/vps/summary
export interface TopIP {
  ip: string;
  count: number;
}

// Full summary from GET /api/vps/summary
export interface SummaryData {
  total: number;
  by_severity: SeverityCount[];
  top_ips: TopIP[];
  recent_high: RawEvent[];
}

// Geo-enriched IP (server-side resolved via ipapi.co)
export interface EnrichedIP {
  ip: string;
  count: number;
  country: string;
  countryCode: string;
  org: string;
}

// Derived types used by dashboard components
export interface TrendPoint {
  time: string;
  events: number;
  blocks: number;
}

export interface CountryAttack {
  country: string;
  countryCode: string;
  attempts: number;
  color: string;
}

export interface IPRow {
  ip: string;
  count: number;
  lastSeen: string;
  lastCategory: string;
  lastSeverity: string;
}

// VPS system info from /api/vps/system
export interface VpsSystemInfo {
  hostname: string;
  os: string;
  machine_id: string;
  uptime_seconds: number;
  boot_time: number;
  cpu_percent: number;
  cpu_count: number;
  memory_total_bytes: number;
  memory_used_bytes: number;
  memory_percent: number;
  disk_total_bytes: number;
  disk_used_bytes: number;
  disk_percent: number;
  net_bytes_sent: number;
  net_bytes_recv: number;
  platform: string;
}

// Unified shape returned by /api/vps/security Next.js route
export interface SecurityData {
  timestamp: string;
  total: number;
  blocks: number;
  highCritical: number;
  topSourceIP: string;
  bySeverity: SeverityCount[];
  topIPs: TopIP[];
  enrichedIPs: EnrichedIP[];
  recentEvents: RawEvent[];
  trendData: TrendPoint[];
}

// Alert event from SSE stream
export interface AlertEvent {
  id: number;
  toastId?: string;
  type: "BAN" | "CRITICAL" | "HIGH" | "FOUND";
  severity: string;
  category: string;
  ip: string;
  country: string;
  countryCode: string;
  org: string;
  username: string | null;
  message: string;
  ts: string;
}
