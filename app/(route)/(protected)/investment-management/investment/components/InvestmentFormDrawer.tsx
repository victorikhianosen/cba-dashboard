"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  CalendarClock,
  CheckCircle2,
  Loader2,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import { lookupAccountByNumberAction } from "@/actions/account.action";
import { previewInvestmentScheduleAction } from "@/actions/investment.action";
import MoneyInput from "@/components/MoneyInput";
import { toDisplayLabel } from "@/lib/format";

function formatMoney(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type InvestmentProduct = Record<string, any>;
type LookedUpAccount = Record<string, any>;
type InvestmentFormData = Record<string, any>;

interface InvestmentFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: InvestmentFormData) => Promise<void>;
  submitting: boolean;
  investmentProducts: InvestmentProduct[];
}

const emptyForm: InvestmentFormData = {
  investment_product_id: "",
  source_account_id: "",
  principal_amount: "",
  tenure: "",
  interest_posting_period: "",
  rollover_type: "",
};

export default function InvestmentFormDrawer({
  isOpen,
  onClose,
  onSubmit,
  submitting,
  investmentProducts,
}: InvestmentFormDrawerProps) {
  const [formData, setFormData] = useState<InvestmentFormData>(emptyForm);

  const [accountNumberInput, setAccountNumberInput] = useState("");
  const [account, setAccount] = useState<LookedUpAccount | null>(null);
  const [accountLookupLoading, setAccountLookupLoading] = useState(false);
  const [accountLookupError, setAccountLookupError] = useState<string | null>(
    null,
  );

  // Auto-renewal is opt-in per investment even on a product that offers it — the customer
  // may still choose not to roll over, so the rollover-type dropdown only appears (and is
  // only required) once this checkbox is actually ticked.
  const [wantsRollover, setWantsRollover] = useState(false);

  const [schedulePreview, setSchedulePreview] = useState<Record<
    string,
    any
  > | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...emptyForm });
      setAccountNumberInput("");
      setAccount(null);
      setAccountLookupError(null);
      setSchedulePreview(null);
      setPreviewError(null);
      setWantsRollover(false);
    }
  }, [isOpen]);

  const activeProducts = useMemo(
    () => investmentProducts.filter((product) => product.status === "active"),
    [investmentProducts],
  );

  const selectedProduct = activeProducts.find(
    (product) => String(product.id) === String(formData.investment_product_id),
  );

  // Only the posting periods the chosen product actually allows are offered
  // — the backend rejects anything outside that set.
  const allowedPostingPeriods: string[] = Array.isArray(
    selectedProduct?.allowed_interest_posting_periods,
  )
    ? selectedProduct.allowed_interest_posting_periods
    : [];

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
      setFormData((current) => ({ ...current, source_account_id: "" }));
      return;
    }

    const timeout = setTimeout(async () => {
      setAccountLookupLoading(true);
      setAccountLookupError(null);
      const result: any = await lookupAccountByNumberAction(
        accountNumberInput.trim(),
      );

      if (result?.status !== "success") {
        setAccount(null);
        setFormData((current) => ({ ...current, source_account_id: "" }));
        setAccountLookupError(
          result?.message || "No account found with that number.",
        );
        return;
      }

      setAccount(result.data);
      setFormData((current) => ({
        ...current,
        source_account_id: String(result.data.id),
      }));

      setAccountLookupLoading(false);
    }, 450);

    return () => clearTimeout(timeout);
  }, [accountNumberInput]);

  // Debounced auto-preview — fires whenever product/principal/tenure/posting-period are
  // all filled in and valid, so the projected schedule is visible before anyone commits
  // to actually booking the investment. Read-only: nothing is created by this call.
  useEffect(() => {
    if (
      !formData.investment_product_id ||
      !formData.principal_amount ||
      !formData.tenure ||
      !formData.interest_posting_period
    ) {
      setSchedulePreview(null);
      setPreviewError(null);
      return;
    }

    const timeout = setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      const result: any = await previewInvestmentScheduleAction({
        investment_product_id: Number(formData.investment_product_id),
        principal_amount: Number(formData.principal_amount),
        tenure: Number(formData.tenure),
        interest_posting_period: formData.interest_posting_period,
      });

      if (result?.status !== "success") {
        setSchedulePreview(null);
        setPreviewError(
          result?.message || "Unable to compute the schedule for these terms.",
        );
        return;
      }

      setSchedulePreview(result.data);

      setPreviewLoading(false);
    }, 450);

    return () => clearTimeout(timeout);
  }, [
    formData.investment_product_id,
    formData.principal_amount,
    formData.tenure,
    formData.interest_posting_period,
  ]);

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;

    if (name === "investment_product_id") {
      setFormData((current) => ({
        ...current,
        investment_product_id: value,
        interest_posting_period: "",
        tenure: "",
        rollover_type: "",
      }));
      setWantsRollover(false);
      return;
    }

    if (name === "tenure") {
      setFormData((current) => ({
        ...current,
        tenure: value.replace(/[^\d]/g, ""),
      }));
      return;
    }

    setFormData((current) => ({ ...current, [name]: value }));
  }

  const isFormComplete =
    !!formData.investment_product_id &&
    !!formData.source_account_id &&
    !!formData.principal_amount &&
    !!formData.tenure &&
    !!formData.interest_posting_period &&
    (!wantsRollover || !!formData.rollover_type);

  const canSubmit = isFormComplete && !accountCurrencyMismatch;

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isFormComplete) {
      if (wantsRollover && !formData.rollover_type) {
        toast.error("Select a rollover type, or uncheck auto-renewal.");
        return;
      }
      toast.error("Please fill in all required fields.");
      return;
    }

    if (accountCurrencyMismatch) {
      toast.error(
        "This account's currency does not match the selected investment product.",
      );
      return;
    }

    if (
      selectedProduct?.min_deposit_amount &&
      Number(formData.principal_amount) <
        Number(selectedProduct.min_deposit_amount)
    ) {
      toast.error(
        `Principal amount must be at least ${selectedProduct.min_deposit_amount}.`,
      );
      return;
    }

    if (
      selectedProduct?.max_deposit_amount &&
      Number(formData.principal_amount) >
        Number(selectedProduct.max_deposit_amount)
    ) {
      toast.error(
        `Principal amount must not exceed ${selectedProduct.max_deposit_amount}.`,
      );
      return;
    }

    if (
      selectedProduct &&
      Number(formData.tenure) < Number(selectedProduct.min_tenure_days)
    ) {
      toast.error(
        `Tenure must be at least ${selectedProduct.min_tenure_days} days for this product.`,
      );
      return;
    }

    if (
      selectedProduct &&
      Number(formData.tenure) > Number(selectedProduct.max_tenure_days)
    ) {
      toast.error(
        `Tenure must not exceed ${selectedProduct.max_tenure_days} days for this product.`,
      );
      return;
    }

    onSubmit(formData);
  }

  return (
    <>
      {isOpen && (
        <button
          type="button"
          onClick={submitting ? undefined : onClose}
          className="fixed inset-0 z-[9998] bg-black/50 cursor-default transition-opacity"
        />
      )}

      <aside
        className={`fixed right-0 top-0 z-[9999] flex h-screen w-full max-w-[1180px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center border-b border-slate-200 p-6 bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Open Investment
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Pick a product, enter the funding account number, then set the
              terms.
            </p>
          </div>
          <button
            type="button"
            onClick={submitting ? undefined : onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleFormSubmit}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 space-y-5 overflow-y-auto p-6 bg-white">
            {/* STEP 1 — PRODUCT */}
            <label className="block">
              <span className="block font-bold text-sm text-slate-800">
                1. Investment Product
              </span>
              <select
                required
                name="investment_product_id"
                value={formData.investment_product_id}
                onChange={handleChange}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition"
              >
                <option value="">Select an investment product</option>
                {activeProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {toDisplayLabel(product.name)} — {product.interest_rate}% (
                    {product.currency_code}) — {product.min_tenure_days}-
                    {product.max_tenure_days} days
                  </option>
                ))}
              </select>
              {activeProducts.length === 0 && (
                <p className="mt-1.5 text-xs font-semibold text-amber-600">
                  No active investment products found — activate one first.
                </p>
              )}
            </label>

            {/* STEP 2 — ACCOUNT NUMBER LOOKUP */}
            <label className="block">
              <span className="block font-bold text-sm text-slate-800">
                2. Funding Account Number
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

              {account && (
                <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 size={15} />
                    <span className="text-sm font-bold">
                      {account.account_name}
                    </span>
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
                      <span className="block font-semibold text-emerald-700">
                        Customer
                      </span>
                      <span className="font-medium text-emerald-900">
                        {account.customer?.full_name ?? "—"}
                      </span>
                    </div>
                    <div>
                      <span className="block font-semibold text-emerald-700">
                        Currency
                      </span>
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
                  This account is in {account?.currency_code}, but the product
                  currency is {selectedProduct?.currency_code}.
                </p>
              )}
            </label>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* STEP 3 — PRINCIPAL */}
              <MoneyInput
                label="3. Principal Amount"
                name="principal_amount"
                value={formData.principal_amount}
                onChange={handleChange}
                placeholder="e.g. 500,000"
              />

              {/* STEP 4 — TENURE, WITHIN THE PRODUCT'S RANGE */}
              <label className="block">
                <span className="block font-bold text-sm text-slate-800">
                  4. Tenure (days)
                </span>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  disabled={!selectedProduct}
                  name="tenure"
                  value={formData.tenure}
                  onChange={handleChange}
                  placeholder={
                    selectedProduct
                      ? `${selectedProduct.min_tenure_days}-${selectedProduct.max_tenure_days} days`
                      : "Select a product first"
                  }
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition disabled:cursor-not-allowed disabled:bg-slate-50"
                />
                {selectedProduct && (
                  <p className="mt-1.5 text-xs font-medium text-slate-500">
                    The customer can choose any tenure between{" "}
                    {selectedProduct.min_tenure_days} and{" "}
                    {selectedProduct.max_tenure_days} days for this product.
                  </p>
                )}
              </label>
            </div>

            {/* STEP 5 — POSTING PERIOD */}
            <label className="block">
              <span className="block font-bold text-sm text-slate-800">
                5. Interest Posting Period
              </span>
              <select
                required
                disabled={!selectedProduct}
                name="interest_posting_period"
                value={formData.interest_posting_period}
                onChange={handleChange}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="">
                  {selectedProduct
                    ? "Select a posting period"
                    : "Select a product first"}
                </option>
                {allowedPostingPeriods.map((period) => (
                  <option key={period} value={period}>
                    {toDisplayLabel(period)}
                  </option>
                ))}
              </select>
            </label>

            {/* STEP 6 — ROLLOVER, ONLY WHEN THE PRODUCT OFFERS AUTO-RENEWAL. Opt-in per
                investment — the customer may still choose not to roll over even though the
                product allows it. */}
            {selectedProduct?.auto_renew && (
              <div className="rounded-xl border border-slate-200 p-4">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={wantsRollover}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setWantsRollover(checked);
                      if (!checked) {
                        setFormData((current) => ({
                          ...current,
                          rollover_type: "",
                        }));
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-[#173673] focus:ring-[#29478f]"
                  />
                  <span className="text-sm font-bold text-slate-800">
                    6. Enable auto-renewal for this investment
                  </span>
                </label>
                <p className="mt-1.5 ml-7 text-xs font-medium text-slate-500">
                  This product offers auto-renewal, but it's the customer's
                  choice — leave unchecked if they don't want to roll over at
                  maturity.
                </p>

                {wantsRollover && (
                  <label className="mt-3 block">
                    <span className="block font-bold text-sm text-slate-800">
                      Rollover Type
                    </span>
                    <select
                      required
                      name="rollover_type"
                      value={formData.rollover_type}
                      onChange={handleChange}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition"
                    >
                      <option value="">Select rollover type</option>
                      <option value="simple">
                        Simple — principal only rolls over
                      </option>
                      <option value="compound">
                        Compound — principal + accrued interest rolls over
                      </option>
                    </select>
                  </label>
                )}
              </div>
            )}

            {/* PROJECTED SCHEDULE — computed live from the backend, nothing is booked yet */}
            {(previewLoading || previewError || schedulePreview) && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <CalendarClock size={16} className="text-[#29478f]" />
                  <span className="text-sm font-bold text-slate-800">
                    Projected Interest Schedule
                  </span>
                </div>

                {previewLoading && (
                  <p className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Loader2 size={14} className="animate-spin" />
                    Calculating schedule...
                  </p>
                )}

                {!previewLoading && previewError && (
                  <p className="mt-3 text-xs font-semibold text-red-600">
                    {previewError}
                  </p>
                )}

                {!previewLoading && schedulePreview && (
                  <>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="block font-semibold text-slate-500">
                          Maturity Date
                        </span>
                        <span className="font-bold text-slate-900">
                          {schedulePreview.maturity_date}
                        </span>
                      </div>
                      <div>
                        <span className="block font-semibold text-slate-500">
                          Total Projected Interest
                        </span>
                        <span className="font-bold text-slate-900">
                          ₦{formatMoney(schedulePreview.total_interest)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-slate-100">
                          <tr>
                            <th className="px-3 py-2 text-left font-bold text-slate-600">
                              #
                            </th>
                            <th className="px-3 py-2 text-left font-bold text-slate-600">
                              Due Date
                            </th>
                            <th className="px-3 py-2 text-right font-bold text-slate-600">
                              Interest
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(schedulePreview.installments ?? []).map(
                            (row: Record<string, any>) => (
                              <tr key={row.installment_number}>
                                <td className="px-3 py-2 text-slate-700">
                                  {row.installment_number}
                                </td>
                                <td className="px-3 py-2 text-slate-700">
                                  {row.due_date}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-slate-900">
                                  ₦{formatMoney(row.expected_interest_amount)}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>

                    <p className="mt-2 text-[11px] font-medium text-slate-500">
                      Projection only — assumes the investment starts today.
                      Nothing is booked yet.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 p-6 bg-slate-50">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
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
              {submitting ? "Please wait..." : "Open Investment"}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
