"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ShieldCheck } from "lucide-react";
import {
  getSettingLockConfigAction,
  lockSessionAction,
  unlockSessionAction,
} from "@/actions/auth.action";
import { usePermissions } from "@/lib/permissions";

const ACTIVITY_EVENTS = [
  "mousemove",
  "keydown",
  "click",
  "scroll",
  "touchstart",
] as const;

// Idle re-authentication — distinct from SessionGuard's hard logout-on-expiry.
// This never navigates or unmounts `children`: it just overlays the current
// page (whatever form state is on it stays exactly as-is underneath) until the
// user re-enters their Google Authenticator code.
//
// This only ever needs to handle the "already on the page, went idle" case — the
// idle timer fires client-side, the page never re-renders, so there's nothing to flash.
// A reload or fresh navigation while locked is handled entirely server-side by
// middleware.ts (via the banq_session_locked cookie), which rewrites to /session-locked
// before this component (or the real page) ever mounts — so no client-side "is the
// session still locked" restore check is needed here either.
export default function SessionLock() {
  const { currentUser } = usePermissions();

  const [enabled, setEnabled] = useState(false);
  const [timeoutSeconds, setTimeoutSeconds] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockedRef = useRef(false);

  // Keep a ref in sync so the activity listeners (attached once) can read the
  // latest locked state without needing to re-attach on every change.
  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  // 1. Fetch the lock config on mount.
  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      const result: any = await getSettingLockConfigAction();
      if (cancelled) return;

      if (result?.status === "success" && result?.data) {
        setEnabled(Boolean(result.data.enabled));
        setTimeoutSeconds(Number(result.data.timeout_seconds) || null);
      }
    }

    loadConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  // 2 & 3. Attach idle listeners once config says it's enabled; lock on timeout.
  useEffect(() => {
    if (!enabled || !timeoutSeconds) return;

    async function triggerLock() {
      if (lockedRef.current) return;
      await lockSessionAction();
      setLocked(true);
    }

    function resetTimer() {
      if (lockedRef.current) return;
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(
        triggerLock,
        (timeoutSeconds as number) * 1000,
      );
    }

    resetTimer();

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, resetTimer);
    });

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, resetTimer);
      });
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [enabled, timeoutSeconds]);

  function restartIdleTimer() {
    if (!enabled || !timeoutSeconds) return;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(async () => {
      if (lockedRef.current) return;
      await lockSessionAction();
      setLocked(true);
    }, timeoutSeconds * 1000);
  }

  async function handleUnlock() {
    if (code.trim().length !== 6) return;

    setSubmitting(true);
    setError("");

    const result: any = await unlockSessionAction(code.trim());

    if (result?.status === "success") {
      setLocked(false);
      setCode("");
      setError("");
      restartIdleTimer();
    } else {
      const fieldError = result?.errors?.code?.[0];
      setError(
        fieldError || result?.message || "Invalid code. Please try again.",
      );
    }

    setSubmitting(false);
  }

  if (!locked || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#0b1426]/90 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-2xl bg-white p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <img
            src="/logo.png"
            alt="BanQ Pro Logo"
            className="h-16 w-auto object-contain"
          />

          <h2 className="mt-4 text-lg font-bold text-slate-900">
            Session Locked
          </h2>
          {(currentUser?.first_name || currentUser?.username) && (
            <p className="mt-1 text-sm text-slate-500">
              Welcome back,{" "}
              <span className="font-semibold text-slate-700">
                {currentUser?.first_name
                  ? `${currentUser.first_name} ${currentUser.last_name ?? ""}`.trim()
                  : currentUser?.username}
              </span>
            </p>
          )}
          <p className="mt-1 text-sm text-slate-500">
            Enter your Google Authenticator code to continue.
          </p>
        </div>

        <label className="mt-6 block">
          <span className="flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-800">
            <ShieldCheck size={15} className="text-slate-400" />
            Google Authenticator Code
          </span>
          <input
            autoFocus
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleUnlock();
            }}
            placeholder="6-digit code"
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-4 text-center text-2xl tracking-[0.5em] text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
          />
          {error && (
            <p className="mt-2 text-center text-sm text-red-600">{error}</p>
          )}
        </label>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={handleUnlock}
            disabled={submitting || code.trim().length !== 6}
            className="rounded-xl bg-[#173673] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#10295c] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Unlocking..." : "Unlock"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
