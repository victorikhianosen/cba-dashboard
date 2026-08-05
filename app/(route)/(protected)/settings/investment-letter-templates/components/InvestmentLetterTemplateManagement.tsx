"use client";

import { useState, type ReactNode } from "react";
import { CheckCircle2, Edit3, FileText, ImageIcon, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import {
  createInvestmentLetterTemplateAction,
  deleteInvestmentLetterTemplateAction,
  getInvestmentLetterTemplatesAction,
  setDefaultInvestmentLetterTemplateAction,
  updateInvestmentLetterTemplateAction,
} from "@/actions/investment-letter-template.action";
import ActionMenu from "@/components/ActionMenu";
import { handleApiError } from "@/lib/errors";
import InvestmentLetterTemplateFormDrawer from "./InvestmentLetterTemplateFormDrawer";

type Template = Record<string, any>;
type Meta = Record<string, any> | null;

interface InvestmentLetterTemplateManagementProps {
  initialTemplates?: Template[];
  initialMeta?: Meta;
}

export default function InvestmentLetterTemplateManagement({
  initialTemplates = [],
  initialMeta = null,
}: InvestmentLetterTemplateManagementProps) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [meta, setMeta] = useState<Meta>(initialMeta);
  const [pageLoading, setPageLoading] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [actionMenuId, setActionMenuId] = useState<any>(null);

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settingDefaultId, setSettingDefaultId] = useState<any>(null);

  async function fetchTemplates() {
    setPageLoading(true);
    try {
      const result: any = await getInvestmentLetterTemplatesAction(1);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to load templates.");
        return;
      }

      setTemplates(Array.isArray(result.data) ? result.data : []);
      setMeta(result.meta ?? null);
    } catch (error) {
      console.error("Failed to load investment letter templates:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setPageLoading(false);
    }
  }

  function openCreateDrawer() {
    setSelectedTemplate(null);
    setActionMenuId(null);
    setDrawerOpen(true);
  }

  function openUpdateDrawer(template: Template) {
    setSelectedTemplate(template);
    setActionMenuId(null);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    if (submitting) return;
    setDrawerOpen(false);
    setSelectedTemplate(null);
  }

  async function handleFormSubmit(formData: FormData) {
    setSubmitting(true);
    try {
      if (selectedTemplate) {
        const result: any = await updateInvestmentLetterTemplateAction(selectedTemplate.id, formData);

        if (result?.status !== "success") {
          handleApiError(result, "Failed to update template.");
          return;
        }

        await fetchTemplates();
        toast.success(result.message || "Template updated successfully.");
      } else {
        const result: any = await createInvestmentLetterTemplateAction(formData);

        if (result?.status !== "success") {
          handleApiError(result, "Failed to create template.");
          return;
        }

        await fetchTemplates();
        toast.success(result.message || "Template created successfully.");
      }
      setDrawerOpen(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error("Failed to save investment letter template:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSetDefault(template: Template) {
    setSettingDefaultId(template.id);
    setActionMenuId(null);
    try {
      const result: any = await setDefaultInvestmentLetterTemplateAction(template.id);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to set default template.");
        return;
      }

      await fetchTemplates();
      toast.success(result.message || "Default template updated.");
    } catch (error) {
      console.error("Failed to set default investment letter template:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setSettingDefaultId(null);
    }
  }

  async function handleDelete() {
    if (!templateToDelete) return;
    setDeleting(true);
    try {
      const result: any = await deleteInvestmentLetterTemplateAction(templateToDelete.id);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to delete template.");
        return;
      }

      setTemplateToDelete(null);
      await fetchTemplates();
      toast.success(result.message || "Template deleted successfully.");
    } catch (error) {
      console.error("Failed to delete investment letter template:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Investment Letter Templates</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage letterhead and signatories used when printing investment letters — the
            template marked Default is used automatically for every letter.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateDrawer}
          className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#173673] px-5 text-sm font-semibold text-white transition hover:bg-[#10295c] shadow-sm"
        >
          <Plus size={18} />
          Add Template
        </button>
      </div>

      <section className="mt-7 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <Heading>Template</Heading>
                <Heading>Signatories</Heading>
                <Heading>Status</Heading>
                <Heading>Actions</Heading>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {templates.map((template) => (
                <tr key={template.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                        {template.header_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={template.header_image}
                            alt={template.name}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <ImageIcon size={18} className="text-slate-400" />
                        )}
                      </div>
                      <p className="font-bold text-sm text-slate-900">{template.name}</p>
                    </div>
                  </td>

                  <td className="px-5 text-sm font-medium text-slate-700">
                    {[template.signatory_one_name, template.signatory_two_name].filter(Boolean).join(", ") || "—"}
                  </td>

                  <td className="px-5">
                    {template.is_default ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                        <Star size={12} />
                        Default
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-400">—</span>
                    )}
                  </td>

                  <td className="px-5">
                    <ActionMenu
                      isOpen={actionMenuId === template.id}
                      onToggle={() => setActionMenuId(actionMenuId === template.id ? null : template.id)}
                      onClose={() => setActionMenuId(null)}
                    >
                      <ActionButton onClick={() => openUpdateDrawer(template)}>
                        <Edit3 size={16} />
                        Edit Template
                      </ActionButton>

                      {!template.is_default && (
                        <ActionButton
                          onClick={() => handleSetDefault(template)}
                          disabled={settingDefaultId === template.id}
                        >
                          <CheckCircle2 size={16} />
                          Set as Default
                        </ActionButton>
                      )}

                      {!template.is_default && (
                        <>
                          <div className="my-1 border-t border-slate-100" />
                          <button
                            type="button"
                            onClick={() => {
                              setTemplateToDelete(template);
                              setActionMenuId(null);
                            }}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-red-600 hover:bg-red-50 text-sm font-semibold transition"
                          >
                            <Trash2 size={16} />
                            Delete Template
                          </button>
                        </>
                      )}
                    </ActionMenu>
                  </td>
                </tr>
              ))}

              {!pageLoading && templates.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center text-sm font-medium text-slate-500">
                    <FileText size={28} className="mx-auto mb-3 text-slate-300" />
                    No letter templates yet. Create one to customize investment letters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {meta && (
          <div className="border-t border-slate-200 p-5 bg-slate-50">
            <p className="text-sm font-medium text-slate-600">
              Showing {meta.from ?? 0}-{meta.to ?? 0} of {meta.total ?? templates.length} templates
            </p>
          </div>
        )}
      </section>

      <InvestmentLetterTemplateFormDrawer
        isOpen={drawerOpen}
        onClose={closeDrawer}
        selectedTemplate={selectedTemplate}
        onSubmit={handleFormSubmit}
        submitting={submitting}
      />

      {templateToDelete && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl border border-slate-100">
            <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 size={24} />
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-900">Delete Template?</h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Are you sure you want to delete <b>{templateToDelete.name}</b>? This action cannot be undone.
            </p>

            <div className="mt-7 flex justify-end gap-3">
              <button
                onClick={() => setTemplateToDelete(null)}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-xl bg-red-600 px-5 py-3 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return (
    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
      {children}
    </th>
  );
}

function ActionButton(props: Record<string, any>) {
  return (
    <button
      type="button"
      {...props}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-100 text-sm font-semibold text-slate-800 transition disabled:cursor-not-allowed disabled:opacity-50"
    >
      {props.children}
    </button>
  );
}
