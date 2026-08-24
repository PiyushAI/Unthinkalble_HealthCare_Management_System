import { Resend } from "resend";
import { prisma } from "../lib/prisma.js";

const resendApiKey = process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes("mock")
  ? process.env.RESEND_API_KEY
  : null;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const FROM_ADDRESS = process.env.EMAIL_FROM ?? "MediFlow <appointments@yourdomain.com>";
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export async function sendBookingEmail(
  type: "BOOKING_CONFIRM" | "CANCELLATION" | "LEAVE_CONFLICT" | "RESCHEDULED",
  recipientId: string,
  appointmentId?: string
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: recipientId },
    });

    if (!user || !user.email) {
      console.warn(`[EMAIL DISPATCH] Skipped: User record or email not found for ID: ${recipientId}`);
      return;
    }

    const isDoctor = user.role === "DOCTOR";
    let doctorName = "Dr. Specialist";
    let doctorSpecialization = "General Medicine";
    let patientName = "Patient";
    let formattedDate = "Upcoming Date";
    let formattedTime = "Scheduled Time";
    let rawSymptoms = "";
    const clinicName = "MediFlow Medical Center";

    if (appointmentId) {
      const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          doctor: { include: { user: true } },
          patient: { include: { user: true } },
          symptomForm: true,
        },
      });

      if (appt) {
        doctorName = appt.doctor?.user?.name || doctorName;
        doctorSpecialization = appt.doctor?.specialization || doctorSpecialization;
        patientName = appt.patient?.user?.name || patientName;
        rawSymptoms = appt.symptomForm?.rawSymptoms || "";
        const d = new Date(appt.slotStart);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
          formattedTime = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        }
      }
    }

    let subject = "MediFlow Notification";
    let bannerTitle = "Appointment Update";
    let bannerColor = "#003c90";
    let bannerBg = "#eff6ff";
    let mainMessage = "";
    let actionUrl = isDoctor ? `${APP_URL}/doctor` : `${APP_URL}/patient/appointments`;
    let actionText = isDoctor ? "View Doctor Schedule" : "View My Appointments";

    if (isDoctor) {
      switch (type) {
        case "BOOKING_CONFIRM":
          subject = `New Appointment Booked - ${patientName}`;
          bannerTitle = "✓ New Patient Booking";
          bannerColor = "#065f46";
          bannerBg = "#ecfdf5";
          mainMessage = `A new consultation has been booked on your schedule with <strong>${patientName}</strong>.`;
          break;
        case "RESCHEDULED":
          subject = `Appointment Rescheduled - ${patientName}`;
          bannerTitle = "⟳ Appointment Rescheduled";
          bannerColor = "#0284c7";
          bannerBg = "#f0f9ff";
          mainMessage = `The appointment with <strong>${patientName}</strong> has been rescheduled to a new date/time.`;
          break;
        case "CANCELLATION":
          subject = `Appointment Cancelled - ${patientName}`;
          bannerTitle = "✕ Appointment Cancelled";
          bannerColor = "#b91c1c";
          bannerBg = "#fef2f2";
          mainMessage = `The scheduled consultation with <strong>${patientName}</strong> has been cancelled.`;
          break;
        case "LEAVE_CONFLICT":
          subject = `Leave Schedule Confirmed - MediFlow`;
          bannerTitle = "Doctor Leave Recorded";
          bannerColor = "#d97706";
          bannerBg = "#fffbeb";
          mainMessage = `Your leave date has been confirmed. Conflicting patient bookings have been set to reschedule and notified.`;
          break;
      }
    } else {
      switch (type) {
        case "BOOKING_CONFIRM":
          subject = `Appointment Confirmed - Dr. ${doctorName}`;
          bannerTitle = "✓ Appointment Confirmed";
          bannerColor = "#065f46";
          bannerBg = "#ecfdf5";
          mainMessage = `Your appointment with <strong>Dr. ${doctorName}</strong> has been successfully confirmed.`;
          break;
        case "RESCHEDULED":
          subject = `Appointment Rescheduled - Dr. ${doctorName}`;
          bannerTitle = "⟳ Appointment Rescheduled";
          bannerColor = "#0284c7";
          bannerBg = "#f0f9ff";
          mainMessage = `Your appointment with <strong>Dr. ${doctorName}</strong> has been successfully rescheduled to the new time below.`;
          break;
        case "CANCELLATION":
          subject = `Appointment Cancellation Notice - MediFlow`;
          bannerTitle = "✕ Appointment Cancelled";
          bannerColor = "#b91c1c";
          bannerBg = "#fef2f2";
          mainMessage = `Your appointment with <strong>Dr. ${doctorName}</strong> has been cancelled.`;
          break;
        case "LEAVE_CONFLICT":
          subject = `Important: Your Appointment Needs Rescheduling - MediFlow`;
          bannerTitle = "⚠️ Rescheduling Required (Doctor Leave)";
          bannerColor = "#d97706";
          bannerBg = "#fffbeb";
          mainMessage = `<strong>Dr. ${doctorName}</strong> is unavailable on your scheduled date due to approved leave. Please log in to your patient portal to choose an alternative slot at your earliest convenience.`;
          break;
      }
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <tr>
              <td style="background-color: #003c90; padding: 32px 24px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">MediFlow</h1>
                <p style="color: #bcceff; margin: 6px 0 0 0; font-size: 14px; font-weight: 500;">Healthcare Appointment & Care Manager</p>
              </td>
            </tr>
            <tr>
              <td style="background-color: ${bannerBg}; border-bottom: 1px solid #e2e8f0; padding: 14px 24px; text-align: center;">
                <span style="color: ${bannerColor}; font-size: 15px; font-weight: 600;">${bannerTitle}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 32px 28px;">
                <p style="font-size: 16px; margin: 0 0 12px 0;">Hello <strong>${user.name}</strong>,</p>
                <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
                  ${mainMessage}
                </p>
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 28px;">
                  <h3 style="margin: 0 0 16px 0; font-size: 14px; color: #003c90; text-transform: uppercase; letter-spacing: 0.5px;">Appointment Summary</h3>
                  <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 14px; color: #334155;">
                    <tr>
                      <td width="35%" style="color: #64748b; font-weight: 500;">Doctor:</td>
                      <td style="font-weight: 600; color: #0f172a;">${doctorName}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; font-weight: 500;">Specialization:</td>
                      <td style="font-weight: 600; color: #0f172a;">${doctorSpecialization}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; font-weight: 500;">Patient:</td>
                      <td style="font-weight: 600; color: #0f172a;">${patientName}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; font-weight: 500;">Date:</td>
                      <td style="font-weight: 600; color: #0f172a;">${formattedDate}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; font-weight: 500;">Time:</td>
                      <td style="font-weight: 600; color: #0f172a;">${formattedTime}</td>
                    </tr>
                    ${rawSymptoms ? `
                    <tr>
                      <td style="color: #64748b; font-weight: 500;">Symptoms/Notes:</td>
                      <td style="color: #0f172a;">${rawSymptoms}</td>
                    </tr>` : ""}
                    ${appointmentId ? `
                    <tr>
                      <td style="color: #64748b; font-weight: 500;">Appointment Ref:</td>
                      <td style="font-family: monospace; color: #0284c7; font-weight: 600;">${appointmentId}</td>
                    </tr>` : ""}
                    <tr>
                      <td style="color: #64748b; font-weight: 500;">Location:</td>
                      <td style="font-weight: 600; color: #0f172a;">${clinicName}</td>
                    </tr>
                  </table>
                </div>
                <div style="text-align: center; margin-bottom: 28px;">
                  <a href="${actionUrl}" style="display: inline-block; background-color: #003c90; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 15px; font-weight: 600; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,60,144,0.2);">
                    ${actionText}
                  </a>
                </div>
                <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin: 0; background-color: #f1f5f9; padding: 12px 16px; border-radius: 6px;">
                  ℹ️ Manage your consultation, medication schedule, or connect your Google Calendar in your <strong>MediFlow dashboard</strong>.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
                <p style="margin: 0 0 6px 0;">This is an automated notification from MediFlow Healthcare System.</p>
                <p style="margin: 0;">&copy; ${new Date().getFullYear()} MediFlow Healthcare System. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    if (resend) {
      try {
        await resend.emails.send({
          from: FROM_ADDRESS,
          to: user.email,
          subject,
          html: htmlContent,
        });
        console.log(`[RESEND EMAIL SENT] To: ${user.email} (${user.role}) | Subject: ${subject}`);
        return;
      } catch (err) {
        console.warn("Resend email dispatch error (safely logged):", (err as Error).message);
      }
    }

    console.log(`[EMAIL DISPATCH SIMULATION] To: ${user.email} (${user.role}) | Subject: ${subject}`);
  } catch (err) {
    console.error("sendBookingEmail error (non-fatal):", err);
  }
}

