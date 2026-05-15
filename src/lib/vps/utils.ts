export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export function getRiskLevel(currentlyBanned: number, totalFailed: number): {
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  color: string;
  bgColor: string;
  borderColor: string;
  score: number;
} {
  const score = Math.min(100, Math.round((currentlyBanned / 100) * 60 + (totalFailed / 2000) * 40));
  if (currentlyBanned > 100 || score >= 80) {
    return { level: "CRITICAL", color: "#ff2d55", bgColor: "rgba(255,45,85,0.15)", borderColor: "#ff2d55", score };
  }
  if (currentlyBanned > 50 || score >= 60) {
    return { level: "HIGH", color: "#ff6b35", bgColor: "rgba(255,107,53,0.15)", borderColor: "#ff6b35", score };
  }
  if (currentlyBanned > 20 || score >= 35) {
    return { level: "MEDIUM", color: "#ffd60a", bgColor: "rgba(255,214,10,0.15)", borderColor: "#ffd60a", score };
  }
  return { level: "LOW", color: "#30d158", bgColor: "rgba(48,209,88,0.15)", borderColor: "#30d158", score };
}
