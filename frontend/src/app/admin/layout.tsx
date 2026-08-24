import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background-subtle font-body-md text-on-surface antialiased min-h-screen flex">
      <Sidebar role="admin" />
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0 p-4 lg:p-8 h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
