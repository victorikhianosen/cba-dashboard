"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, CheckCircle2, ShieldCheck, X, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import {
  approveWithdrawalAction,
  getPendingWithdrawalsAction,
  rejectWithdrawalAction,
} from "@/actions/cashier-session.action";
import ReasonModal from "@/components/ReasonModal";
import { handleApiError } from "@/lib/errors";
import { usePermissions } from "@/lib/permissions";

type Withdrawal = Record<string, any>;
type Party = {
  type: string;
  label: string;
  name: string | null;
  account_number: string | null;
  balance: number | string;
  currency_code: string | null;
} | null;

interface WithdrawalApprovalQueueProps {
  initialWithdrawals: Withdrawal[];
}

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PartyCard({ label, party }: { label: string; party: Party }) {
  return (
    <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-slate-900">{party?.name ?? party?.label ?? "—"}</p>
      {party?.account_number && <p className="text-xs text-slate-500">{party.account_number}</p>}
      <p className="mt-1 text-sm font-semibold text-slate-600">
        Balance: {formatCurrency(party?.balance)}
        {party?.currency_code ? ` ${party.currency_code}` : ""}
      </p>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${style}`}>
      {status}
    </span>
  );
}

export default function WithdrawalApprovalQueue({ initialWithdrawals }: WithdrawalApprovalQueueProps) {
  const { currentUser } = usePermissions();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>(initialWithdrawals);
  const [approveTarget, setApproveTarget] = useState<Withdrawal | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Withdrawal | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [totpCode, setTotpCode] = useState("");

  async function refresh() {
    const result: any = await getPendingWithdrawalsAction(1, "all");
    if (result?.status === "success") {
      setWithdrawals(Array.isArray(result.data) ? result.data : []);
    }
  }

  async function handleApprove() {
    if (!approveTarget || totpCode.length !== 6) return;
    setSubmitting(true);
    try {
      const result: any = await approveWithdrawalAction(approveTarget.id, totpCode);
      if (result?.status !== "success") {
        handleApiError(result, "Failed to approve withdrawal.");
        return;
      }
      toast.success("Withdrawal approved — cash may now be handed out.");
      setApproveTarget(null);
      setTotpCode("");
      refresh();
    } catch (error) {
      console.error("Failed to approve withdrawal:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject(reason: string) {
    if (!rejectTarget) return;
    setSubmitting(true);
    try {
      const result: any = await rejectWithdrawalAction(rejectTarget.id, reason);
      if (result?.status !== "success") {
        handleApiError(result, "Failed to reject withdrawal.");
        return;
      }
      toast.success("Withdrawal rejected.");
      setRejectTarget(null);
      refresh();
    } catch (error) {
      console.error("Failed to reject withdrawal:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Withdrawal Approvals</h1>
        <p className="mt-1 text-sm text-slate-600">
          Customer cash withdrawal requests awaiting a second admin's sign-off before the cash is handed out.
        </p>
      </div>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-250">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Teller</th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Requested By</th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Account</th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Amount</th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Status</th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Requested</th>
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {withdrawals.map((withdrawal) => {
                const isOwnRequest = String(withdrawal.requested_by) === String(currentUser?.id);
                const isPending = withdrawal.status === "pending";

                return (
                  <tr key={withdrawal.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-4 text-sm font-bold text-slate-900">
                      {withdrawal.teller_name}
                      <p className="text-xs font-normal text-slate-500">{withdrawal.teller_code}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">{withdrawal.requested_by_name}</td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      <p className="font-semibold text-slate-900">{withdrawal.counterparty_name ?? withdrawal.counterparty_label}</p>
                      {withdrawal.counterparty_account_number && (
                        <p className="text-xs text-slate-500">{withdrawal.counterparty_account_number}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-slate-900">₦{formatCurrency(withdrawal.amount)}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={withdrawal.status} />
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      {withdrawal.created_at ? new Date(withdrawal.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-5 py-4">
                      {isPending ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={isOwnRequest}
                            title={isOwnRequest ? "You cannot approve a withdrawal you requested yourself" : undefined}
                            onClick={() => setApproveTarget(withdrawal)}
                            className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <CheckCircle2 size={14} />
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectTarget(withdrawal)}
                            className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
                          >
                            <XCircle size={14} />
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {withdrawal.status === "approved" ? `Approved by ${withdrawal.approved_by_name ?? "—"}` : withdrawal.rejection_reason ?? "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {withdrawals.length === 0 && (
          <div className="py-16 text-center text-sm font-medium text-slate-500">
            No withdrawal requests yet.
          </div>
        )}
      </section>

      {approveTarget &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close dialog"
              onClick={() => {
                setApproveTarget(null);
                setTotpCode("");
              }}
              className="fixed inset-0 bg-black/40"
            />

            <div className="relative w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Approve Withdrawal</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Amount: <span className="font-bold text-slate-900">₦{formatCurrency(approveTarget.amount)}</span>. Confirm the
                    exact accounts that will move before approving — this debits the customer and credits the teller's
                    cash, and cannot be undone.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close dialog"
                  onClick={() => {
                    setApproveTarget(null);
                    setTotpCode("");
                  }}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <PartyCard label="Debit (Source)" party={approveTarget.source} />
                <ArrowRight size={20} className="shrink-0 text-slate-400" />
                <PartyCard label="Credit (Destination)" party={approveTarget.destination} />
              </div>

              <label className="mt-6 block max-w-xs">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                  <ShieldCheck size={15} className="text-slate-400" />
                  Google Authenticator Code
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={totpCode}
                  onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit code"
                  className="mt-2 w-40 rounded-xl border border-slate-300 bg-white p-2.5 text-center text-base tracking-[0.4em] text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
                />
              </label>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setApproveTarget(null);
                    setTotpCode("");
                  }}
                  disabled={submitting}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={submitting || totpCode.length !== 6}
                  className="rounded-xl bg-[#173673] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#10295c] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Please wait..." : "Yes, Approve"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      <ReasonModal
        isOpen={!!rejectTarget}
        title="Reject Withdrawal"
        description="Provide a reason for rejecting this withdrawal request."
        confirmLabel="Reject Withdrawal"
        confirmTone="danger"
        pending={submitting}
        onCancel={() => setRejectTarget(null)}
        onConfirm={handleReject}
      />
    </>
  );
}
