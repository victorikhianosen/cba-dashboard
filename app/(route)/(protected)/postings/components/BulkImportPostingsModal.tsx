"use client";

import { useState, type ChangeEvent } from "react";
import { CheckCircle2, Download, Loader2, Upload, X, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { bulkImportPostingsAction } from "@/actions/posting.action";

interface BulkImportPostingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

type ImportResult = {
  created: number;
  failed: number;
  errors: { row: number; reason: string }[];
} | null;

// Every posting lands as PENDING — this only automates data entry, a different admin still
// has to approve each one. The template's "Postings" sheet is what gets parsed; its "GL
// Reference" sheet is just a lookup aid, so only the first sheet is read for the preview
// here. See PostingService::bulkImport() on the API.
export default function BulkImportPostingsModal({ isOpen, onClose, onImported }: BulkImportPostingsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult>(null);
  const [previewRows, setPreviewRows] = useState<Record<string, any>[]>([]);
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  if (!isOpen) return null;

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
    setPreviewRows([]);
    setPreviewColumns([]);
    setPreviewError(null);

    if (!selected) return;

    setParsing(true);
    try {
      const buffer = await selected.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames.includes("Postings") ? "Postings" : workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

      if (rows.length === 0) {
        setPreviewError("No rows found in the Postings sheet.");
        return;
      }

      setPreviewColumns(Object.keys(rows[0]));
      setPreviewRows(rows);
    } catch (error) {
      console.error("Failed to parse spreadsheet for preview:", error);
      setPreviewError("Could not read this file for preview. It can still be uploaded as-is.");
    } finally {
      setParsing(false);
    }
  }

  function handleClose() {
    if (submitting) return;
    setFile(null);
    setResult(null);
    setPreviewRows([]);
    setPreviewColumns([]);
    setPreviewError(null);
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

      const response: any = await bulkImportPostingsAction(formData);

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
      console.error("Failed to bulk-import postings:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Bulk Upload Postings</h2>
            <p className="mt-1 text-sm text-slate-600">
              Upload a spreadsheet to create multiple pending postings at once. Each still needs a
              second admin to approve it, same as a manually created posting.
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

        <div className="space-y-5 overflow-y-auto p-6">
          <a
            href="/api/export?endpoint=%2Fadmin%2Fpostings%2Fbulk-import%2Ftemplate"
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
              Fill in the Postings sheet of the downloaded template (use the GL Reference sheet to
              look up GL codes), keep the column headers unchanged, then upload it here.
            </p>
          </label>

          {parsing && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              Reading file for preview...
            </div>
          )}

          {previewError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              {previewError}
            </div>
          )}

          {previewRows.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800">Preview</span>
                <span className="text-xs font-medium text-slate-500">
                  {previewRows.length} row{previewRows.length === 1 ? "" : "s"} found — review before uploading
                </span>
              </div>
              <div className="max-h-72 overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      <th className="whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-600">#</th>
                      {previewColumns.map((column) => (
                        <th
                          key={column}
                          className="whitespace-nowrap px-3 py-2 text-left font-semibold text-slate-600"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {previewRows.map((row, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-3 py-2 text-slate-400">{index + 1}</td>
                        {previewColumns.map((column) => (
                          <td key={column} className="whitespace-nowrap px-3 py-2 text-slate-700">
                            {String(row[column] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
            disabled={submitting || parsing || !file}
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
