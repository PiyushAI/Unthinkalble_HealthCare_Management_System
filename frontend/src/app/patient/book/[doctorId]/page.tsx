"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
  Timer, 
  Calendar as CalendarIcon, 
  Thermometer, 
  CheckCircle, 
  Frown, 
  Activity, 
  ArrowRight, 
  ArrowLeft,
  Clock,
  AlertCircle
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { Doctor } from "@/types/api";

export default function BookAppointmentPage({ params }: { params: { doctorId: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<1 | 2>(1);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  
  // Hold state
  const [holdId, setHoldId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 mins
  const [holdingSlot, setHoldingSlot] = useState(false);

  // Symptoms state
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Doctor info
  useEffect(() => {
    async function loadDoctor() {
      try {
        const doc = await apiFetch<Doctor>(`/doctors/${params.doctorId}`);
        setDoctor(doc);
      } catch (err) {
        console.error("Failed to load doctor:", err);
      }
    }
    loadDoctor();
  }, [params.doctorId]);

  // Fetch available slots when date changes
  useEffect(() => {
    async function loadSlots() {
      if (!selectedDate) return;
      setLoadingSlots(true);
      setError(null);
      try {
        const res = await apiFetch<{ slots: string[] }>(
          `/doctors/${params.doctorId}/slots?date=${selectedDate}`
        );
        setAvailableSlots(res.slots || []);
      } catch (err) {
        console.error("Failed to load slots:", err);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }
    loadSlots();
  }, [params.doctorId, selectedDate]);

  // 5-minute countdown timer for active hold
  useEffect(() => {
    if (!holdId || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError("Your 5-minute slot reservation has expired. Please select a slot again.");
          setStep(1);
          setHoldId(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [holdId, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `0${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  };

  const commonSymptoms = [
    { id: "Fever", label: "Fever", icon: <Thermometer className="w-4 h-4" /> },
    { id: "Cough & Cold", label: "Cough & Cold", icon: <Activity className="w-4 h-4" /> },
    { id: "Fatigue & Weakness", label: "Fatigue", icon: <Frown className="w-4 h-4" /> },
    { id: "Headache / Migraine", label: "Headache", icon: <Activity className="w-4 h-4" /> },
    { id: "Chest Tightness", label: "Chest Discomfort", icon: <Activity className="w-4 h-4" /> },
    { id: "Digestive Issues", label: "Stomach Ache", icon: <Frown className="w-4 h-4" /> },
  ];

  async function handleCreateHold(slotIsoString: string) {
    setSelectedSlot(slotIsoString);
    setHoldingSlot(true);
    setError(null);
    try {
      const hold = await apiFetch<{ id: string; expiresAt: string }>("/appointments/hold", {
        method: "POST",
        body: JSON.stringify({
          doctorId: params.doctorId,
          slotStart: slotIsoString,
        }),
      });

      setHoldId(hold.id);
      setTimeLeft(300); // 5 mins
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Failed to hold slot. It may have just been booked.");
    } finally {
      setHoldingSlot(false);
    }
  }

  async function handleConfirmAppointment() {
    if (!holdId) {
      setError("No active slot reservation. Please select a slot.");
      setStep(1);
      return;
    }

    const fullSymptoms = [
      ...selectedSymptoms,
      description.trim() ? `Details: ${description.trim()}` : "",
    ]
      .filter(Boolean)
      .join(". ");

    if (!fullSymptoms) {
      setError("Please select at least one symptom or describe your reason for visit.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const appointment = await apiFetch<{ id: string }>("/appointments/confirm", {
        method: "POST",
        body: JSON.stringify({
          holdId,
          rawSymptoms: fullSymptoms,
        }),
      });

      router.push(`/patient/booking-confirmed?appointmentId=${appointment.id}`);
    } catch (err: any) {
      setError(err.message || "Booking confirmation failed. Please try again.");
      setSubmitting(false);
    }
  }

  const doctorName = doctor?.user?.name || "Dr. Specialist";
  const doctorSpec = doctor?.specialization || "General Medicine";

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-12">
      {/* Progress Header */}
      <div className="flex items-center justify-between border-b border-outline-variant pb-4 mb-2">
        <h1 className="font-title-md text-title-md text-on-surface">Book Appointment</h1>
        <div className="flex gap-4 items-center">
          <div className={`flex items-center gap-2 ${step === 1 ? 'opacity-100' : 'opacity-60'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 1 ? 'bg-primary text-on-primary ring-2 ring-primary/30' : 'bg-surface-variant text-on-surface'}`}>1</div>
            <span className="hidden sm:inline text-sm font-medium">Select Slot</span>
          </div>
          <div className={`flex items-center gap-2 ${step === 2 ? 'opacity-100' : 'opacity-60'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 2 ? 'bg-primary text-on-primary ring-2 ring-primary/30' : 'bg-surface-variant text-on-surface'}`}>2</div>
            <span className="hidden sm:inline text-sm font-medium">Symptoms</span>
          </div>
          <div className="flex items-center gap-2 opacity-40">
            <div className="w-6 h-6 rounded-full bg-surface-variant flex items-center justify-center text-xs font-bold">3</div>
            <span className="hidden sm:inline text-sm">Confirmed</span>
          </div>
        </div>
      </div>

      {/* Active 5-minute Slot Hold Timer */}
      {holdId && step === 2 && (
        <div className="bg-primary-container/10 border border-primary/30 rounded-xl p-4 flex items-center gap-4 animate-in fade-in">
          <Timer className={`w-5 h-5 ${timeLeft < 60 ? 'text-status-error animate-spin' : 'text-primary'}`} />
          <div className="flex-grow">
            <p className="font-label-sm text-label-sm text-on-surface">
              Slot reserved exclusively for you: <span className={`font-bold ${timeLeft < 60 ? 'text-status-error' : 'text-primary'}`}>{formatTime(timeLeft)}</span>
            </p>
            <div className="w-full bg-surface-variant h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                 className={`h-full rounded-full transition-all ${timeLeft < 60 ? 'bg-status-error' : 'bg-primary'}`}
                 style={{ width: `${(timeLeft / 300) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <Card className="overflow-hidden border-outline-variant shadow-sm">
        {/* Doctor Summary Header */}
        <div className="p-6 border-b border-outline-variant bg-surface-bright flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-primary/20 shrink-0">
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${params.doctorId}`}
                alt={doctorName}
                className="w-full h-full object-cover bg-surface-variant"
              />
            </div>
            <div>
              <h2 className="font-title-md text-title-md text-on-surface">{doctorName}</h2>
              <p className="font-label-sm text-label-sm text-primary font-medium">{doctorSpec}</p>
            </div>
          </div>
          {selectedSlot && (
            <div className="bg-surface-container-low px-4 py-2.5 rounded-lg border border-outline-variant text-right shrink-0">
              <p className="font-caption-xs text-caption-xs text-on-surface-variant mb-0.5 flex items-center justify-end gap-1">
                <CalendarIcon className="w-3.5 h-3.5" /> {new Date(selectedSlot).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              <p className="font-label-sm text-label-sm text-primary font-bold">
                {new Date(selectedSlot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          )}
        </div>

        {/* STEP 1: Date & Time Slot Selection */}
        {step === 1 && (
          <div className="p-6 space-y-6">
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface font-medium mb-2">
                Select Consultation Date
              </label>
              <input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-72 h-11 px-3 border border-outline-variant rounded-lg bg-surface text-on-surface font-body-md text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <h3 className="font-label-sm text-label-sm text-on-surface font-medium mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Available Slots for {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </h3>

              {loadingSlots ? (
                <div className="py-8 text-center text-sm text-on-surface-variant animate-pulse">
                  Checking doctor schedule & live slot availability...
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="p-6 text-center bg-surface-container-low rounded-xl border border-dashed border-outline-variant text-sm text-on-surface-variant">
                  No available slots on this date. The doctor may be off or fully booked. Please select another date.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {availableSlots.map((slotIso) => {
                    const timeStr = new Date(slotIso).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return (
                      <button
                        key={slotIso}
                        type="button"
                        onClick={() => handleCreateHold(slotIso)}
                        disabled={holdingSlot}
                        className="py-2.5 px-3 rounded-lg text-xs font-semibold text-center border border-outline-variant bg-surface-card text-on-surface hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm"
                      >
                        {timeStr}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Symptom Intake Form */}
        {step === 2 && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-title-md text-title-md text-on-surface mb-1">Reason for Visit & Symptoms</h3>
              <p className="font-caption-xs text-caption-xs text-on-surface-variant">
                Our AI pre-visit assistant will analyze your symptoms to provide the doctor with key clinical questions.
              </p>
            </div>

            {/* Symptom Tag Chips */}
            <div>
              <label className="font-label-sm text-label-sm text-on-surface block mb-2 font-medium">
                Common Symptoms (Select all that apply)
              </label>
              <div className="flex flex-wrap gap-2">
                {commonSymptoms.map((symptom) => {
                  const isSelected = selectedSymptoms.includes(symptom.id);
                  return (
                    <button
                      key={symptom.id}
                      type="button"
                      onClick={() => toggleSymptom(symptom.id)}
                      className={`px-3.5 py-2 rounded-full font-label-sm text-xs flex items-center gap-1.5 transition-all ${
                        isSelected
                          ? "border-2 border-primary bg-primary text-white font-medium shadow-sm"
                          : "border border-outline-variant bg-surface-card text-on-surface-variant hover:bg-surface-container"
                      }`}
                    >
                      {isSelected ? <CheckCircle className="w-3.5 h-3.5 text-white" /> : symptom.icon}
                      {symptom.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Symptom Detailed Description */}
            <div className="relative">
              <label className="font-label-sm text-label-sm text-on-surface block mb-1.5 font-medium" htmlFor="symptoms-detail">
                Describe your condition in your own words <span className="text-status-error">*</span>
              </label>
              <textarea
                id="symptoms-detail"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface-card p-3.5 font-body-md text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary placeholder-on-surface-variant/60 resize-none"
                placeholder="When did the symptoms begin? How severe is the discomfort? Have you taken any medications?"
                rows={4}
              />
              <div className="text-right font-caption-xs text-caption-xs text-on-surface-variant mt-1">
                {description.length} / 500 characters
              </div>
            </div>

            {/* Step 2 Actions */}
            <div className="pt-4 border-t border-outline-variant flex items-center justify-between gap-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep(1)}
                disabled={submitting}
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Change Slot
              </Button>
              <Button
                type="button"
                onClick={handleConfirmAppointment}
                disabled={submitting || (!selectedSymptoms.length && !description.trim())}
              >
                {submitting ? "Confirming & Syncing..." : "Confirm Appointment"}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
