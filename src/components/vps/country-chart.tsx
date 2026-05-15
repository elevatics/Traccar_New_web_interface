import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { SeverityCount } from "@/lib/vps/types";

interface Props {
  data: SeverityCount[];
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#bf5af2",
  high: "#ff3b30",
  medium: "#ff9f0a",
  low: "#ffd60a",
  info: "#64d2ff",
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; fill: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-3 text-sm border bg-card shadow-md">
      <p className="font-mono text-xs mb-1 capitalize font-bold" style={{ color: SEVERITY_COLORS[label ?? ""] ?? "hsl(215 25% 15%)" }}>
        {label}
      </p>
      <p className="text-xs text-foreground">
        Count: <strong style={{ color: payload[0].fill }}>{payload[0].value}</strong>
      </p>
    </div>
  );
};

export function CountryChart({ data }: Props) {
  const chartData = [...data]
    .sort((a, b) => {
      const order = ["critical", "high", "medium", "low", "info"];
      return order.indexOf(a.severity) - order.indexOf(b.severity);
    })
    .map((d) => ({
      severity: d.severity,
      count: d.count,
      fill: SEVERITY_COLORS[d.severity] ?? "#8e8e93",
    }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="rounded-xl border bg-card p-5 shadow-sm"
    >
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-foreground">Events by Severity</h2>
        <p className="text-xs mt-0.5 text-muted-foreground">Distribution across severity levels</p>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 92%)" vertical={false} />
          <XAxis
            dataKey="severity"
            tick={{ fill: "hsl(215 15% 45%)", fontSize: 10, fontFamily: "monospace" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: "hsl(215 15% 45%)", fontSize: 10, fontFamily: "monospace" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(210 17% 95%)" }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <rect key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 flex flex-wrap gap-2">
        {chartData.map((d) => (
          <div key={d.severity} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: d.fill }} />
            <span className="text-[10px] capitalize text-muted-foreground">{d.severity}</span>
            <span className="text-[10px] font-mono font-bold" style={{ color: d.fill }}>{d.count}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
