"use server";

import { authApiClient } from "@/lib/api-client";

export async function getAccountProductsAction(page: number = 1, search: string = "") {
  try {
    const params = new URLSearchParams({ page: String(page) });

    if (search.trim()) {
      params.set("search", search.trim());
    }

    const result: any = await authApiClient({
      endpoint: `/admin/account-products?${params.toString()}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// Fetches every account product across all pages, useful for populating dropdowns.
export async function getAllAccountProductsAction() {
  try {
    const allAccountProducts: any[] = [];
    let page = 1;
    let lastPage = 1;

    do {
      const result: any = await authApiClient({
        endpoint: `/admin/account-products?page=${page}`,
        method: "GET",
      });

      if (result?.status !== "success") {
        return result;
      }

      allAccountProducts.push(...(Array.isArray(result.data) ? result.data : []));
      lastPage = result?.meta?.last_page ?? 1;
      page += 1;
    } while (page <= lastPage);

    // Pages can shift while paginating (a record created/edited between
    // fetches), so the same id may show up on two pages — dedupe it.
    const uniqueAccountProducts = Array.from(
      new Map(allAccountProducts.map((item) => [item.id, item])).values()
    );

    return { status: "success", data: uniqueAccountProducts };
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function getAccountProductAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/account-products/${id}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function createAccountProductAction(data: Record<string, any>) {
  try {
    const result: any = await authApiClient({
      endpoint: "/admin/account-products",
      method: "POST",
      body: data,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function updateAccountProductAction(id: number | string, data: Record<string, any>) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/account-products/${id}`,
      method: "PUT",
      body: data,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function updateAccountProductStatusAction(id: number | string, status: string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/account-products/${id}/status`,
      method: "POST",
      body: { status },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// Approves a pending account product — separate from updateAccountProductStatusAction,
// which only toggles active/inactive on already-approved products.
export async function approveAccountProductAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/account-products/${id}/approve`,
      method: "POST",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}
