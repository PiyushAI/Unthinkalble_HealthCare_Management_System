"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
  FileText, 
  Search, 
  Calendar, 
  User, 
  Activity, 
  CheckCircle, 
  Clock, 
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  X,
  Pill,
  Stethoscope,
  ClipboardList
} from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function PatientRecordsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedConsultation, setSelectedConsultation] = useState<any | null>(null);

  async function loadRecords() {
    try {
      const data = await apiFetch<any[]>("/patient/appointments");
      // Filter appointments that have completed or have visit notes
      const completed = (data || []).filter(
        (a) => a.status === "COMPLETED" || a.visitNote
      );
      setAppointments(completed);
    } catch (err) {
      console.error("Failed to load patient records:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
  }, []);

  const filteredRecords = appointments.filter((rec) => {
    const docName = rec.doctor?.user?.name?.toLowerCase() || "";
    const spec = rec.doctor?.specialization?.toLowerCase() || "";
    const diag = rec.visitNote?.diagnosis?.toLowerCase() || "";
    const notes = rec.visitNote?.clinicalNotes?.toLowerCase() || "";
    const term = searchTerm.toLowerCase();
    return docName.includes(term) || spec.includes(term) || diag.includes(term) || notes.includes(term);
  });

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Consultation History & Care Records</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Access your doctor consultation summaries, diagnoses, care plans, and prescribed medications.
          </p>
        </div>
      </div>

      {/* Security & Health Badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-primary">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h3 className="font-title-md text-title-md text-on-surface">HIPAA Encrypted</h3>
          </div>
          <p className="font-caption-xs text-caption-xs text-on-surface-variant">
            All consultation summaries and medical records are end-to-end encrypted in Supabase.
          </p>
        </Card>

        <Card className="p-4 border-l-4 border-status-success">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-status-success" />
            <h3 className="font-title-md text-title-md text-on-surface">Total Consultations</h3>
          </div>
          <p className="font-title-lg text-title-lg font-bold text-on-surface">{appointments.length} Completed</p>
        </Card>

        <Card className="p-4 border-l-4 border-ai-accent">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-5 h-5 text-ai-accent" />
            <h3 className="font-title-md text-title-md text-on-surface">AI Care Plan Sync</h3>
          </div>
          <p className="font-caption-xs text-caption-xs text-on-surface-variant">
            Automated medication schedule and follow-up guidance generated for every visit.
          </p>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by doctor, specialty, or diagnosis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-on-surface placeholder:text-on-surface-variant/70"
          />
        </div>
        <div className="text-xs text-on-surface-variant font-medium">
          Showing <strong>{filteredRecords.length}</strong> finalized consultation records
        </div>
      </Card>

      {/* Records List */}
      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="py-16 text-center text-on-surface-variant animate-pulse">
            Loading your consultation history...
          </div>
        ) : filteredRecords.length === 0 ? (
          <Card className="p-12 text-center bg-surface-container-low border-dashed border-outline-variant">
            <FileText className="w-12 h-12 text-on-surface-variant mx-auto mb-3 opacity-40" />
            <h3 className="font-title-md text-base font-semibold text-on-surface">No Consultation Records Found</h3>
            <p className="font-body-md text-xs text-on-surface-variant mt-1">
              {searchTerm
                ? "No completed visits match your search criteria."
                : "You don't have any completed consultations recorded yet."}
            </p>
          </Card>
        ) : (
          filteredRecords.map((record) => {
            const date = new Date(record.slotStart);
            const doctorName = record.doctor?.user?.name || "Dr. Specialist";
            const specialty = record.doctor?.specialization || "General Medicine";
            const note = record.visitNote;
            const diagnosisText = note?.diagnosis || "Clinical Consultation Completed";
            const summaryPreview = note?.llmPatientSummary || note?.clinicalNotes || "Visit completed.";

            return (
              <Card
                key={record.id}
                className="p-5 hover:border-primary/40 transition-colors flex flex-col md:flex-row justify-between gap-4 items-start md:items-center"
              >
                <div className="flex gap-4 items-start">
                  <div className="p-3 rounded-xl bg-surface-container text-primary shrink-0 mt-1">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-title-md text-base text-on-surface font-semibold">
                        {doctorName}
                      </h3>
                      <span className="bg-primary-container/20 text-primary font-caption-xs text-[11px] px-2.5 py-0.5 rounded-full font-semibold">
                        {specialty}
                      </span>
                      <span className="bg-status-success/10 text-status-success font-caption-xs text-[11px] px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Completed
                      </span>
                    </div>

                    <p className="font-semibold text-xs text-primary mb-1">
                      Diagnosis: {diagnosisText}
                    </p>

                    <p className="font-body-md text-xs text-on-surface-variant line-clamp-2 mb-2">
                      {summaryPreview}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-secondary" />{" "}
                        {date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-secondary" />{" "}
                        {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <Button
                    size="sm"
                    className="text-xs"
                    onClick={() => setSelectedConsultation(record)}
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" /> View Consultation
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Consultation Summary Detail Modal */}
      {selectedConsultation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col">
            <Card className="shadow-2xl border-outline-variant flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="p-5 border-b border-outline-variant bg-surface-bright flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-variant shrink-0 border border-primary/20 flex items-center justify-center text-primary">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-title-md text-base font-semibold text-on-surface">
                      Consultation Summary & Care Plan
                    </h3>
                    <p className="text-xs text-on-surface-variant">
                      {selectedConsultation.doctor?.user?.name} ({selectedConsultation.doctor?.specialization})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedConsultation(null)}
                  className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-4 max-h-[60vh] text-xs text-on-surface">
                {/* Appointment Info Box */}
                <div className="p-3.5 rounded-lg bg-surface-container-low border border-outline-variant grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[11px] text-on-surface-variant block">Date</span>
                    <strong>{new Date(selectedConsultation.slotStart).toLocaleDateString(undefined, { dateStyle: "medium" })}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-on-surface-variant block">Time</span>
                    <strong>{new Date(selectedConsultation.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-on-surface-variant block">Appointment ID</span>
                    <span className="font-mono text-[10px] text-primary truncate block">{selectedConsultation.id}</span>
                  </div>
                </div>

                {/* Symptoms / Chief Complaint */}
                {selectedConsultation.symptomForm?.rawSymptoms && (
                  <div>
                    <h4 className="font-semibold text-on-surface mb-1 flex items-center gap-1.5">
                      <ClipboardList className="w-3.5 h-3.5 text-primary" /> Symptoms / Chief Complaint
                    </h4>
                    <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant">
                      {selectedConsultation.symptomForm.rawSymptoms}
                    </div>
                  </div>
                )}

                {/* Diagnosis */}
                <div>
                  <h4 className="font-semibold text-on-surface mb-1 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-status-success" /> Diagnosis
                  </h4>
                  <div className="p-3 bg-emerald-50 text-emerald-900 rounded-lg border border-emerald-200 font-medium">
                    {selectedConsultation.visitNote?.diagnosis || "Clinical consultation completed"}
                  </div>
                </div>

                {/* AI Care Plan / Summary */}
                {selectedConsultation.visitNote?.llmPatientSummary && (
                  <div>
                    <h4 className="font-semibold text-purple-900 mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-ai-accent" /> Consultation Summary & Patient Care Plan
                    </h4>
                    <div className="p-4 bg-purple-50/60 rounded-lg border border-purple-200 whitespace-pre-line leading-relaxed">
                      {selectedConsultation.visitNote.llmPatientSummary}
                    </div>
                  </div>
                )}

                {/* Treatment / Advice */}
                {selectedConsultation.visitNote?.treatment && (
                  <div>
                    <h4 className="font-semibold text-on-surface mb-1">Treatment / Advice</h4>
                    <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant">
                      {selectedConsultation.visitNote.treatment}
                    </div>
                  </div>
                )}

                {/* Prescribed Medications */}
                {Array.isArray(selectedConsultation.visitNote?.prescription) && selectedConsultation.visitNote.prescription.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-on-surface mb-1 flex items-center gap-1.5">
                      <Pill className="w-3.5 h-3.5 text-primary" /> Prescribed Medications
                    </h4>
                    <div className="space-y-1.5">
                      {selectedConsultation.visitNote.prescription.map((rx: any, i: number) => (
                        <div key={i} className="p-2.5 rounded bg-blue-50/60 border border-blue-200 flex justify-between items-center">
                          <strong>{rx.drug} ({rx.dosage})</strong>
                          <span className="text-on-surface-variant">{rx.timesPerDay}x/day for {rx.durationDays} days</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations & Follow-up */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedConsultation.visitNote?.recommendations && (
                    <div>
                      <h4 className="font-semibold text-on-surface mb-1">Recommendations</h4>
                      <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant">
                        {selectedConsultation.visitNote.recommendations}
                      </div>
                    </div>
                  )}
                  {selectedConsultation.visitNote?.followUpInstructions && (
                    <div>
                      <h4 className="font-semibold text-on-surface mb-1">Follow-up Instructions</h4>
                      <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant">
                        {selectedConsultation.visitNote.followUpInstructions}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-outline-variant bg-surface-bright flex justify-end">
                <Button size="sm" onClick={() => setSelectedConsultation(null)}>
                  Close
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
