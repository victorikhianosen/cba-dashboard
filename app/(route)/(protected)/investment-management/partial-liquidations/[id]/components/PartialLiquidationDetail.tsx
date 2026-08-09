"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import {
  approvePartialLiquidationAction,
  getPartialLiquidationAction,
  rejectPartialLiquidationAction,
} from "@/actions/investment.action";
import ReasonModal from "@/components/ReasonModal";
import { handleApiError } from "@/lib/errors";
import { toDisplayLabel } from "@/lib/format";
import { usePermissions } from "@/lib/permissions";
import ApprovePartialLiquidationModal from "../../components/ApprovePartialLiquidationModal";

type Liquidation = Record<string, any>;

interface PartialLiquidationDetailProps {
  initialLiquidation: Liquidation | null;
  liquidationId: string;
}

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function userLabel(
  user: Record<string, any> | null | undefined,
  fallback: any,
) {
  if (user) {
    const name = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
    return user.username
      ? `${user.username}${name ? ` (${name})` : ""}`
      : name || fallback;
  }
  return fallback ?? "—";
}

// Single-record view — approve/reject happen here, not from the list table, so a checker
// always reviews the full request (schedule impact included) before acting on it.
export default function PartialLiquidationDetail({
  initialLiquidation,
  liquidationId,
}: PartialLiquidationDetailProps) {
  const router = useRouter();
  const { currentUser, hasPermission } = usePermissions();

  const [liquidation, setLiquidation] = useState<Liquidation | null>(
    initialLiquidation,
  );
  const [loading, setLoading] = useState(!initialLiquidation);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [actionPending, setActionPending] = useState(false);

  async function refresh() {
    setLoading(true);
    const result: any = await getPartialLiquidationAction(liquidationId);
    if (result?.status === "success") {
      setLiquidation(result.data);
    } else {
      handleApiError(result, "Failed to load partial liquidation request.");
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!initialLiquidation) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !liquidation) {
    return (
      <p className="py-16 text-center text-sm font-medium text-slate-500">
        Loading...
      </p>
    );
  }

  if (!liquidation) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm font-medium text-slate-500">
          Partial liquidation request not found.
        </p>
        <button
          type="button"
          onClick={() =>
            router.push("/investment-management/partial-liquidations")
          }
          className="mt-4 text-sm font-semibold text-[#173673] hover:underline"
        >
          Back to Partial Liquidations
        </button>
      </div>
    );
  }

  const isPending = liquidation.status === "pending";
  const isOwnRequest =
    Boolean(currentUser?.username) &&
    currentUser?.username === liquidation.requester?.username;
  const canAct =
    isPending && hasPermission("approve_investments") && !isOwnRequest;

  async function handleApprove(totpCode: string) {
    setActionPending(true);
    const result: any = await approvePartialLiquidationAction(
      liquidationId,
      totpCode,
    );

    if (result?.status !== "success") {
      handleApiError(result, "Failed to approve partial liquidation.");
      setActionPending(false);
      return;
    }

    toast.success(
      result.message ||
        "Partial liquidation approved and applied successfully.",
    );
    setApproveModalOpen(false);
    refresh();

    setActionPending(false);
  }

  async function handleReject(reason: string) {
    setActionPending(true);
    const result: any = await rejectPartialLiquidationAction(
      liquidationId,
      reason,
    );

    if (result?.status !== "success") {
      handleApiError(result, "Failed to reject partial liquidation.");
      setActionPending(false);
      return;
    }

    toast.success(result.message || "Partial liquidation rejected.");
    setRejectModalOpen(false);
    refresh();

    setActionPending(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() =>
          router.push("/investment-management/partial-liquidations")
        }
        className="mb-5 flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft size={16} />
        Back to Partial Liquidations
      </button>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {liquidation.reference}
              </h1>
              <StatusBadge status={liquidation.status} />
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Investment{" "}
              {liquidation.investment_id ? (
                <Link
                  href={`/investment-management/investment/${liquidation.investment_id}`}
                  className="font-semibold text-[#173673] hover:underline"
                >
                  {liquidation.investment?.account_number ?? "—"}
                </Link>
              ) : (
                (liquidation.investment?.account_number ?? "—")
              )}
              {liquidation.investment?.customer?.name
                ? ` · ${liquidation.investment.customer.name}`
                : ""}
            </p>
          </div>

          {canAct && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRejectModalOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
              >
                <XCircle size={16} />
                Reject
              </button>
              <button
                type="button"
                onClick={() => setApproveModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-[#173673] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#10295c]"
              >
                <CheckCircle2 size={16} />
                Approve
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <DetailField
            label="Amount"
            value={`₦${formatCurrency(liquidation.amount)}`}
          />
          <DetailField
            label="Investment Current Principal"
            value={`₦${formatCurrency(liquidation.investment?.current_principal)}`}
          />
          <DetailField label="Reason" value={liquidation.reason} />

          <DetailField
            label="Requested By"
            value={userLabel(liquidation.requester, liquidation.requested_by)}
          />
          <DetailField
            label="Requested At"
            value={formatDateTime(liquidation.requested_at)}
          />

          {liquidation.status !== "pending" && (
            <>
              {liquidation.approver && (
                <DetailField
                  label="Approved By"
                  value={userLabel(
                    liquidation.approver,
                    liquidation.approved_by,
                  )}
                />
              )}
              {liquidation.approved_at && (
                <DetailField
                  label="Approved At"
                  value={formatDateTime(liquidation.approved_at)}
                />
              )}
              {liquidation.transaction_reference && (
                <DetailField
                  label="Transaction Reference"
                  value={liquidation.transaction_reference}
                />
              )}
              {liquidation.rejecter && (
                <DetailField
                  label="Rejected By"
                  value={userLabel(
                    liquidation.rejecter,
                    liquidation.rejected_by,
                  )}
                />
              )}
              {liquidation.rejected_at && (
                <DetailField
                  label="Rejected At"
                  value={formatDateTime(liquidation.rejected_at)}
                />
              )}
              {liquidation.rejection_reason && (
                <DetailField
                  label="Rejection Reason"
                  value={liquidation.rejection_reason}
                />
              )}
            </>
          )}
        </div>
      </div>

      <ApprovePartialLiquidationModal
        isOpen={approveModalOpen}
        liquidation={liquidation}
        pending={actionPending}
        onCancel={() => setApproveModalOpen(false)}
        onConfirm={handleApprove}
      />

      <ReasonModal
        isOpen={rejectModalOpen}
        title="Reject Partial Liquidation"
        description={`This will reject the partial liquidation request of ₦${formatCurrency(
          liquidation.amount,
        )} for investment ${liquidation.investment?.account_number ?? liquidation.reference}.`}
        confirmLabel="Reject Request"
        confirmTone="danger"
        pending={actionPending}
        onCancel={() => setRejectModalOpen(false)}
        onConfirm={handleReject}
      />
    </>
  );
}

function DetailField({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-800">
        {value ?? "—"}
      </p>
    </div>
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
      {toDisplayLabel(status) || "—"}
    </span>
  );
}
