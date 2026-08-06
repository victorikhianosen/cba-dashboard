// Formats a raw backend money value (often a 4- or 6-decimal string, e.g. "373500.0000")
// into a display-ready "373,500.00" — always 2 decimals, with thousand separators.
export function formatAmount(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  return Number.isNaN(num)
    ? String(value)
    : num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Converts a backend snake_case value (e.g. "dollar_savings") into a
// human-readable label (e.g. "Dollar Savings") for display in the UI.
export function toDisplayLabel(value: string | null | undefined): string {
  if (!value) return "";

  return value
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// Converts a human-readable label (e.g. "Dollar Savings") back into the
// backend's snake_case format (e.g. "dollar_savings") before submitting.
export function toSnakeCase(value: string | null | undefined): string {
  if (!value) return "";

  return value
    .trim()
    .split(/\s+/)
    .join("_")
    .toLowerCase();
}
