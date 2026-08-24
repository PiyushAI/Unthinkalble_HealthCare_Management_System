import { sendBookingEmail, sendConsultationSummaryEmail } from "../src/services/emailService.js";
import { prisma } from "../src/lib/prisma.js";
import "dotenv/config";

async function testAllEmails() {
  console.log("Testing live MediFlow emails with your Resend key...");

  // Find user with your email or patient
  const user = await prisma.user.findFirst({
    where: { email: "piyushcricketfan619@gmail.com" },
  });

  if (!user) {
    console.log("User piyushcricketfan619@gmail.com not found in DB.");
    return;
  }

  // Find their appointment
  const appt = await prisma.appointment.findFirst({
    where: { patientId: user.id },
    orderBy: { createdAt: "desc" },
  });

  if (appt) {
    console.log("1. Testing Appointment Confirmation Email for appointment:", appt.id);
    await sendBookingEmail("BOOKING_CONFIRM", user.id, appt.id);

    console.log("2. Testing Consultation Summary Email for appointment:", appt.id);
    await sendConsultationSummaryEmail(appt.id);
  } else {
    console.log("No appointments found for user.");
  }

  console.log("Finished live test!");
}

testAllEmails()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
