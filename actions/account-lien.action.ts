"use server";

import { authApiClient } from "@/lib/api-client";

export async function listLienApprovalsAction(status: string = "pending", page: number = 1) {
  try {
    const params = new URLSearchParams({ page: String(page), per_page: "50" });
    if (status) params.set("status", status);

    const result: any = await authApiClient({
      endpoint: `/admin/account-liens?${params.toString()}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function getAccountLiensAction(accountId: number | string, page: number = 1) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/accounts/${accountId}/liens?page=${page}`,
      method: "GET",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function approveLienAction(id: number | string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/account-liens/${id}/approve`,
      method: "POST",
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function rejectLienAction(id: number | string, reason: string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/account-liens/${id}/reject`,
      method: "POST",
      body: { reason },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}

export async function releaseLienAction(id: number | string, reason?: string) {
  try {
    const result: any = await authApiClient({
      endpoint: `/admin/account-liens/${id}/release`,
      method: "POST",
      body: { reason },
    });

    return result;
  } catch {
    return { status: "failed", responseCode: "500", message: "An unexpected error occurred." };
  }
}
