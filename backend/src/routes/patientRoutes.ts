import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { AuthedRequest, requireAuth, requireRole } from "../middleware/auth.js";
import {
  confirmBookingFromHold,
  createSlotHold,
  getAvailableSlots,
} from "../services/slotService.js";
import { queueNotification, queuePreVisitSummary } from "../queues/notificationQueue.js";

export const patientRouter = Router();

patientRouter.get("/doctors", async (req, res) => {
  const specialization = req.query.specialization as string | undefined;
  try {
    const doctors = await prisma.doctor.findMany({
      where: specialization
        ? { specialization: { contains: specialization, mode: "insensitive" } }
        : undefined,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

patientRouter.get("/doctors/:id", async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        leaves: true,
      },
    });
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });
    res.json(doctor);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

patientRouter.get("/doctors/:id/slots", async (req, res) => {
  const date = z.coerce.date().safeParse(req.query.date);
  if (!date.success) return res.status(400).json({ error: "Invalid or missing ?date=" });

  try {
    const slots = await getAvailableSlots(req.params.id, date.data);
    res.json({ slots });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

const holdSchema = z.object({
  doctorId: z.string().uuid(),
  slotStart: z.coerce.date(),
});

patientRouter.post(
  "/appointments/hold",
  requireAuth,
  requireRole("PATIENT"),
  async (req: AuthedRequest, res) => {
    const parsed = holdSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    try {
      const result = await createSlotHold(
        parsed.data.doctorId,
        req.user!.id,
        parsed.data.slotStart
      );

      if (!result.ok) return res.status(409).json({ error: result.reason });
      res.status(201).json(result.hold);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
);

const confirmSchema = z.object({
  holdId: z.string().uuid(),
  rawSymptoms: z.string().min(1),
});

patientRouter.post(
  "/appointments/confirm",
  requireAuth,
  requireRole("PATIENT"),
  async (req: AuthedRequest, res) => {
    const parsed = confirmSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    try {
      const hold = await prisma.slotHold.findUniqueOrThrow({
        where: { id: parsed.data.holdId },
      });
      const doctor = await prisma.doctor.findUniqueOrThrow({
        where: { id: hold.doctorId },
      });

      const appointment = await confirmBookingFromHold({
        holdId: parsed.data.holdId,
        patientId: req.user!.id,
        rawSymptoms: parsed.data.rawSymptoms,
        slotDurationMinutes: doctor.slotDurationMinutes,
      });

      // Trigger async notifications for BOTH Patient and Doctor
      await queueNotification({
        type: "BOOKING_CONFIRM",
        channel: "EMAIL",
        recipientId: req.user!.id,
        appointmentId: appointment.id,
      });
      await queueNotification({
        type: "BOOKING_CONFIRM",
        channel: "EMAIL",
        recipientId: doctor.id,
        appointmentId: appointment.id,
      });
      await queueNotification({
        type: "BOOKING_CONFIRM",
        channel: "CALENDAR",
        recipientId: req.user!.id,
        appointmentId: appointment.id,
      });

      // Trigger pre-visit AI symptom analysis
      await queuePreVisitSummary(appointment.id);

      res.status(201).json(appointment);
    } catch (err) {
      const message = (err as Error).message;
      const status = message === "SLOT_NO_LONGER_AVAILABLE" ? 409 : 400;
      res.status(status).json({ error: message });
    }
  }
);

patientRouter.get(
  "/appointments/me",
  requireAuth,
  requireRole("PATIENT"),
  async (req: AuthedRequest, res) => {
    try {
      const appointments = await prisma.appointment.findMany({
        where: { patientId: req.user!.id },
        include: {
          doctor: { include: { user: true } },
          symptomForm: true,
          visitNote: true,
        },
        orderBy: { slotStart: "desc" },
      });
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
);

// Alias endpoint for patient appointments
patientRouter.get(
  "/patient/appointments",
  requireAuth,
  requireRole("PATIENT"),
  async (req: AuthedRequest, res) => {
    try {
      const appointments = await prisma.appointment.findMany({
        where: { patientId: req.user!.id },
        include: {
          doctor: { include: { user: true } },
          symptomForm: true,
          visitNote: true,
        },
        orderBy: { slotStart: "desc" },
      });
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
);

patientRouter.get(
  "/appointments/:id",
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: req.params.id },
        include: {
          doctor: { include: { user: true } },
          patient: { include: { user: true } },
          symptomForm: true,
          visitNote: true,
        },
      });
      if (!appointment) return res.status(404).json({ error: "Appointment not found" });

      // IDOR Authorization guard
      if (
        req.user!.role !== "ADMIN" &&
        req.user!.id !== appointment.patientId &&
        req.user!.id !== appointment.doctorId
      ) {
        return res.status(403).json({ error: "Unauthorized access to this appointment" });
      }

      res.json(appointment);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
);

const rescheduleSchema = z.object({
  newSlotStart: z.coerce.date(),
});

patientRouter.post(
  "/appointments/:id/reschedule",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const parsed = rescheduleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    try {
      const appt = await prisma.appointment.findUniqueOrThrow({
        where: { id: req.params.id },
        include: { doctor: true },
      });

      // Authorization guard
      if (
        req.user!.role !== "ADMIN" &&
        req.user!.id !== appt.patientId &&
        req.user!.id !== appt.doctorId
      ) {
        return res.status(403).json({ error: "Unauthorized to reschedule this appointment" });
      }

      const newSlotStart = parsed.data.newSlotStart;
      const durationMinutes = appt.doctor.slotDurationMinutes || 30;
      const newSlotEnd = new Date(newSlotStart.getTime() + durationMinutes * 60 * 1000);

      // Check doctor leave on the new date
      const dayStart = new Date(newSlotStart);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(newSlotStart);
      dayEnd.setHours(23, 59, 59, 999);

      const leave = await prisma.doctorLeave.findFirst({
        where: { doctorId: appt.doctorId, leaveDate: { gte: dayStart, lte: dayEnd } },
      });
      if (leave) {
        return res.status(400).json({ error: "Doctor is on leave on the selected date" });
      }

      // Check slot conflict
      const conflicting = await prisma.appointment.findFirst({
        where: {
          id: { not: appt.id },
          doctorId: appt.doctorId,
          slotStart: newSlotStart,
          status: "CONFIRMED",
        },
      });
      if (conflicting) {
        return res.status(409).json({ error: "SLOT_NO_LONGER_AVAILABLE" });
      }

      const updated = await prisma.$transaction(async (tx) => {
        return tx.appointment.update({
          where: { id: req.params.id },
          data: {
            slotStart: newSlotStart,
            slotEnd: newSlotEnd,
            status: "CONFIRMED",
          },
        });
      });

      // Notify BOTH Patient and Doctor
      await queueNotification({
        type: "RESCHEDULED",
        channel: "EMAIL",
        recipientId: appt.patientId,
        appointmentId: appt.id,
      });
      await queueNotification({
        type: "RESCHEDULED",
        channel: "EMAIL",
        recipientId: appt.doctorId,
        appointmentId: appt.id,
      });
      await queueNotification({
        type: "RESCHEDULED",
        channel: "CALENDAR",
        recipientId: appt.patientId,
        appointmentId: appt.id,
      });

      res.json(updated);
    } catch (error: any) {
      if (error.code === "P2002") {
        return res.status(409).json({ error: "SLOT_NO_LONGER_AVAILABLE" });
      }
      res.status(500).json({ error: error.message });
    }
  }
);

patientRouter.post(
  "/appointments/:id/cancel",
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const appt = await prisma.appointment.findUniqueOrThrow({
        where: { id: req.params.id },
        include: { visitNote: true },
      });

      // IDOR Authorization guard
      if (
        req.user!.role !== "ADMIN" &&
        req.user!.id !== appt.patientId &&
        req.user!.id !== appt.doctorId
      ) {
        return res.status(403).json({ error: "Unauthorized to cancel this appointment" });
      }

      const updated = await prisma.appointment.update({
        where: { id: req.params.id },
        data: { status: "CANCELLED" },
      });

      // Clean up future medication reminders for cancelled appointment
      if (appt.visitNote) {
        await prisma.medicationReminder.deleteMany({
          where: { visitNoteId: appt.visitNote.id, status: "PENDING" },
        }).catch(() => null);
      }

      // Notify BOTH Patient and Doctor
      await queueNotification({
        type: "CANCELLATION",
        channel: "EMAIL",
        recipientId: appt.patientId,
        appointmentId: appt.id,
      });
      await queueNotification({
        type: "CANCELLATION",
        channel: "EMAIL",
        recipientId: appt.doctorId,
        appointmentId: appt.id,
      });
      await queueNotification({
        type: "CANCELLATION",
        channel: "CALENDAR",
        recipientId: appt.patientId,
        appointmentId: appt.id,
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
);

patientRouter.get(
  "/patient/reminders",
  requireAuth,
  requireRole("PATIENT"),
  async (req: AuthedRequest, res) => {
    try {
      const reminders = await prisma.medicationReminder.findMany({
        where: { patientId: req.user!.id },
        include: {
          visitNote: {
            include: {
              appointment: {
                include: { doctor: { include: { user: true } } },
              },
            },
          },
        },
        orderBy: { scheduledAt: "asc" },
      });
      res.json(reminders);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
);
