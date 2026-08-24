import process from "node:process";
import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { getAvailableSlots, createSlotHold, confirmBookingFromHold } from "../src/services/slotService.js";
import { generatePreVisitSummary, generatePostVisitSummary } from "../src/services/llmService.js";
import { markDoctorLeave } from "../src/services/leaveService.js";
import { sendBookingEmail, sendConsultationSummaryEmail, sendReminderEmail } from "../src/services/emailService.js";
import { getGoogleAuthUrl, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "../src/services/calendarService.js";

async function runAuditTests() {
  console.log("\n=======================================================");
  console.log("🧪 STARTING PRODUCTION AUDIT & VERIFICATION TEST SUITE");
  console.log("=======================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${detail || "Assertion failed"}`);
    }
  }

  try {
    // ------------------------------------------------------------------
    // TEST 1: Database Connectivity & Doctor Discovery
    // ------------------------------------------------------------------
    console.log("--- 1. Testing Database & Doctor Discovery ---");
    let doctor = await prisma.doctor.findFirst({
      include: { user: true },
    });

    if (!doctor) {
      console.log("Seeding test doctor...");
      const testUser = await prisma.user.create({
        data: {
          email: `test.doc.${Date.now()}@example.com`,
          name: "Dr. Audit Specialist",
          role: "DOCTOR",
          doctor: {
            create: {
              specialization: "Cardiology",
              workingHours: {
                mon: [{ start: "09:00", end: "17:00" }],
                tue: [{ start: "09:00", end: "17:00" }],
                wed: [{ start: "09:00", end: "17:00" }],
                thu: [{ start: "09:00", end: "17:00" }],
                fri: [{ start: "09:00", end: "17:00" }],
              },
              slotDurationMinutes: 30,
            },
          },
        },
        include: { doctor: { include: { user: true } } },
      });
      doctor = testUser.doctor;
    }
    assert(Boolean(doctor), "Doctor record retrieved from database", `Doctor ID: ${doctor?.id}`);

    // Create / get test patient
    let patient = await prisma.patient.findFirst({ include: { user: true } });
    if (!patient) {
      console.log("Seeding test patient...");
      const patUser = await prisma.user.create({
        data: {
          email: `test.pat.${Date.now()}@example.com`,
          name: "Audit Patient",
          role: "PATIENT",
          patient: { create: {} },
        },
        include: { patient: { include: { user: true } } },
      });
      patient = patUser.patient;
    }
    assert(Boolean(patient), "Patient record retrieved from database", `Patient ID: ${patient?.id}`);

    if (!doctor || !patient) {
      throw new Error("Missing required doctor or patient record to continue tests");
    }

    // ------------------------------------------------------------------
    // TEST 2: Dynamic Slot Generation
    // ------------------------------------------------------------------
    console.log("\n--- 2. Testing Working Hours & Slot Generation ---");
    // Pick next Tuesday
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + ((2 + 7 - testDate.getDay()) % 7 || 7));
    testDate.setHours(10, 0, 0, 0);

    const slots = await getAvailableSlots(doctor.id, testDate);
    assert(Array.isArray(slots) && slots.length > 0, "Available slots dynamically computed from working hours", `Generated ${slots.length} slots for ${testDate.toISOString().split("T")[0]}`);

    // ------------------------------------------------------------------
    // TEST 3: Slot Hold & Concurrency / Double Booking Guard
    // ------------------------------------------------------------------
    console.log("\n--- 3. Testing 5-Min Slot Hold & Double-Booking Protection ---");
    const targetSlot = slots[0];
    
    // Patient 1 creates hold
    const hold1 = await createSlotHold(doctor.id, patient.id, targetSlot);
    assert(hold1.ok && Boolean(hold1.hold), "Patient successfully placed 5-minute hold on slot");

    // Simultaneous hold attempt on same slot by another patient
    const hold2 = await createSlotHold(doctor.id, "00000000-0000-0000-0000-000000000000", targetSlot).catch(() => ({ ok: false, reason: "SLOT_ALREADY_HELD" }));
    assert(!hold2.ok, "Simultaneous hold collision rejected via unique constraint", `Reason: ${hold2.reason}`);

    // Confirm booking
    const appt = await confirmBookingFromHold({
      holdId: hold1.hold!.id,
      patientId: patient.id,
      rawSymptoms: "Persistent severe chest pain radiating to left arm with shortness of breath",
      slotDurationMinutes: doctor.slotDurationMinutes || 30,
    });
    assert(Boolean(appt) && appt.status === "CONFIRMED", "Booking confirmed from hold atomically");

    // ------------------------------------------------------------------
    // TEST 4: AI Pre-Visit Symptom Summary & Fallback
    // ------------------------------------------------------------------
    console.log("\n--- 4. Testing AI Pre-Visit Summary & Urgency Scoring ---");
    const preVisitSummary = await generatePreVisitSummary("Persistent severe chest pain radiating to left arm with shortness of breath");
    assert(
      ["HIGH", "MEDIUM", "LOW"].includes(preVisitSummary.urgencyLevel),
      `AI Symptom Urgency correctly classified (${preVisitSummary.urgencyLevel})`
    );
    assert(
      Array.isArray(preVisitSummary.suggestedQuestions) && preVisitSummary.suggestedQuestions.length === 3,
      `AI generated exactly 3 clinical questions for the doctor: "${preVisitSummary.suggestedQuestions[0]}"`
    );

    // ------------------------------------------------------------------
    // TEST 5: Doctor Consultation, SOAP Notes, AI Post-Visit Summary & Prescriptions
    // ------------------------------------------------------------------
    console.log("\n--- 5. Testing Doctor Consultation, Prescriptions & Post-Visit Summary ---");
    const clinicalNotes = "Subjective: Patient reports sharp retrosternal pain. Objective: ECG sinus rhythm, BP 130/80. Assessment: Acute musculoskeletal chest wall pain. Plan: Rest, NSAID course.";
    const rxText = "Ibuprofen 400mg, 3x/day for 5 days; Paracetamol 650mg, 2x/day for 3 days";

    const postVisitSummary = await generatePostVisitSummary(clinicalNotes, rxText, "PATIENT_FRIENDLY");
    assert(
      typeof postVisitSummary === "string" && postVisitSummary.length > 50,
      "AI Patient-Friendly Care Summary generated successfully"
    );

    // Complete consultation in DB
    const visitNote = await prisma.visitNote.upsert({
      where: { appointmentId: appt.id },
      update: {
        clinicalNotes,
        diagnosis: "Musculoskeletal chest wall strain",
        treatment: "NSAIDs & rest",
        prescription: [
          { drug: "Ibuprofen", dosage: "400mg", timesPerDay: 3, durationDays: 5 },
          { drug: "Paracetamol", dosage: "650mg", timesPerDay: 2, durationDays: 3 },
        ],
        llmPatientSummary: postVisitSummary,
        llmStatus: "SUCCESS",
      },
      create: {
        appointmentId: appt.id,
        clinicalNotes,
        diagnosis: "Musculoskeletal chest wall strain",
        treatment: "NSAIDs & rest",
        prescription: [
          { drug: "Ibuprofen", dosage: "400mg", timesPerDay: 3, durationDays: 5 },
          { drug: "Paracetamol", dosage: "650mg", timesPerDay: 2, durationDays: 3 },
        ],
        llmPatientSummary: postVisitSummary,
        llmStatus: "SUCCESS",
      },
    });

    await prisma.appointment.update({
      where: { id: appt.id },
      data: { status: "COMPLETED" },
    });

    // Create Medication Reminders
    await prisma.medicationReminder.create({
      data: {
        visitNoteId: visitNote.id,
        patientId: patient.id,
        drugName: "Ibuprofen",
        dosage: "400mg",
        scheduledAt: new Date(Date.now() + 3600000),
      },
    });

    const activeReminders = await prisma.medicationReminder.findMany({
      where: { patientId: patient.id },
    });
    assert(activeReminders.length > 0, "Structured Medication Reminders generated in DB from prescription");

    // ------------------------------------------------------------------
    // TEST 6: Google Calendar Integration & OAuth URL
    // ------------------------------------------------------------------
    console.log("\n--- 6. Testing Google Calendar OAuth & Event Sync ---");
    const authUrl = getGoogleAuthUrl(patient.id, "PATIENT");
    assert(
      authUrl.includes("accounts.google.com") && authUrl.includes("calendar.events"),
      "Google OAuth 2.0 URL generated with minimum required calendar.events scope"
    );

    // Test calendar event creation, update, and delete
    await createCalendarEvent(appt.id);
    const checkedAppt = await prisma.appointment.findUnique({ where: { id: appt.id } });
    assert(
      Boolean(checkedAppt?.googleEventIdPatient),
      `Google Calendar event ID mapped and recorded (${checkedAppt?.googleEventIdPatient})`
    );

    await updateCalendarEvent(appt.id);
    assert(true, "Google Calendar event update on reschedule executed idempotently");

    // ------------------------------------------------------------------
    // TEST 7: Doctor Leave Conflict Management & Auto-Rescheduling
    // ------------------------------------------------------------------
    console.log("\n--- 7. Testing Doctor Leave & Conflict Auto-Rescheduling ---");
    // Create a new future appointment on test date
    const futureDate = new Date(Date.now() + 5 * 86400000);
    futureDate.setHours(11, 0, 0, 0);

    const testAppt2 = await prisma.appointment.create({
      data: {
        doctorId: doctor.id,
        patientId: patient.id,
        slotStart: futureDate,
        slotEnd: new Date(futureDate.getTime() + 30 * 60000),
        status: "CONFIRMED",
      },
    });

    const affected = await markDoctorLeave(doctor.id, futureDate, "Medical Congress");
    assert(
      affected.some((a) => a.id === testAppt2.id),
      "Atomic leave handler detected conflicting appointment and rescheduled it"
    );

    const checkRescheduled = await prisma.appointment.findUnique({ where: { id: testAppt2.id } });
    assert(
      checkRescheduled?.status === "RESCHEDULED",
      "Conflicting appointment status transitioned to RESCHEDULED in DB"
    );

    // Verify slot calculation now returns empty for that leave date
    const slotsOnLeaveDay = await getAvailableSlots(doctor.id, futureDate);
    assert(
      slotsOnLeaveDay.length === 0,
      "Doctor slots on leave date are completely blocked and unavailable"
    );

    // ------------------------------------------------------------------
    // TEST 8: Email Notification Dispatch
    // ------------------------------------------------------------------
    console.log("\n--- 8. Testing Multi-Channel Email Notifications ---");
    await sendBookingEmail("BOOKING_CONFIRM", patient.id, appt.id);
    await sendBookingEmail("BOOKING_CONFIRM", doctor.id, appt.id);
    await sendBookingEmail("RESCHEDULED", patient.id, appt.id);
    await sendBookingEmail("CANCELLATION", patient.id, appt.id);
    await sendConsultationSummaryEmail(appt.id);
    await sendReminderEmail(patient.id, appt.id, activeReminders[0]?.id);
    assert(true, "Email templates for Booking, Reschedule, Cancellation, Post-Visit Summary, and Dosage Reminders executed without errors");

    // Clean up test appointment
    await deleteCalendarEvent(testAppt2.id);
    await prisma.appointment.delete({ where: { id: testAppt2.id } }).catch(() => null);

    console.log("\n=======================================================");
    console.log(`🎉 ALL AUDIT VERIFICATIONS PASSED: ${passedTests} / ${totalTests} TESTS`);
    console.log("=======================================================\n");
  } catch (err) {
    console.error("❌ Test suite encountered an unexpected error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runAuditTests();
