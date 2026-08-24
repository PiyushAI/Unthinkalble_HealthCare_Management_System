import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Create Admin
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@hospital.com" },
    update: {},
    create: {
      email: "admin@hospital.com",
      name: "System Admin",
      role: Role.ADMIN,
      phone: "+1-555-0100",
    },
  });

  // 2. Create Doctors
  const doctorsData = [
    {
      name: "Dr. Sarah Jenkins",
      email: "dr.jenkins@hospital.com",
      phone: "+1-555-0101",
      specialization: "Cardiology",
      slotDurationMinutes: 30,
      workingHours: {
        mon: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "17:00" }],
        tue: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "17:00" }],
        wed: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "17:00" }],
        thu: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "17:00" }],
        fri: [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "16:00" }],
        sat: [],
        sun: [],
      },
    },
    {
      name: "Dr. Alex Morgan",
      email: "dr.morgan@hospital.com",
      phone: "+1-555-0102",
      specialization: "Dermatology",
      slotDurationMinutes: 30,
      workingHours: {
        mon: [{ start: "10:00", end: "14:00" }, { start: "15:00", end: "18:00" }],
        tue: [{ start: "10:00", end: "14:00" }, { start: "15:00", end: "18:00" }],
        wed: [{ start: "10:00", end: "14:00" }, { start: "15:00", end: "18:00" }],
        thu: [{ start: "10:00", end: "14:00" }, { start: "15:00", end: "18:00" }],
        fri: [{ start: "10:00", end: "14:00" }],
        sat: [{ start: "09:00", end: "12:00" }],
        sun: [],
      },
    },
    {
      name: "Dr. Priya Sharma",
      email: "dr.sharma@hospital.com",
      phone: "+1-555-0103",
      specialization: "General Medicine",
      slotDurationMinutes: 20,
      workingHours: {
        mon: [{ start: "08:30", end: "12:30" }, { start: "13:30", end: "16:30" }],
        tue: [{ start: "08:30", end: "12:30" }, { start: "13:30", end: "16:30" }],
        wed: [{ start: "08:30", end: "12:30" }, { start: "13:30", end: "16:30" }],
        thu: [{ start: "08:30", end: "12:30" }, { start: "13:30", end: "16:30" }],
        fri: [{ start: "08:30", end: "12:30" }, { start: "13:30", end: "16:30" }],
        sat: [],
        sun: [],
      },
    },
    {
      name: "Dr. Michael Chen",
      email: "dr.chen@hospital.com",
      phone: "+1-555-0104",
      specialization: "Neurology",
      slotDurationMinutes: 45,
      workingHours: {
        mon: [{ start: "09:00", end: "14:00" }],
        tue: [],
        wed: [{ start: "09:00", end: "14:00" }],
        thu: [],
        fri: [{ start: "09:00", end: "14:00" }],
        sat: [],
        sun: [],
      },
    },
    {
      name: "Dr. Emily Davis",
      email: "dr.davis@hospital.com",
      phone: "+1-555-0105",
      specialization: "Pediatrics",
      slotDurationMinutes: 30,
      workingHours: {
        mon: [],
        tue: [{ start: "09:30", end: "15:30" }],
        wed: [],
        thu: [{ start: "09:30", end: "15:30" }],
        fri: [],
        sat: [{ start: "09:00", end: "13:00" }],
        sun: [],
      },
    },
  ];

  for (const doc of doctorsData) {
    const user = await prisma.user.upsert({
      where: { email: doc.email },
      update: { name: doc.name, phone: doc.phone },
      create: {
        email: doc.email,
        name: doc.name,
        role: Role.DOCTOR,
        phone: doc.phone,
      },
    });

    await prisma.doctor.upsert({
      where: { id: user.id },
      update: {
        specialization: doc.specialization,
        workingHours: doc.workingHours,
        slotDurationMinutes: doc.slotDurationMinutes,
      },
      create: {
        id: user.id,
        specialization: doc.specialization,
        workingHours: doc.workingHours,
        slotDurationMinutes: doc.slotDurationMinutes,
      },
    });
  }

  // 3. Create Sample Patients
  const patientsData = [
    {
      name: "John Doe",
      email: "john.doe@example.com",
      phone: "+1-555-0201",
      dob: new Date("1992-05-14"),
      gender: "Male",
    },
    {
      name: "Jane Smith",
      email: "jane.smith@example.com",
      phone: "+1-555-0202",
      dob: new Date("1988-11-23"),
      gender: "Female",
    },
  ];

  for (const pat of patientsData) {
    const user = await prisma.user.upsert({
      where: { email: pat.email },
      update: { name: pat.name, phone: pat.phone },
      create: {
        email: pat.email,
        name: pat.name,
        role: Role.PATIENT,
        phone: pat.phone,
      },
    });

    await prisma.patient.upsert({
      where: { id: user.id },
      update: {
        dob: pat.dob,
        gender: pat.gender,
      },
      create: {
        id: user.id,
        dob: pat.dob,
        gender: pat.gender,
      },
    });
  }

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
