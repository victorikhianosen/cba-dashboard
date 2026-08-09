"use client";

import { useState } from "react";
import { Lock, Wallet } from "lucide-react";
import { toast } from "react-toastify";
import {
  closeCashierSessionAction,
  getMyCashierSessionAction,
  openCashierSessionAction,
  reconcileCashierSessionAction,
} from "@/actions/cashier-session.action";
import AmountInput from "@/components/AmountInput";
import SideDrawer from "@/components/SideDrawer";
import { handleApiError } from "@/lib/errors";
import { ACTION_META, type ActionKind } from "../actionMeta";
import TellerActionForm from "./TellerActionForm";

type Teller = Record<string, any> | null;
type CashierSession = Record<string, any> | null;

interface MyTellerPanelProps {
  initialSession: CashierSession;
  myTeller: Teller;
}

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  pending_reconciliation: "Pending Reconciliation",
  pending_variance_approval: "Pending Variance Approval",
  reconciled: "Reconciled",
  closed: "Closed",
};

// Deposit/withdraw first — the most frequently used, real-customer-facing actions —
// then buy/sell (internal vault transfers).
const ACTION_ORDER: ActionKind[] = ["deposit", "withdraw", "buy", "sell"];

export default function MyTellerPanel({
  initialSession,
  myTeller,
}: MyTellerPanelProps) {
  const [session, setSession] = useState<CashierSession>(initialSession);
  const [submitting, setSubmitting] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionKind | null>(null);

  const [openingFloat, setOpeningFloat] = useState("");
  const [countedAmount, setCountedAmount] = useState("");

  async function refresh() {
    const result: any = await getMyCashierSessionAction();
    if (result?.status === "success") {
      setSession(result.data);
    }
  }

  async function handleOpen() {
    if (!myTeller || !openingFloat) {
      toast.error("Enter an opening float amount.");
      return;
    }

    setSubmitting(true);
    const result: any = await openCashierSessionAction(
      myTeller.id,
      openingFloat,
    );
    if (result?.status !== "success") {
      handleApiError(result, "Failed to open teller session.");
      setSubmitting(false);
      return;
    }
    toast.success("Teller session opened.");
    setOpeningFloat("");
    refresh();

    setSubmitting(false);
  }

  async function handleClose() {
    if (!session || !countedAmount) {
      toast.error("Enter the physically counted cash amount.");
      return;
    }

    setSubmitting(true);
    const result: any = await closeCashierSessionAction(
      session.id,
      countedAmount,
    );
    if (result?.status !== "success") {
      handleApiError(result, "Failed to close teller session.");
      setSubmitting(false);
      return;
    }
    toast.success("Teller session closed — pending reconciliation.");
    setCountedAmount("");
    refresh();

    setSubmitting(false);
  }

  async function handleReconcile() {
    if (!session) return;

    setSubmitting(true);
    const result: any = await reconcileCashierSessionAction(session.id);
    if (result?.status !== "success") {
      handleApiError(result, "Failed to reconcile teller session.");
      setSubmitting(false);
      return;
    }
    toast.success("Teller session reconciled.");
    refresh();

    setSubmitting(false);
  }

  if (!myTeller) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <Wallet size={32} className="mx-auto text-slate-300" />
        <h1 className="mt-4 text-lg font-bold text-slate-900">
          No Teller Assigned
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          You are not currently assigned to a teller. Contact your head cashier
          or a branch admin.
        </p>
      </div>
    );
  }

  const inputClassName =
    "h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-[#29478f]";

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#29478f]">
            <Wallet size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {myTeller.name}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {myTeller.code} — {myTeller.branch_name}
            </p>
          </div>
          {session && (
            <span className="ml-auto rounded-full bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-800">
              {STATUS_LABELS[session.status] ?? session.status}
            </span>
          )}
        </div>
      </div>

      {!session && (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Open Teller</h2>
          <p className="mt-1 text-sm text-slate-600">
            Start your session by drawing an opening float from the vault.
          </p>
          <div className="mt-4 flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-bold text-slate-800">
                Opening Float Amount
              </label>
              <AmountInput
                value={openingFloat}
                onChange={setOpeningFloat}
                className={inputClassName}
              />
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={handleOpen}
              className="h-11 rounded-xl bg-[#173673] px-6 text-sm font-semibold text-white hover:bg-[#10295c] disabled:opacity-50"
            >
              Open Teller
            </button>
          </div>
        </section>
      )}

      {session && (
        <>
          <section className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">
                Opening Float
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
                ₦{formatCurrency(session.opening_float_amount)}
              </h2>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">
                Expected Balance
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
                ₦{formatCurrency(session.expected_closing_balance)}
              </h2>
            </div>
          </section>

          {session.status === "open" && (
            <section className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              {ACTION_ORDER.map((key) => {
                const meta = ACTION_META[key];
                const Icon = meta.icon;
                const toneClass =
                  meta.tone === "emerald"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100";

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveAction(key)}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-5 text-sm font-bold transition ${toneClass}`}
                  >
                    <Icon size={22} />
                    {key === "buy" && "Buy"}
                    {key === "sell" && "Sell"}
                    {key === "deposit" && "Deposit"}
                    {key === "withdraw" && "Withdraw"}
                  </button>
                );
              })}
            </section>
          )}

          {session.status === "open" && (
            <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Lock size={16} className="text-slate-600" />
                Close Teller (End of Day)
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Count the physical cash in your drawer and enter it below.
              </p>
              <div className="mt-4 flex items-end gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-sm font-bold text-slate-800">
                    Counted Cash Amount
                  </label>
                  <AmountInput
                    value={countedAmount}
                    onChange={setCountedAmount}
                    className={inputClassName}
                  />
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleClose}
                  className="h-11 rounded-xl bg-slate-800 px-6 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
                >
                  Close Teller
                </button>
              </div>
            </section>
          )}

          {session.status === "pending_reconciliation" && (
            <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-6">
              <p className="text-sm font-semibold text-amber-800">
                Counted amount: ₦
                {formatCurrency(session.counted_closing_amount)}. Run
                reconciliation to compare against the expected balance.
              </p>
              <button
                type="button"
                disabled={submitting}
                onClick={handleReconcile}
                className="mt-4 h-11 rounded-xl bg-[#173673] px-6 text-sm font-semibold text-white hover:bg-[#10295c] disabled:opacity-50"
              >
                Reconcile
              </button>
            </section>
          )}

          {session.status === "pending_variance_approval" && (
            <section className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6">
              <p className="text-sm font-semibold text-red-800">
                Variance of ₦{formatCurrency(session.variance_amount)} is
                outside tolerance and awaiting a second admin's approval. You
                cannot approve your own session's variance.
              </p>
            </section>
          )}

          {(session.status === "reconciled" || session.status === "closed") && (
            <section className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
              <p className="text-sm font-semibold text-emerald-800">
                Session closed. Variance: ₦
                {formatCurrency(session.variance_amount ?? 0)}.
              </p>
            </section>
          )}
        </>
      )}

      <SideDrawer
        isOpen={activeAction !== null}
        onClose={() => setActiveAction(null)}
        widthClassName="max-w-4xl"
      >
        {activeAction && session && (
          <TellerActionForm
            action={activeAction}
            session={session}
            myTeller={myTeller}
            onCancel={() => setActiveAction(null)}
            onSuccess={() => {
              setActiveAction(null);
              refresh();
            }}
          />
        )}
      </SideDrawer>
    </>
  );
}
