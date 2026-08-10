"use server";

import { authApiClient } from "@/lib/api-client";

export async function getLoanProductsAction(
  page: number = 1,
  search: string = "",
) {
  const params = new URLSearchParams({ page: String(page) });

  if (search.trim()) {
    params.set("search", search.trim());
  }

  const result: any = await authApiClient({
    endpoint: `/admin/loan-products?${params.toString()}`,
    method: "GET",
  });

  return result;
}

// Fetches every loan product across all pages, useful for populating dropdowns.
export async function getAllLoanProductsAction() {
  const allLoanProducts: any[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    const result: any = await authApiClient({
      endpoint: `/admin/loan-products?page=${page}`,
      method: "GET",
    });

    if (result?.status !== "success") {
      return result;
    }

    allLoanProducts.push(...(Array.isArray(result.data) ? result.data : []));
    lastPage = result?.meta?.last_page ?? 1;
    page += 1;
  } while (page <= lastPage);

  const uniqueLoanProducts = Array.from(
    new Map(allLoanProducts.map((item) => [item.id, item])).values(),
  );

  return { status: "success", data: uniqueLoanProducts };
}

export async function getLoanProductAction(id: number | string) {
  const result: any = await authApiClient({
    endpoint: `/admin/loan-products/${id}`,
    method: "GET",
  });

  return result;
}

export async function createLoanProductAction(data: Record<string, any>) {
  const result: any = await authApiClient({
    endpoint: "/admin/loan-products",
    method: "POST",
    body: data,
  });

  return result;
}

export async function updateLoanProductAction(
  id: number | string,
  data: Record<string, any>,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/loan-products/${id}`,
    method: "PUT",
    body: data,
  });

  return result;
}

export async function deleteLoanProductAction(id: number | string) {
  const result: any = await authApiClient({
    endpoint: `/admin/loan-products/${id}`,
    method: "DELETE",
  });

  return result;
}

// Approves a pending loan product (pending -> active).
export async function approveLoanProductAction(id: number | string) {
  const result: any = await authApiClient({
    endpoint: `/admin/loan-products/${id}/approve`,
    method: "POST",
  });

  return result;
}

export async function updateLoanProductStatusAction(
  id: number | string,
  status: string,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/loan-products/${id}/status`,
    method: "POST",
    body: { status },
  });

  return result;
}
