"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Box,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleOff,
  Clock3,
  Edit3,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  approveInvestmentProductAction,
  createInvestmentProductAction,
  getInvestmentProductsAction,
  updateInvestmentProductAction,
  updateInvestmentProductStatusAction,
  uploadInvestmentProductIconAction,
} from "@/actions/investment-product.action";
import ActionMenu from "@/components/ActionMenu";
import { handleApiError } from "@/lib/errors";
import { toDisplayLabel, toSnakeCase } from "@/lib/format";
import InvestmentProductFormDrawer from "./InvestmentProductFormDrawer";

type InvestmentProduct = Record<string, any>;
type InvestmentProductFormData = Record<string, any>;
type InvestmentProductMeta = Record<string, any> | null;
type LookupOption = Record<string, any>;

interface InvestmentProductManagementProps {
  initialInvestmentProducts?: InvestmentProduct[];
  initialMeta?: InvestmentProductMeta;
  currencies: LookupOption[];
  generalLedgers: LookupOption[];
}

// Numeric fields the create/update form collects as strings; the backend
// expects real numbers, so anything that parses cleanly is coerced here.
const NUMERIC_FIELDS = [
  "currency_id",
  "interest_rate",
  "min_tenure_days",
  "max_tenure_days",
  "min_deposit_amount",
  "max_deposit_amount",
  "early_liquidation_lock_days",
  "early_liquidation_penalty_rate",
  "withholding_tax_rate",
  "minimum_retention_percentage",
  "investmentLiabilityAccountId",
  "investmentFundingAccountId",
  "interestExpenseAccountId",
  "interestPayableAccountId",
  "interestPaidAccountId",
  "earlyLiquidationPenaltyIncomeAccountId",
  "investmentFeeIncomeAccountId",
  "withholdingTaxPayableAccountId",
  "taxExpenseAccountId",
  "settlementMaturityAccountId",
];

function buildPayload(formData: InvestmentProductFormData) {
  const payload: Record<string, any> = { ...formData };

  if (payload.name) {
    payload.name = toSnakeCase(payload.name);
  }

  for (const field of NUMERIC_FIELDS) {
    if (payload[field] === "" || payload[field] === undefined || payload[field] === null) {
      delete payload[field];
    } else {
      const parsed = Number(payload[field]);
      if (!Number.isNaN(parsed)) {
        payload[field] = parsed;
      }
    }
  }

  return payload;
}

