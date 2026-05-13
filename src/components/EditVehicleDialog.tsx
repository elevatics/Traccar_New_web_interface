import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Car, Save, ImageIcon, X, Upload, Trash2 } from "lucide-react";
import { getDeviceById, updateDevice } from "@/services/deviceService";
import { toast } from "sonner";

interface EditVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: number;
  deviceName?: string;
  onVehicleUpdated?: () => void;
}

const CATEGORY_OPTIONS = [
  { value: "car", label: "Car" },
  { value: "truck", label: "Truck" },
  { value: "bus", label: "Bus" },
  { value: "motorcycle", label: "Motorcycle" },
  { value: "bicycle", label: "Bicycle" },
  { value: "boat", label: "Boat" },
  { value: "crane", label: "Crane" },
  { value: "default", label: "Default" },
];

export default function EditVehicleDialog({
  open,
  onOpenChange,
  deviceId,
  deviceName,
  onVehicleUpdated,
}: EditVehicleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rawDevice, setRawDevice] = useState<Record<string, unknown> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: "",
    uniqueId: "",
    model: "",
    contact: "",
    phone: "",
    category: "car",
    plateNumber: "",
    driver: "",
    imageUrl: "",
  });

  useEffect(() => {
    if (!open || !deviceId) return;
    setLoading(true);
    getDeviceById(deviceId)
      .then((device: Record<string, unknown>) => {
        setRawDevice(device);
        const attrs = (device.attributes ?? {}) as Record<string, unknown>;
        // Image is stored in localStorage (never sent to Traccar DB to avoid column overflow)
        const storedImage = localStorage.getItem(`vehicle_image_${deviceId}`) ?? "";
        setForm({
          name: String(device.name ?? ""),
          uniqueId: String(device.uniqueId ?? ""),
          model: String(device.model ?? ""),
          contact: String(device.contact ?? ""),
          phone: String(device.phone ?? ""),
          category: String(device.category ?? "car"),
          plateNumber: String(attrs.plateNumber ?? ""),
          driver: String(attrs.driver ?? ""),
          imageUrl: storedImage,
        });
      })
      .catch(() => toast.error("Failed to load device details"))
      .finally(() => setLoading(false));
  }, [open, deviceId]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Vehicle name is required");
      return;
    }
    if (!rawDevice) return;
    setSaving(true);
    try {
      // Save image to localStorage — never in Traccar attributes (avoids MySQL column overflow)
      const imageData = form.imageUrl.trim();
      if (imageData) {
        localStorage.setItem(`vehicle_image_${deviceId}`, imageData);
      } else {
        localStorage.removeItem(`vehicle_image_${deviceId}`);
      }

      // Strip any legacy imageUrl from attributes before sending to Traccar
      const rawAttrs = { ...((rawDevice.attributes ?? {}) as Record<string, unknown>) };
      delete rawAttrs.imageUrl;
      const attrs = {
        ...rawAttrs,
        plateNumber: form.plateNumber.trim() || undefined,
        driver: form.driver.trim() || undefined,
      };
      await updateDevice({
        ...rawDevice,
        name: form.name.trim(),
        uniqueId: form.uniqueId.trim(),
        model: form.model.trim(),
        contact: form.contact.trim(),
        phone: form.phone.trim(),
        category: form.category,
        attributes: attrs,
      });
      toast.success(`${form.name} updated successfully`);
      onVehicleUpdated?.();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? String(
              (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
                "Update failed"
            )
          : err instanceof Error
            ? err.message
            : "Update failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  /** Read file → compress on canvas → store as JPEG base64 data URL */
  const handleImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const MAX_W = 400;
        const MAX_H = 300;
        let { width, height } = img;
        if (width > MAX_W) { height = Math.round(height * (MAX_W / width)); width = MAX_W; }
        if (height > MAX_H) { width = Math.round(width * (MAX_H / height)); height = MAX_H; }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.75);
        setForm((p) => ({ ...p, imageUrl: compressed }));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Edit Vehicle
          </DialogTitle>
          <DialogDescription>
            Update device settings for{" "}
            <span className="font-medium">{deviceName || `Device ${deviceId}`}</span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ev-name">Vehicle Name *</Label>
                <Input id="ev-name" value={form.name} onChange={set("name")} placeholder="My Vehicle" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-uniqueId">Unique ID (IMEI)</Label>
                <Input id="ev-uniqueId" value={form.uniqueId} onChange={set("uniqueId")} placeholder="IMEI / Serial" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ev-plate">Plate Number</Label>
                <Input id="ev-plate" value={form.plateNumber} onChange={set("plateNumber")} placeholder="ABC-1234" />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ev-model">Model</Label>
                <Input id="ev-model" value={form.model} onChange={set("model")} placeholder="Toyota Camry" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-driver">Driver</Label>
                <Input id="ev-driver" value={form.driver} onChange={set("driver")} placeholder="Driver name" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ev-contact">Contact</Label>
                <Input id="ev-contact" value={form.contact} onChange={set("contact")} placeholder="owner@email.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-phone">Phone</Label>
                <Input id="ev-phone" value={form.phone} onChange={set("phone")} placeholder="+1 555 0000" />
              </div>
            </div>

            {/* Vehicle Image Upload */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4" />
                Vehicle Photo
              </Label>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageFile(file);
                  e.target.value = "";
                }}
              />

              {form.imageUrl ? (
                /* Preview with replace / remove buttons */
                <div className="flex items-start gap-3 p-3 border rounded-xl bg-muted/30">
                  <img
                    src={form.imageUrl}
                    alt="Vehicle"
                    className="h-20 w-28 object-cover rounded-lg border shadow-sm flex-shrink-0"
                  />
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground leading-snug">
                      Photo saved — displayed on vehicle cards, detail panel, and sidebar throughout the app.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-3.5 w-3.5 mr-1" />
                        Replace
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => setForm((p) => ({ ...p, imageUrl: "" }))}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Upload drop zone */
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleImageFile(file);
                  }}
                  className="w-full border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-6 flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                    <Car className="h-5 w-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Upload vehicle photo</p>
                    <p className="text-xs mt-0.5">Click or drag &amp; drop · JPG, PNG, WebP · max 5 MB</p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                    <Upload className="h-3.5 w-3.5" />
                    Choose File
                  </div>
                </button>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
