import type { SecurityData, SummaryData, RawEvent, TrendPoint, EnrichedIP, TopIP } from "@/lib/vps/types";

const VPS_BASE = "http://15.204.117.106:8090";

export async function fetchVpsSecurityData(): Promise<SecurityData> {
  const [summaryRes, eventsRes] = await Promise.all([
    fetch(`${VPS_BASE}/api/summary`),
    fetch(`${VPS_BASE}/api/events?limit=2000`),
  ]);

  if (!summaryRes.ok) throw new Error(`VPS summary returned ${summaryRes.status}`);
  if (!eventsRes.ok) throw new Error(`VPS events returned ${eventsRes.status}`);

  const summary: SummaryData = await summaryRes.json();
  const events: RawEvent[] = await eventsRes.json();

  const topIPs = summary.top_ips ?? [];
  const ipCountMap: Record<string, number> = {};
  for (const t of topIPs) {
    ipCountMap[t.ip] = t.count;
  }
  for (const e of events) {
    if (e.ip && !(e.ip in ipCountMap)) {
      ipCountMap[e.ip] = (ipCountMap[e.ip] ?? 0) + 1;
    }
  }
  const allUniqueIPs: TopIP[] = Object.entries(ipCountMap)
    .map(([ip, count]) => ({ ip, count }))
    .sort((a, b) => b.count - a.count);

  const enrichedIPs = await geoEnrichIPs(allUniqueIPs);
  const trendData = buildTrendData(events);

  const blocks = events.filter(
    (e) => e.category === "fail2ban_ban" && e.message.includes("Ban ")
  ).length;

  const highCritical = (summary.by_severity ?? [])
    .filter((s) => s.severity === "high" || s.severity === "critical")
    .reduce((acc, s) => acc + s.count, 0);

  return {
    timestamp: new Date().toISOString(),
    total: summary.total ?? 0,
    blocks,
    highCritical,
    topSourceIP: allUniqueIPs[0]?.ip ?? "—",
    bySeverity: summary.by_severity ?? [],
    topIPs: allUniqueIPs,
    enrichedIPs,
    recentEvents: events,
    trendData,
  };
}

interface IpApiResult {
  status: "success" | "fail";
  query: string;
  country?: string;
  countryCode?: string;
  isp?: string;
  org?: string;
}

async function geoEnrichIPs(topIPs: TopIP[]): Promise<EnrichedIP[]> {
  if (!topIPs.length) return [];
  const countMap = Object.fromEntries(topIPs.map((r) => [r.ip, r.count]));
  const queries = topIPs.slice(0, 100).map((r) => ({ query: r.ip }));
  try {
    const res = await fetch("http://ip-api.com/batch?fields=status,query,country,countryCode,isp,org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(queries),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const results: IpApiResult[] = await res.json();
    return results
      .filter((r) => r.status === "success")
      .map((r) => ({
        ip: r.query,
        count: countMap[r.query] ?? 0,
        country: r.country ?? "Unknown",
        countryCode: r.countryCode ?? "XX",
        org: r.isp ?? r.org ?? "Unknown",
      }));
  } catch {
    return [];
  }
}

function buildTrendData(events: RawEvent[]): TrendPoint[] {
  const now = Date.now();
  const nowSnapped = Math.floor(now / (10 * 60 * 1000)) * (10 * 60 * 1000);
  const bucketOrder: string[] = [];
  const buckets: Record<string, { events: number; blocks: number }> = {};
  for (let i = 23; i >= 0; i--) {
    const t = new Date(nowSnapped - i * 10 * 60 * 1000);
    const key = `${t.getUTCHours().toString().padStart(2, "0")}:${t.getUTCMinutes().toString().padStart(2, "0")}`;
    buckets[key] = { events: 0, blocks: 0 };
    bucketOrder.push(key);
  }
  for (const e of events) {
    const d = new Date(e.ts);
    const snapped = Math.floor(d.getTime() / (10 * 60 * 1000)) * (10 * 60 * 1000);
    const t = new Date(snapped);
    const key = `${t.getUTCHours().toString().padStart(2, "0")}:${t.getUTCMinutes().toString().padStart(2, "0")}`;
    if (key in buckets) {
      buckets[key].events += 1;
      if (e.category === "fail2ban_ban" && e.message.includes("Ban ")) {
        buckets[key].blocks += 1;
      }
    }
  }
  return bucketOrder.map((time) => ({ time, ...buckets[time] }));
}
