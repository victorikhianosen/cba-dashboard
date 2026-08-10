"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import MoneyInput from "@/components/MoneyInput";
import SearchableSelect from "@/components/SearchableSelect";
import { toDisplayLabel } from "@/lib/format";

type LoanProduct = Record<string, any>;
type LoanProductFormData = Record<string, any>;
type LookupOption = Record<string, any>;

interface LoanProductFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLoanProduct: LoanProduct | null;
  onSubmit: (formData: LoanProductFormData) => Promise<void>;
  submitting: boolean;
  currencies: LookupOption[];
  generalLedgers: LookupOption[];
}

const INTEREST_RATE_FREQUENCY_OPTIONS = ["per_day", "per_week", "per_month", "per_year"];
const INTEREST_METHOD_OPTIONS = ["declining_balance", "flat"];
const INTEREST_CALC_PERIOD_OPTIONS = ["daily", "same_as_repayment_period"];
const REPAYMENT_FREQUENCY_OPTIONS = ["days", "weeks", "months"];
const AMORTIZATION_METHOD_OPTIONS = ["equal_installments", "equal_principal"];
const DAYS_IN_MONTH_OPTIONS = ["actual", "thirty"];
const DAYS_IN_YEAR_OPTIONS = ["360", "365"];

const emptyLoanProductForm: LoanProductFormData = {
  name: "",
  code: "",
  description: "",
  currency_id: "",
  interest_rate: "",
  min_principal_amount: "",
  max_principal_amount: "",
  default_principal_amount: "",
  min_nominal_interest_rate_per_period: "",
  max_nominal_interest_rate_per_period: "",
  interest_rate_frequency_type: "per_year",
  interest_method: "declining_balance",
  interest_calculation_period_type: "same_as_repayment_period",
  repayment_every: "1",
  repayment_frequency_type: "months",
  number_of_repayments: "",
  min_number_of_repayments: "",
  max_number_of_repayments: "",
  amortization_method: "equal_installments",
  grace_on_principal_periods: "0",
  grace_on_interest_periods: "0",
  grace_interest_free_periods: "0",
  grace_on_arrears_ageing: "0",
  arrears_tolerance_amount: "0",
  overdue_days_for_npa: "",
  penalty_interest_rate: "",
  days_in_month_type: "actual",
  interest_calculation_days_in_year: "365",
  fundSourceAccountId: "",
  loanPortfolioAccountId: "",
  interestOnLoanAccountId: "",
  incomeFromFeeAccountId: "",
  incomeFromPenaltyAccountId: "",
  writeOffAccountId: "",
  transfersInSuspenseAccountId: "",
  overpaymentLiabilityAccountId: "",
  interestReceivableAccountId: "",
  suspendedInterestAccountId: "",
};

// All 10 GL mapping roles required by the backend — every one must be a GL account
// denominated in the product's currency and not already assigned to another product.
const GL_FIELDS: { key: string; label: string }[] = [
  { key: "fundSourceAccountId", label: "Fund Source GL" },
  { key: "loanPortfolioAccountId", label: "Loan Portfolio GL" },
  { key: "interestOnLoanAccountId", label: "Interest on Loan GL" },
  { key: "incomeFromFeeAccountId", label: "Income from Fee GL" },
  { key: "incomeFromPenaltyAccountId", label: "Income from Penalty GL" },
  { key: "writeOffAccountId", label: "Write-Off GL" },
  { key: "transfersInSuspenseAccountId", label: "Transfers in Suspense GL" },
  { key: "overpaymentLiabilityAccountId", label: "Overpayment Liability GL" },
  { key: "interestReceivableAccountId", label: "Interest Receivable GL" },
  { key: "suspendedInterestAccountId", label: "Suspended Interest GL" },
];

const OPTIONAL_FIELDS = [
  "code",
  "min_nominal_interest_rate_per_period",
  "max_nominal_interest_rate_per_period",
  "overdue_days_for_npa",
];

const REQUIRED_TEXT_FIELDS = Object.keys(emptyLoanProductForm).filter(
  (key) => !OPTIONAL_FIELDS.includes(key),
);

