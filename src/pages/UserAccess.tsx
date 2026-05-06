import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldCheck,
  ShieldOff,
  Search,
  Users,
  UserCog,
  Link2,
  Trash2,
  Save,
  CheckSquare,
  Square,
  MonitorSmartphone,
  Ban,
  Eye,
  RefreshCw,
} from "lucide-react";
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

function getInitials(name: string, email: string) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }
  return email ? email.slice(0, 2).toUpperCase() : "??";
}

function getAvatarColor(id: number) {
  const colors = [
    "bg-blue-500",
    "bg-violet-500",
    "bg-emerald-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-cyan-500",
    "bg-indigo-500",
    "bg-rose-500",
  ];
  return colors[id % colors.length];
}

const COLUMNS = [
  {
    key: "administrator",
    label: "Admin",
    description: "Full system access",
    icon: ShieldCheck,
    iconClass: "text-violet-500",
    bgClass: "bg-violet-50 dark:bg-violet-950/40",
  },
  {
    key: "readonly",
    label: "Read-only",
    description: "Cannot modify data",
    icon: Eye,
    iconClass: "text-blue-500",
    bgClass: "bg-blue-50 dark:bg-blue-950/40",
  },
  {
    key: "deviceReadonly",
    label: "Device Read-only",
    description: "View devices only",
    icon: MonitorSmartphone,
    iconClass: "text-orange-500",
    bgClass: "bg-orange-50 dark:bg-orange-950/40",
  },
  {
    key: "disabled",
    label: "Disabled",
    description: "Block login access",
    icon: Ban,
    iconClass: "text-red-500",
    bgClass: "bg-red-50 dark:bg-red-950/40",
  },
] as const;

