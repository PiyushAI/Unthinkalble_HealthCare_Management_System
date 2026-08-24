import { google } from "googleapis";
import { prisma } from "../lib/prisma.js";

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

export function getOAuthClient(refreshToken?: string) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:4000/auth/google/calendar/callback"
  );
  if (refreshToken) {
    client.setCredentials({ refresh_token: refreshToken });
  }
  return client;
}

/**
 * Generates the Google OAuth 2.0 authorization URL requesting the calendar.events scope.
 */
export function getGoogleAuthUrl(userId: string, role: string): string {
  const client = getOAuthClient();
  const state = JSON.stringify({ userId, role });
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

/**
 * Exchanges the Google authorization code for tokens and saves the refresh_token in PostgreSQL.
 */
export async function handleGoogleOAuthCallback(code: string, stateString?: string) {
  let userId = "";
  let role = "PATIENT";
  if (stateString) {
    try {
      const parsed = JSON.parse(stateString);
      userId = parsed.userId || "";
      role = parsed.role || "PATIENT";
    } catch {
      // fallback
    }
  }

  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  const refreshToken = tokens.refresh_token;

  if (userId && refreshToken) {
    if (role === "DOCTOR") {
      await prisma.doctor.update({
        where: { id: userId },
        data: { googleRefreshToken: refreshToken },
      });
    } else {
      await prisma.patient.update({
        where: { id: userId },
        data: { googleRefreshToken: refreshToken },
      });
    }
  }

  return { success: true, userId, role };
}

/**
 * Disconnects the user's Google Calendar integration by clearing the stored refresh token.
 */
export async function disconnectGoogleCalendar(userId: string, role: string): Promise<boolean> {
  try {
    if (role === "DOCTOR") {
      await prisma.doctor.update({
        where: { id: userId },
        data: { googleRefreshToken: null },
      });
    } else {
      await prisma.patient.update({
        where: { id: userId },
        data: { googleRefreshToken: null },
      });
    }
    return true;
  } catch (err) {
    console.error("Disconnect Google Calendar error:", err);
    return false;
  }
}

/**
 * Retrieves the live Google Calendar connection status for the authenticated user.
 */
export async function getGoogleCalendarStatus(userId: string, role: string): Promise<{ connected: boolean }> {
  try {
    if (role === "DOCTOR") {
      const doc = await prisma.doctor.findUnique({ where: { id: userId } });
      return { connected: Boolean(doc?.googleRefreshToken) };
    } else {
      const pat = await prisma.patient.findUnique({ where: { id: userId } });
      return { connected: Boolean(pat?.googleRefreshToken) };
    }
  } catch {
    return { connected: false };
  }
}

/**
 * Builds standard Google Calendar event metadata matching project requirements:
 * Title: "Medical Appointment - Dr. [Doctor Name]"
 * Details: Doctor, Patient, Date, Time, Specialization, Clinic Info, Symptoms
 */
function buildEventBody(appt: any) {
  const doctorName = appt.doctor?.user?.name || "Specialist";
  const doctorSpec = appt.doctor?.specialization || "General Medicine";
  const patientName = appt.patient?.user?.name || "Patient";
  const symptoms = appt.symptomForm?.rawSymptoms || "Routine medical consultation";

  const dateStr = new Date(appt.slotStart).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = new Date(appt.slotStart).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    summary: `Medical Appointment - Dr. ${doctorName}`,
    description: `Medical Appointment Details\n──────────────────────────\nDoctor: Dr. ${doctorName} (${doctorSpec})\nPatient: ${patientName}\nDate: ${dateStr}\nTime: ${timeStr}\nSymptoms/Notes: ${symptoms}\nLocation: MediFlow Health Center (Virtual / In-Clinic)\nAppointment ID: ${appt.id}`,
    start: { dateTime: appt.slotStart.toISOString() },
    end: { dateTime: appt.slotEnd.toISOString() },
  };
}

/**
 * Idempotent: checks googleEventIdPatient/Doctor before creating, so a
 * retried job never produces a duplicate calendar entry.
 */
