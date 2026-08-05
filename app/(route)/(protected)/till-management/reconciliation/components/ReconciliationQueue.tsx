"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import {
  approveCashierVarianceAction,
  getCashierSessionsAction,
  rejectCashierVarianceAction,
} from "@/actions/cashier-session.action";
import ReasonModal from "@/components/ReasonModal";
import TotpConfirmModal from "@/components/TotpConfirmModal";
import { handleApiError } from "@/lib/errors";
import { usePermissions } from "@/lib/permissions";

type CashierSession = Record<string, any>;

interface ReconciliationQueueProps {
  initialSessions: CashierSession[];
}

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ReconciliationQueue({ initialSessions }: ReconciliationQueueProps) {
  const { currentUser } = usePermissions();
  const [sessions, setSessions] = useState<CashierSession[]>(initialSessions);
  const [approveTarget, setApproveTarget] = useState<CashierSession | null>(null);
  const [rejectTarget, setRejectTarget] = useState<CashierSession | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    const result: any = await getCashierSessionsAction(1, "pending_variance_approval");
    if (result?.status === "success") {
      setSessions(Array.isArray(result.data) ? result.data : []);
    }
  }

  async function handleApprove(totpCode: string) {
    if (!approveTarget) return;
    setSubmitting(true);
    try {
      const result: any = await approveCashierVarianceAction(approveTarget.id, totpCode);
      if (result?.status !== "success") {
        handleApiError(result, "Failed to approve variance.");
        return;
      }
      toast.success("Variance approved — teller reconciled and swept to vault.");
      setApproveTarget(null);
      refresh();
    } catch (error) {
      console.error("Failed to approve variance:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject(reason: string) {
    if (!rejectTarget) return;
    setSubmitting(true);
    try {
      const result: any = await rejectCashierVarianceAction(rejectTarget.id, reason);
      if (result?.status !== "success") {
        handleApiError(result, "Failed to reject variance.");
        return;
      }
      toast.success("Variance rejected — cashier must recount or escalate.");
      setRejectTarget(null);
      refresh();
    } catch (error) {
      console.error("Failed to reject variance:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reconciliation Queue</h1>
        <p className="mt-1 text-sm text-slate-600">
          Teller sessions with an out-of-tolerance variance awaiting a second admin's sign-off.
        </p>
      </div>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-225">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Teller</th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Cashier</th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Expected</th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Counted</th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Variance</th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((session) => {
                const isOwnSession = String(session.closed_by) === String(currentUser?.id);
                const variance = Number(session.variance_amount ?? 0);

                return (
                  <tr key={session.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-4 text-sm font-bold text-slate-900">
                      {session.teller_name}
                      <p className="text-xs font-normal text-slate-500">{session.teller_code}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">{session.cashier_name}</td>
                    <td className="px-5 py-4 text-sm text-slate-700">₦{formatCurrency(session.expected_closing_balance)}</td>
                    <td className="px-5 py-4 text-sm text-slate-700">₦{formatCurrency(session.counted_closing_amount)}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`flex items-center gap-1.5 text-sm font-bold ${
                          variance < 0 ? "text-red-700" : "text-emerald-700"
                        }`}
                      >
                        <AlertTriangle size={14} />
                        {variance > 0 ? "+" : ""}
                        ₦{formatCurrency(variance)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={isOwnSession}
                          title={isOwnSession ? "You cannot approve a variance on a session you closed yourself" : undefined}
                          onClick={() => setApproveTarget(session)}
                          className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <CheckCircle2 size={14} />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectTarget(session)}
                          className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sessions.length === 0 && (
          <div className="py-16 text-center text-sm font-medium text-slate-500">
            No sessions currently need variance approval.
          </div>
        )}
      </section>

      <TotpConfirmModal
        isOpen={!!approveTarget}
        title="Approve Variance"
        description={`Approve the variance of ₦${formatCurrency(approveTarget?.variance_amount)} for teller '${approveTarget?.teller_name}'? This reconciles the session and sweeps the counted cash back to the vault.`}
        confirmLabel="Yes, Approve"
        confirmTone="primary"
        pending={submitting}
        onCancel={() => setApproveTarget(null)}
        onConfirm={handleApprove}
      />

      <ReasonModal
        isOpen={!!rejectTarget}
        title="Reject Variance"
        description={`Provide a reason for rejecting this variance — the cashier will need to recount or escalate.`}
        confirmLabel="Reject Variance"
        confirmTone="danger"
        pending={submitting}
        onCancel={() => setRejectTarget(null)}
        onConfirm={handleReject}
      />
    </>
  );
}
