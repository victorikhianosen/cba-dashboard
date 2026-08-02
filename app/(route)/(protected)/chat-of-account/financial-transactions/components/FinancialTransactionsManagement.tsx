"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Eye, Search } from "lucide-react";
import { toast } from "react-toastify";
import { getFinancialTransactionsAction } from "@/actions/financial-transaction.action";
import ActionMenu from "@/components/ActionMenu";
import ExportDropdown from "@/components/ExportDropdown";
import { handleApiError } from "@/lib/errors";

type Txn = Record<string, any>;
type Meta = Record<string, any> | null;

const STATUS_OPTIONS = ["pending", "posted", "completed", "failed", "reversed"];

export default function FinancialTransactionsManagement() {
  const router = useRouter();

  const [transactions, setTransactions] = useState<Txn[]>([]);
  const [meta, setMeta] = useState<Meta>(null);
  const [pageLoading, setPageLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [actionMenuId, setActionMenuId] = useState<number | string | null>(null);

  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;

  const isFirstRender = useRef(true);

  async function fetchPage(page: number) {
    setPageLoading(true);
    try {
      const result: any = await getFinancialTransactionsAction(page, { from, to, search, status });

      if (result?.status !== "success") {
        handleApiError(result, "Failed to load financial transactions.");
        return;
      }

      setTransactions(Array.isArray(result.data) ? result.data : []);
      setMeta(result.meta ?? null);
    } catch (error) {
      console.error("Failed to load financial transactions:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setPageLoading(false);
    }
  }

  useEffect(() => {
    fetchPage(1);
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
  }, [search, from, to, status]);

  function goToPage(page: number) {
    if (page < 1 || page > lastPage || page === currentPage || pageLoading) return;
    fetchPage(page);
  }

  return (
    <>
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Financial Transactions</h1>
          <p className="mt-1 text-sm text-slate-600">
            All financial transactions (postings) recorded across the platform
          </p>
        </div>

        <ExportDropdown baseEndpoint="/admin/financial-transactions" params={{ from, to, search, status }} />
      </div>

      {/* FILTERS */}
      <section className="mt-7 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by reference, customer or narration..."
            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder-slate-500 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
          />
        </div>

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option} className="capitalize">
              {option.charAt(0).toUpperCase() + option.slice(1)}
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
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <Heading>Reference</Heading>
                <Heading>Customer</Heading>
                <Heading>Module</Heading>
                <Heading>Type</Heading>
                <Heading>Amount</Heading>
                <Heading>Status</Heading>
                <Heading>Date</Heading>
                <Heading>Actions</Heading>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {transactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-slate-50/80 transition-colors">

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {txn.transaction_reference ?? "—"}
                  </td>
                  <td className="px-5 text-sm font-medium text-slate-800">
                    {txn.customer?.full_name ?? "—"}
                  </td>
                  <td className="px-5 text-sm font-medium text-slate-800 capitalize">
                    {txn.module ?? "—"}
                  </td>
                  <td className="px-5 text-sm font-medium text-slate-800 capitalize">
                    {txn.transaction_type ?? "—"}
                  </td>
                  <td className="px-5 text-sm font-semibold text-slate-900">
                    {txn.currency_code} {txn.amount}
                  </td>
                  <td className="px-5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${txn.status === "completed" || txn.status === "posted"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : txn.status === "failed"
                            ? "bg-red-100 text-red-800 border border-red-300"
                            : "bg-amber-100 text-amber-800 border border-amber-300"
                        }`}
                    >
                      {txn.status}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-sm font-medium text-slate-800">
                    {txn.created_at ? (
                      <>
                        <div>
                          {new Date(txn.created_at).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(txn.created_at).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="px-5">
                    <ActionMenu
                      isOpen={actionMenuId === txn.id}
                      onToggle={() => setActionMenuId(actionMenuId === txn.id ? null : txn.id)}
                      onClose={() => setActionMenuId(null)}
                    >
                      <ActionButton
                        onClick={() => {
                          setActionMenuId(null);
                          router.push(`/chat-of-account/financial-transactions/${txn.id}`);
                        }}
                      >
                        <Eye size={16} />
                        View
                      </ActionButton>
                    </ActionMenu>
                  </td>
                </tr>
              ))}

              {!pageLoading && transactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-sm font-medium text-slate-500">
                    No financial transactions found.
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

function ActionButton(props: Record<string, any>) {
  return (
    <button
      type="button"
      {...props}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-100 text-sm font-semibold text-slate-800 transition"
    >
      {props.children}
    </button>
  );
}
