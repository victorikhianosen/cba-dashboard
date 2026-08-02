"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { X } from "lucide-react";
import SearchableSelect from "@/components/SearchableSelect";

type Ledger = Record<string, any>;
type Currency = Record<string, any>;
type LedgerFormData = Record<string, any>;

interface GeneralLedgerFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLedger: Ledger | null;
  onSubmit: (formData: LedgerFormData) => Promise<void>;
  submitting: boolean;
  allLedgers?: Ledger[];
  currencies?: Currency[];
}

const emptyLedgerForm: LedgerFormData = {
  name: "",
  currency_id: "",
  parent_id: "",
  classification: "asset",
  type: "",
  manual_journal_entries_allowed: false,
  description: "",
};

const classifications = ["asset", "liability", "equity", "income", "expense"];

// The API stores name/type as snake_case ("operating_expenses"); show them
// as normal words in the form and convert back on submit.
function toDisplayText(value: string) {
  return (value ?? "")
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function toSnakeCase(value: string) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function GeneralLedgerFormDrawer({
  isOpen,
  onClose,
  selectedLedger,
  onSubmit,
  submitting,
  allLedgers = [],
  currencies = [],
}: GeneralLedgerFormDrawerProps) {
  const [formData, setFormData] = useState<LedgerFormData>(emptyLedgerForm);

  useEffect(() => {
    if (isOpen) {
      if (selectedLedger) {
        setFormData({
          name: toDisplayText(selectedLedger.name ?? ""),
          currency_id: selectedLedger.currency_id ?? "",
          parent_id: selectedLedger.parent_id ?? "",
          classification: selectedLedger.classification ?? "asset",
          type: toDisplayText(selectedLedger.type ?? ""),
          manual_journal_entries_allowed: Boolean(
            selectedLedger.manual_journal_entries_allowed
          ),
          description: selectedLedger.description ?? "",
        });
      } else {
        setFormData({ ...emptyLedgerForm });
      }
    }
  }, [isOpen, selectedLedger]);

  function handleInputChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value, type } = event.target;
    const checked = (event.target as HTMLInputElement).checked;

    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit({
      ...formData,
      name: toSnakeCase(formData.name),
      type: toSnakeCase(formData.type),
    });
  }

  const parentOptions = allLedgers.filter(
    (ledger) => !selectedLedger || ledger.id !== selectedLedger.id
  );

  return (
    <>
      {/* OVERLAY */}
      {isOpen && (
        <button
          type="button"
          onClick={submitting ? undefined : onClose}
          className="fixed inset-0 z-[9998] bg-black/50 cursor-default transition-opacity"
        />
      )}

      {/* DRAWER */}
      <aside
        className={`fixed right-0 top-0 z-[9999] flex h-screen w-full max-w-[520px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center border-b border-slate-200 p-6 bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {selectedLedger ? "Update Account" : "Add New Account"}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Enter the chart of accounts information below.
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
          <div className="flex-1 space-y-5 overflow-y-auto p-6 bg-white">
            <Input
              label="Account Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g. Savings Account"
            />

            {!selectedLedger && (
              <SearchableSelect
                label="Currency"
                name="currency_id"
                value={formData.currency_id}
                onChange={handleInputChange}
                placeholder="Select a currency"
                options={currencies.map((currency) => ({
                  value: String(currency.id),
                  label: `${currency.code} — ${currency.name}`,
                  sublabel: currency.code,
                }))}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="block font-bold text-sm text-slate-800">Classification</span>
                <select
                  name="classification"
                  required
                  value={formData.classification}
                  onChange={handleInputChange}
                  className="mt-2 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 capitalize outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition"
                >
                  {classifications.map((classification) => (
                    <option key={classification} value={classification} className="capitalize">
                      {classification}
                    </option>
                  ))}
                </select>
              </label>

              <Input
                label="Type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                placeholder="e.g. Operating Revenue"
              />
            </div>

            <label className="block">
              <span className="block font-bold text-sm text-slate-800">Parent Account</span>
              <select
                name="parent_id"
                value={formData.parent_id ?? ""}
                onChange={handleInputChange}
                className="mt-2 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition"
              >
                <option value="">— No parent (top-level account) —</option>
                {parentOptions.map((ledger) => (
                  <option key={ledger.id} value={ledger.id}>
                    {ledger.gl_code} — {ledger.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="block font-bold text-sm text-slate-800">Description</span>
              <textarea
                name="description"
                required
                rows={3}
                value={formData.description}
                onChange={handleInputChange}
                placeholder="What this account is used for..."
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition"
              />
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <input
                type="checkbox"
                name="manual_journal_entries_allowed"
                checked={formData.manual_journal_entries_allowed}
                onChange={handleInputChange}
                className="h-4 w-4 rounded accent-[#173673]"
              />
              <span>
                <span className="block text-sm font-bold text-slate-800">
                  Allow Manual Journal Entries
                </span>
                <span className="block text-xs text-slate-500">
                  Permit staff to post manual entries directly to this account.
                </span>
              </span>
            </label>
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
              disabled={submitting}
              className="rounded-xl bg-[#173673] px-5 py-3 text-sm font-semibold text-white hover:bg-[#10295c] disabled:opacity-50 transition shadow-sm"
            >
              {submitting
                ? "Please wait..."
                : selectedLedger
                ? "Update Account"
                : "Create Account"}
            </button>
          </div>
        </form>
      </aside>
    </>
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
