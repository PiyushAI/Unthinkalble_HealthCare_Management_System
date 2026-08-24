"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Bell, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw, Mail, Calendar } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface NotificationLog {
  id: string;
  type: string;
  channel: string;
  status: string;
  retryCount: number;
  lastError: string | null;
  createdAt: string;
  recipientId: string;
  appointmentId?: string;
}

export default function AdminNotificationsPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadLogs() {
    setLoading(true);
    try {
      const data = await apiFetch<NotificationLog[]>("/admin/notifications/failed");
      setLogs(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SENT":
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-medium">Delivered</span>;
      case "DEAD_LETTER":
        return <span className="bg-red-100 text-red-800 border border-red-200 text-xs px-2.5 py-0.5 rounded-full font-bold">Dead Letter</span>;
      case "FAILED":
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2.5 py-0.5 rounded-full font-medium">Retrying</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/admin" className="text-primary hover:underline font-label-sm flex items-center gap-1 mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to Admin Center
          </Link>
          <h1 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-2">
            <Bell className="w-7 h-7 text-primary" />
            Notification Health & Audit Logs
          </h1>
          <p className="font-body-md text-sm text-on-surface-variant mt-1">
            Real-time audit log of all email confirmations, medication reminders, and calendar event dispatches.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadLogs} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Logs
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-on-surface-variant animate-pulse">
          Loading notification logs...
        </div>
      ) : logs.length === 0 ? (
        <Card className="p-8 text-center bg-surface-container-low border-dashed border-outline-variant">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="font-title-md text-base font-semibold text-on-surface mb-1">No Notification Failures</h3>
          <p className="font-body-md text-xs text-on-surface-variant">
            All system notification channels (Email, Google Calendar, Medication Reminders) are operating smoothly.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const isEmail = log.channel === "EMAIL";
            const date = new Date(log.createdAt);

            return (
              <Card key={log.id} className="p-4 border-outline-variant hover:border-primary/40 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-outline-variant mb-2">
                  <div className="flex items-center gap-2">
                    {isEmail ? <Mail className="w-4 h-4 text-primary" /> : <Calendar className="w-4 h-4 text-primary" />}
                    <span className="font-title-md text-sm font-semibold text-on-surface">{log.type}</span>
                    <span className="text-xs text-on-surface-variant">• {log.channel}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-on-surface-variant">{date.toLocaleString()}</span>
                    {getStatusBadge(log.status)}
                  </div>
                </div>

                <div className="text-xs text-on-surface-variant flex flex-wrap gap-x-6 gap-y-1">
                  <span><strong>Recipient ID:</strong> <code>{log.recipientId}</code></span>
                  {log.appointmentId && <span><strong>Appt Ref:</strong> <code>{log.appointmentId}</code></span>}
                  {log.retryCount > 0 && <span><strong>Retries:</strong> {log.retryCount}</span>}
                </div>

                {log.lastError && (
                  <p className="mt-2 text-xs text-status-error bg-red-50 p-2 rounded border border-red-100">
                    <strong>Error:</strong> {log.lastError}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
