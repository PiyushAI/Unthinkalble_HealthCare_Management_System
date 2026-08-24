"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, Filter } from "lucide-react";

export default function DoctorSchedulePage() {
  const [view, setView] = useState<"day" | "week" | "month">("day");

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-outline-variant pb-6">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Schedule & Reminders</h1>
          <p className="font-body-md text-on-surface-variant mt-1">Manage your appointments and medication alerts.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-surface-container-low rounded-lg p-1 border border-outline-variant">
            <button 
              onClick={() => setView("day")}
              className={`px-4 py-1.5 rounded font-label-sm text-label-sm transition-colors ${view === 'day' ? 'bg-surface shadow-sm text-on-surface font-semibold' : 'text-secondary hover:text-on-surface'}`}
            >
              Day
            </button>
            <button 
              onClick={() => setView("week")}
              className={`px-4 py-1.5 rounded font-label-sm text-label-sm transition-colors ${view === 'week' ? 'bg-surface shadow-sm text-on-surface font-semibold' : 'text-secondary hover:text-on-surface'}`}
            >
              Week
            </button>
          </div>
          <Button variant="secondary" className="px-3">
            <Filter className="w-4 h-4 mr-2" /> Filter
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Calendar Main View */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h2 className="font-title-lg text-title-lg text-on-surface">Tuesday, October 24, 2023</h2>
              </div>
              <div className="flex gap-2">
                <button className="p-2 rounded-lg border border-outline-variant text-secondary hover:bg-surface-container transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                <button className="p-2 rounded-lg border border-outline-variant text-secondary hover:bg-surface-container transition-colors"><ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>

            {/* Time Slots */}
            <div className="flex flex-col border-t border-l border-outline-variant rounded-tl-lg">
              {["08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM"].map((time, idx) => (
                <div key={time} className="flex min-h-[100px] border-b border-outline-variant relative">
                  <div className="w-24 flex-shrink-0 border-r border-outline-variant p-4 font-caption-xs text-caption-xs text-secondary text-right bg-surface-container-lowest">
                    {time}
                  </div>
                  <div className="flex-grow relative bg-surface-bright">
                    {/* Render dummy appointments based on time */}
                    {idx === 1 && (
                      <div className="absolute top-0 left-2 right-4 h-[90%] bg-error-container/30 border-l-4 border-status-error rounded-r-lg p-3 overflow-hidden hover:shadow-md transition-shadow cursor-pointer z-10">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-label-sm text-label-sm text-on-error-container font-bold">Eleanor Vance</p>
                            <p className="font-caption-xs text-caption-xs text-on-error-container/80 flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" /> 09:00 - 09:45
                            </p>
                          </div>
                          <span className="bg-surface/50 text-status-error px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">
                            Urgent
                          </span>
                        </div>
                      </div>
                    )}
                    {idx === 2 && (
                      <div className="absolute top-4 left-2 right-4 h-[60%] bg-primary-container/30 border-l-4 border-primary rounded-r-lg p-3 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                        <p className="font-label-sm text-label-sm text-on-primary-container font-bold">Michael Chang</p>
                        <p className="font-caption-xs text-caption-xs text-on-primary-container/80 flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" /> 10:15 - 10:45
                        </p>
                      </div>
                    )}
                    
                    {/* Current Time Indicator Line (Dummy position) */}
                    {idx === 1 && (
                      <div className="absolute top-[40%] left-0 w-full h-[1px] bg-status-error z-20">
                        <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-status-error"></div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Medication Reminders & Alerts */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          <Card className="p-6">
            <h3 className="font-title-md text-title-md text-on-surface mb-4 flex items-center justify-between">
              Medication Refill Requests
              <span className="bg-status-warning/20 text-status-warning px-2 py-0.5 rounded-full font-caption-xs text-caption-xs">
                2 Pending
              </span>
            </h3>
            
            <div className="flex flex-col gap-4">
              <div className="border border-outline-variant rounded-lg p-4 bg-surface hover:border-primary/50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-label-sm text-label-sm text-on-surface font-bold">Lisinopril 10mg</h4>
                    <p className="font-caption-xs text-caption-xs text-primary flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3" /> Sarah Jenkins
                    </p>
                  </div>
                  <span className="text-[10px] text-secondary">2h ago</span>
                </div>
                <p className="font-caption-xs text-caption-xs text-on-surface-variant mb-3">Pharmacy: CVS #1234 (Downtown)</p>
                <div className="flex gap-2">
                  <Button className="flex-1 py-1.5 h-auto text-xs" variant="primary">Approve</Button>
                  <Button className="flex-1 py-1.5 h-auto text-xs text-status-error hover:bg-error-container" variant="ghost">Deny</Button>
                </div>
              </div>

              <div className="border border-outline-variant rounded-lg p-4 bg-surface hover:border-primary/50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-label-sm text-label-sm text-on-surface font-bold">Metformin 500mg</h4>
                    <p className="font-caption-xs text-caption-xs text-primary flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3" /> Robert Davis
                    </p>
                  </div>
                  <span className="text-[10px] text-secondary">Yesterday</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button className="flex-1 py-1.5 h-auto text-xs" variant="primary">Approve</Button>
                  <Button className="flex-1 py-1.5 h-auto text-xs text-status-error hover:bg-error-container" variant="ghost">Deny</Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
