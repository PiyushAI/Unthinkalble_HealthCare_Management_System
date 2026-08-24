"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Activity, 
  Users, 
  Calendar, 
  FileText, 
  PieChart, 
  HelpCircle, 
  LogOut,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";

interface SidebarProps {
  role: "doctor" | "admin";
}

export const Sidebar = ({ role }: SidebarProps) => {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();

  const doctorLinks = [
    { href: "/doctor", label: "Dashboard", icon: <Activity className="w-5 h-5" /> },
    { href: "/doctor/patients", label: "Patients", icon: <Users className="w-5 h-5" /> },
    { href: "/doctor/schedule", label: "Calendar", icon: <Calendar className="w-5 h-5" /> },
    { href: "/doctor/records", label: "Records", icon: <FileText className="w-5 h-5" /> },
    { href: "/doctor/analytics", label: "Analytics", icon: <PieChart className="w-5 h-5" /> },
  ];

  const adminLinks = [
    { href: "/admin", label: "Dashboard", icon: <Activity className="w-5 h-5" /> },
    { href: "/admin/doctors", label: "Manage Doctors", icon: <Users className="w-5 h-5" /> },
    { href: "/admin/analytics", label: "System Analytics", icon: <PieChart className="w-5 h-5" /> },
  ];

  const links = role === "doctor" ? doctorLinks : adminLinks;

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden lg:flex flex-col h-screen p-4 gap-2 bg-surface-container-low border-r border-outline-variant w-64 fixed left-0 top-0 z-40">
        
        {/* Header User Profile */}
        <div className="flex items-center gap-3 px-2 py-4 mb-4">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-variant flex-shrink-0">
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${role}`} 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h2 className="font-title-md text-title-md text-on-surface truncate max-w-[150px]">{profile?.name || (role === "doctor" ? "Dr. Staff" : "System Admin")}</h2>
            <p className="font-caption-xs text-caption-xs text-on-surface-variant capitalize">{role === "doctor" ? "Medical Provider" : "System Admin"}</p>
          </div>
        </div>

        {/* CTA */}
        {role === "doctor" && (
          <Button fullWidth className="mb-4">
            <Plus className="w-5 h-5 mr-2" />
            New Appointment
          </Button>
        )}

        {/* Navigation Links */}
        <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
          {links.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-all font-label-sm text-label-sm group ${
                  isActive 
                    ? "bg-primary-container text-on-primary-container" 
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Footer Links */}
        <div className="flex flex-col gap-1 mt-auto pt-4 border-t border-outline-variant">
          <Link href="#" className="flex items-center gap-3 text-on-surface-variant hover:bg-surface-container-high rounded-lg px-4 py-3 transition-all font-label-sm text-label-sm">
            <HelpCircle className="w-5 h-5" />
            Support
          </Link>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 text-on-surface-variant hover:text-status-error hover:bg-surface-container-high rounded-lg px-4 py-3 transition-all font-label-sm text-label-sm w-full text-left"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </nav>

      {/* Mobile TopNav */}
      <nav className="lg:hidden flex justify-between items-center px-margin-mobile w-full bg-surface shadow-sm h-16 fixed top-0 left-0 z-40 border-b border-outline-variant">
        <div className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-primary flex items-center gap-2">
          <Activity className="w-6 h-6" />
          MedPrecision
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-variant border border-outline-variant flex-shrink-0">
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${role}`} 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </nav>
    </>
  );
};
