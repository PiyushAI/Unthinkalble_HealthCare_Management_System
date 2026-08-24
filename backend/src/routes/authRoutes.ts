import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { AuthedRequest, requireAuth } from "../middleware/auth.js";
import { Role } from "@prisma/client";
import {
  getGoogleAuthUrl,
  handleGoogleOAuthCallback,
  disconnectGoogleCalendar,
  getGoogleCalendarStatus,
} from "../services/calendarService.js";

export const authRouter = Router();

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

const syncUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["PATIENT", "DOCTOR", "ADMIN"]).default("PATIENT"),
  phone: z.string().optional(),
  dob: z.string().optional(),
  gender: z.string().optional(),
  specialization: z.string().optional(),
});

/**
 * Syncs or creates the user record in PostgreSQL upon Supabase Auth sign-in or sign-up.
 */
authRouter.post("/auth/sync", async (req, res) => {
  const parsed = syncUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error);

  const { id, email, name, role, phone, dob, gender, specialization } = parsed.data;

  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        id, // link UUID to Supabase Auth ID
        name,
        phone: phone || undefined,
        role: role as Role,
      },
      create: {
        id,
        email,
        name,
        role: role as Role,
        phone: phone || undefined,
      },
      include: {
        doctor: true,
        patient: true,
      },
    });

    if (role === "PATIENT" && !user.patient) {
      const patient = await prisma.patient.upsert({
        where: { id: user.id },
        update: {
          dob: dob ? new Date(dob) : undefined,
          gender: gender || undefined,
        },
        create: {
          id: user.id,
          dob: dob ? new Date(dob) : undefined,
          gender: gender || undefined,
        },
      });
      return res.status(200).json({ ...user, patient });
    }

    if (role === "DOCTOR" && !user.doctor) {
      const doctor = await prisma.doctor.upsert({
        where: { id: user.id },
        update: {
          specialization: specialization || "General Medicine",
        },
        create: {
          id: user.id,
          specialization: specialization || "General Medicine",
          workingHours: {
            mon: [{ start: "09:00", end: "17:00" }],
            tue: [{ start: "09:00", end: "17:00" }],
            wed: [{ start: "09:00", end: "17:00" }],
            thu: [{ start: "09:00", end: "17:00" }],
            fri: [{ start: "09:00", end: "17:00" }],
          },
          slotDurationMinutes: 30,
        },
      });
      return res.status(200).json({ ...user, doctor });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Auth sync error:", error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Returns current authenticated user profile with roles & metadata
 */
authRouter.get("/auth/me", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        doctor: true,
        patient: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User profile not found in database" });
    }

    res.json(user);
  } catch (error) {
    console.error("Auth me error:", error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Generates Google OAuth 2.0 URL to connect Google Calendar
 */
authRouter.get(
  "/auth/google/calendar/connect",
  requireAuth,
  (req: AuthedRequest, res) => {
    try {
      const url = getGoogleAuthUrl(req.user!.id, req.user!.role);
      res.json({ url });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
);

/**
 * Google OAuth 2.0 Redirect Callback Endpoint
 */
authRouter.get("/auth/google/calendar/callback", async (req, res) => {
  const { code, state, error } = req.query;

  if (error || !code) {
    console.warn("Google OAuth callback error:", error);
    return res.redirect(`${APP_URL}/patient/settings?calendar_error=true`);
  }

  try {
    const result = await handleGoogleOAuthCallback(code as string, state as string);
    const targetPortal = result.role === "DOCTOR" ? "/doctor" : "/patient/settings";
    return res.redirect(`${APP_URL}${targetPortal}?calendar_connected=true`);
  } catch (err) {
    console.error("Google OAuth callback processing error:", err);
    return res.redirect(`${APP_URL}/patient/settings?calendar_error=exchange_failed`);
  }
});

/**
 * Disconnects Google Calendar integration
 */
authRouter.post(
  "/auth/google/calendar/disconnect",
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const success = await disconnectGoogleCalendar(req.user!.id, req.user!.role);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
);

/**
 * Checks Google Calendar connection status
 */
authRouter.get(
  "/auth/google/calendar/status",
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const status = await getGoogleCalendarStatus(req.user!.id, req.user!.role);
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
);
