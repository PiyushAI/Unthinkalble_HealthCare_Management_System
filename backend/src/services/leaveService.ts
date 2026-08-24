import { prisma } from "../lib/prisma.js";
import { queueNotification } from "../queues/notificationQueue.js";

/**
 * Marks a doctor on leave for a date and, in the SAME transaction,
 * reschedules any confirmed appointments that fall on that date so the
 * leave record and affected-appointment state can never drift apart.
 */
export async function markDoctorLeave(
  doctorId: string,
  leaveDate: Date,
  reason?: string
) {
  const dayStart = new Date(leaveDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(leaveDate);
  dayEnd.setHours(23, 59, 59, 999);

  const affectedAppointments = await prisma.$transaction(async (tx) => {
    await tx.doctorLeave.create({
      data: { doctorId, leaveDate: dayStart, reason },
    });

    const affected = await tx.appointment.findMany({
      where: {
        doctorId,
        status: "CONFIRMED",
        slotStart: { gte: dayStart, lte: dayEnd },
      },
    });

    if (affected.length > 0) {
      await tx.appointment.updateMany({
        where: { id: { in: affected.map((a) => a.id) } },
        data: { status: "RESCHEDULED" },
      });
    }

    return affected;
  });

  // Notify doctor that leave has been recorded
  await queueNotification({
    type: "LEAVE_CONFLICT",
    channel: "EMAIL",
    recipientId: doctorId,
  });

  // Notifications are queued AFTER the transaction commits — they're
  // best-effort side effects, never part of the correctness-critical write.
  for (const appt of affectedAppointments) {
    await queueNotification({
      type: "LEAVE_CONFLICT",
      channel: "EMAIL",
      recipientId: appt.patientId,
      appointmentId: appt.id,
    });
    if (appt.googleEventIdPatient) {
      await queueNotification({
        type: "LEAVE_CONFLICT",
        channel: "CALENDAR",
        recipientId: appt.patientId,
        appointmentId: appt.id,
      });
    }
    if (appt.googleEventIdDoctor) {
      await queueNotification({
        type: "LEAVE_CONFLICT",
        channel: "CALENDAR",
        recipientId: doctorId,
        appointmentId: appt.id,
      });
    }
  }

  return affectedAppointments;
}
