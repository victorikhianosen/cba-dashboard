"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "react-toastify";
import MoneyInput from "@/components/MoneyInput";
import SearchableSelect from "@/components/SearchableSelect";
import { toDisplayLabel } from "@/lib/format";

type InvestmentProduct = Record<string, any>;
type InvestmentProductFormData = Record<string, any>;
type LookupOption = Record<string, any>;

interface InvestmentProductFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedInvestmentProduct: InvestmentProduct | null;
  onSubmit: (formData: InvestmentProductFormData, iconFile: File | null) => Promise<void>;
  submitting: boolean;
  currencies: LookupOption[];
  generalLedgers: LookupOption[];
}

const POSTING_PERIOD_OPTIONS = [
  "upfront",
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "bi_annually",
  "annually",
  "bullet",
];

const emptyInvestmentProductForm: InvestmentProductFormData = {
  name: "",
  short_name: "",
  description: "",
  currency_id: "",
  interest_rate: "",
  allowed_interest_posting_periods: [] as string[],
  min_tenure_days: "",
  max_tenure_days: "",
  min_deposit_amount: "",
  max_deposit_amount: "",
  auto_renew: false,
  allow_top_up: false,
  allow_partial_withdrawal: false,
  minimum_retention_percentage: "",
  allow_early_liquidation: false,
  early_liquidation_lock_days: "",
  early_liquidation_penalty_rate: "",
  withholding_tax_rate: "",
  is_default: false,
  investmentFundingAccountId: "",
  interestExpenseAccountId: "",
  interestPayableAccountId: "",
  earlyLiquidationPenaltyIncomeAccountId: "",
  withholdingTaxPayableAccountId: "",
};

// GL select fields that must all be denominated in the product's currency. All 5 are
// required — every role maps to a real product setting (interest_rate,
// early_liquidation_penalty_rate, withholding_tax_rate). Investment Funding GL is used in
// both directions — credited when a deposit is funded, debited when principal is repaid at
// maturity — so there's no separate "settlement" GL.
const GL_FIELDS: { key: string; label: string; optional?: boolean }[] = [
  { key: "investmentFundingAccountId", label: "Investment Funding GL" },
  { key: "interestExpenseAccountId", label: "Interest Expense GL" },
  { key: "interestPayableAccountId", label: "Interest Payable GL" },
  { key: "earlyLiquidationPenaltyIncomeAccountId", label: "Early Liquidation Penalty Income GL" },
  { key: "withholdingTaxPayableAccountId", label: "Withholding Tax Payable GL" },
];

// Field keys that hold a boolean toggle rather than plain text/number.
const CHECKBOX_FIELDS = [
  "auto_renew",
  "allow_top_up",
  "allow_partial_withdrawal",
  "allow_early_liquidation",
  "is_default",
];

const OPTIONAL_FIELDS = ["withholding_tax_rate", "minimum_retention_percentage"];

// Every text/number/select field is marked `required` unless it's a checkbox
// or explicitly optional — all remaining ones must be filled before submit.
const REQUIRED_TEXT_FIELDS = Object.keys(emptyInvestmentProductForm).filter(
  (key) =>
    !CHECKBOX_FIELDS.includes(key) &&
    !OPTIONAL_FIELDS.includes(key) &&
    key !== "allowed_interest_posting_periods"
);

