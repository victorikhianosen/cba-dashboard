"use server";

import { authApiClient } from "@/lib/api-client";

export async function getCustomersAction(page: number = 1, search: string = "") {
  try {
    const params = new URLSearchParams({ page: String(page) });

    if (search.trim()) {
      params.set("search", search.trim());
    }

    const result: any = await authApiClient({
      endpoint: `/admin/customers?${params.toString()}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function getCustomerAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/customers/${id}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// Takes a FormData built on the client so uploaded files (profile picture,
// utility bill, director/signatory photos and signatures) travel through the
// Server Action untouched — authApiClient sends it as multipart/form-data.
export async function createCustomerAction(formData: FormData) {
  try {
    const result: any = await authApiClient({
      endpoint: "/admin/customers",
      method: "POST",
      body: formData,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function updateCustomerStatusAction(id: number | string, status: string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/customers/${id}/status`,
      method: "POST",
      body: { status },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// FormData travels as multipart/form-data with a `_method=PUT` override
// (see api-client.ts) so uploaded files can be replaced on edit too.
export async function updateCustomerAction(id: number | string, formData: FormData) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/customers/${id}`,
      method: "PUT",
      body: formData,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// account_product_id assigns the account opened for the customer on approval;
// the backend rejects the request without it.
export async function approveCustomerAction(
  id: number | string,
  payload: { account_product_id: number | string; account_tier_id?: number | string }
) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/customers/${id}/approve`,
      method: "POST",
      body: payload,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function rejectCustomerAction(id: number | string, reason: string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/customers/${id}/reject`,
      method: "POST",
      body: { reason },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function closeCustomerAction(id: number | string, reason: string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/customers/${id}/close`,
      method: "POST",
      body: { reason },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function toggleInternetBankingAction(id: number | string) {
  try {
    return await authApiClient({
      endpoint: `/admin/customers/${id}/toggle-internet-banking`,
      method: "POST",
    });
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function toggleSmsAction(id: number | string) {
  try {
    return await authApiClient({
      endpoint: `/admin/customers/${id}/toggle-sms`,
      method: "POST",
    });
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function toggleEmailAction(id: number | string) {
  try {
    return await authApiClient({
      endpoint: `/admin/customers/${id}/toggle-email`,
      method: "POST",
    });
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}
