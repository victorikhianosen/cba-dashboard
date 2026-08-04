"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Landmark,
  Mail,
  MapPin,
  Phone,
  PlusCircle,
  RefreshCw,
  User,
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  approveCustomerAction,
  closeCustomerAction,
  openCustomerAccountAction,
  rejectCustomerAction,
  toggleEmailAction,
  toggleInternetBankingAction,
  toggleSmsAction,
  updateCustomerDocumentAction,
  updateCustomerStatusAction,
} from "@/actions/customer.action";
import ApproveAccountModal from "@/components/ApproveAccountModal";
import ReasonModal from "@/components/ReasonModal";
import UpdateStatusModal from "@/components/UpdateStatusModal";
import { handleApiError } from "@/lib/errors";
import { toDisplayLabel } from "@/lib/format";

type Customer = Record<string, any>;

interface CustomerDetailProps {
  customer: Customer;
  accountProducts?: Record<string, any>[];
  accountTiers?: Record<string, any>[];
  statuses?: Record<string, any>[];
}

const STORAGE_URL = process.env.NEXT_PUBLIC_STORAGE_URL ?? "";

function documentUrl(path: string) {
  return `${STORAGE_URL}/${path}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

// Mirrors CustomerType::businessLike() on the API — business customers carry a business
// record and signatories instead of personal fields. "Corporate" is not a separate
// customer_type — it's a business-like customer that additionally has director rows on
// file (see hasDirectors below). "Government" is not a separate customer_type either —
// it's a business customer with legal_form = "government".
function isBusinessLike(customerType: string) {
  return customerType === "business";
}

function customerDisplayName(customer: Customer) {
  if (isBusinessLike(customer.customer_type)) {
    return customer.business_name || customer.business?.business_name || "—";
  }

  return `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim() || "—";
}

