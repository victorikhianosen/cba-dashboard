"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Box, ChevronRight } from "lucide-react";
import { getCashierSessionAction, getCashierSessionsAction } from "@/actions/cashier-session.action";
import SideDrawer from "@/components/SideDrawer";

type Teller = Record<string, any>;
type Session = Record<string, any>;
type Transaction = Record<string, any>;

interface TellerDetailProps {
  teller: Teller;
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

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  pending_reconciliation: "Pending Reconciliation",
  pending_variance_approval: "Pending Variance Approval",
  reconciled: "Reconciled",
  closed: "Closed",
};

export default function TellerDetail({ teller }: TellerDetailProps) {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingSessions(true);
      const result: any = await getCashierSessionsAction(1, undefined, teller.id);
      if (result?.status === "success") {
        setSessions(Array.isArray(result.data) ? result.data : []);
      }
      setLoadingSessions(false);
    })();
  }, [teller.id]);

  async function openSessionDrawer(session: Session) {
    setActiveSession(session);
    setLoadingTransactions(true);
    const result: any = await getCashierSessionAction(session.id);
    if (result?.status === "success") {
      setActiveSession(result.data);
    }
    setLoadingTransactions(false);
  }

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/till-management/teller");
    }
  }

  const varianceTolerance = teller.variance_tolerance_amount;

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#29478f] transition"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#29478f]">
              <Box size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{teller.name}</h1>
              <p className="mt-1 text-sm text-slate-600">
                {teller.code} — {teller.branch_name} — {teller.vault_name}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex w-fit rounded-full px-3 py-1.5 text-sm font-bold ${
              teller.status === "active"
                ? "bg-green-100 text-green-800 border border-green-300"
                : teller.status === "pending"
                ? "bg-amber-100 text-amber-800 border border-amber-300"
                : "bg-slate-100 text-slate-700 border border-slate-300"
            }`}
          >
            {teller.status}
          </span>
        </div>
      </div>

      <section className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Balance</p>
          <h2 className="mt-2 text-xl font-extrabold text-slate-900">
            {teller.currency_code} {formatCurrency(teller.balance)}
          </h2>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Assigned Cashier</p>
          <h2 className="mt-2 text-xl font-extrabold text-slate-900">
            {teller.current_assignment?.user_name || "Unassigned"}
          </h2>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Opening Float Ceiling</p>
          <h2 className="mt-2 text-xl font-extrabold text-slate-900">
            {teller.opening_float_ceiling_amount != null
              ? `${teller.currency_code} ${formatCurrency(teller.opening_float_ceiling_amount)}`
              : "No cap"}
          </h2>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">Variance Tolerance</p>
          <h2 className="mt-2 text-xl font-extrabold text-slate-900">
            {teller.currency_code} {formatCurrency(varianceTolerance)}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {teller.requires_variance_approval
              ? "Second-admin approval required beyond this"
              : "No second-admin approval required"}
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-bold text-slate-900">Assignment History</h2>
          <p className="mt-1 text-sm text-slate-600">Every cashier ever assigned to this teller.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-150">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Cashier</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Assigned At</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Unassigned At</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(teller.assignment_history ?? []).map((assignment: Record<string, any>) => (
                <tr key={assignment.id}>
                  <td className="px-5 py-3 text-sm font-medium text-slate-800">{assignment.user_name}</td>
                  <td className="px-5 py-3 text-sm text-slate-700">{formatDateTime(assignment.assigned_at)}</td>
                  <td className="px-5 py-3 text-sm text-slate-700">{formatDateTime(assignment.unassigned_at)}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                        assignment.unassigned_at
                          ? "bg-slate-100 text-slate-700 border border-slate-300"
                          : "bg-green-100 text-green-800 border border-green-300"
                      }`}
                    >
                      {assignment.unassigned_at ? "Ended" : "Active"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!teller.assignment_history || teller.assignment_history.length === 0) && (
            <div className="py-10 text-center text-sm font-medium text-slate-500">No assignment history yet.</div>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-bold text-slate-900">Daily Sessions</h2>
          <p className="mt-1 text-sm text-slate-600">
            One row per day worked. Click a row to see that day's individual transactions.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-225">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Date</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Cashier</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Opening Float</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Expected</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Counted</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Missing / Over</th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((session) => {
                const variance = session.variance_amount != null ? Number(session.variance_amount) : null;
                const outOfTolerance =
                  variance != null && varianceTolerance != null && Math.abs(variance) > Number(varianceTolerance);

                return (
                  <tr
                    key={session.id}
                    onClick={() => openSessionDrawer(session)}
                    className="cursor-pointer hover:bg-slate-50/80"
                  >
                    <td className="px-5 py-3 text-sm font-medium text-slate-800">{formatDateTime(session.opened_at)}</td>
                    <td className="px-5 py-3 text-sm text-slate-700">{session.cashier_name || "—"}</td>
                    <td className="px-5 py-3 text-sm text-slate-700">{formatCurrency(session.opening_float_amount)}</td>
                    <td className="px-5 py-3 text-sm text-slate-700">{formatCurrency(session.expected_closing_balance)}</td>
                    <td className="px-5 py-3 text-sm text-slate-700">
                      {session.counted_closing_amount != null ? formatCurrency(session.counted_closing_amount) : "—"}
                    </td>
                    <td className="px-5 py-3 text-sm font-bold">
                      {variance != null ? (
                        <span className={outOfTolerance ? "text-red-600" : "text-slate-700"}>
                          {variance > 0 ? "+" : ""}
                          {formatCurrency(variance)}
                          {variance < 0 ? " short" : variance > 0 ? " over" : ""}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800">
                        {STATUS_LABELS[session.status] ?? session.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <ChevronRight size={16} className="ml-auto text-slate-400" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loadingSessions && sessions.length === 0 && (
            <div className="py-10 text-center text-sm font-medium text-slate-500">No sessions recorded for this teller yet.</div>
          )}
          {loadingSessions && (
            <div className="py-10 text-center text-sm font-medium text-slate-500">Loading sessions...</div>
          )}
        </div>
      </section>

      <SideDrawer isOpen={!!activeSession} onClose={() => setActiveSession(null)} widthClassName="max-w-2xl">
        {activeSession && (
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Session — {formatDateTime(activeSession.opened_at)}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Cashier: {activeSession.cashier_name || "—"} · Status: {STATUS_LABELS[activeSession.status] ?? activeSession.status}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Opening Float</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{formatCurrency(activeSession.opening_float_amount)}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Expected</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{formatCurrency(activeSession.expected_closing_balance)}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Counted</p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {activeSession.counted_closing_amount != null ? formatCurrency(activeSession.counted_closing_amount) : "—"}
                </p>
              </div>
            </div>

            <h3 className="mt-6 text-sm font-bold text-slate-900">Transactions</h3>
            <div className="mt-3 space-y-3">
              {loadingTransactions && <p className="text-sm text-slate-500">Loading transactions...</p>}
              {!loadingTransactions && (activeSession.transactions ?? []).length === 0 && (
                <p className="text-sm text-slate-500">No transactions in this session.</p>
              )}
              {!loadingTransactions &&
                (activeSession.transactions ?? []).map((txn: Transaction) => (
                  <div key={txn.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold capitalize text-slate-900">{String(txn.type).replace(/_/g, " ")}</span>
                      <span className="text-sm font-bold text-slate-900">{formatCurrency(txn.amount)}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {txn.counterparty_label || txn.counterparty_name || "—"}
                    </p>
                    {txn.narration && <p className="mt-1 text-xs text-slate-500">{txn.narration}</p>}
                    <p className="mt-1 text-xs text-slate-400">{formatDateTime(txn.created_at)}</p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </SideDrawer>
    </>
  );
}
