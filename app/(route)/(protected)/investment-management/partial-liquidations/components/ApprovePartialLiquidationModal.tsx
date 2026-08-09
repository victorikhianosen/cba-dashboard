"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ShieldCheck, X } from "lucide-react";
import ScheduleComparisonTables from "@/components/ScheduleComparisonTables";
import { previewPartialLiquidationScheduleAction } from "@/actions/investment.action";

type Liquidation = Record<string, any>;

interface ApprovePartialLiquidationModalProps {
  isOpen: boolean;
  liquidation: Liquidation | null;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: (totpCode: string) => void;
}

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Step = "review" | "totp";

// Two standalone steps, not one combined screen: (1) review the current-vs-projected
// schedule impact, then (2) — only after clicking Next — a dedicated TOTP entry screen.
// Keeping them separate means the checker can't rush past the schedule review to enter a
// code, and the TOTP screen isn't cluttered by two wide comparison tables above it.
export default function ApprovePartialLiquidationModal({
  isOpen,
  liquidation,
  pending = false,
  onCancel,
  onConfirm,
}: ApprovePartialLiquidationModalProps) {
  const [step, setStep] = useState<Step>("review");
  const [preview, setPreview] = useState<Record<string, any> | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");

  useEffect(() => {
    if (!isOpen || !liquidation) {
      setStep("review");
      setTotpCode("");
      setPreview(null);
      setPreviewError(null);
      return;
    }

    let cancelled = false;

    (async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      const result: any = await previewPartialLiquidationScheduleAction(
        liquidation.id,
      );
      if (cancelled) return;

      if (result?.status !== "success") {
        setPreview(null);
        setPreviewError(
          result?.message || "Unable to preview this liquidation's schedule.",
        );
        return;
      }

      setPreview(result.data);

      if (!cancelled) setPreviewLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, liquidation]);

  if (!isOpen || !liquidation || typeof document === "undefined") return null;

  const accountNumber =
    liquidation.investment?.account_number ?? liquidation.reference;

  function handleCancel() {
    setStep("review");
    setTotpCode("");
    onCancel();
  }

  function handleConfirm() {
    if (totpCode.trim().length !== 6) return;
    onConfirm(totpCode.trim());
  }

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 p-4">
      <div
        className={`flex max-h-[90vh] w-full flex-col rounded-2xl bg-white shadow-2xl transition-[max-width] ${
          step === "review" ? "max-w-5xl" : "max-w-md"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {step === "review"
                ? "Approve Partial Liquidation"
                : "Confirm with Google Authenticator"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {step === "review"
                ? `This will pay out ₦${formatCurrency(liquidation.amount)} from investment ${accountNumber} and regenerate its remaining schedule. Review the effect below before continuing.`
                : `Enter your 6-digit Google Authenticator code to approve this ₦${formatCurrency(liquidation.amount)} liquidation for investment ${accountNumber}.`}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={handleCancel}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {step === "review" ? (
          <>
            <div className="flex-1 overflow-y-auto p-6">
              {previewError && (
                <p className="mb-4 text-sm font-semibold text-red-600">
                  {previewError}
                </p>
              )}

              {previewLoading && !preview ? (
                <p className="py-10 text-center text-sm font-medium text-slate-500">
                  Computing preview...
                </p>
              ) : preview ? (
                <ScheduleComparisonTables
                  current={preview.current}
                  projected={preview.projected}
                />
              ) : null}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 p-6">
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
                onClick={() => setStep("totp")}
                disabled={previewLoading || !preview}
                className="rounded-xl bg-[#173673] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#10295c] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#173673]/10">
                <ShieldCheck size={26} className="text-[#173673]" />
              </div>
              <label className="block text-center">
                <span className="flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-800">
                  Google Authenticator Code
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  value={totpCode}
                  onChange={(event) =>
                    setTotpCode(
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  placeholder="6-digit code"
                  className="mt-3 w-48 rounded-xl border border-slate-300 bg-white p-3 text-center text-lg tracking-[0.5em] text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
                />
              </label>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-slate-200 p-6">
              <button
                type="button"
                onClick={() => setStep("review")}
                disabled={pending}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                <ArrowLeft size={15} />
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={pending || totpCode.trim().length !== 6}
                className="rounded-xl bg-[#173673] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#10295c] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "Please wait..." : "Approve Liquidation"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
