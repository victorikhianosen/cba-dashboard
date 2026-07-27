"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  Eye,
  Plus,
  Search,
  ShieldQuestion,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  createRoleAction,
  deleteRoleAction,
  getRolesAction,
  updateRoleAction,
} from "@/actions/role.action";
import ActionMenu from "@/components/ActionMenu";
import { handleApiError } from "@/lib/errors";
import RoleFormDrawer from "./RoleFormDrawer";

type Role = Record<string, any>;
type RoleFormData = Record<string, any>;
type RoleMeta = Record<string, any> | null;

interface RoleManagementProps {
  initialRoles?: Role[];
  initialMeta?: RoleMeta;
}

export default function RoleManagement({
  initialRoles = [],
  initialMeta = null,
}: RoleManagementProps) {
  const router = useRouter();

  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [meta, setMeta] = useState<RoleMeta>(initialMeta);
  // Holds the statistics from the last *unfiltered* fetch so the summary
  // cards stay stable while a search is scoping the current result set.
  const [globalStats, setGlobalStats] = useState<Record<string, any> | null>(
    initialMeta?.statistics ?? null
  );
  const [pageLoading, setPageLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [actionMenuId, setActionMenuId] = useState<any>(null);

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const totalRoles = globalStats?.total_roles ?? roles.length;
  const totalUsersAssigned = globalStats?.total_users_assigned ?? 0;

  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;

  // Skips the debounce effect on mount, since roles are already
  // server-fetched for page 1 before this component renders.
  const isFirstRender = useRef(true);

  async function fetchPage(page: number, searchTerm: string = search) {
    setPageLoading(true);
    try {
      const result: any = await getRolesAction(page, searchTerm);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to load roles.");
        return;
      }

      setRoles(Array.isArray(result.data) ? result.data : []);
      setMeta(result.meta ?? null);

      if (!searchTerm.trim() && result.meta?.statistics) {
        setGlobalStats(result.meta.statistics);
      }
    } catch (error) {
      console.error("Failed to load roles:", error);
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
    setSelectedRole(null);
    setActionMenuId(null);
    setDrawerOpen(true);
  }

  function openUpdateDrawer(role: Role) {
    setSelectedRole(role);
    setActionMenuId(null);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    if (submitting) return;
    setDrawerOpen(false);
    setSelectedRole(null);
  }

  function viewRole(role: Role) {
    setActionMenuId(null);
    router.push(`/user-management/role/${role.id}`);
  }

  async function handleFormSubmit(formData: RoleFormData) {
    setSubmitting(true);
    try {
      if (selectedRole) {
        const result: any = await updateRoleAction(selectedRole.id, {
          name: formData.name,
        });

        if (result?.status !== "success") {
          handleApiError(result, "Failed to update role.");
          return;
        }

        await fetchPage(currentPage);

        toast.success(result.message || "Role updated successfully.");
      } else {
        const result: any = await createRoleAction({
          name: formData.name,
        });

        if (result?.status !== "success") {
          handleApiError(result, "Failed to create role.");
          return;
        }

        await fetchPage(1);

        toast.success(result.message || "Role created successfully.");
      }
      setDrawerOpen(false);
      setSelectedRole(null);
    } catch (error) {
      console.error("Failed to save role:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!roleToDelete) return;
    setDeleting(true);
    try {
      const result: any = await deleteRoleAction(roleToDelete.id);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to delete role.");
        return;
      }

      setRoleToDelete(null);
      await fetchPage(currentPage);

      toast.success(result.message || "Role deleted successfully.");
    } catch (error) {
      console.error("Failed to delete role:", error);
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
            Roles
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Create roles and manage the permissions assigned to them
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateDrawer}
          className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#173673] px-5 text-sm font-semibold text-white transition hover:bg-[#10295c] shadow-sm"
        >
          <Plus size={18} />
          Add Role
        </button>
      </div>

      {/* SUMMARY */}
      <section className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2">
        <SummaryCard
          title="Total Roles"
          value={totalRoles}
          description="All registered roles"
          icon={<ShieldQuestion size={22} />}
          iconStyle="bg-[#29478f] text-white"
        />

        <SummaryCard
          title="Users Assigned"
          value={totalUsersAssigned}
          description="Users currently holding a role"
          icon={<Users size={22} />}
          iconStyle="bg-emerald-100 text-emerald-800"
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
            placeholder="Search by role name..."
            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder-slate-500 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
          />
        </div>
      </section>

      {/* DATATABLE */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <Heading>Role</Heading>
                <Heading>Permissions</Heading>
                <Heading>Created</Heading>
                <Heading>Actions</Heading>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {roles.map((role) => (
                <tr
                  key={role.id}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  onClick={() => viewRole(role)}
                >
                  <td className="px-5 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#29478f]">
                        <ShieldQuestion size={21} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900">
                          {formatRoleName(role.name)}
                        </p>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">
                          ID: {role.id}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {Array.isArray(role.permissions) ? role.permissions.length : 0}{" "}
                    assigned
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {role.created_at
                      ? new Date(role.created_at).toLocaleDateString()
                      : "—"}
                  </td>

                  <td className="px-5" onClick={(event) => event.stopPropagation()}>
                    <ActionMenu
                      isOpen={actionMenuId === role.id}
                      onToggle={() =>
                        setActionMenuId(actionMenuId === role.id ? null : role.id)
                      }
                      onClose={() => setActionMenuId(null)}
                      widthClassName="w-56"
                    >
                      <ActionButton onClick={() => viewRole(role)}>
                        <Eye size={16} />
                        View &amp; Assign Permissions
                      </ActionButton>

                      <ActionButton onClick={() => openUpdateDrawer(role)}>
                        <Edit3 size={16} />
                        Edit Role
                      </ActionButton>

                      <div className="my-1 border-t border-slate-100" />

                      <button
                        type="button"
                        onClick={() => {
                          setRoleToDelete(role);
                          setActionMenuId(null);
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-red-600 hover:bg-red-50 text-sm font-semibold transition"
                      >
                        <Trash2 size={16} />
                        Delete Role
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
              ? `Showing ${meta.from ?? 0}-${meta.to ?? 0} of ${meta.total ?? totalRoles} roles`
              : `Showing ${roles.length} roles`}
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
      <RoleFormDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        selectedRole={selectedRole}
        onSubmit={handleFormSubmit}
        submitting={submitting}
      />

      {/* SHIELDED DELETE MODAL */}
      {roleToDelete && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 size={24} />
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-900">
              Delete Role?
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Are you sure you want to delete{" "}
              <b>{formatRoleName(roleToDelete.name)}</b>? This action cannot be
              undone.
            </p>

            <div className="mt-7 flex justify-end gap-3">
              <button
                onClick={() => setRoleToDelete(null)}
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

// Turns "branch_manager" into "Branch Manager" for display.
export function formatRoleName(name: string) {
  return (name ?? "")
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
