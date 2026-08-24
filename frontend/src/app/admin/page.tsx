"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { 
  Search, 
  UserPlus, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  CalendarOff,
  Users,
  Calendar,
  Bell,
  Stethoscope,
  X
} from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function AdminDashboard() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Leave Modal State
  const [selectedDoctorForLeave, setSelectedDoctorForLeave] = useState<any | null>(null);
  const [leaveDate, setLeaveDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveSuccess, setLeaveSuccess] = useState<string | null>(null);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  async function loadAdminData() {
    try {
      const [docs, st] = await Promise.all([
        apiFetch<any[]>("/admin/doctors").catch(() => []),
        apiFetch<any>("/admin/stats").catch(() => null),
      ]);
      setDoctors(docs || []);
      setStats(st);
    } catch (err) {
      console.error("Admin data load error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  async function handleMarkLeave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDoctorForLeave || !leaveDate) return;
    setLeaveSubmitting(true);
    setLeaveError(null);
    setLeaveSuccess(null);

    try {
      const res = await apiFetch<{ affectedAppointmentCount: number }>(
        `/admin/doctors/${selectedDoctorForLeave.id}/leaves`,
        {
          method: "POST",
          body: JSON.stringify({
            leaveDate,
            reason: leaveReason || "Scheduled PTO",
          }),
        }
      );

      setLeaveSuccess(
        `Leave marked successfully! ${res.affectedAppointmentCount} existing booking(s) rescheduled and patient(s) notified.`
      );
      await loadAdminData();
    } catch (err: any) {
      setLeaveError(err.message || "Failed to mark doctor leave");
    } finally {
      setLeaveSubmitting(false);
    }
  }

  const filteredDoctors = doctors.filter((doc) => {
    const name = doc.user?.name?.toLowerCase() || "";
    const spec = doc.specialization?.toLowerCase() || "";
    const term = searchTerm.toLowerCase();
    return name.includes(term) || spec.includes(term);
  });

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-20">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Hospital Admin Center</h1>
          <p className="font-body-md text-sm text-on-surface-variant mt-1 max-w-2xl">
            Manage medical staff rosters, handle doctor leaves with conflict auto-rescheduling, and inspect notification logs.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/admin/notifications">
            <Button variant="secondary">
              <Bell className="w-4 h-4 mr-2" />
              Notification Health Logs
            </Button>
          </Link>
        </div>
      </div>

      {/* Analytics Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-5 border-outline-variant bg-surface-card">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-on-surface-variant font-medium">Active Doctors</p>
                <h3 className="text-2xl font-bold text-on-surface">{stats.totalDoctors}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-5 border-outline-variant bg-surface-card">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-on-surface-variant font-medium">Registered Patients</p>
                <h3 className="text-2xl font-bold text-on-surface">{stats.totalPatients}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-5 border-outline-variant bg-surface-card">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-on-surface-variant font-medium">Total Bookings</p>
                <h3 className="text-2xl font-bold text-on-surface">{stats.totalAppointments}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-5 border-outline-variant bg-surface-card">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-on-surface-variant font-medium">Dispatched Alerts</p>
                <h3 className="text-2xl font-bold text-on-surface">{stats.notificationsSent}</h3>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Main Roster Column */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-title-md text-title-md text-on-surface">Medical Staff & Schedules</h2>
          <div className="w-72">
            <Input
              id="search"
              placeholder="Search doctor or specialty..."
              icon={<Search className="w-4 h-4" />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-on-surface-variant animate-pulse">
            Loading medical staff profiles...
          </div>
        ) : filteredDoctors.length === 0 ? (
          <Card className="p-8 text-center bg-surface-container-low border-dashed border-outline-variant">
            <p className="text-sm text-on-surface-variant">No doctor records found.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDoctors.map((doc) => {
              const docName = doc.user?.name || "Doctor";
              const spec = doc.specialization || "General Medicine";
              const leavesCount = doc.leaves?.length || 0;
              const slotDuration = doc.slotDurationMinutes || 30;

              return (
                <Card key={doc.id} className="p-5 border-outline-variant shadow-sm hover:border-primary/40 transition-colors">
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-outline-variant mb-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-variant shrink-0 border border-primary/20">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${doc.id}`} alt={docName} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h3 className="font-title-md text-base font-semibold text-on-surface">{docName}</h3>
                        <p className="text-xs text-primary font-medium">{spec}</p>
                      </div>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 text-[11px] px-2.5 py-0.5 rounded-full font-medium">
                      Active
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs text-on-surface-variant mb-4">
                    <div>
                      <span className="text-on-surface font-medium">Slot Duration:</span> {slotDuration} mins
                    </div>
                    <div>
                      <span className="text-on-surface font-medium">Leave Days:</span> {leavesCount} recorded
                    </div>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full text-xs"
                      onClick={() => {
                        setSelectedDoctorForLeave(doc);
                        setLeaveError(null);
                        setLeaveSuccess(null);
                      }}
                    >
                      <CalendarOff className="w-3.5 h-3.5 mr-1 text-amber-600" />
                      Mark Leave / PTO
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Mark Doctor Leave Modal Dialog */}
      {selectedDoctorForLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md">
            <Card className="shadow-2xl border-outline-variant overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between pb-3 border-b border-outline-variant mb-4">
                  <h3 className="font-title-md text-base font-semibold text-on-surface flex items-center gap-2">
                    <CalendarOff className="w-5 h-5 text-amber-600" />
                    Mark Doctor On Leave
                  </h3>
                  <button
                    onClick={() => setSelectedDoctorForLeave(null)}
                    className="p-1 text-on-surface-variant hover:bg-surface-container rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4 text-xs text-on-surface-variant bg-surface-container-low p-3 rounded-lg border border-outline-variant">
                  <strong>Doctor:</strong> {selectedDoctorForLeave.user?.name} ({selectedDoctorForLeave.specialization})
                  <p className="mt-1 text-amber-700 font-medium">
                    ⚠️ Any confirmed appointments on this date will be automatically rescheduled and patients alerted.
                  </p>
                </div>

                {leaveSuccess && (
                  <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{leaveSuccess}</span>
                  </div>
                )}

                {leaveError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{leaveError}</span>
                  </div>
                )}

                {!leaveSuccess && (
                  <form onSubmit={handleMarkLeave} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-on-surface mb-1">Leave Date</label>
                      <input
                        type="date"
                        value={leaveDate}
                        onChange={(e) => setLeaveDate(e.target.value)}
                        className="w-full h-10 px-3 text-xs border border-outline-variant rounded-lg bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-on-surface mb-1">Reason (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Medical conference, Personal leave"
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                        className="w-full h-10 px-3 text-xs border border-outline-variant rounded-lg bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedDoctorForLeave(null)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" disabled={leaveSubmitting}>
                        {leaveSubmitting ? "Processing & Rescheduling..." : "Confirm Leave"}
                      </Button>
                    </div>
                  </form>
                )}

                {leaveSuccess && (
                  <div className="pt-2 flex justify-end">
                    <Button size="sm" onClick={() => setSelectedDoctorForLeave(null)}>
                      Close
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
