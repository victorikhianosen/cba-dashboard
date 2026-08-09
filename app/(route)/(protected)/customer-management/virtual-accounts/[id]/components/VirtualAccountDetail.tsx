"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Pencil,
  RefreshCw,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  simulateVirtualAccountCreditAction,
  updateVirtualAccountBeneficiaryAction,
  updateVirtualAccountStatusAction,
} from "@/actions/virtual-account.action";
import { handleApiError } from "@/lib/errors";
import { usePermissions } from "@/lib/permissions";

type VirtualAccount = Record<string, any>;

const STATUS_OPTIONS = [
  "pending",
  "active",
  "inactive",
  "dormant",
  "frozen",
  "restricted",
  "blocked",
  "closed",
  "suspended",
  "deceased_hold",
  "escheated",
];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-slate-100 text-slate-600 border-slate-200",
  dormant: "bg-slate-100 text-slate-600 border-slate-200",
  frozen: "bg-blue-50 text-blue-700 border-blue-200",
  restricted: "bg-orange-50 text-orange-700 border-orange-200",
  blocked: "bg-red-50 text-red-700 border-red-200",
  closed: "bg-slate-100 text-slate-600 border-slate-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
  deceased_hold: "bg-slate-100 text-slate-600 border-slate-200",
  escheated: "bg-slate-100 text-slate-600 border-slate-200",
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-block rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${style}`}>
      {status?.replace(/_/g, " ")}
    </span>
  );
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

export default function VirtualAccountDetail({ virtualAccount }: { virtualAccount: VirtualAccount }) {
  const router = useRouter();
  const { hasPermission } = usePermissions();

  const canUpdate = hasPermission("update_virtual_accounts");
  const canCredit = hasPermission("credit_virtual_accounts");

  const [account, setAccount] = useState<VirtualAccount>(virtualAccount);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [beneficiaryOpen, setBeneficiaryOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);

  async function handleUpdateBeneficiary(name: string) {
    setActionPending("beneficiary");
    try {
      const result: any = await updateVirtualAccountBeneficiaryAction(account.id, name);
      if (result?.status !== "success") {
        handleApiError(result, "Failed to update beneficiary name.");
        return;
      }
      toast.success(result.message || "Beneficiary name updated.");
      setAccount(result.data ?? { ...account, account_name: name });
      setBeneficiaryOpen(false);
      router.refresh();
    } finally {
      setActionPending(null);
    }
  }

  async function handleUpdateStatus(status: string) {
    setActionPending("status");
    try {
      const result: any = await updateVirtualAccountStatusAction(account.id, status);
      if (result?.status !== "success") {
        handleApiError(result, "Failed to update status.");
        return;
      }
      toast.success(result.message || "Status updated.");
      setAccount(result.data ?? { ...account, status });
      setStatusOpen(false);
      router.refresh();
    } finally {
      setActionPending(null);
    }
  }

  async function handleSimulateCredit(payload: { amount: number; narration?: string }) {
    setActionPending("credit");
    try {
      const result: any = await simulateVirtualAccountCreditAction(account.id, payload);
      if (result?.status !== "success") {
        handleApiError(result, "Failed to simulate inbound payment.");
        return;
      }
      toast.success(result.message || `Simulated credit of ₦${formatCurrency(payload.amount)} applied.`);
      setCreditOpen(false);
      router.refresh();
    } finally {
      setActionPending(null);
    }
  }

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          href="/customer-management/virtual-accounts"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#29478f] transition"
        >
          <ArrowLeft size={16} />
          Back to Virtual Accounts
        </Link>

        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#29478f]">
              <Wallet size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{account.account_number}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="rounded-full bg-slate-100 px-2.5 py-1">{account.account_name}</span>
                <StatusBadge status={account.status} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canUpdate && (
              <>
                <ActionButton
                  label="Edit Beneficiary"
                  icon={<Pencil size={14} />}
                  pending={actionPending === "beneficiary"}
                  onClick={() => setBeneficiaryOpen(true)}
                  className="border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
                />
                <ActionButton
                  label="Update Status"
                  icon={<RefreshCw size={14} />}
                  pending={actionPending === "status"}
                  onClick={() => setStatusOpen(true)}
                  className="border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
                />
              </>
            )}
            {canCredit && (
              <ActionButton
                label="Simulate Inbound Payment (Test)"
                icon={<Banknote size={14} />}
                pending={actionPending === "credit"}
                onClick={() => setCreditOpen(true)}
                className="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
              />
            )}
          </div>
        </div>
      </div>

      <Section title="Virtual Account Details">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Account Number" value={account.account_number} />
          <Field label="Account Name" value={account.account_name} />
          <Field label="Currency" value={account.currency_code} />
          <Field label="Reference" value={account.reference} />
          <Field label="Provider" value={account.provider} />
          <Field label="Purpose" value={account.purpose} />
          <Field label="Expires At" value={formatDateTime(account.expires_at)} />
          <Field label="Created At" value={formatDateTime(account.created_at)} />
          <Field label="Updated At" value={formatDateTime(account.updated_at)} />
        </div>
      </Section>

      <Section title="Beneficiary">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Name" value={account.beneficiary?.name} />
          <Field label="Email" value={account.beneficiary?.email} />
          <Field label="Phone" value={account.beneficiary?.phone} />
          <Field label="BVN" value={account.beneficiary?.bvn} />
        </div>
      </Section>

      <Section title="Customer">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Customer"
            value={
              account.customer_id ? (
                <Link
                  href={`/customer-management/customer/${account.customer_id}`}
                  className="font-semibold text-[#29478f] hover:underline"
                >
                  {account.customer?.full_name ?? `Customer #${account.customer_id}`}
                </Link>
              ) : undefined
            }
          />
          <Field label="CIF Number" value={account.customer?.cif_number} />
        </div>
      </Section>

      <Section title="Parent Account">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Account Number"
            value={
              account.parent_account?.id ? (
                <Link
                  href={`/customer-management/account/${account.parent_account.id}`}
                  className="font-semibold text-[#29478f] hover:underline"
                >
                  {account.parent_account.account_number}
                </Link>
              ) : undefined
            }
          />
          <Field label="Account Name" value={account.parent_account?.account_name} />
          <Field
            label="Account Balance"
            value={
              account.parent_account?.account_balance !== undefined
                ? `₦${formatCurrency(account.parent_account.account_balance)}`
                : undefined
            }
          />
        </div>
      </Section>

      <EditBeneficiaryModal
        isOpen={beneficiaryOpen}
        currentName={account.account_name}
        pending={actionPending === "beneficiary"}
        onCancel={() => setBeneficiaryOpen(false)}
        onConfirm={handleUpdateBeneficiary}
      />

      <UpdateVirtualAccountStatusModal
        isOpen={statusOpen}
        currentStatus={account.status}
        pending={actionPending === "status"}
        onCancel={() => setStatusOpen(false)}
        onConfirm={handleUpdateStatus}
      />

      <SimulateCreditModal
        isOpen={creditOpen}
        pending={actionPending === "credit"}
        onCancel={() => setCreditOpen(false)}
        onConfirm={handleSimulateCredit}
      />
    </>
  );
}

