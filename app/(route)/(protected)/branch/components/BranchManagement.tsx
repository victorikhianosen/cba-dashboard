"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleOff,
  Clock3,
  Edit3,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  createBranchAction,
  getBranchesAction,
  updateBranchAction,
  updateBranchStatusAction,
} from "@/actions/branch.action";
import ActionMenu from "@/components/ActionMenu";
import { handleApiError } from "@/lib/errors";
import BranchFormDrawer from "./BranchFormDrawer";

type Branch = Record<string, any>;
type BranchFormData = Record<string, any>;
type BranchMeta = Record<string, any> | null;

interface BranchManagementProps {
  initialBranches?: Branch[];
  initialMeta?: BranchMeta;
}

export default function BranchManagement({
  initialBranches = [],
  initialMeta = null,
}: BranchManagementProps) {
  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [meta, setMeta] = useState<BranchMeta>(initialMeta);
  const [pageLoading, setPageLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [actionMenuId, setActionMenuId] = useState<any>(null);

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const stats = meta?.statistics;

  // Counts - prefer server-wide statistics, fall back to the current page
  const totalBranches = stats?.total_branches ?? branches.length;
  const activeBranches =
    stats?.total_active ?? branches.filter((b) => b.status === "active").length;
  const pendingBranches =
    stats?.total_pending ??
    branches.filter((b) => b.status === "pending").length;
  const inactiveBranches =
    stats?.total_inactive ??
    branches.filter((b) => b.status === "inactive").length;

  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;

  // Keeps the debounce effect from re-firing a duplicate request for the
  // initial render, since branches are already server-fetched for page 1.
  const isFirstRender = useRef(true);

  async function fetchPage(page: number, searchTerm: string = search) {
    setPageLoading(true);
    const result: any = await getBranchesAction(page, searchTerm);

    if (result?.status !== "success") {
      handleApiError(result, "Failed to load branches.");
      setPageLoading(false);
      return;
    }

    setBranches(Array.isArray(result.data) ? result.data : []);
    setMeta(result.meta ?? null);

    setPageLoading(false);
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

  // Status filter is applied client-side over the current (already
  // search-filtered) page of results.
  const filteredBranches = useMemo(() => {
    return branches.filter((branch) => {
      return statusFilter === "all" || branch.status === statusFilter;
    });
  }, [branches, statusFilter]);

  function openCreateDrawer() {
    setSelectedBranch(null);
    setActionMenuId(null);
    setDrawerOpen(true);
  }

  function openUpdateDrawer(branch: Branch) {
    setSelectedBranch(branch);
    setActionMenuId(null);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    if (submitting) return;
    setDrawerOpen(false);
    setSelectedBranch(null);
  }

  async function handleFormSubmit(formData: BranchFormData) {
    setSubmitting(true);
    if (selectedBranch) {
      const result: any = await updateBranchAction(selectedBranch.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        status: formData.status,
      });

      if (result?.status !== "success") {
        handleApiError(result, "Failed to update branch.");
        setSubmitting(false);
        return;
      }

      await fetchPage(currentPage);

      toast.success(result.message || "Branch updated successfully.");
    } else {
      const result: any = await createBranchAction({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
      });

      if (result?.status !== "success") {
        handleApiError(result, "Failed to create branch.");
        setSubmitting(false);
        return;
      }

      await fetchPage(1);

      toast.success(result.message || "Branch created successfully.");
    }
    setDrawerOpen(false);
    setSelectedBranch(null);

    setSubmitting(false);
  }

  async function handleStatusChange(branch: Branch) {
    const newStatus = branch.status === "active" ? "inactive" : "active";
    setActionMenuId(null);

    const result: any = await updateBranchStatusAction(branch.id, newStatus);

    if (result?.status !== "success") {
      handleApiError(result, "Failed to update branch status.");
      return;
    }

    await fetchPage(currentPage);

    toast.success(result.message || "Branch status updated successfully.");
  }

  async function handleDelete() {
    if (!branchToDelete) return;
    setDeleting(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setBranches((current) =>
      current.filter((branch) => branch.id !== branchToDelete.id),
    );
    setBranchToDelete(null);

    setDeleting(false);
  }

  return (
    <>
      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Branches
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Create and manage all BankPro branches
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateDrawer}
          className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#173673] px-5 text-sm font-semibold text-white transition hover:bg-[#10295c] shadow-sm"
        >
          <Plus size={18} />
          Add Branch
        </button>
      </div>

      {/* SUMMARY */}
      <section className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Branches"
          value={totalBranches}
          description="All registered branches"
          icon={<Building2 size={22} />}
          iconStyle="bg-[#29478f] text-white"
        />

        <SummaryCard
          title="Active Branches"
          value={activeBranches}
          description="Currently active branches"
          icon={<CheckCircle2 size={22} />}
          iconStyle="bg-emerald-100 text-emerald-800"
        />

        <SummaryCard
          title="Pending Branches"
          value={pendingBranches}
          description="Awaiting activation"
          icon={<Clock3 size={22} />}
          iconStyle="bg-amber-100 text-amber-800"
        />

        <SummaryCard
          title="Inactive Branches"
          value={inactiveBranches}
          description="Currently inactive branches"
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
            placeholder="Search by branch name, email, phone, city or state..."
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
          <option value="inactive">Inactive</option>
        </select>
      </section>

      {/* DATATABLE */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <Heading>Branch</Heading>
                <Heading>Contact</Heading>
                <Heading>Location</Heading>
                <Heading>Country</Heading>
                <Heading>Status</Heading>
                <Heading>Actions</Heading>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredBranches.map((branch) => (
                <tr
                  key={branch.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-5 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#29478f]">
                        <Building2 size={21} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900">
                          {branch.name}
                        </p>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">
                          ID: BR-{branch.id}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-5">
                    <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                      <Mail size={15} className="text-slate-500" />
                      {branch.email}
                    </p>
                    <p className="mt-1.5 flex items-center gap-2 text-sm text-slate-600">
                      <Phone size={15} className="text-slate-500" />
                      {branch.phone}
                    </p>
                  </td>

                  <td className="px-5 py-5">
                    <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                      <MapPin size={15} className="text-slate-500" />
                      {branch.address}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500 pl-5">
                      {branch.city}, {branch.state}
                    </p>
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {branch.country}
                  </td>

                  <td className="px-5">
                    <StatusBadge status={branch.status} />
                  </td>

                  <td className="px-5">
                    <ActionMenu
                      isOpen={actionMenuId === branch.id}
                      onToggle={() =>
                        setActionMenuId(
                          actionMenuId === branch.id ? null : branch.id,
                        )
                      }
                      onClose={() => setActionMenuId(null)}
                    >
                      <ActionButton onClick={() => openUpdateDrawer(branch)}>
                        <Edit3 size={16} />
                        Edit Branch
                      </ActionButton>

                      <ActionButton onClick={() => handleStatusChange(branch)}>
                        <CircleOff size={16} />
                        {branch.status === "active" ? "Deactivate" : "Activate"}
                      </ActionButton>

                      <div className="my-1 border-t border-slate-100" />

                      <button
                        type="button"
                        onClick={() => {
                          setBranchToDelete(branch);
                          setActionMenuId(null);
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-red-600 hover:bg-red-50 text-sm font-semibold transition"
                      >
                        <Trash2 size={16} />
                        Delete Branch
                      </button>
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
              ? `Showing ${meta.from ?? 0}-${meta.to ?? 0} of ${meta.total ?? totalBranches} branches`
              : `Showing ${filteredBranches.length} branches`}
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

      {/* SHIELDED DRAWER */}
      <BranchFormDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        selectedBranch={selectedBranch}
        onSubmit={handleFormSubmit}
        submitting={submitting}
      />

      {/* SHIELDED DELETE MODAL */}
      {branchToDelete && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 size={24} />
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-900">
              Delete Branch?
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Are you sure you want to delete <b>{branchToDelete.name}</b>? This
              action cannot be undone.
            </p>

            <div className="mt-7 flex justify-end gap-3">
              <button
                onClick={() => setBranchToDelete(null)}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-xl bg-red-600 px-5 py-3 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* Helper Components with Higher Text Visibility */
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
