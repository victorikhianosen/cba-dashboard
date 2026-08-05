"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ShieldCheck, X } from "lucide-react";

interface ReasonTotpConfirmModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmTone?: "danger" | "primary";
  pending?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string, totpCode: string) => void;
}

// Same step-up pattern as TotpConfirmModal, plus a required reason — used for
// money-releasing actions (e.g. releasing a lien) that need both an audit trail
// reason and the acting admin's current Google Authenticator code.
export default function ReasonTotpConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  confirmTone = "primary",
  pending = false,
  onCancel,
  onConfirm,
}: ReasonTotpConfirmModalProps) {
  const [reason, setReason] = useState("");
  const [code, setCode] = useState("");

  if (!isOpen || typeof document === "undefined") return null;

  function handleCancel() {
    setReason("");
    setCode("");
    onCancel();
  }

  function handleConfirm() {
    if (!reason.trim() || code.trim().length !== 6) return;
    onConfirm(reason.trim(), code.trim());
    setReason("");
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

      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
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
          <span className="block text-sm font-semibold text-slate-800">Reason</span>
          <textarea
            autoFocus
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Explain why..."
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
          />
        </label>

        <label className="mt-4 block">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
            <ShieldCheck size={15} className="text-slate-400" />
            Google Authenticator Code
          </span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6-digit code"
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-center text-lg tracking-[0.5em] text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
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
            disabled={pending || !reason.trim() || code.trim().length !== 6}
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
