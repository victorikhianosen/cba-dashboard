"use server";

import { authApiClient } from "@/lib/api-client";

export async function getBanksAction(page: number = 1, search: string = "") {
  try {
    const params = new URLSearchParams({ page: String(page) });

    if (search.trim()) {
      params.set("search", search.trim());
    }

    const result: any = await authApiClient({
      endpoint: `/admin/banks?${params.toString()}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function getBankAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/banks/${id}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// Takes a FormData built on the client so the logo File travels through the
// Server Action untouched — authApiClient sends it as multipart/form-data.
export async function createBankAction(formData: FormData) {
  try {
    const result: any = await authApiClient({
      endpoint: "/admin/banks",
      method: "POST",
      body: formData,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function updateBankAction(id: number | string, formData: FormData) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/banks/${id}`,
      method: "PUT",
      body: formData,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function deleteBankAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/banks/${id}`,
      method: "DELETE",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}
