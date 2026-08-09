"use server";

import { authApiClient } from "@/lib/api-client";

// Read-only ledger for an investment — entries are system-generated (funding,
// interest accrual/posting, top-ups, withdrawals, fees, penalties, maturity
// payouts, ...), so there is no create/update/delete action here.
export async function getInvestmentTransactionsAction(
  investmentId: number | string,
  page: number = 1,
  filters: { search?: string; type?: string; from?: string; to?: string } = {},
) {
  const params = new URLSearchParams({ page: String(page) });

  if (filters.search) params.set("search", filters.search);
  if (filters.type) params.set("type", filters.type);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);

  const result: any = await authApiClient({
    endpoint: `/admin/investments/${investmentId}/transactions?${params.toString()}`,
    method: "GET",
  });

  return result;
}
