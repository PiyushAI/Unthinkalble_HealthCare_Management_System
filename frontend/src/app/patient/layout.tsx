import React from "react";
import { PatientNavbar } from "@/components/layout/PatientNavbar";

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background-subtle text-on-background font-body-md min-h-screen flex flex-col pt-16 pb-20 md:pb-0">
      <PatientNavbar />
      <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-6 md:py-8">
        {children}
      </main>
    </div>
  );
}