export default function InvestmentProductManagement({
  initialInvestmentProducts = [],
  initialMeta = null,
  currencies,
  generalLedgers,
}: InvestmentProductManagementProps) {
  const [investmentProducts, setInvestmentProducts] =
    useState<InvestmentProduct[]>(initialInvestmentProducts);
  const [meta, setMeta] = useState<InvestmentProductMeta>(initialMeta);
  const [pageLoading, setPageLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedInvestmentProduct, setSelectedInvestmentProduct] =
    useState<InvestmentProduct | null>(null);
  const [actionMenuId, setActionMenuId] = useState<any>(null);

  const [submitting, setSubmitting] = useState(false);

  const stats = meta?.statistics;

  const totalProducts = stats?.total_investment_products ?? investmentProducts.length;
  const activeProducts =
    stats?.total_active ?? investmentProducts.filter((p) => p.status === "active").length;
  const pendingProducts =
    stats?.total_pending ?? investmentProducts.filter((p) => p.status === "pending").length;
  const inactiveProducts =
    stats?.total_inactive ?? investmentProducts.filter((p) => p.status === "inactive").length;

  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;

  const isFirstRender = useRef(true);

  async function fetchPage(page: number, searchTerm: string = search) {
    setPageLoading(true);
    try {
      const result: any = await getInvestmentProductsAction(page, searchTerm);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to load investment products.");
        return;
      }

      setInvestmentProducts(Array.isArray(result.data) ? result.data : []);
      setMeta(result.meta ?? null);
    } catch (error) {
      console.error("Failed to load investment products:", error);
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

  const filteredInvestmentProducts = useMemo(() => {
    return investmentProducts.filter((product) => {
      return statusFilter === "all" || product.status === statusFilter;
    });
  }, [investmentProducts, statusFilter]);

  function openCreateDrawer() {
    setSelectedInvestmentProduct(null);
    setActionMenuId(null);
    setDrawerOpen(true);
  }

  function openUpdateDrawer(product: InvestmentProduct) {
    setSelectedInvestmentProduct(product);
    setActionMenuId(null);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    if (submitting) return;
    setDrawerOpen(false);
    setSelectedInvestmentProduct(null);
  }

  async function handleFormSubmit(formData: InvestmentProductFormData, iconFile: File | null) {
    setSubmitting(true);
    try {
      const payload = buildPayload(formData);
      let productId: number | string | undefined = selectedInvestmentProduct?.id;

      if (selectedInvestmentProduct) {
        const result: any = await updateInvestmentProductAction(
          selectedInvestmentProduct.id,
          payload
        );

        if (result?.status !== "success") {
          handleApiError(result, "Failed to update investment product.");
          return;
        }

        toast.success(result.message || "Investment product updated successfully.");
      } else {
        const result: any = await createInvestmentProductAction(payload);

        if (result?.status !== "success") {
          handleApiError(result, "Failed to create investment product.");
          return;
        }

        productId = result?.data?.id;

        toast.success(result.message || "Investment product created successfully.");
      }

      if (iconFile && productId) {
        const iconFormData = new FormData();
        iconFormData.set("icon", iconFile);

        const iconResult: any = await uploadInvestmentProductIconAction(productId, iconFormData);
        if (iconResult?.status !== "success") {
          handleApiError(iconResult, "Product saved, but the icon failed to upload.");
        }
      }

      await fetchPage(selectedInvestmentProduct ? currentPage : 1);

      setDrawerOpen(false);
      setSelectedInvestmentProduct(null);
    } catch (error) {
      console.error("Failed to save investment product:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Pending products go through the dedicated approve endpoint (its own
  // "approve_investment_products" permission); already-approved ones just
  // toggle active/inactive via the status endpoint.
  async function handleStatusChange(product: InvestmentProduct) {
    setActionMenuId(null);

    try {
      const result: any =
        product.status === "pending"
          ? await approveInvestmentProductAction(product.id)
          : await updateInvestmentProductStatusAction(
              product.id,
              product.status === "active" ? "inactive" : "active"
            );

      if (result?.status !== "success") {
        handleApiError(result, "Failed to update investment product status.");
        return;
      }

      await fetchPage(currentPage);

      toast.success(result.message || "Investment product status updated successfully.");
    } catch (error) {
      console.error("Failed to update investment product status:", error);
      toast.error("A network error occurred. Please try again.");
    }
  }

  function statusActionLabel(product: InvestmentProduct) {
    if (product.status === "pending") return "Approve";
    if (product.status === "active") return "Deactivate";
    return "Activate";
  }

  return (
    <>
      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Investment Products
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Create and manage investment products offered to customers
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateDrawer}
          className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#173673] px-5 text-sm font-semibold text-white transition hover:bg-[#10295c] shadow-sm"
        >
          <Plus size={18} />
          Add Investment Product
        </button>
      </div>

      {/* SUMMARY */}
      <section className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Products"
          value={totalProducts}
          description="All registered investment products"
          icon={<ShieldCheck size={22} />}
          iconStyle="bg-[#29478f] text-white"
        />

        <SummaryCard
          title="Active Products"
          value={activeProducts}
          description="Currently active products"
          icon={<CheckCircle2 size={22} />}
          iconStyle="bg-emerald-100 text-emerald-800"
        />

        <SummaryCard
          title="Pending Products"
          value={pendingProducts}
          description="Awaiting approval"
          icon={<Clock3 size={22} />}
          iconStyle="bg-amber-100 text-amber-800"
        />

        <SummaryCard
          title="Inactive Products"
          value={inactiveProducts}
          description="Currently inactive products"
          icon={<CircleOff size={22} />}
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
            placeholder="Search by product name or code..."
            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder-slate-500 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-12 cursor-pointer rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 outline-none focus:border-[#29478f]"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
          <option value="disabled">Disabled</option>
          <option value="rejected">Rejected</option>
        </select>
      </section>

      {/* DATATABLE */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-125">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <Heading>Product</Heading>
                <Heading>Currency</Heading>
                <Heading>Interest Rate</Heading>
                <Heading>Tenure</Heading>
                <Heading>Status</Heading>
                <Heading>Actions</Heading>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredInvestmentProducts.map((product) => (
                <tr
                  key={product.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-5 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#29478f]">
                        <Box size={21} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900">{toDisplayLabel(product.name)}</p>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">
                          {product.code ?? `ID: ${product.id}`}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {product.currency_code}
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {product.interest_rate}%
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {product.min_tenure_days}-{product.max_tenure_days} days
                  </td>

                  <td className="px-5">
                    <StatusBadge status={product.status} />
                  </td>

                  <td className="px-5">
                    <ActionMenu
                      isOpen={actionMenuId === product.id}
                      onToggle={() =>
                        setActionMenuId(
                          actionMenuId === product.id ? null : product.id
                        )
                      }
                      onClose={() => setActionMenuId(null)}
                    >
                      <ActionButton onClick={() => openUpdateDrawer(product)}>
                        <Edit3 size={16} />
                        Edit Product
                      </ActionButton>

                      <ActionButton onClick={() => handleStatusChange(product)}>
                        <CircleOff size={16} />
                        {statusActionLabel(product)}
                      </ActionButton>
                    </ActionMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!pageLoading && filteredInvestmentProducts.length === 0 && (
          <div className="py-16 text-center text-sm font-medium text-slate-500">
            No investment products found.
          </div>
        )}

        {/* PAGINATION */}
        <div className="flex flex-col gap-3 border-t border-slate-200 p-5 bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-600">
            {meta
              ? `Showing ${meta.from ?? 0}-${meta.to ?? 0} of ${meta.total ?? totalProducts} products`
              : `Showing ${filteredInvestmentProducts.length} products`}
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

      {/* FORM DRAWER */}
      <InvestmentProductFormDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        selectedInvestmentProduct={selectedInvestmentProduct}
        onSubmit={handleFormSubmit}
        submitting={submitting}
        currencies={currencies}
        generalLedgers={generalLedgers}
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
    pending: "bg-amber-100 text-amber-800 border border-amber-300",
    inactive: "bg-red-100 text-red-800 border border-red-300",
    disabled: "bg-slate-200 text-slate-700 border border-slate-300",
    rejected: "bg-red-100 text-red-800 border border-red-300",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
        styles[status] || "bg-slate-100 text-slate-700 border border-slate-300"
      }`}
    >
      {status}
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
