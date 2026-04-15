import { useCallback, useEffect, useState } from "react";
import { Users, Car, Phone, UserPlus, Mail, Search, Trash2, Link2, Pencil } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getDevices } from "@/services/deviceService";
import { createDriver, deleteDriver, getDrivers, patchDriverContact } from "@/services/driverService";
import { assignDriverToDevice, findPrimaryDeviceForDriver } from "@/services/driverDeviceService";

type DriverCard = {
  id: string;
  traccarId: number;
  uniqueId: string;
  name: string;
  phone: string;
  email: string;
  vehicle: string;
  avatar: string;
};

function readAttrString(attributes: unknown, key: string): string | undefined {
  if (!attributes || typeof attributes !== "object") return undefined;
  const v = (attributes as Record<string, unknown>)[key];
  if (v == null) return undefined;
  return String(v);
}

function mergeDisplayDrivers(
  apiDrivers: { id: number | null; name: string; uniqueId: string; attributes?: Record<string, unknown> }[],
  devices: { id: number; name: string; attributes?: Record<string, unknown> }[]
): DriverCard[] {
  return apiDrivers
    .filter((d): d is typeof d & { id: number } => d.id != null)
    .map((d) => {
      const primary = findPrimaryDeviceForDriver(devices, d.id);
      const phone = readAttrString(d.attributes, "phone");
      const email = readAttrString(d.attributes, "email");
      return {
        id: `D${String(d.id).padStart(3, "0")}`,
        traccarId: d.id,
        uniqueId: d.uniqueId,
        name: d.name,
        phone: phone ?? "",
        email: email ?? "",
        vehicle: primary?.name ?? "—",
        avatar: "",
      };
    });
}

