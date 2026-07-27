"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  UserCog,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  createAccountOfficerAction,
  deleteAccountOfficerAction,
  getAccountOfficersAction,
  updateAccountOfficerAction,
} from "@/actions/account-officer.action";
import ActionMenu from "@/components/ActionMenu";
import { handleApiError } from "@/lib/errors";
import AccountOfficerFormDrawer from "./AccountOfficerFormDrawer";

type AccountOfficer = Record<string, any>;
type Branch = Record<string, any>;
type User = Record<string, any>;
type AccountOfficerFormData = Record<string, any>;
type AccountOfficerMeta = Record<string, any> | null;

interface AccountOfficerManagementProps {
  initialOfficers?: AccountOfficer[];
  initialMeta?: AccountOfficerMeta;
  branches?: Branch[];
  users?: User[];
}

export default function AccountOfficerManagement({
  initialOfficers = [],
  initialMeta = null,
  branches = [],
  users = [],
}: AccountOfficerManagementProps) {
  const [officers, setOfficers] = useState<AccountOfficer[]>(initialOfficers);
  const [meta, setMeta] = useState<AccountOfficerMeta>(initialMeta);
  const [pageLoading, setPageLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState<AccountOfficer | null>(null);

  const [officerToDelete, setOfficerToDelete] = useState<AccountOfficer | null>(null);
  const [actionMenuId, setActionMenuId] = useState<any>(null);

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const totalOfficers = meta?.total ?? officers.length;
  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;

  const branchNameById = new Map<string, string>(
    branches.map((branch) => [String(branch.id), branch.name])
  );

  // Skips the debounce effect on mount, since officers are already
  // server-fetched for page 1 before this component renders.
  const isFirstRender = useRef(true);

  async function fetchPage(page: number, searchTerm: string = search) {
    setPageLoading(true);
    try {
      const result: any = await getAccountOfficersAction(page, searchTerm);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to load account officers.");
        return;
      }

      setOfficers(Array.isArray(result.data) ? result.data : []);
      setMeta(result.meta ?? null);
    } catch (error) {
      console.error("Failed to load account officers:", error);
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
      fetchPage(1, search);
    }, 400);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function openCreateDrawer() {
    setSelectedOfficer(null);
    setActionMenuId(null);
    setDrawerOpen(true);
  }

  function openUpdateDrawer(officer: AccountOfficer) {
    setSelectedOfficer(officer);
    setActionMenuId(null);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    if (submitting) return;
    setDrawerOpen(false);
    setSelectedOfficer(null);
  }

  async function handleFormSubmit(formData: AccountOfficerFormData) {
    setSubmitting(true);
    try {
      const payload = {
        branch_id: formData.branch_id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        gender: formData.gender,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
      };

      if (selectedOfficer) {
        const result: any = await updateAccountOfficerAction(selectedOfficer.id, payload);

        if (result?.status !== "success") {
          handleApiError(result, "Failed to update account officer.");
          return;
        }

        await fetchPage(currentPage);

        toast.success(result.message || "Account officer updated successfully.");
      } else {
        const result: any = await createAccountOfficerAction({
          ...payload,
          user_id: formData.user_id || null,
        });

        if (result?.status !== "success") {
          handleApiError(result, "Failed to create account officer.");
          return;
        }

        await fetchPage(1);

        toast.success(result.message || "Account officer created successfully.");
      }
      setDrawerOpen(false);
      setSelectedOfficer(null);
    } catch (error) {
      console.error("Failed to save account officer:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!officerToDelete) return;
    setDeleting(true);
    try {
      const result: any = await deleteAccountOfficerAction(officerToDelete.id);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to delete account officer.");
        return;
      }

      setOfficerToDelete(null);
      await fetchPage(currentPage);

      toast.success(result.message || "Account officer deleted successfully.");
    } catch (error) {
      console.error("Failed to delete account officer:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Account Officers
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Create and manage staff assigned to customer accounts
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateDrawer}
          className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#173673] px-5 text-sm font-semibold text-white transition hover:bg-[#10295c] shadow-sm"
        >
          <Plus size={18} />
          Add Account Officer
        </button>
      </div>

      {/* SUMMARY */}
      <section className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-3">
        <SummaryCard
          title="Total Account Officers"
          value={totalOfficers}
          description="All registered account officers"
          icon={<UserCog size={22} />}
          iconStyle="bg-[#29478f] text-white"
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
            placeholder="Search by name, email, phone or city..."
            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder-slate-500 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
          />
        </div>
      </section>

      {/* DATATABLE */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <Heading>Officer</Heading>
                <Heading>Contact</Heading>
                <Heading>Branch</Heading>
                <Heading>Location</Heading>
                <Heading>Status</Heading>
                <Heading>Actions</Heading>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {officers.map((officer) => (
                <tr
                  key={officer.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-5 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#29478f]">
                        <Briefcase size={21} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900">
                          {officer.first_name} {officer.last_name}
                        </p>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">
                          {officer.code || `AO-${officer.id}`}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-5">
                    <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                      <Mail size={15} className="text-slate-500" />
                      {officer.email}
                    </p>
                    <p className="mt-1.5 flex items-center gap-2 text-sm text-slate-600">
                      <Phone size={15} className="text-slate-500" />
                      {officer.phone}
                    </p>
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {officer.branch?.name ??
                      branchNameById.get(String(officer.branch_id)) ??
                      "—"}
                  </td>

                  <td className="px-5 py-5">
                    <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                      <MapPin size={15} className="text-slate-500" />
                      {officer.city}, {officer.state}
                    </p>
                  </td>

                  <td className="px-5">
                    <StatusBadge status={officer.status} />
                  </td>

                  <td className="px-5">
                    <ActionMenu
                      isOpen={actionMenuId === officer.id}
                      onToggle={() =>
                        setActionMenuId(
                          actionMenuId === officer.id ? null : officer.id
                        )
                      }
                      onClose={() => setActionMenuId(null)}
                    >
                      <ActionButton onClick={() => openUpdateDrawer(officer)}>
                        <Edit3 size={16} />
                        Edit Officer
                      </ActionButton>

                      <div className="my-1 border-t border-slate-100" />

                      <button
                        type="button"
                        onClick={() => {
                          setOfficerToDelete(officer);
                          setActionMenuId(null);
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-red-600 hover:bg-red-50 text-sm font-semibold transition"
                      >
                        <Trash2 size={16} />
                        Delete Officer
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
              ? `Showing ${meta.from ?? 0}-${meta.to ?? 0} of ${meta.total ?? totalOfficers} account officers`
              : `Showing ${officers.length} account officers`}
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
      <AccountOfficerFormDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        selectedOfficer={selectedOfficer}
        onSubmit={handleFormSubmit}
        submitting={submitting}
        branches={branches}
        users={users}
      />

      {/* SHIELDED DELETE MODAL */}
      {officerToDelete && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 size={24} />
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-900">
              Delete Account Officer?
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Are you sure you want to delete{" "}
              <b>
                {officerToDelete.first_name} {officerToDelete.last_name}
              </b>
              ? This action cannot be undone.
            </p>

            <div className="mt-7 flex justify-end gap-3">
              <button
                onClick={() => setOfficerToDelete(null)}
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
