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
import { useNotifications } from "@/lib/notifications";
import { resolveNotificationUrl } from "@/lib/notificationRouter";
import { usePermissions } from "@/lib/permissions";
import { getPageTitle } from "@/lib/pageTitle";
import { menuItems } from "./Sidebar";

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return date.toLocaleDateString();
}

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
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleNotificationClick(notification: (typeof notifications)[number]) {
    setNotificationsOpen(false);
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }
    const url = resolveNotificationUrl(notification.data.module, notification.data.subject_id);
    if (url) router.push(url);
  }

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
        <div className="relative">
          <button
            type="button"
            aria-label="View notifications"
            onClick={() => setNotificationsOpen((open) => !open)}
            className="relative rounded-lg p-2 text-slate-700 transition hover:bg-slate-100"
          >
            <Bell size={21} />

            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>

          {notificationsOpen && (
            <>
              <button
                type="button"
                aria-label="Close notifications"
                onClick={() => setNotificationsOpen(false)}
                className="fixed inset-0 z-30 cursor-default"
              />

              <div className="absolute right-0 top-[calc(100%+8px)] z-40 max-h-[42rem] w-[34rem] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <p className="text-base font-bold text-slate-900">Notifications</p>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => markAllAsRead()}
                      className="text-sm font-semibold text-[#29478f] hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <p className="px-5 py-12 text-center text-sm font-medium text-slate-400">
                    No notifications yet.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => handleNotificationClick(notification)}
                        className={`flex w-full flex-col items-start gap-1 px-5 py-4 text-left transition hover:bg-slate-50 ${
                          !notification.read_at ? "bg-blue-50/60" : ""
                        }`}
                      >
                        <span className="flex w-full items-center justify-between gap-2">
                          <span className="text-sm font-bold text-slate-900">{notification.data.title}</span>
                          {!notification.read_at && (
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#29478f]" />
                          )}
                        </span>
                        <span className="text-sm text-slate-600">{notification.data.body}</span>
                        <span className="mt-1 text-xs font-medium text-slate-400">
                          {formatRelativeTime(notification.created_at)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

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