"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Receipt } from "lucide-react";

type Transaction = Record<string, any>;

interface TransactionDetailProps {
  transaction: Transaction;
}

function labelize(value?: string | null) {
  if (!value) return "—";
  return value
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default function TransactionDetail({ transaction }: TransactionDetailProps) {
  const router = useRouter();

  function goBack() {
    // Returns to wherever the user actually came from (an account's transactions
    // tab, the transactions list, etc.) instead of a hardcoded destination —
    // falls back to the transactions list only when there's no history to pop.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/chat-of-account/transactions");
    }
  }

  return (
    <>
      {/* HEADER */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#29478f] transition"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#29478f]">
              <Receipt size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {transaction.reference}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 capitalize">
                  {labelize(transaction.type)}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 capitalize">
                  {labelize(transaction.direction)}
                </span>
                {transaction.transaction_type && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 capitalize">
                    {labelize(transaction.transaction_type)}
                  </span>
                )}
                <StatusBadge status={transaction.status} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PARTIES */}
      <Section title="Parties">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Account</p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {transaction.account?.account_number ?? "—"}
            </p>
            {transaction.customer?.full_name && (
              <p className="mt-0.5 text-xs font-semibold text-slate-500">
                {transaction.customer.full_name}
                {transaction.customer.cif_number ? ` (${transaction.customer.cif_number})` : ""}
              </p>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Counterparty ({labelize(transaction.counterparty?.type)})
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {transaction.counterparty?.name ?? "—"}
            </p>
            {transaction.counterparty?.account_number && (
              <p className="mt-0.5 text-xs font-semibold text-slate-500">
                {transaction.counterparty.account_number}
              </p>
            )}
            {transaction.counterparty?.bank_name && (
              <p className="mt-0.5 text-xs font-semibold text-slate-500">
                {transaction.counterparty.bank_name}
                {transaction.counterparty.bank_code ? ` (${transaction.counterparty.bank_code})` : ""}
              </p>
            )}
          </div>
        </div>
      </Section>

      {/* AMOUNTS */}
      <Section title="Amounts">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <Field
            label="Amount"
            value={
              transaction.amount != null
                ? `${transaction.currency_code ?? ""} ${transaction.amount}`
                : "—"
            }
          />
          <Field
            label="Balance Before"
            value={
              transaction.balance_before != null
                ? `${transaction.currency_code ?? ""} ${transaction.balance_before}`
                : "—"
            }
          />
          <Field
            label="Balance After"
            value={
              transaction.balance_after != null
                ? `${transaction.currency_code ?? ""} ${transaction.balance_after}`
                : "—"
            }
          />
        </div>
      </Section>

      {/* DETAILS */}
      <Section title="Details">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Transaction Reference" value={transaction.transaction_reference} />
          <Field label="Entry Group ID" value={transaction.entry_group_id} />
          <Field label="Module" value={labelize(transaction.module)} />
          <Field label="Category" value={labelize(transaction.transaction_type)} />
          <Field label="Subtype" value={labelize(transaction.transaction_subtype)} />
          <Field label="Business Service" value={transaction.business_service} />
          <Field label="Channel" value={labelize(transaction.channel)} />
          <Field label="Service Provider" value={transaction.service_provider} />
          <Field label="Provider Reference" value={transaction.provider_reference} />
          <Field label="Value Date" value={formatDateTime(transaction.value_date)} />
          <Field label="Posting Date" value={formatDateTime(transaction.posting_date)} />
          <Field label="Created At" value={formatDateTime(transaction.created_at)} />
          <Field
            label="Created By"
            value={
              transaction.creator
                ? `${transaction.creator.first_name ?? ""} ${transaction.creator.last_name ?? ""}`.trim() ||
                  transaction.creator.username
                : "—"
            }
          />
        </div>
        {transaction.narration && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Narration</p>
            <p className="mt-1 text-sm text-slate-800">{transaction.narration}</p>
          </div>
        )}
      </Section>

      {/* METADATA */}
      {transaction.metadata &&
        (typeof transaction.metadata !== "object" || Object.keys(transaction.metadata).length > 0) && (
          <Section title="Metadata">
            {typeof transaction.metadata === "object" && !Array.isArray(transaction.metadata) ? (
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(transaction.metadata).map(([key, value]) => (
                  <Field key={key} label={labelize(key)} value={formatMetadataValue(value)} />
                ))}
              </div>
            ) : (
              <pre className="overflow-x-auto rounded-lg bg-slate-50 p-4 text-xs text-slate-700">
                {JSON.stringify(transaction.metadata, null, 2)}
              </pre>
            )}
          </Section>
        )}
    </>
  );
}

function formatMetadataValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value || "—"}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "bg-green-100 text-green-800 border border-green-300",
    pending: "bg-amber-100 text-amber-800 border border-amber-300",
    failed: "bg-red-100 text-red-800 border border-red-300",
    reversed: "bg-red-100 text-red-800 border border-red-300",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
        styles[status] || "bg-slate-100 text-slate-700 border border-slate-300"
      }`}
    >
      {status ? labelize(status) : "—"}
    </span>
  );
}
