import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { User, Shield, Bell, Palette, Building2, Plug, Users, FileCheck, MapPin, Gauge, Fuel, Loader2 } from "lucide-react";
import { useUserRole, UserRole } from "@/contexts/UserRoleContext";
import { useTrackingPrefs, TrackingPrefs } from "@/contexts/TrackingPrefsContext";

export default function Settings() {
  const { role, setRole } = useUserRole();
  const { prefs: savedPrefs, savePrefs, serverSaving } = useTrackingPrefs();
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false
  });
  // Local draft — only committed when user clicks Save
  const [trackingPrefs, setTrackingPrefs] = useState<TrackingPrefs>(savedPrefs);

  const setTP = (key: keyof TrackingPrefs, value: unknown) =>
    setTrackingPrefs((p) => ({ ...p, [key]: value }));

  const handleRoleChange = (newRole: string) => {
    setRole(newRole as UserRole);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and application preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="flex flex-wrap gap-1 h-auto w-full justify-start">
          <TabsTrigger value="profile" className="flex items-center gap-1.5"><User className="w-4 h-4" /><span className="hidden sm:inline">Profile</span></TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1.5"><Shield className="w-4 h-4" /><span className="hidden sm:inline">Security</span></TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-1.5"><Bell className="w-4 h-4" /><span className="hidden sm:inline">Notifications</span></TabsTrigger>
          <TabsTrigger value="tracking" className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /><span className="hidden sm:inline">Tracking</span></TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-1.5"><Palette className="w-4 h-4" /><span className="hidden sm:inline">Preferences</span></TabsTrigger>
          <TabsTrigger value="company" className="flex items-center gap-1.5"><Building2 className="w-4 h-4" /><span className="hidden sm:inline">Company</span></TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-1.5"><Plug className="w-4 h-4" /><span className="hidden sm:inline">Integrations</span></TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-1.5"><Users className="w-4 h-4" /><span className="hidden sm:inline">Team</span></TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-1.5"><FileCheck className="w-4 h-4" /><span className="hidden sm:inline">Compliance</span></TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information and profile settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Doe" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john.doe@company.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" placeholder="+1 (555) 000-0000" />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Role (Demo)</CardTitle>
              <CardDescription>Change your role to see different navigation menus</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={role} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fleet_manager">Fleet Manager / Admin</SelectItem>
                  <SelectItem value="operations_manager">Operations Manager</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="maintenance_staff">Maintenance Staff</SelectItem>
                  <SelectItem value="finance">Finance / Accounting</SelectItem>
                </SelectContent>
              </Select>
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
                <Input id="currentPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" />
              </div>
              <Button>Update Password</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enable 2FA</p>
                  <p className="text-sm text-muted-foreground">Require a code in addition to your password</p>
                </div>
                <Switch />
              </div>
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tracking Preferences ── */}
        <TabsContent value="tracking" className="space-y-4">
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
                Syncing to Traccar server…
              </span>
            )}
            <Button onClick={() => void savePrefs(trackingPrefs)} disabled={serverSaving}>
              Save Tracking Preferences
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Display Preferences</CardTitle>
              <CardDescription>Customize your application appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select defaultValue="light">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select defaultValue="en">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select defaultValue="utc">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utc">UTC</SelectItem>
                    <SelectItem value="est">Eastern Time</SelectItem>
                    <SelectItem value="pst">Pacific Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Manage your fleet configuration and company details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" placeholder="Fleet Solutions Inc." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fleetSize">Fleet Size</Label>
                <Input id="fleetSize" type="number" placeholder="150" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="123 Fleet Street" />
              </div>
              <Button>Update Company Info</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Keys & Integrations</CardTitle>
              <CardDescription>Connect third-party services and manage API access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input id="apiKey" type="password" value="sk_test_********************" readOnly />
              </div>
              <Button variant="outline">Generate New API Key</Button>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium">Connected Services</h4>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Mapbox Integration</p>
                    <p className="text-sm text-muted-foreground">Map and location services</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Management</CardTitle>
              <CardDescription>Manage users and their roles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button>Invite Team Member</Button>
              <Separator />
              <div className="space-y-2">
                {['John Doe - Fleet Manager', 'Jane Smith - Operations Manager', 'Mike Johnson - Driver'].map((member, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <span>{member}</span>
                    <Button variant="outline" size="sm">Manage</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Regulatory Compliance</CardTitle>
              <CardDescription>Configure compliance and regulatory settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">GDPR Compliance</p>
                  <p className="text-sm text-muted-foreground">Enable data protection features</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">DOT Compliance</p>
                  <p className="text-sm text-muted-foreground">Department of Transportation regulations</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Audit Log Retention</Label>
                <Select defaultValue="90">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