export default function Drivers() {
  const [currentView, setCurrentView] = useState("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [drivers, setDrivers] = useState<DriverCard[]>([]);
  const [deviceRows, setDeviceRows] = useState<{ id: number; name: string; attributes: Record<string, unknown> }[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addUniqueId, setAddUniqueId] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [contactEditDriver, setContactEditDriver] = useState<DriverCard | null>(null);
  const [editContactPhone, setEditContactPhone] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [contactSaving, setContactSaving] = useState(false);
  const [vehicleDialogDriver, setVehicleDialogDriver] = useState<DriverCard | null>(null);
  const [assignDeviceId, setAssignDeviceId] = useState("");
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [apiDrivers, devices] = await Promise.all([getDrivers(), getDevices()]);
      const rows = devices.map((d) => ({
        id: Number(d.id),
        name: d.name || `Device ${d.id}`,
        attributes: (d.attributes || {}) as Record<string, unknown>,
      }));
      setDeviceRows(rows);
      setDrivers(mergeDisplayDrivers(apiDrivers, rows));
    } catch {
      toast.error("Could not load drivers from Traccar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const q = searchQuery.toLowerCase();
  const filteredDrivers = drivers.filter(
    (driver) =>
      driver.name.toLowerCase().includes(q) ||
      driver.id.toLowerCase().includes(q) ||
      driver.uniqueId.toLowerCase().includes(q) ||
      String(driver.traccarId).includes(q)
  );

  const openVehicleDialog = (driver: DriverCard) => {
    setVehicleDialogDriver(driver);
    const primary = findPrimaryDeviceForDriver(deviceRows, driver.traccarId);
    setAssignDeviceId(primary ? String(primary.id) : "");
  };

  const openContactEdit = (driver: DriverCard) => {
    setContactEditDriver(driver);
    setEditContactPhone(driver.phone);
    setEditContactEmail(driver.email);
  };

  const handleSaveContact = async () => {
    if (!contactEditDriver) return;
    setContactSaving(true);
    try {
      await patchDriverContact(contactEditDriver.traccarId, {
        phone: editContactPhone,
        email: editContactEmail,
      });
      toast.success("Contact saved on driver in Traccar");
      setContactEditDriver(null);
      await loadData();
    } catch {
      toast.error("Could not save contact");
    } finally {
      setContactSaving(false);
    }
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = addName.trim();
    const uniqueId = addUniqueId.trim();
    if (!name || !uniqueId) {
      toast.error("Name and unique ID are required");
      return;
    }
    setAddSubmitting(true);
    try {
      const attributes: Record<string, string> = {};
      const ph = addPhone.trim();
      const em = addEmail.trim();
      if (ph) attributes.phone = ph;
      if (em) attributes.email = em;
      await createDriver({ name, uniqueId, attributes });
      toast.success("Driver created in Traccar");
      setAddName("");
      setAddUniqueId("");
      setAddPhone("");
      setAddEmail("");
      setAddOpen(false);
      await loadData();
    } catch {
      toast.error("Could not create driver");
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleSaveVehicleAssign = async () => {
    if (!vehicleDialogDriver || !assignDeviceId) {
      toast.error("Select a vehicle");
      return;
    }
    setAssignSubmitting(true);
    try {
      await assignDriverToDevice(
        {
          id: vehicleDialogDriver.traccarId,
          name: vehicleDialogDriver.name,
          uniqueId: vehicleDialogDriver.uniqueId,
        },
        assignDeviceId
      );
      toast.success("Vehicle assignment saved");
      setVehicleDialogDriver(null);
      await loadData();
    } catch {
      toast.error("Assignment failed");
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handleDeleteDriver = async (driver: DriverCard) => {
    if (!window.confirm(`Delete driver "${driver.name}" from Traccar? This cannot be undone.`)) {
      return;
    }
    setDeleteSubmitting(driver.traccarId);
    try {
      await deleteDriver(driver.traccarId);
      toast.success("Driver deleted");
      await loadData();
    } catch {
      toast.error("Delete failed — unlink vehicles or check server permissions");
    } finally {
      setDeleteSubmitting(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .join("")
      .toUpperCase();
  };

  const getContactStatus = (driver: DriverCard) => {
    const hasPhone = Boolean(driver.phone);
    const hasEmail = Boolean(driver.email);
    if (hasPhone && hasEmail) return { label: "Complete", className: "text-green-600 bg-green-500/10 border-green-500/30" };
    if (hasPhone || hasEmail) return { label: "Partial", className: "text-yellow-600 bg-yellow-500/10 border-yellow-500/30" };
    return { label: "Needs Update", className: "text-red-600 bg-red-500/10 border-red-500/30" };
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold">Driver Management</h2>
          <p className="text-muted-foreground">Drivers and vehicles from your Traccar server</p>
        </div>
        
        <div className="flex gap-2 items-center">
          <Select value={currentView} onValueChange={setCurrentView}>
            <SelectTrigger className="w-[200px] bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="list">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Driver List
                </div>
              </SelectItem>
              <SelectItem value="assignments">
                <div className="flex items-center">
                  <Car className="h-4 w-4 mr-2" />
                  Assignments
                </div>
              </SelectItem>
              <SelectItem value="contacts">
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  Contacts
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Dialog
            open={addOpen}
            onOpenChange={(o) => {
              setAddOpen(o);
              if (!o) {
                setAddPhone("");
                setAddEmail("");
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Driver
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add driver</DialogTitle>
                <DialogDescription>
                  Creates a driver (POST /api/drivers). Phone and email are saved as{" "}
                  <code className="text-xs">attributes.phone</code> and <code className="text-xs">attributes.email</code>.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddDriver} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="drv-name">Name</Label>
                  <Input
                    id="drv-name"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="Display name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="drv-uid">Unique ID</Label>
                  <Input
                    id="drv-uid"
                    value={addUniqueId}
                    onChange={(e) => setAddUniqueId(e.target.value)}
                    placeholder="RFID / badge / driver id"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="drv-phone">Phone (optional)</Label>
                  <Input
                    id="drv-phone"
                    type="tel"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    placeholder="+1 …"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="drv-email">Email (optional)</Label>
                  <Input
                    id="drv-email"
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="name@example.com"
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addSubmitting}>
                    {addSubmitting ? "Saving…" : "Save"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search Bar */}
      {(currentView === "list" || currentView === "contacts") && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search drivers by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Driver List */}
      {currentView === "list" && (
        <div className="grid gap-4 md:grid-cols-2">
          {loading && drivers.length === 0 && (
            <p className="text-muted-foreground col-span-full">Loading drivers…</p>
          )}
          {!loading && drivers.length === 0 && (
            <p className="text-muted-foreground col-span-full">No drivers in Traccar.</p>
          )}
          {!loading && drivers.length > 0 && filteredDrivers.length === 0 && (
            <p className="text-muted-foreground col-span-full">No drivers match your search.</p>
          )}
          {filteredDrivers.map((driver) => (
            <Card key={driver.traccarId} className="hover:shadow-lg hover:-translate-y-0.5 transition-all border-border/70">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-12 w-12 shrink-0 ring-2 ring-primary/15">
                      <AvatarImage src={driver.avatar} />
                      <AvatarFallback>{getInitials(driver.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{driver.name}</CardTitle>
                      <CardDescription className="truncate">
                        #{driver.traccarId} · {driver.id}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className={`shrink-0 ${getContactStatus(driver).className}`}>
                    {getContactStatus(driver).label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Vehicle Assignment</p>
                    <p className="font-medium mt-1 truncate">{driver.vehicle}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Unique ID</p>
                    <p className="font-medium mt-1 truncate" title={driver.uniqueId}>
                      {driver.uniqueId}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium truncate">{driver.phone || "—"}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium truncate" title={driver.email || "—"}>
                      {driver.email || "—"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="flex-1 min-w-[110px]">
                        <Users className="h-4 w-4 mr-2" />
                        Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>{driver.name}</DialogTitle>
                        <DialogDescription>Data from Traccar driver and device assignment</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={driver.avatar} />
                            <AvatarFallback>{getInitials(driver.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold truncate">{driver.name}</h3>
                            <p className="text-sm text-muted-foreground">Traccar id #{driver.traccarId}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 text-sm">
                          <div>
                            <Label>Unique ID</Label>
                            <p className="break-all">{driver.uniqueId}</p>
                          </div>
                          <div>
                            <Label>Assigned vehicle</Label>
                            <p>{driver.vehicle}</p>
                          </div>
                          <div>
                            <Label>Phone</Label>
                            <p>{driver.phone || "—"}</p>
                          </div>
                          <div>
                            <Label>Email</Label>
                            <p className="break-all">{driver.email || "—"}</p>
                          </div>
                        </div>
                      </div>
                      <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={deleteSubmitting === driver.traccarId}
                          onClick={() => handleDeleteDriver(driver)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {deleteSubmitting === driver.traccarId ? "Deleting…" : "Delete driver"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button size="sm" variant="outline" className="flex-1 min-w-[110px]" onClick={() => openContactEdit(driver)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit contact
                  </Button>

                  <Button size="sm" variant="outline" className="flex-1 min-w-[110px]" onClick={() => openVehicleDialog(driver)}>
                    <Link2 className="h-4 w-4 mr-2" />
                    {driver.vehicle === "—" ? "Assign vehicle" : "Reassign"}
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={deleteSubmitting === driver.traccarId}
                    onClick={() => handleDeleteDriver(driver)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Assignments View */}
      {currentView === "assignments" && (
        <div className="grid gap-4">
          {drivers.map((driver) => (
            <Card key={driver.traccarId}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar>
                      <AvatarImage src={driver.avatar} />
                      <AvatarFallback>{getInitials(driver.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <CardTitle className="text-lg truncate">{driver.name}</CardTitle>
                      <CardDescription className="truncate">{driver.uniqueId}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={driver.vehicle === "—" ? "secondary" : "default"} className="shrink-0">
                    <Car className="h-3 w-3 mr-1" />
                    {driver.vehicle}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-muted-foreground">Primary vehicle from Traccar assignment</div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => openContactEdit(driver)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit contact
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openVehicleDialog(driver)}>
                      <Car className="h-4 w-4 mr-2" />
                      {driver.vehicle === "—" ? "Assign vehicle" : "Reassign"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={deleteSubmitting === driver.traccarId}
                      onClick={() => handleDeleteDriver(driver)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Contacts View */}
      {currentView === "contacts" && (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredDrivers.map((driver) => (
            <Card key={driver.traccarId}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={driver.avatar} />
                    <AvatarFallback>{getInitials(driver.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{driver.name}</CardTitle>
                    <CardDescription>{driver.id}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  {driver.phone ? (
                    <a href={`tel:${driver.phone}`} className="hover:underline">
                      {driver.phone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Not set — use Edit contact on the driver list</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  {driver.email ? (
                    <a href={`mailto:${driver.email}`} className="hover:underline break-all">
                      {driver.email}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Not set — use Edit contact on the driver list</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {driver.phone ? (
                    <Button size="sm" variant="outline" className="flex-1 min-w-[120px]" asChild>
                      <a href={`tel:${driver.phone}`}>
                        <Phone className="h-4 w-4 mr-2" />
                        Call
                      </a>
                    </Button>
                  ) : null}
                  <Button size="sm" variant="outline" className="flex-1 min-w-[120px]" onClick={() => openContactEdit(driver)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit contact
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1 min-w-[120px]"
                    disabled={deleteSubmitting === driver.traccarId}
                    onClick={() => handleDeleteDriver(driver)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(contactEditDriver)} onOpenChange={(o) => !o && setContactEditDriver(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit contact — {contactEditDriver?.name}</DialogTitle>
            <DialogDescription>
              Saved on this driver in Traccar as <code className="text-xs">attributes.phone</code> and{" "}
              <code className="text-xs">attributes.email</code>. Clear a field and save to remove it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={editContactPhone}
                onChange={(e) => setEditContactPhone(e.target.value)}
                placeholder="+1 …"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editContactEmail}
                onChange={(e) => setEditContactEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setContactEditDriver(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveContact} disabled={contactSaving}>
              {contactSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(vehicleDialogDriver)} onOpenChange={(o) => !o && setVehicleDialogDriver(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign vehicle — {vehicleDialogDriver?.name}</DialogTitle>
            <DialogDescription>
              POST /api/permissions and update device display fields (same as Traccar web device settings).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Vehicle</Label>
            <Select value={assignDeviceId} onValueChange={setAssignDeviceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select device" />
              </SelectTrigger>
              <SelectContent>
                {deviceRows.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setVehicleDialogDriver(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveVehicleAssign} disabled={assignSubmitting || !assignDeviceId}>
              {assignSubmitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
