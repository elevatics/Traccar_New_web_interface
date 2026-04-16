import { useState, useRef, useEffect, useMemo } from 'react';
import { Vehicle } from '@/types/vehicle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Send, Bot, User, Loader2, Sparkles, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Plot from 'react-plotly.js';

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
}

const CHAT_URL = 'https://api1001.elevatics.online/v3/chat';

const VehicleAIChat = ({ vehicle, onClose }: VehicleAIChatProps) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: `Hi! I'm your AI Fleet Companion for **${vehicle.name}** (${vehicle.plateNumber}). Ask me anything about this vehicle — status, fuel, maintenance, driving patterns, or recommendations!` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toolProgress, setToolProgress] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setToolProgress([]);

    let assistantSoFar = '';
    let doneStream = false;

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMsg.content,
          thread_id: `vehicle-${vehicle.deviceId}`,
          device_id: String(vehicle.deviceId),
          device_name: vehicle.name,
        }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to get response');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && prev.length > 1 && last.content !== messages[0]?.content) {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return [...prev, { role: 'assistant', content: assistantSoFar }];
        });
      };

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
          if (jsonStr === '' || jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr) as StreamEvent;

            if (parsed.type === 'token' && parsed.content) {
              upsertAssistant(parsed.content);
              continue;
            }

            if (parsed.type === 'tool_start' && parsed.tool) {
              setToolProgress(prev => [...prev, parsed.tool!]);
              continue;
            }

            if (parsed.type === 'tool_end' && parsed.output) {
              upsertAssistant(`\n\n${parsed.output}`);
              continue;
            }

            if (parsed.type === 'artifact') {
              const artifacts: ChatArtifact[] = [];
              if (parsed['text/csv']) artifacts.push({ csv: parsed['text/csv'] });
              if (parsed['text/html']) artifacts.push({ html: parsed['text/html'] });
              if (parsed['plotly_fig/json']) artifacts.push({ plotlyJson: parsed['plotly_fig/json'] });
              if (artifacts.length > 0) {
                setMessages(prev => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last?.role === 'assistant') {
                    last.artifacts = [...(last.artifacts ?? []), ...artifacts];
                  } else {
                    next.push({ role: 'assistant', content: '', artifacts });
                  }
                  return next;
                });
              }
              continue;
            }

            if (parsed.type === 'error') {
              throw new Error(parsed.message || 'Stream error');
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
      doneStream = true;
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I encountered an error: ${e.message}` }]);
    } finally {
      const addressRequested = isAddressQuery(userMsg.content);
      if (doneStream && assistantSoFar && addressRequested && !containsStreetAddress(assistantSoFar) && vehicle.location.address) {
        const coordsLink = `https://www.google.com/maps?q=${vehicle.location.lat},${vehicle.location.lng}`;
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role !== 'assistant') return next;
          return [
            ...next.slice(0, -1),
            {
              ...last,
              content: `${last.content}\n\n**Latest known address:** ${vehicle.location.address}\n\n[Open in Google Maps](${coordsLink})`,
            },
          ];
        });
      }
      if (!doneStream && !assistantSoFar) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'No response received. Please try again.' }]);
      }
      setToolProgress([]);
      setIsLoading(false);
    }
  };

  const quickQuestions = [
    'Vehicle health summary',
    'Fuel efficiency analysis',
    'Maintenance recommendations',
  ];

  return (
    <Card
      className={cn(
        'flex flex-col shadow-2xl border-2 border-primary/20 overflow-hidden',
        isExpanded
          ? 'fixed inset-3 sm:inset-6 z-50 w-auto h-auto'
          : 'w-[420px] max-w-[95vw] h-[520px] sm:h-[560px]'
      )}
    >
      <CardHeader className="pb-2 flex-shrink-0 bg-gradient-to-r from-primary/10 to-primary/5 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm">AI Fleet Companion</CardTitle>
              <p className="text-xs text-muted-foreground">{vehicle.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsExpanded(prev => !prev)}
              aria-label={isExpanded ? 'Collapse chat window' : 'Expand chat window'}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7" aria-label="Close chat">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-3 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin pr-1 mb-3 min-h-0">
          {messages.map((msg, i) => (
            <div key={i} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="h-3 w-3 text-primary" />
                </div>
              )}
              <div className={cn(
                'rounded-xl px-3 py-2 text-sm max-w-[80%]',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              )}>
                {msg.role === 'assistant' ? (
                  <div className="space-y-2">
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-pre:my-2 prose-code:break-all prose-a:text-primary prose-a:break-all prose-a:no-underline hover:prose-a:underline prose-table:block prose-table:overflow-x-auto">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content || '_Working on your request..._'}
                      </ReactMarkdown>
                    </div>
                    {msg.artifacts && msg.artifacts.length > 0 && (
                      <ArtifactTabs artifacts={msg.artifacts} summary={msg.content} />
                    )}
                  </div>
                ) : (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="h-3 w-3" />
                </div>
              )}
            </div>
          ))}
          {isLoading && assistantNotStarted(messages) && (
            <div className="flex gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Bot className="h-3 w-3 text-primary" />
              </div>
              <div className="bg-muted rounded-xl px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          {isLoading && toolProgress.length > 0 && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-xl px-3 py-2 max-w-[80%]">
                <div className="text-xs text-muted-foreground mb-1">Tools running</div>
                <div className="flex flex-wrap gap-1.5">
                  {toolProgress.map((tool, i) => (
                    <span key={`${tool}-${i}`} className="rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[11px]">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Questions */}
        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {quickQuestions.map(q => (
              <button
                key={q}
                onClick={() => { setInput(q); }}
                className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this vehicle..."
            className="flex-1 h-9 text-sm"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" className="h-9 w-9" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

function assistantNotStarted(messages: Message[]) {
  const last = messages[messages.length - 1];
  return last?.role === 'user';
}

function isAddressQuery(text: string) {
  return /\b(address|location|where|street|map)\b/i.test(text);
}

function containsStreetAddress(text: string) {
  return /\b(address|street|road|avenue|lane|blvd|drive|sector|block|near)\b/i.test(text);
}

function ArtifactTabs({ artifacts, summary }: { artifacts: ChatArtifact[]; summary: string }) {
  const combined = useMemo(() => {
    const result: ChatArtifact = {};
    for (const artifact of artifacts) {
      if (artifact.csv && !result.csv) result.csv = artifact.csv;
      if (artifact.html && !result.html) result.html = artifact.html;
      if (artifact.plotlyJson && !result.plotlyJson) result.plotlyJson = artifact.plotlyJson;
    }
    return result;
  }, [artifacts]);

  const hasSummary = Boolean(summary?.trim());
  const hasTable = Boolean(combined.csv);
  const hasChart = Boolean(combined.plotlyJson);
  const hasHtml = Boolean(combined.html);

  const tabs: Array<{ key: 'summary' | 'table' | 'chart' | 'html'; label: string }> = [];
  if (hasSummary) tabs.push({ key: 'summary', label: 'Summary' });
  if (hasTable) tabs.push({ key: 'table', label: 'Table' });
  if (hasChart) tabs.push({ key: 'chart', label: 'Chart' });
  if (hasHtml) tabs.push({ key: 'html', label: 'HTML' });

  const defaultTab = tabs[0]?.key;
  if (!defaultTab) return null;

  return (
    <Tabs defaultValue={defaultTab} className="rounded-md border bg-background/70 p-2 text-xs">
      <TabsList className={cn('grid w-full', tabs.length === 1 ? 'grid-cols-1' : tabs.length === 2 ? 'grid-cols-2' : tabs.length === 3 ? 'grid-cols-3' : 'grid-cols-4')}>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.key} value={tab.key}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="summary" className="mt-2">
        <div className="text-muted-foreground">Assistant explanation is shown above.</div>
      </TabsContent>

      <TabsContent value="table" className="mt-2">
        {combined.csv && <CsvTable csv={combined.csv} />}
      </TabsContent>

      <TabsContent value="chart" className="mt-2">
        {combined.plotlyJson && <PlotlyArtifact plotlyJson={combined.plotlyJson} />}
      </TabsContent>

      <TabsContent value="html" className="mt-2">
        {combined.html && (
          <div>
            <div className="max-h-64 overflow-auto rounded border p-2 bg-background">
              <iframe
                title="artifact-html"
                className="w-full min-h-40 border-0"
                srcDoc={combined.html}
                sandbox=""
              />
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function CsvTable({ csv }: { csv: string }) {
  const lines = csv.trim().split('\n').filter(Boolean);
  if (lines.length === 0) return null;
  const rows = lines.map((line) => line.split(','));
  const header = rows[0];
  const body = rows.slice(1, 11);

  return (
    <div className="space-y-1">
      <div className="font-medium">Table</div>
      <div className="overflow-auto rounded border max-h-56">
        <table className="w-full min-w-[420px] text-[11px]">
          <thead className="bg-muted/50">
            <tr>
              {header.map((cell, i) => (
                <th key={i} className="px-2 py-1 text-left font-medium">
                  {cell || '-'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, r) => (
              <tr key={r} className="border-t">
                {header.map((_, c) => (
                  <td key={c} className="px-2 py-1">
                    {row[c] || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlotlyArtifact({ plotlyJson }: { plotlyJson: string }) {
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 640 : false));

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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
      <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words rounded border p-2 bg-background">
        {plotlyJson}
      </pre>
    );
  }

  return (
    <div className="rounded border bg-background p-1 overflow-hidden">
      <Plot
        data={parsed.data}
        layout={{
          ...(parsed.layout ?? {}),
          autosize: true,
          font: { size: isMobile ? 10 : 12, ...(parsed.layout?.font as object | undefined) },
          title: typeof parsed.layout?.title === 'string'
            ? { text: parsed.layout.title, x: 0.02, xanchor: 'left', automargin: true, font: { size: isMobile ? 12 : 14 } }
            : { x: 0.02, xanchor: 'left', automargin: true, ...(parsed.layout?.title as object | undefined), font: { size: isMobile ? 12 : 14, ...((parsed.layout?.title as any)?.font ?? {}) } },
          margin: { l: isMobile ? 44 : 56, r: 14, t: isMobile ? 52 : 56, b: isMobile ? 52 : 54, ...(parsed.layout?.margin as object | undefined) },
          xaxis: { automargin: true, tickangle: isMobile ? -20 : 0, ...((parsed.layout?.xaxis as object | undefined) ?? {}) },
          yaxis: { automargin: true, ...((parsed.layout?.yaxis as object | undefined) ?? {}) },
          legend: { orientation: 'h', y: -0.22, x: 0, ...((parsed.layout?.legend as object | undefined) ?? {}) },
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
        }}
        config={{ responsive: true, displaylogo: false, displayModeBar: false, scrollZoom: false, ...(parsed.config ?? {}) }}
        style={{ width: '100%', height: isMobile ? '240px' : '320px' }}
        useResizeHandler
      />
    </div>
  );
}

export default VehicleAIChat;
