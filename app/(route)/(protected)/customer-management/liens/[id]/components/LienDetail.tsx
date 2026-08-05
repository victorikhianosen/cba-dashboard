"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Lock, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import {
  approveLienAction,
  rejectLienAction,
  releaseLienAction,
} from "@/actions/account-lien.action";
import TotpConfirmModal from "@/components/TotpConfirmModal";
import ReasonModal from "@/components/ReasonModal";
import ReasonTotpConfirmModal from "@/components/ReasonTotpConfirmModal";
import { handleApiError } from "@/lib/errors";
import { usePermissions } from "@/lib/permissions";

type Lien = Record<string, any>;

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

export default function LienDetail({ lien: initialLien }: { lien: Lien }) {
  const router = useRouter();
  const { currentUser, hasPermission } = usePermissions();
  const canApprove = hasPermission("approve_liens");

  const [lien, setLien] = useState<Lien>(initialLien);
  const [submitting, setSubmitting] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);

  const isOwnRequest = String(lien.created_by) === String(currentUser?.id);

  async function handleApprove(totpCode: string) {
    setSubmitting(true);
    try {
      const result: any = await approveLienAction(lien.id, totpCode);
      if (result?.status !== "success") {
        handleApiError(result, "Failed to approve lien.");
        return;
      }
      toast.success("Lien approved.");
      setLien(result.data ?? lien);
      setApproveOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to approve lien:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject(reason: string) {
    setSubmitting(true);
    try {
      const result: any = await rejectLienAction(lien.id, reason);
      if (result?.status !== "success") {
        handleApiError(result, "Failed to reject lien.");
        return;
      }
      toast.success("Lien rejected.");
      setLien(result.data ?? lien);
      setRejectOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to reject lien:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRelease(reason: string, totpCode: string) {
    setSubmitting(true);
    try {
      const result: any = await releaseLienAction(lien.id, reason, totpCode);
      if (result?.status !== "success") {
        handleApiError(result, "Failed to release lien.");
        return;
      }
      toast.success("Lien released.");
      setLien(result.data ?? lien);
      setReleaseOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to release lien:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          href="/customer-management/liens"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#29478f] transition"
        >
          <ArrowLeft size={16} />
          Back to Liens
        </Link>

        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#29478f]">
              <Lock size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{lien.reference}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="rounded-full bg-slate-100 px-2.5 py-1">{lien.account_number}</span>
                <StatusBadge status={lien.status} />
              </div>
            </div>
          </div>

          {canApprove && (
            <div className="flex flex-wrap items-center gap-2">
              {lien.status === "pending" && (
                <>
                  <ActionButton
                    label="Approve"
                    icon={<CheckCircle2 size={14} />}
                    disabled={isOwnRequest}
                    title={isOwnRequest ? "You cannot approve a lien you requested yourself" : undefined}
                    onClick={() => setApproveOpen(true)}
                    className="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  />
                  <ActionButton
                    label="Reject"
                    icon={<XCircle size={14} />}
                    onClick={() => setRejectOpen(true)}
                    className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                  />
                </>
              )}
              {lien.status === "active" && (
                <ActionButton
                  label="Release"
                  icon={<Lock size={14} />}
                  onClick={() => setReleaseOpen(true)}
                  className="border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
                />
              )}
            </div>
          )}
        </div>
      </div>

      <Section title="Lien Details">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Amount" value={`₦${formatCurrency(lien.amount)}`} />
          <Field label="Currency" value={lien.currency_code} />
          <Field
            label="Account"
            value={
              <Link
                href={`/customer-management/account/${lien.account_id}`}
                className="font-semibold text-[#29478f] hover:underline"
              >
                {lien.account_number}
              </Link>
            }
          />
          <Field label="Customer" value={lien.customer?.full_name} />
          <Field label="CIF Number" value={lien.customer?.cif_number} />
          <Field label="Reason" value={lien.reason} />
          <Field label="Remarks" value={lien.remarks} />
          <Field label="Expires At" value={formatDateTime(lien.expires_at)} />
        </div>
      </Section>

      <Section title="History">
        <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-4">
            <Field label="Requested By" value={lien.created_by_name} />
            <Field label="Requested At" value={formatDateTime(lien.created_at)} />
          </div>

          {(lien.status === "active" || lien.status === "released") && (
            <div className="space-y-4">
              <Field label="Approved By" value={lien.approved_by_name} />
              <Field label="Approved At" value={formatDateTime(lien.approved_at)} />
            </div>
          )}

          {lien.status === "rejected" && (
            <div className="space-y-4">
              <Field label="Rejected By" value={lien.rejected_by_name} />
              <Field label="Rejected At" value={formatDateTime(lien.rejected_at)} />
            </div>
          )}

          {lien.status === "released" && (
            <div className="space-y-4">
              <Field label="Released By" value={lien.release_by_name} />
              <Field label="Released At" value={formatDateTime(lien.released_at)} />
            </div>
          )}
        </div>

        {lien.status === "released" && (
          <div className="mt-6">
            <Field label="Release Reason" value={lien.release_reason} />
          </div>
        )}
      </Section>

      <TotpConfirmModal
        isOpen={approveOpen}
        title="Approve Lien"
        description={`Approve lien '${lien.reference}' for ₦${formatCurrency(lien.amount)}? This will set the funds aside immediately.`}
        confirmLabel="Yes, Approve"
        confirmTone="primary"
        pending={submitting}
        onCancel={() => setApproveOpen(false)}
        onConfirm={handleApprove}
      />

      <ReasonModal
        isOpen={rejectOpen}
        title="Reject Lien"
        description="Provide a reason for rejecting this lien request."
        confirmLabel="Reject Lien"
        confirmTone="danger"
        pending={submitting}
        onCancel={() => setRejectOpen(false)}
        onConfirm={handleReject}
      />

      <ReasonTotpConfirmModal
        isOpen={releaseOpen}
        title="Release Lien"
        description={`Provide a reason for releasing lien '${lien.reference}'. This will free the held funds immediately.`}
        confirmLabel="Release Lien"
        confirmTone="primary"
        pending={submitting}
        onCancel={() => setReleaseOpen(false)}
        onConfirm={handleRelease}
      />
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <div className="mt-5">{children}</div>
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
  onClick,
  className,
  disabled,
  title,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  className: string;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {icon}
      {label}
    </button>
  );
}
