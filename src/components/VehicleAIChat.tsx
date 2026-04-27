import { useState, useRef, useEffect, useMemo, type MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { Vehicle } from '@/types/vehicle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Plot from 'react-plotly.js';
import {
  parsePromptRuleCommand,
  upsertSpeedRule,
  upsertStatusRule,
} from '@/services/notificationRulesService';
import { upsertServerRule } from '@/services/serverRuleEngineService';

type ChatArtifact = {
  csv?: string;
  html?: string;
  plotlyJson?: string;
};

type Message = { role: 'user' | 'assistant'; content: string; artifacts?: ChatArtifact[] };

type StreamEvent =
  | { type: 'token'; content?: string }
  | { type: 'tool_start'; tool?: string }
  | { type: 'tool_end'; output?: string }
  | { type: 'error'; message?: string }
  | { type: 'artifact'; 'text/csv'?: string; 'text/html'?: string; 'plotly_fig/json'?: string };

interface VehicleAIChatProps {
  vehicle: Vehicle;
  onClose: () => void;
  onDragStart?: (event: ReactMouseEvent) => void;
  useExternalLayout?: boolean;
}

const CHAT_URL = 'https://api1001.elevatics.online/v3/chat';

const isMapHtml = (html: string) =>
  /leaflet|mapbox|L\.map|google\.maps|openstreetmap|ol\.Map|maplibre/i.test(html);

// Inner chat UI — rendered both in normal and portal-fullscreen mode
function ChatUI({
  vehicle,
  messages,
  input,
  isLoading,
  toolProgress,
  isExpanded,
  showScrollButton,
  quickQuestions,
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
  quickQuestions: string[];
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
  return (
    <Card className="flex flex-col w-full h-full shadow-2xl border border-primary/20 overflow-hidden bg-background rounded-xl">
      {/* Header */}
      <CardHeader
        className={cn(
          'pb-0 pt-3 px-4 flex-shrink-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border',
          onDragStart && !isExpanded && 'cursor-grab active:cursor-grabbing select-none'
        )}
        onMouseDown={!isExpanded ? onDragStart : undefined}
      >
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center shadow-sm flex-shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">AI Fleet Companion</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
                {vehicle.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Expand/collapse — always visible */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onExpand}
              aria-label={isExpanded ? 'Exit full screen' : 'Expand to full screen'}
              title={isExpanded ? 'Exit full screen' : 'Expand to full screen'}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onClose}
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden relative">
        {/* Messages */}
        <div
          ref={scrollAreaRef}
          onScroll={onScroll}
          className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0 scroll-smooth"
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex gap-2.5 items-end',
                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5 border',
                  msg.role === 'user'
                    ? 'bg-primary border-primary/30'
                    : 'bg-muted border-border'
                )}
              >
                {msg.role === 'user' ? (
                  <User className="h-3.5 w-3.5 text-primary-foreground" />
                ) : (
                  <Bot className="h-3.5 w-3.5 text-primary" />
                )}
              </div>

              {/* Bubble */}
              <div
                className={cn(
                  'rounded-2xl px-4 py-2.5 text-sm shadow-sm',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm max-w-[80%]'
                    : 'bg-muted text-foreground rounded-bl-sm border border-border/60 w-full max-w-full'
                )}
              >
                {msg.role === 'assistant' ? (
                  <div className="space-y-2.5">
                    {/* Text content — hide placeholder once artifacts exist */}
                    {(msg.content && msg.content !== '_Working on your request..._') || !msg.artifacts?.length ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-pre:my-2 prose-code:break-all prose-a:text-primary prose-a:break-all prose-a:no-underline hover:prose-a:underline prose-table:block prose-table:overflow-x-auto prose-headings:text-sm prose-headings:font-semibold">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content || '_Working on your request…_'}
                        </ReactMarkdown>
                      </div>
                    ) : null}
                    {msg.artifacts && msg.artifacts.length > 0 && (
                      <ArtifactTabs artifacts={msg.artifacts} isExpanded={isExpanded} />
                    )}
                  </div>
                ) : (
                  <span className="whitespace-pre-wrap leading-relaxed">{msg.content}</span>
                )}
              </div>
            </div>
          ))}

          {/* Loader — visible the entire time the API is working */}
          {isLoading && (
            <div className="flex gap-2.5 items-end">
              <div className="h-7 w-7 rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="bg-muted border border-border/60 rounded-2xl rounded-bl-sm px-4 py-3 space-y-2">
                {/* Animated dots */}
                <div className="flex gap-1.5 items-center">
                  <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
                  <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                  <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
                </div>
                {/* Tool progress chips shown beneath dots */}
                {toolProgress.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground font-medium">Running analysis…</p>
                    <div className="flex flex-wrap gap-1.5">
                      {toolProgress.map((tool, idx) => (
                        <span
                          key={`${tool}-${idx}`}
                          className="rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[11px] font-medium flex items-center gap-1"
                        >
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Scroll-to-bottom button */}
        {showScrollButton && (
          <button
            onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="absolute bottom-[4.5rem] right-4 z-10 h-8 w-8 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all"
            aria-label="Scroll to latest message"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        )}

        {/* Quick questions */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2 pt-1 border-t border-border/40">
            <p className="text-xs text-muted-foreground mb-1.5">Suggested questions:</p>
            <div className="flex flex-wrap gap-1.5">
              {quickQuestions.map(q => (
                <button
                  key={q}
                  onClick={() => onInputChange(q)}
                  className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20 font-medium"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="px-4 pb-4 pt-2 border-t border-border bg-background/80 backdrop-blur-sm shrink-0">
          <form
            onSubmit={(e) => { e.preventDefault(); onSend(); }}
            className="flex gap-2 items-center"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder="Ask about this vehicle…"
              className="flex-1 h-10 text-sm rounded-xl border-border/70 bg-muted/40 focus-visible:ring-primary/50"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 rounded-xl shrink-0"
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

const VehicleAIChat = ({ vehicle, onClose, onDragStart, useExternalLayout = false }: VehicleAIChatProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hi! I'm your **AI Fleet Companion** for **${vehicle.name}** (${vehicle.plateNumber}). Ask me anything about this vehicle — status, fuel, maintenance, driving patterns, or recommendations!`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toolProgress, setToolProgress] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleScroll = () => {
    const el = scrollAreaRef.current;
    if (!el) return;
    setShowScrollButton(el.scrollHeight - el.scrollTop - el.clientHeight > 80);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    const parsedRule = parsePromptRuleCommand(userMsg.content);
    if (parsedRule) {
      if (parsedRule.kind === 'speed') {
        const savedRule = upsertSpeedRule({
          deviceId: vehicle.deviceId,
          vehicleName: vehicle.name,
          limit: parsedRule.limit,
        });
        void upsertServerRule({
          deviceId: vehicle.deviceId,
          vehicleName: vehicle.name,
          metric: 'speed',
          limit: parsedRule.limit,
          enabled: true,
        });

        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
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
        metric: parsedRule.kind,
        enabled: parsedRule.enabled,
      });
      void upsertServerRule({
        deviceId: vehicle.deviceId,
        vehicleName: vehicle.name,
        metric: parsedRule.kind,
        limit: null,
        enabled: parsedRule.enabled,
      });
      const statusText = savedRule.metric === 'device_offline' ? 'goes offline' : 'comes online';
      const clearText = savedRule.metric === 'device_offline' ? 'offline' : 'online';

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
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
    let fullText = '';
    const collectedArtifacts: ChatArtifact[] = [];
    let succeeded = false;

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          thread_id: `vehicle-${vehicle.deviceId}`,
          device_id: String(vehicle.deviceId),
          device_name: vehicle.name,
        }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error((errData as any).error || 'Failed to get response');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data:')) continue;
          const jsonStr = line.slice(5).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr) as StreamEvent;

            if (parsed.type === 'token' && parsed.content) {
              fullText += parsed.content;
              continue;
            }
            if (parsed.type === 'tool_start' && parsed.tool) {
              // Show tool names in the loader indicator while waiting
              setToolProgress(prev =>
                prev.includes(parsed.tool!) ? prev : [...prev, parsed.tool!]
              );
              continue;
            }
            if (parsed.type === 'tool_end' && parsed.output) {
              fullText += `\n\n${parsed.output}`;
              continue;
            }
            if (parsed.type === 'artifact') {
              if (parsed['text/csv'])        collectedArtifacts.push({ csv: parsed['text/csv'] });
              if (parsed['text/html'])       collectedArtifacts.push({ html: parsed['text/html'] });
              if (parsed['plotly_fig/json']) collectedArtifacts.push({ plotlyJson: parsed['plotly_fig/json'] });
              continue;
            }
            if (parsed.type === 'error') throw new Error(parsed.message || 'Stream error');
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      succeeded = true;
    } catch (e: any) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Sorry, I encountered an error: ${e.message}` },
      ]);
    } finally {
      if (succeeded) {
        // Optionally append address context
        if (fullText && isAddressQuery(userMsg.content) && !containsStreetAddress(fullText) && vehicle.location.address) {
          const coordsLink = `https://www.google.com/maps?q=${vehicle.location.lat},${vehicle.location.lng}`;
          fullText += `\n\n**Latest known address:** ${vehicle.location.address}\n\n[Open in Google Maps](${coordsLink})`;
        }

        const finalMsg: Message = {
          role: 'assistant',
          content: fullText || (collectedArtifacts.length > 0 ? '' : 'No response received. Please try again.'),
          ...(collectedArtifacts.length > 0 ? { artifacts: collectedArtifacts } : {}),
        };

        // Commit the complete message all at once
        setMessages(prev => [...prev, finalMsg]);
      }

      setToolProgress([]);
      setIsLoading(false);
    }
  };

  const quickQuestions = [
    'Vehicle health summary',
    'Fuel efficiency analysis',
    'Maintenance recommendations',
    'Show route history in chart and map',
  ];

  const sharedProps = {
    vehicle, messages, input, isLoading, toolProgress, isExpanded,
    showScrollButton, quickQuestions,
    messagesEndRef, scrollAreaRef, inputRef,
    onScroll: handleScroll,
    onSend: sendMessage,
    onInputChange: setInput,
    onExpand: () => setIsExpanded(p => !p),
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
      document.body
    );
  }

  // Normal (non-expanded) render
  if (useExternalLayout) {
    return <ChatUI {...sharedProps} />;
  }

  return (
    <div className="w-[min(440px,95vw)] h-[min(580px,90vh)]">
      <ChatUI {...sharedProps} />
    </div>
  );
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function isAddressQuery(text: string) {
  return /\b(address|location|where|street|map)\b/i.test(text);
}
function containsStreetAddress(text: string) {
  return /\b(address|street|road|avenue|lane|blvd|drive|sector|block|near)\b/i.test(text);
}

// ─── ArtifactTabs ─────────────────────────────────────────────────────────────

function ArtifactTabs({ artifacts, isExpanded }: { artifacts: ChatArtifact[]; isExpanded: boolean }) {
  const combined = useMemo(() => {
    const result: ChatArtifact = {};
    for (const artifact of artifacts) {
      if (artifact.csv && !result.csv) result.csv = artifact.csv;
      if (artifact.html && !result.html) result.html = artifact.html;
      if (artifact.plotlyJson && !result.plotlyJson) result.plotlyJson = artifact.plotlyJson;
    }
    return result;
  }, [artifacts]);

  const hasTable = Boolean(combined.csv);
  const hasChart = Boolean(combined.plotlyJson);
  const hasHtml = Boolean(combined.html);
  const htmlIsMap = combined.html ? isMapHtml(combined.html) : false;

  const tabs: Array<{ key: 'table' | 'chart' | 'html'; label: string }> = [];
  if (hasTable) tabs.push({ key: 'table', label: 'Table' });
  if (hasChart) tabs.push({ key: 'chart', label: 'Chart' });
  if (hasHtml) tabs.push({ key: 'html', label: htmlIsMap ? '🗺 Map' : 'HTML' });

  const defaultTab = (hasHtml ? 'html' : hasChart ? 'chart' : 'table') as 'table' | 'chart' | 'html';
  if (tabs.length === 0) return null;

  const gridCols = tabs.length === 1 ? 'grid-cols-1' : tabs.length === 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <Tabs defaultValue={defaultTab} className="w-full rounded-xl border border-border bg-background/60 overflow-hidden text-xs">
      <TabsList className={cn('grid w-full h-9 rounded-b-none rounded-t-xl border-b border-border bg-muted/60', gridCols)}>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.key} value={tab.key} className="text-xs h-8 rounded-none first:rounded-tl-xl last:rounded-tr-xl">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="table" className="m-0 p-2">
        {combined.csv && <CsvTable csv={combined.csv} />}
      </TabsContent>

      <TabsContent value="chart" className="m-0 p-2">
        {combined.plotlyJson && <PlotlyArtifact plotlyJson={combined.plotlyJson} isExpanded={isExpanded} />}
      </TabsContent>

      <TabsContent value="html" className="m-0">
        {combined.html && <HtmlArtifact html={combined.html} isMap={htmlIsMap} isExpanded={isExpanded} />}
      </TabsContent>
    </Tabs>
  );
}

