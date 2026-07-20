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
