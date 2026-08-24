"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

export default function AdminDoctorsPage() {
  const [doctorId, setDoctorId] = useState("");
  const [leaveDate, setLeaveDate] = useState("");
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<string | null>(null);

  async function submitLeave(e: React.FormEvent) {
    e.preventDefault();
    const res = await apiFetch<{ affectedAppointmentCount: number }>(
      `/admin/doctors/${doctorId}/leaves`,
      { method: "POST", body: JSON.stringify({ leaveDate, reason }) }
    );
    setResult(`Leave marked. ${res.affectedAppointmentCount} appointment(s) rescheduled and notified.`);
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-clinic-ink">Mark doctor leave</h1>
      <form onSubmit={submitLeave} className="space-y-4">
        <input
          required
          placeholder="Doctor ID"
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        />
        <input
          required
          type="date"
          value={leaveDate}
          onChange={(e) => setLeaveDate(e.target.value)}
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        />
        <input
          placeholder="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="w-full rounded-lg bg-clinic-primary py-2 text-sm font-medium text-white hover:bg-clinic-primaryDark"
        >
          Mark leave
        </button>
      </form>
      {result && <p className="mt-4 text-sm text-clinic-ink/70">{result}</p>}

      <p className="mt-8 text-xs text-clinic-ink/40">
        Doctor profile creation form: build against POST /admin/doctors — collect
        specialization, working hours per weekday, and slot duration.
      </p>
    </main>
  );
}
