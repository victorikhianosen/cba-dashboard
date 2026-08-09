"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { unlockSessionAction } from "@/actions/auth.action";

interface SessionLockedScreenProps {
  currentUser: Record<string, any> | null;
}

// The page middleware.ts rewrites every protected route to while banq_session_locked is
// set. Same visual language as SessionLock.tsx's in-place overlay (that one handles the
// idle-timeout-while-already-on-the-page case, which never needed a server round trip and
// so was never at risk of flashing anything) — this one exists purely to give reload/fresh
// navigation the same lock screen instead of a flash of the real page underneath.
export default function SessionLockedScreen({
  currentUser,
}: SessionLockedScreenProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleUnlock() {
    if (code.trim().length !== 6) return;

    setSubmitting(true);
    setError("");

    const result: any = await unlockSessionAction(code.trim());

    if (result?.status === "success") {
      // The URL never changed (middleware rewrites, it doesn't redirect) — refreshing
      // just re-requests it now that the cookie is gone, so middleware lets the real
      // page render this time. Whatever page the user was "on" the whole time.
      router.refresh();
    } else {
      const fieldError = result?.errors?.code?.[0];
      setError(
        fieldError || result?.message || "Invalid code. Please try again.",
      );
    }
    setSubmitting(false);
  }

  const displayName = currentUser?.first_name
    ? `${currentUser.first_name} ${currentUser.last_name ?? ""}`.trim()
    : currentUser?.username;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b1426] p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <img
            src="/logo.png"
            alt="BanQ Pro Logo"
            className="h-16 w-auto object-contain"
          />

          <h2 className="mt-4 text-lg font-bold text-slate-900">
            Session Locked
          </h2>
          {displayName && (
            <p className="mt-1 text-sm text-slate-500">
              Welcome back,{" "}
              <span className="font-semibold text-slate-700">
                {displayName}
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
    </div>
  );
}
