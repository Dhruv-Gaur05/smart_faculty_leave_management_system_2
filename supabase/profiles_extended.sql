-- Migration: Extend profiles table with phone, avatar_url, signature_url, room_number, emergency_contact
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS signature_url TEXT,
  ADD COLUMN IF NOT EXISTS room_number TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact TEXT;

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_profiles_employee_id ON public.profiles(employee_id);
