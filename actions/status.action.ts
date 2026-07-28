"use server";

import { authApiClient } from "@/lib/api-client";

// Flat reference list of every status a customer/account can be set to.
export async function getAllStatusesAction() {
  try {
    const result: any = await authApiClient({
      endpoint: "/admin/statuses",
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}
