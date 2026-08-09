"use server";

import { authApiClient } from "@/lib/api-client";

export async function getJournalEntriesAction(
  page: number = 1,
  filters: {
    from?: string;
    to?: string;
    search?: string;
    general_ledger_id?: string;
  } = {},
) {
  const params = new URLSearchParams({ page: String(page), per_page: "50" });

  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.search) params.set("search", filters.search);
  if (filters.general_ledger_id)
    params.set("general_ledger_id", filters.general_ledger_id);

  const result: any = await authApiClient({
    endpoint: `/admin/journal-entries?${params.toString()}`,
    method: "GET",
  });

  return result;
}

export async function getJournalEntryAction(id: number | string) {
  const result: any = await authApiClient({
    endpoint: `/admin/journal-entries/${id}`,
    method: "GET",
  });

  return result;
}
