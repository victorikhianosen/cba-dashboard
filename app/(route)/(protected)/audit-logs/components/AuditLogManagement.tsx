"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  FileClock,
  Search,
} from "lucide-react";
import { toast } from "react-toastify";
import { getAuditTrailsAction } from "@/actions/audit.action";
import { handleApiError } from "@/lib/errors";

type AuditLog = Record<string, any>;
type AuditLogMeta = Record<string, any> | null;

interface AuditLogManagementProps {
  initialLogs?: AuditLog[];
  initialMeta?: AuditLogMeta;
}

export default function AuditLogManagement({
  initialLogs = [],
  initialMeta = null,
}: AuditLogManagementProps) {
  const router = useRouter();

  const [logs, setLogs] = useState<AuditLog[]>(initialLogs);
  const [meta, setMeta] = useState<AuditLogMeta>(initialMeta);
  const [pageLoading, setPageLoading] = useState(false);

  const [search, setSearch] = useState("");

  const totalLogs = meta?.total ?? logs.length;
  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;

  // Skips the debounce effect on mount, since logs are already
  // server-fetched for page 1 before this component renders.
  const isFirstRender = useRef(true);

  async function fetchPage(page: number, searchTerm: string = search) {
    setPageLoading(true);
    try {
      const result: any = await getAuditTrailsAction(page, searchTerm);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to load audit logs.");
        return;
      }

      setLogs(Array.isArray(result.data) ? result.data : []);
      setMeta(result.meta ?? null);
    } catch (error) {
      console.error("Failed to load audit logs:", error);
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

  function viewLog(log: AuditLog) {
    router.push(`/audit-logs/${log.id}`);
  }

  return (
    <>
      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Audit Logs
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Review all activity recorded across the platform
          </p>
        </div>
      </div>

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
            placeholder="Search by description, module, action or user..."
            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder-slate-500 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
          />
        </div>
      </section>

      {/* DATATABLE */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <Heading>Description</Heading>
                <Heading>Module</Heading>
                <Heading>Action</Heading>
                <Heading>Performed By</Heading>
                <Heading>Date</Heading>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => viewLog(log)}
                  className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-5 py-5">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#29478f]">
                        <FileClock size={17} />
                      </div>
                      <p className="text-sm font-medium text-slate-800 max-w-md">
                        {log.description}
                      </p>
                    </div>
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800 capitalize">
                    {log.module?.replace(/_/g, " ") ?? "—"}
                  </td>

                  <td className="px-5">
                    <ActionBadge action={log.action} />
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {log.performed_by_name ?? "System"}
                    <p className="mt-0.5 text-xs font-semibold text-slate-500 capitalize">
                      {log.performed_by_type ?? ""}
                    </p>
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {log.created_at
                      ? new Date(log.created_at).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}

              {logs.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-16 text-center text-sm font-medium text-slate-500"
                  >
                    No audit logs found.
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
              ? `Showing ${meta.from ?? 0}-${meta.to ?? 0} of ${meta.total ?? totalLogs} logs`
              : `Showing ${logs.length} logs`}
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
    </>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return (
    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
      {children}
    </th>
  );
}

// Turns "two_factor_challenge_issued" into "Two Factor Challenge Issued".
function formatActionLabel(action: string) {
  return (action ?? "")
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function ActionBadge({ action }: Record<string, any>) {
  const styles: Record<string, string> = {
    created: "bg-green-100 text-green-800 border border-green-300",
    updated: "bg-amber-100 text-amber-800 border border-amber-300",
    status_updated: "bg-amber-100 text-amber-800 border border-amber-300",
    deleted: "bg-red-100 text-red-800 border border-red-300",
    login: "bg-blue-100 text-blue-800 border border-blue-300",
    logout: "bg-slate-100 text-slate-700 border border-slate-300",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
        styles[action] || "bg-slate-100 text-slate-700 border border-slate-300"
      }`}
    >
      {action ? formatActionLabel(action) : "—"}
    </span>
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
