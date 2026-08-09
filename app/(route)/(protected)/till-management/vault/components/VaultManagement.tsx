"use client";

import { useState } from "react";
import { CheckCircle2, Plus, Vault as VaultIcon } from "lucide-react";
import { toast } from "react-toastify";
import {
  approveVaultAction,
  createVaultAction,
  getVaultsAction,
} from "@/actions/vault.action";
import SearchableSelect from "@/components/SearchableSelect";
import SideDrawer from "@/components/SideDrawer";
import TotpConfirmModal from "@/components/TotpConfirmModal";
import { handleApiError } from "@/lib/errors";
import { usePermissions } from "@/lib/permissions";

type Vault = Record<string, any>;
type LookupOption = Record<string, any>;

interface VaultManagementProps {
  initialVaults: Vault[];
  initialMeta: Record<string, any> | null;
  branches: LookupOption[];
  currencies: LookupOption[];
}

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function VaultManagement({
  initialVaults,
  initialMeta,
  branches,
  currencies,
}: VaultManagementProps) {
  const { currentUser } = usePermissions();
  const [vaults, setVaults] = useState<Vault[]>(initialVaults);
  const [meta, setMeta] = useState(initialMeta);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approveTarget, setApproveTarget] = useState<Vault | null>(null);

  const [form, setForm] = useState({
    branch_id: "",
    name: "",
    currency_id: "",
  });

  async function refresh() {
    const result: any = await getVaultsAction(1);
    if (result?.status === "success") {
      setVaults(Array.isArray(result.data) ? result.data : []);
      setMeta(result.meta ?? null);
    }
  }

  async function handleCreate() {
    if (!form.branch_id || !form.name || !form.currency_id) {
      toast.error("Fill in all fields.");
      return;
    }

    setSubmitting(true);
    const result: any = await createVaultAction(form);
    if (result?.status !== "success") {
      handleApiError(result, "Failed to create vault.");
      setSubmitting(false);
      return;
    }
    toast.success("Vault created — pending approval.");
    setCreateOpen(false);
    setForm({ branch_id: "", name: "", currency_id: "" });
    refresh();

    setSubmitting(false);
  }

  async function handleApprove(totpCode: string) {
    if (!approveTarget) return;
    setSubmitting(true);
    const result: any = await approveVaultAction(approveTarget.id, totpCode);
    if (result?.status !== "success") {
      handleApiError(result, "Failed to approve vault.");
      setSubmitting(false);
      return;
    }
    toast.success("Vault approved.");
    setApproveTarget(null);
    refresh();

    setSubmitting(false);
  }

  return (
    <>
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Vaults
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Branch cash reserves that supply float to tills.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#173673] px-5 text-sm font-semibold text-white transition hover:bg-[#10295c] shadow-sm"
        >
          <Plus size={18} />
          New Vault
        </button>
      </div>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-200">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Vault
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Branch
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  GL
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Balance
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Status
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vaults.map((vault) => (
                <tr key={vault.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[#29478f]">
                        <VaultIcon size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {vault.name}
                        </p>
                        <p className="text-xs text-slate-500">{vault.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-700">
                    {vault.branch_name || "—"}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-700">
                    {vault.gl_code || "—"}
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-slate-900">
                    ₦{formatCurrency(vault.balance)}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                        vault.status === "active"
                          ? "bg-green-100 text-green-800 border border-green-300"
                          : vault.status === "pending"
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-slate-100 text-slate-700 border border-slate-300"
                      }`}
                    >
                      {vault.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {vault.status === "pending" &&
                      String(vault.created_by) !== String(currentUser?.id) && (
                        <button
                          type="button"
                          onClick={() => setApproveTarget(vault)}
                          className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                        >
                          <CheckCircle2 size={14} />
                          Approve
                        </button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {vaults.length === 0 && (
          <div className="py-16 text-center text-sm font-medium text-slate-500">
            No vaults found.
          </div>
        )}
      </section>

      <SideDrawer
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        widthClassName="max-w-2xl"
      >
        <div>
          <h2 className="text-lg font-bold text-slate-900">New Vault</h2>
          <p className="mt-1 text-sm text-slate-600">
            Branch cash reserve that supplies float to tills.
          </p>

          <div className="mt-6 space-y-6">
            <SearchableSelect
              label="Branch"
              name="branch_id"
              value={form.branch_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, branch_id: e.target.value }))
              }
              options={branches.map((b) => ({
                value: String(b.id),
                label: b.name,
              }))}
            />
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-800">
                Name
              </label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-[#29478f]"
              />
            </div>
            <SearchableSelect
              label="Currency"
              name="currency_id"
              value={form.currency_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, currency_id: e.target.value }))
              }
              options={currencies.map((c) => ({
                value: String(c.id),
                label: `${c.code} - ${c.name}`,
                sublabel: c.name,
              }))}
            />
          </div>

          <div className="mt-8 flex justify-end gap-3">
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
      </SideDrawer>

      <TotpConfirmModal
        isOpen={!!approveTarget}
        title="Approve Vault"
        description={`Approve vault '${approveTarget?.name}'? This activates its cash GL.`}
        confirmLabel="Yes, Approve"
        confirmTone="primary"
        pending={submitting}
        onCancel={() => setApproveTarget(null)}
        onConfirm={handleApprove}
      />
    </>
  );
}
