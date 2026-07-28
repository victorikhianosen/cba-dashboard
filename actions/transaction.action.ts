"use server";

import { authApiClient } from "@/lib/api-client";

export async function getTransactionsAction(
  page: number = 1,
  filters: {
    from?: string;
    to?: string;
    search?: string;
    account_id?: string;
    transaction_type?: string;
    direction?: string;
  } = {}
) {
  try {
    const params = new URLSearchParams({ page: String(page), per_page: "50" });

    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.search) params.set("search", filters.search);
    if (filters.account_id) params.set("account_id", filters.account_id);
    if (filters.transaction_type) params.set("transaction_type", filters.transaction_type);
    if (filters.direction) params.set("direction", filters.direction);

    const result: any = await authApiClient({
      endpoint: `/admin/transactions?${params.toString()}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

// Every transaction_type currently in use — powers the type filter dropdown so it stays
// accurate automatically as new products (airtime, betting, interbank, ...) start posting.
export async function getTransactionTypesAction() {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/transactions/types`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}
