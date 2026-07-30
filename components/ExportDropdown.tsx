"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Download, FileSpreadsheet, FileText, Sheet } from "lucide-react";

interface ExportDropdownProps {
  // e.g. "/admin/transactions" — the backend resource prefix, export/csv,
  // export/excel and export/pdf are appended automatically.
  baseEndpoint: string;
  // Current filters (from/to/search/etc.), forwarded as-is to the export call.
  params?: Record<string, string | undefined>;
}

const OPTIONS = [
  { kind: "csv" as const, label: "Export as CSV", icon: FileSpreadsheet },
  { kind: "excel" as const, label: "Export as Excel", icon: Sheet },
  { kind: "pdf" as const, label: "Export as PDF", icon: FileText },
];

// Single "Export" button with a dropdown of format choices, instead of three
// separate buttons — for places where the toolbar is already crowded with filters.
export default function ExportDropdown({ baseEndpoint, params = {} }: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!isOpen || !buttonRef.current) {
      setPosition(null);
      return;
    }

    const rect = buttonRef.current.getBoundingClientRect();
    setPosition({ top: rect.bottom + 4, left: Math.max(8, rect.right - 208) });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setIsOpen(false);
    }

    function handleReposition() {
      setIsOpen(false);
    }

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [isOpen]);

  function buildHref(kind: "csv" | "excel" | "pdf") {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });

    const endpoint = `${baseEndpoint}/export/${kind}?${query.toString()}`;

    return `/api/export?endpoint=${encodeURIComponent(endpoint)}`;
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 shadow-sm"
      >
        <Download size={17} />
        Export
        <ChevronDown size={15} />
      </button>

      {isOpen &&
        position &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: position.top, left: position.left }}
            className="z-9999 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
          >
            {OPTIONS.map(({ kind, label, icon: Icon }) => (
              <a
                key={kind}
                href={buildHref(kind)}
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
              >
                <Icon size={16} />
                {label}
              </a>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
