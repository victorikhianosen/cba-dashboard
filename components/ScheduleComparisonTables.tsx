"use client";

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

interface ScheduleComparisonTablesProps {
  current: Record<string, any>[] | null | undefined;
  projected: { installments?: Record<string, any>[] } | Record<string, any>[] | null | undefined;
  projectedEmptyHint?: string;
}

// Shared "current schedule vs projected schedule" side-by-side view — used both when a
// maker is deciding how much to liquidate (RequestPartialLiquidationModal) and when a
// checker is reviewing a submitted request before approving (ApprovePartialLiquidationModal).
export default function ScheduleComparisonTables({
  current,
  projected,
  projectedEmptyHint = "Enter a valid amount to see the projected schedule.",
}: ScheduleComparisonTablesProps) {
  const projectedRows = Array.isArray(projected) ? projected : projected?.installments;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div>
        <h3 className="mb-2 text-sm font-bold text-slate-700">
          Current Schedule{" "}
          <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">
            Before Liquidation
          </span>
        </h3>
        <PreviewTable rows={current} emptyMessage="No installments." />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-bold text-slate-700">
          Projected Schedule{" "}
          <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
            After Liquidation
          </span>
        </h3>
        <PreviewTable rows={projectedRows} emptyMessage={projectedEmptyHint} />
      </div>
    </div>
  );
}

function PreviewTable({
  rows,
  emptyMessage,
}: {
  rows: Record<string, any>[] | null | undefined;
  emptyMessage: string;
}) {
  if (!rows || rows.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 py-8 text-center text-sm font-medium text-slate-400">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
              #
            </th>
            <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
              Due Date
            </th>
            <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
              Interest
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={row.id ?? index}>
              <td className="px-3 py-2.5 text-sm font-semibold text-slate-700">
                {row.installment_number}
              </td>
              <td className="px-3 py-2.5 text-sm text-slate-700">{formatDate(row.due_date)}</td>
              <td className="px-3 py-2.5 text-sm font-bold text-slate-900">
                ₦{formatCurrency(row.expected_interest_amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
