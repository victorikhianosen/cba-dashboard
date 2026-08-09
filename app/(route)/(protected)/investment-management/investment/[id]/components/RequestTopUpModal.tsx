"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, X } from "lucide-react";
import MoneyInput from "@/components/MoneyInput";
import { previewTopUpAction } from "@/actions/investment.action";

interface RequestTopUpModalProps {
  isOpen: boolean;
  investmentId: number | string;
  accountNumber: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: (amount: string) => void;
}

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

// Only stages the request — no money moves here. A different admin has to approve it
// before it's actually applied (see InvestmentDetail's Approve Top-Up button). Shows the
// current schedule next to the projected post-top-up schedule so the effect is visible
// before anyone commits to the request.
export default function RequestTopUpModal({
  isOpen,
  investmentId,
  accountNumber,
  pending = false,
  onCancel,
  onConfirm,
}: RequestTopUpModalProps) {
  const [amount, setAmount] = useState("");
  const [preview, setPreview] = useState<Record<string, any> | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setAmount("");
      setPreview(null);
      setPreviewError(null);
    }
  }, [isOpen]);

  // Debounced auto-preview, same pattern as the booking form's schedule preview — fires
  // whenever a valid amount is entered, read-only.
  useEffect(() => {
    if (!isOpen || !amount || Number(amount) <= 0) {
      setPreview(null);
      setPreviewError(null);
      return;
    }

    const timeout = setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      const result: any = await previewTopUpAction(investmentId, amount);

      if (result?.status !== "success") {
        setPreview(null);
        setPreviewError(result?.message || "Unable to preview this top-up.");
        return;
      }

      setPreview(result.data);

      setPreviewLoading(false);
    }, 450);

    return () => clearTimeout(timeout);
  }, [isOpen, amount, investmentId]);

  if (!isOpen || typeof document === "undefined") return null;

  function handleConfirm() {
    if (!amount || Number(amount) <= 0) return;
    onConfirm(amount);
  }

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Top Up Investment
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Request additional principal for investment {accountNumber}. A
              different admin must approve this before the money moves.
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

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-xs">
            <MoneyInput
              label="Top-Up Amount"
              name="amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="e.g. 50,000"
            />
          </div>

          {preview && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
              <span>₦{formatCurrency(preview.current_principal)}</span>
              <ArrowRight size={14} />
              <span>₦{formatCurrency(preview.new_principal)}</span>
              <span className="font-normal text-blue-700">
                new current principal
              </span>
            </div>
          )}

          {previewError && (
            <p className="mt-4 text-sm font-semibold text-red-600">
              {previewError}
            </p>
          )}

          {!amount || Number(amount) <= 0 ? (
            <p className="mt-6 py-10 text-center text-sm font-medium text-slate-400">
              Enter a top-up amount to see the current schedule alongside the
              projected schedule after the top-up.
            </p>
          ) : previewLoading && !preview ? (
            <p className="mt-6 py-10 text-center text-sm font-medium text-slate-500">
              Computing preview...
            </p>
          ) : preview ? (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-bold text-slate-700">
                  Current Schedule{" "}
                  <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">
                    Before Top-Up
                  </span>
                </h3>
                <PreviewTable
                  rows={preview.current_schedule}
                  amountKey="expected_interest_amount"
                />
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  Current total interest to be earned: ₦
                  {formatCurrency(preview.current_total_interest)}
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-bold text-slate-700">
                  Projected Schedule{" "}
                  <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                    After Top-Up
                  </span>
                </h3>
                <PreviewTable
                  rows={preview.projected_schedule}
                  amountKey="expected_interest_amount"
                />
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  Projected total interest: ₦
                  {formatCurrency(preview.projected_total_interest)}
                </p>
              </div>
            </div>
          ) : null}
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
            disabled={pending || !amount || Number(amount) <= 0}
            className="rounded-xl bg-[#173673] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#10295c] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Please wait..." : "Request Top Up"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function PreviewTable({
  rows,
  amountKey,
}: {
  rows: Record<string, any>[];
  amountKey: string;
}) {
  if (!rows || rows.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 py-8 text-center text-sm font-medium text-slate-400">
        No installments.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
              #
            </th>
            <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
              Due Date
            </th>
            <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
              Interest
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={row.id ?? index}>
              <td className="px-3 py-2.5 text-sm font-semibold text-slate-700">
                {row.installment_number}
              </td>
              <td className="px-3 py-2.5 text-sm text-slate-700">
                {formatDate(row.due_date)}
              </td>
              <td className="px-3 py-2.5 text-sm font-bold text-slate-900">
                ₦{formatCurrency(row[amountKey])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
