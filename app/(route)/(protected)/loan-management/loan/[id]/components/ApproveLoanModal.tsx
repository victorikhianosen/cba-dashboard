"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ShieldCheck, X } from "lucide-react";

interface ApproveLoanModalProps {
  isOpen: boolean;
  accountNumber: string;
  principalAmount: string | number;
  productName?: string;
  disbursementAccountNumber?: string;
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

// Approving IS the single-step authorization to disburse the loan (no separate
// posting-approval detour) — so before confirming, the approver reviews the loan's terms.
// Two standalone steps: (1) review principal/product/disbursement account, then (2) — only
// after clicking Next — a dedicated TOTP entry screen. Mirrors
// ApproveInvestmentScheduleModal's review-then-TOTP split.
export default function ApproveLoanModal({
  isOpen,
  accountNumber,
  principalAmount,
  productName,
  disbursementAccountNumber,
  pending = false,
  onCancel,
  onConfirm,
}: ApproveLoanModalProps) {
  const [step, setStep] = useState<Step>("review");
  const [totpCode, setTotpCode] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setStep("review");
      setTotpCode("");
    }
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

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
        className={`flex w-full flex-col rounded-2xl bg-white shadow-2xl transition-[max-width] ${
          step === "review" ? "max-w-lg" : "max-w-md"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {step === "review" ? "Approve Loan" : "Confirm with Google Authenticator"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {step === "review"
                ? `This will approve and disburse loan ${accountNumber} immediately. Review the details before continuing.`
                : `Enter your 6-digit Google Authenticator code to approve and disburse loan ${accountNumber}.`}
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
              <div className="grid grid-cols-1 gap-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-800 sm:grid-cols-2">
                <div>
                  <span className="block text-xs font-bold uppercase tracking-wider text-blue-600">
                    Principal
                  </span>
                  ₦{formatCurrency(principalAmount)}
                </div>
                <div>
                  <span className="block text-xs font-bold uppercase tracking-wider text-blue-600">
                    Loan Product
                  </span>
                  {productName ?? "—"}
                </div>
                <div>
                  <span className="block text-xs font-bold uppercase tracking-wider text-blue-600">
                    Disbursement Account
                  </span>
                  {disbursementAccountNumber ?? "—"}
                </div>
              </div>
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
                    setTotpCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleConfirm();
                  }}
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
                {pending ? "Please wait..." : "Approve Loan"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
