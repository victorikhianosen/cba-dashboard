"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleOff,
  Clock3,
  Eye,
  Landmark,
  Search,
  Wallet,
} from "lucide-react";
import { toast } from "react-toastify";
import { getAccountsAction } from "@/actions/account.action";
import ActionMenu from "@/components/ActionMenu";
import { handleApiError } from "@/lib/errors";
import { toDisplayLabel } from "@/lib/format";

type Account = Record<string, any>;
type AccountMeta = Record<string, any> | null;

interface AccountManagementProps {
  initialAccounts?: Account[];
  initialMeta?: AccountMeta;
}

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default function AccountManagement({
  initialAccounts = [],
  initialMeta = null,
}: AccountManagementProps) {
  const router = useRouter();

  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [meta, setMeta] = useState<AccountMeta>(initialMeta);
  const [pageLoading, setPageLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionMenuId, setActionMenuId] = useState<number | string | null>(
    null,
  );

  const totalAccounts = meta?.total ?? accounts.length;
  const activeAccounts = accounts.filter((a) => a.status === "active").length;
  const pendingAccounts = accounts.filter((a) => a.status === "pending").length;
  const inactiveAccounts = accounts.filter(
    (a) => a.status !== "active" && a.status !== "pending",
  ).length;

  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;

  async function fetchPage(page: number) {
    setPageLoading(true);
    const result: any = await getAccountsAction(page, search);

    if (result?.status !== "success") {
      handleApiError(result, "Failed to load accounts.");
      setPageLoading(false);
      return;
    }

    setAccounts(Array.isArray(result.data) ? result.data : []);
    setMeta(result.meta ?? null);

    setPageLoading(false);
  }

  async function goToPage(page: number) {
    if (page < 1 || page > lastPage || page === currentPage || pageLoading) {
      return;
    }

    await fetchPage(page);
  }

  const filteredAccounts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return accounts.filter((account) => {
      const searchableData = [
        account.account_number,
        account.account_name,
        account.customer?.cif_number,
        account.customer?.full_name,
        account.customer?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableData.includes(keyword);
      const matchesStatus =
        statusFilter === "all" || account.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [accounts, search, statusFilter]);

  return (
    <>
      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Accounts
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Every account opened across all customers
          </p>
        </div>
      </div>

      {/* SUMMARY */}
      <section className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Accounts"
          value={totalAccounts}
          description="All accounts opened"
          icon={<Landmark size={22} />}
          iconStyle="bg-[#29478f] text-white"
        />

        <SummaryCard
          title="Active Accounts"
          value={activeAccounts}
          description="On this page"
          icon={<CheckCircle2 size={22} />}
          iconStyle="bg-emerald-100 text-emerald-800"
        />

        <SummaryCard
          title="Pending Accounts"
          value={pendingAccounts}
          description="On this page"
          icon={<Clock3 size={22} />}
          iconStyle="bg-amber-100 text-amber-800"
        />

        <SummaryCard
          title="Other Statuses"
          value={inactiveAccounts}
          description="Dormant, frozen, closed, etc."
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
            placeholder="Search by account number, customer name or CIF..."
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
          <option value="dormant">Dormant</option>
          <option value="frozen">Frozen</option>
          <option value="closed">Closed</option>
        </select>
      </section>

      {/* DATATABLE */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-275">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <Heading>Account</Heading>
                <Heading>Product / Tier</Heading>
                <Heading>Available Balance</Heading>
                <Heading>Account Balance</Heading>
                <Heading>Status</Heading>
                <Heading>Opened</Heading>
                <Heading>Actions</Heading>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredAccounts.map((account) => (
                <tr
                  key={account.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-5 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#29478f]">
                        <Wallet size={20} />
                      </div>
                      <div>
                        <p className="flex items-center gap-2 font-bold text-sm text-slate-900">
                          {account.account_number}
                          {account.primary_account && (
                            <span className="rounded-full bg-[#29478f] px-2 py-0.5 text-[10px] font-semibold text-white">
                              Primary
                            </span>
                          )}
                        </p>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">
                          {account.account_name}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    <p className="capitalize">
                      {account.account_product?.product_type || "—"}
                    </p>
                    {account.account_tier?.level && (
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        Tier {account.account_tier.level}
                      </p>
                    )}
                  </td>

                  <td className="px-5 text-sm font-bold text-slate-900">
                    ₦{formatCurrency(account.available_balance)}
                  </td>

                  <td className="px-5 text-sm font-bold text-slate-900">
                    ₦{formatCurrency(account.account_balance)}
                  </td>

                  <td className="px-5">
                    <StatusBadge status={account.status} />
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {formatDateTime(account.created_at)}
                  </td>

                  <td className="px-5">
                    <ActionMenu
                      isOpen={actionMenuId === account.id}
                      onToggle={() =>
                        setActionMenuId(
                          actionMenuId === account.id ? null : account.id,
                        )
                      }
                      onClose={() => setActionMenuId(null)}
                    >
                      <ActionButton
                        onClick={() => {
                          setActionMenuId(null);
                          router.push(
                            `/customer-management/account/${account.id}`,
                          );
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

        {!pageLoading && filteredAccounts.length === 0 && (
          <div className="py-16 text-center text-sm font-medium text-slate-500">
            <Banknote size={28} className="mx-auto text-slate-300" />
            <p className="mt-3">No accounts found.</p>
          </div>
        )}

        {/* PAGINATION */}
        <div className="flex flex-col gap-3 border-t border-slate-200 p-5 bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-600">
            {meta
              ? `Showing ${meta.from ?? 0}-${meta.to ?? 0} of ${meta.total ?? totalAccounts} accounts`
              : `Showing ${filteredAccounts.length} accounts`}
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
              ),
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
      <div
        className={`absolute right-5 top-5 rounded-xl p-3 ${props.iconStyle}`}
      >
        {props.icon}
      </div>
      <p className="text-sm font-semibold text-slate-500">{props.title}</p>
      <h2 className="mt-3 text-3xl font-extrabold text-slate-900">
        {props.value}
      </h2>
      <p className="mt-2 text-xs font-medium text-slate-600">
        {props.description}
      </p>
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
    active: "bg-green-100 text-green-800 border border-green-300",
    pending: "bg-amber-100 text-amber-800 border border-amber-300",
    inactive: "bg-red-100 text-red-800 border border-red-300",
    dormant: "bg-slate-200 text-slate-700 border border-slate-300",
    frozen: "bg-sky-100 text-sky-800 border border-sky-300",
    closed: "bg-red-100 text-red-800 border border-red-300",
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
