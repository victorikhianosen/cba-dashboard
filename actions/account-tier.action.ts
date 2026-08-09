"use server";

import { authApiClient } from "@/lib/api-client";

// Fetches every account tier across all pages, useful for populating dropdowns.
export async function getAllAccountTiersAction() {
  const allAccountTiers: any[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    const result: any = await authApiClient({
      endpoint: `/admin/account-tiers?page=${page}`,
      method: "GET",
    });

    if (result?.status !== "success") {
      return result;
    }

    allAccountTiers.push(...(Array.isArray(result.data) ? result.data : []));
    lastPage = result?.meta?.last_page ?? 1;
    page += 1;
  } while (page <= lastPage);

  const uniqueAccountTiers = Array.from(
    new Map(allAccountTiers.map((item) => [item.id, item])).values(),
  );

  return { status: "success", data: uniqueAccountTiers };
}
