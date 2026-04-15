import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentSession } from "@/services/authService";
import useFleetData from "@/hooks/useFleetData";
import { CircleUserRound, Mail, ShieldCheck, Truck } from "lucide-react";

type SessionUser = {
  id?: number;
  name?: string;
  email?: string;
  administrator?: boolean;
  readonly?: boolean;
  disabled?: boolean;
};

export default function Profile() {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const { fleetData } = useFleetData();

  useEffect(() => {
    let active = true;
    const loadSession = async () => {
      try {
        setLoadingSession(true);
        setSessionError(null);
        const data = await getCurrentSession();
        if (!active) return;
        setSessionUser((data as SessionUser) || null);
      } catch (error: any) {
        if (!active) return;
        setSessionError(error?.message || "Could not load user session.");
      } finally {
        if (active) {
          setLoadingSession(false);
        }
      }
    };
    loadSession();
    return () => {
      active = false;
    };
  }, []);

  const fleetSummary = useMemo(() => {
    const total = fleetData.length;
    const online = fleetData.filter((item: any) => item.status === "online").length;
    const idle = fleetData.filter((item: any) => item.status === "idle").length;
    return { total, online, idle };
  }, [fleetData]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Profile</h2>
        <p className="text-muted-foreground">Your live Traccar account and access overview.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleUserRound className="h-5 w-5" />
              Account Information
            </CardTitle>
            <CardDescription>Loaded from current Traccar session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingSession && <p className="text-sm text-muted-foreground">Loading profile...</p>}
            {!loadingSession && sessionError && <p className="text-sm text-destructive">{sessionError}</p>}
            {!loadingSession && !sessionError && (
              <>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={sessionUser?.name || "N/A"} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Email / Username</Label>
                  <Input value={sessionUser?.email || "N/A"} readOnly />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">User ID: {sessionUser?.id ?? "N/A"}</Badge>
                  <Badge variant={sessionUser?.administrator ? "default" : "secondary"}>
                    {sessionUser?.administrator ? "Administrator" : "Standard User"}
                  </Badge>
                  <Badge variant={sessionUser?.readonly ? "secondary" : "outline"}>
                    {sessionUser?.readonly ? "Read-only" : "Read/Write"}
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Live Access Summary
            </CardTitle>
            <CardDescription>Telemetry visibility in this account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm">Total visible vehicles</span>
              <Badge>{fleetSummary.total}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm">Online vehicles</span>
              <Badge variant="secondary">{fleetSummary.online}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm">Idle vehicles</span>
              <Badge variant="outline">{fleetSummary.idle}</Badge>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 mt-0.5" />
              Values are refreshed from live fleet polling.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Profile Actions
          </CardTitle>
          <CardDescription>Quick account actions for this environment.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.location.assign("/settings")}>
            Open Settings
          </Button>
          <Button variant="outline" onClick={() => window.location.assign("/fleet")}>
            Open Fleet Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
