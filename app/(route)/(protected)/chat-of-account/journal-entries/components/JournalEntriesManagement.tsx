"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronLeft, ChevronRight, Eye, Search } from "lucide-react";
import { toast } from "react-toastify";
import { getJournalEntriesAction } from "@/actions/journal-entry.action";
import ActionMenu from "@/components/ActionMenu";
import ExportDropdown from "@/components/ExportDropdown";
import { handleApiError } from "@/lib/errors";

type Entry = Record<string, any>;
type Meta = Record<string, any> | null;

export default function JournalEntriesManagement() {
  const router = useRouter();

  const [entries, setEntries] = useState<Entry[]>([]);
  const [meta, setMeta] = useState<Meta>(null);
  const [pageLoading, setPageLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [actionMenuId, setActionMenuId] = useState<number | string | null>(null);

  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;

  const isFirstRender = useRef(true);

  async function fetchPage(page: number) {
    setPageLoading(true);
    try {
      const result: any = await getJournalEntriesAction(page, { from, to, search });

      if (result?.status !== "success") {
        handleApiError(result, "Failed to load journal entries.");
        return;
      }

      setEntries(Array.isArray(result.data) ? result.data : []);
      setMeta(result.meta ?? null);
    } catch (error) {
      console.error("Failed to load journal entries:", error);
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
  }, [search, from, to]);

  function goToPage(page: number) {
    if (page < 1 || page > lastPage || page === currentPage || pageLoading) return;
    fetchPage(page);
  }

  return (
    <>
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Journal Entries</h1>
          <p className="mt-1 text-sm text-slate-600">
            All GL debit/credit entries recorded across the platform
          </p>
        </div>

        <ExportDropdown baseEndpoint="/admin/journal-entries" params={{ from, to, search }} />
      </div>

      {/* FILTERS */}
      <section className="mt-7 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by reference, narration or GL..."
            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder-slate-500 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
          />
        </div>

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
                <Heading>General Ledger</Heading>
                <Heading>Reference</Heading>
                <Heading>Type</Heading>
                <Heading>Amount</Heading>
                <Heading>Balance Before</Heading>
                <Heading>Balance After</Heading>
                <Heading>Posting Date</Heading>
                <Heading>Actions</Heading>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 text-sm font-medium text-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#29478f]">
                        <BookOpen size={15} />
                      </div>
                      <div>
                        <p className="font-semibold">{formatName(entry.general_ledger?.name)}</p>
                        <p className="text-xs text-slate-500">{entry.general_ledger?.gl_code}</p>
                      </div>
                    </div>
                  </td>
              
                  <td className="px-5 text-sm font-medium text-slate-800">
                    <p>{entry.journal_reference ?? "—"}</p>
                    {entry.transaction_reference && (
                      <p className="mt-0.5 text-xs font-medium text-slate-400">
                        {entry.transaction_reference}
                      </p>
                    )}
                  </td>

                  <td className="px-5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                        entry.entry_type === "debit"
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      }`}
                    >
                      {entry.entry_type}
                    </span>
                  </td>
                  <td className="px-5 text-sm font-semibold text-slate-900">
                    {entry.currency_code} {entry.amount}
                  </td>
                  <td className="px-5 text-sm font-medium text-slate-800">
                    {entry.currency_code} {entry.balance_before}
                  </td>
                  <td className="px-5 text-sm font-medium text-slate-800">
                    {entry.currency_code} {entry.balance_after}
                  </td>

               <td className="px-5 py-4 text-sm font-medium text-slate-800">
  {entry.posting_date ? (
    <>
      <div>
        {new Date(entry.posting_date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </div>
      <div className="text-xs text-slate-500">
        {new Date(entry.posting_date).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
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
                      isOpen={actionMenuId === entry.id}
                      onToggle={() => setActionMenuId(actionMenuId === entry.id ? null : entry.id)}
                      onClose={() => setActionMenuId(null)}
                    >
                      <ActionButton
                        onClick={() => {
                          setActionMenuId(null);
                          router.push(`/chat-of-account/journal-entries/${entry.id}`);
                        }}
                      >
                        <Eye size={16} />
                        View
                      </ActionButton>
                    </ActionMenu>
                  </td>
                </tr>
              ))}

              {!pageLoading && entries.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-sm font-medium text-slate-500">
                    No journal entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 p-5 bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-600">
            {meta
              ? `Showing ${meta.from ?? 0}-${meta.to ?? 0} of ${meta.total ?? 0} entries`
              : `Showing ${entries.length} entries`}
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

function formatName(name?: string) {
  return (name ?? "—")
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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
