"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  PiggyBank,
  Plus,
  PlusCircle,
  Search,
  TrendingUp,
} from "lucide-react";
import { toast } from "react-toastify";
import { createInvestmentAction, getInvestmentsAction } from "@/actions/investment.action";
import ActionMenu from "@/components/ActionMenu";
import { handleApiError } from "@/lib/errors";
import { toDisplayLabel } from "@/lib/format";
import InvestmentFormDrawer from "./InvestmentFormDrawer";

type Investment = Record<string, any>;
type InvestmentProduct = Record<string, any>;

interface InvestmentManagementProps {
  investmentProducts: InvestmentProduct[];
}

const STATUS_OPTIONS = ["pending", "active", "rejected", "matured", "liquidated", "closed"];

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function InvestmentManagement({ investmentProducts }: InvestmentManagementProps) {
  const router = useRouter();

  const [investments, setInvestments] = useState<Investment[]>([]);
  const [meta, setMeta] = useState<Record<string, any> | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<any>(null);


  const isFirstRender = useRef(true);

  async function fetchInvestments(page: number = 1) {
    setPageLoading(true);
    try {
      const result: any = await getInvestmentsAction(page, search, statusFilter);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to load investments.");
        return;
      }

      setInvestments(Array.isArray(result.data) ? result.data : []);
      setMeta(result.meta ?? null);
    } catch (error) {
      console.error("Failed to load investments:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setPageLoading(false);
    }
  }

  // Loads the full list on mount, then again whenever the search/status filters settle.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      fetchInvestments(1);
      return;
    }

    const timeout = setTimeout(() => fetchInvestments(1), 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  async function goToPage(page: number) {
    const currentPage = meta?.current_page ?? 1;
    const lastPage = meta?.last_page ?? 1;
    if (page < 1 || page > lastPage || page === currentPage || pageLoading) return;

    await fetchInvestments(page);
  }

  async function handleFormSubmit(formData: Record<string, any>) {
    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        investment_product_id: Number(formData.investment_product_id),
        source_account_id: Number(formData.source_account_id),
        principal_amount: Number(formData.principal_amount),
        tenure: Number(formData.tenure),
        interest_posting_period: formData.interest_posting_period,
      };

      // Only meaningful when the product offers auto-renewal — omit rather than send an
      // empty string.
      if (formData.rollover_type) {
        payload.rollover_type = formData.rollover_type;
      }

      const result: any = await createInvestmentAction(payload);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to open investment.");
        return;
      }

      await fetchInvestments(1);
      toast.success(result.message || "Investment opened successfully.");
      setDrawerOpen(false);
    } catch (error) {
      console.error("Failed to open investment:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Approve/Reject live on the Investment Details page only (with a schedule preview
  // before confirming) — not here on the list, so there's no bare "approve blind" path.

  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;

  // Global counts across every investment, not just the current page — falls back to
  // counting the current page only if the backend hasn't sent statistics for some reason.
  const stats = meta?.statistics;
  const totalInvestments = stats?.total_investments ?? meta?.total ?? investments.length;
  const activeInvestments =
    stats?.total_active ?? investments.filter((i) => i.status === "active").length;
  const pendingInvestments =
    stats?.total_pending ?? investments.filter((i) => i.status === "pending").length;
  const pendingTopUps =
    stats?.total_topup_pending ?? investments.filter((i) => Boolean(i.pending_topup_amount)).length;

  return (
    <>
      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Investments</h1>
          <p className="mt-1 text-sm text-slate-600">
            Every investment booked across all customers
          </p>
        </div>

        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#173673] px-5 text-sm font-semibold text-white transition hover:bg-[#10295c] shadow-sm"
        >
          <Plus size={18} />
          Open Investment
        </button>
      </div>

      {/* SUMMARY */}
      <section className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Investments"
          value={totalInvestments}
          description="Across all customers"
          icon={<PiggyBank size={22} />}
          iconStyle="bg-[#29478f] text-white"
        />
        <SummaryCard
          title="Active"
          value={activeInvestments}
          description="Currently active"
          icon={<CheckCircle2 size={22} />}
          iconStyle="bg-emerald-100 text-emerald-800"
        />
        <SummaryCard
          title="Pending"
          value={pendingInvestments}
          description="Awaiting approval"
          icon={<Clock3 size={22} />}
          iconStyle="bg-amber-100 text-amber-800"
        />
        <SummaryCard
          title="Top-Ups Pending"
          value={pendingTopUps}
          description="Awaiting top-up approval"
          icon={<PlusCircle size={22} />}
          iconStyle="bg-blue-100 text-blue-800"
        />
      </section>

      {/* FILTERS */}
      <section className="mt-7 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by investment/account number, customer name or CIF..."
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
          <table className="w-full min-w-150">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <Heading>Account No. / Customer</Heading>
                <Heading>Product</Heading>
                <Heading>Principal</Heading>
                <Heading>Current Principal</Heading>
                <Heading>Tenure</Heading>
                <Heading>Maturity Date</Heading>
                <Heading>Status</Heading>
                <Heading>Actions</Heading>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {investments.map((investment) => (
                <tr key={investment.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#29478f]">
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900">
                          {investment.account_number}
                        </p>
                        <p className="text-xs font-medium text-slate-500">
                          {investment.customer?.full_name ?? "—"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 text-sm font-medium text-slate-800">
                    {investment.investment_product?.name
                      ? toDisplayLabel(investment.investment_product.name)
                      : "—"}
                  </td>
                  <td className="px-5 text-sm font-medium text-slate-800">
                    ₦{formatCurrency(investment.principal_amount)}
                  </td>
                  <td className="px-5 text-sm font-medium text-slate-800">
                    ₦{formatCurrency(investment.current_principal)}
                  </td>
                  <td className="px-5 text-sm font-medium text-slate-800">
                    {investment.tenure ? `${investment.tenure} days` : "—"}
                  </td>
                  <td className="px-5 text-sm font-medium text-slate-800">
                    {formatDate(investment.maturity_date)}
                  </td>
                  <td className="px-5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={investment.status} />
                      {investment.pending_topup_amount && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                          <PlusCircle size={12} />
                          Top-Up Pending
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5">
                    <ActionMenu
                      isOpen={actionMenuId === investment.id}
                      onToggle={() =>
                        setActionMenuId(actionMenuId === investment.id ? null : investment.id)
                      }
                      onClose={() => setActionMenuId(null)}
                    >
                      <ActionButton
                        onClick={() => {
                          setActionMenuId(null);
                          router.push(`/investment-management/investment/${investment.id}`);
                        }}
                      >
                        <Eye size={16} />
                        View Investment
                      </ActionButton>
                    </ActionMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!pageLoading && investments.length === 0 && (
          <div className="py-16 text-center text-sm font-medium text-slate-500">
            No investments found.
          </div>
        )}

        {pageLoading && (
          <div className="py-16 text-center text-sm font-medium text-slate-500">Loading...</div>
        )}

        {meta && lastPage > 1 && (
          <div className="flex flex-col gap-3 border-t border-slate-200 p-5 bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-slate-600">
              Showing {meta.from ?? 0}-{meta.to ?? 0} of {meta.total ?? totalInvestments} investments
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

      <InvestmentFormDrawer
        isOpen={drawerOpen}
        onClose={() => (submitting ? undefined : setDrawerOpen(false))}
        onSubmit={handleFormSubmit}
        submitting={submitting}
        investmentProducts={investmentProducts}
      />
    </>
  );
}

function SummaryCard(props: Record<string, any>) {
  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`absolute right-5 top-5 rounded-xl p-3 ${props.iconStyle}`}>{props.icon}</div>
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
    rejected: "bg-red-100 text-red-800 border border-red-300",
    matured: "bg-sky-100 text-sky-800 border border-sky-300",
    liquidated: "bg-slate-200 text-slate-700 border border-slate-300",
    closed: "bg-red-100 text-red-800 border border-red-300",
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
