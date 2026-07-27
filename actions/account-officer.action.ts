"use server";

import { authApiClient } from "@/lib/api-client";

export async function getAccountOfficersAction(page: number = 1, search: string = "") {
  try {
    const params = new URLSearchParams({ page: String(page) });

    if (search.trim()) {
      params.set("search", search.trim());
    }

    const result: any = await authApiClient({
      endpoint: `/admin/account-officers?${params.toString()}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// Fetches every account officer across all pages, useful for populating dropdowns.
export async function getAllAccountOfficersAction() {
  try {
    const allOfficers: any[] = [];
    let page = 1;
    let lastPage = 1;

    do {
      const result: any = await authApiClient({
        endpoint: `/admin/account-officers?page=${page}`,
        method: "GET",
      });

      if (result?.status !== "success") {
        return result;
      }

      allOfficers.push(...(Array.isArray(result.data) ? result.data : []));
      lastPage = result?.meta?.last_page ?? 1;
      page += 1;
    } while (page <= lastPage);

    // Pages can shift while paginating (a record created/edited between
    // fetches), so the same id may show up on two pages — dedupe it.
    const uniqueOfficers = Array.from(new Map(allOfficers.map((item) => [item.id, item])).values());

    return { status: "success", data: uniqueOfficers };
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function getAccountOfficerAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/account-officers/${id}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function createAccountOfficerAction(data: {
  branch_id: number | string;
  user_id?: number | string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  country: string;
}) {
  try {
    const result: any = await authApiClient({
      endpoint: "/admin/account-officers",
      method: "POST",
      body: { ...data, user_id: data.user_id ?? null },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function updateAccountOfficerAction(
  id: number | string,
  data: {
    branch_id: number | string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
  }
) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/account-officers/${id}`,
      method: "PUT",
      body: data,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function deleteAccountOfficerAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/account-officers/${id}`,
      method: "DELETE",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}
