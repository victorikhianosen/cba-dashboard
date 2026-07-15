"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleOff,
  Edit3,
  KeyRound,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  createPermissionAction,
  getPermissionsAction,
  updatePermissionAction,
} from "@/actions/permission.action";
import { handleApiError } from "@/lib/errors";
import PermissionFormDrawer from "./PermissionFormDrawer";

type Permission = Record<string, any>;
type PermissionFormData = Record<string, any>;
type PermissionMeta = Record<string, any> | null;

interface PermissionManagementProps {
  initialPermissions?: Permission[];
  initialMeta?: PermissionMeta;
}

export default function PermissionManagement({
  initialPermissions = [],
  initialMeta = null,
}: PermissionManagementProps) {
  const [permissions, setPermissions] = useState<Permission[]>(initialPermissions);
  const [meta, setMeta] = useState<PermissionMeta>(initialMeta);
  // Holds the summary from the last *unfiltered* fetch, since the backend
  // scopes `meta.summary.total_permissions` to the current search term but
  // the cards should always reflect the whole dataset, not the search result.
  const [globalSummary, setGlobalSummary] = useState<Record<string, any> | null>(
    initialMeta?.summary ?? null
  );
  const [pageLoading, setPageLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [actionMenuId, setActionMenuId] = useState<any>(null);

  const [submitting, setSubmitting] = useState(false);

  const totalPermissions = globalSummary?.total_permissions ?? permissions.length;
  const assignedPermissions = globalSummary?.total_assigned ?? 0;
  const unassignedPermissions = globalSummary?.total_unassigned ?? 0;

  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;

  // Skips the debounce effect on mount, since permissions are already
  // server-fetched for page 1 before this component renders.
  const isFirstRender = useRef(true);

  async function fetchPage(page: number, searchTerm: string = search) {
    setPageLoading(true);
    try {
      const result: any = await getPermissionsAction(page, searchTerm);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to load permissions.");
        return;
      }

      setPermissions(Array.isArray(result.data) ? result.data : []);
      setMeta(result.meta ?? null);

      if (!searchTerm.trim() && result.meta?.summary) {
        setGlobalSummary(result.meta.summary);
      }
    } catch (error) {
      console.error("Failed to load permissions:", error);
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

  // Debounced server-side search: wait 3 seconds after the user stops
  // typing, then re-fetch page 1 from the backend with the search term.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timeout = setTimeout(() => {
      fetchPage(1, search);
    }, 3000);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function openCreateDrawer() {
    setSelectedPermission(null);
    setActionMenuId(null);
    setDrawerOpen(true);
  }

  function openUpdateDrawer(permission: Permission) {
    setSelectedPermission(permission);
    setActionMenuId(null);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    if (submitting) return;
    setDrawerOpen(false);
    setSelectedPermission(null);
  }

  async function handleFormSubmit(formData: PermissionFormData) {
    setSubmitting(true);
    try {
      if (selectedPermission) {
        const result: any = await updatePermissionAction(selectedPermission.id, {
          name: formData.name,
        });

        if (result?.status !== "success") {
          handleApiError(result, "Failed to update permission.");
          return;
        }

        await fetchPage(currentPage);

        toast.success(result.message || "Permission updated successfully.");
      } else {
        const result: any = await createPermissionAction({
          name: formData.name,
        });

        if (result?.status !== "success") {
          handleApiError(result, "Failed to create permission.");
          return;
        }

        await fetchPage(1);

        toast.success(result.message || "Permission created successfully.");
      }
      setDrawerOpen(false);
      setSelectedPermission(null);
    } catch (error) {
      console.error("Failed to save permission:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Permissions
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Create and manage permissions assignable to roles
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateDrawer}
          className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#173673] px-5 text-sm font-semibold text-white transition hover:bg-[#10295c] shadow-sm"
        >
          <Plus size={18} />
          Add Permission
        </button>
      </div>

      {/* SUMMARY */}
      <section className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          title="Total Permissions"
          value={totalPermissions}
          description="All registered permissions"
          icon={<ShieldCheck size={22} />}
          iconStyle="bg-[#29478f] text-white"
        />

        <SummaryCard
          title="Assigned Permissions"
          value={assignedPermissions}
          description="Currently assigned to roles"
          icon={<CheckCircle2 size={22} />}
          iconStyle="bg-emerald-100 text-emerald-800"
        />

        <SummaryCard
          title="Unassigned Permissions"
          value={unassignedPermissions}
          description="Not yet assigned to any role"
          icon={<CircleOff size={22} />}
          iconStyle="bg-red-100 text-red-800"
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
            placeholder="Search by permission name..."
            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder-slate-500 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
          />
        </div>
      </section>

      {/* DATATABLE */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <Heading>Permission</Heading>
                <Heading>Created</Heading>
                <Heading>Actions</Heading>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {permissions.map((permission) => (
                <tr
                  key={permission.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="px-5 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#29478f]">
                        <KeyRound size={21} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900">{formatPermissionName(permission.name)}</p>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">ID: {permission.id}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {permission.created_at
                      ? new Date(permission.created_at).toLocaleDateString()
                      : "—"}
                  </td>

                  <td className="relative px-5">
                    <button
                      type="button"
                      className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                      onClick={() =>
                        setActionMenuId(
                          actionMenuId === permission.id ? null : permission.id
                        )
                      }
                    >
                      <MoreHorizontal size={18} />
                    </button>

                    {actionMenuId === permission.id && (
                      <div className="absolute right-10 top-10 z-20 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                        <ActionButton onClick={() => openUpdateDrawer(permission)}>
                          <Edit3 size={16} />
                          Edit Permission
                        </ActionButton>
                      </div>
                    )}
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
              ? `Showing ${meta.from ?? 0}-${meta.to ?? 0} of ${meta.total ?? totalPermissions} permissions`
              : `Showing ${permissions.length} permissions`}
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
      <PermissionFormDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        selectedPermission={selectedPermission}
        onSubmit={handleFormSubmit}
        submitting={submitting}
      />
    </>
  );
}

// Turns "update_user" into "Update User" for display.
function formatPermissionName(name: string) {
  return name
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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
