# Healthcare Appointment & Follow-up Manager — System Architecture

## 1. Tech Stack Recommendation

### Database — pick **Supabase**, not Neon or Firebase

| | Firebase (Firestore) | Neon | Supabase |
|---|---|---|---|
| Data model | NoSQL, document | Relational Postgres | Relational Postgres |
| Transactions / row locks | Limited, no `SELECT FOR UPDATE` | Full Postgres | Full Postgres |
| Auth bundled | Yes | No (need Clerk/NextAuth separately) | Yes (built-in, role-aware) |
| Realtime | Yes | No | Yes (Postgres logical replication) |
| Storage (docs/prescriptions) | Yes | No | Yes |
| Fit for this project | Poor | Good but incomplete | Best |

**Why not Firebase:** the hardest requirement in this spec is *"prevent double-booking and handle simultaneous booking attempts safely"* plus relational integrity across doctors → leaves → appointments → notifications. That needs unique constraints, foreign keys, and row-level locking (`SELECT ... FOR UPDATE`) inside a transaction. Firestore doesn't give you real transactional row-locking across documents the way Postgres does, and you'd be fighting the data model instead of using it.

**Why Supabase over raw Neon:** Neon is just serverless Postgres — great engine, but you'd have to bolt on a separate auth provider, storage, and realtime yourself. Supabase gives you Postgres + Auth (with role claims for patient/doctor/admin) + Row Level Security + Storage in one place, which matches "role-based auth" and "DB schema design" evaluation criteria directly, and saves you real time as a solo capstone-scale build with a placement season running in parallel.

