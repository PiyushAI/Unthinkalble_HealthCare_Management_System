"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, Calendar, Clock, User, Mail, ShieldCheck, ArrowRight } from "lucide-react";
import { apiFetch } from "@/lib/api";

function BookingConfirmedContent() {
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get("appointmentId");
  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAppt() {
      if (!appointmentId) {
        setLoading(false);
        return;
      }
      try {
        const data = await apiFetch<any>(`/appointments/${appointmentId}`);
        setAppointment(data);
      } catch (err) {
        console.error("Failed to load appointment details:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAppt();
  }, [appointmentId]);

  const slotStart = appointment?.slotStart ? new Date(appointment.slotStart) : new Date();
  const doctorName = appointment?.doctor?.user?.name || "Dr. Specialist";
  const doctorSpec = appointment?.doctor?.specialization || "General Medicine";

  return (
    <div className="max-w-2xl mx-auto flex flex-col items-center justify-center text-center py-8">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-6 ring-8 ring-emerald-50">
        <CheckCircle2 className="w-10 h-10 text-emerald-600 animate-in zoom-in-50 duration-300" />
      </div>

      <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">
        Appointment Confirmed!
      </h1>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-md mb-8">
        Your consultation has been booked successfully and synced to your schedule.
      </p>

      <Card className="w-full text-left p-6 sm:p-8 mb-8 border-outline-variant shadow-sm">
        <h2 className="font-label-sm text-label-sm text-primary font-semibold uppercase tracking-wider mb-4">
          Appointment Summary
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-outline-variant">
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-caption-xs text-caption-xs text-on-surface-variant">Doctor</p>
              <p className="font-title-md text-sm font-semibold text-on-surface">{doctorName}</p>
              <p className="font-caption-xs text-xs text-primary">{doctorSpec}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-caption-xs text-caption-xs text-on-surface-variant">Date & Time</p>
              <p className="font-title-md text-sm font-semibold text-on-surface">
                {slotStart.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              <p className="font-caption-xs text-xs text-secondary font-medium">
                {slotStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>

        {/* Sync & Notification Status Indicators */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-3 text-xs text-on-surface">
            <Mail className="w-4 h-4 text-emerald-600" />
            <span>Email confirmation sent with visit details and pre-consultation guidance.</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-on-surface">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>Google Calendar event created for both you and your doctor.</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-on-surface">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>AI Pre-Visit symptom summary generated and provided to your doctor.</span>
          </div>
        </div>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <Link href="/patient" className="w-full sm:w-auto">
          <Button variant="secondary" className="w-full">
            Back to Dashboard
          </Button>
        </Link>
        <Link href="/patient/appointments" className="w-full sm:w-auto">
          <Button className="w-full">
            View My Appointments
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function BookingConfirmedPage() {
  return (
    <Suspense fallback={<div className="text-center py-12">Loading confirmation...</div>}>
      <BookingConfirmedContent />
    </Suspense>
  );
}
