"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
  ArrowLeft, 
  Video, 
  FileText, 
  Pill, 
  Activity,
  CheckCircle, 
  Clock, 
  Sparkles,
  AlertTriangle,
  Plus,
  Trash2,
  HelpCircle,
  CheckCircle2,
  Sliders,
  Eye,
  Stethoscope,
  ClipboardList
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface PrescriptionItem {
  drug: string;
  dosage: string;
  timesPerDay: number;
  durationDays: number;
}

type LLMMode = "PATIENT_FRIENDLY" | "BULLETED_CHECKLIST" | "CLINICAL_SOAP" | "REFERRAL_NOTE";

export default function ClinicalNotesPage({ params }: { params: { patientId: string } }) {
  const router = useRouter();
  const appointmentId = params.patientId;

  const [appointment, setAppointment] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"notes" | "rx" | "details" | "history">("notes");
  
  // Structured Consultation State
  const [notes, setNotes] = useState(
    "Subjective: Patient presents with reported symptoms.\nObjective: Vitals stable. Physical exam normal.\nAssessment: Acute viral upper respiratory infection.\nPlan: Rest, hydration, symptomatic relief as prescribed."
  );
  const [diagnosis, setDiagnosis] = useState("Acute upper viral respiratory infection");
  const [symptoms, setSymptoms] = useState("");
  const [treatment, setTreatment] = useState("Symptomatic medical management, steam inhalation, and oral hydration");
  const [recommendations, setRecommendations] = useState("Rest for 3 days, drink plenty of warm fluids, avoid cold beverages");
  const [followUp, setFollowUp] = useState("Follow-up in 5 days if fever or cough persists");
  
  // Structured Prescriptions
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([
    { drug: "Amoxicillin", dosage: "500mg", timesPerDay: 3, durationDays: 5 },
    { drug: "Paracetamol", dosage: "650mg", timesPerDay: 2, durationDays: 3 },
  ]);

  // LLM Mode Configuration
  const [selectedLLMMode, setSelectedLLMMode] = useState<LLMMode>("PATIENT_FRIENDLY");
  const [previewSummary, setPreviewSummary] = useState<string | null>(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitStatusText, setSubmitStatusText] = useState("Complete Consultation");
  const [completedSummary, setCompletedSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const appt = await apiFetch<any>(`/appointments/${appointmentId}`);
        setAppointment(appt);

        if (appt?.symptomForm?.rawSymptoms) {
          setSymptoms(appt.symptomForm.rawSymptoms);
        }

        // If visit note already exists, populate
        if (appt?.visitNote) {
          setNotes(appt.visitNote.clinicalNotes || notes);
          setDiagnosis(appt.visitNote.diagnosis || diagnosis);
          setSymptoms(appt.visitNote.symptoms || appt.symptomForm?.rawSymptoms || symptoms);
          setTreatment(appt.visitNote.treatment || treatment);
          setRecommendations(appt.visitNote.recommendations || recommendations);
          setFollowUp(appt.visitNote.followUpInstructions || followUp);
          if (Array.isArray(appt.visitNote.prescription) && appt.visitNote.prescription.length > 0) {
            setPrescriptions(appt.visitNote.prescription);
          }
          if (appt.visitNote.llmPatientSummary) {
            setCompletedSummary(appt.visitNote.llmPatientSummary);
          }
        }

        if (appt?.patientId) {
          const hist = await apiFetch<any[]>(`/doctor/patients/${appt.patientId}/history`).catch(() => []);
          setHistory(hist || []);
        }
      } catch (err) {
        console.error("Failed to load consultation appointment:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [appointmentId]);

  function addPrescriptionRow() {
    setPrescriptions((prev) => [
      ...prev,
      { drug: "", dosage: "500mg", timesPerDay: 2, durationDays: 5 },
    ]);
  }

  function removePrescriptionRow(index: number) {
    setPrescriptions((prev) => prev.filter((_, i) => i !== index));
  }

  function updatePrescriptionRow(index: number, field: keyof PrescriptionItem, value: any) {
    setPrescriptions((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  async function handlePreviewAI() {
    if (!notes.trim()) {
      setError("Please enter clinical notes first.");
      return;
    }
    setGeneratingPreview(true);
    setError(null);
    try {
      const rxText = prescriptions
        .filter((p) => p.drug.trim())
        .map((p) => `${p.drug} ${p.dosage} ${p.timesPerDay}x/day for ${p.durationDays}d`)
        .join("; ");

      const res = await apiFetch<{ summary: string }>("/doctor/generate-summary", {
        method: "POST",
        body: JSON.stringify({
          clinicalNotes: notes,
          prescriptionSummary: rxText,
          mode: selectedLLMMode,
        }),
      });
      setPreviewSummary(res.summary);
    } catch (err: any) {
      setError(err.message || "Failed to generate AI summary preview");
    } finally {
      setGeneratingPreview(false);
    }
  }

  async function handleCompleteVisit() {
    if (!notes.trim()) {
      setError("Please enter clinical SOAP notes before completing the visit.");
      return;
    }

    setSubmitting(true);
    setSubmitStatusText("Saving consultation...");
    setError(null);

    try {
      const validPrescriptions = prescriptions.filter((p) => p.drug.trim().length > 0);
      
      setSubmitStatusText("Consultation completed. Sending summary...");
      const res = await apiFetch<any>(`/doctor/appointments/${appointmentId}/visit-notes`, {
        method: "POST",
        body: JSON.stringify({
          clinicalNotes: notes,
          diagnosis,
          symptoms,
          treatment,
          recommendations,
          followUpInstructions: followUp,
          prescription: validPrescriptions,
          mode: selectedLLMMode,
        }),
      });

      const finalSummary = res.llmPatientSummary || res.clinicalNotes || "Visit completed and patient-friendly care plan generated.";
      setCompletedSummary(finalSummary);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err: any) {
      setError(err.message || "Failed to complete visit. Please try again.");
    } finally {
      setSubmitting(false);
      setSubmitStatusText("Complete Consultation");
    }
  }

  const patientName = appointment?.patient?.user?.name || "Patient Consultation";
  const symptomForm = appointment?.symptomForm;
  const urgency = symptomForm?.llmUrgency || "LOW";
  const chiefComplaint = symptomForm?.llmChiefComplaint || symptomForm?.rawSymptoms || symptoms || "Routine consultation";
  const questions: string[] = Array.isArray(symptomForm?.llmQuestions)
    ? symptomForm.llmQuestions
    : [
        "When did these symptoms first begin?",
        "Have you taken any over-the-counter medications?",
        "Do you have any existing drug allergies or chronic conditions?",
      ];

  const getUrgencyColor = (u: string) => {
    if (u === "HIGH") return "bg-red-100 text-red-800 border-red-200";
    if (u === "MEDIUM") return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <Link href="/doctor" className="text-primary hover:underline font-label-sm flex items-center gap-1 mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to Patient Queue
          </Link>
          <h1 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-3">
            Consultation: {patientName}
            <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded font-caption-xs text-xs uppercase tracking-wider font-semibold">
              Live Consultation
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" className="bg-surface-card">
            <Video className="w-4 h-4 mr-2 text-primary" />
            Video Call Active
          </Button>
          <Button onClick={handleCompleteVisit} disabled={submitting}>
            <Sparkles className={`w-4 h-4 mr-2 ${submitting ? "animate-spin" : ""}`} />
            {submitting ? submitStatusText : "Complete Consultation"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Completed Visit Modal / Notification */}
      {completedSummary && (
        <Card className="p-6 border-emerald-300 bg-emerald-50/50 shadow-md">
          <div className="flex items-center gap-2 mb-3 text-emerald-800 font-semibold text-base">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            Consultation Completed Successfully & Summary Dispatched!
          </div>
          <p className="text-xs text-emerald-700 mb-4">
            The consultation summary and care plan have been securely stored in Supabase, and the patient has been notified.
          </p>
          <div className="bg-white p-4 rounded-lg border border-emerald-200 text-xs text-on-surface whitespace-pre-line leading-relaxed mb-4">
            {completedSummary}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/doctor">
              <Button size="sm">Return to Doctor Dashboard</Button>
            </Link>
            <Link href="/doctor/records">
              <Button size="sm" variant="secondary">View in Records Archive</Button>
            </Link>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Patient Profile & AI Pre-Visit Summary Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="p-6 border-outline-variant shadow-sm">
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-outline-variant">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-surface-variant shrink-0 border-2 border-primary/20">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${appointment?.patientId || "pat"}`} alt="Patient" className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 className="font-title-md text-base font-semibold text-on-surface">{patientName}</h2>
                <p className="font-caption-xs text-xs text-on-surface-variant">{appointment?.patient?.user?.email || "patient@example.com"}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-label-sm text-xs font-semibold text-primary flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-ai-accent" />
                    AI Symptom Urgency
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getUrgencyColor(urgency)}`}>
                    {urgency} Urgency
                  </span>
                </div>
                <p className="font-body-md text-xs text-on-surface bg-surface-container-low p-3 rounded-lg border border-outline-variant">
                  <strong>Chief Complaint:</strong> {chiefComplaint}
                </p>
              </div>

              <div>
                <span className="font-label-sm text-xs font-semibold text-on-surface flex items-center gap-1 mb-2">
                  <HelpCircle className="w-3.5 h-3.5 text-primary" />
                  Suggested Clinical Inquiries
                </span>
                <ul className="space-y-1.5 text-xs text-on-surface-variant">
                  {questions.map((q, idx) => (
                    <li key={idx} className="bg-primary/5 p-2 rounded border border-primary/10 flex items-start gap-1.5">
                      <span className="text-primary font-bold">{idx + 1}.</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <Card className="p-5 border-outline-variant bg-surface-card shadow-sm space-y-3">
            <h3 className="font-semibold text-xs text-on-surface flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-primary" />
              AI Summary Generation Mode
            </h3>
            <select
              value={selectedLLMMode}
              onChange={(e) => setSelectedLLMMode(e.target.value as LLMMode)}
              className="w-full h-9 px-2.5 text-xs rounded border border-outline-variant bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="PATIENT_FRIENDLY">Patient-Friendly Care Plan</option>
              <option value="BULLETED_CHECKLIST">Action Checklist (Numbered)</option>
              <option value="CLINICAL_SOAP">Clinical SOAP Summary (Physician)</option>
              <option value="REFERRAL_NOTE">Specialist Referral Note</option>
            </select>
            <Button
              size="sm"
              variant="secondary"
              className="w-full text-xs"
              onClick={handlePreviewAI}
              disabled={generatingPreview}
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              {generatingPreview ? "Generating Preview..." : "Preview AI Output"}
            </Button>
          </Card>
        </div>

        {/* Main Work Area */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <Card className="flex-grow flex flex-col overflow-hidden border-outline-variant shadow-sm">
            <div className="flex border-b border-outline-variant bg-surface-bright overflow-x-auto">
              <button 
                onClick={() => setActiveTab("notes")}
                className={`flex-1 py-3.5 px-3 font-label-sm text-xs font-semibold transition-colors border-b-2 flex justify-center items-center gap-1.5 whitespace-nowrap ${activeTab === 'notes' ? 'border-primary text-primary bg-surface-card' : 'border-transparent text-on-surface-variant hover:bg-surface-container'}`}
              >
                <FileText className="w-4 h-4" /> Clinical SOAP Notes
              </button>
              <button 
                onClick={() => setActiveTab("details")}
                className={`flex-1 py-3.5 px-3 font-label-sm text-xs font-semibold transition-colors border-b-2 flex justify-center items-center gap-1.5 whitespace-nowrap ${activeTab === 'details' ? 'border-primary text-primary bg-surface-card' : 'border-transparent text-on-surface-variant hover:bg-surface-container'}`}
              >
                <ClipboardList className="w-4 h-4" /> Diagnosis & Care Details
              </button>
              <button 
                onClick={() => setActiveTab("rx")}
                className={`flex-1 py-3.5 px-3 font-label-sm text-xs font-semibold transition-colors border-b-2 flex justify-center items-center gap-1.5 whitespace-nowrap ${activeTab === 'rx' ? 'border-primary text-primary bg-surface-card' : 'border-transparent text-on-surface-variant hover:bg-surface-container'}`}
              >
                <Pill className="w-4 h-4" /> E-Prescription ({prescriptions.length})
              </button>
              <button 
                onClick={() => setActiveTab("history")}
                className={`flex-1 py-3.5 px-3 font-label-sm text-xs font-semibold transition-colors border-b-2 flex justify-center items-center gap-1.5 whitespace-nowrap ${activeTab === 'history' ? 'border-primary text-primary bg-surface-card' : 'border-transparent text-on-surface-variant hover:bg-surface-container'}`}
              >
                <Activity className="w-4 h-4" /> History ({history.length})
              </button>
            </div>

            <div className="p-6 flex-grow flex flex-col bg-surface-card">
              {activeTab === "notes" && (
                <div className="flex flex-col h-full gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-title-md text-sm font-semibold text-on-surface">Clinical Notes (SOAP Format)</h3>
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="flex-grow min-h-[220px] w-full rounded-lg border border-outline-variant bg-surface-card p-4 font-body-md text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary resize-none leading-relaxed"
                    placeholder="Subjective: ...&#10;Objective: ...&#10;Assessment: ...&#10;Plan: ..."
                  />
                </div>
              )}

              {activeTab === "details" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1">Diagnosis</label>
                    <input
                      type="text"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="e.g. Acute upper respiratory infection"
                      className="w-full h-9 px-3 text-xs rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1">Symptoms / Chief Complaint</label>
                    <input
                      type="text"
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      placeholder="e.g. Cough, high fever, sore throat for 3 days"
                      className="w-full h-9 px-3 text-xs rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1">Treatment / Advice</label>
                    <textarea
                      rows={2}
                      value={treatment}
                      onChange={(e) => setTreatment(e.target.value)}
                      placeholder="e.g. Oral hydration, steam inhalation, antibiotic course"
                      className="w-full p-2.5 text-xs rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-on-surface mb-1">Recommendations</label>
                      <input
                        type="text"
                        value={recommendations}
                        onChange={(e) => setRecommendations(e.target.value)}
                        placeholder="e.g. Rest, avoid cold air"
                        className="w-full h-9 px-3 text-xs rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-on-surface mb-1">Follow-up Instructions</label>
                      <input
                        type="text"
                        value={followUp}
                        onChange={(e) => setFollowUp(e.target.value)}
                        placeholder="e.g. Review in 5 days if fever persists"
                        className="w-full h-9 px-3 text-xs rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "rx" && (
                <div className="flex flex-col h-full gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-title-md text-sm font-semibold text-on-surface">Prescription & Medication Reminders</h3>
                    <Button size="sm" variant="secondary" onClick={addPrescriptionRow}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Medication
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {prescriptions.map((rx, index) => (
                      <div key={index} className="p-4 rounded-lg border border-outline-variant bg-surface-container-low grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                        <div className="sm:col-span-4">
                          <label className="block text-[11px] font-medium text-on-surface mb-1">Medication Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Amoxicillin"
                            value={rx.drug}
                            onChange={(e) => updatePrescriptionRow(index, "drug", e.target.value)}
                            className="w-full h-9 px-2.5 text-xs rounded border border-outline-variant bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-medium text-on-surface mb-1">Dosage</label>
                          <input
                            type="text"
                            placeholder="e.g. 500mg"
                            value={rx.dosage}
                            onChange={(e) => updatePrescriptionRow(index, "dosage", e.target.value)}
                            className="w-full h-9 px-2.5 text-xs rounded border border-outline-variant bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-medium text-on-surface mb-1">Times/Day</label>
                          <input
                            type="number"
                            min={1}
                            max={6}
                            value={rx.timesPerDay}
                            onChange={(e) => updatePrescriptionRow(index, "timesPerDay", parseInt(e.target.value) || 1)}
                            className="w-full h-9 px-2.5 text-xs rounded border border-outline-variant bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-medium text-on-surface mb-1">Duration (Days)</label>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={rx.durationDays}
                            onChange={(e) => updatePrescriptionRow(index, "durationDays", parseInt(e.target.value) || 1)}
                            className="w-full h-9 px-2.5 text-xs rounded border border-outline-variant bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div className="sm:col-span-1 flex justify-center pb-1">
                          <button
                            type="button"
                            onClick={() => removePrescriptionRow(index)}
                            className="text-status-error hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "history" && (
                <div className="flex flex-col h-full space-y-4">
                  <h3 className="font-title-md text-sm font-semibold text-on-surface">Past Consultations & Notes</h3>
                  {history.length === 0 ? (
                    <p className="text-xs text-on-surface-variant italic">No previous consultation records on file.</p>
                  ) : (
                    history.map((hist) => (
                      <div key={hist.id} className="p-4 rounded-lg border border-outline-variant bg-surface-container-low text-xs space-y-2">
                        <div className="flex justify-between font-semibold">
                          <span>{hist.doctor?.user?.name || "Doctor"} — {new Date(hist.slotStart).toLocaleDateString()}</span>
                          <span className="text-emerald-700">Completed</span>
                        </div>
                        <p>{hist.visitNote?.clinicalNotes || "No notes recorded."}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Live AI Preview Box */}
          {previewSummary && (
            <Card className="p-5 border-purple-200 bg-purple-50/50 shadow-sm animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-purple-200 mb-2">
                <span className="font-semibold text-xs text-purple-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-ai-accent" />
                  AI Summary Live Preview ({selectedLLMMode})
                </span>
                <button
                  onClick={() => setPreviewSummary(null)}
                  className="text-xs text-purple-700 hover:text-purple-900"
                >
                  Dismiss Preview
                </button>
              </div>
              <div className="text-xs text-on-surface whitespace-pre-line leading-relaxed">
                {previewSummary}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
