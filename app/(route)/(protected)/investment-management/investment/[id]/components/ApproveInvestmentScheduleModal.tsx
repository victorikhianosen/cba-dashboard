"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ShieldCheck, X } from "lucide-react";
import { previewInvestmentApprovalAction } from "@/actions/investment.action";

interface ApproveInvestmentScheduleModalProps {
  isOpen: boolean;
  investmentId: number | string;
  accountNumber: string;
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

// Approving is the single-step authorization to fund the investment (no separate Postings
// detour) — so before confirming, the approver gets to see the interest schedule that will
// actually be generated, computed from the investment's own locked-in terms.
export default function ApproveInvestmentScheduleModal({
  isOpen,
  investmentId,
  accountNumber,
  pending = false,
  onCancel,
  onConfirm,
}: ApproveInvestmentScheduleModalProps) {
  const [preview, setPreview] = useState<Record<string, any> | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setPreview(null);
      setPreviewError(null);
      setTotpCode("");
      return;
    }

    let cancelled = false;

    (async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const result: any = await previewInvestmentApprovalAction(investmentId);
        if (cancelled) return;

        if (result?.status !== "success") {
          setPreview(null);
          setPreviewError(result?.message || "Unable to preview the schedule.");
          return;
        }

        setPreview(result.data);
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to preview investment approval:", error);
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
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Approve Investment</h2>
            <p className="mt-1 text-sm text-slate-500">
              This will approve and fund investment {accountNumber}. Review the interest
              schedule it will generate before confirming.
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
          {previewError && (
            <p className="mb-4 text-sm font-semibold text-red-600">{previewError}</p>
          )}

          {previewLoading && !preview ? (
            <p className="py-10 text-center text-sm font-medium text-slate-500">
              Computing schedule...
            </p>
          ) : preview ? (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
                <span>Maturity Date: {formatDate(preview.maturity_date)}</span>
                <span>Total Projected Interest: ₦{formatCurrency(preview.total_interest)}</span>
              </div>

              {preview.installments?.length ? (
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
                      {preview.installments.map((row: Record<string, any>, index: number) => (
                        <tr key={index}>
                          <td className="px-3 py-2.5 text-sm font-semibold text-slate-700">
                            {row.installment_number}
                          </td>
                          <td className="px-3 py-2.5 text-sm text-slate-700">
                            {formatDate(row.due_date)}
                          </td>
                          <td className="px-3 py-2.5 text-sm font-bold text-slate-900">
                            ₦{formatCurrency(row.expected_interest_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-xl border border-slate-200 bg-slate-50 py-8 text-center text-sm font-medium text-slate-400">
                  No installments.
                </p>
              )}
            </>
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
              {pending ? "Please wait..." : "Approve Investment"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
