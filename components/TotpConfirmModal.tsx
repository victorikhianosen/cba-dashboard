"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ShieldCheck, X } from "lucide-react";

interface TotpConfirmModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmTone?: "danger" | "primary";
  pending?: boolean;
  onCancel: () => void;
  onConfirm: (totpCode: string) => void;
}

// Step-up confirmation for money-moving approvals — same chrome as ConfirmModal, plus a
// required 6-digit Google Authenticator code. The code is verified server-side (against
// the acting admin's own google2fa_secret) by the `totp` route middleware; this modal
// just collects it and resets on close so a stale code never lingers between actions.
export default function TotpConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  confirmTone = "primary",
  pending = false,
  onCancel,
  onConfirm,
}: TotpConfirmModalProps) {
  const [code, setCode] = useState("");

  if (!isOpen || typeof document === "undefined") return null;

  function handleCancel() {
    setCode("");
    onCancel();
  }

  function handleConfirm() {
    if (code.trim().length !== 6) return;
    onConfirm(code.trim());
    setCode("");
  }

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={handleCancel}
        className="fixed inset-0 bg-black/40"
      />

      <div className="relative w-full max-w-xl rounded-2xl bg-white p-8 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={handleCancel}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <label className="mt-5 block">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            <ShieldCheck size={15} className="text-slate-400" />
            Google Authenticator Code
          </span>
          <input
            autoFocus
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6-digit code"
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-4 text-center text-2xl tracking-[0.5em] text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
          />
        </label>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={pending}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending || code.trim().length !== 6}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
              confirmTone === "danger"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#173673] hover:bg-[#10295c]"
            }`}
          >
            {pending ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
