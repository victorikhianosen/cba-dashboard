"use client";

import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmTone?: "danger" | "primary";
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

// Plain "are you sure?" dialog — no reason field, for actions that just need
// a deliberate second click (e.g. approving a posting).
export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  confirmTone = "primary",
  pending = false,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onCancel}
        className="fixed inset-0 bg-black/40"
      />

      <div className="relative w-full max-w-3xl rounded-2xl bg-white p-10 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
            {description && <p className="mt-3 text-lg text-slate-500">{description}</p>}
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onCancel}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mt-10 flex justify-end gap-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`rounded-xl px-6 py-3.5 text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
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
