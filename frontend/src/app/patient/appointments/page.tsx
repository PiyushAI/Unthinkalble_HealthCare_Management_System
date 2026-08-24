"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft, 
  RefreshCw,
  AlertCircle,
  X
} from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function PatientAppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Reschedule Dialog State
  const [reschedulingAppt, setReschedulingAppt] = useState<any | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedNewSlot, setSelectedNewSlot] = useState<string | null>(null);
  const [reschedulingSubmitting, setReschedulingSubmitting] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [rescheduleSuccess, setRescheduleSuccess] = useState<string | null>(null);

  async function loadAppointments() {
    try {
      const data = await apiFetch<any[]>("/appointments/me");
      setAppointments(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  // Fetch slots when reschedule doctor or date changes
  useEffect(() => {
    async function loadDoctorSlots() {
      if (!reschedulingAppt || !rescheduleDate) return;
      setLoadingSlots(true);
      setSelectedNewSlot(null);
      setRescheduleError(null);
      try {
        const res = await apiFetch<{ slots: string[] }>(
          `/doctors/${reschedulingAppt.doctorId}/slots?date=${rescheduleDate}`
        );
        setAvailableSlots(res.slots || []);
      } catch (err) {
        console.error("Failed to load reschedule slots:", err);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }
    loadDoctorSlots();
  }, [reschedulingAppt, rescheduleDate]);

  async function handleCancel(id: string) {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      await apiFetch(`/appointments/${id}/cancel`, { method: "POST" });
      await loadAppointments();
    } catch (err: any) {
      alert(err.message || "Failed to cancel");
    }
  }

  async function handleConfirmReschedule(e: React.FormEvent) {
    e.preventDefault();
    if (!reschedulingAppt || !selectedNewSlot) return;

    setReschedulingSubmitting(true);
    setRescheduleError(null);

    try {
      await apiFetch(`/appointments/${reschedulingAppt.id}/reschedule`, {
        method: "POST",
        body: JSON.stringify({
          newSlotStart: selectedNewSlot,
        }),
      });

      setRescheduleSuccess("Appointment successfully rescheduled! Notifications and calendar synced.");
      await loadAppointments();
      setTimeout(() => {
        setReschedulingAppt(null);
        setRescheduleSuccess(null);
      }, 2000);
    } catch (err: any) {
      setRescheduleError(err.message || "Failed to reschedule appointment. Please select another slot.");
    } finally {
      setReschedulingSubmitting(false);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Confirmed</span>;
      case "COMPLETED":
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-0.5 rounded-full font-medium">Completed</span>;
      case "RESCHEDULED":
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> Reschedule Required (Doctor Leave)</span>;
      case "CANCELLED":
        return <span className="bg-red-50 text-red-700 border border-red-200 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Cancelled</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-medium">{status}</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-12">
      <div>
        <Link href="/patient" className="text-primary hover:underline font-label-sm flex items-center gap-1 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">My Appointments History</h1>
        <p className="font-body-md text-on-surface-variant mt-1">
          Review, reschedule, or cancel your upcoming and past clinic consultations.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-on-surface-variant animate-pulse">
          Loading appointments...
        </div>
      ) : appointments.length === 0 ? (
        <Card className="p-8 text-center bg-surface-container-low border-dashed border-outline-variant">
          <Calendar className="w-12 h-12 text-primary/40 mx-auto mb-3" />
          <h3 className="font-title-md text-base font-semibold text-on-surface mb-1">No Appointments Found</h3>
          <p className="font-body-md text-xs text-on-surface-variant mb-4">You haven't booked any consultations yet.</p>
          <Link href="/patient/find-doctor">
            <Button size="sm">Find a Doctor</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => {
            const date = new Date(appt.slotStart);
            const doctorName = appt.doctor?.user?.name || "Dr. Specialist";
            const doctorSpec = appt.doctor?.specialization || "General Practice";
            const canReschedule = appt.status === "CONFIRMED" || appt.status === "RESCHEDULED";

            return (
              <Card key={appt.id} className="p-6 border-outline-variant shadow-sm hover:border-primary/40 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-variant shrink-0 border border-primary/20">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${appt.doctorId}`} alt={doctorName} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="font-title-md text-base font-semibold text-on-surface">{doctorName}</h3>
                      <p className="font-caption-xs text-xs text-primary font-medium">{doctorSpec}</p>
                    </div>
                  </div>
                  <div>{getStatusBadge(appt.status)}</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-on-surface-variant">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span><strong>Date:</strong> {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span><strong>Time:</strong> {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {appt.symptomForm?.rawSymptoms && (
                  <div className="mt-3 bg-surface-container-low p-3 rounded-lg border border-outline-variant text-xs text-on-surface">
                    <strong>Reported Symptoms:</strong> {appt.symptomForm.rawSymptoms}
                  </div>
                )}

                {canReschedule && (
                  <div className="mt-4 pt-3 border-t border-outline-variant flex justify-end gap-3 items-center">
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => {
                        setReschedulingAppt(appt);
                        setRescheduleError(null);
                        setRescheduleSuccess(null);
                      }}
                      className="text-xs gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-primary" />
                      Reschedule Slot
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleCancel(appt.id)}
                      className="text-status-error hover:bg-red-50 text-xs"
                    >
                      Cancel Appointment
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Reschedule Modal Dialog */}
      {reschedulingAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg">
            <Card className="shadow-2xl border-outline-variant overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between pb-3 border-b border-outline-variant mb-4">
                  <h3 className="font-title-md text-base font-semibold text-on-surface flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-primary" />
                    Reschedule Appointment
                  </h3>
                  <button
                    onClick={() => setReschedulingAppt(null)}
                    className="p-1 text-on-surface-variant hover:bg-surface-container rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4 text-xs text-on-surface-variant bg-surface-container-low p-3 rounded-lg border border-outline-variant">
                  <strong>Doctor:</strong> {reschedulingAppt.doctor?.user?.name} ({reschedulingAppt.doctor?.specialization})
                </div>

                {rescheduleSuccess && (
                  <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{rescheduleSuccess}</span>
                  </div>
                )}

                {rescheduleError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{rescheduleError}</span>
                  </div>
                )}

                {!rescheduleSuccess && (
                  <form onSubmit={handleConfirmReschedule} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-on-surface mb-1">Select New Date</label>
                      <input
                        type="date"
                        min={new Date().toISOString().split("T")[0]}
                        value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        className="w-full h-10 px-3 text-xs border border-outline-variant rounded-lg bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-on-surface mb-2">Select New Time Slot</label>
                      {loadingSlots ? (
                        <div className="py-4 text-center text-xs text-on-surface-variant animate-pulse">
                          Checking available slots...
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <div className="p-3 text-center text-xs bg-surface-container-low border border-dashed rounded-lg text-on-surface-variant">
                          No available slots for this doctor on selected date.
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
                          {availableSlots.map((slotIso) => {
                            const timeStr = new Date(slotIso).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            });
                            const isSelected = selectedNewSlot === slotIso;

                            return (
                              <button
                                key={slotIso}
                                type="button"
                                onClick={() => setSelectedNewSlot(slotIso)}
                                className={`py-2 px-2.5 rounded-lg text-xs font-medium text-center border transition-all ${
                                  isSelected
                                    ? "bg-primary text-white border-primary shadow-sm"
                                    : "bg-surface-card text-on-surface border-outline-variant hover:border-primary/50"
                                }`}
                              >
                                {timeStr}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-outline-variant flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setReschedulingAppt(null)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        size="sm" 
                        disabled={!selectedNewSlot || reschedulingSubmitting}
                      >
                        {reschedulingSubmitting ? "Rescheduling..." : "Confirm Reschedule"}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
