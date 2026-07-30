"use server";

import { authApiClient } from "@/lib/api-client";

export async function getFinancialTransactionsAction(
  page: number = 1,
  filters: { from?: string; to?: string; search?: string; status?: string } = {}
) {
  try {
    const params = new URLSearchParams({ page: String(page), per_page: "50" });

    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);

    const result: any = await authApiClient({
      endpoint: `/admin/financial-transactions?${params.toString()}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function getFinancialTransactionAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/financial-transactions/${id}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}
