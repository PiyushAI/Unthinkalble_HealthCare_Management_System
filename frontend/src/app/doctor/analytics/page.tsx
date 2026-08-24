"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
  PieChart, 
  ArrowLeft, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Users, 
  AlertTriangle, 
  Sparkles, 
  TrendingUp, 
  Activity,
  RefreshCw
} from "lucide-react";
import { apiFetch } from "@/lib/api";

export default function DoctorAnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function loadAnalytics() {
    setLoading(true);
    try {
      const data = await apiFetch<any>("/doctor/analytics");
      setAnalytics(data);
    } catch (err) {
      console.error("Failed to load doctor analytics:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  const urgency = analytics?.urgencyBreakdown || { HIGH: 0, MEDIUM: 0, LOW: 0 };
  const total = (urgency.HIGH + urgency.MEDIUM + urgency.LOW) || 1;
  const highPct = Math.round((urgency.HIGH / total) * 100);
  const medPct = Math.round((urgency.MEDIUM / total) * 100);
  const lowPct = Math.round((urgency.LOW / total) * 100);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/doctor" className="text-primary hover:underline font-label-sm flex items-center gap-1 mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to Doctor Dashboard
          </Link>
          <h1 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-2.5">
            <PieChart className="w-7 h-7 text-primary" />
            Clinical Practice & Patient Analytics
          </h1>
          <p className="font-body-md text-sm text-on-surface-variant mt-1">
            Real-time analytics on patient consult volumes, symptom triage urgency, and care completion.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadAnalytics} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Stats
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-on-surface-variant animate-pulse">
          Calculating clinical practice metrics...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 border-outline-variant bg-surface-card shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant font-medium">Total Bookings</p>
                  <h3 className="text-2xl font-bold text-on-surface">{analytics?.totalAppointments || 0}</h3>
                </div>
              </div>
            </Card>

            <Card className="p-5 border-outline-variant bg-surface-card shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant font-medium">Completed Visits</p>
                  <h3 className="text-2xl font-bold text-on-surface">{analytics?.completedConsultations || 0}</h3>
                </div>
              </div>
            </Card>

            <Card className="p-5 border-outline-variant bg-surface-card shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant font-medium">Upcoming Queue</p>
                  <h3 className="text-2xl font-bold text-on-surface">{analytics?.upcomingConsultations || 0}</h3>
                </div>
              </div>
            </Card>

            <Card className="p-5 border-outline-variant bg-surface-card shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant font-medium">Unique Patients</p>
                  <h3 className="text-2xl font-bold text-on-surface">{analytics?.uniquePatients || 0}</h3>
                </div>
              </div>
            </Card>
          </div>

          {/* Detailed Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* AI Urgency Triage Breakdown */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              <Card className="p-6 border-outline-variant shadow-sm flex-grow">
                <h3 className="font-title-md text-base font-semibold text-on-surface mb-1 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-ai-accent" />
                  AI Triage Urgency Distribution
                </h3>
                <p className="text-xs text-on-surface-variant mb-6">
                  Distribution of incoming appointments by AI pre-visit clinical triage level.
                </p>

                <div className="space-y-4">
                  {/* High Urgency */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-red-700 flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-600"></div> High Urgency
                      </span>
                      <span className="text-on-surface">{urgency.HIGH} cases ({highPct}%)</span>
                    </div>
                    <div className="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
                      <div className="bg-red-600 h-full rounded-full transition-all" style={{ width: `${highPct}%` }}></div>
                    </div>
                  </div>

                  {/* Medium Urgency */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-amber-700 flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> Medium Urgency
                      </span>
                      <span className="text-on-surface">{urgency.MEDIUM} cases ({medPct}%)</span>
                    </div>
                    <div className="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${medPct}%` }}></div>
                    </div>
                  </div>

                  {/* Routine / Low Urgency */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-emerald-700 flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-600"></div> Routine / Low Urgency
                      </span>
                      <span className="text-on-surface">{urgency.LOW} cases ({lowPct}%)</span>
                    </div>
                    <div className="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-600 h-full rounded-full transition-all" style={{ width: `${lowPct}%` }}></div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Quality & Efficiency Metrics */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              <Card className="p-6 border-outline-variant shadow-sm flex-grow">
                <h3 className="font-title-md text-base font-semibold text-on-surface mb-1 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Clinical Workflow Efficiency
                </h3>
                <p className="text-xs text-on-surface-variant mb-5">
                  Automated documentation metrics and prescription compliance rates.
                </p>

                <div className="space-y-4 text-xs">
                  <div className="p-3.5 rounded-lg bg-surface-container-low border border-outline-variant flex items-center justify-between">
                    <div>
                      <strong className="block text-on-surface">AI Pre-Visit Triage Rate</strong>
                      <span className="text-on-surface-variant text-[11px]">Symptom analysis for queue prioritization</span>
                    </div>
                    <span className="text-base font-bold text-primary">100%</span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-surface-container-low border border-outline-variant flex items-center justify-between">
                    <div>
                      <strong className="block text-on-surface">E-Prescription Reminder Sync</strong>
                      <span className="text-on-surface-variant text-[11px]">Automated patient dosage notifications</span>
                    </div>
                    <span className="text-base font-bold text-emerald-600">Active</span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-surface-container-low border border-outline-variant flex items-center justify-between">
                    <div>
                      <strong className="block text-on-surface">Post-Visit Care Plan Generation</strong>
                      <span className="text-on-surface-variant text-[11px]">SOAP to patient-friendly translation</span>
                    </div>
                    <span className="text-base font-bold text-purple-700">Automated</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
