"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import MoneyInput from "@/components/MoneyInput";
import ScheduleComparisonTables from "@/components/ScheduleComparisonTables";
import { previewPartialLiquidationForInvestmentAction } from "@/actions/investment.action";

interface RequestPartialLiquidationModalProps {
  isOpen: boolean;
  investmentId: number | string;
  accountNumber: string;
  currentPrincipal: string | number;
  minimumRetentionPercentage?: string | number | null;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: (amount: string, reason: string) => void;
}

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Withdraws part (not all) of current_principal from an active investment early. Unlike
// Terminate (full payout, single step), this is maker-checker — a different admin must
// approve with a TOTP code before the money moves. The 0 < amount < current_principal
// guard mirrors the backend's InvestmentPartialLiquidationService::request() check —
// full amount is what Terminate is for.
//
// As the maker types an amount, a debounced call to previewPartialLiquidationForInvestmentAction
// shows the current schedule alongside what it would look like post-liquidation — the same
// preview a checker later sees on approval, just computed ahead of submission.
export default function RequestPartialLiquidationModal({
  isOpen,
  investmentId,
  accountNumber,
  currentPrincipal,
  minimumRetentionPercentage,
  pending = false,
  onCancel,
  onConfirm,
}: RequestPartialLiquidationModalProps) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<Record<string, any> | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setAmount("");
      setReason("");
      setPreview(null);
    }
  }, [isOpen]);

  const principal = Number(currentPrincipal ?? 0);
  const numericAmount = Number(amount || 0);
  const isValidAmount = amount !== "" && numericAmount > 0 && numericAmount < principal;

  useEffect(() => {
    if (!isOpen) return;

    // Always fetch (even with no/invalid amount) so "Current Schedule" shows immediately;
    // the backend returns projected: null for an amount that isn't a valid liquidation yet.
    let cancelled = false;
    const timeout = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const result: any = await previewPartialLiquidationForInvestmentAction(
          investmentId,
          isValidAmount ? amount : "0"
        );
        if (cancelled) return;
        if (result?.status === "success") {
          setPreview(result.data);
        }
      } catch (error) {
        if (!cancelled) console.error("Failed to preview schedule:", error);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, investmentId, amount, isValidAmount]);

  if (!isOpen || typeof document === "undefined") return null;

  // Only shown when both fields are actually present on the investment payload this modal
  // already receives — no extra fetch. Mirrors the backend's
  // InvestmentPartialLiquidationService::request() retention-guard formula so the maker
  // sees the cap before submitting; the backend remains the source of truth either way.
  const hasRetentionData =
    currentPrincipal !== null &&
    currentPrincipal !== undefined &&
    minimumRetentionPercentage !== null &&
    minimumRetentionPercentage !== undefined;
  const retentionPercentage = Number(minimumRetentionPercentage ?? 0);
  const maxLiquidatable = hasRetentionData
    ? principal - (principal * retentionPercentage) / 100
    : null;

  function handleConfirm() {
    if (!isValidAmount || !reason.trim()) return;
    onConfirm(amount, reason.trim());
  }

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Request Partial Liquidation</h2>
            <p className="mt-1 text-sm text-slate-500">
              Request an early, partial withdrawal from investment {accountNumber}. A different
              admin must approve this with a Google Authenticator code before the money moves.
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

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            Current Principal: ₦{formatCurrency(principal)}
          </div>

          <MoneyInput
            label="Liquidation Amount"
            name="amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="e.g. 50,000"
          />

          {maxLiquidatable !== null && (
            <p className="text-xs font-semibold text-slate-500">
              Maximum liquidatable amount: ₦{formatCurrency(maxLiquidatable)} (this investment
              must retain at least {retentionPercentage}% of its current principal).
            </p>
          )}

          {amount !== "" && !isValidAmount && (
            <p className="text-sm font-semibold text-red-600">
              Amount must be greater than 0 and less than the current principal (₦
              {formatCurrency(principal)}). To withdraw the full amount, use Terminate instead.
            </p>
          )}

          <label className="block">
            <span className="block text-sm font-bold text-slate-800">Reason</span>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. Customer requested partial early withdrawal"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition resize-none"
            />
          </label>

          <div>
            <h3 className="mb-2 text-sm font-bold text-slate-700">Schedule Impact</h3>
            {previewLoading && !preview ? (
              <p className="py-6 text-center text-sm font-medium text-slate-500">
                Computing preview...
              </p>
            ) : (
              <ScheduleComparisonTables
                current={preview?.current}
                projected={preview?.projected}
                projectedEmptyHint={
                  isValidAmount
                    ? "No installments."
                    : "Enter a valid amount above to see the projected schedule."
                }
              />
            )}
          </div>
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
            disabled={pending || !isValidAmount || !reason.trim()}
            className="rounded-xl bg-[#173673] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#10295c] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Please wait..." : "Request Partial Liquidation"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
