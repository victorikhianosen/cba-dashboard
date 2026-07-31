"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { X } from "lucide-react";

type Currency = Record<string, any>;
type CurrencyFormData = Record<string, any>;

interface CurrencyFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCurrency: Currency | null;
  onSubmit: (formData: CurrencyFormData) => Promise<void>;
  submitting: boolean;
}

const emptyCurrencyForm: CurrencyFormData = {
  code: "",
  name: "",
  symbol: "",
  buy_rate: "0",
  sell_rate: "0",
  exchange_rate: "1",
  is_base_currency: false,
};

export default function CurrencyFormDrawer({
  isOpen,
  onClose,
  selectedCurrency,
  onSubmit,
  submitting,
}: CurrencyFormDrawerProps) {
  const [formData, setFormData] = useState<CurrencyFormData>(emptyCurrencyForm);

  useEffect(() => {
    if (isOpen) {
      if (selectedCurrency) {
        setFormData({
          code: selectedCurrency.code ?? "",
          name: selectedCurrency.name ?? "",
          symbol: selectedCurrency.symbol ?? "",
          buy_rate: String(selectedCurrency.buy_rate ?? "0"),
          sell_rate: String(selectedCurrency.sell_rate ?? "0"),
          exchange_rate: String(selectedCurrency.exchange_rate ?? "1"),
          is_base_currency: Boolean(selectedCurrency.is_base_currency),
        });
      } else {
        setFormData({ ...emptyCurrencyForm });
      }
    }
  }, [isOpen, selectedCurrency]);

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
    onSubmit(formData);
  }

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
        className={`fixed right-0 top-0 z-[9999] flex h-screen w-full max-w-[480px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center border-b border-slate-200 p-6 bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Update Currency</h2>
            <p className="text-sm text-slate-600 mt-1">
              Only rates and the base currency flag can be changed here.
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
            <div className="grid grid-cols-2 gap-4">
              <Input label="Currency Code" name="code" value={formData.code} disabled className="uppercase" />
              <Input label="Symbol" name="symbol" value={formData.symbol} disabled />
            </div>

            <Input label="Currency Name" name="name" value={formData.name} disabled />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Buy Rate"
                name="buy_rate"
                type="number"
                step="0.000001"
                value={formData.buy_rate}
                onChange={handleInputChange}
                placeholder="0.00"
              />

              <Input
                label="Sell Rate"
                name="sell_rate"
                type="number"
                step="0.000001"
                value={formData.sell_rate}
                onChange={handleInputChange}
                placeholder="0.00"
              />
            </div>

            <Input
              label="Exchange Rate"
              name="exchange_rate"
              type="number"
              step="0.000001"
              value={formData.exchange_rate}
              onChange={handleInputChange}
              placeholder="1.00"
            />

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <input
                type="checkbox"
                name="is_base_currency"
                checked={formData.is_base_currency}
                onChange={handleInputChange}
                className="h-4 w-4 rounded accent-[#173673]"
              />
              <span>
                <span className="block text-sm font-bold text-slate-800">
                  Base Currency
                </span>
                <span className="block text-xs text-slate-500">
                  Use this currency as the platform&apos;s base currency.
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
              {submitting ? "Please wait..." : "Update Currency"}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

function Input(props: Record<string, any>) {
  const { label, className, ...rest } = props;
  return (
    <label className="block">
      <span className="block font-bold text-sm text-slate-800">{label}</span>
      <input
        required
        {...rest}
        className={`mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ${
          className ?? ""
        }`}
      />
    </label>
  );
}
