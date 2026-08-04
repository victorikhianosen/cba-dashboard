"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import {
  approveLienAction,
  listLienApprovalsAction,
  rejectLienAction,
} from "@/actions/account-lien.action";
import ConfirmModal from "@/components/ConfirmModal";
import ReasonModal from "@/components/ReasonModal";
import { handleApiError } from "@/lib/errors";
import { usePermissions } from "@/lib/permissions";

type Lien = Record<string, any>;

interface LienApprovalQueueProps {
  initialLiens: Lien[];
}

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  active: "bg-blue-50 text-blue-700 border-blue-200",
  released: "bg-slate-100 text-slate-600 border-slate-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  expired: "bg-slate-100 text-slate-600 border-slate-200",
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${style}`}>
      {status}
    </span>
  );
}

export default function LienApprovalQueue({ initialLiens }: LienApprovalQueueProps) {
  const { currentUser } = usePermissions();
  const [liens, setLiens] = useState<Lien[]>(initialLiens);
  const [approveTarget, setApproveTarget] = useState<Lien | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Lien | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    const result: any = await listLienApprovalsAction("pending");
    if (result?.status === "success") {
      setLiens(Array.isArray(result.data) ? result.data : []);
    }
  }

  async function handleApprove() {
    if (!approveTarget) return;
    setSubmitting(true);
    try {
      const result: any = await approveLienAction(approveTarget.id);
      if (result?.status !== "success") {
        handleApiError(result, "Failed to approve lien.");
        return;
      }
      toast.success("Lien approved.");
      setApproveTarget(null);
      refresh();
    } catch (error) {
      console.error("Failed to approve lien:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject(reason: string) {
    if (!rejectTarget) return;
    setSubmitting(true);
    try {
      const result: any = await rejectLienAction(rejectTarget.id, reason);
      if (result?.status !== "success") {
        handleApiError(result, "Failed to reject lien.");
        return;
      }
      toast.success("Lien rejected.");
      setRejectTarget(null);
      refresh();
    } catch (error) {
      console.error("Failed to reject lien:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Lien Approvals</h1>
        <p className="mt-1 text-sm text-slate-600">
          Lien requests awaiting a second admin's sign-off before funds are set aside.
        </p>
      </div>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-250">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Reference</th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Account</th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Customer</th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Amount</th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Reason</th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Requested By</th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Requested</th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Status</th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {liens.map((lien) => {
                const isOwnRequest = String(lien.created_by) === String(currentUser?.id);
                const isPending = lien.status === "pending";

                return (
                  <tr key={lien.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-4 text-sm font-semibold text-slate-800">{lien.reference}</td>
                    <td className="px-5 py-4 text-sm text-slate-700">{lien.account_number}</td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      <p className="font-semibold text-slate-900">{lien.customer?.full_name ?? "—"}</p>
                      {lien.customer?.cif_number && (
                        <p className="text-xs text-slate-500">{lien.customer.cif_number}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-slate-900">₦{formatCurrency(lien.amount)}</td>
                    <td className="px-5 py-4 text-sm text-slate-700">{lien.reason ?? "—"}</td>
                    <td className="px-5 py-4 text-sm text-slate-700">{lien.created_by_name ?? "—"}</td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      {lien.created_at ? new Date(lien.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={lien.status} />
                    </td>
                    <td className="px-5 py-4">
                      {isPending ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={isOwnRequest}
                            title={isOwnRequest ? "You cannot approve a lien you requested yourself" : undefined}
                            onClick={() => setApproveTarget(lien)}
                            className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <CheckCircle2 size={14} />
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectTarget(lien)}
                            className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
                          >
                            <XCircle size={14} />
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {lien.status === "active"
                            ? `Approved by ${lien.approved_by_name ?? "—"}`
                            : lien.remarks ?? "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {liens.length === 0 && (
          <div className="py-16 text-center text-sm font-medium text-slate-500">
            No pending lien requests.
          </div>
        )}
      </section>

      <ConfirmModal
        isOpen={!!approveTarget}
        title="Approve Lien"
        description={
          approveTarget
            ? `Approve lien '${approveTarget.reference}' for ₦${formatCurrency(approveTarget.amount)}? This will set the funds aside immediately.`
            : undefined
        }
        confirmLabel="Yes, Approve"
        confirmTone="primary"
        pending={submitting}
        onCancel={() => setApproveTarget(null)}
        onConfirm={handleApprove}
      />

      <ReasonModal
        isOpen={!!rejectTarget}
        title="Reject Lien"
        description="Provide a reason for rejecting this lien request."
        confirmLabel="Reject Lien"
        confirmTone="danger"
        pending={submitting}
        onCancel={() => setRejectTarget(null)}
        onConfirm={handleReject}
      />
    </>
  );
}
