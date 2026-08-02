"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleOff,
  Clock3,
  Eye,
  Mail,
  Phone,
  Plus,
  Search,
  Upload,
  User,
  Users,
} from "lucide-react";
import { toast } from "react-toastify";
import { getCustomersAction } from "@/actions/customer.action";
import ActionMenu from "@/components/ActionMenu";
import ExportDropdown from "@/components/ExportDropdown";
import { handleApiError } from "@/lib/errors";
import { toDisplayLabel } from "@/lib/format";
import BulkImportCustomersModal from "./BulkImportCustomersModal";

type Customer = Record<string, any>;
type CustomerMeta = Record<string, any> | null;

interface CustomerManagementProps {
  initialCustomers?: Customer[];
  initialMeta?: CustomerMeta;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

// Mirrors CustomerType::businessLike() on the API — business, government and
// corporate customers all carry a business record instead of a personal one.
function isBusinessLike(customerType: string) {
  return customerType === "business" || customerType === "government" || customerType === "corporate";
}

function customerDisplayName(customer: Customer) {
  if (isBusinessLike(customer.customer_type)) {
    return (
      customer.business?.business_name ||
      customer.business_name ||
      `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim()
    );
  }

  return `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim();
}

export default function CustomerManagement({
  initialCustomers = [],
  initialMeta = null,
}: CustomerManagementProps) {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [meta, setMeta] = useState<CustomerMeta>(initialMeta);
  const [pageLoading, setPageLoading] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<number | string | null>(null);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const stats = meta?.statistics;

  const totalCustomers = stats?.total_customers ?? meta?.total ?? customers.length;
  const activeCustomers =
    stats?.total_active ?? customers.filter((c) => c.status === "active").length;
  const pendingCustomers =
    stats?.total_pending ?? customers.filter((c) => c.status === "pending").length;
  const inactiveCustomers =
    stats?.total_inactive ?? customers.filter((c) => c.status === "inactive").length;

  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;

  async function fetchPage(page: number) {
    setPageLoading(true);
    try {
      const result: any = await getCustomersAction(page, search);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to load customers.");
        return;
      }

      setCustomers(Array.isArray(result.data) ? result.data : []);
      setMeta(result.meta ?? null);
    } catch (error) {
      console.error("Failed to load customers:", error);
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

  const filteredCustomers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const searchableData = [
        customerDisplayName(customer),
        customer.email,
        customer.phone,
        customer.username,
        customer.code,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableData.includes(keyword);
      const matchesStatus = statusFilter === "all" || customer.status === statusFilter;
      const matchesType = typeFilter === "all" || customer.customer_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [customers, search, statusFilter, typeFilter]);

  return (
    <>
      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customers</h1>
          <p className="mt-1 text-sm text-slate-600">
            Onboard and manage individual and business customers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportDropdown
            baseEndpoint="/admin/customers"
            params={{ search, status: statusFilter === "all" ? undefined : statusFilter }}
          />

          <button
            type="button"
            onClick={() => setBulkImportOpen(true)}
            className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 shadow-sm"
          >
            <Upload size={18} />
            Bulk Upload
          </button>

          <button
            type="button"
            onClick={() => router.push("/customer-management/customer/create?type=individual")}
            className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#173673] px-5 text-sm font-semibold text-white transition hover:bg-[#10295c] shadow-sm"
          >
            <Plus size={18} />
            Add Customer
          </button>
        </div>
      </div>

      <BulkImportCustomersModal
        isOpen={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        onImported={() => fetchPage(1)}
      />

      {/* SUMMARY */}
      <section className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Customers"
          value={totalCustomers}
          description="All onboarded customers"
          icon={<Users size={22} />}
          iconStyle="bg-[#29478f] text-white"
        />

        <SummaryCard
          title="Active Customers"
          value={activeCustomers}
          description="Currently active"
          icon={<CheckCircle2 size={22} />}
          iconStyle="bg-emerald-100 text-emerald-800"
        />

        <SummaryCard
          title="Pending Customers"
          value={pendingCustomers}
          description="Awaiting approval"
          icon={<Clock3 size={22} />}
          iconStyle="bg-amber-100 text-amber-800"
        />

        <SummaryCard
          title="Inactive Customers"
          value={inactiveCustomers}
          description="Currently inactive"
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
            onKeyDown={(event) => {
              if (event.key === "Enter") fetchPage(1);
            }}
            placeholder="Search by name, email, phone or username..."
            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder-slate-500 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          className="h-12 cursor-pointer rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 outline-none focus:border-[#29478f]"
        >
          <option value="all">All Types</option>
          <option value="individual">Individual</option>
          <option value="minor">Minor</option>
          <option value="business">Business</option>
          <option value="government">Government</option>
          <option value="corporate">Corporate</option>
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-12 cursor-pointer rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 outline-none focus:border-[#29478f]"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
        </select>
      </section>

      {/* DATATABLE */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-275">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <Heading>Customer</Heading>
                <Heading>Type</Heading>
                <Heading>Contact</Heading>
                <Heading>Account Number</Heading>
                <Heading>Status</Heading>
                <Heading>Created</Heading>
                <Heading>Actions</Heading>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#29478f]">
                        {isBusinessLike(customer.customer_type) ? (
                          <Briefcase size={21} />
                        ) : (
                          <User size={21} />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900">
                          {customerDisplayName(customer) || "—"}
                        </p>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">
                          {customer.code || `CUS-${customer.id}`} • {customer.username}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 text-sm font-medium capitalize text-slate-800">
                    {customer.customer_type}
                  </td>

                  <td className="px-5 py-5">
                    <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                      <Mail size={15} className="text-slate-500" />
                      {customer.email}
                    </p>
                    <p className="mt-1.5 flex items-center gap-2 text-sm text-slate-600">
                      <Phone size={15} className="text-slate-500" />
                      {customer.phone}
                    </p>
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {Array.isArray(customer.accounts) && customer.accounts.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {customer.accounts.map((account: Record<string, any>) => (
                          <span key={account.id} className="font-mono text-xs font-semibold text-slate-800">
                            {account.account_number}
                          </span>
                        ))}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="px-5">
                    <StatusBadge status={customer.status} />
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {formatDateTime(customer.created_at)}
                  </td>

                  <td className="px-5">
                    <ActionMenu
                      isOpen={actionMenuId === customer.id}
                      onToggle={() =>
                        setActionMenuId(actionMenuId === customer.id ? null : customer.id)
                      }
                      onClose={() => setActionMenuId(null)}
                    >
                      <ActionButton
                        onClick={() => {
                          setActionMenuId(null);
                          router.push(`/customer-management/customer/${customer.id}`);
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

        {!pageLoading && filteredCustomers.length === 0 && (
          <div className="py-16 text-center text-sm font-medium text-slate-500">
            No customers found.
          </div>
        )}

        {/* PAGINATION */}
        <div className="flex flex-col gap-3 border-t border-slate-200 p-5 bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-600">
            {meta
              ? `Showing ${meta.from ?? 0}-${meta.to ?? 0} of ${meta.total ?? totalCustomers} customers`
              : `Showing ${filteredCustomers.length} customers`}
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