// ─── HtmlArtifact ─────────────────────────────────────────────────────────────

function HtmlArtifact({ html, isMap, isExpanded }: { html: string; isMap: boolean; isExpanded: boolean }) {
  const iframeHeight = isMap ? (isExpanded ? 520 : 380) : (isExpanded ? 400 : 280);
  const blobUrl = useMemo(() => {
    try {
      const blob = new Blob([html], { type: 'text/html' });
      return URL.createObjectURL(blob);
    } catch {
      return undefined;
    }
  }, [html]);

  useEffect(() => {
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
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
  const lines = csv.trim().split('\n').filter(Boolean);
  if (lines.length === 0) return null;
  const rows = lines.map((line) => line.split(','));
  const header = rows[0];
  const body = rows.slice(1, 20);

  return (
    <div className="overflow-auto rounded-lg border max-h-72 w-full">
      <table className="w-full min-w-[360px] text-[11px]">
        <thead className="bg-muted/60 sticky top-0">
          <tr>
            {header.map((cell, i) => (
              <th key={i} className="px-2 py-1.5 text-left font-semibold text-foreground border-b">
                {cell.trim() || '-'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, r) => (
            <tr key={r} className={r % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
              {header.map((_, c) => (
                <td key={c} className="px-2 py-1 border-t border-border/40">
                  {row[c]?.trim() || '-'}
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

function PlotlyArtifact({ plotlyJson, isExpanded }: { plotlyJson: string; isExpanded: boolean }) {
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
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
    } catch { return null; }
  }, [plotlyJson]);

  if (!parsed?.data || parsed.data.length === 0) {
    return (
      <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-lg border p-2 bg-background text-[11px]">
        {plotlyJson}
      </pre>
    );
  }

  return (
    <div ref={containerRef} className="rounded-lg border bg-background overflow-hidden w-full">
      <Plot
        data={parsed.data}
        layout={{
          ...(parsed.layout ?? {}),
          autosize: true,
          font: { size: isMobile ? 10 : 12, ...(parsed.layout?.font as object | undefined) },
          title:
            typeof parsed.layout?.title === 'string'
              ? { text: parsed.layout.title, x: 0.02, xanchor: 'left', automargin: true, font: { size: isMobile ? 12 : 13 } }
              : { x: 0.02, xanchor: 'left', automargin: true, ...(parsed.layout?.title as object | undefined) },
          margin: { l: isMobile ? 52 : 64, r: 16, t: isMobile ? 56 : 60, b: isMobile ? 60 : 68, pad: 6, ...(parsed.layout?.margin as object | undefined) },
          xaxis: { ...((parsed.layout?.xaxis as object | undefined) ?? {}), automargin: true, tickangle: isMobile ? -30 : 0, nticks: isMobile ? 4 : 7, tickfont: { size: isMobile ? 9 : 10 } },
          yaxis: { ...((parsed.layout?.yaxis as object | undefined) ?? {}), automargin: true, tickfont: { size: isMobile ? 9 : 10 } },
          legend: { orientation: 'h', y: -0.24, x: 0, font: { size: 10 }, ...((parsed.layout?.legend as object | undefined) ?? {}) },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
        }}
        config={{
          responsive: true,
          displaylogo: false,
          displayModeBar: 'hover',
          modeBarButtonsToRemove: ['lasso2d', 'select2d', 'sendDataToCloud'],
          scrollZoom: false,
          ...(parsed.config ?? {}),
        }}
        style={{ width: '100%', height: `${chartHeight}px` }}
        useResizeHandler
      />
    </div>
  );
}

export default VehicleAIChat;