**Recommended full stack:**

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui — one app, three role-gated portals via middleware
- **Backend:** Next.js Route Handlers (or a separate NestJS service if you want cleaner service-layer separation for the write-up) + Prisma ORM
- **DB:** Supabase (Postgres) + Supabase Auth (JWT, custom `role` claim)
- **Background jobs / queues:** BullMQ + Upstash Redis (free tier, serverless-friendly)
- **Email:** Resend (modern, generous free tier) or SendGrid/Nodemailer — any works, Resend has the cleanest API
- **Calendar:** Google Calendar API v3 with OAuth 2.0 (per-user refresh tokens stored encrypted)
- **LLM:** Claude API (Haiku/Sonnet) or OpenAI — structured JSON output mode for both prompts
- **Hosting:** Vercel (frontend + API) + Supabase (DB/Auth) + Upstash (Redis) + a small always-on worker on Railway/Render for BullMQ processors (Vercel functions are not great for long-running queue consumers)

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Next.js)                         │
│   /patient/*        /doctor/*        /admin/*                │
│   role-gated via middleware reading Supabase JWT claim       │
└───────────────────────────┬───────────────────────────────────┘
                             │ REST/tRPC (HTTPS)
┌───────────────────────────▼───────────────────────────────────┐
│                    API LAYER (Route Handlers)                 │
│  AuthMiddleware → Controllers → Zod validation                │
├─────────────────────────────────────────────────────────────┤
│                    SERVICE LAYER                              │
│  SlotService | AppointmentService | LeaveService              │
│  LLMService  | NotificationService | CalendarService          │
└───────┬───────────────┬──────────────┬─────────────┬─────────┘
        │               │              │             │
┌───────▼──────┐ ┌──────▼─────┐ ┌──────▼──────┐ ┌────▼────────┐
│  Supabase     │ │  BullMQ /  │ │  LLM API    │ │ Google Cal  │
│  Postgres     │ │  Redis     │ │  (Claude)   │ │ + Email API │
│  (Prisma)     │ │  Queues    │ │             │ │             │
└───────────────┘ └────────────┘ └─────────────┘ └─────────────┘
                        │
              ┌─────────▼─────────┐
              │  Worker process    │
              │  (Railway/Render)  │
              │  consumes queues,  │
              │  sends email,      │
              │  syncs calendar,   │
              │  fires reminders   │
              └────────────────────┘
```

**Key architectural decision:** the booking API response should return as soon as the appointment row is committed. Email sending and calendar sync are **never done synchronously inside the booking request** — they're queued jobs. This is what makes "notification failure handling" gracefully degradable instead of breaking the user-facing flow.

---

## 3. Database Schema (Prisma-style, Postgres)

```
users
 ├─ id (uuid, PK)
 ├─ role (enum: patient | doctor | admin)
 ├─ name, email (unique), phone
 └─ created_at

doctors
 ├─ id (uuid, PK, FK → users.id)
 ├─ specialization
 ├─ working_hours (jsonb: {mon:[{start,end}], tue:[...], ...})
 ├─ slot_duration_minutes (int)
 └─ google_refresh_token (encrypted, nullable)

doctor_leaves
 ├─ id (PK)
 ├─ doctor_id (FK)
 ├─ leave_date (date)
 └─ reason (text, nullable)
 UNIQUE(doctor_id, leave_date)

patients
 ├─ id (uuid, PK, FK → users.id)
 ├─ dob, gender
 └─ google_refresh_token (encrypted, nullable)

slot_holds                      -- temporary lock while patient fills symptom form
 ├─ id (PK)
 ├─ doctor_id (FK)
 ├─ slot_start (timestamptz)
 ├─ patient_id (FK)
 └─ expires_at (timestamptz)     -- e.g. now() + 5 minutes
 UNIQUE(doctor_id, slot_start)   -- only one active hold per slot

appointments
 ├─ id (PK)
 ├─ patient_id, doctor_id (FK)
 ├─ slot_start, slot_end (timestamptz)
 ├─ status (enum: confirmed | cancelled | completed | rescheduled)
 ├─ google_event_id_patient, google_event_id_doctor (nullable)
 ├─ version (int, default 0)     -- optimistic locking fallback
 └─ created_at
 UNIQUE(doctor_id, slot_start) WHERE status = 'confirmed'   -- hard DB-level guard

symptom_forms
 ├─ id (PK)
 ├─ appointment_id (FK, unique)
 ├─ raw_symptoms (text)
 ├─ llm_urgency (enum: low | medium | high | null)
 ├─ llm_chief_complaint (text, nullable)
 ├─ llm_questions (jsonb, nullable)
 ├─ llm_status (enum: pending | success | failed)
 └─ created_at

visit_notes
 ├─ id (PK)
 ├─ appointment_id (FK, unique)
 ├─ clinical_notes (text)
 ├─ prescription (jsonb: [{drug, dosage, times_per_day, duration_days}])
 ├─ llm_patient_summary (text, nullable)
 ├─ llm_status (enum: pending | success | failed)
 └─ created_at

medication_reminders
 ├─ id (PK)
 ├─ visit_note_id (FK)
 ├─ patient_id (FK)
 ├─ drug_name, dosage
 ├─ scheduled_at (timestamptz)
 ├─ status (enum: pending | sent | failed)
 └─ retry_count (int, default 0)

notification_log
 ├─ id (PK)
 ├─ type (enum: booking_confirm | reminder | cancellation | leave_conflict)
 ├─ channel (enum: email | calendar)
 ├─ recipient_id (FK → users)
 ├─ appointment_id (nullable FK)
 ├─ status (enum: queued | sent | failed | dead_letter)
 ├─ retry_count, last_error
 └─ created_at
```

**Why prescription is structured JSON, not LLM free text:** medication reminders need reliable `times_per_day` / `duration_days` values to schedule jobs. Never parse the LLM's prose output for scheduling logic — capture structured fields from the doctor's form input, and let the LLM only *narrate* it for the patient-facing summary.

---

## 4. Scenario-by-Scenario Handling

### A. Double booking / simultaneous booking attempts
1. Patient selects a slot → backend creates a row in `slot_holds` inside a transaction with `INSERT ... ON CONFLICT (doctor_id, slot_start) DO NOTHING`. If 0 rows affected, another patient already holds it → return "slot just taken."
2. Hold expires in 5 minutes (checked on read + a periodic BullMQ cleanup job deletes expired holds).
3. Patient fills symptom form and confirms → backend re-validates the hold belongs to this patient and hasn't expired, then in a single transaction: delete the hold, insert into `appointments` (protected by the partial `UNIQUE(doctor_id, slot_start) WHERE status='confirmed'` index as the final hard guarantee), commit.
4. The unique index is the actual source of truth — the hold table is just a good UX layer to stop two people wasting the form-filling time on a slot that's about to be taken. Even if the hold logic has a bug, the DB constraint prevents a double-confirmed booking; the losing transaction gets a constraint violation and the API returns a clean "slot no longer available."

### B. Slot generation (not pre-materialized)
- Slots are computed on read: take `doctor.working_hours` for that weekday, subtract `doctor_leaves` for that date, subtract existing `confirmed` appointments and active `slot_holds`, chunk remaining time by `slot_duration_minutes`. This avoids maintaining a huge pre-generated slots table and keeps leave/working-hour changes instantly reflected.

### C. Doctor leave conflict handling
1. Admin/doctor marks a `doctor_leaves` row for a date.
2. A DB trigger or application-level check immediately queries `appointments WHERE doctor_id = ? AND status='confirmed' AND slot_start::date = ?`.
3. Each affected appointment → status set to `rescheduled`, a `notification_log` row queued with `type = leave_conflict` for the patient, email includes a reschedule link (pre-filtered to that doctor's next available slots) and optionally a doctor Google Calendar event deletion.
4. This is done inside the same transaction that creates the leave record so leave + cancellation state can't drift apart.

### D. Pre-visit LLM summary
- On symptom form submit, appointment is already confirmed — the LLM call happens **async**, not blocking the booking response.
- Prompt (as specified): urgency level, chief complaint, 3 suggested questions — request structured JSON output.
- Failure handling: try/catch around the LLM call, 2 retries with backoff, on final failure set `llm_status='failed'` and doctor dashboard shows the raw symptom text with a "AI summary unavailable" badge instead of blocking anything.

### E. Post-visit LLM summary
- Same async pattern: doctor submits notes + structured prescription → job queued → LLM converts to patient-friendly summary → stored → confirmation email queued once summary is ready (or sent without AI summary if it failed, with raw notes summarized manually by doctor as fallback text).

### F. Medication reminders
- On visit_notes save, for each prescription line item, generate `medication_reminders` rows for every scheduled dose across `duration_days` (e.g., `times_per_day=2, duration_days=5` → 10 reminder rows with computed `scheduled_at`).
- A BullMQ repeatable job scans `medication_reminders WHERE status='pending' AND scheduled_at <= now()` every minute and enqueues send jobs.
- Retry: 3 attempts, exponential backoff (1m, 5m, 15m); after that, `status='failed'` and logged to `notification_log` as `dead_letter` for admin visibility — doesn't retry forever.

### G. Email + Google Calendar sync
- Booking confirm → two queued jobs: `send-email(booking_confirm)` and `create-calendar-event`. Both idempotent: calendar job checks `google_event_id_*` is null before creating (guards against duplicate on retry).
- Reschedule/cancel → queued `update-calendar-event` / `delete-calendar-event` + cancellation email, using stored `google_event_id`.
- OAuth 2.0: each doctor/patient connects Google Calendar once; refresh token stored encrypted; if a token is revoked, the calendar job fails gracefully, logs to `notification_log`, and the rest of the flow (email, DB state) is unaffected.

### H. Notification failure handling (general pattern)
- Every outbound side-effect (email, calendar) is a BullMQ job, never inline in the request path.
- Exponential backoff retries (typically 3 attempts).
- Terminal failures land in `notification_log` with `status='dead_letter'`, visible on an admin "failed notifications" panel with a manual "retry" button.
- Optional: circuit breaker — if the email provider fails N times in a row, pause the queue for a cooldown window instead of hammering a down API.

---

## 5. API Surface (representative, not exhaustive)

```
Auth (Supabase-managed):        POST /auth/signup, /auth/login

Admin:
  POST   /admin/doctors                 create doctor profile
  PATCH  /admin/doctors/:id             update working hours/specialization
  POST   /admin/doctors/:id/leaves      mark leave day
  GET    /admin/notifications/failed    dead-letter panel

Patient:
  GET    /doctors?specialization=       search
  GET    /doctors/:id/slots?date=       computed available slots
  POST   /appointments/hold             create slot_hold
  POST   /appointments/confirm          confirm from hold + symptom form
  GET    /appointments/me
  POST   /appointments/:id/cancel

Doctor:
  GET    /doctor/appointments?date=
  GET    /doctor/appointments/:id/summary     pre-visit LLM summary
  POST   /doctor/appointments/:id/visit-notes post-visit notes + prescription

Internal/webhook:
  POST   /webhooks/google/oauth-callback
```

---

## 6. System Design Write-Up (~750 words, ready to trim into your deliverable #4)

**Double-booking prevention.** The system treats slot availability as a two-layer guarantee. The soft layer is a `slot_holds` table with a unique `(doctor_id, slot_start)` constraint, acquired the moment a patient selects a slot and expiring after five minutes — this gives good UX by rejecting a conflicting selection immediately, before the patient invests time filling the symptom form. The hard layer is a partial unique index on `appointments(doctor_id, slot_start) WHERE status = 'confirmed'`, enforced by Postgres itself. Even under concurrent requests that both pass the application-level hold check due to a race, the database constraint makes it structurally impossible for two confirmed appointments to occupy the same doctor-slot pair; the second transaction fails at commit and the API surfaces a clean "slot no longer available" response. This pushes correctness into the data layer rather than relying purely on application logic, which is the only approach that's actually safe under concurrent traffic.

**Slot generation.** Rather than pre-materializing slot rows (which would need constant regeneration whenever working hours or leave days change), available slots are computed on read: doctor working hours for the given weekday, minus leave days, minus existing confirmed bookings and live holds, chunked by the doctor's slot duration. This keeps the system correct by construction — there's no stale slot table to reconcile.

**Doctor leave conflict handling.** When a leave day is recorded, the same transaction queries all confirmed appointments for that doctor on that date, transitions them to `rescheduled`, and enqueues a `leave_conflict` notification per affected patient carrying a reschedule link pre-filtered to the doctor's next available slots. Doing the conflict scan inside the leave-creation transaction (rather than as a best-effort background sweep) guarantees the leave record and the affected-appointment state can never drift apart — a crash mid-way rolls back both, not just one.

**Slot hold mechanism.** The hold exists purely to protect user experience during the multi-step booking flow (select slot → fill symptom form → confirm), not as the correctness mechanism. Holds are cleaned up by a periodic background job removing expired rows, and are also re-validated at confirm time (ownership + expiry) so a patient can't confirm against a hold that's timed out or belongs to someone else.

**Notification failure handling.** No user-facing request path performs a synchronous email send or Google Calendar API call — every side effect (booking confirmation, reminder, cancellation, calendar create/update/delete) is pushed onto a BullMQ queue backed by Redis and processed by an independent worker. This decouples the booking transaction's success from any third-party API's availability: if SendGrid or Google Calendar is down, the appointment is still safely booked, and the notification retries with exponential backoff (three attempts) before landing in a `notification_log` dead-letter state visible to admins for manual retry. Calendar-sync jobs are idempotent — they check for an existing `google_event_id` before creating a new event — so a retried job never produces duplicate calendar entries.

**LLM integration.** Both the pre-visit and post-visit LLM calls run asynchronously after the appointment/visit-note is already persisted, never blocking the primary write. Each call is wrapped with a bounded retry (two attempts) and a per-record `llm_status` field (`pending / success / failed`). On terminal failure, the doctor dashboard falls back to displaying the raw symptom text, and the patient-facing post-visit email falls back to the doctor's original clinical notes — so an LLM outage degrades gracefully rather than breaking the visit workflow. Medication reminder scheduling deliberately avoids depending on LLM output at all: prescription frequency is captured as structured fields (`times_per_day`, `duration_days`) from the doctor's form, and the LLM is used only to narrate the schedule for the patient, keeping the safety-critical reminder logic independent of AI reliability.

**Overall,** the architecture's guiding principle is that correctness-critical paths (booking uniqueness, leave-conflict consistency, reminder scheduling) rely on database constraints and structured data, while best-effort paths (email, calendar sync, AI summaries) are pushed to an async, retryable, observable queue — so a third-party outage never takes down the core booking flow.
