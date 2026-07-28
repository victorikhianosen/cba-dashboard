"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Mail,
  Phone,
  Receipt,
  RefreshCw,
  ShieldAlert,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  getAccountTransactionsAction,
  toggleAccountPncAction,
  toggleAccountPndAction,
  updateAccountStatusAction,
} from "@/actions/account.action";
import { handleApiError } from "@/lib/errors";
import { toDisplayLabel } from "@/lib/format";

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
  { key: "transactions", label: "Transactions", icon: Receipt },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AccountDetail({ account: initialAccount }: AccountDetailProps) {
  const router = useRouter();
  const [account, setAccount] = useState<Account>(initialAccount);
  const [activeTab, setActiveTab] = useState<TabKey>("details");
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [statusChoice, setStatusChoice] = useState(initialAccount.status ?? "");
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  const [transactions, setTransactions] = useState<Record<string, any>[]>([]);
  const [transactionsMeta, setTransactionsMeta] = useState<Record<string, any> | null>(null);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsLoaded, setTransactionsLoaded] = useState(false);

  useEffect(() => {
    if (activeTab === "transactions" && !transactionsLoaded) {
      fetchTransactions(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function fetchTransactions(page: number) {
    setTransactionsLoading(true);
    try {
      const result: any = await getAccountTransactionsAction(account.id, page);

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
                No transactions on this account yet.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-200">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <Heading>Date</Heading>
                      <Heading>Narration</Heading>
                      <Heading>Type</Heading>
                      <Heading>Amount</Heading>
                      <Heading>Balance After</Heading>
                      <Heading>Status</Heading>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((txn) => (
                      <tr key={txn.id}>
                        <td className="px-3 py-3 text-sm text-slate-700">
                          {formatDateTime(txn.posting_date)}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-800">{txn.narration || "—"}</td>
                        <td className="px-3 py-3 text-sm">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-bold capitalize ${
                              txn.type === "credit"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {txn.type}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm font-bold text-slate-900">
                          ₦{formatCurrency(txn.amount)}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-700">
                          ₦{formatCurrency(txn.balance_after)}
                        </td>
                        <td className="px-3 py-3 text-sm">
                          <StatusBadge status={txn.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {transactionsMeta && transactionsMeta.last_page > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                  <p className="text-sm font-medium text-slate-600">
                    Page {transactionsMeta.current_page} of {transactionsMeta.last_page}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fetchTransactions(transactionsMeta.current_page - 1)}
                      disabled={transactionsLoading || transactionsMeta.current_page <= 1}
                      className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 transition"
                    >
                      <ChevronLeft size={16} />
                    </button>
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
