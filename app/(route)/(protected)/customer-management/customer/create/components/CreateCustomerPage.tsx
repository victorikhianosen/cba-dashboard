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
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Loader2, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "react-toastify";
import { createCustomerAction, lookupCustomerByCifAction } from "@/actions/customer.action";
import { handleApiError } from "@/lib/errors";

type LookupOption = Record<string, any>;
type FieldMap = Record<string, any>;

type CustomerType = "individual" | "business" | "minor" | "government" | "corporate";

const CUSTOMER_TYPES: CustomerType[] = ["individual", "business", "minor", "government", "corporate"];

function isCustomerType(value: string | null): value is CustomerType {
  return !!value && (CUSTOMER_TYPES as string[]).includes(value);
}

// business, government and corporate all carry a business block + signatories;
// only corporate additionally carries directors. Mirrors CustomerType::businessLike() on the API.
function isBusinessLike(type: CustomerType) {
  return type === "business" || type === "government" || type === "corporate";
}

interface CreateCustomerPageProps {
  branches?: LookupOption[];
  accountOfficers?: LookupOption[];
}

let rowKeySeed = 0;
function nextRowKey() {
  rowKeySeed += 1;
  return rowKeySeed;
}

// Strips anything that isn't a letter, space, hyphen or apostrophe — blocks
// emoji, digits and other special characters from name fields.
function onlyLetters(value: string) {
  return value.replace(/[^A-Za-z\s'-]/g, "");
}

// Strips non-digits and caps the length — used for BVN/NIN/PIN.
function onlyDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

const EMAIL_PATTERN = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$";

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

// App\Enums\Customer\BusinessType (business.business_type)
const BUSINESS_TYPES = ["limited_liability", "cooperative", "business_name", "not_registered", "government"];

function labelize(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const emptyCommon: FieldMap = {
  branch_id: "",
  account_officer_id: "",
  phone: "",
  email: "",
  username: "",
  password: "",
  pin: "",
  is_staff: false,
};

// Shared by every customer type — first/last name are required for
// individual, minor and every business-like type on the API.
const emptyPerson: FieldMap = {
  title: "",
  first_name: "",
  middle_name: "",
  last_name: "",
};

const emptyIndividual: FieldMap = {
  marital_status: "single",
  gender: "male",
  dob: "",
  occupation: "",
  working_status: "employed",
  bvn: "",
  nin_number: "",
  tin: "",
  mother_maiden_name: "",
  spouse_name: "",
};

const emptyMinor: FieldMap = {
  guardian_id: "",
  gender: "male",
  dob: "",
};

const emptyBusinessLike: FieldMap = {
  legal_form: "",
  rc_number: "",
};

const emptyBusiness: FieldMap = {
  business_name: "",
  trading_name: "",
  business_type: "",
  registration_number: "",
  registration_date: "",
  incorporation_date: "",
  nature_of_business: "",
  industry: "",
  tin: "",
  vat_number: "",
  business_phone: "",
  business_email: "",
  website: "",
};

function newAddress() {
  return {
    type: "residential",
    address: "",
    lgs: "",
    city: "",
    state: "",
    country: "Nigeria",
    longitude: "",
    latitude: "",
  };
}

function newNextOfKin() {
  return {
    key: nextRowKey(),
    title: "Mr",
    first_name: "",
    middle_name: "",
    last_name: "",
    relationship: "",
    gender: "male",
    dob: "",
    phone: "",
    email: "",
    occupation: "",
    address: "",
  };
}

function newDirector() {
  return {
    key: nextRowKey(),
    title: "",
    first_name: "",
    last_name: "",
    position: "",
    phone: "",
    email: "",
    gender: "male",
    dob: "",
    bvn: "",
    is_primary: false,
    passport_photo: null as File | null,
  };
}

function newSignatory() {
  return {
    key: nextRowKey(),
    first_name: "",
    last_name: "",
    position: "",
    phone: "",
    email: "",
    gender: "male",
    bvn: "",
    director_index: "",
    signature: null as File | null,
    passport_photo: null as File | null,
  };
}

export default function CreateCustomerPage({
  branches = [],
  accountOfficers = [],
}: CreateCustomerPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Selected type lives in the URL (?type=minor) so a reload keeps the same
  // form open instead of resetting to individual.
  const [customerType, setCustomerTypeState] = useState<CustomerType>(() => {
    const fromUrl = searchParams.get("type");
    return isCustomerType(fromUrl) ? fromUrl : "individual";
  });

  function setCustomerType(type: CustomerType) {
    setCustomerTypeState(type);

    const params = new URLSearchParams(window.location.search);
    params.set("type", type);
    router.replace(`?${params.toString()}`, { scroll: false });
  }
  const [submitting, setSubmitting] = useState(false);

  const [common, setCommon] = useState<FieldMap>({ ...emptyCommon });
  const [person, setPerson] = useState<FieldMap>({ ...emptyPerson });
  const [individual, setIndividual] = useState<FieldMap>({ ...emptyIndividual });
  const [minor, setMinor] = useState<FieldMap>({ ...emptyMinor });
  const [businessLike, setBusinessLike] = useState<FieldMap>({ ...emptyBusinessLike });
  const [business, setBusiness] = useState<FieldMap>({ ...emptyBusiness });

  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [utilityBill, setUtilityBill] = useState<File | null>(null);
  const [validId, setValidId] = useState<File | null>(null);
  const [businessLogo, setBusinessLogo] = useState<File | null>(null);

  const [address, setAddress] = useState<FieldMap>(newAddress());
  const [nextOfKin, setNextOfKin] = useState<FieldMap[]>([newNextOfKin()]);
  const [directors, setDirectors] = useState<FieldMap[]>([newDirector()]);
  const [signatories, setSignatories] = useState<FieldMap[]>([newSignatory()]);

  const [geocoding, setGeocoding] = useState(false);

  // undefined = not looked up yet, null = looked up but no match found.
  const [guardianPreview, setGuardianPreview] = useState<FieldMap | null | undefined>(undefined);
  const [guardianLookupLoading, setGuardianLookupLoading] = useState(false);

  const businessLikeType = isBusinessLike(customerType);
  const isNotRegisteredBusiness = businessLikeType && business.business_type === "not_registered";

  // Mirrors every `required` field actually rendered for the current
  // customer type, so the submit button can't be clicked until they're
  // all filled in — rather than relying only on native HTML validation.
  function isFilled(value: any) {
    return value !== undefined && value !== null && String(value).trim() !== "";
  }

  function requiredFieldsComplete() {
    if (!isFilled(common.phone)) return false;
    if (!isFilled(person.first_name) || !isFilled(person.last_name)) return false;

    if (customerType === "individual") {
      const fields = [
        "gender",
        "marital_status",
        "dob",
        "occupation",
        "working_status",
        "mother_maiden_name",
        "bvn",
        "nin_number",
      ];
      if (fields.some((field) => !isFilled(individual[field]))) return false;
    }

    if (customerType === "minor") {
      if (!isFilled(minor.gender) || !isFilled(minor.dob) || !guardianPreview?.id) {
        return false;
      }
    }

    if (businessLikeType) {
      if (!isFilled(businessLike.legal_form)) return false;
      if (!isFilled(business.business_name) || !isFilled(business.business_type)) return false;
    }

    if (customerType === "individual" || customerType === "minor") {
      if (nextOfKin.length === 0) return false;
      const kinComplete = nextOfKin.every(
        (kin) =>
          isFilled(kin.first_name) &&
          isFilled(kin.last_name) &&
          isFilled(kin.relationship) &&
          isFilled(kin.phone)
      );
      if (!kinComplete) return false;
    }

    if (customerType === "corporate" && !isNotRegisteredBusiness) {
      const directorsComplete = directors.every(
        (director) =>
          isFilled(director.first_name) &&
          isFilled(director.last_name) &&
          isFilled(director.position) &&
          isFilled(director.gender) &&
          isFilled(director.phone)
      );
      if (!directorsComplete) return false;
    }

    if (businessLikeType && !isNotRegisteredBusiness) {
      if (signatories.length === 0) return false;
      const signatoriesComplete = signatories.every(
        (signatory) =>
          isFilled(signatory.first_name) &&
          isFilled(signatory.last_name) &&
          isFilled(signatory.position) &&
          isFilled(signatory.gender) &&
          isFilled(signatory.phone)
      );
      if (!signatoriesComplete) return false;
    }

    if (
      !isFilled(address.type) ||
      !isFilled(address.address) ||
      !isFilled(address.city) ||
      !isFilled(address.state) ||
      !isFilled(address.country)
    ) {
      return false;
    }

    return true;
  }

  const canSubmit = requiredFieldsComplete();

  function updateField(
    setter: (updater: (current: FieldMap) => FieldMap) => void,
    name: string,
    value: any
  ) {
    setter((current) => ({ ...current, [name]: value }));
  }

  function updateRow(
    setter: (updater: (current: FieldMap[]) => FieldMap[]) => void,
    key: number,
    name: string,
    value: any
  ) {
    setter((current) =>
      current.map((row) => (row.key === key ? { ...row, [name]: value } : row))
    );
  }

  // Looks up latitude/longitude for the address from its street/city/state/
  // country fields via OpenStreetMap's free Nominatim geocoder, triggered on
  // blur so it doesn't fire on every keystroke.
  async function detectCoordinates() {
    if (!address.address || !address.city) return;

    const query = [address.address, address.city, address.state, address.country]
      .filter(Boolean)
      .join(", ");

    setGeocoding(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          query
        )}`
      );
      const results = await response.json();

      if (results?.[0]) {
        updateField(setAddress, "latitude", results[0].lat);
        updateField(setAddress, "longitude", results[0].lon);
      }
    } catch (error) {
      console.error("Failed to auto-detect coordinates:", error);
    } finally {
      setGeocoding(false);
    }
  }

  // Resolves a guardian's CIF number (e.g. "CIF000005") to their id/name via
  // a dedicated lookup endpoint, so the person entering the minor's details
  // can confirm they picked the right guardian before submitting — the
  // resolved numeric id (not the CIF text) is what's actually submitted as
  // guardian_id.
  async function lookupGuardian() {
    const query = minor.guardian_id.trim();
    if (!query) {
      setGuardianPreview(undefined);
      return;
    }

    setGuardianLookupLoading(true);
    try {
      const result: any = await lookupCustomerByCifAction(query);
      setGuardianPreview(result?.status === "success" ? result.data : null);
    } catch (error) {
      console.error("Failed to look up guardian:", error);
      setGuardianPreview(null);
    } finally {
      setGuardianLookupLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      toast.error("Please fill in all required fields before submitting.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();

      formData.set("customer_type", customerType);
      formData.set("branch_id", common.branch_id);
      formData.set("account_officer_id", common.account_officer_id);
      formData.set("phone", common.phone);
      formData.set("email", common.email);
      formData.set("username", common.username);
      formData.set("password", common.password);
      formData.set("pin", common.pin);
      formData.set("is_staff", common.is_staff ? "1" : "0");

      formData.set("title", person.title);
      formData.set("first_name", person.first_name);
      formData.set("middle_name", person.middle_name);
      formData.set("last_name", person.last_name);

      if (profilePicture) formData.set("profile_picture", profilePicture);
      if (utilityBill) formData.set("utility_bill", utilityBill);
      if (validId) formData.set("valid_id", validId);

      if (customerType === "individual") {
        Object.entries(individual).forEach(([field, value]) => {
          formData.set(field, value ?? "");
        });

        nextOfKin.forEach((kin, index) => {
          formData.set(`next_of_kin[${index}][title]`, kin.title);
          formData.set(`next_of_kin[${index}][first_name]`, kin.first_name);
          formData.set(`next_of_kin[${index}][middle_name]`, kin.middle_name);
          formData.set(`next_of_kin[${index}][last_name]`, kin.last_name);
          formData.set(`next_of_kin[${index}][relationship]`, kin.relationship);
          formData.set(`next_of_kin[${index}][gender]`, kin.gender);
          formData.set(`next_of_kin[${index}][dob]`, kin.dob);
          formData.set(`next_of_kin[${index}][phone]`, kin.phone);
          formData.set(`next_of_kin[${index}][email]`, kin.email);
          formData.set(`next_of_kin[${index}][occupation]`, kin.occupation);
          formData.set(`next_of_kin[${index}][address]`, kin.address);
        });
      } else if (customerType === "minor") {
        // guardian_id on the API is the guardian's numeric customer id, not
        // their CIF number — use the id resolved by lookupGuardian().
        formData.set("guardian_id", String(guardianPreview?.id ?? ""));
        formData.set("gender", minor.gender);
        formData.set("dob", minor.dob);

        nextOfKin.forEach((kin, index) => {
          formData.set(`next_of_kin[${index}][title]`, kin.title);
          formData.set(`next_of_kin[${index}][first_name]`, kin.first_name);
          formData.set(`next_of_kin[${index}][middle_name]`, kin.middle_name);
          formData.set(`next_of_kin[${index}][last_name]`, kin.last_name);
          formData.set(`next_of_kin[${index}][relationship]`, kin.relationship);
          formData.set(`next_of_kin[${index}][gender]`, kin.gender);
          formData.set(`next_of_kin[${index}][dob]`, kin.dob);
          formData.set(`next_of_kin[${index}][phone]`, kin.phone);
          formData.set(`next_of_kin[${index}][email]`, kin.email);
          formData.set(`next_of_kin[${index}][occupation]`, kin.occupation);
          formData.set(`next_of_kin[${index}][address]`, kin.address);
        });
      } else {
        // business, government, corporate
        formData.set("legal_form", businessLike.legal_form);
        formData.set("rc_number", businessLike.rc_number);

        if (businessLogo) formData.set("business_logo", businessLogo);

        Object.entries(business).forEach(([field, value]) => {
          formData.set(`business[${field}]`, value ?? "");
        });

        if (customerType === "corporate") {
          directors.forEach((director, index) => {
            formData.set(`directors[${index}][title]`, director.title);
            formData.set(`directors[${index}][first_name]`, director.first_name);
            formData.set(`directors[${index}][last_name]`, director.last_name);
            formData.set(`directors[${index}][position]`, director.position);
            formData.set(`directors[${index}][phone]`, director.phone);
            formData.set(`directors[${index}][email]`, director.email);
            formData.set(`directors[${index}][gender]`, director.gender);
            formData.set(`directors[${index}][dob]`, director.dob);
            formData.set(`directors[${index}][bvn]`, director.bvn);
            formData.set(`directors[${index}][is_primary]`, director.is_primary ? "1" : "0");

            if (director.passport_photo) {
              formData.set(`directors[${index}][passport_photo]`, director.passport_photo);
            }
          });
        }

        if (!isNotRegisteredBusiness) {
          signatories.forEach((signatory, index) => {
            formData.set(`signatories[${index}][first_name]`, signatory.first_name);
            formData.set(`signatories[${index}][last_name]`, signatory.last_name);
            formData.set(`signatories[${index}][position]`, signatory.position);
            formData.set(`signatories[${index}][phone]`, signatory.phone);
            formData.set(`signatories[${index}][email]`, signatory.email);
            formData.set(`signatories[${index}][gender]`, signatory.gender);
            formData.set(`signatories[${index}][bvn]`, signatory.bvn);

            // Links this signatory to a director row by array index — corporate only.
            if (customerType === "corporate" && signatory.director_index !== "") {
              formData.set(`signatories[${index}][director_index]`, signatory.director_index);
            }

            if (signatory.signature) {
              formData.set(`signatories[${index}][signature]`, signatory.signature);
            }
            if (signatory.passport_photo) {
              formData.set(`signatories[${index}][passport_photo]`, signatory.passport_photo);
            }
          });
        }
      }

      formData.set("address[type]", address.type);
      formData.set("address[address]", address.address);
      formData.set("address[lgs]", address.lgs);
      formData.set("address[city]", address.city);
      formData.set("address[state]", address.state);
      formData.set("address[country]", address.country);
      formData.set("address[longitude]", address.longitude);
      formData.set("address[latitude]", address.latitude);

      const result: any = await createCustomerAction(formData);

      if (result?.status !== "success") {
        handleApiError(result, "Failed to create customer.");
        return;
      }

      toast.success(result.message || "Customer created successfully.");
      router.push("/customer-management/customer");
      router.refresh();
    } catch (error) {
      console.error("Failed to create customer:", error);
      toast.error("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          href="/customer-management/customer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#29478f] transition"
        >
          <ArrowLeft size={16} />
          Back to Customers
        </Link>

        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#29478f]">
            <UserPlus size={26} />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add New Customer</h1>
            <p className="mt-1 text-sm text-slate-600">
              Onboard an individual, minor, business, government or corporate customer.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {/* CUSTOMER TYPE */}
        <Section title="Customer Type">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {CUSTOMER_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setCustomerType(type)}
                className={`rounded-xl border-2 p-4 text-left capitalize font-semibold transition ${
                  customerType === type
                    ? "border-[#173673] bg-blue-50 text-[#173673]"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </Section>

        {/* ACCOUNT SETUP */}
        <Section title="Account Setup">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Branch"
              required={false}
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
              required={false}
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
              placeholder="e.g. 08031234567"
            />
            <Input
              label="Email"
              type="email"
              required={false}
              pattern={EMAIL_PATTERN}
              value={common.email}
              onChange={(e) => updateField(setCommon, "email", e.target.value)}
              placeholder="e.g. name@example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Username"
              required={false}
              value={common.username}
              onChange={(e) => updateField(setCommon, "username", e.target.value)}
              placeholder="e.g. victor123"
            />
            <PasswordInput
              label="Password"
              required={false}
              value={common.password}
              onChange={(e) => updateField(setCommon, "password", e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <Input
            label="Transaction PIN"
            required={false}
            value={common.pin}
            onChange={(e) => updateField(setCommon, "pin", onlyDigits(e.target.value, 4))}
            placeholder="e.g. 1234"
            maxLength={4}
          />

          <Checkbox
            label="This customer is a staff member"
            checked={common.is_staff}
            onChange={(e) => updateField(setCommon, "is_staff", e.target.checked)}
          />
        </Section>

        {/* CONTACT PERSON — shared by every customer type */}
        <Section title={businessLikeType ? "Contact Person" : "Personal Information"}>
          <div className="grid grid-cols-4 gap-4">
            <Select
              label="Title"
              required={false}
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
              required={false}
              value={person.middle_name}
              onChange={(e) => updateField(setPerson, "middle_name", onlyLetters(e.target.value))}
            />
            <Input
              label="Last Name"
              value={person.last_name}
              onChange={(e) => updateField(setPerson, "last_name", onlyLetters(e.target.value))}
            />
          </div>

          {customerType === "individual" && (
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
                  required={false}
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
                  required={false}
                  value={individual.tin}
                  onChange={(e) => updateField(setIndividual, "tin", e.target.value)}
                />
              </div>
            </>
          )}

          {customerType === "minor" && (
            <>
              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <label className="block">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-slate-800">Guardian Customer ID</span>

                  {guardianLookupLoading && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <Loader2 size={12} className="animate-spin" />
                      Looking up guardian…
                    </span>
                  )}
                  {!guardianLookupLoading && guardianPreview === null && (
                    <span className="text-xs font-semibold text-red-600">
                      No customer found with that ID.
                    </span>
                  )}
                  {!guardianLookupLoading && guardianPreview && (
                    <span className="text-xs font-semibold text-emerald-700">
                      Guardian: {guardianPreview.first_name} {guardianPreview.last_name}
                    </span>
                  )}
                </span>
                <div className="relative mt-2">
                  <input
                    required
                    value={minor.guardian_id}
                    onChange={(e) => {
                      updateField(setMinor, "guardian_id", e.target.value);
                      setGuardianPreview(undefined);
                    }}
                    onBlur={lookupGuardian}
                    placeholder="e.g. CIF000005"
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
            </>
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
                required={false}
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
                required={false}
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
                required={false}
                value={business.registration_number}
                onChange={(e) => updateField(setBusiness, "registration_number", e.target.value)}
              />
            </div>

            {isNotRegisteredBusiness && (
              <p className="rounded-lg bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                Not-registered businesses are captured like an individual — no directors or
                signatories are required below.
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Registration Date"
                type="date"
                required={false}
                value={business.registration_date}
                onChange={(e) => updateField(setBusiness, "registration_date", e.target.value)}
              />
              <Input
                label="Incorporation Date"
                type="date"
                required={false}
                value={business.incorporation_date}
                onChange={(e) => updateField(setBusiness, "incorporation_date", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Nature of Business"
                required={false}
                value={business.nature_of_business}
                onChange={(e) => updateField(setBusiness, "nature_of_business", e.target.value)}
              />
              <Input
                label="Industry"
                required={false}
                value={business.industry}
                onChange={(e) => updateField(setBusiness, "industry", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Business TIN"
                required={false}
                value={business.tin}
                onChange={(e) => updateField(setBusiness, "tin", e.target.value)}
              />
              <Input
                label="VAT Number"
                required={false}
                value={business.vat_number}
                onChange={(e) => updateField(setBusiness, "vat_number", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Business Phone"
                required={false}
                value={business.business_phone}
                onChange={(e) => updateField(setBusiness, "business_phone", e.target.value)}
              />
              <Input
                label="Business Email"
                type="email"
                required={false}
                pattern={EMAIL_PATTERN}
                value={business.business_email}
                onChange={(e) => updateField(setBusiness, "business_email", e.target.value)}
              />
            </div>

            <Input
              label="Website"
              required={false}
              value={business.website}
              onChange={(e) => updateField(setBusiness, "website", e.target.value)}
              placeholder="https://"
            />
          </Section>
        )}

        <Section title="Identity Documents">
          <div className={`grid gap-4 ${businessLikeType ? "grid-cols-4" : "grid-cols-3"}`}>
            <FileInput label="Profile Picture" onChange={(file) => setProfilePicture(file)} />
            <FileInput label="Utility Bill" onChange={(file) => setUtilityBill(file)} />
            <FileInput label="Valid ID" onChange={(file) => setValidId(file)} />
            {businessLikeType && (
              <FileInput label="Business Logo" onChange={(file) => setBusinessLogo(file)} />
            )}
          </div>
        </Section>

        {(customerType === "individual" || customerType === "minor") && (
          <RepeatingSection
            title="Next of Kin"
            rows={nextOfKin}
            onAdd={() => setNextOfKin((current) => [...current, newNextOfKin()])}
            onRemove={(key) =>
              setNextOfKin((current) => current.filter((row) => row.key !== key))
            }
            minRows={1}
            renderRow={(kin) => (
              <>
                <div className="grid grid-cols-4 gap-4">
                  <Select
                    label="Title"
                    required={false}
                    value={kin.title}
                    onChange={(e) => updateRow(setNextOfKin, kin.key, "title", e.target.value)}
                  >
                    <option value="">—</option>
                    {["Mr", "Mrs", "Miss", "Dr"].map((title) => (
                      <option key={title} value={title}>
                        {title}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="First Name"
                    value={kin.first_name}
                    onChange={(e) =>
                      updateRow(setNextOfKin, kin.key, "first_name", onlyLetters(e.target.value))
                    }
                  />
                  <Input
                    label="Middle Name"
                    required={false}
                    value={kin.middle_name}
                    onChange={(e) =>
                      updateRow(setNextOfKin, kin.key, "middle_name", onlyLetters(e.target.value))
                    }
                  />
                  <Input
                    label="Last Name"
                    value={kin.last_name}
                    onChange={(e) =>
                      updateRow(setNextOfKin, kin.key, "last_name", onlyLetters(e.target.value))
                    }
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Input
                    label="Relationship"
                    value={kin.relationship}
                    onChange={(e) => updateRow(setNextOfKin, kin.key, "relationship", e.target.value)}
                    placeholder="e.g. Sister"
                  />
                  <Select
                    label="Gender"
                    required={false}
                    value={kin.gender}
                    onChange={(e) => updateRow(setNextOfKin, kin.key, "gender", e.target.value)}
                  >
                    <option value="">—</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </Select>
                  <Input
                    label="Date of Birth"
                    type="date"
                    required={false}
                    value={kin.dob}
                    onChange={(e) => updateRow(setNextOfKin, kin.key, "dob", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Phone"
                    value={kin.phone}
                    onChange={(e) => updateRow(setNextOfKin, kin.key, "phone", e.target.value)}
                  />
                  <Input
                    label="Email"
                    type="email"
                    pattern={EMAIL_PATTERN}
                    required={false}
                    value={kin.email}
                    onChange={(e) => updateRow(setNextOfKin, kin.key, "email", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Occupation"
                    required={false}
                    value={kin.occupation}
                    onChange={(e) => updateRow(setNextOfKin, kin.key, "occupation", e.target.value)}
                  />
                  <Input
                    label="Address"
                    required={false}
                    value={kin.address}
                    onChange={(e) => updateRow(setNextOfKin, kin.key, "address", e.target.value)}
                  />
                </div>
              </>
            )}
          />
        )}

        {/* DIRECTORS — corporate only */}
        {customerType === "corporate" && !isNotRegisteredBusiness && (
          <RepeatingSection
            title="Directors"
            rows={directors}
            onAdd={() => setDirectors((current) => [...current, newDirector()])}
            onRemove={(key) =>
              setDirectors((current) => current.filter((row) => row.key !== key))
            }
            minRows={0}
            renderRow={(director) => (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <Select
                    label="Title"
                    required={false}
                    value={director.title}
                    onChange={(e) => updateRow(setDirectors, director.key, "title", e.target.value)}
                  >
                    <option value="">—</option>
                    {["Mr", "Mrs", "Miss", "Dr", "Chief", "Alhaji", "Alhaja"].map((title) => (
                      <option key={title} value={title}>
                        {title}
                      </option>
                    ))}
                  </Select>
                  <Input
                    label="First Name"
                    value={director.first_name}
                    onChange={(e) =>
                      updateRow(setDirectors, director.key, "first_name", onlyLetters(e.target.value))
                    }
                  />
                  <Input
                    label="Last Name"
                    value={director.last_name}
                    onChange={(e) =>
                      updateRow(setDirectors, director.key, "last_name", onlyLetters(e.target.value))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Position"
                    value={director.position}
                    onChange={(e) => updateRow(setDirectors, director.key, "position", e.target.value)}
                    placeholder="e.g. Chief Executive Officer"
                  />
                  <Select
                    label="Gender"
                    value={director.gender}
                    onChange={(e) => updateRow(setDirectors, director.key, "gender", e.target.value)}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Phone"
                    value={director.phone}
                    onChange={(e) => updateRow(setDirectors, director.key, "phone", e.target.value)}
                  />
                  <Input
                    label="Email"
                    type="email"
                    pattern={EMAIL_PATTERN}
                    required={false}
                    value={director.email}
                    onChange={(e) => updateRow(setDirectors, director.key, "email", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Date of Birth"
                    type="date"
                    required={false}
                    value={director.dob}
                    onChange={(e) => updateRow(setDirectors, director.key, "dob", e.target.value)}
                  />
                  <Input
                    label="BVN"
                    required={false}
                    value={director.bvn}
                    onChange={(e) =>
                      updateRow(setDirectors, director.key, "bvn", onlyDigits(e.target.value, 11))
                    }
                    maxLength={11}
                  />
                </div>

                <Checkbox
                  label="Primary director"
                  checked={director.is_primary}
                  onChange={(e) => updateRow(setDirectors, director.key, "is_primary", e.target.checked)}
                />

                <FileInput
                  label="Passport Photo"
                  onChange={(file) => updateRow(setDirectors, director.key, "passport_photo", file)}
                />
              </>
            )}
          />
        )}

        {/* SIGNATORIES — every business-like type, unless business_type is not_registered */}
        {businessLikeType && !isNotRegisteredBusiness && (
          <RepeatingSection
            title="Signatories"
            rows={signatories}
            onAdd={() => setSignatories((current) => [...current, newSignatory()])}
            onRemove={(key) =>
              setSignatories((current) => current.filter((row) => row.key !== key))
            }
            minRows={1}
            renderRow={(signatory) => (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    value={signatory.first_name}
                    onChange={(e) =>
                      updateRow(setSignatories, signatory.key, "first_name", onlyLetters(e.target.value))
                    }
                  />
                  <Input
                    label="Last Name"
                    value={signatory.last_name}
                    onChange={(e) =>
                      updateRow(setSignatories, signatory.key, "last_name", onlyLetters(e.target.value))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Position"
                    value={signatory.position}
                    onChange={(e) => updateRow(setSignatories, signatory.key, "position", e.target.value)}
                  />
                  <Select
                    label="Gender"
                    value={signatory.gender}
                    onChange={(e) => updateRow(setSignatories, signatory.key, "gender", e.target.value)}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Phone"
                    value={signatory.phone}
                    onChange={(e) => updateRow(setSignatories, signatory.key, "phone", e.target.value)}
                  />
                  <Input
                    label="Email"
                    type="email"
                    pattern={EMAIL_PATTERN}
                    required={false}
                    value={signatory.email}
                    onChange={(e) => updateRow(setSignatories, signatory.key, "email", e.target.value)}
                  />
                </div>

                <Input
                  label="BVN"
                  required={false}
                  value={signatory.bvn}
                  onChange={(e) =>
                    updateRow(setSignatories, signatory.key, "bvn", onlyDigits(e.target.value, 11))
                  }
                  maxLength={11}
                />

                {customerType === "corporate" && directors.length > 0 && (
                  <Select
                    label="Linked Director"
                    required={false}
                    value={signatory.director_index}
                    onChange={(e) =>
                      updateRow(setSignatories, signatory.key, "director_index", e.target.value)
                    }
                  >
                    <option value="">Not linked to a director</option>
                    {directors.map((director, index) => (
                      <option key={director.key} value={index}>
                        {director.first_name || `Director #${index + 1}`} {director.last_name}
                      </option>
                    ))}
                  </Select>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FileInput
                    label="Signature"
                    onChange={(file) => updateRow(setSignatories, signatory.key, "signature", file)}
                  />
                  <FileInput
                    label="Passport Photo"
                    onChange={(file) => updateRow(setSignatories, signatory.key, "passport_photo", file)}
                  />
                </div>
              </>
            )}
          />
        )}

        {/* ADDRESS — single object, shared by every customer type */}
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
              onBlur={detectCoordinates}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="LGA"
              required={false}
              value={address.lgs}
              onChange={(e) => updateField(setAddress, "lgs", e.target.value)}
            />
            <Input
              label="City"
              value={address.city}
              onChange={(e) => updateField(setAddress, "city", e.target.value)}
              onBlur={detectCoordinates}
            />
            <Input
              label="State"
              value={address.state}
              onChange={(e) => updateField(setAddress, "state", e.target.value)}
              onBlur={detectCoordinates}
            />
          </div>

          <Input
            label="Country"
            value={address.country}
            onChange={(e) => updateField(setAddress, "country", e.target.value)}
            onBlur={detectCoordinates}
          />

          {geocoding && (
            <p className="text-xs font-medium text-slate-500">Detecting coordinates from address…</p>
          )}
        </Section>

        <div className="flex justify-end gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <Link
            href="/customer-management/customer"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || !canSubmit}
            title={!canSubmit ? "Fill in all required fields to continue" : undefined}
            className="rounded-xl bg-[#173673] px-5 py-3 text-sm font-semibold text-white hover:bg-[#10295c] disabled:cursor-not-allowed disabled:opacity-50 transition shadow-sm"
          >
            {submitting ? "Please wait..." : "Create Customer"}
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

function RepeatingSection({
  title,
  rows,
  onAdd,
  onRemove,
  minRows,
  renderRow,
}: {
  title: string;
  rows: FieldMap[];
  onAdd: () => void;
  onRemove: (key: number) => void;
  minRows: number;
  renderRow: (row: FieldMap) => ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">{title}</h2>
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
          <div key={row.key} className="rounded-xl border border-slate-200 p-4 space-y-4">
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
  required = true,
  ...rest
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
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

function PasswordInput({
  label,
  required = true,
  ...rest
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block">
      <span className="block font-bold text-sm text-slate-800">{label}</span>
      <div className="relative mt-2">
        <input
          type={visible ? "text" : "password"}
          required={required}
          {...rest}
          className="w-full rounded-xl border border-slate-300 bg-white p-3 pr-11 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );
}

function Select({
  label,
  children,
  required = true,
  ...rest
}: { label: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="block font-bold text-sm text-slate-800">{label}</span>
      <select
        required={required}
        {...rest}
        className="mt-2 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-[#29478f] focus:ring-1 focus:ring-[#29478f] transition"
      >
        {children}
      </select>
    </label>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded accent-[#173673]"
      />
      <span className="text-sm font-semibold text-slate-800">{label}</span>
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
  const [preview, setPreview] = useState<string | null>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    onChange(file);
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  return (
    <label className="block">
      <span className="block font-bold text-sm text-slate-800">{label}</span>
      <div className="mt-2 flex items-center gap-3">
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
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
