"use client";

import type { ChangeEvent } from "react";

type Branch = Record<string, any>;
type UserFormData = Record<string, any>;

interface UserFormProps {
  formData: UserFormData;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  branches?: Branch[];
  mode: "create" | "edit";
}

export default function UserForm({
  formData,
  onChange,
  branches = [],
  mode,
}: UserFormProps) {
  return (
    <div className="space-y-5">
      {mode === "create" && (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          A username and temporary password will be generated automatically and emailed to this
          address once the account is created.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="First Name"
          name="first_name"
          value={formData.first_name}
          onChange={onChange}
          placeholder="e.g. Grace"
        />

        <Input
          label="Last Name"
          name="last_name"
          value={formData.last_name}
          onChange={onChange}
          placeholder="e.g. Igbinovia"
        />
      </div>

      {mode === "edit" && (
        <Input
          label="Username"
          name="username"
          value={formData.username}
          onChange={onChange}
          placeholder="e.g. grace.igbinovia"
        />
      )}

      <Input
        label="Email Address"
        name="email"
        type="email"
        value={formData.email}
        onChange={onChange}
        placeholder="e.g. staff@bank.com"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="block font-bold text-sm text-slate-800">Branch</span>
          <select
            name="branch_id"
            required
            value={formData.branch_id}
            onChange={onChange}
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

        <Input
          label="Staff Code"
          name="staff_code"
          value={formData.staff_code}
          onChange={onChange}
          placeholder="e.g. CS1002"
        />
      </div>

      <label className="block">
        <span className="block font-bold text-sm text-slate-800">Gender</span>
        <select
          name="gender"
          required
          value={formData.gender}
          onChange={onChange}
          className="mt-2 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition"
        >
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </label>

      <Input
        label="Phone Number"
        name="phone"
        value={formData.phone}
        onChange={onChange}
        placeholder="e.g. +2348012345678"
        inputMode="tel"
        maxLength={16}
      />

      <Input
        label="Street Address"
        name="address"
        value={formData.address}
        onChange={onChange}
        placeholder="e.g. 25 Sapele Road"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="City"
          name="city"
          value={formData.city}
          onChange={onChange}
          placeholder="e.g. Benin City"
        />

        <Input
          label="State"
          name="state"
          value={formData.state}
          onChange={onChange}
          placeholder="e.g. Edo"
        />
      </div>

      <Input
        label="Country"
        name="country"
        value={formData.country}
        onChange={onChange}
        placeholder="e.g. Nigeria"
      />
    </div>
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
