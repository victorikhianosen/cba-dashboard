"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import {
  buyTellerCashAction,
  depositForCustomerAction,
  requestWithdrawalAction,
  sellTellerCashAction,
} from "@/actions/cashier-session.action";
import AmountInput from "@/components/AmountInput";
import { handleApiError } from "@/lib/errors";
import { ACTION_META, type ActionKind } from "../actionMeta";
import AccountLookupField, { type ResolvedAccount } from "./AccountLookupField";

type Teller = Record<string, any>;
type CashierSession = Record<string, any>;

interface TellerActionFormProps {
  action: ActionKind;
  session: CashierSession;
  myTeller: Teller;
  onCancel: () => void;
  onSuccess: () => void;
}

const inputClassName =
  "h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-[#29478f]";

export default function TellerActionForm({
  action,
  session,
  myTeller,
  onCancel,
  onSuccess,
}: TellerActionFormProps) {
  const meta = ACTION_META[action];
  const Icon = meta.icon;

  const [submitting, setSubmitting] = useState(false);
  const [accountNumber, setAccountNumber] = useState("");
  const [resolvedAccount, setResolvedAccount] =
    useState<ResolvedAccount | null>(null);
  const [amount, setAmount] = useState("");
  const [narration, setNarration] = useState("");

  const tellerCurrencyCode: string | null = myTeller.currency_code ?? null;
  const currencyMismatch = Boolean(
    resolvedAccount?.currencyCode &&
    tellerCurrencyCode &&
    resolvedAccount.currencyCode !== tellerCurrencyCode,
  );

  const exceedsBalance = Boolean(
    action === "withdraw" &&
    resolvedAccount &&
    amount &&
    Number(amount) > resolvedAccount.balance,
  );

  const isFormValid = Boolean(
    amount &&
    Number(amount) > 0 &&
    (!meta.needsAccount || (accountNumber && resolvedAccount)) &&
    !currencyMismatch &&
    !exceedsBalance,
  );

  async function handleSubmit() {
    if (!amount) {
      toast.error("Enter an amount.");
      return;
    }

    if (meta.needsAccount && !accountNumber) {
      toast.error("Enter an account number.");
      return;
    }

    if (meta.needsAccount && !resolvedAccount) {
      toast.error("Look up a valid account before continuing.");
      return;
    }

    if (currencyMismatch) {
      toast.error(
        `This teller operates in ${tellerCurrencyCode}, but the account is in ${resolvedAccount?.currencyCode}. Currencies must match.`,
      );
      return;
    }

    if (
      action === "withdraw" &&
      resolvedAccount &&
      Number(amount) > resolvedAccount.balance
    ) {
      toast.error("Withdrawal amount exceeds the account's available balance.");
      return;
    }

    setSubmitting(true);
    let result: any;

    if (action === "buy") {
      result = await buyTellerCashAction(
        session.id,
        "vault",
        myTeller.vault_id,
        amount,
        narration || undefined,
      );
    } else if (action === "sell") {
      result = await sellTellerCashAction(
        session.id,
        "vault",
        myTeller.vault_id,
        amount,
        narration || undefined,
      );
    } else if (action === "deposit") {
      result = await depositForCustomerAction(
        session.id,
        accountNumber,
        amount,
        narration || undefined,
      );
    } else {
      result = await requestWithdrawalAction(
        session.id,
        accountNumber,
        amount,
        narration || undefined,
      );
    }

    if (result?.status !== "success") {
      handleApiError(result, "That action failed.");
      setSubmitting(false);
      return;
    }

    toast.success(meta.successMessage);
    setAccountNumber("");
    setResolvedAccount(null);
    setAmount("");
    setNarration("");
    onSuccess();

    setSubmitting(false);
  }

  const toneButtonClass =
    meta.tone === "emerald"
      ? "bg-emerald-600 hover:bg-emerald-700"
      : "bg-red-600 hover:bg-red-700";
  const toneIconClass =
    meta.tone === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-red-50 text-red-700";

  return (
    <div>
      <div className="flex items-center gap-4">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${toneIconClass}`}
        >
          <Icon size={26} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {meta.title}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{meta.helper}</p>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {meta.needsAccount && (
          <AccountLookupField
            value={accountNumber}
            onChange={setAccountNumber}
            resolvedAccount={resolvedAccount}
            onResolved={setResolvedAccount}
            tellerCurrencyCode={tellerCurrencyCode}
          />
        )}
        <div>
          <label className="mb-1.5 block text-sm font-bold text-slate-800">
            Amount
          </label>
          <AmountInput
            value={amount}
            onChange={setAmount}
            className={inputClassName}
            autoFocus={!meta.needsAccount}
          />
          {action === "withdraw" && resolvedAccount && (
            <p className="mt-1 text-xs text-slate-500">
              Cannot exceed available balance of{" "}
              {resolvedAccount.balance.toLocaleString("en-NG", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              {resolvedAccount.currencyCode
                ? ` ${resolvedAccount.currencyCode}`
                : ""}
              .
            </p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-bold text-slate-800">
            Narration (optional)
          </label>
          <input
            type="text"
            placeholder="Narration (optional)"
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            className={inputClassName}
          />
        </div>
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={submitting || !isFormValid}
          onClick={handleSubmit}
          className={`rounded-xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 ${toneButtonClass}`}
        >
          {submitting ? "Submitting..." : meta.submitLabel}
        </button>
      </div>
    </div>
  );
}
