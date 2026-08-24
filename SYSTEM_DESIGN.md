# System Design Document: Healthcare Appointment & Follow-up Manager

## 1. Overview
MedPrecision is a mission-critical healthcare appointment and follow-up management platform. In clinical workflows, scheduling integrity, doctor availability guarantees, and prompt notification delivery are essential. This document explains the architectural decisions behind four core distributed systems problems: double-booking prevention, doctor leave conflict resolution, the slot hold mechanism, and resilient notification failure handling.

---

## 2. Double-Booking Prevention

### The Problem
When multiple patients attempt to book the same doctor's slot concurrently, standard read-then-write application logic suffers from race conditions. A classic time-of-check to time-of-use (TOCTOU) vulnerability can result in two confirmed bookings for the same doctor at the same start time.

### Architectural Solution
MedPrecision enforces double-booking prevention at the database storage engine layer using a PostgreSQL partial unique index combined with serializable database transactions:

```sql
CREATE UNIQUE INDEX "appointments_doctor_slot_confirmed_unique"
ON "appointments"("doctorId", "slotStart")
WHERE status = 'CONFIRMED';
```

1. **Storage-Level Invariant**: Regardless of application instances, load balancers, or concurrent worker threads, PostgreSQL guarantees that only one active row can exist with `status = 'CONFIRMED'` for any `(doctorId, slotStart)` pair.
2. **Atomic Confirmation Transaction**: During booking finalization, the application executes inside `prisma.$transaction`. If a concurrent request confirms the same slot first, the second transaction immediately trips the unique index constraint with a `P2002` error. The backend catches this and returns a clean `409 Conflict` (`SLOT_NO_LONGER_AVAILABLE`), protecting data integrity without distributed deadlocks.

---

## 3. Slot Hold Mechanism (Temporary Reservations)

### The Problem
Filling out clinical intake details, describing symptoms, and reviewing doctor credentials takes 1 to 3 minutes. If slots are only claimed at the final submission step, patients experience high friction when slots disappear midway through form completion. Conversely, if holds are indefinite, abandoned carts lock doctor availability indefinitely.

### Architectural Solution
MedPrecision implements a fast, short-lived 5-minute Time-To-Live (TTL) hold mechanism:

```
[Patient Selects Slot] ──> [POST /appointments/hold]
                                │
                        [Create SlotHold] (expiresAt: now + 5 mins)
                                │
                    [Slot Computation Filters Out Active Holds]
                                │
[5-Min Timer Runs] ───────┬─────┴────────────────────────┐
                          ▼                              ▼
                 [Patient Confirms]              [Timer Expires]
              (Hold Converted to Appt)      (Hold Ignored & Garbage Collected)
```

1. **Dynamic Slot Materialization**: Doctor slots are computed on the fly by chunking doctor working hours, subtracting recorded leaves, confirmed appointments, and **active slot holds** (`expiresAt > NOW()`).
2. **Auto-Expiration**: Expired holds are automatically filtered out during slot calculation without requiring heavy batch deletion cron jobs. During confirmation, the backend validates that `hold.expiresAt > NOW()` before committing the appointment.

---

## 4. Doctor Leave Conflict Handling

### The Problem
Doctors frequently take scheduled PTO, attend medical conferences, or have medical emergencies. If a doctor is marked on leave for a date on which patients already have confirmed appointments, leaving the schedule unmanaged leads to missed visits and operational chaos.

### Architectural Solution
When an administrator records a doctor leave (`POST /admin/doctors/:id/leaves`), the system executes an atomic multi-step reconciliation transaction:

```typescript
const affectedAppointments = await prisma.$transaction(async (tx) => {
  await tx.doctorLeave.create({ data: { doctorId, leaveDate: dayStart, reason } });

  const affected = await tx.appointment.findMany({
    where: { doctorId, status: "CONFIRMED", slotStart: { gte: dayStart, lte: dayEnd } },
  });

  if (affected.length > 0) {
    await tx.appointment.updateMany({
      where: { id: { in: affected.map(a => a.id) } },
      data: { status: "RESCHEDULED" },
    });
  }
  return affected;
});
```

1. **Transactional Invariant**: The leave record and the transition of conflicting appointments to `RESCHEDULED` happen in the same atomic commit. State drift between doctor leave and active appointments is impossible.
2. **Decoupled Notification Fanout**: Immediately after the transaction commits, asynchronous notification jobs (`LEAVE_CONFLICT`) are enqueued for every affected patient, alerting them via Email and unsyncing conflicting Google Calendar events.

---

## 5. Notification & Asynchronous Reliability

### The Problem
Third-party notification providers (email delivery APIs, Google Calendar API, and LLM endpoints) are subject to network latency, transient outages, and rate limits. Blocking synchronous booking requests on external network calls degrades system response time and risks cascading failures.

### Architectural Solution
MedPrecision uses an asynchronous event architecture with dual-mode queue processing:

1. **Decoupled Side Effects**: Booking confirmation returns immediately upon database commit (`< 100ms latency`). Email dispatch, Google Calendar synchronization, and LLM pre-visit symptom evaluation are enqueued to background workers.
2. **Exponential Backoff & Retries**: Notification workers retry transient network errors up to 3 times with exponential backoff (`1m`, `2m`, `4m`).
3. **Dead-Letter Queue & Audit Logging**: Every dispatch attempt is logged in PostgreSQL (`notification_logs`). Jobs that exhaust all retry attempts transition to `DEAD_LETTER` status, surfacing on the Admin Health Dashboard for manual replay or clinical staff follow-up.
4. **Graceful LLM Fallback**: If LLM APIs are unreachable, a deterministic clinical heuristic engine computes symptom urgency (`LOW`, `MEDIUM`, `HIGH`) and generates diagnostic questions, ensuring consultations are never disrupted.
