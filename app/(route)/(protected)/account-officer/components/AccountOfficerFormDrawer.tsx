"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { X } from "lucide-react";

type AccountOfficer = Record<string, any>;
type Branch = Record<string, any>;
type User = Record<string, any>;
type AccountOfficerFormData = Record<string, any>;

interface AccountOfficerFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOfficer: AccountOfficer | null;
  onSubmit: (formData: AccountOfficerFormData) => Promise<void>;
  submitting: boolean;
  branches?: Branch[];
  users?: User[];
}

const emptyOfficerForm: AccountOfficerFormData = {
  user_id: "",
  branch_id: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  gender: "male",
  address: "",
  city: "",
  state: "",
  country: "Nigeria",
};

export default function AccountOfficerFormDrawer({
  isOpen,
  onClose,
  selectedOfficer,
  onSubmit,
  submitting,
  branches = [],
  users = [],
}: AccountOfficerFormDrawerProps) {
  const [formData, setFormData] = useState<AccountOfficerFormData>(emptyOfficerForm);

  useEffect(() => {
    if (isOpen) {
      if (selectedOfficer) {
        setFormData({
          user_id: selectedOfficer.user_id ?? "",
          branch_id: selectedOfficer.branch_id ?? "",
          first_name: selectedOfficer.first_name ?? "",
          last_name: selectedOfficer.last_name ?? "",
          email: selectedOfficer.email ?? "",
          phone: selectedOfficer.phone ?? "",
          gender: selectedOfficer.gender ?? "male",
          address: selectedOfficer.address ?? "",
          city: selectedOfficer.city ?? "",
          state: selectedOfficer.state ?? "",
          country: selectedOfficer.country ?? "Nigeria",
        });
      } else {
        setFormData({ ...emptyOfficerForm });
      }
    }
  }, [isOpen, selectedOfficer]);

  function handleInputChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  // Picking a user auto-fills the rest of the form from their profile —
  // the fields stay editable afterward in case anything needs tweaking.
  function handleUserSelect(event: ChangeEvent<HTMLSelectElement>) {
    const userId = event.target.value;
    const user = users.find((candidate) => String(candidate.id) === userId);

    if (!user) {
      setFormData((current) => ({ ...current, user_id: "" }));
      return;
    }

    setFormData((current) => ({
      ...current,
      user_id: user.id,
      branch_id: user.branch_id ?? current.branch_id,
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      gender: user.gender ?? "male",
      address: user.address ?? "",
      city: user.city ?? "",
      state: user.state ?? "",
      country: user.country ?? "Nigeria",
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
        className={`fixed right-0 top-0 z-[9999] flex h-screen w-full max-w-[520px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center border-b border-slate-200 p-6 bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {selectedOfficer ? "Update Account Officer" : "Add New Account Officer"}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Enter the account officer information below.
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
            {!selectedOfficer && (
              <label className="block rounded-xl border border-slate-200 bg-slate-50 p-4">
                <span className="block font-bold text-sm text-slate-800">
                  Create From Existing User
                </span>
                <span className="block text-xs text-slate-500">
                  Optional — pick a user to auto-fill the fields below.
                </span>
                <select
                  name="user_id"
                  value={formData.user_id}
                  onChange={handleUserSelect}
                  className="mt-3 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition"
                >
                  <option value="">— Select a user —</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.username})
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                placeholder="e.g. Chinedu"
              />

              <Input
                label="Last Name"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                placeholder="e.g. Okafor"
              />
            </div>

            <Input
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="e.g. chinedu.okafor@example.com"
            />

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="block font-bold text-sm text-slate-800">Branch</span>
                <select
                  name="branch_id"
                  required
                  value={formData.branch_id}
                  onChange={handleInputChange}
                  className="mt-2 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition"
                >
                  <option value="" disabled>
                    Select a branch
                  </option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block font-bold text-sm text-slate-800">Gender</span>
                <select
                  name="gender"
                  required
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="mt-2 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </label>
            </div>

            <Input
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="e.g. 08034567892"
            />

            <Input
              label="Street Address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="e.g. 24 Independence Layout"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="City"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="e.g. Enugu"
              />

              <Input
                label="State"
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                placeholder="e.g. Enugu"
              />
            </div>

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
                : selectedOfficer
                ? "Update Officer"
                : "Create Officer"}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

function Input(props: Record<string, any>) {
  const { label, ...rest } = props;
  return (
    <label className="block">
      <span className="block font-bold text-sm text-slate-800">{label}</span>
      <input
        required
        {...rest}
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition"
      />
    </label>
  );
}
