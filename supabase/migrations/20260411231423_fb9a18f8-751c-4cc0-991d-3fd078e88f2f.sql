
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  identifier TEXT NOT NULL UNIQUE,
  plate_number TEXT,
  driver TEXT,
  vehicle_type TEXT DEFAULT 'car',
  make TEXT,
  model TEXT,
  year INTEGER,
  vin TEXT,
  fuel_type TEXT DEFAULT 'petrol',
  status TEXT NOT NULL DEFAULT 'offline',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vehicles are publicly accessible" ON public.vehicles FOR SELECT USING (true);
CREATE POLICY "Anyone can create vehicles" ON public.vehicles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update vehicles" ON public.vehicles FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete vehicles" ON public.vehicles FOR DELETE USING (true);
