import { motion } from "framer-motion";
import { ShieldAlert, ShieldCheck, ShieldX, Shield } from "lucide-react";
import type { SecurityData } from "@/lib/vps/types";

interface Props {
  data: SecurityData;
}

const levelIcons = {
  LOW: ShieldCheck,
  MEDIUM: Shield,
  HIGH: ShieldAlert,
  CRITICAL: ShieldX,
};

const levelDescriptions = {
  LOW: "System is secure. Normal activity levels detected.",
  MEDIUM: "Elevated activity. Monitor closely for escalation.",
  HIGH: "Significant threat detected. Immediate review advised.",
  CRITICAL: "Active attack underway. Immediate action required.",
};

const LEVEL_COLORS = {
  LOW:      { color: "hsl(142 71% 38%)", bgColor: "hsl(142 71% 96%)",  borderColor: "hsl(142 71% 38%)" },
  MEDIUM:   { color: "hsl(38 92% 40%)",  bgColor: "hsl(38 92% 96%)",   borderColor: "hsl(38 92% 40%)"  },
  HIGH:     { color: "hsl(0 84% 55%)",   bgColor: "hsl(0 84% 97%)",    borderColor: "hsl(0 84% 55%)"   },
  CRITICAL: { color: "hsl(270 67% 50%)", bgColor: "hsl(270 67% 97%)",  borderColor: "hsl(270 67% 50%)" },
};

function computeRisk(data: SecurityData) {
  const highCrit = data.highCritical ?? 0;
  const blocks = data.blocks ?? 0;
  const score = Math.min(100, Math.round((highCrit / Math.max(data.total, 1)) * 60 + (blocks / Math.max(data.total, 1)) * 40));
  let level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
  if (score >= 75) level = "CRITICAL";
  else if (score >= 45) level = "HIGH";
  else if (score >= 20) level = "MEDIUM";
  return { level, score, ...LEVEL_COLORS[level] };
}

export function ThreatLevel({ data }: Props) {
  const risk = computeRisk(data);
  const Icon = levelIcons[risk.level];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className="rounded-xl border bg-card p-5 flex flex-col shadow-sm"
    >
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Threat Level
      </h2>

      <div className="flex flex-col items-center justify-center flex-1 gap-4 py-2">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-20 h-20 rounded-full flex items-center justify-center border-2"
          style={{
            background: risk.bgColor,
            borderColor: risk.borderColor,
          }}
        >
          <Icon size={36} style={{ color: risk.color }} />
        </motion.div>

        <div className="text-center">
          <p className="text-2xl font-bold tracking-widest" style={{ color: risk.color }}>
            {risk.level}
          </p>
          <p className="text-xs mt-1 max-w-[180px] text-center text-muted-foreground">
            {levelDescriptions[risk.level]}
          </p>
        </div>

        <div className="w-full mt-2">
          <div className="flex justify-between text-xs mb-1.5 text-muted-foreground">
            <span>Risk Score</span>
            <span className="font-mono font-bold" style={{ color: risk.color }}>
              {risk.score}/100
            </span>
          </div>
          <div className="w-full rounded-full h-2 bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${risk.score}%` }}
              transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
              className="h-2 rounded-full"
              style={{ background: risk.color }}
            />
          </div>
        </div>

        <div className="w-full grid grid-cols-4 gap-1 mt-1">
          {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((lvl) => (
            <div
              key={lvl}
              className="rounded py-1 text-center text-[9px] font-bold tracking-wider border transition-all"
              style={{
                background: risk.level === lvl ? risk.bgColor : "transparent",
                borderColor: risk.level === lvl ? risk.borderColor : "hsl(215 20% 88%)",
                color: risk.level === lvl ? risk.color : "hsl(215 15% 55%)",
              }}
            >
              {lvl}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
