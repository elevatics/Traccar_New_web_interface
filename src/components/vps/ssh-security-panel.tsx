import { useQuery } from "@tanstack/react-query";
import { vpsGet } from "@/lib/vps/vpsApiClient";
import { motion } from "framer-motion";
import { Terminal, User, AlertTriangle, RefreshCw, Monitor, ShieldAlert } from "lucide-react";

interface SshSession {
  user: string;
  tty: string;
  date: string;
  time: string;
  pid: string | null;
  from: string;
}

interface SshSessionsData {
  sessions: SshSession[];
  count: number;
  error?: string;
}

interface FailedUsername {
  username: string;
  attempts: number;
}

interface FailedUsernamesData {
  usernames: FailedUsername[];
  total_unique: number;
  total_attempts: number;
  error?: string;
}

async function fetchSshSessions(): Promise<SshSessionsData> {
  const res = await vpsGet("/ssh-sessions");
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

async function fetchFailedUsernames(): Promise<FailedUsernamesData> {
  const res = await vpsGet("/failed-usernames");
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

export function SshSecurityPanel() {
  const sessions = useQuery<SshSessionsData>({
    queryKey: ["ssh-sessions"],
    queryFn: fetchSshSessions,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const usernames = useQuery<FailedUsernamesData>({
    queryKey: ["failed-usernames"],
    queryFn: fetchFailedUsernames,
    refetchInterval: 60_000,
    staleTime: 50_000,
  });

  const maxAttempts = usernames.data?.usernames?.[0]?.attempts ?? 1;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      {/* Active SSH Sessions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-xl border bg-card p-5 shadow-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Terminal size={15} className="text-[hsl(142_71%_38%)]" />
            <h2 className="text-sm font-semibold text-foreground">Active SSH Sessions</h2>
            {sessions.data && (
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                style={
                  sessions.data.count > 0
                    ? { background: "hsl(0 84% 97%)", color: "hsl(0 84% 55%)", borderColor: "hsl(0 84% 85%)" }
                    : { background: "hsl(142 71% 96%)", color: "hsl(142 71% 38%)", borderColor: "hsl(142 71% 80%)" }
                }
              >
                {sessions.data.count} ACTIVE
              </span>
            )}
          </div>
          <button
            onClick={() => sessions.refetch()}
            disabled={sessions.isFetching}
            className="p-1.5 rounded-lg cursor-pointer hover:bg-muted text-muted-foreground"
          >
            <RefreshCw size={13} className={sessions.isFetching ? "animate-spin" : ""} />
          </button>
        </div>

        {sessions.isLoading && <LoadingDots color="#30d158" />}

        {sessions.data && sessions.data.count === 0 && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Monitor size={28} className="text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">No active SSH sessions</p>
          </div>
        )}

        {sessions.data && sessions.data.count > 0 && (
          <div className="space-y-2">
            {sessions.data.sessions.map((s, i) => (
              <motion.div
                key={`${s.user}-${s.tty}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-3 rounded-lg border bg-destructive/5 border-destructive/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center bg-destructive/15">
                    <User size={13} className="text-destructive" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold font-mono text-destructive">{s.user}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{s.tty}</span>
                    </div>
                    <p className="text-[10px] mt-0.5 font-mono text-muted-foreground">
                      {s.from ? `from ${s.from}` : "local"} · {s.date} {s.time}
                      {s.pid && ` · PID ${s.pid}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-destructive" />
                  <span className="text-[10px] text-destructive">LIVE</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {sessions.isError && (
          <ErrorMsg text="SSH sessions endpoint not available — check VPS backend connection" />
        )}
      </motion.div>

      {/* Failed Login Usernames */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-xl border bg-card p-5 shadow-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert size={15} className="text-[hsl(38_92%_40%)]" />
            <h2 className="text-sm font-semibold text-foreground">Brute-forced Usernames</h2>
          </div>
          <div className="flex items-center gap-2">
            {usernames.data && (
              <span className="text-[10px] font-mono text-muted-foreground">
                {usernames.data.total_attempts.toLocaleString()} total attempts
              </span>
            )}
            <button
              onClick={() => usernames.refetch()}
              disabled={usernames.isFetching}
              className="p-1.5 rounded-lg cursor-pointer hover:bg-muted text-muted-foreground"
            >
              <RefreshCw size={13} className={usernames.isFetching ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {usernames.isLoading && <LoadingDots color="#ff9f0a" />}

        {usernames.data && usernames.data.usernames.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <ShieldAlert size={28} className="text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">No failed login data found</p>
          </div>
        )}

        {usernames.data && usernames.data.usernames.length > 0 && (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#ffffff15 transparent" }}>
            {usernames.data.usernames.map((u, i) => {
              const pct = Math.round((u.attempts / maxAttempts) * 100);
              const isHighRisk = ["root", "admin", "ubuntu", "user", "test", "guest", "pi"].includes(u.username.toLowerCase());
              const barColor = i === 0 ? "hsl(0 84% 55%)" : i < 3 ? "hsl(38 92% 40%)" : "hsl(45 93% 40%)";
              return (
                <motion.div
                  key={u.username}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono w-4 text-right text-muted-foreground">{i + 1}</span>
                      <span className="text-xs font-mono font-semibold text-foreground">{u.username}</span>
                      {isHighRisk && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-destructive/10 text-destructive border border-destructive/25">
                          HIGH RISK
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono font-bold" style={{ color: barColor }}>
                      {u.attempts.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 ml-6">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-muted">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: barColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.03, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {usernames.data && (
          <div className="mt-3 pt-3 border-t flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {usernames.data.total_unique} unique usernames targeted
            </span>
            <div className="flex items-center gap-1">
              <AlertTriangle size={10} className="text-[hsl(38_92%_40%)]" />
              <span className="text-[10px] text-[hsl(38_92%_40%)]">From auth.log</span>
            </div>
          </div>
        )}

        {usernames.isError && (
          <ErrorMsg text="Failed usernames endpoint not available — check VPS backend" />
        )}
      </motion.div>
    </div>
  );
}

function LoadingDots({ color }: { color: string }) {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: color }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}

function ErrorMsg({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 py-6 justify-center text-xs text-destructive">
      <AlertTriangle size={14} />
      <span>{text}</span>
    </div>
  );
}
