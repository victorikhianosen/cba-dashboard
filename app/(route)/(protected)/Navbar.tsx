"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";

import {
  Bell,
  LogOut,
  Menu,
  Settings,
  UserRound,
} from "lucide-react";
import { logoutAction } from "@/actions/auth.action";
import { usePermissions } from "@/lib/permissions";
import { getPageTitle } from "@/lib/pageTitle";
import { menuItems } from "./Sidebar";

interface NavbarProps {
  onOpenSidebar: () => void;
}

// Turns "super_admin" into "Super Admin" for display.
function formatRoleName(name: string) {
  return (name ?? "")
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function Navbar({
  onOpenSidebar,
}: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, roles } = usePermissions();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const pageTitle = getPageTitle(pathname, menuItems);

  const displayName = currentUser
    ? [currentUser.first_name, currentUser.last_name].filter(Boolean).join(" ") ||
      currentUser.username
    : "Admin User";
  const displayRole = roles[0] ? formatRoleName(roles[0]) : "Administrator";

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutAction();
      setMenuOpen(false);
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Failed to log out:", error);
      toast.error("Unable to log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-[74px] items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
      {/* LEFT SECTION */}
      <div className="flex items-center gap-3">
        {/* MOBILE MENU BUTTON */}
        <button
          type="button"
          aria-label="Open sidebar"
          onClick={onOpenSidebar}
          className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 lg:hidden"
        >
          <Menu size={21} />
        </button>

        {/* CURRENT PAGE TITLE */}
        <h1 className="truncate text-lg font-bold text-slate-900">{pageTitle}</h1>
      </div>

      {/* RIGHT SECTION */}
      <div className="flex items-center gap-3 md:gap-5">
        {/* NOTIFICATIONS */}
        <button
          type="button"
          aria-label="View notifications"
          className="relative rounded-lg p-2 text-slate-700 transition hover:bg-slate-100"
        >
          <Bell size={21} />

          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        {/* USER PROFILE */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center gap-3 rounded-xl border border-slate-200 px-2 py-2 transition hover:bg-slate-50 sm:px-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#173673] text-white">
              <UserRound size={19} />
            </div>

            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold text-slate-900">
                {displayName}
              </p>

              <p className="text-[11px] text-slate-500">
                {displayRole}
              </p>
            </div>
          </button>

          {menuOpen && (
            <>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-30 cursor-default"
              />

              <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                >
                  <Settings size={16} />
                  Settings
                </Link>

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LogOut size={16} />
                  {loggingOut ? "Logging out..." : "Logout"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}