function TableRowSkeleton() {
  return (
    <tr className="border-b border-border/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      </td>
      <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
      {COLUMNS.map((c) => (
        <td key={c.key} className="px-4 py-3 text-center">
          <Skeleton className="h-5 w-9 rounded-full mx-auto" />
        </td>
      ))}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 justify-end">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </td>
    </tr>
  );
}

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
  const [deviceSearch, setDeviceSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const session = (await getCurrentSession()) as any;
      const admin = Boolean(session?.administrator);
      setIsAdmin(admin);
      setCurrentUserId(Number(session?.id) || null);
      if (!admin) { setUsers([]); return; }
      const list = await getTraccarUsers();
      setUsers(list);
    } catch (error: any) {
      toast({ title: "Failed to load user access", description: error?.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const setUserField = (userId: number, field: keyof TraccarUser, value: boolean) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, [field]: value } : u)));
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
      toast({ title: "Failed to update access", description: error?.message || "Save failed", variant: "destructive" });
    } finally {
      setSavingUserId(null);
    }
  };

  const handleDelete = async (user: TraccarUser) => {
    if (currentUserId && user.id === currentUserId) {
      toast({ title: "Cannot delete current user", description: "Use a different admin account to remove this user.", variant: "destructive" });
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
      toast({ title: "Failed to delete user", description: error?.message || "Delete failed", variant: "destructive" });
    } finally {
      setDeletingUserId(null);
    }
  };

  const openAssignDevicesDialog = async (user: TraccarUser) => {
    try {
      setAssigningUserId(user.id);
      setSelectedUserForDevices(user);
      setDeviceSearch("");
      const devices = await getDevices();
      const normalizedDevices = (devices || []).map((d: any) => ({
        id: Number(d.id),
        name: String(d.name || `Device ${d.id}`),
      }));
      let assigned: number[] = [];
      try {
        const permissions = await traccarGetCollection({ url: "/permissions", params: { userId: user.id }, normalize: (item) => item });
        assigned = (permissions || []).map((p: any) => Number(p.deviceId)).filter((id: number) => Number.isFinite(id));
      } catch {
        const assignedDevices = await traccarGetCollection({ url: "/devices", params: { userId: user.id }, normalize: (item) => item });
        assigned = (assignedDevices || []).map((d: any) => Number(d.id)).filter((id: number) => Number.isFinite(id));
      }
      setAvailableDevices(normalizedDevices);
      setSelectedDeviceIds(assigned);
      setInitialAssignedDeviceIds(assigned);
      setDeviceDialogOpen(true);
    } catch (error: any) {
      toast({ title: "Failed to load devices", description: error?.message || "Could not open assignment dialog", variant: "destructive" });
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
        ...toRemove.map((deviceId) => traccarDelete("/permissions", { data: { userId, deviceId } })),
      ]);
      toast({ title: "Device permissions updated" });
      setDeviceDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Failed to update device permissions", description: error?.message || "Save failed", variant: "destructive" });
    } finally {
      setAssigningUserId(null);
    }
  };

  const filtered = users.filter((u) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const filteredDevices = availableDevices.filter((d) =>
    d.name.toLowerCase().includes(deviceSearch.trim().toLowerCase())
  );

  const adminCount = users.filter((u) => u.administrator).length;
  const disabledCount = users.filter((u) => u.disabled).length;
  const activeCount = users.filter((u) => !u.disabled).length;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-6 space-y-6">

          {/* ── Page Header ── */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">User Access</h1>
                <p className="text-sm text-muted-foreground">
                  Manage permissions and device assignments for all users
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => void load()} className="gap-2 shrink-0">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>

          {/* ── Not Admin State ── */}
          {!loading && !isAdmin && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-5 flex items-start gap-3">
              <ShieldOff className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-amber-700 dark:text-amber-400">Admin Access Required</p>
                <p className="text-sm text-amber-600 dark:text-amber-500 mt-0.5">
                  Only Traccar administrators can view and manage user permissions.
                </p>
              </div>
            </div>
          )}

          {isAdmin && (
            <>
              {/* ── Stats Row ── */}
              {!loading && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{users.length}</p>
                      <p className="text-xs text-muted-foreground">Total Users</p>
                    </div>
                  </div>
                  <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{adminCount}</p>
                      <p className="text-xs text-muted-foreground">Administrators</p>
                    </div>
                  </div>
                  <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                      <UserCog className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{activeCount}</p>
                      <p className="text-xs text-muted-foreground">Active Users</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Search ── */}
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>

              {/* ── Table ── */}
              <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-4 py-3 text-left font-semibold text-foreground w-64">
                          User
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground w-28">
                          Status
                        </th>
                        {COLUMNS.map((col) => {
                          const Icon = col.icon;
                          return (
                            <th key={col.key} className="px-4 py-3 text-center font-semibold text-foreground min-w-[120px]">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex flex-col items-center gap-1 cursor-default select-none">
                                    <div className={`flex h-7 w-7 items-center justify-center rounded-md ${col.bgClass}`}>
                                      <Icon className={`h-3.5 w-3.5 ${col.iconClass}`} />
                                    </div>
                                    <span className="text-xs">{col.label}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top">{col.description}</TooltipContent>
                              </Tooltip>
                            </th>
                          );
                        })}
                        <th className="px-4 py-3 text-right font-semibold text-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-border/50">
                      {loading ? (
                        [1, 2, 3, 4].map((i) => <TableRowSkeleton key={i} />)
                      ) : filtered.length === 0 ? (
                        <tr>
                          <td colSpan={2 + COLUMNS.length + 1} className="py-16 text-center">
                            <div className="flex flex-col items-center gap-3">
                              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                                <Users className="h-7 w-7 text-muted-foreground" />
                              </div>
                              <p className="font-medium text-muted-foreground">
                                {query ? "No users match your search" : "No users found"}
                              </p>
                              {query && (
                                <Button variant="ghost" size="sm" onClick={() => setQuery("")}>
                                  Clear search
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filtered.map((user) => {
                          const isSaving = savingUserId === user.id;
                          const isDeleting = deletingUserId === user.id;
                          const isAssigning = assigningUserId === user.id;
                          const isBusy = isSaving || isDeleting || isAssigning;

                          return (
                            <tr
                              key={user.id}
                              className={`group transition-colors hover:bg-muted/30 ${user.disabled ? "opacity-60" : ""}`}
                            >
                              {/* User */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <Avatar className="h-9 w-9 shrink-0">
                                    <AvatarFallback className={`${getAvatarColor(user.id)} text-white text-xs font-semibold`}>
                                      {getInitials(user.name, user.email)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="font-medium truncate leading-tight">
                                      {user.name || `User #${user.id}`}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                                      {user.email || "—"}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Status */}
                              <td className="px-4 py-3">
                                {user.disabled ? (
                                  <Badge variant="destructive" className="gap-1 text-xs">
                                    <Ban className="h-3 w-3" />
                                    Disabled
                                  </Badge>
                                ) : (
                                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 gap-1 text-xs">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                                    Active
                                  </Badge>
                                )}
                              </td>

                              {/* Permission toggles */}
                              {COLUMNS.map((col) => (
                                <td key={col.key} className="px-4 py-3 text-center">
                                  <div className="flex justify-center">
                                    <Switch
                                      checked={Boolean(user[col.key as keyof TraccarUser])}
                                      onCheckedChange={(v) => setUserField(user.id, col.key as keyof TraccarUser, v)}
                                      disabled={isBusy}
                                    />
                                  </div>
                                </td>
                              ))}

                              {/* Actions */}
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5 justify-end">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 gap-1.5"
                                        disabled={isBusy}
                                        onClick={() => void openAssignDevicesDialog(user)}
                                      >
                                        <Link2 className="h-3.5 w-3.5" />
                                        <span>{isAssigning ? "Loading…" : "Devices"}</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Assign Devices</TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        disabled={isBusy || user.id === currentUserId}
                                        onClick={() => void handleDelete(user)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {user.id === currentUserId ? "Cannot delete yourself" : "Delete User"}
                                    </TooltipContent>
                                  </Tooltip>

                                  <Button
                                    size="sm"
                                    className="h-8 gap-1.5"
                                    disabled={isBusy}
                                    onClick={() => void handleSave(user)}
                                  >
                                    <Save className="h-3.5 w-3.5" />
                                    {isSaving ? "Saving…" : "Save"}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table footer */}
                {!loading && filtered.length > 0 && (
                  <div className="border-t px-4 py-2.5 flex items-center justify-between bg-muted/20">
                    <p className="text-xs text-muted-foreground">
                      Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
                      <span className="font-medium text-foreground">{users.length}</span> users
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {disabledCount > 0 && (
                        <span>{disabledCount} disabled</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Assign Devices Dialog ── */}
          <Dialog open={deviceDialogOpen} onOpenChange={setDeviceDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MonitorSmartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <DialogTitle>Assign Devices</DialogTitle>
                    <DialogDescription className="mt-0.5">
                      {selectedUserForDevices?.name || selectedUserForDevices?.email}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search devices…"
                    value={deviceSearch}
                    onChange={(e) => setDeviceSearch(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>

                {availableDevices.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() => setSelectedDeviceIds(availableDevices.map((d) => d.id))}
                    >
                      <CheckSquare className="h-3.5 w-3.5" />
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() => setSelectedDeviceIds([])}
                    >
                      <Square className="h-3.5 w-3.5" />
                      Select None
                    </Button>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {selectedDeviceIds.length} / {availableDevices.length} selected
                    </span>
                  </div>
                )}

                <div className="max-h-72 overflow-y-auto rounded-lg border divide-y">
                  {availableDevices.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      No devices found.
                    </div>
                  ) : filteredDevices.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      No devices match your search.
                    </div>
                  ) : (
                    filteredDevices.map((device) => {
                      const checked = selectedDeviceIds.includes(device.id);
                      return (
                        <label
                          key={device.id}
                          className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                            checked ? "bg-primary/5" : "hover:bg-muted/40"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => toggleDeviceSelection(device.id, e.target.checked)}
                            className="h-4 w-4 rounded accent-primary"
                          />
                          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted shrink-0">
                            <MonitorSmartphone className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <span className="text-sm font-medium flex-1 truncate">{device.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">#{device.id}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setDeviceDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => void saveDeviceAssignments()}
                  disabled={assigningUserId === selectedUserForDevices?.id}
                  className="gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  {assigningUserId === selectedUserForDevices?.id ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

        </div>
      </div>
    </TooltipProvider>
  );
}
