"use client";

import {
  useState,
  type ChangeEvent,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import {
  updateCustomerAction,
  uploadCustomerDocumentsAction,
} from "@/actions/customer.action";
import { lookupAccountByNumberAction } from "@/actions/account.action";
import { handleApiError } from "@/lib/errors";

type LookupOption = Record<string, any>;
type Customer = Record<string, any>;

// Mirrors CustomerType::businessLike() on the API. "Corporate" is not a separate
// customer_type — it's a business customer with director rows added. "Government" is not
// a separate customer_type either — it's a business customer with legal_form = "government".
function isBusinessLike(customerType: string) {
  return customerType === "business";
}

// App\Enums\Customer\LegalForm
const LEGAL_FORMS = [
  "not_registered",
  "sole_proprietorship",
  "partnership",
  "limited_liability",
  "ngo",
  "cooperative",
  "government",
  "church",
  "association",
];

// App\Enums\Customer\BusinessType
const BUSINESS_TYPES = [
  "limited_liability",
  "cooperative",
  "business_name",
  "not_registered",
  "government",
];

function labelize(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function onlyLetters(value: string) {
  return value.replace(/[^A-Za-z\s'-]/g, "");
}

function onlyDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

const EMAIL_PATTERN = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$";

const STORAGE_URL = process.env.NEXT_PUBLIC_STORAGE_URL ?? "";

function documentUrl(path: string) {
  return `${STORAGE_URL}/${path}`;
}

// Finds the customer's currently-uploaded document of a given type (e.g.
// "profile_picture") so its thumbnail can be shown before a replacement is chosen.
function existingDocumentUrl(
  customer: Customer,
  type: string,
): string | undefined {
  const document = Array.isArray(customer.documents)
    ? customer.documents.find((doc: Record<string, any>) => doc.type === type)
    : undefined;

  if (!document) return undefined;

  return document.url || documentUrl(document.path);
}

let rowKeySeed = 0;
function nextRowKey() {
  rowKeySeed += 1;
  return rowKeySeed;
}

// Custom label/value field the user defines on the fly — persisted as-is
// in the API's `metadata` JSON column, no fixed schema on either side.
function newMetadataField(field: { label?: string; value?: string } = {}) {
  return {
    key: nextRowKey(),
    label: field.label ?? "",
    value: field.value ?? "",
  };
}

// A user-labelled document — uploaded via the existing uploadDocuments
// endpoint, where the field name (here, the label the user typed, slugified)
// becomes the document's type/title.
function newCustomDocument() {
  return {
    key: nextRowKey(),
    label: "",
    file: null as File | null,
  };
}

function slugifyDocumentLabel(label: string, index: number) {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return slug || `custom_document_${index + 1}`;
}

interface EditCustomerPageProps {
  customer: Customer;
  branches?: LookupOption[];
  accountOfficers?: LookupOption[];
}

export default function EditCustomerPage({
  customer,
  branches = [],
  accountOfficers = [],
}: EditCustomerPageProps) {
  const router = useRouter();
  const businessLikeType = isBusinessLike(customer.customer_type);
  const isIndividual = customer.customer_type === "individual";

  const [submitting, setSubmitting] = useState(false);

  const [common, setCommon] = useState({
    branch_id: customer.branch_id ?? "",
    account_officer_id: customer.account_officer_id ?? "",
    phone: customer.phone ?? "",
    email: customer.email ?? "",
  });

  const [person, setPerson] = useState({
    title: customer.title ?? "",
    first_name: customer.first_name ?? "",
    middle_name: customer.middle_name ?? "",
    last_name: customer.last_name ?? "",
  });

  const [individual, setIndividual] = useState({
    marital_status: customer.marital_status ?? "single",
    gender: customer.gender ?? "male",
    dob: customer.dob ?? "",
    occupation: customer.occupation ?? "",
    working_status: customer.working_status ?? "employed",
    bvn: customer.bvn ?? "",
    nin_number: customer.nin_number ?? "",
    tin: customer.tin ?? "",
    mother_maiden_name: customer.mother_maiden_name ?? "",
    spouse_name: customer.spouse_name ?? "",
  });

  // "minor" isn't its own customer_type — it's an individual with guardian_id set.
  // Defaults checked if this customer already has a guardian; unchecking clears it.
  const [isMinor, setIsMinor] = useState(Boolean(customer.guardian_id));
  const [guardianAccountNumber, setGuardianAccountNumber] = useState("");
  const [guardianPreview, setGuardianPreview] = useState<
    Record<string, any> | null | undefined
  >(undefined);
  const [guardianLookupLoading, setGuardianLookupLoading] = useState(false);

  // Resolves a guardian's account number to their id/name, same lookup used on the create
  // form. Only called when the admin actually types a new account number — leaving it blank
  // means "keep the existing guardian," not "remove them."
  async function lookupGuardian() {
    const query = guardianAccountNumber.trim();
    if (!query) {
      setGuardianPreview(undefined);
      return;
    }

    setGuardianLookupLoading(true);
    const result: any = await lookupAccountByNumberAction(query);
    setGuardianPreview(
      result?.status === "success" ? (result.data?.customer ?? null) : null,
    );

    setGuardianLookupLoading(false);
  }

  const [businessLike, setBusinessLike] = useState({
    legal_form: customer.legal_form ?? "",
    rc_number: customer.rc_number ?? "",
  });

  const [business, setBusiness] = useState({
    business_name:
      customer.business?.business_name ?? customer.business_name ?? "",
    trading_name: customer.business?.trading_name ?? "",
    business_type: customer.business?.business_type ?? "",
    registration_number: customer.business?.registration_number ?? "",
    registration_date: customer.business?.registration_date ?? "",
    incorporation_date: customer.business?.incorporation_date ?? "",
    nature_of_business: customer.business?.nature_of_business ?? "",
    industry: customer.business?.industry ?? "",
    tin: customer.business?.tin ?? "",
    vat_number: customer.business?.vat_number ?? "",
    business_phone: customer.business?.business_phone ?? "",
    business_email: customer.business?.business_email ?? "",
    website: customer.business?.website ?? "",
  });

  const currentAddress = customer.address ?? {};
  const [address, setAddress] = useState({
    type: currentAddress.type ?? "residential",
    address: currentAddress.address ?? "",
    lgs: currentAddress.lgs ?? "",
    city: currentAddress.city ?? "",
    state: currentAddress.state ?? "",
    country: currentAddress.country ?? "Nigeria",
  });

  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [utilityBill, setUtilityBill] = useState<File | null>(null);
  const [validId, setValidId] = useState<File | null>(null);
  const [businessLogo, setBusinessLogo] = useState<File | null>(null);

  // Arbitrary custom fields (key/label/value), pre-filled from the customer's
  // existing metadata, and custom-labelled document uploads.
  const [metadata, setMetadata] = useState(() =>
    Array.isArray(customer.metadata)
      ? customer.metadata.map((field: Record<string, any>) =>
          newMetadataField(field),
        )
      : [],
  );
  const [customDocuments, setCustomDocuments] = useState<
    { key: number; label: string; file: File | null }[]
  >([]);

  function updateField(
    setter: (updater: (current: any) => any) => void,
    name: string,
    value: any,
  ) {
    setter((current: any) => ({ ...current, [name]: value }));
  }

  function updateRow(
    setter: (updater: (current: any[]) => any[]) => void,
    key: number,
    name: string,
    value: any,
  ) {
    setter((current: any[]) =>
      current.map((row) => (row.key === key ? { ...row, [name]: value } : row)),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    const formData = new FormData();

    formData.set("branch_id", common.branch_id);
    formData.set("account_officer_id", common.account_officer_id);
    formData.set("phone", common.phone);
    formData.set("email", common.email);

    formData.set("title", person.title);
    formData.set("first_name", person.first_name);
    formData.set("middle_name", person.middle_name);
    formData.set("last_name", person.last_name);

    if (profilePicture) formData.set("profile_picture", profilePicture);
    if (utilityBill) formData.set("utility_bill", utilityBill);
    if (validId) formData.set("valid_id", validId);

    if (isIndividual) {
      Object.entries(individual).forEach(([field, value]) => {
        formData.set(field, (value as string) ?? "");
      });

      // Only send guardian_id if the admin actually looked up a (new) guardian this
      // session — omitting it entirely leaves the existing guardian untouched
      // (guardian_id is 'sometimes' on the API, a true partial update).
      if (isMinor && guardianPreview?.id) {
        formData.set("guardian_id", String(guardianPreview.id));
      } else if (!isMinor && customer.guardian_id) {
        // Checkbox was unticked on a customer that previously had a guardian — clear it.
        formData.set("guardian_id", "");
      }
    } else if (businessLikeType) {
      formData.set("legal_form", businessLike.legal_form);
      formData.set("rc_number", businessLike.rc_number);

      if (businessLogo) formData.set("business_logo", businessLogo);

      Object.entries(business).forEach(([field, value]) => {
        formData.set(`business[${field}]`, (value as string) ?? "");
      });
    }

    formData.set("address[type]", address.type);
    formData.set("address[address]", address.address);
    formData.set("address[lgs]", address.lgs);
    formData.set("address[city]", address.city);
    formData.set("address[state]", address.state);
    formData.set("address[country]", address.country);

    // Sending the full array replaces the customer's metadata wholesale.
    metadata.forEach((field, index) => {
      formData.set(`metadata[${index}][label]`, field.label);
      formData.set(`metadata[${index}][value]`, field.value ?? "");
    });

    const result: any = await updateCustomerAction(customer.id, formData);

    if (result?.status !== "success") {
      handleApiError(result, "Failed to update customer.");
      setSubmitting(false);
      return;
    }

    const documentsToUpload = customDocuments.filter((doc) => doc.file);
    if (documentsToUpload.length > 0) {
      const documentsFormData = new FormData();
      documentsToUpload.forEach((doc, index) => {
        documentsFormData.set(
          slugifyDocumentLabel(doc.label, index),
          doc.file as File,
        );
      });

      const uploadResult: any = await uploadCustomerDocumentsAction(
        customer.id,
        documentsFormData,
      );
      if (uploadResult?.status !== "success") {
        toast.warning("Customer updated, but some documents failed to upload.");
      }
    }

    toast.success(result.message || "Customer updated successfully.");
    router.push(`/customer-management/customer/${customer.id}`);
    setSubmitting(false);
  }

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          href={`/customer-management/customer/${customer.id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#29478f] transition"
        >
          <ArrowLeft size={16} />
          Back to Customer
        </Link>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          Edit Customer
        </h1>
        <p className="mt-1 text-sm text-slate-600 capitalize">
          {customer.customer_type} •{" "}
          {customer.cif_number || `CUS-${customer.id}`}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <Section title="Account Setup">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Branch"
              value={common.branch_id}
              onChange={(e) =>
                updateField(setCommon, "branch_id", e.target.value)
              }
            >
              <option value="">Select branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </Select>

            <Select
              label="Account Officer"
              value={common.account_officer_id}
              onChange={(e) =>
                updateField(setCommon, "account_officer_id", e.target.value)
              }
            >
              <option value="">Select account officer</option>
              {accountOfficers.map((officer) => (
                <option key={officer.id} value={officer.id}>
                  {officer.first_name} {officer.last_name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={common.phone}
              onChange={(e) =>
                updateField(setCommon, "phone", onlyDigits(e.target.value, 15))
              }
              maxLength={15}
            />
            <Input
              label="Email"
              type="email"
              pattern={EMAIL_PATTERN}
              value={common.email}
              onChange={(e) => updateField(setCommon, "email", e.target.value)}
            />
          </div>
        </Section>

        <Section
          title={businessLikeType ? "Contact Person" : "Personal Information"}
        >
          <div className="grid grid-cols-4 gap-4">
            <Select
              label="Title"
              value={person.title}
              onChange={(e) => updateField(setPerson, "title", e.target.value)}
            >
              <option value="">—</option>
              {[
                "Mr",
                "Mrs",
                "Miss",
                "Master",
                "Dr",
                "Chief",
                "Alhaji",
                "Alhaja",
              ].map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </Select>
            <Input
              label="First Name"
              value={person.first_name}
              onChange={(e) =>
                updateField(
                  setPerson,
                  "first_name",
                  onlyLetters(e.target.value),
                )
              }
            />
            <Input
              label="Middle Name"
              value={person.middle_name}
              onChange={(e) =>
                updateField(
                  setPerson,
                  "middle_name",
                  onlyLetters(e.target.value),
                )
              }
            />
            <Input
              label="Last Name"
              value={person.last_name}
              onChange={(e) =>
                updateField(setPerson, "last_name", onlyLetters(e.target.value))
              }
            />
          </div>

          {isIndividual && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <Select
                  label="Gender"
                  value={individual.gender}
                  onChange={(e) =>
                    updateField(setIndividual, "gender", e.target.value)
                  }
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </Select>
                <Select
                  label="Marital Status"
                  value={individual.marital_status}
                  onChange={(e) =>
                    updateField(setIndividual, "marital_status", e.target.value)
                  }
                >
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                </Select>
                <Input
                  label="Date of Birth"
                  type="date"
                  value={individual.dob}
                  onChange={(e) =>
                    updateField(setIndividual, "dob", e.target.value)
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Occupation"
                  value={individual.occupation}
                  onChange={(e) =>
                    updateField(setIndividual, "occupation", e.target.value)
                  }
                />
                <Select
                  label="Working Status"
                  value={individual.working_status}
                  onChange={(e) =>
                    updateField(setIndividual, "working_status", e.target.value)
                  }
                >
                  <option value="employed">Employed</option>
                  <option value="self_employed">Self-Employed</option>
                  <option value="unemployed">Unemployed</option>
                  <option value="student">Student</option>
                  <option value="retired">Retired</option>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Mother's Maiden Name"
                  value={individual.mother_maiden_name}
                  onChange={(e) =>
                    updateField(
                      setIndividual,
                      "mother_maiden_name",
                      e.target.value,
                    )
                  }
                />
                <Input
                  label="Spouse Name"
                  value={individual.spouse_name}
                  onChange={(e) =>
                    updateField(setIndividual, "spouse_name", e.target.value)
                  }
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="BVN"
                  value={individual.bvn}
                  onChange={(e) =>
                    updateField(
                      setIndividual,
                      "bvn",
                      onlyDigits(e.target.value, 11),
                    )
                  }
                  maxLength={11}
                />
                <Input
                  label="NIN"
                  value={individual.nin_number}
                  onChange={(e) =>
                    updateField(
                      setIndividual,
                      "nin_number",
                      onlyDigits(e.target.value, 11),
                    )
                  }
                  maxLength={11}
                />
                <Input
                  label="TIN"
                  value={individual.tin}
                  onChange={(e) =>
                    updateField(setIndividual, "tin", e.target.value)
                  }
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3">
                <input
                  type="checkbox"
                  checked={isMinor}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsMinor(checked);
                    if (!checked) {
                      setGuardianAccountNumber("");
                      setGuardianPreview(undefined);
                    }
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-[#173673] focus:ring-[#29478f]"
                />
                <span className="text-sm font-bold text-slate-800">
                  This customer is a minor
                </span>
              </label>

              {isMinor && (
                <label className="block">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-slate-800">
                      Guardian Account Number
                      {customer.guardian_id && !guardianPreview && (
                        <span className="ml-2 font-normal text-slate-500">
                          (leave blank to keep the current guardian)
                        </span>
                      )}
                    </span>

                    {guardianLookupLoading && (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <Loader2 size={12} className="animate-spin" />
                        Looking up guardian…
                      </span>
                    )}
                    {!guardianLookupLoading && guardianPreview === null && (
                      <span className="text-xs font-semibold text-red-600">
                        No account found with that number.
                      </span>
                    )}
                    {!guardianLookupLoading && guardianPreview && (
                      <span className="text-xs font-semibold text-emerald-700">
                        Guardian: {guardianPreview.full_name} (
                        {guardianPreview.cif_number})
                      </span>
                    )}
                  </span>
                  <div className="relative mt-2">
                    <input
                      value={guardianAccountNumber}
                      onChange={(e) => {
                        setGuardianAccountNumber(e.target.value);
                        setGuardianPreview(undefined);
                      }}
                      onBlur={lookupGuardian}
                      placeholder="e.g. 1000000001"
                      className="w-full rounded-xl border border-slate-300 bg-white p-3 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition"
                    />
                    {guardianLookupLoading && (
                      <Loader2
                        size={16}
                        className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
                      />
                    )}
                  </div>
                </label>
              )}
            </>
          )}

          {businessLikeType && (
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Legal Form"
                value={businessLike.legal_form}
                onChange={(e) =>
                  updateField(setBusinessLike, "legal_form", e.target.value)
                }
              >
                <option value="">Select legal form</option>
                {LEGAL_FORMS.map((form) => (
                  <option key={form} value={form}>
                    {labelize(form)}
                  </option>
                ))}
              </Select>
              <Input
                label="RC Number"
                value={businessLike.rc_number}
                onChange={(e) =>
                  updateField(setBusinessLike, "rc_number", e.target.value)
                }
              />
            </div>
          )}
        </Section>

        {businessLikeType && (
          <Section title="Business Details">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Business Name"
                value={business.business_name}
                onChange={(e) =>
                  updateField(setBusiness, "business_name", e.target.value)
                }
              />
              <Input
                label="Trading Name"
                value={business.trading_name}
                onChange={(e) =>
                  updateField(setBusiness, "trading_name", e.target.value)
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Business Type"
                value={business.business_type}
                onChange={(e) =>
                  updateField(setBusiness, "business_type", e.target.value)
                }
              >
                <option value="">Select business type</option>
                {BUSINESS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {labelize(type)}
                  </option>
                ))}
              </Select>
              <Input
                label="Registration Number"
                value={business.registration_number}
                onChange={(e) =>
                  updateField(
                    setBusiness,
                    "registration_number",
                    e.target.value,
                  )
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Registration Date"
                type="date"
                value={business.registration_date}
                onChange={(e) =>
                  updateField(setBusiness, "registration_date", e.target.value)
                }
              />
              <Input
                label="Incorporation Date"
                type="date"
                value={business.incorporation_date}
                onChange={(e) =>
                  updateField(setBusiness, "incorporation_date", e.target.value)
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nature of Business"
                value={business.nature_of_business}
                onChange={(e) =>
                  updateField(setBusiness, "nature_of_business", e.target.value)
                }
              />
              <Input
                label="Industry"
                value={business.industry}
                onChange={(e) =>
                  updateField(setBusiness, "industry", e.target.value)
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Business TIN"
                value={business.tin}
                onChange={(e) =>
                  updateField(setBusiness, "tin", e.target.value)
                }
              />
              <Input
                label="VAT Number"
                value={business.vat_number}
                onChange={(e) =>
                  updateField(setBusiness, "vat_number", e.target.value)
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Business Phone"
                value={business.business_phone}
                onChange={(e) =>
                  updateField(
                    setBusiness,
                    "business_phone",
                    onlyDigits(e.target.value, 15),
                  )
                }
                maxLength={15}
              />
              <Input
                label="Business Email"
                type="email"
                pattern={EMAIL_PATTERN}
                value={business.business_email}
                onChange={(e) =>
                  updateField(setBusiness, "business_email", e.target.value)
                }
              />
            </div>

            <Input
              label="Website"
              value={business.website}
              onChange={(e) =>
                updateField(setBusiness, "website", e.target.value)
              }
              placeholder="https://"
            />
          </Section>
        )}

        <Section title="Identity Documents">
          <p className="text-xs font-medium text-slate-500">
            Only choose a file for documents you want to replace — everything
            else stays as-is.
          </p>
          <div
            className={`grid gap-4 ${businessLikeType ? "grid-cols-4" : "grid-cols-3"}`}
          >
            <FileInput
              label="Profile Picture"
              existingUrl={existingDocumentUrl(customer, "profile_picture")}
              onChange={(file) => setProfilePicture(file)}
            />
            <FileInput
              label="Utility Bill"
              existingUrl={existingDocumentUrl(customer, "utility_bill")}
              onChange={(file) => setUtilityBill(file)}
            />
            <FileInput
              label="Valid ID"
              existingUrl={existingDocumentUrl(customer, "valid_id")}
              onChange={(file) => setValidId(file)}
            />
            {businessLikeType && (
              <FileInput
                label="Business Logo"
                existingUrl={existingDocumentUrl(customer, "business_logo")}
                onChange={(file) => setBusinessLogo(file)}
              />
            )}
          </div>
        </Section>

        {/* CUSTOM DOCUMENTS — user picks their own label + file per row, uploaded
            after the customer is updated; the label becomes the document's title. */}
        <RepeatingSection
          title="Additional Documents"
          rows={customDocuments}
          onAdd={() =>
            setCustomDocuments((current) => [...current, newCustomDocument()])
          }
          onRemove={(key) =>
            setCustomDocuments((current) =>
              current.filter((row) => row.key !== key),
            )
          }
          minRows={0}
          renderRow={(doc) => (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Document Label"
                value={doc.label}
                onChange={(e) =>
                  updateRow(
                    setCustomDocuments,
                    doc.key,
                    "label",
                    e.target.value,
                  )
                }
                placeholder="e.g. Proof of Address"
              />
              <FileInput
                label="File"
                onChange={(file) =>
                  updateRow(setCustomDocuments, doc.key, "file", file)
                }
              />
            </div>
          )}
        />

        {/* CUSTOM FIELDS — arbitrary key/label/value entries the user defines,
            stored as-is in the customer's `metadata` JSON column. */}
        <RepeatingSection
          title="Custom Fields"
          rows={metadata}
          onAdd={() =>
            setMetadata((current) => [...current, newMetadataField()])
          }
          onRemove={(key) =>
            setMetadata((current) => current.filter((row) => row.key !== key))
          }
          minRows={0}
          renderRow={(field) => (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Label"
                value={field.label}
                onChange={(e) =>
                  updateRow(setMetadata, field.key, "label", e.target.value)
                }
                placeholder="e.g. Referral Source"
              />
              <Input
                label="Value"
                value={field.value}
                onChange={(e) =>
                  updateRow(setMetadata, field.key, "value", e.target.value)
                }
              />
            </div>
          )}
        />

        <Section title="Address">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Address Type"
              value={address.type}
              onChange={(e) => updateField(setAddress, "type", e.target.value)}
            >
              <option value="residential">Residential</option>
              <option value="business">Business</option>
              <option value="office">Office</option>
              <option value="mailing">Mailing</option>
            </Select>
            <Input
              label="Street Address"
              value={address.address}
              onChange={(e) =>
                updateField(setAddress, "address", e.target.value)
              }
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="LGA"
              value={address.lgs}
              onChange={(e) => updateField(setAddress, "lgs", e.target.value)}
            />
            <Input
              label="City"
              value={address.city}
              onChange={(e) => updateField(setAddress, "city", e.target.value)}
            />
            <Input
              label="State"
              value={address.state}
              onChange={(e) => updateField(setAddress, "state", e.target.value)}
            />
          </div>

          <Input
            label="Country"
            value={address.country}
            onChange={(e) => updateField(setAddress, "country", e.target.value)}
          />

          <p className="text-xs font-medium text-slate-500">
            Saving a changed address here demotes the current address to
            previous and records this as the new current address.
          </p>
        </Section>

        <div className="flex justify-end gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <Link
            href={`/customer-management/customer/${customer.id}`}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-[#173673] px-5 py-3 text-sm font-semibold text-white hover:bg-[#10295c] disabled:opacity-50 transition shadow-sm"
          >
            <Save size={16} />
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function RepeatingSection({
  title,
  rows,
  onAdd,
  onRemove,
  minRows,
  renderRow,
}: {
  title: string;
  rows: { key: number; [key: string]: any }[];
  onAdd: () => void;
  onRemove: (key: number) => void;
  minRows: number;
  renderRow: (row: any) => ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          {title}
        </h2>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {rows.map((row, index) => (
          <div
            key={row.key}
            className="rounded-xl border border-slate-200 p-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {title} #{index + 1}
              </p>
              {rows.length > minRows && (
                <button
                  type="button"
                  onClick={() => onRemove(row.key)}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              )}
            </div>
            {renderRow(row)}
          </div>
        ))}

        {rows.length === 0 && (
          <p className="text-xs font-medium text-slate-500">None added.</p>
        )}
      </div>
    </section>
  );
}

function Input({
  label,
  ...rest
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block font-bold text-sm text-slate-800">{label}</span>
      <input
        {...rest}
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition"
      />
    </label>
  );
}

function Select({
  label,
  children,
  ...rest
}: { label: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="block font-bold text-sm text-slate-800">{label}</span>
      <select
        {...rest}
        className="mt-2 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition"
      >
        {children}
      </select>
    </label>
  );
}

function FileInput({
  label,
  existingUrl,
  onChange,
}: {
  label: string;
  existingUrl?: string;
  onChange: (file: File | null) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    onChange(file);
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  // A newly-picked file always wins; otherwise fall back to whatever's
  // already on the customer so the current document isn't just a blank slot.
  const displayUrl = preview || existingUrl;

  return (
    <label className="block">
      <span className="block font-bold text-sm text-slate-800">{label}</span>
      <div className="mt-2 flex items-center gap-3">
        {displayUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayUrl}
            alt={`${label} preview`}
            className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 object-cover"
          />
        )}
        <input
          type="file"
          accept="image/*"
          onChange={handleChange}
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
        />
      </div>
    </label>
  );
}
