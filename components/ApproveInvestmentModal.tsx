"use client";

import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ApproveInvestmentModalProps {
  isOpen: boolean;
  mode: "approve" | "reject";
  accountNumber: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  // Overrides the default "Approve/Reject Investment" copy — used for related but distinct
  // confirmations (e.g. approving a top-up) that share this same confirm/cancel chrome.
  title?: string;
  description?: string;
}

// Confirms an approve/reject action on a pending investment. Unlike account
// approval, the investment approve/reject endpoints take no body — everything
// needed (product, source account, principal, posting period) was already
// supplied when the investment was opened — so this is a plain confirmation.
export default function ApproveInvestmentModal({
  isOpen,
  mode,
  accountNumber,
  pending = false,
  onCancel,
  onConfirm,
  title,
  description,
}: ApproveInvestmentModalProps) {
  if (!isOpen || typeof document === "undefined") return null;

  const isApprove = mode === "approve";

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onCancel}
        className="fixed inset-0 bg-black/40"
      />

      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {title ?? (isApprove ? "Approve Investment" : "Reject Investment")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {description ??
                (isApprove
                  ? `This will approve and activate investment ${accountNumber}.`
                  : `This will reject investment ${accountNumber}. This cannot be undone.`)}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isApprove ? "bg-[#173673] hover:bg-[#10295c]" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {pending ? "Please wait..." : (title ?? (isApprove ? "Approve Investment" : "Reject Investment"))}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
