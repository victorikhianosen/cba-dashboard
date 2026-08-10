"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import { toast } from "react-toastify";
import { createUserAction } from "@/actions/user.action";
import { handleApiError } from "@/lib/errors";
import UserForm from "../../components/UserForm";
import { useRouter } from "next/navigation";

type Branch = Record<string, any>;
type UserFormData = Record<string, any>;

interface CreateUserPageProps {
  branches?: Branch[];
}

const emptyUserForm: UserFormData = {
  branch_id: "",
  staff_code: "",
  first_name: "",
  last_name: "",
  email: "",
  gender: "male",
  phone: "",
  address: "",
  city: "",
  state: "",
  country: "Nigeria",
};

export default function CreateUserPage({ branches = [] }: CreateUserPageProps) {
  const router = useRouter();

  const [formData, setFormData] = useState<UserFormData>(emptyUserForm);
  const [submitting, setSubmitting] = useState(false);

  function handleInputChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;

    if (name === "phone") {
      const sanitized = value.replace(/(?!^\+)[^\d]/g, "");
      const digitsOnly = sanitized.replace("+", "").slice(0, 15);
      const nextValue = (sanitized.startsWith("+") ? "+" : "") + digitsOnly;
      setFormData((current) => ({ ...current, phone: nextValue }));
      return;
    }

    setFormData((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    const result: any = await createUserAction({
      branch_id: formData.branch_id,
      staff_code: formData.staff_code,
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      gender: formData.gender,
      phone: formData.phone,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      country: formData.country,
    });

    console.log("createUserAction result:", result);

    if (!result || result.status !== "success") {
      handleApiError(result, "Failed to create user.");
      setSubmitting(false);
      return;
    }

    toast.success(result.message || "User created successfully.");
    router.push("/user-management/user");
  }

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link
          href="/user-management/user"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#29478f] transition"
        >
          <ArrowLeft size={16} />
          Back to Users
        </Link>

        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#29478f]">
            <UserPlus size={26} />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Add New User
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Create a new staff account for the platform.
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <UserForm
          formData={formData}
          onChange={handleInputChange}
          branches={branches}
          mode="create"
        />

        <div className="mt-7 flex justify-end gap-3 border-t border-slate-200 pt-6">
          <Link
            href="/user-management/user"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-[#173673] px-5 py-3 text-sm font-semibold text-white hover:bg-[#10295c] disabled:opacity-50 transition shadow-sm"
          >
            {submitting ? "Please wait..." : "Create User"}
          </button>
        </div>
      </form>
    </>
  );
}