function EditBeneficiaryModal({
  isOpen,
  currentName,
  pending,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  currentName: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (name: string) => void;
}) {
  const [name, setName] = useState(currentName ?? "");

  if (!isOpen || typeof document === "undefined") return null;

  function handleCancel() {
    setName(currentName ?? "");
    onCancel();
  }

  function handleConfirm() {
    if (!name.trim()) return;
    onConfirm(name.trim());
  }

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <button type="button" aria-label="Close dialog" onClick={handleCancel} className="fixed inset-0 bg-black/40" />

      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900">Edit Beneficiary Name</h2>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={handleCancel}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <label className="mt-5 block">
          <span className="block text-sm font-semibold text-slate-800">Beneficiary Name</span>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
          />
        </label>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={pending}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending || !name.trim()}
            className="rounded-xl bg-[#173673] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#10295c] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Please wait..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function UpdateVirtualAccountStatusModal({
  isOpen,
  currentStatus,
  pending,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  currentStatus: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (status: string) => void;
}) {
  const [status, setStatus] = useState(currentStatus ?? "");

  if (!isOpen || typeof document === "undefined") return null;

  function handleCancel() {
    setStatus(currentStatus ?? "");
    onCancel();
  }

  function handleConfirm() {
    if (!status || status === currentStatus) return;
    onConfirm(status);
  }

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <button type="button" aria-label="Close dialog" onClick={handleCancel} className="fixed inset-0 bg-black/40" />

      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Update Status</h2>
            <p className="mt-1 text-sm text-slate-500">
              Current status: <span className="font-semibold capitalize">{currentStatus?.replace(/_/g, " ")}</span>
            </p>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={handleCancel}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <label className="mt-5 block">
          <span className="block text-sm font-semibold text-slate-800">New Status</span>
          <select
            required
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="mt-2 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option} className="capitalize">
                {option.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={pending}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending || !status || status === currentStatus}
            className="rounded-xl bg-[#173673] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#10295c] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Please wait..." : "Update Status"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SimulateCreditModal({
  isOpen,
  pending,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (payload: { amount: number; narration?: string }) => void;
}) {
  const [amount, setAmount] = useState("");
  const [narration, setNarration] = useState("");

  if (!isOpen || typeof document === "undefined") return null;

  function reset() {
    setAmount("");
    setNarration("");
  }

  function handleCancel() {
    reset();
    onCancel();
  }

  function handleConfirm() {
    const numericAmount = Number(amount);
    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) return;
    onConfirm({ amount: numericAmount, narration: narration.trim() || undefined });
    reset();
  }

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <button type="button" aria-label="Close dialog" onClick={handleCancel} className="fixed inset-0 bg-black/40" />

      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900">Simulate Inbound Payment (Test)</h2>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={handleCancel}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            Test/demo tooling only. This stands in for a real bank webhook and does not represent an
            actual inbound transfer.
          </span>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="block text-sm font-semibold text-slate-800">Amount</span>
            <input
              autoFocus
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
            />
          </label>

          <label className="block">
            <span className="block text-sm font-semibold text-slate-800">
              Narration <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <input
              type="text"
              value={narration}
              onChange={(event) => setNarration(event.target.value)}
              placeholder="e.g. Test inbound transfer"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={pending}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending || !amount || Number(amount) <= 0}
            className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Please wait..." : "Simulate Credit"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
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
