import { useState, useRef, useEffect } from 'react';
import { Vehicle } from '@/types/vehicle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type Message = { role: 'user' | 'assistant'; content: string };

interface VehicleAIChatProps {
  vehicle: Vehicle;
  onClose: () => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vehicle-chat`;

const VehicleAIChat = ({ vehicle, onClose }: VehicleAIChatProps) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: `Hi! I'm your AI Fleet Companion for **${vehicle.name}** (${vehicle.plateNumber}). Ask me anything about this vehicle — status, fuel, maintenance, driving patterns, or recommendations!` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const vehicleContext = {
    name: vehicle.name,
    plateNumber: vehicle.plateNumber,
    driver: vehicle.driver,
    status: vehicle.status,
    speed: vehicle.speed,
    fuel: vehicle.fuel,
    odometer: vehicle.odometer,
    locationAddress: vehicle.location.address,
    lat: vehicle.location.lat,
    lng: vehicle.location.lng,
    ignition: vehicle.ignition,
    motion: vehicle.motion,
    altitude: vehicle.altitude,
    lastUpdate: vehicle.lastUpdate,
    coolantTemp: vehicle.coolantTemp,
    rpm: vehicle.rpm,
    fuelConsumption: vehicle.fuelConsumption,
    totalDistance: vehicle.totalDistance,
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].filter(m => m.role !== 'assistant' || messages.indexOf(m) > 0 ? true : false).map(m => ({ role: m.role, content: m.content })),
          vehicleContext,
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
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I encountered an error: ${e.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickQuestions = [
    'Vehicle health summary',
    'Fuel efficiency analysis',
    'Maintenance recommendations',
  ];

  return (
    <Card className="w-[420px] max-w-[95vw] h-[520px] flex flex-col shadow-2xl border-2 border-primary/20">
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
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-3 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin pr-1 mb-3">
          {messages.map((msg, i) => (
            <div key={i} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="h-3 w-3 text-primary" />
                </div>
              )}
              <div className={cn(
                'rounded-xl px-3 py-2 text-sm max-w-[80%] whitespace-pre-wrap',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              )}>
                {msg.content}
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

export default VehicleAIChat;
