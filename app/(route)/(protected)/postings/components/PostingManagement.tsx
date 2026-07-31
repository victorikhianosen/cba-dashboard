"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
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
import { bulkApprovePostingsAction, getPostingsAction } from "@/actions/posting.action";
import ActionMenu from "@/components/ActionMenu";
import ConfirmModal from "@/components/ConfirmModal";
import ExportButtons from "@/components/ExportButtons";
import { handleApiError } from "@/lib/errors";
import { toDisplayLabel } from "@/lib/format";
import { usePermissions } from "@/lib/permissions";

const MAX_BULK_APPROVE = 50;

type Posting = Record<string, any>;
type PostingMeta = Record<string, any> | null;

interface PostingManagementProps {
  initialPostings?: Posting[];
  initialMeta?: PostingMeta;
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

// The four combinations the business calls "posting types" are just which
// side (account = a customer's account, general_ledger = a GL) each party is.
function partyKind(type: string) {
  return type === "account" ? "Customer" : "GL";
}

function postingTypeLabel(posting: Posting) {
  return `${partyKind(posting.source_type)} → ${partyKind(posting.destination_type)}`;
}

// Name on top, code/account number underneath — same layout as the Reference column.
function partyNameTop(party: Record<string, any> | null | undefined) {
  if (!party) return "—";
  if (party.type === "account") return party.account_name || "—";
  if (party.type === "general_ledger") return toDisplayLabel(party.name) || "—";
  return "—";
}

function partyCodeBottom(party: Record<string, any> | null | undefined) {
  if (!party) return "";
  if (party.type === "account") return party.account_number ?? "";
  if (party.type === "general_ledger") return party.gl_code ?? "";
  return "";
}

const POSTING_TYPES = [
  { value: "gl_to_gl", label: "GL to GL", source: "general_ledger", destination: "general_ledger" },
  { value: "customer_to_gl", label: "Customer to GL", source: "account", destination: "general_ledger" },
  { value: "gl_to_customer", label: "GL to Customer", source: "general_ledger", destination: "account" },
  { value: "customer_to_customer", label: "Customer to Customer", source: "account", destination: "account" },
];

export default function PostingManagement({
  initialPostings = [],
  initialMeta = null,
}: PostingManagementProps) {
  const router = useRouter();
  const { currentUser } = usePermissions();

  const [postings, setPostings] = useState<Posting[]>(initialPostings);
  const [meta, setMeta] = useState<PostingMeta>(initialMeta);
  const [pageLoading, setPageLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [actionMenuId, setActionMenuId] = useState<number | string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());
  const [bulkApproveModalOpen, setBulkApproveModalOpen] = useState(false);

  const totalPostings = meta?.total ?? postings.length;
  const pendingPostings = postings.filter((p) => p.status === "pending").length;
  const approvedPostings = postings.filter((p) => p.status === "approved").length;
  const rejectedPostings = postings.filter((p) => p.status === "rejected").length;

  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;

  const isFirstRender = useRef(true);

  const exportParams = {
    from,
    to,
    search,
    status: statusFilter === "all" ? "" : statusFilter,
    type: typeFilter === "all" ? "" : typeFilter,
  };

  async function fetchPage(page: number) {
    setPageLoading(true);
    try {
      const result: any = await getPostingsAction(page, exportParams);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to load postings.");
        return;
      }

      setPostings(Array.isArray(result.data) ? result.data : []);
      setMeta(result.meta ?? null);
    } catch (error) {
      console.error("Failed to load postings:", error);
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

    setSelectedIds(new Set());
    const timeout = setTimeout(() => fetchPage(1), 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, from, to, statusFilter, typeFilter]);

  function resetFilters() {
    setSearch("");
    setFrom("");
    setTo("");
    setStatusFilter("all");
    setTypeFilter("all");
  }

  async function goToPage(page: number) {
    if (page < 1 || page > lastPage || page === currentPage || pageLoading) {
      return;
    }

    setSelectedIds(new Set());
    await fetchPage(page);
  }

  function isPending(posting: Posting) {
    return posting.status === "pending";
  }

  function isOwnPosting(posting: Posting) {
    return Boolean(currentUser?.id) && String(currentUser?.id) === String(posting.created_by);
  }

  function isSelectable(posting: Posting) {
    return isPending(posting) && !isOwnPosting(posting);
  }

  function toggleSelect(id: number | string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_BULK_APPROVE) {
        next.add(id);
      } else {
        toast.warn(`You can only bulk-approve up to ${MAX_BULK_APPROVE} postings at once.`);
      }
      return next;
    });
  }

  function toggleSelectAllOnPage(selectablePostings: Posting[]) {
    setSelectedIds((prev) => {
      const allSelected = selectablePostings.length > 0 && selectablePostings.every((p) => prev.has(p.id));
      if (allSelected) {
        const next = new Set(prev);
        selectablePostings.forEach((p) => next.delete(p.id));
        return next;
      }

      const next = new Set(prev);
      for (const posting of selectablePostings) {
        if (next.size >= MAX_BULK_APPROVE) {
          toast.warn(`You can only bulk-approve up to ${MAX_BULK_APPROVE} postings at once.`);
          break;
        }
        next.add(posting.id);
      }
      return next;
    });
  }

  function handleBulkApprove() {
    const ids = Array.from(selectedIds);

    // Fire-and-forget: the backend just queues the batch, so the UI doesn't wait
    // on it — close the modal and clear the selection right away.
    setBulkApproveModalOpen(false);
    setSelectedIds(new Set());
    toast.success(`${ids.length} posting(s) queued for approval — they will update shortly.`);

    bulkApprovePostingsAction(ids)
      .then((result: any) => {
        if (result?.status !== "success") {
          handleApiError(result, "Failed to queue postings for approval.");
          return;
        }

        // Give the queue a moment to work through the batch, then refresh this page.
        setTimeout(() => fetchPage(currentPage), 3000);
      })
      .catch((error) => {
        console.error("Failed to bulk-approve postings:", error);
        toast.error("A network error occurred. Please try again.");
      });
  }

  return (
    <>
      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Postings</h1>
          <p className="mt-1 text-sm text-slate-600">
            GL to GL, Customer to GL, GL to Customer and Customer to Customer postings
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportButtons baseEndpoint="/admin/postings" params={exportParams} />

          <button
            type="button"
            onClick={() => router.push("/postings/create")}
            className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#173673] px-5 text-sm font-semibold text-white transition hover:bg-[#10295c] shadow-sm"
          >
            <Plus size={18} />
            New Posting
          </button>
        </div>
      </div>

      {/* SUMMARY */}
      <section className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Postings"
          value={totalPostings}
          description="All postings created"
          icon={<ArrowLeftRight size={22} />}
          iconStyle="bg-[#29478f] text-white"
        />
        <SummaryCard
          title="Pending"
          value={pendingPostings}
          description="Awaiting approval"
          icon={<Clock3 size={22} />}
          iconStyle="bg-amber-100 text-amber-800"
        />
        <SummaryCard
          title="Approved"
          value={approvedPostings}
          description="Posted to the ledger"
          icon={<CheckCircle2 size={22} />}
          iconStyle="bg-emerald-100 text-emerald-800"
        />
        <SummaryCard
          title="Rejected"
          value={rejectedPostings}
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
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          className="h-12 cursor-pointer rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 outline-none focus:border-[#29478f]"
        >
          <option value="all">All Types</option>
          {POSTING_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-12 cursor-pointer rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 outline-none focus:border-[#29478f]"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
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

      {/* BULK APPROVE BAR */}
      {selectedIds.size > 0 && (
        <section className="mt-4 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-5 py-3">
          <p className="text-sm font-semibold text-blue-900">
            {selectedIds.size} posting{selectedIds.size === 1 ? "" : "s"} selected
            {selectedIds.size >= MAX_BULK_APPROVE ? ` (max ${MAX_BULK_APPROVE})` : ""}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-100 transition"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setBulkApproveModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-[#173673] px-4 py-2 text-sm font-semibold text-white hover:bg-[#10295c] transition"
            >
              <CheckCircle2 size={16} />
              Approve Selected
            </button>
          </div>
        </section>
      )}

      <ConfirmModal
        isOpen={bulkApproveModalOpen}
        title="Approve Selected Postings"
        description={`Approve ${selectedIds.size} selected posting(s)? They'll be queued and posted to the ledger in the background — you don't need to wait, they'll update shortly.`}
        confirmLabel="Yes, Approve"
        confirmTone="primary"
        pending={false}
        onCancel={() => setBulkApproveModalOpen(false)}
        onConfirm={handleBulkApprove}
      />

      {/* DATATABLE */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-275">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="w-10 px-5 py-4">
                  <input
                    type="checkbox"
                    aria-label="Select all pending on this page"
                    checked={
                      postings.some(isSelectable) &&
                      postings.filter(isSelectable).every((p) => selectedIds.has(p.id))
                    }
                    onChange={() => toggleSelectAllOnPage(postings.filter(isSelectable))}
                    className="h-4 w-4 cursor-pointer rounded border-slate-300"
                  />
                </th>
                <Heading>Reference</Heading>
                <Heading>Type</Heading>
                <Heading>Source</Heading>
                <Heading>Destination</Heading>
                <Heading>Amount</Heading>
                <Heading>Status</Heading>
                <Heading>Created</Heading>
                <Heading>Actions</Heading>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {postings.map((posting) => (
                <tr key={posting.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="w-10 px-5 py-5">
                    {isPending(posting) && (
                      <input
                        type="checkbox"
                        aria-label={`Select posting ${posting.reference}`}
                        checked={selectedIds.has(posting.id)}
                        disabled={isOwnPosting(posting)}
                        title={
                          isOwnPosting(posting)
                            ? "You cannot approve a posting you created yourself"
                            : undefined
                        }
                        onChange={() => toggleSelect(posting.id)}
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                      />
                    )}
                  </td>
                  <td className="px-5 py-5">
                    <p className="font-bold text-sm text-slate-900">{posting.reference}</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500 capitalize">
                      {toDisplayLabel(posting.transaction_type) || "—"}
                    </p>
                    {posting.transaction_reference && (
                      <p className="mt-0.5 text-xs font-medium text-slate-400">
                        {posting.transaction_reference}
                      </p>
                    )}
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {postingTypeLabel(posting)}
                  </td>

                  <td className="px-5 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">{partyNameTop(posting.source)}</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">
                      {partyCodeBottom(posting.source)}
                    </p>
                  </td>
                  <td className="px-5 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">{partyNameTop(posting.destination)}</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">
                      {partyCodeBottom(posting.destination)}
                    </p>
                  </td>

                  <td className="px-5 text-sm font-bold text-slate-900">
                    ₦{formatCurrency(posting.amount)}
                  </td>

                  <td className="px-5">
                    <StatusBadge status={posting.status} />
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {formatDateTime(posting.created_at)}
                  </td>

                  <td className="px-5">
                    <ActionMenu
                      isOpen={actionMenuId === posting.id}
                      onToggle={() =>
                        setActionMenuId(actionMenuId === posting.id ? null : posting.id)
                      }
                      onClose={() => setActionMenuId(null)}
                    >
                      <ActionButton
                        onClick={() => {
                          setActionMenuId(null);
                          router.push(`/postings/${posting.id}`);
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

        {!pageLoading && postings.length === 0 && (
          <div className="py-16 text-center text-sm font-medium text-slate-500">
            No postings found.
          </div>
        )}

        {/* PAGINATION */}
        <div className="flex flex-col gap-3 border-t border-slate-200 p-5 bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-600">
            {meta
              ? `Showing ${meta.from ?? 0}-${meta.to ?? 0} of ${meta.total ?? totalPostings} postings`
              : `Showing ${postings.length} postings`}
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
    pending: "bg-amber-100 text-amber-800 border border-amber-300",
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
