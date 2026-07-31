"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Footprints, Search } from "lucide-react";
import { toast } from "react-toastify";
import { getUserJourneySessionsAction } from "@/actions/journey.action";
import { handleApiError } from "@/lib/errors";

type JourneySession = Record<string, any>;
type JourneyMeta = Record<string, any> | null;

interface UserJourneyManagementProps {
  initialSessions?: JourneySession[];
  initialMeta?: JourneyMeta;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

// Rough human duration between two timestamps, e.g. "12m", "1h 03m".
function duration(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";

  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;

  return hours > 0 ? `${hours}h ${String(remMinutes).padStart(2, "0")}m` : `${minutes}m`;
}

export default function UserJourneyManagement({
  initialSessions = [],
  initialMeta = null,
}: UserJourneyManagementProps) {
  const router = useRouter();

  const [sessions, setSessions] = useState<JourneySession[]>(initialSessions);
  const [meta, setMeta] = useState<JourneyMeta>(initialMeta);
  const [pageLoading, setPageLoading] = useState(false);

  const [search, setSearch] = useState("");

  const totalSessions = meta?.total ?? sessions.length;
  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;

  const isFirstRender = useRef(true);

  async function fetchPage(page: number, searchTerm: string = search) {
    setPageLoading(true);
    try {
      const result: any = await getUserJourneySessionsAction(page, searchTerm);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to load user journeys.");
        return;
      }

      setSessions(Array.isArray(result.data) ? result.data : []);
      setMeta(result.meta ?? null);
    } catch (error) {
      console.error("Failed to load user journeys:", error);
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

  function viewSession(session: JourneySession) {
    router.push(`/audit/user-journeys/${session.session_id}`);
  }

  return (
    <>
      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Journeys</h1>
          <p className="mt-1 text-sm text-slate-600">
            Every login session and the complete timeline of activity within it
          </p>
        </div>
      </div>

      {/* SEARCH */}
      <section className="mt-7 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by user..."
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
                <Heading>User</Heading>
                <Heading>Started</Heading>
                <Heading>Ended</Heading>
                <Heading>Duration</Heading>
                <Heading>Events</Heading>
                <Heading>IP</Heading>
                <Heading>Status</Heading>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {sessions.map((session) => (
                <tr
                  key={session.session_id}
                  onClick={() => viewSession(session)}
                  className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-5 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#29478f]">
                        <Footprints size={17} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {session.performed_by_name ?? "—"}
                        </p>
                        <p className="text-xs font-semibold text-slate-500">
                          Session #{session.session_id}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {formatDateTime(session.started_at)}
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {formatDateTime(session.ended_at)}
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {duration(session.started_at, session.ended_at ?? session.last_activity_at)}
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {session.event_count ?? "—"}
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">{session.ip ?? "—"}</td>

                  <td className="px-5">
                    <SessionStatusBadge session={session} />
                  </td>
                </tr>
              ))}

              {sessions.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-16 text-center text-sm font-medium text-slate-500"
                  >
                    No user journeys found.
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
              ? `Showing ${meta.from ?? 0}-${meta.to ?? 0} of ${meta.total ?? totalSessions} sessions`
              : `Showing ${sessions.length} sessions`}
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

function SessionStatusBadge({ session }: { session: JourneySession }) {
  if (!session.ended_at) {
    return (
      <span className="inline-flex rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
        Active
      </span>
    );
  }

  if (session.timed_out) {
    return (
      <span className="inline-flex rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
        Timed Out
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
      Logged Out
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
