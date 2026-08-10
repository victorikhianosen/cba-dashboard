"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, CheckCircle2, Loader2, Search, ShieldCheck, X, XCircle } from "lucide-react";
import { lookupAccountByNumberAction } from "@/actions/account.action";
import { previewLoanRepaymentAction } from "@/actions/loan.action";
import MoneyInput from "@/components/MoneyInput";

interface RepayLoanModalProps {
  isOpen: boolean;
  loanId: number | string;
  accountNumber: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: (
    data: { amount: string; funding_account_id: string; description?: string },
    totpCode: string,
  ) => void;
}

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Step = "entry" | "preview" | "totp";

// Three standalone steps: (1) enter amount + funding account, (2) — only after clicking
// Next — a live preview of the penalty->fee->interest->principal waterfall, then (3) a
// dedicated TOTP entry screen. Mirrors ApproveInvestmentScheduleModal's review-then-TOTP
// split, with an extra entry step up front since repayment needs the amount + account
// entered first (unlike approval, whose terms are already fixed on the loan).
export default function RepayLoanModal({
  isOpen,
  loanId,
  accountNumber,
  pending = false,
  onCancel,
  onConfirm,
}: RepayLoanModalProps) {
  const [step, setStep] = useState<Step>("entry");

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const [accountNumberInput, setAccountNumberInput] = useState("");
  const [fundingAccount, setFundingAccount] = useState<Record<string, any> | null>(null);
  const [accountLookupLoading, setAccountLookupLoading] = useState(false);
  const [accountLookupError, setAccountLookupError] = useState<string | null>(null);

  const [preview, setPreview] = useState<Record<string, any> | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [totpCode, setTotpCode] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setStep("entry");
      setAmount("");
      setDescription("");
      setAccountNumberInput("");
      setFundingAccount(null);
      setAccountLookupError(null);
      setPreview(null);
      setPreviewError(null);
      setTotpCode("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!accountNumberInput.trim()) {
      setFundingAccount(null);
      setAccountLookupError(null);
      return;
    }

    const timeout = setTimeout(async () => {
      setAccountLookupLoading(true);
      setAccountLookupError(null);
      const result: any = await lookupAccountByNumberAction(accountNumberInput.trim());

      if (result?.status !== "success") {
        setFundingAccount(null);
        setAccountLookupError(result?.message || "No account found with that number.");
        setAccountLookupLoading(false);
        return;
      }

      setFundingAccount(result.data);
      setAccountLookupLoading(false);
    }, 450);

    return () => clearTimeout(timeout);
  }, [accountNumberInput]);

  if (!isOpen || typeof document === "undefined") return null;

  function handleCancel() {
    onCancel();
  }

  async function handleGoToPreview() {
    if (!amount || !fundingAccount?.id) return;

    setStep("preview");
    setPreviewLoading(true);
    setPreviewError(null);
    const result: any = await previewLoanRepaymentAction(loanId, amount);

    if (result?.status !== "success") {
      setPreview(null);
      setPreviewError(result?.message || "Unable to preview this repayment.");
      setPreviewLoading(false);
      return;
    }

    setPreview(result.data);
    setPreviewLoading(false);
  }

  function handleConfirm() {
    if (totpCode.trim().length !== 6 || !fundingAccount?.id) return;
    onConfirm(
      {
        amount,
        funding_account_id: String(fundingAccount.id),
        description: description.trim() || undefined,
      },
      totpCode.trim(),
    );
  }

  const canGoToPreview = !!amount && Number(amount) > 0 && !!fundingAccount?.id;

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 p-4">
      <div
        className={`flex max-h-[90vh] w-full flex-col rounded-2xl bg-white shadow-2xl transition-[max-width] ${
          step === "preview" ? "max-w-2xl" : "max-w-md"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {step === "entry"
                ? "Repay Loan"
                : step === "preview"
                ? "Review Repayment"
                : "Confirm with Google Authenticator"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {step === "entry"
                ? `Enter the amount and funding account for a repayment on loan ${accountNumber}.`
                : step === "preview"
                ? "Review how this repayment will be allocated before confirming."
                : `Enter your 6-digit Google Authenticator code to apply this repayment.`}
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

        {step === "entry" && (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              <MoneyInput
                label="Repayment Amount"
                name="amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="e.g. 50,000"
              />

              <label className="block">
                <span className="block text-sm font-bold text-slate-800">
                  Funding Account Number
                </span>
                <div className="relative mt-2">
                  <Search
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    value={accountNumberInput}
                    onChange={(event) =>
                      setAccountNumberInput(event.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    placeholder="Enter the account number to debit"
                    className="w-full rounded-xl border border-slate-300 bg-white p-3 pl-11 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition"
                  />
                  {accountLookupLoading && (
                    <Loader2
                      size={16}
                      className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
                    />
                  )}
                </div>

                {accountLookupError && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-600">
                    <XCircle size={14} />
                    {accountLookupError}
                  </p>
                )}

                {fundingAccount && (
                  <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex items-center gap-2 text-emerald-800">
                      <CheckCircle2 size={15} />
                      <span className="text-sm font-bold">{fundingAccount.account_name}</span>
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="block font-semibold text-emerald-700">
                          Account Number
                        </span>
                        <span className="font-mono font-medium text-emerald-900">
                          {fundingAccount.account_number ?? "—"}
                        </span>
                      </div>
                      <div>
                        <span className="block font-semibold text-emerald-700">
                          Available Balance
                        </span>
                        <span className="font-medium text-emerald-900">
                          {formatCurrency(fundingAccount.available_balance)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </label>

              <label className="block">
                <span className="block text-sm font-bold text-slate-800">
                  Description (optional)
                </span>
                <input
                  type="text"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="e.g. Monthly repayment"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition"
                />
              </label>
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
                onClick={handleGoToPreview}
                disabled={!canGoToPreview}
                className="rounded-xl bg-[#173673] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#10295c] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        )}

        {step === "preview" && (
          <>
            <div className="flex-1 overflow-y-auto p-6">
              {previewLoading && !preview ? (
                <p className="py-10 text-center text-sm font-medium text-slate-500">
                  Calculating allocation...
                </p>
              ) : previewError ? (
                <p className="text-sm font-semibold text-red-600">{previewError}</p>
              ) : preview ? (
                <>
                  <div className="mb-4 flex flex-wrap items-center gap-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
                    <span>Amount: ₦{formatCurrency(preview.amount)}</span>
                    {Number(preview.unallocated) > 0 && (
                      <span>Unallocated: ₦{formatCurrency(preview.unallocated)}</span>
                    )}
                  </div>

                  {preview.allocations?.length ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50">
                            <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                              Installment
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider text-slate-600">
                              Penalty
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider text-slate-600">
                              Fee
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider text-slate-600">
                              Interest
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider text-slate-600">
                              Principal
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {preview.allocations.map((row: Record<string, any>, index: number) => (
                            <tr key={index}>
                              <td className="px-3 py-2.5 text-sm font-semibold text-slate-700">
                                #{row.schedule?.installment_number ?? index + 1}
                              </td>
                              <td className="px-3 py-2.5 text-right text-sm text-slate-700">
                                ₦{formatCurrency(row.penalty)}
                              </td>
                              <td className="px-3 py-2.5 text-right text-sm text-slate-700">
                                ₦{formatCurrency(row.fee)}
                              </td>
                              <td className="px-3 py-2.5 text-right text-sm text-slate-700">
                                ₦{formatCurrency(row.interest)}
                              </td>
                              <td className="px-3 py-2.5 text-right text-sm font-bold text-slate-900">
                                ₦{formatCurrency(row.principal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="rounded-xl border border-slate-200 bg-slate-50 py-8 text-center text-sm font-medium text-slate-400">
                      No allocations.
                    </p>
                  )}
                </>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-slate-200 p-6">
              <button
                type="button"
                onClick={() => setStep("entry")}
                disabled={pending}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                <ArrowLeft size={15} />
                Back
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
        )}

        {step === "totp" && (
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
                onClick={() => setStep("preview")}
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
                {pending ? "Please wait..." : "Repay Loan"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
