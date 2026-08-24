"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
  CheckCircle, 
  Clock, 
  Sparkles, 
  Calendar as CalendarIcon, 
  Bell, 
  RefreshCw, 
  Check, 
  Pill, 
  Info,
  Plus
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface MedicationItem {
  id: string;
  time: string;
  name: string;
  dosage: string;
  status: "taken" | "upcoming" | "pending";
  daysLeft: number;
  progress: number;
}

export default function PatientSchedulesPage() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);

  const [meds, setMeds] = useState<MedicationItem[]>([
    {
      id: "med1",
      time: "8:00 AM",
      name: "Amoxicillin",
      dosage: "500mg • With food",
      status: "taken",
      daysLeft: 5,
      progress: 40,
    },
    {
      id: "med2",
      time: "2:00 PM",
      name: "Paracetamol",
      dosage: "650mg • Take with water",
      status: "upcoming",
      daysLeft: 3,
      progress: 60,
    },
    {
      id: "med3",
      time: "8:00 PM",
      name: "Vitamin C",
      dosage: "500mg • After dinner",
      status: "pending",
      daysLeft: 10,
      progress: 80,
    },
  ]);

  useEffect(() => {
    async function loadReminders() {
      try {
        const data = await apiFetch<any[]>("/patient/reminders").catch(() => []);
        if (Array.isArray(data) && data.length > 0) {
          setReminders(data);
          const mapped: MedicationItem[] = data.slice(0, 10).map((r, i) => {
            const date = new Date(r.scheduledAt);
            const timeStr = !isNaN(date.getTime())
              ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "9:00 AM";
            return {
              id: r.id,
              time: timeStr,
              name: r.drugName,
              dosage: `${r.dosage} • Prescribed Regimen`,
              status: (r.status === "SENT" ? "taken" : "upcoming") as "taken" | "upcoming" | "pending",
              daysLeft: 5,
              progress: 50,
            };
          });
          if (mapped.length > 0) {
            setMeds(mapped);
          }
        }
      } catch (err) {
        console.error("Failed to load reminders:", err);
      } finally {
        setLoading(false);
      }
    }
    loadReminders();
  }, []);

  const markAsTaken = (id: string) => {
    setMeds((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: "taken" } : m))
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter mb-20 md:mb-0">
      {/* Page Header */}
      <div className="col-span-1 md:col-span-12 mb-2 flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">
            Medication Reminders & Schedule
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Manage your daily medication schedule and active doctor prescriptions.
          </p>
        </div>
      </div>

      {/* Left Column: Daily Schedule & Treatment Summary */}
      <div className="col-span-1 md:col-span-8 flex flex-col gap-6">
        {/* Daily Schedule */}
        <Card className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-title-md text-title-md text-on-surface">Today's Schedule</h2>
            <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container py-1 px-3 rounded-full">
              {new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </span>
          </div>

          <div className="relative border-l-2 border-surface-variant ml-4 md:ml-8 space-y-8 pb-4">
            {meds.map((med) => {
              const isTaken = med.status === "taken";
              const isUpcoming = med.status === "upcoming";

              return (
                <div key={med.id} className="relative pl-6 md:pl-8">
                  {/* Indicator Dot */}
                  <div
                    className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-surface-card ${
                      isTaken
                        ? "bg-status-success"
                        : isUpcoming
                        ? "bg-primary shadow-[0_0_0_4px_rgba(0,60,144,0.1)]"
                        : "bg-surface-variant"
                    }`}
                  ></div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-low p-4 rounded-xl border border-outline-variant/60 hover:border-primary/40 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 bg-surface-card rounded-lg border border-outline-variant/60 text-primary">
                        <Pill className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-label-sm text-xs font-semibold text-primary">{med.time}</span>
                          <span className="text-on-surface-variant text-xs">•</span>
                          <h3 className="font-title-md text-sm font-semibold text-on-surface">{med.name}</h3>
                        </div>
                        <p className="font-caption-xs text-xs text-on-surface-variant mt-0.5">{med.dosage}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      {isTaken ? (
                        <span className="flex items-center gap-1.5 text-xs text-status-success font-medium bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                          <Check className="w-3.5 h-3.5" /> Taken
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => markAsTaken(med.id)}
                          className="text-xs"
                        >
                          Mark as Taken
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Treatment Summary (AI) */}
        <Card className="p-4 md:p-6 border border-primary/20 bg-primary-fixed/10">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-primary/10 text-primary font-caption-xs text-caption-xs px-2.5 py-1 rounded-full flex items-center gap-1 border border-primary/20 font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> AI Regimen Sync
            </span>
            <h2 className="font-title-md text-title-md text-on-surface">Medication Overview & Guidelines</h2>
          </div>
          <div className="text-on-surface-variant font-body-md text-sm space-y-2">
            <p>
              Your prescribed medications have been generated automatically from your clinical consultation notes.
              Please ensure you adhere strictly to dosage frequency and complete the full duration of any prescribed antibiotics.
            </p>
            <p>
              <strong>Reminder:</strong> If you experience unexpected side effects or drug interactions, please message your attending physician or schedule a follow-up visit immediately.
            </p>
          </div>
        </Card>
      </div>

      {/* Right Column: Sync & Active Prescriptions */}
      <div className="col-span-1 md:col-span-4 flex flex-col gap-6">
        {/* Reminders & Sync */}
        <Card className="p-4 md:p-6">
          <h2 className="font-title-md text-title-md text-on-surface mb-4">Sync & Alerts</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-surface-container p-2 rounded-lg text-secondary">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-label-sm text-label-sm text-on-surface">Google Calendar</h3>
                  <p className="font-caption-xs text-caption-xs text-status-success font-medium">Auto-Sync Active</p>
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-outline-variant/40"></div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-surface-container p-2 rounded-lg text-secondary">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-label-sm text-label-sm text-on-surface">Email Dosage Alerts</h3>
                  <p className="font-caption-xs text-caption-xs text-on-surface-variant">
                    {pushEnabled ? "Active" : "Paused"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPushEnabled(!pushEnabled)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  pushEnabled ? "bg-primary" : "bg-surface-variant"
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    pushEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                ></div>
              </button>
            </div>
          </div>
        </Card>

        {/* Active Prescriptions List */}
        <Card className="p-4 md:p-6 flex-grow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-title-md text-title-md text-on-surface">Active Prescriptions</h2>
          </div>

          <div className="space-y-3">
            {meds.map((med) => (
              <div
                key={med.id}
                className="p-3 border border-outline-variant/50 rounded-lg hover:border-primary/50 transition-colors"
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-label-sm text-label-sm font-bold text-on-surface flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-primary" />
                    {med.name}
                  </h3>
                  <span className="font-mono-data text-mono-data text-primary text-xs font-semibold">
                    {med.dosage.split("•")[0].trim()}
                  </span>
                </div>
                <p className="font-caption-xs text-caption-xs text-on-surface-variant mb-2">
                  {med.dosage.split("•")[1] ? med.dosage.split("•")[1].trim() : "Daily"}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-grow bg-surface-container h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{ width: `${med.progress}%` }}
                    ></div>
                  </div>
                  <span className="font-caption-xs text-caption-xs text-on-surface-variant whitespace-nowrap">
                    Active Regimen
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
