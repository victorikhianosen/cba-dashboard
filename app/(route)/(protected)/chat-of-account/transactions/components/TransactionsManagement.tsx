"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { toast } from "react-toastify";
import { getTransactionsAction, getTransactionTypesAction } from "@/actions/transaction.action";
import ExportButtons from "@/components/ExportButtons";
import { handleApiError } from "@/lib/errors";

type Txn = Record<string, any>;
type Meta = Record<string, any> | null;

function labelize(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function TransactionsManagement() {
  const [transactions, setTransactions] = useState<Txn[]>([]);
  const [meta, setMeta] = useState<Meta>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [types, setTypes] = useState<string[]>([]);

  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [direction, setDirection] = useState("");

  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;

  const isFirstRender = useRef(true);

  async function fetchPage(page: number) {
    setPageLoading(true);
    try {
      const result: any = await getTransactionsAction(page, {
        from,
        to,
        search,
        transaction_type: transactionType,
        direction,
      });

      if (result?.status !== "success") {
        handleApiError(result, "Failed to load transactions.");
        return;
      }

      setTransactions(Array.isArray(result.data) ? result.data : []);
      setMeta(result.meta ?? null);
    } catch (error) {
      console.error("Failed to load transactions:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setPageLoading(false);
    }
  }

  useEffect(() => {
    fetchPage(1);

    (async () => {
      const result: any = await getTransactionTypesAction();
      if (result?.status === "success") {
        setTypes(Array.isArray(result.data) ? result.data : []);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timeout = setTimeout(() => fetchPage(1), 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, from, to, transactionType, direction]);

  function goToPage(page: number) {
    if (page < 1 || page > lastPage || page === currentPage || pageLoading) return;
    fetchPage(page);
  }

  return (
    <>
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Transactions</h1>
          <p className="mt-1 text-sm text-slate-600">
            Every debit/credit on every account — transfers, bill payments, cards and any
            future service — with who sent or received the money shown directly on each row.
          </p>
        </div>

        <ExportButtons
          baseEndpoint="/admin/transactions"
          params={{ from, to, search, transaction_type: transactionType, direction }}
        />
      </div>

      {/* FILTERS */}
      <section className="mt-7 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by account, customer, reference or counterparty..."
            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder-slate-500 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
          />
        </div>

        <select
          value={direction}
          onChange={(event) => setDirection(event.target.value)}
          className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
        >
          <option value="">Inward &amp; Outward</option>
          <option value="inward">Inward Only</option>
          <option value="outward">Outward Only</option>
        </select>

        <select
          value={transactionType}
          onChange={(event) => setTransactionType(event.target.value)}
          className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
        >
          <option value="">All Types</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {labelize(type)}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
        />

        <input
          type="date"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
        />
      </section>

      {/* DATATABLE */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1300px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <Heading>Date</Heading>
                <Heading>Reference</Heading>
                <Heading>Account</Heading>
                <Heading>Customer</Heading>
                <Heading>Counterparty</Heading>
                <Heading>Category</Heading>
                <Heading>Direction</Heading>
                <Heading>Type</Heading>
                <Heading>Amount</Heading>
                <Heading>Balance After</Heading>
                <Heading>Status</Heading>
                <Heading>Narration</Heading>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {transactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-4 text-sm font-medium text-slate-800">
                    {txn.posting_date ?? "—"}
                  </td>
                  <td className="px-5 text-sm font-medium text-slate-800">
                    <p>{txn.reference ?? "—"}</p>
                    {txn.transaction_reference && (
                      <p className="mt-0.5 text-xs font-medium text-slate-400">
                        {txn.transaction_reference}
                      </p>
                    )}
                  </td>
                  <td className="px-5 text-sm font-medium text-slate-800">
                    {txn.account?.account_number ?? "—"}
                  </td>
                  <td className="px-5 text-sm font-medium text-slate-800">
                    {txn.customer?.full_name ?? "—"}
                  </td>
                  <td className="px-5 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">
                      {txn.counterparty?.name ?? "—"}
                    </p>
                    {txn.counterparty?.account_number && (
                      <p className="mt-0.5 text-xs font-semibold text-slate-500">
                        {txn.counterparty.account_number}
                      </p>
                    )}
                  </td>
                  <td className="px-5 text-sm font-medium text-slate-800">
                    <p className="capitalize">
                      {txn.transaction_type ? labelize(txn.transaction_type) : "—"}
                    </p>
                    {txn.business_service && (
                      <p className="mt-0.5 text-xs font-semibold text-slate-500">
                        {txn.business_service}
                      </p>
                    )}
                  </td>
                  <td className="px-5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                        txn.direction === "inward"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-amber-100 text-amber-800 border border-amber-300"
                      }`}
                    >
                      {txn.direction ?? "—"}
                    </span>
                  </td>
                  <td className="px-5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                        txn.type === "debit"
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      }`}
                    >
                      {txn.type}
                    </span>
                  </td>
                  <td className="px-5 text-sm font-semibold text-slate-900">
                    {txn.currency_code} {txn.amount}
                  </td>
                  <td className="px-5 text-sm font-medium text-slate-800">
                    {txn.currency_code} {txn.balance_after}
                  </td>
                  <td className="px-5">
                    <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize bg-slate-100 text-slate-700 border border-slate-300">
                      {txn.status}
                    </span>
                  </td>
                  <td className="px-5 text-sm font-medium text-slate-600 max-w-[220px] truncate">
                    {txn.narration ?? "—"}
                  </td>
                </tr>
              ))}

              {!pageLoading && transactions.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-5 py-16 text-center text-sm font-medium text-slate-500">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 p-5 bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-600">
            {meta
              ? `Showing ${meta.from ?? 0}-${meta.to ?? 0} of ${meta.total ?? 0} transactions`
              : `Showing ${transactions.length} transactions`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={pageLoading || currentPage <= 1}
              className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 transition"
            >
              <ChevronLeft size={17} />
            </button>
            <span className="px-3 text-sm font-semibold text-slate-700">
              Page {currentPage} of {lastPage}
            </span>
            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={pageLoading || currentPage >= lastPage}
              className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 transition"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return (
    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
      {children}
    </th>
  );
}
