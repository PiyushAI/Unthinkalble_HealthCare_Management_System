"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { SymptomForm } from "@/types/api";

interface PrescriptionRow {
  drug: string;
  dosage: string;
  timesPerDay: number;
  durationDays: number;
}

export default function DoctorVisitPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [summary, setSummary] = useState<SymptomForm | null>(null);
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [prescription, setPrescription] = useState<PrescriptionRow[]>([
    { drug: "", dosage: "", timesPerDay: 1, durationDays: 1 },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<SymptomForm>(`/doctor/appointments/${id}/summary`).then(setSummary).catch(console.error);
  }, [id]);

  function updateRow(index: number, patch: Partial<PrescriptionRow>) {
    setPrescription((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/doctor/appointments/${id}/visit-notes`, {
        method: "POST",
        body: JSON.stringify({ clinicalNotes, prescription }),
      });
      router.push("/doctor");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-4 text-2xl font-semibold text-clinic-ink">Visit</h1>

      {summary && (
        <div className="mb-6 rounded-xl border border-black/5 bg-white p-4 text-sm shadow-sm">
          <p className="mb-1 font-medium text-clinic-ink">Pre-visit AI summary</p>
          {summary.llmStatus === "SUCCESS" ? (
            <>
              <p className="text-clinic-ink/70">{summary.llmChiefComplaint}</p>
              <ul className="mt-2 list-disc pl-5 text-clinic-ink/60">
                {summary.llmQuestions?.map((q) => <li key={q}>{q}</li>)}
              </ul>
            </>
          ) : (
            <p className="text-clinic-ink/70">{summary.rawSymptoms}</p>
          )}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <textarea
          required
          rows={5}
          value={clinicalNotes}
          onChange={(e) => setClinicalNotes(e.target.value)}
          placeholder="Clinical notes..."
          className="w-full rounded-lg border border-black/10 p-3 text-sm outline-none focus:border-clinic-primary"
        />

        <div className="space-y-2">
          <p className="text-sm font-medium text-clinic-ink">Prescription</p>
          {prescription.map((row, i) => (
            <div key={i} className="grid grid-cols-4 gap-2">
              <input
                placeholder="Drug"
                value={row.drug}
                onChange={(e) => updateRow(i, { drug: e.target.value })}
                className="rounded-lg border border-black/10 px-2 py-1.5 text-sm"
              />
              <input
                placeholder="Dosage"
                value={row.dosage}
                onChange={(e) => updateRow(i, { dosage: e.target.value })}
                className="rounded-lg border border-black/10 px-2 py-1.5 text-sm"
              />
              <input
                type="number"
                min={1}
                placeholder="Times/day"
                value={row.timesPerDay}
                onChange={(e) => updateRow(i, { timesPerDay: Number(e.target.value) })}
                className="rounded-lg border border-black/10 px-2 py-1.5 text-sm"
              />
              <input
                type="number"
                min={1}
                placeholder="Days"
                value={row.durationDays}
                onChange={(e) => updateRow(i, { durationDays: Number(e.target.value) })}
                className="rounded-lg border border-black/10 px-2 py-1.5 text-sm"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setPrescription((rows) => [...rows, { drug: "", dosage: "", timesPerDay: 1, durationDays: 1 }])
            }
            className="text-sm text-clinic-primary hover:underline"
          >
            + Add medication
          </button>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-clinic-primary py-2 text-sm font-medium text-white hover:bg-clinic-primaryDark disabled:opacity-60"
        >
          {saving ? "Saving..." : "Complete visit"}
        </button>
      </form>
    </main>
  );
}