export async function createCalendarEvent(appointmentId?: string) {
  if (!appointmentId) return;

  const appt = await prisma.appointment.findUniqueOrThrow({
    where: { id: appointmentId },
    include: {
      patient: { include: { user: true } },
      doctor: { include: { user: true } },
      symptomForm: true,
    },
  });

  if (appt.googleEventIdPatient && appt.googleEventIdDoctor) return; // already synced

  const eventBody = buildEventBody(appt);

  try {
    if (!appt.googleEventIdPatient) {
      if (appt.patient?.googleRefreshToken && process.env.GOOGLE_CLIENT_ID) {
        const auth = getOAuthClient(appt.patient.googleRefreshToken);
        const calendar = google.calendar({ version: "v3", auth });
        const res = await calendar.events.insert({
          calendarId: "primary",
          requestBody: eventBody,
        });
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { googleEventIdPatient: res.data.id },
        });
      } else {
        // Safe identifier for offline/simulated calendar sync
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { googleEventIdPatient: `gcal_mock_pat_${appointmentId.substring(0, 8)}` },
        });
      }
    }

    if (!appt.googleEventIdDoctor) {
      if (appt.doctor?.googleRefreshToken && process.env.GOOGLE_CLIENT_ID) {
        const auth = getOAuthClient(appt.doctor.googleRefreshToken);
        const calendar = google.calendar({ version: "v3", auth });
        const res = await calendar.events.insert({
          calendarId: "primary",
          requestBody: eventBody,
        });
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { googleEventIdDoctor: res.data.id },
        });
      } else {
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { googleEventIdDoctor: `gcal_mock_doc_${appointmentId.substring(0, 8)}` },
        });
      }
    }
  } catch (err) {
    console.warn("Google Calendar sync warning (non-fatal):", (err as Error).message);
  }
}

/**
 * Updates existing Google Calendar events on patient and doctor calendars upon reschedule.
 * Idempotent: avoids creating second duplicate events.
 */
export async function updateCalendarEvent(appointmentId?: string) {
  if (!appointmentId) return;

  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
        symptomForm: true,
      },
    });

    if (!appt) return;

    const eventBody = buildEventBody(appt);

    // Update patient calendar event
    if (appt.googleEventIdPatient && !appt.googleEventIdPatient.startsWith("gcal_mock_") && appt.patient?.googleRefreshToken && process.env.GOOGLE_CLIENT_ID) {
      const auth = getOAuthClient(appt.patient.googleRefreshToken);
      const calendar = google.calendar({ version: "v3", auth });
      await calendar.events.patch({
        calendarId: "primary",
        eventId: appt.googleEventIdPatient,
        requestBody: eventBody,
      }).catch(async () => {
        // If event wasn't found, insert new
        const res = await calendar.events.insert({ calendarId: "primary", requestBody: eventBody });
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { googleEventIdPatient: res.data.id },
        });
      });
    }

    // Update doctor calendar event
    if (appt.googleEventIdDoctor && !appt.googleEventIdDoctor.startsWith("gcal_mock_") && appt.doctor?.googleRefreshToken && process.env.GOOGLE_CLIENT_ID) {
      const auth = getOAuthClient(appt.doctor.googleRefreshToken);
      const calendar = google.calendar({ version: "v3", auth });
      await calendar.events.patch({
        calendarId: "primary",
        eventId: appt.googleEventIdDoctor,
        requestBody: eventBody,
      }).catch(async () => {
        const res = await calendar.events.insert({ calendarId: "primary", requestBody: eventBody });
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { googleEventIdDoctor: res.data.id },
        });
      });
    }
  } catch (err) {
    console.warn("Google Calendar update warning (non-fatal):", (err as Error).message);
  }
}

/**
 * Deletes Google Calendar events for both patient and doctor upon appointment cancellation.
 */
export async function deleteCalendarEvent(appointmentId?: string) {
  if (!appointmentId) return;

  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true, doctor: true },
    });

    if (!appt) return;

    if (appt.googleEventIdPatient && !appt.googleEventIdPatient.startsWith("gcal_mock_") && appt.patient?.googleRefreshToken && process.env.GOOGLE_CLIENT_ID) {
      const auth = getOAuthClient(appt.patient.googleRefreshToken);
      await google
        .calendar({ version: "v3", auth })
        .events.delete({ calendarId: "primary", eventId: appt.googleEventIdPatient })
        .catch(() => null);
    }

    if (appt.googleEventIdDoctor && !appt.googleEventIdDoctor.startsWith("gcal_mock_") && appt.doctor?.googleRefreshToken && process.env.GOOGLE_CLIENT_ID) {
      const auth = getOAuthClient(appt.doctor.googleRefreshToken);
      await google
        .calendar({ version: "v3", auth })
        .events.delete({ calendarId: "primary", eventId: appt.googleEventIdDoctor })
        .catch(() => null);
    }
  } catch (err) {
    console.warn("Google Calendar delete warning (non-fatal):", (err as Error).message);
  }
}
