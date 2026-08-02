"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleOff,
  Edit3,
  Landmark,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  createGeneralLedgerAction,
  getGeneralLedgerStatsAction,
  getGeneralLedgersAction,
  updateGeneralLedgerAction,
  updateGeneralLedgerStatusAction,
} from "@/actions/general-ledger.action";
import ActionMenu from "@/components/ActionMenu";
import ExportDropdown from "@/components/ExportDropdown";
import { handleApiError } from "@/lib/errors";
import GeneralLedgerFormDrawer from "./GeneralLedgerFormDrawer";

type Ledger = Record<string, any>;
type Currency = Record<string, any>;
type LedgerFormData = Record<string, any>;
type LedgerMeta = Record<string, any> | null;

interface GeneralLedgerManagementProps {
  initialLedgers?: Ledger[];
  initialMeta?: LedgerMeta;
  allLedgers?: Ledger[];
  currencies?: Currency[];
}

export default function GeneralLedgerManagement({
  initialLedgers = [],
  initialMeta = null,
  allLedgers = [],
  currencies = [],
}: GeneralLedgerManagementProps) {
  const [ledgers, setLedgers] = useState<Ledger[]>(initialLedgers);
  const [meta, setMeta] = useState<LedgerMeta>(initialMeta);
  const [pageLoading, setPageLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [isAssigned, setIsAssigned] = useState("");
  const [currencyId, setCurrencyId] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState<Ledger | null>(null);
  const [actionMenuId, setActionMenuId] = useState<any>(null);

  const [submitting, setSubmitting] = useState(false);

  const [stats, setStats] = useState<Record<string, number>>({
    total: 0,
    active: 0,
    inactive: 0,
    assigned: 0,
    unassigned: 0,
  });

  const totalLedgers = meta?.total ?? ledgers.length;

  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;

  const parentNameById = new Map<string, string>(
    allLedgers.map((ledger) => [String(ledger.id), ledger.name])
  );

  // Skips the debounce effect on mount, since accounts are already
  // server-fetched for page 1 before this component renders.
  const isFirstRender = useRef(true);

  async function fetchStats() {
    const result: any = await getGeneralLedgerStatsAction();
    if (result?.status === "success" && result.data) {
      setStats(result.data);
    }
  }

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchPage(
    page: number,
    searchTerm: string = search,
    statusFilter: string = status,
    assignedFilter: string = isAssigned,
    currencyFilter: string = currencyId
  ) {
    setPageLoading(true);
    try {
      const result: any = await getGeneralLedgersAction(page, searchTerm, {
        status: statusFilter,
        is_assigned: assignedFilter,
        currency_id: currencyFilter,
      });

      if (result?.status !== "success") {
        handleApiError(result, "Failed to load chart of accounts.");
        return;
      }

      setLedgers(Array.isArray(result.data) ? result.data : []);
      setMeta(result.meta ?? null);
    } catch (error) {
      console.error("Failed to load chart of accounts:", error);
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
      fetchPage(1, search, status, isAssigned, currencyId);
    }, 400);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, isAssigned, currencyId]);

  function openCreateDrawer() {
    setSelectedLedger(null);
    setActionMenuId(null);
    setDrawerOpen(true);
  }

  function openUpdateDrawer(ledger: Ledger) {
    setSelectedLedger(ledger);
    setActionMenuId(null);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    if (submitting) return;
    setDrawerOpen(false);
    setSelectedLedger(null);
  }

  async function handleFormSubmit(formData: LedgerFormData) {
    setSubmitting(true);
    try {
      if (selectedLedger) {
        const result: any = await updateGeneralLedgerAction(selectedLedger.id, {
          name: formData.name,
          parent_id: formData.parent_id || null,
          classification: formData.classification,
          type: formData.type,
          manual_journal_entries_allowed: Boolean(formData.manual_journal_entries_allowed),
          description: formData.description,
        });

        if (result?.status !== "success") {
          handleApiError(result, "Failed to update account.");
          return;
        }

        await fetchPage(currentPage);

        toast.success(result.message || "Account updated successfully.");
      } else {
        const result: any = await createGeneralLedgerAction({
          name: formData.name,
          currency_id: formData.currency_id,
          parent_id: formData.parent_id || null,
          classification: formData.classification,
          type: formData.type,
          manual_journal_entries_allowed: Boolean(formData.manual_journal_entries_allowed),
          description: formData.description,
        });

        if (result?.status !== "success") {
          handleApiError(result, "Failed to create account.");
          return;
        }

        await fetchPage(1);
        await fetchStats();

        toast.success(result.message || "Account created successfully.");
      }
      setDrawerOpen(false);
      setSelectedLedger(null);
    } catch (error) {
      console.error("Failed to save account:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(ledger: Ledger) {
    const newStatus = ledger.status === "active" ? "inactive" : "active";
    setActionMenuId(null);

    try {
      const result: any = await updateGeneralLedgerStatusAction(ledger.id, newStatus);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to update account status.");
        return;
      }

      await fetchPage(currentPage);
      await fetchStats();

      toast.success(result.message || "Account status updated successfully.");
    } catch (error) {
      console.error("Failed to update account status:", error);
      toast.error("A network error occurred. Please try again.");
    }
  }

  return (
    <>
      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            General Ledger Manager
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage the general ledger accounts used across the platform
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportDropdown
            baseEndpoint="/admin/general-ledgers"
            params={{ search, status, is_assigned: isAssigned, currency_id: currencyId }}
          />

          <button
            type="button"
            onClick={openCreateDrawer}
            className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#173673] px-5 text-sm font-semibold text-white transition hover:bg-[#10295c] shadow-sm"
          >
            <Plus size={18} />
            Add Account
          </button>
        </div>
      </div>

      {/* SUMMARY */}
      <section className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Total Accounts"
          value={stats.total}
          description="All chart of accounts entries"
          icon={<BookOpen size={22} />}
          iconStyle="bg-[#29478f] text-white"
        />

        <SummaryCard
          title="Active Accounts"
          value={stats.active}
          description="Currently active accounts"
          icon={<CheckCircle2 size={22} />}
          iconStyle="bg-emerald-100 text-emerald-800"
        />

        <SummaryCard
          title="Inactive Accounts"
          value={stats.inactive}
          description="Currently inactive accounts"
          icon={<CircleOff size={22} />}
          iconStyle="bg-red-100 text-red-800"
        />

        <SummaryCard
          title="Assigned Accounts"
          value={stats.assigned}
          description="Linked to a product"
          icon={<CheckCircle2 size={22} />}
          iconStyle="bg-blue-100 text-blue-800"
        />

        <SummaryCard
          title="Unassigned Accounts"
          value={stats.unassigned}
          description="Not linked to a product"
          icon={<CircleOff size={22} />}
          iconStyle="bg-slate-100 text-slate-700"
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
            placeholder="Search by account name, code or type..."
            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder-slate-500 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
          />
        </div>

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={isAssigned}
          onChange={(event) => setIsAssigned(event.target.value)}
          className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
        >
          <option value="">Assigned & Unassigned</option>
          <option value="1">Assigned</option>
          <option value="0">Unassigned</option>
        </select>

        <select
          value={currencyId}
          onChange={(event) => setCurrencyId(event.target.value)}
          className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
        >
          <option value="">All Currencies</option>
          {currencies.map((currency) => (
            <option key={currency.id} value={currency.id}>
              {currency.code}
            </option>
          ))}
        </select>
      </section>

      {/* DATATABLE */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <Heading>Account</Heading>
                <Heading>Classification</Heading>
                <Heading>Parent</Heading>
                <Heading>Balance</Heading>
                <Heading>Status</Heading>
                <Heading>Assigned</Heading>
                <Heading>Created</Heading>
                <Heading>Actions</Heading>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {ledgers.map((ledger) => (
                <tr
                  key={ledger.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-5 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#29478f]">
                        <Landmark size={21} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900">
                          {formatName(ledger.name)}
                        </p>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">
                          {ledger.gl_code}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    <span className="capitalize">{ledger.classification ?? "—"}</span>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500 capitalize">
                      {ledger.type?.replace(/_/g, " ") ?? ""}
                    </p>
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {ledger.parent_id
                      ? parentNameById.get(String(ledger.parent_id)) ?? "—"
                      : "—"}
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {ledger.currency_code} {ledger.balance}
                  </td>

                  <td className="px-5">
                    <StatusBadge status={ledger.status} />
                  </td>

                  <td className="px-5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                        ledger.is_assigned
                          ? "bg-blue-100 text-blue-800 border border-blue-300"
                          : "bg-slate-100 text-slate-600 border border-slate-300"
                      }`}
                    >
                      {ledger.is_assigned ? "Yes" : "No"}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-sm font-medium text-slate-800">
                    {ledger.created_at ? (
                      <>
                        <div>{formatDate(ledger.created_at)}</div>
                        <div className="text-xs text-slate-500">{formatTime(ledger.created_at)}</div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="px-5">
                    <ActionMenu
                      isOpen={actionMenuId === ledger.id}
                      onToggle={() =>
                        setActionMenuId(
                          actionMenuId === ledger.id ? null : ledger.id
                        )
                      }
                      onClose={() => setActionMenuId(null)}
                    >
                      <ActionButton onClick={() => openUpdateDrawer(ledger)}>
                        <Edit3 size={16} />
                        Edit Account
                      </ActionButton>

                      <ActionButton onClick={() => handleStatusChange(ledger)}>
                        <CircleOff size={16} />
                        {ledger.status === "active" ? "Deactivate" : "Activate"}
                      </ActionButton>
                    </ActionMenu>
                  </td>
                </tr>
              ))}

              {ledgers.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-16 text-center text-sm font-medium text-slate-500"
                  >
                    No accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex flex-col gap-3 border-t border-slate-200 p-5 bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-600">
            {meta
              ? `Showing ${meta.from ?? 0}-${meta.to ?? 0} of ${meta.total ?? totalLedgers} accounts`
              : `Showing ${ledgers.length} accounts`}
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
      <GeneralLedgerFormDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        selectedLedger={selectedLedger}
        onSubmit={handleFormSubmit}
        submitting={submitting}
        allLedgers={allLedgers}
        currencies={currencies}
      />
    </>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// Turns "operating_expenses" into "Operating Expenses" for display.
function formatName(name: string) {
  return (name ?? "")
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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
    pending: "bg-amber-100 text-amber-800 border border-amber-300",
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
