"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  CheckCircle2,
  Receipt,
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import { approvePostingAction, rejectPostingAction } from "@/actions/posting.action";
import ConfirmModal from "@/components/ConfirmModal";
import ReasonModal from "@/components/ReasonModal";
import { handleApiError } from "@/lib/errors";
import { toDisplayLabel } from "@/lib/format";
import { usePermissions } from "@/lib/permissions";

type Posting = Record<string, any>;

interface PostingDetailProps {
  posting: Posting;
}

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function partyKind(type: string) {
  return type === "account" ? "Customer" : "GL";
}

function partyLabel(party: Record<string, any> | null | undefined) {
  if (!party) return "—";
  if (party.type === "account") return `${party.account_number} — ${party.account_name}`;
  if (party.type === "general_ledger") return `${party.gl_code} — ${toDisplayLabel(party.name)}`;
  return "—";
}

function userName(user: Record<string, any> | null | undefined) {
  if (!user) return undefined;
  return `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.username;
}

export default function PostingDetail({ posting: initialPosting }: PostingDetailProps) {
  const router = useRouter();
  const { currentUser } = usePermissions();
  const [posting, setPosting] = useState<Posting>(initialPosting);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);

  const isOwnPosting = !!currentUser?.id && String(currentUser.id) === String(posting.created_by);
  const isPending = posting.status === "pending";

  async function runAction(key: string, action: () => Promise<any>, successMessage: string) {
    setActionPending(key);
    try {
      const result: any = await action();

      if (result?.status !== "success") {
        handleApiError(result, "That action failed.");
        return;
      }

      toast.success(result.message || successMessage);
      router.refresh();
    } catch (error) {
      console.error("Posting action failed:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setActionPending(null);
    }
  }

  function handleApprove() {
    setApproveModalOpen(false);
    runAction("approve", () => approvePostingAction(posting.id), "Posting approved and posted.");
  }

  function handleReject(reason: string) {
    setRejectModalOpen(false);
    runAction("reject", () => rejectPostingAction(posting.id, reason), "Posting rejected.");
  }

  return (
    <>
      {/* HEADER */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          href="/postings"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#29478f] transition"
        >
          <ArrowLeft size={16} />
          Back to Postings
        </Link>

        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#29478f]">
              <ArrowLeftRight size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {posting.reference}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="rounded-full bg-slate-100 px-2.5 py-1">
                  {partyKind(posting.source_type)} → {partyKind(posting.destination_type)}
                </span>
                {posting.transaction_type && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 capitalize">
                    {toDisplayLabel(posting.transaction_type)}
                  </span>
                )}
                <StatusBadge status={posting.status} />
              </div>
            </div>
          </div>

          {isPending && (
            <div className="flex flex-col items-end gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <ActionButton
                  label="Reject"
                  icon={<XCircle size={14} />}
                  pending={actionPending === "reject"}
                  onClick={() => setRejectModalOpen(true)}
                  className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                />
                <ActionButton
                  label="Approve"
                  icon={<CheckCircle2 size={14} />}
                  pending={actionPending === "approve"}
                  disabled={isOwnPosting}
                  onClick={() => setApproveModalOpen(true)}
                  className="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                />
              </div>
              {isOwnPosting && (
                <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                  <AlertTriangle size={13} />
                  You can&apos;t approve a posting you created — another admin must approve it.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={approveModalOpen}
        title="Approve Posting"
        description={`Are you sure you have reviewed this transaction? Approving '${posting.reference}' will post it to the ledger immediately and can't be undone.`}
        confirmLabel="Yes, Approve"
        confirmTone="primary"
        pending={actionPending === "approve"}
        onCancel={() => setApproveModalOpen(false)}
        onConfirm={handleApprove}
      />

      <ReasonModal
        isOpen={rejectModalOpen}
        title="Reject Posting"
        description={`Provide a reason for rejecting posting '${posting.reference}'.`}
        confirmLabel="Reject Posting"
        confirmTone="danger"
        pending={actionPending === "reject"}
        onCancel={() => setRejectModalOpen(false)}
        onConfirm={handleReject}
      />

      {/* PARTIES */}
      <Section title="Parties">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Source ({partyKind(posting.source_type)})
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">{partyLabel(posting.source)}</p>
            {posting.source?.customer_id && (
              <Link
                href={`/customer-management/customer/${posting.source.customer_id}`}
                className="mt-1 inline-block text-xs font-semibold text-[#29478f] hover:underline"
              >
                View customer
              </Link>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Destination ({partyKind(posting.destination_type)})
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {partyLabel(posting.destination)}
            </p>
            {posting.destination?.customer_id && (
              <Link
                href={`/customer-management/customer/${posting.destination.customer_id}`}
                className="mt-1 inline-block text-xs font-semibold text-[#29478f] hover:underline"
              >
                View customer
              </Link>
            )}
          </div>
        </div>
      </Section>

      {/* AMOUNTS */}
      <Section title="Amounts">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <Field label="Amount" value={`₦${formatCurrency(posting.amount)}`} />
          <Field label="Total" value={`₦${formatCurrency(posting.total_amount)}`} />
        </div>
      </Section>

      {/* DETAILS */}
      <Section title="Details">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Transaction Reference" value={posting.transaction_reference} />
        </div>
        {posting.remarks && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Remarks</p>
            <p className="mt-1 text-sm text-slate-800">{posting.remarks}</p>
          </div>
        )}
      </Section>

      {/* RECORD HISTORY */}
      <Section title="Record History">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Created By" value={userName(posting.creator)} />
          <Field label="Created Date" value={formatDateTime(posting.created_at)} />
          <Field label="Reviewed By" value={userName(posting.reviewer)} />
          <Field label="Reviewed Date" value={formatDateTime(posting.reviewed_at)} />
          <Field label="Approved By" value={userName(posting.approver)} />
          <Field label="Approved Date" value={formatDateTime(posting.approved_at)} />
          <Field label="Rejected By" value={userName(posting.rejecter)} />
          <Field label="Rejected Date" value={formatDateTime(posting.rejected_at)} />
        </div>
        {posting.rejection_reason && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Rejection Reason
            </p>
            <p className="mt-1 text-sm text-slate-800">{posting.rejection_reason}</p>
          </div>
        )}
      </Section>

      {/* FINANCIAL TRANSACTION */}
      {posting.financial_transaction?.id && (
        <Section title="Financial Transaction">
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
            <Field label="Reference" value={posting.financial_transaction.transaction_reference} />
            <Field label="Status" value={toDisplayLabel(posting.financial_transaction.status)} />
            <Field label="Completed At" value={formatDateTime(posting.financial_transaction.completed_at)} />
          </div>

          {Array.isArray(posting.financial_transaction.journal_entries) &&
            posting.financial_transaction.journal_entries.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Journal Entries
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-150">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <Heading>GL</Heading>
                        <Heading>Debit/Credit</Heading>
                        <Heading>Amount</Heading>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {posting.financial_transaction.journal_entries.map((entry: Record<string, any>) => (
                        <tr key={entry.id}>
                          <td className="px-3 py-2 text-sm text-slate-800">
                            {entry.general_ledger_id ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-bold capitalize ${
                                entry.debit_credit === "credit"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {entry.debit_credit}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm font-bold text-slate-900">
                            ₦{formatCurrency(entry.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </Section>
      )}

      {!posting.financial_transaction?.id && !isPending && posting.status === "approved" && (
        <Section title="Financial Transaction">
          <div className="py-6 text-center">
            <Receipt size={24} className="mx-auto text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-500">
              No financial transaction recorded.
            </p>
          </div>
        </Section>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value || "—"}</p>
    </div>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return (
    <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
      {children}
    </th>
  );
}

function ActionButton({
  label,
  icon,
  pending,
  disabled,
  onClick,
  className,
}: {
  label: string;
  icon: ReactNode;
  pending: boolean;
  disabled?: boolean;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending || disabled}
      title={disabled ? "You can't approve a posting you created" : undefined}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {icon}
      {pending ? "Please wait..." : label}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: "bg-green-100 text-green-800 border border-green-300",
    pending: "bg-amber-100 text-amber-800 border border-amber-300",
    rejected: "bg-red-100 text-red-800 border border-red-300",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
        styles[status] || "bg-slate-100 text-slate-700 border border-slate-300"
      }`}
    >
      {status ? toDisplayLabel(status) : "—"}
    </span>
  );
}
