"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { formatAmount } from "@/lib/format";

type JournalEntry = Record<string, any>;

interface JournalEntryDetailProps {
  entry: JournalEntry;
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

export default function JournalEntryDetail({ entry }: JournalEntryDetailProps) {
  return (
    <>
      {/* HEADER */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          href="/chat-of-account/journal-entries"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#29478f] transition"
        >
          <ArrowLeft size={16} />
          Back to Journal Entries
        </Link>

        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#29478f]">
              <BookOpen size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {entry.journal_reference}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                    entry.entry_type === "debit"
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  }`}
                >
                  {entry.entry_type}
                </span>
                {entry.general_ledger && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">
                    {entry.general_ledger.gl_code} — {labelize(entry.general_ledger.name)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AMOUNTS */}
      <Section title="Amounts">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <Field
            label="Amount"
            value={entry.amount != null ? `${entry.currency_code ?? ""} ${formatAmount(entry.amount)}` : "—"}
          />
          <Field
            label="Balance Before"
            value={
              entry.balance_before != null
                ? `${entry.currency_code ?? ""} ${formatAmount(entry.balance_before)}`
                : "—"
            }
          />
          <Field
            label="Balance After"
            value={
              entry.balance_after != null
                ? `${entry.currency_code ?? ""} ${formatAmount(entry.balance_after)}`
                : "—"
            }
          />
        </div>
      </Section>

      {/* DETAILS */}
      <Section title="Details">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Journal Reference" value={entry.journal_reference} />
          <Field label="Transaction Reference" value={entry.transaction_reference} />
          <Field label="Entry Group ID" value={entry.entry_group_id} />
          <Field label="General Ledger" value={entry.general_ledger ? `${entry.general_ledger.gl_code} — ${labelize(entry.general_ledger.name)}` : "—"} />
          <Field label="Branch" value={entry.branch?.name} />
          <Field label="Created By" value={entry.created_by} />
          <Field label="Value Date" value={formatDateTime(entry.value_date)} />
          <Field label="Posting Date" value={formatDateTime(entry.posting_date)} />
          <Field label="Created At" value={formatDateTime(entry.created_at)} />
        </div>
        {entry.narration && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Narration</p>
            <p className="mt-1 text-sm text-slate-800">{entry.narration}</p>
          </div>
        )}
      </Section>

      {/* FINANCIAL TRANSACTION */}
      {entry.financial_transaction && (
        <Section title="Financial Transaction">
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Reference" value={entry.financial_transaction.transaction_reference} />
            <Field label="Module" value={labelize(entry.financial_transaction.module)} />
            <Field label="Type" value={labelize(entry.financial_transaction.transaction_type)} />
            <Field label="Status" value={labelize(entry.financial_transaction.status)} />
            <Field label="Customer" value={entry.financial_transaction.customer?.full_name} />
            <Field label="CIF Number" value={entry.financial_transaction.customer?.cif_number} />
          </div>
          {entry.financial_transaction.id && (
            <Link
              href={`/chat-of-account/financial-transactions/${entry.financial_transaction.id}`}
              className="inline-block text-xs font-semibold text-[#29478f] hover:underline"
            >
              View financial transaction
            </Link>
          )}
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