export default function InvestmentProductFormDrawer({
  isOpen,
  onClose,
  selectedInvestmentProduct,
  onSubmit,
  submitting,
  currencies,
  generalLedgers,
}: InvestmentProductFormDrawerProps) {
  const [formData, setFormData] = useState<InvestmentProductFormData>(emptyInvestmentProductForm);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (selectedInvestmentProduct) {
        const seeded: InvestmentProductFormData = { ...emptyInvestmentProductForm };
        for (const key of Object.keys(emptyInvestmentProductForm)) {
          const value = selectedInvestmentProduct[key];
          if (value === undefined || value === null) continue;

          if (key === "allowed_interest_posting_periods") {
            seeded[key] = Array.isArray(value) ? value : [];
          } else if (key === "name") {
            seeded[key] = toDisplayLabel(String(value));
          } else if (CHECKBOX_FIELDS.includes(key)) {
            seeded[key] = Boolean(value);
          } else {
            seeded[key] = String(value);
          }
        }
        setFormData(seeded);
        setIconPreview(selectedInvestmentProduct.icon ?? null);
      } else {
        setFormData({ ...emptyInvestmentProductForm });
        setIconPreview(null);
      }
      setIconFile(null);
    }
  }, [isOpen, selectedInvestmentProduct]);

  function handleIconChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setIconFile(file);

    if (file) {
      setIconPreview(URL.createObjectURL(file));
    }
  }

  function handleInputChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const target = event.target;
    const { name, value } = target;

    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      setFormData((current) => ({ ...current, [name]: target.checked }));
      return;
    }

    if ((name === "min_tenure_days" || name === "max_tenure_days") && value !== "") {
      const clamped = String(Math.min(365, Math.max(1, Number(value))));
      setFormData((current) => ({ ...current, [name]: clamped }));
      return;
    }

    // Backend rejects more than 2 decimal places and anything over 100% — round/clamp as
    // the admin types instead of letting them submit a value that only fails after the fact.
    if (
      (name === "interest_rate" ||
        name === "early_liquidation_penalty_rate" ||
        name === "withholding_tax_rate" ||
        name === "minimum_retention_percentage") &&
      value !== ""
    ) {
      const parts = value.split(".");
      const rounded = parts.length > 1 ? `${parts[0]}.${parts[1].slice(0, 2)}` : value;
      const clamped = Number(rounded) > 100 ? "100" : rounded;
      setFormData((current) => ({ ...current, [name]: clamped }));
      return;
    }

    setFormData((current) => ({ ...current, [name]: value }));
  }

  function togglePostingPeriod(period: string) {
    setFormData((current) => {
      const selected: string[] = current.allowed_interest_posting_periods ?? [];
      const next = selected.includes(period)
        ? selected.filter((item) => item !== period)
        : [...selected, period];
      return { ...current, allowed_interest_posting_periods: next };
    });
  }

  const ledgersById = useMemo(
    () => new Map(generalLedgers.map((ledger) => [String(ledger.id), ledger])),
    [generalLedgers]
  );

  const selectedCurrency = currencies.find(
    (currency) => String(currency.id) === String(formData.currency_id)
  );

  // Until a currency is picked there's nothing to filter against, so show every GL.
  // Once one is picked, only that currency's GLs are offered — a mismatch becomes
  // impossible to create, not just flagged after the fact.
  const currencyFilteredLedgers = formData.currency_id
    ? generalLedgers.filter((ledger) => String(ledger.currency_id) === String(formData.currency_id))
    : generalLedgers;

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

  const isFormComplete =
    REQUIRED_TEXT_FIELDS.every((key) => {
      const value = formData[key];
      return value !== "" && value !== null && value !== undefined;
    }) && (formData.allowed_interest_posting_periods ?? []).length > 0;

  const canSubmit = isFormComplete && !hasCurrencyMismatch;

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (hasCurrencyMismatch) {
      toast.error("Fix the highlighted GL accounts — they must match the product currency.");
      return;
    }

    if (!isFormComplete) {
      toast.error("Please fill in all required fields, including at least one posting period.");
      return;
    }

    onSubmit(formData, iconFile);
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
              {selectedInvestmentProduct ? "Update Investment Product" : "Add New Investment Product"}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Configure the investment product details below.
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
                  placeholder="e.g. Fixed Investment"
                />
                <Input
                  label="Short Name"
                  name="short_name"
                  value={formData.short_name}
                  onChange={handleInputChange}
                  placeholder="e.g. FIX"
                />
              </div>

              <label className="block">
                <span className="block font-bold text-sm text-slate-800">Icon (optional)</span>
                <div className="mt-2 flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {iconPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={iconPreview}
                        alt="Investment product icon preview"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <ImagePlus size={22} className="text-slate-400" />
                    )}
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleIconChange}
                    className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                  />
                </div>
              </label>

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
                placeholder="e.g. 12-month fixed investment plan"
              />
            </Section>

            <Section title="Interest Settings">
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
                  placeholder="e.g. 10.5"
                />
                <Input
                  label="Withholding Tax Rate (%)"
                  name="withholding_tax_rate"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  required={false}
                  value={formData.withholding_tax_rate}
                  onChange={handleInputChange}
                  placeholder="e.g. 10"
                />
              </div>

              <div>
                <span className="block font-bold text-sm text-slate-800">
                  Allowed Interest Posting Periods
                </span>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {POSTING_PERIOD_OPTIONS.map((period) => {
                    const checked = (formData.allowed_interest_posting_periods ?? []).includes(
                      period
                    );
                    return (
                      <label
                        key={period}
                        className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white p-2.5"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePostingPeriod(period)}
                          className="h-4 w-4 rounded border-slate-300 text-[#173673] focus:ring-[#29478f]"
                        />
                        <span className="text-sm font-semibold text-slate-800">
                          {toDisplayLabel(period)}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {(formData.allowed_interest_posting_periods ?? []).length === 0 && (
                  <p className="mt-1.5 text-xs font-semibold text-amber-600">
                    Select at least one posting period.
                  </p>
                )}
              </div>
            </Section>

            <Section title="Tenure & Deposit Limits">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Min Tenure (days)"
                  name="min_tenure_days"
                  type="number"
                  min={1}
                  max={365}
                  value={formData.min_tenure_days}
                  onChange={handleInputChange}
                  placeholder="e.g. 30"
                />
                <Input
                  label="Max Tenure (days)"
                  name="max_tenure_days"
                  type="number"
                  min={1}
                  max={365}
                  value={formData.max_tenure_days}
                  onChange={handleInputChange}
                  placeholder="e.g. 365"
                />
              </div>
              <p className="-mt-2 text-xs font-medium text-slate-500">
                The customer picks any tenure within this range when opening an investment.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <MoneyInput
                  label="Min Deposit Amount"
                  name="min_deposit_amount"
                  value={formData.min_deposit_amount}
                  onChange={handleInputChange}
                  placeholder="e.g. 10,000"
                />
                <MoneyInput
                  label="Max Deposit Amount"
                  name="max_deposit_amount"
                  value={formData.max_deposit_amount}
                  onChange={handleInputChange}
                  placeholder="e.g. 5,000,000"
                />
              </div>
            </Section>

            <Section title="Product Behaviour">
              <div className="grid grid-cols-2 gap-3">
                <Checkbox
                  label="Auto renew on maturity"
                  name="auto_renew"
                  checked={formData.auto_renew}
                  onChange={handleInputChange}
                />
                <Checkbox
                  label="Allow top-up"
                  name="allow_top_up"
                  checked={formData.allow_top_up}
                  onChange={handleInputChange}
                />
                <Checkbox
                  label="Allow partial withdrawal"
                  name="allow_partial_withdrawal"
                  checked={formData.allow_partial_withdrawal}
                  onChange={handleInputChange}
                />
                <Checkbox
                  label="Allow early liquidation"
                  name="allow_early_liquidation"
                  checked={formData.allow_early_liquidation}
                  onChange={handleInputChange}
                />
                <Checkbox
                  label="Default product"
                  name="is_default"
                  checked={formData.is_default}
                  onChange={handleInputChange}
                />
              </div>

              {formData.allow_partial_withdrawal && (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Minimum Retention (%)"
                    name="minimum_retention_percentage"
                    type="number"
                    step="0.01"
                    min={0}
                    max={100}
                    required={false}
                    value={formData.minimum_retention_percentage}
                    onChange={handleInputChange}
                    placeholder="e.g. 10"
                  />
                </div>
              )}

              {formData.auto_renew && (
                <p className="text-xs font-medium text-slate-500">
                  Rollover type (simple vs compound) is chosen by the customer when they open
                  an investment against this product, not here.
                </p>
              )}

              {formData.allow_early_liquidation && (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Early Liquidation Lock Days"
                    name="early_liquidation_lock_days"
                    type="number"
                    value={formData.early_liquidation_lock_days}
                    onChange={handleInputChange}
                    placeholder="e.g. 30"
                  />
                  <Input
                    label="Early Liquidation Penalty Rate (%)"
                    name="early_liquidation_penalty_rate"
                    type="number"
                    step="0.01"
                    min={0}
                    max={100}
                    value={formData.early_liquidation_penalty_rate}
                    onChange={handleInputChange}
                    placeholder="e.g. 2.5"
                  />
                </div>
              )}
            </Section>

            <Section title="General Ledger Mappings">
              {!formData.currency_id && (
                <p className="text-xs font-medium text-amber-600">
                  Select a product currency above to enable GL currency matching.
                </p>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {GL_FIELDS.map(({ key, label, optional }) => (
                  <GLSelect
                    key={key}
                    label={optional ? `${label} (optional)` : label}
                    name={key}
                    required={!optional}
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
                : selectedInvestmentProduct
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
  required = true,
  emptyMessage,
}: {
  label: string;
  name: string;
  value: any;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  generalLedgers: LookupOption[];
  error?: string;
  required?: boolean;
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
        required={required}
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
