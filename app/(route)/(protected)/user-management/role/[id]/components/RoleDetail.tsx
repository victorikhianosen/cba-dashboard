"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  KeyRound,
  Save,
  Search,
  ShieldQuestion,
  Users,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { assignPermissionsToRoleAction } from "@/actions/role.action";
import { handleApiError } from "@/lib/errors";

type Role = Record<string, any>;
type Permission = Record<string, any>;

interface RoleDetailProps {
  role: Role;
  allPermissions: Permission[];
}

const ACTION_WORDS = [
  "view",
  "create",
  "update",
  "delete",
  "approve",
  "assign",
  "manage",
];

// Turns "some_name" into "Some Name" for display.
function formatLabel(name: string) {
  return (name ?? "")
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Groups permission names by their resource, e.g. "create_account_products"
// and "view_account_products" both land under "Account Products".
function groupPermissions(names: string[]) {
  const groups = new Map<string, string[]>();

  for (const name of names) {
    const parts = name.split("_");
    const resourceKey =
      ACTION_WORDS.includes(parts[0]) && parts.length > 1
        ? parts.slice(1).join("_")
        : "general";

    if (!groups.has(resourceKey)) {
      groups.set(resourceKey, []);
    }
    groups.get(resourceKey)!.push(name);
  }

  return Array.from(groups.entries())
    .map(([resourceKey, permissions]) => ({
      resourceKey,
      label: resourceKey === "general" ? "General" : formatLabel(resourceKey),
      permissions: permissions.sort(),
    }))
    .sort((a, b) => {
      if (a.resourceKey === "general") return 1;
      if (b.resourceKey === "general") return -1;
      return a.label.localeCompare(b.label);
    });
}

export default function RoleDetail({ role, allPermissions }: RoleDetailProps) {
  const router = useRouter();

  const permissionNames = useMemo(
    () => allPermissions.map((permission) => permission.name).filter(Boolean),
    [allPermissions],
  );

  const initialSelected = useMemo(
    () =>
      new Set<string>(Array.isArray(role.permissions) ? role.permissions : []),
    [role.permissions],
  );

  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialSelected),
  );
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const hasChanges =
    selected.size !== initialSelected.size ||
    Array.from(selected).some((name) => !initialSelected.has(name));

  const groups = useMemo(
    () => groupPermissions(permissionNames),
    [permissionNames],
  );

  const filteredGroups = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return groups;

    return groups
      .map((group) => ({
        ...group,
        permissions: group.permissions.filter((name) =>
          formatLabel(name).toLowerCase().includes(keyword),
        ),
      }))
      .filter((group) => group.permissions.length > 0);
  }, [groups, search]);

  function togglePermission(name: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  function toggleGroup(names: string[]) {
    setSelected((current) => {
      const next = new Set(current);
      const allSelected = names.every((name) => next.has(name));

      names.forEach((name) => {
        if (allSelected) {
          next.delete(name);
        } else {
          next.add(name);
        }
      });

      return next;
    });
  }

  function selectAllPermissions() {
    setSelected(new Set(permissionNames));
  }

  function clearAllPermissions() {
    setSelected(new Set());
  }

  async function handleSave() {
    setSaving(true);
    const result: any = await assignPermissionsToRoleAction(
      role.id,
      Array.from(selected),
    );

    if (result?.status !== "success") {
      handleApiError(result, "Failed to update role permissions.");
      setSaving(false);
      return;
    }

    toast.success(result.message || "Role permissions updated successfully.");
    router.refresh();

    setSaving(false);
  }

  return (
    <>
      {/* HEADER */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          href="/user-management/role"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#29478f] transition"
        >
          <ArrowLeft size={16} />
          Back to Roles
        </Link>

        <div className="mt-4 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#29478f]">
              <ShieldQuestion size={26} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {formatLabel(role.name)}
              </h1>

              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="rounded-full bg-slate-100 px-2.5 py-1">
                  ID: {role.id}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1">
                  Guard: {role.guard_name ?? "—"}
                </span>
                <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                  <KeyRound size={12} />
                  {selected.size} permission{selected.size === 1 ? "" : "s"}{" "}
                  selected
                </span>
                {typeof role.users_count === "number" && (
                  <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                    <Users size={12} />
                    {role.users_count} user{role.users_count === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasChanges || selected.size === 0}
              className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#173673] px-5 text-sm font-semibold text-white transition hover:bg-[#10295c] disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
            >
              {saving ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <Save size={17} />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </button>

            {selected.size === 0 && (
              <p className="text-xs font-medium text-red-600">
                Select at least one permission to save.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SEARCH & BULK ACTIONS */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filter permissions..."
            className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder-slate-500 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAllPermissions}
            disabled={selected.size === permissionNames.length}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck size={16} />
            Select All
          </button>

          <button
            type="button"
            onClick={clearAllPermissions}
            disabled={selected.size === 0}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={16} />
            Clear All
          </button>
        </div>
      </div>

      {/* PERMISSION GROUPS */}
      <div className="mt-5 space-y-5">
        {filteredGroups.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm font-medium text-slate-500">
            No permissions match your search.
          </div>
        )}

        {filteredGroups.map((group) => {
          const selectedInGroup = group.permissions.filter((name) =>
            selected.has(name),
          ).length;
          const allSelected = selectedInGroup === group.permissions.length;

          return (
            <div
              key={group.resourceKey}
              className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
                <div>
                  <p className="font-bold text-sm text-slate-900">
                    {group.label}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    {selectedInGroup}/{group.permissions.length} selected
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleGroup(group.permissions)}
                  className="text-xs font-bold text-[#29478f] hover:underline"
                >
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.permissions.map((name) => {
                  const checked = selected.has(name);

                  return (
                    <label
                      key={name}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                        checked
                          ? "border-[#29478f] bg-blue-50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePermission(name)}
                        className="sr-only"
                      />

                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
                          checked
                            ? "border-[#173673] bg-[#173673] text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {checked && <Check size={13} strokeWidth={3} />}
                      </span>

                      <span className="text-sm font-medium text-slate-800">
                        {formatLabel(name)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
