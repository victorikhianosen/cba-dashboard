"use server";

import { authApiClient } from "@/lib/api-client";

// Flat reference list of every status a customer/account can be set to.
export async function getAllStatusesAction() {
  const result: any = await authApiClient({
    endpoint: "/admin/statuses",
    method: "GET",
  });

  return result;
}
