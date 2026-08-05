"use client";

import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  widthClassName?: string;
}

// Slide-in panel from the right, backdrop dims the page behind it — used for quick
// in-context actions where a full page navigation would lose the surrounding screen.
export default function SideDrawer({ isOpen, onClose, children, widthClassName = "max-w-md" }: SideDrawerProps) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-9999 transition-opacity duration-200 ${isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <div
        className={`absolute right-0 top-0 h-full w-full overflow-y-auto bg-slate-50 shadow-2xl transition-transform duration-200 ${widthClassName} ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <button
          type="button"
          aria-label="Close panel"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
        >
          <X size={20} />
        </button>

        <div className="p-6 pt-16">{children}</div>
      </div>
    </div>,
    document.body
  );
}
