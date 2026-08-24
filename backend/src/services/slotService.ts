import { prisma } from "../lib/prisma.js";
import { Prisma } from "@prisma/client";

const HOLD_TTL_MINUTES = 5;

type WorkingHoursDay = { start: string; end: string }[];
type WorkingHours = Record<
  "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun",
  WorkingHoursDay
>;

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/**
 * Computes available slots for a doctor on a given date.
 * Slots are NOT pre-materialized: working hours - leaves - confirmed
 * appointments - active holds, chunked by slotDurationMinutes.
 */
export async function getAvailableSlots(doctorId: string, date: Date) {
  const doctor = await prisma.doctor.findUniqueOrThrow({
    where: { id: doctorId },
  });

  const dayKey = WEEKDAY_KEYS[date.getDay()];
  const workingHours = doctor.workingHours as unknown as WorkingHours;
  const dayRanges = workingHours[dayKey] ?? [];

  if (dayRanges.length === 0) return [];

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const [leave, confirmedAppointments, activeHolds] = await Promise.all([
    prisma.doctorLeave.findFirst({
      where: { doctorId, leaveDate: { gte: dayStart, lte: dayEnd } },
    }),
    prisma.appointment.findMany({
      where: {
        doctorId,
        status: "CONFIRMED",
        slotStart: { gte: dayStart, lte: dayEnd },
      },
      select: { slotStart: true },
    }),
    prisma.slotHold.findMany({
      where: {
        doctorId,
        expiresAt: { gt: new Date() },
        slotStart: { gte: dayStart, lte: dayEnd },
      },
      select: { slotStart: true },
    }),
  ]);

  if (leave) return []; // doctor is on leave for the whole day

  const taken = new Set(
    [...confirmedAppointments, ...activeHolds].map((a) =>
      a.slotStart.toISOString()
    )
  );

  const slots: Date[] = [];
  for (const range of dayRanges) {
    const [startH, startM] = range.start.split(":").map(Number);
    const [endH, endM] = range.end.split(":").map(Number);

    const cursor = new Date(date);
    cursor.setHours(startH, startM, 0, 0);
    const rangeEnd = new Date(date);
    rangeEnd.setHours(endH, endM, 0, 0);

    while (cursor < rangeEnd) {
      if (!taken.has(cursor.toISOString())) {
        slots.push(new Date(cursor));
      }
      cursor.setMinutes(cursor.getMinutes() + doctor.slotDurationMinutes);
    }
  }

  return slots;
}

/**
 * Creates a temporary hold on a slot. UX layer only — protects the patient's
 * form-filling time. INSERT ... ON CONFLICT DO NOTHING via the unique
 * (doctorId, slotStart) constraint returns 0 rows if already held.
 */
export async function createSlotHold(
  doctorId: string,
  patientId: string,
  slotStart: Date
) {
  const expiresAt = new Date(Date.now() + HOLD_TTL_MINUTES * 60 * 1000);

  try {
    const hold = await prisma.slotHold.create({
      data: { doctorId, patientId, slotStart, expiresAt },
    });
    return { ok: true as const, hold };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { ok: false as const, reason: "SLOT_ALREADY_HELD" as const };
    }
    throw err;
  }
}

/**
 * Confirms a booking from an existing hold. The partial unique index
 * `appointments_doctor_slot_confirmed_unique` (see migration.sql) is the
 * actual hard guarantee against double-booking — this transaction just
 * makes the happy path atomic and cleans up the hold.
 */
export async function confirmBookingFromHold(params: {
  holdId: string;
  patientId: string;
  rawSymptoms: string;
  slotDurationMinutes: number;
}) {
  const { holdId, patientId, rawSymptoms, slotDurationMinutes } = params;

  return prisma.$transaction(async (tx) => {
    const hold = await tx.slotHold.findUnique({ where: { id: holdId } });

    if (!hold || hold.patientId !== patientId) {
      throw new Error("HOLD_NOT_FOUND_OR_NOT_OWNED");
    }
    if (hold.expiresAt < new Date()) {
      await tx.slotHold.delete({ where: { id: holdId } });
      throw new Error("HOLD_EXPIRED");
    }

    const slotEnd = new Date(
      hold.slotStart.getTime() + slotDurationMinutes * 60 * 1000
    );

    let appointment;
    try {
      appointment = await tx.appointment.create({
        data: {
          patientId,
          doctorId: hold.doctorId,
          slotStart: hold.slotStart,
          slotEnd,
          status: "CONFIRMED",
        },
      });
    } catch (err) {
      // Hits the partial unique index if a race slipped through the hold layer.
      throw new Error("SLOT_NO_LONGER_AVAILABLE");
    }

    await tx.symptomForm.create({
      data: { appointmentId: appointment.id, rawSymptoms },
    });

    await tx.slotHold.delete({ where: { id: holdId } });

    return appointment;
  });
}
