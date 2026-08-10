"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Mail,
  Save,
  ShieldQuestion,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  assignUserRolesAction,
  resetUserPasswordAction,
  unassignUserRolesAction,
  updateUserAction,
} from "@/actions/user.action";
import { handleApiError } from "@/lib/errors";
import UserForm from "../../components/UserForm";

type User = Record<string, any>;
type Branch = Record<string, any>;
type Role = Record<string, any>;
type UserFormData = Record<string, any>;

interface UserDetailProps {
  user: User;
  branches: Branch[];
  allRoles: Role[];
}

// Turns "branch_manager" into "Branch Manager" for display.
function formatLabel(name: string) {
  return (name ?? "")
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function UserDetail({
  user,
  branches,
  allRoles,
}: UserDetailProps) {
  const router = useRouter();

  const [formData, setFormData] = useState<UserFormData>({
    branch_id: user.branch_id ?? "",
    staff_code: user.staff_code ?? "",
    first_name: user.first_name ?? "",
    last_name: user.last_name ?? "",
    username: user.username ?? "",
    email: user.email ?? "",
    gender: user.gender ?? "male",
    phone: user.phone ?? "",
    address: user.address ?? "",
    city: user.city ?? "",
    state: user.state ?? "",
    country: user.country ?? "Nigeria",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [sendingCredentials, setSendingCredentials] = useState(false);

  const roleNames = useMemo(
    () => allRoles.map((role) => role.name).filter(Boolean),
    [allRoles],
  );

  const initialRoles = useMemo(
    () => new Set<string>(Array.isArray(user.roles) ? user.roles : []),
    [user.roles],
  );

  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(
    new Set(initialRoles),
  );
  const [savingRoles, setSavingRoles] = useState(false);

  const hasRoleChanges =
    selectedRoles.size !== initialRoles.size ||
    Array.from(selectedRoles).some((name) => !initialRoles.has(name));

  function handleInputChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;

    if (name === "phone") {
      const sanitized = value.replace(/(?!^\+)[^\d]/g, "");
      const digitsOnly = sanitized.replace("+", "").slice(0, 15);
      const nextValue = (sanitized.startsWith("+") ? "+" : "") + digitsOnly;
      setFormData((current) => ({ ...current, phone: nextValue }));
      return;
    }

    setFormData((current) => ({ ...current, [name]: value }));
  }

  async function handleProfileSave() {
    setSavingProfile(true);
    const result: any = await updateUserAction(user.id, {
      branch_id: formData.branch_id,
      staff_code: formData.staff_code,
      first_name: formData.first_name,
      last_name: formData.last_name,
      username: formData.username,
      email: formData.email,
      gender: formData.gender,
      phone: formData.phone,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      country: formData.country,
    });

    if (result?.status !== "success") {
      handleApiError(result, "Failed to update user.");
      setSavingProfile(false);
      return;
    }

    toast.success(result.message || "User updated successfully.");
    router.push("/user-management/user");

    setSavingProfile(false);
  }

  async function handleSendCredentials() {
    setSendingCredentials(true);
    const result: any = await resetUserPasswordAction(user.id);

    if (result?.status !== "success") {
      handleApiError(result, "Failed to send login email.");
      setSendingCredentials(false);
      return;
    }

    toast.success(result.message || "Login email sent to the user.");

    setSendingCredentials(false);
  }

  function toggleRole(name: string) {
    setSelectedRoles((current) => {
      const next = new Set(current);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  function selectAllRoles() {
    setSelectedRoles(new Set(roleNames));
  }

  function clearAllRoles() {
    setSelectedRoles(new Set());
  }

  async function handleRolesSave() {
    const toAdd = Array.from(selectedRoles).filter(
      (name) => !initialRoles.has(name),
    );
    const toRemove = Array.from(initialRoles).filter(
      (name) => !selectedRoles.has(name),
    );

    if (toAdd.length === 0 && toRemove.length === 0) return;

    setSavingRoles(true);
    const results = await Promise.all([
      toAdd.length > 0 ? assignUserRolesAction(user.id, toAdd) : null,
      toRemove.length > 0 ? unassignUserRolesAction(user.id, toRemove) : null,
    ]);

    const failed = results.find(
      (result) => result && result.status !== "success",
    );

    if (failed) {
      handleApiError(failed, "Failed to update roles.");
      return;
    }

    toast.success("User roles updated successfully.");
    router.refresh();

    setSavingRoles(false);
  }

  return (
    <>
      {/* HEADER */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          href="/user-management/user"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#29478f] transition"
        >
          <ArrowLeft size={16} />
          Back to Users
        </Link>

        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#29478f]">
            <UserRound size={26} />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {user.first_name} {user.last_name}
            </h1>

            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="rounded-full bg-slate-100 px-2.5 py-1">
                {user.code || `USR-${user.id}`}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1">
                @{user.username}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 capitalize">
                {user.status ?? "—"}
              </span>
              <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                <ShieldQuestion size={12} />
                {selectedRoles.size} role{selectedRoles.size === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PROFILE */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Profile</h2>
            <p className="mt-1 text-sm text-slate-600">
              Update this user&apos;s personal and staff information.
            </p>
          </div>

          <div className="flex shrink-0 gap-3">
            <button
              type="button"
              onClick={handleSendCredentials}
              disabled={sendingCredentials}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sendingCredentials ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400/40 border-t-slate-600" />
              ) : (
                <Mail size={17} />
              )}
              {sendingCredentials ? "Sending..." : "Send Login Email"}
            </button>

            <button
              type="button"
              onClick={handleProfileSave}
              disabled={savingProfile}
              className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#173673] px-5 text-sm font-semibold text-white transition hover:bg-[#10295c] disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
            >
              {savingProfile ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <Save size={17} />
              )}
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>

        <div className="mt-6">
          <UserForm
            formData={formData}
            onChange={handleInputChange}
            branches={branches}
            mode="edit"
          />
        </div>
      </div>

      {/* ROLES */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Roles</h2>
            <p className="mt-1 text-sm text-slate-600">
              Assign or remove roles for this user.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAllRoles}
              disabled={selectedRoles.size === roleNames.length}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCheck size={16} />
              Select All
            </button>

            <button
              type="button"
              onClick={clearAllRoles}
              disabled={selectedRoles.size === 0}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={16} />
              Clear All
            </button>

            <button
              type="button"
              onClick={handleRolesSave}
              disabled={savingRoles || !hasRoleChanges}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#173673] px-5 text-sm font-semibold text-white transition hover:bg-[#10295c] disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
            >
              {savingRoles ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <Save size={17} />
              )}
              {savingRoles ? "Saving..." : "Save Roles"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {roleNames.length === 0 && (
            <div className="col-span-full py-10 text-center text-sm font-medium text-slate-500">
              No roles have been created yet.
            </div>
          )}

          {roleNames.map((name) => {
            const checked = selectedRoles.has(name);

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
                  onChange={() => toggleRole(name)}
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
    </>
  );
}
