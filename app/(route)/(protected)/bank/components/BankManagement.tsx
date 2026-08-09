"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Landmark,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  createBankAction,
  deleteBankAction,
  getBanksAction,
  updateBankAction,
} from "@/actions/bank.action";
import ActionMenu from "@/components/ActionMenu";
import { handleApiError } from "@/lib/errors";
import BankFormDrawer from "./BankFormDrawer";

type Bank = Record<string, any>;
type BankMeta = Record<string, any> | null;

interface BankManagementProps {
  initialBanks?: Bank[];
  initialMeta?: BankMeta;
}

export default function BankManagement({
  initialBanks = [],
  initialMeta = null,
}: BankManagementProps) {
  const [banks, setBanks] = useState<Bank[]>(initialBanks);
  const [meta, setMeta] = useState<BankMeta>(initialMeta);
  const [pageLoading, setPageLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);

  const [bankToDelete, setBankToDelete] = useState<Bank | null>(null);
  const [actionMenuId, setActionMenuId] = useState<any>(null);

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const totalBanks = meta?.total ?? banks.length;
  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;

  // Skips the debounce effect on mount, since banks are already
  // server-fetched for page 1 before this component renders.
  const isFirstRender = useRef(true);

  async function fetchPage(page: number, searchTerm: string = search) {
    setPageLoading(true);
    const result: any = await getBanksAction(page, searchTerm);

    if (result?.status !== "success") {
      handleApiError(result, "Failed to load banks.");
      setPageLoading(false);
      return;
    }

    setBanks(Array.isArray(result.data) ? result.data : []);
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

  function openCreateDrawer() {
    setSelectedBank(null);
    setActionMenuId(null);
    setDrawerOpen(true);
  }

  function openUpdateDrawer(bank: Bank) {
    setSelectedBank(bank);
    setActionMenuId(null);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    if (submitting) return;
    setDrawerOpen(false);
    setSelectedBank(null);
  }

  async function handleFormSubmit(formData: FormData) {
    setSubmitting(true);
    if (selectedBank) {
      const result: any = await updateBankAction(selectedBank.id, formData);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to update bank.");
        setSubmitting(false);
        return;
      }

      await fetchPage(currentPage);

      toast.success(result.message || "Bank updated successfully.");
    } else {
      const result: any = await createBankAction(formData);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to create bank.");
        setSubmitting(false);
        return;
      }

      await fetchPage(1);

      toast.success(result.message || "Bank created successfully.");
    }
    setDrawerOpen(false);
    setSelectedBank(null);

    setSubmitting(false);
  }

  async function handleDelete() {
    if (!bankToDelete) return;
    setDeleting(true);
    const result: any = await deleteBankAction(bankToDelete.id);

    if (result?.status !== "success") {
      handleApiError(result, "Failed to delete bank.");
      setDeleting(false);
      return;
    }

    setBankToDelete(null);
    await fetchPage(currentPage);

    toast.success(result.message || "Bank deleted successfully.");

    setDeleting(false);
  }

  return (
    <>
      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Banks
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage the banks available for transfers and payouts
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateDrawer}
          className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#173673] px-5 text-sm font-semibold text-white transition hover:bg-[#10295c] shadow-sm"
        >
          <Plus size={18} />
          Add Bank
        </button>
      </div>

      {/* SUMMARY */}
      <section className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-3">
        <SummaryCard
          title="Total Banks"
          value={totalBanks}
          description="All registered banks"
          icon={<Landmark size={22} />}
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
            placeholder="Search by bank name or code..."
            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder-slate-500 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
          />
        </div>
      </section>

      {/* DATATABLE */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <Heading>Bank</Heading>
                <Heading>Bank Code</Heading>
                <Heading>Short Code</Heading>
                <Heading>Actions</Heading>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {banks.map((bank) => (
                <tr
                  key={bank.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-5 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        {bank.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={bank.logo}
                            alt={bank.bank_name}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <Banknote size={20} className="text-slate-400" />
                        )}
                      </div>
                      <p className="font-bold text-sm text-slate-900">
                        {bank.bank_name}
                      </p>
                    </div>
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {bank.bank_code}
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {bank.short_code}
                  </td>

                  <td className="px-5">
                    <ActionMenu
                      isOpen={actionMenuId === bank.id}
                      onToggle={() =>
                        setActionMenuId(
                          actionMenuId === bank.id ? null : bank.id,
                        )
                      }
                      onClose={() => setActionMenuId(null)}
                    >
                      <ActionButton onClick={() => openUpdateDrawer(bank)}>
                        <Edit3 size={16} />
                        Edit Bank
                      </ActionButton>

                      <div className="my-1 border-t border-slate-100" />

                      <button
                        type="button"
                        onClick={() => {
                          setBankToDelete(bank);
                          setActionMenuId(null);
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-red-600 hover:bg-red-50 text-sm font-semibold transition"
                      >
                        <Trash2 size={16} />
                        Delete Bank
                      </button>
                    </ActionMenu>
                  </td>
                </tr>
              ))}

              {banks.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-16 text-center text-sm font-medium text-slate-500"
                  >
                    No banks found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex flex-col gap-3 border-t border-slate-200 p-5 bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-600">
            {meta
              ? `Showing ${meta.from ?? 0}-${meta.to ?? 0} of ${meta.total ?? totalBanks} banks`
              : `Showing ${banks.length} banks`}
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
      <BankFormDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        selectedBank={selectedBank}
        onSubmit={handleFormSubmit}
        submitting={submitting}
      />

      {/* SHIELDED DELETE MODAL */}
      {bankToDelete && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 size={24} />
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-900">
              Delete Bank?
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Are you sure you want to delete <b>{bankToDelete.bank_name}</b>?
              This action cannot be undone.
            </p>

            <div className="mt-7 flex justify-end gap-3">
              <button
                onClick={() => setBankToDelete(null)}
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
