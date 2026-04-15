
CREATE TABLE public.geofences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  radius_meters DOUBLE PRECISION NOT NULL DEFAULT 500,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Geofences are publicly accessible"
ON public.geofences FOR SELECT USING (true);

CREATE POLICY "Anyone can create geofences"
ON public.geofences FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update geofences"
ON public.geofences FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete geofences"
ON public.geofences FOR DELETE USING (true);
