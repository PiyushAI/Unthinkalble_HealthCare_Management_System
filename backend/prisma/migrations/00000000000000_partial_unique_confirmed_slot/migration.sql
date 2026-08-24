-- Hard DB-level double-booking guard.
-- Prisma cannot express a partial unique index directly in schema.prisma.
-- This ensures no doctor can ever have two CONFIRMED appointments at the same start time.

CREATE UNIQUE INDEX IF NOT EXISTS appointments_doctor_slot_confirmed_unique
ON appointments ("doctorId", "slotStart")
WHERE status = 'CONFIRMED';
