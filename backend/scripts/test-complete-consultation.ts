import { prisma } from "../src/lib/prisma.js";
import { generatePostVisitSummary } from "../src/services/llmService.js";
import { sendConsultationSummaryEmail } from "../src/services/emailService.js";

async function testComplete() {
  console.log("Testing complete consultation flow...");

  // Find any active appointment
  const appt = await prisma.appointment.findFirst({
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
    },
  });

  if (!appt) {
    console.log("No appointments found");
    return;
  }

  console.log(`Found appointment: ${appt.id} for patient: ${appt.patient.user.name}`);

  const clinicalNotes = "Subjective: Patient has fever and cough for 3 days.\nObjective: Vitals normal, chest clear.\nAssessment: Acute viral URI.\nPlan: Paracetamol, steam, rest.";
  const prescription = [
    { drug: "Paracetamol", dosage: "650mg", timesPerDay: 3, durationDays: 3 }
  ];
  const rxText = "Paracetamol 650mg 3x/day for 3 days";

  // Generate summary
  const summary = await generatePostVisitSummary(clinicalNotes, rxText, "PATIENT_FRIENDLY");
  console.log("Generated Summary:\n", summary);

  // Upsert visit note
  const visitNote = await prisma.visitNote.upsert({
    where: { appointmentId: appt.id },
    update: {
      clinicalNotes,
      diagnosis: "Acute viral URI",
      treatment: "Symptomatic care, hydration",
      prescription,
      llmPatientSummary: summary,
      llmStatus: "SUCCESS",
    },
    create: {
      appointmentId: appt.id,
      clinicalNotes,
      diagnosis: "Acute viral URI",
      treatment: "Symptomatic care, hydration",
      prescription,
      llmPatientSummary: summary,
      llmStatus: "SUCCESS",
    },
  });

  console.log("Saved VisitNote ID:", visitNote.id);

  // Send consultation email
  await sendConsultationSummaryEmail(appt.id);
  console.log("✅ Complete consultation flow succeeded!");
}

testComplete()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
