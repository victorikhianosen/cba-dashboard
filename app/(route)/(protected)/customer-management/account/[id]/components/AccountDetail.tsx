"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Landmark,
  Lock,
  Mail,
  Phone,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { getAccountLiensAction, releaseLienAction } from "@/actions/account-lien.action";
import {
  emailAccountStatementAction,
  placeLienAction,
  toggleAccountPncAction,
  toggleAccountPndAction,
  updateAccountStatusAction,
} from "@/actions/account.action";
import { getTransactionsAction } from "@/actions/transaction.action";
import ActionMenu from "@/components/ActionMenu";
import AmountInput from "@/components/AmountInput";
import ExportDropdown from "@/components/ExportDropdown";
import ReasonTotpConfirmModal from "@/components/ReasonTotpConfirmModal";
import { usePermissions } from "@/lib/permissions";
import { handleApiError } from "@/lib/errors";
import { toDisplayLabel } from "@/lib/format";

const TRANSACTION_STATUSES = ["pending", "completed", "failed", "reversed"];

type Account = Record<string, any>;

interface AccountDetailProps {
  account: Account;
}

// "pending" is excluded — it's only the initial state an account is opened in,
// never something you transition back into.
const ACCOUNT_STATUSES = [
  "active",
  "inactive",
  "dormant",
  "frozen",
  "restricted",
  "blocked",
  "suspended",
  "closed",
  "deceased_hold",
  "escheated",
];

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

const TABS = [
  { key: "details", label: "Account Details", icon: Landmark },
  { key: "liens", label: "Liens", icon: Lock },
  { key: "transactions", label: "Transactions", icon: Receipt },
] as const;

const LIEN_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  active: "bg-blue-50 text-blue-700 border-blue-200",
  released: "bg-slate-100 text-slate-600 border-slate-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  expired: "bg-slate-100 text-slate-600 border-slate-200",
};

