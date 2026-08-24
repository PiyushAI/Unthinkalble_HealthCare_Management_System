"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Bell, HelpCircle, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const PatientNavbar = () => {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  const navLinks = [
    { href: "/patient", label: "Dashboard" },
    { href: "/patient/schedules", label: "Schedules" },
    { href: "/patient/records", label: "Records" },
    { href: "/patient/settings", label: "Settings" },
  ];

  return (
    <>
      {/* Desktop NavBar */}
      <header className="hidden md:flex bg-surface shadow-sm fixed top-0 w-full z-50 border-b border-outline-variant">
        <div className="flex justify-between items-center px-margin-desktop w-full max-w-container-max mx-auto h-16">
          <div className="flex items-center gap-6 h-full">
            {/* Brand */}
            <Link href="/patient" className="font-headline-lg text-headline-lg font-bold text-primary flex items-center gap-2">
              <Activity className="w-8 h-8" />
              MedPrecision
            </Link>

            {/* Navigation Links */}
            <nav className="flex items-center gap-4 ml-8 h-full">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`h-16 flex items-center px-2 font-label-sm text-label-sm transition-colors ${
                      isActive
                        ? "text-primary font-bold border-b-2 border-primary"
                        : "text-secondary font-medium hover:text-primary"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-on-surface-variant font-medium hidden sm:inline">
              {profile?.name || "Patient"}
            </span>
            <button
              onClick={() => signOut()}
              className="text-xs text-secondary hover:text-status-error font-medium px-3 py-1.5 rounded-lg border border-outline-variant hover:border-error-container transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Top Header */}
      <header className="md:hidden bg-surface shadow-sm fixed top-0 w-full z-40 h-16 flex items-center px-margin-mobile justify-between border-b border-outline-variant">
        <Link href="/patient" className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-primary flex items-center gap-2">
          <Activity className="w-6 h-6" />
          MedPrecision
        </Link>
        <div className="flex items-center gap-3">
          <button onClick={() => signOut()} className="text-xs text-secondary hover:text-status-error">
            Sign Out
          </button>
        </div>
      </header>
    </>
  );
};
