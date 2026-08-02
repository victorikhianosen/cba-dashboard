"use server";

import { authApiClient } from "@/lib/api-client";

export async function getInvestmentProductsAction(page: number = 1, search: string = "") {
  try {
    const params = new URLSearchParams({ page: String(page) });

    if (search.trim()) {
      params.set("search", search.trim());
    }

    const result: any = await authApiClient({
      endpoint: `/admin/investment-products?${params.toString()}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// Fetches every investment product across all pages, useful for populating dropdowns.
export async function getAllInvestmentProductsAction() {
  try {
    const allInvestmentProducts: any[] = [];
    let page = 1;
    let lastPage = 1;

    do {
      const result: any = await authApiClient({
        endpoint: `/admin/investment-products?page=${page}`,
        method: "GET",
      });

      if (result?.status !== "success") {
        return result;
      }

      allInvestmentProducts.push(...(Array.isArray(result.data) ? result.data : []));
      lastPage = result?.meta?.last_page ?? 1;
      page += 1;
    } while (page <= lastPage);

    // Pages can shift while paginating (a record created/edited between
    // fetches), so the same id may show up on two pages — dedupe it.
    const uniqueInvestmentProducts = Array.from(
      new Map(allInvestmentProducts.map((item) => [item.id, item])).values()
    );

    return { status: "success", data: uniqueInvestmentProducts };
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function getInvestmentProductAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/investment-products/${id}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function createInvestmentProductAction(data: Record<string, any>) {
  try {
    const result: any = await authApiClient({
      endpoint: "/admin/investment-products",
      method: "POST",
      body: data,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function updateInvestmentProductAction(id: number | string, data: Record<string, any>) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/investment-products/${id}`,
      method: "PUT",
      body: data,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function updateInvestmentProductStatusAction(id: number | string, status: string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/investment-products/${id}/status`,
      method: "PATCH",
      body: { status },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// Separate from create/update since the icon is a file, not JSON — called right after a
// successful create (with the new product's id) or any time from the edit drawer.
export async function uploadInvestmentProductIconAction(id: number | string, formData: FormData) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/investment-products/${id}/icon`,
      method: "POST",
      body: formData,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// Approves a pending investment product — separate from
// updateInvestmentProductStatusAction, which only toggles active/inactive on
// already-approved products.
export async function approveInvestmentProductAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/investment-products/${id}/approve`,
      method: "POST",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}
