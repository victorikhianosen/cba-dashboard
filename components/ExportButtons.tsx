"use client";

import { FileSpreadsheet, FileText, Sheet } from "lucide-react";

interface ExportButtonsProps {
  // e.g. "/admin/journal-entries" — the backend resource prefix, export/csv,
  // export/excel and export/pdf are appended automatically.
  baseEndpoint: string;
  // Current filters (from/to/search/etc.), forwarded as-is to the export call.
  params?: Record<string, string | undefined>;
}

export default function ExportButtons({ baseEndpoint, params = {} }: ExportButtonsProps) {
  function buildHref(kind: "csv" | "excel" | "pdf") {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });

    const endpoint = `${baseEndpoint}/export/${kind}?${query.toString()}`;

    return `/api/export?endpoint=${encodeURIComponent(endpoint)}`;
  }

  return (
    <div className="flex items-center gap-2">
      <a
        href={buildHref("csv")}
        className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 shadow-sm"
      >
        <FileSpreadsheet size={17} />
        Export CSV
      </a>

      <a
        href={buildHref("excel")}
        className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 shadow-sm"
      >
        <Sheet size={17} />
        Export Excel
      </a>

      <a
        href={buildHref("pdf")}
        className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 shadow-sm"
      >
        <FileText size={17} />
        Export PDF
      </a>
    </div>
  );
}
