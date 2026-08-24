import { PrismaClient } from "@prisma/client";
import * as crypto from "crypto";
import "dotenv/config";

const prisma = new PrismaClient();

// In Supabase, passwords in auth.users are hashed with bcrypt.
// We can use postgres extension pgcrypto: crypt('Password123!', gen_salt('bf'))
async function provisionDirectly() {
  console.log("Directly provisioning confirmed doctor, admin, and patient accounts in Supabase auth.users...");

  // Enable pgcrypto if not present
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  const accounts = [
    {
      email: "admin@hospital.com",
      password: "Password123!",
      name: "System Admin",
      role: "ADMIN",
    },
    {
      email: "dr.jenkins@hospital.com",
      password: "Password123!",
      name: "Dr. Sarah Jenkins",
      role: "DOCTOR",
      specialization: "Cardiology",
    },
    {
      email: "dr.morgan@hospital.com",
      password: "Password123!",
      name: "Dr. Alex Morgan",
      role: "DOCTOR",
      specialization: "Dermatology",
    },
    {
      email: "dr.sharma@hospital.com",
      password: "Password123!",
      name: "Dr. Priya Sharma",
      role: "DOCTOR",
      specialization: "General Medicine",
    },
    {
      email: "dr.chen@hospital.com",
      password: "Password123!",
      name: "Dr. Michael Chen",
      role: "DOCTOR",
      specialization: "Neurology",
    },
    {
      email: "dr.davis@hospital.com",
      password: "Password123!",
      name: "Dr. Emily Davis",
      role: "DOCTOR",
      specialization: "Pediatrics",
    },
    {
      email: "patient@example.com",
      password: "Password123!",
      name: "John Doe",
      role: "PATIENT",
    },
  ];

  for (const acc of accounts) {
    console.log(`Setting up account: ${acc.email} (${acc.role})...`);

    // 1. Check if user exists in auth.users
    const existing: any = await prisma.$queryRawUnsafe(
      `SELECT id, email FROM auth.users WHERE email = $1;`,
      acc.email
    );

    let authId: string;

    if (existing && existing.length > 0) {
      authId = existing[0].id;
      // Update password to Password123! and confirm email
      await prisma.$executeRawUnsafe(
        `UPDATE auth.users
         SET encrypted_password = crypt($1, gen_salt('bf')),
             email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
             raw_user_meta_data = jsonb_build_object('name', $2::text, 'role', $3::text),
             raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', $3::text),
             updated_at = NOW()
         WHERE email = $4;`,
        acc.password,
        acc.name,
        acc.role,
        acc.email
      );
      console.log(`  -> Updated existing auth.users record: ${authId}`);
    } else {
      authId = crypto.randomUUID();
      // Insert new confirmed user into auth.users
      await prisma.$executeRawUnsafe(
        `INSERT INTO auth.users (
           id,
           instance_id,
           email,
           encrypted_password,
           email_confirmed_at,
           raw_app_meta_data,
           raw_user_meta_data,
           created_at,
           updated_at,
           role,
           aud
         ) VALUES (
           $1::uuid,
           '00000000-0000-0000-0000-000000000000'::uuid,
           $2,
           crypt($3, gen_salt('bf')),
           NOW(),
           jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', $4::text),
           jsonb_build_object('name', $5::text, 'role', $4::text),
           NOW(),
           NOW(),
           'authenticated',
           'authenticated'
         );`,
        authId,
        acc.email,
        acc.password,
        acc.role,
        acc.name
      );
      console.log(`  -> Inserted new confirmed auth.users record: ${authId}`);
    }

    // 2. Ensure public.users and role sub-tables have exact matching ID and role
    await prisma.$executeRawUnsafe(
      `INSERT INTO public.users (id, email, name, role, "createdAt")
       VALUES ($1, $2, $3, $4::public."Role", NOW())
       ON CONFLICT (email) DO UPDATE
       SET id = EXCLUDED.id,
           role = EXCLUDED.role,
           name = EXCLUDED.name;`,
      authId,
      acc.email,
      acc.name,
      acc.role
    );

    if (acc.role === "DOCTOR") {
      await prisma.$executeRawUnsafe(
        `INSERT INTO public.doctors (id, specialization, "workingHours", "slotDurationMinutes", "createdAt")
         VALUES (
           $1,
           $2,
           '{"mon":[{"start":"09:00","end":"13:00"},{"start":"14:00","end":"17:00"}],"tue":[{"start":"09:00","end":"13:00"},{"start":"14:00","end":"17:00"}],"wed":[{"start":"09:00","end":"13:00"},{"start":"14:00","end":"17:00"}],"thu":[{"start":"09:00","end":"13:00"},{"start":"14:00","end":"17:00"}],"fri":[{"start":"09:00","end":"13:00"},{"start":"14:00","end":"17:00"}]}'::jsonb,
           30,
           NOW()
         )
         ON CONFLICT (id) DO UPDATE
         SET specialization = EXCLUDED.specialization;`,
        authId,
        acc.specialization || "General Medicine"
      );
    } else if (acc.role === "PATIENT") {
      await prisma.$executeRawUnsafe(
        `INSERT INTO public.patients (id, "createdAt")
         VALUES ($1, NOW())
         ON CONFLICT (id) DO NOTHING;`,
        authId
      );
    }
  }

  console.log("✅ All Doctor, Admin, and Patient accounts are confirmed and ready for instant login!");
}

provisionDirectly()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