function LienStatusBadge({ status }: { status: string }) {
  const style = LIEN_STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${style}`}>
      {status}
    </span>
  );
}

type TabKey = (typeof TABS)[number]["key"];

export default function AccountDetail({ account: initialAccount }: AccountDetailProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [account, setAccount] = useState<Account>(initialAccount);
  // Read from the URL so the tab survives a reload instead of always resetting to "details".
  const [activeTab, setActiveTabState] = useState<TabKey>(() => {
    const tab = searchParams.get("tab");
    return tab === "transactions" || tab === "liens" ? tab : "details";
  });
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [statementMenuOpen, setStatementMenuOpen] = useState(false);
  const [emailingStatement, setEmailingStatement] = useState(false);
  const [statusChoice, setStatusChoice] = useState(initialAccount.status ?? "");
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  const { currentUser } = usePermissions();

  const [lienModalOpen, setLienModalOpen] = useState(false);
  const [lienAmount, setLienAmount] = useState("");
  const [lienReason, setLienReason] = useState("");

  const [liens, setLiens] = useState<Record<string, any>[]>([]);
  const [liensLoading, setLiensLoading] = useState(false);
  const [liensLoaded, setLiensLoaded] = useState(false);
  const [releaseTarget, setReleaseTarget] = useState<Record<string, any> | null>(null);

  const [transactions, setTransactions] = useState<Record<string, any>[]>([]);
  const [transactionsMeta, setTransactionsMeta] = useState<Record<string, any> | null>(null);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsLoaded, setTransactionsLoaded] = useState(false);
  const [txnActionMenuId, setTxnActionMenuId] = useState<number | string | null>(null);

  const [txnSearch, setTxnSearch] = useState("");
  const [txnFrom, setTxnFrom] = useState("");
  const [txnTo, setTxnTo] = useState("");
  const [txnStatus, setTxnStatus] = useState("");
  const isFirstTxnFilterRender = useRef(true);

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
    if (activeTab === "liens" && !liensLoaded) {
      fetchLiens();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function fetchLiens() {
    setLiensLoading(true);
    try {
      const result: any = await getAccountLiensAction(account.id);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to load liens.");
        return;
      }

      setLiens(Array.isArray(result.data) ? result.data : []);
      setLiensLoaded(true);
    } catch (error) {
      console.error("Failed to load liens:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setLiensLoading(false);
    }
  }

  async function handleReleaseLien(reason: string, totpCode: string) {
    if (!releaseTarget) return;
    const target = releaseTarget;
    setReleaseTarget(null);

    setActionPending("release-lien");
    try {
      const result: any = await releaseLienAction(target.id, reason.trim(), totpCode);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to release lien.");
        return;
      }

      toast.success(result.message || "Lien released successfully.");
      setLiensLoaded(false);
      fetchLiens();
      router.refresh();
    } catch (error) {
      console.error("Failed to release lien:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setActionPending(null);
    }
  }

  async function handleEmailStatement() {
    setEmailingStatement(true);
    try {
      const result: any = await emailAccountStatementAction(account.id, {
        from: txnFrom || undefined,
        to: txnTo || undefined,
      });

      if (result?.status !== "success") {
        handleApiError(result, "Failed to email statement of account.");
        return;
      }

      toast.success(result.message || "Statement of account is being sent to the customer.");
    } catch (error) {
      console.error("Failed to email statement of account:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setEmailingStatement(false);
      setStatementMenuOpen(false);
    }
  }

  // Debounced re-fetch whenever a transaction filter changes, same pattern as the
  // main transactions/financial-transactions list pages.
  useEffect(() => {
    if (isFirstTxnFilterRender.current) {
      isFirstTxnFilterRender.current = false;
      return;
    }
    if (activeTab !== "transactions") return;

    const timeout = setTimeout(() => fetchTransactions(1), 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txnSearch, txnFrom, txnTo, txnStatus]);

  async function fetchTransactions(page: number) {
    setTransactionsLoading(true);
    try {
      const result: any = await getTransactionsAction(page, {
        account_id: String(account.id),
        search: txnSearch,
        from: txnFrom,
        to: txnTo,
        status: txnStatus,
      });

      if (result?.status !== "success") {
        handleApiError(result, "Failed to load transactions.");
        return;
      }

      setTransactions(Array.isArray(result.data) ? result.data : []);
      setTransactionsMeta(result.meta ?? null);
      setTransactionsLoaded(true);
    } catch (error) {
      console.error("Failed to load transactions:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setTransactionsLoading(false);
    }
  }

  async function runAction(key: string, action: () => Promise<any>, successMessage: string) {
    setActionPending(key);
    try {
      const result: any = await action();

      if (result?.status !== "success") {
        handleApiError(result, "That action failed.");
        return;
      }

      toast.success(result.message || successMessage);
      setAccount(result.data ?? account);
      router.refresh();
    } catch (error) {
      console.error("Account action failed:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setActionPending(null);
    }
  }

  function handleUpdateStatus() {
    if (!statusChoice || statusChoice === account.status) return;
    setStatusModalOpen(false);
    runAction(
      "status",
      () => updateAccountStatusAction(account.id, statusChoice),
      "Account status updated."
    );
  }

  async function handlePlaceLien() {
    if (!lienAmount || Number(lienAmount) <= 0) return;
    setLienModalOpen(false);

    setActionPending("lien");
    try {
      const result: any = await placeLienAction(account.id, lienAmount, lienReason.trim() || undefined);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to submit lien request.");
        return;
      }

      toast.success(result.message || "Lien request submitted for approval.");
      setLiensLoaded(false);
      if (activeTab === "liens") fetchLiens();
    } catch (error) {
      console.error("Failed to place lien:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setActionPending(null);
      setLienAmount("");
      setLienReason("");
    }
  }

  return (
    <>
      {/* HEADER */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          href="/customer-management/account"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#29478f] transition"
        >
          <ArrowLeft size={16} />
          Back to Accounts
        </Link>

        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#29478f]">
              <Wallet size={26} />
            </div>

            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
                {account.account_number}
                {account.primary_account && (
                  <span className="rounded-full bg-[#29478f] px-2.5 py-1 text-xs font-semibold text-white">
                    Primary
                  </span>
                )}
              </h1>

              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="rounded-full bg-slate-100 px-2.5 py-1">
                  {account.account_name}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 capitalize">
                  {account.account_product?.product_type}
                </span>
                <StatusBadge status={account.status} />
              </div>

              <p className="mt-2 text-lg font-bold text-slate-900">
                ₦{formatCurrency(account.available_balance)}
                <span className="ml-1.5 text-xs font-semibold text-slate-500">
                  Available Balance
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ActionButton
              label="PND"
              icon={<ShieldAlert size={14} />}
              pending={actionPending === "pnd"}
              onClick={() =>
                runAction("pnd", () => toggleAccountPndAction(account.id), "PND flag updated.")
              }
              className={
                account.pnd
                  ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }
            />
            <ActionButton
              label="PNC"
              icon={<ShieldAlert size={14} />}
              pending={actionPending === "pnc"}
              onClick={() =>
                runAction("pnc", () => toggleAccountPncAction(account.id), "PNC flag updated.")
              }
              className={
                account.pnc
                  ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }
            />
            <ActionButton
              label="Place Lien"
              icon={<Lock size={14} />}
              pending={actionPending === "lien"}
              onClick={() => setLienModalOpen(true)}
              className="border-blue-300 bg-blue-50 text-[#173673] hover:bg-blue-100"
            />
            <ActionButton
              label="Update Status"
              icon={<RefreshCw size={14} />}
              pending={actionPending === "status"}
              onClick={() => {
                setStatusChoice(
                  ACCOUNT_STATUSES.includes(account.status) ? account.status : ACCOUNT_STATUSES[0]
                );
                setStatusModalOpen(true);
              }}
              className="border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
            />
          </div>
        </div>
      </div>

      <UpdateAccountStatusModal
        isOpen={statusModalOpen}
        currentStatus={account.status}
        status={statusChoice}
        onStatusChange={setStatusChoice}
        pending={actionPending === "status"}
        onCancel={() => setStatusModalOpen(false)}
        onConfirm={handleUpdateStatus}
      />

      <PlaceLienModal
        isOpen={lienModalOpen}
        amount={lienAmount}
        onAmountChange={setLienAmount}
        reason={lienReason}
        onReasonChange={setLienReason}
        pending={actionPending === "lien"}
        onCancel={() => setLienModalOpen(false)}
        onConfirm={handlePlaceLien}
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
          {/* CUSTOMER */}
          <Section title="Customer">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="CIF Number" value={account.customer?.cif_number} />
              <Field label="Full Name" value={account.customer?.full_name} />
              <Field
                label="Email"
                value={account.customer?.email}
                icon={<Mail size={14} className="text-slate-400" />}
              />
              <Field
                label="Phone"
                value={account.customer?.phone}
                icon={<Phone size={14} className="text-slate-400" />}
              />
            </div>
          </Section>

          {/* BALANCES */}
          <Section title="Balances">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
              <Field label="Available Balance" value={`₦${formatCurrency(account.available_balance)}`} />
              <Field label="Ledger Balance" value={`₦${formatCurrency(account.account_balance)}`} />
              <Field label="Lien Balance" value={`₦${formatCurrency(account.lien_balance)}`} />
            </div>
          </Section>

          {/* ACCOUNT INFO */}
          <Section title="Account Information">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Account Product" value={account.account_product?.name} />
              <Field
                label="Tier"
                value={account.account_tier?.level ? `Tier ${account.account_tier.level}` : undefined}
              />
              <Field label="Channel" value={account.channel} />
              <Field label="Last Transaction" value={formatDateTime(account.last_transaction_at)} />
              <Field label="Opened" value={formatDateTime(account.created_at)} />
            </div>
          </Section>
        </>
      )}

      {activeTab === "liens" && (
        <Section title="Liens">
          {liensLoading && liens.length === 0 ? (
            <p className="py-8 text-center text-sm font-medium text-slate-500">Loading liens...</p>
          ) : liens.length === 0 ? (
            <div className="py-12 text-center">
              <Lock size={28} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-500">
                No liens have been placed on this account yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-225">
                <thead>
                  <tr className="border-b border-slate-200">
                    <Heading>Reference</Heading>
                    <Heading>Amount</Heading>
                    <Heading>Reason</Heading>
                    <Heading>Status</Heading>
                    <Heading>Requested By</Heading>
                    <Heading>Requested</Heading>
                    <Heading>Actions</Heading>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {liens.map((lien) => {
                    const isOwnRequest =
                      currentUser?.id != null && String(lien.created_by) === String(currentUser.id);

                    return (
                      <tr
                        key={lien.id}
                        className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                        onClick={() => router.push(`/customer-management/liens/${lien.id}`)}
                      >
                        <td className="px-3 py-3 text-sm font-semibold text-slate-800">
                          {lien.reference}
                        </td>
                        <td className="px-3 py-3 text-sm font-bold text-slate-900">
                          ₦{formatCurrency(lien.amount)}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-700">{lien.reason ?? "—"}</td>
                        <td className="px-3 py-3 text-sm">
                          <LienStatusBadge status={lien.status} />
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-700">
                          {lien.created_by_name ?? "—"}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-700">
                          {formatDateTime(lien.created_at)}
                        </td>
                        <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
                          {lien.status === "active" && !isOwnRequest && (
                            <button
                              type="button"
                              onClick={() => setReleaseTarget(lien)}
                              disabled={actionPending === "release-lien"}
                              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Release
                            </button>
                          )}
                          {lien.status === "pending" && (
                            <span className="text-xs font-medium text-slate-400">
                              Awaiting approval
                            </span>
                          )}
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

      <ReasonTotpConfirmModal
        isOpen={!!releaseTarget}
        title="Release Lien"
        description={`Provide a reason for releasing lien '${releaseTarget?.reference ?? ""}'. This will free the held funds immediately.`}
        confirmLabel="Release Lien"
        confirmTone="primary"
        pending={actionPending === "release-lien"}
        onCancel={() => setReleaseTarget(null)}
        onConfirm={handleReleaseLien}
      />

      {activeTab === "transactions" && (
        <Section title="Transactions">
          {/* FILTERS */}
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:flex-wrap">
            <div className="relative flex-1 md:min-w-50">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={txnSearch}
                onChange={(event) => setTxnSearch(event.target.value)}
                placeholder="Search by reference or narration..."
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder-slate-500 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
              />
            </div>

            <select
              value={txnStatus}
              onChange={(event) => setTxnStatus(event.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
            >
              <option value="">All Statuses</option>
              {TRANSACTION_STATUSES.map((option) => (
                <option key={option} value={option}>
                  {toDisplayLabel(option)}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={txnFrom}
              onChange={(event) => setTxnFrom(event.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
            />

            <input
              type="date"
              value={txnTo}
              onChange={(event) => setTxnTo(event.target.value)}
              className="h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
            />

            <button
              type="button"
              onClick={() => {
                setTxnSearch("");
                setTxnStatus("");
                setTxnFrom("");
                setTxnTo("");
              }}
              disabled={!txnSearch && !txnStatus && !txnFrom && !txnTo}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw size={16} />
              Reset
            </button>

            <ExportDropdown
              baseEndpoint="/admin/transactions"
              params={{
                account_id: String(account.id),
                search: txnSearch,
                status: txnStatus,
                from: txnFrom,
                to: txnTo,
              }}
            />

            <StatementMenu
              accountId={account.id}
              from={txnFrom}
              to={txnTo}
              isOpen={statementMenuOpen}
              onToggle={() => setStatementMenuOpen((open) => !open)}
              onClose={() => setStatementMenuOpen(false)}
              onEmail={handleEmailStatement}
              emailing={emailingStatement}
            />
          </div>

          {transactionsLoading && transactions.length === 0 ? (
            <p className="py-8 text-center text-sm font-medium text-slate-500">
              Loading transactions...
            </p>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center">
              <Receipt size={28} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-500">
                No transactions on this account yet.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-225">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <Heading>Reference</Heading>
                      <Heading>Type</Heading>
                      <Heading>Amount</Heading>
                      <Heading>Balance Before</Heading>
                      <Heading>Balance After</Heading>
                      <Heading>Status</Heading>
                      <Heading>Date</Heading>
                      <Heading>Actions</Heading>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((txn) => {
                      const match = /^([^(]+)\(([^)]+)\)$/.exec(txn.type ?? "");
                      const typeLabel = match ? match[1].trim() : txn.type;
                      const isDebit = typeLabel?.toLowerCase() === "debit";

                      return (
                        <tr
                          key={txn.id}
                          className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                          onClick={() => router.push(`/chat-of-account/transactions/${txn.id}`)}
                        >
                          <td className="px-3 py-3 text-sm text-slate-800">
                            <p className="font-semibold">{txn.reference ?? "—"}</p>
                            {txn.transaction_reference && (
                              <p className="mt-0.5 text-xs font-medium text-slate-400">
                                {txn.transaction_reference}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-3 text-sm">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-bold capitalize ${
                                isDebit
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {typeLabel ?? "—"}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm font-bold text-slate-900">
                            ₦{formatCurrency(txn.amount)}
                          </td>
                          <td className="px-3 py-3 text-sm text-slate-700">
                            ₦{formatCurrency(txn.balance_before)}
                          </td>
                          <td className="px-3 py-3 text-sm text-slate-700">
                            ₦{formatCurrency(txn.balance_after)}
                          </td>
                          <td className="px-3 py-3 text-sm">
                            <StatusBadge status={txn.status} />
                          </td>
                          <td className="px-3 py-3 text-sm text-slate-700">
                            {formatDateTime(txn.date)}
                          </td>
                          <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
                            <ActionMenu
                              isOpen={txnActionMenuId === txn.id}
                              onToggle={() =>
                                setTxnActionMenuId(txnActionMenuId === txn.id ? null : txn.id)
                              }
                              onClose={() => setTxnActionMenuId(null)}
                            >
                              <TxnActionButton
                                onClick={() => {
                                  setTxnActionMenuId(null);
                                  router.push(`/chat-of-account/transactions/${txn.id}`);
                                }}
                              >
                                <Eye size={16} />
                                View
                              </TxnActionButton>
                            </ActionMenu>
                          </td>
                        </tr>
                      );
                    })}
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

                      {getPageNumbers(transactionsMeta.current_page, transactionsMeta.last_page).map(
                        (page, index) =>
                          page === "..." ? (
                            <span
                              key={`ellipsis-${index}`}
                              className="px-2 text-sm font-semibold text-slate-400 select-none"
                            >
                              …
                            </span>
                          ) : (
                            <button
                              key={page}
                              type="button"
                              onClick={() => fetchTransactions(page)}
                              disabled={transactionsLoading}
                              className={`min-w-9.5 rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed ${
                                page === transactionsMeta.current_page
                                  ? "bg-[#173673] text-white shadow-sm"
                                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              {page}
                            </button>
                          )
                      )}

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

