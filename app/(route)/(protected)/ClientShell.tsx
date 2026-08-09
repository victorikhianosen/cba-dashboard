"use client";

import { useState, type ReactNode } from "react";

import { NotificationsProvider } from "@/lib/notifications";
import Navbar from "./Navbar";
import SessionGuard from "./SessionGuard";
import SessionLock from "./SessionLock";
import Sidebar from "./Sidebar";

interface ClientShellProps {
  children: ReactNode;
}

export default function ClientShell({ children }: ClientShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <NotificationsProvider>
      <div className="min-h-screen bg-[#f7f9fc]">
        <SessionGuard />
        <SessionLock />

        {/* SIDEBAR */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* NAVBAR AND PAGE */}
        <div className="min-h-screen lg:pl-[280px]">
          <Navbar onOpenSidebar={() => setSidebarOpen(true)} />

          {/* PAGE CONTENT */}
          <main className="min-h-[calc(100vh-74px)] p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </NotificationsProvider>
  );
}
