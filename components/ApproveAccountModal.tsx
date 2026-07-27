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
  pending?: boolean;
  onCancel: () => void;
  onConfirm: (payload: { account_product_id: string; account_tier_id?: string }) => void;
}

// Mirrors CustomerType::businessLike() on the API — individual/minor open a
// savings product, business/government/corporate open a current product.
function expectedProductType(customerType: string) {
  const isBusinessLike =
    customerType === "business" || customerType === "government" || customerType === "corporate";

  return isBusinessLike ? "current" : "savings";
}

// Lets the admin pick which account product (and tier) to open for a
// customer at approval time, instead of the system auto-detecting one.
// A product must be selected — approval always opens an account now, the
// backend rejects the request otherwise. Only products matching the
// customer's expected type (savings for individual/minor, current for
// business-like) are offered, since the backend rejects a mismatch anyway.
export default function ApproveAccountModal({
  isOpen,
  customerName,
  customerType,
  accountProducts,
  accountTiers,
  pending = false,
  onCancel,
  onConfirm,
}: ApproveAccountModalProps) {
  const [accountProductId, setAccountProductId] = useState("");
  const [accountTierId, setAccountTierId] = useState("");

  if (!isOpen || typeof document === "undefined") return null;

  const requiredType = expectedProductType(customerType);
  const activeProducts = accountProducts.filter(
    (product) => product.status === "active" && product.product_type === requiredType
  );

  function handleCancel() {
    setAccountProductId("");
    setAccountTierId("");
    onCancel();
  }

  function handleConfirm() {
    if (!accountProductId) return;

    onConfirm({
      account_product_id: accountProductId,
      account_tier_id: accountTierId || undefined,
    });
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
            <h2 className="text-lg font-bold text-slate-900">Approve {customerName}</h2>
            <p className="mt-1 text-sm text-slate-500">
              This customer requires a <span className="font-semibold">{requiredType}</span>{" "}
              account product — select which one to open on approval.
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

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="block text-sm font-semibold text-slate-800">Account Product</span>
            <select
              required
              value={accountProductId}
              onChange={(event) => setAccountProductId(event.target.value)}
              className="mt-2 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
            >
              <option value="" disabled>
                Select an account product...
              </option>
              {activeProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} — {product.product_type} ({product.currency_code})
                </option>
              ))}
            </select>
            {activeProducts.length === 0 && (
              <p className="mt-1.5 text-xs text-amber-600">
                No active '{requiredType}' account products found — activate one first.
              </p>
            )}
          </label>

          {accountProductId && (
            <label className="block">
              <span className="block text-sm font-semibold text-slate-800">
                Account Tier (optional)
              </span>
              <select
                value={accountTierId}
                onChange={(event) => setAccountTierId(event.target.value)}
                className="mt-2 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
              >
                <option value="">Default (tier 1)</option>
                {accountTiers
                  .filter((tier) => tier.status === "active")
                  .map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      Tier {tier.level}
                      {tier.description ? ` — ${tier.description}` : ""}
                    </option>
                  ))}
              </select>
            </label>
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
            disabled={pending || !accountProductId}
            className="rounded-xl bg-[#173673] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#10295c] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Please wait..." : "Approve Customer"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
