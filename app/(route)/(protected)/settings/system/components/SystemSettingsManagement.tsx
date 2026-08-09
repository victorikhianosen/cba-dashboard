"use client";

import { useMemo, useRef, useState } from "react";
import { Save, Settings as SettingsIcon, Upload } from "lucide-react";
import { toast } from "react-toastify";
import { updateSettingAction, uploadSettingImageAction } from "@/actions/setting.action";
import { emitBrandingUpdated } from "@/lib/branding-events";
import { handleApiError } from "@/lib/errors";
import { toDisplayLabel } from "@/lib/format";

type Setting = Record<string, any>;

interface SystemSettingsManagementProps {
  initialSettings?: Setting[];
}

export default function SystemSettingsManagement({
  initialSettings = [],
}: SystemSettingsManagementProps) {
  const [settings, setSettings] = useState<Setting[]>(initialSettings);
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const groups: Record<string, Setting[]> = {};
    for (const setting of settings) {
      const category = setting.category || "General";
      if (!groups[category]) groups[category] = [];
      groups[category].push(setting);
    }
    return groups;
  }, [settings]);

  function getValue(setting: Setting) {
    return Object.prototype.hasOwnProperty.call(drafts, setting.key) ? drafts[setting.key] : setting.value;
  }

  function setDraft(key: string, value: any) {
    setDrafts((current) => ({ ...current, [key]: value }));
  }

  async function handleSave(setting: Setting, overrideValue?: any) {
    const value = overrideValue !== undefined ? overrideValue : getValue(setting);
    setSavingKey(setting.key);

        const result: any = await updateSettingAction(setting.key, value);

    if (result?.status !== "success") {
      handleApiError(result, "Failed to update setting.");
      setSavingKey(null);
      return;
    }

    const updated = result.data ?? { ...setting, value };
    setSettings((current) =>
      current.map((item) => (item.key === setting.key ? { ...item, ...updated } : item))
    );
    setDrafts((current) => {
      const next = { ...current };
      delete next[setting.key];
      return next;
    });
    if (setting.key.startsWith("system.company.")) {
      emitBrandingUpdated();
    }
    toast.success(result.message || "Setting updated successfully.");
  
    setSavingKey(null);
  

  }

  async function handleImageUpload(setting: Setting, file: File) {
    setSavingKey(setting.key);

        const formData = new FormData();
    formData.append("image", file);

    const result: any = await uploadSettingImageAction(setting.key, formData);

    if (result?.status !== "success") {
      handleApiError(result, "Failed to upload image.");
      setSavingKey(null);
      return;
    }

    const updated = result.data ?? setting;
    setSettings((current) =>
      current.map((item) => (item.key === setting.key ? { ...item, ...updated } : item))
    );
    if (setting.key.startsWith("system.company.")) {
      emitBrandingUpdated();
    }
    toast.success(result.message || "Image updated successfully.");
  
    setSavingKey(null);
  

  }

  const categories = Object.keys(grouped);

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Application-wide configuration values, grouped by category.
        </p>
      </div>

      {categories.length === 0 && (
        <section className="mt-7 rounded-xl border border-slate-200 bg-white p-16 text-center shadow-sm">
          <SettingsIcon size={28} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No settings found.</p>
        </section>
      )}

      {categories.map((category) => (
        <section key={category} className="mt-7 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              {toDisplayLabel(category)}
            </h2>
          </div>

          <div className="divide-y divide-slate-100">
            {grouped[category].map((setting) => (
              <SettingRow
                key={setting.key}
                setting={setting}
                value={getValue(setting)}
                onChange={(value) => setDraft(setting.key, value)}
                onSave={() => handleSave(setting)}
                onAutoSave={(value) => handleSave(setting, value)}
                onImageUpload={(file) => handleImageUpload(setting, file)}
                saving={savingKey === setting.key}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

function SettingRow({
  setting,
  value,
  onChange,
  onSave,
  onAutoSave,
  onImageUpload,
  saving,
}: {
  setting: Setting;
  value: any;
  onChange: (value: any) => void;
  onSave: () => void;
  onAutoSave: (value: any) => void;
  onImageUpload: (file: File) => void;
  saving: boolean;
}) {
  const editable = setting.editable !== false;
  const isBoolean = (setting.type || "string") === "boolean";
  const isImage = setting.type === "image";
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
      <div className="max-w-md">
        <p className="text-sm font-bold text-slate-900">{setting.label || toDisplayLabel(setting.key)}</p>
        {setting.description && (
          <p className="mt-1 text-xs font-medium text-slate-500">{setting.description}</p>
        )}
      </div>

      {isImage ? (
        <div className="flex items-center gap-3 md:w-[340px]">
          {value && (
            <img
              src={value}
              alt={setting.label || setting.key}
              className="h-10 w-10 shrink-0 rounded-lg border border-slate-200 object-contain p-1"
            />
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImageUpload(file);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!editable || saving}
            className="flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#173673] px-3.5 text-xs font-semibold text-white transition hover:bg-[#10295c] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload size={14} />
            {saving ? "Uploading..." : value ? "Replace" : "Upload"}
          </button>
        </div>
      ) : isBoolean ? (
        <div className="md:w-[340px]">
          <SettingInput
            setting={setting}
            value={value}
            onChange={onAutoSave}
            disabled={!editable || saving}
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 md:w-[340px]">
          <div className="flex-1">
            <SettingInput setting={setting} value={value} onChange={onChange} disabled={!editable} />
          </div>

          <button
            type="button"
            onClick={onSave}
            disabled={!editable || saving}
            className="flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#173673] px-3.5 text-xs font-semibold text-white transition hover:bg-[#10295c] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}

function SettingInput({
  setting,
  value,
  onChange,
  disabled,
}: {
  setting: Setting;
  value: any;
  onChange: (value: any) => void;
  disabled: boolean;
}) {
  const type = setting.type || "string";

  if (type === "boolean") {
    const checked = value === true || value === "true" || value === 1 || value === "1";
    return (
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onChange(checked ? "0" : "1")}
          className={`relative inline-flex h-7 w-13 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#29478f] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
            checked ? "bg-emerald-500" : "bg-slate-300"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
              checked ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
        <span className={`text-xs font-bold ${checked ? "text-emerald-600" : "text-slate-400"}`}>
          {checked ? "On" : "Off"}
        </span>
      </div>
    );
  }

  // Stored (and read by the session-lock idle timer) in seconds, but seconds is an
  // awkward unit for an admin to type — show/accept minutes here and convert at the edges.
  if (setting.key === "security.session.session_lock_timeout") {
    const minutes = value !== "" && value != null ? Math.round(Number(value) / 60) : "";
    return (
      <div className="relative">
        <input
          type="number"
          min={1}
          step="1"
          value={minutes}
          disabled={disabled}
          onChange={(event) => {
            const nextMinutes = event.target.value;
            onChange(nextMinutes === "" ? "" : String(Math.max(1, Number(nextMinutes)) * 60));
          }}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-16 text-sm text-slate-900 outline-none transition focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
          minutes
        </span>
      </div>
    );
  }

  if (type === "integer" || type === "decimal") {
    return (
      <input
        type="number"
        step={type === "decimal" ? "0.01" : "1"}
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      />
    );
  }

  if (type === "date") {
    return (
      <input
        type="date"
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      />
    );
  }

  // string | json
  return (
    <input
      type="text"
      value={typeof value === "string" ? value : value != null ? JSON.stringify(value) : ""}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
    />
  );
}
