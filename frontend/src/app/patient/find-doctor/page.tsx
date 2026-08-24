"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Search, Star, MapPin, Building, Calendar, ArrowRight } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { Doctor } from "@/types/api";

export default function FindDoctorPage() {
  const [specialization, setSpecialization] = useState("");
  const [location, setLocation] = useState(""); // Dummy state for UI
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function search(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setLoading(true);
    setHasSearched(true);
    try {
      const query = specialization ? `?specialization=${encodeURIComponent(specialization)}` : "";
      const results = await apiFetch<Doctor[]>(`/doctors${query}`);
      setDoctors(results || []);
    } catch (error) {
      console.error(error);
      // Fallback for dummy data if backend fails
      setDoctors([
        { id: "1", user: { id: "u1", name: "Dr. Sarah Jenkins", email: "sarah@example.com", role: "DOCTOR" }, specialization: "Endocrinology" },
        { id: "2", user: { id: "u2", name: "Dr. Marcus Webb", email: "marcus@example.com", role: "DOCTOR" }, specialization: "General Practice" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="mb-4">
        <Link href="/patient" className="text-primary hover:underline font-label-sm flex items-center gap-1 mb-4">
          &larr; Back to Dashboard
        </Link>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Find a Specialist</h1>
        <p className="font-body-md text-on-surface-variant mt-1">
          Search our network of top-rated healthcare professionals.
        </p>
      </div>

      <Card className="p-6 border-primary/20 bg-primary-fixed/30">
        <form onSubmit={search} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <Input
              id="specialization"
              label="Condition or Speciality"
              placeholder="e.g. Cardiology, Dr. Smith"
              icon={<Search className="w-5 h-5" />}
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
            />
          </div>
          <div className="flex-1 w-full">
            <Input
              id="location"
              label="Location or Zip Code"
              placeholder="e.g. 10001, Downtown"
              icon={<MapPin className="w-5 h-5" />}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full md:w-auto h-10 px-8">
            {loading ? "Searching..." : "Find"}
          </Button>
        </form>
      </Card>

      {hasSearched && !loading && doctors.length === 0 && (
        <div className="text-center py-10 bg-surface-container-low rounded-xl border border-dashed border-outline-variant">
          <p className="font-body-md text-on-surface-variant">No doctors found matching your criteria.</p>
        </div>
      )}

      {doctors.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {doctors.map((doctor) => (
            <Card key={doctor.id} className="p-5 flex flex-col md:flex-row gap-6 md:items-center justify-between hover:border-primary/50 transition-colors">
              <div className="flex gap-4 items-center">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-surface-variant flex-shrink-0">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${doctor.id}`}
                    alt={doctor.user.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-title-md text-title-md text-on-surface">{doctor.user.name}</h3>
                  <p className="font-body-md text-on-surface-variant text-primary font-medium">
                    {doctor.specialization}
                  </p>
                  <div className="flex items-center gap-4 mt-2 font-caption-xs text-caption-xs text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-status-warning fill-status-warning" />
                      4.9 (128 reviews)
                    </span>
                    <span className="flex items-center gap-1">
                      <Building className="w-3.5 h-3.5" />
                      Main Hospital
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 min-w-[200px]">
                <Link href={`/patient/book/${doctor.id}`} className="w-full">
                  <Button fullWidth>
                    <Calendar className="w-4 h-4 mr-2" />
                    Book Visit
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
