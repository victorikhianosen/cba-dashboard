"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { X } from "lucide-react";

type Role = Record<string, any>;
type RoleFormData = Record<string, any>;

interface RoleFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRole: Role | null;
  onSubmit: (formData: RoleFormData) => Promise<void>;
  submitting: boolean;
}

const emptyRoleForm: RoleFormData = {
  name: "",
};

export default function RoleFormDrawer({
  isOpen,
  onClose,
  selectedRole,
  onSubmit,
  submitting,
}: RoleFormDrawerProps) {
  const [formData, setFormData] = useState<RoleFormData>(emptyRoleForm);

  useEffect(() => {
    if (isOpen) {
      if (selectedRole) {
        setFormData({
          name: selectedRole.name ?? "",
        });
      } else {
        setFormData({ ...emptyRoleForm });
      }
    }
  }, [isOpen, selectedRole]);

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(formData);
  }

  return (
    <>
      {/* OVERLAY */}
      {isOpen && (
        <button
          type="button"
          onClick={submitting ? undefined : onClose}
          className="fixed inset-0 z-[9998] bg-black/50 cursor-default transition-opacity"
        />
      )}

      {/* DRAWER */}
      <aside
        className={`fixed right-0 top-0 z-[9999] flex h-screen w-full max-w-[480px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center border-b border-slate-200 p-6 bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {selectedRole ? "Update Role" : "Add New Role"}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Enter the role name below.
            </p>
          </div>
          <button
            type="button"
            onClick={submitting ? undefined : onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto p-6 bg-white">
            <label className="block">
              <span className="block font-bold text-sm text-slate-800">
                Role Name
              </span>
              <input
                required
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g. branch_manager"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition"
              />
            </label>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 p-6 bg-slate-50">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#173673] px-5 py-3 text-sm font-semibold text-white hover:bg-[#10295c] disabled:opacity-50 transition shadow-sm"
            >
              {submitting
                ? "Please wait..."
                : selectedRole
                ? "Update Role"
                : "Create Role"}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