function Field({
  label,
  value,
  icon,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}) {
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

function ActionButton({
  label,
  icon,
  pending,
  onClick,
  className,
}: {
  label: string;
  icon: ReactNode;
  pending: boolean;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {icon}
      {pending ? "Please wait..." : label}
    </button>
  );
}

function StatementMenu({
  accountId,
  from,
  to,
  isOpen,
  onToggle,
  onClose,
  onEmail,
  emailing,
}: {
  accountId: number | string;
  from?: string;
  to?: string;
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
        disabled={emailing}
        className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FileText size={14} />
        Statement of Account
        <ChevronDown size={14} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          <a
            href={`/api/export?endpoint=${encodeURIComponent(
              `/admin/accounts/${accountId}/statement?${new URLSearchParams({
                ...(from ? { from } : {}),
                ...(to ? { to } : {}),
              }).toString()}`
            )}`}
            onClick={onClose}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            <Download size={14} />
            Download (PDF)
          </a>
          <button
            type="button"
            onClick={onEmail}
            disabled={emailing}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
          >
            <Send size={14} />
            {emailing ? "Sending..." : "Email to Customer"}
          </button>
        </div>
      )}
    </div>
  );
}

function TxnActionButton(props: Record<string, any>) {
  return (
    <button
      type="button"
      {...props}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-100 text-sm font-semibold text-slate-800 transition"
    >
      {props.children}
    </button>
  );
}

