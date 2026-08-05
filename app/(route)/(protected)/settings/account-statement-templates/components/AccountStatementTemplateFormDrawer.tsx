"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { ImagePlus, X } from "lucide-react";

type Template = Record<string, any>;

interface AccountStatementTemplateFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTemplate: Template | null;
  onSubmit: (formData: FormData) => Promise<void>;
  submitting: boolean;
}

const emptyForm = {
  name: "",
};

export default function AccountStatementTemplateFormDrawer({
  isOpen,
  onClose,
  selectedTemplate,
  onSubmit,
  submitting,
}: AccountStatementTemplateFormDrawerProps) {
  const [fields, setFields] = useState(emptyForm);

  const [headerImageFile, setHeaderImageFile] = useState<File | null>(null);
  const [headerImagePreview, setHeaderImagePreview] = useState<string | null>(null);

  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (selectedTemplate) {
        setFields({ name: selectedTemplate.name ?? "" });
        setHeaderImagePreview(selectedTemplate.header_image ?? null);
        setIsDefault(!!selectedTemplate.is_default);
      } else {
        setFields({ ...emptyForm });
        setHeaderImagePreview(null);
        setIsDefault(false);
      }
      setHeaderImageFile(null);
    }
  }, [isOpen, selectedTemplate]);

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setFields((current) => ({ ...current, [name]: value }));
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData();
    formData.set("name", fields.name);

    if (headerImageFile) formData.set("header_image", headerImageFile);

    formData.set("is_default", isDefault ? "1" : "0");

    onSubmit(formData);
  }

  return (
    <>
      {isOpen && (
        <button
          type="button"
          onClick={submitting ? undefined : onClose}
          className="fixed inset-0 z-[9998] bg-black/50 cursor-default transition-opacity"
        />
      )}

      <aside
        className={`fixed right-0 top-0 z-[9999] flex h-screen w-full max-w-[520px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center border-b border-slate-200 p-6 bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {selectedTemplate ? "Update Statement Template" : "Add Statement Template"}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Header image used at the top of every statement of account.
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
          <div className="flex-1 space-y-6 overflow-y-auto p-6 bg-white">
            <Input
              label="Template Name"
              name="name"
              value={fields.name}
              onChange={handleInputChange}
              placeholder="e.g. Default Statement Header"
            />

            <label
              className={`flex items-start gap-3 rounded-xl border p-4 ${
                selectedTemplate?.is_default
                  ? "border-slate-200 bg-slate-50 cursor-not-allowed"
                  : "border-slate-200 cursor-pointer hover:bg-slate-50"
              }`}
            >
              <input
                type="checkbox"
                checked={isDefault}
                disabled={!!selectedTemplate?.is_default}
                onChange={(event) => setIsDefault(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#173673]"
              />
              <span>
                <span className="block text-sm font-bold text-slate-800">Set as default</span>
                <span className="block text-xs text-slate-500">
                  {selectedTemplate?.is_default
                    ? "This is the current default — set another template as default to change this."
                    : "The default template is used automatically for every statement of account."}
                </span>
              </span>
            </label>

            <ImageField
              label="Header Image"
              preview={headerImagePreview}
              onChange={(file) => {
                setHeaderImageFile(file);
                if (file) setHeaderImagePreview(URL.createObjectURL(file));
              }}
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
              {submitting ? "Please wait..." : selectedTemplate ? "Update Template" : "Create Template"}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

function Input({
  label,
  required = true,
  ...rest
}: { label: string; required?: boolean } & Record<string, any>) {
  return (
    <label className="block">
      <span className="block font-bold text-sm text-slate-800">{label}</span>
      <input
        required={required}
        {...rest}
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition"
      />
    </label>
  );
}

function ImageField({
  label,
  preview,
  onChange,
}: {
  label: string;
  preview: string | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="block">
      <span className="block font-bold text-sm text-slate-800">{label}</span>
      <div className="mt-2 flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={label} className="h-full w-full object-contain" />
          ) : (
            <ImagePlus size={22} className="text-slate-400" />
          )}
        </div>

        <input
          type="file"
          accept="image/*"
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
        />
      </div>
    </label>
  );
}
