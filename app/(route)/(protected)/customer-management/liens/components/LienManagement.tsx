"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Landmark,
  Search,
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  approveLienAction,
  getLiensAction,
  rejectLienAction,
} from "@/actions/account-lien.action";
import ActionMenu from "@/components/ActionMenu";
import ExportDropdown from "@/components/ExportDropdown";
import ReasonModal from "@/components/ReasonModal";
import TotpConfirmModal from "@/components/TotpConfirmModal";
import { handleApiError } from "@/lib/errors";
import { usePermissions } from "@/lib/permissions";

type Lien = Record<string, any>;
type Meta = Record<string, any> | null;

interface LienManagementProps {
  initialLiens: Lien[];
  initialMeta: Meta;
}

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  active: "bg-blue-50 text-blue-700 border-blue-200",
  released: "bg-slate-100 text-slate-600 border-slate-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  expired: "bg-slate-100 text-slate-600 border-slate-200",
};

function StatusBadge({ status }: { status: string }) {
  const style =
    STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${style}`}
    >
      {status}
    </span>
  );
}

const STATUS_OPTIONS = [
  "",
  "pending",
  "active",
  "released",
  "rejected",
  "expired",
];

export default function LienManagement({
  initialLiens,
  initialMeta,
}: LienManagementProps) {
  const router = useRouter();
  const { currentUser, hasPermission } = usePermissions();
  const canApprove = hasPermission("approve_liens");

  const [liens, setLiens] = useState<Lien[]>(initialLiens);
  const [meta, setMeta] = useState<Meta>(initialMeta);
  const [pageLoading, setPageLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [approveTarget, setApproveTarget] = useState<Lien | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Lien | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<number | string | null>(
    null,
  );

  const isFirstRender = useRef(true);

  const stats = meta?.statistics;
  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;

  async function fetchPage(page: number) {
    setPageLoading(true);
    const result: any = await getLiensAction(page, {
      search,
      status: statusFilter,
    });

    if (result?.status !== "success") {
      handleApiError(result, "Failed to load liens.");
      setPageLoading(false);
      return;
    }

    setLiens(Array.isArray(result.data) ? result.data : []);
    setMeta(result.meta ?? null);

    setPageLoading(false);
  }

  function goToPage(page: number) {
    if (page < 1 || page > lastPage || page === currentPage || pageLoading)
      return;
    fetchPage(page);
  }

  // Debounced re-fetch whenever a filter changes, same pattern as the
  // main transactions/customers list pages.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timeout = setTimeout(() => fetchPage(1), 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  async function handleApprove(totpCode: string) {
    if (!approveTarget) return;
    setSubmitting(true);
    const result: any = await approveLienAction(approveTarget.id, totpCode);
    if (result?.status !== "success") {
      handleApiError(result, "Failed to approve lien.");
      setSubmitting(false);
      return;
    }
    toast.success("Lien approved.");
    setApproveTarget(null);
    fetchPage(currentPage);

    setSubmitting(false);
  }

  async function handleReject(reason: string) {
    if (!rejectTarget) return;
    setSubmitting(true);
    const result: any = await rejectLienAction(rejectTarget.id, reason);
    if (result?.status !== "success") {
      handleApiError(result, "Failed to reject lien.");
      setSubmitting(false);
      return;
    }
    toast.success("Lien rejected.");
    setRejectTarget(null);
    fetchPage(currentPage);

    setSubmitting(false);
  }

  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Liens
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Every lien ever requested on an account — pending, active, released,
            rejected or expired.
          </p>
        </div>
      </div>

      {/* SUMMARY — real totals across the whole table, independent of the current page/filter */}
      <section className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          title="Total Liens"
          value={stats?.total ?? meta?.total ?? liens.length}
          description={`₦${formatCurrency(stats?.total_amount)} total`}
          icon={<Landmark size={22} />}
          iconStyle="bg-[#29478f] text-white"
        />
        <SummaryCard
          title="Total Pending"
          value={stats?.pending ?? 0}
          description={`₦${formatCurrency(stats?.pending_amount)} awaiting approval`}
          icon={<Clock3 size={22} />}
          iconStyle="bg-amber-100 text-amber-800"
        />
        <SummaryCard
          title="Total Approved"
          value={stats?.active ?? 0}
          description={`₦${formatCurrency(stats?.active_amount)} currently active`}
          icon={<CheckCircle2 size={22} />}
          iconStyle="bg-emerald-100 text-emerald-800"
        />
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:flex-wrap md:items-center">
          <div className="relative flex-1 md:min-w-50">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by reference, account number or reason..."
              className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder-slate-500 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option || "all"} value={option}>
                {option
                  ? option.charAt(0).toUpperCase() + option.slice(1)
                  : "All Statuses"}
              </option>
            ))}
          </select>

          <ExportDropdown
            baseEndpoint="/admin/account-liens"
            params={{ search, status: statusFilter }}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-250">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Reference
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Account
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Customer
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Amount
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Requested By
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Requested
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Status
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {liens.map((lien) => {
                const isOwnRequest =
                  String(lien.created_by) === String(currentUser?.id);
                const isPending = lien.status === "pending";

                return (
                  <tr
                    key={lien.id}
                    onClick={() =>
                      router.push(`/customer-management/liens/${lien.id}`)
                    }
                    className="cursor-pointer hover:bg-slate-50/80"
                  >
                    <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                      {lien.reference}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      {lien.account_number}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      <p className="font-semibold text-slate-900">
                        {lien.customer?.full_name ?? "—"}
                      </p>
                      {lien.customer?.cif_number && (
                        <p className="text-xs text-slate-500">
                          {lien.customer.cif_number}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-slate-900">
                      ₦{formatCurrency(lien.amount)}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      {lien.created_by_name ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      {lien.created_at
                        ? new Date(lien.created_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={lien.status} />
                    </td>
                    <td
                      className="px-5 py-4"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <ActionMenu
                        isOpen={actionMenuId === lien.id}
                        onToggle={() =>
                          setActionMenuId(
                            actionMenuId === lien.id ? null : lien.id,
                          )
                        }
                        onClose={() => setActionMenuId(null)}
                      >
                        <MenuButton
                          onClick={() => {
                            setActionMenuId(null);
                            router.push(
                              `/customer-management/liens/${lien.id}`,
                            );
                          }}
                        >
                          <Eye size={16} />
                          View
                        </MenuButton>

                        {isPending && canApprove && !isOwnRequest && (
                          <MenuButton
                            onClick={() => {
                              setActionMenuId(null);
                              setApproveTarget(lien);
                            }}
                          >
                            <CheckCircle2 size={16} />
                            Approve
                          </MenuButton>
                        )}

                        {isPending && canApprove && (
                          <MenuButton
                            onClick={() => {
                              setActionMenuId(null);
                              setRejectTarget(lien);
                            }}
                          >
                            <XCircle size={16} />
                            Reject
                          </MenuButton>
                        )}
                      </ActionMenu>
                    </td>
                  </tr>
                );
              })}

              {!pageLoading && liens.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-16 text-center text-sm font-medium text-slate-500"
                  >
                    No liens found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 p-5 bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-600">
            {meta
              ? `Showing ${meta.from ?? 0}-${meta.to ?? 0} of ${meta.total ?? 0} liens`
              : `Showing ${liens.length} liens`}
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

      <TotpConfirmModal
        isOpen={!!approveTarget}
        title="Approve Lien"
        description={
          approveTarget
            ? `Approve lien '${approveTarget.reference}' for ₦${formatCurrency(approveTarget.amount)}? This will set the funds aside immediately.`
            : undefined
        }
        confirmLabel="Yes, Approve"
        confirmTone="primary"
        pending={submitting}
        onCancel={() => setApproveTarget(null)}
        onConfirm={handleApprove}
      />

      <ReasonModal
        isOpen={!!rejectTarget}
        title="Reject Lien"
        description="Provide a reason for rejecting this lien request."
        confirmLabel="Reject Lien"
        confirmTone="danger"
        pending={submitting}
        onCancel={() => setRejectTarget(null)}
        onConfirm={handleReject}
      />
    </>
  );
}

function MenuButton(props: Record<string, any>) {
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
