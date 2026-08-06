"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileText,
  Mail,
  OctagonX,
  Phone,
  PlusCircle,
  Printer,
  Receipt,
  Send,
  Split,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  approveInvestmentAction,
  approveTopUpAction,
  emailInvestmentLetterAction,
  rejectInvestmentAction,
  rejectTopUpAction,
  requestPartialLiquidationAction,
  requestTopUpAction,
  terminateInvestmentAction,
} from "@/actions/investment.action";
import { getInvestmentTransactionsAction } from "@/actions/investment-transaction.action";
import {
  getInvestmentScheduleAction,
  getPreviousInvestmentScheduleAction,
} from "@/actions/investment-schedule.action";
import ApproveInvestmentModal from "@/components/ApproveInvestmentModal";
import ApproveInvestmentScheduleModal from "./ApproveInvestmentScheduleModal";
import ApproveTopUpModal from "./ApproveTopUpModal";
import RequestPartialLiquidationModal from "./RequestPartialLiquidationModal";
import RequestTopUpModal from "./RequestTopUpModal";
import TerminateInvestmentModal from "./TerminateInvestmentModal";
import { handleApiError } from "@/lib/errors";
import { toDisplayLabel } from "@/lib/format";
import { usePermissions } from "@/lib/permissions";

type Investment = Record<string, any>;

interface InvestmentDetailProps {
  investment: Investment;
}

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Rate columns are stored as decimal(19,6) on the backend (e.g. "10.000000"), so raw values
// need trimming to 2dp for display — "10.00%", not "10.000000%".
function formatPercent(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return undefined;
  return `${Number(value).toFixed(2)}%`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

// Day/month/year on top, time (if any) smaller underneath — used for schedule due/paid
// dates so "2026-08-02T00:00:00.000000Z" reads as "02 Aug 2026" instead of a raw ISO string.
function DateStack({ value }: { value: string | null | undefined }) {
  if (!value) return <span>—</span>;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return <span>{value}</span>;

  const day = date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <span className="flex flex-col">
      <span>{day}</span>
      <span className="text-xs font-normal text-slate-400">{time}</span>
    </span>
  );
}

