"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { 
  Users, 
  Search, 
  Calendar, 
  Clock, 
  FileText, 
  ArrowLeft, 
  Phone, 
  Mail, 
  User, 
  CheckCircle2, 
  History,
  X,
  Sparkles
} from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function DoctorPatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatientHistory, setSelectedPatientHistory] = useState<any | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  async function loadPatients() {
    try {
      const data = await apiFetch<any[]>("/doctor/patients");
      setPatients(data || []);
    } catch (err) {
      console.error("Failed to load doctor patients:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPatients();
  }, []);

  async function openPatientHistory(patient: any) {
    setSelectedPatientHistory(patient);
    setLoadingHistory(true);
    try {
      const hist = await apiFetch<any[]>(`/doctor/patients/${patient.patientId}/history`);
      setHistoryData(hist || []);
    } catch (err) {
      console.error("Failed to load patient history:", err);
      setHistoryData([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  const filteredPatients = patients.filter((p) => {
    const name = p.user?.name?.toLowerCase() || "";
    const email = p.user?.email?.toLowerCase() || "";
    const phone = p.user?.phone?.toLowerCase() || "";
    const term = searchTerm.toLowerCase();
    return name.includes(term) || email.includes(term) || phone.includes(term);
  });

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/doctor" className="text-primary hover:underline font-label-sm flex items-center gap-1 mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to Doctor Dashboard
          </Link>
          <h1 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-2.5">
            <Users className="w-7 h-7 text-primary" />
            Patient Directory & Clinical History
          </h1>
          <p className="font-body-md text-sm text-on-surface-variant mt-1">
            Access patient profiles, past diagnostic summaries, and longitudinal treatment records.
          </p>
        </div>
      </div>

      {/* Search & Overview Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-96">
          <Input
            id="search-patients"
            placeholder="Search by name, email, or phone..."
            icon={<Search className="w-4 h-4" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="text-xs text-on-surface-variant font-medium self-end sm:self-center">
          Showing <strong>{filteredPatients.length}</strong> of {patients.length} patient records
        </div>
      </div>

      {/* Patients Grid */}
      {loading ? (
        <div className="py-16 text-center text-on-surface-variant animate-pulse">
          Loading patient directory...
        </div>
      ) : filteredPatients.length === 0 ? (
        <Card className="p-10 text-center bg-surface-container-low border-dashed border-outline-variant">
          <Users className="w-12 h-12 text-primary/40 mx-auto mb-3" />
          <h3 className="font-title-md text-base font-semibold text-on-surface mb-1">No Patient Records Found</h3>
          <p className="font-body-md text-xs text-on-surface-variant">
            {searchTerm ? "No patient matches your search query." : "You haven't conducted consultations with any patients yet."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPatients.map((p) => {
            const name = p.user?.name || "Patient";
            const email = p.user?.email || "No email on file";
            const phone = p.user?.phone || "No phone";
            const lastVisit = new Date(p.lastVisit);

            return (
              <Card key={p.patientId} className="p-5 border-outline-variant shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3.5 pb-4 border-b border-outline-variant mb-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-variant shrink-0 border-2 border-primary/20">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.patientId}`} alt={name} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-title-md text-base font-semibold text-on-surface truncate">{name}</h3>
                      <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded font-semibold">
                        {p.totalVisits} {p.totalVisits === 1 ? "Visit" : "Visits"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-on-surface-variant mb-4">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>Last Visit: {lastVisit.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full text-xs"
                  onClick={() => openPatientHistory(p)}
                >
                  <History className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  View Past Consultations ({p.totalVisits})
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Patient History Modal */}
      {selectedPatientHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col">
            <Card className="shadow-2xl border-outline-variant flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="p-5 border-b border-outline-variant bg-surface-bright flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-variant shrink-0 border border-primary/20">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedPatientHistory.patientId}`} alt="Patient" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-title-md text-base font-semibold text-on-surface">
                      {selectedPatientHistory.user?.name} — Clinical History
                    </h3>
                    <p className="text-xs text-on-surface-variant">{selectedPatientHistory.user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPatientHistory(null)}
                  className="p-1.5 text-on-surface-variant hover:bg-surface-container rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-4 max-h-[60vh]">
                {loadingHistory ? (
                  <div className="py-12 text-center text-xs text-on-surface-variant animate-pulse">
                    Retrieving electronic health records...
                  </div>
                ) : historyData.length === 0 ? (
                  <div className="text-center py-8 text-xs text-on-surface-variant">
                    No completed consultation records found for this patient.
                  </div>
                ) : (
                  historyData.map((item) => {
                    const date = new Date(item.slotStart);
                    return (
                      <div key={item.id} className="p-4 rounded-xl border border-outline-variant bg-surface-container-low space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
                          <span className="font-semibold text-xs text-on-surface flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            {date.toLocaleDateString(undefined, { dateStyle: "long" })} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Completed
                          </span>
                        </div>

                        {item.symptomForm?.rawSymptoms && (
                          <p className="text-xs text-on-surface-variant">
                            <strong>Chief Complaint:</strong> {item.symptomForm.rawSymptoms}
                          </p>
                        )}

                        {item.visitNote?.clinicalNotes && (
                          <div className="bg-white p-3 rounded-lg border border-outline-variant text-xs text-on-surface whitespace-pre-line leading-relaxed">
                            <strong className="block mb-1 text-primary">Doctor SOAP Notes:</strong>
                            {item.visitNote.clinicalNotes}
                          </div>
                        )}

                        {item.visitNote?.llmPatientSummary && (
                          <div className="bg-purple-50/50 p-3 rounded-lg border border-purple-200 text-xs text-on-surface space-y-1">
                            <span className="font-semibold text-purple-800 flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-ai-accent" />
                              AI Generated Care Plan:
                            </span>
                            <div className="whitespace-pre-line text-on-surface text-[11px] leading-relaxed">
                              {item.visitNote.llmPatientSummary}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-outline-variant bg-surface-bright flex justify-end">
                <Button size="sm" onClick={() => setSelectedPatientHistory(null)}>
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