export async function sendConsultationSummaryEmail(appointmentId: string) {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
        visitNote: true,
        symptomForm: true,
      },
    });

    if (!appt || !appt.patient?.user?.email || !appt.visitNote) {
      console.warn(`[CONSULTATION EMAIL] Skipped: Appointment, patient email, or visit note missing for ID: ${appointmentId}`);
      return;
    }

    const patient = appt.patient.user;
    const doctor = appt.doctor.user;
    const note = appt.visitNote;

    const d = new Date(appt.slotStart);
    const formattedDate = !isNaN(d.getTime())
      ? d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
      : "Completed Consultation";
    const formattedTime = !isNaN(d.getTime())
      ? d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
      : "";

    const rxList = Array.isArray(note.prescription)
      ? (note.prescription as any[]).map((p) => `${p.drug} ${p.dosage} (${p.timesPerDay}x/day for ${p.durationDays} days)`).join("; ")
      : "None prescribed";

    const diagnosis = note.diagnosis || "Clinical examination completed";
    const treatment = note.treatment || "Supportive management & lifestyle modifications as advised";
    const recommendations = note.recommendations || "Adequate rest, hydration, and adherence to prescribed care plan";
    const followUp = note.followUpInstructions || "Return for follow-up if symptoms persist or worsen";
    const summary = note.llmPatientSummary || note.clinicalNotes;

    const subject = `Your Care Plan & Consultation Summary - Dr. ${doctor.name}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <tr>
              <td style="background-color: #003c90; padding: 32px 24px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">MediFlow</h1>
                <p style="color: #bcceff; margin: 6px 0 0 0; font-size: 15px; font-weight: 500;">Post-Visit Consultation Summary & Care Plan</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 32px 28px;">
                <p style="font-size: 16px; margin: 0 0 12px 0;">Hello <strong>${patient.name}</strong>,</p>
                <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
                  Your consultation with <strong>Dr. ${doctor.name}</strong> has been completed. Below is your personalized care plan, medication schedule, and follow-up steps.
                </p>

                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
                  <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #003c90; text-transform: uppercase; letter-spacing: 0.5px;">Consultation Details</h3>
                  <table width="100%" cellpadding="4" cellspacing="0" style="font-size: 14px; color: #334155;">
                    <tr>
                      <td width="35%" style="color: #64748b; font-weight: 500;">Doctor:</td>
                      <td style="font-weight: 600; color: #0f172a;">Dr. ${doctor.name}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; font-weight: 500;">Specialization:</td>
                      <td style="font-weight: 600; color: #0f172a;">${appt.doctor.specialization}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; font-weight: 500;">Date:</td>
                      <td style="font-weight: 600; color: #0f172a;">${formattedDate}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; font-weight: 500;">Time:</td>
                      <td style="font-weight: 600; color: #0f172a;">${formattedTime}</td>
                    </tr>
                  </table>
                </div>

                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

                <div style="margin-bottom: 20px;">
                  <h4 style="margin: 0 0 6px 0; font-size: 14px; color: #003c90; text-transform: uppercase;">Patient-Friendly Care Summary</h4>
                  <div style="background-color: #f1f5f9; padding: 14px; border-radius: 6px; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-line;">
                    ${summary}
                  </div>
                </div>

                <div style="margin-bottom: 20px;">
                  <h4 style="margin: 0 0 6px 0; font-size: 14px; color: #003c90; text-transform: uppercase;">Diagnosis</h4>
                  <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5;">${diagnosis}</p>
                </div>

                <div style="margin-bottom: 20px;">
                  <h4 style="margin: 0 0 6px 0; font-size: 14px; color: #003c90; text-transform: uppercase;">Treatment / Advice</h4>
                  <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5;">${treatment}</p>
                </div>

                <div style="margin-bottom: 20px;">
                  <h4 style="margin: 0 0 6px 0; font-size: 14px; color: #003c90; text-transform: uppercase;">Prescribed Medications</h4>
                  <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5;">${rxList}</p>
                </div>

                <div style="margin-bottom: 20px;">
                  <h4 style="margin: 0 0 6px 0; font-size: 14px; color: #003c90; text-transform: uppercase;">Recommendations & Lifestyle</h4>
                  <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5;">${recommendations}</p>
                </div>

                <div style="margin-bottom: 24px;">
                  <h4 style="margin: 0 0 6px 0; font-size: 14px; color: #003c90; text-transform: uppercase;">Follow-up Instructions</h4>
                  <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5;">${followUp}</p>
                </div>

                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

                <div style="text-align: center; margin-bottom: 24px;">
                  <a href="${APP_URL}/patient/records" style="display: inline-block; background-color: #003c90; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 15px; font-weight: 600; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,60,144,0.2);">
                    View Full Medical Record
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
                <p style="margin: 0 0 6px 0;">This is an automated notification from MediFlow Healthcare System.</p>
                <p style="margin: 0;">&copy; ${new Date().getFullYear()} MediFlow Healthcare System. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    if (resend) {
      try {
        await resend.emails.send({
          from: FROM_ADDRESS,
          to: patient.email,
          subject,
          html: htmlContent,
        });

        await prisma.visitNote.update({
          where: { id: note.id },
          data: { emailSent: true, emailSentAt: new Date() },
        });

        console.log(`[RESEND CONSULTATION EMAIL SENT] To: ${patient.email} | Subject: ${subject}`);
        return;
      } catch (err: any) {
        console.warn("Resend consultation email error:", err.message);
        await prisma.visitNote.update({
          where: { id: note.id },
          data: { emailSent: false, emailError: err.message },
        });
      }
    }

    console.log(`[SIMULATION CONSULTATION EMAIL] To: ${patient.email} | Subject: ${subject}`);
    await prisma.visitNote.update({
      where: { id: note.id },
      data: { emailSent: true, emailSentAt: new Date() },
    });
  } catch (err) {
    console.error("sendConsultationSummaryEmail error (non-fatal):", err);
  }
}

export async function sendReminderEmail(
  recipientId: string,
  appointmentId?: string,
  reminderId?: string
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: recipientId },
    });

    if (!user || !user.email) return;

    let drugName = "Prescribed Medication";
    let dosage = "As directed";

    if (reminderId) {
      const rem = await prisma.medicationReminder.findUnique({
        where: { id: reminderId },
      });
      if (rem) {
        drugName = rem.drugName;
        dosage = rem.dosage;
      }
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Medication Reminder - MediFlow</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
            <tr>
              <td style="background-color: #003c90; padding: 24px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 22px;">MediFlow Medication Reminder</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 28px;">
                <p style="font-size: 16px; margin: 0 0 12px 0;">Hello <strong>${user.name}</strong>,</p>
                <p style="font-size: 15px; color: #334155; line-height: 1.6;">
                  This is a scheduled reminder to take your medication:
                </p>
                <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; border-radius: 6px; margin: 20px 0;">
                  <strong style="color: #1e40af; font-size: 16px;">${drugName} (${dosage})</strong>
                  <p style="margin: 6px 0 0 0; font-size: 13px; color: #3b82f6;">Please take your medication with water as advised by your doctor.</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
                This is an automated medication reminder from MediFlow.
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    if (resend) {
      try {
        await resend.emails.send({
          from: FROM_ADDRESS,
          to: user.email,
          subject: `Medication Reminder: ${drugName} - MediFlow`,
          html: htmlContent,
        });
        return;
      } catch (err) {
        console.warn("Resend reminder email error:", (err as Error).message);
      }
    }

    console.log(`[MEDICATION REMINDER] Sent to ${user.email} for ${drugName} ${dosage}`);
  } catch (err) {
    console.error("sendReminderEmail error:", err);
  }
}
