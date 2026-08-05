"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Plus,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import { getFundGlsAction } from "@/actions/fund-gl.action";
import ActionMenu from "@/components/ActionMenu";
import ExportDropdown from "@/components/ExportDropdown";
import { handleApiError } from "@/lib/errors";
import { toDisplayLabel } from "@/lib/format";

type FundGl = Record<string, any>;
type FundGlMeta = Record<string, any> | null;

interface FundGlManagementProps {
  initialFundGls?: FundGl[];
  initialMeta?: FundGlMeta;
}

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function glLabel(gl: Record<string, any> | null | undefined) {
  if (!gl) return "—";
  return toDisplayLabel(gl.name) || "—";
}

function glCode(gl: Record<string, any> | null | undefined) {
  return gl?.gl_code ?? "";
}

export default function FundGlManagement({
  initialFundGls = [],
  initialMeta = null,
}: FundGlManagementProps) {
  const router = useRouter();

  const [fundGls, setFundGls] = useState<FundGl[]>(initialFundGls);
  const [meta, setMeta] = useState<FundGlMeta>(initialMeta);
  const [pageLoading, setPageLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionMenuId, setActionMenuId] = useState<number | string | null>(null);

  const totalFundGls = meta?.total ?? fundGls.length;
  const pendingFundGls = fundGls.filter(
    (f) => f.status === "pending_review" || f.status === "pending_approval"
  ).length;
  const approvedFundGls = fundGls.filter((f) => f.status === "approved").length;
  const rejectedFundGls = fundGls.filter((f) => f.status === "rejected").length;

  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;

  const isFirstRender = useRef(true);

  const exportParams = {
    from,
    to,
    search,
    status: statusFilter === "all" ? "" : statusFilter,
  };

  async function fetchPage(page: number) {
    setPageLoading(true);
    try {
      const result: any = await getFundGlsAction(page, exportParams);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to load fund GL transfers.");
        return;
      }

      setFundGls(Array.isArray(result.data) ? result.data : []);
      setMeta(result.meta ?? null);
    } catch (error) {
      console.error("Failed to load fund GL transfers:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setPageLoading(false);
    }
  }

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timeout = setTimeout(() => fetchPage(1), 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, from, to, statusFilter]);

  function resetFilters() {
    setSearch("");
    setFrom("");
    setTo("");
    setStatusFilter("all");
  }

  async function goToPage(page: number) {
    if (page < 1 || page > lastPage || page === currentPage || pageLoading) {
      return;
    }

    await fetchPage(page);
  }

  return (
    <>
      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fund GL</h1>
          <p className="mt-1 text-sm text-slate-600">
            GL to GL transfers — maker, reviewer and approver each sign off before it posts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportDropdown baseEndpoint="/admin/fund-gls" params={exportParams} />

          <button
            type="button"
            onClick={() => router.push("/postings/fund-gl/create")}
            className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#173673] px-5 text-sm font-semibold text-white transition hover:bg-[#10295c] shadow-sm"
          >
            <Plus size={18} />
            New Fund GL
          </button>
        </div>
      </div>

      {/* SUMMARY */}
      <section className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Fund GLs"
          value={totalFundGls}
          description="All fund GL transfers created"
          icon={<BookOpen size={22} />}
          iconStyle="bg-[#29478f] text-white"
        />
        <SummaryCard
          title="Pending"
          value={pendingFundGls}
          description="Awaiting review or approval"
          icon={<Clock3 size={22} />}
          iconStyle="bg-amber-100 text-amber-800"
        />
        <SummaryCard
          title="Approved"
          value={approvedFundGls}
          description="Posted to the ledger"
          icon={<CheckCircle2 size={22} />}
          iconStyle="bg-emerald-100 text-emerald-800"
        />
        <SummaryCard
          title="Rejected"
          value={rejectedFundGls}
          description="On this page"
          icon={<XCircle size={22} />}
          iconStyle="bg-red-100 text-red-800"
        />
      </section>

      {/* SEARCH & FILTERS */}
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
            placeholder="Search by reference or remarks..."
            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder-slate-500 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-12 cursor-pointer rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 outline-none focus:border-[#29478f]"
        >
          <option value="all">All Statuses</option>
          <option value="pending_review">Pending Review</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <input
          type="date"
          value={from}
          max={to || undefined}
          onChange={(event) => setFrom(event.target.value)}
          className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
        />

        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={(event) => setTo(event.target.value)}
          className="h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
        />

        <button
          type="button"
          onClick={resetFilters}
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <RotateCcw size={16} />
          Reset
        </button>
      </section>

      {/* DATATABLE */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-250">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <Heading>Reference</Heading>
                <Heading>Source GL</Heading>
                <Heading>Destination GL</Heading>
                <Heading>Amount</Heading>
                <Heading>Status</Heading>
                <Heading>Created</Heading>
                <Heading>Actions</Heading>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {fundGls.map((fundGl) => (
                <tr key={fundGl.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-5">
                    <p className="font-bold text-sm text-slate-900">{fundGl.reference}</p>
                    {fundGl.transaction_reference && (
                      <p className="mt-0.5 text-xs font-medium text-slate-400">
                        {fundGl.transaction_reference}
                      </p>
                    )}
                  </td>

                  <td className="px-5 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">{glLabel(fundGl.source)}</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">
                      {glCode(fundGl.source)}
                    </p>
                  </td>
                  <td className="px-5 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">{glLabel(fundGl.destination)}</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">
                      {glCode(fundGl.destination)}
                    </p>
                  </td>

                  <td className="px-5 text-sm font-bold text-slate-900">
                    ₦{formatCurrency(fundGl.amount)}
                  </td>

                  <td className="px-5">
                    <StatusBadge status={fundGl.status} />
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {formatDateTime(fundGl.created_at)}
                  </td>

                  <td className="px-5">
                    <ActionMenu
                      isOpen={actionMenuId === fundGl.id}
                      onToggle={() =>
                        setActionMenuId(actionMenuId === fundGl.id ? null : fundGl.id)
                      }
                      onClose={() => setActionMenuId(null)}
                    >
                      <ActionButton
                        onClick={() => {
                          setActionMenuId(null);
                          router.push(`/postings/fund-gl/${fundGl.id}`);
                        }}
                      >
                        <Eye size={16} />
                        View
                      </ActionButton>
                    </ActionMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!pageLoading && fundGls.length === 0 && (
          <div className="py-16 text-center text-sm font-medium text-slate-500">
            No fund GL transfers found.
          </div>
        )}

        {/* PAGINATION */}
        <div className="flex flex-col gap-3 border-t border-slate-200 p-5 bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-600">
            {meta
              ? `Showing ${meta.from ?? 0}-${meta.to ?? 0} of ${meta.total ?? totalFundGls} fund GL transfers`
              : `Showing ${fundGls.length} fund GL transfers`}
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
                  className={`min-w-9.5 rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed ${
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

function StatusBadge({ status }: Record<string, any>) {
  const styles: Record<string, string> = {
    approved: "bg-green-100 text-green-800 border border-green-300",
    pending_review: "bg-amber-100 text-amber-800 border border-amber-300",
    pending_approval: "bg-amber-100 text-amber-800 border border-amber-300",
    rejected: "bg-red-100 text-red-800 border border-red-300",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
        styles[status] || "bg-slate-100 text-slate-700 border border-slate-300"
      }`}
    >
      {toDisplayLabel(status) || "—"}
    </span>
  );
}

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
