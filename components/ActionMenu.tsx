"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";

interface ActionMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: ReactNode;
  /** Tailwind width class for the menu, e.g. "w-52" (default) or "w-56". */
  widthClassName?: string;
}

const WIDTH_PX: Record<string, number> = { "w-52": 208, "w-56": 224, "w-60": 240 };

// Renders the dropdown through a portal to <body> with `position: fixed`
// coordinates, so it isn't clipped by a table's horizontal-scroll wrapper
// (setting overflow-x forces overflow-y non-visible too, per the CSS spec,
// which was cutting these menus off whenever a row sat near the bottom).
export default function ActionMenu({
  isOpen,
  onToggle,
  onClose,
  children,
  widthClassName = "w-52",
}: ActionMenuProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!isOpen || !buttonRef.current) {
      setPosition(null);
      return;
    }

    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = WIDTH_PX[widthClassName] ?? 208;
    setPosition({
      top: rect.bottom + 4,
      left: Math.max(8, rect.right - menuWidth),
    });
  }, [isOpen, widthClassName]);

  useEffect(() => {
    if (!isOpen) return;

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      onClose();
    }

    function handleReposition() {
      onClose();
    }

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [isOpen, onClose]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
      >
        <MoreHorizontal size={18} />
      </button>

      {isOpen &&
        position &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: position.top, left: position.left }}
            className={`z-9999 ${widthClassName} rounded-xl border border-slate-200 bg-white p-2 shadow-xl`}
          >
            {children}
          </div>,
          document.body
        )}
    </>
  );
}
