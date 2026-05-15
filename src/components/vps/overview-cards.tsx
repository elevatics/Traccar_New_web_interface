import { motion } from "framer-motion";
import { Shield, ShieldAlert, ShieldX, AlertTriangle, Clock, Globe } from "lucide-react";
import { formatNumber } from "@/lib/vps/utils";
import type { SecurityData } from "@/lib/vps/types";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Props {
  data: SecurityData;
}

interface CardDef {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  glow: string;
  getValue: (d: SecurityData) => string | number;
  sub: string;
}

// Semantic color tokens that work on light bg
const cards: CardDef[] = [
  {
    key: "total",
    label: "Total Events",
    icon: AlertTriangle,
    color: "hsl(38 92% 40%)",
    glow: "hsl(38 92% 96%)",
    getValue: (d) => d.total,
    sub: "All ingested log events",
  },
  {
    key: "blocks",
    label: "Blocks (recent)",
    icon: ShieldX,
    color: "hsl(0 84% 55%)",
    glow: "hsl(0 84% 97%)",
    getValue: (d) => d.blocks,
    sub: "Block actions in last 200 events",
  },
  {
    key: "highCritical",
    label: "High / Critical",
    icon: ShieldAlert,
    color: "hsl(270 67% 50%)",
    glow: "hsl(270 67% 97%)",
    getValue: (d) => d.highCritical,
    sub: "High & critical severity count",
  },
  {
    key: "topSourceIP",
    label: "Top Source IP",
    icon: Globe,
    color: "hsl(217 91% 35%)",
    glow: "hsl(217 91% 96%)",
    getValue: (d) => d.topSourceIP,
    sub: "Most frequent attacker",
  },
  {
    key: "jailStatus",
    label: "Fail2Ban",
    icon: Shield,
    color: "hsl(142 71% 38%)",
    glow: "hsl(142 71% 96%)",
    getValue: () => "ACTIVE",
    sub: "sshd jail monitoring",
  },
  {
    key: "lastUpdated",
    label: "Last Updated",
    icon: Clock,
    color: "hsl(215 25% 40%)",
    glow: "hsl(210 17% 96%)",
    getValue: (d) => formatDistanceToNow(new Date(d.timestamp), { addSuffix: true }),
    sub: "Data refresh time",
  },
];

export function OverviewCards({ data }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon;
        const value = card.getValue(data);
        const isString = typeof value === "string";
        const displayValue = isString ? value : formatNumber(value as number);

        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.4 }}
            className="relative overflow-hidden rounded-xl border bg-card p-4 flex flex-col gap-3 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span
                className={cn("text-xs font-semibold tracking-wide uppercase")}
                style={{ color: card.color }}
              >
                {card.label}
              </span>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: card.glow }}
              >
                <Icon size={16} style={{ color: card.color }} />
              </div>
            </div>
            <div>
              <p
                className="text-2xl font-bold tracking-tight truncate text-foreground"
                style={{
                  color: card.color,
                  fontSize: isString && (value as string).length > 12 ? "13px" : undefined,
                }}
              >
                {displayValue}
              </p>
              <p className="text-xs mt-1 text-muted-foreground">{card.sub}</p>
            </div>
            <div
              className="absolute bottom-0 left-0 right-0 h-0.5"
              style={{ background: `linear-gradient(90deg, transparent, ${card.color}66, transparent)` }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
