import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

interface AddVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const vehicleTypes = ['Car', 'Truck', 'Van', 'Bus', 'SUV', 'Motorcycle', 'Trailer', 'Heavy Equipment'];
const fuelTypes = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG', 'LPG'];

export default function AddVehicleDialog({ open, onOpenChange }: AddVehicleDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
    const { error } = await supabase.from('vehicles').insert({
      name: form.name.trim(),
      identifier: form.identifier.trim(),
      plate_number: form.plate_number.trim() || null,
      driver: form.driver.trim() || null,
      vehicle_type: form.vehicle_type,
      make: form.make.trim() || null,
      model: form.model.trim() || null,
      year: form.year ? parseInt(form.year) : null,
      vin: form.vin.trim() || null,
      fuel_type: form.fuel_type,
    });
    setLoading(false);

    if (error) {
      toast({ title: 'Failed to add vehicle', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Vehicle added successfully' });
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
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
