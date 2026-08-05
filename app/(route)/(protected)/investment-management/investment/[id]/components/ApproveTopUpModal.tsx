"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, ShieldCheck, X } from "lucide-react";
import { previewPendingTopUpAction } from "@/actions/investment.action";

interface ApproveTopUpModalProps {
  isOpen: boolean;
  investmentId: number | string;
  accountNumber: string;
  amount: string | number;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: (totpCode: string) => void;
}

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// Approving is the single-step authorization to move the money (no separate Postings
// detour) — so before confirming, the checker gets the same current-vs-projected schedule
// comparison the requester saw, but read-only since the amount is already fixed
// (investment.pending_topup_amount).
export default function ApproveTopUpModal({
  isOpen,
  investmentId,
  accountNumber,
  amount,
  pending = false,
  onCancel,
  onConfirm,
}: ApproveTopUpModalProps) {
  const [preview, setPreview] = useState<Record<string, any> | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setTotpCode("");
      setPreview(null);
      setPreviewError(null);
      return;
    }

    let cancelled = false;

    (async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const result: any = await previewPendingTopUpAction(investmentId);
        if (cancelled) return;

        if (result?.status !== "success") {
          setPreview(null);
          setPreviewError(result?.message || "Unable to preview this top-up.");
          return;
        }

        setPreview(result.data);
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to preview pending top-up:", error);
        setPreview(null);
        setPreviewError("A network error occurred while computing the preview.");
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, investmentId]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Approve Top-Up</h2>
            <p className="mt-1 text-sm text-slate-500">
              This will move ₦{formatCurrency(amount)} into investment {accountNumber} and
              regenerate its remaining schedule. Review the effect below before confirming.
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
          {preview && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
              <span>₦{formatCurrency(preview.current_principal)}</span>
              <ArrowRight size={14} />
              <span>₦{formatCurrency(preview.new_principal)}</span>
              <span className="font-normal text-blue-700">new current principal</span>
            </div>
          )}

          {previewError && (
            <p className="mb-4 text-sm font-semibold text-red-600">{previewError}</p>
          )}

          {previewLoading && !preview ? (
            <p className="py-10 text-center text-sm font-medium text-slate-500">
              Computing preview...
            </p>
          ) : preview ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-bold text-slate-700">
                  Current Schedule{" "}
                  <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">
                    Before Top-Up
                  </span>
                </h3>
                <PreviewTable rows={preview.current_schedule} amountKey="expected_interest_amount" />
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  Current total interest to be earned: ₦{formatCurrency(preview.current_total_interest)}
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-bold text-slate-700">
                  Projected Schedule{" "}
                  <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                    After Top-Up
                  </span>
                </h3>
                <PreviewTable rows={preview.projected_schedule} amountKey="expected_interest_amount" />
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  Projected total interest: ₦{formatCurrency(preview.projected_total_interest)}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-slate-200 p-6">
          <label className="block">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <ShieldCheck size={15} className="text-slate-400" />
              Google Authenticator Code
            </span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={totpCode}
              onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit code"
              className="mt-2 w-40 rounded-xl border border-slate-300 bg-white p-2.5 text-center text-base tracking-[0.4em] text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
            />
          </label>

          <div className="flex gap-3">
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
            onClick={() => onConfirm(totpCode)}
            disabled={pending || totpCode.length !== 6}
            className="rounded-xl bg-[#173673] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#10295c] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Please wait..." : "Approve Top-Up"}
          </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PreviewTable({ rows, amountKey }: { rows: Record<string, any>[]; amountKey: string }) {
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
              <td className="px-3 py-2.5 text-sm text-slate-700">{formatDate(row.due_date)}</td>
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
