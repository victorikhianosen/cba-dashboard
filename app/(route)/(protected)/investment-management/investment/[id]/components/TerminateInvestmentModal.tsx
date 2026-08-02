"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface TerminateInvestmentModalProps {
  isOpen: boolean;
  accountNumber: string;
  currentPrincipal: string | number;
  penaltyRate?: string | number | null;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Only an active investment can be terminated (enforced server-side too). Returns the full
// current principal to the customer's source account, then claws back an early-liquidation
// penalty as a separate charge if the product has one configured — this modal previews
// that math so the approver isn't guessing what the customer will actually net.
export default function TerminateInvestmentModal({
  isOpen,
  accountNumber,
  currentPrincipal,
  penaltyRate,
  pending = false,
  onCancel,
  onConfirm,
}: TerminateInvestmentModalProps) {
  const [reason, setReason] = useState("");

  if (!isOpen || typeof document === "undefined") return null;

  const rate = Number(penaltyRate ?? 0);
  const principal = Number(currentPrincipal ?? 0);
  const penaltyAmount = rate > 0 ? (principal * rate) / 100 : 0;
  const netAmount = principal - penaltyAmount;

  function handleConfirm() {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  }

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Terminate Investment</h2>
            <p className="mt-1 text-sm text-slate-500">
              This will end investment {accountNumber} immediately and cannot be undone.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
            <div className="flex justify-between font-semibold text-slate-700">
              <span>Current Principal</span>
              <span>₦{formatCurrency(principal)}</span>
            </div>
            {rate > 0 && (
              <div className="mt-1.5 flex justify-between font-semibold text-red-700">
                <span>Early Liquidation Penalty ({rate}%)</span>
                <span>−₦{formatCurrency(penaltyAmount)}</span>
              </div>
            )}
            <div className="mt-1.5 flex justify-between border-t border-amber-200 pt-1.5 font-bold text-slate-900">
              <span>Customer Receives</span>
              <span>₦{formatCurrency(netAmount)}</span>
            </div>
          </div>

          <label className="block">
            <span className="block text-sm font-bold text-slate-800">Reason for Termination</span>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. Customer requested early exit"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition resize-none"
            />
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 p-6">
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
            onClick={handleConfirm}
            disabled={pending || !reason.trim()}
            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Please wait..." : "Terminate Investment"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
