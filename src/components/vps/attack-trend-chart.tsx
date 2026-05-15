import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { TrendPoint } from "@/lib/vps/types";

interface Props {
  data: TrendPoint[];
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-3 text-sm border bg-card shadow-md">
      <p className="font-mono text-xs mb-2 text-muted-foreground">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          <span className="text-foreground">
            {p.name}: <strong style={{ color: p.color }}>{p.value}</strong>
          </span>
        </div>
      ))}
    </div>
  );
};

export function AttackTrendChart({ data }: Props) {
  const tickInterval = Math.floor(data.length / 6);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="rounded-xl border bg-card p-5 shadow-sm"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Live Attack Trend</h2>
          <p className="text-xs mt-0.5 text-muted-foreground">
            Security events &amp; blocks — last 4 hours (10-min intervals)
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full animate-pulse bg-destructive" />
          <span className="text-xs font-mono text-destructive">LIVE</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="vpsGradFailed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ff3b30" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#ff3b30" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="vpsGradBlocked" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#bf5af2" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#bf5af2" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 20% 92%)" />
          <XAxis
            dataKey="time"
            tick={{ fill: "hsl(215 15% 45%)", fontSize: 10, fontFamily: "monospace" }}
            tickLine={false}
            axisLine={false}
            interval={tickInterval}
          />
          <YAxis
            tick={{ fill: "hsl(215 15% 45%)", fontSize: 10, fontFamily: "monospace" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "11px", paddingTop: "12px", color: "hsl(215 15% 45%)" }}
          />
          <Area
            type="monotone"
            dataKey="events"
            name="Security Events"
            stroke="#ff3b30"
            strokeWidth={2}
            fill="url(#vpsGradFailed)"
            dot={false}
            activeDot={{ r: 4, fill: "#ff3b30", strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="blocks"
            name="New Blocks"
            stroke="#bf5af2"
            strokeWidth={2}
            fill="url(#vpsGradBlocked)"
            dot={false}
            activeDot={{ r: 4, fill: "#bf5af2", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
