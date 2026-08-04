"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, UserRound } from "lucide-react";
import { lookupAccountByNumberAction } from "@/actions/account.action";

function humanize(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export interface ResolvedAccount {
  id: number | string;
  name: string;
  balance: number;
  accountNumber: string;
  productName: string | null;
  currencyCode: string | null;
}

// Small account-number field that resolves and shows the account holder's full name and
// current available balance on blur — so the teller visually confirms who they're
// crediting/debiting (and, for withdrawals, what's actually available) before submitting,
// same as reading a customer's details back to them at a real counter.
export default function AccountLookupField({
  value,
  onChange,
  resolvedAccount,
  onResolved,
  tellerCurrencyCode,
}: {
  value: string;
  onChange: (value: string) => void;
  resolvedAccount: ResolvedAccount | null;
  onResolved: (account: ResolvedAccount | null) => void;
  tellerCurrencyCode?: string | null;
}) {
  const [checking, setChecking] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const currencyMismatch = Boolean(
    resolvedAccount?.currencyCode && tellerCurrencyCode && resolvedAccount.currencyCode !== tellerCurrencyCode
  );

  async function handleBlur() {
    if (!value.trim()) {
      onResolved(null);
      setNotFound(false);
      return;
    }

    setChecking(true);
    try {
      const result: any = await lookupAccountByNumberAction(value.trim());
      if (result?.status === "success" && result.data) {
        onResolved({
          id: result.data.id,
          name: result.data.account_name || "",
          balance: Number(result.data.available_balance ?? result.data.account_balance ?? 0),
          accountNumber: result.data.account_number || "",
          productName: result.data.account_product?.name || null,
          currencyCode: result.data.currency_code || null,
        });
        setNotFound(false);
      } else {
        onResolved(null);
        setNotFound(true);
      }
    } catch {
      onResolved(null);
      setNotFound(true);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-bold text-slate-800">Account Number</label>
      <input
        type="text"
        inputMode="numeric"
        placeholder="Account Number"
        value={value}
        maxLength={10}
        onChange={(e) => {
          onChange(e.target.value.replace(/\D/g, "").slice(0, 10));
          onResolved(null);
          setNotFound(false);
        }}
        onBlur={handleBlur}
        autoFocus
        className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-[#29478f]"
      />
      {checking && <p className="mt-1 text-xs text-slate-500">Looking up account...</p>}
      {!checking && resolvedAccount && (
        <Link
          href={`/customer-management/account/${resolvedAccount.id}`}
          target="_blank"
          className={`mt-3 group block rounded-xl border p-4 transition ${
            currencyMismatch
              ? "border-red-300 bg-red-50 hover:border-red-400 hover:bg-red-100"
              : "border-emerald-200 bg-emerald-50 hover:border-emerald-300 hover:bg-emerald-100"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white ${
                currencyMismatch ? "bg-red-600" : "bg-emerald-600"
              }`}
            >
              <UserRound size={20} />
            </div>
            <div className="min-w-0">
              <p className={`truncate text-base font-bold ${currencyMismatch ? "text-red-900" : "text-emerald-900"}`}>
                {resolvedAccount.name}
              </p>
              <p className={`text-sm font-semibold ${currencyMismatch ? "text-red-700" : "text-emerald-700"}`}>
                {resolvedAccount.balance.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {resolvedAccount.currencyCode ? ` ${resolvedAccount.currencyCode}` : ""}
              </p>
            </div>
            <ExternalLink
              size={16}
              className={`ml-auto shrink-0 opacity-0 transition group-hover:opacity-100 ${
                currencyMismatch ? "text-red-600" : "text-emerald-600"
              }`}
            />
          </div>

          <div className={`mt-3 grid grid-cols-2 gap-3 border-t pt-3 ${currencyMismatch ? "border-red-200" : "border-emerald-200"}`}>
            <div>
              <p className={`text-[11px] font-semibold uppercase tracking-wide ${currencyMismatch ? "text-red-600" : "text-emerald-600"}`}>
                Account Number
              </p>
              <p className={`mt-0.5 text-sm font-bold ${currencyMismatch ? "text-red-900" : "text-emerald-900"}`}>
                {resolvedAccount.accountNumber}
              </p>
            </div>
            {resolvedAccount.productName && (
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-wide ${currencyMismatch ? "text-red-600" : "text-emerald-600"}`}>
                  Account Type
                </p>
                <p className={`mt-0.5 text-sm font-bold ${currencyMismatch ? "text-red-900" : "text-emerald-900"}`}>
                  {humanize(resolvedAccount.productName)}
                </p>
              </div>
            )}
            {resolvedAccount.currencyCode && (
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-wide ${currencyMismatch ? "text-red-600" : "text-emerald-600"}`}>
                  Currency
                </p>
                <p className={`mt-0.5 text-sm font-bold ${currencyMismatch ? "text-red-900" : "text-emerald-900"}`}>
                  {resolvedAccount.currencyCode}
                </p>
              </div>
            )}
          </div>
        </Link>
      )}
      {!checking && currencyMismatch && (
        <p className="mt-1 text-xs font-semibold text-red-600">
          This teller operates in {tellerCurrencyCode}, but this account is in {resolvedAccount?.currencyCode}. Cash
          operations require matching currencies.
        </p>
      )}
      {!checking && notFound && (
        <p className="mt-1 text-xs font-semibold text-red-600">No account found with that number.</p>
      )}
    </div>
  );
}