const TABS = [
  { key: "details", label: "Investment Details", icon: TrendingUp },
  { key: "transactions", label: "Transactions", icon: Receipt },
  { key: "schedule", label: "Schedule", icon: CalendarClock },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function InvestmentDetail({ investment: initialInvestment }: InvestmentDetailProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentUser } = usePermissions();

  const [investment, setInvestment] = useState<Investment>(initialInvestment);
  const [activeTab, setActiveTabState] = useState<TabKey>(
    searchParams.get("tab") === "transactions"
      ? "transactions"
      : searchParams.get("tab") === "schedule"
        ? "schedule"
        : "details"
  );
  const [actionPending, setActionPending] = useState(false);
  const [emailingLetter, setEmailingLetter] = useState(false);
  const [letterMenuOpen, setLetterMenuOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [approveTopUpModalOpen, setApproveTopUpModalOpen] = useState(false);
  const [rejectTopUpModalOpen, setRejectTopUpModalOpen] = useState(false);
  const [terminateModalOpen, setTerminateModalOpen] = useState(false);
  const [partialLiquidationModalOpen, setPartialLiquidationModalOpen] = useState(false);

  const [transactions, setTransactions] = useState<Record<string, any>[]>([]);
  const [transactionsMeta, setTransactionsMeta] = useState<Record<string, any> | null>(null);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsLoaded, setTransactionsLoaded] = useState(false);

  const [schedule, setSchedule] = useState<Record<string, any>[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleLoaded, setScheduleLoaded] = useState(false);

  const [showPreviousSchedules, setShowPreviousSchedules] = useState(false);
  const [previousSchedule, setPreviousSchedule] = useState<Record<string, any>[]>([]);
  const [previousScheduleMeta, setPreviousScheduleMeta] = useState<Record<string, any> | null>(null);
  const [previousScheduleLoading, setPreviousScheduleLoading] = useState(false);
  const [previousScheduleLoaded, setPreviousScheduleLoaded] = useState(false);

  function setActiveTab(tab: TabKey) {
    setActiveTabState(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "details") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  useEffect(() => {
    if (activeTab === "transactions" && !transactionsLoaded) {
      fetchTransactions(1);
    }
    if (activeTab === "schedule" && !scheduleLoaded) {
      fetchSchedule();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function fetchTransactions(page: number) {
    setTransactionsLoading(true);
    try {
      const result: any = await getInvestmentTransactionsAction(investment.id, page);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to load investment transactions.");
        return;
      }

      setTransactions(Array.isArray(result.data) ? result.data : []);
      setTransactionsMeta(result.meta ?? null);
      setTransactionsLoaded(true);
    } catch (error) {
      console.error("Failed to load investment transactions:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setTransactionsLoading(false);
    }
  }

  async function fetchSchedule() {
    setScheduleLoading(true);
    try {
      const result: any = await getInvestmentScheduleAction(investment.id);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to load investment schedule.");
        return;
      }

      setSchedule(Array.isArray(result.data) ? result.data : []);
      setScheduleLoaded(true);
    } catch (error) {
      console.error("Failed to load investment schedule:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setScheduleLoading(false);
    }
  }

  // Deliberately separate and lazy — only called when "Previous Schedules" is expanded,
  // so a heavily topped-up investment doesn't download its whole history up front.
  async function fetchPreviousSchedule(page: number) {
    setPreviousScheduleLoading(true);
    try {
      const result: any = await getPreviousInvestmentScheduleAction(investment.id, page);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to load previous schedules.");
        return;
      }

      setPreviousSchedule(Array.isArray(result.data) ? result.data : []);
      setPreviousScheduleMeta(result.meta ?? null);
      setPreviousScheduleLoaded(true);
    } catch (error) {
      console.error("Failed to load previous schedules:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setPreviousScheduleLoading(false);
    }
  }

  function handleTogglePreviousSchedules() {
    setShowPreviousSchedules((open) => !open);
    if (!previousScheduleLoaded) {
      fetchPreviousSchedule(1);
    }
  }

  async function handleEmailLetter() {
    setEmailingLetter(true);
    try {
      const result: any = await emailInvestmentLetterAction(investment.id);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to email investment letter.");
        return;
      }

      toast.success(result.message || "Investment letter is being sent to the customer.");
    } catch (error) {
      console.error("Failed to email investment letter:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setEmailingLetter(false);
      setLetterMenuOpen(false);
    }
  }

  async function handleApprove(totpCode: string) {
    setActionPending(true);
    try {
      const result: any = await approveInvestmentAction(investment.id, totpCode);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to approve investment.");
        return;
      }

      toast.success(result.message || "Investment approved successfully.");
      setInvestment(result.data ?? { ...investment, status: "active" });
      setApproveModalOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to approve investment:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setActionPending(false);
    }
  }

  async function handleReject() {
    setActionPending(true);
    try {
      const result: any = await rejectInvestmentAction(investment.id);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to reject investment.");
        return;
      }

      toast.success(result.message || "Investment rejected.");
      setInvestment(result.data ?? { ...investment, status: "rejected" });
      setRejectModalOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to reject investment:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setActionPending(false);
    }
  }

  async function handleRequestTopUp(amount: string) {
    setActionPending(true);
    try {
      const result: any = await requestTopUpAction(investment.id, amount);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to request top-up.");
        return;
      }

      toast.success(result.message || "Top-up requested; awaiting approval.");
      setInvestment(result.data ?? investment);
      setTopUpModalOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to request top-up:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setActionPending(false);
    }
  }

  async function handleApproveTopUp(totpCode: string) {
    setActionPending(true);
    try {
      const result: any = await approveTopUpAction(investment.id, totpCode);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to approve top-up.");
        return;
      }

      toast.success(result.message || "Top-up approved and applied successfully.");
      setInvestment(result.data ?? investment);
      setApproveTopUpModalOpen(false);
      setScheduleLoaded(false);
      setPreviousScheduleLoaded(false);
      setShowPreviousSchedules(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to approve top-up:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setActionPending(false);
    }
  }

  async function handleRejectTopUp() {
    setActionPending(true);
    try {
      const result: any = await rejectTopUpAction(investment.id, "Top-up rejected by approver.");

      if (result?.status !== "success") {
        handleApiError(result, "Failed to reject top-up.");
        return;
      }

      toast.success(result.message || "Top-up rejected.");
      setInvestment(result.data ?? investment);
      setRejectTopUpModalOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to reject top-up:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setActionPending(false);
    }
  }

  async function handleRequestPartialLiquidation(amount: string, reason: string) {
    setActionPending(true);
    try {
      const result: any = await requestPartialLiquidationAction(investment.id, amount, reason);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to request partial liquidation.");
        return;
      }

      toast.success(result.message || "Partial liquidation requested; awaiting approval.");
      setPartialLiquidationModalOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to request partial liquidation:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setActionPending(false);
    }
  }

  async function handleTerminate(reason: string) {
    setActionPending(true);
    try {
      const result: any = await terminateInvestmentAction(investment.id, reason);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to terminate investment.");
        return;
      }

      toast.success(result.message || "Investment terminated successfully.");
      setInvestment(result.data ?? investment);
      setTerminateModalOpen(false);
      setScheduleLoaded(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to terminate investment:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setActionPending(false);
    }
  }

  const canTopUp =
    investment.status === "active" &&
    !investment.pending_topup_amount &&
    investment.investment_product?.allow_top_up;

  // Only an active investment can be terminated — enforced server-side too.
  const canTerminate =
    investment.status === "active" && investment.investment_product?.allow_early_liquidation;

  // Product-level allow_partial_withdrawal flag and "no pending request already open" are
  // enforced server-side (the show endpoint doesn't necessarily expose the product flag
  // client-side) — gate here just on status active, matching canTopUp, and surface the
  // backend's validation error on submit if the product/pending-request guard fails.
  const canPartialLiquidate = investment.status === "active";

  // Same maker-checker rule the backend enforces (and would 403 on otherwise) — hidden
  // here rather than shown-then-erroring, matching PostingManagement's isOwnPosting pattern.
  const isOwnInvestment =
    Boolean(currentUser?.id) && String(currentUser?.id) === String(investment.created_by);
  const isOwnTopUpRequest =
    Boolean(currentUser?.username) &&
    currentUser?.username === investment.pending_topup_requested_by;

  const currentScheduleVersion = schedule[0]?.version ?? 1;

  // investment.metadata holds { first_topup: {...}, second_topup: {...}, ... } — order is
  // investment.metadata.top_ups is a JSON *array* (not an object keyed by label) — MySQL's
  // JSON type doesn't reliably preserve key order for objects on repeated updates, but
  // array element order is preserved, so ordering here is just the array's own order.
  const topUpHistory: Record<string, any>[] = Array.isArray(investment.metadata?.top_ups)
    ? investment.metadata.top_ups
    : [];

  return (
    <>
      {/* HEADER */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          href="/investment-management/investment"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#29478f] transition"
        >
          <ArrowLeft size={16} />
          Back to Investments
        </Link>

        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#29478f]">
              <TrendingUp size={26} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {investment.account_number}
              </h1>

              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="rounded-full bg-slate-100 px-2.5 py-1">
                  {investment.investment_product?.name
                    ? toDisplayLabel(investment.investment_product.name)
                    : "—"}
                </span>
                <StatusBadge status={investment.status} />
              </div>

              <p className="mt-2 text-lg font-bold text-slate-900">
                ₦{formatCurrency(investment.current_principal ?? investment.principal_amount)}
                <span className="ml-1.5 text-xs font-semibold text-slate-500">Current Principal</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {investment.status === "pending" && !isOwnInvestment && (
              <>
                <ActionButton
                  label="Approve"
                  icon={<CheckCircle2 size={14} />}
                  onClick={() => setApproveModalOpen(true)}
                  className="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                />
                <ActionButton
                  label="Reject"
                  icon={<XCircle size={14} />}
                  onClick={() => setRejectModalOpen(true)}
                  className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                />
              </>
            )}

            {canTopUp && (
              <ActionButton
                label="Top Up"
                icon={<PlusCircle size={14} />}
                onClick={() => setTopUpModalOpen(true)}
                className="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
              />
            )}

            {canPartialLiquidate && (
              <ActionButton
                label="Partial Liquidation"
                icon={<Split size={14} />}
                onClick={() => setPartialLiquidationModalOpen(true)}
                className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
              />
            )}

            {canTerminate && (
              <ActionButton
                label="Terminate"
                icon={<OctagonX size={14} />}
                onClick={() => setTerminateModalOpen(true)}
                className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
              />
            )}

            {investment.pending_topup_amount && !isOwnTopUpRequest && (
              <>
                <ActionButton
                  label="Approve Top-Up"
                  icon={<CheckCircle2 size={14} />}
                  onClick={() => setApproveTopUpModalOpen(true)}
                  className="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                />
                <ActionButton
                  label="Reject Top-Up"
                  icon={<XCircle size={14} />}
                  onClick={() => setRejectTopUpModalOpen(true)}
                  className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                />
              </>
            )}

            {investment.status !== "pending" && (
              <InvestmentLetterMenu
                investmentId={investment.id}
                isOpen={letterMenuOpen}
                onToggle={() => setLetterMenuOpen((open) => !open)}
                onClose={() => setLetterMenuOpen(false)}
                onEmail={handleEmailLetter}
                emailing={emailingLetter}
              />
            )}
          </div>
        </div>

        {investment.pending_topup_amount && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Top-up of ₦{formatCurrency(investment.pending_topup_amount)} requested by{" "}
            {investment.pending_topup_requested_by ?? "—"} is awaiting approval.
            {isOwnTopUpRequest && " You requested this, so a different admin must approve it."}
          </div>
        )}
      </div>

      <ApproveInvestmentScheduleModal
        isOpen={approveModalOpen}
        investmentId={investment.id}
        accountNumber={investment.account_number}
        pending={actionPending}
        onCancel={() => setApproveModalOpen(false)}
        onConfirm={handleApprove}
      />

      <ApproveInvestmentModal
        isOpen={rejectModalOpen}
        mode="reject"
        accountNumber={investment.account_number}
        pending={actionPending}
        onCancel={() => setRejectModalOpen(false)}
        onConfirm={handleReject}
      />

      <RequestTopUpModal
        isOpen={topUpModalOpen}
        investmentId={investment.id}
        accountNumber={investment.account_number}
        pending={actionPending}
        onCancel={() => setTopUpModalOpen(false)}
        onConfirm={handleRequestTopUp}
      />

      <ApproveTopUpModal
        isOpen={approveTopUpModalOpen}
        investmentId={investment.id}
        accountNumber={investment.account_number}
        amount={investment.pending_topup_amount}
        pending={actionPending}
        onCancel={() => setApproveTopUpModalOpen(false)}
        onConfirm={handleApproveTopUp}
      />

      <ApproveInvestmentModal
        isOpen={rejectTopUpModalOpen}
        mode="reject"
        accountNumber={investment.account_number}
        pending={actionPending}
        onCancel={() => setRejectTopUpModalOpen(false)}
        onConfirm={handleRejectTopUp}
        title="Reject Top-Up"
        description={`This will discard the pending top-up request for investment ${investment.account_number}.`}
      />

      <RequestPartialLiquidationModal
        isOpen={partialLiquidationModalOpen}
        investmentId={investment.id}
        accountNumber={investment.account_number}
        currentPrincipal={investment.current_principal}
        minimumRetentionPercentage={investment.minimum_retention_percentage}
        pending={actionPending}
        onCancel={() => setPartialLiquidationModalOpen(false)}
        onConfirm={handleRequestPartialLiquidation}
      />

      <TerminateInvestmentModal
        isOpen={terminateModalOpen}
        accountNumber={investment.account_number}
        currentPrincipal={investment.current_principal}
        penaltyRate={investment.early_liquidation_penalty_rate}
        pending={actionPending}
        onCancel={() => setTerminateModalOpen(false)}
        onConfirm={handleTerminate}
      />

      {/* TABS */}
      <div className="mt-6 flex gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === key ? "bg-[#173673] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "details" && (
        <>
          {/* CUSTOMER */}
          <Section title="Customer">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="CIF Number" value={investment.customer?.cif_number} />
              <Field label="Full Name" value={investment.customer?.full_name} />
              <Field
                label="Email"
                value={investment.customer?.email}
                icon={<Mail size={14} className="text-slate-400" />}
              />
              <Field
                label="Phone"
                value={investment.customer?.phone}
                icon={<Phone size={14} className="text-slate-400" />}
              />
            </div>
          </Section>

          {/* FINANCIAL POSITION */}
          <Section title="Financial Position">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Principal Amount" value={`₦${formatCurrency(investment.principal_amount)}`} />
              <Field label="Current Principal" value={`₦${formatCurrency(investment.current_principal)}`} />
              <Field
                label="Total Liquidated"
                value={`₦${formatCurrency(investment.total_withdrawal_amount)}`}
              />
              <Field label="Maturity Value" value={`₦${formatCurrency(investment.maturity_value)}`} />
              <Field label="Net Interest Paid" value={`₦${formatCurrency(investment.net_interest_paid)}`} />
              <Field
                label="Total Interest Paid"
                value={`₦${formatCurrency(investment.total_interest_paid)}`}
              />
              <Field
                label="Outstanding Interest"
                value={`₦${formatCurrency(investment.outstanding_interest)}`}
              />
              <Field
                label="Total Fees Charged"
                value={`₦${formatCurrency(investment.total_fees_charged)}`}
              />
              <Field
                label="Total Penalties Charged"
                value={`₦${formatCurrency(investment.total_penalties_charged)}`}
              />
            </div>
          </Section>

          {/* TOP-UP HISTORY */}
          {topUpHistory.length > 0 && (
            <Section title="Top-Up History">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-225">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <Heading>#</Heading>
                      <Heading>Amount</Heading>
                      <Heading>Principal Before → After</Heading>
                      <Heading>Requested By</Heading>
                      <Heading>Requested At</Heading>
                      <Heading>Approved By</Heading>
                      <Heading>Approved At</Heading>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topUpHistory.map((entry, index) => (
                      <tr key={entry.label ?? index}>
                        <td className="px-3 py-3 text-sm font-semibold capitalize text-slate-700">
                          {(entry.label ?? `topup_${index + 1}`).replace("_topup", "")}
                        </td>
                        <td className="px-3 py-3 text-sm font-bold text-slate-900">
                          ₦{formatCurrency(entry.amount)}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-700">
                          ₦{formatCurrency(entry.principal_before)} → ₦
                          {formatCurrency(entry.principal_after)}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-700">
                          {entry.requested_by ?? "—"}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-700">
                          <DateStack value={entry.requested_at} />
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-700">
                          {entry.approved_by ?? "—"}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-700">
                          <DateStack value={entry.approved_at} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* INVESTMENT INFO */}
          <Section title="Investment Information">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Source Account" value={investment.source_account?.account_number} />
              <Field label="Interest Rate" value={formatPercent(investment.interest_rate)} />
              <Field
                label="Interest Posting Period"
                value={toDisplayLabel(investment.interest_posting_period)}
              />
              <Field
                label="Tenure"
                value={investment.tenure ? `${investment.tenure} days` : undefined}
              />
              <Field label="Auto Renew" value={investment.auto_renew ? "Yes" : "No"} />
              <Field
                label="Early Liquidation Lock Days"
                value={investment.early_liquidation_lock_days}
              />
              <Field
                label="Early Liquidation Penalty Rate"
                value={formatPercent(investment.early_liquidation_penalty_rate)}
              />
            </div>
          </Section>

          {/* SCHEDULE */}
          <Section title="Schedule">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Start Date" value={<DateStack value={investment.start_date} />} />
              <Field label="Maturity Date" value={<DateStack value={investment.maturity_date} />} />
              <Field
                label="Last Interest Payment"
                value={formatDateTime(investment.last_interest_payment_date)}
              />
              <Field
                label="Next Interest Payment"
                value={formatDateTime(investment.next_interest_payment_date)}
              />
              <Field label="Opened" value={formatDateTime(investment.created_at)} />
              <Field label="Last Updated" value={formatDateTime(investment.updated_at)} />
            </div>
          </Section>
        </>
      )}

      {activeTab === "transactions" && (
        <Section title="Transactions">
          {transactionsLoading && transactions.length === 0 ? (
            <p className="py-8 text-center text-sm font-medium text-slate-500">
              Loading transactions...
            </p>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center">
              <Receipt size={28} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-500">
                No transactions on this investment yet.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-225">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <Heading>Type</Heading>
                      <Heading>Amount</Heading>
                      <Heading>Principal Balance After</Heading>
                      <Heading>Posting Reference</Heading>
                      <Heading>Transaction Reference</Heading>
                      <Heading>Description</Heading>
                      <Heading>Created By</Heading>
                      <Heading>Date</Heading>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((txn) => (
                      <tr key={txn.id}>
                        <td className="px-3 py-3 text-sm">
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold capitalize text-[#29478f]">
                            {toDisplayLabel(txn.type)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm font-bold text-slate-900">
                          ₦{formatCurrency(txn.amount)}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-700">
                          ₦{formatCurrency(txn.principal_balance_after)}
                        </td>
                        <td className="px-3 py-3 text-sm">
                          {txn.posting_id && txn.posting_reference ? (
                            <Link
                              href={`/postings/${txn.posting_id}`}
                              className="font-semibold text-[#29478f] hover:underline"
                            >
                              {txn.posting_reference}
                            </Link>
                          ) : (
                            <span className="text-slate-700">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-700">
                          {txn.transaction_reference ?? "—"}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-700">{txn.description ?? "—"}</td>
                        <td className="px-3 py-3 text-sm text-slate-700">{txn.created_by ?? "—"}</td>
                        <td className="px-3 py-3 text-sm text-slate-700">
                          <DateStack value={txn.created_at} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {transactionsMeta && (
                <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium text-slate-600">
                    Showing {transactionsMeta.from ?? 0}-{transactionsMeta.to ?? 0} of{" "}
                    {transactionsMeta.total ?? transactions.length} transactions
                  </p>

                  {transactionsMeta.last_page > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fetchTransactions(transactionsMeta.current_page - 1)}
                        disabled={transactionsLoading || transactionsMeta.current_page <= 1}
                        className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 transition"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="px-3 text-sm font-semibold text-slate-700">
                        Page {transactionsMeta.current_page} of {transactionsMeta.last_page}
                      </span>
                      <button
                        type="button"
                        onClick={() => fetchTransactions(transactionsMeta.current_page + 1)}
                        disabled={
                          transactionsLoading ||
                          transactionsMeta.current_page >= transactionsMeta.last_page
                        }
                        className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 transition"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </Section>
      )}

      {activeTab === "schedule" && (
        <Section title="Schedule">
          {scheduleLoading && schedule.length === 0 ? (
            <p className="py-8 text-center text-sm font-medium text-slate-500">
              Loading schedule...
            </p>
          ) : schedule.length === 0 ? (
            <div className="py-12 text-center">
              <CalendarClock size={28} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-500">
                No schedule has been generated for this investment yet.
              </p>
            </div>
          ) : (
            <>
              {currentScheduleVersion > 1 && (
                <p className="mb-4 text-sm font-medium text-slate-500">
                  This investment was topped up — only the current schedule is shown below;
                  every earlier version is kept for reference under "Previous Schedules".
                </p>
              )}

              <div>
                <h3 className="mb-2 text-sm font-bold text-slate-700">
                  Current Schedule
                  {currentScheduleVersion > 1 && (
                    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                      Version {currentScheduleVersion}
                    </span>
                  )}
                </h3>
                <ScheduleTable rows={schedule} />
              </div>

              {currentScheduleVersion > 1 && (
                <div className="mt-6 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={handleTogglePreviousSchedules}
                    className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-[#173673]"
                  >
                    {showPreviousSchedules ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    Previous Schedules
                    {previousScheduleLoaded &&
                      ` (${previousScheduleMeta?.total ?? previousSchedule.length} installments)`}
                  </button>

                  {showPreviousSchedules && (
                    <>
                      {previousScheduleLoading && previousSchedule.length === 0 ? (
                        <p className="mt-3 py-6 text-center text-sm font-medium text-slate-500">
                          Loading previous schedules...
                        </p>
                      ) : (
                        <div className="mt-3 overflow-x-auto">
                          <table className="w-full min-w-225">
                            <thead>
                              <tr className="border-b border-slate-200">
                                <Heading>Version</Heading>
                                <Heading>#</Heading>
                                <Heading>Due Date</Heading>
                                <Heading>Expected Interest</Heading>
                                <Heading>Paid Amount</Heading>
                                <Heading>Status</Heading>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {previousSchedule.map((row) => (
                                <tr key={row.id} className="text-slate-500">
                                  <td className="px-3 py-2.5 text-sm font-semibold">v{row.version}</td>
                                  <td className="px-3 py-2.5 text-sm">{row.installment_number}</td>
                                  <td className="px-3 py-2.5 text-sm">
                                    <DateStack value={row.due_date} />
                                  </td>
                                  <td className="px-3 py-2.5 text-sm">
                                    ₦{formatCurrency(row.expected_interest_amount)}
                                  </td>
                                  <td className="px-3 py-2.5 text-sm">
                                    ₦{formatCurrency(row.paid_amount)}
                                  </td>
                                  <td className="px-3 py-2.5 text-sm">
                                    <ScheduleStatusBadge status={row.status} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {previousScheduleMeta && previousScheduleMeta.last_page > 1 && (
                            <div className="mt-3 flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => fetchPreviousSchedule(previousScheduleMeta.current_page - 1)}
                                disabled={previousScheduleLoading || previousScheduleMeta.current_page <= 1}
                                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 transition"
                              >
                                <ChevronLeft size={16} />
                              </button>
                              <span className="px-3 text-sm font-semibold text-slate-700">
                                Page {previousScheduleMeta.current_page} of {previousScheduleMeta.last_page}
                              </span>
                              <button
                                type="button"
                                onClick={() => fetchPreviousSchedule(previousScheduleMeta.current_page + 1)}
                                disabled={
                                  previousScheduleLoading ||
                                  previousScheduleMeta.current_page >= previousScheduleMeta.last_page
                                }
                                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 transition"
                              >
                                <ChevronRight size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </Section>
      )}
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

function Field({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-800">
        {icon}
        {value || "—"}
      </p>
    </div>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return (
    <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
      {children}
    </th>
  );
}

function ScheduleTable({ rows }: { rows: Record<string, any>[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-175">
        <thead>
          <tr className="border-b border-slate-200">
            <Heading>#</Heading>
            <Heading>Due Date</Heading>
            <Heading>Opening Balance</Heading>
            <Heading>Expected Interest</Heading>
            <Heading>Closing Balance</Heading>
            <Heading>Paid Amount</Heading>
            <Heading>Paid Date</Heading>
            <Heading>Status</Heading>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-3 py-3 text-sm font-semibold text-slate-700">
                {row.installment_number}
              </td>
              <td className="px-3 py-3 text-sm text-slate-700">
                <DateStack value={row.due_date} />
              </td>
              <td className="px-3 py-3 text-sm text-slate-700">
                ₦{formatCurrency(row.opening_principal_balance)}
              </td>
              <td className="px-3 py-3 text-sm font-bold text-slate-900">
                ₦{formatCurrency(row.expected_interest_amount)}
              </td>
              <td className="px-3 py-3 text-sm text-slate-700">
                ₦{formatCurrency(row.closing_principal_balance)}
              </td>
              <td className="px-3 py-3 text-sm text-slate-700">
                ₦{formatCurrency(row.paid_amount)}
              </td>
              <td className="px-3 py-3 text-sm text-slate-700">
                <DateStack value={row.paid_date} />
              </td>
              <td className="px-3 py-3 text-sm">
                <ScheduleStatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InvestmentLetterMenu({
  investmentId,
  isOpen,
  onToggle,
  onClose,
  onEmail,
  emailing,
}: {
  investmentId: number | string;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onEmail: () => void;
  emailing: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleOutsideClick(event: MouseEvent) {
      if (containerRef.current?.contains(event.target as Node)) return;
      onClose();
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen, onClose]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 ${
          emailing ? "pointer-events-none opacity-50" : ""
        }`}
      >
        <FileText size={14} />
        Investment Letter
        <ChevronDown size={14} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          <a
            href={`/api/export?endpoint=${encodeURIComponent(`/admin/investments/${investmentId}/letter`)}`}
            onClick={onClose}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            <Printer size={14} />
            Print
          </a>
          <button
            type="button"
            onClick={onEmail}
            disabled={emailing}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
          >
            <Send size={14} />
            {emailing ? "Sending..." : "Email"}
          </button>
        </div>
      )}
    </div>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  className,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${className}`}
    >
      {icon}
      {label}
    </button>
  );
}

function ScheduleStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border border-amber-300",
    paid: "bg-green-100 text-green-800 border border-green-300",
    partial: "bg-sky-100 text-sky-800 border border-sky-300",
    missed: "bg-red-100 text-red-800 border border-red-300",
    superseded: "bg-slate-200 text-slate-600 border border-slate-300",
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-100 text-green-800 border border-green-300",
    pending: "bg-amber-100 text-amber-800 border border-amber-300",
    rejected: "bg-red-100 text-red-800 border border-red-300",
    matured: "bg-sky-100 text-sky-800 border border-sky-300",
    liquidated: "bg-slate-200 text-slate-700 border border-slate-300",
    closed: "bg-red-100 text-red-800 border border-red-300",
  };

  return (
    <span
      className={`mt-0.5 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
        styles[status] || "bg-slate-100 text-slate-700 border border-slate-300"
      }`}
    >
      {status ? toDisplayLabel(status) : "—"}
    </span>
  );
}
