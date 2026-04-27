import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Link2, MoreHorizontal } from "lucide-react";
import { getCurrentSession } from "@/services/authService";
import { getDevices } from "@/services/deviceService";
import {
  deleteTraccarUser,
  getTraccarUsers,
  TraccarUser,
  updateTraccarUserAccess,
} from "@/services/traccarUserService";
import { traccarDelete, traccarGetCollection, traccarPost } from "@/api/traccarRequest";

type DeviceOption = { id: number; name: string };

export default function UserAccess() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [users, setUsers] = useState<TraccarUser[]>([]);
  const [query, setQuery] = useState("");
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [assigningUserId, setAssigningUserId] = useState<number | null>(null);
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);
  const [selectedUserForDevices, setSelectedUserForDevices] = useState<TraccarUser | null>(null);
  const [availableDevices, setAvailableDevices] = useState<DeviceOption[]>([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<number[]>([]);
  const [initialAssignedDeviceIds, setInitialAssignedDeviceIds] = useState<number[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const session = (await getCurrentSession()) as any;
      const admin = Boolean(session?.administrator);
      setIsAdmin(admin);
      setCurrentUserId(Number(session?.id) || null);
      if (!admin) {
        setUsers([]);
        return;
      }
      const list = await getTraccarUsers();
      setUsers(list);
    } catch (error: any) {
      toast({
        title: "Failed to load user access",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const setUserField = (userId: number, field: keyof TraccarUser, value: boolean) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, [field]: value } : u))
    );
  };

  const handleSave = async (user: TraccarUser) => {
    setSavingUserId(user.id);
    try {
      const updated = await updateTraccarUserAccess({
        userId: user.id,
        administrator: user.administrator,
        readonly: user.readonly,
        deviceReadonly: user.deviceReadonly,
        disabled: user.disabled,
      });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      toast({ title: `Access updated for ${updated.name}` });
    } catch (error: any) {
      toast({
        title: "Failed to update access",
        description: error?.message || "Save failed",
        variant: "destructive",
      });
    } finally {
      setSavingUserId(null);
    }
  };

  const handleDelete = async (user: TraccarUser) => {
    if (currentUserId && user.id === currentUserId) {
      toast({
        title: "Cannot delete current user",
        description: "Use a different admin account to remove this user.",
        variant: "destructive",
      });
      return;
    }

    const ok = window.confirm(`Delete user "${user.name || user.email || user.id}"? This cannot be undone.`);
    if (!ok) return;

    setDeletingUserId(user.id);
    try {
      await deleteTraccarUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      toast({ title: "User deleted successfully" });
    } catch (error: any) {
      toast({
        title: "Failed to delete user",
        description: error?.message || "Delete failed",
        variant: "destructive",
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  const openAssignDevicesDialog = async (user: TraccarUser) => {
    try {
      setAssigningUserId(user.id);
      setSelectedUserForDevices(user);
      const devices = await getDevices();
      const normalizedDevices = (devices || []).map((d: any) => ({
        id: Number(d.id),
        name: String(d.name || `Device ${d.id}`),
      }));
      let assigned: number[] = [];

      // Some Traccar versions reject GET /permissions (405), so fallback to /devices?userId.
      try {
        const permissions = await traccarGetCollection({
          url: "/permissions",
          params: { userId: user.id },
          normalize: (item) => item,
        });
        assigned = (permissions || [])
          .map((p: any) => Number(p.deviceId))
          .filter((id: number) => Number.isFinite(id));
      } catch {
        const assignedDevices = await traccarGetCollection({
          url: "/devices",
          params: { userId: user.id },
          normalize: (item) => item,
        });
        assigned = (assignedDevices || [])
          .map((d: any) => Number(d.id))
          .filter((id: number) => Number.isFinite(id));
      }

      setAvailableDevices(normalizedDevices);
      setSelectedDeviceIds(assigned);
      setInitialAssignedDeviceIds(assigned);
      setDeviceDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Failed to load devices",
        description: error?.message || "Could not open assignment dialog",
        variant: "destructive",
      });
    } finally {
      setAssigningUserId(null);
    }
  };

  const toggleDeviceSelection = (deviceId: number, checked: boolean) => {
    setSelectedDeviceIds((prev) =>
      checked ? Array.from(new Set([...prev, deviceId])) : prev.filter((id) => id !== deviceId)
    );
  };

  const saveDeviceAssignments = async () => {
    if (!selectedUserForDevices) return;
    const userId = selectedUserForDevices.id;
    try {
      setAssigningUserId(userId);
      const existingIds = new Set(initialAssignedDeviceIds);
      const nextIds = new Set(selectedDeviceIds);

      const toAdd = Array.from(nextIds).filter((id) => !existingIds.has(id));
      const toRemove = Array.from(existingIds).filter((id) => !nextIds.has(id));

      await Promise.all([
        ...toAdd.map((deviceId) => traccarPost("/permissions", { userId, deviceId })),
        ...toRemove.map((deviceId) =>
          traccarDelete("/permissions", { data: { userId, deviceId } })
        ),
      ]);

      toast({ title: "Device permissions updated" });
      setDeviceDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Failed to update device permissions",
        description: error?.message || "Save failed",
        variant: "destructive",
      });
    } finally {
      setAssigningUserId(null);
    }
  };

  const filtered = users.filter((u) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">User Access</h2>
        <p className="text-muted-foreground">
          Admins can grant or revoke read/write access for Traccar users.
        </p>
      </div>

      {!loading && !isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Admin Access Required</CardTitle>
            <CardDescription>
              Only Traccar administrators can manage user permissions.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Manage Users</CardTitle>
            <CardDescription>Update access flags and save per user.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Search user by name or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            {loading ? (
              <p className="text-sm text-muted-foreground">Loading users...</p>
            ) : (
              <div className="space-y-3">
                {filtered.map((user) => (
                  <div key={user.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{user.name || `User ${user.id}`}</p>
                        <p className="text-sm text-muted-foreground">{user.email || "No email"}</p>
                      </div>
                      <div className="flex gap-2">
                        {user.administrator ? <Badge>Admin</Badge> : <Badge variant="secondary">User</Badge>}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={user.administrator}
                          onChange={(e) =>
                            setUserField(user.id, "administrator", e.target.checked)
                          }
                        />
                        <span>Administrator</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={user.readonly}
                          onChange={(e) => setUserField(user.id, "readonly", e.target.checked)}
                        />
                        <span>Read-only account</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={user.deviceReadonly}
                          onChange={(e) =>
                            setUserField(user.id, "deviceReadonly", e.target.checked)
                          }
                        />
                        <span>Device read-only</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={user.disabled}
                          onChange={(e) => setUserField(user.id, "disabled", e.target.checked)}
                        />
                        <span>Disabled</span>
                      </label>
                    </div>

                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2"
                            disabled={
                              deletingUserId === user.id ||
                              savingUserId === user.id ||
                              assigningUserId === user.id
                            }
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="ml-1 text-xs">More</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => void handleSave(user)}>
                            {savingUserId === user.id ? "Saving..." : "Save Access"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void openAssignDevicesDialog(user)}>
                            <Link2 className="mr-2 h-3.5 w-3.5" />
                            Assign Devices
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => void handleDelete(user)}
                          >
                            {deletingUserId === user.id ? "Deleting..." : "Delete User"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={deviceDialogOpen} onOpenChange={setDeviceDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Assign Devices - {selectedUserForDevices?.name || selectedUserForDevices?.email}
            </DialogTitle>
            <DialogDescription>
              Select devices this user can access on dashboard and related modules.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[360px] overflow-y-auto space-y-2 border rounded-md p-3">
            {availableDevices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No devices found.</p>
            ) : (
              availableDevices.map((device) => {
                const checked = selectedDeviceIds.includes(device.id);
                return (
                  <label key={device.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => toggleDeviceSelection(device.id, e.target.checked)}
                    />
                    <span>{device.name}</span>
                    <span className="text-xs text-muted-foreground">#{device.id}</span>
                  </label>
                );
              })
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeviceDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void saveDeviceAssignments()}
              disabled={assigningUserId === selectedUserForDevices?.id}
            >
              {assigningUserId === selectedUserForDevices?.id ? "Saving..." : "Save Devices"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
