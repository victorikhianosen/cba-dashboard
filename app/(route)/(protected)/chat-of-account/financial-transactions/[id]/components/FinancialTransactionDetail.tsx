"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";

type FinancialTransaction = Record<string, any>;

interface FinancialTransactionDetailProps {
  transaction: FinancialTransaction;
}

function labelize(value?: string | null) {
  if (!value) return "—";
  return value
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatAmount(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num)
    ? String(value)
    : num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default function FinancialTransactionDetail({ transaction }: FinancialTransactionDetailProps) {
  return (
    <>
      {/* HEADER */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          href="/chat-of-account/financial-transactions"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#29478f] transition"
        >
          <ArrowLeft size={16} />
          Back to Financial Transactions
        </Link>

        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#29478f]">
              <ArrowLeftRight size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {transaction.transaction_reference}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                {transaction.module && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 capitalize">
                    {labelize(transaction.module)}
                  </span>
                )}
                {transaction.transaction_type && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 capitalize">
                    {labelize(transaction.transaction_type)}
                  </span>
                )}
                {transaction.is_reversed && (
                  <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-800 border border-red-300">
                    Reversed
                  </span>
                )}
                <StatusBadge status={transaction.status} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CUSTOMER */}
      <Section title="Customer">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Customer" value={transaction.customer?.full_name} />
          <Field label="CIF Number" value={transaction.customer?.cif_number} />
        </div>
      </Section>

      {/* AMOUNTS */}
      <Section title="Amounts">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <Field
            label="Amount"
            value={
              transaction.amount != null
                ? `${transaction.currency_code ?? ""} ${formatAmount(transaction.amount)}`
                : "—"
            }
          />
          <Field
            label="Fee"
            value={
              transaction.fee != null
                ? `${transaction.currency_code ?? ""} ${formatAmount(transaction.fee)}`
                : "—"
            }
          />
          <Field
            label="VAT"
            value={
              transaction.vat != null
                ? `${transaction.currency_code ?? ""} ${formatAmount(transaction.vat)}`
                : "—"
            }
          />
          <Field label="Exchange Rate" value={transaction.exchange_rate} />
        </div>
      </Section>

      {/* DETAILS */}
      <Section title="Details">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Transaction Reference" value={transaction.transaction_reference} />
          <Field label="Posting ID" value={transaction.posting_id} />
          <Field label="Module" value={labelize(transaction.module)} />
          <Field label="Type" value={labelize(transaction.transaction_type)} />
          <Field label="Reversed" value={transaction.is_reversed ? "Yes" : "No"} />
          <Field label="Processed At" value={formatDateTime(transaction.processed_at)} />
          <Field label="Completed At" value={formatDateTime(transaction.completed_at)} />
          <Field label="Created At" value={formatDateTime(transaction.created_at)} />
        </div>
        {transaction.narration && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Narration</p>
            <p className="mt-1 text-sm text-slate-800">{transaction.narration}</p>
          </div>
        )}
      </Section>

      {/* JOURNAL ENTRIES */}
      {Array.isArray(transaction.journal_entries) && transaction.journal_entries.length > 0 && (
        <Section title="Journal Entries">
          <div className="overflow-x-auto">
            <table className="w-full min-w-150">
              <thead>
                <tr className="border-b border-slate-200">
                  <Heading>GL</Heading>
                  <Heading>Debit/Credit</Heading>
                  <Heading>Amount</Heading>
                  <Heading>Balance Before</Heading>
                  <Heading>Balance After</Heading>
                  <Heading>Posting Date</Heading>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transaction.journal_entries.map((entry: Record<string, any>) => (
                  <tr key={entry.id}>
                    <td className="px-3 py-2 text-sm text-slate-800">
                      {entry.general_ledger
                        ? `${entry.general_ledger.gl_code} — ${labelize(entry.general_ledger.name)}`
                        : (entry.general_ledger_id ?? "—")}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold capitalize ${
                          entry.entry_type === "credit"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {entry.entry_type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm font-bold text-slate-900">
                      {entry.currency_code} {formatAmount(entry.amount)}
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-800">
                      {entry.currency_code} {formatAmount(entry.balance_before)}
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-800">
                      {entry.currency_code} {formatAmount(entry.balance_after)}
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-800">
                      {formatDateTime(entry.posting_date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* TRANSACTION LEGS */}
      {Array.isArray(transaction.transactions) && transaction.transactions.length > 0 && (
        <Section title="Transaction Legs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-150">
              <thead>
                <tr className="border-b border-slate-200">
                  <Heading>Reference</Heading>
                  <Heading>Account</Heading>
                  <Heading>Type</Heading>
                  <Heading>Counterparty</Heading>
                  <Heading>Amount</Heading>
                  <Heading>Status</Heading>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transaction.transactions.map((leg: Record<string, any>) => (
                  <tr key={leg.id}>
                    <td className="px-3 py-2 text-sm text-slate-800">{leg.reference}</td>
                    <td className="px-3 py-2 text-sm text-slate-800">
                      {leg.account?.account_number ?? "—"}
                      {leg.customer?.full_name && (
                        <p className="text-xs font-semibold text-slate-500">{leg.customer.full_name}</p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-bold capitalize ${
                          leg.type === "credit"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {labelize(leg.type)} ({labelize(leg.direction)})
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-800">
                      {leg.counterparty?.name ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-sm font-bold text-slate-900">
                      {leg.currency_code} {formatAmount(leg.amount)}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <StatusBadge status={leg.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </>
  );
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

function Heading({ children }: { children: ReactNode }) {
  return (
    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
      {children}
    </th>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "bg-green-100 text-green-800 border border-green-300",
    posted: "bg-green-100 text-green-800 border border-green-300",
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
