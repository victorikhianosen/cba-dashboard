"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Eye, Search } from "lucide-react";
import { getVirtualAccountsAction } from "@/actions/virtual-account.action";
import ActionMenu from "@/components/ActionMenu";
import ExportDropdown from "@/components/ExportDropdown";
import { handleApiError } from "@/lib/errors";

type VirtualAccount = Record<string, any>;
type Meta = Record<string, any> | null;

interface VirtualAccountManagementProps {
  initialVirtualAccounts: VirtualAccount[];
  initialMeta: Meta;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-slate-100 text-slate-600 border-slate-200",
  dormant: "bg-slate-100 text-slate-600 border-slate-200",
  frozen: "bg-blue-50 text-blue-700 border-blue-200",
  restricted: "bg-orange-50 text-orange-700 border-orange-200",
  blocked: "bg-red-50 text-red-700 border-red-200",
  closed: "bg-slate-100 text-slate-600 border-slate-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
  deceased_hold: "bg-slate-100 text-slate-600 border-slate-200",
  escheated: "bg-slate-100 text-slate-600 border-slate-200",
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${style}`}>
      {status?.replace(/_/g, " ")}
    </span>
  );
}

export default function VirtualAccountManagement({
  initialVirtualAccounts,
  initialMeta,
}: VirtualAccountManagementProps) {
  const router = useRouter();

  const [virtualAccounts, setVirtualAccounts] = useState<VirtualAccount[]>(initialVirtualAccounts);
  const [meta, setMeta] = useState<Meta>(initialMeta);
  const [pageLoading, setPageLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [actionMenuId, setActionMenuId] = useState<number | string | null>(null);

  const isFirstRender = useRef(true);

  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;

  async function fetchPage(page: number) {
    setPageLoading(true);
    const result: any = await getVirtualAccountsAction(page, { search });

    if (result?.status !== "success") {
      handleApiError(result, "Failed to load virtual accounts.");
      setPageLoading(false);
      return;
    }

    setVirtualAccounts(Array.isArray(result.data) ? result.data : []);
    setMeta(result.meta ?? null);

    setPageLoading(false);
  }

  function goToPage(page: number) {
    if (page < 1 || page > lastPage || page === currentPage || pageLoading) return;
    fetchPage(page);
  }

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timeout = setTimeout(() => fetchPage(1), 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Virtual Accounts</h1>
          <p className="mt-1 text-sm text-slate-600">
            Dedicated virtual accounts issued to customers, mapped to a parent settlement account.
          </p>
        </div>
      </div>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:flex-wrap md:items-center">
          <div className="relative flex-1 md:min-w-50">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by account number or beneficiary name..."
              className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder-slate-500 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
            />
          </div>

          <ExportDropdown baseEndpoint="/admin/virtual-accounts" params={{ search }} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-250">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Account Number
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Beneficiary Name
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Customer
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Parent Account
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Status
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Created At
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {virtualAccounts.map((va) => (
                <tr
                  key={va.id}
                  onClick={() => router.push(`/customer-management/virtual-accounts/${va.id}`)}
                  className="cursor-pointer hover:bg-slate-50/80"
                >
                  <td className="px-5 py-4 text-sm font-semibold text-slate-800">{va.account_number}</td>
                  <td className="px-5 py-4 text-sm text-slate-700">{va.account_name}</td>
                  <td className="px-5 py-4 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">{va.customer?.full_name ?? "—"}</p>
                    {va.customer?.cif_number && (
                      <p className="text-xs text-slate-500">{va.customer.cif_number}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-700">
                    {va.parent_account?.account_number ?? "—"}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={va.status} />
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-700">
                    {va.created_at ? new Date(va.created_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-5 py-4" onClick={(event) => event.stopPropagation()}>
                    <ActionMenu
                      isOpen={actionMenuId === va.id}
                      onToggle={() => setActionMenuId(actionMenuId === va.id ? null : va.id)}
                      onClose={() => setActionMenuId(null)}
                    >
                      <MenuButton
                        onClick={() => {
                          setActionMenuId(null);
                          router.push(`/customer-management/virtual-accounts/${va.id}`);
                        }}
                      >
                        <Eye size={16} />
                        View
                      </MenuButton>
                    </ActionMenu>
                  </td>
                </tr>
              ))}

              {!pageLoading && virtualAccounts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-sm font-medium text-slate-500">
                    No virtual accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 p-5 bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-slate-600">
            {meta
              ? `Showing ${meta.from ?? 0}-${meta.to ?? 0} of ${meta.total ?? 0} virtual accounts`
              : `Showing ${virtualAccounts.length} virtual accounts`}
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
