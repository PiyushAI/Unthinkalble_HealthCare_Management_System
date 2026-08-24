import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import * as crypto from "crypto";
import "dotenv/config";

const prisma = new PrismaClient();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function setupFullAuth() {
  console.log("Setting up full Supabase Auth with exact schema match...");

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
    let userId: string;
    const existing: any = await prisma.$queryRawUnsafe(
      `SELECT id FROM auth.users WHERE email = $1;`,
      acc.email
    );

    if (existing && existing.length > 0) {
      userId = existing[0].id;
    } else {
      userId = crypto.randomUUID();
    }

    // 1. Delete existing auth records for clean recreation
    await prisma.$executeRawUnsafe(
      `DELETE FROM auth.identities WHERE user_id = $1::uuid;`,
      userId
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM auth.users WHERE id = $1::uuid OR email = $2;`,
      userId,
      acc.email
    );

    // 2. Insert into auth.users (excluding generated confirmed_at)
    await prisma.$executeRawUnsafe(
      `INSERT INTO auth.users (
         instance_id,
         id,
         aud,
         role,
         email,
         encrypted_password,
         email_confirmed_at,
         confirmation_token,
         recovery_token,
         email_change_token_new,
         email_change_token_current,
         email_change,
         phone_change,
         phone_change_token,
         reauthentication_token,
         raw_app_meta_data,
         raw_user_meta_data,
         is_super_admin,
         is_sso_user,
         is_anonymous,
         email_change_confirm_status,
         created_at,
         updated_at
       ) VALUES (
         '00000000-0000-0000-0000-000000000000'::uuid,
         $1::uuid,
         'authenticated',
         'authenticated',
         $2,
         crypt($3, gen_salt('bf', 10)),
         NOW(),
         '',
         '',
         '',
         '',
         '',
         '',
         '',
         '',
         jsonb_build_object('provider', 'email', 'providers', array['email']),
         jsonb_build_object('sub', $1::text, 'name', $4::text, 'role', $5::text, 'email', $2::text, 'email_verified', true),
         null,
         false,
         false,
         0,
         NOW(),
         NOW()
       );`,
      userId,
      acc.email,
      acc.password,
      acc.name,
      acc.role
    );

    // 3. Insert into auth.identities (excluding generated email)
    await prisma.$executeRawUnsafe(
      `INSERT INTO auth.identities (
         id,
         provider_id,
         user_id,
         identity_data,
         provider,
         last_sign_in_at,
         created_at,
         updated_at
       ) VALUES (
         gen_random_uuid(),
         $1::text,
         $1::uuid,
         jsonb_build_object('sub', $1::text, 'email', $2::text, 'name', $3::text, 'role', $4::text, 'email_verified', true, 'phone_verified', false),
         'email',
         NOW(),
         NOW(),
         NOW()
       );`,
      userId,
      acc.email,
      acc.name,
      acc.role
    );

    // 4. Sync public.users
    await prisma.$executeRawUnsafe(
      `INSERT INTO public.users (id, email, name, role, "createdAt")
       VALUES ($1, $2, $3, $4::public."Role", NOW())
       ON CONFLICT (email) DO UPDATE
       SET id = EXCLUDED.id,
           role = EXCLUDED.role,
           name = EXCLUDED.name;`,
      userId,
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
        userId,
        acc.specialization || "General Medicine"
      );
    } else if (acc.role === "PATIENT") {
      await prisma.$executeRawUnsafe(
        `INSERT INTO public.patients (id, "createdAt")
         VALUES ($1, NOW())
         ON CONFLICT (id) DO NOTHING;`,
        userId
      );
    }
  }

  console.log("\n🧪 Testing live Supabase sign-in for Doctor, Admin, and Patient:\n");

  for (const acc of accounts) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: acc.email,
      password: acc.password,
    });

    if (error) {
      console.error(`❌ [${acc.role}] ${acc.email} failed:`, error.message);
    } else {
      console.log(`✅ [${acc.role}] ${acc.email} -> SUCCESS! Validated User ID: ${data.user.id}`);
    }
  }
}

setupFullAuth()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
