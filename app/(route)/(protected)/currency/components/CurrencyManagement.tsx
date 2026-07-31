"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Banknote,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coins,
  Edit3,
  Search,
  Star,
} from "lucide-react";
import { toast } from "react-toastify";
import { getCurrenciesAction, updateCurrencyAction } from "@/actions/currency.action";
import ActionMenu from "@/components/ActionMenu";
import { handleApiError } from "@/lib/errors";
import CurrencyFormDrawer from "./CurrencyFormDrawer";

type Currency = Record<string, any>;
type CurrencyFormData = Record<string, any>;
type CurrencyMeta = Record<string, any> | null;

interface CurrencyManagementProps {
  initialCurrencies?: Currency[];
  initialMeta?: CurrencyMeta;
}

export default function CurrencyManagement({
  initialCurrencies = [],
  initialMeta = null,
}: CurrencyManagementProps) {
  const [currencies, setCurrencies] = useState<Currency[]>(initialCurrencies);
  const [meta, setMeta] = useState<CurrencyMeta>(initialMeta);
  const [pageLoading, setPageLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [actionMenuId, setActionMenuId] = useState<any>(null);

  const [submitting, setSubmitting] = useState(false);

  const stats = meta?.statistics;

  // Counted across every currency by the backend, not just the current page —
  // filtering `currencies` here would only ever reflect whatever page is loaded.
  const totalCurrencies = stats?.total_currencies ?? meta?.total ?? currencies.length;
  const activeCurrencies = stats?.total_active ?? currencies.filter((c) => c.status === "active").length;
  const baseCurrency = stats?.base_currency ?? currencies.find((currency) => currency.is_base_currency);

  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;

  // Skips the debounce effect on mount, since currencies are already
  // server-fetched for page 1 before this component renders.
  const isFirstRender = useRef(true);

  async function fetchPage(page: number, searchTerm: string = search) {
    setPageLoading(true);
    try {
      const result: any = await getCurrenciesAction(page, searchTerm);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to load currencies.");
        return;
      }

      setCurrencies(Array.isArray(result.data) ? result.data : []);
      setMeta(result.meta ?? null);
    } catch (error) {
      console.error("Failed to load currencies:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setPageLoading(false);
    }
  }

  async function goToPage(page: number) {
    if (page < 1 || page > lastPage || page === currentPage || pageLoading) {
      return;
    }

    await fetchPage(page);
  }

  // Debounced server-side search: wait for the user to stop typing, then
  // re-fetch page 1 from the backend with the search term applied.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timeout = setTimeout(() => {
      fetchPage(1, search);
    }, 400);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function openUpdateDrawer(currency: Currency) {
    setSelectedCurrency(currency);
    setActionMenuId(null);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    if (submitting) return;
    setDrawerOpen(false);
    setSelectedCurrency(null);
  }

  // Currencies can't be created here — only updated (rate, symbol, base flag, ...).
  // selectedCurrency is always set by the time this runs, since the drawer only
  // ever opens via openUpdateDrawer().
  async function handleFormSubmit(formData: CurrencyFormData) {
    if (!selectedCurrency) return;

    setSubmitting(true);
    try {
      const payload = {
        code: formData.code,
        name: formData.name,
        symbol: formData.symbol,
        buy_rate: Number(formData.buy_rate),
        sell_rate: Number(formData.sell_rate),
        exchange_rate: Number(formData.exchange_rate),
        is_base_currency: Boolean(formData.is_base_currency),
      };

      const result: any = await updateCurrencyAction(selectedCurrency.id, payload);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to update currency.");
        return;
      }

      await fetchPage(currentPage);

      toast.success(result.message || "Currency updated successfully.");
      setDrawerOpen(false);
      setSelectedCurrency(null);
    } catch (error) {
      console.error("Failed to save currency:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Currencies
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Update exchange rates for the platform&apos;s supported currencies
          </p>
        </div>
      </div>

      {/* SUMMARY */}
      <section className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-3">
        <SummaryCard
          title="Total Currencies"
          value={totalCurrencies}
          description="All supported currencies"
          icon={<Coins size={22} />}
          iconStyle="bg-[#29478f] text-white"
        />

        <SummaryCard
          title="Base Currency"
          value={baseCurrency?.code ?? "—"}
          description={baseCurrency?.name ?? "Not set"}
          icon={<Star size={22} />}
          iconStyle="bg-amber-100 text-amber-800"
        />

        <SummaryCard
          title="Active Currencies"
          value={activeCurrencies}
          description="Currently active"
          icon={<CheckCircle2 size={22} />}
          iconStyle="bg-emerald-100 text-emerald-800"
        />
      </section>

      {/* SEARCH */}
      <section className="mt-7 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by currency code or name..."
            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder-slate-500 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
          />
        </div>
      </section>

      {/* DATATABLE */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <Heading>Currency</Heading>
                <Heading>Buy Rate</Heading>
                <Heading>Sell Rate</Heading>
                <Heading>Exchange Rate</Heading>
                <Heading>Status</Heading>
                <Heading>Actions</Heading>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {currencies.map((currency) => (
                <tr
                  key={currency.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-5 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#29478f]">
                        <Banknote size={21} />
                      </div>
                      <div>
                        <p className="flex items-center gap-2 font-bold text-sm text-slate-900">
                          {currency.code}
                          {currency.is_base_currency && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              <Star size={10} />
                              BASE
                            </span>
                          )}
                        </p>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">
                          {currency.name} • {currency.symbol}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {currency.buy_rate}
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {currency.sell_rate}
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {currency.exchange_rate}
                  </td>

                  <td className="px-5">
                    <StatusBadge status={currency.status} />
                  </td>

                  <td className="px-5">
                    <ActionMenu
                      isOpen={actionMenuId === currency.id}
                      onToggle={() =>
                        setActionMenuId(
                          actionMenuId === currency.id ? null : currency.id
                        )
                      }
                      onClose={() => setActionMenuId(null)}
                    >
                      <ActionButton onClick={() => openUpdateDrawer(currency)}>
                        <Edit3 size={16} />
                        Edit Currency
                      </ActionButton>
                    </ActionMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex flex-col gap-3 border-t border-slate-200 p-5 bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-600">
            {meta
              ? `Showing ${meta.from ?? 0}-${meta.to ?? 0} of ${meta.total ?? totalCurrencies} currencies`
              : `Showing ${currencies.length} currencies`}
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

            {getPageNumbers(currentPage, lastPage).map((page, index) =>
              page === "..." ? (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 text-sm font-semibold text-slate-400 select-none"
                >
                  …
                </span>
              ) : (
                <button
                  key={page}
                  type="button"
                  onClick={() => goToPage(page)}
                  disabled={pageLoading}
                  className={`min-w-[38px] rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed ${
                    page === currentPage
                      ? "bg-[#173673] text-white shadow-sm"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {page}
                </button>
              )
            )}

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

      {/* SHIELDED DRAWER */}
      <CurrencyFormDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        selectedCurrency={selectedCurrency}
        onSubmit={handleFormSubmit}
        submitting={submitting}
      />
    </>
  );
}

/* Helper Components with Higher Text Visibility */
function SummaryCard(props: Record<string, any>) {
  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`absolute right-5 top-5 rounded-xl p-3 ${props.iconStyle}`}>
        {props.icon}
      </div>
      <p className="text-sm font-semibold text-slate-500">{props.title}</p>
      <h2 className="mt-3 text-3xl font-extrabold text-slate-900">{props.value}</h2>
      <p className="mt-2 text-xs font-medium text-slate-600">{props.description}</p>
    </div>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return (
    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
      {children}
    </th>
  );
}

function StatusBadge({ status }: Record<string, any>) {
  const styles: Record<string, string> = {
    active: "bg-green-100 text-green-800 border border-green-300",
    inactive: "bg-red-100 text-red-800 border border-red-300",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
        styles[status] || "bg-slate-100 text-slate-700 border border-slate-300"
      }`}
    >
      {status ?? "—"}
    </span>
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

// Builds a compact page list: first, last, and a window around the current
// page, e.g. 1 ... 4 5 6 ... 20. Falls back to showing every page when few.
function getPageNumbers(current: number, last: number): (number | "...")[] {
  if (last <= 5) {
    return Array.from({ length: last }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, last, current]);

  if (current > 1) pages.add(current - 1);
  if (current < last) pages.add(current + 1);

  const sorted = Array.from(pages).sort((a, b) => a - b);

  const result: (number | "...")[] = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) {
      result.push("...");
    }
    result.push(page);
  });

  return result;
}
