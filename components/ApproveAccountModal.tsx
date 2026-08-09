"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ApproveAccountModalProps {
  isOpen: boolean;
  customerName: string;
  customerType: string;
  accountProducts: Record<string, any>[];
  accountTiers: Record<string, any>[];
  // Virtual products are only offered (and the parent-account/beneficiary fields only
  // shown) when this is true — the customer-approval usage of this same modal never
  // passes it, since a virtual account needs an existing parent account to sweep into,
  // which doesn't exist yet at approval time.
  allowVirtual?: boolean;
  parentAccounts?: Record<string, any>[];
  pending?: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (payload: {
    account_product_id: string;
    account_tier_id?: string;
    parent_account_id?: string;
    beneficiary_name?: string;
    purpose?: string;
  }) => void;
}

// Turns a product's raw slug-like name (e.g. "basic_savings_account") into a
// human label ("Basic Savings Account") for display only — the value
// submitted is still the product id.
function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

// Lets the admin pick which account product and tier to open for a customer
// at approval time, instead of the system auto-detecting one. Both fields
// are required — the backend rejects the request otherwise. Every active
// product is offered regardless of customer type, since the admin — not the
// customer's type — decides which product to open.
export default function ApproveAccountModal({
  isOpen,
  customerName,
  accountProducts,
  accountTiers,
  allowVirtual = false,
  parentAccounts = [],
  pending = false,
  title,
  description = "Select which account product to open.",
  confirmLabel = "Confirm",
  onCancel,
  onConfirm,
}: ApproveAccountModalProps) {
  const [accountProductId, setAccountProductId] = useState("");
  const [accountTierId, setAccountTierId] = useState("");
  const [parentAccountId, setParentAccountId] = useState("");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [purpose, setPurpose] = useState("");

  if (!isOpen || typeof document === "undefined") return null;

  // Only offer virtual products where the caller explicitly allows it — a virtual
  // account needs a parent to sweep into, which the backend also rejects everywhere
  // except the dedicated create-virtual-account endpoint.
  const activeProducts = accountProducts.filter(
    (product) => product.status === "active" && (allowVirtual || product.product_type !== "virtual"),
  );
  const activeTiers = accountTiers.filter((tier) => tier.status === "active");

  const selectedProduct = activeProducts.find((product) => String(product.id) === accountProductId);
  const isVirtual = Boolean(selectedProduct && selectedProduct.product_type === "virtual");

  // A virtual account must share its parent's currency — narrow the parent options to
  // the selected product's currency so a mismatched pair can't be selected at all.
  const visibleParentAccounts = selectedProduct
    ? parentAccounts.filter(
        (account) =>
          account.status === "active" &&
          account.account_product?.product_type !== "virtual" &&
          account.currency_id === selectedProduct.currency_id,
      )
    : [];

  function reset() {
    setAccountProductId("");
    setAccountTierId("");
    setParentAccountId("");
    setBeneficiaryName("");
    setPurpose("");
  }

  function handleCancel() {
    reset();
    onCancel();
  }

  function handleProductChange(nextId: string) {
    setAccountProductId(nextId);
    setAccountTierId("");
    setParentAccountId("");
  }

  function handleConfirm() {
    if (!accountProductId) return;

    if (isVirtual) {
      if (!parentAccountId || !beneficiaryName.trim()) return;

      onConfirm({
        account_product_id: accountProductId,
        parent_account_id: parentAccountId,
        beneficiary_name: beneficiaryName.trim(),
        purpose: purpose.trim() || undefined,
      });
    } else {
      if (!accountTierId) return;

      onConfirm({
        account_product_id: accountProductId,
        account_tier_id: accountTierId,
      });
    }

    reset();
  }

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={handleCancel}
        className="fixed inset-0 bg-black/40"
      />

      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title ?? `Approve ${customerName}`}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
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

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="block text-sm font-semibold text-slate-800">Account Product</span>
            <select
              required
              value={accountProductId}
              onChange={(event) => handleProductChange(event.target.value)}
              className="mt-2 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
            >
              <option value="" disabled>
                Select an account product...
              </option>
              {activeProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {titleCase(product.name)} — {product.product_type} ({product.currency_code})
                </option>
              ))}
            </select>
            {activeProducts.length === 0 && (
              <p className="mt-1.5 text-xs text-amber-600">
                No active account products found — activate one first.
              </p>
            )}
          </label>

          {accountProductId && !isVirtual && (
            <label className="block">
              <span className="block text-sm font-semibold text-slate-800">Account Tier</span>
              <select
                required
                value={accountTierId}
                onChange={(event) => setAccountTierId(event.target.value)}
                className="mt-2 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
              >
                <option value="" disabled>
                  Select an account tier...
                </option>
                {activeTiers.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    Tier {tier.level}
                    {tier.description ? ` — ${tier.description}` : ""}
                  </option>
                ))}
              </select>
              {activeTiers.length === 0 && (
                <p className="mt-1.5 text-xs text-amber-600">
                  No active account tiers found — activate one first.
                </p>
              )}
            </label>
          )}

          {isVirtual && (
            <>
              <label className="block">
                <span className="block text-sm font-semibold text-slate-800">Parent Account</span>
                <select
                  required
                  value={parentAccountId}
                  onChange={(event) => setParentAccountId(event.target.value)}
                  className="mt-2 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
                >
                  <option value="" disabled>
                    Select a parent account...
                  </option>
                  {visibleParentAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_number} — {account.account_product?.name?.replace(/_/g, " ") ?? ""} ({account.currency_code})
                    </option>
                  ))}
                </select>
                {visibleParentAccounts.length === 0 ? (
                  <p className="mt-1.5 text-xs text-amber-600">
                    This customer has no eligible active {selectedProduct?.currency_code} account to receive settlements.
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-slate-500">
                    The virtual account sweeps every credit straight through to this account — it must share the
                    virtual product&apos;s currency.
                  </p>
                )}
              </label>

              <label className="block">
                <span className="block text-sm font-semibold text-slate-800">Beneficiary Name</span>
                <input
                  type="text"
                  value={beneficiaryName}
                  onChange={(event) => setBeneficiaryName(event.target.value)}
                  placeholder="e.g. Jane's Store — Till 2"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
                />
              </label>

              <label className="block">
                <span className="block text-sm font-semibold text-slate-800">
                  Purpose <span className="font-normal text-slate-400">(optional)</span>
                </span>
                <input
                  type="text"
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                  placeholder="e.g. Till collections"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
                />
              </label>
            </>
          )}
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
            disabled={
              pending ||
              !accountProductId ||
              (isVirtual ? !parentAccountId || !beneficiaryName.trim() : !accountTierId)
            }
            className="rounded-xl bg-[#173673] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#10295c] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Please wait..." : isVirtual ? "Open Virtual Account" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
