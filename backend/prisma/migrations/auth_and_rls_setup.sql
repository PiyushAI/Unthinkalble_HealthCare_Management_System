-- 1. Enable Row Level Security on public tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any to ensure clean idempotency
DROP POLICY IF EXISTS "Public profiles read" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Doctors public read" ON public.doctors;
DROP POLICY IF EXISTS "Patients own read" ON public.patients;
DROP POLICY IF EXISTS "Patients own update" ON public.patients;
DROP POLICY IF EXISTS "Appointments read policy" ON public.appointments;

-- 3. Users Table Policies
-- Any authenticated user can read user profiles (needed for doctor names and patient info)
CREATE POLICY "Public profiles read"
ON public.users FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
TO authenticated
USING (id = auth.uid()::text)
WITH CHECK (id = auth.uid()::text);

-- 4. Doctors Table Policies
-- Anyone (authenticated or guest) can view doctor profiles & specializations to book
CREATE POLICY "Doctors public read"
ON public.doctors FOR SELECT
TO authenticated, anon
USING (true);

-- 5. Patients Table Policies
-- Patients can view and update their own record, Admins can view all
CREATE POLICY "Patients own read"
ON public.patients FOR SELECT
TO authenticated
USING (
  id = auth.uid()::text OR 
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'ADMIN')
);

CREATE POLICY "Patients own update"
ON public.patients FOR UPDATE
TO authenticated
USING (id = auth.uid()::text)
WITH CHECK (id = auth.uid()::text);

-- 6. Appointments Table Policies
-- Patients see their own appointments, Doctors see theirs, Admins see all
CREATE POLICY "Appointments read policy"
ON public.appointments FOR SELECT
TO authenticated
USING (
  "patientId" = auth.uid()::text OR 
  "doctorId" = auth.uid()::text OR
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'ADMIN')
);

-- 7. Trigger to auto-create public.users record when a new user signs up via Supabase Auth / Google OAuth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  assigned_role public."Role";
  user_name text;
BEGIN
  -- Determine role from user metadata or default to PATIENT (never ADMIN automatically)
  IF (new.raw_user_meta_data->>'role') = 'DOCTOR' THEN
    assigned_role := 'DOCTOR'::public."Role";
  ELSIF (new.raw_user_meta_data->>'role') = 'ADMIN' THEN
    -- Admin role only if explicitly set via service role or pre-existing admin
    assigned_role := 'PATIENT'::public."Role";
  ELSE
    assigned_role := 'PATIENT'::public."Role";
  END IF;

  user_name := COALESCE(
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );

  INSERT INTO public.users (id, email, name, role, "createdAt")
  VALUES (
    new.id::text,
    new.email,
    user_name,
    assigned_role,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = COALESCE(public.users.name, EXCLUDED.name);

  -- If patient, ensure patient sub-table row exists
  IF assigned_role = 'PATIENT'::public."Role" THEN
    INSERT INTO public.patients (id, "createdAt")
    VALUES (new.id::text, NOW())
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
