"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
  FileText, 
  Sparkles, 
  ArrowLeft, 
  Calendar, 
  User, 
  Pill, 
  CheckCircle2, 
  RefreshCw,
  Sliders,
  Send,
  Copy,
  Check
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type LLMMode = "PATIENT_FRIENDLY" | "BULLETED_CHECKLIST" | "CLINICAL_SOAP" | "REFERRAL_NOTE";

export default function DoctorRecordsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Interactive AI Summarizer Playground state
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [customNotes, setCustomNotes] = useState(
    "Patient presents with fever, persistent dry cough for 3 days, mild headache in evenings. Vitals: BP 120/80, Temp 101F. Assessment: Acute upper viral respiratory infection. Prescribed Amoxicillin 500mg TDS for 5 days and Paracetamol 650mg SOS."
  );
  const [customRx, setCustomRx] = useState("Amoxicillin 500mg 3x/day for 5 days; Paracetamol 650mg as needed");
  const [selectedMode, setSelectedMode] = useState<LLMMode>("PATIENT_FRIENDLY");
  const [generating, setGenerating] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function loadRecords() {
    try {
      const data = await apiFetch<any[]>("/doctor/records");
      setRecords(data || []);
      if (data && data.length > 0) {
        setSelectedRecord(data[0]);
        setCustomNotes(data[0].visitNote?.clinicalNotes || customNotes);
        const rxText = Array.isArray(data[0].visitNote?.prescription)
          ? data[0].visitNote.prescription.map((p: any) => `${p.drug} ${p.dosage} ${p.timesPerDay}x/day`).join("; ")
          : "";
        setCustomRx(rxText || customRx);
        setGeneratedOutput(data[0].visitNote?.llmPatientSummary || null);
      }
    } catch (err) {
      console.error("Failed to load records:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
  }, []);

  async function handleGenerateSummary() {
    if (!customNotes.trim()) return;
    setGenerating(true);
    try {
      const res = await apiFetch<{ summary: string }>("/doctor/generate-summary", {
        method: "POST",
        body: JSON.stringify({
          clinicalNotes: customNotes,
          prescriptionSummary: customRx,
          mode: selectedMode,
        }),
      });
      setGeneratedOutput(res.summary);
    } catch (err: any) {
      alert(err.message || "Failed to generate AI summary");
    } finally {
      setGenerating(false);
    }
  }

  function handleSelectRecord(r: any) {
    setSelectedRecord(r);
    setCustomNotes(r.visitNote?.clinicalNotes || "");
    const rxText = Array.isArray(r.visitNote?.prescription)
      ? r.visitNote.prescription.map((p: any) => `${p.drug} ${p.dosage} ${p.timesPerDay}x/day for ${p.durationDays}d`).join("; ")
      : "";
    setCustomRx(rxText);
    setGeneratedOutput(r.visitNote?.llmPatientSummary || null);
  }

  function copyToClipboard() {
    if (!generatedOutput) return;
    navigator.clipboard.writeText(generatedOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const modes: { id: LLMMode; label: string; desc: string }[] = [
    {
      id: "PATIENT_FRIENDLY",
      label: "Patient-Friendly Care Plan",
      desc: "Warm, empathetic tone with simple medication instructions and lifestyle advice.",
    },
    {
      id: "BULLETED_CHECKLIST",
      label: "Action Checklist",
      desc: "Numbered step-by-step checklist with recovery milestones and review dates.",
    },
    {
      id: "CLINICAL_SOAP",
      label: "Clinical SOAP Summary",
      desc: "Concise medical documentation formatted for physician and EHR handover.",
    },
    {
      id: "REFERRAL_NOTE",
      label: "Specialist Referral Note",
      desc: "Formal clinical letter summarizing diagnosis for secondary care referral.",
    },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div>
        <Link href="/doctor" className="text-primary hover:underline font-label-sm flex items-center gap-1 mb-2">
          <ArrowLeft className="w-4 h-4" /> Back to Doctor Dashboard
        </Link>
        <h1 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-2.5">
          <FileText className="w-7 h-7 text-primary" />
          Clinical Records & AI Consultation Summarizer
        </h1>
        <p className="font-body-md text-sm text-on-surface-variant mt-1">
          Review past consultations and generate multi-mode AI summaries for patients or clinical handoffs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Records Archive List */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-title-md text-base font-semibold text-on-surface">Completed Visits Archive</h2>
            <span className="text-xs text-primary font-bold bg-primary/10 px-2.5 py-0.5 rounded-full">
              {records.length} Records
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-on-surface-variant animate-pulse">
              Loading clinical records...
            </div>
          ) : records.length === 0 ? (
            <Card className="p-8 text-center bg-surface-container-low border-dashed border-outline-variant">
              <FileText className="w-10 h-10 text-primary/40 mx-auto mb-2" />
              <p className="text-xs text-on-surface-variant">No completed visit notes recorded yet.</p>
            </Card>
          ) : (
            <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
              {records.map((r) => {
                const isSelected = selectedRecord?.id === r.id;
                const patientName = r.patient?.user?.name || "Patient";
                const date = new Date(r.slotStart);

                return (
                  <Card
                    key={r.id}
                    onClick={() => handleSelectRecord(r)}
                    className={`p-4 cursor-pointer transition-all border ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary"
                        : "border-outline-variant hover:border-primary/40 bg-surface-card"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-outline-variant mb-2">
                      <h4 className="font-semibold text-sm text-on-surface flex items-center gap-1.5">
                        <User className="w-4 h-4 text-primary" />
                        {patientName}
                      </h4>
                      <span className="text-[11px] text-on-surface-variant">
                        {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>

                    {r.visitNote?.clinicalNotes && (
                      <p className="text-xs text-on-surface-variant line-clamp-2 mb-2">
                        {r.visitNote.clinicalNotes}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Visit Completed
                      </span>
                      {r.visitNote?.llmPatientSummary && (
                        <span className="text-ai-accent flex items-center gap-0.5 font-semibold">
                          <Sparkles className="w-3 h-3" /> AI Summary
                        </span>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Interactive Multi-Mode LLM Summarizer Studio */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <Card className="p-6 border-outline-variant shadow-sm flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-outline-variant">
              <div>
                <h3 className="font-title-md text-base font-semibold text-on-surface flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-ai-accent" />
                  AI Clinical Summarizer Studio
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Generate, switch modes, and customize clinical summaries in real-time.
                </p>
              </div>
            </div>

            {/* Mode Switcher */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-2 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-primary" /> Select LLM Generation Mode:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {modes.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMode(m.id)}
                    className={`p-3 rounded-lg text-left text-xs transition-all border ${
                      selectedMode === m.id
                        ? "border-primary bg-primary/10 text-on-surface font-semibold ring-1 ring-primary"
                        : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                    }`}
                  >
                    <div className="font-bold text-primary mb-0.5">{m.label}</div>
                    <div className="text-[11px] font-normal leading-tight opacity-80">{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Input Notes */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-on-surface mb-1">
                  Doctor Clinical SOAP Notes
                </label>
                <textarea
                  rows={4}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Enter diagnosis, examination findings, and clinical plan..."
                  className="w-full text-xs p-3 rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface mb-1">
                  Prescription Details (Optional)
                </label>
                <input
                  type="text"
                  value={customRx}
                  onChange={(e) => setCustomRx(e.target.value)}
                  placeholder="e.g. Amoxicillin 500mg 3x/day for 5 days"
                  className="w-full h-9 px-3 text-xs rounded-lg border border-outline-variant bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Action Trigger */}
            <div className="flex justify-end">
              <Button onClick={handleGenerateSummary} disabled={generating || !customNotes.trim()}>
                <Sparkles className={`w-4 h-4 mr-1.5 ${generating ? "animate-spin" : ""}`} />
                {generating ? "Synthesizing with AI..." : "Generate AI Summary"}
              </Button>
            </div>

            {/* Output Display */}
            {generatedOutput && (
              <div className="mt-2 bg-gradient-to-br from-purple-50/70 to-indigo-50/40 p-4 rounded-xl border border-purple-200">
                <div className="flex items-center justify-between pb-2 border-b border-purple-200/60 mb-3">
                  <span className="font-semibold text-xs text-purple-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-ai-accent" />
                    Generated Care Plan ({modes.find((m) => m.id === selectedMode)?.label})
                  </span>
                  <button
                    onClick={copyToClipboard}
                    className="text-xs text-purple-700 hover:text-purple-900 flex items-center gap-1 bg-white px-2.5 py-1 rounded border border-purple-200 shadow-2xs transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied!" : "Copy Summary"}
                  </button>
                </div>
                <div className="text-xs text-on-surface whitespace-pre-line leading-relaxed">
                  {generatedOutput}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
