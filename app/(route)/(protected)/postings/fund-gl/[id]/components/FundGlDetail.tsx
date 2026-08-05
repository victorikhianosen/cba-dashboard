"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import {
  approveFundGlAction,
  getFundGlAction,
  rejectFundGlAction,
  reviewFundGlAction,
} from "@/actions/fund-gl.action";
import TotpConfirmModal from "@/components/TotpConfirmModal";
import ReasonTotpConfirmModal from "@/components/ReasonTotpConfirmModal";
import { handleApiError } from "@/lib/errors";
import { toDisplayLabel } from "@/lib/format";
import { usePermissions } from "@/lib/permissions";

type FundGl = Record<string, any>;

interface FundGlDetailProps {
  fundGl: FundGl;
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

function glLabel(gl: Record<string, any> | null | undefined) {
  if (!gl) return "—";
  return `${gl.gl_code} — ${toDisplayLabel(gl.name)}`;
}

// created_by/reviewed_by/approved_by/rejected_by can come back either as a
// full user object or as a plain username/id string — normalize both down to
// a comparable id and a human-readable label.
function userId(user: string | number | Record<string, any> | null | undefined) {
  if (user === null || user === undefined) return undefined;
  if (typeof user === "object") return user.id;
  return user;
}

function userLabel(user: string | number | Record<string, any> | null | undefined) {
  if (user === null || user === undefined) return undefined;
  if (typeof user === "object") {
    return `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.username;
  }
  return String(user);
}

export default function FundGlDetail({ fundGl: initialFundGl }: FundGlDetailProps) {
  const router = useRouter();
  const { currentUser, hasPermission, roles } = usePermissions();
  const [fundGl, setFundGl] = useState<FundGl>(initialFundGl);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  const isCashier = roles.some((role) => role.toLowerCase() === "cashier");

  const createdById = userId(fundGl.created_by ?? fundGl.creator);
  const reviewedById = userId(fundGl.reviewed_by ?? fundGl.reviewer);

  const isCreator = !!currentUser?.id && String(currentUser.id) === String(createdById);
  const isReviewer = !!currentUser?.id && String(currentUser.id) === String(reviewedById);

  const isPendingReview = fundGl.status === "pending_review";
  const isPendingApproval = fundGl.status === "pending_approval";

  const canReview = isPendingReview && !isCashier && hasPermission("review_fund_gls") && !isCreator;
  const canApprove =
    isPendingApproval && !isCashier && hasPermission("approve_fund_gls") && !isCreator && !isReviewer;

  // Returns whether the action succeeded, so callers can decide whether to close their
  // modal — a failed attempt (e.g. wrong TOTP code) should leave the modal open instead
  // of silently closing and only showing a toast.
  async function runAction(key: string, action: () => Promise<any>, successMessage: string): Promise<boolean> {
    setActionPending(key);
    try {
      const result: any = await action();

      if (result?.status !== "success") {
        handleApiError(result, "That action failed.");
        return false;
      }

      toast.success(result.message || successMessage);

      const refreshed: any = await getFundGlAction(fundGl.id);
      if (refreshed?.status === "success" && refreshed.data) {
        setFundGl(refreshed.data);
      }

      router.refresh();
      return true;
    } catch (error) {
      console.error("Fund GL action failed:", error);
      toast.error("A network error occurred. Please try again.");
      return false;
    } finally {
      setActionPending(null);
    }
  }

  async function handleReview(totpCode: string) {
    const succeeded = await runAction(
      "review",
      () => reviewFundGlAction(fundGl.id, totpCode),
      "Fund GL transfer reviewed."
    );
    if (succeeded) setReviewModalOpen(false);
  }

  async function handleApprove(totpCode: string) {
    const succeeded = await runAction(
      "approve",
      () => approveFundGlAction(fundGl.id, totpCode),
      "Fund GL transfer approved and posted."
    );
    if (succeeded) setApproveModalOpen(false);
  }

  async function handleReject(reason: string, totpCode: string) {
    const succeeded = await runAction(
      "reject",
      () => rejectFundGlAction(fundGl.id, reason, totpCode),
      "Fund GL transfer rejected."
    );
    if (succeeded) setRejectModalOpen(false);
  }

  return (
    <>
      {/* HEADER */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          href="/postings/fund-gl"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#29478f] transition"
        >
          <ArrowLeft size={16} />
          Back to Fund GL
        </Link>

        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#29478f]">
              <BookOpen size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {fundGl.reference}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="rounded-full bg-slate-100 px-2.5 py-1">GL → GL</span>
                <StatusBadge status={fundGl.status} />
              </div>
            </div>
          </div>

          {(canReview || canApprove) && (
            <div className="flex flex-wrap items-center gap-2">
              <ActionButton
                label="Reject"
                icon={<XCircle size={14} />}
                pending={actionPending === "reject"}
                onClick={() => setRejectModalOpen(true)}
                className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
              />
              {canReview && (
                <ActionButton
                  label="Review"
                  icon={<CheckCircle2 size={14} />}
                  pending={actionPending === "review"}
                  onClick={() => setReviewModalOpen(true)}
                  className="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                />
              )}
              {canApprove && (
                <ActionButton
                  label="Approve"
                  icon={<CheckCircle2 size={14} />}
                  pending={actionPending === "approve"}
                  onClick={() => setApproveModalOpen(true)}
                  className="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                />
              )}
            </div>
          )}
        </div>
      </div>

      <TotpConfirmModal
        isOpen={reviewModalOpen}
        title="Review Fund GL Transfer"
        description={`Are you sure you have reviewed this transaction? Reviewing '${fundGl.reference}' will send it on for final approval.`}
        confirmLabel="Yes, Review"
        confirmTone="primary"
        pending={actionPending === "review"}
        onCancel={() => setReviewModalOpen(false)}
        onConfirm={handleReview}
      />

      <TotpConfirmModal
        isOpen={approveModalOpen}
        title="Approve Fund GL Transfer"
        description={`Approving '${fundGl.reference}' will post it to the ledger immediately and can't be undone.`}
        confirmLabel="Yes, Approve"
        confirmTone="primary"
        pending={actionPending === "approve"}
        onCancel={() => setApproveModalOpen(false)}
        onConfirm={handleApprove}
      />

      <ReasonTotpConfirmModal
        isOpen={rejectModalOpen}
        title="Reject Fund GL Transfer"
        description={`Provide a reason and your Google Authenticator code to reject '${fundGl.reference}'.`}
        confirmLabel="Reject Transfer"
        confirmTone="danger"
        pending={actionPending === "reject"}
        onCancel={() => setRejectModalOpen(false)}
        onConfirm={handleReject}
      />

      {/* PARTIES */}
      <Section title="Parties">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Source GL</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{glLabel(fundGl.source)}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Balance: <span className="text-slate-800">₦{formatCurrency(fundGl.source?.balance)}</span>
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Destination GL
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">{glLabel(fundGl.destination)}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Balance:{" "}
              <span className="text-slate-800">₦{formatCurrency(fundGl.destination?.balance)}</span>
            </p>
          </div>
        </div>
      </Section>

      {/* AMOUNTS */}
      <Section title="Amounts">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <Field label="Amount" value={`₦${formatCurrency(fundGl.amount)}`} />
        </div>
      </Section>

      {/* DETAILS */}
      <Section title="Details">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Transaction Reference" value={fundGl.transaction_reference} />
        </div>
        {fundGl.remarks && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Remarks</p>
            <p className="mt-1 text-sm text-slate-800">{fundGl.remarks}</p>
          </div>
        )}
      </Section>

      {/* RECORD HISTORY */}
      <Section title="Record History">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Created By" value={userLabel(fundGl.created_by ?? fundGl.creator)} />
          <Field label="Created Date" value={formatDateTime(fundGl.created_at)} />
          <Field label="Reviewed By" value={userLabel(fundGl.reviewed_by ?? fundGl.reviewer)} />
          <Field label="Reviewed Date" value={formatDateTime(fundGl.reviewed_at)} />
          <Field label="Approved By" value={userLabel(fundGl.approved_by ?? fundGl.approver)} />
          <Field label="Approved Date" value={formatDateTime(fundGl.approved_at)} />
          <Field label="Rejected By" value={userLabel(fundGl.rejected_by ?? fundGl.rejecter)} />
          <Field label="Rejected Date" value={formatDateTime(fundGl.rejected_at)} />
        </div>
        {fundGl.rejection_reason && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Rejection Reason
            </p>
            <p className="mt-1 text-sm text-slate-800">{fundGl.rejection_reason}</p>
          </div>
        )}
      </Section>
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
    pending_review: "bg-amber-100 text-amber-800 border border-amber-300",
    pending_approval: "bg-amber-100 text-amber-800 border border-amber-300",
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
