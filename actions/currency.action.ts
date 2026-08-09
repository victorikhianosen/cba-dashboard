"use server";

import { authApiClient } from "@/lib/api-client";

export async function getCurrenciesAction(
  page: number = 1,
  search: string = "",
) {
  const params = new URLSearchParams({ page: String(page) });

  if (search.trim()) {
    params.set("search", search.trim());
  }

  const result: any = await authApiClient({
    endpoint: `/admin/currencies?${params.toString()}`,
    method: "GET",
  });

  return result;
}

// Fetches every currency across all pages, useful for populating dropdowns.
export async function getAllCurrenciesAction() {
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

  // Pages can shift while paginating (a record created/edited between
  // fetches), so the same id may show up on two pages — dedupe it.
  const uniqueCurrencies = Array.from(
    new Map(allCurrencies.map((item) => [item.id, item])).values(),
  );

  return { status: "success", data: uniqueCurrencies };
}

export async function getCurrencyAction(id: number | string) {
  const result: any = await authApiClient({
    endpoint: `/admin/currencies/${id}`,
    method: "GET",
  });

  return result;
}

// No createCurrencyAction — currencies are a fixed, curated list seeded by the
// backend (CurrencySeeder). Only updates (exchange rate, status, etc.) are allowed.
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
  },
) {
  const result: any = await authApiClient({
    endpoint: `/admin/currencies/${id}`,
    method: "PUT",
    body: data,
  });

  return result;
}
