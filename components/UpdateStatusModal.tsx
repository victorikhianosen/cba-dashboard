"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { toDisplayLabel } from "@/lib/format";

interface UpdateStatusModalProps {
  isOpen: boolean;
  title: string;
  currentStatus?: string;
  statuses: Record<string, any>[];
  pending?: boolean;
  onCancel: () => void;
  onConfirm: (payload: { status: string; comment?: string }) => void;
}

// Generic "change status" dialog — lists every status from the statuses lookup
// table (grouped by category) with an optional comment, instead of a single
// hardcoded action per status.
export default function UpdateStatusModal({
  isOpen,
  title,
  currentStatus,
  statuses,
  pending = false,
  onCancel,
  onConfirm,
}: UpdateStatusModalProps) {
  const [status, setStatus] = useState("");
  const [comment, setComment] = useState("");

  if (!isOpen || typeof document === "undefined") return null;

  // "pending" is only the initial state a record is created in — never something you
  // transition back into, so it's excluded from the list of selectable statuses.
  const groups = statuses
    .filter((item) => item.code !== "pending")
    .reduce<Record<string, Record<string, any>[]>>((acc, item) => {
      const category = item.category || "Other";
      acc[category] = acc[category] ? [...acc[category], item] : [item];
      return acc;
    }, {});

  const selected = statuses.find((item) => item.code === status);

  function handleCancel() {
    setStatus("");
    setComment("");
    onCancel();
  }

  function handleConfirm() {
    if (!status) return;
    onConfirm({ status, comment: comment.trim() || undefined });
  }

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={handleCancel}
        className="fixed inset-0 bg-black/40"
      />

      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {currentStatus && (
              <p className="mt-1 text-sm text-slate-500">
                Current status:{" "}
                <span className="font-semibold">{toDisplayLabel(currentStatus)}</span>
              </p>
            )}
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
            <span className="block text-sm font-semibold text-slate-800">New Status</span>
            <select
              required
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="mt-2 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
            >
              <option value="" disabled>
                Select a status...
              </option>
              {Object.entries(groups).map(([category, items]) => (
                <optgroup key={category} label={category}>
                  {items.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {selected?.description && (
              <p className="mt-1.5 text-xs text-slate-500">{selected.description}</p>
            )}
          </label>

          <label className="block">
            <span className="block text-sm font-semibold text-slate-800">
              Comment <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <textarea
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Reason for this status change..."
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
            disabled={pending || !status}
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
