"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { X } from "lucide-react";

type Branch = Record<string, any>;
type BranchFormData = Record<string, any>;

interface BranchFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBranch: Branch | null;
  onSubmit: (formData: BranchFormData) => Promise<void>;
  submitting: boolean;
}

const emptyBranchForm: BranchFormData = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  country: "Nigeria",
  status: "active",
};

export default function BranchFormDrawer({
  isOpen,
  onClose,
  selectedBranch,
  onSubmit,
  submitting,
}: BranchFormDrawerProps) {
  const [formData, setFormData] = useState<BranchFormData>(emptyBranchForm);

  useEffect(() => {
    if (isOpen) {
      if (selectedBranch) {
        setFormData({
          name: selectedBranch.name ?? "",
          email: selectedBranch.email ?? "",
          phone: selectedBranch.phone ?? "",
          address: selectedBranch.address ?? "",
          city: selectedBranch.city ?? "",
          state: selectedBranch.state ?? "",
          country: selectedBranch.country ?? "Nigeria",
          status: selectedBranch.status ?? "active",
        });
      } else {
        setFormData({ ...emptyBranchForm });
      }
    }
  }, [isOpen, selectedBranch]);

  function handleInputChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
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
      {/* OVERLAY - Positioned safely behind the drawer */}
      {isOpen && (
        <button
          type="button"
          onClick={submitting ? undefined : onClose}
          className="fixed inset-0 z-[9998] bg-black/50 cursor-default transition-opacity"
        />
      )}

      {/* DRAWER - Highest z-index layer with crisp text contrast */}
      <aside
        className={`fixed right-0 top-0 z-[9999] flex h-screen w-full max-w-[520px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center border-b border-slate-200 p-6 bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {selectedBranch ? "Update Branch" : "Add New Branch"}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Enter the branch information below.
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
            <Input
              label="Branch Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g. Head Office"
            />

            <Input
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="e.g. branch@bank.com"
            />

            <Input
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="e.g. 08012345678"
            />

            <Input
              label="Street Address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="e.g. 12 Adeola Odeku Street"
            />

            <Input
              label="City"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              placeholder="e.g. Victoria Island"
            />

            <Input
              label="State"
              name="state"
              value={formData.state}
              onChange={handleInputChange}
              placeholder="e.g. Lagos"
            />

            <Input
              label="Country"
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              placeholder="e.g. Nigeria"
            />

         
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
                : selectedBranch
                ? "Update Branch"
                : "Create Branch"}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

function Input(props: Record<string, any>) {
  return (
    <label className="block">
      <span className="block font-bold text-sm text-slate-800">{props.label}</span>
      <input
        required
        {...props}
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition"
      />
    </label>
  );
}