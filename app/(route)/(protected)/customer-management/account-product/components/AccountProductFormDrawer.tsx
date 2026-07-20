"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import { toDisplayLabel } from "@/lib/format";

type AccountProduct = Record<string, any>;
type AccountProductFormData = Record<string, any>;
type LookupOption = Record<string, any>;

interface AccountProductFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAccountProduct: AccountProduct | null;
  onSubmit: (formData: AccountProductFormData) => Promise<void>;
  submitting: boolean;
  currencies: LookupOption[];
  generalLedgers: LookupOption[];
}

const emptyAccountProductForm: AccountProductFormData = {
  name: "",
  product_type: "savings",
  description: "",
  currency_id: "",
  interest_rate: "",
  interest_type: "daily_balance",
  interest_compounding_period: "monthly",
  interest_posting_period: "monthly",
  interest_calculation_days_in_year: "365",
  min_balance_for_interest_calculation: "",
  min_required_opening_balance: "",
  min_required_balance: "",
  enforce_min_required_balance: true,
  locking_period_frequency: "",
  locking_period_frequency_type: "months",
  dormancy_period_days: "",
  allow_overdraft: false,
  overdraft_limit: "",
  overdraft_interest_rate: "",
  withdrawal_fee_amount: "",
  withdrawal_fee_type: "flat",
  annual_fee_amount: "",
  annual_fee_on_month: "",
  annual_fee_on_day: "",
  withhold_tax: true,
  is_lien_allowed: false,
  max_allowed_lien_limit: "",
  savingsControlGLId: "",
  interestOnSavingsGLId: "",
  incomeFromFeeGLId: "",
  incomeFromPenaltyGLId: "",
  transfersInSuspenseGLId: "",
  overdraftPortfolioGLId: "",
  writeOffGLId: "",
  escheatLiabilityGLId: "",
  incomeFromInterestGLId: "",
};

const PERIOD_OPTIONS = ["daily", "weekly", "monthly", "quarterly", "semi_annually", "annually"];

// GL select fields that must all be denominated in the product's currency.
const GL_FIELDS: { key: string; label: string }[] = [
  { key: "savingsControlGLId", label: "Savings Control GL" },
  { key: "interestOnSavingsGLId", label: "Interest On Savings GL" },
  { key: "incomeFromFeeGLId", label: "Income From Fee GL" },
  { key: "incomeFromPenaltyGLId", label: "Income From Penalty GL" },
  { key: "transfersInSuspenseGLId", label: "Transfers In Suspense GL" },
  { key: "overdraftPortfolioGLId", label: "Overdraft Portfolio GL" },
  { key: "writeOffGLId", label: "Write Off GL" },
  { key: "escheatLiabilityGLId", label: "Escheat Liability GL" },
  { key: "incomeFromInterestGLId", label: "Income From Interest GL" },
];

// Field keys that hold a boolean toggle rather than plain text/number.
const CHECKBOX_FIELDS = [
  "enforce_min_required_balance",
  "allow_overdraft",
  "withhold_tax",
  "is_lien_allowed",
];

// Every text/number/select field is marked `required` in the form, so all
// of these must be filled in before the submit button is enabled.
const REQUIRED_TEXT_FIELDS = Object.keys(emptyAccountProductForm).filter(
  (key) => !CHECKBOX_FIELDS.includes(key)
);

