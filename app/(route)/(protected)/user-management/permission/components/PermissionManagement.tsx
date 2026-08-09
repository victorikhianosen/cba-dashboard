"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CircleOff,
  Edit3,
  KeyRound,
  Layers,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  createPermissionAction,
  getAllPermissionsAction,
  getPermissionsAction,
  updatePermissionAction,
} from "@/actions/permission.action";
import ActionMenu from "@/components/ActionMenu";
import { handleApiError } from "@/lib/errors";
import PermissionFormDrawer from "./PermissionFormDrawer";

type Permission = Record<string, any>;
type PermissionFormData = Record<string, any>;
type PermissionMeta = Record<string, any> | null;

interface PermissionGroup {
  key: string;
  label: string;
  permissions: Permission[];
}

interface PermissionManagementProps {
  initialPermissions?: Permission[];
  initialMeta?: PermissionMeta;
}

// Leading action word is stripped off a permission name so the remainder
// can be used as the resource it acts on, e.g. "delete_banks" -> "banks".
const ACTION_WORDS = [
  "view",
  "create",
  "update",
  "delete",
  "approve",
  "assign",
  "manage",
];

// Turns "update_user" into "Update User" for display.
function formatPermissionName(name: string) {
  return (name ?? "")
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function groupPermissions(permissions: Permission[]): PermissionGroup[] {
  const groups = new Map<string, Permission[]>();

  for (const permission of permissions) {
    const name: string = permission.name ?? "";
    const parts = name.split("_");
    const key =
      ACTION_WORDS.includes(parts[0]) && parts.length > 1
        ? parts.slice(1).join("_")
        : "general";

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(permission);
  }

  return Array.from(groups.entries())
    .map(([key, groupPermissions]) => ({
      key,
      label: key === "general" ? "General" : formatPermissionName(key),
      permissions: groupPermissions.sort((a, b) =>
        (a.name ?? "").localeCompare(b.name ?? ""),
      ),
    }))
    .sort((a, b) => {
      if (a.key === "general") return 1;
      if (b.key === "general") return -1;
      return a.label.localeCompare(b.label);
    });
}

export default function PermissionManagement({
  initialPermissions = [],
  initialMeta = null,
}: PermissionManagementProps) {
  const [permissions, setPermissions] =
    useState<Permission[]>(initialPermissions);
  const [globalSummary, setGlobalSummary] = useState<Record<
    string,
    any
  > | null>(initialMeta?.summary ?? null);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] =
    useState<Permission | null>(null);
  const [actionMenuId, setActionMenuId] = useState<any>(null);

  const [submitting, setSubmitting] = useState(false);

  const totalPermissions =
    globalSummary?.total_permissions ?? permissions.length;
  const assignedPermissions = globalSummary?.total_assigned ?? 0;
  const unassignedPermissions = globalSummary?.total_unassigned ?? 0;

  const groups = useMemo(() => groupPermissions(permissions), [permissions]);
  const selectedGroup = useMemo(
    () => groups.find((group) => group.key === selectedGroupKey) ?? null,
    [groups, selectedGroupKey],
  );

  const keyword = search.trim().toLowerCase();

  // Overview: a group surfaces if its own label matches, or any permission
  // inside it does, so searching "delete" can jump straight to "Banks".
  const filteredGroups = useMemo(() => {
    if (!keyword) return groups;

    return groups.filter(
      (group) =>
        group.label.toLowerCase().includes(keyword) ||
        group.permissions.some((permission) =>
          formatPermissionName(permission.name).toLowerCase().includes(keyword),
        ),
    );
  }, [groups, keyword]);

  // Detail: filters permissions within the currently opened group.
  const filteredGroupPermissions = useMemo(() => {
    if (!selectedGroup) return [];
    if (!keyword) return selectedGroup.permissions;

    return selectedGroup.permissions.filter((permission) =>
      formatPermissionName(permission.name).toLowerCase().includes(keyword),
    );
  }, [selectedGroup, keyword]);

  async function refreshPermissions() {
    setLoading(true);
    const [allResult, summaryResult]: any[] = await Promise.all([
      getAllPermissionsAction(),
      getPermissionsAction(1),
    ]);

    if (allResult?.status !== "success") {
      handleApiError(allResult, "Failed to load permissions.");
      return;
    }

    setPermissions(Array.isArray(allResult.data) ? allResult.data : []);

    if (summaryResult?.status === "success" && summaryResult.meta?.summary) {
      setGlobalSummary(summaryResult.meta.summary);
    }

    setLoading(false);
  }

  function openGroup(key: string) {
    setSelectedGroupKey(key);
    setSearch("");
    setActionMenuId(null);
  }

  function backToGroups() {
    setSelectedGroupKey(null);
    setSearch("");
    setActionMenuId(null);
  }

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
    if (selectedPermission) {
      const result: any = await updatePermissionAction(selectedPermission.id, {
        name: formData.name,
      });

      if (result?.status !== "success") {
        handleApiError(result, "Failed to update permission.");
        setSubmitting(false);
        return;
      }

      await refreshPermissions();

      toast.success(result.message || "Permission updated successfully.");
    } else {
      const result: any = await createPermissionAction({
        name: formData.name,
      });

      if (result?.status !== "success") {
        handleApiError(result, "Failed to create permission.");
        setSubmitting(false);
        return;
      }

      await refreshPermissions();

      toast.success(result.message || "Permission created successfully.");
    }
    setDrawerOpen(false);
    setSelectedPermission(null);

    setSubmitting(false);
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
            placeholder={
              selectedGroup
                ? `Search within ${selectedGroup.label}...`
                : "Search permissions or categories..."
            }
            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder-slate-500 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
          />
        </div>
      </section>

      {selectedGroup ? (
        <PermissionGroupDetail
          group={selectedGroup}
          permissions={filteredGroupPermissions}
          loading={loading}
          onBack={backToGroups}
          onEdit={openUpdateDrawer}
          actionMenuId={actionMenuId}
          setActionMenuId={setActionMenuId}
        />
      ) : (
        <PermissionGroupOverview
          groups={filteredGroups}
          onOpenGroup={openGroup}
        />
      )}

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

/* Overview: click a category card to drill into its permissions */
function PermissionGroupOverview({
  groups,
  onOpenGroup,
}: {
  groups: PermissionGroup[];
  onOpenGroup: (key: string) => void;
}) {
  if (groups.length === 0) {
    return (
      <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm font-medium text-slate-500">
        No permissions match your search.
      </div>
    );
  }

  return (
    <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => (
        <button
          key={group.key}
          type="button"
          onClick={() => onOpenGroup(group.key)}
          className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-[#29478f] hover:shadow-md"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#29478f]">
              <Layers size={20} />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900">{group.label}</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">
                {group.permissions.length} permission
                {group.permissions.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <ChevronRight
            size={18}
            className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#29478f]"
          />
        </button>
      ))}
    </section>
  );
}

/* Detail: permissions inside the currently opened category */
function PermissionGroupDetail({
  group,
  permissions,
  loading,
  onBack,
  onEdit,
  actionMenuId,
  setActionMenuId,
}: {
  group: PermissionGroup;
  permissions: Permission[];
  loading: boolean;
  onBack: () => void;
  onEdit: (permission: Permission) => void;
  actionMenuId: any;
  setActionMenuId: (id: any) => void;
}) {
  return (
    <section className="mt-5 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="h-5 w-px bg-slate-300" />
        <p className="font-bold text-sm text-slate-900">{group.label}</p>
        <span className="text-xs font-semibold text-slate-500">
          {permissions.length} of {group.permissions.length} permission
          {group.permissions.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-125">
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
                      <p className="font-bold text-sm text-slate-900">
                        {formatPermissionName(permission.name)}
                      </p>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">
                        ID: {permission.id}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-5 text-sm font-medium text-slate-800">
                  {permission.created_at
                    ? new Date(permission.created_at).toLocaleDateString()
                    : "—"}
                </td>

                <td className="px-5">
                  <ActionMenu
                    isOpen={actionMenuId === permission.id}
                    onToggle={() =>
                      setActionMenuId(
                        actionMenuId === permission.id ? null : permission.id,
                      )
                    }
                    onClose={() => setActionMenuId(null)}
                  >
                    <ActionButton onClick={() => onEdit(permission)}>
                      <Edit3 size={16} />
                      Edit Permission
                    </ActionButton>
                  </ActionMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && permissions.length === 0 && (
          <div className="py-16 text-center text-sm font-medium text-slate-500">
            No permissions match your search.
          </div>
        )}
      </div>
    </section>
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
