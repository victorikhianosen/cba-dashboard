"use client";

import { useState, type ChangeEvent } from "react";
import { CheckCircle2, Download, Loader2, Upload, X, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import { bulkImportCustomersAction } from "@/actions/customer.action";

interface BulkImportCustomersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

type ImportResult = {
  created: number;
  failed: number;
  errors: { row: number; reason: string }[];
} | null;

// Individual customers only — corporate/business customers need nested directors/
// signatories that don't fit a flat spreadsheet row, so they still go through the normal
// single-customer onboarding form. See CustomerService::bulkImport() on the API.
export default function BulkImportCustomersModal({ isOpen, onClose, onImported }: BulkImportCustomersModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult>(null);

  if (!isOpen) return null;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setResult(null);
  }

  function handleClose() {
    if (submitting) return;
    setFile(null);
    setResult(null);
    onClose();
  }

  async function handleUpload() {
    if (!file) {
      toast.error("Choose a file to upload first.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response: any = await bulkImportCustomersAction(formData);

      if (response?.status !== "success") {
        toast.error(response?.message || "Bulk upload failed.");
        return;
      }

      setResult(response.data);
      toast.success(response.message || "Bulk upload complete.");

      if ((response.data?.created ?? 0) > 0) {
        onImported();
      }
    } catch (error) {
      console.error("Failed to bulk-import customers:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Bulk Upload Customers</h2>
            <p className="mt-1 text-sm text-slate-600">
              Upload a spreadsheet to create multiple individual customers at once.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <a
            href="/api/export?endpoint=%2Fadmin%2Fcustomers%2Fbulk-import%2Ftemplate"
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <Download size={16} />
            Download Sample Excel Template
          </a>

          <label className="block">
            <span className="block text-sm font-bold text-slate-800">Upload File</span>
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-4">
              <Upload size={18} className="shrink-0 text-slate-400" />
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Fill in the downloaded template, keep the column headers unchanged, then upload it here.
            </p>
          </label>

          {result && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-4 text-sm font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 size={16} /> {result.created} created
                </span>
                {result.failed > 0 && (
                  <span className="flex items-center gap-1.5 text-red-700">
                    <XCircle size={16} /> {result.failed} failed
                  </span>
                )}
              </div>

              {result.errors.length > 0 && (
                <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-xs text-red-700">
                  {result.errors.map((error, index) => (
                    <li key={index}>
                      Row {error.row}: {error.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 p-6">
          <button
            type="button"
            disabled={submitting}
            onClick={handleClose}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition"
          >
            Close
          </button>
          <button
            type="button"
            disabled={submitting || !file}
            onClick={handleUpload}
            className="flex items-center gap-2 rounded-xl bg-[#173673] px-5 py-3 text-sm font-semibold text-white hover:bg-[#10295c] disabled:cursor-not-allowed disabled:opacity-50 transition shadow-sm"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
