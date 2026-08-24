import { Queue } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { prisma } from "../lib/prisma.js";
import { sendBookingEmail, sendReminderEmail, sendConsultationSummaryEmail } from "../services/emailService.js";
import { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent } from "../services/calendarService.js";
import { generatePreVisitSummary } from "../services/llmService.js";

let bullAvailable = false;

export const notificationQueue = new Queue("notifications", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 60_000 },
    removeOnComplete: 500,
    removeOnFail: false,
  },
});

export const reminderQueue = new Queue("medication-reminders", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 60_000 },
    removeOnComplete: 1000,
    removeOnFail: false,
  },
});

export const llmQueue = new Queue("llm-jobs", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: 500,
    removeOnFail: 200,
  },
});

redisConnection.on("connect", () => {
  bullAvailable = true;
  console.log("Redis connected. BullMQ queue operational.");
});

redisConnection.on("error", () => {
  bullAvailable = false;
});

export interface NotificationJobData {
  type: "BOOKING_CONFIRM" | "REMINDER" | "CANCELLATION" | "LEAVE_CONFLICT" | "RESCHEDULED" | "CONSULTATION_SUMMARY";
  channel: "EMAIL" | "CALENDAR";
  recipientId: string;
  appointmentId?: string;
}

/**
 * Robust notification dispatcher: uses BullMQ if Redis is active,
 * otherwise processes via async in-process task and records NotificationLog in PostgreSQL.
 */
export async function queueNotification(data: NotificationJobData) {
  if (bullAvailable) {
    try {
      await notificationQueue.add(`${data.type}:${data.channel}`, data);
      return;
    } catch (err) {
      console.warn("BullMQ enqueue failed, falling back to in-process dispatcher:", (err as Error).message);
    }
  }

  // In-process fallback execution
  setImmediate(async () => {
    try {
      if (data.channel === "EMAIL") {
        if (data.type === "REMINDER") {
          await sendReminderEmail(data.recipientId, data.appointmentId);
        } else if (data.type === "CONSULTATION_SUMMARY") {
          if (data.appointmentId) {
            await sendConsultationSummaryEmail(data.appointmentId);
          }
        } else {
          await sendBookingEmail(data.type, data.recipientId, data.appointmentId);
        }
      } else if (data.channel === "CALENDAR") {
        if (data.type === "LEAVE_CONFLICT" || data.type === "CANCELLATION") {
          await deleteCalendarEvent(data.appointmentId);
        } else if (data.type === "RESCHEDULED") {
          await updateCalendarEvent(data.appointmentId);
        } else {
          await createCalendarEvent(data.appointmentId);
        }
      }

      // Map to DB Enum type for notification log
      const dbType = data.type === "RESCHEDULED" ? "BOOKING_CONFIRM" : data.type;

      await prisma.notificationLog.create({
        data: {
          type: dbType,
          channel: data.channel,
          recipientId: data.recipientId,
          appointmentId: data.appointmentId,
          status: "SENT",
        },
      });
    } catch (err) {
      console.error("Direct notification dispatch error:", err);
      const dbType = data.type === "RESCHEDULED" ? "BOOKING_CONFIRM" : data.type;
      await prisma.notificationLog.create({
        data: {
          type: dbType,
          channel: data.channel,
          recipientId: data.recipientId,
          appointmentId: data.appointmentId,
          status: "FAILED",
          lastError: (err as Error).message,
        },
      });
    }
  });
}

/**
 * Robust LLM Pre-Visit Summary dispatcher
 */
export async function queuePreVisitSummary(appointmentId: string) {
  if (bullAvailable) {
    try {
      await llmQueue.add("pre-visit-summary", { appointmentId });
      return;
    } catch (err) {
      console.warn("BullMQ LLM enqueue failed, executing directly:", (err as Error).message);
    }
  }

  setImmediate(async () => {
    try {
      const symptomForm = await prisma.symptomForm.findUnique({
        where: { appointmentId },
      });
      if (!symptomForm) return;

      const summary = await generatePreVisitSummary(symptomForm.rawSymptoms);

      await prisma.symptomForm.update({
        where: { appointmentId },
        data: {
          llmUrgency: summary.urgencyLevel,
          llmChiefComplaint: summary.chiefComplaint,
          llmQuestions: summary.suggestedQuestions,
          llmStatus: "SUCCESS",
        },
      });
    } catch (err) {
      console.error("Direct LLM summary error:", err);
      await prisma.symptomForm.update({
        where: { appointmentId },
        data: { llmStatus: "FAILED" },
      });
    }
  });
}
