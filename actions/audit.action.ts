"use server";

import { authApiClient } from "@/lib/api-client";

export async function getAuditTrailsAction(
  page: number = 1,
  search: string = "",
) {
  const params = new URLSearchParams({ page: String(page) });

  if (search.trim()) {
    params.set("search", search.trim());
  }

  const result: any = await authApiClient({
    endpoint: `/admin/audit-trails?${params.toString()}`,
    method: "GET",
  });

  return result;
}

export async function getAuditTrailAction(id: number | string) {
  const result: any = await authApiClient({
    endpoint: `/admin/audit-trails/${id}`,
    method: "GET",
  });

  return result;
}
