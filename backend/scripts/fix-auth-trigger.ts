import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function fix() {
  console.log("Fixing handle_new_user trigger function in database...");

  // Update handle_new_user to be robust against email conflict
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $function$
    DECLARE
      assigned_role public."Role";
      user_name text;
    BEGIN
      IF (new.raw_user_meta_data->>'role') = 'DOCTOR' THEN
        assigned_role := 'DOCTOR'::public."Role";
      ELSIF (new.raw_user_meta_data->>'role') = 'ADMIN' THEN
        assigned_role := 'ADMIN'::public."Role";
      ELSE
        assigned_role := 'PATIENT'::public."Role";
      END IF;

      user_name := COALESCE(
        new.raw_user_meta_data->>'name',
        new.raw_user_meta_data->>'full_name',
        split_part(new.email, '@', 1)
      );

      -- Upsert by email or id
      INSERT INTO public.users (id, email, name, role, "createdAt")
      VALUES (
        new.id::text,
        new.email,
        user_name,
        assigned_role,
        NOW()
      )
      ON CONFLICT (email) DO UPDATE
      SET id = EXCLUDED.id,
          role = EXCLUDED.role,
          name = COALESCE(EXCLUDED.name, public.users.name);

      -- If doctor, ensure doctor table has row
      IF assigned_role = 'DOCTOR'::public."Role" THEN
        INSERT INTO public.doctors (id, specialization, "workingHours", "slotDurationMinutes", "createdAt")
        VALUES (
          new.id::text,
          COALESCE(new.raw_user_meta_data->>'specialization', 'General Medicine'),
          '{"mon":[{"start":"09:00","end":"17:00"}],"tue":[{"start":"09:00","end":"17:00"}],"wed":[{"start":"09:00","end":"17:00"}],"thu":[{"start":"09:00","end":"17:00"}],"fri":[{"start":"09:00","end":"17:00"}]}'::jsonb,
          30,
          NOW()
        )
        ON CONFLICT (id) DO UPDATE
        SET specialization = COALESCE(EXCLUDED.specialization, public.doctors.specialization);
      END IF;

      -- If patient, ensure patient sub-table row exists
      IF assigned_role = 'PATIENT'::public."Role" THEN
        INSERT INTO public.patients (id, "createdAt")
        VALUES (new.id::text, NOW())
        ON CONFLICT (id) DO NOTHING;
      END IF;

      RETURN new;
    END;
    $function$;
  `);

  console.log("✅ Trigger function updated successfully!");
}

fix()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
