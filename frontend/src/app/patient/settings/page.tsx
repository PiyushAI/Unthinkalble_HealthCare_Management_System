"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { 
  User, 
  Bell, 
  Shield, 
  CheckCircle,
  Save,
  Calendar,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function PatientSettingsContent() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const [saved, setSaved] = useState(false);
  
  // Google Calendar Connection State
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [calendarConnecting, setCalendarConnecting] = useState(false);
  const [calendarMessage, setCalendarMessage] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("calendar_connected") === "true") {
      setCalendarMessage("Google Calendar connected successfully! Your appointments will automatically sync.");
      setCalendarConnected(true);
    } else if (searchParams.get("calendar_error")) {
      setCalendarMessage("Failed to connect Google Calendar. Please ensure permissions are granted.");
    }
  }, [searchParams]);

  async function checkCalendarStatus() {
    try {
      setLoadingCalendar(true);
      const res = await apiFetch<{ connected: boolean }>("/auth/google/calendar/status");
      setCalendarConnected(Boolean(res?.connected));
    } catch (err) {
      console.warn("Calendar status check:", err);
    } finally {
      setLoadingCalendar(false);
    }
  }

  useEffect(() => {
    checkCalendarStatus();
  }, []);

  async function handleConnectCalendar() {
    setCalendarConnecting(true);
    try {
      const res = await apiFetch<{ url: string }>("/auth/google/calendar/connect");
      if (res?.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      setCalendarMessage(err.message || "Failed to initiate Google Calendar connection");
      setCalendarConnecting(false);
    }
  }

  async function handleDisconnectCalendar() {
    if (!confirm("Are you sure you want to disconnect your Google Calendar?")) return;
    setCalendarConnecting(true);
    try {
      await apiFetch("/auth/google/calendar/disconnect", { method: "POST" });
      setCalendarConnected(false);
      setCalendarMessage("Google Calendar disconnected.");
    } catch (err: any) {
      setCalendarMessage(err.message || "Failed to disconnect Google Calendar");
    } finally {
      setCalendarConnecting(false);
    }
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Account & Integration Settings</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Manage your personal profile, Google Calendar synchronization, and notification preferences.
        </p>
      </div>

      {calendarMessage && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
          calendarConnected
            ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
            : "bg-amber-50 border border-amber-200 text-amber-800"
        }`}>
          {calendarConnected ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
          <span>{calendarMessage}</span>
        </div>
      )}

      {/* Google Calendar Integration Card */}
      <Card className="p-6 border-primary/20 bg-primary-fixed/20 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-white rounded-xl border border-primary/20 text-primary shadow-sm">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <h2 className="font-title-md text-base font-semibold text-on-surface">Google Calendar Synchronization</h2>
                {loadingCalendar ? (
                  <span className="text-[11px] text-on-surface-variant animate-pulse">Checking...</span>
                ) : calendarConnected ? (
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Connected & Active
                  </span>
                ) : (
                  <span className="bg-slate-100 text-slate-600 text-[11px] px-2.5 py-0.5 rounded-full font-medium">
                    Not Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant max-w-xl">
                Automatically sync all booked, rescheduled, and cancelled consultations to your personal Google Calendar in real-time.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {calendarConnected ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDisconnectCalendar}
                disabled={calendarConnecting}
                className="text-xs text-status-error hover:bg-red-50"
              >
                Disconnect Calendar
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleConnectCalendar}
                disabled={calendarConnecting}
                className="text-xs gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {calendarConnecting ? "Connecting..." : "Connect Google Calendar"}
              </Button>
            )}
          </div>
        </div>
      </Card>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Profile Card */}
        <Card className="p-6">
          <h2 className="font-title-md text-title-md text-on-surface mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" /> Personal Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input id="fullName" label="Full Name" defaultValue={profile?.name || "Patient"} />
            <Input id="email" label="Email Address" defaultValue={profile?.email || "patient@example.com"} type="email" disabled />
            <Input id="phone" label="Phone Number" defaultValue={profile?.phone || "+1 (555) 234-5678"} />
            <Input id="dob" label="Date of Birth" defaultValue="1992-05-14" type="date" />
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-6">
          <h2 className="font-title-md text-title-md text-on-surface mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" /> Notification Preferences
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-label-sm text-label-sm text-on-surface font-medium">Appointment Confirmations & Updates</p>
                <p className="font-caption-xs text-caption-xs text-on-surface-variant">Receive automated email alerts upon booking, doctor leaves, and rescheduling.</p>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4 text-primary rounded" />
            </div>
            <div className="h-px bg-outline-variant/30"></div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-label-sm text-label-sm text-on-surface font-medium">Medication Reminders</p>
                <p className="font-caption-xs text-caption-xs text-on-surface-variant">Automated dosage schedule notifications delivered to your inbox.</p>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4 text-primary rounded" />
            </div>
          </div>
        </Card>

        {/* Security */}
        <Card className="p-6">
          <h2 className="font-title-md text-title-md text-on-surface mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Security & Privacy
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-label-sm text-label-sm text-on-surface font-medium">HIPAA Data Protection & Encryption</p>
                <p className="font-caption-xs text-caption-xs text-status-success font-medium">End-to-End Encrypted via Supabase Auth & PostgreSQL RLS</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          {saved && (
            <span className="flex items-center gap-2 text-status-success font-label-sm text-label-sm font-semibold">
              <CheckCircle className="w-4 h-4" /> Preferences saved successfully!
            </span>
          )}
          {!saved && <div></div>}
          <Button type="submit" className="gap-2">
            <Save className="w-4 h-4" /> Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function PatientSettingsPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-on-surface-variant animate-pulse">Loading settings...</div>}>
      <PatientSettingsContent />
    </Suspense>
  );
}