export default function LoanProductFormDrawer({
  isOpen,
  onClose,
  selectedLoanProduct,
  onSubmit,
  submitting,
  currencies,
  generalLedgers,
}: LoanProductFormDrawerProps) {
  const [formData, setFormData] = useState<LoanProductFormData>(emptyLoanProductForm);

  useEffect(() => {
    if (isOpen) {
      if (selectedLoanProduct) {
        const seeded: LoanProductFormData = { ...emptyLoanProductForm };
        for (const key of Object.keys(emptyLoanProductForm)) {
          const value = selectedLoanProduct[key];
          if (value === undefined || value === null) continue;
          seeded[key] = String(value);
        }
        setFormData(seeded);
      } else {
        setFormData({ ...emptyLoanProductForm });
      }
    }
  }, [isOpen, selectedLoanProduct]);

  function handleInputChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  const ledgersById = useMemo(
    () => new Map(generalLedgers.map((ledger) => [String(ledger.id), ledger])),
    [generalLedgers],
  );

  const selectedCurrency = currencies.find(
    (currency) => String(currency.id) === String(formData.currency_id),
  );

  // Until a currency is picked there's nothing to filter against, so show every GL.
  // Once one is picked, only that currency's GLs — not already assigned to another
  // product — are offered.
  const currencyFilteredLedgers = useMemo(() => {
    const base = formData.currency_id
      ? generalLedgers.filter(
          (ledger) => String(ledger.currency_id) === String(formData.currency_id),
        )
      : generalLedgers;

    return base.filter((ledger) => {
      // Allow a GL already assigned to *this* product being edited to stay
      // selectable — only exclude GLs assigned to a *different* product.
      if (!ledger.assigned_loan_product_id) return true;
      return (
        selectedLoanProduct &&
        String(ledger.assigned_loan_product_id) === String(selectedLoanProduct.id)
      );
    });
  }, [generalLedgers, formData.currency_id, selectedLoanProduct]);

  const glCurrencyErrors: Record<string, string> = {};
  if (formData.currency_id) {
    for (const { key, label } of GL_FIELDS) {
      const glId = formData[key];
      if (!glId) continue;

      const ledger = ledgersById.get(String(glId));
      if (ledger && String(ledger.currency_id) !== String(formData.currency_id)) {
        glCurrencyErrors[key] =
          `${label} is in ${ledger.currency_code ?? "a different currency"}, but the product currency is ${selectedCurrency?.code ?? "different"}.`;
      }
    }
  }

  const hasCurrencyMismatch = Object.keys(glCurrencyErrors).length > 0;

  const isFormComplete = REQUIRED_TEXT_FIELDS.every((key) => {
    const value = formData[key];
    return value !== "" && value !== null && value !== undefined;
  });

  const canSubmit = isFormComplete && !hasCurrencyMismatch;

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (hasCurrencyMismatch) {
      toast.error("Fix the highlighted GL accounts — they must match the product currency.");
      return;
    }

    if (!isFormComplete) {
      toast.error("Please fill in all required fields.");
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
              {selectedLoanProduct ? "Update Loan Product" : "Add New Loan Product"}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Configure the loan product details below.
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

        <form onSubmit={handleFormSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-6 overflow-y-auto p-6 bg-white">
            <Section title="Basic Information">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Product Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Personal Loan Product"
                />
                <Input
                  label="Product Code"
                  name="code"
                  required={false}
                  disabled
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder="Auto-generated by the system"
                />
              </div>

              <SearchableSelect
                label="Currency"
                name="currency_id"
                value={formData.currency_id}
                onChange={handleInputChange}
                placeholder="Select currency"
                options={currencies.map((currency) => ({
                  value: String(currency.id),
                  label: `${currency.code ?? currency.name} — ${currency.name}`,
                  sublabel: currency.code,
                }))}
              />

              <Textarea
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="e.g. General purpose personal loan"
              />
            </Section>

            <Section title="Principal Limits">
              <div className="grid grid-cols-3 gap-4">
                <MoneyInput
                  label="Min Principal"
                  name="min_principal_amount"
                  value={formData.min_principal_amount}
                  onChange={handleInputChange}
                  placeholder="e.g. 50,000"
                />
                <MoneyInput
                  label="Default Principal"
                  name="default_principal_amount"
                  value={formData.default_principal_amount}
                  onChange={handleInputChange}
                  placeholder="e.g. 1,000,000"
                />
                <MoneyInput
                  label="Max Principal"
                  name="max_principal_amount"
                  value={formData.max_principal_amount}
                  onChange={handleInputChange}
                  placeholder="e.g. 5,000,000"
                />
              </div>
            </Section>

            <Section title="Interest Terms">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Interest Rate (%)"
                  name="interest_rate"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={formData.interest_rate}
                  onChange={handleInputChange}
                  placeholder="e.g. 24"
                />
                <Select
                  label="Interest Rate Frequency"
                  name="interest_rate_frequency_type"
                  value={formData.interest_rate_frequency_type}
                  onChange={handleInputChange}
                  options={INTEREST_RATE_FREQUENCY_OPTIONS}
                />
                <Input
                  label="Min Nominal Interest Rate per Period"
                  name="min_nominal_interest_rate_per_period"
                  type="number"
                  step="0.01"
                  required={false}
                  value={formData.min_nominal_interest_rate_per_period}
                  onChange={handleInputChange}
                  placeholder="Optional"
                />
                <Input
                  label="Max Nominal Interest Rate per Period"
                  name="max_nominal_interest_rate_per_period"
                  type="number"
                  step="0.01"
                  required={false}
                  value={formData.max_nominal_interest_rate_per_period}
                  onChange={handleInputChange}
                  placeholder="Optional"
                />
                <Select
                  label="Interest Method"
                  name="interest_method"
                  value={formData.interest_method}
                  onChange={handleInputChange}
                  options={INTEREST_METHOD_OPTIONS}
                />
                <Select
                  label="Interest Calculation Period"
                  name="interest_calculation_period_type"
                  value={formData.interest_calculation_period_type}
                  onChange={handleInputChange}
                  options={INTEREST_CALC_PERIOD_OPTIONS}
                />
                <Select
                  label="Days in Month"
                  name="days_in_month_type"
                  value={formData.days_in_month_type}
                  onChange={handleInputChange}
                  options={DAYS_IN_MONTH_OPTIONS}
                />
                <Select
                  label="Days in Year"
                  name="interest_calculation_days_in_year"
                  value={formData.interest_calculation_days_in_year}
                  onChange={handleInputChange}
                  options={DAYS_IN_YEAR_OPTIONS}
                />
              </div>
            </Section>

            <Section title="Repayment Terms">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Repayment Every"
                  name="repayment_every"
                  type="number"
                  min={1}
                  value={formData.repayment_every}
                  onChange={handleInputChange}
                  placeholder="e.g. 1"
                />
                <Select
                  label="Repayment Frequency"
                  name="repayment_frequency_type"
                  value={formData.repayment_frequency_type}
                  onChange={handleInputChange}
                  options={REPAYMENT_FREQUENCY_OPTIONS}
                />
                <Input
                  label="Default Number of Repayments"
                  name="number_of_repayments"
                  type="number"
                  min={1}
                  value={formData.number_of_repayments}
                  onChange={handleInputChange}
                  placeholder="e.g. 12"
                />
                <Select
                  label="Amortization Method"
                  name="amortization_method"
                  value={formData.amortization_method}
                  onChange={handleInputChange}
                  options={AMORTIZATION_METHOD_OPTIONS}
                />
                <Input
                  label="Min Number of Repayments"
                  name="min_number_of_repayments"
                  type="number"
                  min={1}
                  value={formData.min_number_of_repayments}
                  onChange={handleInputChange}
                  placeholder="e.g. 3"
                />
                <Input
                  label="Max Number of Repayments"
                  name="max_number_of_repayments"
                  type="number"
                  min={1}
                  value={formData.max_number_of_repayments}
                  onChange={handleInputChange}
                  placeholder="e.g. 24"
                />
              </div>
            </Section>

            <Section title="Grace Periods">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Input
                  label="Grace on Principal (periods)"
                  name="grace_on_principal_periods"
                  type="number"
                  min={0}
                  value={formData.grace_on_principal_periods}
                  onChange={handleInputChange}
                />
                <Input
                  label="Grace on Interest (periods)"
                  name="grace_on_interest_periods"
                  type="number"
                  min={0}
                  value={formData.grace_on_interest_periods}
                  onChange={handleInputChange}
                />
                <Input
                  label="Grace Interest-Free (periods)"
                  name="grace_interest_free_periods"
                  type="number"
                  min={0}
                  value={formData.grace_interest_free_periods}
                  onChange={handleInputChange}
                />
                <Input
                  label="Grace on Arrears Ageing (days)"
                  name="grace_on_arrears_ageing"
                  type="number"
                  min={0}
                  value={formData.grace_on_arrears_ageing}
                  onChange={handleInputChange}
                />
              </div>
            </Section>

            <Section title="Penalty & Arrears">
              <div className="grid grid-cols-2 gap-4">
                <MoneyInput
                  label="Arrears Tolerance Amount"
                  name="arrears_tolerance_amount"
                  value={formData.arrears_tolerance_amount}
                  onChange={handleInputChange}
                  placeholder="e.g. 0"
                />
                <Input
                  label="Overdue Days for NPA"
                  name="overdue_days_for_npa"
                  type="number"
                  min={0}
                  required={false}
                  value={formData.overdue_days_for_npa}
                  onChange={handleInputChange}
                  placeholder="Optional"
                />
                <Input
                  label="Penalty Interest Rate (%)"
                  name="penalty_interest_rate"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  value={formData.penalty_interest_rate}
                  onChange={handleInputChange}
                  placeholder="e.g. 5"
                />
              </div>
            </Section>

            <Section title="General Ledger Mappings">
              {!formData.currency_id && (
                <p className="text-xs font-medium text-amber-600">
                  Select a product currency above to enable GL currency matching.
                </p>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {GL_FIELDS.map(({ key, label }) => (
                  <GLSelect
                    key={key}
                    label={label}
                    name={key}
                    value={formData[key]}
                    onChange={handleInputChange}
                    generalLedgers={currencyFilteredLedgers}
                    error={glCurrencyErrors[key]}
                    emptyMessage={
                      selectedCurrency
                        ? `No GL account with ${selectedCurrency.code} currency.`
                        : undefined
                    }
                  />
                ))}
              </div>
            </Section>
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
              title={!canSubmit ? "Fill in all required fields to continue" : undefined}
              className="rounded-xl bg-[#173673] px-5 py-3 text-sm font-semibold text-white hover:bg-[#10295c] disabled:cursor-not-allowed disabled:opacity-50 transition shadow-sm"
            >
              {submitting
                ? "Please wait..."
                : selectedLoanProduct
                ? "Update Product"
                : "Create Product"}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Input(props: Record<string, any>) {
  const { label, required = true, ...rest } = props;
  return (
    <label className="block">
      <span className="block font-bold text-sm text-slate-800">{label}</span>
      <input
        required={required}
        {...rest}
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      />
    </label>
  );
}

function Textarea(props: Record<string, any>) {
  const { label, ...rest } = props;
  return (
    <label className="block">
      <span className="block font-bold text-sm text-slate-800">{label}</span>
      <textarea
        required
        rows={3}
        {...rest}
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition resize-none"
      />
    </label>
  );
}

function Select({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  name: string;
  value: any;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="block font-bold text-sm text-slate-800">{label}</span>
      <select
        required
        name={name}
        value={value}
        onChange={onChange}
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {toDisplayLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

// Badge color per GL classification — kept muted/neutral so it reads as a label, not a status.
const CLASSIFICATION_BADGE_CLASSES: Record<string, string> = {
  asset: "bg-blue-50 text-blue-700 border-blue-200",
  liability: "bg-amber-50 text-amber-700 border-amber-200",
  equity: "bg-purple-50 text-purple-700 border-purple-200",
  income: "bg-emerald-50 text-emerald-700 border-emerald-200",
  expense: "bg-rose-50 text-rose-700 border-rose-200",
};

function GLSelect({
  label,
  name,
  value,
  onChange,
  generalLedgers,
  error,
  emptyMessage,
}: {
  label: string;
  name: string;
  value: any;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  generalLedgers: LookupOption[];
  error?: string;
  emptyMessage?: string;
}) {
  const selectedLedger = generalLedgers.find((ledger) => String(ledger.id) === String(value));

  return (
    <div>
      <SearchableSelect
        label={label}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        error={error}
        required
        placeholder="Select GL account"
        emptyMessage={emptyMessage}
        options={generalLedgers.map((ledger) => ({
          value: String(ledger.id),
          label: `${ledger.gl_code ? `${ledger.gl_code} — ` : ""}${toDisplayLabel(ledger.name)}${
            ledger.currency_code ? ` (${ledger.currency_code})` : ""
          }`,
          sublabel: [ledger.gl_code, ledger.currency_code, ledger.classification ? toDisplayLabel(ledger.classification) : null]
            .filter(Boolean)
            .join(" · "),
        }))}
      />
      {selectedLedger?.classification && (
        <span
          className={`mt-1.5 inline-block rounded-md border px-2 py-0.5 text-xs font-semibold ${
            CLASSIFICATION_BADGE_CLASSES[selectedLedger.classification] ??
            "bg-slate-50 text-slate-700 border-slate-200"
          }`}
        >
          {toDisplayLabel(selectedLedger.classification)}
        </span>
      )}
    </div>
  );
}
