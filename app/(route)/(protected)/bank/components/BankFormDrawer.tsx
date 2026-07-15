"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { ImagePlus, X } from "lucide-react";

type Bank = Record<string, any>;

interface BankFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBank: Bank | null;
  onSubmit: (formData: FormData) => Promise<void>;
  submitting: boolean;
}

const emptyBankForm = {
  bank_name: "",
  bank_code: "",
  short_code: "",
};

export default function BankFormDrawer({
  isOpen,
  onClose,
  selectedBank,
  onSubmit,
  submitting,
}: BankFormDrawerProps) {
  const [fields, setFields] = useState(emptyBankForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (selectedBank) {
        setFields({
          bank_name: selectedBank.bank_name ?? "",
          bank_code: selectedBank.bank_code ?? "",
          short_code: selectedBank.short_code ?? "",
        });
        setLogoPreview(selectedBank.logo ?? null);
      } else {
        setFields({ ...emptyBankForm });
        setLogoPreview(null);
      }
      setLogoFile(null);
    }
  }, [isOpen, selectedBank]);

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setFields((current) => ({ ...current, [name]: value }));
  }

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setLogoFile(file);

    if (file) {
      setLogoPreview(URL.createObjectURL(file));
    }
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData();
    formData.set("bank_name", fields.bank_name);
    formData.set("bank_code", fields.bank_code);
    formData.set("short_code", fields.short_code);

    if (logoFile) {
      formData.set("logo", logoFile);
    }

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
              {selectedBank ? "Update Bank" : "Add New Bank"}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Enter the bank information below.
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
            {/* LOGO */}
            <label className="block">
              <span className="block font-bold text-sm text-slate-800">Bank Logo</span>
              <div className="mt-2 flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoPreview}
                      alt="Bank logo preview"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <ImagePlus size={22} className="text-slate-400" />
                  )}
                </div>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                />
              </div>
            </label>

            <Input
              label="Bank Name"
              name="bank_name"
              value={fields.bank_name}
              onChange={handleInputChange}
              placeholder="e.g. GTBank"
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Bank Code"
                name="bank_code"
                value={fields.bank_code}
                onChange={handleInputChange}
                placeholder="e.g. 1000016"
              />

              <Input
                label="Short Code"
                name="short_code"
                value={fields.short_code}
                onChange={handleInputChange}
                placeholder="e.g. 103"
              />
            </div>
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
                : selectedBank
                ? "Update Bank"
                : "Create Bank"}
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
