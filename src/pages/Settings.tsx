import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { User, Shield, Bell, Palette, Building2, Plug, Users, FileCheck, MapPin, Gauge, Fuel, Loader2, Mail, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { useUserRole, UserRole } from "@/contexts/UserRoleContext";
import { useTrackingPrefs, TrackingPrefs } from "@/contexts/TrackingPrefsContext";
import { getSmtpConfig, saveSmtpConfig, SmtpConfig, DEFAULT_SMTP } from "@/services/smtpService";
import { traccarPut } from "@/api/traccarRequest";
import { getCurrentSession } from "@/services/authService";
import { useTraccarAuth } from "@/contexts/TraccarAuthContext";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useTraccarAuth();
  const { prefs: savedPrefs, savePrefs, serverSaving } = useTrackingPrefs();
  
  // ── Profile State ──
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");

  useEffect(() => {
    if (user) {
      const parts = (user.name || "").split(" ");
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" ") || "");
      setProfileEmail(user.email || "");
      setProfilePhone(user.phone || "");
    }
  }, [user]);

  const [profileSaving, setProfileSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    try {
      const { provider, ...cleanUser } = user;
      const updatedUser = {
        ...cleanUser,
        name: `${firstName} ${lastName}`.trim(),
        email: profileEmail,
        phone: profilePhone,
      };
      await traccarPut(`/users/${user.id}`, updatedUser);
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Security State ──
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const handleUpdatePassword = async () => {
    if (!user) return;
    if (!currentPassword) {
      toast.error("Please enter your current password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword === currentPassword) {
      toast.error("New password must be different from the current password.");
      return;
    }
    setPasswordSaving(true);
    try {
      const verifyPayload = new URLSearchParams({
        email: user.email,
        password: currentPassword,
      });
      try {
        await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: verifyPayload.toString(),
          credentials: "include",
        }).then((res) => {
          if (!res.ok) throw new Error("wrong_password");
        });
      } catch {
        toast.error("Current password is incorrect.");
        setPasswordSaving(false);
        return;
      }
      const { provider, ...cleanUser } = user;
      const updatedUser = { ...cleanUser, password: newPassword };
      await traccarPut(`/users/${user.id}`, updatedUser);
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false
  });

  useEffect(() => {
    if (user?.attributes?.notificators) {
      const notifs = user.attributes.notificators.split(',');
      setNotifications({
        email: notifs.includes('mail'),
        push: notifs.includes('web') || notifs.includes('firebase'),
        sms: notifs.includes('sms')
      });
    }
  }, [user]);

  const [notificationsSaving, setNotificationsSaving] = useState(false);

  const handleSaveNotifications = async () => {
    if (!user) return;
    setNotificationsSaving(true);
    try {
      const parts = [];
      if (notifications.email) parts.push("mail");
      if (notifications.push) parts.push("web", "firebase");
      if (notifications.sms) parts.push("sms");
      
      const { provider, ...cleanUser } = user;
      const updatedUser = {
        ...cleanUser,
        attributes: {
          ...(cleanUser.attributes || {}),
          notificators: parts.join(",")
        }
      };
      
      await traccarPut(`/users/${user.id}`, updatedUser);
      toast.success("Notification preferences saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save notifications.");
    } finally {
      setNotificationsSaving(false);
    }
  };
  // Local draft — only committed when user clicks Save
  const [trackingPrefs, setTrackingPrefs] = useState<TrackingPrefs>(savedPrefs);

  const setTP = (key: keyof TrackingPrefs, value: unknown) =>
    setTrackingPrefs((p) => ({ ...p, [key]: value }));


  // ── SMTP config state ──────────────────────────────────────────────────────
  const [smtp, setSmtp] = useState<SmtpConfig>(DEFAULT_SMTP);
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpError, setSmtpError] = useState<string | null>(null);
  const [smtpSaved, setSmtpSaved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    getCurrentSession().then(session => {
      if (mounted && session?.administrator) {
        setIsAdmin(true);
      }
    }).catch(() => {});
    
    setSmtpLoading(true);
    getSmtpConfig()
      .then((cfg) => { if (mounted) setSmtp(cfg); })
      .catch(() => { /* non-admin — leave defaults */ })
      .finally(() => { if (mounted) setSmtpLoading(false); });
    return () => { mounted = false; };
  }, []);

  const handleSmtpSave = async () => {
    setSmtpSaving(true);
    setSmtpError(null);
    setSmtpSaved(false);
    try {
      await saveSmtpConfig(smtp);
      setSmtpSaved(true);
      toast.success("SMTP settings saved successfully.");
      setTimeout(() => setSmtpSaved(false), 3000);
    } catch (err: any) {
      const msg = err?.message || "Failed to save SMTP settings.";
      setSmtpError(msg);
      toast.error(msg);
    } finally {
      setSmtpSaving(false);
    }
  };

  const setS = (key: keyof SmtpConfig, value: unknown) =>
    setSmtp((p) => ({ ...p, [key]: value }));

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto pb-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and application preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="flex flex-wrap gap-1 h-auto w-full justify-start">
          <TabsTrigger value="profile" className="flex items-center gap-1.5"><User className="w-4 h-4" /><span className="hidden sm:inline">Profile</span></TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1.5"><Shield className="w-4 h-4" /><span className="hidden sm:inline">Security</span></TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-1.5"><Bell className="w-4 h-4" /><span className="hidden sm:inline">Notifications</span></TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-1.5"><Palette className="w-4 h-4" /><span className="hidden sm:inline">Preferences</span></TabsTrigger>

        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information and profile settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} placeholder="john.doe@company.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} placeholder="+1 (555) 000-0000" />
              </div>
              <Button onClick={handleSaveProfile} disabled={profileSaving}>
                {profileSaving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Change your password regularly for better security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <Button onClick={handleUpdatePassword} disabled={passwordSaving}>
                {passwordSaving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating…</>
                ) : (
                  "Update Password"
                )}
              </Button>
            </CardContent>
          </Card>

        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive alerts via email</p>
                </div>
                <Switch checked={notifications.email} onCheckedChange={(checked) => setNotifications({...notifications, email: checked})} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive browser push notifications</p>
                </div>
                <Switch checked={notifications.push} onCheckedChange={(checked) => setNotifications({...notifications, push: checked})} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">SMS Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive alerts via text message</p>
                </div>
                <Switch checked={notifications.sms} onCheckedChange={(checked) => setNotifications({...notifications, sms: checked})} />
              </div>
              <Button onClick={handleSaveNotifications} disabled={notificationsSaving} className="mt-4">
                {notificationsSaving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                ) : (
                  "Save Preferences"
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Units &amp; Measurement
              </CardTitle>
              <CardDescription>
                Configure how distances, speeds, and fuel are displayed across the app.
                These preferences are stored locally and applied on every page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Distance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Distance Unit</Label>
                  <Select value={trackingPrefs.distanceUnit} onValueChange={(v) => setTP("distanceUnit", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="km">Kilometers (km)</SelectItem>
                      <SelectItem value="mi">Miles (mi)</SelectItem>
                      <SelectItem value="nm">Nautical Miles (nm)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Speed */}
                <div className="space-y-2">
                  <Label>Speed Unit</Label>
                  <Select value={trackingPrefs.speedUnit} onValueChange={(v) => setTP("speedUnit", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="kmh">km/h</SelectItem>
                      <SelectItem value="mph">mph</SelectItem>
                      <SelectItem value="kn">Knots</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Fuel */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Fuel className="h-4 w-4" />
                    Fuel Unit
                  </Label>
                  <Select value={trackingPrefs.fuelUnit} onValueChange={(v) => setTP("fuelUnit", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="liters">Liters (L)</SelectItem>
                      <SelectItem value="us_gallons">US Gallons (gal)</SelectItem>
                      <SelectItem value="imp_gallons">Imperial Gallons</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Volume */}
                <div className="space-y-2">
                  <Label>Volume Unit</Label>
                  <Select value={trackingPrefs.volumeUnit} onValueChange={(v) => setTP("volumeUnit", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="liters">Liters (L)</SelectItem>
                      <SelectItem value="us_gallons">US Gallons</SelectItem>
                      <SelectItem value="imp_gallons">Imperial Gallons</SelectItem>
                      <SelectItem value="cubic_meters">Cubic Meters (m³)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Coordinate Format */}
                <div className="space-y-2">
                  <Label>Coordinate Format</Label>
                  <Select value={trackingPrefs.coordinateFormat} onValueChange={(v) => setTP("coordinateFormat", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="decimal">Decimal Degrees (DD)</SelectItem>
                      <SelectItem value="dms">Degrees Minutes Seconds (DMS)</SelectItem>
                      <SelectItem value="ddm">Degrees Decimal Minutes (DDM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Timezone */}
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={trackingPrefs.timezone} onValueChange={(v) => setTP("timezone", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                      <SelectItem value="Europe/Paris">Central Europe (CET)</SelectItem>
                      <SelectItem value="Asia/Dubai">Gulf Standard Time (GST)</SelectItem>
                      <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                      <SelectItem value="Asia/Singapore">Singapore (SGT)</SelectItem>
                      <SelectItem value="Australia/Sydney">Sydney (AEST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Map &amp; Zoom Preferences
              </CardTitle>
              <CardDescription>Control default zoom and map behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Default Map Zoom Level</Label>
                  <span className="text-sm font-semibold text-primary">{trackingPrefs.defaultZoom}×</span>
                </div>
                <Slider
                  min={3}
                  max={20}
                  step={1}
                  value={[trackingPrefs.defaultZoom]}
                  onValueChange={([v]) => setTP("defaultZoom", v)}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>World (3)</span>
                  <span>City (13)</span>
                  <span>Street (20)</span>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-center on selected vehicle</p>
                  <p className="text-sm text-muted-foreground">Pan map to vehicle when selecting from sidebar</p>
                </div>
                <Switch
                  checked={trackingPrefs.autoCenter}
                  onCheckedChange={(v) => setTP("autoCenter", v)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dashboard Display Options</CardTitle>
              <CardDescription>Choose which metrics are shown on vehicle cards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Show Odometer</p>
                  <p className="text-sm text-muted-foreground">Display total distance on vehicle detail card</p>
                </div>
                <Switch
                  checked={trackingPrefs.showOdometer}
                  onCheckedChange={(v) => setTP("showOdometer", v)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Show Avg Fuel Consumption</p>
                  <p className="text-sm text-muted-foreground">Display calculated MPG on vehicle card</p>
                </div>
                <Switch
                  checked={trackingPrefs.showFuelConsumption}
                  onCheckedChange={(v) => setTP("showFuelConsumption", v)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Show Altitude</p>
                  <p className="text-sm text-muted-foreground">Display altitude reading from GPS</p>
                </div>
                <Switch
                  checked={trackingPrefs.showAltitude}
                  onCheckedChange={(v) => setTP("showAltitude", v)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            {serverSaving && (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Syncing to server…
              </span>
            )}
            <Button onClick={() => void savePrefs(trackingPrefs)} disabled={serverSaving}>
              Save App Preferences
            </Button>
          </div>
        </TabsContent>



      </Tabs>
    </div>
  );
}
