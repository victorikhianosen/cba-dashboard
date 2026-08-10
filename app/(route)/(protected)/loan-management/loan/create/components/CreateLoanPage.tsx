"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Search,
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import { lookupAccountByNumberAction } from "@/actions/account.action";
import { createLoanAction, previewLoanScheduleAction } from "@/actions/loan.action";
import MoneyInput from "@/components/MoneyInput";
import { handleApiError } from "@/lib/errors";
import { toDisplayLabel } from "@/lib/format";

type LoanProduct = Record<string, any>;
type LookedUpAccount = Record<string, any>;

interface CreateLoanPageProps {
  loanProducts: LoanProduct[];
}

function formatMoney(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function CreateLoanPage({ loanProducts }: CreateLoanPageProps) {
  const router = useRouter();

  const [loanProductId, setLoanProductId] = useState("");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [numberOfRepayments, setNumberOfRepayments] = useState("");

  const [accountNumberInput, setAccountNumberInput] = useState("");
  const [account, setAccount] = useState<LookedUpAccount | null>(null);
  const [accountLookupLoading, setAccountLookupLoading] = useState(false);
  const [accountLookupError, setAccountLookupError] = useState<string | null>(null);

  const [schedulePreview, setSchedulePreview] = useState<Record<string, any> | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const activeProducts = useMemo(
    () => loanProducts.filter((product) => product.status === "active"),
    [loanProducts],
  );

  const selectedProduct = activeProducts.find(
    (product) => String(product.id) === String(loanProductId),
  );

  const accountCurrencyMismatch =
    !!account &&
    !!selectedProduct &&
    String(account.currency_id) !== String(selectedProduct.currency_id);

  // Debounced account-number lookup — resolves name/balance/currency/owning customer in
  // one step, so there's no separate "search customer" screen before this.
  useEffect(() => {
    if (!accountNumberInput.trim()) {
      setAccount(null);
      setAccountLookupError(null);
      return;
    }

    const timeout = setTimeout(async () => {
      setAccountLookupLoading(true);
      setAccountLookupError(null);
      const result: any = await lookupAccountByNumberAction(accountNumberInput.trim());

      if (result?.status !== "success") {
        setAccount(null);
        setAccountLookupError(result?.message || "No account found with that number.");
        setAccountLookupLoading(false);
        return;
      }

      setAccount(result.data);
      setAccountLookupLoading(false);
    }, 450);

    return () => clearTimeout(timeout);
  }, [accountNumberInput]);

  // Debounced live schedule preview — fires whenever product/principal/number of
  // repayments are all filled in. Read-only: nothing is booked by this call.
  useEffect(() => {
    if (!loanProductId || !principalAmount || !numberOfRepayments) {
      setSchedulePreview(null);
      setPreviewError(null);
      return;
    }

    const timeout = setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      const result: any = await previewLoanScheduleAction({
        loan_product_id: Number(loanProductId),
        principal_amount: Number(principalAmount),
        number_of_repayments: Number(numberOfRepayments),
      });

      if (result?.status !== "success") {
        setSchedulePreview(null);
        setPreviewError(result?.message || "Unable to compute the schedule for these terms.");
        setPreviewLoading(false);
        return;
      }

      setSchedulePreview(result.data);
      setPreviewLoading(false);
    }, 450);

    return () => clearTimeout(timeout);
  }, [loanProductId, principalAmount, numberOfRepayments]);

  function handleProductChange(event: ChangeEvent<HTMLSelectElement>) {
    setLoanProductId(event.target.value);
    setNumberOfRepayments("");
  }

  const isFormComplete =
    !!loanProductId && !!account?.id && !!principalAmount && !!numberOfRepayments;

  const canSubmit = isFormComplete && !accountCurrencyMismatch;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isFormComplete) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (accountCurrencyMismatch) {
      toast.error("This account's currency does not match the selected loan product.");
      return;
    }

    if (
      selectedProduct?.min_principal_amount &&
      Number(principalAmount) < Number(selectedProduct.min_principal_amount)
    ) {
      toast.error(`Principal amount must be at least ${selectedProduct.min_principal_amount}.`);
      return;
    }

    if (
      selectedProduct?.max_principal_amount &&
      Number(principalAmount) > Number(selectedProduct.max_principal_amount)
    ) {
      toast.error(`Principal amount must not exceed ${selectedProduct.max_principal_amount}.`);
      return;
    }

    if (
      selectedProduct?.min_number_of_repayments &&
      Number(numberOfRepayments) < Number(selectedProduct.min_number_of_repayments)
    ) {
      toast.error(
        `Number of repayments must be at least ${selectedProduct.min_number_of_repayments}.`,
      );
      return;
    }

    if (
      selectedProduct?.max_number_of_repayments &&
      Number(numberOfRepayments) > Number(selectedProduct.max_number_of_repayments)
    ) {
      toast.error(
        `Number of repayments must not exceed ${selectedProduct.max_number_of_repayments}.`,
      );
      return;
    }

    setSubmitting(true);

    const result: any = await createLoanAction({
      loan_product_id: Number(loanProductId),
      disbursement_account_id: Number(account!.id),
      principal_amount: Number(principalAmount),
      number_of_repayments: Number(numberOfRepayments),
    });

    if (result?.status !== "success") {
      handleApiError(result, "Failed to book loan.");
      setSubmitting(false);
      return;
    }

    toast.success(result.message || "Loan booked successfully.");

    const loanId = result?.data?.id;
    if (loanId) {
      router.push(`/loan-management/loan/${loanId}`);
    } else {
      router.push("/loan-management/loan");
    }

    setSubmitting(false);
  }

  return (
    <>
      <Link
        href="/loan-management/loan"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#29478f] transition"
      >
        <ArrowLeft size={16} />
        Back to Loans
      </Link>

      <div className="mt-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Book Loan</h1>
        <p className="mt-1 text-sm text-slate-600">
          Pick a loan product, enter the disbursement account number, then set the terms.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          {/* STEP 1 — PRODUCT */}
          <label className="block">
            <span className="block font-bold text-sm text-slate-800">1. Loan Product</span>
            <select
              required
              value={loanProductId}
              onChange={handleProductChange}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition"
            >
              <option value="">Select a loan product</option>
              {activeProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {toDisplayLabel(product.name)} — {product.interest_rate}% (
                  {product.currency_code}) — {product.min_number_of_repayments}-
                  {product.max_number_of_repayments} repayments
                </option>
              ))}
            </select>
            {activeProducts.length === 0 && (
              <p className="mt-1.5 text-xs font-semibold text-amber-600">
                No active loan products found — activate one first.
              </p>
            )}
          </label>

          {/* STEP 2 — ACCOUNT NUMBER LOOKUP */}
          <label className="block">
            <span className="block font-bold text-sm text-slate-800">
              2. Disbursement Account Number
            </span>
            <div className="relative mt-2">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                required
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={accountNumberInput}
                onChange={(event) =>
                  setAccountNumberInput(event.target.value.replace(/\D/g, "").slice(0, 10))
                }
                placeholder="Enter the account number to credit"
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

            {account && (
              <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 size={15} />
                  <span className="text-sm font-bold">{account.account_name}</span>
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div>
                    <span className="block font-semibold text-emerald-700">
                      Account Number
                    </span>
                    <span className="font-mono font-medium text-emerald-900">
                      {account.account_number ?? "—"}
                    </span>
                  </div>
                  <div>
                    <span className="block font-semibold text-emerald-700">Customer</span>
                    <span className="font-medium text-emerald-900">
                      {account.customer?.full_name ?? "—"}
                    </span>
                  </div>
                  <div>
                    <span className="block font-semibold text-emerald-700">Currency</span>
                    <span className="font-medium text-emerald-900">
                      {account.currency_code ?? "—"}
                    </span>
                  </div>
                  <div>
                    <span className="block font-semibold text-emerald-700">
                      Available Balance
                    </span>
                    <span className="font-medium text-emerald-900">
                      {formatMoney(account.available_balance)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {accountCurrencyMismatch && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-600">
                <XCircle size={14} />
                This account is in {account?.currency_code}, but the product currency is{" "}
                {selectedProduct?.currency_code}.
              </p>
            )}
          </label>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* STEP 3 — PRINCIPAL */}
            <MoneyInput
              label="3. Principal Amount"
              name="principal_amount"
              value={principalAmount}
              onChange={(event) => setPrincipalAmount(event.target.value)}
              placeholder="e.g. 1,000,000"
            />

            {/* STEP 4 — NUMBER OF REPAYMENTS, WITHIN THE PRODUCT'S RANGE */}
            <label className="block">
              <span className="block font-bold text-sm text-slate-800">
                4. Number of Repayments
              </span>
              <input
                required
                type="text"
                inputMode="numeric"
                disabled={!selectedProduct}
                value={numberOfRepayments}
                onChange={(event) =>
                  setNumberOfRepayments(event.target.value.replace(/[^\d]/g, ""))
                }
                placeholder={
                  selectedProduct
                    ? `${selectedProduct.min_number_of_repayments}-${selectedProduct.max_number_of_repayments}`
                    : "Select a product first"
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition disabled:cursor-not-allowed disabled:bg-slate-50"
              />
              {selectedProduct && (
                <p className="mt-1.5 text-xs font-medium text-slate-500">
                  Between {selectedProduct.min_number_of_repayments} and{" "}
                  {selectedProduct.max_number_of_repayments} repayments for this product.
                </p>
              )}
            </label>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
            <button
              type="button"
              disabled={submitting}
              onClick={() => router.push("/loan-management/loan")}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !canSubmit}
              title={
                !canSubmit
                  ? "Fill in all required fields with a matching-currency account"
                  : undefined
              }
              className="rounded-xl bg-[#173673] px-5 py-3 text-sm font-semibold text-white hover:bg-[#10295c] disabled:cursor-not-allowed disabled:opacity-50 transition shadow-sm"
            >
              {submitting ? "Please wait..." : "Book Loan"}
            </button>
          </div>
        </div>

        {/* PROJECTED SCHEDULE — computed live from the backend, nothing is booked yet */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 lg:col-span-1">
          <div className="flex items-center gap-2">
            <CalendarClock size={16} className="text-[#29478f]" />
            <span className="text-sm font-bold text-slate-800">Projected Amortization Schedule</span>
          </div>

          {!previewLoading && !previewError && !schedulePreview && (
            <p className="mt-4 text-xs font-medium text-slate-500">
              Fill in the product, principal amount and number of repayments to preview
              the schedule.
            </p>
          )}

          {previewLoading && (
            <p className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500">
              <Loader2 size={14} className="animate-spin" />
              Calculating schedule...
            </p>
          )}

          {!previewLoading && previewError && (
            <p className="mt-4 text-xs font-semibold text-red-600">{previewError}</p>
          )}

          {!previewLoading && schedulePreview && (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="block font-semibold text-slate-500">Start Date</span>
                  <span className="font-bold text-slate-900">
                    {schedulePreview.start_date}
                  </span>
                </div>
                <div>
                  <span className="block font-semibold text-slate-500">Maturity Date</span>
                  <span className="font-bold text-slate-900">
                    {schedulePreview.maturity_date}
                  </span>
                </div>
                <div>
                  <span className="block font-semibold text-slate-500">Total Interest</span>
                  <span className="font-bold text-slate-900">
                    ₦{formatMoney(schedulePreview.total_interest)}
                  </span>
                </div>
                <div>
                  <span className="block font-semibold text-slate-500">
                    Installment Amount
                  </span>
                  <span className="font-bold text-slate-900">
                    ₦{formatMoney(schedulePreview.installment_amount)}
                  </span>
                </div>
              </div>

              <div className="mt-3 max-h-96 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold text-slate-600">#</th>
                      <th className="px-3 py-2 text-left font-bold text-slate-600">
                        Due Date
                      </th>
                      <th className="px-3 py-2 text-right font-bold text-slate-600">
                        Principal
                      </th>
                      <th className="px-3 py-2 text-right font-bold text-slate-600">
                        Interest
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(schedulePreview.installments ?? []).map((row: Record<string, any>) => (
                      <tr key={row.installment_number}>
                        <td className="px-3 py-2 text-slate-700">{row.installment_number}</td>
                        <td className="px-3 py-2 text-slate-700">{row.due_date}</td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-900">
                          ₦{formatMoney(row.principal_due)}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-900">
                          ₦{formatMoney(row.interest_due)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-2 text-[11px] font-medium text-slate-500">
                Projection only — assumes disbursement starts today. Nothing is booked yet.
              </p>
            </>
          )}
        </div>
      </form>
    </>
  );
}
