import "dotenv/config";
import { prisma } from "../lib/prisma.js";
import { sendReminderEmail } from "../services/emailService.js";

/**
 * In-process medication reminder background scanner.
 * Runs every 60 seconds to scan due pending reminders and dispatch notifications.
 */
export function startBackgroundWorkers() {
  console.log("Starting in-process background worker for medication reminders and notifications...");

  const scanInterval = setInterval(async () => {
    try {
      const now = new Date();
      const due = await prisma.medicationReminder.findMany({
        where: {
          status: "PENDING",
          scheduledAt: { lte: now },
        },
        take: 50,
      });

      for (const reminder of due) {
        try {
          await sendReminderEmail(reminder.patientId, undefined, reminder.id);
          await prisma.medicationReminder.update({
            where: { id: reminder.id },
            data: { status: "SENT" },
          });
          await prisma.notificationLog.create({
            data: {
              type: "REMINDER",
              channel: "EMAIL",
              recipientId: reminder.patientId,
              status: "SENT",
            },
          });
        } catch (err) {
          console.error(`Failed to send reminder ${reminder.id}:`, err);
        }
      }
    } catch (err) {
      console.error("Medication reminder scanner error:", err);
    }
  }, 60_000);

  // Unref so it doesn't block process exit if necessary
  if (scanInterval.unref) scanInterval.unref();
}
