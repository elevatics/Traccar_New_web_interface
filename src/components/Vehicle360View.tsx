import { useState } from 'react';
import { Vehicle } from '@/types/vehicle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Video,
  Phone,
  Camera,
  RotateCcw,
  Maximize2,
  Volume2,
  VolumeX,
  Circle,
  MonitorPlay,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Vehicle360ViewProps {
  vehicle: Vehicle | null;
}

type CameraAngle = 'front' | 'rear' | 'left' | 'right' | 'interior' | 'dashboard';

const cameraAngles: { id: CameraAngle; label: string }[] = [
  { id: 'front', label: 'Front' },
  { id: 'rear', label: 'Rear' },
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
  { id: 'interior', label: 'Interior' },
  { id: 'dashboard', label: 'Dashboard' },
];

const Vehicle360View = ({ vehicle }: Vehicle360ViewProps) => {
  const [activeCamera, setActiveCamera] = useState<CameraAngle>('front');
  const [isCallActive, setIsCallActive] = useState(false);
  const [callType, setCallType] = useState<'video' | 'audio' | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!vehicle) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center py-12">
          <Camera className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Select a vehicle to view 360° camera feeds</p>
        </CardContent>
      </Card>
    );
  }

  const startCall = (type: 'video' | 'audio') => {
    setCallType(type);
    setIsCallActive(true);
  };

  const endCall = () => {
    setCallType(null);
    setIsCallActive(false);
    setIsMuted(false);
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Vehicle 360° View</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {vehicle.name} — {vehicle.plateNumber}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-xs gap-1">
              <Circle className="h-2 w-2 fill-green-500 text-green-500" />
              Live
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-3 pt-0 overflow-hidden gap-3">
        <Tabs defaultValue="cameras" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="cameras" className="text-xs gap-1.5">
              <MonitorPlay className="h-3 w-3" />
              Cameras
            </TabsTrigger>
            <TabsTrigger value="call" className="text-xs gap-1.5">
              <Phone className="h-3 w-3" />
              Remote Call
            </TabsTrigger>
          </TabsList>

          {/* Camera View */}
          <TabsContent value="cameras" className="flex-1 flex flex-col gap-2 mt-2 overflow-hidden">
            {/* Camera Feed */}
            <div className="relative flex-1 bg-muted/80 rounded-lg overflow-hidden min-h-[200px]">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Camera className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm font-medium text-muted-foreground/60">
                    {activeCamera.charAt(0).toUpperCase() + activeCamera.slice(1)} Camera
                  </p>
                  <p className="text-xs text-muted-foreground/40 mt-1">Live feed placeholder</p>
                </div>
              </div>
              {/* Overlay Controls */}
              <div className="absolute top-2 right-2 flex gap-1">
                <Button variant="secondary" size="icon" className="h-7 w-7 bg-background/80 backdrop-blur-sm" onClick={() => setIsFullscreen(!isFullscreen)}>
                  <Maximize2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="secondary" size="icon" className="h-7 w-7 bg-background/80 backdrop-blur-sm">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="absolute bottom-2 left-2">
                <Badge className="bg-destructive/90 text-destructive-foreground text-[10px] gap-1">
                  <Circle className="h-1.5 w-1.5 fill-current animate-pulse" />
                  REC
                </Badge>
              </div>
            </div>

            {/* Camera Angle Selector */}
            <div className="grid grid-cols-3 gap-1.5">
              {cameraAngles.map((cam) => (
                <button
                  key={cam.id}
                  onClick={() => setActiveCamera(cam.id)}
                  className={cn(
                    'text-xs py-1.5 px-2 rounded-md transition-colors font-medium',
                    activeCamera === cam.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  )}
                >
                  {cam.label}
                </button>
              ))}
            </div>
          </TabsContent>

          {/* Remote Call */}
          <TabsContent value="call" className="flex-1 flex flex-col gap-3 mt-2">
            {!isCallActive ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className="text-center mb-2">
                  <Phone className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">Remote Call</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Connect with driver — {vehicle.driver}
                  </p>
                </div>

                <div className="flex flex-col gap-2 w-full max-w-[200px]">
                  <Button
                    onClick={() => startCall('video')}
                    className="gap-2 bg-gradient-to-r from-primary to-primary/80"
                  >
                    <Video className="h-4 w-4" />
                    Video & Audio Call
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => startCall('audio')}
                    className="gap-2"
                  >
                    <Phone className="h-4 w-4" />
                    Audio Only Call
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                {/* Call Feed */}
                <div className="relative flex-1 bg-muted/80 rounded-lg overflow-hidden min-h-[200px] flex items-center justify-center">
                  {callType === 'video' ? (
                    <div className="text-center">
                      <Video className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm font-medium text-muted-foreground/60">Video Call Active</p>
                      <p className="text-xs text-muted-foreground/40">{vehicle.driver}</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                        <Phone className="h-8 w-8 text-primary animate-pulse" />
                      </div>
                      <p className="text-sm font-medium text-foreground">{vehicle.driver}</p>
                      <p className="text-xs text-muted-foreground mt-1">Audio call in progress...</p>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-green-600 text-white text-[10px] gap-1">
                      <Circle className="h-1.5 w-1.5 fill-current animate-pulse" />
                      Connected
                    </Badge>
                  </div>
                </div>

                {/* Call Controls */}
                <div className="flex items-center justify-center gap-3 mt-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-full"
                    onClick={() => setIsMuted(!isMuted)}
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-12 w-12 rounded-full"
                    onClick={endCall}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                  {callType === 'audio' && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full"
                      onClick={() => setCallType('video')}
                    >
                      <Video className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default Vehicle360View;
