"use client";

import { useState } from "react";
import { Box, CheckCircle2, Plus, UserPlus, UserMinus } from "lucide-react";
import { toast } from "react-toastify";
import {
  approveTellerAction,
  assignTellerAction,
  createTellerAction,
  getTellersAction,
  unassignTellerAction,
} from "@/actions/teller.action";
import AmountInput from "@/components/AmountInput";
import ConfirmModal from "@/components/ConfirmModal";
import SearchableSelect from "@/components/SearchableSelect";
import { handleApiError } from "@/lib/errors";
import { usePermissions } from "@/lib/permissions";

type Teller = Record<string, any>;
type LookupOption = Record<string, any>;

interface TellerManagementProps {
  initialTellers: Teller[];
  initialMeta: Record<string, any> | null;
  branches: LookupOption[];
  vaults: LookupOption[];
  currencies: LookupOption[];
  users: LookupOption[];
}

function userLabel(user: LookupOption) {
  return `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.username;
}

export default function TellerManagement({
  initialTellers,
  initialMeta,
  branches,
  vaults,
  currencies,
  users,
}: TellerManagementProps) {
  const { currentUser } = usePermissions();
  const [tellers, setTellers] = useState<Teller[]>(initialTellers);
  const [, setMeta] = useState(initialMeta);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Teller | null>(null);
  const [assignUserId, setAssignUserId] = useState("");
  const [unassignTarget, setUnassignTarget] = useState<Teller | null>(null);
  const [approveTarget, setApproveTarget] = useState<Teller | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    branch_id: "",
    vault_id: "",
    name: "",
    currency_id: "",
    opening_float_ceiling_amount: "",
    variance_tolerance_amount: "0",
    requires_variance_approval: true,
    allows_teller_to_teller_transfer: false,
  });

  async function refresh() {
    const result: any = await getTellersAction(1);
    if (result?.status === "success") {
      setTellers(Array.isArray(result.data) ? result.data : []);
      setMeta(result.meta ?? null);
    }
  }

  async function handleCreate() {
    if (!form.branch_id || !form.vault_id || !form.name || !form.currency_id) {
      toast.error("Fill in the required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const result: any = await createTellerAction(form);
      if (result?.status !== "success") {
        handleApiError(result, "Failed to create teller.");
        return;
      }
      toast.success("Teller created — pending approval.");
      setCreateOpen(false);
      refresh();
    } catch (error) {
      console.error("Failed to create teller:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    if (!approveTarget) return;
    setSubmitting(true);
    try {
      const result: any = await approveTellerAction(approveTarget.id);
      if (result?.status !== "success") {
        handleApiError(result, "Failed to approve teller.");
        return;
      }
      toast.success("Teller approved.");
      setApproveTarget(null);
      refresh();
    } catch (error) {
      console.error("Failed to approve teller:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssign() {
    if (!assignTarget || !assignUserId) {
      toast.error("Choose a cashier to assign.");
      return;
    }

    setSubmitting(true);
    try {
      const result: any = await assignTellerAction(assignTarget.id, assignUserId);
      if (result?.status !== "success") {
        handleApiError(result, "Failed to assign teller.");
        return;
      }
      toast.success("Teller assigned.");
      setAssignTarget(null);
      setAssignUserId("");
      refresh();
    } catch (error) {
      console.error("Failed to assign teller:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnassign() {
    if (!unassignTarget) return;
    setSubmitting(true);
    try {
      const result: any = await unassignTellerAction(unassignTarget.id);
      if (result?.status !== "success") {
        handleApiError(result, "Failed to unassign teller.");
        return;
      }
      toast.success("Teller unassigned.");
      setUnassignTarget(null);
      refresh();
    } catch (error) {
      console.error("Failed to unassign teller:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tellers</h1>
          <p className="mt-1 text-sm text-slate-600">
            Cash drawers — each with its own GL, branch, and linked vault.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#173673] px-5 text-sm font-semibold text-white transition hover:bg-[#10295c] shadow-sm"
        >
          <Plus size={18} />
          New Teller
        </button>
      </div>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-250">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Teller</th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Branch / Vault</th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Assigned Cashier</th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Session</th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Status</th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tellers.map((teller) => (
                <tr key={teller.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[#29478f]">
                        <Box size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{teller.name}</p>
                        <p className="text-xs text-slate-500">{teller.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-700">
                    {teller.branch_name || "—"}
                    <br />
                    <span className="text-xs text-slate-500">{teller.vault_name}</span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-700">
                    {teller.current_assignment?.user_name || "Unassigned"}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-700">
                    {teller.current_session ? (
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800">
                        {teller.current_session.status}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                        teller.status === "active"
                          ? "bg-green-100 text-green-800 border border-green-300"
                          : teller.status === "pending"
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-slate-100 text-slate-700 border border-slate-300"
                      }`}
                    >
                      {teller.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {teller.status === "pending" && String(teller.created_by) !== String(currentUser?.id) && (
                        <button
                          type="button"
                          onClick={() => setApproveTarget(teller)}
                          className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                        >
                          <CheckCircle2 size={14} />
                          Approve
                        </button>
                      )}
                      {teller.status === "active" && !teller.current_assignment && (
                        <button
                          type="button"
                          onClick={() => setAssignTarget(teller)}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                          <UserPlus size={14} />
                          Assign
                        </button>
                      )}
                      {teller.current_assignment && !teller.current_session && (
                        <button
                          type="button"
                          onClick={() => setUnassignTarget(teller)}
                          className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
                        >
                          <UserMinus size={14} />
                          Unassign
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {tellers.length === 0 && (
          <div className="py-16 text-center text-sm font-medium text-slate-500">No tellers found.</div>
        )}
      </section>

      {createOpen && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-900">New Teller</h2>
            </div>
            <div className="space-y-4 overflow-y-auto p-6">
              <SearchableSelect
                label="Branch"
                name="branch_id"
                value={form.branch_id}
                onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value }))}
                options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
              />
              <SearchableSelect
                label="Vault"
                name="vault_id"
                value={form.vault_id}
                onChange={(e) => setForm((f) => ({ ...f, vault_id: e.target.value }))}
                options={vaults.map((v) => ({ value: String(v.id), label: `${v.name} (${v.code})` }))}
              />
              <div>
                <label className="mb-1.5 block text-sm font-bold text-slate-800">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-[#29478f]"
                />
              </div>
              <SearchableSelect
                label="Currency"
                name="currency_id"
                value={form.currency_id}
                onChange={(e) => setForm((f) => ({ ...f, currency_id: e.target.value }))}
                options={currencies.map((c) => ({ value: String(c.id), label: `${c.code} - ${c.name}`, sublabel: c.name }))}
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-800">Opening Float Ceiling</label>
                  <AmountInput
                    value={form.opening_float_ceiling_amount}
                    onChange={(raw) => setForm((f) => ({ ...f, opening_float_ceiling_amount: raw }))}
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-[#29478f]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-slate-800">Variance Tolerance</label>
                  <AmountInput
                    value={form.variance_tolerance_amount}
                    onChange={(raw) => setForm((f) => ({ ...f, variance_tolerance_amount: raw }))}
                    className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-[#29478f]"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.requires_variance_approval}
                  onChange={(e) => setForm((f) => ({ ...f, requires_variance_approval: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Require second-admin approval for out-of-tolerance variance
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.allows_teller_to_teller_transfer}
                  onChange={(e) => setForm((f) => ({ ...f, allows_teller_to_teller_transfer: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Allow direct teller-to-teller cash transfers
              </label>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 p-6">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleCreate}
                className="rounded-xl bg-[#173673] px-5 py-3 text-sm font-semibold text-white hover:bg-[#10295c] disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {assignTarget && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-900">Assign Teller</h2>
              <p className="mt-1 text-sm text-slate-600">
                Assign a cashier to '{assignTarget.name}'.
              </p>
            </div>
            <div className="p-6">
              <SearchableSelect
                label="Cashier"
                name="user_id"
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
                options={users.map((u) => ({ value: String(u.id), label: userLabel(u) }))}
              />
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 p-6">
              <button
                type="button"
                onClick={() => {
                  setAssignTarget(null);
                  setAssignUserId("");
                }}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleAssign}
                className="rounded-xl bg-[#173673] px-5 py-3 text-sm font-semibold text-white hover:bg-[#10295c] disabled:opacity-50"
              >
                {submitting ? "Assigning..." : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!approveTarget}
        title="Approve Teller"
        description={`Approve teller '${approveTarget?.name}'? This activates its cash GL.`}
        confirmLabel="Yes, Approve"
        confirmTone="primary"
        pending={submitting}
        onCancel={() => setApproveTarget(null)}
        onConfirm={handleApprove}
      />

      <ConfirmModal
        isOpen={!!unassignTarget}
        title="Unassign Teller"
        description={`Unassign the current cashier from '${unassignTarget?.name}'?`}
        confirmLabel="Yes, Unassign"
        confirmTone="danger"
        pending={submitting}
        onCancel={() => setUnassignTarget(null)}
        onConfirm={handleUnassign}
      />
    </>
  );
}
