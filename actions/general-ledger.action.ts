"use server";

import { authApiClient } from "@/lib/api-client";

export async function getGeneralLedgersAction(
  page: number = 1,
  search: string = "",
  filters: { status?: string; is_assigned?: string; currency_id?: string } = {},
) {
  const params = new URLSearchParams({ page: String(page), per_page: "50" });

  if (search.trim()) {
    params.set("search", search.trim());
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.is_assigned) {
    params.set("is_assigned", filters.is_assigned);
  }

  if (filters.currency_id) {
    params.set("currency_id", filters.currency_id);
  }

  const result: any = await authApiClient({
    endpoint: `/admin/general-ledgers?${params.toString()}`,
    method: "GET",
  });

  return result;
}

export async function getGeneralLedgerStatsAction() {
  const result: any = await authApiClient({
    endpoint: `/admin/general-ledgers/stats`,
    method: "GET",
  });

  return result;
}

// Fetches every GL account across all pages, used to populate the parent-account dropdown.
export async function getAllGeneralLedgersAction() {
  const allLedgers: any[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    const result: any = await authApiClient({
      endpoint: `/admin/general-ledgers?page=${page}&per_page=50`,
      method: "GET",
    });

    if (result?.status !== "success") {
      return result;
    }

    allLedgers.push(...(Array.isArray(result.data) ? result.data : []));
    lastPage = result?.meta?.last_page ?? 1;
    page += 1;
  } while (page <= lastPage);

  // Pages can shift while paginating (a record created/edited between
  // fetches), so the same id may show up on two pages — dedupe it.
  const uniqueLedgers = Array.from(
    new Map(allLedgers.map((item) => [item.id, item])).values(),
  );

  return { status: "success", data: uniqueLedgers };
}

export async function getGeneralLedgerAction(id: number | string) {
  const result: any = await authApiClient({
    endpoint: `/admin/general-ledgers/${id}`,
    method: "GET",
  });

  return result;
}

export async function createGeneralLedgerAction(data: {
  name: string;
  currency_id: number | string;
  parent_id: number | string | null;
  classification: string;
  type: string;
  manual_journal_entries_allowed: boolean;
  description: string;
}) {
  const result: any = await authApiClient({
    endpoint: "/admin/general-ledgers",
    method: "POST",
    body: data,
  });

  return result;
}

export async function updateGeneralLedgerAction(
  id: number | string,
  data: {
    name: string;
    parent_id: number | string | null;
    classification: string;
    type: string;
    manual_journal_entries_allowed: boolean;
    description: string;
  },
) {
  const result: any = await authApiClient({
    endpoint: `/admin/general-ledgers/${id}`,
    method: "PUT",
    body: data,
  });

  return result;
}

export async function updateGeneralLedgerStatusAction(
  id: number | string,
  status: string,
) {
  const result: any = await authApiClient({
    endpoint: `/admin/general-ledgers/${id}/status`,
    method: "POST",
    body: { status },
  });

  return result;
}
