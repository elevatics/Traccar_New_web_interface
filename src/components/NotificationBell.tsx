import { useMemo } from 'react';
import {
  Bell,
  AlertCircle,
  CheckCircle,
  Clock,
  Wifi,
  WifiOff,
  MapPin,
  Zap,
  Gauge,
  X,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications, NotificationType, AlertSeverity } from '@/hooks/useNotifications';
import useFleetData from '@/hooks/useFleetData';

const getTypeIcon = (type: NotificationType, severity: AlertSeverity) => {
  const base = 'h-4 w-4';
  switch (type) {
    case 'device_online':
      return <Wifi className={`${base} text-green-500`} />;
    case 'device_offline':
      return <WifiOff className={`${base} text-red-500`} />;
    case 'geofence':
      return <MapPin className={`${base} text-blue-500`} />;
    case 'ignition':
      return <Zap className={`${base} text-yellow-500`} />;
    case 'overspeed':
      return <Gauge className={`${base} text-red-600`} />;
    case 'alert':
      return <AlertCircle className={`${base} text-red-600`} />;
    default:
      return severity === 'high'
        ? <AlertCircle className={`${base} text-red-500`} />
        : severity === 'medium'
        ? <Clock className={`${base} text-yellow-500`} />
        : <CheckCircle className={`${base} text-green-500`} />;
  }
};

const severityBorderClass: Record<AlertSeverity, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-green-500',
};

const NotificationBell = () => {
  const { fleetData } = useFleetData();

  const deviceNameMap = useMemo<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    for (const d of fleetData as any[]) {
      if (d.id != null && d.name) map[Number(d.id)] = d.name;
    }
    return map;
  }, [fleetData]);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
  } = useNotifications(deviceNameMap);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse"
              variant="destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">Live Alerts</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground"
                onClick={clearAll}
                title="Clear all notifications"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Real-time status indicator */}
        {/* <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-border bg-background text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
          Live • polling every 8s
        </div> */}

        <ScrollArea className="h-[420px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No alerts yet</p>
              <p className="text-xs mt-1 opacity-70">Real-time events will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`group px-4 py-3 border-l-4 transition-colors cursor-pointer hover:bg-accent/40 ${severityBorderClass[n.severity]} ${
                    !n.read ? 'bg-primary/5' : 'bg-background'
                  }`}
                  onClick={() => markAsRead(n.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {getTypeIcon(n.type, n.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!n.read ? 'font-semibold text-foreground' : 'text-foreground/80'}`}>
                        {n.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(n.time, { addSuffix: true })}
                        </span>
                        {n.severity === 'high' && (
                          <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                            Critical
                          </Badge>
                        )}
                        {n.severity === 'medium' && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
                            Warning
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearNotification(n.id);
                      }}
                      aria-label="Dismiss notification"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
