-- Supabase Migration: 20260824_consultation_summaries_and_rls.sql
-- Enables Row Level Security (RLS) on visit_notes / consultation summaries

-- 1. Ensure columns exist on visit_notes
ALTER TABLE IF EXISTS public.visit_notes
  ADD COLUMN IF NOT EXISTS diagnosis text,
  ADD COLUMN IF NOT EXISTS symptoms text,
  ADD COLUMN IF NOT EXISTS treatment text,
  ADD COLUMN IF NOT EXISTS recommendations text,
  ADD COLUMN IF NOT EXISTS "followUpInstructions" text,
  ADD COLUMN IF NOT EXISTS "emailSent" boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "emailSentAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "emailError" text,
  ADD COLUMN IF NOT EXISTS "updatedAt" timestamptz DEFAULT NOW();

-- 2. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_visit_notes_appointment_id ON public.visit_notes("appointmentId");
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments("patientId");
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON public.appointments("doctorId");

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.visit_notes ENABLE ROW LEVEL SECURITY;

-- Policy 1: Patients can only view consultation summaries of their own appointments
CREATE POLICY "Patients can view their own consultation summaries"
  ON public.visit_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = public.visit_notes."appointmentId"
        AND a."patientId" = auth.uid()::text
    )
  );

-- Policy 2: Doctors can view and create/update consultation summaries for their assigned appointments
CREATE POLICY "Doctors can manage consultation summaries for their appointments"
  ON public.visit_notes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = public.visit_notes."appointmentId"
        AND a."doctorId" = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = public.visit_notes."appointmentId"
        AND a."doctorId" = auth.uid()::text
    )
  );

-- Policy 3: Admins can view all consultation records
CREATE POLICY "Admins can view all consultation summaries"
  ON public.visit_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()::text AND u.role = 'ADMIN'
    )
  );
