"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HandCoins,
  Mail,
  Phone,
  Receipt,
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  approveLoanAction,
  getLoanScheduleAction,
  getLoanTransactionsAction,
  rejectLoanAction,
  repayLoanAction,
} from "@/actions/loan.action";
import { handleApiError } from "@/lib/errors";
import { toDisplayLabel } from "@/lib/format";
import { usePermissions } from "@/lib/permissions";
import { NplBadge, StatusBadge } from "../../components/LoanManagement";
import ApproveLoanModal from "./ApproveLoanModal";
import RejectLoanModal from "./RejectLoanModal";
import RepayLoanModal from "./RepayLoanModal";

type Loan = Record<string, any>;

interface LoanDetailProps {
  loan: Loan;
}

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

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

function DateStack({ value }: { value: string | null | undefined }) {
  if (!value) return <span>—</span>;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return <span>{value}</span>;

  const day = date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <span className="flex flex-col">
      <span>{day}</span>
      <span className="text-xs font-normal text-slate-400">{time}</span>
    </span>
  );
}

const TABS = [
  { key: "details", label: "Loan Details", icon: HandCoins },
  { key: "schedule", label: "Schedule", icon: CalendarClock },
  { key: "transactions", label: "Transactions", icon: Receipt },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const TRANSACTION_TYPE_STYLES: Record<string, string> = {
  disbursement: "bg-blue-50 text-blue-700",
  repayment_principal: "bg-emerald-50 text-emerald-700",
  repayment_interest: "bg-emerald-50 text-emerald-700",
  repayment_fee: "bg-emerald-50 text-emerald-700",
  repayment_penalty: "bg-emerald-50 text-emerald-700",
  fee_charge: "bg-amber-50 text-amber-700",
  penalty_accrual: "bg-amber-50 text-amber-700",
  penalty_charge: "bg-amber-50 text-amber-700",
  write_off: "bg-red-50 text-red-700",
  restructure: "bg-slate-100 text-slate-700",
  overpayment: "bg-sky-50 text-sky-700",
};

export default function LoanDetail({ loan: initialLoan }: LoanDetailProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { hasPermission } = usePermissions();

  const [loan, setLoan] = useState<Loan>(initialLoan);
  const [activeTab, setActiveTabState] = useState<TabKey>(
    searchParams.get("tab") === "schedule"
      ? "schedule"
      : searchParams.get("tab") === "transactions"
        ? "transactions"
        : "details",
  );

  const [actionPending, setActionPending] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [repayModalOpen, setRepayModalOpen] = useState(false);

  const [schedule, setSchedule] = useState<Record<string, any>[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleLoaded, setScheduleLoaded] = useState(false);

  const [transactions, setTransactions] = useState<Record<string, any>[]>([]);
  const [transactionsMeta, setTransactionsMeta] = useState<Record<string, any> | null>(null);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsLoaded, setTransactionsLoaded] = useState(false);

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
    if (activeTab === "schedule" && !scheduleLoaded) {
      fetchSchedule();
    }
    if (activeTab === "transactions" && !transactionsLoaded) {
      fetchTransactions(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function fetchSchedule() {
    setScheduleLoading(true);
    const result: any = await getLoanScheduleAction(loan.id);

    if (result?.status !== "success") {
      handleApiError(result, "Failed to load loan schedule.");
      setScheduleLoading(false);
      return;
    }

    setSchedule(Array.isArray(result.data) ? result.data : []);
    setScheduleLoaded(true);
    setScheduleLoading(false);
  }

  async function fetchTransactions(page: number) {
    setTransactionsLoading(true);
    const result: any = await getLoanTransactionsAction(loan.id, page);

    if (result?.status !== "success") {
      handleApiError(result, "Failed to load loan transactions.");
      setTransactionsLoading(false);
      return;
    }

    setTransactions(Array.isArray(result.data) ? result.data : []);
    setTransactionsMeta(result.meta ?? null);
    setTransactionsLoaded(true);
    setTransactionsLoading(false);
  }

  async function handleApprove(totpCode: string) {
    setActionPending(true);
    const result: any = await approveLoanAction(loan.id, totpCode);

    if (result?.status !== "success") {
      handleApiError(result, "Failed to approve loan.");
      setActionPending(false);
      return;
    }

    toast.success(result.message || "Loan approved and disbursed successfully.");
    setLoan(result.data ?? { ...loan, status: "active" });
    setApproveModalOpen(false);
    router.refresh();

    setActionPending(false);
  }

  async function handleReject(reason: string) {
    setActionPending(true);
    const result: any = await rejectLoanAction(loan.id, reason);

    if (result?.status !== "success") {
      handleApiError(result, "Failed to reject loan.");
      setActionPending(false);
      return;
    }

    toast.success(result.message || "Loan rejected.");
    setLoan(result.data ?? { ...loan, status: "rejected" });
    setRejectModalOpen(false);
    router.refresh();

    setActionPending(false);
  }

  async function handleRepay(
    data: { amount: string; funding_account_id: string; description?: string },
    totpCode: string,
  ) {
    setActionPending(true);
    const result: any = await repayLoanAction(loan.id, data, totpCode);

    if (result?.status !== "success") {
      handleApiError(result, "Failed to repay loan.");
      setActionPending(false);
      return;
    }

    toast.success(result.message || "Repayment applied successfully.");
    setLoan(result.data?.loan ?? loan);
    setRepayModalOpen(false);
    setScheduleLoaded(false);
    setTransactionsLoaded(false);
    router.refresh();

    setActionPending(false);
  }

  const canApprove = loan.status === "pending" && hasPermission("approve_loans");
  const canReject = loan.status === "pending" && hasPermission("approve_loans");
  const canRepay = loan.status === "active" && hasPermission("repay_loans");

  return (
    <>
      {/* HEADER */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          href="/loan-management/loan"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#29478f] transition"
        >
          <ArrowLeft size={16} />
          Back to Loans
        </Link>

        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#29478f]">
              <HandCoins size={26} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {loan.account_number}
              </h1>

              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="rounded-full bg-slate-100 px-2.5 py-1">
                  {loan.loan_product?.name ? toDisplayLabel(loan.loan_product.name) : "—"}
                </span>
                <StatusBadge status={loan.status} />
                <NplBadge status={loan.npl_classification} />
              </div>

              <p className="mt-2 text-lg font-bold text-slate-900">
                ₦{formatCurrency(loan.outstanding_principal)}
                <span className="ml-1.5 text-xs font-semibold text-slate-500">
                  Outstanding Principal
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canApprove && (
              <ActionButton
                label="Approve"
                icon={<CheckCircle2 size={14} />}
                onClick={() => setApproveModalOpen(true)}
                className="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              />
            )}
            {canReject && (
              <ActionButton
                label="Reject"
                icon={<XCircle size={14} />}
                onClick={() => setRejectModalOpen(true)}
                className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
              />
            )}
            {canRepay && (
              <ActionButton
                label="Repay"
                icon={<HandCoins size={14} />}
                onClick={() => setRepayModalOpen(true)}
                className="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
              />
            )}
          </div>
        </div>
      </div>

      <ApproveLoanModal
        isOpen={approveModalOpen}
        accountNumber={loan.account_number}
        principalAmount={loan.principal_amount}
        productName={loan.loan_product?.name ? toDisplayLabel(loan.loan_product.name) : undefined}
        disbursementAccountNumber={loan.disbursement_account?.account_number}
        pending={actionPending}
        onCancel={() => setApproveModalOpen(false)}
        onConfirm={handleApprove}
      />

      <RejectLoanModal
        isOpen={rejectModalOpen}
        accountNumber={loan.account_number}
        pending={actionPending}
        onCancel={() => setRejectModalOpen(false)}
        onConfirm={handleReject}
      />

      <RepayLoanModal
        isOpen={repayModalOpen}
        loanId={loan.id}
        accountNumber={loan.account_number}
        pending={actionPending}
        onCancel={() => setRepayModalOpen(false)}
        onConfirm={handleRepay}
      />

      {/* TABS */}
      <div className="mt-6 flex gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === key
                ? "bg-[#173673] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "details" && (
        <>
          <Section title="Customer">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="CIF Number" value={loan.customer?.cif_number} />
              <Field label="Full Name" value={loan.customer?.full_name} />
              <Field
                label="Email"
                value={loan.customer?.email}
                icon={<Mail size={14} className="text-slate-400" />}
              />
              <Field
                label="Phone"
                value={loan.customer?.phone}
                icon={<Phone size={14} className="text-slate-400" />}
              />
            </div>
          </Section>

          <Section title="Financial Position">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Principal Amount" value={`₦${formatCurrency(loan.principal_amount)}`} />
              <Field
                label="Outstanding Principal"
                value={`₦${formatCurrency(loan.outstanding_principal)}`}
              />
              <Field
                label="Outstanding Interest"
                value={`₦${formatCurrency(loan.outstanding_interest)}`}
              />
              <Field
                label="Total Principal Disbursed"
                value={`₦${formatCurrency(loan.total_principal_disbursed)}`}
              />
              <Field
                label="Total Principal Paid"
                value={`₦${formatCurrency(loan.total_principal_paid)}`}
              />
              <Field
                label="Total Interest Paid"
                value={`₦${formatCurrency(loan.total_interest_paid)}`}
              />
              <Field
                label="Total Fees Charged"
                value={`₦${formatCurrency(loan.total_fees_charged)}`}
              />
              <Field label="Total Fees Paid" value={`₦${formatCurrency(loan.total_fees_paid)}`} />
              <Field
                label="Total Penalties Charged"
                value={`₦${formatCurrency(loan.total_penalties_charged)}`}
              />
              <Field
                label="Total Penalties Paid"
                value={`₦${formatCurrency(loan.total_penalties_paid)}`}
              />
              <Field
                label="Overpayment Balance"
                value={`₦${formatCurrency(loan.overpayment_balance)}`}
              />
              <Field label="Days in Arrears" value={loan.days_in_arrears} />
            </div>
          </Section>

          <Section title="Loan Terms">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field
                label="Disbursement Account"
                value={loan.disbursement_account?.account_number}
              />
              <Field label="Interest Rate" value={formatPercent(loan.interest_rate)} />
              <Field
                label="Interest Rate Frequency"
                value={toDisplayLabel(loan.interest_rate_frequency_type)}
              />
              <Field label="Interest Method" value={toDisplayLabel(loan.interest_method)} />
              <Field
                label="Interest Calculation Period"
                value={toDisplayLabel(loan.interest_calculation_period_type)}
              />
              <Field
                label="Repayment Frequency"
                value={
                  loan.repayment_every && loan.repayment_frequency_type
                    ? `Every ${loan.repayment_every} ${toDisplayLabel(loan.repayment_frequency_type)}`
                    : undefined
                }
              />
              <Field label="Number of Repayments" value={loan.number_of_repayments} />
              <Field
                label="Amortization Method"
                value={toDisplayLabel(loan.amortization_method)}
              />
              <Field label="Penalty Interest Rate" value={formatPercent(loan.penalty_interest_rate)} />
              <Field
                label="Arrears Tolerance"
                value={`₦${formatCurrency(loan.arrears_tolerance_amount)}`}
              />
            </div>
          </Section>

          <Section title="Schedule Overview">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Start Date" value={<DateStack value={loan.start_date} />} />
              <Field label="Maturity Date" value={<DateStack value={loan.maturity_date} />} />
              <Field label="Next Due Date" value={<DateStack value={loan.next_due_date} />} />
              <Field
                label="Last Repayment Date"
                value={<DateStack value={loan.last_repayment_date} />}
              />
              <Field label="Booked By" value={loan.created_by_name ?? loan.created_by} />
              <Field label="Approved By" value={loan.approved_by_name ?? loan.approved_by} />
              <Field label="Approved At" value={formatDateTime(loan.approved_at)} />
              <Field label="Booked" value={formatDateTime(loan.created_at)} />
              <Field label="Last Updated" value={formatDateTime(loan.updated_at)} />
            </div>
          </Section>
        </>
      )}

      {activeTab === "schedule" && (
        <Section title="Amortization Schedule">
          {scheduleLoading && schedule.length === 0 ? (
            <p className="py-8 text-center text-sm font-medium text-slate-500">
              Loading schedule...
            </p>
          ) : schedule.length === 0 ? (
            <div className="py-12 text-center">
              <CalendarClock size={28} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-500">
                No schedule has been generated for this loan yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-225">
                <thead>
                  <tr className="border-b border-slate-200">
                    <Heading>#</Heading>
                    <Heading>Due Date</Heading>
                    <Heading>Opening Balance</Heading>
                    <Heading>Principal Due</Heading>
                    <Heading>Interest Due</Heading>
                    <Heading>Penalty Due</Heading>
                    <Heading>Fee Due</Heading>
                    <Heading>Closing Balance</Heading>
                    <Heading>Paid Date</Heading>
                    <Heading>Status</Heading>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schedule.map((row) => {
                    const isOverdue =
                      row.status !== "paid" &&
                      row.due_date &&
                      new Date(row.due_date).getTime() < Date.now();

                    return (
                      <tr key={row.id} className={isOverdue ? "bg-red-50/60" : undefined}>
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
                          ₦{formatCurrency(row.principal_due)}
                        </td>
                        <td className="px-3 py-3 text-sm font-bold text-slate-900">
                          ₦{formatCurrency(row.interest_due)}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-700">
                          ₦{formatCurrency(row.penalty_due)}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-700">
                          ₦{formatCurrency(row.fee_due)}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-700">
                          ₦{formatCurrency(row.closing_principal_balance)}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-700">
                          <DateStack value={row.paid_date} />
                        </td>
                        <td className="px-3 py-3 text-sm">
                          <ScheduleStatusBadge status={row.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>
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
                No transactions on this loan yet.
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
                      <Heading>Outstanding Principal After</Heading>
                      <Heading>Reference</Heading>
                      <Heading>Description</Heading>
                      <Heading>Created By</Heading>
                      <Heading>Date</Heading>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((txn) => (
                      <tr key={txn.id}>
                        <td className="px-3 py-3 text-sm">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-bold capitalize ${
                              TRANSACTION_TYPE_STYLES[txn.type] ?? "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {toDisplayLabel(txn.type)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm font-bold text-slate-900">
                          ₦{formatCurrency(txn.amount)}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-700">
                          ₦{formatCurrency(txn.outstanding_principal_after)}
                        </td>
                        <td className="px-3 py-3 text-sm">
                          {txn.reference || txn.transaction_reference ? (
                            <div className="flex flex-col gap-0.5">
                              {txn.reference && (
                                <Link
                                  href={`/postings/${txn.posting_id}`}
                                  className="font-semibold text-[#29478f] hover:underline"
                                >
                                  {txn.reference}
                                </Link>
                              )}
                              {txn.transaction_reference && (
                                <span className="text-xs text-slate-500">{txn.transaction_reference}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-700">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-700">
                          {txn.description ?? "—"}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-700">
                          {txn.created_by_name ?? txn.created_by ?? "—"}
                        </td>
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

function ScheduleStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border border-amber-300",
    paid: "bg-green-100 text-green-800 border border-green-300",
    partial: "bg-sky-100 text-sky-800 border border-sky-300",
    missed: "bg-red-100 text-red-800 border border-red-300",
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
