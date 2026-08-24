import { createClient } from "@supabase/supabase-js";
import { PrismaClient, Role } from "@prisma/client";
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
const prisma = new PrismaClient();

const USERS_TO_PROVISION = [
  {
    email: "admin@hospital.com",
    password: "Password123!",
    name: "System Admin",
    role: "ADMIN" as Role,
    phone: "+1-555-0100",
  },
  {
    email: "dr.jenkins@hospital.com",
    password: "Password123!",
    name: "Dr. Sarah Jenkins",
    role: "DOCTOR" as Role,
    specialization: "Cardiology",
    phone: "+1-555-0101",
  },
  {
    email: "dr.morgan@hospital.com",
    password: "Password123!",
    name: "Dr. Alex Morgan",
    role: "DOCTOR" as Role,
    specialization: "Dermatology",
    phone: "+1-555-0102",
  },
  {
    email: "dr.sharma@hospital.com",
    password: "Password123!",
    name: "Dr. Priya Sharma",
    role: "DOCTOR" as Role,
    specialization: "General Medicine",
    phone: "+1-555-0103",
  },
  {
    email: "patient@example.com",
    password: "Password123!",
    name: "John Doe",
    role: "PATIENT" as Role,
    phone: "+1-555-0201",
  },
];

async function provision() {
  console.log("Creating/provisioning accounts in Supabase Auth & PostgreSQL...");

  for (const u of USERS_TO_PROVISION) {
    console.log(`Processing: ${u.email}...`);

    let authUserId: string | null = null;

    // 1. Try signUp
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: u.email,
      password: u.password,
      options: {
        data: {
          name: u.name,
          role: u.role,
        },
      },
    });

    if (signUpData?.user) {
      authUserId = signUpData.user.id;
      console.log(`  -> Supabase Auth user created: ${authUserId}`);
    } else if (signUpError) {
      console.log(`  -> SignUp note: ${signUpError.message}`);
      
      // Try signIn to get user ID if already created
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: u.email,
        password: u.password,
      });

      if (signInData?.user) {
        authUserId = signInData.user.id;
        console.log(`  -> Authenticated existing Supabase user: ${authUserId}`);
      }
    }

    // 2. If we have authUserId, sync to PostgreSQL
    if (authUserId) {
      const dbUser = await prisma.user.upsert({
        where: { email: u.email },
        update: {
          id: authUserId,
          name: u.name,
          role: u.role,
          phone: u.phone,
        },
        create: {
          id: authUserId,
          email: u.email,
          name: u.name,
          role: u.role,
          phone: u.phone,
        },
      });

      if (u.role === "DOCTOR") {
        await prisma.doctor.upsert({
          where: { id: dbUser.id },
          update: {
            specialization: u.specialization || "General Medicine",
          },
          create: {
            id: dbUser.id,
            specialization: u.specialization || "General Medicine",
            workingHours: {
              mon: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "17:00" }],
              tue: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "17:00" }],
              wed: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "17:00" }],
              thu: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "17:00" }],
              fri: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "17:00" }],
            },
            slotDurationMinutes: 30,
          },
        });
      } else if (u.role === "PATIENT") {
        await prisma.patient.upsert({
          where: { id: dbUser.id },
          update: {
            gender: "Other",
          },
          create: {
            id: dbUser.id,
            gender: "Other",
          },
        });
      }
    }
  }

  console.log("All accounts successfully provisioned!");
}

provision()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
