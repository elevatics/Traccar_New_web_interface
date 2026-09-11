import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  type MouseEvent as ReactMouseEvent,
} from "react";
import mapboxgl from "mapbox-gl";
import { createPortal } from "react-dom";
import { Vehicle } from "@/types/vehicle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  X,
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  Maximize2,
  Minimize2,
  ChevronDown,
  ExternalLink,
  Zap,
  Fuel,
  Gauge,
  Activity,
  Cpu,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Info,
  Car,
  Clock,
  BarChart3,
  Wrench,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Plot from "react-plotly.js";
import {
  parsePromptRuleCommand,
  upsertSpeedRule,
  upsertStatusRule,
} from "@/services/notificationRulesService";
import { upsertServerRule } from "@/services/serverRuleEngineService";
import {
  createCarMarkerElement,
  getVehicleMarkerColor,
  VEHICLE_MARKER_MAPBOX_OPTIONS,
} from "@/utils/vehicleMapMarker";

type ChatArtifact = {
  csv?: string;
  html?: string;
  plotlyJson?: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  artifacts?: ChatArtifact[];
};

type StreamEvent =
  | { type: "token"; content?: string }
  | { type: "tool_start"; tool?: string }
  | { type: "tool_end"; output?: string }
  | { type: "error"; message?: string }
  | {
      type: "artifact";
      "text/csv"?: string;
      "text/html"?: string;
      "plotly_fig/json"?: string;
    };

interface VehicleAIChatProps {
  vehicle: Vehicle;
  onClose: () => void;
  onDragStart?: (event: ReactMouseEvent) => void;
  useExternalLayout?: boolean;
}

const CHAT_URL = "https://traccar-agent-v2.elevatics.site/api/v1/chat";

const isMapHtml = (html: string) =>
  /leaflet|mapbox|L\.map|google\.maps|openstreetmap|ol\.Map|maplibre/i.test(
    html,
  );

