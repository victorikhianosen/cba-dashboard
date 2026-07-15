"use server";

import { authApiClient } from "@/lib/api-client";

export async function getCurrenciesAction(page: number = 1, search: string = "") {
  try {
    const params = new URLSearchParams({ page: String(page) });

    if (search.trim()) {
      params.set("search", search.trim());
    }

    const result: any = await authApiClient({
      endpoint: `/admin/currencies?${params.toString()}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// Fetches every currency across all pages, useful for populating dropdowns.
export async function getAllCurrenciesAction() {
  try {
    const allCurrencies: any[] = [];
    let page = 1;
    let lastPage = 1;

    do {
      const result: any = await authApiClient({
        endpoint: `/admin/currencies?page=${page}`,
        method: "GET",
      });

      if (result?.status !== "success") {
        return result;
      }

      allCurrencies.push(...(Array.isArray(result.data) ? result.data : []));
      lastPage = result?.meta?.last_page ?? 1;
      page += 1;
    } while (page <= lastPage);

    return { status: "success", data: allCurrencies };
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function getCurrencyAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/currencies/${id}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function createCurrencyAction(data: {
  code: string;
  name: string;
  symbol: string;
  buy_rate: number;
  sell_rate: number;
  exchange_rate: number;
  is_base_currency: boolean;
}) {
  try {
    const result: any = await authApiClient({
      endpoint: "/admin/currencies",
      method: "POST",
      body: data,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function updateCurrencyAction(
  id: number | string,
  data: {
    code: string;
    name: string;
    symbol: string;
    buy_rate: number;
    sell_rate: number;
    exchange_rate: number;
    is_base_currency: boolean;
  }
) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/currencies/${id}`,
      method: "PUT",
      body: data,
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}
