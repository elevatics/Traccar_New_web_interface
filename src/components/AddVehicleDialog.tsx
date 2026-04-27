import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import { createDevice, getDevices } from '@/services/deviceService';

interface AddVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVehicleAdded?: () => Promise<void> | void;
}

const vehicleTypes = ['Car', 'Truck', 'Van', 'Bus', 'SUV', 'Motorcycle', 'Trailer', 'Heavy Equipment'];
const fuelTypes = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG', 'LPG'];

export default function AddVehicleDialog({ open, onOpenChange, onVehicleAdded }: AddVehicleDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    identifier: '',
    plate_number: '',
    driver: '',
    vehicle_type: 'car',
    make: '',
    model: '',
    year: '',
    vin: '',
    fuel_type: 'petrol',
  });

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.identifier.trim()) {
      toast({ title: 'Name and Identifier are required', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const existingDevices = await getDevices();
      const normalizedIdentifier = form.identifier.trim().toLowerCase();
      const duplicate = existingDevices.find(
        (device: any) => String(device?.uniqueId || '').trim().toLowerCase() === normalizedIdentifier
      );
      if (duplicate) {
        throw new Error(`Identifier "${form.identifier.trim()}" already exists. Use a unique identifier.`);
      }

      await createDevice({
        name: form.name,
        uniqueId: form.identifier,
        category: form.vehicle_type,
        model: [form.make.trim(), form.model.trim(), form.year.trim()].filter(Boolean).join(' '),
        attributes: {
          plateNumber: form.plate_number.trim() || undefined,
          driver: form.driver.trim() || undefined,
          vin: form.vin.trim() || undefined,
          fuelType: form.fuel_type,
        },
      });

      if (onVehicleAdded) {
        await onVehicleAdded();
      }
    } catch (error: any) {
      const serverMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.response?.data?.details ||
        error?.response?.data;
      toast({
        title: 'Failed to add vehicle',
        description:
          (typeof serverMessage === 'string' && serverMessage) ||
          error?.message ||
          'Unable to create device in Traccar',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    setLoading(false);
    toast({ title: 'Vehicle added successfully in Traccar' });
    setForm({ name: '', identifier: '', plate_number: '', driver: '', vehicle_type: 'car', make: '', model: '', year: '', vin: '', fuel_type: 'petrol' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Vehicle
          </DialogTitle>
          <DialogDescription>Enter vehicle details. Name and Identifier are required.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" placeholder="e.g. Fleet Truck 01" value={form.name} onChange={e => updateField('name', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="identifier">Identifier *</Label>
              <Input id="identifier" placeholder="e.g. VH-001" value={form.identifier} onChange={e => updateField('identifier', e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plate_number">Plate Number</Label>
              <Input id="plate_number" placeholder="e.g. ABC-1234" value={form.plate_number} onChange={e => updateField('plate_number', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver">Assigned Driver</Label>
              <Input id="driver" placeholder="e.g. John Doe" value={form.driver} onChange={e => updateField('driver', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vehicle Type</Label>
              <Select value={form.vehicle_type} onValueChange={v => updateField('vehicle_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {vehicleTypes.map(t => <SelectItem key={t} value={t.toLowerCase()}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fuel Type</Label>
              <Select value={form.fuel_type} onValueChange={v => updateField('fuel_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {fuelTypes.map(t => <SelectItem key={t} value={t.toLowerCase()}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="make">Make</Label>
              <Input id="make" placeholder="e.g. Toyota" value={form.make} onChange={e => updateField('make', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input id="model" placeholder="e.g. Hilux" value={form.model} onChange={e => updateField('model', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input id="year" type="number" placeholder="e.g. 2024" value={form.year} onChange={e => updateField('year', e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vin">VIN</Label>
            <Input id="vin" placeholder="Vehicle Identification Number" value={form.vin} onChange={e => updateField('vin', e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Vehicle'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
