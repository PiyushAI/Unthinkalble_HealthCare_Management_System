"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
  PieChart, 
  ArrowLeft, 
  Activity, 
  Users, 
  Calendar, 
  Bell, 
  Stethoscope, 
  RefreshCw,
  CheckCircle2
} from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function loadStats() {
    setLoading(true);
    try {
      const data = await apiFetch<any>("/admin/stats");
      setStats(data);
    } catch (err) {
      console.error("Failed to load admin stats:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/admin" className="text-primary hover:underline font-label-sm flex items-center gap-1 mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to Admin Dashboard
          </Link>
          <h1 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-2.5">
            <PieChart className="w-7 h-7 text-primary" />
            Hospital System Analytics
          </h1>
          <p className="font-body-md text-sm text-on-surface-variant mt-1">
            Global healthcare appointment metrics, medical staff utilization, and patient throughput.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadStats} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Metrics
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-on-surface-variant animate-pulse">
          Loading hospital analytics...
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 border-outline-variant bg-surface-card shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant font-medium">Active Doctors</p>
                  <h3 className="text-2xl font-bold text-on-surface">{stats?.totalDoctors || 0}</h3>
                </div>
              </div>
            </Card>

            <Card className="p-5 border-outline-variant bg-surface-card shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant font-medium">Registered Patients</p>
                  <h3 className="text-2xl font-bold text-on-surface">{stats?.totalPatients || 0}</h3>
                </div>
              </div>
            </Card>

            <Card className="p-5 border-outline-variant bg-surface-card shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant font-medium">Total Bookings</p>
                  <h3 className="text-2xl font-bold text-on-surface">{stats?.totalAppointments || 0}</h3>
                </div>
              </div>
            </Card>

            <Card className="p-5 border-outline-variant bg-surface-card shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant font-medium">Dispatched Alerts</p>
                  <h3 className="text-2xl font-bold text-on-surface">{stats?.notificationsSent || 0}</h3>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 border-outline-variant shadow-sm">
              <h3 className="font-title-md text-base font-semibold text-on-surface mb-3">Appointment Fulfillment</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between p-3 rounded-lg bg-surface-container-low border border-outline-variant">
                  <span>Confirmed & Active</span>
                  <strong className="text-primary">{stats?.confirmedAppointments || 0}</strong>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-surface-container-low border border-outline-variant">
                  <span>Completed Visits</span>
                  <strong className="text-emerald-700">{stats?.completedAppointments || 0}</strong>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-outline-variant shadow-sm">
              <h3 className="font-title-md text-base font-semibold text-on-surface mb-3">Notification Channel Health</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span>Email Confirmation & Medication Service</span>
                  <strong>Operational</strong>
                </div>
                <div className="flex justify-between p-3 rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
                  <span>Google Calendar Sync Engine</span>
                  <strong>Operational</strong>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
