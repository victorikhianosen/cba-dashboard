"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  label?: string;
  name: string;
  value: string;
  // Fires a minimal ChangeEvent-shaped object ({ target: { name, value } }) so it drops
  // straight into the same handleInputChange handlers every plain <select> already uses.
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  // Shown when `options` is empty outright (e.g. no GL accounts in the selected
  // currency) — distinct from "No matches found.", which is a search-with-no-results.
  emptyMessage?: string;
}

// A searchable dropdown with the same label/error chrome as the plain <Select> it
// replaces — for fields with too many options to scan (currencies, GL accounts, etc.)
// to comfortably scroll through in a native <select>.
export default function SearchableSelect({
  label,
  name,
  value,
  onChange,
  options,
  placeholder = "Search...",
  error,
  required = true,
  disabled = false,
  emptyMessage,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const selectedOption = options.find((option) => option.value === value) ?? null;

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      return;
    }

    inputRef.current?.focus();
  }, [isOpen]);

  // Prefers dropping down (matches the button visually), but flips to open upward
  // whenever there isn't enough room below — otherwise a long menu (up to ~288px) can
  // extend past its own field and cover unrelated fields/rows sitting right beneath it,
  // making them look like they've vanished. Either way, height is capped to whatever
  // space is actually free so the menu never runs off past the viewport edge.
  const PREFERRED_MENU_HEIGHT = 288;
  const VIEWPORT_MARGIN = 8;

  useEffect(() => {
    if (!isOpen || !containerRef.current) {
      setPosition(null);
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - VIEWPORT_MARGIN;

    if (spaceBelow < PREFERRED_MENU_HEIGHT && spaceAbove > spaceBelow) {
      setPosition({
        bottom: window.innerHeight - rect.top + 4,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.min(PREFERRED_MENU_HEIGHT, spaceAbove),
      });
    } else {
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.min(PREFERRED_MENU_HEIGHT, spaceBelow),
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setIsOpen(false);
    }

    function handleReposition(event: Event) {
      // Scrolling the options list itself bubbles a "scroll" event up to window in the
      // capture phase too — without this check, every scroll attempt inside the menu
      // would immediately close it instead of scrolling.
      if (menuRef.current?.contains(event.target as Node)) return;
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

  const filteredOptions = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return options;

    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(keyword) ||
        option.sublabel?.toLowerCase().includes(keyword)
    );
  }, [options, query]);

  function selectOption(option: SearchableSelectOption) {
    onChange({ target: { name, value: option.value } } as unknown as ChangeEvent<HTMLSelectElement>);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      {label && <span className="block font-bold text-sm text-slate-800">{label}</span>}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        className={`mt-2 flex w-full items-center justify-between rounded-xl border bg-white p-3 text-left text-sm outline-none transition disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500"
            : "border-slate-300 focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f]"
        }`}
      >
        <span className={selectedOption ? "text-slate-900" : "text-slate-400"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className="shrink-0 text-slate-500" />
      </button>

      {/* Hidden input keeps this a real form field for required-field validation. */}
      <input type="hidden" name={name} value={value} required={required} />

      {error && <p className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>}

      {isOpen &&
        position &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: position.top,
              bottom: position.bottom,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
            }}
            className="z-9999 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 p-2">
              <Search size={15} className="ml-1 shrink-0 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Type to search..."
                className="w-full border-none p-1.5 text-sm text-slate-900 outline-none placeholder-slate-400"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
              {filteredOptions.length === 0 && (
                <p className="px-3 py-2.5 text-sm text-slate-500">
                  {options.length === 0 && emptyMessage ? emptyMessage : "No matches found."}
                </p>
              )}

              {filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectOption(option)}
                  className={`flex w-full flex-col items-start rounded-lg px-3 py-2 text-left text-sm transition hover:bg-slate-100 ${
                    option.value === value ? "bg-slate-100 font-semibold text-[#173673]" : "text-slate-800"
                  }`}
                >
                  <span>{option.label}</span>
                  {option.sublabel && <span className="text-xs text-slate-500">{option.sublabel}</span>}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