// Adding a Loans or Investments tab later is just another entry here.
const TABS = [
  { key: "customer", label: "Customer", icon: User },
  { key: "accounts", label: "Accounts", icon: Landmark },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function CustomerDetail({
  customer,
  accountProducts = [],
  accountTiers = [],
  statuses = [],
}: CustomerDetailProps) {
  const router = useRouter();
  const isBusiness = isBusinessLike(customer.customer_type);
  const hasDirectors = Array.isArray(customer.directors) && customer.directors.length > 0;
  // "minor" isn't its own customer_type — it's an individual with guardian_id set.
  const isMinor = Boolean(customer.guardian_id);

  const [activeTab, setActiveTab] = useState<TabKey>("customer");
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [documentActionPending, setDocumentActionPending] = useState<number | null>(null);
  const [openModal, setOpenModal] = useState<
    "reject" | "close" | "approve" | "status" | "add-account" | null
  >(null);

  async function runAction(key: string, action: () => Promise<any>, successMessage: string) {
    setActionPending(key);
    try {
      const result: any = await action();

      if (result?.status !== "success") {
        handleApiError(result, "That action failed.");
        return;
      }

      toast.success(result.message || successMessage);
      router.refresh();
    } catch (error) {
      console.error("Customer action failed:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setActionPending(null);
    }
  }

  function handleApprove(payload: { account_product_id: string; account_tier_id: string }) {
    setOpenModal(null);
    runAction(
      "approve",
      () => approveCustomerAction(customer.id, payload),
      "Customer approved."
    );
  }

  function handleAddAccount(payload: { account_product_id: string; account_tier_id: string }) {
    setOpenModal(null);

    const product = accountProducts.find(
      (item) => String(item.id) === String(payload.account_product_id)
    );

    runAction(
      "add-account",
      () =>
        openCustomerAccountAction(customer.id, {
          account_product_id: payload.account_product_id,
          account_type: product?.product_type,
          account_tier_id: payload.account_tier_id,
        }),
      "Account opened successfully."
    );
  }

  function handleReject(reason: string) {
    setOpenModal(null);
    runAction("reject", () => rejectCustomerAction(customer.id, reason), "Customer rejected.");
  }

  function handleClose(reason: string) {
    setOpenModal(null);
    runAction("close", () => closeCustomerAction(customer.id, reason), "Customer closed.");
  }

  function handleUpdateStatus(payload: { status: string; comment?: string }) {
    setOpenModal(null);
    runAction(
      "status",
      () => updateCustomerStatusAction(customer.id, payload.status, payload.comment),
      "Customer status updated."
    );
  }

  async function handleDocumentStatus(documentId: number, status: "approved" | "rejected") {
    setDocumentActionPending(documentId);
    try {
      const result: any = await updateCustomerDocumentAction(customer.id, documentId, { status });

      if (result?.status !== "success") {
        handleApiError(result, "Failed to update document.");
        return;
      }

      toast.success(result.message || `Document ${status}.`);
      router.refresh();
    } catch (error) {
      console.error("Failed to update document:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setDocumentActionPending(null);
    }
  }

  return (
    <>
      {/* HEADER */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          href="/customer-management/customer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#29478f] transition"
        >
          <ArrowLeft size={16} />
          Back to Customers
        </Link>

        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#29478f]">
              {isBusiness ? <Briefcase size={26} /> : <User size={26} />}
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {customerDisplayName(customer)}
              </h1>

              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="rounded-full bg-slate-100 px-2.5 py-1">
                  {customer.cif_number || `CUS-${customer.id}`}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 capitalize">
                  {customer.customer_type}
                </span>
                <StatusBadge status={customer.status} />
                {customer.referral_code && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">
                    Ref: {customer.referral_code}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/customer-management/customer/${customer.id}/edit`}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Edit
            </Link>

            {customer.status === "pending" && (
              <>
                <ActionButton
                  label="Approve"
                  icon={<CheckCircle2 size={14} />}
                  pending={actionPending === "approve"}
                  onClick={() => setOpenModal("approve")}
                  className="border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                />
                <ActionButton
                  label="Reject"
                  icon={<XCircle size={14} />}
                  pending={actionPending === "reject"}
                  onClick={() => setOpenModal("reject")}
                  className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                />
              </>
            )}

            {customer.status === "active" && (
              <>
                <ActionButton
                  label="Add Account"
                  icon={<PlusCircle size={14} />}
                  pending={actionPending === "add-account"}
                  onClick={() => setOpenModal("add-account")}
                  className="border-blue-300 bg-blue-50 text-[#173673] hover:bg-blue-100"
                />
                <ActionButton
                  label="Close"
                  icon={<XCircle size={14} />}
                  pending={actionPending === "close"}
                  onClick={() => setOpenModal("close")}
                  className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                />
              </>
            )}

            {customer.status !== "pending" && (
              <ActionButton
                label="Update Status"
                icon={<RefreshCw size={14} />}
                pending={actionPending === "status"}
                onClick={() => setOpenModal("status")}
                className="border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
              />
            )}
          </div>
        </div>
      </div>

      <UpdateStatusModal
        isOpen={openModal === "status"}
        title={`Update Status — ${customerDisplayName(customer)}`}
        currentStatus={customer.status}
        statuses={statuses.filter((item) => item.code !== "lien")}
        pending={actionPending === "status"}
        onCancel={() => setOpenModal(null)}
        onConfirm={handleUpdateStatus}
      />

      <ApproveAccountModal
        isOpen={openModal === "approve"}
        customerName={customerDisplayName(customer)}
        customerType={customer.customer_type}
        accountProducts={accountProducts}
        accountTiers={accountTiers}
        pending={actionPending === "approve"}
        confirmLabel="Approve Customer"
        onCancel={() => setOpenModal(null)}
        onConfirm={handleApprove}
      />

      <ApproveAccountModal
        isOpen={openModal === "add-account"}
        customerName={customerDisplayName(customer)}
        customerType={customer.customer_type}
        accountProducts={accountProducts}
        accountTiers={accountTiers}
        pending={actionPending === "add-account"}
        title={`Add Account — ${customerDisplayName(customer)}`}
        description="Select which account product and tier to open for this customer."
        confirmLabel="Open Account"
        onCancel={() => setOpenModal(null)}
        onConfirm={handleAddAccount}
      />

      <ReasonModal
        isOpen={openModal === "reject"}
        title="Reject Customer"
        description={`Provide a reason for rejecting ${customerDisplayName(customer)}. This will be recorded on their profile.`}
        confirmLabel="Reject Customer"
        confirmTone="danger"
        pending={actionPending === "reject"}
        onCancel={() => setOpenModal(null)}
        onConfirm={handleReject}
      />

      <ReasonModal
        isOpen={openModal === "close"}
        title="Close Customer"
        description={`Closing ${customerDisplayName(customer)} will also close all of their accounts. Provide a reason for this action.`}
        confirmLabel="Close Customer"
        confirmTone="danger"
        pending={actionPending === "close"}
        onCancel={() => setOpenModal(null)}
        onConfirm={handleClose}
      />

      {/* TABS */}
      <div className="mt-6 flex gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === key
                ? "bg-[#173673] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Icon size={16} />
            {label}
            {key === "accounts" && Array.isArray(customer.accounts) && customer.accounts.length > 0 && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  activeTab === key ? "bg-white/20" : "bg-slate-200 text-slate-600"
                }`}
              >
                {customer.accounts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "accounts" && (
        <>
          {/* ACCOUNTS — a customer can hold many; the primary one is highlighted */}
          {Array.isArray(customer.accounts) && customer.accounts.length > 0 ? (
            <Section title={`Accounts (${customer.accounts.length})`}>
              <div className="space-y-3">
                {[...customer.accounts]
                  .sort((a, b) => Number(b.primary_account) - Number(a.primary_account))
                  .map((account: Record<string, any>) => (
                    <AccountRow key={account.id} account={account} />
                  ))}
              </div>
            </Section>
          ) : (
            <EmptyTabState
              icon={<Landmark size={28} />}
              title="No accounts yet"
              description="This customer has not had an account opened for them."
            />
          )}
        </>
      )}

      {activeTab === "customer" && (
        <>
      {/* TOGGLES */}
      <Section title="Channel Preferences">
        <div className="flex flex-wrap gap-3">
          <ToggleButton
            label="Internet Banking"
            enabled={!!customer.enable_internet_bank}
            pending={actionPending === "internet-banking"}
            onClick={() =>
              runAction(
                "internet-banking",
                () => toggleInternetBankingAction(customer.id),
                "Internet banking preference updated."
              )
            }
          />
          <ToggleButton
            label="SMS Alerts"
            enabled={!!customer.enable_sms}
            pending={actionPending === "sms"}
            onClick={() =>
              runAction("sms", () => toggleSmsAction(customer.id), "SMS preference updated.")
            }
          />
          <ToggleButton
            label="Email Alerts"
            enabled={!!customer.enable_email}
            pending={actionPending === "email"}
            onClick={() =>
              runAction("email", () => toggleEmailAction(customer.id), "Email preference updated.")
            }
          />
        </div>
      </Section>

      {/* PROFILE INFO */}
      <Section title="Profile Information">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Branch" value={customer.branch?.name} />
          <Field label="Account Officer" value={
            customer.account_officer
              ? `${customer.account_officer.first_name} ${customer.account_officer.last_name}`
              : undefined
          } />
          <Field label="Username" value={customer.username} />
          <Field
            label="Email"
            value={customer.email}
            icon={<Mail size={14} className="text-slate-400" />}
          />
          <Field
            label="Phone"
            value={customer.phone}
            icon={<Phone size={14} className="text-slate-400" />}
          />
          <Field label="Staff Member" value={customer.is_staff ? "Yes" : "No"} />
        </div>
      </Section>

      {/* PERSONAL / BUSINESS INFO */}
      {isBusiness ? (
        <Section title="Business Information">
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Business Name" value={customer.business_name ?? customer.business?.business_name} />
            <Field label="Trading Name" value={customer.business?.trading_name} />
            <Field label="Business Type" value={toDisplayLabel(customer.business?.business_type)} />
            <Field label="Legal Form" value={toDisplayLabel(customer.legal_form)} />
            <Field label="RC Number" value={customer.rc_number} />
            <Field label="Registration Number" value={customer.business?.registration_number} />
            <Field label="Registration Date" value={formatDate(customer.business?.registration_date)} />
            <Field label="Incorporation Date" value={formatDate(customer.business?.incorporation_date)} />
            <Field label="Nature of Business" value={customer.business?.nature_of_business} />
            <Field label="Industry" value={customer.business?.industry} />
            <Field label="Business TIN" value={customer.business?.tin} />
            <Field label="VAT Number" value={customer.business?.vat_number} />
            <Field label="Business Phone" value={customer.business?.business_phone} />
            <Field label="Business Email" value={customer.business?.business_email} />
            <Field label="Website" value={customer.business?.website} />
            <Field label="Contact Person" value={`${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim()} />
          </div>
        </Section>
      ) : (
        <Section title="Personal Information">
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Title" value={customer.title} />
            <Field label="First Name" value={customer.first_name} />
            <Field label="Middle Name" value={customer.middle_name} />
            <Field label="Last Name" value={customer.last_name} />
            <Field label="Gender" value={toDisplayLabel(customer.gender)} />
            <Field label="Date of Birth" value={formatDate(customer.dob)} />
            {isMinor && (
              <Field
                label="Guardian"
                value={
                  customer.guardian
                    ? `${customer.guardian.first_name ?? ""} ${customer.guardian.last_name ?? ""}`.trim()
                    : customer.guardian_id
                }
              />
            )}
            {!isMinor && (
              <>
                <Field label="Marital Status" value={toDisplayLabel(customer.marital_status)} />
                <Field label="Occupation" value={customer.occupation} />
                <Field label="Working Status" value={toDisplayLabel(customer.working_status)} />
                <Field label="Mother's Maiden Name" value={customer.mother_maiden_name} />
                <Field label="Spouse Name" value={customer.spouse_name} />
                <Field label="BVN" value={customer.bvn} />
                <Field label="NIN" value={customer.nin_number} />
                <Field label="TIN" value={customer.tin} />
              </>
            )}
          </div>
        </Section>
      )}

      {/* Directors — shown whenever this business-like customer has director rows on file */}
      {hasDirectors && (
        <Section title="Directors">
          <div className="space-y-4">
            {customer.directors.map((director: Record<string, any>) => (
              <div key={director.id} className="rounded-xl border border-slate-200 p-4">
                <p className="font-bold text-sm text-slate-900">
                  {director.first_name} {director.last_name}
                  <span className="ml-2 font-medium text-slate-500">{director.position}</span>
                </p>
                <div className="mt-3 flex flex-col gap-4 sm:flex-row">
                  <div className="grid flex-1 grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Phone" value={director.phone} />
                    <Field label="Email" value={director.email} />
                    <Field label="Gender" value={toDisplayLabel(director.gender)} />
                    <Field label="Date of Birth" value={formatDate(director.dob)} />
                    <Field label="BVN" value={director.bvn} />
                  </div>

                  {(director.passport_photo_url || director.passport_photo) && (
                    <Thumbnail
                      label="Passport Photo"
                      src={director.passport_photo_url || documentUrl(director.passport_photo)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* SIGNATORIES */}
      {isBusiness && Array.isArray(customer.signatories) && customer.signatories.length > 0 && (
        <Section title="Signatories">
          <div className="space-y-4">
            {customer.signatories.map((signatory: Record<string, any>) => (
              <div key={signatory.id} className="rounded-xl border border-slate-200 p-4">
                <p className="font-bold text-sm text-slate-900">
                  {signatory.first_name} {signatory.last_name}
                  <span className="ml-2 font-medium text-slate-500">{signatory.position}</span>
                </p>
                <div className="mt-3 flex flex-col gap-4 sm:flex-row">
                  <div className="grid flex-1 grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Phone" value={signatory.phone} />
                    <Field label="Email" value={signatory.email} />
                    <Field label="Gender" value={toDisplayLabel(signatory.gender)} />
                    <Field label="BVN" value={signatory.bvn} />
                  </div>

                  <div className="flex gap-3">
                    {(signatory.passport_photo_url || signatory.passport_photo) && (
                      <Thumbnail
                        label="Passport Photo"
                        src={signatory.passport_photo_url || documentUrl(signatory.passport_photo)}
                      />
                    )}
                    {(signatory.signature_url || signatory.signature) && (
                      <Thumbnail
                        label="Signature"
                        src={signatory.signature_url || documentUrl(signatory.signature)}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* NEXT OF KIN */}
      {!isBusiness && Array.isArray(customer.next_of_kin) && customer.next_of_kin.length > 0 && (
        <Section title="Next of Kin">
          <div className="space-y-4">
            {customer.next_of_kin.map((kin: Record<string, any>) => (
              <div key={kin.id} className="rounded-xl border border-slate-200 p-4">
                <p className="font-bold text-sm text-slate-900">
                  {kin.title} {kin.first_name} {kin.last_name}
                  <span className="ml-2 font-medium text-slate-500 capitalize">
                    {kin.relationship}
                  </span>
                </p>
                <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Phone" value={kin.phone} />
                  <Field label="Email" value={kin.email} />
                  <Field label="Gender" value={toDisplayLabel(kin.gender)} />
                  <Field label="Date of Birth" value={formatDate(kin.dob)} />
                  <Field label="Occupation" value={kin.occupation} />
                  <Field label="Address" value={kin.address} />
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ADDRESS — API returns a single current address plus full history */}
      {(customer.address || (Array.isArray(customer.address_history) && customer.address_history.length > 0)) && (
        <Section title="Address">
          <div className="space-y-4">
            {customer.address && <AddressRow address={customer.address} current />}

            {Array.isArray(customer.address_history) &&
              customer.address_history
                .filter((address: Record<string, any>) => address.status !== "current")
                .map((address: Record<string, any>) => (
                  <AddressRow key={address.id} address={address} current={false} />
                ))}
          </div>
        </Section>
      )}

      {/* DOCUMENTS */}
      {Array.isArray(customer.documents) && customer.documents.length > 0 && (
        <Section title="Documents">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {customer.documents.map((document: Record<string, any>) => (
              <div
                key={document.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-[#29478f] hover:bg-blue-50/40"
              >
                {document.status === "pending" && (
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      disabled={documentActionPending === document.id}
                      onClick={() => handleDocumentStatus(document.id, "approved")}
                      className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-1.5 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                    >
                      <CheckCircle2 size={12} />
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={documentActionPending === document.id}
                      onClick={() => handleDocumentStatus(document.id, "rejected")}
                      className="flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-1.5 py-1 text-[11px] font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      <XCircle size={12} />
                      Reject
                    </button>
                  </div>
                )}

                <a
                  href={document.url || documentUrl(document.path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={document.url || documentUrl(document.path)}
                      alt={document.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{document.title}</p>
                    <StatusBadge status={document.status} />
                  </div>
                </a>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* CUSTOM FIELDS — arbitrary key/label/value entries added at onboarding or via edit */}
      {Array.isArray(customer.metadata) && customer.metadata.length > 0 && (
        <Section title="Custom Fields">
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {customer.metadata.map((field: Record<string, any>, index: number) => (
              <Field key={field.key ?? index} label={field.label || field.key} value={field.value} />
            ))}
          </div>
        </Section>
      )}

      {/* RECORD HISTORY */}
      <Section title="Record History">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Created Date" value={formatDateTime(customer.created_at)} />
          <Field
            label="Created By"
            value={
              customer.creator
                ? `${customer.creator.first_name ?? ""} ${customer.creator.last_name ?? ""}`.trim()
                : undefined
            }
          />
          <Field label="Approved Date" value={formatDateTime(customer.approved_at)} />
          <Field
            label="Approved By"
            value={
              customer.approver
                ? `${customer.approver.first_name ?? ""} ${customer.approver.last_name ?? ""}`.trim()
                : undefined
            }
          />
        </div>
      </Section>
        </>
      )}
    </>
  );
}

function Thumbnail({ label, src }: { label: string; src: string }) {
  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className="flex shrink-0 flex-col items-center gap-1.5"
    >
      <div className="h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={label} className="h-full w-full object-cover" />
      </div>
      <span className="text-xs font-semibold text-slate-500">{label}</span>
    </a>
  );
}

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function AccountRow({ account }: { account: Record<string, any> }) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        account.primary_account ? "border-[#29478f] bg-blue-50/40" : "border-slate-200"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
            {account.account_number}
            {account.primary_account && (
              <span className="rounded-full bg-[#29478f] px-2 py-0.5 text-xs font-semibold text-white">
                Primary
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500 capitalize">
            {account.account_product?.name?.replace(/_/g, " ") ?? account.account_product?.product_type}
            {account.account_tier?.level && ` • Tier ${account.account_tier.level}`}
          </p>
        </div>
        <StatusBadge status={account.status} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
        <Field label="Available Balance" value={`₦${formatCurrency(account.available_balance)}`} />
        <Field label="Ledger Balance" value={`₦${formatCurrency(account.account_balance)}`} />
        <Field
          label="Flags"
          value={[account.pnd && "PND", account.pnc && "PNC"].filter(Boolean).join(", ") || "None"}
        />
      </div>
    </div>
  );
}

function AddressRow({ address, current }: { address: Record<string, any>; current: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
      <MapPin size={18} className="mt-0.5 shrink-0 text-slate-400" />
      <div>
        <p className="text-sm font-bold text-slate-900 capitalize">
          {toDisplayLabel(address.type)}
          <span
            className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
              current ? "bg-blue-50 text-[#29478f]" : "bg-slate-100 text-slate-500"
            }`}
          >
            {current ? "Current" : "Previous"}
          </span>
        </p>
        <p className="mt-1 text-sm text-slate-700">{address.address}</p>
        <p className="mt-0.5 text-xs font-medium text-slate-500">
          {[address.lgs, address.city, address.state, address.country].filter(Boolean).join(", ")}
        </p>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  pending,
  onClick,
  className,
}: {
  label: string;
  icon: ReactNode;
  pending: boolean;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {icon}
      {pending ? "Please wait..." : label}
    </button>
  );
}

function ToggleButton({
  label,
  enabled,
  pending,
  onClick,
}: {
  label: string;
  enabled: boolean;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        enabled
          ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          : "border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100"
      }`}
    >
      {enabled ? "Enabled" : "Disabled"} — {label}
    </button>
  );
}

function EmptyTabState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        {icon}
      </div>
      <p className="mt-4 text-sm font-bold text-slate-700">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  icon,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-800">
        {icon}
        {value || "—"}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-100 text-green-800 border border-green-300",
    approved: "bg-green-100 text-green-800 border border-green-300",
    pending: "bg-amber-100 text-amber-800 border border-amber-300",
    inactive: "bg-red-100 text-red-800 border border-red-300",
    rejected: "bg-red-100 text-red-800 border border-red-300",
  };

  return (
    <span
      className={`mt-0.5 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
        styles[status] || "bg-slate-100 text-slate-700 border border-slate-300"
      }`}
    >
      {status ? toDisplayLabel(status) : "—"}
    </span>
  );
}
