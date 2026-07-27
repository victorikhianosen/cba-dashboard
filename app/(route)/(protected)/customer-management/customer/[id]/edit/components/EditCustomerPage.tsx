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
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "react-toastify";
import { updateCustomerAction } from "@/actions/customer.action";
import { handleApiError } from "@/lib/errors";

type LookupOption = Record<string, any>;
type Customer = Record<string, any>;

// Mirrors CustomerType::businessLike() on the API.
function isBusinessLike(customerType: string) {
  return customerType === "business" || customerType === "government" || customerType === "corporate";
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
const BUSINESS_TYPES = ["limited_liability", "cooperative", "business_name", "not_registered", "government"];

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
  const isMinor = customer.customer_type === "minor";
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

  const [minor, setMinor] = useState({
    guardian_id: customer.guardian_id ?? "",
    gender: customer.gender ?? "male",
    dob: customer.dob ?? "",
  });

  const [businessLike, setBusinessLike] = useState({
    legal_form: customer.legal_form ?? "",
    rc_number: customer.rc_number ?? "",
  });

  const [business, setBusiness] = useState({
    business_name: customer.business?.business_name ?? customer.business_name ?? "",
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

  function updateField(
    setter: (updater: (current: any) => any) => void,
    name: string,
    value: any
  ) {
    setter((current: any) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
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
      } else if (isMinor) {
        formData.set("guardian_id", minor.guardian_id);
        formData.set("gender", minor.gender);
        formData.set("dob", minor.dob);
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

      const result: any = await updateCustomerAction(customer.id, formData);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to update customer.");
        return;
      }

      toast.success(result.message || "Customer updated successfully.");
      router.push(`/customer-management/customer/${customer.id}`);
      router.refresh();
    } catch (error) {
      console.error("Failed to update customer:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
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

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Edit Customer</h1>
        <p className="mt-1 text-sm text-slate-600 capitalize">
          {customer.customer_type} • {customer.cif_number || `CUS-${customer.id}`}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <Section title="Account Setup">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Branch"
              value={common.branch_id}
              onChange={(e) => updateField(setCommon, "branch_id", e.target.value)}
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
              onChange={(e) => updateField(setCommon, "account_officer_id", e.target.value)}
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
              onChange={(e) => updateField(setCommon, "phone", e.target.value)}
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

        <Section title={businessLikeType ? "Contact Person" : "Personal Information"}>
          <div className="grid grid-cols-4 gap-4">
            <Select
              label="Title"
              value={person.title}
              onChange={(e) => updateField(setPerson, "title", e.target.value)}
            >
              <option value="">—</option>
              {["Mr", "Mrs", "Miss", "Master", "Dr", "Chief", "Alhaji", "Alhaja"].map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </Select>
            <Input
              label="First Name"
              value={person.first_name}
              onChange={(e) => updateField(setPerson, "first_name", onlyLetters(e.target.value))}
            />
            <Input
              label="Middle Name"
              value={person.middle_name}
              onChange={(e) => updateField(setPerson, "middle_name", onlyLetters(e.target.value))}
            />
            <Input
              label="Last Name"
              value={person.last_name}
              onChange={(e) => updateField(setPerson, "last_name", onlyLetters(e.target.value))}
            />
          </div>

          {isIndividual && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <Select
                  label="Gender"
                  value={individual.gender}
                  onChange={(e) => updateField(setIndividual, "gender", e.target.value)}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </Select>
                <Select
                  label="Marital Status"
                  value={individual.marital_status}
                  onChange={(e) => updateField(setIndividual, "marital_status", e.target.value)}
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
                  onChange={(e) => updateField(setIndividual, "dob", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Occupation"
                  value={individual.occupation}
                  onChange={(e) => updateField(setIndividual, "occupation", e.target.value)}
                />
                <Select
                  label="Working Status"
                  value={individual.working_status}
                  onChange={(e) => updateField(setIndividual, "working_status", e.target.value)}
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
                  onChange={(e) => updateField(setIndividual, "mother_maiden_name", e.target.value)}
                />
                <Input
                  label="Spouse Name"
                  value={individual.spouse_name}
                  onChange={(e) => updateField(setIndividual, "spouse_name", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="BVN"
                  value={individual.bvn}
                  onChange={(e) => updateField(setIndividual, "bvn", onlyDigits(e.target.value, 11))}
                  maxLength={11}
                />
                <Input
                  label="NIN"
                  value={individual.nin_number}
                  onChange={(e) => updateField(setIndividual, "nin_number", onlyDigits(e.target.value, 11))}
                  maxLength={11}
                />
                <Input
                  label="TIN"
                  value={individual.tin}
                  onChange={(e) => updateField(setIndividual, "tin", e.target.value)}
                />
              </div>
            </>
          )}

          {isMinor && (
            <div className="grid grid-cols-3 gap-4">
              <Select
                label="Gender"
                value={minor.gender}
                onChange={(e) => updateField(setMinor, "gender", e.target.value)}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </Select>
              <Input
                label="Date of Birth"
                type="date"
                value={minor.dob}
                onChange={(e) => updateField(setMinor, "dob", e.target.value)}
              />
              <Input
                label="Guardian Customer ID"
                value={minor.guardian_id}
                onChange={(e) => updateField(setMinor, "guardian_id", onlyDigits(e.target.value, 10))}
              />
            </div>
          )}

          {businessLikeType && (
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Legal Form"
                value={businessLike.legal_form}
                onChange={(e) => updateField(setBusinessLike, "legal_form", e.target.value)}
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
                onChange={(e) => updateField(setBusinessLike, "rc_number", e.target.value)}
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
                onChange={(e) => updateField(setBusiness, "business_name", e.target.value)}
              />
              <Input
                label="Trading Name"
                value={business.trading_name}
                onChange={(e) => updateField(setBusiness, "trading_name", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Business Type"
                value={business.business_type}
                onChange={(e) => updateField(setBusiness, "business_type", e.target.value)}
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
                onChange={(e) => updateField(setBusiness, "registration_number", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Registration Date"
                type="date"
                value={business.registration_date}
                onChange={(e) => updateField(setBusiness, "registration_date", e.target.value)}
              />
              <Input
                label="Incorporation Date"
                type="date"
                value={business.incorporation_date}
                onChange={(e) => updateField(setBusiness, "incorporation_date", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nature of Business"
                value={business.nature_of_business}
                onChange={(e) => updateField(setBusiness, "nature_of_business", e.target.value)}
              />
              <Input
                label="Industry"
                value={business.industry}
                onChange={(e) => updateField(setBusiness, "industry", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Business TIN"
                value={business.tin}
                onChange={(e) => updateField(setBusiness, "tin", e.target.value)}
              />
              <Input
                label="VAT Number"
                value={business.vat_number}
                onChange={(e) => updateField(setBusiness, "vat_number", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Business Phone"
                value={business.business_phone}
                onChange={(e) => updateField(setBusiness, "business_phone", e.target.value)}
              />
              <Input
                label="Business Email"
                type="email"
                pattern={EMAIL_PATTERN}
                value={business.business_email}
                onChange={(e) => updateField(setBusiness, "business_email", e.target.value)}
              />
            </div>

            <Input
              label="Website"
              value={business.website}
              onChange={(e) => updateField(setBusiness, "website", e.target.value)}
              placeholder="https://"
            />
          </Section>
        )}

        <Section title="Identity Documents">
          <p className="text-xs font-medium text-slate-500">
            Only choose a file for documents you want to replace — everything else stays as-is.
          </p>
          <div className={`grid gap-4 ${businessLikeType ? "grid-cols-4" : "grid-cols-3"}`}>
            <FileInput label="Profile Picture" onChange={(file) => setProfilePicture(file)} />
            <FileInput label="Utility Bill" onChange={(file) => setUtilityBill(file)} />
            <FileInput label="Valid ID" onChange={(file) => setValidId(file)} />
            {businessLikeType && (
              <FileInput label="Business Logo" onChange={(file) => setBusinessLogo(file)} />
            )}
          </div>
        </Section>

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
              onChange={(e) => updateField(setAddress, "address", e.target.value)}
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
            Saving a changed address here demotes the current address to previous and records this
            as the new current address.
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
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">{title}</h2>
      {children}
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
  onChange,
}: {
  label: string;
  onChange: (file: File | null) => void;
}) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.files?.[0] ?? null);
  }

  return (
    <label className="block">
      <span className="block font-bold text-sm text-slate-800">{label}</span>
      <input
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="mt-2 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
      />
    </label>
  );
}
