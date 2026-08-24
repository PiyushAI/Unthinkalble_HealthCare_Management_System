import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { AuthedRequest, requireAuth, requireRole } from "../middleware/auth.js";
import { generatePostVisitSummary, LLMSummaryMode } from "../services/llmService.js";
import { sendConsultationSummaryEmail } from "../services/emailService.js";

export const doctorRouter = Router();

doctorRouter.get(
  "/doctor/appointments",
  requireAuth,
  requireRole("DOCTOR"),
  async (req: AuthedRequest, res) => {
    try {
      const dateParam = req.query.date as string | undefined;
      let dateFilter = undefined;
      if (dateParam) {
        const date = new Date(dateParam);
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        dateFilter = { gte: dayStart, lte: dayEnd };
      }

      const appointments = await prisma.appointment.findMany({
        where: {
          doctorId: req.user!.id,
          slotStart: dateFilter,
        },
        include: {
          patient: { include: { user: true } },
          symptomForm: true,
          visitNote: true,
        },
        orderBy: { slotStart: "asc" },
      });
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
);

doctorRouter.get(
  "/doctor/patients",
  requireAuth,
  requireRole("DOCTOR"),
  async (req: AuthedRequest, res) => {
    try {
      const appointments = await prisma.appointment.findMany({
        where: { doctorId: req.user!.id },
        include: {
          patient: { include: { user: true } },
          visitNote: true,
          symptomForm: true,
        },
        orderBy: { slotStart: "desc" },
      });

      const patientMap = new Map<string, any>();
      for (const appt of appointments) {
        if (!patientMap.has(appt.patientId)) {
          patientMap.set(appt.patientId, {
            patientId: appt.patientId,
            user: appt.patient.user,
            dob: appt.patient.dob,
            gender: appt.patient.gender,
            totalVisits: 1,
            lastVisit: appt.slotStart,
            latestStatus: appt.status,
            appointments: [appt],
          });
        } else {
          const p = patientMap.get(appt.patientId);
          p.totalVisits += 1;
          p.appointments.push(appt);
        }
      }

      res.json(Array.from(patientMap.values()));
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
);

doctorRouter.get(
  "/doctor/records",
  requireAuth,
  requireRole("DOCTOR"),
  async (req: AuthedRequest, res) => {
    try {
      const records = await prisma.appointment.findMany({
        where: {
          doctorId: req.user!.id,
          status: "COMPLETED",
        },
        include: {
          patient: { include: { user: true } },
          visitNote: true,
          symptomForm: true,
        },
        orderBy: { slotStart: "desc" },
      });
      res.json(records);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
);

doctorRouter.get(
  "/doctor/analytics",
  requireAuth,
  requireRole("DOCTOR"),
  async (req: AuthedRequest, res) => {
    try {
      const doctorId = req.user!.id;
      const [totalAppointments, completedCount, confirmedCount, appointments] = await Promise.all([
        prisma.appointment.count({ where: { doctorId } }),
        prisma.appointment.count({ where: { doctorId, status: "COMPLETED" } }),
        prisma.appointment.count({ where: { doctorId, status: "CONFIRMED" } }),
        prisma.appointment.findMany({
          where: { doctorId },
          include: { symptomForm: true },
        }),
      ]);

      const urgencyCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
      const uniquePatients = new Set<string>();

      for (const a of appointments) {
        uniquePatients.add(a.patientId);
        const u = a.symptomForm?.llmUrgency || "LOW";
        if (u === "HIGH") urgencyCounts.HIGH++;
        else if (u === "MEDIUM") urgencyCounts.MEDIUM++;
        else urgencyCounts.LOW++;
      }

      res.json({
        totalAppointments,
        completedConsultations: completedCount,
        upcomingConsultations: confirmedCount,
        uniquePatients: uniquePatients.size,
        urgencyBreakdown: urgencyCounts,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
);

doctorRouter.post(
  "/doctor/generate-summary",
  requireAuth,
  requireRole("DOCTOR"),
  async (req, res) => {
    try {
      const { clinicalNotes, prescriptionSummary, mode } = req.body;
      if (!clinicalNotes) {
        return res.status(400).json({ error: "clinicalNotes is required" });
      }

      const summary = await generatePostVisitSummary(
        clinicalNotes,
        prescriptionSummary || "",
        (mode as LLMSummaryMode) || "PATIENT_FRIENDLY"
      );

      res.json({ summary });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
);

doctorRouter.get(
  "/doctor/appointments/:id/summary",
  requireAuth,
  requireRole("DOCTOR"),
  async (req, res) => {
    try {
      const symptomForm = await prisma.symptomForm.findUnique({
        where: { appointmentId: req.params.id },
      });
      if (!symptomForm) return res.status(404).json({ error: "Symptom summary not found" });
      res.json(symptomForm);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
);

const prescriptionItemSchema = z.object({
  drug: z.string(),
  dosage: z.string(),
  timesPerDay: z.number().int().positive().default(1),
  durationDays: z.number().int().positive().default(5),
});

const visitNoteSchema = z.object({
  clinicalNotes: z.string().min(1),
  diagnosis: z.string().optional(),
  symptoms: z.string().optional(),
  treatment: z.string().optional(),
  recommendations: z.string().optional(),
  followUpInstructions: z.string().optional(),
  prescription: z.array(prescriptionItemSchema).default([]),
  mode: z.enum(["PATIENT_FRIENDLY", "CLINICAL_SOAP", "BULLETED_CHECKLIST", "REFERRAL_NOTE"]).default("PATIENT_FRIENDLY"),
});

doctorRouter.post(
  "/doctor/appointments/:id/visit-notes",
  requireAuth,
  requireRole("DOCTOR"),
  async (req: AuthedRequest, res) => {
    const parsed = visitNoteSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);

    try {
      const appointment = await prisma.appointment.findUniqueOrThrow({
        where: { id: req.params.id },
      });

      // Authorization guard: verify logged in doctor owns this appointment
      if (appointment.doctorId !== req.user!.id) {
        return res.status(403).json({ error: "Unauthorized: You are not the assigned doctor for this appointment" });
      }

      const prescriptionSummaryText = parsed.data.prescription
        .map((p) => `${p.drug} ${p.dosage}, ${p.timesPerDay}x/day for ${p.durationDays} days`)
        .join("; ");

      // Generate AI Post-Visit Summary in chosen LLM mode
      const llmSummary = await generatePostVisitSummary(
        parsed.data.clinicalNotes,
        prescriptionSummaryText,
        parsed.data.mode
      );

      // Robust UPSERT to prevent unique constraint crash on duplicate clicks/updates
      const visitNote = await prisma.visitNote.upsert({
        where: { appointmentId: appointment.id },
        update: {
          clinicalNotes: parsed.data.clinicalNotes,
          diagnosis: parsed.data.diagnosis || undefined,
          symptoms: parsed.data.symptoms || undefined,
          treatment: parsed.data.treatment || undefined,
          recommendations: parsed.data.recommendations || undefined,
          followUpInstructions: parsed.data.followUpInstructions || undefined,
          prescription: parsed.data.prescription,
          llmPatientSummary: llmSummary ?? undefined,
          llmStatus: llmSummary ? "SUCCESS" : "FAILED",
        },
        create: {
          appointmentId: appointment.id,
          clinicalNotes: parsed.data.clinicalNotes,
          diagnosis: parsed.data.diagnosis || undefined,
          symptoms: parsed.data.symptoms || undefined,
          treatment: parsed.data.treatment || undefined,
          recommendations: parsed.data.recommendations || undefined,
          followUpInstructions: parsed.data.followUpInstructions || undefined,
          prescription: parsed.data.prescription,
          llmPatientSummary: llmSummary ?? undefined,
          llmStatus: llmSummary ? "SUCCESS" : "FAILED",
        },
      });

      // Mark appointment as COMPLETED
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: "COMPLETED" },
      });

      // Replace / generate structured Medication Reminders
      await prisma.medicationReminder.deleteMany({
        where: { visitNoteId: visitNote.id },
      });

      const reminderRows = parsed.data.prescription.flatMap((item) => {
        const rows = [];
        for (let day = 0; day < item.durationDays; day++) {
          for (let dose = 0; dose < item.timesPerDay; dose++) {
            const scheduledAt = new Date();
            scheduledAt.setDate(scheduledAt.getDate() + day);
            scheduledAt.setHours(9 + dose * Math.floor(12 / item.timesPerDay), 0, 0, 0);
            rows.push({
              visitNoteId: visitNote.id,
              patientId: appointment.patientId,
              drugName: item.drug,
              dosage: item.dosage,
              scheduledAt,
            });
          }
        }
        return rows;
      });

      if (reminderRows.length > 0) {
        await prisma.medicationReminder.createMany({ data: reminderRows });
      }

      // Asynchronously trigger consultation summary email dispatch
      sendConsultationSummaryEmail(appointment.id).catch((err) => {
        console.error("Async consultation email dispatch error:", err);
      });

      res.status(200).json(visitNote);
    } catch (error) {
      console.error("Visit note submission error:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  }
);

doctorRouter.get(
  "/doctor/patients/:patientId/history",
  requireAuth,
  requireRole("DOCTOR"),
  async (req, res) => {
    try {
      const history = await prisma.appointment.findMany({
        where: {
          patientId: req.params.patientId,
          status: "COMPLETED",
        },
        include: {
          doctor: { include: { user: true } },
          visitNote: true,
          symptomForm: true,
        },
        orderBy: { slotStart: "desc" },
      });
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
);

doctorRouter.get(
  "/doctor/schedule",
  requireAuth,
  requireRole("DOCTOR"),
  async (req: AuthedRequest, res) => {
    try {
      const doctor = await prisma.doctor.findUnique({
        where: { id: req.user!.id },
        include: { leaves: true },
      });
      if (!doctor) return res.status(404).json({ error: "Doctor profile not found" });
      res.json(doctor);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
);
