"use client";

import { type ChangeEvent } from "react";

interface MoneyInputProps {
  label: string;
  name: string;
  value: string | number;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

// Thousand-separated as you type (e.g. "1,000,000") — a native <input type="number">
// can't display commas at all, so this is a text input that formats for display but
// only ever emits the raw digits through onChange, exactly like a plain number field.
function formatWithCommas(raw: string): string {
  const digitsOnly = raw.replace(/[^\d.]/g, "");
  const firstDot = digitsOnly.indexOf(".");
  const normalized =
    firstDot === -1
      ? digitsOnly
      : digitsOnly.slice(0, firstDot + 1) + digitsOnly.slice(firstDot + 1).replace(/\./g, "");

  const [intPart, decPart] = normalized.split(".");
  const formattedInt = (intPart || "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
}

export default function MoneyInput({
  label,
  name,
  value,
  onChange,
  placeholder,
  required = true,
  error,
}: MoneyInputProps) {
  const displayValue =
    value === "" || value === null || value === undefined ? "" : formatWithCommas(String(value));

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value.replace(/,/g, "");

    if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) {
      return;
    }

    onChange({
      ...event,
      target: { ...event.target, name, value: raw },
    } as ChangeEvent<HTMLInputElement>);
  }

  return (
    <label className="block">
      <span className="block font-bold text-sm text-slate-800">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        required={required}
        name={name}
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={`mt-2 w-full rounded-xl border bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
            : "border-slate-300 focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
        }`}
      />
      {error && <p className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>}
    </label>
  );
}
