"use client";

import { type ChangeEvent } from "react";

interface AmountInputProps {
  // Raw numeric string, no commas (e.g. "1000000" or "1000000.50") — what actually gets
  // sent to the backend. The component only ever shows this formatted with thousand
  // separators; callers never see commas in `value`.
  value: string;
  onChange: (raw: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

function formatWithCommas(raw: string): string {
  if (!raw) return "";
  const [intPart, decimalPart] = raw.split(".");
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimalPart !== undefined ? `${formattedInt}.${decimalPart}` : formattedInt;
}

// Strips everything but digits and a single decimal point.
function toRawNumericString(formatted: string): string {
  const stripped = formatted.replace(/,/g, "").replace(/[^0-9.]/g, "");
  const [first, ...rest] = stripped.split(".");
  return rest.length > 0 ? `${first}.${rest.join("")}` : first;
}

// Comma-formatted amount field (₦1,000,000) — displays with thousand separators while
// typing, but always reports back a plain numeric string via onChange so callers never
// have to deal with commas themselves.
export default function AmountInput({
  value,
  onChange,
  placeholder = "Amount",
  className,
  disabled,
  autoFocus,
}: AmountInputProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(toRawNumericString(event.target.value));
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      value={formatWithCommas(value)}
      onChange={handleChange}
      disabled={disabled}
      autoFocus={autoFocus}
      className={className}
    />
  );
}
