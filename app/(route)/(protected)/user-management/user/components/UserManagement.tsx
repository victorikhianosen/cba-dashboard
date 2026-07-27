"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleOff,
  Clock3,
  Edit3,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
  UserRound,
} from "lucide-react";
import { toast } from "react-toastify";
import { getUsersAction, updateUserStatusAction } from "@/actions/user.action";
import ActionMenu from "@/components/ActionMenu";
import { handleApiError } from "@/lib/errors";

type User = Record<string, any>;
type Branch = Record<string, any>;
type UserMeta = Record<string, any> | null;

interface UserManagementProps {
  initialUsers?: User[];
  initialMeta?: UserMeta;
  branches?: Branch[];
}

export default function UserManagement({
  initialUsers = [],
  initialMeta = null,
  branches = [],
}: UserManagementProps) {
  const router = useRouter();

  const [users, setUsers] = useState<User[]>(initialUsers);
  const [meta, setMeta] = useState<UserMeta>(initialMeta);
  const [pageLoading, setPageLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [actionMenuId, setActionMenuId] = useState<any>(null);

  const [deleting, setDeleting] = useState(false);

  const stats = meta?.statistics;

  // Counts - prefer server-wide statistics, fall back to the current page
  const totalUsers = stats?.total_users ?? meta?.total ?? users.length;
  const activeUsers =
    stats?.total_active ?? users.filter((u) => u.status === "active").length;
  const pendingUsers =
    stats?.total_pending ?? users.filter((u) => u.status === "pending").length;
  const inactiveUsers =
    stats?.total_inactive ?? users.filter((u) => u.status === "inactive").length;

  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;

  async function fetchPage(page: number) {
    setPageLoading(true);
    try {
      const result: any = await getUsersAction(page);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to load users.");
        return;
      }

      setUsers(Array.isArray(result.data) ? result.data : []);
      setMeta(result.meta ?? null);
    } catch (error) {
      console.error("Failed to load users:", error);
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

  const branchNameById = useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach((branch) => map.set(String(branch.id), branch.name));
    return map;
  }, [branches]);

  // Search and Filter Logic
  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return users.filter((user) => {
      const searchableData = [
        user.first_name,
        user.last_name,
        user.username,
        user.email,
        user.phone,
        user.staff_code,
        user.code,
        user.city,
        user.state,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableData.includes(keyword);
      const matchesStatus =
        statusFilter === "all" || user.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [users, search, statusFilter]);

  async function handleStatusChange(user: User) {
    const newStatus = user.status === "active" ? "inactive" : "active";
    setActionMenuId(null);

    try {
      const result: any = await updateUserStatusAction(user.id, newStatus);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to update user status.");
        return;
      }

      await fetchPage(currentPage);

      toast.success(result.message || "User status updated successfully.");
    } catch (error) {
      console.error("Failed to update user status:", error);
      toast.error("A network error occurred. Please try again.");
    }
  }

  async function handleDelete() {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setUsers((current) =>
        current.filter((user) => user.id !== userToDelete.id)
      );
      setUserToDelete(null);
    } catch (error) {
      console.error(error);
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
            Users
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Create and manage all BankPro staff users
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/user-management/user/create")}
          className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#173673] px-5 text-sm font-semibold text-white transition hover:bg-[#10295c] shadow-sm"
        >
          <Plus size={18} />
          Add User
        </button>
      </div>

      {/* SUMMARY */}
      <section className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Users"
          value={totalUsers}
          description="All registered users"
          icon={<Users size={22} />}
          iconStyle="bg-[#29478f] text-white"
        />

        <SummaryCard
          title="Active Users"
          value={activeUsers}
          description="Currently active users"
          icon={<CheckCircle2 size={22} />}
          iconStyle="bg-emerald-100 text-emerald-800"
        />

        <SummaryCard
          title="Pending Users"
          value={pendingUsers}
          description="Awaiting activation"
          icon={<Clock3 size={22} />}
          iconStyle="bg-amber-100 text-amber-800"
        />

        <SummaryCard
          title="Inactive Users"
          value={inactiveUsers}
          description="Currently inactive users"
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
            placeholder="Search by name, username, email, phone or staff code..."
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
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
        </select>
      </section>

      {/* DATATABLE */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <Heading>Staff</Heading>
                <Heading>Contact</Heading>
                <Heading>Branch</Heading>
                <Heading>Location</Heading>
                <Heading>Status</Heading>
                <Heading>Actions</Heading>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                  onClick={() => router.push(`/user-management/user/${user.id}`)}
                >
                  <td className="px-5 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#29478f]">
                        <UserRound size={21} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">
                          {user.code || `USR-${user.id}`} • {user.username}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-5">
                    <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                      <Mail size={15} className="text-slate-500" />
                      {user.email}
                    </p>
                    <p className="mt-1.5 flex items-center gap-2 text-sm text-slate-600">
                      <Phone size={15} className="text-slate-500" />
                      {user.phone}
                    </p>
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {branchNameById.get(String(user.branch_id)) ?? "—"}
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {user.staff_code}
                    </p>
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-800">
                    {user.city}, {user.state}
                  </td>

                  <td className="px-5">
                    <StatusBadge status={user.status} />
                  </td>

                  <td className="px-5" onClick={(event) => event.stopPropagation()}>
                    <ActionMenu
                      isOpen={actionMenuId === user.id}
                      onToggle={() =>
                        setActionMenuId(
                          actionMenuId === user.id ? null : user.id
                        )
                      }
                      onClose={() => setActionMenuId(null)}
                    >
                      <ActionButton
                        onClick={() =>
                          router.push(`/user-management/user/${user.id}`)
                        }
                      >
                        <Edit3 size={16} />
                        Edit User
                      </ActionButton>

                      <ActionButton onClick={() => handleStatusChange(user)}>
                        <CircleOff size={16} />
                        {user.status === "active" ? "Deactivate" : "Activate"}
                      </ActionButton>

                      <div className="my-1 border-t border-slate-100" />

                      <button
                        type="button"
                        onClick={() => {
                          setUserToDelete(user);
                          setActionMenuId(null);
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-red-600 hover:bg-red-50 text-sm font-semibold transition"
                      >
                        <Trash2 size={16} />
                        Delete User
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
              ? `Showing ${meta.from ?? 0}-${meta.to ?? 0} of ${meta.total ?? totalUsers} users`
              : `Showing ${filteredUsers.length} users`}
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

      {/* SHIELDED DELETE MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 size={24} />
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-900">
              Delete User?
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Are you sure you want to delete <b>{userToDelete.first_name} {userToDelete.last_name}</b>? This action cannot be undone.
            </p>

            <div className="mt-7 flex justify-end gap-3">
              <button
                onClick={() => setUserToDelete(null)}
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
