"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
  Clock, 
  ArrowRight, 
  Sparkles, 
  User, 
  FileText, 
  CheckCircle, 
  Video, 
  Calendar,
  AlertCircle,
  Stethoscope
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function DoctorDashboard() {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadDoctorAppointments() {
    try {
      const data = await apiFetch<any[]>("/doctor/appointments");
      setAppointments(data || []);
    } catch (err) {
      console.error("Failed to load doctor appointments:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDoctorAppointments();
  }, []);

  const getUrgencyBadge = (urgency?: string) => {
    const u = urgency?.toUpperCase();
    if (u === "HIGH") {
      return (
        <span className="bg-red-100 text-red-800 border border-red-200 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping"></div> High Urgency
        </span>
      );
    }
    if (u === "MEDIUM") {
      return (
        <span className="bg-amber-100 text-amber-800 border border-amber-200 text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">
          Medium Urgency
        </span>
      );
    }
    return (
      <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-medium uppercase tracking-wider">
        Routine / Low
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-1 flex items-center gap-2">
            <Stethoscope className="w-8 h-8 text-primary" />
            Doctor Portal — Welcome, {profile?.name || "Dr. Specialist"}
          </h1>
          <p className="font-body-md text-sm text-on-surface-variant">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <Link href="/doctor/schedule">
          <Button variant="secondary">
            <Calendar className="w-4 h-4 mr-2" />
            My Schedule & Working Hours
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Main Content Column (Appointments Queue) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-title-md text-title-md text-on-surface">Patient Consultation Queue</h2>
            <span className="bg-primary/10 text-primary font-caption-xs text-xs px-3 py-1 rounded-full font-semibold">
              {appointments.length} Consultations
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-on-surface-variant animate-pulse">
              Loading appointment queue...
            </div>
          ) : appointments.length === 0 ? (
            <Card className="p-8 text-center bg-surface-container-low border-dashed border-outline-variant">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="font-title-md text-base font-semibold text-on-surface mb-1">No Consultations in Queue</h3>
              <p className="font-body-md text-xs text-on-surface-variant">All patient consultations are up to date.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {appointments.map((appt) => {
                const date = new Date(appt.slotStart);
                const patientName = appt.patient?.user?.name || "Patient";
                const urgency = appt.symptomForm?.llmUrgency || "LOW";
                const chiefComplaint = appt.symptomForm?.llmChiefComplaint || appt.symptomForm?.rawSymptoms || "Consultation requested";

                return (
                  <Card key={appt.id} className="p-6 border-outline-variant shadow-sm hover:border-primary/50 transition-all">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-surface-variant flex-shrink-0 border-2 border-primary/20">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${appt.patientId}`} alt={patientName} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <h3 className="font-title-md text-lg font-semibold text-on-surface">{patientName}</h3>
                            {getUrgencyBadge(urgency)}
                          </div>
                          <p className="font-body-md text-xs text-on-surface-variant flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      {/* AI Pre-Visit Summary Trigger */}
                      <div className="flex items-center gap-1 text-primary bg-primary/10 px-3 py-1.5 rounded-full text-xs font-semibold self-start">
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Summary Ready
                      </div>
                    </div>

                    {/* Chief Complaint / Symptoms */}
                    <div className="bg-surface-container-low border border-outline-variant rounded-lg p-3.5 mb-4 text-xs text-on-surface">
                      <strong>Chief Complaint:</strong> {chiefComplaint}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Link href={`/doctor/consultation/${appt.id}`} className="w-full sm:w-auto">
                        <Button className="w-full">
                          <Video className="w-4 h-4 mr-2" />
                          Start Consultation & SOAP Notes
                        </Button>
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Sidebar Column */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-indigo-50/20 border-primary/20">
            <h3 className="font-title-md text-base font-semibold text-on-surface mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-ai-accent" />
              AI Clinical Assistant
            </h3>
            <p className="font-body-md text-xs text-on-surface-variant leading-relaxed">
              MedPrecision AI automatically evaluates incoming patient symptoms, scores clinical urgency (Low/Medium/High), and generates targeted questions for your consultations.
            </p>
          </Card>

          <Card className="p-6 border-outline-variant">
            <h3 className="font-title-md text-sm font-semibold text-on-surface mb-3">Quick Navigation</h3>
            <div className="space-y-2">
              <Link href="/doctor/schedule" className="block w-full text-xs font-medium text-primary hover:underline p-2 rounded hover:bg-surface-container">
                &rarr; Manage Working Hours & Leave Dates
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
