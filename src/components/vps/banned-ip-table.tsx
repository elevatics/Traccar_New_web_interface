import { useState, useMemo } from "react";
import { vpsPost } from "@/lib/vps/vpsApiClient";
import { motion } from "framer-motion";
import { Search, Copy, Download, Check, ShieldOff, Loader2 } from "lucide-react";
import type { EnrichedIP } from "@/lib/vps/types";

interface Props {
  ips: EnrichedIP[];
}

function flagEmoji(code: string): string {
  if (!code || code === "XX") return "🌐";
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join("");
}

type UnblockState = "idle" | "confirming" | "loading" | "done" | "error";

export function BlockedIPTable({ ips }: Props) {
  const [search, setSearch] = useState("");
  const [copiedIP, setCopiedIP] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;
  const [unblockState, setUnblockState] = useState<Record<string, UnblockState>>({});
  const [unblockMsg, setUnblockMsg] = useState<Record<string, string>>({});

  const filtered = useMemo(
    () =>
      ips.filter(
        (row) =>
          row.ip.includes(search) ||
          row.country.toLowerCase().includes(search.toLowerCase()) ||
          row.org.toLowerCase().includes(search.toLowerCase())
      ),
    [ips, search]
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleUnblock = async (ip: string) => {
    const state = unblockState[ip] ?? "idle";
    if (state === "idle" || state === "error") {
      setUnblockState((s) => ({ ...s, [ip]: "confirming" }));
      return;
    }
    if (state === "confirming") {
      setUnblockState((s) => ({ ...s, [ip]: "loading" }));
      try {
        const res = await vpsPost("/unblock", { ip });
        const data = await res.json();
        if (res.ok) {
          setUnblockState((s) => ({ ...s, [ip]: "done" }));
          setUnblockMsg((m) => ({ ...m, [ip]: data.message ?? "Unblocked" }));
        } else {
          setUnblockState((s) => ({ ...s, [ip]: "error" }));
          setUnblockMsg((m) => ({ ...m, [ip]: data.detail ?? "Failed" }));
        }
      } catch {
        setUnblockState((s) => ({ ...s, [ip]: "error" }));
        setUnblockMsg((m) => ({ ...m, [ip]: "Request failed" }));
      }
    }
  };

  const cancelUnblock = (ip: string) => {
    setUnblockState((s) => ({ ...s, [ip]: "idle" }));
    setUnblockMsg((m) => ({ ...m, [ip]: "" }));
  };

  const handleCopy = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIP(ip);
    setTimeout(() => setCopiedIP(null), 1500);
  };

  const exportCSV = () => {
    const header = "IP,Country,ISP/Org,Event Count\n";
    const rows = ips
      .map((r) => `${r.ip},"${r.country}","${r.org}",${r.count}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `top-ips-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.5 }}
      className="rounded-xl border bg-card p-5 shadow-sm"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Blocked Attacking IPs</h2>
          <p className="text-xs mt-0.5 text-muted-foreground">
            {ips.length} unique source IPs — sorted by block count
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 border bg-background flex-1 sm:w-64">
            <Search size={13} className="text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter by IP, country, ISP…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="bg-transparent outline-none text-xs flex-1 text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium border transition-all hover:bg-muted text-muted-foreground"
          >
            <Download size={12} />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-left pb-3 pr-3 font-semibold tracking-wider uppercase text-muted-foreground text-[10px]">#</th>
              <th className="text-left pb-3 pr-4 font-semibold tracking-wider uppercase text-muted-foreground text-[10px]">IP Address</th>
              <th className="text-left pb-3 pr-4 font-semibold tracking-wider uppercase text-muted-foreground text-[10px]">Country</th>
              <th className="text-left pb-3 pr-4 font-semibold tracking-wider uppercase text-muted-foreground text-[10px]">ISP / Org</th>
              <th className="text-left pb-3 pr-4 font-semibold tracking-wider uppercase text-muted-foreground text-[10px]">Events</th>
              <th className="pb-3" />
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => {
              const rank = page * PAGE_SIZE + i + 1;
              const countColor = row.count > 50 ? "hsl(0 84% 55%)" : row.count > 20 ? "hsl(38 92% 40%)" : "hsl(45 93% 40%)";
              return (
                <motion.tr
                  key={row.ip}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="group border-b"
                >
                  <td className="py-3 pr-3 font-mono text-muted-foreground">{rank}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-destructive font-medium">{row.ip}</span>
                      <button
                        onClick={() => handleCopy(row.ip)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {copiedIP === row.ip ? (
                          <Check size={11} className="text-[hsl(142_71%_38%)]" />
                        ) : (
                          <Copy size={11} className="text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm leading-none">{flagEmoji(row.countryCode)}</span>
                      <span className="text-foreground">{row.country}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 max-w-[180px]">
                    <span className="truncate block text-muted-foreground" title={row.org}>
                      {row.org}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="font-mono font-bold" style={{ color: countColor }}>{row.count}</span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1.5 justify-end">
                      {(() => {
                        const state = unblockState[row.ip] ?? "idle";
                        const msg = unblockMsg[row.ip];
                        if (state === "done") {
                          return (
                            <span className="text-[9px] font-bold px-2 py-1 rounded bg-[hsl(142_71%_96%)] text-[hsl(142_71%_38%)]">
                              UNBLOCKED
                            </span>
                          );
                        }
                        if (state === "loading") {
                          return <Loader2 size={12} className="animate-spin" style={{ color: "#8e8e93" }} />;
                        }
                        if (state === "confirming") {
                          return (
                            <>
                              <span className="text-[9px] text-[hsl(38_92%_40%)]">Sure?</span>
                              <button
                                onClick={() => handleUnblock(row.ip)}
                                className="text-[9px] font-bold px-2 py-1 rounded cursor-pointer bg-destructive text-destructive-foreground"
                              >
                                YES
                              </button>
                              <button
                                onClick={() => cancelUnblock(row.ip)}
                                className="text-[9px] font-bold px-2 py-1 rounded cursor-pointer bg-muted text-muted-foreground"
                              >
                                NO
                              </button>
                            </>
                          );
                        }
                        return (
                          <button
                            onClick={() => handleUnblock(row.ip)}
                            className="flex items-center gap-1 text-[9px] font-bold tracking-wider px-2 py-1 rounded border border-[hsl(142_71%_75%)] text-[hsl(142_71%_38%)] bg-[hsl(142_71%_96%)] transition-all opacity-0 group-hover:opacity-100 cursor-pointer hover:opacity-100"
                            title={state === "error" ? (msg ?? "Retry unblock") : "Unblock this IP"}
                          >
                            <ShieldOff size={9} />
                            {state === "error" ? "RETRY" : "UNBLOCK"}
                          </button>
                        );
                      })()}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <span className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages} · {filtered.length} results
          </span>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-7 h-7 rounded text-xs font-mono transition-all border ${
                  page === i
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "bg-transparent border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