export default function AccountProductFormDrawer({
  isOpen,
  onClose,
  selectedAccountProduct,
  onSubmit,
  submitting,
  currencies,
  generalLedgers,
}: AccountProductFormDrawerProps) {
  const [formData, setFormData] = useState<AccountProductFormData>(emptyAccountProductForm);

  useEffect(() => {
    if (isOpen) {
      if (selectedAccountProduct) {
        const seeded: AccountProductFormData = { ...emptyAccountProductForm };
        for (const key of Object.keys(emptyAccountProductForm)) {
          if (selectedAccountProduct[key] !== undefined && selectedAccountProduct[key] !== null) {
            if (key === "name") {
              seeded[key] = toDisplayLabel(String(selectedAccountProduct[key]));
            } else {
              seeded[key] = CHECKBOX_FIELDS.includes(key)
                ? Boolean(selectedAccountProduct[key])
                : String(selectedAccountProduct[key]);
            }
          }
        }
        setFormData(seeded);
      } else {
        setFormData({ ...emptyAccountProductForm });
      }
    }
  }, [isOpen, selectedAccountProduct]);

  function handleInputChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const target = event.target;
    const { name, value } = target;

    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      setFormData((current) => ({ ...current, [name]: target.checked }));
      return;
    }

    setFormData((current) => ({ ...current, [name]: value }));
  }

  const ledgersById = useMemo(
    () => new Map(generalLedgers.map((ledger) => [String(ledger.id), ledger])),
    [generalLedgers]
  );

  const selectedCurrency = currencies.find(
    (currency) => String(currency.id) === String(formData.currency_id)
  );

  // Re-derived on every render so the mismatch warning is live as the user
  // picks the product currency and/or any GL account.
  const glCurrencyErrors: Record<string, string> = {};
  if (formData.currency_id) {
    for (const { key, label } of GL_FIELDS) {
      const glId = formData[key];
      if (!glId) continue;

      const ledger = ledgersById.get(String(glId));
      if (ledger && String(ledger.currency_id) !== String(formData.currency_id)) {
        glCurrencyErrors[key] = `${label} is in ${ledger.currency_code ?? "a different currency"}, but the product currency is ${selectedCurrency?.code ?? "different"}.`;
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
        className={`fixed right-0 top-0 z-[9999] flex h-screen w-full max-w-[640px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center border-b border-slate-200 p-6 bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {selectedAccountProduct ? "Update Account Product" : "Add New Account Product"}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Configure the account product details below.
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
              <Input
                label="Product Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g. Dollar Savings"
              />

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Product Type"
                  name="product_type"
                  value={formData.product_type}
                  onChange={handleInputChange}
                >
                  <option value="savings">Savings</option>
                  <option value="current">Current</option>
                  <option value="domiciliary">Domiciliary</option>
                  <option value="virtual">Virtual</option>
                  <option value="wallet">Wallet</option>
                </Select>

                <Select
                  label="Currency"
                  name="currency_id"
                  value={formData.currency_id}
                  onChange={handleInputChange}
                >
                  <option value="">Select currency</option>
                  {currencies.map((currency) => (
                    <option key={currency.id} value={currency.id}>
                      {currency.code ?? currency.name} — {currency.name}
                    </option>
                  ))}
                </Select>
              </div>

              <Textarea
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="e.g. Dollar savings account with interest"
              />
            </Section>

            <Section title="Interest Settings">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Interest Rate (%)"
                  name="interest_rate"
                  type="number"
                  step="0.01"
                  value={formData.interest_rate}
                  onChange={handleInputChange}
                  placeholder="e.g. 10.5"
                />
                <Select
                  label="Interest Type"
                  name="interest_type"
                  value={formData.interest_type}
                  onChange={handleInputChange}
                >
                  <option value="daily_balance">Daily Balance</option>
                  <option value="average_daily_balance">Average Daily Balance</option>
                  <option value="minimum_balance">Minimum Balance</option>
                  <option value="flat_rate">Flat Rate</option>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Compounding Period"
                  name="interest_compounding_period"
                  value={formData.interest_compounding_period}
                  onChange={handleInputChange}
                >
                  {PERIOD_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {toDisplayLabel(option)}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Posting Period"
                  name="interest_posting_period"
                  value={formData.interest_posting_period}
                  onChange={handleInputChange}
                >
                  {PERIOD_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {toDisplayLabel(option)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Calculation Days / Year"
                  name="interest_calculation_days_in_year"
                  type="number"
                  value={formData.interest_calculation_days_in_year}
                  onChange={handleInputChange}
                  placeholder="e.g. 365"
                />
                <Input
                  label="Min Balance for Interest Calc."
                  name="min_balance_for_interest_calculation"
                  type="number"
                  step="0.01"
                  value={formData.min_balance_for_interest_calculation}
                  onChange={handleInputChange}
                  placeholder="e.g. 1000"
                />
              </div>
            </Section>

            <Section title="Balance Requirements">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Min Opening Balance"
                  name="min_required_opening_balance"
                  type="number"
                  step="0.01"
                  value={formData.min_required_opening_balance}
                  onChange={handleInputChange}
                  placeholder="e.g. 1000"
                />
                <Input
                  label="Min Required Balance"
                  name="min_required_balance"
                  type="number"
                  step="0.01"
                  value={formData.min_required_balance}
                  onChange={handleInputChange}
                  placeholder="e.g. 500"
                />
              </div>

              <Checkbox
                label="Enforce minimum required balance"
                name="enforce_min_required_balance"
                checked={formData.enforce_min_required_balance}
                onChange={handleInputChange}
              />
            </Section>

            <Section title="Locking & Dormancy">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Locking Period Frequency"
                  name="locking_period_frequency"
                  type="number"
                  value={formData.locking_period_frequency}
                  onChange={handleInputChange}
                  placeholder="e.g. 3"
                />
                <Select
                  label="Locking Period Frequency Type"
                  name="locking_period_frequency_type"
                  value={formData.locking_period_frequency_type}
                  onChange={handleInputChange}
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </Select>
              </div>

              <Input
                label="Dormancy Period (days)"
                name="dormancy_period_days"
                type="number"
                value={formData.dormancy_period_days}
                onChange={handleInputChange}
                placeholder="e.g. 365"
              />
            </Section>

            <Section title="Overdraft">
              <Checkbox
                label="Allow overdraft"
                name="allow_overdraft"
                checked={formData.allow_overdraft}
                onChange={handleInputChange}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Overdraft Limit"
                  name="overdraft_limit"
                  type="number"
                  step="0.01"
                  value={formData.overdraft_limit}
                  onChange={handleInputChange}
                  placeholder="e.g. 50000"
                />
                <Input
                  label="Overdraft Interest Rate (%)"
                  name="overdraft_interest_rate"
                  type="number"
                  step="0.01"
                  value={formData.overdraft_interest_rate}
                  onChange={handleInputChange}
                  placeholder="e.g. 18.5"
                />
              </div>
            </Section>

            <Section title="Fees & Tax">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Withdrawal Fee Amount"
                  name="withdrawal_fee_amount"
                  type="number"
                  step="0.01"
                  value={formData.withdrawal_fee_amount}
                  onChange={handleInputChange}
                  placeholder="e.g. 100"
                />
                <Select
                  label="Withdrawal Fee Type"
                  name="withdrawal_fee_type"
                  value={formData.withdrawal_fee_type}
                  onChange={handleInputChange}
                >
                  <option value="flat">Flat</option>
                  <option value="percentage">Percentage</option>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Annual Fee Amount"
                  name="annual_fee_amount"
                  type="number"
                  step="0.01"
                  value={formData.annual_fee_amount}
                  onChange={handleInputChange}
                  placeholder="e.g. 500"
                />
                <Input
                  label="On Month"
                  name="annual_fee_on_month"
                  type="number"
                  value={formData.annual_fee_on_month}
                  onChange={handleInputChange}
                  placeholder="e.g. 12"
                />
                <Input
                  label="On Day"
                  name="annual_fee_on_day"
                  type="number"
                  value={formData.annual_fee_on_day}
                  onChange={handleInputChange}
                  placeholder="e.g. 31"
                />
              </div>

              <Checkbox
                label="Withhold tax"
                name="withhold_tax"
                checked={formData.withhold_tax}
                onChange={handleInputChange}
              />
            </Section>

            <Section title="Lien">
              <Checkbox
                label="Allow lien"
                name="is_lien_allowed"
                checked={formData.is_lien_allowed}
                onChange={handleInputChange}
              />

              <Input
                label="Max Allowed Lien Limit"
                name="max_allowed_lien_limit"
                type="number"
                step="0.01"
                value={formData.max_allowed_lien_limit}
                onChange={handleInputChange}
                placeholder="e.g. 100000"
              />
            </Section>

            <Section title="General Ledger Mappings">
              {!formData.currency_id && (
                <p className="text-xs font-medium text-amber-600">
                  Select a product currency above to enable GL currency matching.
                </p>
              )}
              <div className="grid grid-cols-2 gap-4">
                {GL_FIELDS.map(({ key, label }) => (
                  <GLSelect
                    key={key}
                    label={label}
                    name={key}
                    value={formData[key]}
                    onChange={handleInputChange}
                    generalLedgers={generalLedgers}
                    error={glCurrencyErrors[key]}
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
                : selectedAccountProduct
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
  const { label, ...rest } = props;
  return (
    <label className="block">
      <span className="block font-bold text-sm text-slate-800">{label}</span>
      <input
        required
        {...rest}
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition"
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

function Select(props: Record<string, any>) {
  const { label, children, error, ...rest } = props;
  return (
    <label className="block">
      <span className="block font-bold text-sm text-slate-800">{label}</span>
      <select
        required
        {...rest}
        className={`mt-2 w-full rounded-xl border bg-white p-3 text-sm text-slate-900 outline-none focus:ring-1 transition ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-500"
            : "border-slate-300 focus:border-[#29478f] focus:ring-[#29478f]"
        }`}
      >
        {children}
      </select>
      {error && <p className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>}
    </label>
  );
}

function GLSelect({
  label,
  name,
  value,
  onChange,
  generalLedgers,
  error,
}: {
  label: string;
  name: string;
  value: any;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  generalLedgers: LookupOption[];
  error?: string;
}) {
  return (
    <Select label={label} name={name} value={value} onChange={onChange} error={error}>
      <option value="">Select GL account</option>
      {generalLedgers.map((ledger) => (
        <option key={ledger.id} value={ledger.id}>
          {toDisplayLabel(ledger.name)}
          {ledger.currency_code ? ` (${ledger.currency_code})` : ""}
        </option>
      ))}
    </Select>
  );
}

function Checkbox(props: Record<string, any>) {
  const { label, ...rest } = props;
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        {...rest}
        className="h-4 w-4 rounded border-slate-300 text-[#173673] focus:ring-[#29478f]"
      />
      <span className="text-sm font-semibold text-slate-800">{label}</span>
    </label>
  );
}
