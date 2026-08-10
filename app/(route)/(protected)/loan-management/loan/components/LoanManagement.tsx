"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  HandCoins,
  Plus,
  Search,
  XCircle,
} from "lucide-react";
import { getLoansAction } from "@/actions/loan.action";
import ActionMenu from "@/components/ActionMenu";
import { handleApiError } from "@/lib/errors";
import { toDisplayLabel } from "@/lib/format";
import { usePermissions } from "@/lib/permissions";

type Loan = Record<string, any>;

interface LoanManagementProps {
  initialLoans?: Loan[];
  initialMeta?: Record<string, any> | null;
}

const STATUS_OPTIONS = ["pending", "active", "rejected", "closed", "written_off"];

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

export default function LoanManagement({
  initialLoans = [],
  initialMeta = null,
}: LoanManagementProps) {
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const [loans, setLoans] = useState<Loan[]>(initialLoans);
  const [meta, setMeta] = useState<Record<string, any> | null>(initialMeta);
  const [pageLoading, setPageLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actionMenuId, setActionMenuId] = useState<any>(null);

  const isFirstRender = useRef(true);

  async function fetchLoans(page: number = 1) {
    setPageLoading(true);
    const result: any = await getLoansAction(page, search, statusFilter);

    if (result?.status !== "success") {
      handleApiError(result, "Failed to load loans.");
      setPageLoading(false);
      return;
    }

    setLoans(Array.isArray(result.data) ? result.data : []);
    setMeta(result.meta ?? null);

    setPageLoading(false);
  }

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timeout = setTimeout(() => fetchLoans(1), 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  async function goToPage(page: number) {
    const currentPage = meta?.current_page ?? 1;
    const lastPage = meta?.last_page ?? 1;
    if (page < 1 || page > lastPage || page === currentPage || pageLoading) return;

    await fetchLoans(page);
  }

  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;

  const stats = meta?.statistics;
  const totalLoans = stats?.total_loans ?? meta?.total ?? loans.length;
  const activeLoans =
    stats?.total_active ?? loans.filter((l) => l.status === "active").length;
  const pendingLoans =
    stats?.total_pending ?? loans.filter((l) => l.status === "pending").length;
  const writtenOffLoans =
    stats?.total_written_off ?? loans.filter((l) => l.status === "written_off").length;

  return (
    <>
      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Loans</h1>
          <p className="mt-1 text-sm text-slate-600">
            Every loan booked across all customers
          </p>
        </div>

        {hasPermission("create_loans") && (
          <button
            type="button"
            onClick={() => router.push("/loan-management/loan/create")}
            className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#173673] px-5 text-sm font-semibold text-white transition hover:bg-[#10295c] shadow-sm"
          >
            <Plus size={18} />
            Book Loan
          </button>
        )}
      </div>

      {/* SUMMARY */}
      <section className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Loans"
          value={totalLoans}
          description="Across all customers"
          icon={<HandCoins size={22} />}
          iconStyle="bg-[#29478f] text-white"
        />
        <SummaryCard
          title="Active"
          value={activeLoans}
          description="Currently active"
          icon={<CheckCircle2 size={22} />}
          iconStyle="bg-emerald-100 text-emerald-800"
        />
        <SummaryCard
          title="Pending"
          value={pendingLoans}
          description="Awaiting approval"
          icon={<Clock3 size={22} />}
          iconStyle="bg-amber-100 text-amber-800"
        />
        <SummaryCard
          title="Written Off"
          value={writtenOffLoans}
          description="Written off loans"
          icon={<XCircle size={22} />}
          iconStyle="bg-red-100 text-red-800"
        />
      </section>

      {/* FILTERS */}
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
            placeholder="Search by account number, customer name or CIF..."
            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder-slate-500 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] md:w-56"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {toDisplayLabel(status)}
            </option>
          ))}
        </select>
      </section>

      {/* DATATABLE */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-175">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <Heading>Account No. / Customer</Heading>
                <Heading>Loan Product</Heading>
                <Heading>Principal</Heading>
                <Heading>Outstanding Principal</Heading>
                <Heading>Status</Heading>
                <Heading>NPL</Heading>
                <Heading>Next Due Date</Heading>
                <Heading>Actions</Heading>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loans.map((loan) => (
                <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#29478f]">
                        <Banknote size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900">
                          {loan.account_number}
                        </p>
                        <p className="text-xs font-medium text-slate-500">
                          {loan.customer?.full_name ?? "—"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 text-sm font-medium text-slate-800">
                    {loan.loan_product?.name ? toDisplayLabel(loan.loan_product.name) : "—"}
                  </td>
                  <td className="px-5 text-sm font-medium text-slate-800">
                    ₦{formatCurrency(loan.principal_amount)}
                  </td>
                  <td className="px-5 text-sm font-medium text-slate-800">
                    ₦{formatCurrency(loan.outstanding_principal)}
                  </td>
                  <td className="px-5">
                    <StatusBadge status={loan.status} />
                  </td>
                  <td className="px-5">
                    <NplBadge status={loan.npl_classification} />
                  </td>
                  <td className="px-5 text-sm font-medium text-slate-800">
                    {formatDate(loan.next_due_date)}
                  </td>
                  <td className="px-5">
                    <ActionMenu
                      isOpen={actionMenuId === loan.id}
                      onToggle={() =>
                        setActionMenuId(actionMenuId === loan.id ? null : loan.id)
                      }
                      onClose={() => setActionMenuId(null)}
                    >
                      <ActionButton
                        onClick={() => {
                          setActionMenuId(null);
                          router.push(`/loan-management/loan/${loan.id}`);
                        }}
                      >
                        <Eye size={16} />
                        View Loan
                      </ActionButton>
                    </ActionMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!pageLoading && loans.length === 0 && (
          <div className="py-16 text-center text-sm font-medium text-slate-500">
            No loans found.
          </div>
        )}

        {pageLoading && (
          <div className="py-16 text-center text-sm font-medium text-slate-500">
            Loading...
          </div>
        )}

        {meta && lastPage > 1 && (
          <div className="flex flex-col gap-3 border-t border-slate-200 p-5 bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-slate-600">
              Showing {meta.from ?? 0}-{meta.to ?? 0} of {meta.total ?? totalLoans} loans
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
        )}
      </section>
    </>
  );
}

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

export function StatusBadge({ status }: Record<string, any>) {
  const styles: Record<string, string> = {
    active: "bg-green-100 text-green-800 border border-green-300",
    pending: "bg-amber-100 text-amber-800 border border-amber-300",
    rejected: "bg-red-100 text-red-800 border border-red-300",
    closed: "bg-slate-200 text-slate-700 border border-slate-300",
    written_off: "bg-red-100 text-red-800 border border-red-300",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
        styles[status] || "bg-slate-100 text-slate-700 border border-slate-300"
      }`}
    >
      {toDisplayLabel(status)}
    </span>
  );
}

// CBN 5-bucket NPL classification — performing is healthy green, escalating through
// amber/orange/red to near-black for the worst bucket ("lost").
export function NplBadge({ status }: Record<string, any>) {
  const styles: Record<string, string> = {
    performing: "bg-green-100 text-green-800 border border-green-300",
    watch: "bg-amber-100 text-amber-800 border border-amber-300",
    substandard: "bg-orange-100 text-orange-800 border border-orange-300",
    doubtful: "bg-red-100 text-red-800 border border-red-300",
    lost: "bg-slate-900 text-white border border-slate-900",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
        styles[status] || "bg-slate-100 text-slate-700 border border-slate-300"
      }`}
    >
      {status ? toDisplayLabel(status) : "—"}
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