// ─── VehicleSnapshotPanel ─────────────────────────────────────────────────────
function VehicleSnapshotPanel({ vehicle }: { vehicle: Vehicle }) {
  const fuel = vehicle.fuel ?? vehicle.fuelLevel ?? 0;
  const speedKmh = Math.round((vehicle.speed ?? 0) * 1.852);
  const status = vehicle.status ?? "offline";

  const fuelColor =
    fuel >= 50 ? "text-emerald-500" : fuel >= 20 ? "text-amber-500" : "text-red-500";
  const statusColor =
    status === "online" ? "bg-emerald-500" : status === "idle" ? "bg-amber-500" : "bg-slate-400";
  const statusLabel =
    status === "online" ? "Moving" : status === "idle" ? "Idle" : "Offline";

  const metrics = [
    {
      icon: <Fuel className="h-3.5 w-3.5" />,
      label: "Fuel",
      value: `${fuel.toFixed(0)}%`,
      valueClass: fuelColor,
      bg: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
    },
    {
      icon: <Gauge className="h-3.5 w-3.5" />,
      label: "Speed",
      value: `${speedKmh} km/h`,
      valueClass: speedKmh > 0 ? "text-blue-500" : "text-muted-foreground",
      bg: "from-blue-500/10 to-blue-500/5 border-blue-500/20",
    },
    {
      icon: <Activity className="h-3.5 w-3.5" />,
      label: "Engine",
      value: vehicle.ignition ? "ON" : "OFF",
      valueClass: vehicle.ignition ? "text-emerald-500" : "text-muted-foreground",
      bg: "from-violet-500/10 to-violet-500/5 border-violet-500/20",
    },
    {
      icon: <Zap className="h-3.5 w-3.5" />,
      label: "Status",
      value: statusLabel,
      valueClass:
        status === "online"
          ? "text-emerald-500"
          : status === "idle"
            ? "text-amber-500"
            : "text-slate-400",
      bg: "from-slate-500/10 to-slate-500/5 border-slate-500/20",
      dot: statusColor,
    },
  ];

  return (
    <div className="px-3 pb-3 pt-1 flex-shrink-0">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
        <Car className="h-3 w-3" /> Vehicle Snapshot
      </p>
      <div className="grid grid-cols-4 gap-1.5">
        {metrics.map((m) => (
          <div
            key={m.label}
            className={cn(
              "rounded-xl border bg-gradient-to-b px-2 py-2 flex flex-col items-center gap-0.5",
              m.bg,
            )}
          >
            <div className="text-muted-foreground">{m.icon}</div>
            <p className={cn("text-[13px] font-bold leading-tight tabular-nums", m.valueClass)}>
              {m.dot && (
                <span className={cn("inline-block h-1.5 w-1.5 rounded-full mr-1 align-middle", m.dot)} />
              )}
              {m.value}
            </p>
            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide leading-none">
              {m.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AIInsightPanel ───────────────────────────────────────────────────────────
function AIInsightPanel({ vehicle }: { vehicle: Vehicle }) {
  const fuel = vehicle.fuel ?? vehicle.fuelLevel ?? 0;
  const speedKmh = Math.round((vehicle.speed ?? 0) * 1.852);

  const insights: { icon: React.ReactNode; text: string; type: "ok" | "warn" | "info" }[] = [];

  if (fuel > 0 && fuel < 25) {
    insights.push({
      icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />,
      text: `Fuel is critically low at ${fuel.toFixed(0)}%. Consider refuelling soon.`,
      type: "warn",
    });
  } else if (fuel >= 25) {
    insights.push({
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />,
      text: `Fuel level is ${fuel.toFixed(0)}% — sufficient for normal operations.`,
      type: "ok",
    });
  }

  if (vehicle.ignition) {
    insights.push({
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />,
      text: speedKmh > 0 ? `Vehicle is moving at ${speedKmh} km/h. Engine running normally.` : "Engine is ON and vehicle is stationary.",
      type: "ok",
    });
  }

  if (vehicle.status === "offline") {
    insights.push({
      icon: <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />,
      text: "Vehicle is currently offline. Last known position may be outdated.",
      type: "warn",
    });
  }

  if (vehicle.location?.address && vehicle.location.address !== "No GPS position yet") {
    insights.push({
      icon: <Info className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />,
      text: `Last known location: ${vehicle.location.address}`,
      type: "info",
    });
  }

  if (insights.length === 0) {
    insights.push({
      icon: <Info className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />,
      text: "Ask me anything about this vehicle's health, trips, or performance.",
      type: "info",
    });
  }

  return (
    <div className="mx-3 mb-3 flex-shrink-0">
      <div className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/8 to-blue-500/3 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-blue-500/15">
          <div className="h-5 w-5 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-3 w-3 text-blue-500" />
          </div>
          <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
            AI Insights
          </p>
          <div className="ml-auto flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[9px] text-blue-500/70 font-medium">Live</span>
          </div>
        </div>
        <div className="px-3 py-2 space-y-2">
          {insights.slice(0, 3).map((ins, i) => (
            <div key={i} className="flex items-start gap-2">
              {ins.icon}
              <p className="text-[11px] text-foreground/80 leading-relaxed">{ins.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ShimmerLoader ────────────────────────────────────────────────────────────
function ShimmerLoader({ toolProgress }: { toolProgress: string[] }) {
  const steps = toolProgress.length > 0
    ? toolProgress
    : ["Analyzing vehicle telemetry", "Checking driving patterns", "Preparing recommendation"];

  return (
    <div className="flex gap-2.5 items-start">
      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/25 flex items-center justify-center flex-shrink-0 shadow-sm">
        <Sparkles className="h-3.5 w-3.5 text-blue-500 animate-pulse" />
      </div>
      <div className="bg-gradient-to-br from-blue-500/8 to-blue-500/3 border border-blue-500/20 rounded-2xl rounded-tl-sm px-4 py-3 space-y-2.5 shadow-sm min-w-[180px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin flex-shrink-0" />
          <p className="text-[12px] font-semibold text-blue-600 dark:text-blue-400">
            ✦ Analyzing…
          </p>
        </div>
        <div className="space-y-1.5">
          {steps.map((step, idx) => (
            <div key={`${step}-${idx}`} className="flex items-center gap-2">
              <div
                className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0"
                style={{ animationDelay: `${idx * 400}ms` }}
              />
              <span className="text-[11px] text-muted-foreground font-medium">
                {step}
              </span>
            </div>
          ))}
        </div>
        {/* Shimmer bar */}
        <div className="h-1 rounded-full bg-blue-500/15 overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-blue-500/50 animate-shimmer" />
        </div>
      </div>
    </div>
  );
}

// ─── SmartSuggestions ─────────────────────────────────────────────────────────
const SMART_SUGGESTIONS = [
  { icon: <Activity className="h-3 w-3" />, label: "Vehicle health summary" },
  { icon: <Fuel className="h-3 w-3" />, label: "Why is fuel efficiency dropping?" },
  { icon: <Wrench className="h-3 w-3" />, label: "Maintenance recommendations" },
  { icon: <MapPin className="h-3 w-3" />, label: "Where did it travel today?" },
  { icon: <BarChart3 className="h-3 w-3" />, label: "Show route history in chart and map" },
  { icon: <TrendingUp className="h-3 w-3" />, label: "Compare this week's performance" },
];

// ─── Inner chat UI — rendered both in normal and portal-fullscreen mode ───────
function ChatUI({
  vehicle,
  messages,
  input,
  isLoading,
  toolProgress,
  isExpanded,
  showScrollButton,
  messagesEndRef,
  scrollAreaRef,
  inputRef,
  onScroll,
  onSend,
  onInputChange,
  onExpand,
  onClose,
  onDragStart,
  useExternalLayout,
}: {
  vehicle: Vehicle;
  messages: Message[];
  input: string;
  isLoading: boolean;
  toolProgress: string[];
  isExpanded: boolean;
  showScrollButton: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  scrollAreaRef: React.RefObject<HTMLDivElement>;
  inputRef: React.RefObject<HTMLInputElement>;
  onScroll: () => void;
  onSend: () => void;
  onInputChange: (v: string) => void;
  onExpand: () => void;
  onClose: () => void;
  onDragStart?: (e: ReactMouseEvent) => void;
  useExternalLayout: boolean;
}) {
  const [lastSynced, setLastSynced] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setLastSynced((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const syncLabel =
    lastSynced < 60
      ? `${lastSynced}s ago`
      : `${Math.floor(lastSynced / 60)}m ago`;

  const isEmptyState = messages.length <= 1;

  return (
    <Card className="flex flex-col w-full h-full shadow-2xl border border-blue-500/20 overflow-hidden rounded-2xl bg-[#F8FAFC] dark:bg-[#0f1117]">
      {/* ── Premium Header ── */}
      <CardHeader
        className={cn(
          "pb-0 pt-0 px-0 flex-shrink-0 overflow-hidden",
          onDragStart && !isExpanded && "cursor-grab active:cursor-grabbing select-none",
        )}
        onMouseDown={!isExpanded ? onDragStart : undefined}
      >
        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 px-4 pt-3 pb-3">
          <div className="flex items-center justify-between gap-2">
            {/* Left: icon + title + vehicle */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-white leading-none tracking-tight">
                    ✦ AI Fleet Companion
                  </p>
                  <span className="inline-flex items-center gap-1 bg-emerald-400/25 border border-emerald-400/40 rounded-full px-2 py-0.5 flex-shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider">
                      LIVE
                    </span>
                  </span>
                </div>
                <p className="text-xs text-white/75 mt-0.5 truncate">
                  {vehicle.name}
                  {vehicle.plateNumber && vehicle.plateNumber !== "-" && (
                    <span className="text-white/50"> · {vehicle.plateNumber}</span>
                  )}
                </p>
              </div>
            </div>

            {/* Right: sync + expand + close */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="hidden sm:flex items-center gap-1 text-[10px] text-white/60 font-medium mr-1">
                <Clock className="h-3 w-3" />
                {syncLabel}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/15 rounded-lg"
                onClick={onExpand}
                aria-label={isExpanded ? "Exit full screen" : "Expand to full screen"}
              >
                {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/15 rounded-lg"
                onClick={onClose}
                aria-label="Close chat"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden relative">
        {/* ── Vehicle Snapshot + AI Insight (empty state only) ── */}
        {isEmptyState && (
          <div className="flex-shrink-0 pt-3">
            <VehicleSnapshotPanel vehicle={vehicle} />
            <AIInsightPanel vehicle={vehicle} />
          </div>
        )}

        {/* ── Messages ── */}
        <div
          ref={scrollAreaRef}
          onScroll={onScroll}
          className="flex-1 overflow-y-auto px-3 py-3 space-y-4 min-h-0 scroll-smooth"
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-2",
                msg.role === "user"
                  ? "flex-row-reverse items-end"
                  : "flex-row items-start",
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 border shadow-sm",
                  msg.role === "user"
                    ? "bg-blue-500 border-blue-400/50 mt-0.5"
                    : "bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border-blue-500/25",
                )}
              >
                {msg.role === "user" ? (
                  <User className="h-3 w-3 text-white" />
                ) : (
                  <Sparkles className="h-3 w-3 text-blue-500" />
                )}
              </div>

              {/* Bubble */}
              <div
                className={cn(
                  "text-sm",
                  msg.role === "user"
                    ? "bg-blue-500 text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 max-w-[80%] shadow-sm"
                    : "bg-white dark:bg-white/5 text-foreground rounded-2xl rounded-tl-sm border border-blue-500/15 w-full max-w-full px-3.5 py-3 shadow-sm",
                )}
              >
                {msg.role === "assistant" ? (
                  <div className="space-y-3">
                    {/* Tiny AI label on first assistant message only */}
                    {i === 0 && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <Sparkles className="h-3 w-3 text-blue-500" />
                        <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider">
                          AI Fleet Companion
                        </span>
                      </div>
                    )}
                    {(msg.content && msg.content !== "_Working on your request..._") ||
                    !msg.artifacts?.length ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-pre:my-2 prose-code:break-all prose-a:text-blue-500 prose-a:break-all prose-a:no-underline hover:prose-a:underline prose-table:block prose-table:overflow-x-auto prose-headings:text-sm prose-headings:font-semibold prose-strong:text-foreground">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content || "_Working on your request…_"}
                        </ReactMarkdown>
                      </div>
                    ) : null}
                    {msg.artifacts && msg.artifacts.length > 0 && (
                      <ArtifactTabs
                        artifacts={msg.artifacts}
                        isExpanded={isExpanded}
                        vehicle={vehicle}
                      />
                    )}
                    {/* Data freshness tag on assistant messages */}
                    {i > 0 && msg.role === "assistant" && (
                      <div className="flex items-center gap-1 pt-1 border-t border-blue-500/10">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500/60" />
                        <span className="text-[10px] text-muted-foreground">
                          Based on live telemetry · {syncLabel}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Premium shimmer loader */}
          {isLoading && <ShimmerLoader toolProgress={toolProgress} />}

          <div ref={messagesEndRef} />
        </div>

        {/* Scroll-to-bottom button */}
        {showScrollButton && (
          <button
            onClick={() =>
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
            }
            className="absolute bottom-[4.5rem] right-4 z-10 h-7 w-7 rounded-full bg-blue-500 text-white shadow-lg flex items-center justify-center hover:bg-blue-600 transition-all"
            aria-label="Scroll to latest message"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        )}

        {/* ── Smart Suggestions (empty state) ── */}
        {isEmptyState && (
          <div className="px-3 pb-2 pt-2 border-t border-blue-500/10 bg-slate-50 dark:bg-white/[0.04] flex-shrink-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-blue-500" />
              Suggested Insights
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SMART_SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => onInputChange(s.label)}
                  className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-full bg-white dark:bg-slate-800/80 border border-blue-500/20 dark:border-blue-400/20 text-foreground dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-500/15 hover:border-blue-500/40 hover:text-blue-600 dark:hover:text-blue-300 transition-all font-medium shadow-sm"
                >
                  <span className="text-blue-500 dark:text-blue-400">{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Input bar ── */}
        <div className="px-3 pb-3 pt-2.5 border-t border-blue-500/15 bg-white/80 dark:bg-slate-950/60 backdrop-blur-sm shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSend();
            }}
            className="flex gap-2 items-center"
          >
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                placeholder={`Ask anything about ${vehicle.name}…`}
                className="flex-1 h-10 text-sm rounded-xl border-blue-500/25 dark:border-blue-400/20 bg-white dark:bg-slate-800/80 text-foreground dark:text-slate-100 placeholder:text-muted-foreground dark:placeholder:text-slate-400 focus-visible:ring-blue-500/30 focus-visible:border-blue-500/50 pr-2"
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 rounded-xl shrink-0 shadow-sm bg-blue-500 hover:bg-blue-600 text-white border-0"
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

const VehicleAIChat = ({
  vehicle,
  onClose,
  onDragStart,
  useExternalLayout = false,
}: VehicleAIChatProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hello! I'm your **AI Fleet Companion** for **${vehicle.name}**. I have access to live telemetry, trip history, fuel data, and more. What would you like to know?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toolProgress, setToolProgress] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const threadIdRef = useRef(`vehicle-${vehicle.deviceId}-${Date.now()}`);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleScroll = () => {
    const el = scrollAreaRef.current;
    if (!el) return;
    setShowScrollButton(el.scrollHeight - el.scrollTop - el.clientHeight > 80);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const parsedRule = parsePromptRuleCommand(userMsg.content);
    if (parsedRule) {
      if (parsedRule.kind === "speed") {
        const savedRule = upsertSpeedRule({
          deviceId: vehicle.deviceId,
          vehicleName: vehicle.name,
          limit: parsedRule.limit,
        });
        void upsertServerRule({
          deviceId: vehicle.deviceId,
          vehicleName: vehicle.name,
          metric: "speed",
          limit: parsedRule.limit,
          enabled: true,
        });

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              savedRule.limit == null
                ? `Custom speed rule cleared for **${vehicle.name}**. Limit is now **null** and no custom overspeed alerts will trigger.`
                : `Custom speed rule saved for **${vehicle.name}**: alert when speed crosses **${savedRule.limit} km/h**. You will see it in the notification bell.`,
          },
        ]);
        return;
      }

      const savedRule = upsertStatusRule({
        deviceId: vehicle.deviceId,
        vehicleName: vehicle.name,
        //@ts-ignore
        metric: parsedRule.kind,
        //@ts-ignore
        enabled: parsedRule.enabled,
      });
      void upsertServerRule({
        deviceId: vehicle.deviceId,
        vehicleName: vehicle.name,
        metric: parsedRule.kind,
        limit: null,
        //@ts-ignore
        enabled: parsedRule.enabled,
      });
      const statusText =
        savedRule.metric === "device_offline" ? "goes offline" : "comes online";
      const clearText =
        savedRule.metric === "device_offline" ? "offline" : "online";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: savedRule.enabled
            ? `Custom status rule saved for **${vehicle.name}**: notify me when it **${statusText}**. You will see it in the notification bell.`
            : `Custom ${clearText} rule cleared for **${vehicle.name}**.`,
        },
      ]);
      return;
    }

    setIsLoading(true);
    setToolProgress([]);

    // Accumulate the full response locally — nothing is pushed to state until
    // the stream is completely finished, so the loader stays visible throughout.
    let fullText = "";
    const collectedArtifacts: ChatArtifact[] = [];
    let succeeded = false;

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.content,
          thread_id: threadIdRef.current,
          device_id: String(vehicle.deviceId),
          device_name: vehicle.name,
        }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error((errData as any).error || "Failed to get response");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data:")) continue;
          const jsonStr = line.slice(5).trim();
          if (!jsonStr || jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr) as StreamEvent;

            if (parsed.type === "token" && parsed.content) {
              // Skip raw SSE event JSON that the server may accidentally echo as a token
              const c = parsed.content;
              const trimmed = c.trimStart();
              if (trimmed.startsWith("data:") && /"type"\s*:/.test(trimmed)) {
                continue;
              }
              fullText += c;
              continue;
            }
            if (parsed.type === "tool_start" && parsed.tool) {
              // Show tool names in the loader indicator while waiting
              setToolProgress((prev) =>
                prev.includes(parsed.tool!) ? prev : [...prev, parsed.tool!],
              );
              continue;
            }
            if (parsed.type === "tool_end") {
              // Silently discard tool_end events — output is internal, not user-facing
              continue;
            }
            if (parsed.type === "artifact") {
              if (parsed["text/csv"])
                collectedArtifacts.push({ csv: parsed["text/csv"] });
              if (parsed["text/html"])
                collectedArtifacts.push({ html: parsed["text/html"] });
              if (parsed["plotly_fig/json"])
                collectedArtifacts.push({
                  plotlyJson: parsed["plotly_fig/json"],
                });
              continue;
            }
            if (parsed.type === "error")
              throw new Error(parsed.message || "Stream error");
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      succeeded = true;
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, I encountered an error: ${e.message}`,
        },
      ]);
    } finally {
      if (succeeded) {
        // Strip any raw SSE event lines that may have leaked through as token content
        if (fullText) {
          fullText = fullText
            .replace(/(?:^|\n)[ \t]*data:\s*\{"type"[^\n]*/g, "")
            .trim();
        }

        // Optionally append address context
        if (
          fullText &&
          isAddressQuery(userMsg.content) &&
          !containsStreetAddress(fullText) &&
          vehicle.location.address
        ) {
          const coordsLink = `https://www.google.com/maps?q=${vehicle.location.lat},${vehicle.location.lng}`;
          fullText += `\n\n**Latest known address:** ${vehicle.location.address}\n\n[Open in Google Maps](${coordsLink})`;
        }

        const finalMsg: Message = {
          role: "assistant",
          content:
            fullText ||
            (collectedArtifacts.length > 0
              ? ""
              : "No response received. Please try again."),
          ...(collectedArtifacts.length > 0
            ? { artifacts: collectedArtifacts }
            : {}),
        };

        // Commit the complete message all at once
        setMessages((prev) => [...prev, finalMsg]);
      }

      setToolProgress([]);
      setIsLoading(false);
    }
  };

  const sharedProps = {
    vehicle,
    messages,
    input,
    isLoading,
    toolProgress,
    isExpanded,
    showScrollButton,
    messagesEndRef,
    scrollAreaRef,
    inputRef,
    onScroll: handleScroll,
    onSend: sendMessage,
    onInputChange: setInput,
    onExpand: () => setIsExpanded((p) => !p),
    onClose,
    onDragStart: !isExpanded ? onDragStart : undefined,
    useExternalLayout,
  };

  // When expanded, render via portal at document.body so it breaks out of
  // any parent overflow:hidden / stacking context (e.g. FleetMap container)
  if (isExpanded) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
        <div className="w-full h-full max-w-5xl max-h-[95vh]">
          <ChatUI {...sharedProps} />
        </div>
      </div>,
      document.body,
    );
  }

  // Normal (non-expanded) render
  if (useExternalLayout) {
    return <ChatUI {...sharedProps} />;
  }

  return (
    <div className="w-[min(480px,95vw)] h-[min(720px,92vh)]">
      <ChatUI {...sharedProps} />
    </div>
  );
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function isAddressQuery(text: string) {
  return /\b(address|location|where|street|map)\b/i.test(text);
}
function containsStreetAddress(text: string) {
  return /\b(address|street|road|avenue|lane|blvd|drive|sector|block|near)\b/i.test(
    text,
  );
}

// ─── ArtifactTabs ─────────────────────────────────────────────────────────────

function ArtifactTabs({
  artifacts,
  isExpanded,
  vehicle,
}: {
  artifacts: ChatArtifact[];
  isExpanded: boolean;
  vehicle: Vehicle;
}) {
  const combined = useMemo(() => {
    const result: { csv?: string; html?: string; plotlyJsonList: string[] } = {
      plotlyJsonList: [],
    };
    for (const artifact of artifacts) {
      if (artifact.csv && !result.csv) result.csv = artifact.csv;
      if (artifact.html && !result.html) result.html = artifact.html;
      if (artifact.plotlyJson) result.plotlyJsonList.push(artifact.plotlyJson);
    }
    return result;
  }, [artifacts]);

  const hasTable = Boolean(combined.csv);
  const hasChart = combined.plotlyJsonList.length > 0;
  const hasHtml = Boolean(combined.html);
  const htmlIsMap = combined.html ? isMapHtml(combined.html) : false;
  const multiChart = combined.plotlyJsonList.length > 1;
  // Detect if ALL plotly figures are maps (so we can label the tab correctly)
  const allPlotlyAreMaps =
    hasChart && combined.plotlyJsonList.every(isPlotlyMapFigure);
  const anyPlotlyIsMap =
    hasChart && combined.plotlyJsonList.some(isPlotlyMapFigure);

  const tabs: Array<{ key: "table" | "chart" | "html"; label: string }> = [];
  if (hasTable) tabs.push({ key: "table", label: "Table" });
  if (hasChart)
    tabs.push({
      key: "chart",
      label: allPlotlyAreMaps
        ? "🗺 Map"
        : anyPlotlyIsMap
          ? "🗺 Chart"
          : multiChart
            ? `Charts (${combined.plotlyJsonList.length})`
            : "Chart",
    });
  if (hasHtml) tabs.push({ key: "html", label: htmlIsMap ? "🗺 Map" : "HTML" });

  const defaultTab = (hasHtml ? "html" : hasChart ? "chart" : "table") as
    | "table"
    | "chart"
    | "html";
  if (tabs.length === 0) return null;

  const gridCols =
    tabs.length === 1
      ? "grid-cols-1"
      : tabs.length === 2
        ? "grid-cols-2"
        : "grid-cols-3";

  return (
    <Tabs
      defaultValue={defaultTab}
      className="w-full rounded-xl border border-border/70 bg-background/70 overflow-hidden text-xs shadow-sm"
    >
      <TabsList
        className={cn(
          "grid w-full h-9 rounded-b-none rounded-t-xl border-b border-border/60 bg-muted/50",
          gridCols,
        )}
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.key}
            value={tab.key}
            className="text-xs h-8 rounded-none first:rounded-tl-xl last:rounded-tr-xl data-[state=active]:bg-background data-[state=active]:shadow-none font-medium"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="table" className="m-0 p-2.5">
        {combined.csv && <CsvTable csv={combined.csv} />}
      </TabsContent>

      <TabsContent value="chart" className="m-0 p-2.5">
        {multiChart ? (
          // Multiple charts: each in its own titled card, stacked vertically
          <div className="space-y-3">
            {combined.plotlyJsonList.map((pj, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-border/50 overflow-hidden bg-background"
              >
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border-b border-border/40">
                  <span className="h-5 w-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    Chart {idx + 1} of {combined.plotlyJsonList.length}
                  </span>
                </div>
                <PlotlyArtifact
                  plotlyJson={pj}
                  isExpanded={isExpanded}
                  vehicle={vehicle}
                />
              </div>
            ))}
          </div>
        ) : (
          // Single chart
          <PlotlyArtifact
            plotlyJson={combined.plotlyJsonList[0]}
            isExpanded={isExpanded}
            vehicle={vehicle}
          />
        )}
      </TabsContent>

      <TabsContent value="html" className="m-0">
        {combined.html && (
          <HtmlArtifact
            html={combined.html}
            isMap={htmlIsMap}
            isExpanded={isExpanded}
            vehicle={vehicle}
          />
        )}
      </TabsContent>
    </Tabs>
  );
}

// ─── Plotly map-type detection and coord extraction ─────────────────────────

const PLOTLY_MAP_TYPES = new Set([
  "scattermapbox",
  "scattergeo",
  "choropleth",
  "choroplethmapbox",
  "densitymapbox",
  "scattermap",
  "densitymap",
]);

function isPlotlyMapFigure(plotlyJson: string): boolean {
  try {
    const parsed = JSON.parse(plotlyJson) as { data?: { type?: string }[] };
    return (parsed.data ?? []).some((trace) =>
      PLOTLY_MAP_TYPES.has((trace.type ?? "").toLowerCase()),
    );
  } catch {
    return false;
  }
}

interface PlotlyPoint {
  lat: number;
  lng: number;
  color: string; // resolved CSS color
  radius: number; // circle radius in pixels
  label: string; // hover/popup text
  eventTitle: string; // popup header (trace name or layout title)
}

interface PlotlyMapData {
  points: PlotlyPoint[];
  title: string;
}

// Map a normalized 0-1 value through a red gradient (white → orange → dark red)
function speedColor(norm: number): string {
  // low: #fde8d8  mid: #f97316  high: #7f1d1d
  const r = Math.round(253 + (127 - 253) * norm);
  const g = Math.round(232 + (29 - 232) * norm);
  const b = Math.round(216 + (29 - 216) * norm);
  return `rgb(${r},${g},${b})`;
}

function extractPointsFromPlotly(plotlyJson: string): PlotlyMapData {
  const empty: PlotlyMapData = { points: [], title: "" };
  try {
    const parsed = JSON.parse(plotlyJson) as {
      data?: {
        type?: string;
        lat?: (number | string)[];
        lon?: (number | string)[];
        text?: string | string[];
        hovertext?: string | string[];
        customdata?: unknown[][];
        hovertemplate?: string;
        marker?: {
          color?: number[] | string[] | string | number;
          size?: number[] | number;
          colorscale?: unknown;
          cmin?: number;
          cmax?: number;
        };
        name?: string;
      }[];
      layout?: { title?: string | { text?: string } };
    };

    const title =
      typeof parsed.layout?.title === "string"
        ? parsed.layout.title
        : (parsed.layout?.title?.text ?? "");

    const points: PlotlyPoint[] = [];

    for (const trace of parsed.data ?? []) {
      const lats = trace.lat ?? [];
      const lons = trace.lon ?? [];
      // text can be per-point array or single string
      const texts = Array.isArray(trace.text)
        ? trace.text
        : trace.text
          ? [trace.text]
          : [];
      const hovertexts = Array.isArray(trace.hovertext)
        ? trace.hovertext
        : trace.hovertext
          ? [trace.hovertext]
          : [];
      const customdata = trace.customdata ?? [];
      const markerColors = Array.isArray(trace.marker?.color)
        ? (trace.marker!.color as (number | string)[])
        : [];
      const markerSizes = Array.isArray(trace.marker?.size)
        ? (trace.marker!.size as number[])
        : [];
      const defaultSize =
        typeof trace.marker?.size === "number" ? trace.marker.size : 10;

      // Determine numeric color range for normalization
      const numericColors = markerColors.filter(
        (c) => typeof c === "number",
      ) as number[];
      const cmin =
        trace.marker?.cmin ??
        (numericColors.length ? Math.min(...numericColors) : 0);
      const cmax =
        trace.marker?.cmax ??
        (numericColors.length ? Math.max(...numericColors) : 1);
      const range = cmax - cmin || 1;

      const len = Math.min(lats.length, lons.length);
      for (let i = 0; i < len; i++) {
        const lat = Number(lats[i]);
        const lng = Number(lons[i]);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
        if (lat === 0 && lng === 0) continue;

        // Color
        let color = "#ef4444";
        let speedVal: number | null = null;
        if (markerColors.length > i) {
          const mc = markerColors[i];
          if (typeof mc === "number") {
            speedVal = mc;
            color = speedColor((mc - cmin) / range);
          } else if (typeof mc === "string") {
            color = mc;
          }
        } else if (typeof trace.marker?.color === "string") {
          color = trace.marker.color;
        }

        // Size
        const radius =
          markerSizes.length > i ? markerSizes[i] / 2 : defaultSize / 2;

        // Build label — prefer text/hovertext, then parse customdata intelligently
        let label = (texts[i] ?? hovertexts[i] ?? "") as string;
        if (!label && customdata[i]) {
          const row = customdata[i];
          if (Array.isArray(row) && row.length >= 2) {
            // Typical backend customdata: [timestamp, speed_mph, lat?, lon?, course?]
            const parts = row as unknown[];
            const ts = parts[0] != null ? String(parts[0]) : null;
            const spd = parts[1] != null ? Number(parts[1]) : speedVal;
            const clat = parts[2] != null ? Number(parts[2]) : lat;
            const clng = parts[3] != null ? Number(parts[3]) : lng;
            const course = parts[4] != null ? Number(parts[4]) : null;
            const lines: string[] = [];
            if (ts) lines.push(`🕐 ${ts}`);
            if (spd != null && Number.isFinite(spd))
              lines.push(`🚀 Speed: ${spd.toFixed(1)} mph`);
            if (course != null && Number.isFinite(course))
              lines.push(`🧭 Heading: ${course.toFixed(0)}°`);
            lines.push(`📍 ${clat.toFixed(5)}, ${clng.toFixed(5)}`);
            label = lines.join("\n");
          } else {
            label = Array.isArray(row)
              ? (row as unknown[]).filter((v) => v != null).join(" | ")
              : String(row);
          }
        }
        if (!label && speedVal !== null) {
          label = `🚀 Speed: ${speedVal.toFixed(1)} mph\n📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        }
        if (!label) {
          label = `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        }

        points.push({
          lat,
          lng,
          color,
          radius: Math.max(4, Math.min(radius, 20)),
          label,
          eventTitle: trace.name ?? title,
        });
      }
    }

    return { points, title };
  } catch {
    return empty;
  }
}

// ─── coordinate extraction from Leaflet HTML ─────────────────────────────────

function extractCoordsFromHtml(html: string): { lat: number; lng: number }[] {
  const coords: { lat: number; lng: number }[] = [];
  // Match patterns: [lat, lng] or L.latLng(lat, lng) or {lat: X, lng: Y} or {lat: X, lon: Y}
  const patterns = [
    /\[\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*\]/g,
    /L\.latLng\(\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*\)/g,
    /lat["']?\s*:\s*(-?\d+\.\d+)[^\n]*lng["']?\s*:\s*(-?\d+\.\d+)/g,
    /lat["']?\s*:\s*(-?\d+\.\d+)[^\n]*lon["']?\s*:\s*(-?\d+\.\d+)/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (
        Math.abs(lat) <= 90 &&
        Math.abs(lng) <= 180 &&
        !(lat === 0 && lng === 0)
      ) {
        coords.push({ lat, lng });
      }
    }
  }
  // Deduplicate consecutive duplicates
  return coords.filter(
    (c, i) =>
      i === 0 || c.lat !== coords[i - 1].lat || c.lng !== coords[i - 1].lng,
  );
}

// ─── MapboxMapArtifact ────────────────────────────────────────────────────────

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? "";

function MapboxMapArtifact({
  mapData,
  vehicle,
  isExpanded,
}: {
  mapData: PlotlyMapData;
  vehicle: Vehicle;
  isExpanded: boolean;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const height = isExpanded ? 520 : 380;

  // Track fullscreen changes (Esc key, browser button)
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Resize map when fullscreen state changes
  useEffect(() => {
    const t = setTimeout(() => mapRef.current?.resize(), 100);
    return () => clearTimeout(t);
  }, [isFullscreen]);

  const initMap = useCallback(() => {
    if (!containerRef.current || !MAPBOX_TOKEN) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const { points } = mapData;
    const vLat = vehicle.location.lat;
    const vLng = vehicle.location.lng;

    const allLats = points.map((p) => p.lat);
    const allLngs = points.map((p) => p.lng);
    if (vLat !== 0 && vLng !== 0) {
      allLats.push(vLat);
      allLngs.push(vLng);
    }

    const center: [number, number] =
      points.length > 0
        ? [
            points[Math.floor(points.length / 2)].lng,
            points[Math.floor(points.length / 2)].lat,
          ]
        : vLng !== 0
          ? [vLng, vLat]
          : [0, 0];

    const m = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom: 11,
    });
    mapRef.current = m;
    m.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: false }),
      "top-right",
    );

    // Fullscreen control — appended below NavigationControl, same style
    const EXPAND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></svg>`;
    const SHRINK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>`;
    let fsBtn: HTMLButtonElement | null = null;
    const fsControl: mapboxgl.IControl = {
      onAdd() {
        const wrap = document.createElement("div");
        wrap.className = "mapboxgl-ctrl mapboxgl-ctrl-group";
        fsBtn = document.createElement("button");
        fsBtn.type = "button";
        fsBtn.title = "Toggle fullscreen";
        fsBtn.style.cssText =
          "display:flex;align-items:center;justify-content:center;width:29px;height:29px;cursor:pointer;";
        fsBtn.innerHTML = EXPAND_SVG;
        fsBtn.onclick = () => {
          if (!wrapperRef.current) return;
          if (!document.fullscreenElement) {
            wrapperRef.current.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
        };
        const syncIcon = () => {
          if (fsBtn)
            fsBtn.innerHTML = document.fullscreenElement
              ? SHRINK_SVG
              : EXPAND_SVG;
        };
        document.addEventListener("fullscreenchange", syncIcon);
        wrap.appendChild(fsBtn);
        return wrap;
      },
      onRemove() {
        fsBtn = null;
      },
    };
    m.addControl(fsControl, "top-right");

    m.on("load", () => {
      // Build GeoJSON FeatureCollection — one feature per point, color+radius in properties
      const geojson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: points.map((p) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
          properties: {
            color: p.color,
            radius: p.radius,
            label: p.label,
            eventTitle: p.eventTitle,
          },
        })),
      };

      if (points.length > 0) {
        m.addSource("ai-points", { type: "geojson", data: geojson });

        // Outer glow ring
        m.addLayer({
          id: "ai-points-glow",
          type: "circle",
          source: "ai-points",
          paint: {
            "circle-radius": ["*", ["get", "radius"], 1.8],
            "circle-color": ["get", "color"],
            "circle-opacity": 0.25,
            "circle-blur": 0.4,
          },
        });

        // Main filled circle
        m.addLayer({
          id: "ai-points-fill",
          type: "circle",
          source: "ai-points",
          paint: {
            "circle-radius": ["get", "radius"],
            "circle-color": ["get", "color"],
            "circle-opacity": 0.92,
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-opacity": 0.7,
          },
        });

        // Helper: build popup HTML given all data fields
        const buildPopupHtml = (
          dotColor: string,
          eventTitle: string,
          lines: string[],
          address: string,
        ) => {
          // Filter out the raw coords line (starts with 📍 and contains a comma between numbers)
          const filtered = lines.filter((l) => !/^📍\s+-?\d/.test(l));
          const rowsHtml = filtered
            .map((line) => {
              const match = line.match(/^(\S+)\s+(.+)$/);
              const icon = match ? match[1] : "•";
              const text = match ? match[2] : line;
              return `<div style="display:flex;align-items:flex-start;gap:6px;padding:3px 0;border-bottom:1px solid rgba(0,0,0,0.06)">
              <span style="font-size:13px;flex-shrink:0;line-height:1.5">${icon}</span>
              <span style="font-size:12px;color:#374151;line-height:1.5;word-break:break-word">${text}</span>
            </div>`;
            })
            .join("");

          const addrRow = `<div style="display:flex;align-items:flex-start;gap:6px;padding:3px 0">
            <span style="font-size:13px;flex-shrink:0;line-height:1.5">📍</span>
            <span id="ai-popup-addr" style="font-size:12px;color:#374151;line-height:1.5;word-break:break-word">${address}</span>
          </div>`;

          return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-width:200px;max-width:260px">
            <div style="display:flex;align-items:center;gap:7px;padding:6px 0 8px;border-bottom:2px solid ${dotColor}">
              <span style="width:10px;height:10px;border-radius:50%;background:${dotColor};flex-shrink:0;display:inline-block;box-shadow:0 0 0 2px rgba(0,0,0,0.1)"></span>
              <span style="font-size:12px;font-weight:700;color:#111827;letter-spacing:0.01em">${eventTitle}</span>
            </div>
            <div style="padding-top:4px">${rowsHtml}${addrRow}</div>
          </div>`;
        };

        // Click to show popup
        m.on("click", "ai-points-fill", (e) => {
          if (!e.features?.length) return;
          const feat = e.features[0];
          const lngLat = (feat.geometry as GeoJSON.Point).coordinates as [
            number,
            number,
          ];
          const label = (feat.properties?.label as string) || "";
          const dotColor = (feat.properties?.color as string) || "#ef4444";
          const eventTitle =
            (feat.properties?.eventTitle as string) || "Location Event";
          const lines = label.split("\n").filter(Boolean);

          // Show popup immediately with loading state
          popupRef.current?.remove();
          popupRef.current = new mapboxgl.Popup({
            offset: 14,
            maxWidth: "270px",
          })
            .setLngLat(lngLat)
            .setHTML(
              buildPopupHtml(
                dotColor,
                eventTitle,
                lines,
                '<span style="color:#9ca3af;font-style:italic">Loading address…</span>',
              ),
            )
            .addTo(m);

          // Reverse-geocode and update address in-place
          const [lng2, lat2] = lngLat;
          fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng2},${lat2}.json?access_token=${MAPBOX_TOKEN}&types=address,place,locality,neighborhood&limit=1`,
          )
            .then((r) => r.json())
            .then((data: { features?: { place_name?: string }[] }) => {
              const placeName =
                data.features?.[0]?.place_name ??
                `${lat2.toFixed(5)}, ${lng2.toFixed(5)}`;
              // Update the address span inside the already-open popup
              const addrEl = popupRef.current
                ?.getElement()
                ?.querySelector("#ai-popup-addr");
              if (addrEl) {
                addrEl.textContent = placeName;
              } else {
                // Popup was closed — skip
              }
            })
            .catch(() => {
              const addrEl = popupRef.current
                ?.getElement()
                ?.querySelector("#ai-popup-addr");
              if (addrEl)
                addrEl.textContent = `${lat2.toFixed(5)}, ${lng2.toFixed(5)}`;
            });
        });
        m.on("mouseenter", "ai-points-fill", () => {
          m.getCanvas().style.cursor = "pointer";
        });
        m.on("mouseleave", "ai-points-fill", () => {
          m.getCanvas().style.cursor = "";
        });

        // Fit bounds
        const bounds = new mapboxgl.LngLatBounds();
        points.forEach((p) => bounds.extend([p.lng, p.lat]));
        m.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 600 });
      }

      // Current vehicle marker — Google Maps–style car (green online / red offline)
      if (vLat !== 0 && vLng !== 0) {
        const course = Number(vehicle.course) || 0;
        const el = createCarMarkerElement({
          color: getVehicleMarkerColor(vehicle.status),
        });
        el.style.pointerEvents = "auto";
        el.style.cursor = "pointer";
        new mapboxgl.Marker({
          element: el,
          ...VEHICLE_MARKER_MAPBOX_OPTIONS,
        })
          .setLngLat([vLng, vLat])
          .setRotation(course)
          .setPopup(new mapboxgl.Popup({ offset: 14 }).setText(vehicle.name))
          .addTo(m);
      }
    });
  }, [mapData, vehicle]);

  useEffect(() => {
    initMap();
    return () => {
      popupRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [initMap]);

  if (!MAPBOX_TOKEN) {
    return (
      <p className="text-xs text-muted-foreground p-3">
        Mapbox token not configured.
      </p>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="relative bg-black"
      style={{ height: isFullscreen ? "100vh" : `${height}px` }}
    >
      <div ref={containerRef} className="absolute inset-0" />

      {/* Title overlay */}
      {mapData.title && (
        <div className="absolute top-2 left-2 bg-background/85 backdrop-blur-sm rounded px-2 py-1 text-[11px] font-semibold text-foreground shadow pointer-events-none z-10">
          {mapData.title}
        </div>
      )}
    </div>
  );
}

// ─── HtmlArtifact ─────────────────────────────────────────────────────────────

function HtmlArtifact({
  html,
  isMap,
  isExpanded,
  vehicle,
}: {
  html: string;
  isMap: boolean;
  isExpanded: boolean;
  vehicle: Vehicle;
}) {
  // When the artifact is a map, extract coords and render native Mapbox instead
  const extractedMapData = useMemo<PlotlyMapData>(() => {
    if (!isMap) return { points: [], title: "" };
    const raw = extractCoordsFromHtml(html);
    return {
      points: raw.map((c) => ({
        lat: c.lat,
        lng: c.lng,
        color: "#ef4444",
        radius: 7,
        label: "",
        eventTitle: "Location",
      })),
      title: "",
    };
  }, [html, isMap]);

  if (isMap) {
    return (
      <MapboxMapArtifact
        mapData={extractedMapData}
        vehicle={vehicle}
        isExpanded={isExpanded}
      />
    );
  }

  const iframeHeight = isExpanded ? 400 : 280;
  const blobUrl = useMemo(() => {
    try {
      const blob = new Blob([html], { type: "text/html" });
      return URL.createObjectURL(blob);
    } catch {
      return undefined;
    }
  }, [html]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  return (
    <div className="relative">
      <iframe
        title="artifact-html"
        src={blobUrl}
        className="w-full border-0 block"
        style={{ height: `${iframeHeight}px` }}
        sandbox="allow-scripts allow-same-origin"
      />
      {blobUrl && (
        <a
          href={blobUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-2 right-2 flex items-center gap-1 text-[10px] bg-background/80 backdrop-blur-sm border border-border rounded px-2 py-1 hover:bg-accent transition-colors text-muted-foreground"
          title="Open in new tab"
        >
          <ExternalLink className="h-3 w-3" />
          Full screen
        </a>
      )}
    </div>
  );
}

// ─── CsvTable ─────────────────────────────────────────────────────────────────

function CsvTable({ csv }: { csv: string }) {
  const lines = csv.trim().split("\n").filter(Boolean);
  if (lines.length === 0) return null;
  const rows = lines.map((line) => line.split(","));
  const header = rows[0];
  const body = rows.slice(1, 20);

  return (
    <div className="overflow-auto rounded-lg border max-h-72 w-full">
      <table className="w-full min-w-[360px] text-[11px]">
        <thead className="bg-muted/60 sticky top-0">
          <tr>
            {header.map((cell, i) => (
              <th
                key={i}
                className="px-2 py-1.5 text-left font-semibold text-foreground border-b"
              >
                {cell.trim() || "-"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, r) => (
            <tr
              key={r}
              className={r % 2 === 0 ? "bg-background" : "bg-muted/20"}
            >
              {header.map((_, c) => (
                <td key={c} className="px-2 py-1 border-t border-border/40">
                  {row[c]?.trim() || "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── PlotlyArtifact ───────────────────────────────────────────────────────────

function PlotlyArtifact({
  plotlyJson,
  isExpanded,
  vehicle,
}: {
  plotlyJson: string;
  isExpanded: boolean;
  vehicle: Vehicle;
}) {
  // If the backend sent a geo/map Plotly figure, extract coords and render Mapbox instead
  const plotlyIsMap = useMemo(
    () => isPlotlyMapFigure(plotlyJson),
    [plotlyJson],
  );
  const plotlyMapCoords = useMemo(
    () =>
      plotlyIsMap
        ? extractPointsFromPlotly(plotlyJson)
        : { points: [], title: "" },
    [plotlyIsMap, plotlyJson],
  );

  if (plotlyIsMap) {
    return (
      <MapboxMapArtifact
        mapData={plotlyMapCoords}
        vehicle={vehicle}
        isExpanded={isExpanded}
      />
    );
  }

  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const isMobile = containerWidth > 0 && containerWidth < 360;
  const chartHeight = isExpanded ? 420 : isMobile ? 220 : 300;

  const parsed = useMemo(() => {
    try {
      return JSON.parse(plotlyJson) as {
        data?: Record<string, unknown>[];
        layout?: Record<string, unknown>;
        config?: Record<string, unknown>;
      };
    } catch {
      return null;
    }
  }, [plotlyJson]);

  if (!parsed?.data || parsed.data.length === 0) {
    return (
      <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-lg border p-2 bg-background text-[11px]">
        {plotlyJson}
      </pre>
    );
  }

  return (
    <div
      ref={containerRef}
      className="rounded-lg border bg-background overflow-hidden w-full"
    >
      <Plot
        data={parsed.data}
        layout={{
          ...(parsed.layout ?? {}),
          autosize: true,
          font: {
            size: isMobile ? 10 : 12,
            ...(parsed.layout?.font as object | undefined),
          },
          title:
            typeof parsed.layout?.title === "string"
              ? {
                  text: parsed.layout.title,
                  x: 0.02,
                  xanchor: "left",
                  automargin: true,
                  font: { size: isMobile ? 12 : 13 },
                }
              : {
                  x: 0.02,
                  xanchor: "left",
                  automargin: true,
                  ...(parsed.layout?.title as object | undefined),
                },
          margin: {
            l: isMobile ? 52 : 64,
            r: 16,
            t: isMobile ? 56 : 60,
            b: isMobile ? 60 : 68,
            pad: 6,
            ...(parsed.layout?.margin as object | undefined),
          },
          xaxis: {
            ...((parsed.layout?.xaxis as object | undefined) ?? {}),
            automargin: true,
            tickangle: isMobile ? -30 : 0,
            nticks: isMobile ? 4 : 7,
            tickfont: { size: isMobile ? 9 : 10 },
          },
          yaxis: {
            ...((parsed.layout?.yaxis as object | undefined) ?? {}),
            automargin: true,
            tickfont: { size: isMobile ? 9 : 10 },
          },
          legend: {
            orientation: "h",
            y: -0.24,
            x: 0,
            font: { size: 10 },
            ...((parsed.layout?.legend as object | undefined) ?? {}),
          },
          paper_bgcolor: "rgba(0,0,0,0)",
          plot_bgcolor: "rgba(0,0,0,0)",
        }}
        config={{
          responsive: true,
          displaylogo: false,
          displayModeBar: "hover",
          modeBarButtonsToRemove: ["lasso2d", "select2d", "sendDataToCloud"],
          scrollZoom: false,
          ...(parsed.config ?? {}),
        }}
        style={{ width: "100%", height: `${chartHeight}px` }}
        useResizeHandler
      />
    </div>
  );
}

export default VehicleAIChat;
