"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
  Plus, 
  RefreshCcw, 
  CheckCircle, 
  Video, 
  Link as LinkIcon, 
  Clock, 
  Calendar as CalendarIcon, 
  AlertCircle,
  Pill,
  Sparkles
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function PatientDashboard() {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAppointments() {
    try {
      const data = await apiFetch<any[]>("/appointments/me");
      setAppointments(data || []);
    } catch (err) {
      console.error("Failed to fetch patient appointments:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  async function handleCancel(appointmentId: string) {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      await apiFetch(`/appointments/${appointmentId}/cancel`, { method: "POST" });
      await loadAppointments();
    } catch (err: any) {
      alert(err.message || "Failed to cancel appointment");
    }
  }

  const upcomingAppts = appointments.filter((a) => a.status === "CONFIRMED");
  const completedAppts = appointments.filter((a) => a.status === "COMPLETED");

  return (
    <div className="grid grid-cols-4 md:grid-cols-12 gap-gutter pb-12">
      {/* Page Title & Header Actions */}
      <div className="col-span-4 md:col-span-12 flex flex-col sm:flex-row sm:items-center justify-between mb-2">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">
            Welcome back, {profile?.name || "Patient"}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Manage your upcoming visits, consult specialists, and track medications.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-3">
          <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-full border border-outline-variant">
            <RefreshCcw className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-caption-xs text-caption-xs text-on-surface-variant">Google Calendar Active</span>
          </div>
          <Link href="/patient/find-doctor">
            <Button>
              <Plus className="w-4 h-4 mr-1.5" />
              Book Appointment
            </Button>
          </Link>
        </div>
      </div>

      {/* Left Column: Upcoming Appointments */}
      <div className="col-span-4 md:col-span-8 flex flex-col gap-6">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-title-md text-title-md text-on-surface">Upcoming Consultations</h2>
            <span className="bg-primary-container/10 text-primary font-caption-xs text-caption-xs px-2.5 py-0.5 rounded-full font-semibold">
              {upcomingAppts.length} Scheduled
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-on-surface-variant animate-pulse">
              Loading your appointments...
            </div>
          ) : upcomingAppts.length === 0 ? (
            <Card className="p-8 text-center bg-surface-container-low border-dashed border-outline-variant">
              <CalendarIcon className="w-10 h-10 text-primary/40 mx-auto mb-3" />
              <h3 className="font-title-md text-sm font-semibold text-on-surface mb-1">No Upcoming Appointments</h3>
              <p className="font-body-md text-xs text-on-surface-variant mb-4">
                Need to see a specialist or get a prescription renewal?
              </p>
              <Link href="/patient/find-doctor">
                <Button size="sm">Find a Doctor</Button>
              </Link>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {upcomingAppts.map((appt) => {
                const date = new Date(appt.slotStart);
                const doctorName = appt.doctor?.user?.name || "Dr. Specialist";
                const doctorSpec = appt.doctor?.specialization || "General Medicine";

                return (
                  <Card key={appt.id} className="p-5 relative group border-outline-variant shadow-sm hover:border-primary/40 transition-colors">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-status-success rounded-l"></div>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex gap-4">
                        {/* Date/Time Block */}
                        <div className="bg-surface-container-low rounded-lg p-3 flex flex-col items-center justify-center min-w-[76px] text-center border border-outline-variant">
                          <span className="font-caption-xs text-[10px] text-status-success font-bold uppercase tracking-wider mb-1">
                            {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="font-title-md text-base font-bold text-on-surface leading-none">
                            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="flex flex-col justify-center">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-status-success/10 text-status-success font-caption-xs text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Confirmed
                            </span>
                            <span className="bg-surface-container text-on-surface-variant font-caption-xs text-xs px-2 py-0.5 rounded flex items-center gap-1">
                              <Video className="w-3 h-3 text-primary" /> Video Consult
                            </span>
                          </div>
                          <h3 className="font-body-lg text-base font-semibold text-on-surface">{doctorName}</h3>
                          <p className="font-body-md text-xs text-primary font-medium">{doctorSpec}</p>
                          {appt.symptomForm?.rawSymptoms && (
                            <p className="font-caption-xs text-xs text-on-surface-variant mt-1.5 line-clamp-1">
                              <strong>Symptoms:</strong> {appt.symptomForm.rawSymptoms}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleCancel(appt.id)}
                          className="text-status-error hover:bg-red-50 hover:text-status-error text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Completed Visits & AI Summaries */}
        {completedAppts.length > 0 && (
          <section className="mt-4">
            <h2 className="font-title-md text-title-md text-on-surface mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-ai-accent" />
              Past Consultations & AI Care Summaries
            </h2>
            <div className="space-y-4">
              {completedAppts.map((appt) => (
                <Card key={appt.id} className="p-5 border-outline-variant bg-surface-card shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-outline-variant mb-3">
                    <div>
                      <h4 className="font-title-md text-sm font-semibold text-on-surface">
                        {appt.doctor?.user?.name || "Dr. Specialist"} — {appt.doctor?.specialization}
                      </h4>
                      <p className="font-caption-xs text-xs text-on-surface-variant">
                        {new Date(appt.slotStart).toLocaleDateString(undefined, { dateStyle: "long" })}
                      </p>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-0.5 rounded-full font-medium">
                      Completed
                    </span>
                  </div>

                  {appt.visitNote?.llmPatientSummary ? (
                    <div className="bg-purple-50/40 border border-purple-100 rounded-lg p-4 text-xs text-on-surface space-y-2 whitespace-pre-line">
                      {appt.visitNote.llmPatientSummary}
                    </div>
                  ) : (
                    <p className="text-xs text-on-surface-variant italic">
                      {appt.visitNote?.clinicalNotes || "Consultation completed."}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Right Column: Quick Care Hub */}
      <div className="col-span-4 md:col-span-4 flex flex-col gap-6">
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-indigo-50/30 border-primary/20">
          <h3 className="font-title-md text-title-md text-on-surface mb-2 flex items-center gap-2">
            <Pill className="w-5 h-5 text-primary" />
            Medication Reminders
          </h3>
          <p className="font-body-md text-xs text-on-surface-variant mb-4">
            Automated alerts are dispatched to your email based on your prescribed dosages.
          </p>
          <Link href="/patient/schedules">
            <Button variant="secondary" fullWidth size="sm">
              View Medication Schedule
            </Button>
          </Link>
        </Card>

        <Card className="p-6 border-outline-variant">
          <h3 className="font-title-md text-sm font-semibold text-on-surface mb-3">Emergency Care Notice</h3>
          <p className="font-body-md text-xs text-on-surface-variant leading-relaxed">
            If you are experiencing severe chest pain, shortness of breath, or urgent medical emergencies, please call <strong>911</strong> or visit the nearest emergency room immediately.
          </p>
        </Card>
      </div>
    </div>
  );
}
