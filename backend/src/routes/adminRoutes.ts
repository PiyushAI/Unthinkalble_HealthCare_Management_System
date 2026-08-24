import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { markDoctorLeave } from "../services/leaveService.js";

export const adminRouter = Router();

adminRouter.get(
  "/admin/doctors",
  requireAuth,
  requireRole("ADMIN"),
  async (_req, res) => {
    try {
      const doctors = await prisma.doctor.findMany({
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          leaves: true,
          appointments: {
            where: { status: "CONFIRMED" },
            select: { id: true, slotStart: true },
          },
        },
      });
      res.json(doctors);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
);

const createDoctorSchema = z.object({
  userId: z.string().uuid(),
  specialization: z.string(),
  workingHours: z.record(z.array(z.object({ start: z.string(), end: z.string() }))),
  slotDurationMinutes: z.number().int().positive().default(30),
});

adminRouter.post(
  "/admin/doctors",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    const parsed = createDoctorSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    try {
      const doctor = await prisma.doctor.create({
        data: {
          id: parsed.data.userId,
          specialization: parsed.data.specialization,
          workingHours: parsed.data.workingHours,
          slotDurationMinutes: parsed.data.slotDurationMinutes,
        },
      });
      res.status(201).json(doctor);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
);

adminRouter.patch(
  "/admin/doctors/:id",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const doctor = await prisma.doctor.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json(doctor);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
);

const leaveSchema = z.object({
  leaveDate: z.coerce.date(),
  reason: z.string().optional(),
});

adminRouter.post(
  "/admin/doctors/:id/leaves",
  requireAuth,
  requireRole("ADMIN"),
  async (req, res) => {
    const parsed = leaveSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    try {
      const affected = await markDoctorLeave(
        req.params.id,
        parsed.data.leaveDate,
        parsed.data.reason
      );
      res.status(201).json({ affectedAppointmentCount: affected.length, affected });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
);

adminRouter.get(
  "/admin/notifications/failed",
  requireAuth,
  requireRole("ADMIN"),
  async (_req, res) => {
    try {
      const logs = await prisma.notificationLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
);

adminRouter.get(
  "/admin/stats",
  requireAuth,
  requireRole("ADMIN"),
  async (_req, res) => {
    try {
      const [totalDoctors, totalPatients, totalAppointments, confirmedAppts, completedAppts, notificationLogs] =
        await Promise.all([
          prisma.doctor.count(),
          prisma.patient.count(),
          prisma.appointment.count(),
          prisma.appointment.count({ where: { status: "CONFIRMED" } }),
          prisma.appointment.count({ where: { status: "COMPLETED" } }),
          prisma.notificationLog.count(),
        ]);

      res.json({
        totalDoctors,
        totalPatients,
        totalAppointments,
        confirmedAppointments: confirmedAppts,
        completedAppointments: completedAppts,
        notificationsSent: notificationLogs,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
);