function PlaceLienModal({
  isOpen,
  amount,
  onAmountChange,
  reason,
  onReasonChange,
  pending,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  amount: string;
  onAmountChange: (value: string) => void;
  reason: string;
  onReasonChange: (value: string) => void;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onCancel}
        className="fixed inset-0 bg-black/40"
      />

      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Request Lien</h2>
            <p className="mt-1 text-sm text-slate-500">
              Submits a lien request for approval — funds are only set aside once approved.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <label className="mt-5 block">
          <span className="block text-sm font-semibold text-slate-800">Amount</span>
          <AmountInput
            value={amount}
            onChange={onAmountChange}
            placeholder="e.g. 50,000"
            autoFocus
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
          />
        </label>

        <label className="mt-4 block">
          <span className="block text-sm font-semibold text-slate-800">
            Reason <span className="font-normal text-slate-400">(optional)</span>
          </span>
          <input
            type="text"
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            placeholder="e.g. Pending dispute resolution"
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
          />
        </label>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending || !amount || Number(amount) <= 0}
            className="rounded-xl bg-[#173673] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#10295c] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Please wait..." : "Place Lien"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function UpdateAccountStatusModal({
  isOpen,
  currentStatus,
  status,
  onStatusChange,
  pending,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  currentStatus: string;
  status: string;
  onStatusChange: (status: string) => void;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onCancel}
        className="fixed inset-0 bg-black/40"
      />

      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Update Account Status</h2>
            <p className="mt-1 text-sm text-slate-500">
              Current status: <span className="font-semibold">{toDisplayLabel(currentStatus)}</span>
            </p>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <label className="mt-5 block">
          <span className="block text-sm font-semibold text-slate-800">New Status</span>
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
            className="mt-2 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
          >
            {ACCOUNT_STATUSES.map((option) => (
              <option key={option} value={option}>
                {toDisplayLabel(option)}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending || !status || status === currentStatus}
            className="rounded-xl bg-[#173673] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#10295c] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Please wait..." : "Update Status"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-100 text-green-800 border border-green-300",
    completed: "bg-green-100 text-green-800 border border-green-300",
    pending: "bg-amber-100 text-amber-800 border border-amber-300",
    inactive: "bg-red-100 text-red-800 border border-red-300",
    failed: "bg-red-100 text-red-800 border border-red-300",
    dormant: "bg-slate-200 text-slate-700 border border-slate-300",
    frozen: "bg-sky-100 text-sky-800 border border-sky-300",
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

// Builds a compact page list: first, last, and a window around the current
// page, e.g. 1 ... 4 5 6 ... 20. Falls back to showing every page when few.
function getPageNumbers(current: number, last: number): (number | "...")[] {
  if (last <= 5) {
    return Array.from({ length: last }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, last, current]);

  if (current > 1) pages.add(current - 1);
  if (current < last) pages.add(current + 1);

  const sorted = Array.from(pages).sort((a, b) => a - b);

  const result: (number | "...")[] = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) {
      result.push("...");
    }
    result.push(page);
  });

  return result;
}
